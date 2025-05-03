import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Avatar,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Link,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { useState, useEffect } from 'react';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import InstagramIcon from '@mui/icons-material/Instagram';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { format } from 'date-fns';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { getUserProfile } from '../services/users';

const Profile = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userData, setUserData] = useState({
    displayName: '',
    bio: '',
    vibeTags: [],
    instagram: '',
    hostedEvents: 0,
    joinedEvents: 0,
    rating: 0,
  });
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    vibeTags: '',
    instagram: '',
  });
  const [events, setEvents] = useState({
    upcoming: [],
    past: [],
    saved: [],
  });
  const [loading, setLoading] = useState(true);
  const [messagesTabEvents, setMessagesTabEvents] = useState([]);
  const [selectedMessageEvent, setSelectedMessageEvent] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messagesDialogOpen, setMessagesDialogOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [userMap, setUserMap] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
          setEditForm({
            displayName: userDoc.data().displayName || '',
            bio: userDoc.data().bio || '',
            vibeTags: userDoc.data().vibeTags?.join(', ') || '',
            instagram: userDoc.data().instagram || '',
          });
        }
      }
    };
    fetchUserData();
  }, [currentUser]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const now = new Date();
        
        // Fetch hosted events
        const hostedQuery = query(
          collection(db, 'events'),
          where('hostId', '==', currentUser.uid),
          orderBy('dateTime', 'asc')
        );
        const hostedSnapshot = await getDocs(hostedQuery);
        
        // Fetch joined events
        const joinedQuery = query(
          collection(db, 'events'),
          where('attendees', 'array-contains', currentUser.uid),
          orderBy('dateTime', 'asc')
        );
        const joinedSnapshot = await getDocs(joinedQuery);
        
        // Fetch saved events
        const savedQuery = query(
          collection(db, 'events'),
          where('savedBy', 'array-contains', currentUser.uid),
          orderBy('dateTime', 'asc')
        );
        const savedSnapshot = await getDocs(savedQuery);

        const allEvents = {
          upcoming: [],
          past: [],
          saved: [],
        };

        const combinedEvents = [...hostedSnapshot.docs, ...joinedSnapshot.docs];
        const uniqueEventsMap = {};
        combinedEvents.forEach(doc => {
          uniqueEventsMap[doc.id] = { id: doc.id, ...doc.data() };
        });
        const uniqueEvents = Object.values(uniqueEventsMap);

        // Now split into upcoming and past
        uniqueEvents.forEach(event => {
          const eventDate = event.dateTime?.toDate();
          if (eventDate) {
            if (eventDate >= now) {
              allEvents.upcoming.push(event);
            } else {
              allEvents.past.push(event);
            }
          }
        });

        // Process saved events
        savedSnapshot.docs.forEach(doc => {
          const event = { id: doc.id, ...doc.data() };
          allEvents.saved.push(event);
        });

        setEvents(allEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentUser]);

  useEffect(() => {
    if (activeTab !== 3 || !currentUser) return;
    const fetchEventsWithMessages = async () => {
      // Get all events where user is host or attendee
      const eventsQuery = query(
        collection(db, 'events'),
        where('hostId', '==', currentUser.uid)
      );
      const joinedQuery = query(
        collection(db, 'events'),
        where('attendees', 'array-contains', currentUser.uid)
      );
      const [hostedSnap, joinedSnap] = await Promise.all([
        getDocs(eventsQuery),
        getDocs(joinedQuery)
      ]);
      const allEvents = {};
      [...hostedSnap.docs, ...joinedSnap.docs].forEach(doc => {
        allEvents[doc.id] = { id: doc.id, ...doc.data() };
      });
      // For each event, check if it has messages
      const eventsWithMessages = [];
      for (const eventId in allEvents) {
        const messagesSnap = await getDocs(collection(db, 'events', eventId, 'messages'));
        if (!messagesSnap.empty) {
          eventsWithMessages.push(allEvents[eventId]);
        }
      }
      setMessagesTabEvents(eventsWithMessages);
    };
    fetchEventsWithMessages();
  }, [activeTab, currentUser]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
  };

  const handleEditSubmit = async () => {
    try {
      let photoURL = userData.photoURL || '';
      if (photoFile) {
        const path = `profile-photos/${currentUser.uid}_${Date.now()}_${photoFile.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(storageRef);
      }
      const updatedData = {
        ...userData,
        displayName: editForm.displayName,
        bio: editForm.bio,
        vibeTags: editForm.vibeTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        instagram: editForm.instagram,
        photoURL,
      };
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, updatedData);
      } else {
        await setDoc(userRef, updatedData, { merge: true });
      }
      // Update Firebase Auth profile
      if (photoURL) {
        await updateProfile(currentUser, { photoURL });
      }
      setUserData(updatedData);
      setPhotoFile(null);
      setPhotoPreview('');
      handleEditClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleOpenConversation = async (event) => {
    setSelectedMessageEvent(event);
    setMessagesDialogOpen(true);
    // Fetch messages for this event
    const messagesSnap = await getDocs(query(
      collection(db, 'events', event.id, 'messages'),
      orderBy('timestamp', 'asc')
    ));
    const messages = messagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setConversation(messages);
    // Fetch user profiles for all unique senderIds (exactly as in plan page)
    const uniqueSenderIds = Array.from(new Set(messages.map(msg => msg.senderId)));
    const userMapTemp = {};
    for (const uid of uniqueSenderIds) {
      if (typeof uid === 'string' && uid.trim() !== '') {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userMapTemp[uid] = {
              displayName: userData.displayName || 'Unknown User',
              photoURL: userData.photoURL || '',
            };
          } else {
            userMapTemp[uid] = { displayName: 'Unknown User', photoURL: '' };
          }
        } catch {
          userMapTemp[uid] = { displayName: 'Unknown User', photoURL: '' };
        }
      }
    }
    setUserMap(userMapTemp);
  };

  const handleCloseConversation = () => {
    setMessagesDialogOpen(false);
    setSelectedMessageEvent(null);
    setConversation([]);
    setMessageText('');
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedMessageEvent) return;
    setSendingMessage(true);
    try {
      await addDoc(collection(db, 'events', selectedMessageEvent.id, 'messages'), {
        senderId: currentUser.uid,
        recipientId: selectedMessageEvent.hostId,
        text: messageText,
        timestamp: serverTimestamp(),
      });
      // Refresh conversation
      const messagesSnap = await getDocs(query(
        collection(db, 'events', selectedMessageEvent.id, 'messages'),
        orderBy('timestamp', 'asc')
      ));
      setConversation(messagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setMessageText('');
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const renderEventCard = (event) => {
    if (!event) return null;
    
    const eventDate = event.dateTime?.toDate();
    const formattedDate = eventDate ? format(eventDate, 'MMM d, yyyy h:mm a') : 'Date not set';
    
    return (
      <Card key={event.id} sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {event.title || 'Untitled Event'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <AccessTimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formattedDate}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LocationOnIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {event.location || 'Location not set'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PeopleIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {event.attendees?.length || 0} attendees
            </Typography>
          </Box>
        </CardContent>
        <CardActions>
          <Button size="small" color="primary" href={`/plan/${event.id}`}>
            View Details
          </Button>
        </CardActions>
      </Card>
    );
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    const eventsToShow = activeTab === 0 ? events.upcoming : 
                        activeTab === 1 ? events.past : 
                        activeTab === 2 ? events.saved : 
                        messagesTabEvents;

    if (eventsToShow.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Typography color="text.secondary">
            {activeTab === 0 ? 'No upcoming plans' : 
             activeTab === 1 ? 'No past plans' : 
             activeTab === 2 ? 'No saved plans' : 
             'No messages yet'}
          </Typography>
        </Box>
      );
    }

    if (activeTab === 3) {
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Event Messages</Typography>
          {messagesTabEvents.length === 0 ? (
            <Typography color="text.secondary">No messages yet.</Typography>
          ) : (
            <List>
              {messagesTabEvents.map(event => (
                <div key={event.id}>
                  <ListItem button onClick={() => handleOpenConversation(event)}>
                    <ListItemText
                      primary={event.title || 'Untitled Event'}
                      secondary={event.location}
                    />
                  </ListItem>
                  <Divider />
                </div>
              ))}
            </List>
          )}
          <Dialog open={messagesDialogOpen} onClose={handleCloseConversation} fullWidth maxWidth="sm">
            <DialogTitle>Conversation: {selectedMessageEvent?.title}</DialogTitle>
            <DialogContent dividers sx={{ minHeight: 200, maxHeight: 400, overflowY: 'auto' }}>
              {conversation.length === 0 ? (
                <Typography color="text.secondary">No messages yet.</Typography>
              ) : (
                conversation.map(msg => {
                  console.log('Message senderId:', msg.senderId, 'photoURL:', userMap[msg.senderId]?.photoURL);
                  return (
                    <Box
                      key={msg.id}
                      sx={{
                        mb: 2,
                        display: 'flex',
                        flexDirection: msg.senderId === currentUser.uid ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        justifyContent: msg.senderId === currentUser.uid ? 'flex-end' : 'flex-start',
                        gap: 1.5,
                      }}
                    >
                      <Avatar
                        src={userMap[msg.senderId]?.photoURL}
                        sx={{ width: 32, height: 32, flexShrink: 0 }}
                      >
                        {userMap[msg.senderId]?.displayName
                          ? userMap[msg.senderId].displayName[0].toUpperCase()
                          : <PersonIcon />}
                      </Avatar>
                      <Box
                        sx={{
                          bgcolor: msg.senderId === currentUser.uid ? 'primary.light' : 'grey.200',
                          color: 'text.primary',
                          px: 2,
                          py: 1,
                          borderRadius: 2,
                          maxWidth: '70%',
                          wordBreak: 'break-word',
                        }}
                      >
                        <Typography variant="body2">{msg.text}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString() : ''}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </DialogContent>
            <DialogActions>
              <TextField
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                fullWidth
                placeholder="Type a message..."
                disabled={sendingMessage}
                onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
              />
              <Button onClick={handleSendMessage} disabled={sendingMessage || !messageText.trim()}>Send</Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
    }

    return eventsToShow.map(renderEventCard);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
            <Avatar
              sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
              alt={userData.displayName}
              src={currentUser?.photoURL}
            />
            <Typography variant="h5" gutterBottom>
              {userData.displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {userData.bio}
            </Typography>
            {userData.instagram && (
              <Link
                href={`https://instagram.com/${userData.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}
              >
                <InstagramIcon sx={{ mr: 1 }} />
                @{userData.instagram}
              </Link>
            )}
            <Box sx={{ mt: 2 }}>
              {userData.vibeTags?.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  sx={{ m: 0.5 }}
                  variant="outlined"
                />
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} sm={8}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{userData.hostedEvents}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Hosted Events
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{userData.joinedEvents}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Joined Events
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{userData.rating}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Rating
                </Typography>
              </Box>
            </Box>
            <Button 
              variant="contained" 
              fullWidth
              startIcon={<EditIcon />}
              onClick={handleEditClick}
            >
              Edit Profile
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Upcoming Plans" />
          <Tab label="Past Plans" />
          <Tab label="Saved Plans" />
          <Tab label="Messages" />
        </Tabs>
      </Box>

      {renderTabContent()}

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* Profile Photo Upload */}
            <Box sx={{ textAlign: 'center' }}>
              {photoPreview || currentUser?.photoURL ? (
                <Avatar
                  src={photoPreview || currentUser?.photoURL}
                  sx={{ width: 80, height: 80, mx: 'auto', mb: 1 }}
                />
              ) : (
                <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 1 }} />
              )}
              <Button
                variant="outlined"
                component="label"
                sx={{ mt: 1 }}
              >
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      setPhotoFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setPhotoPreview(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </Button>
              {photoPreview && (
                <Button color="error" size="small" sx={{ mt: 1 }} onClick={() => { setPhotoFile(null); setPhotoPreview(''); }}>
                  Remove
                </Button>
              )}
            </Box>
            {/* Existing fields */}
            <TextField
              label="Display Name"
              value={editForm.displayName}
              onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Bio"
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Vibe Tags (comma separated)"
              value={editForm.vibeTags}
              onChange={(e) => setEditForm({ ...editForm, vibeTags: e.target.value })}
              fullWidth
              helperText="Enter tags separated by commas"
            />
            <TextField
              label="Instagram Username"
              value={editForm.instagram}
              onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
              fullWidth
              helperText="Enter username without @"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile; 
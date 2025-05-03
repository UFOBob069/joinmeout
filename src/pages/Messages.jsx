import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, addDoc, serverTimestamp, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { Container, Typography, List, ListItem, ListItemText, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Box, Avatar } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

const Messages = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userMap, setUserMap] = useState({});

  useEffect(() => {
    if (!currentUser) return;
    const fetchEventsWithMessages = async () => {
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
      const eventsWithMessages = [];
      for (const eventId in allEvents) {
        const messagesSnap = await getDocs(collection(db, 'events', eventId, 'messages'));
        if (!messagesSnap.empty) {
          eventsWithMessages.push(allEvents[eventId]);
        }
      }
      setEvents(eventsWithMessages);
    };
    fetchEventsWithMessages();
  }, [currentUser]);

  const handleOpenConversation = async (event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
    const messagesSnap = await getDocs(query(
      collection(db, 'events', event.id, 'messages'),
      orderBy('timestamp', 'asc')
    ));
    const messages = messagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setConversation(messages);
    // Fetch user profiles for all unique senderIds
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
    setDialogOpen(false);
    setSelectedEvent(null);
    setConversation([]);
    setMessageText('');
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedEvent) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'events', selectedEvent.id, 'messages'), {
        senderId: currentUser.uid,
        recipientId: selectedEvent.hostId,
        text: messageText,
        timestamp: serverTimestamp(),
      });
      const messagesSnap = await getDocs(query(
        collection(db, 'events', selectedEvent.id, 'messages'),
        orderBy('timestamp', 'asc')
      ));
      setConversation(messagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setMessageText('');
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Messages</Typography>
      {events.length === 0 ? (
        <Typography color="text.secondary">No messages yet.</Typography>
      ) : (
        <List>
          {events.map(event => (
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
      <Dialog open={dialogOpen} onClose={handleCloseConversation} fullWidth maxWidth="sm">
        <DialogTitle>Conversation: {selectedEvent?.title}</DialogTitle>
        <DialogContent dividers sx={{ minHeight: 200, maxHeight: 400, overflowY: 'auto' }}>
          {conversation.length === 0 ? (
            <Typography color="text.secondary">No messages yet.</Typography>
          ) : (
            conversation.map(msg => (
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
            ))
          )}
        </DialogContent>
        <DialogActions>
          <TextField
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            fullWidth
            placeholder="Type a message..."
            disabled={sending}
            onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
          />
          <Button onClick={handleSendMessage} disabled={sending || !messageText.trim()}>Send</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Messages; 
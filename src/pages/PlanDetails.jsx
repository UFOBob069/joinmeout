import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Avatar,
  Button,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
  CardMedia,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  LocationOn as LocationOnIcon,
  People as PeopleIcon,
  Share as ShareIcon,
  Favorite as FavoriteIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import MuiAlert from '@mui/material/Alert';
import { Map, Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const PlanDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      // Validate ID format
      if (!id || typeof id !== 'string' || id.trim() === '') {
        setError('Invalid plan ID');
        setLoading(false);
        return;
      }

      try {
        // Validate Firestore document ID format
        if (!/^[a-zA-Z0-9_-]{1,}$/.test(id)) {
          setError('Invalid plan ID format');
          setLoading(false);
          return;
        }

        const planRef = doc(db, 'events', id.trim());
        const planDoc = await getDoc(planRef);
        
        if (!planDoc.exists()) {
          setError('Plan not found');
          setLoading(false);
          return;
        }

        const planData = planDoc.data();
        console.log('Plan data:', planData); // Debug log
        
        // Set up default host data
        let hostData = {
          displayName: 'Unknown Host',
          photoURL: '',
          rating: 'N/A',
        };

        // Try to fetch host data if hostId exists
        if (planData.hostId && typeof planData.hostId === 'string') {
          try {
            const hostDoc = await getDoc(doc(db, 'users', planData.hostId));
            if (hostDoc.exists()) {
              const hostDocData = hostDoc.data();
              hostData = {
                displayName: hostDocData.displayName || 'Unknown Host',
                photoURL: hostDocData.photoURL || '',
                rating: hostDocData.rating ?? 'N/A',
              };
            }
          } catch (hostError) {
            // fallback to default hostData
          }
        }

        // Fetch attendees data
        const attendeesData = [];
        if (Array.isArray(planData.attendees)) {
          for (const attendeeId of planData.attendees) {
            if (typeof attendeeId === 'string' && attendeeId.trim() !== '') {
              try {
                const attendeeDoc = await getDoc(doc(db, 'users', attendeeId));
                if (attendeeDoc.exists()) {
                  const attendeeData = attendeeDoc.data();
                  attendeesData.push({
                    id: attendeeId,
                    name: attendeeData.displayName || 'Unknown User',
                    avatar: attendeeData.photoURL,
                  });
                }
              } catch (attendeeError) {
                console.error('Error fetching attendee data:', attendeeError);
                // Skip this attendee and continue
              }
            }
          }
        }

        // Only check savedBy and attendees if user is authenticated
        const isSaved = currentUser ? 
          (Array.isArray(planData.savedBy) && planData.savedBy.includes(currentUser.uid)) : 
          false;
        
        const isAttending = currentUser ? 
          (Array.isArray(planData.attendees) && planData.attendees.includes(currentUser.uid)) : 
          false;

        setPlan({
          id: planDoc.id,
          ...planData,
          host: {
            id: planData.hostId || 'unknown',
            name: hostData.displayName,
            avatar: hostData.photoURL,
            rating: hostData.rating,
          },
          attendees: attendeesData,
          isSaved,
          isAttending,
        });
      } catch (err) {
        console.error('Error fetching plan:', err);
        setError('Failed to load plan details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [id, currentUser]);

  const handleJoinPlan = async () => {
    if (!currentUser) {
      setError('Please sign in to join this plan');
      return;
    }

    setIsJoining(true);
    try {
      const planRef = doc(db, 'events', id);
      await updateDoc(planRef, {
        attendees: arrayUnion(currentUser.uid),
      });

      // Update local state
      setPlan(prev => ({
        ...prev,
        attendees: [...prev.attendees, {
          id: currentUser.uid,
          name: currentUser.displayName || 'You',
          avatar: currentUser.photoURL,
        }],
        isAttending: true,
      }));
    } catch (err) {
      console.error('Error joining plan:', err);
      setError('Failed to join plan. Please try again later.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeavePlan = async () => {
    if (!currentUser) return;

    setIsJoining(true);
    try {
      const planRef = doc(db, 'events', id);
      await updateDoc(planRef, {
        attendees: arrayRemove(currentUser.uid),
      });

      // Update local state
      setPlan(prev => ({
        ...prev,
        attendees: prev.attendees.filter(a => a.id !== currentUser.uid),
        isAttending: false,
      }));
    } catch (err) {
      console.error('Error leaving plan:', err);
      setError('Failed to leave plan. Please try again later.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSavePlan = async () => {
    if (!currentUser) {
      setError('Please sign in to save this plan');
      return;
    }

    setIsSaving(true);
    try {
      const planRef = doc(db, 'events', id);
      await updateDoc(planRef, {
        savedBy: arrayUnion(currentUser.uid),
      });

      // Update local state
      setPlan(prev => ({
        ...prev,
        isSaved: true,
      }));
    } catch (err) {
      console.error('Error saving plan:', err);
      setError('Failed to save plan. Please try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnsavePlan = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    try {
      const planRef = doc(db, 'events', id);
      await updateDoc(planRef, {
        savedBy: arrayRemove(currentUser.uid),
      });

      // Update local state
      setPlan(prev => ({
        ...prev,
        isSaved: false,
      }));
    } catch (err) {
      console.error('Error unsaving plan:', err);
      setError('Failed to unsave plan. Please try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSnackbarOpen(true);
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const isHost = currentUser && plan?.host?.id === currentUser.uid;

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'events', id));
        navigate('/profile');
      } catch (err) {
        alert('Failed to delete event: ' + err.message);
      }
    }
  };

  const handleEdit = () => {
    // Placeholder: navigate to edit page or open edit dialog
    alert('Edit functionality coming soon!');
  };

  const handleOpenMessageDialog = () => setMessageDialogOpen(true);
  const handleCloseMessageDialog = () => setMessageDialogOpen(false);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'events', id, 'messages'), {
        senderId: currentUser.uid,
        recipientId: plan.host.id,
        text: messageText,
        timestamp: serverTimestamp(),
      });
      setMessageText('');
      setMessageDialogOpen(false);
      setSnackbarOpen(true);
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/')}>
              Go Home
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (!plan) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">Plan not found</Alert>
      </Container>
    );
  }

  const eventDate = plan.dateTime?.toDate();
  const formattedDate = eventDate ? format(eventDate, 'MMM d, yyyy h:mm a') : 'Date not set';

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {plan.imageUrl && (
              <CardMedia
                component="img"
                height="260"
                image={plan.imageUrl || 'https://via.placeholder.com/800x400?text=No+Image'}
                alt={plan.title || 'Event image'}
                sx={{
                  objectFit: 'cover',
                  borderRadius: 2,
                  mb: 3,
                }}
              />
            )}
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h4">{plan.title || 'Untitled Plan'}</Typography>
              <Box>
                <IconButton onClick={handleShare}>
                  <ShareIcon />
                </IconButton>
                <IconButton
                  color={plan.isSaved ? 'primary' : 'default'}
                  onClick={plan.isSaved ? handleUnsavePlan : handleSavePlan}
                  disabled={isSaving}
                >
                  <FavoriteIcon />
                </IconButton>
              </Box>
            </Box>
            <Typography variant="body1" color="text.secondary" paragraph>
              {plan.description || 'No description provided'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AccessTimeIcon sx={{ mr: 1 }} />
              <Typography>{formattedDate}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationOnIcon sx={{ mr: 1 }} />
              <Typography>{plan.location || 'Location not specified'}</Typography>
            </Box>
            {Array.isArray(plan.coordinates) && plan.coordinates.length === 2 && typeof plan.coordinates[0] === 'number' && typeof plan.coordinates[1] === 'number' && (
              <Box sx={{ height: 220, borderRadius: 2, overflow: 'hidden', my: 2 }}>
                <Map
                  initialViewState={{
                    longitude: plan.coordinates[0],
                    latitude: plan.coordinates[1],
                    zoom: 14
                  }}
                  style={{ width: '100%', height: '100%' }}
                  mapStyle="mapbox://styles/mapbox/streets-v11"
                  mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
                  attributionControl={false}
                >
                  <Marker longitude={plan.coordinates[0]} latitude={plan.coordinates[1]}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        bgcolor: 'primary.main',
                        borderRadius: '50%',
                        border: '2px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    />
                  </Marker>
                </Map>
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PeopleIcon sx={{ mr: 1 }} />
              <Typography>
                {plan.attendees?.length || 0}/{plan.maxAttendees || '∞'} spots filled
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar src={plan.host?.avatar} sx={{ mr: 2 }}>
                {(!plan.host?.avatar && plan.host?.name) ? plan.host.name[0].toUpperCase() : ''}
              </Avatar>
              <Box>
                <Typography variant="subtitle1">Hosted by {plan.host?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Rating: {plan.host?.rating || 'N/A'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 2 }}>
              {plan.vibeTags?.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  sx={{ m: 0.5 }}
                  variant="outlined"
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Attendees ({plan.attendees?.length || 0})
            </Typography>
            <List>
              {plan.attendees?.map((attendee) => (
                <ListItem key={attendee.id}>
                  <ListItemAvatar>
                    <Avatar src={attendee.avatar} />
                  </ListItemAvatar>
                  <ListItemText primary={attendee.name} />
                </ListItem>
              ))}
            </List>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color={plan.isAttending ? 'error' : 'primary'}
                fullWidth
                onClick={plan.isAttending ? handleLeavePlan : handleJoinPlan}
                disabled={isJoining || (!plan.isAttending && plan.attendees?.length >= plan.maxAttendees)}
              >
                {isJoining ? 'Processing...' : 
                 plan.isAttending ? 'Leave Plan' :
                 plan.attendees?.length >= plan.maxAttendees ? 'Full' : 'Join Plan'}
              </Button>
              <Button variant="outlined" fullWidth onClick={handleOpenMessageDialog}>
                Message Host
              </Button>
            </Box>
          </Grid>

          {isHost && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleEdit}
                >
                  Edit Event
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDelete}
                >
                  Delete Event
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          Link copied!
        </MuiAlert>
      </Snackbar>
      <Dialog open={messageDialogOpen} onClose={handleCloseMessageDialog}>
        <DialogTitle>Message Host</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Your Message"
            type="text"
            fullWidth
            value={messageText}
            onChange={e => setMessageText(e.target.value)}
            disabled={sending}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMessageDialog} disabled={sending}>Cancel</Button>
          <Button onClick={handleSendMessage} disabled={sending || !messageText.trim()}>Send</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PlanDetails; 
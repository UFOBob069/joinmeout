import { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Slider,
  Card,
  CardMedia,
  IconButton,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ClearIcon from '@mui/icons-material/Clear';
import { Map, Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import LocationSearch from '../components/LocationSearch';
import { storage, db } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const vibeTags = [
  'Chill',
  'Talkative',
  'Introvert-friendly',
  'Active',
  'Casual',
  'Professional',
  'Creative',
  'Adventurous',
];

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Generate time options for every 15 minutes in 12-hour format
const timeOptions = [];
for (let hour = 0; hour < 24; hour++) {
  for (let min of [0, 15, 30, 45]) {
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const label = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${ampm}`;
    timeOptions.push({
      label,
      value: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
    });
  }
}

const isValidCoordinates = (coords) => {
  return (
    Array.isArray(coords) &&
    coords.length === 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number' &&
    !isNaN(coords[0]) &&
    !isNaN(coords[1])
  );
};

const CreatePlan = () => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: null,
    time: '',
    location: '',
    address: '',
    coordinates: null,
    category: '',
    maxAttendees: 10,
    privacy: 'open',
    vibeTags: [],
    image: null,
    imagePreview: '',
  });

  const [locationError, setLocationError] = useState('');

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          image: file,
          imagePreview: reader.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setFormData({
      ...formData,
      image: null,
      imagePreview: '',
    });
  };

  const handleDateChange = (date) => {
    setFormData({ ...formData, date });
  };

  const handleTimeChange = (event) => {
    setFormData({ ...formData, time: event.target.value });
  };

  // Combine date and time into a Date object for submission
  const getDateTime = () => {
    if (!formData.date || !formData.time) return null;
    const [hour, minute] = formData.time.split(':');
    const date = new Date(formData.date);
    date.setHours(Number(hour));
    date.setMinutes(Number(minute));
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const dateTime = getDateTime();
    let imageUrl = '';
    try {
      if (formData.image) {
        const path = `event-images/${Date.now()}_${formData.image.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, formData.image);
        imageUrl = await getDownloadURL(storageRef);
      }
      // Save event data to Firestore
      await addDoc(collection(db, 'events'), {
        title: formData.title,
        description: formData.description,
        dateTime: Timestamp.fromDate(dateTime),
        location: formData.location,
        address: formData.address,
        coordinates: formData.coordinates,
        category: formData.category,
        maxAttendees: formData.maxAttendees,
        privacy: formData.privacy,
        vibeTags: formData.vibeTags,
        imageUrl,
        createdAt: Timestamp.now(),
        hostId: currentUser?.uid || '',
        attendees: [],
        savedBy: [],
      });
      // Optionally reset form or show success
      alert('Event created successfully!');
      setFormData({
        title: '',
        description: '',
        date: null,
        time: '',
        location: '',
        address: '',
        coordinates: null,
        category: '',
        maxAttendees: 10,
        privacy: 'open',
        vibeTags: [],
        image: null,
        imagePreview: '',
      });
    } catch (error) {
      alert('Error creating event: ' + error.message);
    }
  };

  const handleLocationSelect = (location) => {
    console.log('Location received from LocationSearch:', location);
    setLocationError('');
    setFormData((prev) => {
      const updated = {
        ...prev,
        location: location?.name || '',
        address: location?.address || '',
        coordinates: isValidCoordinates(location?.coordinates) ? location.coordinates : null,
      };
      console.log('Updated formData after location select:', updated);
      return updated;
    });
    if (!location?.address) {
      setLocationError('Please select a valid address from the suggestions.');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create a New Plan
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Title"
                value={formData.title}
                onChange={handleChange('title')}
                placeholder="e.g., Join me for tacos on South Congress"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => {
                  if (e.target.value.length <= 240) {
                    setFormData({ ...formData, description: e.target.value });
                  }
                }}
                inputProps={{ maxLength: 240 }}
                helperText={`${formData.description.length}/240 characters`}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Event Image
              </Typography>
              {formData.imagePreview ? (
                <Card sx={{ position: 'relative', mb: 2 }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={formData.imagePreview}
                    alt="Plan preview"
                    sx={{ objectFit: 'cover' }}
                  />
                  <IconButton
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      },
                    }}
                    onClick={handleImageRemove}
                  >
                    <ClearIcon />
                  </IconButton>
                </Card>
              ) : (
                <Box
                  sx={{
                    border: '2px dashed #ddd',
                    borderRadius: 2,
                    p: 3,
                    mb: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                    },
                  }}
                  component="label"
                >
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                  <AddPhotoAlternateIcon sx={{ fontSize: 40, color: '#aaa', mb: 1 }} />
                  <Typography>
                    Click to upload an image for your event
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recommended size: 800x450 pixels
                  </Typography>
                </Box>
              )}
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={formData.date}
                  onChange={handleDateChange}
                  minDate={new Date()}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="time-select-label">Select time</InputLabel>
                <Select
                  labelId="time-select-label"
                  value={formData.time}
                  label="Select time"
                  onChange={handleTimeChange}
                >
                  {timeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <LocationSearch
                value={formData.address}
                onLocationSelect={handleLocationSelect}
              />
              {locationError && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {locationError}
                </Typography>
              )}
            </Grid>

            {isValidCoordinates(formData.coordinates) && !locationError && (
              <Grid item xs={12}>
                <Box sx={{ height: 200, borderRadius: 1, overflow: 'hidden' }}>
                  <Map
                    initialViewState={{
                      longitude: formData.coordinates[0],
                      latitude: formData.coordinates[1],
                      zoom: 14
                    }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/streets-v11"
                    mapboxAccessToken={MAPBOX_TOKEN}
                  >
                    <Marker
                      longitude={formData.coordinates[0]}
                      latitude={formData.coordinates[1]}
                    >
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
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {formData.address}
                </Typography>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={handleChange('category')}
                  label="Category"
                >
                  <MenuItem value="Food">🍞 Food</MenuItem>
                  <MenuItem value="Fitness">🏋️ Fitness</MenuItem>
                  <MenuItem value="Chill">☕ Chill</MenuItem>
                  <MenuItem value="Outdoors">⛰ Outdoors</MenuItem>
                  <MenuItem value="Arts">🎨 Arts</MenuItem>
                  <MenuItem value="Gaming">🎮 Gaming</MenuItem>
                  <MenuItem value="Music">🎵 Music</MenuItem>
                  <MenuItem value="Study">📚 Study</MenuItem>
                  <MenuItem value="Board Games">🎲 Board Games</MenuItem>
                  <MenuItem value="Nightlife">🍺 Nightlife</MenuItem>
                  <MenuItem value="Sports">🏃 Sports</MenuItem>
                  <MenuItem value="Networking">💼 Networking</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Privacy</InputLabel>
                <Select
                  value={formData.privacy}
                  onChange={handleChange('privacy')}
                  label="Privacy"
                >
                  <MenuItem value="open">Open to all</MenuItem>
                  <MenuItem value="request">Request to join</MenuItem>
                  <MenuItem value="invite">Invite only</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Maximum Attendees</Typography>
              <Slider
                value={formData.maxAttendees}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, maxAttendees: newValue });
                }}
                min={2}
                max={20}
                marks
                valueLabelDisplay="auto"
              />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={vibeTags}
                value={formData.vibeTags}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, vibeTags: newValue });
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      key={option}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Vibe Tags"
                    placeholder="Select vibe tags"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  fullWidth
                >
                  Create Plan
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default CreatePlan; 
import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  IconButton,
  InputBase,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  Grid,
  Tabs,
  Tab,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import { Map, Marker, Popup } from 'react-map-gl';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import MapIcon from '@mui/icons-material/Map';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import { Link as RouterLink } from 'react-router-dom';
import 'mapbox-gl/dist/mapbox-gl.css';
import LocationSearch from '../components/LocationSearch';
import { db } from '../services/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Add a check for the token
const hasMapboxToken = Boolean(MAPBOX_TOKEN);

const categories = [
  { emoji: '🍞', label: 'Food' },
  { emoji: '🏋️', label: 'Fitness' },
  { emoji: '☕', label: 'Chill' },
  { emoji: '⛰', label: 'Outdoors' },
  { emoji: '🎨', label: 'Arts' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '📚', label: 'Study' },
  { emoji: '🎲', label: 'Board Games' },
  { emoji: '🍺', label: 'Nightlife' },
  { emoji: '🏃', label: 'Sports' },
  { emoji: '💼', label: 'Networking' },
];

const locations = [
  // United States
  'New York City, USA',
  'Los Angeles, USA',
  'Chicago, USA',
  'Houston, USA',
  'Phoenix, USA',
  'Philadelphia, USA',
  'San Antonio, USA',
  'San Diego, USA',
  'Dallas, USA',
  'San Jose, USA',
  'Austin, USA',
  'Jacksonville, USA',
  'Fort Worth, USA',
  'Columbus, USA',
  'San Francisco, USA',
  'Charlotte, USA',
  'Indianapolis, USA',
  'Seattle, USA',
  'Denver, USA',
  'Boston, USA',
  
  // Europe
  'London, UK',
  'Paris, France',
  'Berlin, Germany',
  'Madrid, Spain',
  'Rome, Italy',
  
  // International
  'Tokyo, Japan',
  'Dubai, UAE',
  'Singapore, Singapore',
  'Sydney, Australia',
  'Toronto, Canada',
  'Vancouver, Canada',
  'Seoul, South Korea',
  'Mumbai, India',
  'São Paulo, Brazil',
  'Mexico City, Mexico'
].sort();

const getCategoryEmoji = (category) => {
  const categoryMap = {
    Food: '🍞',
    Fitness: '🏋️',
    Chill: '☕',
    Outdoors: '⛰',
    Arts: '🎨',
    Gaming: '🎮',
    Music: '🎵',
    Study: '📚',
    'Board Games': '🎲',
    Nightlife: '🍺',
    Sports: '🏃',
    Networking: '💼',
  };
  return categoryMap[category] || '📍';
};

const Home = () => {
  const [viewMode, setViewMode] = useState('list');
  const [viewport, setViewport] = useState({
    latitude: 30.2672,
    longitude: -97.7431,
    zoom: 12
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostMap, setHostMap] = useState({});
  const [radius, setRadius] = useState(10); // default 10 miles

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'events'));
        const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlans(events);

        // Fetch unique hostIds
        const uniqueHostIds = Array.from(new Set(events.map(e => e.hostId).filter(Boolean)));
        const hostMapTemp = {};
        await Promise.all(uniqueHostIds.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              hostMapTemp[uid] = {
                displayName: userData.displayName || 'Unknown Host',
                photoURL: userData.photoURL || '',
              };
            } else {
              hostMapTemp[uid] = { displayName: 'Unknown Host', photoURL: '' };
            }
          } catch {
            hostMapTemp[uid] = { displayName: 'Unknown Host', photoURL: '' };
          }
        }));
        setHostMap(hostMapTemp);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Haversine formula to calculate distance in miles between two lat/lng
  function getDistanceMiles(lat1, lon1, lat2, lon2) {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 3958.8; // Radius of Earth in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const filteredPlans = plans.filter((plan) => {
    const matchesCategory = selectedCategory === 'all' || plan.category === selectedCategory;
    const matchesSearch = plan.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         plan.location?.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesLocation = true;
    if (selectedLocation && plan.coordinates && Array.isArray(plan.coordinates) && plan.coordinates.length === 2) {
      const [lng, lat] = plan.coordinates;
      const [selLng, selLat] = selectedLocation.coordinates;
      const distance = getDistanceMiles(lat, lng, selLat, selLng);
      matchesLocation = distance <= radius;
    } else if (selectedLocation) {
      matchesLocation = false;
    }
    return matchesCategory && matchesSearch && matchesLocation;
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          pt: { xs: 2, md: 6 },
          pb: { xs: 5, md: 14 },
          textAlign: 'center',
          position: 'relative'
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 1,
              fontSize: { xs: '1.3rem', sm: '2rem', md: '2.5rem' }
            }}
          >
            Find your people, join local activities, create memorable experiences
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 400,
              opacity: 0.9,
              fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' }
            }}
          >
            Connect with others who share your interests and explore your city together
          </Typography>
        </Container>

        {/* Search and Categories Container - Positioned over the hero */}
        <Container 
          maxWidth="lg"
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            transform: 'translate(-50%, 50%)',
            width: '100%',
            px: { xs: 2, sm: 3 }
          }}
        >
          <Paper
            elevation={3}
            sx={{
              borderRadius: '16px',
              backgroundColor: 'white',
              overflow: 'hidden'
            }}
          >
            {/* Search Bar - now its own row */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                p: 1.25,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <LocationSearch
                  value={selectedLocation?.address || ''}
                  onLocationSelect={(location) => {
                    setSelectedLocation(location);
                    setViewport({
                      ...viewport,
                      latitude: location.coordinates[1],
                      longitude: location.coordinates[0],
                      zoom: 14
                    });
                  }}
                  hideLabel
                  placeholder={selectedLocation ? "Change location..." : "Search for a location..."}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: { xs: 44, sm: 40 },
                      fontSize: { xs: '1.05rem', sm: '1rem' },
                    },
                  }}
                />
                {selectedLocation && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mt: 1,
                      color: 'text.secondary',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <LocationOnIcon fontSize="small" />
                    <span>Filtering events near {selectedLocation.address}</span>
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedLocation(null);
                        setViewport({
                          latitude: 30.2672,
                          longitude: -97.7431,
                          zoom: 12
                        });
                      }}
                      sx={{ ml: 1 }}
                    >
                      Clear
                    </Button>
                  </Typography>
                )}
              </Box>
              {/* New row for radius and view toggle */}
              <Box sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 2,
                mt: 0.5,
                width: '100%',
                bgcolor: '#f5f7fa',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                px: { xs: 1, sm: 1.5 },
                py: { xs: 0.5, sm: 1 },
              }}>
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <FormControl variant="outlined" size="small" sx={{ minWidth: 150, borderRadius: '12px', mb: 0, width: 150 }}>
                    <InputLabel id="radius-label" sx={{ fontWeight: 500, color: 'text.secondary', fontSize: '0.95rem' }}>Radius</InputLabel>
                    <Select
                      labelId="radius-label"
                      value={radius}
                      onChange={e => setRadius(Number(e.target.value))}
                      label="Radius"
                      sx={{
                        fontWeight: 600,
                        fontSize: '1.08rem',
                        borderRadius: '12px',
                        bgcolor: 'white',
                        px: 1.5,
                        height: 38,
                        minHeight: 38,
                        display: 'flex',
                        alignItems: 'center',
                        '.MuiSelect-select': {
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: { borderRadius: '12px' }
                        }
                      }}
                    >
                      <MenuItem value={5}><span style={{fontWeight:600}}>5 mi</span></MenuItem>
                      <MenuItem value={10}><span style={{fontWeight:600}}>10 mi</span></MenuItem>
                      <MenuItem value={25}><span style={{fontWeight:600}}>25 mi</span></MenuItem>
                      <MenuItem value={50}><span style={{fontWeight:600}}>50 mi</span></MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(e, newValue) => {
                      if (newValue === 'map' && !hasMapboxToken) {
                        alert('Map view requires a Mapbox token. Please set VITE_MAPBOX_ACCESS_TOKEN in your .env file.');
                        return;
                      }
                      newValue && setViewMode(newValue);
                    }}
                    size="small"
                    sx={{
                      gap: 1,
                      '& .MuiToggleButton-root': {
                        border: 'none',
                        borderRadius: '8px !important',
                        px: 1.5,
                        py: 0.7,
                        fontSize: { xs: '1.05rem', sm: '1rem' },
                        transition: 'background 0.15s',
                        '&.Mui-selected': {
                          backgroundColor: 'primary.main',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'primary.dark',
                          },
                        },
                      },
                    }}
                  >
                    <ToggleButton value="list">
                      <ViewListIcon />
                    </ToggleButton>
                    <ToggleButton value="map">
                      <MapIcon />
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>
            </Box>

            {/* Category Tabs */}
            <Tabs
              value={selectedCategory}
              onChange={(e, newValue) => setSelectedCategory(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                px: 2,
                minHeight: 36,
                '& .MuiTabs-indicator': {
                  height: 2,
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                },
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  textTransform: 'none',
                  minHeight: 36,
                  opacity: 0.7,
                  '&:hover': {
                    opacity: 1,
                  },
                  '&.Mui-selected': {
                    color: 'primary.main',
                    opacity: 1,
                  },
                }
              }}
            >
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>All</span>
                  </Box>
                }
                value="all" 
              />
              {categories.map((category) => (
                <Tab
                  key={category.label}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span style={{ fontSize: '1.1rem' }}>{category.emoji}</span>
                      <span>{category.label}</span>
                    </Box>
                  }
                  value={category.label}
                />
              ))}
            </Tabs>
          </Paper>
        </Container>
      </Box>

      {/* Content Area */}
      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: 12, md: 16 },
          mb: 4,
          px: { xs: 2, sm: 3 },
          ...(viewMode === 'map' && { minHeight: 500, height: 500 }),
        }}
      >
        {viewMode === 'list' ? (
          <Grid container spacing={3}>
            {filteredPlans.map((plan) => {
              const host = plan.hostId ? hostMap[plan.hostId] : undefined;
              return (
                <Grid item xs={12} sm={6} md={4} key={plan.id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      border: '1px solid rgba(0,0,0,0.08)',
                      bgcolor: 'white',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        height="200"
                        image={plan.imageUrl || plan.image || 'https://via.placeholder.com/400x200?text=No+Image'}
                        alt={plan.title || 'Event image'}
                        sx={{
                          objectFit: 'cover',
                        }}
                      />
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          top: 16,
                          left: 16,
                          zIndex: 1,
                          display: 'flex',
                          gap: 1,
                        }}
                      >
                        <Chip
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <span role="img" aria-label={plan.category}>
                                {getCategoryEmoji(plan.category)}
                              </span>
                              <span>{plan.category}</span>
                            </Box>
                          }
                          size="small"
                          sx={{ 
                            bgcolor: 'white',
                            color: 'primary.main',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            height: '28px',
                            borderRadius: '8px',
                            '& .MuiChip-label': {
                              px: 1.5,
                            },
                          }}
                        />
                        <Chip
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <span role="img" aria-label="attendees">
                                👥
                              </span>
                              <span>{Array.isArray(plan.attendees) ? plan.attendees.length : 0}/{plan.maxAttendees}</span>
                            </Box>
                          }
                          size="small"
                          sx={{ 
                            bgcolor: 'white',
                            color: 'text.primary',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            height: '28px',
                            borderRadius: '8px',
                            '& .MuiChip-label': {
                              px: 1.5,
                            },
                          }}
                        />
                      </Box>
                    </Box>
                    <CardContent sx={{ p: 3, pt: 2.5, pb: 3 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '1.25rem',
                          mb: 2,
                          color: 'text.primary',
                        }}
                      >
                        {plan.title}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <AccessTimeIcon sx={{ fontSize: '1.25rem', color: 'text.secondary' }} />
                          <Typography 
                            variant="body1"
                            sx={{ 
                              color: 'text.primary',
                              fontWeight: 500,
                            }}
                          >
                            {plan.dateTime ? new Date(plan.dateTime.seconds ? plan.dateTime.seconds * 1000 : plan.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No time set'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <LocationOnIcon sx={{ fontSize: '1.25rem', color: 'text.secondary', mt: 0.25 }} />
                          <Box>
                            <Typography 
                              variant="body1"
                              sx={{ 
                                color: 'text.primary',
                                fontWeight: 500,
                              }}
                            >
                              {plan.location}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'text.secondary',
                                mt: 0.25,
                              }}
                            >
                              {plan.city}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box 
                            sx={{ 
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            {host && host.displayName ? host.displayName[0].toUpperCase() : '?'}
                          </Box>
                          <Typography 
                            variant="body1"
                            sx={{ 
                              color: 'text.primary',
                              fontWeight: 500,
                            }}
                          >
                            Hosted by {host && host.displayName ? host.displayName : 'Unknown Host'}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                    <Box 
                      sx={{ 
                        p: 3, 
                        pt: 0, 
                        mt: 'auto',
                      }}
                    >
                      <Button 
                        variant="contained" 
                        fullWidth
                        component={RouterLink}
                        to={`/plan/${plan.id}`}
                        sx={{
                          borderRadius: '12px',
                          py: 1.5,
                          textTransform: 'none',
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        Join Plan
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Box sx={{ width: '100%', height: 500 }}>
            <Map
              {...viewport}
              onMove={evt => setViewport(evt.viewState)}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/streets-v11"
              mapboxAccessToken={MAPBOX_TOKEN}
            >
              {filteredPlans.map((plan) => (
                plan.coordinates &&
                Array.isArray(plan.coordinates) &&
                plan.coordinates.length === 2 &&
                typeof plan.coordinates[0] === 'number' &&
                typeof plan.coordinates[1] === 'number' &&
                !isNaN(plan.coordinates[0]) &&
                !isNaN(plan.coordinates[1]) ? (
                  <Marker
                    key={plan.id}
                    longitude={plan.coordinates[0]}
                    latitude={plan.coordinates[1]}
                    anchor="bottom"
                    onClick={e => {
                      e.originalEvent.stopPropagation();
                      setSelectedPlan(plan);
                    }}
                  >
                    <PlanMarker category={plan.category} />
                  </Marker>
                ) : null
              ))}

              {selectedPlan && Array.isArray(selectedPlan.coordinates) && selectedPlan.coordinates.length === 2 &&
                typeof selectedPlan.coordinates[0] === 'number' &&
                typeof selectedPlan.coordinates[1] === 'number' &&
                !isNaN(selectedPlan.coordinates[0]) &&
                !isNaN(selectedPlan.coordinates[1]) ? (
                <Popup
                  longitude={selectedPlan.coordinates[0]}
                  latitude={selectedPlan.coordinates[1]}
                  anchor="bottom"
                  onClose={() => setSelectedPlan(null)}
                >
                  <Box sx={{ p: 1, maxWidth: 200 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      {selectedPlan.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedPlan.dateTime ? new Date(selectedPlan.dateTime.seconds ? selectedPlan.dateTime.seconds * 1000 : selectedPlan.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No time set'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedPlan.location}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        component={RouterLink}
                        to={`/plan/${selectedPlan.id}`}
                      >
                        View Details
                      </Button>
                    </Box>
                  </Box>
                </Popup>
              ) : null}
            </Map>
          </Box>
        )}
      </Container>
    </Box>
  );
};

// Marker component
const PlanMarker = ({ category }) => {
  const getColor = (category) => {
    const colors = {
      Food: '#FF5722',
      Fitness: '#4CAF50',
      Chill: '#2196F3',
      Outdoors: '#1976D2',
      Arts: '#9C27B0',
      Gaming: '#FF9800',
      Music: '#E91E63',
      Study: '#607D8B',
      'Board Games': '#795548',
      Nightlife: '#673AB7',
      Sports: '#F44336',
      Networking: '#00BCD4',
    };
    return colors[category] || '#2962ff';
  };

  const getEmoji = (category) => {
    const emojis = {
      Food: '🍞',
      Fitness: '🏋️',
      Chill: '☕',
      Outdoors: '⛰',
      Arts: '🎨',
      Gaming: '🎮',
      Music: '🎵',
      Study: '📚',
      'Board Games': '🎲',
      Nightlife: '🍺',
      Sports: '🏃',
      Networking: '💼',
    };
    return emojis[category] || '📍';
  };

  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        bgcolor: getColor(category),
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        border: '3px solid white',
        cursor: 'pointer',
        transition: 'transform 0.15s',
        '&:hover': {
          transform: 'scale(1.15)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
        },
      }}
    >
      <span role="img" aria-label={category}>{getEmoji(category)}</span>
    </Box>
  );
};

export default Home; 
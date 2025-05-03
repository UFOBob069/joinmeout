import { useState, useRef, useEffect } from 'react';
import {
  TextField,
  Popper,
  Paper,
  List,
  ListItem,
  ListItemText,
  Box,
  CircularProgress,
  InputAdornment,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const LocationSearch = ({ onLocationSelect, value, hideLabel = false, placeholder = "Search for an address or place" }) => {
  const [searchText, setSearchText] = useState(value || '');
  const [searchResults, setSearchResults] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setSearchText(value || '');
  }, [value]);

  const handleSearch = async (value) => {
    setSearchText(value);
    setAnchorEl(searchInputRef.current);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value || !MAPBOX_TOKEN) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&types=address,poi,place&limit=5`
        );
        const data = await response.json();
        setSearchResults(data.features || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleLocationSelect = (feature) => {
    console.log('Mapbox feature selected:', feature);
    if (!feature || !feature.place_name || !Array.isArray(feature.center) || feature.center.length !== 2) {
      setError('Invalid location data. Please select a different result.');
      return;
    }
    setError('');
    const locationData = {
      name: feature.text,
      address: feature.place_name,
      coordinates: feature.center,
    };
    console.log('Passing locationData to parent:', locationData);
    onLocationSelect(locationData);
    setSearchText(feature.place_name);
    setSearchResults([]);
    setAnchorEl(null);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {!hideLabel && (
        <Typography 
          variant="body2" 
          sx={{ 
            mb: 1,
            color: 'text.secondary',
            fontWeight: 500,
          }}
        >
          Search for an address or place
        </Typography>
      )}
      <TextField
        fullWidth
        placeholder={placeholder}
        value={searchText}
        onChange={(e) => handleSearch(e.target.value)}
        inputRef={searchInputRef}
        variant="outlined"
        required
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'white',
            borderRadius: '8px',
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.15)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.25)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            },
          },
          '& .MuiOutlinedInput-input': {
            padding: '12px 14px',
            '&::placeholder': {
              color: 'text.secondary',
              opacity: 0.7,
            },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary', ml: 1 }} />
            </InputAdornment>
          ),
          endAdornment: isLoading ? (
            <InputAdornment position="end">
              <CircularProgress size={20} sx={{ mr: 1 }} />
            </InputAdornment>
          ) : null,
        }}
      />
      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
      <Popper
        open={Boolean(searchResults.length)}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ width: anchorEl?.offsetWidth, zIndex: 1400 }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            maxHeight: 300, 
            overflow: 'auto',
            mt: 1,
            borderRadius: '8px',
          }}
        >
          <List>
            {searchResults.map((result) => (
              <ListItem
                key={result.id}
                button
                onClick={() => handleLocationSelect(result)}
                sx={{
                  py: 1.5,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemText
                  primary={result.text}
                  secondary={result.place_name}
                  primaryTypographyProps={{
                    fontWeight: 500,
                    color: 'text.primary',
                  }}
                  secondaryTypographyProps={{
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Popper>
    </Box>
  );
};

export default LocationSearch; 
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, Container } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import './styles/mui-overrides.css';

// Pages
import Home from './pages/Home';
import CreatePlan from './pages/CreatePlan';
import Profile from './pages/Profile';
import PlanDetails from './pages/PlanDetails';
import About from './pages/About';
import Messages from './pages/Messages';

// Components
import Navbar from './components/Navbar';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2962ff', // Vibrant blue
      dark: '#0039cb',
      light: '#768fff',
    },
    secondary: {
      main: '#ff3d00', // Energetic orange
      dark: '#c30000',
      light: '#ff7539',
    },
    background: {
      default: '#f5f5f7',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
      letterSpacing: 0.5,
    },
    subtitle2: {
      fontWeight: 400,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <Box component="main" sx={{ flexGrow: 1, background: '#f5f5f7' }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/create-plan" element={<CreatePlan />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/plan/:id" element={<PlanDetails />} />
                <Route path="/about" element={<About />} />
                <Route path="/messages" element={<Messages />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 
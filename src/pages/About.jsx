import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Divider,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ExploreIcon from '@mui/icons-material/Explore';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

function About() {
  const features = [
    {
      icon: <GroupsIcon sx={{ fontSize: 40 }} />,
      title: 'Connect with People',
      description: 'Meet new friends who share your interests and passions. Build meaningful connections in your local community.',
    },
    {
      icon: <ExploreIcon sx={{ fontSize: 40 }} />,
      title: 'Discover Activities',
      description: "Find exciting local activities and events. From sports to arts, there's something for everyone.",
    },
    {
      icon: <EmojiEventsIcon sx={{ fontSize: 40 }} />,
      title: 'Create Experiences',
      description: 'Host your own events and create memorable experiences. Share your interests with others and build communities.',
    },
  ];

  return (
    <Box sx={{ py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 8 } }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 3,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              background: 'linear-gradient(45deg, #2962ff 30%, #3949ab 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            About JoinMeOut
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ maxWidth: '800px', mx: 'auto', mb: { xs: 2, md: 4 }, fontSize: { xs: '1.1rem', md: '1.5rem' } }}
          >
            JoinMeOut is a platform that brings people together through shared interests and local activities.
            We believe in the power of real-world connections and memorable experiences.
          </Typography>
          <Divider sx={{ my: { xs: 3, md: 6 } }} />
        </Box>

        {/* Features Section */}
        <Grid container spacing={{ xs: 2, md: 4 }} sx={{ mb: { xs: 4, md: 8 } }}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  p: { xs: 2, md: 3 },
                  borderRadius: 4,
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: { md: 'translateY(-8px)' },
                  },
                }}
                elevation={0}
              >
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: 'primary.main',
                    mb: 2,
                  }}
                >
                  {feature.icon}
                </Avatar>
                <Typography
                  variant="h5"
                  component="h3"
                  sx={{ mb: 1.5, fontWeight: 600, fontSize: { xs: '1.2rem', md: '1.5rem' } }}
                >
                  {feature.title}
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ lineHeight: 1.7, fontSize: { xs: '1rem', md: '1.1rem' } }}
                >
                  {feature.description}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Mission Section */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: 4,
            p: { xs: 3, md: 6 },
            textAlign: 'center',
            mb: { xs: 4, md: 0 },
          }}
        >
          <Typography variant="h4" component="h2" sx={{ mb: 2, fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Our Mission
          </Typography>
          <Typography variant="h6" sx={{ maxWidth: '800px', mx: 'auto', opacity: 0.9, fontSize: { xs: '1.05rem', md: '1.25rem' } }}>
            We're on a mission to make it easier for people to connect, explore their interests,
            and create meaningful experiences together. In a world that's increasingly digital,
            we believe in the value of real-world connections and shared experiences.
          </Typography>
        </Box>

        {/* Contact Section */}
        <Box sx={{ mt: { xs: 4, md: 8 }, textAlign: 'center', px: { xs: 1, md: 0 } }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
            Contact Us
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.98rem', md: '1.1rem' } }}>
            For questions, feedback, or support, email us at
            {' '}
            <a href="mailto:contact@joinmeout.com" style={{ color: '#2962ff', textDecoration: 'underline', fontWeight: 500 }}>
              contact@joinmeout.com
            </a>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default About; 
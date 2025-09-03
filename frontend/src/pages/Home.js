import React, { useState, useEffect } from 'react';
import { Box, Container, Tabs, Tab, Grid, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import VideoCard from '../components/videos/VideoCard';
import CategoryChip from '../components/common/CategoryChip';
import { useVideos } from '../hooks/useVideos';

const categories = [
  'All',
  'Trending',
  'Mukbang',
  'Cooking',
  'Street Food',
  'Desserts',
  'Vegan',
  'Fast Food',
  'Healthy',
  'Asian',
  'Italian',
  'Indian'
];

const featuredVideos = [
  {
    id: 1,
    title: 'Spicy Noodle Challenge',
    views: '1.2M',
    timestamp: '2 days ago',
    thumbnail: '/thumbnails/featured1.jpg',
    channel: 'FoodExplorer',
    channelAvatar: '/avatars/channel1.jpg',
    duration: '12:45',
    isLive: true
  },
  {
    id: 2,
    title: 'Giant Pizza Mukbang',
    views: '3.4M',
    timestamp: '1 week ago',
    thumbnail: '/thumbnails/featured2.jpg',
    channel: 'MukbangMaster',
    channelAvatar: '/avatars/channel2.jpg',
    duration: '24:12'
  },
  {
    id: 3,
    title: 'Street Food Tour',
    views: '5.1M',
    timestamp: '3 days ago',
    thumbnail: '/thumbnails/featured3.jpg',
    channel: 'FoodieAdventures',
    channelAvatar: '/avatars/channel3.jpg',
    duration: '18:30'
  },
  {
    id: 4,
    title: 'Homemade Pasta Recipe',
    views: '890K',
    timestamp: '5 days ago',
    thumbnail: '/thumbnails/featured4.jpg',
    channel: 'ChefAtHome',
    channelAvatar: '/avatars/channel4.jpg',
    duration: '15:20'
  }
];

const Home = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { videos, loading, error } = useVideos(selectedCategory);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <p>Error loading videos. Please try again later.</p>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: { xs: 8, sm: 10 }, pb: 4 }}>
      {/* Hero Section */}
      <Box sx={{ mb: 4, px: { xs: 2, sm: 3 } }}>
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={20}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          style={{
            '--swiper-navigation-color': theme.palette.primary.main,
            '--swiper-pagination-color': theme.palette.primary.main,
            borderRadius: '12px',
            boxShadow: theme.shadows[2]
          }}
        >
          {featuredVideos.map((video) => (
            <SwiperSlide key={video.id}>
              <Box 
                sx={{
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  height: { xs: '200px', sm: '300px', md: '400px' },
                  '&:hover': {
                    '& .hero-overlay': {
                      opacity: 0.8
                    },
                    '& .hero-content': {
                      transform: 'translateY(0)'
                    }
                  }
                }}
              >
                <Box
                  component="img"
                  src={video.thumbnail}
                  alt={video.title}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                <Box 
                  className="hero-overlay"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                    p: 3,
                    color: 'white',
                    transition: 'opacity 0.3s ease',
                    opacity: 0.6
                  }}
                >
                  <Box 
                    className="hero-content"
                    sx={{
                      maxWidth: '800px',
                      mx: 'auto',
                      transform: 'translateY(20px)',
                      transition: 'transform 0.3s ease',
                      p: 3
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {video.isLive && (
                        <Box 
                          sx={{
                            bgcolor: 'error.main',
                            color: 'white',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            mr: 2
                          }}
                        >
                          <Box 
                            sx={{
                              width: 8,
                              height: 8,
                              bgcolor: 'white',
                              borderRadius: '50%',
                              mr: 0.5,
                              animation: 'pulse 1.5s infinite'
                            }}
                          />
                          LIVE
                        </Box>
                      )}
                      <Box 
                        sx={{
                          bgcolor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}
                      >
                        {video.duration}
                      </Box>
                    </Box>
                    <Box 
                      component="h2" 
                      sx={{
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                        fontWeight: 700,
                        mb: 1,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }}
                    >
                      {video.title}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box 
                        component="img" 
                        src={video.channelAvatar} 
                        alt={video.channel}
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          mr: 1.5
                        }}
                      />
                      <Box sx={{ fontSize: '0.9rem' }}>{video.channel}</Box>
                      <Box sx={{ mx: 1 }}>•</Box>
                      <Box sx={{ fontSize: '0.9rem' }}>{video.views} views</Box>
                      <Box sx={{ mx: 1 }}>•</Box>
                      <Box sx={{ fontSize: '0.9rem' }}>{video.timestamp}</Box>
                    </Box>
                    <Box 
                      sx={{
                        display: 'flex',
                        gap: 1,
                        flexWrap: 'wrap',
                        mt: 2
                      }}
                    >
                      <CategoryChip label="Trending" />
                      <CategoryChip label="Mukbang" />
                      <CategoryChip label="Spicy" />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </SwiperSlide>
          ))}
        </Swiper>
      </Box>

      <Container maxWidth="xl">
        {/* Categories */}
        <Box sx={{ mb: 4, overflowX: 'auto', pb: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, px: { xs: 2, sm: 3 } }}>
            {categories.map((category) => (
              <CategoryChip
                key={category}
                label={category}
                selected={selectedCategory === category}
                onClick={() => handleCategorySelect(category)}
              />
            ))}
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, px: { xs: 2, sm: 3 } }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="video categories"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="For You" />
            <Tab label="Trending" />
            <Tab label="Following" />
            <Tab label="New" />
            <Tab label="Watch Later" />
            <Tab label="Saved" />
          </Tabs>
        </Box>

        {/* Video Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ px: { xs: 2, sm: 3 } }}>
            {videos.map((video) => (
              <Grid item key={video._id} xs={12} sm={6} md={4} lg={3}>
                <VideoCard video={video} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default Home;

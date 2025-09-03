import React from 'react';
import { Box, Typography, Skeleton, Card, CardContent, CardMedia, Avatar, Chip, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Visibility, AccessTime } from '@mui/icons-material';

const RelatedVideos = ({ videos = [], loading = false, currentVideoId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  // Filter out the current video from related videos
  const filteredVideos = videos.filter(video => video._id !== currentVideoId);

  if (loading) {
    return (
      <Box>
        {[...Array(5)].map((_, index) => (
          <Box key={index} sx={{ display: 'flex', mb: 2 }}>
            <Skeleton 
              variant="rectangular" 
              width={isMobile ? 120 : 168} 
              height={isMobile ? 68 : 94} 
            />
            <Box sx={{ pl: 1, width: '100%' }}>
              <Skeleton width={isMobile ? '100%' : '90%'} height={isMobile ? 16 : 20} />
              <Skeleton 
                width={isMobile ? '80%' : '60%'} 
                height={isMobile ? 14 : 16} 
                sx={{ mt: 1 }} 
              />
              {!isMobile && (
                <Skeleton width="40%" height={14} sx={{ mt: 0.5 }} />
              )}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  if (filteredVideos.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No related videos found
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, pl: 1 }}>
        Related Videos
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredVideos.slice(0, 5).map((video) => (
          <Card 
            key={video._id} 
            elevation={0}
            onClick={() => navigate(`/videos/${video._id}`)}
            sx={{
              display: 'flex',
              cursor: 'pointer',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              transition: 'background-color 0.2s',
              overflow: 'visible',
              boxShadow: 'none',
            }}
          >
            <Box sx={{ 
              position: 'relative', 
              minWidth: { xs: 120, sm: 168 },
              flexShrink: 0
            }}>
              <CardMedia
                component="img"
                image={video.thumbnail || '/placeholder-thumbnail.jpg'}
                alt={video.title}
                sx={{
                  width: { xs: 120, sm: 168 },
                  height: { xs: 68, sm: 94 },
                  borderRadius: 1,
                  objectFit: 'cover',
                }}
              />
              {video.duration && (
                <Chip
                  label={video.duration}
                  size="small"
                  sx={{
                    position: 'absolute',
                    width: { xs: 20, sm: 24 }, 
                    height: { xs: 20, sm: 24 }, 
                    bottom: 8,
                    right: 8,
                    mr: { xs: 0.5, sm: 1 },
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: '#fff',
                    fontSize: '0.7rem',
                  }}
                />
              )}
            </Box>
            
            <CardContent sx={{ p: 1, pl: 1.5, '&:last-child': { pb: 1 } }}>
              <Typography 
                variant={isMobile ? 'caption' : 'subtitle2'} 
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontWeight: 500,
                  lineHeight: 1.3,
                  mb: 0.5,
                }}
              >
                {video.title}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography 
                  variant={isMobile ? 'caption' : 'body2'} 
                  color="text.secondary"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mr: 1.5,
                  }}
                >
                  <Visibility fontSize="inherit" sx={{ fontSize: '0.9em', mr: 0.5 }} />
                  {video.views?.toLocaleString() || '0'}
                </Typography>
                <Typography 
                  variant={isMobile ? 'caption' : 'body2'} 
                  color="text.secondary"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <AccessTime fontSize="inherit" sx={{ fontSize: '0.9em', mr: 0.5 }} />
                  {video.uploadedAt ? formatDistanceToNow(new Date(video.uploadedAt), { addSuffix: true }) : 'Just now'}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Avatar 
                  src={video.channel?.avatar} 
                  alt={video.channel?.name}
                  sx={{ width: 24, height: 24, mr: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {video.channel?.name || 'Unknown'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default RelatedVideos;

import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Card, CardActionArea, CardContent, CardMedia, Typography, Box, Avatar, IconButton, Menu, MenuItem } from '@mui/material';
import { MoreVert, WatchLater, PlaylistAdd, Share, Report } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { formatDistanceToNow } from 'date-fns';

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const VideoThumbnail = styled(Box)({
  position: 'relative',
  paddingTop: '56.25%', // 16:9 aspect ratio
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  borderRadius: '12px 12px 0 0',
  overflow: 'hidden',
});

const DurationBadge = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: 8,
  right: 8,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: 'white',
  padding: '2px 6px',
  borderRadius: 4,
  fontSize: '0.75rem',
  fontWeight: 500,
  backdropFilter: 'blur(4px)',
}));

const LiveBadge = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  left: 8,
  backgroundColor: theme.palette.error.main,
  color: 'white',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: '0.7rem',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  '&::before': {
    content: '""',
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: 'white',
    marginRight: 4,
    animation: 'pulse 1.5s infinite',
  },
}));

const VideoCard = ({ video }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setAnchorEl(null);
  };

  const formatViewCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count;
  };

  return (
    <StyledCard elevation={0}>
      <CardActionArea component={RouterLink} to={`/videos/${video._id}`}>
        <VideoThumbnail>
          <CardMedia
            component="img"
            image={video.thumbnail || '/placeholder-video.jpg'}
            alt={video.title}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {video.isLive && <LiveBadge>LIVE</LiveBadge>}
          <DurationBadge>
            {video.isLive ? 'LIVE' : video.duration || '0:00'}
          </DurationBadge>
        </VideoThumbnail>
      </CardActionArea>
      
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex' }}>
          <Avatar 
            alt={video.user?.name || 'User'} 
            src={video.user?.avatar} 
            sx={{ width: 36, height: 36, mr: 1.5 }}
            component={RouterLink}
            to={`/users/${video.user?.username || 'user'}`}
            onClick={(e) => e.stopPropagation()}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle2" 
              component="div"
              sx={{
                fontWeight: 500,
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {video.title}
            </Typography>
            <Typography 
              variant="caption" 
              color="text.secondary"
              component={RouterLink}
              to={`/users/${video.user?.username || 'user'}`}
              onClick={(e) => e.stopPropagation()}
              sx={{
                display: 'block',
                mt: 0.5,
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {video.user?.name || 'Unknown User'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {formatViewCount(video.views || 0)} views
              </Typography>
              <Box component="span" mx={0.5}>•</Box>
              <Typography variant="caption" color="text.secondary">
                {video.createdAt ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) : 'Some time ago'}
              </Typography>
            </Box>
          </Box>
          <Box>
            <IconButton 
              size="small" 
              onClick={handleMenuClick}
              sx={{ ml: 0.5 }}
              aria-label="more options"
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {video.tags && video.tags.length > 0 && (
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {video.tags.slice(0, 2).map((tag, index) => (
              <Box 
                key={index}
                component="span"
                sx={{
                  fontSize: '0.65rem',
                  color: 'primary.main',
                  backgroundColor: 'primary.lighter',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                }}
              >
                {tag}
              </Box>
            ))}
            {video.tags.length > 2 && (
              <Box 
                component="span"
                sx={{
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                  ml: 0.5,
                  alignSelf: 'center',
                }}
              >
                +{video.tags.length - 2} more
              </Box>
            )}
          </Box>
        )}
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        PaperProps={{
          elevation: 1,
          sx: {
            width: 200,
            borderRadius: 2,
            overflow: 'visible',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem>
          <WatchLater fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
          Save to Watch Later
        </MenuItem>
        <MenuItem>
          <PlaylistAdd fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
          Add to Playlist
        </MenuItem>
        <MenuItem>
          <Share fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
          Share
        </MenuItem>
        <MenuItem>
          <Report fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
          Report
        </MenuItem>
      </Menu>
    </StyledCard>
  );
};

export default VideoCard;

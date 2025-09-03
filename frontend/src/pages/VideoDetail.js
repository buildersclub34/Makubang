import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Grid, 
  Typography, 
  IconButton, 
  Button, 
  Paper, 
  Box, 
  useTheme, 
  useMediaQuery,
  CircularProgress,
  Divider,
  Chip,
  Avatar,
  Tooltip
} from '@mui/material';
import { 
  ThumbUp, 
  ThumbDown, 
  Bookmark, 
  BookmarkBorder, 
  MoreVert, 
  Share as ShareIcon, 
  Reply,
  ArrowBack,
  Speed as SpeedIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import ReactPlayer from 'react-player';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useVideo } from '../hooks/useVideo';
import VideoCard from '../components/videos/VideoCard';
import Comment from '../components/comments/Comment';
import RelatedVideos from '../components/videos/RelatedVideos';
import ShareButton from '../components/videos/ShareButton';
import VideoQualitySelector from '../components/videos/VideoQualitySelector';
import api from '../utils/api';

const VideoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  
  const { video, loading, error, likeVideo, dislikeVideo, addComment } = useVideo(id);
  const [newComment, setNewComment] = useState('');
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [localVideo, setLocalVideo] = useState({
    isLiked: false,
    isDisliked: false,
    isSaved: false,
    likes: 0,
    dislikes: 0,
    comments: []
  });

  // Format view count
  const formatViewCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count;
  };

  // Handle like action
  const handleLike = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/videos/${id}` } });
      return;
    }
    
    try {
      await likeVideo();
      setLocalVideo(prev => ({
        ...prev,
        isLiked: !prev.isLiked,
        isDisliked: false,
        likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
        dislikes: prev.isDisliked ? prev.dislikes - 1 : prev.dislikes
      }));
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  // Handle dislike action
  const handleDislike = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/videos/${id}` } });
      return;
    }
    
    try {
      await dislikeVideo();
      setLocalVideo(prev => ({
        ...prev,
        isDisliked: !prev.isDisliked,
        isLiked: false,
        dislikes: prev.isDisliked ? prev.dislikes - 1 : prev.dislikes + 1,
        likes: prev.isLiked ? prev.likes - 1 : prev.likes
      }));
    } catch (error) {
      console.error('Error disliking video:', error);
    }
  };

  // Handle save to watch later
  const handleSave = () => {
    if (!user) {
      navigate('/login', { state: { from: `/videos/${id}` } });
      return;
    }
    setLocalVideo(prev => ({ ...prev, isSaved: !prev.isSaved }));
  };

  // Handle comment actions
  const handleCommentAction = async (action, commentId, data = {}) => {
    if (!user) {
      navigate('/login', { state: { from: `/videos/${id}` } });
      return;
    }

    try {
      switch (action) {
        case 'add':
          const newComment = await addComment(data.text);
          setLocalVideo(prev => ({
            ...prev,
            comments: [newComment, ...prev.comments]
          }));
          break;
          
        case 'reply':
          const reply = await api.post(`/videos/${id}/comments/${commentId}/reply`, {
            text: data.text
          }, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          
          setLocalVideo(prev => ({
            ...prev,
            comments: prev.comments.map(comment => 
              comment._id === commentId 
                ? { ...comment, replies: [...(comment.replies || []), reply.data] }
                : comment
            )
          }));
          break;
          
        case 'like':
          await api.post(`/videos/comments/${commentId}/like`, {}, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          
          setLocalVideo(prev => ({
            ...prev,
            comments: updateCommentLikes(prev.comments, commentId, true, false)
          }));
          break;
          
        case 'dislike':
          await api.post(`/videos/comments/${commentId}/dislike`, {}, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          
          setLocalVideo(prev => ({
            ...prev,
            comments: updateCommentLikes(prev.comments, commentId, false, true)
          }));
          break;
          
        case 'edit':
          await api.put(`/videos/comments/${commentId}`, {
            text: data.text
          }, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          
          setLocalVideo(prev => ({
            ...prev,
            comments: updateCommentText(prev.comments, commentId, data.text)
          }));
          break;
          
        case 'delete':
          await api.delete(`/videos/comments/${commentId}`, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          
          setLocalVideo(prev => ({
            ...prev,
            comments: removeComment(prev.comments, commentId)
          }));
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action} on comment:`, error);
      // Handle error (show snackbar or toast)
    }
  };
  
  // Helper function to update comment likes/dislikes
  const updateCommentLikes = (comments, commentId, isLike, isDislike) => {
    return comments.map(comment => {
      if (comment._id === commentId) {
        return {
          ...comment,
          isLiked: isLike ? !comment.isLiked : false,
          isDisliked: isDislike ? !comment.isDisliked : false,
          likes: isLike 
            ? comment.isLiked ? comment.likes - 1 : comment.likes + 1
            : comment.likes,
          dislikes: isDislike
            ? comment.isDisliked ? comment.dislikes - 1 : comment.dislikes + 1
            : comment.dislikes
        };
      }
      
      // Check replies
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentLikes(comment.replies, commentId, isLike, isDislike)
        };
      }
      
      return comment;
    });
  };
  
  // Helper function to update comment text
  const updateCommentText = (comments, commentId, newText) => {
    return comments.map(comment => {
      if (comment._id === commentId) {
        return {
          ...comment,
          text: newText,
          editedAt: new Date().toISOString()
        };
      }
      
      // Check replies
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentText(comment.replies, commentId, newText)
        };
      }
      
      return comment;
    });
  };
  
  // Helper function to remove a comment
  const removeComment = (comments, commentId) => {
    return comments.reduce((acc, comment) => {
      // If this is the comment to remove, skip it
      if (comment._id === commentId) {
        return acc;
      }
      
      // Otherwise, process replies if they exist
      if (comment.replies && comment.replies.length > 0) {
        const filteredReplies = removeComment(comment.replies, commentId);
        return [...acc, { ...comment, replies: filteredReplies }];
      }
      
      return [...acc, comment];
    }, []);
  };

  // Update local state when video data loads
  useEffect(() => {
    if (video) {
      setLocalVideo({
        isLiked: video.isLiked || false,
        isDisliked: video.isDisliked || false,
        isSaved: video.isSaved || false,
        likes: video.likes || 0,
        dislikes: video.dislikes || 0,
        comments: video.comments || []
      });
      
      // Fetch related videos when video data is loaded
      const fetchRelatedVideos = async () => {
        try {
          setRelatedLoading(true);
          // This endpoint should be implemented in your backend
          // It should return videos from the same category or based on other relevance criteria
          const response = await api.get(`/videos/related/${video._id}`, {
            params: {
              limit: 6,
              exclude: video._id
            }
          });
          setRelatedVideos(response.data);
        } catch (err) {
          console.error('Error fetching related videos:', err);
          // Fallback to empty array on error
          setRelatedVideos([]);
        } finally {
          setRelatedLoading(false);
        }
      };
      
      fetchRelatedVideos();
    }
  }, [video]);

  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState('auto');
  const [showControls, setShowControls] = useState(false);
  const [player, setPlayer] = useState(null);

  // Handle quality change
  const handleQualityChange = (newQuality) => {
    setQuality(newQuality);
    // In a real app, you would update the video source based on the selected quality
    console.log(`Changing video quality to ${newQuality}p`);
  };

  // Handle playback rate change
  const handlePlaybackRateChange = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  // Format playback rate for display
  const formatPlaybackRate = (rate) => {
    return rate === 1 ? 'Normal' : `${rate.toFixed(2)}x`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="error" gutterBottom>
          Error loading video
        </Typography>
        <Typography color="textSecondary" paragraph>
          {error.message || 'An error occurred while loading the video.'}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (!video) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" gutterBottom>
          Video not found
        </Typography>
        <Typography color="textSecondary" paragraph>
          The video you're looking for doesn't exist or has been removed.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Browse Videos
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1, sm: 2, md: 3 } }}>
      <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
        {/* Main Video Content */}
        <Grid item xs={12} lg={8}>
          {/* Back Button - Mobile Only */}
          <IconButton 
            onClick={() => navigate(-1)}
            sx={{ 
              display: { xs: 'flex', sm: 'none' },
              mb: 1,
              color: 'text.primary'
            }}
          >
            <ArrowBack />
          </IconButton>
          {/* Video Player */}
          <Box 
            sx={{ 
              position: 'relative', 
              paddingTop: '56.25%', // 16:9 aspect ratio
              backgroundColor: '#000',
              borderRadius: 1,
              overflow: 'hidden',
              '&:hover .video-controls': {
                opacity: 1,
              },
            }}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            <ReactPlayer
              ref={setPlayer}
              className="video-player"
              url={video.videoUrl}
              width="100%"
              height="100%"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
              }}
              controls={false}
              playing
              playbackRate={playbackRate}
              light={video.thumbnail}
              onPlay={() => setShowControls(true)}
              onPause={() => setShowControls(true)}
              config={{
                file: {
                  attributes: {
                    disablePictureInPicture: true
                  }
                }
              }}
            />
            
            {/* Custom Controls Overlay */}
            <Box 
              className="video-controls"
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                padding: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                opacity: showControls ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
                zIndex: 10,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Box sx={{ flexGrow: 1 }} />
                
                {/* Playback Speed */}
                <Tooltip title={`Playback Speed (${formatPlaybackRate(playbackRate)})`}>
                  <IconButton
                    size="small"
                    onClick={handlePlaybackRateChange}
                    sx={{
                      color: 'white',
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      },
                      p: 0.5,
                      mx: 0.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <SpeedIcon fontSize="small" />
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1 }}>
                        {formatPlaybackRate(playbackRate)}
                      </Typography>
                    </Box>
                  </IconButton>
                </Tooltip>
                
                {/* Quality Selector */}
                <VideoQualitySelector 
                  currentQuality={quality}
                  onQualityChange={handleQualityChange}
                  availableQualities={['auto', '1080', '720', '480', '360']}
                />
              </Box>
            </Box>
          </Box>

          {/* Video Title and Actions */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
              {video.title}
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                <Box 
                  component="span" 
                  sx={{ 
                    fontSize: '0.9rem',
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {formatViewCount(video.views || 0)} views • {video.createdAt ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) : 'Some time ago'}
                </Box>
              </Box>
              
              {video.tags && video.tags.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: { xs: 1, sm: 0 } }}>
                  {video.tags.slice(0, 3).map((tag, index) => (
                    <Chip 
                      key={index} 
                      label={tag} 
                      size="small"
                      component="a"
                      href={`/tags/${tag}`}
                      clickable
                      sx={{ 
                        height: 24,
                        '& .MuiChip-label': { px: 1 },
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Button
                variant={localVideo.isLiked ? 'contained' : 'outlined'}
                color={localVideo.isLiked ? 'primary' : 'inherit'}
                size="small"
                startIcon={localVideo.isLiked ? <ThumbUp /> : <ThumbUpOutlined />}
                onClick={handleLike}
                sx={{
                  borderRadius: 20,
                  px: 2,
                  '&:hover': {
                    backgroundColor: localVideo.isLiked ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                {formatViewCount(localVideo.likes)}
              </Button>
              
              <Button
                variant={localVideo.isDisliked ? 'contained' : 'outlined'}
                color={localVideo.isDisliked ? 'error' : 'inherit'}
                size="small"
                startIcon={localVideo.isDisliked ? <ThumbDown /> : <ThumbDownOutlined />}
                onClick={handleDislike}
                sx={{
                  borderRadius: 20,
                  px: 2,
                  '&:hover': {
                    backgroundColor: localVideo.isDisliked ? 'error.dark' : 'action.hover',
                  },
                }}
              >
                {formatViewCount(localVideo.dislikes)}
              </Button>
              
              <ShareButton 
                url={`/videos/${video._id}`}
                title={video.title}
                description={video.description}
              />
              
              <Button
                variant="outlined"
                size="small"
                startIcon={localVideo.isSaved ? <Bookmark /> : <BookmarkBorder />}
                onClick={handleSave}
                sx={{
                  borderRadius: 20,
                  px: 2,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                {localVideo.isSaved ? 'Saved' : 'Save'}
              </Button>
              
              <IconButton
                aria-label="more options"
                sx={{
                  ml: 'auto',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <MoreVert />
              </IconButton>
            </Box>
          </Box>
          
          {/* Channel Info */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 2, sm: 3 }, 
              mb: 3, 
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Avatar 
                src={video.channel?.avatar} 
                alt={video.channel?.name}
                sx={{ width: 48, height: 48, mr: 2 }}
                component="a"
                href={`/channel/${video.channel?.id}`}
              />
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography 
                    variant="subtitle1" 
                    component="a"
                    href={`/channel/${video.channel?.id}`}
                    sx={{ 
                      fontWeight: 600, 
                      textDecoration: 'none',
                      color: 'text.primary',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {video.channel?.name || 'Unknown Channel'}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto', gap: 1 }}>
                    <Button 
                      variant={video.channel?.isSubscribed ? 'outlined' : 'contained'}
                      color="primary"
                      size="small"
                      sx={{ borderRadius: 20, px: 2, fontWeight: 600 }}
                    >
                      {video.channel?.isSubscribed ? 'Subscribed' : 'Subscribe'}
                    </Button>
                    <IconButton size="small" sx={{ ml: 0.5 }}>
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {formatViewCount(video.channel?.subscribers || 0)} subscribers • {video.channel?.videos || 0} videos
                </Typography>
                
                <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: 'pre-line' }}>
                  {video.description || 'No description available.'}
                </Typography>
                
                <Button 
                  size="small" 
                  sx={{ mt: 1, color: 'text.secondary' }}
                >
                  Show more
                </Button>
              </Box>
            </Box>
          </Paper>
          
          {/* Comments Section */}
          <Box sx={{ mb: 4, px: { xs: 0, sm: 0 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mr: 2 }}>
                {localVideo.comments?.length || 0} Comments
              </Typography>
            </Box>
            
            {/* Add Comment */}
            {isAuthenticated ? (
              <Box sx={{ display: 'flex', mb: 3 }}>
                <Avatar 
                  src={user.avatar} 
                  alt={user.name}
                  sx={{ width: 40, height: 40, mr: 2 }}
                />
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Add a public comment..."
                    size="small"
                    multiline
                    maxRows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    InputProps={{
                      sx: {
                        borderRadius: 2,
                        backgroundColor: 'background.paper',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, gap: 1 }}>
                    <Button 
                      size="small" 
                      onClick={() => setNewComment('')}
                      disabled={!newComment.trim()}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      size="small" 
                      onClick={() => handleCommentAction('add', null, { text: newComment })}
                      disabled={!newComment.trim()}
                    >
                      Comment
                    </Button>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/login', { state: { from: `/videos/${id}` } })}
                >
                  Sign in to comment
                </Button>
              </Box>
            )}
            
            {/* Comments List */}
            <Box>
              {localVideo.comments?.length > 0 ? (
                localVideo.comments.map((comment) => (
                  <Comment
                    key={comment._id}
                    comment={comment}
                    onLike={() => handleCommentAction('like', comment._id)}
                    onDislike={() => handleCommentAction('dislike', comment._id)}
                    onReply={(commentId, text) => handleCommentAction('reply', commentId, { text })}
                    onEdit={(commentId, text) => handleCommentAction('edit', commentId, { text })}
                    onDelete={(commentId) => handleCommentAction('delete', commentId)}
                    onReport={(commentId) => handleCommentAction('report', commentId)}
                    isAuthenticated={!!user}
                    currentUserId={user?._id}
                  />
                ))
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No comments yet. Be the first to comment!
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
        
        {/* Sidebar - Related Videos */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ position: 'sticky', top: 80 }}>
            <RelatedVideos 
              videos={relatedVideos}
              loading={relatedLoading}
              currentVideoId={id}
            />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default VideoDetail;

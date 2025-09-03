import React, { useState } from 'react';
import { 
  Box, 
  Avatar, 
  Typography, 
  IconButton, 
  Button, 
  Menu, 
  MenuItem, 
  TextField,
  Divider,
  Collapse
} from '@mui/material';
import { 
  ThumbUp, 
  ThumbDown, 
  MoreVert, 
  Reply, 
  ThumbUpOutlined, 
  ThumbDownOutlined 
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

const Comment = ({ 
  comment, 
  onLike, 
  onDislike, 
  onReply,
  onDelete,
  onEdit,
  onReport,
  level = 0,
  isAuthenticated = false,
  currentUserId = null
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showReplies, setShowReplies] = useState(level === 0);
  
  const isOwnComment = currentUserId === comment.user._id;
  const hasReplies = comment.replies && comment.replies.length > 0;
  
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleReply = () => {
    setShowReplyForm(!showReplyForm);
    if (!showReplyForm) {
      setReplyText('');
    }
  };
  
  const handleSubmitReply = (e) => {
    e.preventDefault();
    if (replyText.trim()) {
      onReply(comment._id, replyText);
      setReplyText('');
      setShowReplyForm(false);
    }
  };
  
  const handleEdit = () => {
    if (isEditing) {
      onEdit(comment._id, editText);
    }
    setIsEditing(!isEditing);
    handleMenuClose();
  };
  
  const handleDelete = () => {
    onDelete(comment._id);
    handleMenuClose();
  };
  
  const handleReport = () => {
    onReport(comment._id);
    handleMenuClose();
  };
  
  const toggleReplies = () => {
    setShowReplies(!showReplies);
  };
  
  return (
    <Box 
      sx={{ 
        mb: 2,
        pl: level > 0 ? 3 : 0,
        borderLeft: level > 0 ? `2px solid ${theme => theme.palette.divider}` : 'none',
        position: 'relative',
        '&:hover .comment-actions': {
          opacity: 1
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <Avatar 
          src={comment.user.avatar} 
          alt={comment.user.name} 
          sx={{ width: 40, height: 40, mt: 1 }}
        />
        
        <Box sx={{ flex: 1, ml: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600, 
                mr: 1,
                '&:hover': {
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }
              }}
            >
              {comment.user.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </Typography>
            
            {comment.editedAt && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontStyle: 'italic' }}>
                (edited)
              </Typography>
            )}
            
            <Box sx={{ flexGrow: 1 }} />
            
            <IconButton 
              size="small" 
              onClick={handleMenuOpen}
              sx={{ 
                opacity: 0,
                transition: 'opacity 0.2s',
                '&:focus': {
                  opacity: 1
                }
              }}
              className="comment-actions"
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>
          
          {isEditing ? (
            <Box component="form" onSubmit={(e) => {
              e.preventDefault();
              handleEdit();
            }}>
              <TextField
                fullWidth
                multiline
                variant="outlined"
                size="small"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                sx={{ mb: 1 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button 
                  size="small" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  size="small"
                  disabled={!editText.trim()}
                >
                  Save
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
              {comment.text}
            </Typography>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
            <Button 
              size="small" 
              startIcon={comment.isLiked ? <ThumbUp fontSize="small" /> : <ThumbUpOutlined fontSize="small" />}
              onClick={() => onLike(comment._id)}
              sx={{ 
                color: comment.isLiked ? 'primary.main' : 'text.secondary',
                minWidth: 'auto',
                px: 1,
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              {comment.likes > 0 ? comment.likes : ''}
            </Button>
            
            <Button 
              size="small" 
              startIcon={comment.isDisliked ? <ThumbDown fontSize="small" /> : <ThumbDownOutlined fontSize="small" />}
              onClick={() => onDislike(comment._id)}
              sx={{ 
                color: comment.isDisliked ? 'error.main' : 'text.secondary',
                minWidth: 'auto',
                px: 1,
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            />
            
            <Button 
              size="small" 
              startIcon={<Reply fontSize="small" />}
              onClick={handleReply}
              sx={{ 
                color: 'text.secondary',
                ml: 1,
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              Reply
            </Button>
            
            {hasReplies && (
              <Button 
                size="small" 
                onClick={toggleReplies}
                sx={{ 
                  color: 'primary.main',
                  ml: 'auto',
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                {showReplies ? 'Hide replies' : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
              </Button>
            )}
          </Box>
          
          {/* Reply Form */}
          <Collapse in={showReplyForm} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 2, pl: 2, borderLeft: `2px solid ${theme => theme.palette.divider}` }}>
              <Box component="form" onSubmit={handleSubmitReply} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Avatar 
                  src={isAuthenticated ? currentUser?.avatar : ''} 
                  alt={isAuthenticated ? currentUser?.name : 'User'}
                  sx={{ width: 32, height: 32, mt: 0.5 }}
                />
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  InputProps={{
                    sx: {
                      borderRadius: 4,
                      backgroundColor: 'background.paper',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }
                  }}
                />
                <Button 
                  type="submit" 
                  variant="contained" 
                  size="small"
                  disabled={!replyText.trim()}
                  sx={{ borderRadius: 2, minWidth: 80 }}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          </Collapse>
        </Box>
        
        {/* Comment Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {isOwnComment ? (
            <>
              <MenuItem onClick={handleEdit}>
                Edit
              </MenuItem>
              <MenuItem onClick={handleDelete}>
                Delete
              </MenuItem>
            </>
          ) : (
            <MenuItem onClick={handleReport}>
              Report
            </MenuItem>
          )}
        </Menu>
      </Box>
      
      {/* Nested Replies */}
      {hasReplies && showReplies && (
        <Box sx={{ mt: 2 }}>
          {comment.replies.map((reply) => (
            <Comment
              key={reply._id}
              comment={reply}
              onLike={onLike}
              onDislike={onDislike}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              onReport={onReport}
              level={level + 1}
              isAuthenticated={isAuthenticated}
              currentUserId={currentUserId}
            />
          ))}
        </Box>
      )}
      
      {level === 0 && <Divider sx={{ mt: 2 }} />}
    </Box>
  );
};

export default Comment;

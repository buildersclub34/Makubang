import React, { useState } from 'react';
import { 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText, 
  Typography,
  Snackbar,
  Alert,
  Box
} from '@mui/material';
import {
  Share as ShareIcon,
  Link as LinkIcon,
  Facebook,
  Twitter,
  WhatsApp,
  Email,
  ContentCopy
} from '@mui/icons-material';
import { FacebookShareButton, TwitterShareButton, WhatsappShareButton, EmailShareButton } from 'react-share';

const ShareButton = ({ url, title, description }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = title || 'Check out this video';
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setSnackbarMessage('Link copied to clipboard!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      handleClose();
    } catch (err) {
      setSnackbarMessage('Failed to copy link');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };
  
  const shareOptions = [
    {
      name: 'Copy link',
      icon: <ContentCopy fontSize="small" />,
      action: handleCopyLink,
      button: null
    },
    {
      name: 'Facebook',
      icon: <Facebook fontSize="small" color="primary" />,
      action: null,
      button: (
        <FacebookShareButton
          url={shareUrl}
          quote={shareTitle}
          className="share-button"
        >
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <ListItemIcon>
              <Facebook color="primary" />
            </ListItemIcon>
            <ListItemText>Facebook</ListItemText>
          </Box>
        </FacebookShareButton>
      )
    },
    {
      name: 'Twitter',
      icon: <Twitter fontSize="small" color="info" />,
      action: null,
      button: (
        <TwitterShareButton
          url={shareUrl}
          title={shareTitle}
          className="share-button"
        >
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <ListItemIcon>
              <Twitter color="info" />
            </ListItemIcon>
            <ListItemText>Twitter</ListItemText>
          </Box>
        </TwitterShareButton>
      )
    },
    {
      name: 'WhatsApp',
      icon: <WhatsApp fontSize="small" color="success" />,
      action: null,
      button: (
        <WhatsappShareButton
          url={shareUrl}
          title={shareTitle}
          separator=":: "
          className="share-button"
        >
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <ListItemIcon>
              <WhatsApp color="success" />
            </ListItemIcon>
            <ListItemText>WhatsApp</ListItemText>
          </Box>
        </WhatsappShareButton>
      )
    },
    {
      name: 'Email',
      icon: <Email fontSize="small" color="action" />,
      action: null,
      button: (
        <EmailShareButton
          url={shareUrl}
          subject={shareTitle}
          body={`${shareTitle}\n\n${description || ''}`}
          className="share-button"
        >
          <Box component="span" sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <ListItemIcon>
              <Email color="action" />
            </ListItemIcon>
            <ListItemText>Email</ListItemText>
          </Box>
        </EmailShareButton>
      )
    }
  ];

  return (
    <>
      <IconButton 
        onClick={handleClick}
        aria-label="share"
        sx={{
          color: 'text.primary',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <ShareIcon />
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
            minWidth: 200,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Share this video
        </Typography>
        
        {shareOptions.map((option) => (
          <MenuItem 
            key={option.name} 
            onClick={option.action || (() => {})}
            sx={{ px: 2, py: 1 }}
          >
            {option.button || (
              <>
                <ListItemIcon>
                  {option.icon}
                </ListItemIcon>
                <ListItemText>{option.name}</ListItemText>
              </>
            )}
          </MenuItem>
        ))}
      </Menu>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ShareButton;

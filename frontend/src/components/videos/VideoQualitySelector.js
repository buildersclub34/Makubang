import React, { useState } from 'react';
import { 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText, 
  Typography,
  Box,
  Tooltip
} from '@mui/material';
import { Settings as SettingsIcon, Check as CheckIcon } from '@mui/icons-material';

const qualityOptions = [
  { label: 'Auto', value: 'auto' },
  { label: '1080p', value: '1080' },
  { label: '720p', value: '720' },
  { label: '480p', value: '480' },
  { label: '360p', value: '360' },
  { label: '240p', value: '240' },
  { label: '144p', value: '144' },
];

const VideoQualitySelector = ({ 
  currentQuality, 
  onQualityChange,
  availableQualities = ['auto', '1080', '720', '480', '360', '240', '144']
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleQualitySelect = (quality) => {
    onQualityChange(quality);
    handleClose();
  };

  // Filter available qualities based on what's supported
  const supportedQualities = qualityOptions.filter(option => 
    availableQualities.includes(option.value)
  );

  // Get the label for the current quality
  const currentQualityLabel = qualityOptions.find(q => q.value === currentQuality)?.label || 'Auto';

  return (
    <>
      <Tooltip title="Quality">
        <IconButton
          onClick={handleClick}
          size="small"
          aria-label="video quality"
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
            <SettingsIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1 }}>
              {currentQualityLabel}
            </Typography>
          </Box>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 150,
            maxHeight: 300,
            '& .MuiMenuItem-root': {
              minHeight: 36,
            },
          },
        }}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          Quality
        </Typography>
        <Box sx={{ maxHeight: '300px', overflowY: 'auto' }}>
          {supportedQualities.map((quality) => (
            <MenuItem
              key={quality.value}
              onClick={() => handleQualitySelect(quality.value)}
              dense
              sx={{
                py: 0.5,
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <ListItemText
                primary={quality.label}
                primaryTypographyProps={{
                  variant: 'body2',
                  color: currentQuality === quality.value ? 'primary' : 'text.primary',
                  fontWeight: currentQuality === quality.value ? 'medium' : 'regular',
                }}
              />
              {currentQuality === quality.value && (
                <ListItemIcon sx={{ minWidth: 24, ml: 1 }}>
                  <CheckIcon fontSize="small" color="primary" />
                </ListItemIcon>
              )}
            </MenuItem>
          ))}
        </Box>
      </Menu>
    </>
  );
};

export default VideoQualitySelector;

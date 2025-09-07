import React, { useState, useRef, useEffect } from 'react';
import {
  Popover,
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  Skeleton,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  NotificationsActive as NotificationsActiveIcon,
  MarkAllRead as MarkAllReadIcon,
  ClearAll as ClearAllIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import NotificationItem from './NotificationItem';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationDropdown: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const anchorEl = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    isMarkingAsRead,
    refresh,
  } = useNotifications({
    autoFetch: true,
    limit: 5,
    markAsReadOnOpen: false,
  });

  const handleToggle = () => {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.relatedTo) {
      const { type, id } = notification.relatedTo;
      switch (type) {
        case 'order':
          router.push(`/orders/${id}`);
          break;
        case 'user':
          router.push(`/users/${id}`);
          break;
      }
    }
    
    handleClose();
  };

  const handleClearAll = async () => {
    try {
      await deleteAllNotifications();
      enqueueSnackbar('Cleared all notifications', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to clear notifications', { variant: 'error' });
    }
  };

  const handleViewAll = () => {
    router.push('/notifications');
    handleClose();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        anchorEl.current && 
        !anchorEl.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.MuiPopover-root')
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <IconButton
        ref={anchorEl}
        onClick={handleToggle}
        color="inherit"
        sx={{
          position: 'relative',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        {unreadCount > 0 ? (
          <Badge badgeContent={unreadCount} color="error" max={9}>
            <NotificationsActiveIcon />
          </Badge>
        ) : (
          <NotificationsIcon />
        )}
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl.current}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            width: isMobile ? '100vw' : 380,
            maxWidth: '100%',
            maxHeight: '80vh',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: theme.shadows[10],
            mt: 1,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor: 'background.paper',
          }}
        >
          <Typography variant="h6" component="div" fontWeight="bold">
            Notifications
            {unreadCount > 0 && (
              <Typography component="span" color="primary" ml={1}>
                ({unreadCount} new)
              </Typography>
            )}
          </Typography>
          
          <Box>
            {notifications.length > 0 && (
              <>
                <Tooltip title="Mark all as read">
                  <IconButton
                    size="small"
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0 || isMarkingAsRead}
                  >
                    <MarkAllReadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Clear all">
                  <IconButton
                    size="small"
                    onClick={handleClearAll}
                    disabled={notifications.length === 0}
                  >
                    <ClearAllIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            maxHeight: 400,
            overflowY: 'auto',
            bgcolor: 'background.default',
          }}
        >
          {isLoading ? (
            // Loading skeleton
            <Box p={2}>
              {[1, 2, 3].map((i) => (
                <Box key={i} mb={2}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                    <Skeleton width="60%" height={20} />
                  </Box>
                  <Skeleton width="80%" height={16} sx={{ ml: 6, mb: 1 }} />
                  <Skeleton width="40%" height={14} sx={{ ml: 6 }} />
                  {i < 3 && <Divider sx={{ my: 2 }} />}
                </Box>
              ))}
            </Box>
          ) : notifications.length === 0 ? (
            // Empty state
            <Box
              p={4}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
            >
              <NotificationsNoneIcon
                sx={{
                  fontSize: 48,
                  color: 'text.disabled',
                  opacity: 0.5,
                  mb: 2,
                }}
              />
              <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                No notifications yet
              </Typography>
              <Typography variant="body2" color="textSecondary">
                We'll let you know when something new arrives
              </Typography>
            </Box>
          ) : (
            // Notifications list
            <List disablePadding>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                    dense
                  />
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {notifications.length > 0 && (
          <Box
            sx={{
              p: 1.5,
              textAlign: 'center',
              borderTop: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
            }}
          >
            <Button
              size="small"
              color="primary"
              endIcon={<ArrowForwardIcon />}
              onClick={handleViewAll}
            >
              View all notifications
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
};

export default NotificationDropdown;

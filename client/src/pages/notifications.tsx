import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Button,
  useTheme,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  MoreVert as MoreVertIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
  NotificationsOff as MuteIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from 'react-query';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { api } from '../lib/api';
import NotificationItem from '../components/notifications/NotificationItem';
import { Notification, NotificationFilter } from '../types/notification';

const NotificationsPage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filter, setFilter] = useState<NotificationFilter>({
    read: undefined,
    limit: 20,
    offset: 0,
  });

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery(
    ['notifications', filter],
    async () => {
      const { data } = await api.get('/api/notifications', { params: filter });
      return data.data as Notification[];
    },
    {
      keepPreviousData: true,
    }
  );

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      queryClient.invalidateQueries('notifications');
      queryClient.invalidateQueries('unread-notifications-count');
    } catch (error) {
      enqueueSnackbar('Failed to mark notification as read', { variant: 'error' });
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      queryClient.invalidateQueries('notifications');
      queryClient.invalidateQueries('unread-notifications-count');
      enqueueSnackbar('All notifications marked as read', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to mark all as read', { variant: 'error' });
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      queryClient.invalidateQueries('notifications');
      enqueueSnackbar('Notification deleted', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to delete notification', { variant: 'error' });
    } finally {
      setAnchorEl(null);
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    switch (newValue) {
      case 0: // All
        setFilter(prev => ({ ...prev, read: undefined }));
        break;
      case 1: // Unread
        setFilter(prev => ({ ...prev, read: false }));
        break;
      case 2: // Read
        setFilter(prev => ({ ...prev, read: true }));
        break;
    }
  };

  // Handle menu open
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, notification: Notification) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedNotification(notification);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedNotification(null);
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
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
        default:
          break;
      }
    }
  };

  // Group notifications by date
  const groupNotificationsByDate = () => {
    const grouped: Record<string, Notification[]> = {};
    
    notifications.forEach(notification => {
      const date = new Date(notification.createdAt);
      const dateKey = format(date, 'MMMM d, yyyy');
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(notification);
    });
    
    return grouped;
  };

  const groupedNotifications = groupNotificationsByDate();

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Notifications
        </Typography>
        <Typography color="textSecondary">
          Manage your notifications and preferences
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="notification tabs"
            variant="fullWidth"
          >
            <Tab label="All Notifications" />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <span>Unread</span>
                  {filter.read === false && notifications.length > 0 && (
                    <Box 
                      sx={{
                        ml: 1,
                        backgroundColor: 'primary.main',
                        color: 'white',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                      }}
                    >
                      {notifications.length}
                    </Box>
                  )}
                </Box>
              } 
            />
            <Tab label="Read" />
          </Tabs>
        </Box>

        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" color="textSecondary">
            {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'} found
          </Typography>
          
          <Box>
            <Button 
              startIcon={<MarkReadIcon />} 
              onClick={markAllAsRead}
              disabled={notifications.length === 0 || isFetching}
              sx={{ mr: 1 }}
            >
              Mark all as read
            </Button>
            <Button 
              startIcon={<FilterIcon />}
              onClick={() => {
                // TODO: Implement filter dialog
                enqueueSnackbar('Filter functionality coming soon', { variant: 'info' });
              }}
            >
              Filter
            </Button>
          </Box>
        </Box>

        <Divider />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              No notifications found
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 2 }}>
              {tabValue === 0 
                ? "You don't have any notifications yet." 
                : tabValue === 1 
                  ? "You don't have any unread notifications."
                  : "You don't have any read notifications."}
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => router.push('/')}
              sx={{ mt: 1 }}
            >
              Go to Home
            </Button>
          </Box>
        ) : (
          <Box>
            {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
              <Box key={date} sx={{ mb: 3 }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{
                    px: 2,
                    py: 1,
                    backgroundColor: 'action.hover',
                    display: 'inline-block',
                    borderRadius: 1,
                    mb: 1,
                    ml: 2,
                  }}
                >
                  {date}
                </Typography>
                
                <List disablePadding>
                  {dateNotifications.map((notification) => (
                    <Box 
                      key={notification.id}
                      sx={{
                        position: 'relative',
                        '&:hover .notification-actions': {
                          opacity: 1,
                        },
                      }}
                    >
                      <NotificationItem
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                      />
                      
                      <Box 
                        className="notification-actions"
                        sx={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          display: 'flex',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          backgroundColor: 'background.paper',
                          borderRadius: 1,
                          boxShadow: 1,
                        }}
                      >
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!notification.read) {
                              markAsRead(notification.id);
                            }
                          }}
                          disabled={notification.read}
                          title={notification.read ? 'Already read' : 'Mark as read'}
                        >
                          <MarkReadIcon fontSize="small" />
                        </IconButton>
                        
                        <IconButton 
                          size="small" 
                          onClick={(e) => handleMenuOpen(e, notification)}
                          title="More options"
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Divider />
                    </Box>
                  ))}
                </List>
              </Box>
            ))}
            
            {notifications.length >= filter.limit! && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setFilter(prev => ({
                      ...prev,
                      offset: (prev.offset || 0) + (prev.limit || 20),
                    }));
                  }}
                  disabled={isFetching}
                  startIcon={isFetching ? <CircularProgress size={16} /> : null}
                >
                  {isFetching ? 'Loading...' : 'Load more'}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Notification menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem 
          onClick={() => {
            if (selectedNotification) {
              if (!selectedNotification.read) {
                markAsRead(selectedNotification.id);
              }
              handleMenuClose();
            }
          }}
          disabled={!selectedNotification || selectedNotification.read}
        >
          <ListItemIcon>
            <MarkReadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mark as read</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            if (selectedNotification) {
              // TODO: Implement mute functionality
              enqueueSnackbar('Mute functionality coming soon', { variant: 'info' });
              handleMenuClose();
            }
          }}
        >
          <ListItemIcon>
            <MuteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mute this type</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem 
          onClick={() => {
            if (selectedNotification) {
              deleteNotification(selectedNotification.id);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete notification</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default NotificationsPage;

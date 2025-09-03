import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

type NotificationType = {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  readAt?: Date | null;
  createdAt: Date;
  relatedTo?: {
    type: string;
    id: string;
  };
};

type UseNotificationsOptions = {
  autoFetch?: boolean;
  limit?: number;
  markAsReadOnOpen?: boolean;
};

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    autoFetch = true,
    limit = 20,
    markAsReadOnOpen = false,
  } = options;
  
  const { isAuthenticated, user } = useAuth();
  const { sendMessage, isConnected } = useWebSocket();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  
  // Fetch notifications from the API
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Notification[]>(
    ['notifications', { limit }],
    async () => {
      const { data } = await api.get('/api/notifications', {
        params: { limit },
      });
      return data.data;
    },
    {
      enabled: isAuthenticated && autoFetch,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        // Update unread count
        const unread = data.filter(n => !n.read).length;
        setUnreadCount(unread);
        
        // Mark notifications as read if enabled
        if (markAsReadOnOpen && unread > 0) {
          markAllAsRead();
        }
      },
    }
  );
  
  // Fetch unread count
  const { refetch: refetchUnreadCount } = useQuery(
    'unread-notifications-count',
    async () => {
      const { data } = await api.get('/api/notifications/unread-count');
      return data.count;
    },
    {
      enabled: isAuthenticated,
      onSuccess: (count) => {
        setUnreadCount(count);
      },
    }
  );
  
  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!isConnected) return;
    
    const handleNewNotification = (message: any) => {
      if (message.type === 'NEW_NOTIFICATION') {
        // Invalidate notifications query to refetch
        queryClient.invalidateQueries(['notifications']);
        queryClient.invalidateQueries(['unread-notifications-count']);
        
        // Play notification sound
        playNotificationSound();
      }
    };
    
    // Subscribe to notification updates
    sendMessage({
      type: 'subscribe',
      channel: `user:${user?.id}:notifications`,
    });
    
    // Set up message handler
    const ws = (window as any).__ws; // Reference to WebSocket connection
    if (ws) {
      ws.addEventListener('message', handleNewNotification);
    }
    
    return () => {
      // Unsubscribe from notifications
      sendMessage({
        type: 'unsubscribe',
        channel: `user:${user?.id}:notifications`,
      });
      
      // Clean up event listener
      if (ws) {
        ws.removeEventListener('message', handleNewNotification);
      }
    };
  }, [isConnected, user?.id, queryClient, sendMessage]);
  
  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3; // Reduce volume
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);
  
  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      
      // Optimistically update the UI
      queryClient.setQueryData<Notification[]>(['notifications', { limit }], (oldData = []) =>
        oldData.map(n =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }, [limit, queryClient]);
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0 || isMarkingAsRead) return;
    
    setIsMarkingAsRead(true);
    
    try {
      await api.put('/api/notifications/read-all');
      
      // Optimistically update the UI
      queryClient.setQueryData<Notification[]>(['notifications', { limit }], (oldData = []) =>
        oldData.map(n => (n.read ? n : { ...n, read: true, readAt: new Date() }))
      );
      
      // Reset unread count
      setUnreadCount(0);
      
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    } finally {
      setIsMarkingAsRead(false);
    }
  }, [isMarkingAsRead, limit, queryClient, unreadCount]);
  
  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      
      // Optimistically update the UI
      queryClient.setQueryData<Notification[]>(
        ['notifications', { limit }],
        (oldData = []) => oldData.filter(n => n.id !== notificationId)
      );
      
      // Update unread count if notification was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }, [limit, notifications, queryClient]);
  
  // Delete all notifications
  const deleteAllNotifications = useCallback(async () => {
    try {
      await api.delete('/api/notifications');
      
      // Optimistically update the UI
      queryClient.setQueryData(['notifications', { limit }], []);
      
      // Reset unread count
      setUnreadCount(0);
      
      return true;
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      return false;
    }
  }, [limit, queryClient]);
  
  // Refresh notifications
  const refresh = useCallback(() => {
    refetch();
    refetchUnreadCount();
  }, [refetch, refetchUnreadCount]);
  
  return {
    // Data
    notifications,
    unreadCount,
    isLoading,
    error,
    
    // Actions
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    isMarkingAsRead,
  };
}

export default useNotifications;

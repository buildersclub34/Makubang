import React, { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useSnackbar } from 'notistack';
import { useQueryClient } from 'react-query';
import { io, Socket } from 'socket.io-client';

type WebSocketMessage = {
  type: string;
  data?: any;
};

type WebSocketContextType = {
  sendMessage: (message: WebSocketMessage) => void;
  subscribeToOrder: (orderId: string) => void;
  isConnected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, token, user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const isConnected = useRef(false);
  const messageQueue = useRef<WebSocketMessage[]>([]);
  
  // WebSocket event handlers
  const handleConnect = useCallback(() => {
    console.log('Socket.IO connected');
    isConnected.current = true;
    reconnectAttempts.current = 0;

    // Process any queued messages as emits
    if (socketRef.current) {
      while (messageQueue.current.length > 0) {
        const message = messageQueue.current.shift();
        if (message) {
          socketRef.current.emit(message.type, message.data);
        }
      }
    }
  }, []);
  
  const handleDisconnect = useCallback((reason?: string) => {
    console.log('Socket.IO disconnected:', reason || 'unknown');
    isConnected.current = false;
    
    // Attempt to reconnect if we're still authenticated
    if (isAuthenticated && reconnectAttempts.current < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      console.log(`Attempting to reconnect in ${delay}ms...`);
      
      reconnectTimeout.current = setTimeout(() => {
        reconnectAttempts.current += 1;
        connect();
      }, delay);
    }
  }, [isAuthenticated]);
  
  // Socket event listeners for known events
  const registerSocketEventHandlers = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('order_status_changed', (data: { orderId: string; status: string }) => {
      queryClient.invalidateQueries(['orders']);
      queryClient.invalidateQueries(['order', data.orderId]);
      enqueueSnackbar(`Order #${data.orderId} status updated to ${data.status}`, { variant: 'info' });
    });

    socket.on('order_update', (update: { orderId: string; status?: string; [k: string]: any }) => {
      if (update?.orderId) {
        queryClient.invalidateQueries(['order', update.orderId]);
      }
    });

    socket.on('delivery_location', (data: { orderId: string; lat: number; lng: number }) => {
      queryClient.setQueryData(
        ['order', data.orderId],
        (oldData: any) => ({
          ...oldData,
          deliveryLocation: { lat: data.lat, lng: data.lng },
        })
      );
    });

    socket.on('new_order', (data: { orderNumber: string }) => {
      if (user?.role === 'restaurant' || user?.role === 'admin') {
        queryClient.invalidateQueries(['restaurant-orders']);
        enqueueSnackbar(`New order received: #${data.orderNumber}`, { variant: 'success' });
      }
    });

    socket.on('notification', (data: { message: string; severity?: 'info' | 'success' | 'warning' | 'error' }) => {
      enqueueSnackbar(data.message, { variant: data.severity || 'info' });
    });
  }, [enqueueSnackbar, queryClient, user?.role]);
  
  const handleError = useCallback((error: any) => {
    console.error('Socket.IO error:', error);
  }, []);
  
  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.off();
      socketRef.current.disconnect();
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `http://localhost:5000`;
    socketRef.current = io(wsUrl, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
      autoConnect: true,
      reconnection: false, // we'll implement our own backoff
    });

    socketRef.current.on('connect', handleConnect);
    socketRef.current.on('disconnect', handleDisconnect);
    socketRef.current.on('connect_error', handleError);
    registerSocketEventHandlers();
  }, [handleConnect, handleDisconnect, handleError, registerSocketEventHandlers, token]);
  
  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    }
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off();
        socketRef.current.disconnect();
      }
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [isAuthenticated, token, connect]);
  
  // Reconnect when token changes
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    }
  }, [token, isAuthenticated, connect]);
  
  // Send a message through the WebSocket connection
  const sendMessage = useCallback((message: WebSocketMessage) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit(message.type, message.data);
      return;
    }
    // Queue the message if we're not connected yet
    messageQueue.current.push(message);
  }, []);
  
  // Subscribe to order updates
  const subscribeToOrder = useCallback((orderId: string) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit('track_order', orderId);
    } else {
      // Queue as a generic message for when connected
      messageQueue.current.push({ type: 'track_order', data: orderId });
    }
  }, [sendMessage]);
  
  const value = {
    sendMessage,
    subscribeToOrder,
    isConnected: isConnected.current,
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;

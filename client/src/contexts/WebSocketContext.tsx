import React, { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useSnackbar } from 'notistack';
import { useQueryClient } from 'react-query';

type WebSocketMessage = {
  type: string;
  data: any;
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
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const isConnected = useRef(false);
  const messageQueue = useRef<WebSocketMessage[]>([]);
  
  // WebSocket event handlers
  const handleOpen = useCallback(() => {
    console.log('WebSocket connected');
    isConnected.current = true;
    reconnectAttempts.current = 0;
    
    // Authenticate with the server
    if (token) {
      ws.current?.send(JSON.stringify({
        type: 'authenticate',
        token,
      }));
    }
    
    // Process any queued messages
    while (messageQueue.current.length > 0 && ws.current?.readyState === WebSocket.OPEN) {
      const message = messageQueue.current.shift();
      if (message) {
        ws.current.send(JSON.stringify(message));
      }
    }
  }, [token]);
  
  const handleClose = useCallback((event: CloseEvent) => {
    console.log('WebSocket disconnected:', event.code, event.reason);
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
  
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message received:', message);
      
      switch (message.type) {
        case 'ORDER_STATUS_UPDATE':
          // Invalidate and refetch orders query
          queryClient.invalidateQueries(['orders']);
          queryClient.invalidateQueries(['order', message.data.orderId]);
          
          // Show notification
          enqueueSnackbar(`Order #${message.data.orderId} status updated to ${message.data.status}`, {
            variant: 'info',
          });
          break;
          
        case 'NEW_ORDER':
          // Invalidate orders list for restaurant
          if (user?.role === 'restaurant' || user?.role === 'admin') {
            queryClient.invalidateQueries(['restaurant-orders']);
            
            // Show notification
            enqueueSnackbar(`New order received: #${message.data.orderNumber}`, {
              variant: 'success',
            });
          }
          break;
          
        case 'DELIVERY_LOCATION_UPDATE':
          // Update delivery location in the UI
          queryClient.setQueryData(
            ['order', message.data.orderId],
            (oldData: any) => ({
              ...oldData,
              deliveryLocation: message.data.location,
            })
          );
          break;
          
        case 'NOTIFICATION':
          // Show notification
          enqueueSnackbar(message.data.message, {
            variant: message.data.severity || 'info',
          });
          break;
          
        default:
          console.log('Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }, [enqueueSnackbar, queryClient, user?.role]);
  
  const handleError = useCallback((error: Event) => {
    console.error('WebSocket error:', error);
  }, []);
  
  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (ws.current) {
      // Clean up existing connection
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onmessage = null;
      ws.current.onerror = null;
      
      if (ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    }
    
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://localhost:5000`;
    ws.current = new WebSocket(wsUrl);
    
    // Set up event listeners
    ws.current.onopen = handleOpen;
    ws.current.onclose = handleClose;
    ws.current.onmessage = handleMessage;
    ws.current.onerror = handleError;
  }, [handleOpen, handleClose, handleMessage, handleError]);
  
  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    }
    
    // Clean up on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [isAuthenticated, token, connect]);
  
  // Reconnect when token changes
  useEffect(() => {
    if (isAuthenticated && token && ws.current) {
      // If we already have a connection, re-authenticate
      if (ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'authenticate',
          token,
        }));
      } else {
        // Otherwise, reconnect
        connect();
      }
    }
  }, [token, isAuthenticated, connect]);
  
  // Send a message through the WebSocket connection
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      // Queue the message if we're not connected yet
      messageQueue.current.push(message);
    }
  }, []);
  
  // Subscribe to order updates
  const subscribeToOrder = useCallback((orderId: string) => {
    sendMessage({
      type: 'subscribe_order',
      orderId,
    });
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

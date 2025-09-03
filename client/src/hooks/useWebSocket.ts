import { useEffect, useRef, useCallback, useReducer } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { Notification } from '../types/notification';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

type WebSocketState = {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  error: Error | null;
  reconnectAttempts: number;
};

type WebSocketAction =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'MESSAGE_RECEIVED'; payload: WebSocketMessage }
  | { type: 'ERROR'; payload: Error }
  | { type: 'RESET_RECONNECT_ATTEMPTS' };

const initialState: WebSocketState = {
  isConnected: false,
  lastMessage: null,
  error: null,
  reconnectAttempts: 0,
};

const websocketReducer = (state: WebSocketState, action: WebSocketAction): WebSocketState => {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, isConnected: true, error: null, reconnectAttempts: 0 };
    case 'DISCONNECTED':
      return { ...state, isConnected: false };
    case 'MESSAGE_RECEIVED':
      return { ...state, lastMessage: action.payload };
    case 'ERROR':
      return { ...state, error: action.payload };
    case 'RESET_RECONNECT_ATTEMPTS':
      return { ...state, reconnectAttempts: 0 };
    default:
      return state;
  }
};

const useWebSocket = (url: string) => {
  const [state, dispatch] = useReducer(websocketReducer, initialState);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const { isAuthenticated, token } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 5000; // 5 seconds

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) {
      console.log('Not authenticated, skipping WebSocket connection');
      return;
    }

    // Close existing connection if any
    if (ws.current) {
      ws.current.close();
    }

    try {
      // Add token to the WebSocket URL
      const wsUrl = new URL(url, window.location.origin.replace('http', 'ws'));
      wsUrl.searchParams.append('token', token);

      // Create WebSocket connection
      ws.current = new WebSocket(wsUrl.toString());

      // Connection opened
      ws.current.onopen = () => {
        console.log('WebSocket connected');
        dispatch({ type: 'CONNECTED' });
        
        // Reset reconnect attempts on successful connection
        dispatch({ type: 'RESET_RECONNECT_ATTEMPTS' });
      };

      // Listen for messages
      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          dispatch({ type: 'MESSAGE_RECEIVED', payload: message });

          // Handle different message types
          if (message.type === 'NOTIFICATION') {
            const notification = message.data as Notification;
            
            // Show notification to user
            enqueueSnackbar(notification.message, {
              variant: 'info', // or based on notification type
              autoHideDuration: 5000,
              anchorOrigin: {
                vertical: 'top',
                horizontal: 'right',
              },
              // Add notification data for click handling
              notificationData: notification,
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      // Handle errors
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        dispatch({ type: 'ERROR', payload: new Error('WebSocket error occurred') });
      };

      // Handle connection close
      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        dispatch({ type: 'DISCONNECTED' });

        // Attempt to reconnect if the connection was closed unexpectedly
        if (event.code !== 1000) { // 1000 is a normal closure
          attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      dispatch({ type: 'ERROR', payload: error as Error });
      attemptReconnect();
    }
  }, [url, isAuthenticated, token, enqueueSnackbar]);

  // Attempt to reconnect with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      RECONNECT_INTERVAL * Math.pow(2, state.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Attempting to reconnect in ${delay}ms...`);

    reconnectTimeout.current = setTimeout(() => {
      dispatch({ type: 'ERROR', payload: new Error('Reconnecting...') });
      connect();
    }, delay);
  }, [state.reconnectAttempts, connect]);

  // Send message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket is not connected');
    return false;
  }, []);

  // Close WebSocket connection
  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close(1000, 'User initiated disconnect');
      ws.current = null;
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, []);

  // Set up WebSocket connection on mount and clean up on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Reconnect when authentication state changes
  useEffect(() => {
    if (isAuthenticated && !state.isConnected) {
      connect();
    }
  }, [isAuthenticated, state.isConnected, connect]);

  return {
    ...state,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
};

export default useWebSocket;

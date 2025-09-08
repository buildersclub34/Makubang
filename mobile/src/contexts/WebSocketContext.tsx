import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type WebSocketContextValue = {
  socket: Socket | null;
};

const WebSocketContext = createContext<WebSocketContextValue>({ socket: null });

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3001';
    const socket = io(url, { transports: ['websocket'] });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);



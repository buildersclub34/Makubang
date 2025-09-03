import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type EventHandler = (data: any) => void;

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private eventHandlers: Record<string, EventHandler[]> = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private url: string = '';
  private isConnected = false;
  private shouldReconnect = true;

  private constructor() {
    // Private constructor to enforce singleton
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public async connect(path: string) {
    try {
      // Get the base URL based on the platform
      const baseUrl = Platform.select({
        android: 'ws://10.0.2.2:3000',
        ios: 'ws://localhost:3000',
        default: 'ws://localhost:3000',
      });

      // Get the authentication token
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Construct the WebSocket URL
      this.url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}?token=${token}`;
      
      // Close existing connection if any
      if (this.socket) {
        this.socket.close();
      }

      // Create new WebSocket connection
      this.socket = new WebSocket(this.url);
      this.setupEventListeners();
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', { connected: true });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
        
        // Emit specific event if type is specified
        if (data.type) {
          this.emit(data.type, data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.emit('disconnected', { 
        code: event.code, 
        reason: event.reason,
        wasClean: event.wasClean 
      });
      
      if (this.shouldReconnect) {
        this.handleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected && this.shouldReconnect) {
        this.connect(this.url);
      }
    }, delay);
  }

  public send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(message);
      return true;
    }
    console.warn('WebSocket is not connected');
    return false;
  }

  public on(event: string, handler: EventHandler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  public off(event: string, handler: EventHandler) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  private emit(event: string, data?: any) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }

  public getConnectionStatus() {
    return this.isConnected ? 'connected' : 'disconnected';
  }
}

export const webSocketService = WebSocketService.getInstance();

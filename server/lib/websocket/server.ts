import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { verifyToken } from '../auth';

type WebSocketMessage = {
  type: string;
  data: any;
  requestId?: string;
  timestamp: number;
};

type WebSocketClient = {
  id: string;
  socket: WebSocket;
  userId?: string;
  roles?: string[];
  channels: Set<string>;
  ip: string;
  userAgent?: string;
  connectedAt: Date;
  lastActivity: Date;
};

type WebSocketEvent = {
  type: string;
  handler: (client: WebSocketClient, data: any) => Promise<void> | void;
};

class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private eventHandlers: Map<string, WebSocketEvent> = new Map();
  private pingInterval: NodeJS.Timeout;
  private connectionTimeout: number;
  private maxMessageSize: number;

  constructor(server: HttpServer | HttpsServer, options: {
    path?: string;
    pingInterval?: number;
    connectionTimeout?: number;
    maxMessageSize?: number;
  } = {}) {
    this.connectionTimeout = options.connectionTimeout || 30000; // 30 seconds
    this.maxMessageSize = options.maxMessageSize || 1024 * 1024; // 1MB

    this.wss = new WebSocketServer({
      server,
      path: options.path || '/ws',
      maxPayload: this.maxMessageSize,
    });

    this.setupEventHandlers();
    this.setupPingPong(options.pingInterval || 25000); // 25 seconds
  }

  private setupEventHandlers() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      // Get client information
      const ip = request.socket.remoteAddress || 'unknown';
      const userAgent = request.headers['user-agent'];
      const clientId = uuidv4();
      
      // Create client object
      const client: WebSocketClient = {
        id: clientId,
        socket: ws,
        channels: new Set(['public']), // Default channel
        ip,
        userAgent,
        connectedAt: new Date(),
        lastActivity: new Date(),
      };

      // Add to clients map
      this.clients.set(clientId, client);

      // Set up message handler
      ws.on('message', (data: Buffer) => this.handleMessage(client, data));

      // Set up close handler
      ws.on('close', () => this.handleDisconnect(clientId));

      // Set up error handler
      ws.on('error', (error) => this.handleError(clientId, error));

      // Send connection confirmation
      this.send(client, {
        type: 'connection:established',
        data: { clientId },
      });

      logger.info(`Client connected: ${clientId} (${ip})`);
    });
  }

  private async handleMessage(client: WebSocketClient, data: Buffer) {
    try {
      // Update last activity
      client.lastActivity = new Date();

      // Parse message
      const message = this.parseMessage(data);
      if (!message) return;

      logger.debug(`Received message from ${client.id}:`, message);

      // Handle authentication
      if (message.type === 'auth:authenticate') {
        await this.handleAuthentication(client, message.data);
        return;
      }

      // Check if client is authenticated for protected events
      if (this.isProtectedEvent(message.type) && !client.userId) {
        this.sendError(client, 'authentication_required', 'Authentication required');
        return;
      }

      // Find and execute handler
      const event = this.eventHandlers.get(message.type);
      if (event) {
        try {
          await event.handler(client, message.data);
        } catch (error) {
          logger.error(`Error in event handler for ${message.type}:`, error);
          this.sendError(
            client,
            'handler_error',
            error instanceof Error ? error.message : 'Error processing request',
            message.requestId
          );
        }
      } else {
        this.sendError(
          client,
          'unknown_event',
          `Unknown event type: ${message.type}`,
          message.requestId
        );
      }
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  }

  private async handleAuthentication(client: WebSocketClient, data: any) {
    try {
      if (!data?.token) {
        throw new Error('Authentication token is required');
      }

      // Verify JWT token
      const payload = await verifyToken(data.token);
      
      // Update client with user information
      client.userId = payload.userId;
      client.roles = payload.roles || [];

      // Subscribe to user-specific channel
      this.subscribe(client, `user:${client.userId}`);

      // Send authentication success
      this.send(client, {
        type: 'auth:authenticated',
        data: {
          userId: client.userId,
          roles: client.roles,
        },
      });

      logger.info(`Client authenticated: ${client.id} (user: ${client.userId})`);
    } catch (error) {
      logger.warn(`Authentication failed for client ${client.id}:`, error);
      this.sendError(
        client,
        'authentication_failed',
        error instanceof Error ? error.message : 'Invalid token'
      );
    }
  }

  private handleDisconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      logger.info(`Client disconnected: ${clientId} (user: ${client.userId || 'unauthenticated'})`);
    }
  }

  private handleError(clientId: string, error: Error) {
    logger.error(`WebSocket error for client ${clientId}:`, error);
    this.clients.delete(clientId);
  }

  private parseMessage(data: Buffer): WebSocketMessage | null {
    try {
      const message = JSON.parse(data.toString());
      
      // Validate message structure
      if (!message || typeof message !== 'object' || !message.type) {
        throw new Error('Invalid message format');
      }

      return {
        type: message.type,
        data: message.data,
        requestId: message.requestId,
        timestamp: message.timestamp || Date.now(),
      };
    } catch (error) {
      logger.error('Error parsing WebSocket message:', error);
      return null;
    }
  }

  private setupPingPong(interval: number) {
    // Send ping to all clients at regular intervals
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client) => {
        // Check for inactive clients
        if (now - client.lastActivity.getTime() > this.connectionTimeout) {
          logger.warn(`Client ${client.id} timed out`);
          client.socket.terminate();
          this.clients.delete(client.id);
          return;
        }

        // Send ping
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.ping();
        }
      });
    }, interval);
  }

  // Public API

  /**
   * Register an event handler
   */
  on(event: string, handler: (client: WebSocketClient, data: any) => Promise<void> | void) {
    this.eventHandlers.set(event, { type: event, handler });
  }

  /**
   * Send a message to a specific client
   */
  send(client: WebSocketClient, message: Omit<WebSocketMessage, 'timestamp'>) {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify({
        ...message,
        timestamp: Date.now(),
      }));
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(message: Omit<WebSocketMessage, 'timestamp'>, filter?: (client: WebSocketClient) => boolean) {
    const clients = filter 
      ? Array.from(this.clients.values()).filter(filter)
      : Array.from(this.clients.values());

    const payload = JSON.stringify({
      ...message,
      timestamp: Date.now(),
    });

    clients.forEach(client => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(payload);
      }
    });
  }

  /**
   * Publish a message to a specific channel
   */
  publish(channel: string, message: Omit<WebSocketMessage, 'timestamp'>) {
    const clients = Array.from(this.clients.values()).filter(client => 
      client.channels.has(channel)
    );

    const payload = JSON.stringify({
      ...message,
      channel,
      timestamp: Date.now(),
    });

    clients.forEach(client => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(payload);
      }
    });
  }

  /**
   * Subscribe a client to a channel
   */
  subscribe(client: WebSocketClient, channel: string) {
    client.channels.add(channel);
    this.send(client, {
      type: 'channel:subscribed',
      data: { channel },
    });
  }

  /**
   * Unsubscribe a client from a channel
   */
  unsubscribe(client: WebSocketClient, channel: string) {
    client.channels.delete(channel);
    this.send(client, {
      type: 'channel:unsubscribed',
      data: { channel },
    });
  }

  /**
   * Get a client by ID
   */
  getClient(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all clients
   */
  getClients(): WebSocketClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get all clients for a specific user
   */
  getUserClients(userId: string): WebSocketClient[] {
    return Array.from(this.clients.values()).filter(
      client => client.userId === userId
    );
  }

  /**
   * Send an error message to a client
   */
  sendError(
    client: WebSocketClient, 
    code: string, 
    message: string, 
    requestId?: string
  ) {
    this.send(client, {
      type: 'error',
      data: { code, message },
      requestId,
    });
  }

  /**
   * Check if an event type is protected (requires authentication)
   */
  private isProtectedEvent(eventType: string): boolean {
    // By default, all events except 'auth:' events require authentication
    return !eventType.startsWith('auth:');
  }

  /**
   * Close the WebSocket server
   */
  close() {
    clearInterval(this.pingInterval);
    this.wss.close();
    this.clients.clear();
  }
}

export default WebSocketService;

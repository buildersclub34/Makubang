import { Server as WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { verify } from 'jsonwebtoken';
import { JWT_SECRET } from '../../config';
import { WebSocket } from 'ws';
import { Notification } from '../../../client/src/types/notification';

interface Client extends WebSocket {
  isAlive: boolean;
  userId?: string;
}

class NotificationService {
  private wss: WebSocketServer;
  private clients: Set<Client> = new Set();
  private pingInterval: NodeJS.Timeout;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/notifications',
    });

    this.setupEventHandlers();
    this.setupPingPong();
  }

  private setupEventHandlers() {
    this.wss.on('connection', (ws: Client, req) => {
      console.log('New WebSocket connection');
      
      // Extract token from query params or headers
      const token = this.extractToken(req);
      
      try {
        if (!token) {
          throw new Error('No token provided');
        }

        // Verify JWT token
        const decoded = verify(token, JWT_SECRET) as { userId: string };
        ws.userId = decoded.userId;
        ws.isAlive = true;
        this.clients.add(ws);

        ws.on('pong', () => {
          ws.isAlive = true;
        });

        ws.on('close', () => {
          this.clients.delete(ws);
          console.log('Client disconnected');
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.clients.delete(ws);
          ws.terminate();
        });

        // Send welcome message
        this.sendToClient(ws, {
          type: 'CONNECTED',
          message: 'Successfully connected to notifications service',
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error('WebSocket authentication error:', error);
        this.sendError(ws, 'Authentication failed');
        ws.terminate();
      }
    });
  }

  private setupPingPong() {
    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          console.log('Terminating inactive connection');
          this.clients.delete(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  private extractToken(req: any): string | null {
    // Try to get token from query params
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const tokenFromQuery = url.searchParams.get('token');
    
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    // Try to get token from headers
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    return null;
  }

  private sendToClient(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  private sendError(ws: WebSocket, message: string) {
    this.sendToClient(ws, {
      type: 'ERROR',
      error: message,
      timestamp: new Date().toISOString(),
    });
  }

  // Public API
  public sendNotification(userId: string, notification: Notification) {
    this.clients.forEach((client) => {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, {
          type: 'NOTIFICATION',
          data: notification,
        });
      }
    });
  }

  public broadcastToAll(notification: Notification) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, {
          type: 'NOTIFICATION',
          data: notification,
        });
      }
    });
  }

  public close() {
    clearInterval(this.pingInterval);
    this.wss.close(() => {
      console.log('WebSocket server closed');
    });
  }
}

export default NotificationService;


import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export class WebSocketService {
  private io: Server;
  private connections: Map<string, AuthenticatedSocket> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const [user] = await db.select()
          .from(users)
          .where(eq(users.id, decoded.userId))
          .limit(1);

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.userRole = user.role;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected`);
      
      // Store connection
      this.connections.set(socket.userId!, socket);

      // Join user-specific room
      socket.join(`user_${socket.userId}`);
      
      // Join role-specific rooms
      if (socket.userRole === 'delivery_partner') {
        socket.join('delivery_partners');
      } else if (socket.userRole === 'restaurant') {
        socket.join('restaurants');
      }

      // Handle location updates (for delivery partners)
      socket.on('location_update', (data) => {
        if (socket.userRole === 'delivery_partner') {
          // Broadcast location to active orders
          socket.broadcast.to(`order_${data.orderId}`).emit('partner_location', {
            partnerId: socket.userId,
            location: data.location,
            timestamp: new Date()
          });
        }
      });

      // Handle order status updates
      socket.on('order_status_update', (data) => {
        // Broadcast to relevant parties
        this.io.to(`order_${data.orderId}`).emit('order_status_changed', {
          orderId: data.orderId,
          status: data.status,
          timestamp: new Date(),
          updatedBy: socket.userId
        });
      });

      // Handle chat messages
      socket.on('chat_message', (data) => {
        // Broadcast to order participants
        socket.broadcast.to(`order_${data.orderId}`).emit('new_message', {
          ...data,
          senderId: socket.userId,
          timestamp: new Date()
        });
      });

      // Handle delivery partner availability
      socket.on('availability_update', (data) => {
        if (socket.userRole === 'delivery_partner') {
          socket.broadcast.to('restaurants').emit('partner_availability_changed', {
            partnerId: socket.userId,
            isAvailable: data.isAvailable,
            location: data.location
          });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        socket.broadcast.to(`order_${data.orderId}`).emit('user_typing', {
          userId: socket.userId,
          orderId: data.orderId
        });
      });

      socket.on('typing_stop', (data) => {
        socket.broadcast.to(`order_${data.orderId}`).emit('user_stopped_typing', {
          userId: socket.userId,
          orderId: data.orderId
        });
      });

      // Handle video streaming events
      socket.on('video_like', (data) => {
        socket.broadcast.emit('video_liked', {
          videoId: data.videoId,
          userId: socket.userId,
          likeCount: data.likeCount
        });
      });

      socket.on('video_comment', (data) => {
        socket.broadcast.emit('new_video_comment', {
          videoId: data.videoId,
          comment: data.comment,
          userId: socket.userId,
          timestamp: new Date()
        });
      });

      // Handle live streaming
      socket.on('start_live_stream', (data) => {
        socket.broadcast.emit('live_stream_started', {
          streamId: data.streamId,
          creatorId: socket.userId,
          title: data.title
        });
      });

      socket.on('join_live_stream', (data) => {
        socket.join(`stream_${data.streamId}`);
        socket.broadcast.to(`stream_${data.streamId}`).emit('user_joined_stream', {
          userId: socket.userId,
          streamId: data.streamId
        });
      });

      socket.on('leave_live_stream', (data) => {
        socket.leave(`stream_${data.streamId}`);
        socket.broadcast.to(`stream_${data.streamId}`).emit('user_left_stream', {
          userId: socket.userId,
          streamId: data.streamId
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        this.connections.delete(socket.userId!);
        
        // Notify relevant parties about disconnection
        if (socket.userRole === 'delivery_partner') {
          socket.broadcast.to('restaurants').emit('partner_disconnected', {
            partnerId: socket.userId
          });
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${socket.userId}:`, error);
      });
    });
  }

  // Public methods for broadcasting
  public broadcastUpdate(room: string, data: any) {
    this.io.to(room).emit('update', data);
  }

  public sendToUser(userId: string, event: string, data: any) {
    const socket = this.connections.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  public broadcastToRole(role: string, event: string, data: any) {
    this.io.to(role).emit(event, data);
  }

  public sendOrderUpdate(orderId: string, data: any) {
    this.io.to(`order_${orderId}`).emit('order_update', data);
  }

  public sendLocationUpdate(orderId: string, location: any, partnerId: string) {
    this.io.to(`order_${orderId}`).emit('delivery_location_update', {
      location,
      partnerId,
      timestamp: new Date()
    });
  }

  public sendNotification(userId: string, notification: any) {
    this.sendToUser(userId, 'notification', notification);
  }

  public broadcastLiveEvent(event: string, data: any) {
    this.io.emit(event, data);
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connections.keys());
  }

  public isUserConnected(userId: string): boolean {
    return this.connections.has(userId);
  }
}

export default WebSocketService;

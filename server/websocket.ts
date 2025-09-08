import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getDB } from './db-mongo';
import { WebSocketService } from './lib/websocket/WebSocketService';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export function setupWebSocket(io: Server) {
  // Initialize WebSocketService singleton
  const wsService = WebSocketService.getInstance(io);
  
  // Authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const db = await getDB();
      
      // Verify user exists and is active
      const user = await db.collection('users').findOne(
        { _id: new ObjectId(decoded.userId) },
        { projection: { _id: 1, role: 1, isActive: 1 } }
      );

      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected with role ${socket.userRole}`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-specific room
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`);
    }

    // Handle order tracking
    socket.on('track_order', (orderId: string) => {
      socket.join(`order:${orderId}`);
      console.log(`User ${socket.userId} joined order room: order:${orderId}`);
    });

    // Handle delivery partner location updates
    socket.on('location_update', (data: { orderId: string; lat: number; lng: number }) => {
      if (socket.userRole === 'delivery_partner') {
        console.log(`Broadcasting location for order ${data.orderId} from user ${socket.userId}`);
        socket.to(`order:${data.orderId}`).emit('delivery_location', {
          userId: socket.userId,
          lat: data.lat,
          lng: data.lng,
          timestamp: new Date()
        });
      }
    });

    // Handle order status updates
    socket.on('order_status_update', (data: { orderId: string; status: string }) => {
      console.log(`Order status update for order ${data.orderId}: ${data.status} by ${socket.userId}`);
      socket.to(`order:${data.orderId}`).emit('order_status_changed', {
        orderId: data.orderId,
        status: data.status,
        timestamp: new Date(),
        updatedBy: socket.userId
      });
    });

    // Handle chat messages within an order
    socket.on('chat_message', (data: { orderId: string; message: string }) => {
      console.log(`Chat message for order ${data.orderId} from ${socket.userId}: ${data.message}`);
      socket.to(`order:${data.orderId}`).emit('new_message', {
        orderId: data.orderId,
        message: data.message,
        senderId: socket.userId,
        timestamp: new Date()
      });
    });


    // Handle notifications
    socket.on('mark_notification_read', (notificationId: string) => {
      // Placeholder for marking notification as read
      console.log(`Marking notification ${notificationId} as read by ${socket.userId}`);
      socket.emit('notification_marked_read', { notificationId });
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
      // Clean up rooms if necessary, e.g., if a delivery partner goes offline
      if (socket.userRole === 'delivery_partner') {
        // Potentially broadcast partner_disconnected event
      }
    });
  });

  return wsService;
}

export { WebSocketService };

// Helper function to send notifications to specific users
export function sendToUser(io: Server, userId: string, event: string, data: any) {
  console.log(`Sending event "${event}" to user ${userId}`);
  io.to(`user:${userId}`).emit(event, data);
}

// Helper function to send notifications to users with specific role
export function sendToRole(io: Server, role: string, event: string, data: any) {
  console.log(`Sending event "${event}" to role ${role}`);
  io.to(`role:${role}`).emit(event, data);
}

// Helper function to send order updates
export function sendOrderUpdate(io: Server, orderId: string, update: any) {
  console.log(`Sending order update for order ${orderId}`);
  io.to(`order:${orderId}`).emit('order_update', update);
}
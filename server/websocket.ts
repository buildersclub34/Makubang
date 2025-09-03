
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

interface SocketUser {
  id: string;
  role: string;
  socketId: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private deliveryPartners: Map<string, string> = new Map(); // partnerId -> socketId
  private activeOrders: Map<string, string[]> = new Map(); // orderId -> [userSocketId, partnerSocketId]

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Authenticate socket connection
      socket.on('authenticate', (token) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          const user: SocketUser = {
            id: decoded.userId,
            role: decoded.role,
            socketId: socket.id,
          };

          this.connectedUsers.set(socket.id, user);

          if (user.role === 'delivery_partner') {
            this.deliveryPartners.set(user.id, socket.id);
          }

          socket.join(`user_${user.id}`);
          socket.emit('authenticated', { success: true, user });
        } catch (error) {
          socket.emit('authentication_error', { message: 'Invalid token' });
          socket.disconnect();
        }
      });

      // Handle delivery partner location updates
      socket.on('location_update', (data) => {
        const user = this.connectedUsers.get(socket.id);
        if (user && user.role === 'delivery_partner') {
          // Broadcast location to all tracking this partner
          this.io.emit('partner_location_update', {
            partnerId: user.id,
            location: data.location,
            timestamp: new Date(),
          });
        }
      });

      // Handle order tracking
      socket.on('track_order', (orderId) => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          socket.join(`order_${orderId}`);
          
          if (!this.activeOrders.has(orderId)) {
            this.activeOrders.set(orderId, []);
          }
          this.activeOrders.get(orderId)?.push(socket.id);
        }
      });

      // Handle order status updates
      socket.on('update_order_status', (data) => {
        const user = this.connectedUsers.get(socket.id);
        if (user && user.role === 'delivery_partner') {
          this.io.to(`order_${data.orderId}`).emit('order_status_updated', {
            orderId: data.orderId,
            status: data.status,
            location: data.location,
            timestamp: new Date(),
            partnerName: user.id,
          });
        }
      });

      // Handle new order assignment
      socket.on('join_delivery_zone', (zoneId) => {
        const user = this.connectedUsers.get(socket.id);
        if (user && user.role === 'delivery_partner') {
          socket.join(`delivery_zone_${zoneId}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const user = this.connectedUsers.get(socket.id);
        
        if (user) {
          this.connectedUsers.delete(socket.id);
          
          if (user.role === 'delivery_partner') {
            this.deliveryPartners.delete(user.id);
          }

          // Remove from active orders
          this.activeOrders.forEach((sockets, orderId) => {
            const index = sockets.indexOf(socket.id);
            if (index > -1) {
              sockets.splice(index, 1);
              if (sockets.length === 0) {
                this.activeOrders.delete(orderId);
              }
            }
          });
        }
      });
    });
  }

  // Notify new order to nearby delivery partners
  notifyNewOrder(orderData: any, zoneId: string) {
    this.io.to(`delivery_zone_${zoneId}`).emit('new_order_available', orderData);
  }

  // Notify order updates to customer
  notifyOrderUpdate(orderId: string, updateData: any) {
    this.io.to(`order_${orderId}`).emit('order_update', updateData);
  }

  // Notify delivery partner about order assignment
  notifyOrderAssignment(partnerId: string, orderData: any) {
    const socketId = this.deliveryPartners.get(partnerId);
    if (socketId) {
      this.io.to(socketId).emit('order_assigned', orderData);
    }
  }

  // Broadcast delivery partner location to tracking users
  broadcastPartnerLocation(partnerId: string, location: any) {
    this.io.emit('partner_location_update', {
      partnerId,
      location,
      timestamp: new Date(),
    });
  }

  // Send push notification (could integrate with FCM/APNS)
  sendPushNotification(userId: string, notification: any) {
    const userSockets = Array.from(this.connectedUsers.values())
      .filter(user => user.id === userId)
      .map(user => user.socketId);

    userSockets.forEach(socketId => {
      this.io.to(socketId).emit('push_notification', notification);
    });
  }

  // Notify wallet updates
  notifyWalletUpdate(partnerId: string, walletData: any) {
    const socketId = this.deliveryPartners.get(partnerId);
    if (socketId) {
      this.io.to(socketId).emit('wallet_updated', walletData);
    }
  }

  // Get online delivery partners
  getOnlineDeliveryPartners(): string[] {
    return Array.from(this.deliveryPartners.keys());
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Broadcast system announcement
  broadcastAnnouncement(message: string, targetRole?: string) {
    const targetUsers = targetRole 
      ? Array.from(this.connectedUsers.values()).filter(user => user.role === targetRole)
      : Array.from(this.connectedUsers.values());

    targetUsers.forEach(user => {
      this.io.to(user.socketId).emit('system_announcement', {
        message,
        timestamp: new Date(),
      });
    });
  }
}

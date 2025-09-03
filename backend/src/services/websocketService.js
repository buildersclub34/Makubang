const WebSocket = require('ws');
const Order = require('../models/Order');
const OrderStatus = require('../models/OrderStatus');
const { createNotification } = require('./notificationService');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.clients = new Map(); // userID -> Set of WebSocket connections
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection');
      
      // Extract user ID from query params or headers (implement your auth)
      const userId = this.authenticateConnection(req);
      if (!userId) {
        return ws.close(4001, 'Unauthorized');
      }

      // Add to clients map
      this.addClient(userId, ws);

      // Handle messages
      ws.on('message', (message) => this.handleMessage(userId, message));
      
      // Handle close
      ws.on('close', () => this.removeClient(userId, ws));
      
      // Send initial data if needed
      this.sendInitialData(userId, ws);
    });
  }

  authenticateConnection(req) {
    // Implement your authentication logic here
    // This is a simplified example - use JWT or session-based auth
    const token = req.url.split('token=')[1];
    if (!token) return null;
    
    try {
      // Verify token and return user ID
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // return decoded.id;
      return token; // Simplified for example
    } catch (error) {
      return null;
    }
  }

  addClient(userId, ws) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);
    console.log(`Client connected. Total clients: ${this.getTotalClients()}`);
  }

  removeClient(userId, ws) {
    if (this.clients.has(userId)) {
      const userSockets = this.clients.get(userId);
      userSockets.delete(ws);
      
      if (userSockets.size === 0) {
        this.clients.delete(userId);
      }
      console.log(`Client disconnected. Total clients: ${this.getTotalClients()}`);
    }
  }

  getTotalClients() {
    return Array.from(this.clients.values()).reduce(
      (count, sockets) => count + sockets.size,
      0
    );
  }

  async sendInitialData(userId, ws) {
    try {
      // Send user's active orders
      const orders = await Order.find({
        $or: [
          { user: userId, status: { $nin: ['delivered', 'cancelled', 'rejected'] } },
          { 'deliveryPartner': userId, status: { $nin: ['delivered', 'cancelled', 'rejected'] } },
          { 'restaurant.owner': userId, status: { $nin: ['delivered', 'cancelled', 'rejected'] } }
        ]
      }).sort('-createdAt');

      ws.send(JSON.stringify({
        type: 'INITIAL_ORDERS',
        data: orders
      }));
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  async handleMessage(userId, message) {
    try {
      const { type, data } = JSON.parse(message);
      
      switch (type) {
        case 'SUBSCRIBE_ORDER':
          await this.handleOrderSubscription(userId, data.orderId);
          break;
        case 'LOCATION_UPDATE':
          await this.handleLocationUpdate(userId, data);
          break;
        default:
          console.log('Unknown message type:', type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  async handleOrderSubscription(userId, orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return this.sendToUser(userId, {
          type: 'ERROR',
          message: 'Order not found'
        });
      }

      // Check if user has permission to subscribe to this order
      if (
        order.user.toString() !== userId &&
        order.deliveryPartner?.toString() !== userId &&
        order.restaurant.owner.toString() !== userId
      ) {
        return this.sendToUser(userId, {
          type: 'ERROR',
          message: 'Not authorized to subscribe to this order'
        });
      }

      // Send current order status
      const statusHistory = await OrderStatus.find({ order: orderId })
        .sort('createdAt')
        .populate('changedBy', 'name role');

      this.sendToUser(userId, {
        type: 'ORDER_STATUS_UPDATE',
        data: {
          orderId,
          status: order.status,
          history: statusHistory
        }
      });
    } catch (error) {
      console.error('Error handling order subscription:', error);
    }
  }

  async handleLocationUpdate(userId, { orderId, location }) {
    try {
      const order = await Order.findById(orderId);
      if (!order || order.deliveryPartner?.toString() !== userId) {
        return; // Only delivery partners can update location
      }

      // Update order with new location
      order.deliveryLocation = {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
        updatedAt: new Date()
      };
      await order.save();

      // Notify restaurant and customer
      this.broadcastToOrderUsers(orderId, {
        type: 'DELIVERY_LOCATION_UPDATE',
        data: {
          orderId,
          location: order.deliveryLocation,
          updatedAt: order.deliveryLocation.updatedAt
        }
      });
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  // Send message to a specific user
  sendToUser(userId, message) {
    if (!this.clients.has(userId)) return false;

    const userSockets = this.clients.get(userId);
    const messageStr = JSON.stringify(message);
    let sent = false;

    userSockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        sent = true;
      }
    });

    return sent;
  }

  // Broadcast to all users involved in an order
  async broadcastToOrderUsers(orderId, message) {
    try {
      const order = await Order.findById(orderId);
      if (!order) return;

      const userIds = new Set([
        order.user.toString(),
        order.deliveryPartner?.toString(),
        order.restaurant.owner.toString(),
        ...(order.restaurant.staff || []).map(s => s.user.toString())
      ];

      userIds.forEach(userId => {
        if (userId) {
          this.sendToUser(userId, message);
        }
      });
    } catch (error) {
      console.error('Error broadcasting to order users:', error);
    }
  }

  // Notify order status change
  async notifyOrderStatusChange(orderId, status, changedBy) {
    try {
      const order = await Order.findById(orderId)
        .populate('user', 'name')
        .populate('restaurant', 'name');

      if (!order) return;

      // Broadcast status update
      await this.broadcastToOrderUsers(orderId, {
        type: 'ORDER_STATUS_UPDATE',
        data: {
          orderId,
          status,
          updatedAt: new Date(),
          changedBy: {
            id: changedBy._id,
            name: changedBy.name,
            role: changedBy.role
          }
        }
      });

      // Create notification for user
      if (order.user) {
        await createNotification({
          user: order.user,
          type: 'ORDER_UPDATE',
          title: 'Order Status Updated',
          message: `Your order #${order.orderNumber} is now ${status}`,
          data: { orderId: order._id },
          relatedTo: {
            type: 'order',
            id: order._id
          }
        });
      }

      // Notify delivery partner if status is relevant
      if (order.deliveryPartner && ['out_for_delivery', 'delivered'].includes(status)) {
        await createNotification({
          user: order.deliveryPartner,
          type: 'DELIVERY_UPDATE',
          title: `Order ${status === 'out_for_delivery' ? 'Ready for Delivery' : 'Delivered'}`,
          message: `Order #${order.orderNumber} has been ${status}`,
          data: { orderId: order._id },
          relatedTo: {
            type: 'order',
            id: order._id
          }
        });
      }
    } catch (error) {
      console.error('Error notifying order status change:', error);
    }
  }

  // Notify new order to restaurant
  async notifyNewOrder(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('user', 'name')
        .populate('restaurant', 'owner');

      if (!order) return;

      // Notify restaurant owner
      await createNotification({
        user: order.restaurant.owner,
        type: 'NEW_ORDER',
        title: 'New Order Received',
        message: `New order #${order.orderNumber} from ${order.user.name}`,
        data: { orderId: order._id },
        relatedTo: {
          type: 'order',
          id: order._id
        }
      });

      // Broadcast to all restaurant staff
      if (order.restaurant.staff && order.restaurant.staff.length > 0) {
        await Promise.all(
          order.restaurant.staff.map(staff =>
            createNotification({
              user: staff.user,
              type: 'NEW_ORDER',
              title: 'New Order Received',
              message: `New order #${order.orderNumber} from ${order.user.name}`,
              data: { orderId: order._id },
              relatedTo: {
                type: 'order',
                id: order._id
              }
            })
          )
        );
      }

      // Send real-time update to restaurant
      this.sendToUser(order.restaurant.owner.toString(), {
        type: 'NEW_ORDER',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customer: order.user.name,
          total: order.total,
          items: order.items.length,
          createdAt: order.createdAt
        }
      });
    } catch (error) {
      console.error('Error notifying new order:', error);
    }
  }
}

module.exports = WebSocketService;

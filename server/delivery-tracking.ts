
import { WebSocketServer } from 'ws';
import { db } from './db';
import { orders, deliveryTracking, deliveryPartners } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

export interface DeliveryLocation {
  lat: number;
  lng: number;
  timestamp: Date;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface DeliveryUpdate {
  orderId: string;
  partnerId: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  location?: DeliveryLocation;
  estimatedTime?: number;
  notes?: string;
}

export class DeliveryTrackingService {
  private static wss: WebSocketServer;
  private static activeDeliveries = new Map<string, any>();

  static initializeWebSocket(wss: WebSocketServer) {
    this.wss = wss;
  }

  // Start tracking a delivery
  static async startTracking(orderId: string, partnerId: string): Promise<void> {
    try {
      const tracking = await db.insert(deliveryTracking).values({
        orderId,
        partnerId,
        status: 'assigned',
        estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000), // 30 mins
        trackingData: []
      }).returning();

      this.activeDeliveries.set(orderId, {
        orderId,
        partnerId,
        status: 'assigned',
        trackingId: tracking[0].id
      });

      // Notify customer and restaurant
      this.broadcastUpdate(orderId, {
        type: 'delivery_assigned',
        partnerId,
        estimatedTime: 30
      });

    } catch (error) {
      console.error('Error starting delivery tracking:', error);
      throw error;
    }
  }

  // Update delivery location and status
  static async updateDelivery(update: DeliveryUpdate): Promise<void> {
    try {
      const delivery = this.activeDeliveries.get(update.orderId);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      // Update database
      const trackingData = await this.getTrackingData(update.orderId);
      const newTrackingPoint = {
        timestamp: new Date(),
        location: update.location,
        status: update.status,
        notes: update.notes
      };

      await db.update(deliveryTracking)
        .set({
          status: update.status,
          currentLocation: update.location ? JSON.stringify(update.location) : undefined,
          estimatedDeliveryTime: update.estimatedTime ? new Date(Date.now() + update.estimatedTime * 60 * 1000) : undefined,
          trackingData: [...(trackingData || []), newTrackingPoint]
        })
        .where(eq(deliveryTracking.orderId, update.orderId));

      // Update in-memory tracking
      delivery.status = update.status;
      delivery.location = update.location;
      delivery.lastUpdate = new Date();

      // Calculate ETA if location is provided
      if (update.location) {
        const eta = await this.calculateETA(update.orderId, update.location);
        delivery.estimatedTime = eta;
      }

      // Broadcast update to connected clients
      this.broadcastUpdate(update.orderId, {
        type: 'location_update',
        status: update.status,
        location: update.location,
        estimatedTime: delivery.estimatedTime,
        timestamp: new Date()
      });

      // Handle status-specific logic
      await this.handleStatusChange(update);

    } catch (error) {
      console.error('Error updating delivery:', error);
      throw error;
    }
  }

  // Get current tracking information
  static async getTrackingInfo(orderId: string): Promise<any> {
    try {
      const tracking = await db.select()
        .from(deliveryTracking)
        .where(eq(deliveryTracking.orderId, orderId))
        .limit(1);

      if (!tracking.length) {
        return null;
      }

      const partner = await db.select()
        .from(deliveryPartners)
        .where(eq(deliveryPartners.id, tracking[0].partnerId))
        .limit(1);

      return {
        ...tracking[0],
        partner: partner[0],
        isActive: this.activeDeliveries.has(orderId)
      };
    } catch (error) {
      console.error('Error getting tracking info:', error);
      return null;
    }
  }

  // Calculate estimated delivery time
  private static async calculateETA(orderId: string, currentLocation: DeliveryLocation): Promise<number> {
    try {
      // Get destination from order
      const order = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order.length || !order[0].deliveryAddress) {
        return 15; // Default 15 minutes
      }

      const destination = JSON.parse(order[0].deliveryAddress);
      
      // Calculate distance using Haversine formula
      const distance = this.calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        destination.lat,
        destination.lng
      );

      // Estimate time based on distance and average speed (25 km/h in city)
      const averageSpeed = 25; // km/h
      const timeInHours = distance / averageSpeed;
      const timeInMinutes = Math.ceil(timeInHours * 60);

      // Add buffer time for traffic/stops
      return Math.max(timeInMinutes + 5, 5);
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return 15;
    }
  }

  // Calculate distance between two points
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Handle status-specific logic
  private static async handleStatusChange(update: DeliveryUpdate): Promise<void> {
    switch (update.status) {
      case 'picked_up':
        // Notify customer that order is picked up
        this.broadcastUpdate(update.orderId, {
          type: 'order_picked_up',
          message: 'Your order has been picked up and is on the way!'
        });
        break;

      case 'delivered':
        // Mark order as delivered and remove from active tracking
        await db.update(orders)
          .set({ status: 'delivered', deliveredAt: new Date() })
          .where(eq(orders.id, update.orderId));

        this.activeDeliveries.delete(update.orderId);

        this.broadcastUpdate(update.orderId, {
          type: 'order_delivered',
          message: 'Your order has been delivered successfully!'
        });
        break;

      case 'cancelled':
        // Handle cancellation
        this.activeDeliveries.delete(update.orderId);
        
        this.broadcastUpdate(update.orderId, {
          type: 'delivery_cancelled',
          message: 'Delivery has been cancelled'
        });
        break;
    }
  }

  // Broadcast update to connected clients
  private static broadcastUpdate(orderId: string, data: any): void {
    if (!this.wss) return;

    const message = JSON.stringify({
      type: 'delivery_update',
      orderId,
      data,
      timestamp: new Date()
    });

    this.wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  // Get tracking data history
  private static async getTrackingData(orderId: string): Promise<any[]> {
    try {
      const tracking = await db.select()
        .from(deliveryTracking)
        .where(eq(deliveryTracking.orderId, orderId))
        .limit(1);

      return tracking[0]?.trackingData || [];
    } catch (error) {
      console.error('Error getting tracking data:', error);
      return [];
    }
  }

  // Get all active deliveries for partner
  static getPartnerActiveDeliveries(partnerId: string): any[] {
    const activeDeliveries: any[] = [];
    
    this.activeDeliveries.forEach((delivery) => {
      if (delivery.partnerId === partnerId) {
        activeDeliveries.push(delivery);
      }
    });

    return activeDeliveries;
  }

  // Optimize delivery route for multiple orders
  static async optimizeDeliveryRoute(partnerId: string, orderIds: string[]): Promise<string[]> {
    try {
      const orders = await db.select()
        .from(orders)
        .where(and(
          eq(orders.status, 'confirmed'),
          // Add condition to check if orders are in the list
        ));

      // Simple optimization: sort by distance from partner's current location
      // In production, use proper route optimization algorithms
      const partner = await db.select()
        .from(deliveryPartners)
        .where(eq(deliveryPartners.id, partnerId))
        .limit(1);

      if (!partner.length) {
        return orderIds;
      }

      const partnerLocation = JSON.parse(partner[0].currentLocation || '{"lat": 0, "lng": 0}');
      
      const ordersWithDistance = orders.map(order => {
        const destination = JSON.parse(order.deliveryAddress || '{"lat": 0, "lng": 0}');
        const distance = this.calculateDistance(
          partnerLocation.lat,
          partnerLocation.lng,
          destination.lat,
          destination.lng
        );
        
        return { orderId: order.id, distance };
      });

      // Sort by distance and return order IDs
      return ordersWithDistance
        .sort((a, b) => a.distance - b.distance)
        .map(item => item.orderId);

    } catch (error) {
      console.error('Error optimizing delivery route:', error);
      return orderIds;
    }
  }

  // Send notification to delivery partner
  static async notifyPartner(partnerId: string, message: string, data?: any): Promise<void> {
    this.broadcastUpdate(`partner_${partnerId}`, {
      type: 'partner_notification',
      message,
      data
    });
  }

  // Get delivery analytics
  static async getDeliveryAnalytics(partnerId?: string): Promise<any> {
    try {
      // Get delivery stats for the day
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completedDeliveries = await db.select()
        .from(deliveryTracking)
        .where(and(
          eq(deliveryTracking.status, 'delivered'),
          // Add date filter
          partnerId ? eq(deliveryTracking.partnerId, partnerId) : undefined
        ));

      const totalDeliveries = completedDeliveries.length;
      const averageDeliveryTime = totalDeliveries > 0 
        ? completedDeliveries.reduce((sum, delivery) => {
            const startTime = new Date(delivery.createdAt);
            const endTime = new Date(delivery.updatedAt);
            return sum + (endTime.getTime() - startTime.getTime());
          }, 0) / totalDeliveries / 60000 // Convert to minutes
        : 0;

      return {
        totalDeliveries,
        averageDeliveryTime: Math.round(averageDeliveryTime),
        activeDeliveries: partnerId 
          ? this.getPartnerActiveDeliveries(partnerId).length
          : this.activeDeliveries.size,
        onTimeDeliveries: Math.floor(totalDeliveries * 0.85), // Mock calculation
        customerRating: 4.7 // Mock rating
      };
    } catch (error) {
      console.error('Error getting delivery analytics:', error);
      return {
        totalDeliveries: 0,
        averageDeliveryTime: 0,
        activeDeliveries: 0,
        onTimeDeliveries: 0,
        customerRating: 0
      };
    }
  }
}

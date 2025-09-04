
import { storage } from './storage';
import { orders, deliveryPartners } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { WebSocketManager } from './websocket';

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  isAvailable: boolean;
  rating: number;
  totalDeliveries: number;
}

export interface DeliveryTracking {
  orderId: string;
  partnerId: string;
  status: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  estimatedArrival: Date;
  actualPickup?: Date;
  actualDelivery?: Date;
}

export class DeliveryService {
  private static wsManager = WebSocketManager.getInstance();

  static async assignDeliveryPartner(orderId: string) {
    try {
      // Get order details
      const order = await storage.db.select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order.length) {
        throw new Error('Order not found');
      }

      // Find available delivery partner (simplified logic)
      const availablePartners = await storage.db.select()
        .from(deliveryPartners)
        .where(eq(deliveryPartners.isAvailable, true))
        .limit(5);

      if (!availablePartners.length) {
        throw new Error('No delivery partners available');
      }

      // Select partner with highest rating
      const selectedPartner = availablePartners.sort((a, b) => b.rating - a.rating)[0];

      // Update order with assigned partner
      await storage.db.update(orders)
        .set({
          assignedPartnerId: selectedPartner.id,
          status: 'assigned_to_partner',
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));

      // Mark partner as busy
      await storage.db.update(deliveryPartners)
        .set({
          isAvailable: false,
          currentOrderId: orderId,
          updatedAt: new Date()
        })
        .where(eq(deliveryPartners.id, selectedPartner.id));

      // Send notification to partner
      this.wsManager.sendToUser(selectedPartner.id, {
        type: 'NEW_DELIVERY_ASSIGNED',
        data: {
          orderId,
          restaurantId: order[0].restaurantId,
          customerAddress: order[0].deliveryAddress,
          amount: order[0].total,
        }
      });

      return {
        success: true,
        partnerId: selectedPartner.id,
        partnerName: selectedPartner.name,
        estimatedPickup: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      };
    } catch (error) {
      console.error('Partner assignment error:', error);
      throw error;
    }
  }

  static async updateDeliveryStatus(orderId: string, status: string, location?: { lat: number; lng: number }) {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (status === 'picked_up') {
        updateData.actualPickup = new Date();
        updateData.estimatedDelivery = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
      } else if (status === 'delivered') {
        updateData.actualDelivery = new Date();
        updateData.paymentStatus = 'completed';
      }

      await storage.db.update(orders)
        .set(updateData)
        .where(eq(orders.id, orderId));

      // Send real-time update to customer
      const order = await storage.db.select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (order.length) {
        this.wsManager.sendToUser(order[0].userId!, {
          type: 'DELIVERY_STATUS_UPDATE',
          data: {
            orderId,
            status,
            location,
            estimatedDelivery: updateData.estimatedDelivery,
          }
        });
      }

      // If delivered, mark partner as available
      if (status === 'delivered') {
        const orderData = order[0];
        if (orderData.assignedPartnerId) {
          await storage.db.update(deliveryPartners)
            .set({
              isAvailable: true,
              currentOrderId: null,
              totalDeliveries: storage.db.select().from(deliveryPartners)
                .where(eq(deliveryPartners.id, orderData.assignedPartnerId))
                .then(p => p[0]?.totalDeliveries ? p[0].totalDeliveries + 1 : 1),
              updatedAt: new Date()
            })
            .where(eq(deliveryPartners.id, orderData.assignedPartnerId));
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Delivery status update error:', error);
      throw error;
    }
  }

  static async getDeliveryTracking(orderId: string) {
    try {
      const orderData = await storage.db.select({
        orderId: orders.id,
        status: orders.status,
        estimatedDelivery: orders.estimatedDelivery,
        actualPickup: orders.actualPickup,
        actualDelivery: orders.actualDelivery,
        partnerId: orders.assignedPartnerId,
        partnerName: deliveryPartners.name,
        partnerPhone: deliveryPartners.phone,
        partnerLocation: deliveryPartners.currentLocation,
      })
      .from(orders)
      .leftJoin(deliveryPartners, eq(orders.assignedPartnerId, deliveryPartners.id))
      .where(eq(orders.id, orderId))
      .limit(1);

      if (!orderData.length) {
        throw new Error('Order not found');
      }

      return orderData[0];
    } catch (error) {
      console.error('Tracking fetch error:', error);
      throw error;
    }
  }

  static async calculateDeliveryFee(restaurantId: string, deliveryAddress: string) {
    // Simplified calculation - in real app would use Google Maps Distance Matrix API
    const baseFee = 40;
    const perKmRate = 8;
    
    // Mock distance calculation
    const estimatedDistance = Math.random() * 10 + 2; // 2-12 km
    const calculatedFee = baseFee + (estimatedDistance * perKmRate);
    
    return {
      baseFee,
      distanceFee: calculatedFee - baseFee,
      totalFee: Math.round(calculatedFee),
      estimatedDistance: Math.round(estimatedDistance * 10) / 10,
      estimatedTime: Math.round(estimatedDistance * 3 + 15), // 3 mins per km + 15 base
    };
  }
}

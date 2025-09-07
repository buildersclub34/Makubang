
import { db } from './db';
import { orders, deliveryPartners, users } from '../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { WebSocketService } from './websocket';

export interface DeliveryAssignment {
  orderId: string;
  partnerId: string;
  estimatedTime: number;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  dropLocation: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface DeliveryUpdate {
  orderId: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  location?: {
    lat: number;
    lng: number;
  };
  estimatedTime?: number;
  notes?: string;
}

export class DeliveryService {
  private wsService: WebSocketService;
  private apiBaseUrl: string;
  private apiKey: string;

  constructor(wsService: WebSocketService) {
    this.wsService = wsService;
    this.apiBaseUrl = process.env.DELIVERY_APP_API_URL || 'http://localhost:3001/api';
    this.apiKey = process.env.DELIVERY_APP_API_KEY || 'demo-key';
  }

  // Find available delivery partners near restaurant
  async findAvailablePartners(restaurantLocation: { lat: number; lng: number }, radius: number = 5) {
    try {
      const availablePartners = await db
        .select({
          id: deliveryPartners.id,
          userId: deliveryPartners.userId,
          vehicleType: deliveryPartners.vehicleType,
          rating: deliveryPartners.rating,
          currentLocation: deliveryPartners.currentLocation,
          name: users.name,
          phone: users.phone,
        })
        .from(deliveryPartners)
        .leftJoin(users, eq(deliveryPartners.userId, users.id))
        .where(
          and(
            eq(deliveryPartners.isAvailable, true),
            eq(deliveryPartners.status, 'active'),
            eq(deliveryPartners.isVerified, true)
          )
        );

      // Filter by distance (simplified - in production use proper geospatial queries)
      const nearbyPartners = availablePartners.filter(partner => {
        if (!partner.currentLocation) return false;
        
        const location = JSON.parse(partner.currentLocation as string);
        const distance = this.calculateDistance(
          restaurantLocation.lat,
          restaurantLocation.lng,
          location.lat,
          location.lng
        );
        
        return distance <= radius;
      });

      return nearbyPartners.sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'));
    } catch (error) {
      console.error('Error finding available partners:', error);
      throw new Error('Failed to find delivery partners');
    }
  }

  // Assign order to delivery partner
  async assignOrder(orderId: string, preferredPartnerId?: string): Promise<DeliveryAssignment> {
    try {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new Error('Order not found');
      }

      const pickupLocation = JSON.parse(order.pickupAddress as string);
      const dropLocation = JSON.parse(order.deliveryAddress as string);

      let selectedPartner;

      if (preferredPartnerId) {
        // Try to assign to preferred partner
        const [partner] = await db
          .select()
          .from(deliveryPartners)
          .where(
            and(
              eq(deliveryPartners.id, preferredPartnerId),
              eq(deliveryPartners.isAvailable, true),
              eq(deliveryPartners.status, 'active')
            )
          )
          .limit(1);
        
        selectedPartner = partner;
      }

      if (!selectedPartner) {
        // Find best available partner
        const availablePartners = await this.findAvailablePartners(pickupLocation);
        if (availablePartners.length === 0) {
          throw new Error('No delivery partners available');
        }
        selectedPartner = availablePartners[0];
      }

      // Calculate estimated delivery time
      const estimatedTime = this.calculateEstimatedTime(pickupLocation, dropLocation);

      // Update order with delivery partner
      await db
        .update(orders)
        .set({
          deliveryPartnerId: selectedPartner.userId,
          status: 'assigned_to_delivery',
          estimatedDeliveryTime: new Date(Date.now() + estimatedTime * 60000),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Mark delivery partner as busy
      await db
        .update(deliveryPartners)
        .set({
          isAvailable: false,
          updatedAt: new Date(),
        })
        .where(eq(deliveryPartners.id, selectedPartner.id));

      const assignment: DeliveryAssignment = {
        orderId,
        partnerId: selectedPartner.id,
        estimatedTime,
        pickupLocation,
        dropLocation,
      };

      // Notify delivery partner through external API
      await this.notifyDeliveryPartner(assignment);

      // Broadcast update to all relevant parties
      this.wsService.broadcastUpdate(`order_${orderId}`, {
        type: 'delivery_assigned',
        orderId,
        partnerId: selectedPartner.id,
        estimatedTime,
      });

      return assignment;
    } catch (error) {
      console.error('Error assigning order:', error);
      throw new Error('Failed to assign delivery partner');
    }
  }

  // Update delivery status
  async updateDeliveryStatus(update: DeliveryUpdate) {
    try {
      const trackingData = {
        status: update.status,
        location: update.location,
        timestamp: new Date(),
        notes: update.notes,
      };

      // Update order status and tracking data
      const [order] = await db
        .update(orders)
        .set({
          status: this.mapDeliveryStatusToOrderStatus(update.status),
          trackingData: trackingData,
          actualDeliveryTime: update.status === 'delivered' ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, update.orderId))
        .returning();

      if (!order) {
        throw new Error('Order not found');
      }

      // If delivered, mark delivery partner as available
      if (update.status === 'delivered' || update.status === 'cancelled') {
        if (order.deliveryPartnerId) {
          await db
            .update(deliveryPartners)
            .set({
              isAvailable: true,
              totalDeliveries: update.status === 'delivered' ? 
                db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, order.deliveryPartnerId)) as any : 
                undefined,
              updatedAt: new Date(),
            })
            .where(eq(deliveryPartners.userId, order.deliveryPartnerId));
        }
      }

      // Broadcast update to all relevant parties
      this.wsService.broadcastUpdate(`order_${update.orderId}`, {
        type: 'delivery_status_update',
        orderId: update.orderId,
        status: update.status,
        location: update.location,
        timestamp: new Date(),
      });

      // Notify customer
      this.wsService.broadcastUpdate(`user_${order.userId}`, {
        type: 'order_update',
        orderId: update.orderId,
        status: update.status,
        message: this.getStatusMessage(update.status),
      });

      return { success: true, order };
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw new Error('Failed to update delivery status');
    }
  }

  // Get available orders for delivery partners
  async getAvailableOrders(partnerId?: string) {
    try {
      const availableOrders = await db
        .select({
          id: orders.id,
          restaurantId: orders.restaurantId,
          totalAmount: orders.totalAmount,
          deliveryFee: orders.deliveryFee,
          pickupAddress: orders.pickupAddress,
          deliveryAddress: orders.deliveryAddress,
          estimatedDeliveryTime: orders.estimatedDeliveryTime,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, 'confirmed'),
            eq(orders.deliveryPartnerId, null as any)
          )
        );

      return availableOrders;
    } catch (error) {
      console.error('Error fetching available orders:', error);
      throw new Error('Failed to fetch available orders');
    }
  }

  // Accept order by delivery partner
  async acceptOrder(orderId: string, partnerId: string) {
    try {
      const [partner] = await db
        .select()
        .from(deliveryPartners)
        .where(eq(deliveryPartners.id, partnerId))
        .limit(1);

      if (!partner) {
        throw new Error('Delivery partner not found');
      }

      const assignment = await this.assignOrder(orderId, partnerId);
      
      return {
        success: true,
        assignment,
        message: 'Order assigned successfully',
      };
    } catch (error) {
      console.error('Error accepting order:', error);
      throw new Error('Failed to accept order');
    }
  }

  // Track order in real-time
  async trackOrder(orderId: string) {
    try {
      const [order] = await db
        .select({
          id: orders.id,
          status: orders.status,
          trackingData: orders.trackingData,
          estimatedDeliveryTime: orders.estimatedDeliveryTime,
          actualDeliveryTime: orders.actualDeliveryTime,
          deliveryPartnerId: orders.deliveryPartnerId,
          partner: {
            id: deliveryPartners.id,
            vehicleType: deliveryPartners.vehicleType,
            vehicleNumber: deliveryPartners.vehicleNumber,
            currentLocation: deliveryPartners.currentLocation,
            name: users.name,
            phone: users.phone,
          },
        })
        .from(orders)
        .leftJoin(deliveryPartners, eq(orders.deliveryPartnerId, deliveryPartners.userId))
        .leftJoin(users, eq(deliveryPartners.userId, users.id))
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new Error('Order not found');
      }

      return order;
    } catch (error) {
      console.error('Error tracking order:', error);
      throw new Error('Failed to track order');
    }
  }

  // Private helper methods
  private async notifyDeliveryPartner(assignment: DeliveryAssignment) {
    try {
      // Call external delivery app API
      const response = await fetch(`${this.apiBaseUrl}/orders/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(assignment),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error notifying delivery partner:', error);
      // Don't throw error, just log it as notification failure shouldn't break assignment
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  private calculateEstimatedTime(pickup: any, drop: any): number {
    const distance = this.calculateDistance(pickup.lat, pickup.lng, drop.lat, drop.lng);
    // Assume average speed of 30 km/h in city traffic
    return Math.ceil((distance / 30) * 60); // Time in minutes
  }

  private mapDeliveryStatusToOrderStatus(deliveryStatus: string): string {
    const statusMap: Record<string, string> = {
      'assigned': 'assigned_to_delivery',
      'picked_up': 'picked_up',
      'in_transit': 'out_for_delivery',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
    };
    return statusMap[deliveryStatus] || 'confirmed';
  }

  private getStatusMessage(status: string): string {
    const messages: Record<string, string> = {
      'assigned': 'Your order has been assigned to a delivery partner',
      'picked_up': 'Your order has been picked up and is on the way',
      'in_transit': 'Your order is out for delivery',
      'delivered': 'Your order has been delivered successfully',
      'cancelled': 'Your order delivery has been cancelled',
    };
    return messages[status] || 'Order status updated';
  }
}

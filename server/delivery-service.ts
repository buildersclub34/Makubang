
import { db } from './db';
import { orders, users, notifications } from '../shared/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface DeliveryPartner {
  id: string;
  name: string;
  phone?: string;
  email: string;
  profilePicture?: string;
  rating: number;
  totalDeliveries: number;
  isAvailable: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  vehicleInfo?: {
    type: string; // bike, car, bicycle
    number: string;
    color?: string;
  };
}

export interface DeliveryAssignment {
  orderId: string;
  deliveryPartnerId: string;
  assignedAt: Date;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  status: 'assigned' | 'accepted' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  location?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
}

export interface DeliveryTracking {
  orderId: string;
  deliveryPartner: DeliveryPartner;
  status: string;
  estimatedTime: number; // minutes
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  deliveryAddress: {
    street: string;
    city: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  timeline: Array<{
    status: string;
    timestamp: Date;
    description: string;
  }>;
}

class DeliveryService {
  private activeDeliveries = new Map<string, DeliveryAssignment>();
  private partnerLocations = new Map<string, { lat: number; lng: number; timestamp: Date }>();

  /**
   * Get available delivery partners near a location
   */
  async getAvailablePartners(
    restaurantLocation: { latitude: number; longitude: number },
    radius = 10 // km
  ): Promise<DeliveryPartner[]> {
    try {
      // Get all active delivery partners
      const partners = await db.query.users.findMany({
        where: and(
          eq(users.role, 'delivery_partner'),
          eq(users.isVerified, true)
        ),
        columns: {
          id: true,
          name: true,
          phone: true,
          email: true,
          profilePicture: true,
        },
      });

      // Filter by availability and location (simplified - in production use geospatial queries)
      const availablePartners: DeliveryPartner[] = partners.map(partner => ({
        id: partner.id,
        name: partner.name,
        phone: partner.phone || undefined,
        email: partner.email,
        profilePicture: partner.profilePicture || undefined,
        rating: 4.5, // TODO: Calculate from actual ratings
        totalDeliveries: 0, // TODO: Calculate from order history
        isAvailable: true, // TODO: Check actual availability
        currentLocation: this.partnerLocations.get(partner.id) 
          ? {
              latitude: this.partnerLocations.get(partner.id)!.lat,
              longitude: this.partnerLocations.get(partner.id)!.lng,
              timestamp: this.partnerLocations.get(partner.id)!.timestamp,
            }
          : undefined,
      }));

      return availablePartners;
    } catch (error) {
      console.error('Error fetching available partners:', error);
      return [];
    }
  }

  /**
   * Assign delivery partner to order
   */
  async assignOrder(orderId: string, deliveryPartnerId?: string): Promise<DeliveryAssignment | null> {
    try {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          restaurant: true,
        },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      let partnerId = deliveryPartnerId;

      // If no specific partner provided, find the best available one
      if (!partnerId) {
        const restaurantLocation = order.restaurant?.address as any;
        if (restaurantLocation?.coordinates) {
          const availablePartners = await this.getAvailablePartners(
            restaurantLocation.coordinates
          );
          
          if (availablePartners.length === 0) {
            throw new Error('No available delivery partners');
          }

          // Select partner with highest rating and lowest current workload
          partnerId = availablePartners[0].id;
        } else {
          throw new Error('Restaurant location not available');
        }
      }

      // Update order with delivery partner
      await db
        .update(orders)
        .set({
          deliveryPartnerId: partnerId,
          status: 'ready',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Create delivery assignment
      const assignment: DeliveryAssignment = {
        orderId,
        deliveryPartnerId: partnerId,
        assignedAt: new Date(),
        status: 'assigned',
      };

      this.activeDeliveries.set(orderId, assignment);

      // Send notification to delivery partner
      await this.notifyDeliveryPartner(partnerId, 'new_assignment', {
        orderId,
        orderNumber: order.orderNumber,
      });

      return assignment;
    } catch (error) {
      console.error('Error assigning delivery partner:', error);
      throw error;
    }
  }

  /**
   * Accept delivery assignment
   */
  async acceptDelivery(orderId: string, deliveryPartnerId: string): Promise<boolean> {
    try {
      const assignment = this.activeDeliveries.get(orderId);
      if (!assignment || assignment.deliveryPartnerId !== deliveryPartnerId) {
        throw new Error('Invalid delivery assignment');
      }

      // Update assignment
      assignment.status = 'accepted';
      assignment.acceptedAt = new Date();
      this.activeDeliveries.set(orderId, assignment);

      // Update order status
      await db
        .update(orders)
        .set({
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Notify customer
      await this.notifyCustomer(orderId, 'delivery_assigned');

      return true;
    } catch (error) {
      console.error('Error accepting delivery:', error);
      return false;
    }
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    orderId: string,
    deliveryPartnerId: string,
    status: DeliveryAssignment['status'],
    location?: { latitude: number; longitude: number }
  ): Promise<boolean> {
    try {
      const assignment = this.activeDeliveries.get(orderId);
      if (!assignment || assignment.deliveryPartnerId !== deliveryPartnerId) {
        throw new Error('Invalid delivery assignment');
      }

      // Update assignment
      assignment.status = status;
      assignment.location = location ? {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date(),
      } : assignment.location;

      // Update specific timestamps
      switch (status) {
        case 'picked_up':
          assignment.pickedUpAt = new Date();
          break;
        case 'delivered':
          assignment.deliveredAt = new Date();
          assignment.actualDeliveryTime = new Date();
          break;
      }

      this.activeDeliveries.set(orderId, assignment);

      // Update partner location
      if (location) {
        this.partnerLocations.set(deliveryPartnerId, {
          lat: location.latitude,
          lng: location.longitude,
          timestamp: new Date(),
        });
      }

      // Update order status
      let orderStatus = status;
      if (status === 'picked_up') orderStatus = 'out_for_delivery';
      if (status === 'delivered') orderStatus = 'delivered';

      await db
        .update(orders)
        .set({
          status: orderStatus,
          actualDeliveryTime: status === 'delivered' ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Notify customer of status updates
      await this.notifyCustomer(orderId, 'status_update', { status: orderStatus });

      // Remove from active deliveries if completed
      if (status === 'delivered' || status === 'cancelled') {
        this.activeDeliveries.delete(orderId);
      }

      return true;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      return false;
    }
  }

  /**
   * Get delivery tracking information
   */
  async getDeliveryTracking(orderId: string): Promise<DeliveryTracking | null> {
    try {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          deliveryPartner: {
            columns: {
              id: true,
              name: true,
              phone: true,
              email: true,
              profilePicture: true,
            },
          },
        },
      });

      if (!order || !order.deliveryPartner) {
        return null;
      }

      const assignment = this.activeDeliveries.get(orderId);
      const partnerLocation = this.partnerLocations.get(order.deliveryPartner.id);

      // Build timeline
      const timeline = [];
      timeline.push({
        status: 'confirmed',
        timestamp: order.createdAt,
        description: 'Order confirmed by restaurant',
      });

      if (assignment?.acceptedAt) {
        timeline.push({
          status: 'accepted',
          timestamp: assignment.acceptedAt,
          description: 'Delivery partner assigned',
        });
      }

      if (assignment?.pickedUpAt) {
        timeline.push({
          status: 'picked_up',
          timestamp: assignment.pickedUpAt,
          description: 'Order picked up from restaurant',
        });
      }

      if (assignment?.deliveredAt) {
        timeline.push({
          status: 'delivered',
          timestamp: assignment.deliveredAt,
          description: 'Order delivered successfully',
        });
      }

      return {
        orderId,
        deliveryPartner: {
          id: order.deliveryPartner.id,
          name: order.deliveryPartner.name,
          phone: order.deliveryPartner.phone || undefined,
          email: order.deliveryPartner.email,
          profilePicture: order.deliveryPartner.profilePicture || undefined,
          rating: 4.5, // TODO: Calculate from actual ratings
          totalDeliveries: 0, // TODO: Calculate from order history
          isAvailable: true,
        },
        status: order.status,
        estimatedTime: this.calculateEstimatedTime(order),
        currentLocation: partnerLocation ? {
          latitude: partnerLocation.lat,
          longitude: partnerLocation.lng,
        } : undefined,
        deliveryAddress: order.deliveryAddress as any,
        timeline,
      };
    } catch (error) {
      console.error('Error getting delivery tracking:', error);
      return null;
    }
  }

  /**
   * Get delivery partner dashboard data
   */
  async getPartnerDashboard(deliveryPartnerId: string): Promise<{
    todayEarnings: number;
    todayDeliveries: number;
    activeOrders: Array<{
      id: string;
      orderNumber: string;
      restaurant: string;
      customerName: string;
      customerAddress: string;
      status: string;
      estimatedTime: number;
    }>;
    completedOrders: number;
    rating: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's deliveries
      const todayOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.deliveryPartnerId, deliveryPartnerId),
          sql`${orders.createdAt} >= ${today}`
        ),
        with: {
          restaurant: {
            columns: { name: true },
          },
          user: {
            columns: { name: true },
          },
        },
      });

      // Get active orders
      const activeOrders = todayOrders
        .filter(order => ['ready', 'picked_up', 'out_for_delivery'].includes(order.status))
        .map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          restaurant: order.restaurant?.name || 'Unknown',
          customerName: order.user?.name || 'Unknown',
          customerAddress: (order.deliveryAddress as any)?.street || 'Unknown',
          status: order.status,
          estimatedTime: this.calculateEstimatedTime(order),
        }));

      const todayEarnings = todayOrders
        .filter(order => order.status === 'delivered')
        .reduce((sum, order) => sum + (Number(order.deliveryFee) || 0), 0);

      return {
        todayEarnings,
        todayDeliveries: todayOrders.filter(order => order.status === 'delivered').length,
        activeOrders,
        completedOrders: todayOrders.filter(order => order.status === 'delivered').length,
        rating: 4.5, // TODO: Calculate from actual ratings
      };
    } catch (error) {
      console.error('Error fetching partner dashboard:', error);
      return {
        todayEarnings: 0,
        todayDeliveries: 0,
        activeOrders: [],
        completedOrders: 0,
        rating: 0,
      };
    }
  }

  /**
   * Calculate estimated delivery time
   */
  private calculateEstimatedTime(order: any): number {
    const baseTime = 30; // 30 minutes base
    const status = order.status;

    switch (status) {
      case 'ready':
      case 'confirmed':
        return baseTime;
      case 'picked_up':
      case 'out_for_delivery':
        return Math.max(10, baseTime - 20); // Reduce time as delivery progresses
      default:
        return baseTime;
    }
  }

  /**
   * Notify delivery partner
   */
  private async notifyDeliveryPartner(
    partnerId: string,
    type: 'new_assignment' | 'order_cancelled',
    data: any
  ) {
    try {
      let title: string;
      let message: string;

      switch (type) {
        case 'new_assignment':
          title = 'New Delivery Assignment';
          message = `You have a new delivery for order #${data.orderNumber}`;
          break;
        case 'order_cancelled':
          title = 'Order Cancelled';
          message = `Order #${data.orderNumber} has been cancelled`;
          break;
        default:
          return;
      }

      await db.insert(notifications).values({
        id: uuidv4(),
        userId: partnerId,
        type: 'delivery_assigned',
        title,
        message,
        metadata: data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error notifying delivery partner:', error);
    }
  }

  /**
   * Notify customer
   */
  private async notifyCustomer(
    orderId: string,
    type: 'delivery_assigned' | 'status_update',
    data?: any
  ) {
    try {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
      });

      if (!order) return;

      let title: string;
      let message: string;

      switch (type) {
        case 'delivery_assigned':
          title = 'Delivery Partner Assigned';
          message = `Your order #${order.orderNumber} is being prepared for delivery`;
          break;
        case 'status_update':
          title = 'Delivery Update';
          message = `Your order #${order.orderNumber} is ${data?.status || 'being processed'}`;
          break;
        default:
          return;
      }

      await db.insert(notifications).values({
        id: uuidv4(),
        userId: order.userId,
        type: type === 'delivery_assigned' ? 'delivery_assigned' : 'order_status_updated',
        title,
        message,
        metadata: { orderId, orderNumber: order.orderNumber, ...data },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error notifying customer:', error);
    }
  }
}

export const deliveryService = new DeliveryService();
export default deliveryService;

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { OrderUpdateService } from '../services/order-update.service';

// Define OrderStatus enum locally to avoid import issues
enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  ASSIGNED = 'ASSIGNED'
}

import { getDatabase } from '..';
import { ObjectId } from 'mongodb';

// Type for the user object in the request
type RequestUser = {
  id: string;
  email: string;
  role: string;
};

// Type for authenticated requests
export type AuthenticatedRequest = Request & {
  user: RequestUser;
};

// Request validation schemas
const updateStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const updateLocationSchema = z.object({
  lat: z.number(),
  lng: z.number()
});

export class OrderController {
  private orderUpdateService: OrderUpdateService;

  constructor(orderUpdateService: OrderUpdateService) {
    this.orderUpdateService = orderUpdateService;
  }

  /**
   * Update order status
   */
  updateStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;
      const { status, reason, metadata } = updateStatusSchema.parse(req.body);
      const db = await getDatabase();

      // Verify user has permission to update this order
      const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // In a real app, implement proper authorization
      // For now, just check if user is the restaurant owner or admin
      const isAuthorized = order.restaurantId === userId || req.user?.role === 'ADMIN';
      if (!isAuthorized) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Update order status
      const update: any = {
        status,
        updatedAt: new Date()
      };
      
      if (reason) {
        update.cancellationReason = reason;
      }
      
      if (metadata) {
        update.metadata = metadata;
      }
      
      const result = await db.collection('orders').findOneAndUpdate(
        { _id: new ObjectId(orderId) },
        { $set: update },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        return res.status(404).json({ error: 'Order not found after update' });
      }

      res.json({
        success: true,
        data: result.value
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update order status'
      });
    }
  };

  /**
   * Update delivery partner's location
   */
  updateDeliveryLocation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const { lat, lng } = updateLocationSchema.parse(req.body);
      const userId = req.user?.id;

      // In a real app, verify the user is the assigned delivery partner
      // For now, we'll just allow any authenticated user to update the location
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await this.orderUpdateService.updateDeliveryLocation(orderId, { lat, lng }, userId);

      res.json({
        success: true,
        message: 'Location updated successfully'
      });
    } catch (error) {
      console.error('Error updating delivery location:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update delivery location'
      });
    }
  };

  /**
   * Get order status
   */
  getOrderStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const status = await this.orderUpdateService.getOrderStatus(orderId, userId);
      
      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      console.error('Error getting order status:', error);
      const status = error.message === 'Unauthorized' ? 403 : 500;
      res.status(status).json({
        success: false,
        error: error.message || 'Failed to get order status'
      });
    }
  };
}

export default OrderController;

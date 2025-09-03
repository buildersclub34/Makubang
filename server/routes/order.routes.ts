import { Router, Request, Response, NextFunction, RequestHandler, Request as ExpressRequest } from 'express';
import { OrderController } from '../controllers/order.controller';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    id: string;
    role: string;
    email: string;
  };
};

// Helper function to properly type the request handler
const asyncHandler = (
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req: ExpressRequest, res: Response, next: NextFunction) => {
    // Type assertion to bypass TypeScript's type checking
    return Promise.resolve(fn(req as unknown as AuthenticatedRequest, res, next)).catch(next);
  };
};

// Simple authorize middleware
const authorize = (roles: string[]) => {
  return (req: ExpressRequest, res: Response, next: NextFunction) => {
    const user = (req as any).user; // Type assertion to bypass TypeScript
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

export const orderRoutes = (orderController: OrderController) => {
  const router = Router();

  // Update order status (restaurant owners and admins only)
  router.patch(
    '/:orderId/status',
    authorize(['RESTAURANT_OWNER', 'ADMIN']),
    asyncHandler(orderController.updateStatus)
  );

  // Update delivery location (delivery partners only)
  router.post(
    '/:orderId/location',
    authorize(['DELIVERY_PARTNER']),
    asyncHandler(orderController.updateDeliveryLocation)
  );

  // Get order status (any authenticated user who is the customer, restaurant owner, or delivery partner)
  router.get('/:orderId/status', asyncHandler(orderController.getOrderStatus));

  return router;
};

export default orderRoutes;

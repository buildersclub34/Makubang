import { Router } from 'express';
import authRoutes from './auth.routes';
import { orderRoutes } from './order.routes';
import { OrderController } from '../controllers/order.controller';
import { OrderUpdateService } from '../services/order-update.service';

export const registerRoutes = (app: any) => {
  const router = Router();

  // Initialize services
  const orderUpdateService = new OrderUpdateService(app.locals.wsService);
  
  // Initialize controllers
  const orderController = new OrderController(orderUpdateService);

  // Register routes
  router.use('/auth', authRoutes);
  router.use('/orders', orderRoutes(orderController));

  // API prefix
  app.use('/api', router);

  // Health check endpoint
  app.get('/health', (req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 404 handler
  app.use((req: any, res: any) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error:', err);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    });
  });
};

export default registerRoutes;

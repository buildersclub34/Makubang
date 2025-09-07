import { Router, Application } from 'express';
import authRoutes from './auth.routes.js';
import orderRoutes from './order.routes.js';
import notificationRoutes from './notificationRoutes.js';
import { OrderController } from '../controllers/order.controller';
import { OrderUpdateService } from '../services/order-update.service';

export const registerRoutes = (app: Application) => {
  const router = Router();

  // Initialize services
  const orderUpdateService = new OrderUpdateService(app.locals.wsService);

  // Initialize controllers
  const orderController = new OrderController(orderUpdateService);

  // Register routes
  router.use('/auth', authRoutes);
  router.use('/orders', orderRoutes(orderController));
  router.use('/notifications', notificationRoutes);

  // API prefix
  app.use('/api', router);

  // Root route
  app.get('/', (req, res) => {
    res.json({
      message: 'Makubang API Server',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        auth: '/api/auth',
        orders: '/api/orders',
        notifications: '/api/notifications',
        websocket: '/ws'
      }
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        websocket: 'running',
        notifications: 'active',
        orderTracking: 'active'
      }
    });
  });

  // 404 handler for undefined routes
  app.use('*', (req, res) => {
    res.status(404).json({ 
      error: 'Route not found',
      availableEndpoints: ['/api/auth', '/api/orders', '/api/notifications', '/health']
    });
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
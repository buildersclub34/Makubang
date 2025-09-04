
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

// Load environment variables
config();

// Import routes and middleware
import authRoutes from './routes/auth.routes';
import orderRoutes from './routes/order.routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { setupWebSocket } from './websocket';
import { NotificationService } from './services/notification-service';
import { OrderTrackingService } from './services/order-tracking';
import WebSocketService from './lib/websocket/server';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Initialize WebSocket service
const wsService = new WebSocketService(httpServer, {
  path: '/ws',
  pingInterval: 25000,
  connectionTimeout: 30000,
});

// Initialize services
const notificationService = new NotificationService(wsService);
const orderTrackingService = new OrderTrackingService(wsService);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

// Video upload and processing routes
app.post('/api/videos/upload', async (req, res) => {
  try {
    // Video upload logic here
    res.json({ success: true, message: 'Video uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Restaurant management routes
app.get('/api/restaurants', (req, res) => {
  res.json({ restaurants: [] });
});

app.post('/api/restaurants', (req, res) => {
  res.json({ success: true });
});

// Delivery tracking routes
app.get('/api/delivery/track/:orderId', (req, res) => {
  const position = orderTrackingService.getLatestPosition(req.params.orderId);
  res.json({ position });
});

// Admin routes
app.get('/api/admin/analytics', (req, res) => {
  res.json({
    users: 1250,
    restaurants: 89,
    orders: { totalRevenue: 45000 },
    videos: 234,
    realtime: { activeOrders: 12, onlinePartners: 45 }
  });
});

// Notification routes
app.get('/api/notifications', (req, res) => {
  res.json({ notifications: [] });
});

app.post('/api/notifications/send', async (req, res) => {
  try {
    await notificationService.sendNotification(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
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

// Setup WebSocket
setupWebSocket(io);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Makubang Server running on port ${PORT}`);
  console.log(`📱 WebSocket server ready at ws://localhost:${PORT}/ws`);
  console.log(`🔔 Notifications service initialized`);
  console.log(`📍 Order tracking service active`);
});

export { notificationService, orderTrackingService };
export default app;

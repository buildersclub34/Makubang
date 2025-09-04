require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const orderRoutes = require('./routes/orderRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { router: websocketRoutes, initWebSocketService } = require('./routes/websocketRoutes');

// Configure Cloudinary
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Import services
const WebSocketService = require('./services/websocketService');

// Import middleware
const { errorHandler } = require('./middlewares/errorMiddleware');
const { protect } = require('./middlewares/authMiddleware');

// Initialize express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with enhanced configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000, // 30 seconds
  pingInterval: 25000, // 25 seconds
  maxHttpBufferSize: 1e8, // 100MB
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024, // Size threshold (in bytes) for compression
    concurrencyLimit: 10, // Maximum number of concurrent compression tasks
  },
});

// Initialize WebSocket Service
const webSocketService = new WebSocketService(httpServer);

// Set app locals for socket.io and webSocketService
app.set('io', io);
app.set('webSocketService', webSocketService);

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New WebSocket client connected:', socket.id);
  
  // Handle authentication
  socket.on('authenticate', async (token) => {
    try {
      // Verify token and get user
      const decoded = await require('./utils/jwt').verifyToken(token);
      if (decoded) {
        socket.userId = decoded.id;
        socket.join(`user_${decoded.id}`);
        console.log(`User ${decoded.id} authenticated`);
        
        // Send connection confirmation
        socket.emit('authenticated', { userId: decoded.id });
      }
    } catch (error) {
      console.error('Authentication error:', error.message);
      socket.emit('authentication_error', { message: 'Authentication failed' });
      socket.disconnect(true);
    }
  });

  // Handle room joining
  socket.on('join_room', (room) => {
    if (socket.userId) {
      socket.join(room);
      console.log(`User ${socket.userId} joined room: ${room}`);
    }
  });

  // Handle order subscription
  socket.on('subscribe_order', (orderId) => {
    if (socket.userId) {
      socket.join(`order_${orderId}`);
      console.log(`User ${socket.userId} subscribed to order ${orderId}`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} (${reason})`);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload middleware
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/orders', protect, orderRoutes);
app.use('/api/restaurants', protect, restaurantRoutes);
app.use('/api/creators', protect, creatorRoutes);
app.use('/api/admin', protect, adminRoutes);
app.use('/api/notifications', protect, notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ws', protect, websocketRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  
  // Initialize WebSocket service with the HTTP server
  initWebSocketService(httpServer);
  
  // Log server information
  console.log('\n=== Server Information ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
  console.log('=========================\n');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  httpServer.close(() => process.exit(1));
});

module.exports = app;

const express = require('express');
const { body } = require('express-validator');
const {
  getOrders,
  getOrder,
  updateOrderStatus,
  getOrderAnalytics,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const advancedResults = require('../middleware/advancedResults');

const router = express.Router({ mergeParams: true });

// Middleware to check if user has access to restaurant orders
const checkRestaurantAccess = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found',
      });
    }

    // Admin has full access
    if (req.user.role === 'admin') {
      req.restaurant = restaurant;
      return next();
    }

    // Check if user is the restaurant owner or staff
    if (restaurant.owner.toString() === req.user.id || 
        restaurant.staff.some(staff => staff.user.toString() === req.user.id)) {
      req.restaurant = restaurant;
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Not authorized to access orders for this restaurant',
    });
  } catch (error) {
    next(error);
  }
};

// Middleware to set up query for restaurant orders
const setupRestaurantQuery = (req, res, next) => {
  // Add restaurant filter to query params
  req.query.restaurant = req.params.restaurantId;
  
  // Set default sorting if not specified
  if (!req.query.sort) {
    req.query.sort = '-createdAt';
  }
  
  next();
};

// Routes for restaurant orders
router
  .route('/')
  .get(
    protect,
    authorize('restaurant', 'admin'),
    checkRestaurantAccess,
    setupRestaurantQuery,
    advancedResults(Order, {
      path: 'user',
      select: 'name email phone',
    }),
    getOrders
  );

router
  .route('/analytics')
  .get(
    protect,
    authorize('restaurant', 'admin'),
    checkRestaurantAccess,
    getOrderAnalytics
  );

router
  .route('/:id')
  .get(
    protect,
    authorize('restaurant', 'admin'),
    checkRestaurantAccess,
    getOrder
  );

router
  .route('/:id/status')
  .put(
    protect,
    authorize('restaurant', 'admin'),
    checkRestaurantAccess,
    [
      body('status', 'Status is required').notEmpty(),
      body('status').isIn([
        'confirmed',
        'preparing',
        'ready_for_pickup',
        'rejected',
      ]),
    ],
    updateOrderStatus
  );

// Route to get today's orders
router.get(
  '/today',
  protect,
  authorize('restaurant', 'admin'),
  checkRestaurantAccess,
  async (req, res, next) => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const orders = await Order.find({
        restaurant: req.restaurant._id,
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      })
        .populate('user', 'name')
        .sort('-createdAt');
        
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Route to get orders by status
router.get(
  '/status/:status',
  protect,
  authorize('restaurant', 'admin'),
  checkRestaurantAccess,
  async (req, res, next) => {
    try {
      const { status } = req.params;
      const validStatuses = [
        'pending',
        'confirmed',
        'preparing',
        'ready_for_pickup',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'rejected',
        'failed',
      ];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
        });
      }
      
      const orders = await Order.find({
        restaurant: req.restaurant._id,
        status,
      })
        .populate('user', 'name')
        .sort('-createdAt');
        
      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Route to get order statistics
router.get(
  '/stats/overview',
  protect,
  authorize('restaurant', 'admin'),
  checkRestaurantAccess,
  async (req, res, next) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const restaurantId = req.restaurant._id;
      
      // Get today's orders
      const todayOrders = await Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            createdAt: { $gte: startOfDay },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
      ]);

      // Get this week's orders
      const weekOrders = await Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            createdAt: { $gte: startOfWeek },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
      ]);

      // Get this month's orders
      const monthOrders = await Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            createdAt: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
      ]);

      // Get orders by status
      const ordersByStatus = await Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            createdAt: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            revenue: { $sum: '$total' },
          },
        },
      ]);

      // Get top selling dishes
      const topDishes = await Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            createdAt: { $gte: startOfMonth },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.dish',
            name: { $first: '$items.name' },
            count: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);

      // Format the response
      const stats = {
        today: {
          orders: todayOrders[0]?.count || 0,
          revenue: todayOrders[0]?.revenue || 0,
        },
        week: {
          orders: weekOrders[0]?.count || 0,
          revenue: weekOrders[0]?.revenue || 0,
        },
        month: {
          orders: monthOrders[0]?.count || 0,
          revenue: monthOrders[0]?.revenue || 0,
        },
        byStatus: {},
        topDishes,
      };

      // Format orders by status
      ordersByStatus.forEach(({ _id, count, revenue }) => {
        stats.byStatus[_id] = { count, revenue };
      });

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Route to get order trends (daily for the last 30 days)
router.get(
  '/stats/trends',
  protect,
  authorize('restaurant', 'admin'),
  checkRestaurantAccess,
  async (req, res, next) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const trends = await Order.aggregate([
        {
          $match: {
            restaurant: req.restaurant._id,
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      
      res.status(200).json({
        success: true,
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Route to get order metrics (for dashboard)
router.get(
  '/metrics',
  protect,
  authorize('restaurant', 'admin'),
  checkRestaurantAccess,
  async (req, res, next) => {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      
      const startOfYesterday = new Date(yesterday);
      startOfYesterday.setHours(0, 0, 0, 0);
      
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - today.getDay());
      startOfThisWeek.setHours(0, 0, 0, 0);
      
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const restaurantId = req.restaurant._id;
      
      // Get today's metrics
      const todayMetrics = await Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            createdAt: { $gte: startOfToday },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
          },
        },
      ]);
      
      // Get yesterday's metrics
      const yesterdayMetrics = await Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            createdAt: { 
              $gte: startOfYesterday,
              $lt: startOfToday,
            },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
          },
        },
      ]);
      
      // Get this week's metrics
      const thisWeekMetrics = await Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            createdAt: { $gte: startOfThisWeek },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
          },
        },
      ]);
      
      // Get last week's metrics
      const lastWeekMetrics = await Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            createdAt: { 
              $gte: startOfLastWeek,
              $lt: startOfThisWeek,
            },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
          },
        },
      ]);
      
      // Get this month's metrics
      const thisMonthMetrics = await Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            createdAt: { $gte: startOfThisMonth },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
          },
        },
      ]);
      
      // Get last month's metrics
      const lastMonthMetrics = await Order.aggregate([
        {
          $match: {
            restaurant: restaurantId,
            createdAt: { 
              $gte: startOfLastMonth,
              $lt: startOfThisMonth,
            },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
            averageOrderValue: { $avg: '$total' },
          },
        },
      ]);
      
      // Format the response
      const metrics = {
        today: {
          orders: todayMetrics[0]?.orders || 0,
          revenue: todayMetrics[0]?.revenue || 0,
          averageOrderValue: todayMetrics[0]?.averageOrderValue || 0,
        },
        yesterday: {
          orders: yesterdayMetrics[0]?.orders || 0,
          revenue: yesterdayMetrics[0]?.revenue || 0,
          averageOrderValue: yesterdayMetrics[0]?.averageOrderValue || 0,
        },
        thisWeek: {
          orders: thisWeekMetrics[0]?.orders || 0,
          revenue: thisWeekMetrics[0]?.revenue || 0,
          averageOrderValue: thisWeekMetrics[0]?.averageOrderValue || 0,
        },
        lastWeek: {
          orders: lastWeekMetrics[0]?.orders || 0,
          revenue: lastWeekMetrics[0]?.revenue || 0,
          averageOrderValue: lastWeekMetrics[0]?.averageOrderValue || 0,
        },
        thisMonth: {
          orders: thisMonthMetrics[0]?.orders || 0,
          revenue: thisMonthMetrics[0]?.revenue || 0,
          averageOrderValue: thisMonthMetrics[0]?.averageOrderValue || 0,
        },
        lastMonth: {
          orders: lastMonthMetrics[0]?.orders || 0,
          revenue: lastMonthMetrics[0]?.revenue || 0,
          averageOrderValue: lastMonthMetrics[0]?.averageOrderValue || 0,
        },
      };
      
      // Calculate percentage changes
      metrics.today.ordersChange = calculatePercentageChange(
        metrics.yesterday.orders,
        metrics.today.orders
      );
      
      metrics.today.revenueChange = calculatePercentageChange(
        metrics.yesterday.revenue,
        metrics.today.revenue
      );
      
      metrics.thisWeek.ordersChange = calculatePercentageChange(
        metrics.lastWeek.orders,
        metrics.thisWeek.orders
      );
      
      metrics.thisWeek.revenueChange = calculatePercentageChange(
        metrics.lastWeek.revenue,
        metrics.thisWeek.revenue
      );
      
      metrics.thisMonth.ordersChange = calculatePercentageChange(
        metrics.lastMonth.orders,
        metrics.thisMonth.orders
      );
      
      metrics.thisMonth.revenueChange = calculatePercentageChange(
        metrics.lastMonth.revenue,
        metrics.thisMonth.revenue
      );
      
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper function to calculate percentage change
function calculatePercentageChange(previous, current) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

module.exports = router;

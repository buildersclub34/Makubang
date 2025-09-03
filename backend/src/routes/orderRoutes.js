const express = require('express');
const { body } = require('express-validator');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderAnalytics,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// Middleware to check if user has access to order
const checkOrderAccess = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
      });
    }

    // Admin has full access
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user is the customer, restaurant owner, or delivery partner
    if (
      order.user.toString() === req.user.id ||
      order.restaurant.owner.toString() === req.user.id ||
      (order.deliveryPartner && order.deliveryPartner.toString() === req.user.id)
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Not authorized to access this order',
    });
  } catch (error) {
    next(error);
  }
};

// Validation middleware
const validateOrder = [
  body('restaurant', 'Restaurant ID is required').notEmpty(),
  body('items', 'At least one item is required').isArray({ min: 1 }),
  body('items.*.dish', 'Dish ID is required').notEmpty(),
  body('items.*.quantity', 'Quantity must be at least 1').isInt({ min: 1 }),
  body('deliveryType', 'Delivery type must be either delivery or pickup').isIn(['delivery', 'pickup']),
  body('payment.method', 'Payment method is required').notEmpty(),
  body('payment.method', 'Invalid payment method').isIn([
    'credit_card',
    'debit_card',
    'upi',
    'net_banking',
    'wallet',
    'cod',
  ]),
];

// Routes
router
  .route('/')
  .get(protect, getOrders)
  .post(
    protect,
    authorize('user', 'admin'),
    validateOrder,
    createOrder
  );

router
  .route('/analytics')
  .get(
    protect,
    authorize('restaurant', 'admin'),
    getOrderAnalytics
  );

router
  .route('/:id')
  .get(protect, checkOrderAccess, getOrder);

router
  .route('/:id/status')
  .put(
    protect,
    checkOrderAccess,
    [
      body('status', 'Status is required').notEmpty(),
      body('status').isIn([
        'pending',
        'confirmed',
        'preparing',
        'ready_for_pickup',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'rejected',
        'failed',
      ]),
    ],
    updateOrderStatus
  );

router
  .route('/:id/cancel')
  .put(
    protect,
    checkOrderAccess,
    [
      body('reason', 'Cancellation reason is required')
        .notEmpty()
        .isLength({ max: 500 }),
    ],
    cancelOrder
  );

// Nested routes for restaurant-specific orders
const restaurantOrderRouter = require('./restaurantOrderRoutes');
router.use('/restaurants/:restaurantId/orders', restaurantOrderRouter);

module.exports = router;

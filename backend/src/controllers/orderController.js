const Order = require('../models/Order');
const OrderStatus = require('../models/OrderStatus');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { calculateDistance } = require('../utils/geocoder');

// @desc    Create new order
// @route   POST /api/v1/orders
// @access  Private
const createOrder = asyncHandler(async (req, res, next) => {
  const {
    restaurant,
    items,
    deliveryType,
    deliveryAddress,
    payment,
    scheduledFor,
    specialInstructions,
    isGroupOrder,
    groupOrderCode,
  } = req.body;

  // 1) Validate restaurant
  const restaurantDoc = await Restaurant.findById(restaurant);
  if (!restaurantDoc) {
    return next(new ErrorResponse(`Restaurant not found with id of ${restaurant}`, 404));
  }

  // 2) Check if restaurant is open
  if (!restaurantDoc.isOpen) {
    return next(new ErrorResponse('Restaurant is currently closed', 400));
  }

  // 3) Validate items
  if (!items || items.length === 0) {
    return next(new ErrorResponse('Please add at least one item to the order', 400));
  }

  // 4) Calculate order total and validate items
  let subtotal = 0;
  const populatedItems = [];

  for (const item of items) {
    const dish = await Dish.findOne({
      _id: item.dish,
      restaurant: restaurant,
      isAvailable: true,
    }).select('+price');

    if (!dish) {
      return next(new ErrorResponse(`Dish not found or unavailable: ${item.dish}`, 404));
    }

    // Calculate item total
    let itemTotal = dish.price * item.quantity;

    // Add addons
    if (item.addons && item.addons.length > 0) {
      // Validate and calculate addons
    }

    // Add customizations
    if (item.customizations && item.customizations.length > 0) {
      // Validate and calculate customizations
    }

    subtotal += itemTotal;

    populatedItems.push({
      dish: dish._id,
      name: dish.name,
      quantity: item.quantity,
      price: dish.price,
      addons: item.addons || [],
      customizations: item.customizations || [],
      specialInstructions: item.specialInstructions,
      total: itemTotal,
    });
  }

  // 5) Calculate delivery fee
  let deliveryFee = 0;
  if (deliveryType === 'delivery') {
    // Calculate distance and delivery fee
    if (!deliveryAddress || !deliveryAddress.location) {
      return next(new ErrorResponse('Delivery address with location is required', 400));
    }

    const distance = calculateDistance(
      restaurant.location.coordinates,
      deliveryAddress.location.coordinates
    );

    // Simple delivery fee calculation (can be enhanced)
    deliveryFee = Math.max(restaurant.delivery.baseFee || 0, distance * 10); // 10 INR per km
    
    // Check if within delivery radius
    if (distance > (restaurant.delivery.deliveryRadius || 10)) { // Default 10km radius
      return next(new ErrorResponse('Delivery not available at this location', 400));
    }
  }

  // 6) Calculate taxes (simplified)
  const taxRate = 0.18; // 18% GST
  const tax = subtotal * taxRate;

  // 7) Platform fee (if any)
  const platformFee = restaurant.subscription.plan === 'free' ? 10 : 0; // Example fee

  // 8) Create order
  const order = await Order.create({
    user: req.user.id,
    restaurant: restaurant,
    items: populatedItems,
    subtotal,
    tax,
    deliveryFee,
    platformFee,
    total: subtotal + tax + deliveryFee + platformFee,
    deliveryType,
    deliveryAddress,
    payment: {
      method: payment.method,
      status: payment.method === 'cod' ? 'pending' : 'pending_authorization',
    },
    scheduledFor,
    isGroupOrder,
    groupOrder: isGroupOrder ? {
      code: groupOrderCode || `GO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      host: req.user.id,
      participants: [{
        user: req.user.id,
        status: 'confirmed',
      }],
    } : undefined,
  });

  // 9) Create initial status
  await OrderStatus.create({
    order: order._id,
    status: 'pending',
    changedBy: req.user.id,
    userType: 'customer',
    metadata: {
      message: 'Order placed successfully',
    },
  });

  // 10) Send notifications (implement notification service)
  // sendOrderConfirmation(order, req.user);
  // notifyRestaurant(order, restaurant);

  res.status(201).json({
    success: true,
    data: order,
  });
});

// @desc    Get all orders
// @route   GET /api/v1/orders
// @route   GET /api/v1/restaurants/:restaurantId/orders
// @access  Private
const getOrders = asyncHandler(async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  if (req.params.restaurantId) {
    // Get orders for specific restaurant
    query = Order.find({
      ...JSON.parse(queryStr),
      restaurant: req.params.restaurantId,
      isActive: true,
    });
  } else if (req.user.role === 'admin') {
    // Admin can see all orders
    query = Order.find(JSON.parse(queryStr));
  } else if (req.user.role === 'restaurant') {
    // Restaurant can see their own orders
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant) {
      return next(new ErrorResponse(`No restaurant found for user ${req.user.id}`, 404));
    }
    query = Order.find({
      ...JSON.parse(queryStr),
      restaurant: restaurant._id,
      isActive: true,
    });
  } else {
    // Regular users can only see their own orders
    query = Order.find({
      ...JSON.parse(queryStr),
      user: req.user.id,
      isActive: true,
    });
  }

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Order.countDocuments(query);

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const orders = await query
    .populate('user', 'name email')
    .populate('restaurant', 'name logo')
    .populate('deliveryPartner', 'name phone');

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({
    success: true,
    count: orders.length,
    pagination,
    data: orders,
  });
});

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
const getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('restaurant', 'name logo address phone')
    .populate('deliveryPartner', 'name phone')
    .populate('items.dish', 'name description image');

  if (!order) {
    return next(
      new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is order owner, restaurant owner, or admin
  if (
    order.user._id.toString() !== req.user.id &&
    order.restaurant.owner.toString() !== req.user.id &&
    req.user.role !== 'admin' &&
    order.deliveryPartner?._id.toString() !== req.user.id
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this order`,
        401
      )
    );
  }

  // Get order status history
  const statusHistory = await OrderStatus.find({ order: order._id })
    .sort('createdAt')
    .populate('changedBy', 'name role');

  res.status(200).json({
    success: true,
    data: {
      ...order.toObject(),
      statusHistory,
    },
  });
});

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
// @access  Private
const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status, reason } = req.body;
  
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(
      new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
    );
  }

  // Authorization
  const isRestaurantOwner = order.restaurant.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  const isDeliveryPartner = order.deliveryPartner?.toString() === req.user.id;
  const isCustomer = order.user.toString() === req.user.id;

  // Define allowed status transitions based on user role
  const allowedStatuses = {
    customer: ['cancelled'],
    restaurant: ['confirmed', 'preparing', 'ready_for_pickup', 'rejected'],
    delivery: ['out_for_delivery', 'delivered'],
    admin: ['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled', 'rejected', 'failed'],
  };

  // Check if user is authorized to update status
  if (
    !(
      (isCustomer && allowedStatuses.customer.includes(status)) ||
      (isRestaurantOwner && allowedStatuses.restaurant.includes(status)) ||
      (isDeliveryPartner && allowedStatuses.delivery.includes(status)) ||
      (isAdmin && allowedStatuses.admin.includes(status))
    )
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update status to ${status}`,
        401
      )
    );
  }

  // Create new status update
  const statusUpdate = await OrderStatus.create({
    order: order._id,
    status,
    changedBy: req.user.id,
    userType: isAdmin ? 'admin' : isRestaurantOwner ? 'restaurant' : isDeliveryPartner ? 'delivery' : 'customer',
    reason,
    metadata: req.body.metadata,
  });

  // Send notifications based on status change
  // await handleOrderStatusNotifications(order, status, req.user);

  res.status(200).json({
    success: true,
    data: statusUpdate,
  });
});

// @desc    Cancel order
// @route   PUT /api/v1/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(
      new ErrorResponse(`Order not found with id of ${req.params.id}`, 404)
    );
  }

  // Only customer, restaurant owner, or admin can cancel
  const isCustomer = order.user.toString() === req.user.id;
  const isRestaurantOwner = order.restaurant.owner.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isCustomer && !isRestaurantOwner && !isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to cancel this order`,
        401
      )
    );
  }

  // Update order status to cancelled
  await updateOrderStatus(
    { params: { id: order._id }, body: { status: 'cancelled', reason }, user: req.user },
    res,
    next
  );

  // Process refund if payment was made
  if (order.payment.status === 'captured' && order.payment.method !== 'cod') {
    // await processRefund(order, reason);
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get order analytics
// @route   GET /api/v1/orders/analytics
// @access  Private/Admin
const getOrderAnalytics = asyncHandler(async (req, res, next) => {
  // Basic date range setup (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  // Get restaurant ID if user is a restaurant owner
  let matchCriteria = {};
  if (req.user.role === 'restaurant') {
    const restaurant = await Restaurant.findOne({ owner: req.user.id });
    if (!restaurant) {
      return next(new ErrorResponse('No restaurant found for this user', 400));
    }
    matchCriteria.restaurant = restaurant._id;
  }

  // Add date range to match criteria
  matchCriteria.createdAt = {
    $gte: startDate,
    $lte: endDate,
  };

  // Get order counts by status
  const ordersByStatus = await Order.aggregate([
    { $match: matchCriteria },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
      },
    },
  ]);

  // Get daily order counts
  const dailyOrders = await Order.aggregate([
    { $match: matchCriteria },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get top selling dishes (for restaurant owners)
  let topDishes = [];
  if (req.user.role === 'restaurant' || req.user.role === 'admin') {
    topDishes = await Order.aggregate([
      { $match: matchCriteria },
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
  }

  res.status(200).json({
    success: true,
    data: {
      ordersByStatus,
      dailyOrders,
      topDishes,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    },
  });
});

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderAnalytics,
};

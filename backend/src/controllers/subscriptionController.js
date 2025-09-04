const Subscription = require('../models/Subscription');
const Restaurant = require('../models/Restaurant');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Get all subscriptions
// @route   GET /api/v1/subscriptions
// @access  Private/Admin
exports.getSubscriptions = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single subscription
// @route   GET /api/v1/subscriptions/:id
// @access  Private
exports.getSubscription = asyncHandler(async (req, res, next) => {
  const subscription = await Subscription.findById(req.params.id).populate('restaurant');

  if (!subscription) {
    return next(
      new ErrorResponse(`Subscription not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is subscription owner or admin
  if (subscription.restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to view this subscription`,
        401
      )
    );
  }

  res.status(200).json({
    success: true,
    data: subscription
  });
});

// @desc    Create new subscription
// @route   POST /api/v1/restaurants/:restaurantId/subscriptions
// @access  Private
exports.createSubscription = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.restaurant = req.params.restaurantId;
  
  // Check if restaurant exists and user is the owner
  const restaurant = await Restaurant.findById(req.params.restaurantId);
  
  if (!restaurant) {
    return next(
      new ErrorResponse(`No restaurant with the id of ${req.params.restaurantId}`, 404)
    );
  }
  
  // Make sure user is restaurant owner or admin
  if (restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to create a subscription for this restaurant`,
        401
      )
    );
  }
  
  // Check if restaurant already has an active subscription
  const existingSubscription = await Subscription.findOne({
    restaurant: req.params.restaurantId,
    status: 'active'
  });
  
  if (existingSubscription && !req.body.force) {
    return next(
      new ErrorResponse(
        `Restaurant already has an active subscription. Use force=true to override.`,
        400
      )
    );
  }

  // Get plan details
  const plan = req.body.plan || 'basic';
  const planFeatures = Subscription.getPlanFeatures(plan);
  
  // Calculate amount based on plan (in paise for INR)
  const planAmounts = {
    basic: 29900,    // ₹299
    premium: 99900,  // ₹999
    enterprise: 249900 // ₹2,499
  };
  
  const amount = planAmounts[plan] || 29900;
  
  // Create order in Razorpay
  const order = await razorpay.orders.create({
    amount: amount,
    currency: 'INR',
    receipt: `sub_${Date.now()}`,
    payment_capture: 1,
    notes: {
      restaurantId: restaurant._id.toString(),
      userId: req.user._id.toString(),
      plan: plan,
      type: 'subscription'
    }
  });

  // Create subscription in database (initially pending)
  const subscriptionData = {
    restaurant: restaurant._id,
    plan: plan,
    status: 'pending',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    paymentMethod: 'razorpay',
    orderId: order.id,
    features: planFeatures,
    amount: amount / 100 // Convert back to rupees
  };

  const newSubscription = await Subscription.create(subscriptionData);

  res.status(201).json({
    success: true,
    data: {
      subscription: newSubscription,
      order: order,
      key: process.env.RAZORPAY_KEY_ID
    }
  });
});

// @desc    Update subscription
// @route   PUT /api/v1/subscriptions/:id
// @access  Private
exports.updateSubscription = asyncHandler(async (req, res, next) => {
  let subscription = await Subscription.findById(req.params.id).populate('restaurant');

  if (!subscription) {
    return next(
      new ErrorResponse(`No subscription with the id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is subscription owner or admin
  if (subscription.restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this subscription`,
        401
      )
    );
  }

  // Handle plan changes
  if (req.body.plan && req.body.plan !== subscription.plan) {
    // For Razorpay, we'll create a new order for the plan change
    const planAmounts = {
      basic: 29900,
      premium: 99900,
      enterprise: 249900
    };
    
    const amount = planAmounts[req.body.plan] || 29900;
    
    // Create a new order for the plan change
    const order = await razorpay.orders.create({
      amount: amount,
      currency: 'INR',
      receipt: `planchange_${Date.now()}`,
      payment_capture: 1,
      notes: {
        subscriptionId: subscription._id.toString(),
        plan: req.body.plan,
        type: 'plan_change'
      }
    });
    
    return res.status(200).json({
      success: true,
      data: {
        subscription: subscription,
        order: order,
        key: process.env.RAZORPAY_KEY_ID,
        isPlanChange: true
      }
    });
  }
  
  // Handle cancellation
  if (req.body.cancelAtPeriodEnd !== undefined) {
    const updatedSubscription = await stripe.subscriptions.update(subscription.subscriptionId, {
      cancel_at_period_end: req.body.cancelAtPeriodEnd,
    });
    
    subscription.cancelAtPeriodEnd = updatedSubscription.cancel_at_period_end;
    
    if (updatedSubscription.cancel_at_period_end) {
      subscription.status = 'canceled';
    } else {
      subscription.status = 'active';
    }
  }
  
  // Save changes to database
  const updatedSub = await subscription.save();
  
  res.status(200).json({
    success: true,
    data: updatedSub
  });
});

// @desc    Cancel subscription
// @route   DELETE /api/v1/subscriptions/:id
// @access  Private
exports.cancelSubscription = asyncHandler(async (req, res, next) => {
  const subscription = await Subscription.findById(req.params.id).populate('restaurant');

  if (!subscription) {
    return next(
      new ErrorResponse(`No subscription with the id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is subscription owner or admin
  if (subscription.restaurant.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to cancel this subscription`,
        401
      )
    );
  }

  // For Razorpay, we'll mark the subscription as canceled
  // No need to cancel in Razorpay as we're using one-time payments
  subscription.status = 'canceled';
  subscription.cancelAtPeriodEnd = true;
  await subscription.save();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get current user's subscription
// @route   GET /api/v1/subscriptions/me
// @access  Private
exports.getMySubscription = asyncHandler(async (req, res, next) => {
  // Find all restaurants owned by the user
  const restaurants = await Restaurant.find({ owner: req.user.id });
  
  if (restaurants.length === 0) {
    return next(
      new ErrorResponse('No restaurants found for this user', 404)
    );
  }
  
  // Get subscription for the first restaurant (assuming one restaurant per user for now)
  const subscription = await Subscription.findOne({
    restaurant: restaurants[0]._id
  }).populate('restaurant');
  
  if (!subscription) {
    return next(
      new ErrorResponse('No subscription found for this user', 404)
    );
  }
  
  res.status(200).json({
    success: true,
    data: subscription
  });
});

// @desc    Verify Razorpay payment and update subscription
// @route   POST /api/v1/subscriptions/verify-payment
// @access  Private
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const { order_id, payment_id, signature } = req.body;
  
  if (!order_id || !payment_id || !signature) {
    return next(new ErrorResponse('Missing required payment details', 400));
  }

  // Verify the payment signature
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  if (generatedSignature !== signature) {
    return next(new ErrorResponse('Invalid payment signature', 400));
  }

  // Get the order details from Razorpay
  const order = await razorpay.orders.fetch(order_id);
  
  // Find or create subscription based on order notes
  if (order.notes?.type === 'subscription') {
    // This is a new subscription
    const subscription = await Subscription.findOne({ orderId: order_id });
    
    if (!subscription) {
      return next(new ErrorResponse('Subscription not found', 404));
    }
    
    // Update subscription status
    subscription.status = 'active';
    subscription.paymentId = payment_id;
    subscription.paymentStatus = 'captured';
    await subscription.save();
    
    // Update restaurant subscription status if needed
    const restaurant = await Restaurant.findById(subscription.restaurant);
    if (restaurant) {
      restaurant.hasActiveSubscription = true;
      await restaurant.save();
    }
    
    return res.status(200).json({
      success: true,
      data: subscription
    });
  } else if (order.notes?.type === 'plan_change') {
    // This is a plan change
    const subscription = await Subscription.findById(order.notes.subscriptionId);
    
    if (!subscription) {
      return next(new ErrorResponse('Subscription not found', 404));
    }
    
    // Update subscription with new plan
    const planFeatures = Subscription.getPlanFeatures(order.notes.plan);
    subscription.plan = order.notes.plan;
    subscription.features = planFeatures;
    subscription.paymentId = payment_id;
    subscription.paymentStatus = 'captured';
    
    // Extend subscription period
    const newEndDate = new Date();
    newEndDate.setMonth(newEndDate.getMonth() + 1); // Add 1 month
    subscription.currentPeriodEnd = newEndDate;
    
    await subscription.save();
    
    return res.status(200).json({
      success: true,
      data: subscription
    });
  }
  
  return next(new ErrorResponse('Invalid order type', 400));
});

// Helper function to handle subscription updates
const handleSubscriptionUpdated = async (subscription) => {
  const sub = await Subscription.findOne({ subscriptionId: subscription.id });
  
  if (sub) {
    sub.status = subscription.status;
    sub.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    sub.cancelAtPeriodEnd = subscription.cancel_at_period_end;
    
    if (subscription.cancel_at_period_end) {
      sub.status = 'canceled';
    }
    
    await sub.save();
  }
};

// Helper function to handle subscription deletion
const handleSubscriptionDeleted = async (subscription) => {
  const sub = await Subscription.findOne({ subscriptionId: subscription.id });
  
  if (sub) {
    sub.status = 'canceled';
    sub.cancelAtPeriodEnd = true;
    await sub.save();
  }
};

// Helper function to handle successful payments
const handleInvoicePaid = async (invoice) => {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const sub = await Subscription.findOne({ subscriptionId: subscription.id });
  
  if (sub) {
    sub.status = 'active';
    sub.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    await sub.save();
  }
};

// Helper function to handle failed payments
const handleInvoiceFailed = async (invoice) => {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const sub = await Subscription.findOne({ subscriptionId: subscription.id });
  
  if (sub) {
    sub.status = 'past_due';
    await sub.save();
  }
};

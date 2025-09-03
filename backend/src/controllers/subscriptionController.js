const Subscription = require('../models/Subscription');
const Restaurant = require('../models/Restaurant');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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

  // Create Stripe customer if not exists
  let customer;
  if (!restaurant.stripeCustomerId) {
    customer = await stripe.customers.create({
      email: req.user.email,
      name: restaurant.name,
      metadata: {
        restaurantId: restaurant._id.toString(),
        userId: req.user._id.toString()
      }
    });
    
    // Save Stripe customer ID to restaurant
    restaurant.stripeCustomerId = customer.id;
    await restaurant.save();
  } else {
    customer = { id: restaurant.stripeCustomerId };
  }

  // Get plan details
  const plan = req.body.plan || 'basic';
  const planFeatures = Subscription.getPlanFeatures(plan);
  
  // Create subscription in Stripe
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env[`STRIPE_${plan.toUpperCase()}_PRICE_ID`] }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      restaurantId: restaurant._id.toString(),
      plan: plan
    }
  });

  // Create subscription in database
  const subscriptionData = {
    restaurant: restaurant._id,
    plan: plan,
    status: 'active',
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    paymentMethod: subscription.default_payment_method || subscription.pending_setup_intent,
    subscriptionId: subscription.id,
    features: planFeatures
  };

  const newSubscription = await Subscription.create(subscriptionData);

  res.status(201).json({
    success: true,
    data: {
      subscription: newSubscription,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
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
    // Update subscription in Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscriptionId);
    
    // Get the price ID for the new plan
    const priceId = process.env[`STRIPE_${req.body.plan.toUpperCase()}_PRICE_ID`];
    
    // Update subscription with the new plan
    const updatedSubscription = await stripe.subscriptions.update(subscription.subscriptionId, {
      items: [{
        id: stripeSubscription.items.data[0].id,
        price: priceId,
      }],
      proration_behavior: 'create_prorations',
      payment_behavior: 'pending_if_incomplete',
    });
    
    // Update subscription in database
    const planFeatures = Subscription.getPlanFeatures(req.body.plan);
    subscription.plan = req.body.plan;
    subscription.features = planFeatures;
    subscription.currentPeriodEnd = new Date(updatedSubscription.current_period_end * 1000);
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

  // Cancel subscription in Stripe
  await stripe.subscriptions.del(subscription.subscriptionId);
  
  // Update subscription in database
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

// @desc    Webhook handler for Stripe events
// @route   POST /api/v1/subscriptions/webhook
// @access  Public
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.updated':
      const subscriptionUpdated = event.data.object;
      await handleSubscriptionUpdated(subscriptionUpdated);
      break;
    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object;
      await handleSubscriptionDeleted(subscriptionDeleted);
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      await handleInvoicePaid(invoice);
      break;
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      await handleInvoiceFailed(failedInvoice);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
};

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

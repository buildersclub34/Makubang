const express = require('express');
const router = express.Router();
const {
  getSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  getMySubscription,
  verifyPayment
} = require('../controllers/subscriptionController');

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const Subscription = require('../models/Subscription');

// Payment verification endpoint
router.post('/verify-payment', protect, verifyPayment);

// Regular routes
router
  .route('/')
  .get(
    protect,
    authorize('admin'),
    advancedResults(Subscription, [
      { path: 'restaurant', select: 'name address' }
    ]),
    getSubscriptions
  );

// Get current user's subscription
router.get('/me', protect, getMySubscription);

// Get single subscription by ID
router.get('/:id', protect, getSubscription);

// Create subscription for a restaurant
router.post(
  '/restaurants/:restaurantId/subscriptions',
  protect,
  authorize('restaurant_owner', 'admin'),
  createSubscription
);

// Update subscription
router.put('/:id', protect, updateSubscription);

// Cancel subscription
router.delete('/:id', protect, cancelSubscription);

module.exports = router;

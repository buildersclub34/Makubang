const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
exports.createOrder = asyncHandler(async (req, res, next) => {
  const { amount, currency = 'INR', receipt, notes } = req.body;

  // Validate amount
  if (!amount || isNaN(amount) || amount < 100) {
    return next(new ErrorResponse('Invalid amount. Minimum amount is ₹1 (100 paise)', 400));
  }

  // Convert amount to paise if needed
  const amountInPaise = Math.round(amount);

  try {
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: receipt || `order_${Date.now()}`,
      notes,
      payment_capture: 1, // Auto capture payment
    });

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return next(new ErrorResponse('Error creating payment order', 500));
  }
});

// @desc    Verify payment and update order
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const { order_id, payment_id, signature, orderId } = req.body;

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

  try {
    // Update the order status in the database
    const order = await Order.findById(orderId);
    
    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Update order status and payment details
    order.paymentStatus = 'paid';
    order.paymentDetails = {
      paymentId: payment_id,
      orderId: order_id,
      method: 'razorpay',
      amount: order.totalAmount,
      currency: 'INR',
      status: 'captured',
      timestamp: new Date(),
    };

    // If this is a subscription payment, update the restaurant's subscription
    if (order.type === 'subscription') {
      const restaurant = await Restaurant.findById(order.restaurant);
      if (restaurant) {
        restaurant.subscriptionStatus = 'active';
        restaurant.subscriptionEndDate = new Date(
          new Date().setMonth(new Date().getMonth() + 1)
        );
        await restaurant.save();
      }
    }

    await order.save();

    // TODO: Trigger order confirmation email
    // TODO: Notify restaurant about the new order
    // TODO: Trigger delivery assignment

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        order: order,
        payment: order.paymentDetails,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return next(new ErrorResponse('Error verifying payment', 500));
  }
});

// @desc    Get payment details by order ID
// @route   GET /api/payments/order/:orderId
// @access  Private
exports.getPaymentByOrderId = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({
    _id: req.params.orderId,
    user: req.user.id,
  }).select('paymentDetails status totalAmount');

  if (!order) {
    return next(
      new ErrorResponse(
        `No order found with id ${req.params.orderId}`,
        404
      )
    );
  }

  res.status(200).json({
    success: true,
    data: {
      payment: order.paymentDetails,
      status: order.status,
      amount: order.totalAmount,
    },
  });
});

// @desc    Refund a payment
// @route   POST /api/payments/refund/:paymentId
// @access  Private/Admin
exports.refundPayment = asyncHandler(async (req, res, next) => {
  const { paymentId } = req.params;
  const { amount, speed = 'normal', notes } = req.body;

  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to paise if amount is provided
      speed,
      notes: notes || {
        reason: 'Refund initiated by admin',
        initiated_by: req.user.id,
      },
    });

    // Update order status in the database
    await Order.updateOne(
      { 'paymentDetails.paymentId': paymentId },
      {
        $set: {
          status: 'refunded',
          'paymentDetails.refund': refund,
          updatedAt: new Date(),
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: refund,
    });
  } catch (error) {
    console.error('Refund error:', error);
    return next(
      new ErrorResponse(
        error.error?.description || 'Error processing refund',
        error.statusCode || 500
      )
    );
  }
});

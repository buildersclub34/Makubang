import { Router } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validate-request';
import { authenticate, authorize } from '../middleware/auth';
import * as paymentController from '../controllers/payment.controller';

export const paymentRouter = Router();

// Create payment intent for an order
paymentRouter.post(
  '/create-payment-intent',
  authenticate,
  [
    body('orderId').isUUID().withMessage('Valid order ID is required'),
    body('amount').isNumeric().withMessage('Valid amount is required'),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }),
  ],
  validateRequest,
  paymentController.createPaymentIntent
);

// Verify payment and confirm order
paymentRouter.post(
  '/verify-payment',
  authenticate,
  [
    body('paymentId').isString().notEmpty().withMessage('Payment ID is required'),
    body('orderId').isUUID().withMessage('Valid order ID is required'),
    body('paymentMethod').isString().notEmpty().withMessage('Payment method is required'),
    body('paymentResponse').isObject().withMessage('Payment response is required'),
  ],
  validateRequest,
  paymentController.verifyPayment
);

// Handle payment webhook
paymentRouter.post(
  '/webhook/razorpay',
  // Note: No authentication here as this is called by Razorpay
  paymentController.handleRazorpayWebhook
);

// Get payment details
paymentRouter.get(
  '/:paymentId',
  authenticate,
  [
    param('paymentId').isUUID().withMessage('Valid payment ID is required'),
  ],
  validateRequest,
  paymentController.getPaymentDetails
);

// Get user's payment history
paymentRouter.get(
  '/user/payments',
  authenticate,
  [
    // Optional query params
    // page, limit, status, etc.
  ],
  paymentController.getUserPayments
);

// Request refund for an order
paymentRouter.post(
  '/:orderId/refund',
  authenticate,
  [
    param('orderId').isUUID().withMessage('Valid order ID is required'),
    body('reason').optional().isString(),
    body('amount').optional().isNumeric(),
  ],
  validateRequest,
  paymentController.requestRefund
);

export default paymentRouter;

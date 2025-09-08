import { Request, Response } from 'express';
import { razorpayService } from '../services/razorpay.service.js';

class PaymentController {
  // Create a test payment order
  async createTestOrder(req: Request, res: Response) {
    try {
      // Test amount (100 INR for testing)
      const amount = 100;
      const order = await razorpayService.createOrder(amount);
      
      res.status(200).json({
        success: true,
        message: 'Test order created successfully',
        order
      });
    } catch (error) {
      console.error('Error creating test order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create test order',
        error: error.message
      });
    }
  }

  // Verify payment webhook
  async verifyWebhook(req: Request, res: Response) {
    try {
      const { order_id, payment_id, razorpay_signature } = req.body;
      
      if (!order_id || !payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }

      const isValid = razorpayService.verifyPayment(
        order_id,
        payment_id,
        razorpay_signature
      );

      if (isValid) {
        // Payment is valid, process the order
        console.log('Payment verified successfully');
        return res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          paymentId: payment_id,
          orderId: order_id
        });
      } else {
        // Payment verification failed
        console.error('Payment verification failed');
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature'
        });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifying payment',
        error: error.message
      });
    }
  }
}

export const paymentController = new PaymentController();

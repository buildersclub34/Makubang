import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getDB } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
import { subscriptionEnforcement } from '../services/subscription-enforcement.service';

// Use dummy keys for development
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_dummy_secret',
});

export class RazorpayCheckoutController {
  // Create order and Razorpay order
  async createOrder(req: Request, res: Response) {
    try {
      const { restaurantId, items, deliveryAddress, paymentMethod = 'online' } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check subscription quota
      const quota = await subscriptionEnforcement.checkOrderQuota(restaurantId);
      if (!quota.allowed) {
        return res.status(403).json({ 
          error: 'Order limit exceeded', 
          plan: quota.plan,
          remaining: quota.remaining 
        });
      }

      const db = getDB();

      // Calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const menuItem = await db.collection('menu_items').findOne({ 
          _id: new ObjectId(item.menuItemId) 
        });
        
        if (!menuItem) {
          return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
        }

        const itemTotal = menuItem.price * item.quantity;
        subtotal += itemTotal;
        
        orderItems.push({
          menuItemId: item.menuItemId,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity,
          total: itemTotal
        });
      }

      // Calculate fees and taxes
      const deliveryFee = 40;
      const platformFee = subtotal * 0.05; // 5%
      const gstRate = 0.18; // 18%
      const taxableAmount = subtotal + platformFee;
      const gstAmount = taxableAmount * gstRate;
      const totalAmount = subtotal + deliveryFee + platformFee + gstAmount;

      // Create order in database
      const order = {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        restaurantId: new ObjectId(restaurantId),
        items: orderItems,
        subtotal,
        deliveryFee,
        platformFee,
        gstAmount,
        totalAmount,
        deliveryAddress,
        paymentMethod,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('orders').insertOne(order);

      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // Convert to paise
        currency: 'INR',
        receipt: order._id.toString(),
        notes: {
          orderId: order._id.toString(),
          userId,
          restaurantId
        }
      });

      // Update order with Razorpay order ID
      await db.collection('orders').updateOne(
        { _id: order._id },
        { 
          $set: { 
            razorpayOrderId: razorpayOrder.id,
            updatedAt: new Date()
          } 
        }
      );

      res.json({
        orderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        amount: totalAmount,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID,
        order: {
          ...order,
          razorpayOrderId: razorpayOrder.id
        }
      });

    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  }

  // Verify payment and confirm order
  async verifyPayment(req: Request, res: Response) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      // Verify signature
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }

      const db = getDB();

      // Get order
      const order = await db.collection('orders').findOne({
        razorpayOrderId: razorpay_order_id
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Update order status
      await db.collection('orders').updateOne(
        { _id: order._id },
        {
          $set: {
            status: 'confirmed',
            paymentStatus: 'completed',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            paidAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      // Consume subscription quota
      await subscriptionEnforcement.consumeOrderQuota(order.restaurantId.toString());

      // Generate GST invoice
      await this.generateGSTInvoice(order._id.toString());

      res.json({ 
        success: true, 
        orderId: order._id,
        message: 'Payment verified and order confirmed' 
      });

    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({ error: 'Payment verification failed' });
    }
  }

  // Webhook endpoint for Razorpay
  async webhook(req: Request, res: Response) {
    try {
      const webhookSignature = req.headers['x-razorpay-signature'] as string;
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
      
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (webhookSignature !== expectedSignature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }

      const { event, payload } = req.body;

      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload.payment.entity);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(payload.payment.entity);
          break;
        case 'order.paid':
          await this.handleOrderPaid(payload.order.entity);
          break;
      }

      res.json({ status: 'ok' });

    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  private async handlePaymentCaptured(payment: any) {
    const db = getDB();
    
    await db.collection('orders').updateOne(
      { razorpayOrderId: payment.order_id },
      {
        $set: {
          paymentStatus: 'captured',
          updatedAt: new Date()
        }
      }
    );
  }

  private async handlePaymentFailed(payment: any) {
    const db = getDB();
    
    await db.collection('orders').updateOne(
      { razorpayOrderId: payment.order_id },
      {
        $set: {
          status: 'failed',
          paymentStatus: 'failed',
          updatedAt: new Date()
        }
      }
    );
  }

  private async handleOrderPaid(order: any) {
    const db = getDB();
    
    await db.collection('orders').updateOne(
      { razorpayOrderId: order.id },
      {
        $set: {
          status: 'confirmed',
          paymentStatus: 'completed',
          updatedAt: new Date()
        }
      }
    );
  }

  private async generateGSTInvoice(orderId: string) {
    const db = getDB();
    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) });
    
    if (!order) return;

    const invoice = {
      _id: new ObjectId(),
      orderId: order._id,
      invoiceNumber: `INV-${Date.now()}`,
      gstNumber: process.env.COMPANY_GST_NUMBER || 'XXXXXXXXXXXXXXXXX',
      subtotal: order.subtotal,
      gstAmount: order.gstAmount,
      totalAmount: order.totalAmount,
      createdAt: new Date()
    };

    await db.collection('gst_invoices').insertOne(invoice);
  }

  // Get downloadable invoice
  async getInvoice(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const db = getDB();

      const invoice = await db.collection('gst_invoices').findOne({
        orderId: new ObjectId(orderId)
      });

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Return invoice data (you can generate PDF here)
      res.json(invoice);

    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json({ error: 'Failed to get invoice' });
    }
  }
}

export const razorpayCheckoutController = new RazorpayCheckoutController();

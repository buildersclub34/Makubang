import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { getDB } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
import { sendOrderUpdate } from '../websocket';

const router = Router();

// Restaurant/admin triggers assignment or re-assignment
router.post('/orders/:orderId/assign', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDB();
    const orderId = req.params.orderId;
    const preferredPartnerId = req.body?.partnerId as string | undefined;

    // Update order to mark as awaiting assignment
    await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      { $set: { status: 'assigned_to_delivery', updatedAt: new Date(), preferredPartnerId: preferredPartnerId || null } }
    );

    // Broadcast update
    sendOrderUpdate((req.app as any).locals?.io || ({} as any), orderId, {
      status: 'assigned_to_delivery',
      partnerId: preferredPartnerId || null,
    });

    res.json({ success: true });
  } catch (e) {
    console.error('delivery assign error', e);
    res.status(500).json({ error: 'Failed to assign delivery' });
  }
});

// Delivery partner updates location
router.post('/orders/:orderId/location', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const orderId = req.params.orderId;
    const { lat, lng } = req.body || {};
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat/lng required' });
    }
    // Emit via WebSocket rooms
    const io = (req.app as any).locals?.io;
    if (io) {
      io.to(`order:${orderId}`).emit('delivery_location', { orderId, lat, lng, timestamp: new Date() });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('delivery location error', e);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

export default router;



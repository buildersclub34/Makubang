import { Router } from 'express';
import { authenticate, AuthenticatedRequest, authorize } from '../middleware/auth.middleware';
import { getDB } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

const router = Router();

router.use(authenticate);

// Restaurant dashboard summary
router.get('/restaurant/summary', authorize(['restaurant', 'admin']) as any, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDB();
    const ownerId = new ObjectId(req.user!.id);
    const restaurant = await db.collection('restaurants').findOne({ ownerId });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const restaurantId = restaurant._id;

    const [orders, videos, subscription] = await Promise.all([
      db.collection('orders').aggregate([
        { $match: { restaurantId } },
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
      ]).toArray(),
      db.collection('videos').aggregate([
        { $match: { restaurantId } },
        { $group: { _id: null, views: { $sum: '$viewsCount' }, likes: { $sum: '$likesCount' } } },
      ]).toArray(),
      db.collection('restaurant_subscriptions').findOne({ restaurantId }),
    ]);

    res.json({ orders, engagement: videos?.[0] || { views: 0, likes: 0 }, subscription });
  } catch (e) {
    console.error('restaurant summary error', e);
    res.status(500).json({ error: 'Failed to load restaurant summary' });
  }
});

// Influencer dashboard summary
router.get('/influencer/summary', authorize(['influencer', 'admin']) as any, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDB();
    const creatorId = new ObjectId(req.user!.id);

    const [videosAgg, commissionsAgg] = await Promise.all([
      db.collection('videos').aggregate([
        { $match: { ownerId: creatorId } },
        { $group: { _id: null, views: { $sum: '$viewsCount' }, likes: { $sum: '$likesCount' }, comments: { $sum: '$commentsCount' } } },
      ]).toArray(),
      db.collection('orders').aggregate([
        { $match: { influencerId: creatorId, status: { $in: ['confirmed', 'delivered'] } } },
        { $group: { _id: null, commissions: { $sum: '$influencerCommission' } } },
      ]).toArray(),
    ]);

    res.json({ engagement: videosAgg?.[0] || { views: 0, likes: 0, comments: 0 }, earnings: commissionsAgg?.[0]?.commissions || 0 });
  } catch (e) {
    console.error('influencer summary error', e);
    res.status(500).json({ error: 'Failed to load influencer summary' });
  }
});

// Admin dashboard summary
router.get('/admin/summary', authorize(['admin']) as any, async (_req, res) => {
  try {
    const db = getDB();
    const [users, restaurants, orders, videos] = await Promise.all([
      db.collection('users').estimatedDocumentCount(),
      db.collection('restaurants').estimatedDocumentCount(),
      db.collection('orders').aggregate([{ $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' } } }]).toArray(),
      db.collection('videos').estimatedDocumentCount(),
    ]);
    res.json({ users, restaurants, orders: orders?.[0] || { count: 0, revenue: 0 }, videos });
  } catch (e) {
    console.error('admin summary error', e);
    res.status(500).json({ error: 'Failed to load admin summary' });
  }
});

export default router;



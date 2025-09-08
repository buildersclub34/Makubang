import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { getDB } from '../lib/mongodb';

const router = Router();

router.use(authenticate);

// Personalized feed: recent videos from followed users/restaurants + trending
router.get('/personalized', async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDB();
    const userId = req.user!.id;
    const follows = await db
      .collection('follows')
      .find({ followerId: new (require('mongodb').ObjectId)(userId) })
      .project({ followingId: 1 })
      .toArray();
    const followedIds = follows.map((f: any) => f.followingId);

    const videos = await db
      .collection('videos')
      .find({ ownerId: { $in: followedIds }, isPublic: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    res.json({ items: videos });
  } catch (error: any) {
    console.error('feed personalized error', error);
    res.status(500).json({ error: 'Failed to load personalized feed' });
  }
});

// Explore: random/trending nearby
router.get('/explore', async (_req, res) => {
  try {
    const db = getDB();
    const videos = await db
      .collection('videos')
      .aggregate([
        { $match: { isPublic: true } },
        { $sample: { size: 50 } },
      ])
      .toArray();
    res.json({ items: videos });
  } catch (error: any) {
    console.error('feed explore error', error);
    res.status(500).json({ error: 'Failed to load explore feed' });
  }
});

// Trending: sort by engagement in recent window
router.get('/trending', async (_req, res) => {
  try {
    const db = getDB();
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const videos = await db
      .collection('videos')
      .find({ isPublic: true, createdAt: { $gte: since } })
      .sort({ engagementScore: -1, createdAt: -1 })
      .limit(50)
      .toArray();
    res.json({ items: videos });
  } catch (error: any) {
    console.error('feed trending error', error);
    res.status(500).json({ error: 'Failed to load trending feed' });
  }
});

export default router;



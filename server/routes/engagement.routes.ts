import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { getDB } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

const router = Router();

router.use(authenticate);

router.post('/videos/:videoId/like', async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user!.id);
    const videoId = new ObjectId(req.params.videoId);

    await db.collection('video_likes').updateOne(
      { userId, videoId },
      { $setOnInsert: { userId, videoId, createdAt: new Date() } },
      { upsert: true }
    );
    await db.collection('videos').updateOne(
      { _id: videoId },
      { $inc: { likesCount: 1 }, $set: { updatedAt: new Date() } }
    );
    res.json({ success: true });
  } catch (e) {
    console.error('like error', e);
    res.status(500).json({ error: 'Failed to like video' });
  }
});

router.delete('/videos/:videoId/like', async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user!.id);
    const videoId = new ObjectId(req.params.videoId);

    const result = await db.collection('video_likes').deleteOne({ userId, videoId });
    if (result.deletedCount) {
      await db.collection('videos').updateOne(
        { _id: videoId },
        { $inc: { likesCount: -1 }, $set: { updatedAt: new Date() } }
      );
    }
    res.json({ success: true });
  } catch (e) {
    console.error('unlike error', e);
    res.status(500).json({ error: 'Failed to unlike video' });
  }
});

router.post('/videos/:videoId/comments', async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDB();
    const userId = new ObjectId(req.user!.id);
    const videoId = new ObjectId(req.params.videoId);
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text required' });
    }
    const doc = {
      userId,
      videoId,
      text: text.trim(),
      createdAt: new Date(),
    };
    await db.collection('video_comments').insertOne(doc as any);
    await db.collection('videos').updateOne(
      { _id: videoId },
      { $inc: { commentsCount: 1 }, $set: { updatedAt: new Date() } }
    );
    res.json({ success: true });
  } catch (e) {
    console.error('comment error', e);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.get('/videos/:videoId/comments', async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDB();
    const videoId = new ObjectId(req.params.videoId);
    const items = await db
      .collection('video_comments')
      .find({ videoId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    res.json({ items });
  } catch (e) {
    console.error('get comments error', e);
    res.status(500).json({ error: 'Failed to load comments' });
  }
});

export default router;



import type { Request, Response, NextFunction } from 'express';
import { getDB } from '../lib/mongodb';
import { ObjectId } from 'mongodb';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

type FollowDoc = {
  _id?: ObjectId;
  followerId: ObjectId;
  followingId: ObjectId;
  createdAt: Date;
};

export class SocialController {
  async follow(req: AuthenticatedRequest, res: Response, _next: NextFunction) {
    try {
      const db = getDB();
      const authUserId = req.user?.id;
      const targetUserId = req.params.userId;

      if (!authUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (!targetUserId) {
        return res.status(400).json({ error: 'Missing target userId' });
      }
      if (authUserId === targetUserId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
      }

      const followerObjId = new ObjectId(authUserId);
      const followingObjId = new ObjectId(targetUserId);

      const collection = db.collection<FollowDoc>('follows');

      const existing = await collection.findOne({
        followerId: followerObjId,
        followingId: followingObjId,
      });
      if (existing) {
        return res.status(200).json({ success: true, followed: true });
      }

      await collection.insertOne({
        followerId: followerObjId,
        followingId: followingObjId,
        createdAt: new Date(),
      });

      // Optionally increment counters in users collection if present
      try {
        await db.collection('users').updateOne(
          { _id: followingObjId },
          { $inc: { followersCount: 1 } },
        );
        await db.collection('users').updateOne(
          { _id: followerObjId },
          { $inc: { followingCount: 1 } },
        );
      } catch (_) {}

      return res.status(200).json({ success: true, followed: true });
    } catch (error) {
      console.error('Follow error', error);
      return res.status(500).json({ error: 'Failed to follow user' });
    }
  }

  async unfollow(req: AuthenticatedRequest, res: Response, _next: NextFunction) {
    try {
      const db = getDB();
      const authUserId = req.user?.id;
      const targetUserId = req.params.userId;

      if (!authUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      if (!targetUserId) {
        return res.status(400).json({ error: 'Missing target userId' });
      }
      if (authUserId === targetUserId) {
        return res.status(400).json({ error: 'Cannot unfollow yourself' });
      }

      const followerObjId = new ObjectId(authUserId);
      const followingObjId = new ObjectId(targetUserId);

      const collection = db.collection<FollowDoc>('follows');
      const result = await collection.deleteOne({
        followerId: followerObjId,
        followingId: followingObjId,
      });

      if (result.deletedCount) {
        try {
          await db.collection('users').updateOne(
            { _id: followingObjId },
            { $inc: { followersCount: -1 } },
          );
          await db.collection('users').updateOne(
            { _id: followerObjId },
            { $inc: { followingCount: -1 } },
          );
        } catch (_) {}
      }

      return res.status(200).json({ success: true, followed: false });
    } catch (error) {
      console.error('Unfollow error', error);
      return res.status(500).json({ error: 'Failed to unfollow user' });
    }
  }

  async counters(req: Request, res: Response, _next: NextFunction) {
    try {
      const db = getDB();
      const targetUserId = req.params.userId;
      if (!targetUserId) {
        return res.status(400).json({ error: 'Missing userId' });
      }
      const targetObjId = new ObjectId(targetUserId);

      const collection = db.collection<FollowDoc>('follows');

      const [followers, following] = await Promise.all([
        collection.countDocuments({ followingId: targetObjId }),
        collection.countDocuments({ followerId: targetObjId }),
      ]);

      return res.status(200).json({ userId: targetUserId, followers, following });
    } catch (error) {
      console.error('Counters error', error);
      return res.status(500).json({ error: 'Failed to fetch counters' });
    }
  }
}

export default new SocialController();



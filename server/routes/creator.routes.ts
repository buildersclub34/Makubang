import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { hlsVideoService } from '../services/hls-video.service';
import multer from 'multer';
import path from 'path';
import { ObjectId } from 'mongodb';

const router = Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/videos/temp');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else if (file.fieldname === 'thumbnail' && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Get creator's videos
router.get('/videos', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const db = req.app.locals.db;

    const videos = await db.collection('videos')
      .find({ ownerId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ videos });
  } catch (error) {
    console.error('Get creator videos error:', error);
    res.status(500).json({ error: 'Failed to get videos' });
  }
});

// Upload video
router.post('/videos/upload', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files.video || files.video.length === 0) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const videoFile = files.video[0];
    const thumbnailFile = files.thumbnail?.[0];
    
    const {
      title,
      description,
      tags,
      isPublic,
      restaurantId,
      menuItemId
    } = req.body;

    // Process video to HLS
    const videoId = new ObjectId().toString();
    const outputDir = `uploads/videos/${videoId}`;
    
    const { masterPlaylist, thumbnails } = await hlsVideoService.processVideoToHLS(
      videoFile.path,
      outputDir,
      videoId
    );

    // Get HLS URLs
    const hlsUrls = hlsVideoService.getHLSUrls(videoId);

    // Save video metadata to database
    const db = req.app.locals.db;
    const video = {
      _id: new ObjectId(videoId),
      title,
      description,
      tags: tags ? JSON.parse(tags) : [],
      ownerId: new ObjectId(userId),
      ownerName: (req as any).user.name,
      videoUrl: hlsUrls.masterPlaylist,
      thumbnailUrl: thumbnailFile ? `/uploads/videos/${videoId}/thumbnail.jpg` : thumbnails[0],
      isPublic: isPublic === 'true',
      restaurantId: restaurantId ? new ObjectId(restaurantId) : null,
      menuItemId: menuItemId ? new ObjectId(menuItemId) : null,
      moderationStatus: 'pending',
      duration: 0, // Will be updated after processing
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      earnings: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('videos').insertOne(video);

    // Clean up temp file
    require('fs').unlinkSync(videoFile.path);
    if (thumbnailFile) {
      require('fs').unlinkSync(thumbnailFile.path);
    }

    res.json({
      success: true,
      videoId,
      message: 'Video uploaded and processing started'
    });

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Delete video
router.delete('/videos/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = (req as any).user.id;
    const db = req.app.locals.db;

    // Check if user owns the video
    const video = await db.collection('videos').findOne({
      _id: new ObjectId(videoId),
      ownerId: new ObjectId(userId)
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found or access denied' });
    }

    // Delete video from database
    await db.collection('videos').deleteOne({ _id: new ObjectId(videoId) });

    // TODO: Delete video files from storage

    res.json({ success: true });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Get creator analytics
router.get('/analytics', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const db = req.app.locals.db;

    // Get video statistics
    const videoStats = await db.collection('videos').aggregate([
      { $match: { ownerId: new ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          totalComments: { $sum: '$comments' },
          totalShares: { $sum: '$shares' },
          totalEarnings: { $sum: '$earnings' },
          videoCount: { $sum: 1 }
        }
      }
    ]).toArray();

    const stats = videoStats[0] || {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalEarnings: 0,
      videoCount: 0
    };

    // Calculate engagement rate
    const avgEngagementRate = stats.totalViews > 0 
      ? ((stats.totalLikes + stats.totalComments + stats.totalShares) / stats.totalViews) * 100
      : 0;

    // Get top performing videos
    const topPerformingVideos = await db.collection('videos')
      .find({ ownerId: new ObjectId(userId) })
      .sort({ views: -1 })
      .limit(5)
      .toArray();

    // Get recent activity (placeholder)
    const recentActivity = [
      {
        type: 'video_approved',
        message: 'Your video was approved and is now live',
        timestamp: new Date().toISOString()
      }
    ];

    res.json({
      ...stats,
      avgEngagementRate,
      topPerformingVideos,
      recentActivity
    });

  } catch (error) {
    console.error('Get creator analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Update video
router.put('/videos/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = (req as any).user.id;
    const { title, description, tags, isPublic } = req.body;
    const db = req.app.locals.db;

    const result = await db.collection('videos').updateOne(
      { 
        _id: new ObjectId(videoId),
        ownerId: new ObjectId(userId)
      },
      {
        $set: {
          title,
          description,
          tags,
          isPublic,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Video not found or access denied' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// Get creator earnings breakdown
router.get('/earnings', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const db = req.app.locals.db;

    // Get earnings by video
    const earningsByVideo = await db.collection('videos')
      .find({ ownerId: new ObjectId(userId) })
      .sort({ earnings: -1 })
      .toArray();

    // Get total earnings
    const totalEarnings = earningsByVideo.reduce((sum, video) => sum + (video.earnings || 0), 0);

    // Mock monthly breakdown
    const monthlyEarnings = [
      { month: 'January', earnings: totalEarnings * 0.1 },
      { month: 'February', earnings: totalEarnings * 0.15 },
      { month: 'March', earnings: totalEarnings * 0.2 },
      { month: 'April', earnings: totalEarnings * 0.25 },
      { month: 'May', earnings: totalEarnings * 0.3 }
    ];

    res.json({
      totalEarnings,
      earningsByVideo,
      monthlyEarnings,
      nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('Get creator earnings error:', error);
    res.status(500).json({ error: 'Failed to get earnings' });
  }
});

export default router;

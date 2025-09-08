import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { adminModerationService } from '../services/admin-moderation.service';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize(['admin']) as any);

// Get pending videos for moderation
router.get('/pending-videos', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await adminModerationService.getPendingContent(page, limit);
    res.json(result);
  } catch (error) {
    console.error('Get pending videos error:', error);
    res.status(500).json({ error: 'Failed to get pending videos' });
  }
});

// Approve video
router.post('/videos/:videoId/approve', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { notes } = req.body;
    const adminId = (req as any).user.id;

    await adminModerationService.approveContent(videoId, adminId, notes);
    res.json({ success: true });
  } catch (error) {
    console.error('Approve video error:', error);
    res.status(500).json({ error: 'Failed to approve video' });
  }
});

// Reject video
router.post('/videos/:videoId/reject', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { reason, notes } = req.body;
    const adminId = (req as any).user.id;

    await adminModerationService.rejectContent(videoId, adminId, reason, notes);
    res.json({ success: true });
  } catch (error) {
    console.error('Reject video error:', error);
    res.status(500).json({ error: 'Failed to reject video' });
  }
});

// Get user reports
router.get('/reports', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await adminModerationService.getUserReports(page, limit);
    res.json(result);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

// Resolve report
router.post('/reports/:reportId/resolve', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action } = req.body; // 'keep' or 'remove'
    
    // Update report status
    const db = req.app.locals.db;
    await db.collection('content_reports').updateOne(
      { _id: new ObjectId(reportId) },
      { 
        $set: { 
          status: 'resolved',
          action,
          resolvedAt: new Date(),
          resolvedBy: (req as any).user.id
        }
      }
    );

    if (action === 'remove') {
      // Get the report to find the video
      const report = await db.collection('content_reports').findOne({
        _id: new ObjectId(reportId)
      });

      if (report && report.videoId) {
        // Remove the video
        await adminModerationService.rejectContent(
          report.videoId.toString(),
          (req as any).user.id,
          'Community report',
          'Content removed due to community reports'
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ error: 'Failed to resolve report' });
  }
});

// Take user action (warn, suspend, ban)
router.post('/users/:userId/action', async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, reason, duration } = req.body;
    const adminId = (req as any).user.id;

    await adminModerationService.manageUser(userId, action, adminId, reason, duration);
    res.json({ success: true });
  } catch (error) {
    console.error('User action error:', error);
    res.status(500).json({ error: 'Failed to take user action' });
  }
});

// Get recent user actions
router.get('/user-actions', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const actions = await db.collection('user_actions')
      .aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $addFields: {
            userName: { $arrayElemAt: ['$user.name', 0] }
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: 50 }
      ])
      .toArray();

    res.json({ actions });
  } catch (error) {
    console.error('Get user actions error:', error);
    res.status(500).json({ error: 'Failed to get user actions' });
  }
});

// Get moderation stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await adminModerationService.getSystemStats();
    res.json(stats);
  } catch (error) {
    console.error('Get moderation stats error:', error);
    res.status(500).json({ error: 'Failed to get moderation stats' });
  }
});

// Flag content (from user reports)
router.post('/flag-content', async (req, res) => {
  try {
    const { videoId, reason, details } = req.body;
    const reportedBy = (req as any).user.id;

    const report = await adminModerationService.flagContent(videoId, reportedBy, reason, details);
    res.json({ success: true, reportId: report._id });
  } catch (error) {
    console.error('Flag content error:', error);
    res.status(500).json({ error: 'Failed to flag content' });
  }
});

export default router;

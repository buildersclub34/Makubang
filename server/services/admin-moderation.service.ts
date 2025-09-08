import { getDB } from '../lib/mongodb';
import { ObjectId } from 'mongodb';

export class AdminModerationService {
  private static instance: AdminModerationService;

  static getInstance(): AdminModerationService {
    if (!AdminModerationService.instance) {
      AdminModerationService.instance = new AdminModerationService();
    }
    return AdminModerationService.instance;
  }

  async getPendingContent(page: number = 1, limit: number = 20) {
    const db = getDB();
    const skip = (page - 1) * limit;

    const [videos, totalCount] = await Promise.all([
      db.collection('videos')
        .find({ moderationStatus: 'pending' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('videos').countDocuments({ moderationStatus: 'pending' })
    ]);

    return {
      videos,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    };
  }

  async approveContent(videoId: string, adminId: string, notes?: string) {
    const db = getDB();

    await db.collection('videos').updateOne(
      { _id: new ObjectId(videoId) },
      {
        $set: {
          moderationStatus: 'approved',
          isPublic: true,
          moderatedBy: new ObjectId(adminId),
          moderatedAt: new Date(),
          moderationNotes: notes,
          updatedAt: new Date()
        }
      }
    );

    // Log moderation action
    await this.logModerationAction(adminId, videoId, 'approved', notes);

    return true;
  }

  async rejectContent(videoId: string, adminId: string, reason: string, notes?: string) {
    const db = getDB();

    await db.collection('videos').updateOne(
      { _id: new ObjectId(videoId) },
      {
        $set: {
          moderationStatus: 'rejected',
          isPublic: false,
          moderatedBy: new ObjectId(adminId),
          moderatedAt: new Date(),
          rejectionReason: reason,
          moderationNotes: notes,
          updatedAt: new Date()
        }
      }
    );

    // Log moderation action
    await this.logModerationAction(adminId, videoId, 'rejected', `${reason}: ${notes}`);

    // Notify content creator
    await this.notifyContentCreator(videoId, 'rejected', reason);

    return true;
  }

  async flagContent(videoId: string, reportedBy: string, reason: string, details?: string) {
    const db = getDB();

    const report = {
      _id: new ObjectId(),
      videoId: new ObjectId(videoId),
      reportedBy: new ObjectId(reportedBy),
      reason,
      details,
      status: 'pending', // pending, reviewed, resolved
      createdAt: new Date()
    };

    await db.collection('content_reports').insertOne(report);

    // Update video flag count
    await db.collection('videos').updateOne(
      { _id: new ObjectId(videoId) },
      {
        $inc: { flagCount: 1 },
        $set: { lastFlaggedAt: new Date() }
      }
    );

    // Auto-moderate if too many flags
    const video = await db.collection('videos').findOne({ _id: new ObjectId(videoId) });
    if (video && video.flagCount >= 5) {
      await this.autoModerateContent(videoId);
    }

    return report;
  }

  private async autoModerateContent(videoId: string) {
    const db = getDB();

    await db.collection('videos').updateOne(
      { _id: new ObjectId(videoId) },
      {
        $set: {
          moderationStatus: 'auto_flagged',
          isPublic: false,
          autoFlaggedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    // Log auto-moderation
    await this.logModerationAction('system', videoId, 'auto_flagged', 'Auto-flagged due to multiple reports');
  }

  async getUserReports(page: number = 1, limit: number = 20) {
    const db = getDB();
    const skip = (page - 1) * limit;

    const [reports, totalCount] = await Promise.all([
      db.collection('content_reports')
        .aggregate([
          { $match: { status: 'pending' } },
          {
            $lookup: {
              from: 'videos',
              localField: 'videoId',
              foreignField: '_id',
              as: 'video'
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'reportedBy',
              foreignField: '_id',
              as: 'reporter'
            }
          },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit }
        ])
        .toArray(),
      db.collection('content_reports').countDocuments({ status: 'pending' })
    ]);

    return {
      reports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount
      }
    };
  }

  async manageUser(userId: string, action: 'warn' | 'suspend' | 'ban', adminId: string, reason: string, duration?: number) {
    const db = getDB();

    const userAction = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      action,
      reason,
      duration, // in days
      adminId: new ObjectId(adminId),
      createdAt: new Date(),
      expiresAt: duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null
    };

    await db.collection('user_actions').insertOne(userAction);

    // Update user status
    const updates: any = {
      lastActionAt: new Date(),
      updatedAt: new Date()
    };

    if (action === 'suspend') {
      updates.isSuspended = true;
      updates.suspendedUntil = userAction.expiresAt;
    } else if (action === 'ban') {
      updates.isBanned = true;
      updates.isActive = false;
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: updates }
    );

    // Notify user
    await this.notifyUser(userId, action, reason);

    return userAction;
  }

  async getSystemStats() {
    const db = getDB();

    const [
      totalVideos,
      pendingModeration,
      approvedVideos,
      rejectedVideos,
      autoFlagged,
      pendingReports,
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalOrders,
      recentActions
    ] = await Promise.all([
      db.collection('videos').countDocuments(),
      db.collection('videos').countDocuments({ moderationStatus: 'pending' }),
      db.collection('videos').countDocuments({ moderationStatus: 'approved' }),
      db.collection('videos').countDocuments({ moderationStatus: 'rejected' }),
      db.collection('videos').countDocuments({ moderationStatus: 'auto_flagged' }),
      db.collection('content_reports').countDocuments({ status: 'pending' }),
      db.collection('users').countDocuments(),
      db.collection('users').countDocuments({ isActive: true }),
      db.collection('users').countDocuments({ isSuspended: true }),
      db.collection('orders').countDocuments(),
      db.collection('moderation_logs')
        .find()
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray()
    ]);

    return {
      content: {
        totalVideos,
        pendingModeration,
        approvedVideos,
        rejectedVideos,
        autoFlagged
      },
      reports: {
        pendingReports
      },
      users: {
        totalUsers,
        activeUsers,
        suspendedUsers
      },
      orders: {
        totalOrders
      },
      recentActions
    };
  }

  private async logModerationAction(adminId: string, videoId: string, action: string, notes?: string) {
    const db = getDB();

    await db.collection('moderation_logs').insertOne({
      _id: new ObjectId(),
      adminId: adminId === 'system' ? null : new ObjectId(adminId),
      videoId: new ObjectId(videoId),
      action,
      notes,
      createdAt: new Date()
    });
  }

  private async notifyContentCreator(videoId: string, action: string, reason: string) {
    const db = getDB();

    const video = await db.collection('videos').findOne({ _id: new ObjectId(videoId) });
    if (!video) return;

    const notification = {
      _id: new ObjectId(),
      userId: video.ownerId,
      type: 'content_moderation',
      title: `Video ${action}`,
      message: `Your video "${video.title}" has been ${action}. Reason: ${reason}`,
      data: { videoId, action, reason },
      read: false,
      createdAt: new Date()
    };

    await db.collection('notifications').insertOne(notification);
  }

  private async notifyUser(userId: string, action: string, reason: string) {
    const db = getDB();

    const notification = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      type: 'account_action',
      title: `Account ${action}`,
      message: `Your account has been ${action}. Reason: ${reason}`,
      data: { action, reason },
      read: false,
      createdAt: new Date()
    };

    await db.collection('notifications').insertOne(notification);
  }
}

export const adminModerationService = AdminModerationService.getInstance();

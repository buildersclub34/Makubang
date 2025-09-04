import OpenAI from 'openai';
import { db } from './db.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ModerationResult {
  isApproved: boolean;
  flaggedContent: string[];
  confidenceScore: number;
  suggestedActions: string[];
}

export interface ContentModerationRequest {
  id: string;
  type: 'video' | 'comment' | 'profile';
  content: {
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    metadata?: Record<string, any>;
  };
  userId: string;
  createdAt: Date;
}

export class ContentModerationService {
  private moderationPrompt = `
    You are a content moderator for a food delivery and social media platform called Makubang.
    Analyze the provided content and determine if it violates any of these policies:

    PROHIBITED CONTENT:
    1. Explicit sexual content or nudity
    2. Violence, threats, or harassment
    3. Hate speech or discrimination
    4. Spam or misleading information
    5. Copyright infringement
    6. Dangerous or illegal activities
    7. Non-food related content (for food videos)
    8. Unhygienic food preparation
    9. False restaurant information
    10. Scam or fraudulent content

    RESPONSE FORMAT:
    {
      "isApproved": boolean,
      "flaggedContent": ["list of specific violations"],
      "confidenceScore": number (0-1),
      "suggestedActions": ["list of recommended actions"]
    }

    Be strict but fair. Food content should be appetizing and safe.
  `;

  async moderateContent(request: ContentModerationRequest): Promise<ModerationResult> {
    try {
      let analysisText = '';

      // Prepare content for analysis
      if (request.content.text) {
        analysisText += `Text Content: ${request.content.text}\n`;
      }

      if (request.content.metadata) {
        analysisText += `Metadata: ${JSON.stringify(request.content.metadata)}\n`;
      }

      analysisText += `Content Type: ${request.type}\n`;
      analysisText += `User ID: ${request.userId}\n`;

      // Get OpenAI moderation
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: this.moderationPrompt
          },
          {
            role: "user",
            content: `Please moderate this content:\n\n${analysisText}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse the response
      const result: ModerationResult = JSON.parse(response);

      // Store moderation result
      await this.storeModerationResult(request.id, result);

      // Auto-approve low-risk content
      if (result.confidenceScore < 0.3 && result.flaggedContent.length === 0) {
        await this.approveContent(request.id);
      }

      // Auto-reject high-risk content
      if (result.confidenceScore > 0.8 || result.flaggedContent.length > 2) {
        await this.rejectContent(request.id, result.flaggedContent.join(', '));
      }

      return result;
    } catch (error) {
      console.error('Error in content moderation:', error);

      // Return safe default
      return {
        isApproved: false,
        flaggedContent: ['Moderation service error'],
        confidenceScore: 1.0,
        suggestedActions: ['Manual review required'],
      };
    }
  }

  async moderateVideo(videoId: string, metadata: any): Promise<ModerationResult> {
    const request: ContentModerationRequest = {
      id: videoId,
      type: 'video',
      content: {
        text: metadata.title + ' ' + metadata.description,
        videoUrl: metadata.videoUrl,
        metadata: metadata,
      },
      userId: metadata.userId,
      createdAt: new Date(),
    };

    return await this.moderateContent(request);
  }

  async moderateComment(commentId: string, text: string, userId: string): Promise<ModerationResult> {
    const request: ContentModerationRequest = {
      id: commentId,
      type: 'comment',
      content: {
        text: text,
      },
      userId: userId,
      createdAt: new Date(),
    };

    return await this.moderateContent(request);
  }

  async moderateProfile(userId: string, profileData: any): Promise<ModerationResult> {
    const request: ContentModerationRequest = {
      id: userId,
      type: 'profile',
      content: {
        text: `${profileData.username} ${profileData.bio} ${profileData.displayName}`,
        imageUrl: profileData.profileImage,
        metadata: profileData,
      },
      userId: userId,
      createdAt: new Date(),
    };

    return await this.moderateContent(request);
  }

  private async storeModerationResult(contentId: string, result: ModerationResult) {
    try {
      await db.query(
        `INSERT INTO content_moderation_results 
         (content_id, is_approved, flagged_content, confidence_score, suggested_actions, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (content_id) 
         DO UPDATE SET 
           is_approved = $2,
           flagged_content = $3,
           confidence_score = $4,
           suggested_actions = $5,
           updated_at = NOW()`,
        [
          contentId,
          result.isApproved,
          JSON.stringify(result.flaggedContent),
          result.confidenceScore,
          JSON.stringify(result.suggestedActions)
        ]
      );
    } catch (error) {
      console.error('Error storing moderation result:', error);
    }
  }

  private async approveContent(contentId: string) {
    try {
      await db.query(
        'UPDATE videos SET status = $1, approved_at = NOW() WHERE id = $2',
        ['approved', contentId]
      );
    } catch (error) {
      console.error('Error approving content:', error);
    }
  }

  private async rejectContent(contentId: string, reason: string) {
    try {
      await db.query(
        'UPDATE videos SET status = $1, rejection_reason = $2 WHERE id = $3',
        ['rejected', reason, contentId]
      );
    } catch (error) {
      console.error('Error rejecting content:', error);
    }
  }

  async getPendingContent(limit: number = 50) {
    try {
      const result = await db.query(
        `SELECT v.*, u.username, u.email 
         FROM videos v 
         JOIN users u ON v.user_id = u.id 
         WHERE v.status = 'pending' 
         ORDER BY v.created_at ASC 
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting pending content:', error);
      return [];
    }
  }

  async manuallyApproveContent(contentId: string, adminId: string) {
    try {
      await db.query(
        `UPDATE videos 
         SET status = 'approved', approved_at = NOW(), approved_by = $2 
         WHERE id = $1`,
        [contentId, adminId]
      );

      await db.query(
        `INSERT INTO admin_actions (admin_id, action_type, target_id, target_type, created_at)
         VALUES ($1, 'approve_content', $2, 'video', NOW())`,
        [adminId, contentId]
      );

      return true;
    } catch (error) {
      console.error('Error manually approving content:', error);
      return false;
    }
  }

  async manuallyRejectContent(contentId: string, adminId: string, reason: string) {
    try {
      await db.query(
        `UPDATE videos 
         SET status = 'rejected', rejection_reason = $2, rejected_by = $3 
         WHERE id = $1`,
        [contentId, reason, adminId]
      );

      await db.query(
        `INSERT INTO admin_actions (admin_id, action_type, target_id, target_type, reason, created_at)
         VALUES ($1, 'reject_content', $2, 'video', $3, NOW())`,
        [adminId, contentId, reason]
      );

      return true;
    } catch (error) {
      console.error('Error manually rejecting content:', error);
      return false;
    }
  }

  async getModerationStats() {
    try {
      const stats = await db.query(`
        SELECT 
          COUNT(*) as total_content,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
          AVG(CASE 
            WHEN status = 'approved' 
            THEN EXTRACT(EPOCH FROM (approved_at - created_at))/3600 
            ELSE NULL 
          END) as avg_approval_time_hours
        FROM videos 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);

      return stats.rows[0];
    } catch (error) {
      console.error('Error getting moderation stats:', error);
      return null;
    }
  }
}

export const contentModerationService = new ContentModerationService();

import OpenAI from 'openai';
import { db } from './db';
import { contentModerationReports, videos, users } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

export interface ContentModerationRequest {
  contentType: 'video' | 'comment' | 'profile';
  contentId: string;
  title?: string;
  description?: string;
  videoUrl?: string;
  text?: string;
  metadata?: Record<string, any>;
}

export interface ModerationResult {
  approved: boolean;
  confidence: number;
  flaggedReasons: string[];
  suggestedActions: string[];
  requiresManualReview: boolean;
  metadata?: Record<string, any>;
}

export class ContentModerationService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found. Content moderation will use basic rules only.');
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  // Main moderation function
  async moderateContent(request: ContentModerationRequest): Promise<ModerationResult> {
    try {
      const results: Partial<ModerationResult> = {
        approved: true,
        confidence: 0.95,
        flaggedReasons: [],
        suggestedActions: [],
        requiresManualReview: false,
      };

      // OpenAI moderation for text content
      if (this.openai && (request.title || request.description || request.text)) {
        const textToModerate = [request.title, request.description, request.text]
          .filter(Boolean)
          .join(' ');
        
        const openaiResult = await this.moderateWithOpenAI(textToModerate);
        if (!openaiResult.approved) {
          results.approved = false;
          results.flaggedReasons!.push(...openaiResult.flaggedReasons);
          results.confidence = openaiResult.confidence;
        }
      }

      // Basic rule-based moderation
      const basicResult = await this.moderateWithBasicRules(request);
      if (!basicResult.approved) {
        results.approved = false;
        results.flaggedReasons!.push(...basicResult.flaggedReasons);
        results.confidence = Math.min(results.confidence!, basicResult.confidence);
      }

      // Video-specific moderation
      if (request.contentType === 'video' && request.videoUrl) {
        const videoResult = await this.moderateVideo(request);
        if (!videoResult.approved) {
          results.approved = false;
          results.flaggedReasons!.push(...videoResult.flaggedReasons);
          results.confidence = Math.min(results.confidence!, videoResult.confidence);
        }
      }

      // Determine if manual review is needed
      results.requiresManualReview = 
        results.confidence! < 0.8 || 
        results.flaggedReasons!.includes('hate') ||
        results.flaggedReasons!.includes('violence') ||
        results.flaggedReasons!.includes('sexual');

      // Get suggested actions
      results.suggestedActions = this.getSuggestedActions(results.flaggedReasons!);

      return results as ModerationResult;
    } catch (error) {
      console.error('Content moderation error:', error);
      return {
        approved: false,
        confidence: 0.5,
        flaggedReasons: ['moderation_error'],
        suggestedActions: ['manual_review'],
        requiresManualReview: true,
      };
    }
  }

  // OpenAI-based moderation
  private async moderateWithOpenAI(text: string): Promise<ModerationResult> {
    try {
      const response = await this.openai.moderations.create({
        input: text,
      });

      const result = response.results[0];
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category);

      const confidence = this.calculateConfidenceScore(result.category_scores);

      return {
        approved: !result.flagged,
        confidence,
        flaggedReasons: flaggedCategories,
        suggestedActions: [],
        requiresManualReview: result.flagged && confidence < 0.9,
      };
    } catch (error) {
      console.error('OpenAI moderation error:', error);
      throw error;
    }
  }

  // Basic rule-based moderation
  private async moderateWithBasicRules(request: ContentModerationRequest): Promise<ModerationResult> {
    const flaggedReasons: string[] = [];
    const textContent = [request.title, request.description, request.text].filter(Boolean).join(' ').toLowerCase();

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{4,}/, // Repeated characters
      /\b(buy now|click here|limited time|act now)\b/gi,
      /\b(www\.|http|\.com|\.in)\b/gi,
    ];

    spamPatterns.forEach(pattern => {
      if (pattern.test(textContent)) {
        flaggedReasons.push('potential_spam');
      }
    });

    // Check for misleading claims
    const misleadingPatterns = [
      /\b(100% guaranteed|miracle|instant|overnight success)\b/gi,
      /\b(doctors hate|secret trick|one weird trick)\b/gi,
    ];

    misleadingPatterns.forEach(pattern => {
      if (pattern.test(textContent)) {
        flaggedReasons.push('misleading_claims');
      }
    });

    // Check for competitor mentions
    const competitorNames = ['zomato', 'swiggy', 'ubereats', 'foodpanda'];
    competitorNames.forEach(competitor => {
      if (textContent.includes(competitor)) {
        flaggedReasons.push('competitor_mention');
      }
    });

    return {
      approved: flaggedReasons.length === 0,
      confidence: flaggedReasons.length === 0 ? 0.9 : 0.6,
      flaggedReasons,
      suggestedActions: [],
      requiresManualReview: flaggedReasons.includes('misleading_claims'),
    };
  }

  // Video-specific moderation
  private async moderateVideo(request: ContentModerationRequest): Promise<ModerationResult> {
    const flaggedReasons: string[] = [];

    // Basic video metadata checks
    if (request.metadata) {
      // Check video duration
      if (request.metadata.duration && request.metadata.duration > 300) { // 5 minutes
        flaggedReasons.push('excessive_duration');
      }

      // Check file size (assuming it's in bytes)
      if (request.metadata.fileSize && request.metadata.fileSize > 100 * 1024 * 1024) { // 100MB
        flaggedReasons.push('large_file_size');
      }
    }

    // TODO: Implement actual video content analysis
    // This would require video processing libraries or external services

    return {
      approved: flaggedReasons.length === 0,
      confidence: 0.7,
      flaggedReasons,
      suggestedActions: [],
      requiresManualReview: false,
    };
  }

  // Create moderation report
  async createModerationReport(
    contentType: string,
    contentId: string,
    reporterId: string,
    reason: string,
    description?: string
  ) {
    try {
      const [report] = await db.insert(contentModerationReports).values({
        id: crypto.randomUUID(),
        contentType,
        contentId,
        reporterId,
        reason,
        description,
        status: 'pending',
        autoFlagged: false,
        severity: this.determineSeverity(reason),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      return report;
    } catch (error) {
      console.error('Error creating moderation report:', error);
      throw new Error('Failed to create moderation report');
    }
  }

  // Auto-flag content based on AI analysis
  async autoFlagContent(moderationResult: ModerationResult, contentType: string, contentId: string) {
    if (!moderationResult.approved || moderationResult.requiresManualReview) {
      try {
        await db.insert(contentModerationReports).values({
          id: crypto.randomUUID(),
          contentType,
          contentId,
          reporterId: null, // System-generated report
          reason: moderationResult.flaggedReasons.join(', '),
          description: `Auto-flagged by AI moderation system. Confidence: ${moderationResult.confidence}`,
          status: 'pending',
          autoFlagged: true,
          severity: this.determineSeverityFromReasons(moderationResult.flaggedReasons),
          metadata: {
            moderationResult,
            timestamp: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error('Error auto-flagging content:', error);
      }
    }
  }

  // Get moderation reports for admin
  async getModerationReports(status: string = 'pending', page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const reports = await db.select({
        id: contentModerationReports.id,
        contentType: contentModerationReports.contentType,
        contentId: contentModerationReports.contentId,
        reason: contentModerationReports.reason,
        description: contentModerationReports.description,
        status: contentModerationReports.status,
        severity: contentModerationReports.severity,
        autoFlagged: contentModerationReports.autoFlagged,
        createdAt: contentModerationReports.createdAt,
        reporter: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(contentModerationReports)
      .leftJoin(users, eq(contentModerationReports.reporterId, users.id))
      .where(eq(contentModerationReports.status, status))
      .orderBy(contentModerationReports.createdAt)
      .limit(limit)
      .offset(offset);

      return reports;
    } catch (error) {
      console.error('Error fetching moderation reports:', error);
      throw new Error('Failed to fetch moderation reports');
    }
  }

  // Moderate video (convenience method)
  async moderateVideo(videoData: { title: string; description: string; videoUrl: string }): Promise<ModerationResult> {
    return this.moderateContent({
      contentType: 'video',
      contentId: 'temp',
      title: videoData.title,
      description: videoData.description,
      videoUrl: videoData.videoUrl,
    });
  }

  // Private helper methods
  private calculateConfidenceScore(categoryScores: any): number {
    const maxScore = Math.max(...Object.values(categoryScores) as number[]);
    return 1 - maxScore; // Higher score means more confident it's safe
  }

  private getSuggestedActions(flaggedReasons: string[]): string[] {
    const actions: string[] = [];
    
    if (flaggedReasons.includes('hate') || flaggedReasons.includes('violence')) {
      actions.push('immediate_removal', 'user_warning');
    } else if (flaggedReasons.includes('sexual') || flaggedReasons.includes('harassment')) {
      actions.push('content_review', 'age_restriction');
    } else if (flaggedReasons.includes('potential_spam')) {
      actions.push('spam_review', 'limit_reach');
    } else if (flaggedReasons.includes('misleading_claims')) {
      actions.push('fact_check', 'add_disclaimer');
    } else if (flaggedReasons.includes('competitor_mention')) {
      actions.push('editorial_review');
    }

    return actions;
  }

  private determineSeverity(reason: string): string {
    const highSeverityReasons = ['hate', 'violence', 'sexual', 'harassment'];
    const mediumSeverityReasons = ['misleading_claims', 'potential_spam'];
    
    if (highSeverityReasons.some(r => reason.includes(r))) return 'high';
    if (mediumSeverityReasons.some(r => reason.includes(r))) return 'medium';
    return 'low';
  }

  private determineSeverityFromReasons(reasons: string[]): string {
    const highSeverityReasons = ['hate', 'violence', 'sexual', 'harassment'];
    const mediumSeverityReasons = ['misleading_claims', 'potential_spam'];
    
    if (reasons.some(r => highSeverityReasons.includes(r))) return 'high';
    if (reasons.some(r => mediumSeverityReasons.includes(r))) return 'medium';
    return 'low';
  }
}

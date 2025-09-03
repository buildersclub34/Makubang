
import OpenAI from 'openai';

export interface ModerationResult {
  isApproved: boolean;
  flaggedReasons: string[];
  confidenceScore: number;
  suggestedActions: string[];
}

export class ContentModerationService {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'demo-key'
  });

  // Moderate video content
  static async moderateVideo(videoUrl: string, title: string, description: string): Promise<ModerationResult> {
    try {
      const textModeration = await this.moderateText(`${title} ${description}`);
      const visualModeration = await this.moderateVideoVisual(videoUrl);
      
      const flaggedReasons = [...textModeration.flaggedReasons, ...visualModeration.flaggedReasons];
      const isApproved = flaggedReasons.length === 0;
      
      return {
        isApproved,
        flaggedReasons,
        confidenceScore: Math.min(textModeration.confidenceScore, visualModeration.confidenceScore),
        suggestedActions: this.getSuggestedActions(flaggedReasons)
      };
    } catch (error) {
      console.error('Moderation error:', error);
      return {
        isApproved: false,
        flaggedReasons: ['moderation_service_error'],
        confidenceScore: 0,
        suggestedActions: ['manual_review']
      };
    }
  }

  // Moderate text content (titles, descriptions, comments)
  static async moderateText(text: string): Promise<ModerationResult> {
    if (!text.trim()) {
      return {
        isApproved: true,
        flaggedReasons: [],
        confidenceScore: 1.0,
        suggestedActions: []
      };
    }

    try {
      // Use OpenAI moderation API
      const moderationResponse = await this.openai.moderations.create({
        input: text
      });

      const result = moderationResponse.results[0];
      const flaggedReasons: string[] = [];

      if (result.flagged) {
        Object.entries(result.categories).forEach(([category, flagged]) => {
          if (flagged) {
            flaggedReasons.push(category);
          }
        });
      }

      // Additional custom checks
      const customFlags = this.performCustomTextChecks(text);
      flaggedReasons.push(...customFlags);

      return {
        isApproved: flaggedReasons.length === 0,
        flaggedReasons,
        confidenceScore: this.calculateConfidenceScore(result.category_scores),
        suggestedActions: this.getSuggestedActions(flaggedReasons)
      };
    } catch (error) {
      console.error('Text moderation error:', error);
      return {
        isApproved: false,
        flaggedReasons: ['moderation_api_error'],
        confidenceScore: 0,
        suggestedActions: ['manual_review']
      };
    }
  }

  // Moderate visual content in videos
  private static async moderateVideoVisual(videoUrl: string): Promise<ModerationResult> {
    // In a real implementation, this would:
    // 1. Extract frames from video
    // 2. Use computer vision API to analyze frames
    // 3. Check for inappropriate content, logos, etc.
    
    // For now, return a mock result
    const mockFlags: string[] = [];
    
    // Simulate some basic checks
    if (videoUrl.includes('inappropriate')) {
      mockFlags.push('inappropriate_visual_content');
    }
    
    return {
      isApproved: mockFlags.length === 0,
      flaggedReasons: mockFlags,
      confidenceScore: 0.9,
      suggestedActions: this.getSuggestedActions(mockFlags)
    };
  }

  // Custom text checks for food-specific content
  private static performCustomTextChecks(text: string): string[] {
    const flags: string[] = [];
    const lowerText = text.toLowerCase();

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{4,}/g, // Repeated characters
      /free\s+(delivery|food|meal)/gi,
      /click\s+here/gi,
      /urgent/gi
    ];

    spamPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        flags.push('potential_spam');
      }
    });

    // Check for misleading claims
    const misleadingPatterns = [
      /100%\s+(natural|organic|pure)/gi,
      /instant\s+(weight\s+loss|cure)/gi,
      /guaranteed\s+results/gi
    ];

    misleadingPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        flags.push('misleading_claims');
      }
    });

    // Check for competitor mentions
    const competitorNames = ['zomato', 'swiggy', 'ubereats', 'foodpanda'];
    competitorNames.forEach(competitor => {
      if (lowerText.includes(competitor)) {
        flags.push('competitor_mention');
      }
    });

    return flags;
  }

  // Calculate confidence score from OpenAI scores
  private static calculateConfidenceScore(categoryScores: any): number {
    const maxScore = Math.max(...Object.values(categoryScores) as number[]);
    return 1 - maxScore; // Higher score means more confident it's safe
  }

  // Get suggested actions based on flagged reasons
  private static getSuggestedActions(flaggedReasons: string[]): string[] {
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

    if (actions.length === 0 && flaggedReasons.length > 0) {
      actions.push('manual_review');
    }

    return actions;
  }

  // Moderate user-generated comments
  static async moderateComment(comment: string, userId: string): Promise<ModerationResult> {
    const textResult = await this.moderateText(comment);
    
    // Additional checks for comments
    const userHistory = await this.getUserModerationHistory(userId);
    if (userHistory.recentViolations > 3) {
      textResult.flaggedReasons.push('repeat_offender');
      textResult.isApproved = false;
    }

    return textResult;
  }

  // Get user's moderation history
  private static async getUserModerationHistory(userId: string): Promise<{ recentViolations: number }> {
    // In real implementation, query database for user's recent violations
    return { recentViolations: 0 };
  }

  // Auto-moderate and take action
  static async autoModerateAndAct(
    contentType: 'video' | 'comment' | 'profile',
    content: any,
    userId: string
  ): Promise<{ action: string; reason: string }> {
    let moderationResult: ModerationResult;

    switch (contentType) {
      case 'video':
        moderationResult = await this.moderateVideo(content.videoUrl, content.title, content.description);
        break;
      case 'comment':
        moderationResult = await this.moderateComment(content.text, userId);
        break;
      default:
        moderationResult = await this.moderateText(content.text || '');
    }

    // Take automatic action based on moderation result
    if (!moderationResult.isApproved) {
      if (moderationResult.flaggedReasons.includes('hate') || moderationResult.flaggedReasons.includes('violence')) {
        return { action: 'immediate_removal', reason: 'Harmful content detected' };
      } else if (moderationResult.confidenceScore < 0.3) {
        return { action: 'quarantine', reason: 'High-risk content flagged for review' };
      } else {
        return { action: 'flag_for_review', reason: 'Content flagged for manual review' };
      }
    }

    return { action: 'approved', reason: 'Content passed moderation checks' };
  }
}

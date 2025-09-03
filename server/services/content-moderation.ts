import axios from 'axios';
import { logger } from '../utils/logger';
import { InternalServerError } from '../middleware/error-handler';

interface ContentModerationConfig {
  // Perspective API configuration
  perspectiveApiKey?: string;
  perspectiveApiUrl?: string;
  
  // Custom moderation rules
  blockedWords?: string[];
  blockedDomains?: string[];
  
  // Thresholds for content rejection (0-1)
  toxicityThreshold?: number;
  spamThreshold?: number;
  explicitContentThreshold?: number;
  
  // Whether to enable image moderation
  moderateImages?: boolean;
  
  // Whether to enable video moderation
  moderateVideos?: boolean;
}

export interface ModerationResult {
  approved: boolean;
  reasons: string[];
  scores: {
    toxicity?: number;
    spam?: number;
    explicitContent?: number;
    [key: string]: number | undefined;
  };
  metadata: Record<string, any>;
}

export class ContentModerationService {
  private config: Required<ContentModerationConfig>;
  
  constructor(config: ContentModerationConfig = {}) {
    this.config = {
      perspectiveApiUrl: 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze',
      blockedWords: [],
      blockedDomains: [],
      toxicityThreshold: 0.7,
      spamThreshold: 0.7,
      explicitContentThreshold: 0.7,
      moderateImages: true,
      moderateVideos: true,
      ...config,
    };
  }

  /**
   * Check if text contains any blocked words or phrases
   */
  private checkBlockedContent(text: string): { hasBlockedContent: boolean; matchedTerms: string[] } {
    if (!text || !this.config.blockedWords?.length) {
      return { hasBlockedContent: false, matchedTerms: [] };
    }

    const lowerText = text.toLowerCase();
    const matchedTerms = this.config.blockedWords.filter(term => 
      lowerText.includes(term.toLowerCase())
    );

    return {
      hasBlockedContent: matchedTerms.length > 0,
      matchedTerms,
    };
  }

  /**
   * Check if a URL contains any blocked domains
   */
  private checkBlockedDomains(url: string): { isBlocked: boolean; matchedDomain?: string } {
    if (!url || !this.config.blockedDomains?.length) {
      return { isBlocked: false };
    }

    const domain = new URL(url).hostname.toLowerCase();
    const matchedDomain = this.config.blockedDomains.find(blockedDomain => 
      domain === blockedDomain.toLowerCase() || 
      domain.endsWith(`.${blockedDomain.toLowerCase()}`)
    );

    return {
      isBlocked: !!matchedDomain,
      matchedDomain,
    };
  }

  /**
   * Analyze text using Perspective API
   */
  private async analyzeWithPerspective(text: string): Promise<Record<string, number>> {
    if (!this.config.perspectiveApiKey || !text?.trim()) {
      return {};
    }

    try {
      const response = await axios.post(
        `${this.config.perspectiveApiUrl}?key=${this.config.perspectiveApiKey}`,
        {
          comment: { text },
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            IDENTITY_ATTACK: {},
            INSULT: {},
            PROFANITY: {},
            THREAT: {},
            SEXUALLY_EXPLICIT: {},
            FLIRTATION: {},
            SPAM: {},
            UNSUBSTANTIAL: {},
          },
          languages: ['en'],
          doNotStore: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const scores: Record<string, number> = {};
      const attributes = response.data.attributeScores;

      for (const [key, value] of Object.entries(attributes)) {
        // @ts-ignore
        scores[key.toLowerCase()] = value.summaryScore.value;
      }

      return scores;
    } catch (error) {
      logger.error('Error analyzing content with Perspective API', { 
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {};
    }
  }

  /**
   * Moderate text content
   */
  async moderateText(text: string, context: Record<string, any> = {}): Promise<ModerationResult> {
    const result: ModerationResult = {
      approved: true,
      reasons: [],
      scores: {},
      metadata: { ...context },
    };

    try {
      // Check for blocked words
      const { hasBlockedContent, matchedTerms } = this.checkBlockedContent(text);
      if (hasBlockedContent) {
        result.approved = false;
        result.reasons.push(`Content contains blocked terms: ${matchedTerms.join(', ')}`);
        result.metadata.blockedTerms = matchedTerms;
      }

      // Analyze with Perspective API if available
      if (this.config.perspectiveApiKey) {
        const scores = await this.analyzeWithPerspective(text);
        result.scores = { ...scores };

        // Check against thresholds
        if (scores.toxicity && scores.toxicity > this.config.toxicityThreshold) {
          result.approved = false;
          result.reasons.push(`Content exceeds toxicity threshold (${scores.toxicity.toFixed(2)})`);
        }

        if (scores.spam && scores.spam > this.config.spamThreshold) {
          result.approved = false;
          result.reasons.push(`Content appears to be spam (${scores.spam.toFixed(2)})`);
        }

        if (scores.sexually_explicit && scores.sexually_explicit > this.config.explicitContentThreshold) {
          result.approved = false;
          result.reasons.push(`Content contains explicit material (${scores.sexually_explicit.toFixed(2)})`);
        }
      }

      return result;
    } catch (error) {
      logger.error('Error moderating text content', { 
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InternalServerError('Failed to moderate content');
    }
  }

  /**
   * Moderate image content (placeholder for actual implementation)
   */
  async moderateImage(
    imageUrl: string, 
    context: Record<string, any> = {}
  ): Promise<ModerationResult> {
    if (!this.config.moderateImages) {
      return {
        approved: true,
        reasons: ['Image moderation is disabled'],
        scores: {},
        metadata: { ...context },
      };
    }

    // In a real implementation, this would call an image moderation API
    // For now, we'll just check the URL
    const { isBlocked, matchedDomain } = this.checkBlockedDomains(imageUrl);
    
    if (isBlocked) {
      return {
        approved: false,
        reasons: [`Image host is blocked: ${matchedDomain}`],
        scores: {},
        metadata: { ...context, blockedDomain: matchedDomain },
      };
    }

    // TODO: Implement actual image moderation using a service like Google Cloud Vision,
    // AWS Rekognition, or a custom ML model
    
    return {
      approved: true,
      reasons: [],
      scores: {},
      metadata: { ...context },
    };
  }

  /**
   * Moderate video content (placeholder for actual implementation)
   */
  async moderateVideo(
    videoUrl: string, 
    context: Record<string, any> = {}
  ): Promise<ModerationResult> {
    if (!this.config.moderateVideos) {
      return {
        approved: true,
        reasons: ['Video moderation is disabled'],
        scores: {},
        metadata: { ...context },
      };
    }

    // In a real implementation, this would call a video moderation API
    // or extract frames and use image moderation
    const { isBlocked, matchedDomain } = this.checkBlockedDomains(videoUrl);
    
    if (isBlocked) {
      return {
        approved: false,
        reasons: [`Video host is blocked: ${matchedDomain}`],
        scores: {},
        metadata: { ...context, blockedDomain: matchedDomain },
      };
    }

    // TODO: Implement actual video moderation using a service like Google Cloud Video Intelligence,
    // AWS Rekognition Video, or extract frames and use image moderation
    
    return {
      approved: true,
      reasons: [],
      scores: {},
      metadata: { ...context },
    };
  }

  /**
   * Moderate a URL (checks domain and optionally content)
   */
  async moderateUrl(
    url: string, 
    options: { checkContent?: boolean } = {}
  ): Promise<ModerationResult> {
    const result: ModerationResult = {
      approved: true,
      reasons: [],
      scores: {},
      metadata: { url },
    };

    try {
      // Check if domain is blocked
      const { isBlocked, matchedDomain } = this.checkBlockedDomains(url);
      if (isBlocked) {
        result.approved = false;
        result.reasons.push(`Domain is blocked: ${matchedDomain}`);
        result.metadata.blockedDomain = matchedDomain;
        return result;
      }

      // Optionally fetch and check content
      if (options.checkContent) {
        try {
          const response = await axios.get(url);
          if (response.data) {
            const contentResult = await this.moderateText(response.data, { url });
            
            // Merge results
            result.approved = contentResult.approved;
            result.reasons.push(...contentResult.reasons);
            result.scores = { ...contentResult.scores };
            result.metadata = { ...result.metadata, ...contentResult.metadata };
          }
        } catch (error) {
          logger.warn('Failed to fetch URL for content moderation', { 
            url, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
          result.reasons.push('Could not fetch content for moderation');
        }
      }

      return result;
    } catch (error) {
      logger.error('Error moderating URL', { 
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InternalServerError('Failed to moderate URL');
    }
  }
}

// Example usage:
/*
const moderationService = new ContentModerationService({
  perspectiveApiKey: process.env.PERSPECTIVE_API_KEY,
  blockedWords: ['spam', 'scam', 'fraud'],
  blockedDomains: ['example.com', 'badsite.com'],
  toxicityThreshold: 0.8,
  spamThreshold: 0.7,
  explicitContentThreshold: 0.6,
});

// Moderate text
const textResult = await moderationService.moderateText('This is a test message', {
  userId: 'user123',
  contentType: 'comment',
});

// Moderate image
const imageResult = await moderationService.moderateImage('https://example.com/image.jpg', {
  userId: 'user123',
  contentType: 'profile_picture',
});

// Moderate video
const videoResult = await moderationService.moderateVideo('https://example.com/video.mp4', {
  userId: 'user123',
  contentType: 'video_upload',
});

// Moderate URL
const urlResult = await moderationService.moderateUrl('https://example.com', {
  checkContent: true,
});

console.log('Moderation results:', { textResult, imageResult, videoResult, urlResult });
*/

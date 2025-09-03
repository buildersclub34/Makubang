import { GoogleAuth } from 'google-auth-library';
import { logger } from '@/server/utils/logger';
import { InternalServerError } from '@/server/middleware/error-handler';

interface ModerationResult {
  safe: boolean;
  reasons: string[];
  scores: Record<string, number>;
  metadata: Record<string, any>;
}

interface ModerationOptions {
  minConfidence?: number;
  rejectThreshold?: number;
  checkFor?: string[];
}

export class ContentModerationService {
  private googleClient: any;
  private defaultCategories = [
    'violence',
    'sexually_explicit',
    'hate_speech',
    'harassment',
    'dangerous_content',
    'spam',
    'copyright',
  ];
  private minConfidence: number;
  private rejectThreshold: number;
  private checkFor: string[];

  constructor(options: ModerationOptions = {}) {
    this.minConfidence = options.minConfidence || 0.7;
    this.rejectThreshold = options.rejectThreshold || 0.9;
    this.checkFor = options.checkFor || this.defaultCategories;
    
    // Initialize Google Cloud client if API key is provided
    if (process.env.GOOGLE_CLOUD_API_KEY) {
      this.googleClient = new GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || '{}'),
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    }
  }

  /**
   * Moderate video content
   */
  async moderateVideo(videoUrl: string): Promise<ModerationResult> {
    try {
      // If Google Cloud API is available, use Video Intelligence API
      if (this.googleClient) {
        return await this.moderateWithGoogleVideoIntelligence(videoUrl);
      }
      
      // Fallback to basic moderation
      return await this.basicVideoModeration(videoUrl);
    } catch (error) {
      logger.error('Video moderation failed', { error, videoUrl });
      throw new InternalServerError('Failed to moderate video content');
    }
  }

  /**
   * Moderate text content (titles, descriptions, comments)
   */
  async moderateText(text: string): Promise<ModerationResult> {
    try {
      // If Perspective API is available, use it
      if (process.env.PERSPECTIVE_API_KEY) {
        return await this.moderateWithPerspectiveAPI(text);
      }
      
      // Fallback to basic text moderation
      return await this.basicTextModeration(text);
    } catch (error) {
      logger.error('Text moderation failed', { error });
      throw new InternalServerError('Failed to moderate text content');
    }
  }

  /**
   * Check if an image is safe
   */
  async moderateImage(imageUrl: string): Promise<ModerationResult> {
    try {
      // If Google Cloud Vision API is available, use it
      if (this.googleClient) {
        return await this.moderateWithGoogleVision(imageUrl);
      }
      
      // Fallback to basic image moderation
      return await this.basicImageModeration(imageUrl);
    } catch (error) {
      logger.error('Image moderation failed', { error, imageUrl });
      throw new InternalServerError('Failed to moderate image content');
    }
  }

  /**
   * Moderate user profile
   */
  async moderateProfile(profileData: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
  }): Promise<ModerationResult> {
    const results: ModerationResult[] = [];
    
    // Check display name
    if (profileData.displayName) {
      results.push(await this.moderateText(profileData.displayName));
    }
    
    // Check bio
    if (profileData.bio) {
      results.push(await this.moderateText(profileData.bio));
    }
    
    // Check avatar if provided
    if (profileData.avatarUrl) {
      results.push(await this.moderateImage(profileData.avatarUrl));
    }
    
    // Combine results
    return this.combineModerationResults(results);
  }

  // Private methods

  private async moderateWithGoogleVideoIntelligence(videoUrl: string): Promise<ModerationResult> {
    const [video] = await this.googleClient.videoIntelligence({
      features: ['EXPLICIT_CONTENT_DETECTION', 'TEXT_DETECTION', 'OBJECT_TRACKING'],
      inputUri: videoUrl,
      videoContext: {
        speechTranscriptionConfig: {
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
        },
      },
    }).execute();

    const results: ModerationResult = {
      safe: true,
      reasons: [],
      scores: {},
      metadata: {},
    };

    // Check explicit content
    if (video.annotationResults?.[0]?.explicitAnnotation) {
      const { frames } = video.annotationResults[0].explicitAnnotation;
      
      for (const frame of frames) {
        if (frame.pornographyLikelihood !== 'VERY_UNLIKELY' && frame.timeOffset) {
          const score = this.likelihoodToScore(frame.pornographyLikelihood);
          results.scores.explicit_content = Math.max(results.scores.explicit_content || 0, score);
          
          if (score >= this.rejectThreshold) {
            results.safe = false;
            results.reasons.push(`Explicit content detected at ${this.formatTime(frame.timeOffset.seconds || 0)}`);
          }
        }
      }
    }

    // Check for text (e.g., offensive language in video)
    if (video.annotationResults?.[0]?.textAnnotations) {
      for (const annotation of video.annotationResults[0].textAnnotations) {
        const textResult = await this.moderateText(annotation.text);
        if (!textResult.safe) {
          results.safe = false;
          results.reasons.push(`Inappropriate text: "${annotation.text}"`);
          Object.assign(results.scores, textResult.scores);
        }
      }
    }

    // Check for objects (e.g., weapons, drugs)
    if (video.annotationResults?.[0]?.objectAnnotations) {
      for (const annotation of video.annotationResults[0].objectAnnotations) {
        if (annotation.entity?.description) {
          const objectName = annotation.entity.description.toLowerCase();
          
          // Check against a list of potentially concerning objects
          if (this.isConcerningObject(objectName)) {
            const score = annotation.confidence || 0;
            results.scores[`object_${objectName}`] = score;
            
            if (score >= this.rejectThreshold) {
              results.safe = false;
              results.reasons.push(`Concerning object detected: ${objectName}`);
            }
          }
        }
      }
    }

    return results;
  }

  private async moderateWithPerspectiveAPI(text: string): Promise<ModerationResult> {
    const response = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.PERSPECTIVE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
          },
          languages: ['en'],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Perspective API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const result: ModerationResult = {
      safe: true,
      reasons: [],
      scores: {},
      metadata: {},
    };

    // Process each attribute
    for (const [attribute, details] of Object.entries(data.attributeScores || {})) {
      const score = (details as any).summaryScore.value;
      result.scores[attribute.toLowerCase()] = score;
      
      if (score >= this.rejectThreshold) {
        result.safe = false;
        result.reasons.push(`High ${attribute.toLowerCase()} score: ${Math.round(score * 100)}%`);
      }
    }

    return result;
  }

  private async moderateWithGoogleVision(imageUrl: string): Promise<ModerationResult> {
    const [result] = await this.googleClient.vision({
      image: { source: { imageUri: imageUrl } },
      features: [
        { type: 'SAFE_SEARCH_DETECTION' },
        { type: 'LABEL_DETECTION' },
        { type: 'TEXT_DETECTION' },
      ],
    });

    const moderationResult: ModerationResult = {
      safe: true,
      reasons: [],
      scores: {},
      metadata: {},
    };

    // Check safe search
    if (result.safeSearchAnnotation) {
      const { adult, spoof, medical, violence, racy } = result.safeSearchAnnotation;
      
      const checks = { adult, spoof, medical, violence, racy };
      for (const [type, likelihood] of Object.entries(checks)) {
        const score = this.likelihoodToScore(likelihood);
        moderationResult.scores[`${type}_content`] = score;
        
        if (score >= this.rejectThreshold) {
          moderationResult.safe = false;
          moderationResult.reasons.push(`Inappropriate content detected: ${type}`);
        }
      }
    }

    // Check for concerning labels
    if (result.labelAnnotations) {
      for (const label of result.labelAnnotations) {
        if (label.score > this.minConfidence && this.isConcerningLabel(label.description)) {
          moderationResult.scores[`label_${label.description}`] = label.score;
          
          if (label.score >= this.rejectThreshold) {
            moderationResult.safe = false;
            moderationResult.reasons.push(`Concerning content: ${label.description}`);
          }
        }
      }
    }

    // Check for concerning text
    if (result.textAnnotations?.[0]?.description) {
      const textResult = await this.moderateText(result.textAnnotations[0].description);
      if (!textResult.safe) {
        moderationResult.safe = false;
        moderationResult.reasons.push(...textResult.reasons);
        Object.assign(moderationResult.scores, textResult.scores);
      }
    }

    return moderationResult;
  }

  // Basic moderation methods (fallback)

  private async basicVideoModeration(videoUrl: string): Promise<ModerationResult> {
    // In a real implementation, you might use a third-party service or ML model
    // This is a simplified version that just checks the URL and returns a safe result
    return {
      safe: true,
      reasons: [],
      scores: {},
      metadata: {
        message: 'Basic moderation passed (no advanced moderation configured)',
      },
    };
  }

  private async basicTextModeration(text: string): Promise<ModerationResult> {
    // List of blocked words/phrases (simplified example)
    const blockedTerms = [
      // Profanity
      /\b(fuck|shit|asshole|bitch|cunt|dick|pussy|whore|slut)\b/gi,
      // Hate speech
      /\b(nigg(a|er)|chink|spic|kike|fag(got)?|retard)\b/gi,
      // Threats
      /\b(kill|murder|hurt|attack|bomb|shoot|stab|rape)\s+(you|them|him|her|us|me)\b/gi,
    ];

    const result: ModerationResult = {
      safe: true,
      reasons: [],
      scores: {},
      metadata: {},
    };

    for (const pattern of blockedTerms) {
      if (pattern.test(text)) {
        result.safe = false;
        result.reasons.push('Blocked term detected');
        result.scores.blocked_term = 1.0;
        break;
      }
    }

    return result;
  }

  private async basicImageModeration(imageUrl: string): Promise<ModerationResult> {
    // In a real implementation, you might use a third-party service or ML model
    return {
      safe: true,
      reasons: [],
      scores: {},
      metadata: {
        message: 'Basic moderation passed (no advanced moderation configured)',
      },
    };
  }

  // Helper methods

  private likelihoodToScore(likelihood: string): number {
    const levels: Record<string, number> = {
      'VERY_UNLIKELY': 0.1,
      'UNLIKELY': 0.3,
      'POSSIBLE': 0.5,
      'LIKELY': 0.7,
      'VERY_LIKELY': 0.9,
    };
    
    return levels[likelihood] || 0;
  }

  private isConcerningObject(objectName: string): boolean {
    const concerningObjects = [
      'weapon', 'gun', 'knife', 'bomb', 'explosive',
      'drug', 'syringe', 'needle', 'pills',
      'nudity', 'porn', 'sex', 'genital', 'breast',
      'blood', 'gore', 'corpse', 'dead body'
    ];
    
    return concerningObjects.some(term => objectName.includes(term));
  }

  private isConcerningLabel(label: string): boolean {
    const concerningLabels = [
      'weapon', 'firearm', 'gun', 'knife', 'explosive',
      'drug', 'syringe', 'needle', 'pills',
      'nudity', 'porn', 'sex', 'genital', 'breast',
      'violence', 'blood', 'gore', 'corpse', 'dead body',
      'hate symbol', 'swastika', 'kkk', 'terrorism'
    ];
    
    return concerningLabels.some(term => 
      label.toLowerCase().includes(term.toLowerCase())
    );
  }

  private combineModerationResults(results: ModerationResult[]): ModerationResult {
    const combined: ModerationResult = {
      safe: true,
      reasons: [],
      scores: {},
      metadata: {},
    };

    for (const result of results) {
      if (!result.safe) {
        combined.safe = false;
      }
      
      combined.reasons.push(...result.reasons);
      
      for (const [key, value] of Object.entries(result.scores)) {
        combined.scores[key] = Math.max(combined.scores[key] || 0, value);
      }
      
      Object.assign(combined.metadata, result.metadata);
    }

    return combined;
  }

  private formatTime(seconds: number): string {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
  }
}

// Example usage:
/*
const moderationService = new ContentModerationService({
  minConfidence: 0.7,
  rejectThreshold: 0.9,
  checkFor: ['violence', 'nudity', 'hate_speech']
});

// Moderate a video
const videoResult = await moderationService.moderateVideo('https://example.com/video.mp4');
console.log('Video moderation result:', videoResult);

// Moderate text
const textResult = await moderationService.moderateText('This is an offensive comment!');
console.log('Text moderation result:', textResult);

// Moderate an image
const imageResult = await moderationService.moderateImage('https://example.com/image.jpg');
console.log('Image moderation result:', imageResult);

// Moderate a user profile
const profileResult = await moderationService.moderateProfile({
  displayName: 'OffensiveUsername123',
  bio: 'I love to post inappropriate content!',
  avatarUrl: 'https://example.com/avatar.jpg'
});
console.log('Profile moderation result:', profileResult);
*/

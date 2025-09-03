import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { VideoProcessingService } from '@/services/video-processing';
import { ContentModerationService } from '@/services/content-moderation';
import { FileUploadService } from '@/lib/file-upload';
import { createApiHandler } from '@/lib/api-handler';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Initialize services
const fileUploadService = new FileUploadService({
  bucketName: process.env.S3_BUCKET_NAME!,
  region: process.env.S3_REGION!,
  accessKeyId: process.env.S3_ACCESS_KEY!,
  secretAccessKey: process.env.S3_SECRET_KEY!,
  cdnUrl: process.env.CDN_URL,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/x-matroska',
  ],
});

const videoService = new VideoProcessingService({
  tempDir: './tmp',
  fileUploadService,
  outputFormats: [
    {
      format: 'mp4',
      resolution: '1920x1080',
      videoBitrate: '4000k',
      audioBitrate: '192k',
    },
    {
      format: 'mp4',
      resolution: '1280x720',
      videoBitrate: '2500k',
      audioBitrate: '128k',
    },
    {
      format: 'webm',
      resolution: '1280x720',
      videoBitrate: '2000k',
      audioBitrate: '128k',
    },
  ],
  thumbnailOptions: {
    count: 3,
    width: 320,
    height: 180,
    quality: 85,
  },
});

const moderationService = new ContentModerationService({
  perspectiveApiKey: process.env.PERSPECTIVE_API_KEY,
  blockedWords: process.env.BLOCKED_WORDS?.split(',') || [],
  blockedDomains: process.env.BLOCKED_DOMAINS?.split(',') || [],
  toxicityThreshold: parseFloat(process.env.TOXICITY_THRESHOLD || '0.7'),
  spamThreshold: parseFloat(process.env.SPAM_THRESHOLD || '0.7'),
  explicitContentThreshold: parseFloat(process.env.EXPLICIT_CONTENT_THRESHOLD || '0.7'),
  moderateImages: process.env.MODERATE_IMAGES === 'true',
  moderateVideos: process.env.MODERATE_VIDEOS === 'true',
});

// Schema for video upload request
const videoUploadSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  allowEmbedding: z.boolean().default(true),
  tags: z.array(z.string().max(20)).max(10).optional(),
  category: z.string().optional(),
  language: z.string().default('en'),
});

// Create API handler
const api = createApiHandler()
  // Add authentication middleware
  .use(async (req) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Add user to request metadata for handlers to access
    req.metadata = {
      ...req.metadata,
      userId: session.user.id,
      user: session.user,
    };
  })
  // Add rate limiting
  .use(rateLimit({
    type: 'auth',
    identifier: 'userId',
  }));

// GET /api/videos - List videos
api.get('/api/videos', async (req, { userId }) => {
  try {
    // In a real implementation, this would query the database
    // For now, we'll return a placeholder response
    return NextResponse.json({
      videos: [],
      page: 1,
      pageSize: 10,
      total: 0,
    });
  } catch (error) {
    logger.error('Error listing videos', { error, userId });
    throw new Error('Failed to list videos');
  }
}, {
  schema: {
    query: z.object({
      page: z.string().regex(/^\d+$/).transform(Number).default('1'),
      limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
      sort: z.enum(['newest', 'popular', 'trending']).default('newest'),
      category: z.string().optional(),
      search: z.string().optional(),
    }),
  },
});

// POST /api/videos - Upload a new video
api.post('/api/videos', async (req, { userId, user }) => {
  try {
    // Handle file upload
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const metadata = JSON.parse(formData.get('metadata') as string || '{}');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate metadata
    const validation = videoUploadSchema.safeParse(metadata);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid metadata',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { title, description, tags = [], category, language } = validation.data;

    // Check file size and type
    if (file.size > 100 * 1024 * 1024) { // 100MB
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed size of 100MB' },
        { status: 400 }
      );
    }

    // Process the video
    const result = await videoService.processVideo(file, {
      userId,
      folder: 'videos',
      metadata: {
        title,
        description,
        tags: tags.join(','),
        category,
        language,
        userId,
        userName: user.name || 'Unknown',
        userEmail: user.email || '',
      },
    });

    // Moderate video content
    const moderationResult = await moderationService.moderateVideo(result.original.url, {
      userId,
      videoId: result.original.key,
      title,
      description,
      tags,
    });

    // If content is not approved, remove the uploaded files
    if (!moderationResult.approved) {
      // Delete all uploaded files
      await Promise.all([
        fileUploadService.deleteFile(result.original.key),
        ...result.formats.map(format => fileUploadService.deleteFile(format.key)),
        ...result.thumbnails.map(thumb => fileUploadService.deleteFile(thumb.key)),
      ]);

      return NextResponse.json(
        { 
          error: 'Content does not meet community guidelines',
          reasons: moderationResult.reasons,
        },
        { status: 400 }
      );
    }

    // In a real implementation, save video metadata to the database
    const videoRecord = {
      id: result.original.key,
      title,
      description,
      tags,
      category,
      language,
      userId,
      status: 'processed',
      moderationStatus: moderationResult.approved ? 'approved' : 'rejected',
      moderationReasons: moderationResult.reasons,
      moderationScores: moderationResult.scores,
      duration: result.metadata.duration,
      width: result.metadata.width,
      height: result.metadata.height,
      aspectRatio: result.metadata.aspectRatio,
      originalUrl: result.original.url,
      formats: result.formats.map(format => ({
        url: format.url,
        format: format.format,
        resolution: format.resolution,
        size: format.size,
      })),
      thumbnails: result.thumbnails.map(thumb => ({
        url: thumb.url,
        timestamp: thumb.timestamp,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // TODO: Save videoRecord to database

    return NextResponse.json({
      success: true,
      data: videoRecord,
      moderation: {
        approved: moderationResult.approved,
        reasons: moderationResult.reasons,
        scores: moderationResult.scores,
      },
    });

  } catch (error) {
    logger.error('Error uploading video', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
    });
    
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}, {
  // Disable body parsing to handle file uploads
  bodyParser: false,
  // Set higher timeout for large file uploads (5 minutes)
  timeout: 5 * 60 * 1000,
});

// GET /api/videos/[id] - Get video by ID
api.get('/api/videos/:id', async (req, { userId }, { params }) => {
  try {
    const { id } = params;
    
    // In a real implementation, this would query the database
    // For now, we'll return a placeholder response
    return NextResponse.json({
      id,
      title: 'Sample Video',
      description: 'This is a sample video',
      userId,
      status: 'processed',
      duration: 120,
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      originalUrl: 'https://example.com/videos/sample.mp4',
      formats: [
        {
          url: 'https://example.com/videos/sample-1080p.mp4',
          format: 'mp4',
          resolution: '1920x1080',
          size: 1024 * 1024 * 10, // 10MB
        },
        {
          url: 'https://example.com/videos/sample-720p.mp4',
          format: 'mp4',
          resolution: '1280x720',
          size: 1024 * 1024 * 5, // 5MB
        },
      ],
      thumbnails: [
        {
          url: 'https://example.com/thumbnails/sample-1.jpg',
          timestamp: 0,
        },
        {
          url: 'https://example.com/thumbnails/sample-2.jpg',
          timestamp: 60,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting video', { error, videoId: params.id, userId });
    throw new Error('Failed to get video');
  }
});

// Export the handlers
export const GET = api.getHandler();
export const POST = api.getHandler();

// Add CORS headers
export const OPTIONS = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { VideoProcessingService } from '@/server/services/video-processing';
import { db } from '@/server/db';
import { videos } from '@/server/db/schema';
import { logger } from '@/server/utils/logger';
import { InternalServerError, UnauthorizedError, BadRequestError } from '@/server/middleware/error-handler';

// Disable body parsing, we'll handle the raw body
// This is important for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Maximum file size: 2GB
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/x-matroska',
];

/**
 * POST /api/videos/upload
 * Upload and process a video file
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Check if user is authenticated
  if (!session?.user?.id) {
    throw new UnauthorizedError('You must be logged in to upload videos');
  }

  // Create a temporary directory for uploads
  const uploadDir = join(process.cwd(), 'temp', 'uploads');
  await fsPromises.mkdir(uploadDir, { recursive: true });

  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const isPublic = formData.get('isPublic') === 'true';

    // Validate inputs
    if (!file || !(file instanceof File)) {
      throw new BadRequestError('No file provided or invalid file type');
    }

    if (!title || title.trim().length < 3) {
      throw new BadRequestError('Title must be at least 3 characters long');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestError(`File size exceeds the maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new BadRequestError(`Unsupported file type: ${file.type}`);
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = join(uploadDir, fileName);

    // Convert the file to a buffer and save it
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create video record in database
    const [video] = await db.insert(videos).values({
      id: `vid_${uuidv4()}`,
      title,
      description: description || null,
      userId: session.user.id,
      status: 'processing',
      isPublic,
      duration: 0, // Will be updated after processing
      thumbnailUrl: null, // Will be updated after processing
      videoUrl: null, // Will be updated after processing
      metadata: {},
    }).returning();

    // Process the video in the background
    this.processVideoInBackground(filePath, video.id, session.user.id);

    return NextResponse.json({
      success: true,
      videoId: video.id,
      status: 'processing',
      message: 'Video upload started. You will be notified when processing is complete.',
    });

  } catch (error) {
    logger.error('Video upload failed', { error, userId: session.user.id });
    
    if (error instanceof BadRequestError || error instanceof UnauthorizedError) {
      throw error;
    }
    
    throw new InternalServerError('Failed to process video upload');
  }
}

// Process video in the background
async function processVideoInBackground(filePath: string, videoId: string, userId: string) {
  const videoProcessing = new VideoProcessingService();
  
  try {
    // Process the video
    const result = await videoProcessing.processVideo(filePath, {
      resolutions: [
        { width: 1920, height: 1080, bitrate: '5000k' },
        { width: 1280, height: 720, bitrate: '2500k' },
        { width: 854, height: 480, bitrate: '1000k' },
      ],
      thumbnailCount: 3,
      format: 'hls',
      deleteSourceAfterProcessing: true,
    });

    // Get the first thumbnail URL
    const thumbnailUrl = result.uploadResults.find(file => 
      file.file.includes('thumbnail-1.jpg')
    )?.url || null;

    // Get the master playlist URL
    const videoUrl = result.manifest.hls;

    // Update video record with processing results
    await db.update(videos)
      .set({
        status: 'completed',
        duration: Math.round(result.metadata.duration),
        thumbnailUrl,
        videoUrl,
        metadata: {
          ...result.metadata,
          processingJobId: result.jobId,
          processedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId));

    // TODO: Send notification to user that video processing is complete
    logger.info('Video processing completed', { videoId, userId });

  } catch (error) {
    logger.error('Video processing failed', { error, videoId, userId });
    
    // Update video record with error status
    await db.update(videos)
      .set({
        status: 'failed',
        metadata: {
          error: error.message,
          failedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(videos.id, videoId));

    // TODO: Send error notification to user
  } finally {
    // Clean up the uploaded file if it still exists
    try {
      await fsPromises.unlink(filePath).catch(() => {});
    } catch (error) {
      logger.warn('Failed to clean up uploaded file', { filePath, error });
    }
  }
}

// Add missing fsPromises import
import { promises as fsPromises } from 'fs';
import { eq } from 'drizzle-orm';

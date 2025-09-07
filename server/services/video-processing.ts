import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { FileUploadService, UploadedFile } from '../lib/file-upload';
import { logger } from '../utils/logger';
import { InternalServerError } from '../middleware/error-handler';

const execPromise = promisify(exec);

interface VideoProcessingConfig {
  tempDir: string;
  ffmpegPath?: string;
  ffprobePath?: string;
  fileUploadService: FileUploadService;
  outputFormats: {
    format: string;
    resolution: string;
    videoBitrate: string;
    audioBitrate: string;
  }[];
  thumbnailOptions: {
    count: number;
    width: number;
    height: number;
    quality: number;
  };
}

export interface ProcessedVideo {
  original: UploadedFile;
  formats: Array<{
    format: string;
    resolution: string;
    url: string;
    key: string;
    size: number;
    duration: number;
  }>;
  thumbnails: Array<{
    url: string;
    key: string;
    timestamp: number;
  }>;
  metadata: {
    width: number;
    height: number;
    duration: number;
    aspectRatio: string;
    codec: string;
    size: number;
    mimeType: string;
  };
}

export class VideoProcessingService {
  private config: Required<VideoProcessingConfig>;
  private isFFmpegAvailable: boolean = false;
  private isFFprobeAvailable: boolean = false;

  constructor(config: VideoProcessingConfig) {
    this.config = {
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
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
      ...config,
    };

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.config.tempDir)) {
      fs.mkdirSync(this.config.tempDir, { recursive: true });
    }

    // Check if FFmpeg and FFprobe are available
    this.checkDependencies();
  }

  private async checkDependencies() {
    try {
      await execPromise(`${this.config.ffmpegPath} -version`);
      this.isFFmpegAvailable = true;
      
      await execPromise(`${this.config.ffprobePath} -version`);
      this.isFFprobeAvailable = true;
    } catch (error) {
      logger.warn('FFmpeg/FFprobe not available. Video processing will be disabled.');
      this.isFFmpegAvailable = false;
      this.isFFprobeAvailable = false;
    }
  }

  private async getVideoMetadata(filePath: string) {
    try {
      const { stdout } = await execPromise(
        `${this.config.ffprobePath} -v error -show_entries stream=width,height,duration,r_frame_rate,codec_name -show_format -of json "${filePath}"`
      );
      
      const metadata = JSON.parse(stdout);
      const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
      const format = metadata.format;
      
      const [numerator, denominator] = videoStream.r_frame_rate?.split('/').map(Number) || [0, 0];
      const frameRate = denominator ? (numerator / denominator).toFixed(2) : '0';
      
      return {
        width: videoStream.width,
        height: videoStream.height,
        duration: parseFloat(format.duration || '0'),
        aspectRatio: this.calculateAspectRatio(videoStream.width, videoStream.height),
        codec: videoStream.codec_name,
        audioCodec: audioStream?.codec_name,
        format: format.format_name,
        size: parseInt(format.size || '0'),
        bitrate: parseInt(format.bit_rate || '0'),
        frameRate,
        mimeType: this.getMimeType(format.format_name),
      };
    } catch (error) {
      logger.error('Error getting video metadata', { error });
      throw new InternalServerError('Failed to process video metadata');
    }
  }

  private calculateAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  }

  private getMimeType(format: string): string {
    const formats: Record<string, string> = {
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'mkv': 'video/x-matroska',
      'm3u8': 'application/x-mpegURL',
      'ts': 'video/MP2T',
    };
    
    return formats[format.toLowerCase()] || 'application/octet-stream';
  }

  private async transcodeVideo(
    inputPath: string,
    outputPath: string,
    options: {
      resolution: string;
      videoBitrate: string;
      audioBitrate: string;
      format: string;
    }
  ) {
    const { resolution, videoBitrate, audioBitrate, format } = options;
    const [width, height] = resolution.split('x').map(Number);
    
    const args = [
      `-i "${inputPath}"`,
      '-y', // Overwrite output files
      `-c:v ${format === 'webm' ? 'libvpx-vp9' : 'libx264'}`,
      `-b:v ${videoBitrate}`,
      `-vf scale=${width}:-2`, // Maintain aspect ratio, ensure even height
      `-c:a ${format === 'webm' ? 'libopus' : 'aac'}`,
      `-b:a ${audioBitrate}`,
      '-movflags +faststart', // For MP4 streaming
      '-preset fast', // Balance between speed and compression
      '-f', format,
      `"${outputPath}"`,
    ];

    try {
      await execPromise(`${this.config.ffmpegPath} ${args.join(' ')}`);
      return outputPath;
    } catch (error) {
      logger.error('Error transcoding video', { error, inputPath, outputPath, options });
      throw new InternalServerError('Failed to transcode video');
    }
  }

  private async generateThumbnails(
    inputPath: string,
    outputDir: string,
    count: number,
    width: number,
    quality: number
  ) {
    const thumbnails: Array<{ path: string; timestamp: number }> = [];
    const metadata = await this.getVideoMetadata(inputPath);
    const interval = Math.max(1, Math.floor(metadata.duration / (count + 1)));

    try {
      for (let i = 1; i <= count; i++) {
        const timestamp = i * interval;
        const outputPath = path.join(outputDir, `thumbnail-${i}.jpg`);
        
        await execPromise(
          `${this.config.ffmpegPath} -ss ${timestamp} -i "${inputPath}" ` +
          `-vframes 1 -q:v ${quality} -vf "scale=${width}:-1" "${outputPath}"`
        );

        thumbnails.push({ path: outputPath, timestamp });
      }
      
      return thumbnails;
    } catch (error) {
      logger.error('Error generating thumbnails', { error, inputPath });
      throw new InternalServerError('Failed to generate thumbnails');
    }
  }

  async processVideo(
    file: File | Buffer | string,
    options: {
      userId: string;
      folder?: string;
      metadata?: Record<string, string>;
      generateThumbnails?: boolean;
    }
  ): Promise<ProcessedVideo> {
    if (!this.isFFmpegAvailable || !this.isFFprobeAvailable) {
      throw new InternalServerError('Video processing service is not available');
    }

    const { userId, folder = 'videos', metadata = {}, generateThumbnails = true } = options;
    const tempDir = path.join(this.config.tempDir, uuidv4());
    const originalPath = path.join(tempDir, 'original');
    const outputDir = path.join(tempDir, 'output');
    const thumbsDir = path.join(tempDir, 'thumbs');

    try {
      // Create necessary directories
      fs.mkdirSync(tempDir, { recursive: true });
      fs.mkdirSync(outputDir, { recursive: true });
      fs.mkdirSync(thumbsDir, { recursive: true });

      // Save the original file
      let fileName = 'video';
      let fileExt = 'mp4';
      
      if (typeof file === 'string') {
        // If it's a URL or path
        const url = new URL(file);
        fileName = path.basename(url.pathname);
        fileExt = path.extname(fileName).slice(1) || 'mp4';
        // TODO: Download the file from URL
      } else if (file instanceof File) {
        fileName = file.name;
        fileExt = file.name.split('.').pop() || 'mp4';
        const arrayBuffer = await file.arrayBuffer();
        fs.writeFileSync(originalPath, Buffer.from(arrayBuffer));
      } else if (Buffer.isBuffer(file)) {
        fs.writeFileSync(originalPath, file);
      } else {
        throw new Error('Invalid file type');
      }

      // Get video metadata
      const videoMetadata = await this.getVideoMetadata(originalPath);

      // Process video into different formats
      const formatPromises = this.config.outputFormats.map(async (format) => {
        const outputFileName = `video_${format.resolution}.${format.format}`;
        const outputPath = path.join(outputDir, outputFileName);
        
        await this.transcodeVideo(originalPath, outputPath, format);
        
        const stats = fs.statSync(outputPath);
        
        // Upload the processed file
        const uploadedFile = await this.config.fileUploadService.uploadFile(
          fs.readFileSync(outputPath),
          {
            fileName: outputFileName,
            folder: path.join(folder, userId, 'formats'),
            mimeType: this.getMimeType(format.format),
            metadata: {
              ...metadata,
              userId,
              format: format.format,
              resolution: format.resolution,
              originalFileName: fileName,
            },
          }
        );

        return {
          format: format.format,
          resolution: format.resolution,
          url: uploadedFile.url,
          key: uploadedFile.key,
          size: stats.size,
          duration: videoMetadata.duration,
        };
      });

      // Generate thumbnails if needed
      let thumbnails: Array<{ url: string; key: string; timestamp: number }> = [];
      
      if (generateThumbnails) {
        const thumbnailFiles = await this.generateThumbnails(
          originalPath,
          thumbsDir,
          this.config.thumbnailOptions.count,
          this.config.thumbnailOptions.width,
          this.config.thumbnailOptions.quality
        );

        const thumbnailPromises = thumbnailFiles.map(async (thumb, index) => {
          const thumbFileName = `thumbnail_${index + 1}.jpg`;
          const thumbFile = fs.readFileSync(thumb.path);
          
          const uploadedThumb = await this.config.fileUploadService.uploadFile(thumbFile, {
            fileName: thumbFileName,
            folder: path.join(folder, userId, 'thumbnails'),
            mimeType: 'image/jpeg',
            metadata: {
              ...metadata,
              userId,
              timestamp: thumb.timestamp.toString(),
              originalFileName: fileName,
            },
          });

          return {
            url: uploadedThumb.url,
            key: uploadedThumb.key,
            timestamp: thumb.timestamp,
          };
        });

        thumbnails = await Promise.all(thumbnailPromises);
      }

      // Upload the original file
      const originalFile = await this.config.fileUploadService.uploadFile(
        fs.readFileSync(originalPath),
        {
          fileName: `original.${fileExt}`,
          folder: path.join(folder, userId, 'original'),
          mimeType: videoMetadata.mimeType,
          metadata: {
            ...metadata,
            userId,
            originalFileName: fileName,
            ...videoMetadata,
          },
        }
      );

      // Wait for all formats to be processed
      const formats = await Promise.all(formatPromises);

      return {
        original: originalFile,
        formats,
        thumbnails,
        metadata: {
          width: videoMetadata.width,
          height: videoMetadata.height,
          duration: videoMetadata.duration,
          aspectRatio: videoMetadata.aspectRatio,
          codec: videoMetadata.codec,
          size: videoMetadata.size,
          mimeType: videoMetadata.mimeType,
        },
      };
    } catch (error) {
      logger.error('Error processing video', { error, userId });
      throw new InternalServerError('Failed to process video');
    } finally {
      // Clean up temporary files
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (error) {
        logger.error('Error cleaning up temporary files', { error });
      }
    }
  }
}

// Example usage:
/*
const fileUploadService = new FileUploadService({
  bucketName: process.env.S3_BUCKET_NAME!,
  region: process.env.S3_REGION!,
  accessKeyId: process.env.S3_ACCESS_KEY!,
  secretAccessKey: process.env.S3_SECRET_KEY!,
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
  ],
  thumbnailOptions: {
    count: 3,
    width: 320,
    height: 180,
    quality: 85,
  },
});

// Process a video file
const result = await videoService.processVideo(file, {
  userId: 'user123',
  folder: 'videos',
  metadata: {
    title: 'My Video',
    description: 'A test video',
  },
});

console.log('Processed video:', result);
*/

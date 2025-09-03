import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../../utils/logger';
import { InternalServerError } from '../../middleware/error-handler';

const exec = promisify(require('child_process').exec);
const fsPromises = fs.promises;

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  codec: string;
  format: string;
  framerate: number;
  size: number;
}

interface VideoProcessingOptions {
  resolutions?: Array<{ width: number; height: number; bitrate: string }>;
  thumbnailCount?: number;
  outputDir?: string;
  format?: 'hls' | 'dash' | 'mp4';
  deleteSourceAfterProcessing?: boolean;
}

export class VideoProcessingService {
  private s3Client: S3Client;
  private readonly defaultResolutions = [
    { width: 1920, height: 1080, bitrate: '5000k' }, // 1080p
    { width: 1280, height: 720, bitrate: '2500k' },  // 720p
    { width: 854, height: 480, bitrate: '1000k' },   // 480p
    { width: 640, height: 360, bitrate: '600k' },    // 360p
  ];

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    });
  }

  /**
   * Process a video file with the given options
   */
  async processVideo(
    inputPath: string,
    options: VideoProcessingOptions = {}
  ) {
    const jobId = uuidv4();
    const outputDir = options.outputDir || path.join(process.cwd(), 'temp', jobId);
    const outputFormats = options.format ? [options.format] : ['hls', 'dash'];
    
    try {
      // Ensure output directory exists
      await fsPromises.mkdir(outputDir, { recursive: true });

      // 1. Extract metadata
      const metadata = await this.extractMetadata(inputPath);
      
      // 2. Generate thumbnails
      const thumbnails = await this.generateThumbnails(
        inputPath, 
        outputDir, 
        options.thumbnailCount || 3
      );

      // 3. Process video for each format
      const processedFiles = [];
      for (const format of outputFormats) {
        const result = await this.encodeVideo(
          inputPath, 
          outputDir, 
          { 
            ...options, 
            format,
            resolutions: options.resolutions || this.defaultResolutions 
          }
        );
        processedFiles.push(...result.files);
      }

      // 4. Upload to S3 if configured
      let uploadResults = [];
      if (process.env.S3_BUCKET_NAME) {
        uploadResults = await this.uploadToS3(processedFiles, `videos/${jobId}`);
      }

      // 5. Clean up if needed
      if (options.deleteSourceAfterProcessing) {
        await fsPromises.unlink(inputPath).catch(err => 
          logger.warn(`Failed to delete source file: ${err.message}`)
        );
      }

      return {
        jobId,
        metadata,
        thumbnails,
        processedFiles,
        uploadResults,
        manifest: {
          hls: outputFormats.includes('hls') ? 
            `${process.env.CDN_URL || ''}/videos/${jobId}/master.m3u8` : null,
          dash: outputFormats.includes('dash') ? 
            `${process.env.CDN_URL || ''}/videos/${jobId}/manifest.mpd` : null,
        },
      };
    } catch (error) {
      logger.error('Video processing failed', { error, jobId });
      throw new InternalServerError('Failed to process video');
    } finally {
      // Clean up temporary files in the background
      if (outputDir.includes('temp/')) {
        fsPromises.rm(outputDir, { recursive: true, force: true })
          .catch(err => logger.warn('Failed to clean up temp directory', { error: err }));
      }
    }
  }

  /**
   * Extract metadata from video file
   */
  private async extractMetadata(filePath: string): Promise<VideoMetadata> {
    try {
      const { stdout } = await exec(`ffprobe -v error -show_entries format=size,duration,bit_rate:stream=width,height,codec_name,r_frame_rate -of json "${filePath}"`);
      const data = JSON.parse(stdout);
      
      const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
      const format = data.format;
      
      return {
        width: parseInt(videoStream.width),
        height: parseInt(videoStream.height),
        duration: parseFloat(format.duration),
        bitrate: parseInt(format.bit_rate) / 1000, // Convert to kbps
        codec: videoStream.codec_name,
        format: format.format_name,
        framerate: this.parseFramerate(videoStream.r_frame_rate),
        size: parseInt(format.size)
      };
    } catch (error) {
      logger.error('Failed to extract video metadata', { error });
      throw new InternalServerError('Failed to extract video metadata');
    }
  }

  /**
   * Generate thumbnails from video
   */
  private async generateThumbnails(
    inputPath: string, 
    outputDir: string,
    count: number
  ): Promise<string[]> {
    const thumbnails: string[] = [];
    const duration = (await this.extractMetadata(inputPath)).duration;
    
    // Always include the first frame
    const positions = [0];
    
    // Distribute remaining thumbnails throughout the video
    for (let i = 1; i < count; i++) {
      positions.push(Math.floor((duration / count) * i));
    }

    const promises = positions.map(async (position, index) => {
      const outputPath = path.join(outputDir, `thumbnail-${index + 1}.jpg`);
      
      await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-ss', position.toString(),
          '-i', inputPath,
          '-vframes', '1',
          '-q:v', '2',
          '-y',
          outputPath
        ]);

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            thumbnails.push(outputPath);
            resolve(outputPath);
          } else {
            reject(new Error(`FFmpeg process exited with code ${code}`));
          }
        });

        ffmpeg.stderr.on('data', (data) => {
          logger.debug(`FFmpeg stderr: ${data}`);
        });
      });

      return outputPath;
    });

    return Promise.all(promises);
  }

  /**
   * Encode video to different formats and resolutions
   */
  private async encodeVideo(
    inputPath: string,
    outputDir: string,
    options: Required<Pick<VideoProcessingOptions, 'resolutions' | 'format'>> & VideoProcessingOptions
  ) {
    const { format, resolutions } = options;
    const outputName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, format);
    
    // Create format-specific output directory
    await fsPromises.mkdir(outputPath, { recursive: true });

    const files: string[] = [];
    
    if (format === 'hls') {
      await this.encodeHLS(inputPath, outputPath, outputName, resolutions);
      files.push(path.join(outputPath, 'master.m3u8'));
    } else if (format === 'dash') {
      await this.encodeDASH(inputPath, outputPath, outputName, resolutions);
      files.push(path.join(outputPath, 'manifest.mpd'));
    } else {
      // MP4 fallback
      const outputFile = await this.encodeMP4(inputPath, outputPath, outputName, resolutions[0]);
      files.push(outputFile);
    }

    // Add all generated files to the list
    const dirFiles = await fsPromises.readdir(outputPath);
    dirFiles.forEach(file => {
      if (!files.includes(file)) {
        files.push(path.join(outputPath, file));
      }
    });

    return { files };
  }

  /**
   * Encode video to HLS format
   */
  private async encodeHLS(
    inputPath: string,
    outputPath: string,
    outputName: string,
    resolutions: Array<{ width: number; height: number; bitrate: string }>
  ) {
    const args = [
      '-y',
      '-i', inputPath,
      '-preset', 'slow',
      '-g', '48',
      '-sc_threshold', '0',
      '-f', 'hls',
      '-hls_time', '6',
      '-hls_list_size', '0',
      '-hls_segment_type', 'mpegts',
      '-hls_flags', 'independent_segments',
      '-master_pl_name', 'master.m3u8',
    ];

    // Add video streams for each resolution
    resolutions.forEach((res, index) => {
      args.push(
        '-map', '0:v:0',
        '-s:v:' + index, `${res.width}x${res.height}`,
        '-c:v:' + index, 'libx264',
        '-b:v:' + index, res.bitrate,
        '-maxrate:' + index, res.bitrate,
        '-bufsize:' + index, (parseInt(res.bitrate) * 2) + 'k',
        '-hls_segment_filename', `${outputPath}/stream_${res.height}p_%03d.ts`,
        '-hls_playlist_type', 'vod',
        '-var_stream_map', `v:${index},a:${index} name:${res.height}p`
      );
    });

    // Add audio streams
    args.push(
      '-map', '0:a:0',
      '-c:a:0', 'aac',
      '-b:a:0', '128k',
      '-hls_segment_type', 'mpegts',
      '-hls_playlist_type', 'vod'
    );

    // Output file
    args.push(`${outputPath}/stream_%v.m3u8`);

    await this.executeFFmpeg(args);
  }

  /**
   * Encode video to DASH format
   */
  private async encodeDASH(
    inputPath: string,
    outputPath: string,
    outputName: string,
    resolutions: Array<{ width: number; height: number; bitrate: string }>
  ) {
    const args = [
      '-y',
      '-i', inputPath,
      '-preset', 'slow',
      '-g', '48',
      '-sc_threshold', '0',
      '-f', 'dash',
      '-use_template', '1',
      '-use_timeline', '1',
      '-seg_duration', '6',
      '-frag_duration', '6',
      '-frag_type', 'duration',
      '-init_seg_name', 'init-stream$RepresentationID$.$ext$',
      '-media_seg_name', 'chunk-stream$RepresentationID$-$Number%05d$.$ext$',
    ];

    // Add video streams for each resolution
    resolutions.forEach(res => {
      args.push(
        '-map', '0:v:0',
        '-s:v:' + res.height, `${res.width}x${res.height}`,
        '-c:v:' + res.height, 'libx264',
        '-b:v:' + res.height, res.bitrate,
        '-maxrate:' + res.height, res.bitrate,
        '-bufsize:' + res.height, (parseInt(res.bitrate) * 2) + 'k',
      );
    });

    // Add audio stream
    args.push(
      '-map', '0:a:0',
      '-c:a:0', 'aac',
      '-b:a:0', '128k',
    );

    // Output file
    args.push(`${outputPath}/manifest.mpd`);

    await this.executeFFmpeg(args);
  }

  /**
   * Encode video to MP4 format (single resolution)
   */
  private async encodeMP4(
    inputPath: string,
    outputPath: string,
    outputName: string,
    resolution: { width: number; height: number; bitrate: string }
  ): Promise<string> {
    const outputFile = path.join(outputPath, `${outputName}.mp4`);
    
    const args = [
      '-y',
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'slow',
      '-crf', '23',
      '-profile:v', 'high',
      '-level', '4.0',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-vf', `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`,
      outputFile
    ];

    await this.executeFFmpeg(args);
    return outputFile;
  }

  /**
   * Upload files to S3
   */
  private async uploadToS3(files: string[], prefix: string = '') {
    if (!process.env.S3_BUCKET_NAME) {
      logger.warn('S3 bucket not configured, skipping upload');
      return [];
    }

    const results = [];
    
    for (const filePath of files) {
      try {
        const fileContent = await fsPromises.readFile(filePath);
        const key = prefix ? `${prefix}/${path.basename(filePath)}` : path.basename(filePath);
        
        const command = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: this.getContentType(filePath),
          ACL: 'public-read',
        });

        await this.s3Client.send(command);
        
        results.push({
          file: filePath,
          key,
          url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`,
          status: 'success'
        });
      } catch (error) {
        logger.error('Failed to upload file to S3', { filePath, error });
        results.push({
          file: filePath,
          error: error.message,
          status: 'failed'
        });
      }
    }

    return results;
  }

  /**
   * Execute FFmpeg command
   */
  private executeFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args);
      
      ffmpeg.stderr.on('data', (data) => {
        // Log FFmpeg output for debugging
        logger.debug(`FFmpeg output: ${data}`);
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });
      
      ffmpeg.on('error', (err) => {
        reject(new Error(`FFmpeg error: ${err.message}`));
      });
    });
  }

  /**
   * Parse framerate string to number
   */
  private parseFramerate(framerate: string): number {
    if (!framerate) return 0;
    const [numerator, denominator] = framerate.split('/').map(Number);
    return denominator ? numerator / denominator : numerator;
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const types: Record<string, string> = {
      '.m3u8': 'application/x-mpegURL',
      '.mpd': 'application/dash+xml',
      '.mp4': 'video/mp4',
      '.ts': 'video/MP2T',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };
    return types[ext] || 'application/octet-stream';
  }
}

// Example usage:
/*
const processor = new VideoProcessingService();

// Process a video file
const result = await processor.processVideo('/path/to/input.mp4', {
  resolutions: [
    { width: 1920, height: 1080, bitrate: '5000k' },
    { width: 1280, height: 720, bitrate: '2500k' },
    { width: 854, height: 480, bitrate: '1000k' },
  ],
  thumbnailCount: 3,
  format: 'hls',
  deleteSourceAfterProcessing: true
});

console.log('Processing complete:', result);
*/

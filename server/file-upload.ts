
import AWS from 'aws-sdk';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
});

const s3 = new AWS.S3();

export interface UploadResult {
  original: {
    url: string;
    key: string;
    size: number;
  };
  formats?: Array<{
    url: string;
    key: string;
    resolution: string;
    size: number;
  }>;
  thumbnails?: Array<{
    url: string;
    key: string;
    size: string;
  }>;
}

export class FileUploadService {
  private bucketName: string;
  private cloudFrontUrl: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'makubang-media-bucket';
    this.cloudFrontUrl = process.env.CLOUDFRONT_URL || '';
  }

  // Configure multer for file uploads
  static getMulterConfig() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = file.mimetype.startsWith('video/') 
          ? process.env.VIDEO_UPLOAD_PATH || 'uploads/videos'
          : process.env.IMAGE_UPLOAD_PATH || 'uploads/images';
        
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    const fileFilter = (req: any, file: any, cb: any) => {
      if (file.mimetype.startsWith('video/')) {
        const allowedFormats = process.env.ALLOWED_VIDEO_FORMATS?.split(',') || ['mp4', 'mov', 'avi'];
        const ext = path.extname(file.originalname).slice(1).toLowerCase();
        if (allowedFormats.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error(`Invalid video format. Allowed: ${allowedFormats.join(', ')}`), false);
        }
      } else if (file.mimetype.startsWith('image/')) {
        const allowedFormats = process.env.ALLOWED_IMAGE_FORMATS?.split(',') || ['jpg', 'jpeg', 'png', 'webp'];
        const ext = path.extname(file.originalname).slice(1).toLowerCase();
        if (allowedFormats.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error(`Invalid image format. Allowed: ${allowedFormats.join(', ')}`), false);
        }
      } else {
        cb(new Error('Only video and image files are allowed'), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '100000000'), // 100MB default
      },
    });
  }

  // Upload video with processing
  async uploadVideo(filePath: string, userId: string): Promise<UploadResult> {
    try {
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(fileName);
      const baseName = path.basename(fileName, fileExtension);
      const uniqueId = uuidv4();

      // Upload original video
      const originalKey = `videos/${userId}/${uniqueId}/original${fileExtension}`;
      const originalUpload = await this.uploadToS3(filePath, originalKey, 'video');

      const result: UploadResult = {
        original: originalUpload,
        formats: [],
        thumbnails: [],
      };

      // Process video - create multiple formats for adaptive streaming
      const formats = [
        { resolution: '720p', width: 1280, height: 720, bitrate: '2000k' },
        { resolution: '480p', width: 854, height: 480, bitrate: '1000k' },
        { resolution: '360p', width: 640, height: 360, bitrate: '500k' },
      ];

      for (const format of formats) {
        try {
          const processedPath = await this.processVideoFormat(
            filePath, 
            format.width, 
            format.height, 
            format.bitrate,
            baseName
          );

          const formatKey = `videos/${userId}/${uniqueId}/${format.resolution}.mp4`;
          const formatUpload = await this.uploadToS3(processedPath, formatKey, 'video');

          result.formats!.push({
            ...formatUpload,
            resolution: format.resolution,
          });

          // Clean up processed file
          fs.unlinkSync(processedPath);
        } catch (error) {
          console.error(`Error processing ${format.resolution} format:`, error);
        }
      }

      // Generate thumbnails
      const thumbnailSizes = [
        { size: 'small', width: 320, height: 180 },
        { size: 'medium', width: 640, height: 360 },
        { size: 'large', width: 1280, height: 720 },
      ];

      for (const thumbSize of thumbnailSizes) {
        try {
          const thumbnailPath = await this.generateVideoThumbnail(
            filePath,
            thumbSize.width,
            thumbSize.height,
            baseName
          );

          const thumbnailKey = `thumbnails/${userId}/${uniqueId}/${thumbSize.size}.jpg`;
          const thumbnailUpload = await this.uploadToS3(thumbnailKey, thumbnailKey, 'image');

          result.thumbnails!.push({
            ...thumbnailUpload,
            size: thumbSize.size,
          });

          // Clean up thumbnail file
          fs.unlinkSync(thumbnailPath);
        } catch (error) {
          console.error(`Error generating ${thumbSize.size} thumbnail:`, error);
        }
      }

      return result;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw new Error('Failed to upload video');
    }
  }

  // Upload image with optimization
  async uploadImage(filePath: string, userId: string, type: 'profile' | 'menu' | 'restaurant' = 'profile'): Promise<UploadResult> {
    try {
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(fileName);
      const baseName = path.basename(fileName, fileExtension);
      const uniqueId = uuidv4();

      // Upload original image
      const originalKey = `images/${type}/${userId}/${uniqueId}/original${fileExtension}`;
      const originalUpload = await this.uploadToS3(filePath, originalKey, 'image');

      const result: UploadResult = {
        original: originalUpload,
        formats: [],
      };

      // Create optimized versions
      const sizes = [
        { name: 'thumbnail', width: 150, height: 150 },
        { name: 'small', width: 320, height: 320 },
        { name: 'medium', width: 640, height: 640 },
        { name: 'large', width: 1280, height: 1280 },
      ];

      for (const size of sizes) {
        try {
          const optimizedPath = await this.optimizeImage(
            filePath,
            size.width,
            size.height,
            baseName
          );

          const sizeKey = `images/${type}/${userId}/${uniqueId}/${size.name}.webp`;
          const sizeUpload = await this.uploadToS3(optimizedPath, sizeKey, 'image');

          result.formats!.push({
            ...sizeUpload,
            resolution: `${size.width}x${size.height}`,
          });

          // Clean up optimized file
          fs.unlinkSync(optimizedPath);
        } catch (error) {
          console.error(`Error optimizing ${size.name} image:`, error);
        }
      }

      return result;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  // Upload file to S3
  private async uploadToS3(filePath: string, key: string, type: 'video' | 'image'): Promise<UploadResult['original']> {
    try {
      const fileContent = fs.readFileSync(filePath);
      const contentType = type === 'video' ? 'video/mp4' : 'image/webp';

      const params = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        ACL: 'public-read',
        CacheControl: 'max-age=31536000', // 1 year
      };

      const uploadResult = await s3.upload(params).promise();

      const url = this.cloudFrontUrl 
        ? `${this.cloudFrontUrl}/${key}`
        : uploadResult.Location;

      return {
        url,
        key,
        size: fileContent.length,
      };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error('Failed to upload to S3');
    }
  }

  // Process video format
  private async processVideoFormat(
    inputPath: string,
    width: number,
    height: number,
    bitrate: string,
    baseName: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(
        path.dirname(inputPath),
        `${baseName}_${width}x${height}.mp4`
      );

      ffmpeg(inputPath)
        .size(`${width}x${height}`)
        .videoBitrate(bitrate)
        .audioCodec('aac')
        .videoCodec('libx264')
        .format('mp4')
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
    });
  }

  // Generate video thumbnail
  private async generateVideoThumbnail(
    inputPath: string,
    width: number,
    height: number,
    baseName: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(
        path.dirname(inputPath),
        `${baseName}_thumb_${width}x${height}.jpg`
      );

      ffmpeg(inputPath)
        .seekInput(2) // Capture frame at 2 seconds
        .size(`${width}x${height}`)
        .format('image2')
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
    });
  }

  // Optimize image
  private async optimizeImage(
    inputPath: string,
    width: number,
    height: number,
    baseName: string
  ): Promise<string> {
    try {
      const outputPath = path.join(
        path.dirname(inputPath),
        `${baseName}_${width}x${height}.webp`
      );

      await sharp(inputPath)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 80 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw new Error('Failed to optimize image');
    }
  }

  // Delete file from S3
  async deleteFile(key: string): Promise<void> {
    try {
      await s3.deleteObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error('Failed to delete file');
    }
  }

  // Generate signed URL for private files
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      return s3.getSignedUrl('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn,
      });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  // Check if file exists
  async fileExists(key: string): Promise<boolean> {
    try {
      await s3.headObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();

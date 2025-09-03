import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { InternalServerError } from '../middleware/error-handler';

export interface FileUploadConfig {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  cdnUrl?: string;
  maxFileSize?: number; // in bytes
  allowedMimeTypes?: string[];
}

export interface UploadedFile {
  key: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, string>;
}

export class FileUploadService {
  private s3Client: S3Client;
  private config: Required<FileUploadConfig>;

  constructor(config: FileUploadConfig) {
    this.config = {
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/webm',
        'application/pdf',
      ],
      endpoint: '',
      cdnUrl: '',
      ...config,
    };

    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      ...(this.config.endpoint ? { endpoint: this.config.endpoint } : {}),
      forcePathStyle: !!this.config.endpoint, // Required for some S3-compatible services
    });
  }

  private generateKey(fileName: string, folder?: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const uniqueId = uuidv4();
    return folder ? `${folder}/${uniqueId}.${extension}` : `${uniqueId}.${extension}`;
  }

  private getFileUrl(key: string): string {
    if (this.config.cdnUrl) {
      return `${this.config.cdnUrl}/${key}`;
    }
    return `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  async uploadFile(file: File | Buffer, options: {
    fileName: string;
    folder?: string;
    mimeType?: string;
    metadata?: Record<string, string>;
    acl?: 'private' | 'public-read';
  }): Promise<UploadedFile> {
    const { fileName, folder, mimeType, metadata = {}, acl = 'public-read' } = options;
    
    // Validate file size
    const fileSize = file instanceof File ? file.size : file.byteLength;
    if (fileSize > this.config.maxFileSize!) {
      throw new Error(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
    }

    // Validate MIME type
    const fileMimeType = mimeType || (file instanceof File ? file.type : '');
    if (this.config.allowedMimeTypes.length > 0 && !this.config.allowedMimeTypes.includes(fileMimeType)) {
      throw new Error(`File type ${fileMimeType} is not allowed`);
    }

    const key = this.generateKey(fileName, folder);
    const buffer = file instanceof File ? await file.arrayBuffer() : file;

    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: fileMimeType,
        ACL: acl,
        Metadata: metadata,
      });

      await this.s3Client.send(command);

      return {
        key,
        url: this.getFileUrl(key),
        name: fileName,
        size: fileSize,
        mimeType: fileMimeType,
        metadata,
      };
    } catch (error) {
      logger.error('Error uploading file to S3', { error, fileName, key });
      throw new InternalServerError('Failed to upload file');
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
    } catch (error) {
      logger.error('Error deleting file from S3', { error, key });
      throw new InternalServerError('Failed to delete file');
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Error generating signed URL', { error, key });
      throw new InternalServerError('Failed to generate signed URL');
    }
  }

  async uploadFiles(
    files: Array<File | Buffer>,
    options: {
      fileNames: string[];
      folder?: string;
      mimeTypes?: string[];
      metadataArray?: Array<Record<string, string>>;
      acl?: 'private' | 'public-read';
    }
  ): Promise<UploadedFile[]> {
    const { fileNames, folder, mimeTypes, metadataArray = [], acl = 'public-read' } = options;

    if (files.length !== fileNames.length) {
      throw new Error('Number of files must match number of file names');
    }

    const uploadPromises = files.map(async (file, index) => {
      return this.uploadFile(file, {
        fileName: fileNames[index],
        folder,
        mimeType: mimeTypes?.[index],
        metadata: metadataArray[index] || {},
        acl,
      });
    });

    return Promise.all(uploadPromises);
  }

  // Helper method to handle file uploads from Next.js API routes
  static handleFileUpload(req: Request): Promise<{ file: File; fileName: string }> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      const reader = new FileReader();
      
      // @ts-ignore
      const file = req.files?.[0];
      
      if (!file) {
        return reject(new Error('No file uploaded'));
      }

      reader.onload = () => {
        resolve({
          file: new File([reader.result as ArrayBuffer], file.originalname, {
            type: file.mimetype,
          }),
          fileName: file.originalname,
        });
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsArrayBuffer(file.buffer);
    });
  }
}

// Example usage:
/*
const fileUploadService = new FileUploadService({
  bucketName: process.env.S3_BUCKET_NAME!,
  region: process.env.S3_REGION!,
  accessKeyId: process.env.S3_ACCESS_KEY!,
  secretAccessKey: process.env.S3_SECRET_KEY!,
  cdnUrl: process.env.CDN_URL,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
  ],
});

// Upload a file
const uploadedFile = await fileUploadService.uploadFile(file, {
  fileName: 'example.jpg',
  folder: 'uploads',
  metadata: { userId: '123' },
  acl: 'public-read',
});

// Get a signed URL for private files
const signedUrl = await fileUploadService.getSignedUrl('private/file.jpg', 3600); // Expires in 1 hour

// Delete a file
await fileUploadService.deleteFile('uploads/example.jpg');
*/

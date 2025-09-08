import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class HLSVideoService {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async processVideoToHLS(inputPath: string, outputDir: string, videoId: string): Promise<{
    masterPlaylist: string;
    segments: string[];
    thumbnails: string[];
  }> {
    const resolutions = [
      { width: 1280, height: 720, bitrate: '2500k', name: '720p' },
      { width: 854, height: 480, bitrate: '1000k', name: '480p' },
      { width: 640, height: 360, bitrate: '500k', name: '360p' },
    ];

    const variantPlaylists: string[] = [];
    const allSegments: string[] = [];

    // Create HLS variants for each resolution
    for (const res of resolutions) {
      const variantDir = path.join(outputDir, res.name);
      if (!fs.existsSync(variantDir)) {
        fs.mkdirSync(variantDir, { recursive: true });
      }

      const playlistPath = path.join(variantDir, 'playlist.m3u8');
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .size(`${res.width}x${res.height}`)
          .videoBitrate(res.bitrate)
          .audioBitrate('128k')
          .outputOptions([
            '-f hls',
            '-hls_time 10',
            '-hls_list_size 0',
            '-hls_segment_filename', path.join(variantDir, 'segment_%03d.ts')
          ])
          .output(playlistPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Read generated segments
      const segments = fs.readdirSync(variantDir)
        .filter(file => file.endsWith('.ts'))
        .map(file => path.join(variantDir, file));
      
      allSegments.push(...segments);
      variantPlaylists.push(playlistPath);
    }

    // Generate master playlist
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    const masterContent = this.generateMasterPlaylist(resolutions);
    fs.writeFileSync(masterPlaylistPath, masterContent);

    // Generate thumbnails
    const thumbnails = await this.generateThumbnails(inputPath, outputDir);

    // Upload to S3
    await this.uploadHLSToS3(outputDir, videoId);

    return {
      masterPlaylist: masterPlaylistPath,
      segments: allSegments,
      thumbnails
    };
  }

  private generateMasterPlaylist(resolutions: any[]): string {
    let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
    
    for (const res of resolutions) {
      const bandwidth = parseInt(res.bitrate.replace('k', '')) * 1000;
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${res.width}x${res.height}\n`;
      content += `${res.name}/playlist.m3u8\n\n`;
    }
    
    return content;
  }

  private async generateThumbnails(inputPath: string, outputDir: string, count: number = 5): Promise<string[]> {
    const thumbnails: string[] = [];
    const thumbDir = path.join(outputDir, 'thumbnails');
    
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    for (let i = 0; i < count; i++) {
      const timestamp = `${i * 20}%`;
      const thumbPath = path.join(thumbDir, `thumb_${i}.jpg`);
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps: [timestamp],
            filename: `thumb_${i}.jpg`,
            folder: thumbDir,
            size: '320x180'
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });
      
      thumbnails.push(thumbPath);
    }

    return thumbnails;
  }

  private async uploadHLSToS3(outputDir: string, videoId: string): Promise<void> {
    const bucketName = process.env.S3_BUCKET_NAME!;
    
    const uploadFile = async (filePath: string, key: string) => {
      const fileContent = fs.readFileSync(filePath);
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: `videos/${videoId}/${key}`,
        Body: fileContent,
        ContentType: this.getContentType(filePath),
      });
      
      await this.s3Client.send(command);
    };

    // Upload all files recursively
    const uploadDirectory = async (dir: string, prefix: string = '') => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          await uploadDirectory(filePath, `${prefix}${file}/`);
        } else {
          await uploadFile(filePath, `${prefix}${file}`);
        }
      }
    };

    await uploadDirectory(outputDir);
  }

  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.m3u8': return 'application/vnd.apple.mpegurl';
      case '.ts': return 'video/mp2t';
      case '.jpg': return 'image/jpeg';
      case '.png': return 'image/png';
      default: return 'application/octet-stream';
    }
  }

  getHLSUrls(videoId: string): {
    masterPlaylist: string;
    baseUrl: string;
  } {
    const baseUrl = `${process.env.CDN_URL || process.env.S3_URL}/videos/${videoId}`;
    return {
      masterPlaylist: `${baseUrl}/master.m3u8`,
      baseUrl
    };
  }
}

export const hlsVideoService = new HLSVideoService();

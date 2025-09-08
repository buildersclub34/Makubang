import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';

interface HLSVideoPlayerProps {
  src: string; // HLS manifest URL
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onLoadedMetadata?: () => void;
  onError?: (error: any) => void;
}

export default function HLSVideoPlayer({
  src,
  poster,
  autoPlay = false,
  muted = true,
  controls = true,
  className = '',
  onLoadedMetadata,
  onError
}: HLSVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setIsLoading(true);
    setError(null);

    // Check if HLS is supported
    if (Hls.isSupported()) {
      // Create HLS instance
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 300,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
        maxBufferHole: 0.5,
        capLevelToPlayerSize: true,
        startLevel: -1, // Auto quality
      });

      hlsRef.current = hls;

      // Load the source
      hls.loadSource(src);
      hls.attachMedia(video);

      // Handle events
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(console.error);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error occurred');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error occurred');
              hls.recoverMediaError();
              break;
            default:
              setError('Fatal error occurred');
              hls.destroy();
              break;
          }
          onError?.(data);
        }
        setIsLoading(false);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log('Quality switched to:', data.level);
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, iOS)
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        onLoadedMetadata?.();
      });
      video.addEventListener('error', (e) => {
        setError('Video load error');
        setIsLoading(false);
        onError?.(e);
      });
    } else {
      setError('HLS not supported in this browser');
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay, onLoadedMetadata, onError]);

  const handleLoadedMetadata = () => {
    setIsLoading(false);
    onLoadedMetadata?.();
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoError = (e.target as HTMLVideoElement).error;
    let errorMessage = 'Video playback error';
    
    if (videoError) {
      switch (videoError.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video playback aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error occurred';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Video decoding error';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video format not supported';
          break;
      }
    }
    
    setError(errorMessage);
    setIsLoading(false);
    onError?.(videoError);
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-white ${className}`}>
        <div className="text-center p-4">
          <div className="text-red-500 mb-2">⚠️</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
      
      <video
        ref={videoRef}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        controls={controls}
        playsInline
        className="w-full h-full object-cover"
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleVideoError}
        preload="metadata"
      />
    </div>
  );
}

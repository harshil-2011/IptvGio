import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Channel, BufferProfile, StreamQualityPreference } from '../types/iptv';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface TVPlayerProps {
  channel: Channel | null;
  lowRamMode: boolean;
  bufferProfile: BufferProfile;
  defaultQuality?: StreamQualityPreference;
  aspectRatio: 'fit' | 'cover' | 'fill' | '16:9' | '4:3';
  isMuted: boolean;
  volume: number; // 0 to 1
  isMiniPreview?: boolean;
  isPaused?: boolean;
  onPlayerClick?: () => void;
  onBufferChange?: (isBuffering: boolean) => void;
  onErrorState?: (errorMsg: string | null) => void;
}

export const TVPlayer: React.FC<TVPlayerProps> = ({
  channel,
  lowRamMode,
  bufferProfile,
  defaultQuality = 'auto',
  aspectRatio,
  isMuted,
  volume,
  isMiniPreview = false,
  isPaused = false,
  onPlayerClick,
  onBufferChange,
  onErrorState,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [streamQuality, setStreamQuality] = useState<string>('Auto');
  const [useDirect, setUseDirect] = useState<boolean>(false);

  // Helper: Get playable URL (handles file:// protocol in Android TV APK vs /api/proxy-stream in web preview)
  const getPlayableUrl = useCallback((rawUrl: string, direct: boolean = false): string => {
    if (!rawUrl) return '';
    const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
    if (direct || isFileProtocol) {
      // In Android APK, use direct URL or corsproxy if needed
      return rawUrl;
    }
    return `/api/proxy-stream?url=${encodeURIComponent(rawUrl)}`;
  }, []);

  // Buffer profile tuning for instant channel loading on low-end hardware & 2GB RAM
  const getHlsConfig = useCallback((): Partial<import('hls.js').HlsConfig> => {
    return {
      enableWorker: true,
      lowLatencyMode: true,
      startFragPrefetch: true,      // Prefetch initial fragment immediately
      liveSyncDurationCount: 0.5,    // Start playback instantly at live edge
      maxBufferLength: 3,            // Keep buffer tight for instant zapping
      maxMaxBufferLength: 6,
      maxBufferSize: 8 * 1024 * 1024,  // 8MB memory limit for low RAM TV
      maxBufferHole: 1.0,
      fragLoadingTimeOut: 3000,      // Fast 3s failover for lightning-fast channel zapping
      manifestLoadingTimeOut: 3000,
      levelLoadingTimeOut: 3000,
      fragLoadingMaxRetry: 2,
      manifestLoadingMaxRetry: 2,
      backBufferLength: 0,           // Zero back-buffer prevents GC pauses
      capLevelToPlayerSize: true,
      autoStartLoad: !isPaused,
    };
  }, [lowRamMode, bufferProfile, isMiniPreview, isPaused]);

  // Apply desired level based on defaultQuality preference
  const applyQualityLevel = useCallback((hls: Hls, pref: StreamQualityPreference) => {
    if (!hls.levels || hls.levels.length === 0) return;

    if (pref === 'auto') {
      hls.currentLevel = -1; // Auto adaptive
      return;
    }

    const targetHeight = pref === '1080p' ? 1080 : pref === '720p' ? 720 : pref === '480p' ? 480 : 360;
    let closestIndex = 0;
    let minDiff = 999999;

    hls.levels.forEach((lvl, idx) => {
      if (lvl.height) {
        const diff = Math.abs(lvl.height - targetHeight);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = idx;
        }
      }
    });

    hls.currentLevel = closestIndex;
    const chosen = hls.levels[closestIndex];
    if (chosen && chosen.height) {
      setStreamQuality(`${chosen.height}p`);
    }
  }, []);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying HLS instance:', e);
      }
      hlsRef.current = null;
    }
  }, []);

  // Initialize playback when channel changes or retry is triggered
  useEffect(() => {
    if (!channel || !videoRef.current) return;

    setIsLoading(true);
    setErrorMessage(null);
    if (onErrorState) onErrorState(null);
    if (onBufferChange) onBufferChange(true);

    const video = videoRef.current;
    destroyHls();

    const targetUrl = getPlayableUrl(channel.streamUrl, useDirect);
    const isHls = targetUrl.includes('.m3u8') || targetUrl.includes('proxy-stream') || targetUrl.includes('live') || !targetUrl.includes('.mp4');

    if (isHls && Hls.isSupported()) {
      const config = getHlsConfig();
      const hls = new Hls(config);
      hlsRef.current = hls;

      hls.loadSource(targetUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        applyQualityLevel(hls, defaultQuality);
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(e => console.warn('Autoplay fallback error:', e));
        });
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        setIsLoading(false);
        if (onBufferChange) onBufferChange(false);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (hls.levels && hls.levels[data.level]) {
          const lvl = hls.levels[data.level];
          setStreamQuality(`${lvl.height || 'HD'}p`);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn('HLS Event Error:', data.type, data.details, data.fatal);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // If proxy failed, try direct URL on retry
              if (!useDirect) {
                setUseDirect(true);
                return;
              }
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              destroyHls();
              const err = `Stream connection error: ${data.details || 'Unable to play source'}`;
              setErrorMessage(err);
              if (onErrorState) onErrorState(err);
              setIsLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
      video.src = targetUrl;
      video.load();
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(e => console.warn('Native video play error:', e));
      });
      setStreamQuality(channel.resolution);
    } else {
      const err = 'Stream format not supported on this device.';
      setErrorMessage(err);
      if (onErrorState) onErrorState(err);
      setIsLoading(false);
    }

    return () => {
      destroyHls();
    };
  }, [channel, retryCount, useDirect, getHlsConfig, destroyHls, onBufferChange, onErrorState, applyQualityLevel, defaultQuality, getPlayableUrl]);

  // Reset useDirect when channel changes
  useEffect(() => {
    setUseDirect(false);
  }, [channel?.id]);

  // Update quality if defaultQuality changes during active stream
  useEffect(() => {
    if (hlsRef.current) {
      applyQualityLevel(hlsRef.current, defaultQuality);
    }
  }, [defaultQuality, applyQualityLevel]);

  // Suspend background decoding when guide is open
  useEffect(() => {
    if (isPaused) {
      if (hlsRef.current) hlsRef.current.stopLoad();
      if (videoRef.current) videoRef.current.pause();
    } else {
      if (hlsRef.current) hlsRef.current.startLoad();
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused]);

  // Handle video element events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWaiting = () => {
      setIsLoading(true);
      if (onBufferChange) onBufferChange(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      if (onBufferChange) onBufferChange(false);
      setErrorMessage(null);
      if (onErrorState) onErrorState(null);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      if (onBufferChange) onBufferChange(false);
    };

    const handleError = () => {
      if (!useDirect) {
        setUseDirect(true);
        return;
      }
      const err = 'Video stream failed to load or is offline.';
      setErrorMessage(err);
      if (onErrorState) onErrorState(err);
      setIsLoading(false);
      if (onBufferChange) onBufferChange(false);
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [onBufferChange, onErrorState, useDirect]);

  // Sync volume and mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Aspect ratio class helper
  const getAspectRatioStyle = (): string => {
    if (isMiniPreview) return 'object-cover';
    switch (aspectRatio) {
      case 'cover':
        return 'object-cover';
      case 'fill':
        return 'object-fill';
      case '16:9':
        return 'aspect-video object-cover';
      case '4:3':
        return 'aspect-4/3 object-contain';
      case 'fit':
      default:
        return 'object-contain';
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUseDirect(prev => !prev);
    setRetryCount(prev => prev + 1);
  };

  return (
    <div 
      className={`relative w-full h-full bg-black select-none overflow-hidden flex items-center justify-center ${isMiniPreview ? '' : 'cursor-pointer'}`}
      onClick={onPlayerClick}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className={`w-full h-full ${getAspectRatioStyle()} transition-all duration-200`}
        playsInline
        autoPlay
        muted={isMuted}
      />

      {/* Loading Spinner */}
      {isLoading && !errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-black/60">
          <div className="w-10 h-10 rounded-full border-2 border-neutral-800 border-t-white animate-spin" />
          {!isMiniPreview && (
            <>
              <span className="mt-3 text-white font-medium tracking-wider text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping inline-block" />
                TUNING STREAM...
              </span>
              <span className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                {streamQuality}
              </span>
            </>
          )}
        </div>
      )}

      {/* Stream Error Overlay */}
      {errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-4 z-20">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-2 text-white">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h2 className={`${isMiniPreview ? 'text-xs' : 'text-sm'} font-bold text-white mb-1`}>Stream Offline or Unavailable</h2>
          {!isMiniPreview && (
            <>
              <p className="text-xs text-neutral-400 max-w-xs text-center mb-4 font-mono">
                {channel ? channel.name : 'Unknown'}
              </p>
              <button
                onClick={handleRetry}
                className="px-5 py-2 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry (Switch Route)
              </button>
            </>
          )}
        </div>
      )}

      {/* Subtle Live Badge Overlay in Top Right (Only on fullscreen player) */}
      {!isMiniPreview && (
        <div className="absolute top-4 right-16 z-10 pointer-events-none flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-neutral-800 text-[11px] font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
          <div className="px-3 py-1 rounded-full bg-black/80 border border-neutral-800 text-[11px] font-mono font-semibold text-neutral-300">
            {streamQuality}
          </div>
        </div>
      )}
    </div>
  );
};

export interface EPGProgram {
  id: string;
  title: string;
  description: string;
  startTime: string; // e.g. "20:00"
  endTime: string;   // e.g. "21:00"
  startMinutes: number; // minutes from midnight for progress calc
  endMinutes: number;
}

export interface Channel {
  id: string;
  number: number;
  name: string;
  category: string;
  streamUrl: string;
  logoUrl?: string;
  resolution: '4K' | 'FHD' | 'HD' | 'SD';
  language?: string;
  isFavorite: boolean;
  programs?: EPGProgram[];
}

export type StartupBehavior = 'favorite' | 'random' | 'last_watched';

export type BufferProfile = 'low_ram' | 'ultra_fast' | 'balanced';

export type StreamQualityPreference = 'auto' | '1080p' | '720p' | '480p' | '360p';

export interface AppSettings {
  startupBehavior: StartupBehavior;
  defaultFavoriteChannelNumber: number;
  lowRamMode: boolean; // Crucial for Android 7, 2GB RAM
  bufferProfile: BufferProfile;
  defaultQuality: StreamQualityPreference;
  autoZapDelayMs: number; // e.g. 1400ms for quick numeric dialing
  lastWatchedChannelNumber: number;
  soundEnabled: boolean;
  aspectRatio: 'fit' | 'cover' | 'fill' | '16:9' | '4:3';
}

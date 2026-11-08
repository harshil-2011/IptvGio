/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Channel, AppSettings } from './types/iptv';
import { DEFAULT_CHANNELS } from './data/defaultChannels';
import { TVPlayer } from './components/TVPlayer';
import { TVGuide } from './components/TVGuide';
import { ChannelOSD } from './components/ChannelOSD';
import { ChannelDialer } from './components/ChannelDialer';
import { SettingsModal } from './components/SettingsModal';
import { WelcomeWizard } from './components/WelcomeWizard';
import { Settings } from 'lucide-react';

import { getNameFromUrl, isPlaceholderOrNumeric } from './utils/m3uParser';

const STORAGE_CHANNELS_KEY = 'iptv_channels_v3';
const LEGACY_STORAGE_KEY = 'iptv_channels_v2';
const STORAGE_SETTINGS_KEY = 'iptv_settings_v3';

function repairChannelList(rawList: Channel[]): Channel[] {
  return rawList.map((ch, idx) => {
    let name = ch.name ? ch.name.trim() : '';
    if (isPlaceholderOrNumeric(name)) {
      const urlName = getNameFromUrl(ch.streamUrl);
      if (urlName) {
        name = urlName;
      } else if (DEFAULT_CHANNELS[idx] && (ch.streamUrl === DEFAULT_CHANNELS[idx].streamUrl || idx < DEFAULT_CHANNELS.length)) {
        name = DEFAULT_CHANNELS[idx].name;
      } else {
        name = `${ch.category || 'Live'} Channel ${ch.number}`;
      }
    }
    return {
      ...ch,
      name,
    };
  });
}

const DEFAULT_SETTINGS: AppSettings = {
  startupBehavior: 'favorite',
  defaultFavoriteChannelNumber: 101, // DW News
  lowRamMode: true, // Enabled by default for Android 7, 2GB RAM
  bufferProfile: 'low_ram',
  defaultQuality: 'auto',
  autoZapDelayMs: 1400,
  lastWatchedChannelNumber: 101,
  soundEnabled: true,
  aspectRatio: 'fit',
};

export default function App() {
  // First boot welcome wizard state
  const [isWelcomeWizardOpen, setIsWelcomeWizardOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('iptv_first_boot_done');
    } catch {
      return false;
    }
  });

  // Channels state
  const [channels, setChannels] = useState<Channel[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHANNELS_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return repairChannelList(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved channels, using defaults:', e);
    }
    return DEFAULT_CHANNELS;
  });

  // Settings state
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to parse saved settings, using defaults:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Current Playing Channel
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);

  // UI Overlays & Modals
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // OSD & Buffering status
  const [isOsdVisible, setIsOsdVisible] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const osdTimerRef = useRef<number | null>(null);

  // Direct Number Dialing State (0-9 keys)
  const [dialDigits, setDialDigits] = useState<string>('');
  const dialTimerRef = useRef<number | null>(null);

  // Audio controls
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);

  // Save Channels to LocalStorage safely
  useEffect(() => {
    try {
      // Persist up to 3000 channels for large playlists
      const leanChannels = channels.slice(0, 3000).map(c => ({
        id: c.id,
        number: c.number,
        name: c.name,
        category: c.category,
        streamUrl: c.streamUrl,
        logoUrl: c.logoUrl,
        resolution: c.resolution,
        isFavorite: c.isFavorite,
      }));
      localStorage.setItem(STORAGE_CHANNELS_KEY, JSON.stringify(leanChannels));
    } catch (e) {
      console.warn('Storage quota reached or error saving channels, falling back:', e);
      try {
        const minimalChannels = channels.slice(0, 1000).map(c => ({
          id: c.id,
          number: c.number,
          name: c.name,
          category: c.category,
          streamUrl: c.streamUrl,
          resolution: c.resolution,
          isFavorite: c.isFavorite,
        }));
        localStorage.setItem(STORAGE_CHANNELS_KEY, JSON.stringify(minimalChannels));
      } catch {
        // Safe fail
      }
    }
  }, [channels]);

  // Save Settings to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Error saving settings to localStorage:', e);
    }
  }, [settings]);

  // Show OSD helper
  const showOsdBriefly = useCallback((durationMs: number = 3800) => {
    setIsOsdVisible(true);
    if (osdTimerRef.current) {
      window.clearTimeout(osdTimerRef.current);
    }
    osdTimerRef.current = window.setTimeout(() => {
      setIsOsdVisible(false);
    }, durationMs);
  }, []);

  // Handle Startup Channel on initial mount
  // "Opening the app starts a random channel or starts your favorite channel you set."
  useEffect(() => {
    if (!channels || channels.length === 0) return;

    let targetChannel: Channel | undefined;

    if (settings.startupBehavior === 'random') {
      const randIdx = Math.floor(Math.random() * channels.length);
      targetChannel = channels[randIdx];
    } else if (settings.startupBehavior === 'favorite') {
      targetChannel =
        channels.find(c => c.number === settings.defaultFavoriteChannelNumber) ||
        channels.find(c => c.isFavorite) ||
        channels[0];
    } else {
      // Last watched
      targetChannel =
        channels.find(c => c.number === settings.lastWatchedChannelNumber) ||
        channels[0];
    }

    if (targetChannel) {
      setCurrentChannel(targetChannel);
      showOsdBriefly();
    }
  }, []);

  // Switch channel in full screen
  const changeChannel = useCallback((channel: Channel) => {
    setCurrentChannel(channel);
    setSettings(prev => ({
      ...prev,
      lastWatchedChannelNumber: channel.number,
    }));
    showOsdBriefly(4000);
    setDialDigits('');
    if (dialTimerRef.current) {
      window.clearTimeout(dialTimerRef.current);
    }
  }, [showOsdBriefly]);

  // Tune to Next Channel (D-Pad Up)
  const channelUp = useCallback(() => {
    if (!currentChannel || channels.length === 0) return;
    const currentIndex = channels.findIndex(c => c.id === currentChannel.id);
    const nextIndex = (currentIndex + 1) % channels.length;
    changeChannel(channels[nextIndex]);
  }, [currentChannel, channels, changeChannel]);

  // Tune to Prev Channel (D-Pad Down)
  const channelDown = useCallback(() => {
    if (!currentChannel || channels.length === 0) return;
    const currentIndex = channels.findIndex(c => c.id === currentChannel.id);
    const prevIndex = (currentIndex - 1 + channels.length) % channels.length;
    changeChannel(channels[prevIndex]);
  }, [currentChannel, channels, changeChannel]);

  // Zap to Random Channel
  const zapRandom = useCallback(() => {
    if (channels.length === 0) return;
    let nextIdx = Math.floor(Math.random() * channels.length);
    if (currentChannel && channels[nextIdx]?.id === currentChannel.id && channels.length > 1) {
      nextIdx = (nextIdx + 1) % channels.length;
    }
    changeChannel(channels[nextIdx]);
  }, [channels, currentChannel, changeChannel]);

  // Toggle Favorite
  const toggleFavorite = useCallback((channelId?: string) => {
    const targetId = channelId || currentChannel?.id;
    if (!targetId) return;

    setChannels(prev =>
      prev.map(ch => (ch.id === targetId ? { ...ch, isFavorite: !ch.isFavorite } : ch))
    );

    if (currentChannel && currentChannel.id === targetId) {
      setCurrentChannel(prev => (prev ? { ...prev, isFavorite: !prev.isFavorite } : prev));
      showOsdBriefly(2000);
    }
  }, [currentChannel, showOsdBriefly]);

  // Direct Number Dialing Handler
  const handleDigitInput = useCallback((digit: string) => {
    setIsGuideOpen(false);
    setIsSettingsModalOpen(false);

    setDialDigits(prev => {
      const newDigits = (prev + digit).slice(-4);

      if (dialTimerRef.current) {
        window.clearTimeout(dialTimerRef.current);
      }

      dialTimerRef.current = window.setTimeout(() => {
        const targetNumber = parseInt(newDigits, 10);
        const match = channels.find(c => c.number === targetNumber);
        if (match) {
          changeChannel(match);
        } else {
          setTimeout(() => setDialDigits(''), 800);
        }
      }, settings.autoZapDelayMs);

      return newDigits;
    });
  }, [channels, changeChannel, settings.autoZapDelayMs]);

  // Confirm Dialing Immediately
  const confirmDial = useCallback(() => {
    if (!dialDigits) return;
    if (dialTimerRef.current) {
      window.clearTimeout(dialTimerRef.current);
    }
    const targetNumber = parseInt(dialDigits, 10);
    const match = channels.find(c => c.number === targetNumber);
    if (match) {
      changeChannel(match);
    }
    setDialDigits('');
  }, [dialDigits, channels, changeChannel]);

  // Matched channel for dialing preview
  const matchedDialChannel = React.useMemo(() => {
    if (!dialDigits) return null;
    const num = parseInt(dialDigits, 10);
    return channels.find(c => c.number === num) || null;
  }, [dialDigits, channels]);

  // Remote Control Key Listeners:
  // - "Pressing OK on the remote button should open a TV guide with all the categories of channels and numbers of the channels."
  // - "On Ok button tv guide make Channel preview also and pressing ok on that Tv channel Opens it in full screen"
  useEffect(() => {
    const handleRemoteKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      // Direct Number Dialing (0-9)
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitInput(e.key);
        return;
      }

      // OK / Enter key when watching video in full screen opens the TV Guide
      if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        if (dialDigits) {
          confirmDial();
        } else if (!isGuideOpen && !isSettingsModalOpen) {
          setIsGuideOpen(true);
        }
        return;
      }

      // Back / Escape key closes guide or settings
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
        e.preventDefault();
        if (dialDigits) {
          setDialDigits('');
        } else if (isGuideOpen) {
          setIsGuideOpen(false);
        } else if (isSettingsModalOpen) {
          setIsSettingsModalOpen(false);
        } else if (isOsdVisible) {
          setIsOsdVisible(false);
        } else {
          showOsdBriefly();
        }
        return;
      }

      // When guide and settings are closed: Up/Down changes channel, Left/Right changes volume
      if (!isGuideOpen && !isSettingsModalOpen) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          channelUp();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          channelDown();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setVolume(v => Math.min(1, Math.round((v + 0.1) * 10) / 10));
          showOsdBriefly(2000);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setVolume(v => Math.max(0, Math.round((v - 0.1) * 10) / 10));
          showOsdBriefly(2000);
        }
      }

      // Shortcuts
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setIsGuideOpen(prev => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFavorite();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        zapRandom();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsSettingsModalOpen(prev => !prev);
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setIsOsdVisible(prev => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMuted(prev => !prev);
        showOsdBriefly(2000);
      }
    };

    window.addEventListener('keydown', handleRemoteKeyDown);
    return () => window.removeEventListener('keydown', handleRemoteKeyDown);
  }, [
    isGuideOpen,
    isSettingsModalOpen,
    isOsdVisible,
    dialDigits,
    handleDigitInput,
    confirmDial,
    channelUp,
    channelDown,
    toggleFavorite,
    zapRandom,
    showOsdBriefly,
  ]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans select-none text-white">
      {/* 1. Main Background TV Stream Player (Full Screen) */}
      <TVPlayer
        channel={currentChannel}
        lowRamMode={settings.lowRamMode}
        bufferProfile={settings.bufferProfile}
        defaultQuality={settings.defaultQuality}
        aspectRatio={settings.aspectRatio}
        isMuted={isMuted}
        volume={volume}
        isPaused={isGuideOpen}
        onPlayerClick={() => {
          // Pressing or clicking on screen opens the TV Guide
          if (!isGuideOpen) {
            setIsGuideOpen(true);
          }
        }}
        onBufferChange={setIsBuffering}
      />

      {/* 2. ONLY Settings Icon in the Corner (As requested: "remove unnessary Logo From app Only settings icon in corner thats it all the features inside the settings only") */}
      <button
        onClick={() => setIsSettingsModalOpen(true)}
        className="fixed top-5 right-5 z-40 p-3 rounded-2xl bg-black/60 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white backdrop-blur-sm transition-all cursor-pointer shadow-lg active:scale-95"
        title="Settings & Playlists (S)"
      >
        <Settings className="w-5 h-5 text-white" />
      </button>

      {/* 3. Channel OSD Bottom Banner (shows on channel zap / info) */}
      <ChannelOSD
        channel={currentChannel}
        isVisible={isOsdVisible && !isGuideOpen}
        isBuffering={isBuffering}
        lowRamMode={settings.lowRamMode}
      />

      {/* 4. Direct Number Dialing HUD ("Channel 105...") */}
      <ChannelDialer
        digits={dialDigits}
        matchedChannel={matchedDialChannel}
        onConfirm={confirmDial}
        lowRamMode={settings.lowRamMode}
      />

      {/* 5. TV Guide with Live Channel Preview */}
      {/* "On Ok button tv guide make Channel preview also and pressing ok on that Tv channel Opens it in full screen" */}
      <TVGuide
        isOpen={isGuideOpen}
        channels={channels}
        currentChannel={currentChannel}
        onSelectChannel={(ch) => {
          changeChannel(ch);
          setIsGuideOpen(false); // Opens it in full screen!
        }}
        onClose={() => setIsGuideOpen(false)}
        onToggleFavorite={toggleFavorite}
        lowRamMode={settings.lowRamMode}
        bufferProfile={settings.bufferProfile}
        defaultQuality={settings.defaultQuality}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
        channels={channels}
        onUpdateChannels={(newChannels) => {
          setChannels(newChannels);
          if (newChannels.length > 0) {
            changeChannel(newChannels[0]);
          }
        }}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(prev => !prev)}
        volume={volume}
        onVolumeChange={setVolume}
      />

      {/* First-boot Welcome & Playlist Wizard */}
      <WelcomeWizard
        isOpen={isWelcomeWizardOpen}
        onComplete={(newCh) => {
          setChannels(newCh);
          if (newCh.length > 0) {
            changeChannel(newCh[0]);
          }
          try {
            localStorage.setItem('iptv_first_boot_done', 'true');
          } catch {}
          setIsWelcomeWizardOpen(false);
        }}
        lowRamMode={settings.lowRamMode}
      />
    </div>
  );
}

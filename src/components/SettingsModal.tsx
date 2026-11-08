import React, { useState } from 'react';
import { Channel, AppSettings, BufferProfile, StreamQualityPreference } from '../types/iptv';
import { PlaylistModal } from './PlaylistModal';
import { ChannelOrderModal } from './ChannelOrderModal';
import { 
  Settings, Cpu, Zap, Star, Tv, X, Check, 
  PlayCircle, Sliders, ListPlus, Volume2, VolumeX, Shield,
  ArrowUpDown, Download, Sparkles, Hash
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  channels: Channel[];
  onUpdateChannels: (newChannels: Channel[]) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onVolumeChange: (newVol: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  channels,
  onUpdateChannels,
  isMuted,
  onToggleMute,
  volume,
  onVolumeChange,
}) => {
  const [activeTab, setActiveTab] = useState<'playback' | 'playlist' | 'system'>('playback');
  const [isPlaylistSubmodalOpen, setIsPlaylistSubmodalOpen] = useState<boolean>(false);
  const [isOrderSubmodalOpen, setIsOrderSubmodalOpen] = useState<boolean>(false);
  const [quickNotice, setQuickNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const showQuickNotice = (msg: string) => {
    setQuickNotice(msg);
    setTimeout(() => setQuickNotice(null), 2500);
  };

  const handleSequentialNumbering = () => {
    const updated = channels.map((ch, idx) => ({
      ...ch,
      number: idx + 1,
    }));
    onUpdateChannels(updated);
    showQuickNotice(`Channels renumbered sequentially 1 to ${updated.length}!`);
  };

  const handleCategoryNumbering = () => {
    const categoryBases: Record<string, number> = {
      News: 100,
      Sports: 200,
      Movies: 300,
      Entertainment: 400,
      General: 400,
      Music: 500,
      Infotainment: 600,
      Kids: 700,
      Relax: 800,
    };
    const counters: Record<string, number> = {};
    const used = new Set<number>();
    const sorted = [...channels].sort((a, b) => {
      const catA = a.category || 'General';
      const catB = b.category || 'General';
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.localeCompare(b.name);
    });
    const updated = sorted.map((ch) => {
      const cat = ch.category || 'General';
      const base = categoryBases[cat] || 900;
      if (!counters[cat]) counters[cat] = base + 1;
      let candidate = counters[cat];
      while (used.has(candidate)) candidate++;
      counters[cat] = candidate + 1;
      used.add(candidate);
      return { ...ch, number: candidate };
    });
    updated.sort((a, b) => a.number - b.number);
    onUpdateChannels(updated);
    showQuickNotice('Channels organized by Category Blocks (101+, 201+, 301+...)!');
  };

  const favoriteChannels = channels.filter(c => c.isFavorite);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div
        className={`w-full max-w-2xl rounded-3xl border border-neutral-800 p-6 text-white shadow-2xl flex flex-col max-h-[92vh] ${
          settings.lowRamMode ? 'bg-black' : 'bg-neutral-950/95 backdrop-blur-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-bold">
              <Settings className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Settings & Controls</h2>
              <p className="text-xs text-neutral-400">
                All player settings, quality presets, playlists & Android TV controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-2 my-4 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800">
          <button
            onClick={() => setActiveTab('playback')}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'playback'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Playback & Quality
          </button>
          <button
            onClick={() => setActiveTab('playlist')}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'playlist'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            Playlist & Channels
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'system'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Android 7 & TV
          </button>
        </div>

        {/* Notice toast */}
        {quickNotice && (
          <div className="mb-3 p-3 rounded-2xl bg-neutral-900 border border-white text-white text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-white shrink-0" />
            <span>{quickNotice}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-6 py-2 pr-1">
          {/* TAB 1: PLAYBACK & QUALITY */}
          {activeTab === 'playback' && (
            <>
              {/* DEFAULT QUALITY OPTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-white" />
                    <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                      Default Stream Quality
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Active: {settings.defaultQuality.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Select your preferred stream resolution (helps prevent buffering on 2GB RAM & low-end processors):
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'auto', label: 'Auto', badge: 'Adaptive' },
                    { id: '1080p', label: '1080p', badge: 'Full HD' },
                    { id: '720p', label: '720p', badge: 'HD Ready' },
                    { id: '480p', label: '480p', badge: 'Standard' },
                    { id: '360p', label: '360p', badge: 'Low RAM' },
                  ].map(q => {
                    const isSelected = settings.defaultQuality === q.id;
                    return (
                      <button
                        key={q.id}
                        onClick={() => onUpdateSettings({ defaultQuality: q.id as StreamQualityPreference })}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-white text-black border-white shadow-md'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <span className="font-extrabold text-sm">{q.label}</span>
                        <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-neutral-700' : 'text-neutral-500'}`}>
                          {q.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STARTUP CHANNEL BEHAVIOR */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-white" />
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    Startup Channel
                  </h3>
                </div>
                <p className="text-xs text-neutral-400">
                  Opening the app starts a random channel or starts your favorite channel you set:
                </p>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => onUpdateSettings({ startupBehavior: 'favorite' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      settings.startupBehavior === 'favorite'
                        ? 'bg-neutral-900 border-2 border-white'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Star className="w-4 h-4 fill-white text-white" />
                      {settings.startupBehavior === 'favorite' && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div className="font-bold text-xs text-white">Favorite Channel</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">Start on your favorite</div>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ startupBehavior: 'random' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      settings.startupBehavior === 'random'
                        ? 'bg-neutral-900 border-2 border-white'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Zap className="w-4 h-4 text-white" />
                      {settings.startupBehavior === 'random' && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div className="font-bold text-xs text-white">Random Channel</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">Shuffle on launch</div>
                  </button>

                  <button
                    onClick={() => onUpdateSettings({ startupBehavior: 'last_watched' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      settings.startupBehavior === 'last_watched'
                        ? 'bg-neutral-900 border-2 border-white'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Tv className="w-4 h-4 text-white" />
                      {settings.startupBehavior === 'last_watched' && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div className="font-bold text-xs text-white">Last Watched</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">Resume last session</div>
                  </button>
                </div>

                {settings.startupBehavior === 'favorite' && (
                  <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 mt-2">
                    <label className="block text-xs font-semibold text-neutral-300 mb-2">
                      Startup Favorite Channel:
                    </label>
                    <select
                      value={settings.defaultFavoriteChannelNumber}
                      onChange={(e) => onUpdateSettings({ defaultFavoriteChannelNumber: parseInt(e.target.value, 10) })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-sans"
                    >
                      {(favoriteChannels.length > 0 ? favoriteChannels : channels).map((ch) => (
                        <option key={ch.id} value={ch.number}>
                          #{ch.number} - {ch.name} ({ch.category}) {ch.isFavorite ? '★' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ASPECT RATIO */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4 text-white" />
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                    Aspect Ratio
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'fit', label: 'Fit 16:9' },
                    { id: 'cover', label: 'Fill / Zoom' },
                    { id: 'fill', label: 'Stretch' },
                    { id: '4:3', label: 'Retro 4:3' },
                  ].map((aspect) => (
                    <button
                      key={aspect.id}
                      onClick={() => onUpdateSettings({ aspectRatio: aspect.id as any })}
                      className={`py-2 px-3 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        settings.aspectRatio === aspect.id
                          ? 'bg-white text-black border-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {aspect.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* VOLUME & SOUND */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-white" />
                    <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                      Audio Volume ({Math.round(volume * 100)}%)
                    </h3>
                  </div>
                  <button
                    onClick={onToggleMute}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-white bg-neutral-800 h-2 rounded-full cursor-pointer"
                />
              </div>
            </>
          )}

          {/* TAB 2: PLAYLIST & CHANNELS */}
          {activeTab === 'playlist' && (
            <div className="space-y-4">
              {/* 1. AUTO ARRANGE & REORDER CARD */}
              <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-white text-black flex items-center justify-center font-bold">
                      <ArrowUpDown className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Auto Arrange & Reorder Channels</h4>
                      <p className="text-xs text-neutral-400">
                        {channels.length} channels loaded • Auto-number or customize channel order
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOrderSubmodalOpen(true)}
                    className="px-4 py-2 rounded-2xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    Reorder Tool
                  </button>
                </div>

                {/* Quick Auto-Numbering One-Click Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleSequentialNumbering}
                    className="p-3 rounded-2xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white group-hover:text-white">
                      <Hash className="w-3.5 h-3.5 text-neutral-400" />
                      Auto-Number 1 to {channels.length}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">Consecutive sequential numbering</div>
                  </button>

                  <button
                    onClick={handleCategoryNumbering}
                    className="p-3 rounded-2xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-white group-hover:text-white">
                      <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                      Arrange by Category
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">101+ News, 201+ Sports, 301+ Movies...</div>
                  </button>
                </div>
              </div>

              {/* 2. PLAYLIST IMPORT CARD */}
              <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">Import M3U / M3U8 Playlist</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Download from URL, paste text, or upload file
                  </p>
                </div>
                <button
                  onClick={() => setIsPlaylistSubmodalOpen(true)}
                  className="px-4 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer border border-neutral-700"
                >
                  <ListPlus className="w-4 h-4" />
                  Playlist Importer
                </button>
              </div>

              {/* 3. CATEGORY NUMBERING REFERENCE */}
              <div className="p-4 rounded-3xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                <h5 className="font-bold text-xs text-neutral-300 uppercase tracking-wider">
                  Category Number Blocks
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-neutral-300 mt-2">
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">100 - 199 : News Channels</div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">200 - 299 : Sports Channels</div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">300 - 399 : Movies Channels</div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">400 - 499 : Entertainment</div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">500 - 599 : Music Channels</div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">600 - 699 : Infotainment & Docs</div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">700 - 799 : Kids & Animation</div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">800 - 899 : Relax & Ambient</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM & ANDROID TV */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              {/* DOWNLOAD ANDROID TV APK */}
              <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-white text-black flex items-center justify-center font-bold">
                      <Download className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Android TV APK (Ready to Install)</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Compiled Leanback APK for Android 7, 2GB RAM & TV Remotes
                      </p>
                    </div>
                  </div>
                  <a
                    href="/jiotv-android-tv.apk"
                    download="jiotv-android-tv.apk"
                    className="px-4 py-2 rounded-2xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    Download APK
                  </a>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed">
                  📱 <strong className="text-neutral-200">Installation Instructions:</strong> Copy <code className="text-white font-mono">jiotv-android-tv.apk</code> to a USB flash drive or use Downloader/File Commander on your Android TV to install. Runs with hardware acceleration on Android 7+.
                </div>
              </div>

              {/* LOW-RAM TOGGLE */}
              <div className="p-4 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-800 text-white flex items-center justify-center">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        Android 7 & 2GB RAM Engine
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-black font-mono font-bold">
                          Active
                        </span>
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Caches minimal buffers (10MB limit) to prevent crashes on low-end hardware.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.lowRamMode}
                      onChange={(e) => onUpdateSettings({ lowRamMode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white peer-checked:after:bg-black" />
                  </label>
                </div>
              </div>

              {/* BUFFER PROFILE */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Buffer Profile
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'ultra_fast', title: 'Ultra-Fast', desc: 'Lowest latency tuning' },
                    { id: 'low_ram', title: 'Low RAM (Safe)', desc: 'Tuned for 2GB RAM TV' },
                    { id: 'balanced', title: 'Deep Buffer', desc: 'Smooth buffer pipeline' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => onUpdateSettings({ bufferProfile: p.id as BufferProfile })}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        settings.bufferProfile === p.id
                          ? 'bg-neutral-900 border-2 border-white text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-bold text-xs">{p.title}</div>
                      <div className="text-[10px] text-neutral-400 mt-1">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* REMOTE CONTROL REFERENCE */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2.5">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                  Android TV Remote Cheat Sheet
                </h4>
                <div className="grid grid-cols-2 gap-2.5 text-xs text-neutral-300">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-0.5 rounded-lg bg-neutral-800 border border-neutral-700 font-mono text-white">OK / Enter</kbd>
                    <span>Open TV Guide / Fullscreen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-0.5 rounded-lg bg-neutral-800 border border-neutral-700 font-mono text-white">▲ / ▼</kbd>
                    <span>Channel Up / Down</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-0.5 rounded-lg bg-neutral-800 border border-neutral-700 font-mono text-white">0 - 9</kbd>
                    <span>Direct Channel Dial</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-0.5 rounded-lg bg-neutral-800 border border-neutral-700 font-mono text-white">Back / Esc</kbd>
                    <span>Close / Exit</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-xs cursor-pointer transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>

      {/* Embedded Channel Order Modal */}
      {isOrderSubmodalOpen && (
        <ChannelOrderModal
          isOpen={isOrderSubmodalOpen}
          onClose={() => setIsOrderSubmodalOpen(false)}
          channels={channels}
          onUpdateChannels={onUpdateChannels}
          lowRamMode={settings.lowRamMode}
        />
      )}

      {/* Embedded Playlist Modal if triggered from Settings */}
      {isPlaylistSubmodalOpen && (
        <PlaylistModal
          isOpen={isPlaylistSubmodalOpen}
          onClose={() => setIsPlaylistSubmodalOpen(false)}
          channels={channels}
          onUpdateChannels={onUpdateChannels}
          lowRamMode={settings.lowRamMode}
        />
      )}
    </div>
  );
};

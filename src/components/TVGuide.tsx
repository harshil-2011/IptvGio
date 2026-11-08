import React, { useState, useEffect, useRef } from 'react';
import { Channel, BufferProfile, StreamQualityPreference } from '../types/iptv';
import { TVPlayer } from './TVPlayer';
import { getChannelPrograms } from '../utils/m3uParser';
import { Star, Tv, Search, Clock, Check, X, Maximize2 } from 'lucide-react';

interface TVGuideProps {
  isOpen: boolean;
  channels: Channel[];
  currentChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  onClose: () => void;
  onToggleFavorite: (channelId: string) => void;
  lowRamMode: boolean;
  bufferProfile: BufferProfile;
  defaultQuality: StreamQualityPreference;
}

export const TVGuide: React.FC<TVGuideProps> = ({
  isOpen,
  channels,
  currentChannel,
  onSelectChannel,
  onClose,
  onToggleFavorite,
  lowRamMode,
  bufferProfile,
  defaultQuality,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Unique categories list
  const categories = React.useMemo(() => {
    const cats = ['All', 'Favorites'];
    const seen = new Set<string>();
    channels.forEach(ch => {
      if (ch.category && !seen.has(ch.category)) {
        seen.add(ch.category);
        cats.push(ch.category);
      }
    });
    return cats;
  }, [channels]);

  // Filter channels based on Category and Search
  const filteredChannels = React.useMemo(() => {
    return channels.filter(ch => {
      const matchesCategory =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Favorites'
          ? ch.isFavorite
          : ch.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSearch =
        searchQuery.trim() === ''
          ? true
          : ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ch.number.toString().includes(searchQuery.trim()) ||
            ch.category.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [channels, selectedCategory, searchQuery]);

  // Sync focused index when guide opens
  useEffect(() => {
    if (isOpen && currentChannel) {
      const idx = filteredChannels.findIndex(c => c.id === currentChannel.id);
      if (idx !== -1) {
        setFocusedIndex(idx);
      } else {
        setFocusedIndex(0);
      }
    }
  }, [isOpen]);

  // Auto scroll focused item into view
  useEffect(() => {
    if (isOpen && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.scrollIntoView({
        behavior: lowRamMode ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }
  }, [focusedIndex, isOpen, lowRamMode]);

  // Remote key handling inside Guide:
  // - Arrow Up / Down: scroll channels & updates live preview
  // - Arrow Left / Right: change category
  // - OK / Enter: opens focused channel in full screen
  // - Back / Escape: close guide
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, filteredChannels.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentCatIdx = categories.indexOf(selectedCategory);
        if (currentCatIdx > 0) {
          setSelectedCategory(categories[currentCatIdx - 1]);
          setFocusedIndex(0);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const currentCatIdx = categories.indexOf(selectedCategory);
        if (currentCatIdx < categories.length - 1) {
          setSelectedCategory(categories[currentCatIdx + 1]);
          setFocusedIndex(0);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredChannels[focusedIndex]) {
          onSelectChannel(filteredChannels[focusedIndex]);
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'Yellow') {
        e.preventDefault();
        if (filteredChannels[focusedIndex]) {
          onToggleFavorite(filteredChannels[focusedIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredChannels, focusedIndex, categories, selectedCategory, onSelectChannel, onClose, onToggleFavorite]);

  if (!isOpen) return null;

  const focusedChannel = filteredChannels[focusedIndex] || currentChannel;
  const focusedPrograms = focusedChannel ? getChannelPrograms(focusedChannel) : [];
  const currentProgram = focusedPrograms[1];
  const nextProgram = focusedPrograms[2];

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col text-white select-none ${
        lowRamMode ? 'bg-black' : 'bg-black/95 backdrop-blur-md'
      } transition-opacity duration-200`}
    >
      {/* Top TV Guide Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-black">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-bold">
            <Tv className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-xl text-white">
                TV GUIDE
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-neutral-300 border border-neutral-800">
                LIVE PREVIEW
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Browse channels with <kbd className="text-white font-mono bg-neutral-900 px-1 rounded">▲/▼</kbd> • Press <kbd className="text-white font-mono bg-neutral-900 px-1 rounded">OK</kbd> to Open in Full Screen
            </p>
          </div>
        </div>

        {/* Search & Close */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search channel or number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-sans"
            />
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-800"
            title="Close Guide (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Category Navigation Pills */}
      <div className="px-6 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {categories.map(cat => {
          const isActive = selectedCategory === cat;
          const count =
            cat === 'All'
              ? channels.length
              : cat === 'Favorites'
              ? channels.filter(c => c.isFavorite).length
              : channels.filter(c => c.category === cat).length;

          return (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setFocusedIndex(0);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-white text-black shadow-md'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800'
              }`}
            >
              {cat === 'Favorites' && <Star className={`w-3 h-3 ${isActive ? 'fill-black text-black' : 'fill-white text-white'}`} />}
              <span>{cat}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-black text-white font-mono' : 'bg-neutral-800 text-neutral-400 font-mono'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Split: Channel List on Left + Live Channel Preview Pane on Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Numbered Channel List */}
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5 focus:outline-none"
        >
          {filteredChannels.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-neutral-400">
              <Tv className="w-12 h-12 stroke-[1.5] text-neutral-600 mb-2" />
              <p className="text-base font-medium text-white">No channels found</p>
              <p className="text-xs text-neutral-500 mt-1">Try another category or clear your search.</p>
            </div>
          ) : (
            filteredChannels.map((ch, idx) => {
              const isFocused = idx === focusedIndex;
              const isCurrentPlaying = currentChannel?.id === ch.id;
              const program = ch.programs ? ch.programs[1] : (isFocused ? currentProgram : undefined);

              return (
                <div
                  key={ch.id}
                  ref={el => { itemRefs.current[idx] = el; }}
                  onClick={() => onSelectChannel(ch)}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`group relative flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-100 border ${
                    isFocused
                      ? 'bg-neutral-900 border-2 border-white shadow-xl'
                      : isCurrentPlaying
                      ? 'bg-neutral-900/80 border border-neutral-700'
                      : 'bg-neutral-950/60 hover:bg-neutral-900/60 border border-neutral-800'
                  }`}
                >
                  {/* Left: Number + Logo + Title */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-14 h-11 rounded-xl flex items-center justify-center font-mono font-black text-base tracking-tight shrink-0 transition-colors ${
                      isFocused
                        ? 'bg-white text-black'
                        : isCurrentPlaying
                        ? 'bg-neutral-800 text-white border border-neutral-600'
                        : 'bg-neutral-900 text-neutral-300 border border-neutral-800'
                    }`}>
                      {ch.number}
                    </div>

                    {/* Logo with referrer policy and crisp initials fallback */}
                    <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm">
                      {ch.logoUrl ? (
                        <img
                          src={ch.logoUrl}
                          alt={ch.name}
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.logo-fallback')) {
                              const span = document.createElement('span');
                              span.className = 'logo-fallback font-bold text-xs text-white font-mono';
                              span.innerText = ch.name.replace(/^[^a-zA-Z0-9]+/, '').substring(0, 2).toUpperCase() || 'TV';
                              parent.appendChild(span);
                            }
                          }}
                        />
                      ) : (
                        <span className="font-bold text-xs text-white font-mono">
                          {ch.name.replace(/^[^a-zA-Z0-9]+/, '').substring(0, 2).toUpperCase() || 'TV'}
                        </span>
                      )}
                      {isCurrentPlaying && (
                        <div className="absolute inset-0 border-2 border-white rounded-xl pointer-events-none" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-base truncate ${isFocused ? 'text-white' : 'text-neutral-200'}`}>
                          {ch.name}
                        </span>
                        {isCurrentPlaying && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-black uppercase tracking-wider">
                            Playing
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono font-semibold">
                          {ch.resolution}
                        </span>
                      </div>

                      {program && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400 truncate">
                          <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                          <span className="text-neutral-300 font-medium truncate">{program.title}</span>
                          <span className="text-[11px] text-neutral-500 font-mono">({program.startTime} - {program.endTime})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Favorite Toggle */}
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="hidden sm:inline-block text-xs px-3 py-1 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800 font-medium">
                      {ch.category}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(ch.id);
                      }}
                      className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      title={ch.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    >
                      <Star className={`w-4 h-4 ${ch.isFavorite ? 'fill-white text-white' : 'text-neutral-600'}`} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Preview Card: LIVE VIDEO CHANNEL PREVIEW + Full Screen Launch */}
        {focusedChannel && (
          <div className="w-96 flex flex-col border-l border-neutral-800 bg-neutral-950 p-6 overflow-y-auto shrink-0">
            {/* Live Video Preview Window */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-widest font-bold text-neutral-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Live Channel Preview
                </span>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white text-black font-bold">
                  #{focusedChannel.number}
                </span>
              </div>

              {/* Embedded Live Video Player with rounded-2xl */}
              <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-neutral-800 bg-black relative shadow-lg">
                <TVPlayer
                  channel={focusedChannel}
                  lowRamMode={lowRamMode}
                  bufferProfile={bufferProfile}
                  defaultQuality={defaultQuality}
                  aspectRatio="fit"
                  isMuted={false}
                  volume={0.8}
                  isMiniPreview={true}
                  onPlayerClick={() => onSelectChannel(focusedChannel)}
                />
              </div>
            </div>

            {/* Channel Info & Details */}
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white leading-tight">
                {focusedChannel.name}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {focusedChannel.category} • {focusedChannel.resolution} • Channel #{focusedChannel.number}
              </p>
            </div>

            {/* Current Program Details */}
            {currentProgram && (
              <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-white font-bold uppercase tracking-wider text-[11px]">
                    Now Playing
                  </span>
                  <span className="text-neutral-400 font-mono text-[11px]">
                    {currentProgram.startTime} - {currentProgram.endTime}
                  </span>
                </div>
                <h4 className="font-bold text-white text-xs mb-1">{currentProgram.title}</h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed mb-2.5">
                  {currentProgram.description}
                </p>
                <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full bg-white w-3/5 rounded-full" />
                </div>
              </div>
            )}

            {/* Up Next */}
            {nextProgram && (
              <div className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 mb-5">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px]">Up Next</span>
                  <span className="text-neutral-400 font-mono text-[10px]">{nextProgram.startTime}</span>
                </div>
                <h5 className="font-semibold text-neutral-300 text-xs">{nextProgram.title}</h5>
              </div>
            )}

            {/* Action: Open in Full Screen (Press OK) */}
            <button
              onClick={() => onSelectChannel(focusedChannel)}
              className="w-full py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98"
            >
              <Maximize2 className="w-4 h-4" />
              Open in Full Screen (OK)
            </button>
            <p className="text-center text-[11px] text-neutral-500 mt-2 font-mono">
              Press Enter/OK on remote to maximize
            </p>
          </div>
        )}
      </div>

      {/* Guide Bottom Hint Bar */}
      <div className="px-6 py-2.5 bg-black border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 font-mono">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded-lg bg-neutral-900 text-white border border-neutral-800">▲/▼</kbd> Preview Channel
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded-lg bg-neutral-900 text-white border border-neutral-800">◀/▶</kbd> Category
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded-lg bg-neutral-900 text-white border border-neutral-800">OK</kbd> Watch Full Screen
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded-lg bg-neutral-900 text-white border border-neutral-800">ESC/Back</kbd> Exit
          </span>
        </div>
        <div className="text-neutral-500">
          Android 7 Leanback Engine
        </div>
      </div>
    </div>
  );
};

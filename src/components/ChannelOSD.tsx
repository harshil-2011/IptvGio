import React from 'react';
import { Channel } from '../types/iptv';
import { getChannelPrograms } from '../utils/m3uParser';
import { Star, Radio } from 'lucide-react';

interface ChannelOSDProps {
  channel: Channel | null;
  isVisible: boolean;
  isBuffering: boolean;
  lowRamMode: boolean;
}

export const ChannelOSD: React.FC<ChannelOSDProps> = ({
  channel,
  isVisible,
  isBuffering,
  lowRamMode,
}) => {
  if (!isVisible || !channel) return null;

  const programs = getChannelPrograms(channel);
  const currentProgram = programs[1];
  const nextProgram = programs[2];

  return (
    <div
      className={`fixed bottom-6 left-6 right-6 md:left-12 md:right-12 z-40 transition-all duration-300 pointer-events-none select-none ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className={`rounded-3xl p-5 border border-neutral-800 text-white shadow-2xl ${
          lowRamMode ? 'bg-black' : 'bg-black/95 backdrop-blur-md'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left: Number + Logo + Titles */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Bold Channel Number Badge in Crisp White on Black */}
            <div className="w-16 h-14 rounded-2xl bg-white text-black flex items-center justify-center font-mono font-black text-2xl shadow-md shrink-0">
              {channel.number}
            </div>

            {/* Logo / Fallback with referrer policy and crisp initials */}
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center relative">
              {channel.logoUrl ? (
                <img
                  src={channel.logoUrl}
                  alt={channel.name}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain p-1.5"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.logo-fallback')) {
                      const span = document.createElement('span');
                      span.className = 'logo-fallback font-bold text-sm text-white font-mono';
                      span.innerText = channel.name.replace(/^[^a-zA-Z0-9]+/, '').substring(0, 2).toUpperCase() || 'TV';
                      parent.appendChild(span);
                    }
                  }}
                />
              ) : (
                <span className="font-bold text-sm text-white font-mono">
                  {channel.name.replace(/^[^a-zA-Z0-9]+/, '').substring(0, 2).toUpperCase() || 'TV'}
                </span>
              )}
            </div>

            {/* Channel and EPG info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight truncate">
                  {channel.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-medium uppercase tracking-wider">
                  {channel.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white text-black text-xs font-mono font-bold">
                  {channel.resolution}
                </span>
                {channel.isFavorite && (
                  <Star className="w-4 h-4 fill-white text-white inline" />
                )}
                {isBuffering && (
                  <span className="text-xs text-neutral-400 animate-pulse font-mono">
                    • Loading Stream
                  </span>
                )}
              </div>

              {/* Current show title */}
              {currentProgram && (
                <div className="flex items-center gap-2 mt-1 text-sm text-neutral-300">
                  <span className="font-semibold text-white">{currentProgram.title}</span>
                  <span className="text-xs text-neutral-400 font-mono">({currentProgram.startTime} - {currentProgram.endTime})</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Timeline & Up Next */}
          {currentProgram && (
            <div className="w-full md:w-80 shrink-0 flex flex-col justify-center">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono mb-1.5">
                <span className="text-neutral-200 font-semibold uppercase tracking-wider">Airing Now</span>
                <span>45%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-900 border border-neutral-800 overflow-hidden mb-2">
                <div className="h-full bg-white w-[45%] rounded-full" />
              </div>

              {nextProgram && (
                <div className="flex items-center justify-between text-xs text-neutral-400 truncate">
                  <span className="text-neutral-500">Up Next:</span>
                  <span className="text-neutral-200 truncate ml-1 font-medium">{nextProgram.title}</span>
                  <span className="text-neutral-500 font-mono ml-2">{nextProgram.startTime}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Channel } from '../types/iptv';
import { Hash, Check } from 'lucide-react';

interface ChannelDialerProps {
  digits: string;
  matchedChannel: Channel | null;
  onConfirm: () => void;
  lowRamMode: boolean;
}

export const ChannelDialer: React.FC<ChannelDialerProps> = ({
  digits,
  matchedChannel,
  onConfirm,
  lowRamMode,
}) => {
  if (!digits) return null;

  return (
    <div className="fixed top-8 right-8 z-50 pointer-events-none select-none">
      <div
        className={`px-7 py-5 rounded-3xl border-2 border-white text-white shadow-2xl flex flex-col items-center ${
          lowRamMode ? 'bg-black' : 'bg-black/95 backdrop-blur-md'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <Hash className="w-4 h-4 text-neutral-400" />
          <span className="text-[11px] uppercase tracking-widest text-neutral-400 font-bold">
            Channel Number
          </span>
        </div>

        <div className="font-mono font-black text-4xl text-white tracking-widest my-1">
          {digits}
          <span className="animate-pulse text-neutral-400">_</span>
        </div>

        {matchedChannel ? (
          <div className="mt-1 text-center">
            <p className="text-sm font-bold text-white max-w-[200px] truncate">
              {matchedChannel.name}
            </p>
            <span className="text-[11px] text-neutral-400 font-mono flex items-center justify-center gap-1 mt-0.5">
              <Check className="w-3 h-3 text-white" /> Press OK to tune
            </span>
          </div>
        ) : (
          <p className="text-xs text-neutral-400 mt-1 font-mono">
            No channel #{digits}
          </p>
        )}

        {/* Countdown line */}
        <div className="w-full h-1 rounded-full bg-neutral-900 border border-neutral-800 overflow-hidden mt-3">
          <div className="h-full bg-white w-full animate-[shrink_1.4s_linear_forwards]" />
        </div>
      </div>
    </div>
  );
};

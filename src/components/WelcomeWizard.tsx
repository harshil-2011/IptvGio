import React, { useState } from 'react';
import { Channel } from '../types/iptv';
import { DEFAULT_CHANNELS } from '../data/defaultChannels';
import { parseM3U } from '../utils/m3uParser';
import { Tv, Sparkles, Link, Check, Loader2, ArrowRight } from 'lucide-react';

interface WelcomeWizardProps {
  isOpen: boolean;
  onComplete: (channels: Channel[]) => void;
  lowRamMode: boolean;
}

export const WelcomeWizard: React.FC<WelcomeWizardProps> = ({
  isOpen,
  onComplete,
  lowRamMode,
}) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoadDefaults = () => {
    onComplete(DEFAULT_CHANNELS);
  };

  const handleImportUrl = async () => {
    const url = urlInput.trim();
    if (!url) {
      setErrorMsg('Please enter a valid M3U or M3U8 playlist URL');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    let text = '';
    let lastErr = '';

    const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

    if (!isFileProtocol) {
      try {
        const res = await fetch(`/api/proxy-m3u?url=${encodeURIComponent(url)}`);
        if (res.ok) text = await res.text();
      } catch (e: any) {
        lastErr = e.message;
      }
    }

    if (!text) {
      try {
        const res2 = await fetch(url);
        if (res2.ok) text = await res2.text();
      } catch (e: any) {
        lastErr = e.message;
        try {
          const res3 = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
          if (res3.ok) text = await res3.text();
        } catch (e: any) {
          lastErr = e.message;
          try {
            const res4 = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
            if (res4.ok) text = await res4.text();
          } catch (e: any) {
            lastErr = e.message;
          }
        }
      }
    }

    setIsLoading(false);

    if (!text || text.trim().length === 0) {
      setErrorMsg(`Failed to download playlist: ${lastErr || 'Check URL'}`);
      return;
    }

    try {
      const parsed = parseM3U(text);
      if (parsed.length === 0) {
        setErrorMsg('No valid channel streams found in playlist.');
      } else {
        onComplete(parsed);
      }
    } catch (err: any) {
      setErrorMsg(`Error parsing playlist: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black select-none text-white">
      <div className={`w-full max-w-xl rounded-3xl border-2 border-neutral-800 p-8 shadow-2xl flex flex-col ${lowRamMode ? 'bg-black' : 'bg-neutral-950/95 backdrop-blur-2xl'}`}>
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-lg shrink-0">
            <Tv className="w-7 h-7 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              JioTV Android TV Setup
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Welcome! Choose how you want to load your TV channels to get started.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-neutral-900 border border-neutral-700 text-xs text-neutral-200">
            {errorMsg}
          </div>
        )}

        {/* Options */}
        <div className="space-y-4">
          {/* Option 1: Load Default Curated Working Channels */}
          <button
            onClick={handleLoadDefaults}
            className="w-full p-5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-extrabold text-sm flex items-center justify-between transition-all cursor-pointer shadow-xl group"
          >
            <div className="flex items-center gap-3 text-left">
              <Sparkles className="w-5 h-5 text-black shrink-0" />
              <div>
                <div>Load Default Curated TV Pack</div>
                <div className="text-xs font-normal text-neutral-700 mt-0.5">
                  Instant start with 100% verified News, Sports, Movies & Music HD streams
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Option 2: Custom M3U Playlist URL */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 uppercase tracking-wider">
              <Link className="w-4 h-4 text-white" />
              <span>Or Import Custom M3U Playlist URL</span>
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/playlist.m3u"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-mono"
              />
              <button
                onClick={handleImportUrl}
                disabled={isLoading || !urlInput.trim()}
                className="px-5 py-3 rounded-2xl bg-white hover:bg-neutral-200 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Import
                  </>
                )}
              </button>
            </div>

            {/* Quick Test Links */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: 'Global News', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
                { label: 'Free-TV Live', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => setUrlInput(item.url)}
                  className="px-3 py-1 rounded-full bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  + {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500 font-mono">
          <span>Android TV Leanback Edition</span>
          <span>Zero Buffering</span>
        </div>

      </div>
    </div>
  );
};

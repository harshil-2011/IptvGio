import React, { useState } from 'react';
import { Channel } from '../types/iptv';
import { parseM3U, exportToM3U } from '../utils/m3uParser';
import { DEFAULT_CHANNELS } from '../data/defaultChannels';
import { 
  FileUp, Link, FileText, Download, RotateCcw, 
  Check, AlertCircle, X, Tv, Loader2 
} from 'lucide-react';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  onUpdateChannels: (newChannels: Channel[]) => void;
  lowRamMode: boolean;
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  channels,
  onUpdateChannels,
  lowRamMode,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'paste' | 'file' | 'presets'>('presets');
  const [playlistUrl, setPlaylistUrl] = useState<string>('');
  const [pastedContent, setPastedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const presets = [
    {
      name: 'Default Curated Pack (Working HLS)',
      desc: 'News, Sports, Movies, Music, Docs & Ambient streams',
      channels: DEFAULT_CHANNELS,
    },
    {
      name: 'Global News 24/7',
      desc: 'Bloomberg, France24, DW, Euronews, Al Jazeera',
      channels: DEFAULT_CHANNELS.filter(c => c.category === 'News' || c.category === 'Infotainment'),
    },
    {
      name: 'Sports & Movies Pack',
      desc: 'Red Bull TV, Action Sports, Classic Movies, Retro TV',
      channels: DEFAULT_CHANNELS.filter(c => c.category === 'Sports' || c.category === 'Entertainment' || c.category === 'Movies'),
    },
  ];

  const handleImportUrl = async () => {
    const url = playlistUrl.trim();
    if (!url) {
      setStatusMessage({ type: 'error', text: 'Please enter an M3U or M3U8 URL' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    let text = '';
    let lastError = '';

    const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

    // 1. Try local server proxy (if not in Android APK file:// mode)
    if (!isFileProtocol) {
      try {
        const localProxyUrl = `/api/proxy-m3u?url=${encodeURIComponent(url)}`;
        const res = await fetch(localProxyUrl);
        if (res.ok) {
          text = await res.text();
        } else {
          throw new Error(`Server proxy error: ${res.status}`);
        }
      } catch (e: any) {
        lastError = e.message;
      }
    }

    // 2. Try direct fetch / CORS proxies if text is still empty
    if (!text) {
      try {
        const directRes = await fetch(url);
        if (directRes.ok) {
          text = await directRes.text();
        } else {
          throw new Error(`Direct fetch error: ${directRes.status}`);
        }
      } catch (e2: any) {
        lastError = e2.message;
        // Try allorigins proxy
        try {
          const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          const aoRes = await fetch(allOriginsUrl);
          if (aoRes.ok) {
            text = await aoRes.text();
          } else {
            throw new Error(`AllOrigins proxy error: ${aoRes.status}`);
          }
        } catch (e3: any) {
          lastError = e3.message;
          // Try corsproxy.io
          try {
            const cpUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const cpRes = await fetch(cpUrl);
            if (cpRes.ok) {
              text = await cpRes.text();
            } else {
              throw new Error(`CORS proxy error: ${cpRes.status}`);
            }
          } catch (e4: any) {
            lastError = e4.message;
          }
        }
      }
    }

    if (!text || text.trim().length === 0) {
      setIsLoading(false);
      setStatusMessage({
        type: 'error',
        text: `Unable to download playlist. Check URL or network: ${lastError}`,
      });
      return;
    }

    try {
      const parsed = parseM3U(text);
      if (parsed.length === 0) {
        setStatusMessage({
          type: 'error',
          text: 'No valid channel streams found in the downloaded playlist file.',
        });
      } else {
        onUpdateChannels(parsed);
        setStatusMessage({
          type: 'success',
          text: `Successfully imported ${parsed.length} channels with auto-numbering!`,
        });
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error parsing playlist: ${err.message || 'Invalid format'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportPasted = () => {
    if (!pastedContent.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste M3U playlist text' });
      return;
    }

    const parsed = parseM3U(pastedContent);
    if (parsed.length === 0) {
      setStatusMessage({ type: 'error', text: 'Could not parse any channels. Make sure content contains #EXTINF.' });
    } else {
      onUpdateChannels(parsed);
      setStatusMessage({ type: 'success', text: `Successfully imported ${parsed.length} numbered channels!` });
      setTimeout(() => onClose(), 1200);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseM3U(content);
        if (parsed.length > 0) {
          onUpdateChannels(parsed);
          setStatusMessage({ type: 'success', text: `Imported ${parsed.length} channels from ${file.name}!` });
          setTimeout(() => onClose(), 1200);
        } else {
          setStatusMessage({ type: 'error', text: 'No valid channels found in the uploaded file.' });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const m3u = exportToM3U(channels);
    const blob = new Blob([m3u], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `iptv_channels_${Date.now()}.m3u`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDefault = () => {
    onUpdateChannels(DEFAULT_CHANNELS);
    setStatusMessage({ type: 'success', text: 'Reset to default channels.' });
    setTimeout(() => onClose(), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div
        className={`w-full max-w-2xl rounded-3xl border border-neutral-800 p-6 text-white shadow-2xl flex flex-col max-h-[90vh] ${
          lowRamMode ? 'bg-black' : 'bg-neutral-950/95 backdrop-blur-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-bold">
              <Tv className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">IPTV Playlist Import</h2>
              <p className="text-xs text-neutral-400">
                Supports automatic channel numbers and category organization
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

        {/* Tabs - Rounded pills */}
        <div className="grid grid-cols-4 gap-2 my-4 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800">
          {[
            { id: 'presets', label: 'Presets' },
            { id: 'url', label: 'M3U URL' },
            { id: 'paste', label: 'Paste M3U' },
            { id: 'file', label: 'Upload File' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`mb-4 p-3 rounded-2xl flex items-center gap-2.5 text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'bg-neutral-900 border border-white text-white'
                : 'bg-neutral-900 border border-neutral-700 text-neutral-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-white shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-400">
                Choose a pre-configured channel pack with numbering:
              </p>
              {presets.map((preset, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between gap-4 transition-all"
                >
                  <div>
                    <h3 className="font-bold text-sm text-white">{preset.name}</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">{preset.desc}</p>
                    <span className="inline-block mt-2 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                      {preset.channels.length} Channels
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onUpdateChannels(preset.channels);
                      setStatusMessage({ type: 'success', text: `Loaded "${preset.name}"!` });
                      setTimeout(() => onClose(), 1000);
                    }}
                    className="px-4 py-2 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-all cursor-pointer shrink-0"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  M3U / M3U8 Playlist URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/playlist.m3u"
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-mono"
                  />
                  {playlistUrl && (
                    <button
                      type="button"
                      onClick={() => setPlaylistUrl('')}
                      className="px-3 rounded-2xl bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Quick 1-click test URLs */}
              <div>
                <span className="block text-[11px] text-neutral-400 mb-1.5 font-medium">Quick Test Playlists:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Global News Live', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
                    { label: 'Free-TV Live', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8' },
                    { label: 'Classic Movies Pack', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' }
                  ].map((testItem, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPlaylistUrl(testItem.url)}
                      className="px-3 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      + {testItem.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 leading-relaxed">
                💡 Automatically bypasses CORS and organizes into numbered channels (101+, 201+...). If your provider requires custom authorization or token cookies, you can also use <span className="text-white font-semibold">Paste M3U</span> or <span className="text-white font-semibold">Upload File</span>.
              </div>

              <button
                onClick={handleImportUrl}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl bg-white hover:bg-neutral-200 disabled:opacity-50 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    Fetching & Numbering Channels...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Import & Auto-Number Channels
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Paste M3U Content
                </label>
                <textarea
                  rows={8}
                  placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-chno=&quot;101&quot; group-title=&quot;News&quot;,My News&#10;https://..."
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-mono"
                />
              </div>

              <button
                onClick={handleImportPasted}
                className="w-full py-3 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Parse & Arrange Numbering
              </button>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-neutral-800 hover:border-white rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer relative bg-neutral-900/40">
                <input
                  type="file"
                  accept=".m3u,.m3u8,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileUp className="w-10 h-10 text-white mb-3" />
                <p className="text-sm font-bold text-white">Click or Drag .m3u / .m3u8 file here</p>
                <p className="text-xs text-neutral-500 mt-1">Accepts standard IPTV playlist files</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs">
          <button
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Default
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-white font-bold transition-colors cursor-pointer hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            Export M3U with Numbers
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Channel } from '../types/iptv';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Hash, Search, 
  Check, X, Shuffle, Sparkles, Star, AlertCircle, RefreshCw 
} from 'lucide-react';

interface ChannelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  onUpdateChannels: (newChannels: Channel[]) => void;
  lowRamMode: boolean;
}

export const ChannelOrderModal: React.FC<ChannelOrderModalProps> = ({
  isOpen,
  onClose,
  channels,
  onUpdateChannels,
  lowRamMode,
}) => {
  const [localChannels, setLocalChannels] = useState<Channel[]>(channels);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNumValue, setEditNumValue] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Sync if props channels change
  React.useEffect(() => {
    setLocalChannels(channels);
  }, [channels, isOpen]);

  if (!isOpen) return null;

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // 1. Auto Arrange: Sequential (1 to N)
  const handleAutoArrangeSequential = () => {
    const arranged = localChannels.map((ch, idx) => ({
      ...ch,
      number: idx + 1,
    }));
    setLocalChannels(arranged);
    onUpdateChannels(arranged);
    showNotice(`All ${arranged.length} channels auto-numbered sequentially (1 to ${arranged.length})!`);
  };

  // 2. Auto Arrange: By Category Blocks (101+, 201+, 301+...)
  const handleAutoArrangeCategory = () => {
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

    // Sort by category first
    const sorted = [...localChannels].sort((a, b) => {
      const catA = a.category || 'General';
      const catB = b.category || 'General';
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.localeCompare(b.name);
    });

    const arranged = sorted.map((ch) => {
      const cat = ch.category || 'General';
      const base = categoryBases[cat] || 900;
      if (!counters[cat]) {
        counters[cat] = base + 1;
      }

      let candidate = counters[cat];
      while (used.has(candidate)) {
        candidate++;
      }
      counters[cat] = candidate + 1;
      used.add(candidate);

      return {
        ...ch,
        number: candidate,
      };
    });

    arranged.sort((a, b) => a.number - b.number);
    setLocalChannels(arranged);
    onUpdateChannels(arranged);
    showNotice(`Auto-arranged into Category Blocks (101+, 201+, 301+...)!`);
  };

  // 3. Auto Arrange: Alphabetical (A to Z, 1 to N)
  const handleAutoArrangeAlphabetical = () => {
    const sorted = [...localChannels].sort((a, b) => a.name.localeCompare(b.name));
    const arranged = sorted.map((ch, idx) => ({
      ...ch,
      number: idx + 1,
    }));
    setLocalChannels(arranged);
    onUpdateChannels(arranged);
    showNotice(`Channels sorted alphabetically and numbered 1 to ${arranged.length}!`);
  };

  // 4. Auto Arrange: Favorites First
  const handleAutoArrangeFavoritesFirst = () => {
    const sorted = [...localChannels].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.number - b.number;
    });
    const arranged = sorted.map((ch, idx) => ({
      ...ch,
      number: idx + 1,
    }));
    setLocalChannels(arranged);
    onUpdateChannels(arranged);
    showNotice(`Favorites prioritized at the top (1 to ${arranged.length})!`);
  };

  // Move channel UP in list
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...localChannels];
    const prev = updated[index - 1];
    const curr = updated[index];

    // Swap numbers
    const tempNum = prev.number;
    prev.number = curr.number;
    curr.number = tempNum;

    // Swap array positions
    updated[index - 1] = curr;
    updated[index] = prev;

    setLocalChannels(updated);
    onUpdateChannels(updated);
  };

  // Move channel DOWN in list
  const handleMoveDown = (index: number) => {
    if (index >= localChannels.length - 1) return;
    const updated = [...localChannels];
    const next = updated[index + 1];
    const curr = updated[index];

    // Swap numbers
    const tempNum = next.number;
    next.number = curr.number;
    curr.number = tempNum;

    // Swap array positions
    updated[index + 1] = curr;
    updated[index] = next;

    setLocalChannels(updated);
    onUpdateChannels(updated);
  };

  // Make channel #1 (Top)
  const handleMakeTop = (channelId: string) => {
    const chIndex = localChannels.findIndex(c => c.id === channelId);
    if (chIndex === -1 || chIndex === 0) return;

    const target = localChannels[chIndex];
    const rest = localChannels.filter(c => c.id !== channelId);
    const updated = [target, ...rest].map((ch, idx) => ({
      ...ch,
      number: idx + 1,
    }));

    setLocalChannels(updated);
    onUpdateChannels(updated);
    showNotice(`Moved "${target.name}" to Channel #1!`);
  };

  // Save specific edited channel number
  const handleSaveChannelNumber = (channelId: string) => {
    const newNum = parseInt(editNumValue, 10);
    if (isNaN(newNum) || newNum < 1) {
      setEditingId(null);
      return;
    }

    const updated = localChannels.map(ch => {
      if (ch.id === channelId) {
        return { ...ch, number: newNum };
      }
      // If another channel had this exact number, swap numbers so no collision
      if (ch.number === newNum) {
        const originalChannel = localChannels.find(c => c.id === channelId);
        return { ...ch, number: originalChannel ? originalChannel.number : ch.number + 1 };
      }
      return ch;
    });

    updated.sort((a, b) => a.number - b.number);
    setLocalChannels(updated);
    onUpdateChannels(updated);
    setEditingId(null);
    showNotice(`Updated channel number to #${newNum}!`);
  };

  // Filter for display
  const displayedChannels = useMemo(() => {
    if (!searchQuery.trim()) return localChannels;
    const q = searchQuery.toLowerCase().trim();
    return localChannels.filter(
      c => c.name.toLowerCase().includes(q) || c.number.toString().includes(q) || c.category.toLowerCase().includes(q)
    );
  }, [localChannels, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div
        className={`w-full max-w-3xl rounded-3xl border border-neutral-800 p-6 text-white shadow-2xl flex flex-col max-h-[92vh] ${
          lowRamMode ? 'bg-black' : 'bg-neutral-950/95 backdrop-blur-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-bold">
              <ArrowUpDown className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Channel Numbering & Reorder</h2>
              <p className="text-xs text-neutral-400">
                Auto-arrange channels or customize and reorder channel numbers freely
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

        {/* Notice toast */}
        {statusNotice && (
          <div className="my-3 p-3 rounded-2xl bg-neutral-900 border border-white text-white text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-white shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* 1-Click Auto Arrange Presets */}
        <div className="my-3 space-y-2">
          <span className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
            Auto-Arrange Presets (Instant Re-numbering):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={handleAutoArrangeSequential}
              className="p-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-white group-hover:text-white">
                <Hash className="w-3.5 h-3.5 text-neutral-400" />
                Sequential (1 to {localChannels.length})
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Clean sequential numbering</div>
            </button>

            <button
              onClick={handleAutoArrangeCategory}
              className="p-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-white group-hover:text-white">
                <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                Category Blocks
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">101+ News, 201+ Sports...</div>
            </button>

            <button
              onClick={handleAutoArrangeFavoritesFirst}
              className="p-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-white group-hover:text-white">
                <Star className="w-3.5 h-3.5 text-neutral-400" />
                Favorites First
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Favorites at 1, 2, 3...</div>
            </button>

            <button
              onClick={handleAutoArrangeAlphabetical}
              className="p-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-white group-hover:text-white">
                <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                Alphabetical (A-Z)
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Sort by name & renumber</div>
            </button>
          </div>
        </div>

        {/* Search & Counter */}
        <div className="flex items-center justify-between gap-3 my-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by channel name or number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-sans"
            />
          </div>
          <span className="text-xs font-mono text-neutral-400 shrink-0">
            {displayedChannels.length} / {localChannels.length} Channels
          </span>
        </div>

        {/* Channel Reordering List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
          {displayedChannels.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              No matching channels found.
            </div>
          ) : (
            displayedChannels.map((ch, idx) => {
              const originalIndex = localChannels.findIndex(c => c.id === ch.id);
              const isEditing = editingId === ch.id;

              return (
                <div
                  key={ch.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 transition-all gap-3"
                >
                  {/* Left: Number (Editable on click) + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Number Badge with Edit Option */}
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          autoFocus
                          value={editNumValue}
                          onChange={e => setEditNumValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveChannelNumber(ch.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="w-16 h-10 text-center rounded-xl bg-white text-black font-mono font-black text-sm focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveChannelNumber(ch.id)}
                          className="p-2 rounded-xl bg-white text-black hover:bg-neutral-200 cursor-pointer"
                          title="Save Number"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(ch.id);
                          setEditNumValue(ch.number.toString());
                        }}
                        className="w-14 h-10 rounded-xl bg-white text-black font-mono font-black text-sm flex items-center justify-center shrink-0 cursor-pointer hover:ring-2 hover:ring-neutral-400 transition-all shadow-sm"
                        title="Click to change channel number"
                      >
                        #{ch.number}
                      </button>
                    )}

                    {/* Channel Name & Category */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">
                          {ch.name}
                        </span>
                        {ch.isFavorite && (
                          <Star className="w-3.5 h-3.5 fill-white text-white shrink-0" />
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                          {ch.resolution}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                        {ch.category} • Click number to edit
                      </p>
                    </div>
                  </div>

                  {/* Right: Reorder Up / Down Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleMakeTop(ch.id)}
                      disabled={originalIndex === 0}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-[11px] font-bold text-neutral-200 hover:text-white transition-colors cursor-pointer"
                      title="Move to #1"
                    >
                      Top (#1)
                    </button>

                    <button
                      onClick={() => handleMoveUp(originalIndex)}
                      disabled={originalIndex === 0}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleMoveDown(originalIndex)}
                      disabled={originalIndex === localChannels.length - 1}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
          <span className="text-neutral-500 font-mono">
            Changes apply in real time to Guide and Remote dialer
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-xs cursor-pointer transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

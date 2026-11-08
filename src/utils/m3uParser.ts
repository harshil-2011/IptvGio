import { Channel, EPGProgram } from '../types/iptv';
import { generateDynamicEPG } from '../data/defaultChannels';

// Maximum channels imported into memory (increased to 15000 for massive IPTV provider playlists)
export const MAX_IMPORT_CHANNELS = 15000;

export function getChannelPrograms(channel: Channel): EPGProgram[] {
  if (channel.programs && channel.programs.length > 0) {
    return channel.programs;
  }
  return generateDynamicEPG(channel.name, channel.category);
}

/**
 * Checks if a string is purely numeric, empty, or a generic placeholder like "Channel 1", "CH 2"
 */
export function isPlaceholderOrNumeric(name: string): boolean {
  if (!name || !name.trim()) return true;
  const trimmed = name.trim();
  // Purely numeric, e.g. "1", "2", "3", "101"
  if (/^\d+$/.test(trimmed)) return true;
  // Generic like "Channel 1", "Channel 2", "channel 12", "CH 1", "CH1"
  if (/^(?:channel|ch)[\s_#-]*\d+$/i.test(trimmed)) return true;
  // Generic words
  if (/^(?:channel|stream|live|unknown|tv|untitled|video|feed)$/i.test(trimmed)) return true;
  return false;
}

/**
 * Strips common junk, brackets, language prefixes, and resolution tags from channel titles
 */
export function cleanChannelName(rawName: string): string {
  if (!rawName) return '';
  let name = rawName.trim();

  // Remove country/language/resolution brackets: [IN], [US], (IN), {US}, |IN|, etc.
  name = name.replace(/^\[[^\]]*\]\s*/g, '');
  name = name.replace(/^\([^\)]*\)\s*/g, '');
  name = name.replace(/^\{[^\}]*\}\s*/g, '');
  name = name.replace(/^\|[^\|]*\|\s*/g, '');

  // Remove country prefix patterns: "IN:", "IN -", "US:", "UK -", "EN |", "HIN -", etc.
  name = name.replace(/^[A-Z]{2,4}\s*[:|\-–]\s*/i, '');

  // Remove leading numbers followed by separator (e.g. "101 - HBO" -> "HBO", "01. Star Plus" -> "Star Plus")
  const leadingNumMatch = name.match(/^\d{1,4}\s*[\.\-–:|]\s*(.+)$/);
  if (leadingNumMatch && leadingNumMatch[1].trim() && !isPlaceholderOrNumeric(leadingNumMatch[1])) {
    name = leadingNumMatch[1].trim();
  }

  // Remove resolution prefix: "FHD:", "HD:", "4K:", "SD:"
  name = name.replace(/^(?:4K|UHD|FHD|HD|SD)\s*[:|\-–]\s*/i, '');

  // Remove trailing decorative symbols and pipes
  name = name.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();

  return name || rawName.trim();
}

/**
 * Robust attribute extractor supporting double quotes, single quotes, and unquoted values
 */
export function extractAttr(text: string, keys: string[]): string {
  if (!text) return '';
  for (const key of keys) {
    // 1. Double quotes: tvg-logo="https://..."
    const dq = new RegExp(`(?:\\s|^)${key}\\s*=\\s*"([^"]*)"`, 'i');
    const m1 = text.match(dq);
    if (m1 && m1[1] !== undefined && m1[1].trim()) return m1[1].trim();

    // 2. Single quotes: tvg-logo='https://...'
    const sq = new RegExp(`(?:\\s|^)${key}\\s*=\\s*'([^']*)'`, 'i');
    const m2 = text.match(sq);
    if (m2 && m2[1] !== undefined && m2[1].trim()) return m2[1].trim();

    // 3. Unquoted value: tvg-logo=https://...
    const uq = new RegExp(`(?:\\s|^)${key}\\s*=\\s*([^\\s,]+)`, 'i');
    const m3 = text.match(uq);
    if (m3 && m3[1] !== undefined && m3[1].trim()) return m3[1].trim();
  }
  return '';
}

/**
 * Extracts a meaningful channel name from URL pathname if title is missing
 */
export function getNameFromUrl(streamUrl: string): string {
  try {
    const urlObj = new URL(streamUrl);
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    for (let i = pathSegments.length - 1; i >= 0; i--) {
      let seg = pathSegments[i].replace(/\.[^/.]+$/, ''); // remove extension
      // Skip generic segment names
      if (/^(chunklist|index|master|playlist|live|stream|video|tracks|mono|hls|prog_index|manifest|media)$/i.test(seg)) {
        continue;
      }
      // Skip purely numeric segments like /1234/ or /1/
      if (/^\d+$/.test(seg)) {
        continue;
      }
      seg = decodeURIComponent(seg).replace(/[_\-+]/g, ' ').trim();
      if (seg.length >= 2 && !isPlaceholderOrNumeric(seg)) {
        // Capitalize each word nicely
        return seg.replace(/\b\w/g, l => l.toUpperCase());
      }
    }
  } catch {
    // ignore
  }
  return '';
}

export function parseM3U(rawContent: string): Channel[] {
  if (!rawContent) return [];

  // Remove potential UTF-8 BOM
  let content = rawContent.replace(/^\uFEFF/, '').trim();
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];

  let currentExtInf: string | null = null;
  let currentGroup: string | null = null;
  let currentLogo: string | null = null;
  let lineIdx = 0;
  const usedNumbers = new Set<number>();

  const addChannel = (extInf: string, streamUrl: string) => {
    if (channels.length >= MAX_IMPORT_CHANNELS) return;
    const cleanUrl = streamUrl.trim();
    if (!cleanUrl || (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('rtmp://') && !cleanUrl.startsWith('rtsp://') && !cleanUrl.endsWith('.m3u8') && !cleanUrl.endsWith('.mp4'))) {
      return;
    }

    lineIdx++;

    // Extract EXTINF attributes with full fallback keys
    const tvgChno = extractAttr(extInf, ['tvg-chno', 'channel-id', 'tvg-num', 'chno', 'channel-number']);
    const tvgName = extractAttr(extInf, ['tvg-name', 'channel-name', 'name', 'tvg-id']);
    const tvgId = extractAttr(extInf, ['tvg-id', 'channel-id']);
    const tvgLogo = extractAttr(extInf, ['tvg-logo', 'logo', 'logo-url', 'tvg-logo-small', 'icon', 'channel-logo']) || currentLogo || '';
    const groupTitle = extractAttr(extInf, ['group-title', 'group', 'category']) || currentGroup || '';

    currentLogo = null;
    currentGroup = null;

    // Extract title after the separating comma in #EXTINF (ignoring commas inside quotes)
    let titleAfterComma = '';
    let inDQuote = false;
    let inSQuote = false;
    let commaIndex = -1;
    for (let c = 0; c < extInf.length; c++) {
      const char = extInf[c];
      if (char === '"' && !inSQuote) {
        inDQuote = !inDQuote;
      } else if (char === "'" && !inDQuote) {
        inSQuote = !inSQuote;
      } else if (char === ',' && !inDQuote && !inSQuote) {
        commaIndex = c;
      }
    }
    if (commaIndex !== -1) {
      titleAfterComma = extInf.substring(commaIndex + 1).trim();
    }

    const commaTitle = titleAfterComma.trim();

    // Determine Channel Number
    let channelNum = 0;
    if (tvgChno && !isNaN(parseInt(tvgChno, 10))) {
      channelNum = parseInt(tvgChno, 10);
    } else if (commaTitle && /^\d+$/.test(commaTitle)) {
      // In many playlists (JioTV / DTH M3U), the number after comma is the LCN! e.g. `#EXTINF:..., 101`
      channelNum = parseInt(commaTitle, 10);
    } else {
      // Check if title starts with number: "101 - Star Plus"
      const numPrefix = commaTitle.match(/^(\d{1,4})\s*[\.\-–:|]\s*/);
      if (numPrefix) {
        channelNum = parseInt(numPrefix[1], 10);
      }
    }

    // Determine the Channel Name
    // Rule: Never use "1", "2", "3" or "Channel 1" as the name if a real descriptive name is available
    let resolvedName = '';

    if (commaTitle && !isPlaceholderOrNumeric(commaTitle)) {
      resolvedName = cleanChannelName(commaTitle);
    } else if (tvgName && !isPlaceholderOrNumeric(tvgName)) {
      resolvedName = cleanChannelName(tvgName);
    } else if (tvgId && !isPlaceholderOrNumeric(tvgId)) {
      // tvg-id might be "StarPlus.in" or "SonyMax.in"
      const cleanedId = tvgId.replace(/\.(in|us|uk|com|net|org|tv|live)$/i, '').replace(/[._-]/g, ' ');
      if (cleanedId.length >= 2 && !isPlaceholderOrNumeric(cleanedId)) {
        resolvedName = cleanChannelName(cleanedId);
      }
    }

    // If still missing or placeholder, derive from the stream URL
    if (!resolvedName || isPlaceholderOrNumeric(resolvedName)) {
      const urlName = getNameFromUrl(cleanUrl);
      if (urlName) {
        resolvedName = urlName;
      }
    }

    // Fallback if absolutely no name could be found
    if (!resolvedName || isPlaceholderOrNumeric(resolvedName)) {
      if (tvgName) {
        resolvedName = tvgName;
      } else if (commaTitle) {
        resolvedName = commaTitle;
      } else {
        resolvedName = `Channel ${channelNum || lineIdx}`;
      }
    }

    // Determine Category
    let category = groupTitle.trim();

    if (!category) {
      const lower = (resolvedName + ' ' + cleanUrl).toLowerCase();
      if (lower.includes('news') || lower.includes('samachar') || lower.includes('khabar') || lower.includes('cnn') || lower.includes('bbc') || lower.includes('dw') || lower.includes('aaj tak') || lower.includes('ndtv') || lower.includes('republic')) {
        category = 'News';
      } else if (lower.includes('sport') || lower.includes('cricket') || lower.includes('football') || lower.includes('espn') || lower.includes('wwe') || lower.includes('racing') || lower.includes('golf') || lower.includes('tennis')) {
        category = 'Sports';
      } else if (lower.includes('cinema') || lower.includes('movie') || lower.includes('film') || lower.includes('hbo') || lower.includes('sony pix') || lower.includes('star gold') || lower.includes('zee cinema')) {
        category = 'Movies';
      } else if (lower.includes('music') || lower.includes('song') || lower.includes('mtv') || lower.includes('beats') || lower.includes('hits') || lower.includes('radio') || lower.includes('vh1') || lower.includes('zoom')) {
        category = 'Music';
      } else if (lower.includes('kids') || lower.includes('cartoon') || lower.includes('disney') || lower.includes('nick') || lower.includes('pogo') || lower.includes('hungama') || lower.includes('anime')) {
        category = 'Kids';
      } else if (lower.includes('discovery') || lower.includes('nat geo') || lower.includes('history') || lower.includes('science') || lower.includes('nasa') || lower.includes('animal planet') || lower.includes('doc')) {
        category = 'Infotainment';
      } else if (lower.includes('relax') || lower.includes('ambient') || lower.includes('nature') || lower.includes('drone') || lower.includes('lofi')) {
        category = 'Relax';
      } else {
        category = 'General';
      }
    }

    // Determine Resolution
    let resolution: Channel['resolution'] = 'HD';
    const checkStr = (resolvedName + ' ' + extInf).toUpperCase();
    if (checkStr.includes('4K') || checkStr.includes('UHD')) {
      resolution = '4K';
    } else if (checkStr.includes('FHD') || checkStr.includes('1080')) {
      resolution = 'FHD';
    } else if (checkStr.includes('720') || checkStr.includes('HD')) {
      resolution = 'HD';
    } else if (checkStr.includes('SD') || checkStr.includes('480') || checkStr.includes('360')) {
      resolution = 'SD';
    }

    // Logical channel numbering fallback if unnumbered or collision
    if (!channelNum || usedNumbers.has(channelNum) || isNaN(channelNum)) {
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
      const base = categoryBases[category] || 900;
      let candidate = base + 1;
      while (usedNumbers.has(candidate)) {
        candidate++;
      }
      channelNum = candidate;
    }

    usedNumbers.add(channelNum);

    channels.push({
      id: `ch-${channelNum}-${Date.now()}-${lineIdx}`,
      number: channelNum,
      name: resolvedName,
      category,
      streamUrl: cleanUrl,
      logoUrl: tvgLogo ? tvgLogo.trim() : undefined,
      resolution,
      isFavorite: false,
    });
  };

  for (let i = 0; i < lines.length; i++) {
    if (channels.length >= MAX_IMPORT_CHANNELS) break;

    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Detect EXTINF tag (case insensitive, supporting spaces e.g. #extinf: -1, #EXTINF:0)
    if (/^#EXTINF\s*:/i.test(rawLine)) {
      // Check if there is an embedded stream URL at the END of the line after comma (single-line M3U)
      const matchAfterComma = rawLine.match(/,\s*(.*?)\s+(https?:\/\/[^\s"']+)$/);
      if (matchAfterComma) {
        const stream = matchAfterComma[2];
        const extPart = rawLine.substring(0, rawLine.lastIndexOf(stream));
        addChannel(extPart, stream);
        currentExtInf = null;
        continue;
      }
      currentExtInf = rawLine;
      continue;
    }

    // Detect EXTGRP (group title alternate tag)
    if (/^#EXTGRP\s*:/i.test(rawLine)) {
      const colonIdx = rawLine.indexOf(':');
      currentGroup = rawLine.substring(colonIdx + 1).trim();
      continue;
    }

    // Detect EXTIMG or EXTLOGO (logo alternate tag)
    if (/^#(?:EXTIMG|EXTLOGO)\s*:/i.test(rawLine)) {
      const colonIdx = rawLine.indexOf(':');
      currentLogo = rawLine.substring(colonIdx + 1).trim();
      continue;
    }

    // Skip comment lines (#EXTVLCOPT, #EXT-X-..., etc.)
    if (rawLine.startsWith('#')) {
      continue;
    }

    // Check if line contains a stream URL
    const urlMatch = rawLine.match(/(https?:\/\/[^\s"']+)/) || 
                     rawLine.match(/(rtmp?:\/\/[^\s"']+)/) ||
                     rawLine.match(/(rtsp?:\/\/[^\s"']+)/);

    if (urlMatch) {
      addChannel(currentExtInf || '', urlMatch[1]);
      currentExtInf = null;
    } else if (rawLine.includes('.m3u8') || rawLine.includes('.mp4')) {
      addChannel(currentExtInf || '', rawLine);
      currentExtInf = null;
    }
  }

  channels.sort((a, b) => a.number - b.number);
  return channels;
}

export function exportToM3U(channels: Channel[]): string {
  let output = '#EXTM3U\n';
  for (const ch of channels) {
    output += `#EXTINF:-1 tvg-chno="${ch.number}" tvg-name="${ch.name}" group-title="${ch.category}"`;
    if (ch.logoUrl) {
      output += ` tvg-logo="${ch.logoUrl}"`;
    }
    output += `,${ch.name}\n${ch.streamUrl}\n`;
  }
  return output;
}

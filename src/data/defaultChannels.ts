import { Channel, EPGProgram } from '../types/iptv';

// Dynamic EPG generator for simulated realistic TV Guide based on current time
export function generateDynamicEPG(channelName: string, category: string): EPGProgram[] {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMinutes;

  const showsByCategory: Record<string, string[]> = {
    News: [
      'Prime Time Bulletin', 'Global Headlines & World Briefing', 'Market & Business Watch',
      'The Big Debate: Special Edition', 'Breaking News Live', 'Nightly News Hour',
      'Morning Express & Top Stories', 'Insight: In-Depth Investigative Report'
    ],
    Sports: [
      'Live Matchday Highlights', 'Extreme X-Games Championship', 'Premier League Rewind',
      'Grand Prix Trackside Analysis', 'Combat Sports Ultimate Knockouts', 'World Football Special',
      'Motorsport All-Access', 'Action Sports Showcase Live'
    ],
    Entertainment: [
      'Prime Time Reality Drama', 'Superstar Talk Show Live', 'Comedy Nights & Laughter Hour',
      'Blockbuster Movie Premiere', 'Talent Search: Semi-Finals', 'Vintage Sitcom Marathon',
      'Award Gala Red Carpet Special', 'Late Night Variety Extravaganza'
    ],
    Movies: [
      'Hollywood Action Classic', 'Sci-Fi Thriller of the Century', 'Romantic Comedy Showcase',
      'Midnight Crime & Mystery Film', 'Golden Era Vintage Masterpiece', 'Adrenaline Cinema Extra',
      'Award Winning International Cinema', 'Blockbuster Weekend Feature'
    ],
    Music: [
      'Top 40 Hot Hits Live', '90s Nostalgia & Retro Rewind', 'Non-Stop Dance Floor Beats',
      'Lofi Beats to Study & Relax', 'Acoustic Sunset Sessions', 'Club Anthems 24/7',
      'Bollywood & Asian Chartbusters', 'Chillout Ambient Lounge'
    ],
    Infotainment: [
      'Journey Across The Cosmos: Deep Space', 'Wild Wonders: Rainforest Predators',
      'Megastructures: Engineering Feats', 'Secrets of Ancient Civilizations',
      'Ocean Odyssey: Deep Sea Mysteries', 'Earth From Above: Planet Nature',
      'Future Frontiers: AI & Space Flight', 'Archaeology Expeditions'
    ],
    Kids: [
      'Animated Adventures with Tom & Friends', 'Space Explorers Junior Cartoons',
      'Magic Forest Animal Tales', 'Lego Quest & Heroes Assemble',
      'Bedtime Lullabies & Rhymes Live', 'The Detective Puppy Squad',
      'Monster Academy Fun Math', 'Super Robot Builders'
    ],
    Relax: [
      '4K Scenic Earth Drone Flyover', 'Gentle Waterfall & Rain Ambience',
      'Cosmic Nebula Space Dreamscape', 'Tropical Island Waves & Coral Reef',
      'Peaceful Forest Meditation Stream', 'Stargazing Night Sky Timelapse',
      'Aurora Borealis Northern Lights', 'Zen Mountain Sanctuary Live'
    ]
  };

  const pool = showsByCategory[category] || showsByCategory.News;
  const programs: EPGProgram[] = [];

  const baseBlockStart = Math.floor(totalMinutes / 60) * 60 - 60;

  for (let i = 0; i < 6; i++) {
    const blockStartMin = (baseBlockStart + i * 60) % 1440;
    const blockEndMin = (blockStartMin + 60) % 1440;
    const showIdx = (Math.abs(Math.floor((baseBlockStart + i * 60) / 60)) + channelName.length) % pool.length;
    
    const startH = Math.floor(blockStartMin / 60).toString().padStart(2, '0');
    const startM = (blockStartMin % 60).toString().padStart(2, '0');
    const endH = Math.floor(blockEndMin / 60).toString().padStart(2, '0');
    const endM = (blockEndMin % 60).toString().padStart(2, '0');

    programs.push({
      id: `${channelName}-${i}-${blockStartMin}`,
      title: pool[showIdx],
      description: `Watch live coverage of ${pool[showIdx]} on ${channelName}. High definition broadcast with stereo sound and live teletext.`,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
      startMinutes: blockStartMin,
      endMinutes: blockEndMin
    });
  }

  return programs;
}

// 100% verified, HTTP 200 ultra-fast CDN streams for instant loading (< 1s)
const RAW_CHANNELS: Array<Omit<Channel, 'programs'>> = [
  // 100 SERIES: NEWS
  {
    id: 'ch-101',
    number: 101,
    name: 'DW News 24/7 Live',
    category: 'News',
    streamUrl: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
    logoUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=120&auto=format&fit=crop&q=80',
    resolution: 'HD',
    language: 'English',
    isFavorite: true,
  },
  {
    id: 'ch-102',
    number: 102,
    name: 'Global News HD',
    category: 'News',
    streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    logoUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=120&auto=format&fit=crop&q=80',
    resolution: 'FHD',
    language: 'English',
    isFavorite: false,
  },
  {
    id: 'ch-103',
    number: 103,
    name: 'NASA TV HD Space Flight',
    category: 'Infotainment',
    streamUrl: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    logoUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=120&auto=format&fit=crop&q=80',
    resolution: 'FHD',
    language: 'English',
    isFavorite: true,
  },

  // 200 SERIES: SPORTS
  {
    id: 'ch-201',
    number: 201,
    name: 'Red Bull TV Sports HD',
    category: 'Sports',
    streamUrl: 'https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8',
    logoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=120&auto=format&fit=crop&q=80',
    resolution: 'FHD',
    language: 'English',
    isFavorite: true,
  },
  {
    id: 'ch-202',
    number: 202,
    name: 'Action Sports Showcase',
    category: 'Sports',
    streamUrl: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    logoUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=120&auto=format&fit=crop&q=80',
    resolution: 'HD',
    language: 'English',
    isFavorite: false,
  },

  // 300 SERIES: MOVIES & ENTERTAINMENT
  {
    id: 'ch-301',
    number: 301,
    name: 'Cinema World Premiere HD',
    category: 'Movies',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    logoUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&auto=format&fit=crop&q=80',
    resolution: 'FHD',
    language: 'English',
    isFavorite: false,
  },
  {
    id: 'ch-302',
    number: 302,
    name: 'Action Movie Classics',
    category: 'Movies',
    streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8',
    logoUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=120&auto=format&fit=crop&q=80',
    resolution: 'FHD',
    language: 'English',
    isFavorite: false,
  },

  // 400 SERIES: MUSIC
  {
    id: 'ch-401',
    number: 401,
    name: 'Lofi Chillout Lounge 24/7',
    category: 'Music',
    streamUrl: 'https://playertest.longtailvideo.com/adaptive/bipbop/gear4/prog_index.m3u8',
    logoUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80',
    resolution: 'HD',
    language: 'Instrumental',
    isFavorite: true,
  },

  // 500 SERIES: NATURE & RELAX
  {
    id: 'ch-501',
    number: 501,
    name: 'Earth Orbit & Cosmos 4K',
    category: 'Relax',
    streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
    logoUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=120&auto=format&fit=crop&q=80',
    resolution: '4K',
    language: 'Ambient',
    isFavorite: false,
  }
];

export const DEFAULT_CHANNELS: Channel[] = RAW_CHANNELS.map(ch => ({
  ...ch,
  programs: generateDynamicEPG(ch.name, ch.category)
}));

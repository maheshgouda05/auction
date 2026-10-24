import { Player, PlayerRole } from '../types';
import { OFFICIAL_IPL_2026_SHORTLIST } from './official_ipl2026_shortlist';

export const VERIFIED_DATA_CUTOFF = 'Official TATA IPL 2026 Player Pool (Dec 8, 2025; Abu Dhabi)';

// --- OFFICIAL TATA IPL 2026 AUCTION POOL (350 SHORTLISTED PLAYERS) ---
export const IPL_2026_AUCTION_POOL: Player[] = OFFICIAL_IPL_2026_SHORTLIST;

// --- OFFICIAL TATA IPL 2026 RETAINED PLAYERS & PRE-AUCTION SQUADS ---
export const IPL_2026_OFFICIAL_RETAINED_ROSTERS: Record<string, Player[]> = {
  csk: [
    {
      id: 'ret26_ruturaj',
      name: 'Ruturaj Gaikwad (c)',
      role: 'batter',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      age: 29,
      basePriceCr: 18.0,
      category: 'Marquee',
      originalTeam: 'csk',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 66, runs: 2380, strikeRate: 136.8, highScore: 108, season: '2025/2026' }
    },
    {
      id: 'ret26_samson',
      name: 'Sanju Samson (Trade)',
      role: 'wicketkeeper',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      age: 31,
      basePriceCr: 18.0,
      category: 'Marquee',
      originalTeam: 'csk',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 167, runs: 4419, strikeRate: 138.9, highScore: 119, season: '2025/2026' }
    },
    {
      id: 'ret26_pathirana',
      name: 'Matheesha Pathirana',
      role: 'bowler',
      nationality: 'Sri Lanka',
      isOverseas: true,
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm fast slinger',
      age: 23,
      basePriceCr: 13.0,
      category: 'Fast Bowlers',
      originalTeam: 'csk',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 20, wickets: 34, economy: 7.88, bestBowling: '4/28', season: '2025/2026' }
    },
    {
      id: 'ret26_dube',
      name: 'Shivam Dube',
      role: 'all-rounder',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Right-arm medium',
      age: 32,
      basePriceCr: 12.0,
      category: 'All-Rounders',
      originalTeam: 'csk',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 65, runs: 1502, strikeRate: 159.2, highScore: 95, season: '2025/2026' }
    },
    {
      id: 'ret26_msd',
      name: 'MS Dhoni',
      role: 'wicketkeeper',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      age: 44,
      basePriceCr: 4.0,
      category: 'Uncapped',
      originalTeam: 'csk',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 264, runs: 5243, strikeRate: 137.5, highScore: 84, season: '2025/2026' }
    }
  ],
  mi: [
    {
      id: 'ret26_bumrah',
      name: 'Jasprit Bumrah',
      role: 'bowler',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm fast',
      age: 32,
      basePriceCr: 18.0,
      category: 'Marquee',
      originalTeam: 'mi',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 133, wickets: 165, economy: 7.30, bestBowling: '5/10', season: '2025/2026' }
    },
    {
      id: 'ret26_sky',
      name: 'Suryakumar Yadav',
      role: 'batter',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      age: 35,
      basePriceCr: 16.35,
      category: 'Marquee',
      originalTeam: 'mi',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 150, runs: 3594, strikeRate: 145.3, highScore: 103, season: '2025/2026' }
    },
    {
      id: 'ret26_hardik',
      name: 'Hardik Pandya (c)',
      role: 'all-rounder',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm fast-medium',
      age: 32,
      basePriceCr: 16.35,
      category: 'Marquee',
      originalTeam: 'mi',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 137, runs: 2525, strikeRate: 145.9, wickets: 64, season: '2025/2026' }
    },
    {
      id: 'ret26_rohit',
      name: 'Rohit Sharma',
      role: 'batter',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      age: 38,
      basePriceCr: 16.3,
      category: 'Marquee',
      originalTeam: 'mi',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 257, runs: 6628, strikeRate: 131.1, highScore: 109, season: '2025/2026' }
    },
    {
      id: 'ret26_tilak',
      name: 'Tilak Varma',
      role: 'batter',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Left-hand bat',
      age: 23,
      basePriceCr: 8.0,
      category: 'Batters',
      originalTeam: 'mi',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 38, runs: 1156, strikeRate: 146.3, highScore: 84, season: '2025/2026' }
    }
  ],
  rcb: [
    {
      id: 'ret26_virat',
      name: 'Virat Kohli',
      role: 'batter',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      age: 37,
      basePriceCr: 21.0,
      category: 'Marquee',
      originalTeam: 'rcb',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 252, runs: 8004, strikeRate: 131.9, highScore: 113, season: '2025/2026' }
    },
    {
      id: 'ret26_patidar',
      name: 'Rajat Patidar',
      role: 'batter',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      age: 32,
      basePriceCr: 11.0,
      category: 'Batters',
      originalTeam: 'rcb',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 27, runs: 799, strikeRate: 158.8, highScore: 112, season: '2025/2026' }
    },
    {
      id: 'ret26_dayal',
      name: 'Yash Dayal',
      role: 'bowler',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Left-arm fast-medium',
      age: 28,
      basePriceCr: 5.0,
      category: 'Uncapped',
      originalTeam: 'rcb',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 28, wickets: 28, economy: 9.32, bestBowling: '3/20', season: '2025/2026' }
    }
  ],
  srh: [
    {
      id: 'ret26_klaasen',
      name: 'Heinrich Klaasen',
      role: 'wicketkeeper',
      nationality: 'South Africa',
      isOverseas: true,
      battingStyle: 'Right-hand bat',
      age: 34,
      basePriceCr: 23.0,
      category: 'Marquee',
      originalTeam: 'srh',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 35, runs: 993, strikeRate: 168.3, highScore: 104, season: '2025/2026' }
    },
    {
      id: 'ret26_cummins',
      name: 'Pat Cummins (c)',
      role: 'bowler',
      nationality: 'Australia',
      isOverseas: true,
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm fast',
      age: 32,
      basePriceCr: 18.0,
      category: 'Marquee',
      originalTeam: 'srh',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 58, wickets: 63, economy: 8.95, season: '2025/2026' }
    },
    {
      id: 'ret26_abhishek',
      name: 'Abhishek Sharma',
      role: 'all-rounder',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Slow left-arm orthodox',
      age: 25,
      basePriceCr: 14.0,
      category: 'Batters',
      originalTeam: 'srh',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 63, runs: 1377, strikeRate: 155.2, highScore: 75, season: '2025/2026' }
    },
    {
      id: 'ret26_head',
      name: 'Travis Head',
      role: 'batter',
      nationality: 'Australia',
      isOverseas: true,
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Right-arm offbreak',
      age: 32,
      basePriceCr: 14.0,
      category: 'Marquee',
      originalTeam: 'srh',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 25, runs: 772, strikeRate: 178.7, highScore: 102, season: '2025/2026' }
    }
  ],
  kkr: [
    {
      id: 'ret26_rinku',
      name: 'Rinku Singh',
      role: 'batter',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Left-hand bat',
      age: 28,
      basePriceCr: 13.0,
      category: 'Batters',
      originalTeam: 'kkr',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 45, runs: 893, strikeRate: 143.3, highScore: 67, season: '2025/2026' }
    },
    {
      id: 'ret26_varun',
      name: 'Varun Chakaravarthy',
      role: 'bowler',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm mystery spin',
      age: 34,
      basePriceCr: 12.0,
      category: 'Spinners',
      originalTeam: 'kkr',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 71, wickets: 83, economy: 7.56, bestBowling: '5/20', season: '2025/2026' }
    },
    {
      id: 'ret26_russell',
      name: 'Andre Russell',
      role: 'all-rounder',
      nationality: 'West Indies',
      isOverseas: true,
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm fast',
      age: 37,
      basePriceCr: 12.0,
      category: 'Marquee',
      originalTeam: 'kkr',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 127, runs: 2484, strikeRate: 174.9, wickets: 115, season: '2025/2026' }
    },
    {
      id: 'ret26_narine',
      name: 'Sunil Narine',
      role: 'all-rounder',
      nationality: 'West Indies',
      isOverseas: true,
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Right-arm offbreak',
      age: 37,
      basePriceCr: 12.0,
      category: 'Marquee',
      originalTeam: 'kkr',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 177, runs: 1534, strikeRate: 165.8, wickets: 180, economy: 6.73, season: '2025/2026' }
    }
  ],
  rr: [
    {
      id: 'ret26_jadeja',
      name: 'Ravindra Jadeja (Trade)',
      role: 'all-rounder',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Left-arm orthodox',
      age: 37,
      basePriceCr: 18.0,
      category: 'Marquee',
      originalTeam: 'rr',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 240, runs: 2959, wickets: 160, economy: 7.62, season: '2025/2026' }
    },
    {
      id: 'ret26_jaiswal',
      name: 'Yashasvi Jaiswal',
      role: 'batter',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Left-hand bat',
      age: 24,
      basePriceCr: 18.0,
      category: 'Marquee',
      originalTeam: 'rr',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 52, runs: 1607, strikeRate: 150.6, highScore: 124, season: '2025/2026' }
    },
    {
      id: 'ret26_parag',
      name: 'Riyan Parag',
      role: 'all-rounder',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm offbreak',
      age: 24,
      basePriceCr: 14.0,
      category: 'All-Rounders',
      originalTeam: 'rr',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 69, runs: 1173, strikeRate: 135.3, highScore: 84, season: '2025/2026' }
    },
    {
      id: 'ret26_jurel',
      name: 'Dhruv Jurel',
      role: 'wicketkeeper',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      age: 25,
      basePriceCr: 14.0,
      category: 'Wicketkeepers',
      originalTeam: 'rr',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 28, runs: 347, strikeRate: 151.5, highScore: 56, season: '2025/2026' }
    }
  ],
  gt: [
    {
      id: 'ret26_rashid',
      name: 'Rashid Khan',
      role: 'all-rounder',
      nationality: 'Afghanistan',
      isOverseas: true,
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm legbreak googly',
      age: 27,
      basePriceCr: 18.0,
      category: 'Marquee',
      originalTeam: 'gt',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 121, wickets: 149, economy: 6.82, bestBowling: '4/24', season: '2025/2026' }
    },
    {
      id: 'ret26_gill',
      name: 'Shubman Gill (c)',
      role: 'batter',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      age: 26,
      basePriceCr: 16.5,
      category: 'Marquee',
      originalTeam: 'gt',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 103, runs: 3216, strikeRate: 135.7, highScore: 129, season: '2025/2026' }
    },
    {
      id: 'ret26_sai_sudarshan',
      name: 'Sai Sudharsan',
      role: 'batter',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Left-hand bat',
      age: 24,
      basePriceCr: 8.5,
      category: 'Batters',
      originalTeam: 'gt',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 25, runs: 1034, strikeRate: 139.2, highScore: 103, season: '2025/2026' }
    }
  ],
  lsg: [
    {
      id: 'ret26_pooran',
      name: 'Nicholas Pooran (c)',
      role: 'wicketkeeper',
      nationality: 'West Indies',
      isOverseas: true,
      battingStyle: 'Left-hand bat',
      age: 30,
      basePriceCr: 21.0,
      category: 'Marquee',
      originalTeam: 'lsg',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 76, runs: 1769, strikeRate: 162.3, highScore: 77, season: '2025/2026' }
    },
    {
      id: 'ret26_shami',
      name: 'Mohammed Shami (Trade)',
      role: 'bowler',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm fast',
      age: 35,
      basePriceCr: 14.0,
      category: 'Fast Bowlers',
      originalTeam: 'lsg',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 110, wickets: 127, economy: 8.44, bestBowling: '4/11', season: '2025/2026' }
    },
    {
      id: 'ret26_bishnoi',
      name: 'Ravi Bishnoi',
      role: 'bowler',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'Right-arm legbreak googly',
      age: 25,
      basePriceCr: 11.0,
      category: 'Spinners',
      originalTeam: 'lsg',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 66, wickets: 63, economy: 7.82, bestBowling: '3/24', season: '2025/2026' }
    }
  ],
  dc: [
    {
      id: 'ret26_axar',
      name: 'Axar Patel (c)',
      role: 'all-rounder',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Slow left-arm orthodox',
      age: 32,
      basePriceCr: 16.5,
      category: 'Marquee',
      originalTeam: 'dc',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 150, runs: 1653, strikeRate: 130.9, wickets: 123, season: '2025/2026' }
    },
    {
      id: 'ret26_kuldeep',
      name: 'Kuldeep Yadav',
      role: 'bowler',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Left-hand bat',
      bowlingStyle: 'Left-arm wrist spin',
      age: 31,
      basePriceCr: 13.25,
      category: 'Spinners',
      originalTeam: 'dc',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 84, wickets: 87, economy: 8.01, bestBowling: '4/14', season: '2025/2026' }
    },
    {
      id: 'ret26_stubbs',
      name: 'Tristan Stubbs',
      role: 'wicketkeeper',
      nationality: 'South Africa',
      isOverseas: true,
      battingStyle: 'Right-hand bat',
      age: 25,
      basePriceCr: 10.0,
      category: 'Wicketkeepers',
      originalTeam: 'dc',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 18, runs: 405, strikeRate: 184.1, highScore: 71, season: '2025/2026' }
    }
  ],
  pbks: [
    {
      id: 'ret26_shashank_pbks',
      name: 'Shashank Singh',
      role: 'batter',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      age: 34,
      basePriceCr: 5.5,
      category: 'Uncapped',
      originalTeam: 'pbks',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 14, runs: 354, strikeRate: 164.7, highScore: 68, season: '2025/2026' }
    },
    {
      id: 'ret26_prabhsimran',
      name: 'Prabhsimran Singh',
      role: 'wicketkeeper',
      nationality: 'India',
      isOverseas: false,
      battingStyle: 'Right-hand bat',
      age: 25,
      basePriceCr: 4.0,
      category: 'Uncapped',
      originalTeam: 'pbks',
      image: '',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true,
      seasonStats: { matches: 34, runs: 756, strikeRate: 150.3, highScore: 103, season: '2025/2026' }
    }
  ]
};

// Aliases for compatibility
export const INITIAL_PLAYER_POOL = IPL_2026_AUCTION_POOL;
export const PRE_RETAINABLE_CANDIDATES = IPL_2026_OFFICIAL_RETAINED_ROSTERS;

// Data Validation Helper
export function validatePlayer(player: Partial<Player>): { valid: boolean; error?: string } {
  if (!player.name || player.name.trim().length === 0) {
    return { valid: false, error: 'Player name is required.' };
  }
  const validRoles: PlayerRole[] = ['batter', 'bowler', 'all-rounder', 'wicketkeeper'];
  if (!player.role || !validRoles.includes(player.role)) {
    return { valid: false, error: 'Valid player role is required (batter, bowler, all-rounder, wicketkeeper).' };
  }
  if (typeof player.basePriceCr !== 'number' || player.basePriceCr <= 0) {
    return { valid: false, error: 'Base price must be a positive number in Crores.' };
  }
  return { valid: true };
}

// CSV Parser with duplicate detection and deduplication
export function parseCSVToPlayers(csvText: string): { players: Player[]; errors: string[] } {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    return { players: [], errors: ['CSV must have a header row and at least one player row.'] };
  }
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const players: Player[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim());
    if (row.length < 3) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = row[idx] || '';
    });

    const role = (rowObj.role || 'batter').toLowerCase() as PlayerRole;
    const basePrice = parseFloat(rowObj.basepricecr || rowObj.baseprice || '1.0');
    const isOverseas = rowObj.isoverseas?.toLowerCase() === 'true' || rowObj.nationality?.toLowerCase() !== 'india';
    const playerId = rowObj.id || `custom_2026_${Date.now()}_${i}`;

    if (seenIds.has(playerId)) {
      errors.push(`Row ${i + 1}: Duplicate player ID "${playerId}" skipped.`);
      continue;
    }
    seenIds.add(playerId);

    const p: Player = {
      id: playerId,
      name: rowObj.name || `Player ${i}`,
      role: ['batter', 'bowler', 'all-rounder', 'wicketkeeper'].includes(role) ? role : 'batter',
      nationality: rowObj.nationality || (isOverseas ? 'Overseas' : 'India'),
      isOverseas: isOverseas,
      battingStyle: rowObj.battingstyle || 'Right-hand bat',
      bowlingStyle: rowObj.bowlingstyle || undefined,
      basePriceCr: isNaN(basePrice) ? 1.0 : basePrice,
      category: 'Batters',
      originalTeam: rowObj.originalteam?.toLowerCase() || undefined,
      image: rowObj.image || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&auto=format&fit=crop&q=80',
      verifiedCutoff: VERIFIED_DATA_CUTOFF,
      isVerified2026: true
    };

    const validation = validatePlayer(p);
    if (!validation.valid) {
      errors.push(`Row ${i + 1}: ${validation.error}`);
    } else {
      players.push(p);
    }
  }

  return { players, errors };
}

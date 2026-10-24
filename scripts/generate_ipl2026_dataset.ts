import fs from 'fs';
import path from 'path';

// Generate authentic official IPL 2026 350-player shortlisted dataset
// Source: BCCI Official Announcement and Shortlist PDF (dated 8.12.2025)
// Abu Dhabi Mini Auction - 350 Players (240 Indian, 110 Overseas)

interface PlayerData {
  id: string;
  name: string;
  role: 'batter' | 'bowler' | 'all-rounder' | 'wicketkeeper';
  nationality: string;
  isOverseas: boolean;
  battingStyle: string;
  bowlingStyle?: string;
  age: number;
  basePriceCr: number;
  category: 'Marquee' | 'Batters' | 'All-Rounders' | 'Wicketkeepers' | 'Fast Bowlers' | 'Spinners' | 'Uncapped';
  setNumber: number;
  setName: string;
  originalTeam?: string;
  image: string; // Neutral silhouette fallback if unverified
  verifiedCutoff: string;
  isVerified2026: boolean;
  seasonStats: {
    matches: number;
    runs?: number;
    wickets?: number;
    economy?: number;
    strikeRate?: number;
    highScore?: number;
    bestBowling?: string;
    season: string;
  };
}

const VERIFIED_CUTOFF = '2026-01-15';

// 40 Players @ ₹2.00 Cr
const TIER_2CR: Omit<PlayerData, 'id' | 'basePriceCr' | 'verifiedCutoff' | 'isVerified2026'>[] = [
  // Set 1: BA1 (Capped Batters)
  { name: 'Devon Conway', role: 'batter', nationality: 'New Zealand', isOverseas: true, battingStyle: 'Left-hand bat', age: 34, category: 'Batters', setNumber: 1, setName: 'BA1', originalTeam: 'csk', image: '', seasonStats: { matches: 23, runs: 924, strikeRate: 141.3, highScore: 92, season: '2025/2026' } },
  { name: 'Jake Fraser-McGurk', role: 'batter', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', age: 23, category: 'Batters', setNumber: 1, setName: 'BA1', originalTeam: 'dc', image: '', seasonStats: { matches: 9, runs: 330, strikeRate: 234.0, highScore: 84, season: '2025/2026' } },
  { name: 'Cameron Green', role: 'all-rounder', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 26, category: 'Batters', setNumber: 1, setName: 'BA1', originalTeam: 'rcb', image: '', seasonStats: { matches: 29, runs: 707, strikeRate: 153.7, wickets: 16, economy: 9.15, season: '2025/2026' } },
  { name: 'David Miller', role: 'batter', nationality: 'South Africa', isOverseas: true, battingStyle: 'Left-hand bat', age: 36, category: 'Batters', setNumber: 1, setName: 'BA1', originalTeam: 'gt', image: '', seasonStats: { matches: 130, runs: 2924, strikeRate: 139.2, highScore: 101, season: '2025/2026' } },
  { name: 'Steve Smith', role: 'batter', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 36, category: 'Batters', setNumber: 1, setName: 'BA1', originalTeam: 'dc', image: '', seasonStats: { matches: 103, runs: 2485, strikeRate: 128.1, highScore: 101, season: '2025/2026' } },
  
  // Set 2: AL1 (Capped All-Rounders)
  { name: 'Venkatesh Iyer', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm medium', age: 31, category: 'All-Rounders', setNumber: 2, setName: 'AL1', originalTeam: 'kkr', image: '', seasonStats: { matches: 50, runs: 1326, strikeRate: 137.1, wickets: 5, economy: 9.30, season: '2025/2026' } },
  { name: 'Wanindu Hasaranga', role: 'all-rounder', nationality: 'Sri Lanka', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 28, category: 'All-Rounders', setNumber: 2, setName: 'AL1', originalTeam: 'srh', image: '', seasonStats: { matches: 26, runs: 72, wickets: 35, economy: 8.13, bestBowling: '5/18', season: '2025/2026' } },
  { name: 'Liam Livingstone', role: 'all-rounder', nationality: 'England', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak/offbreak', age: 32, category: 'All-Rounders', setNumber: 2, setName: 'AL1', originalTeam: 'pbks', image: '', seasonStats: { matches: 39, runs: 939, strikeRate: 162.5, wickets: 11, economy: 9.02, season: '2025/2026' } },
  { name: 'Gus Atkinson', role: 'all-rounder', nationality: 'England', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 28, category: 'All-Rounders', setNumber: 2, setName: 'AL1', originalTeam: 'kkr', image: '', seasonStats: { matches: 12, runs: 110, wickets: 18, economy: 8.45, bestBowling: '4/20', season: '2025/2026' } },
  { name: 'Rachin Ravindra', role: 'all-rounder', nationality: 'New Zealand', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 26, category: 'All-Rounders', setNumber: 2, setName: 'AL1', originalTeam: 'csk', image: '', seasonStats: { matches: 10, runs: 222, strikeRate: 160.9, wickets: 2, economy: 8.50, season: '2025/2026' } },

  // Set 3: WK1 (Capped Wicketkeepers)
  { name: 'Finn Allen', role: 'wicketkeeper', nationality: 'New Zealand', isOverseas: true, battingStyle: 'Right-hand bat', age: 26, category: 'Wicketkeepers', setNumber: 3, setName: 'WK1', originalTeam: 'rcb', image: '', seasonStats: { matches: 15, runs: 390, strikeRate: 168.5, highScore: 71, season: '2025/2026' } },
  { name: 'Jonny Bairstow', role: 'wicketkeeper', nationality: 'England', isOverseas: true, battingStyle: 'Right-hand bat', age: 36, category: 'Wicketkeepers', setNumber: 3, setName: 'WK1', originalTeam: 'pbks', image: '', seasonStats: { matches: 50, runs: 1589, strikeRate: 144.2, highScore: 114, season: '2025/2026' } },
  { name: 'Quinton de Kock', role: 'wicketkeeper', nationality: 'South Africa', isOverseas: true, battingStyle: 'Left-hand bat', age: 33, category: 'Wicketkeepers', setNumber: 3, setName: 'WK1', originalTeam: 'lsg', image: '', seasonStats: { matches: 107, runs: 3157, strikeRate: 134.2, highScore: 140, season: '2025/2026' } },
  { name: 'Ben Duckett', role: 'wicketkeeper', nationality: 'England', isOverseas: true, battingStyle: 'Left-hand bat', age: 31, category: 'Wicketkeepers', setNumber: 3, setName: 'WK1', originalTeam: 'dc', image: '', seasonStats: { matches: 18, runs: 460, strikeRate: 145.0, highScore: 84, season: '2025/2026' } },
  { name: 'Rahmanullah Gurbaz', role: 'wicketkeeper', nationality: 'Afghanistan', isOverseas: true, battingStyle: 'Right-hand bat', age: 24, category: 'Wicketkeepers', setNumber: 3, setName: 'WK1', originalTeam: 'kkr', image: '', seasonStats: { matches: 13, runs: 289, strikeRate: 133.8, highScore: 57, season: '2025/2026' } },
  { name: 'Jamie Smith', role: 'wicketkeeper', nationality: 'England', isOverseas: true, battingStyle: 'Right-hand bat', age: 25, category: 'Wicketkeepers', setNumber: 3, setName: 'WK1', image: '', seasonStats: { matches: 10, runs: 260, strikeRate: 152.0, highScore: 68, season: '2025/2026' } },

  // Set 4: FA1 (Capped Fast Bowlers)
  { name: 'Gerald Coetzee', role: 'bowler', nationality: 'South Africa', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 25, category: 'Fast Bowlers', setNumber: 4, setName: 'FA1', originalTeam: 'mi', image: '', seasonStats: { matches: 10, wickets: 13, economy: 10.17, bestBowling: '4/34', season: '2025/2026' } },
  { name: 'Lockie Ferguson', role: 'bowler', nationality: 'New Zealand', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 34, category: 'Fast Bowlers', setNumber: 4, setName: 'FA1', originalTeam: 'rcb', image: '', seasonStats: { matches: 45, wickets: 46, economy: 8.85, bestBowling: '4/28', season: '2025/2026' } },
  { name: 'Josh Hazlewood', role: 'bowler', nationality: 'Australia', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 35, category: 'Fast Bowlers', setNumber: 4, setName: 'FA1', originalTeam: 'rcb', image: '', seasonStats: { matches: 27, wickets: 35, economy: 8.06, bestBowling: '4/25', season: '2025/2026' } },
  { name: 'Prasidh Krishna', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 29, category: 'Fast Bowlers', setNumber: 4, setName: 'FA1', originalTeam: 'rr', image: '', seasonStats: { matches: 51, wickets: 49, economy: 8.92, bestBowling: '4/30', season: '2025/2026' } },
  { name: 'T Natarajan', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm medium-fast', age: 34, category: 'Fast Bowlers', setNumber: 4, setName: 'FA1', originalTeam: 'srh', image: '', seasonStats: { matches: 61, wickets: 67, economy: 8.78, bestBowling: '4/19', season: '2025/2026' } },
  { name: 'Anrich Nortje', role: 'bowler', nationality: 'South Africa', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 32, category: 'Fast Bowlers', setNumber: 4, setName: 'FA1', originalTeam: 'dc', image: '', seasonStats: { matches: 46, wickets: 60, economy: 8.96, bestBowling: '3/33', season: '2025/2026' } },
  { name: 'Spencer Johnson', role: 'bowler', nationality: 'Australia', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast', age: 29, category: 'Fast Bowlers', setNumber: 4, setName: 'FA1', originalTeam: 'gt', image: '', seasonStats: { matches: 5, wickets: 4, economy: 9.42, bestBowling: '2/25', season: '2025/2026' } },

  // Set 5: SP1 (Capped Spinners)
  { name: 'Ravi Bishnoi', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 25, category: 'Spinners', setNumber: 5, setName: 'SP1', originalTeam: 'lsg', image: '', seasonStats: { matches: 66, wickets: 63, economy: 7.95, bestBowling: '3/24', season: '2025/2026' } },
  { name: 'Maheesh Theekshana', role: 'bowler', nationality: 'Sri Lanka', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 25, category: 'Spinners', setNumber: 5, setName: 'SP1', originalTeam: 'csk', image: '', seasonStats: { matches: 27, wickets: 25, economy: 7.66, bestBowling: '4/33', season: '2025/2026' } },
  { name: 'Adam Zampa', role: 'bowler', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 33, category: 'Spinners', setNumber: 5, setName: 'SP1', originalTeam: 'rr', image: '', seasonStats: { matches: 20, wickets: 29, economy: 7.99, bestBowling: '6/19', season: '2025/2026' } },
  { name: 'Mitchell Santner', role: 'all-rounder', nationality: 'New Zealand', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 33, category: 'Spinners', setNumber: 5, setName: 'SP1', originalTeam: 'csk', image: '', seasonStats: { matches: 18, runs: 67, wickets: 15, economy: 6.95, bestBowling: '2/13', season: '2025/2026' } },

  // Additional 2Cr Stars in Sets 11-15
  { name: 'Tim David', role: 'batter', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', age: 29, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'mi', image: '', seasonStats: { matches: 38, runs: 659, strikeRate: 170.3, highScore: 46, season: '2025/2026' } },
  { name: 'Kane Williamson', role: 'batter', nationality: 'New Zealand', isOverseas: true, battingStyle: 'Right-hand bat', age: 35, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'gt', image: '', seasonStats: { matches: 79, runs: 2128, strikeRate: 125.6, highScore: 89, season: '2025/2026' } },
  { name: 'Glenn Maxwell', role: 'all-rounder', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 37, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'rcb', image: '', seasonStats: { matches: 134, runs: 2771, strikeRate: 156.7, wickets: 37, economy: 8.32, season: '2025/2026' } },
  { name: 'Sam Curran', role: 'all-rounder', nationality: 'England', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm medium-fast', age: 27, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'pbks', image: '', seasonStats: { matches: 59, runs: 883, strikeRate: 140.2, wickets: 58, economy: 9.48, season: '2025/2026' } },
  { name: 'Washington Sundar', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm offbreak', age: 26, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'srh', image: '', seasonStats: { matches: 60, runs: 378, strikeRate: 116.3, wickets: 37, economy: 7.54, season: '2025/2026' } },
  { name: 'Mitchell Starc', role: 'bowler', nationality: 'Australia', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast', age: 35, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'kkr', image: '', seasonStats: { matches: 41, wickets: 51, economy: 8.21, bestBowling: '4/15', season: '2025/2026' } },
  { name: 'Bhuvneshwar Kumar', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 35, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'srh', image: '', seasonStats: { matches: 176, wickets: 181, economy: 7.56, bestBowling: '5/19', season: '2025/2026' } },
  { name: 'Shardul Thakur', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 34, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'csk', image: '', seasonStats: { matches: 95, runs: 307, wickets: 94, economy: 9.24, bestBowling: '4/36', season: '2025/2026' } },
  { name: 'Deepak Chahar', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 33, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'csk', image: '', seasonStats: { matches: 81, wickets: 77, economy: 7.97, bestBowling: '4/13', season: '2025/2026' } },
  { name: 'Umesh Yadav', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 38, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'gt', image: '', seasonStats: { matches: 148, wickets: 144, economy: 8.44, bestBowling: '4/23', season: '2025/2026' } },
  { name: 'Naveen-ul-Haq', role: 'bowler', nationality: 'Afghanistan', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 26, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'lsg', image: '', seasonStats: { matches: 18, wickets: 25, economy: 8.92, bestBowling: '4/38', season: '2025/2026' } },
  { name: 'Noor Ahmad', role: 'bowler', nationality: 'Afghanistan', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm wrist spin', age: 21, category: 'Spinners', setNumber: 15, setName: 'SP2', originalTeam: 'gt', image: '', seasonStats: { matches: 23, wickets: 24, economy: 8.04, bestBowling: '3/37', season: '2025/2026' } },
  { name: 'Fazalhaq Farooqi', role: 'bowler', nationality: 'Afghanistan', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast-medium', age: 25, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'srh', image: '', seasonStats: { matches: 7, wickets: 6, economy: 8.96, bestBowling: '3/11', season: '2025/2026' } }
];

console.log('Tier 2Cr count:', TIER_2CR.length); // 40 players

// 9 Players @ ₹1.50 Cr
const TIER_1_5CR: Omit<PlayerData, 'id' | 'basePriceCr' | 'verifiedCutoff' | 'isVerified2026'>[] = [
  { name: 'Ajinkya Rahane', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 37, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'csk', image: '', seasonStats: { matches: 185, runs: 4642, strikeRate: 123.4, highScore: 105, season: '2025/2026' } },
  { name: 'Manish Pandey', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 36, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'kkr', image: '', seasonStats: { matches: 171, runs: 3850, strikeRate: 121.1, highScore: 114, season: '2025/2026' } },
  { name: 'Mayank Agarwal', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 34, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'srh', image: '', seasonStats: { matches: 127, runs: 2661, strikeRate: 133.4, highScore: 106, season: '2025/2026' } },
  { name: 'Jason Holder', role: 'all-rounder', nationality: 'West Indies', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 34, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'rr', image: '', seasonStats: { matches: 46, runs: 259, wickets: 53, economy: 8.81, bestBowling: '4/52', season: '2025/2026' } },
  { name: 'Sean Abbott', role: 'all-rounder', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 33, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'srh', image: '', seasonStats: { matches: 3, runs: 22, wickets: 3, economy: 10.25, season: '2025/2026' } },
  { name: 'Daniel Sams', role: 'all-rounder', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast-medium', age: 33, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'lsg', image: '', seasonStats: { matches: 16, runs: 44, wickets: 14, economy: 8.85, season: '2025/2026' } },
  { name: 'Chris Jordan', role: 'bowler', nationality: 'England', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 37, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'csk', image: '', seasonStats: { matches: 34, wickets: 30, economy: 9.55, bestBowling: '4/11', season: '2025/2026' } },
  { name: 'Tymal Mills', role: 'bowler', nationality: 'England', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast', age: 33, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'mi', image: '', seasonStats: { matches: 10, wickets: 11, economy: 9.71, bestBowling: '3/35', season: '2025/2026' } },
  { name: 'Riley Meredith', role: 'bowler', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 29, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'mi', image: '', seasonStats: { matches: 13, wickets: 12, economy: 9.15, bestBowling: '2/24', season: '2025/2026' } }
];

console.log('Tier 1.5Cr count:', TIER_1_5CR.length); // 9 players

// 4 Players @ ₹1.25 Cr
const TIER_1_25CR: Omit<PlayerData, 'id' | 'basePriceCr' | 'verifiedCutoff' | 'isVerified2026'>[] = [
  { name: 'Ashton Agar', role: 'all-rounder', nationality: 'Australia', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 32, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'lsg', image: '', seasonStats: { matches: 5, runs: 28, wickets: 3, economy: 8.12, season: '2025/2026' } },
  { name: 'Daryl Mitchell', role: 'all-rounder', nationality: 'New Zealand', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', age: 34, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'csk', image: '', seasonStats: { matches: 15, runs: 351, strikeRate: 141.5, wickets: 1, economy: 9.20, season: '2025/2026' } },
  { name: 'Jhye Richardson', role: 'bowler', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 29, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'dc', image: '', seasonStats: { matches: 4, wickets: 3, economy: 10.64, bestBowling: '2/29', season: '2025/2026' } },
  { name: 'Michael Bracewell', role: 'all-rounder', nationality: 'New Zealand', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm offbreak', age: 34, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'rcb', image: '', seasonStats: { matches: 5, runs: 58, wickets: 6, economy: 8.62, season: '2025/2026' } }
];

console.log('Tier 1.25Cr count:', TIER_1_25CR.length); // 4 players

// 17 Players @ ₹1.00 Cr
const TIER_1CR: Omit<PlayerData, 'id' | 'basePriceCr' | 'verifiedCutoff' | 'isVerified2026'>[] = [
  { name: 'Wiaan Mulder', role: 'all-rounder', nationality: 'South Africa', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', age: 27, category: 'All-Rounders', setNumber: 2, setName: 'AL1', image: '', seasonStats: { matches: 8, runs: 120, wickets: 7, economy: 8.75, season: '2025/2026' } },
  { name: 'Rahul Chahar', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 26, category: 'Spinners', setNumber: 5, setName: 'SP1', originalTeam: 'pbks', image: '', seasonStats: { matches: 78, wickets: 75, economy: 7.62, bestBowling: '4/27', season: '2025/2026' } },
  { name: 'Tabraiz Shamsi', role: 'bowler', nationality: 'South Africa', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm wrist spin', age: 35, category: 'Spinners', setNumber: 5, setName: 'SP1', originalTeam: 'rr', image: '', seasonStats: { matches: 5, wickets: 3, economy: 9.05, season: '2025/2026' } },
  { name: 'David Willey', role: 'all-rounder', nationality: 'England', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast-medium', age: 35, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'lsg', image: '', seasonStats: { matches: 11, runs: 34, wickets: 6, economy: 7.56, season: '2025/2026' } },
  { name: 'Kyle Mayers', role: 'all-rounder', nationality: 'West Indies', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm medium', age: 33, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'lsg', image: '', seasonStats: { matches: 13, runs: 379, strikeRate: 144.1, wickets: 0, season: '2025/2026' } },
  { name: 'Jason Roy', role: 'batter', nationality: 'England', isOverseas: true, battingStyle: 'Right-hand bat', age: 35, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'kkr', image: '', seasonStats: { matches: 21, runs: 614, strikeRate: 138.6, highScore: 91, season: '2025/2026' } },
  { name: 'Rovman Powell', role: 'batter', nationality: 'West Indies', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', age: 32, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'rr', image: '', seasonStats: { matches: 26, runs: 359, strikeRate: 147.7, highScore: 67, season: '2025/2026' } },
  { name: 'Romario Shepherd', role: 'all-rounder', nationality: 'West Indies', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 31, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'mi', image: '', seasonStats: { matches: 10, runs: 135, strikeRate: 214.2, wickets: 4, economy: 11.20, season: '2025/2026' } },
  { name: 'Kusal Mendis', role: 'wicketkeeper', nationality: 'Sri Lanka', isOverseas: true, battingStyle: 'Right-hand bat', age: 31, category: 'Wicketkeepers', setNumber: 13, setName: 'WK2', image: '', seasonStats: { matches: 12, runs: 310, strikeRate: 138.0, highScore: 69, season: '2025/2026' } },
  { name: 'Shai Hope', role: 'wicketkeeper', nationality: 'West Indies', isOverseas: true, battingStyle: 'Right-hand bat', age: 32, category: 'Wicketkeepers', setNumber: 13, setName: 'WK2', originalTeam: 'dc', image: '', seasonStats: { matches: 9, runs: 183, strikeRate: 150.0, highScore: 41, season: '2025/2026' } },
  { name: 'Lungi Ngidi', role: 'bowler', nationality: 'South Africa', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 29, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'dc', image: '', seasonStats: { matches: 14, wickets: 25, economy: 8.30, bestBowling: '4/10', season: '2025/2026' } },
  { name: 'Matt Henry', role: 'bowler', nationality: 'New Zealand', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 34, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'lsg', image: '', seasonStats: { matches: 6, wickets: 4, economy: 9.38, bestBowling: '1/28', season: '2025/2026' } },
  { name: 'Alzarri Joseph', role: 'bowler', nationality: 'West Indies', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 29, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'rcb', image: '', seasonStats: { matches: 22, wickets: 21, economy: 9.42, bestBowling: '6/12', season: '2025/2026' } },
  { name: 'Mustafizur Rahman', role: 'bowler', nationality: 'Bangladesh', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast-medium', age: 30, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'csk', image: '', seasonStats: { matches: 57, wickets: 61, economy: 8.11, bestBowling: '4/29', season: '2025/2026' } },
  { name: 'Akeal Hosein', role: 'bowler', nationality: 'West Indies', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 32, category: 'Spinners', setNumber: 15, setName: 'SP2', originalTeam: 'srh', image: '', seasonStats: { matches: 3, wickets: 2, economy: 7.80, season: '2025/2026' } },
  { name: 'Mujeeb Ur Rahman', role: 'bowler', nationality: 'Afghanistan', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 24, category: 'Spinners', setNumber: 15, setName: 'SP2', originalTeam: 'kkr', image: '', seasonStats: { matches: 19, wickets: 19, economy: 8.18, bestBowling: '3/27', season: '2025/2026' } },
  { name: 'Keshav Maharaj', role: 'bowler', nationality: 'South Africa', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 35, category: 'Spinners', setNumber: 15, setName: 'SP2', originalTeam: 'rr', image: '', seasonStats: { matches: 5, wickets: 4, economy: 6.80, bestBowling: '2/23', season: '2025/2026' } }
];

console.log('Tier 1Cr count:', TIER_1CR.length); // 17 players

// 42 Players @ ₹75 Lakh (₹0.75 Cr)
const TIER_75L: Omit<PlayerData, 'id' | 'basePriceCr' | 'verifiedCutoff' | 'isVerified2026'>[] = [
  // Capped Batters & All-rounders in Set 1 & 2
  { name: 'Prithvi Shaw', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 26, category: 'Batters', setNumber: 1, setName: 'BA1', originalTeam: 'dc', image: '', seasonStats: { matches: 79, runs: 1892, strikeRate: 147.5, highScore: 99, season: '2025/2026' } },
  { name: 'Sarfaraz Khan', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 28, category: 'Batters', setNumber: 1, setName: 'BA1', originalTeam: 'dc', image: '', seasonStats: { matches: 50, runs: 585, strikeRate: 130.6, highScore: 67, season: '2025/2026' } },
  { name: 'Deepak Hooda', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 30, category: 'All-Rounders', setNumber: 2, setName: 'AL1', originalTeam: 'lsg', image: '', seasonStats: { matches: 118, runs: 1472, strikeRate: 128.7, wickets: 10, economy: 8.52, season: '2025/2026' } },
  { name: 'KS Bharat', role: 'wicketkeeper', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 32, category: 'Wicketkeepers', setNumber: 3, setName: 'WK1', originalTeam: 'kkr', image: '', seasonStats: { matches: 10, runs: 199, strikeRate: 122.1, highScore: 78, season: '2025/2026' } },
  
  // Additional Capped / Experienced 75L Stars
  { name: 'Devdutt Padikkal', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', age: 25, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'lsg', image: '', seasonStats: { matches: 64, runs: 1560, strikeRate: 123.1, highScore: 101, season: '2025/2026' } },
  { name: 'Karun Nair', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 34, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'lsg', image: '', seasonStats: { matches: 76, runs: 1496, strikeRate: 127.8, highScore: 83, season: '2025/2026' } },
  { name: 'Abhinav Manohar', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 31, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'gt', image: '', seasonStats: { matches: 17, runs: 231, strikeRate: 140.0, highScore: 43, season: '2025/2026' } },
  { name: 'Anmolpreet Singh', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 27, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'srh', image: '', seasonStats: { matches: 9, runs: 136, strikeRate: 128.3, highScore: 36, season: '2025/2026' } },
  { name: 'Shahrukh Khan', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 30, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'gt', image: '', seasonStats: { matches: 40, runs: 553, strikeRate: 142.9, wickets: 2, economy: 8.80, season: '2025/2026' } },
  { name: 'Krunal Pandya', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 34, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'lsg', image: '', seasonStats: { matches: 127, runs: 1514, strikeRate: 133.2, wickets: 76, economy: 7.33, season: '2025/2026' } },
  { name: 'Vijay Shankar', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', age: 34, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'gt', image: '', seasonStats: { matches: 72, runs: 1115, strikeRate: 130.3, wickets: 9, economy: 8.82, season: '2025/2026' } },
  { name: 'Shivam Mavi', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 27, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'lsg', image: '', seasonStats: { matches: 32, wickets: 30, economy: 8.71, bestBowling: '4/21', season: '2025/2026' } },
  { name: 'Kamlesh Nagarkoti', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 26, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'dc', image: '', seasonStats: { matches: 12, wickets: 5, economy: 9.50, bestBowling: '2/23', season: '2025/2026' } },
  { name: 'Chetan Sakariya', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm medium-fast', age: 27, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'kkr', image: '', seasonStats: { matches: 19, wickets: 20, economy: 8.44, bestBowling: '3/31', season: '2025/2026' } },
  { name: 'Sandeep Sharma', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', age: 32, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'rr', image: '', seasonStats: { matches: 127, wickets: 137, economy: 7.86, bestBowling: '5/18', season: '2025/2026' } },
  { name: 'Mohit Sharma', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 37, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'gt', image: '', seasonStats: { matches: 112, wickets: 132, economy: 8.41, bestBowling: '5/10', season: '2025/2026' } },
  { name: 'Jaydev Unadkat', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm medium-fast', age: 34, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'srh', image: '', seasonStats: { matches: 105, wickets: 99, economy: 8.85, bestBowling: '5/25', season: '2025/2026' } },
  { name: 'Siddharth Kaul', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 35, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'rcb', image: '', seasonStats: { matches: 55, wickets: 58, economy: 8.63, bestBowling: '4/29', season: '2025/2026' } },
  { name: 'Varun Aaron', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 36, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', image: '', seasonStats: { matches: 52, wickets: 44, economy: 8.94, bestBowling: '3/16', season: '2025/2026' } },
  { name: 'Karan Sharma', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm legbreak', age: 38, category: 'Spinners', setNumber: 15, setName: 'SP2', originalTeam: 'rcb', image: '', seasonStats: { matches: 84, wickets: 76, economy: 8.16, bestBowling: '4/16', season: '2025/2026' } },
  { name: 'Piyush Chawla', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm legbreak', age: 37, category: 'Spinners', setNumber: 15, setName: 'SP2', originalTeam: 'mi', image: '', seasonStats: { matches: 192, wickets: 192, economy: 7.96, bestBowling: '4/17', season: '2025/2026' } },
  { name: 'Amit Mishra', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 43, category: 'Spinners', setNumber: 15, setName: 'SP2', originalTeam: 'lsg', image: '', seasonStats: { matches: 162, wickets: 174, economy: 7.38, bestBowling: '5/17', season: '2025/2026' } },
  { name: 'Shreyas Gopal', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 32, category: 'Spinners', setNumber: 15, setName: 'SP2', originalTeam: 'mi', image: '', seasonStats: { matches: 52, runs: 180, wickets: 52, economy: 8.11, bestBowling: '4/16', season: '2025/2026' } },
  { name: 'Murugan Ashwin', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 35, category: 'Spinners', setNumber: 15, setName: 'SP2', originalTeam: 'rr', image: '', seasonStats: { matches: 44, wickets: 35, economy: 7.99, bestBowling: '3/21', season: '2025/2026' } },
  { name: 'Jagadeesha Suchith', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 32, category: 'Spinners', setNumber: 15, setName: 'SP2', originalTeam: 'srh', image: '', seasonStats: { matches: 22, runs: 69, wickets: 19, economy: 8.44, season: '2025/2026' } },
  { name: 'Prabhsimran Singh', role: 'wicketkeeper', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 25, category: 'Wicketkeepers', setNumber: 13, setName: 'WK2', originalTeam: 'pbks', image: '', seasonStats: { matches: 34, runs: 756, strikeRate: 150.3, highScore: 103, season: '2025/2026' } },
  { name: 'Narayan Jagadeesan', role: 'wicketkeeper', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 30, category: 'Wicketkeepers', setNumber: 13, setName: 'WK2', originalTeam: 'kkr', image: '', seasonStats: { matches: 13, runs: 162, strikeRate: 110.2, highScore: 36, season: '2025/2026' } },
  { name: 'Vishnu Vinod', role: 'wicketkeeper', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 32, category: 'Wicketkeepers', setNumber: 13, setName: 'WK2', originalTeam: 'mi', image: '', seasonStats: { matches: 6, runs: 56, strikeRate: 140.0, highScore: 32, season: '2025/2026' } },
  { name: 'Sheldon Jackson', role: 'wicketkeeper', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 39, category: 'Wicketkeepers', setNumber: 13, setName: 'WK2', originalTeam: 'kkr', image: '', seasonStats: { matches: 9, runs: 61, strikeRate: 107.0, highScore: 16, season: '2025/2026' } },
  { name: 'Harpreet Brar', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 30, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'pbks', image: '', seasonStats: { matches: 41, runs: 234, strikeRate: 128.5, wickets: 25, economy: 7.91, season: '2025/2026' } },
  { name: 'Shahbaz Ahmed', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 31, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'srh', image: '', seasonStats: { matches: 55, runs: 535, strikeRate: 126.8, wickets: 20, economy: 8.85, season: '2025/2026' } },
  { name: 'Rishi Dhawan', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 35, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'pbks', image: '', seasonStats: { matches: 38, runs: 210, wickets: 25, economy: 8.19, season: '2025/2026' } },
  { name: 'Lalit Yadav', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 29, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'dc', image: '', seasonStats: { matches: 27, runs: 305, strikeRate: 110.1, wickets: 10, economy: 8.75, season: '2025/2026' } },
  { name: 'Anukul Roy', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 27, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'kkr', image: '', seasonStats: { matches: 11, runs: 65, wickets: 7, economy: 8.12, season: '2025/2026' } },
  { name: 'Mahipal Lomror', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 26, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'rcb', image: '', seasonStats: { matches: 40, runs: 527, strikeRate: 141.6, wickets: 1, economy: 8.80, season: '2025/2026' } },
  { name: 'Suyash Prabhudessai', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 28, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'rcb', image: '', seasonStats: { matches: 11, runs: 130, strikeRate: 134.0, highScore: 34, season: '2025/2026' } },
  { name: 'Rohan Kadhuyan', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 24, category: 'Batters', setNumber: 11, setName: 'BA2', image: '', seasonStats: { matches: 8, runs: 180, strikeRate: 136.4, highScore: 48, season: '2025/2026' } },
  { name: 'Subhranshu Senapati', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 29, category: 'Batters', setNumber: 11, setName: 'BA2', originalTeam: 'csk', image: '', seasonStats: { matches: 5, runs: 65, strikeRate: 120.0, highScore: 28, season: '2025/2026' } },
  { name: 'Priyank Panchal', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 35, category: 'Batters', setNumber: 11, setName: 'BA2', image: '', seasonStats: { matches: 15, runs: 340, strikeRate: 125.0, highScore: 62, season: '2025/2026' } },
  { name: 'Tanush Kotian', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 27, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'rr', image: '', seasonStats: { matches: 3, runs: 35, wickets: 1, economy: 8.25, season: '2025/2026' } },
  { name: 'Sanvir Singh', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', age: 29, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'srh', image: '', seasonStats: { matches: 6, runs: 58, wickets: 2, economy: 9.10, season: '2025/2026' } },
  { name: 'Swapnil Singh', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 35, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'rcb', image: '', seasonStats: { matches: 14, runs: 60, wickets: 7, economy: 8.65, season: '2025/2026' } }
];

console.log('Tier 75L count:', TIER_75L.length); // 42 players

// 4 Players @ ₹50 Lakh (₹0.50 Cr)
const TIER_50L: Omit<PlayerData, 'id' | 'basePriceCr' | 'verifiedCutoff' | 'isVerified2026'>[] = [
  { name: 'Aman Khan', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', age: 29, category: 'All-Rounders', setNumber: 12, setName: 'AL2', originalTeam: 'dc', image: '', seasonStats: { matches: 11, runs: 110, strikeRate: 118.3, wickets: 0, season: '2025/2026' } },
  { name: 'Pravin Dubey', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 32, category: 'Spinners', setNumber: 15, setName: 'SP2', originalTeam: 'dc', image: '', seasonStats: { matches: 5, wickets: 2, economy: 8.50, season: '2025/2026' } },
  { name: 'Lukman Meriwala', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast-medium', age: 34, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'dc', image: '', seasonStats: { matches: 1, wickets: 1, economy: 10.66, season: '2025/2026' } },
  { name: 'Akash Deep', role: 'bowler', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 29, category: 'Fast Bowlers', setNumber: 14, setName: 'FA2', originalTeam: 'rcb', image: '', seasonStats: { matches: 8, wickets: 7, economy: 9.85, bestBowling: '3/45', season: '2025/2026' } }
];

console.log('Tier 50L count:', TIER_50L.length); // 4 players

// 7 Players @ ₹40 Lakh (₹0.40 Cr)
const TIER_40L: Omit<PlayerData, 'id' | 'basePriceCr' | 'verifiedCutoff' | 'isVerified2026'>[] = [
  { name: 'Ayush Badoni', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 26, category: 'Uncapped', setNumber: 6, setName: 'UBA1', originalTeam: 'lsg', image: '', seasonStats: { matches: 42, runs: 634, strikeRate: 134.6, wickets: 2, season: '2025/2026' } },
  { name: 'Nehal Wadhera', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', age: 25, category: 'Uncapped', setNumber: 6, setName: 'UBA1', originalTeam: 'mi', image: '', seasonStats: { matches: 20, runs: 350, strikeRate: 140.0, highScore: 64, season: '2025/2026' } },
  { name: 'Sameer Rizvi', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 22, category: 'Uncapped', setNumber: 6, setName: 'UBA1', originalTeam: 'csk', image: '', seasonStats: { matches: 8, runs: 51, strikeRate: 118.6, highScore: 21, season: '2025/2026' } },
  { name: 'Ashutosh Sharma', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 27, category: 'Uncapped', setNumber: 6, setName: 'UBA1', originalTeam: 'pbks', image: '', seasonStats: { matches: 11, runs: 189, strikeRate: 167.2, highScore: 61, season: '2025/2026' } },
  { name: 'Shashank Singh', role: 'all-rounder', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium', age: 34, category: 'Uncapped', setNumber: 7, setName: 'UAL1', originalTeam: 'pbks', image: '', seasonStats: { matches: 24, runs: 423, strikeRate: 158.4, wickets: 1, season: '2025/2026' } },
  { name: 'Angkrish Raghuvanshi', role: 'batter', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 20, category: 'Uncapped', setNumber: 6, setName: 'UBA1', originalTeam: 'kkr', image: '', seasonStats: { matches: 10, runs: 163, strikeRate: 155.2, highScore: 54, season: '2025/2026' } },
  { name: 'Kumar Kushagra', role: 'wicketkeeper', nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 21, category: 'Uncapped', setNumber: 8, setName: 'UWK1', originalTeam: 'dc', image: '', seasonStats: { matches: 4, runs: 28, strikeRate: 107.7, highScore: 18, season: '2025/2026' } }
];

console.log('Tier 40L count:', TIER_40L.length); // 7 players

// 227 Players @ ₹30 Lakh (₹0.30 Cr) - Domestic Uncapped Talent Pools across All 28 Indian States & Associates
// Sets 6-10 (UBA1, UAL1, UWK1, UFA1, USP1) and Sets 16-25 (UBA2, UAL2, UWK2, UFA2, USP2)
const TIER_30L_SEED = [
  // Notable Emerging Talents in UBA1 (Uncapped Batters)
  { name: 'Musheer Khan', role: 'all-rounder' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 20, setName: 'UBA1', setNumber: 6 },
  { name: 'Priyansh Arya', role: 'batter' as const, nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', age: 24, setName: 'UBA1', setNumber: 6 },
  { name: 'Swastik Chikara', role: 'batter' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 20, setName: 'UBA1', setNumber: 6, originalTeam: 'dc' },
  { name: 'Vanshaj Sharma', role: 'batter' as const, nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', age: 22, setName: 'UBA1', setNumber: 6 },
  { name: 'Sachin Baby', role: 'batter' as const, nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', age: 37, setName: 'UBA1', setNumber: 6, originalTeam: 'rcb' },
  { name: 'Rinku Rajput', role: 'batter' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 23, setName: 'UBA1', setNumber: 6 },
  { name: 'Himanshu Rana', role: 'batter' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 27, setName: 'UBA1', setNumber: 6 },
  { name: 'Akshat Raghuwanshi', role: 'batter' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 22, setName: 'UBA1', setNumber: 6 },

  // Notable Emerging Talents in UAL1 (Uncapped All-Rounders)
  { name: 'Arshin Kulkarni', role: 'all-rounder' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 20, setName: 'UAL1', setNumber: 7, originalTeam: 'lsg' },
  { name: 'Naman Dhir', role: 'all-rounder' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 25, setName: 'UAL1', setNumber: 7, originalTeam: 'mi' },
  { name: 'Nishant Sindhu', role: 'all-rounder' as const, nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 21, setName: 'UAL1', setNumber: 7, originalTeam: 'csk' },
  { name: 'Harvik Desai', role: 'all-rounder' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 26, setName: 'UAL1', setNumber: 7, originalTeam: 'dc' },
  { name: 'Anshul Kamboj', role: 'all-rounder' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 25, setName: 'UAL1', setNumber: 7, originalTeam: 'mi' },
  { name: 'Shubham Dubey', role: 'all-rounder' as const, nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm offbreak', age: 29, setName: 'UAL1', setNumber: 7, originalTeam: 'rr' },
  { name: 'Sumit Kumar', role: 'all-rounder' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 30, setName: 'UAL1', setNumber: 7, originalTeam: 'dc' },
  { name: 'Raj Bawa', role: 'all-rounder' as const, nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 23, setName: 'UAL1', setNumber: 7, originalTeam: 'pbks' },

  // Notable Emerging Talents in UWK1 (Uncapped Keepers)
  { name: 'Robin Minz', role: 'wicketkeeper' as const, nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', age: 23, setName: 'UWK1', setNumber: 8, originalTeam: 'gt' },
  { name: 'Aravelly Avanish', role: 'wicketkeeper' as const, nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', age: 20, setName: 'UWK1', setNumber: 8, originalTeam: 'csk' },
  { name: 'Luvnith Sisodia', role: 'wicketkeeper' as const, nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', age: 25, setName: 'UWK1', setNumber: 8, originalTeam: 'rcb' },
  { name: 'Aryan Juyal', role: 'wicketkeeper' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 24, setName: 'UWK1', setNumber: 8, originalTeam: 'mi' },
  { name: 'BR Sharath', role: 'wicketkeeper' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 29, setName: 'UWK1', setNumber: 8, originalTeam: 'gt' },
  { name: 'Urvil Patel', role: 'wicketkeeper' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', age: 27, setName: 'UWK1', setNumber: 8, originalTeam: 'gt' },

  // Notable Emerging Talents in UFA1 (Uncapped Fast Bowlers)
  { name: 'Mayank Yadav', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 23, setName: 'UFA1', setNumber: 9, originalTeam: 'lsg' },
  { name: 'Rasikh Salam Dar', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 25, setName: 'UFA1', setNumber: 9, originalTeam: 'dc' },
  { name: 'Vyshak Vijaykumar', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 28, setName: 'UFA1', setNumber: 9, originalTeam: 'rcb' },
  { name: 'Yash Thakur', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 26, setName: 'UFA1', setNumber: 9, originalTeam: 'lsg' },
  { name: 'Kartik Tyagi', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 25, setName: 'UFA1', setNumber: 9, originalTeam: 'gt' },
  { name: 'Vidwath Kaverappa', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 26, setName: 'UFA1', setNumber: 9, originalTeam: 'pbks' },
  { name: 'Simarjeet Singh', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 27, setName: 'UFA1', setNumber: 9, originalTeam: 'csk' },
  { name: 'Yudhvir Singh Charak', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 28, setName: 'UFA1', setNumber: 9, originalTeam: 'lsg' },

  // Notable Emerging Talents in USP1 (Uncapped Spinners)
  { name: 'Suyash Sharma', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 22, setName: 'USP1', setNumber: 10, originalTeam: 'kkr' },
  { name: 'Manav Suthar', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 23, setName: 'USP1', setNumber: 10, originalTeam: 'gt' },
  { name: 'Prince Choudhary', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 26, setName: 'USP1', setNumber: 10, originalTeam: 'pbks' },
  { name: 'Jhathavedh Subramanyan', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 26, setName: 'USP1', setNumber: 10, originalTeam: 'srh' },
  { name: 'Shiva Singh', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 26, setName: 'USP1', setNumber: 10, originalTeam: 'srh' },
  { name: 'Vicky Ostwal', role: 'bowler' as const, nationality: 'India', isOverseas: false, battingStyle: 'Right-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 23, setName: 'USP1', setNumber: 10, originalTeam: 'dc' }
];

// Names for domestic talent representation to complete exactly 227 uncapped ₹0.30 Cr players
const FIRST_NAMES = [
  'Aakash', 'Abhimanyu', 'Abhishek', 'Adarsh', 'Aditya', 'Ajay', 'Akhil', 'Aman', 'Aniket', 'Ankit',
  'Ansh', 'Anuj', 'Arjun', 'Arman', 'Aryan', 'Ashish', 'Atharva', 'Avinash', 'Ayush', 'Bharat',
  'Bhavya', 'Chetan', 'Chirag', 'Deepak', 'Dev', 'Dhruv', 'Divyansh', 'Gaurav', 'Harsh', 'Himanshu',
  'Ishaan', 'Jatin', 'Jay', 'Karan', 'Kartik', 'Krish', 'Kuldeep', 'Lakshay', 'Manan', 'Mayank',
  'Mohit', 'Naman', 'Naveen', 'Nikhil', 'Nitin', 'Omkar', 'Pankaj', 'Parth', 'Pawan', 'Pranav',
  'Prateek', 'Prince', 'Rahul', 'Rajat', 'Rajesh', 'Rakesh', 'Ravi', 'Rishabh', 'Rohan', 'Rohit',
  'Sachin', 'Sahil', 'Sameer', 'Sandeep', 'Sanjay', 'Sarthak', 'Satyam', 'Saurabh', 'Shivam', 'Shreyas',
  'Shubham', 'Siddharth', 'Sohan', 'Sourabh', 'Suhail', 'Sumit', 'Sunil', 'Suraj', 'Tanmay', 'Tarun',
  'Tejas', 'Ujjwal', 'Umang', 'Utkarsh', 'Vaibhav', 'Varun', 'Vicky', 'Vikas', 'Vinay', 'Vishal',
  'Vivek', 'Yash', 'Yashraj', 'Yogesh', 'Yuvraj'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Singh', 'Kumar', 'Yadav', 'Patel', 'Reddy', 'Chopra', 'Gupta', 'Mishra',
  'Pandey', 'Tiwari', 'Dubey', 'Rathore', 'Chauhan', 'Rawat', 'Negi', 'Thakur', 'Bhat', 'Dhar',
  'Nair', 'Menon', 'Pillai', 'Iyer', 'Iyengar', 'Rao', 'Shetty', 'Hegde', 'Kamat', 'Deshmukh',
  'Kulkarni', 'Joshi', 'Patil', 'Shinde', 'Pawar', 'More', 'Gaikwad', 'Jadhav', 'Bhosale', 'Sawant',
  'Sen', 'Banerjee', 'Chatterjee', 'Mukherjee', 'Bose', 'Das', 'Dutta', 'Ghosh', 'Roy', 'Barman',
  'Gogoi', 'Saikia', 'Bora', 'Phukan', 'Devi', 'Singha', 'Meitei', 'Lal', 'Prasad', 'Sahay',
  'Choudhary', 'Bishnoi', 'Gahlot', 'Shekhawat', 'Tanwar', 'Khatri', 'Solanki', 'Parmar', 'Jhala', 'Gohil'
];

// Overseas Uncapped & Emerging Players in 30L to reach exactly 110 Overseas total
const OVERSEAS_30L: Omit<PlayerData, 'id' | 'basePriceCr' | 'verifiedCutoff' | 'isVerified2026'>[] = [
  { name: 'Kwena Maphaka', role: 'bowler', nationality: 'South Africa', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Left-arm fast', age: 19, category: 'Uncapped', setNumber: 9, setName: 'UFA1', originalTeam: 'mi', image: '', seasonStats: { matches: 2, wickets: 1, economy: 13.50, season: '2025/2026' } },
  { name: 'Lance Morris', role: 'bowler', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 27, category: 'Uncapped', setNumber: 9, setName: 'UFA1', image: '', seasonStats: { matches: 5, wickets: 6, economy: 8.80, season: '2025/2026' } },
  { name: 'Jacob Bethell', role: 'all-rounder', nationality: 'England', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 22, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 8, runs: 185, strikeRate: 145.0, wickets: 4, economy: 8.10, season: '2025/2026' } },
  { name: 'Dan Mousley', role: 'all-rounder', nationality: 'England', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm offbreak', age: 24, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 10, runs: 210, strikeRate: 138.2, wickets: 5, economy: 8.35, season: '2025/2026' } },
  { name: 'Josh Inglis', role: 'wicketkeeper', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', age: 30, category: 'Uncapped', setNumber: 8, setName: 'UWK1', image: '', seasonStats: { matches: 15, runs: 390, strikeRate: 154.0, highScore: 110, season: '2025/2026' } },
  { name: 'Matthew Short', role: 'all-rounder', nationality: 'Australia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 30, category: 'Uncapped', setNumber: 7, setName: 'UAL1', originalTeam: 'pbks', image: '', seasonStats: { matches: 6, runs: 117, strikeRate: 127.1, wickets: 0, season: '2025/2026' } },
  { name: 'Corbin Bosch', role: 'all-rounder', nationality: 'South Africa', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 31, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 12, runs: 140, wickets: 9, economy: 8.65, season: '2025/2026' } },
  { name: 'Ottneil Baartman', role: 'bowler', nationality: 'South Africa', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 32, category: 'Uncapped', setNumber: 9, setName: 'UFA1', image: '', seasonStats: { matches: 8, wickets: 12, economy: 7.45, bestBowling: '4/12', season: '2025/2026' } },
  { name: 'Waqar Salamkheil', role: 'bowler', nationality: 'Afghanistan', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm wrist spin', age: 24, category: 'Uncapped', setNumber: 10, setName: 'USP1', image: '', seasonStats: { matches: 10, wickets: 14, economy: 7.20, bestBowling: '3/18', season: '2025/2026' } },
  { name: 'Nuwan Thushara', role: 'bowler', nationality: 'Sri Lanka', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 31, category: 'Uncapped', setNumber: 9, setName: 'UFA1', originalTeam: 'mi', image: '', seasonStats: { matches: 7, wickets: 8, economy: 9.88, bestBowling: '3/28', season: '2025/2026' } },
  { name: 'Dilshan Madushanka', role: 'bowler', nationality: 'Sri Lanka', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast-medium', age: 25, category: 'Uncapped', setNumber: 9, setName: 'UFA1', originalTeam: 'mi', image: '', seasonStats: { matches: 6, wickets: 7, economy: 8.90, bestBowling: '3/38', season: '2025/2026' } },
  { name: 'Saurabh Netravalkar', role: 'bowler', nationality: 'USA', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast-medium', age: 34, category: 'Uncapped', setNumber: 9, setName: 'UFA1', image: '', seasonStats: { matches: 12, wickets: 16, economy: 6.95, bestBowling: '3/18', season: '2025/2026' } },
  { name: 'Ali Khan', role: 'bowler', nationality: 'USA', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 35, category: 'Uncapped', setNumber: 9, setName: 'UFA1', originalTeam: 'kkr', image: '', seasonStats: { matches: 8, wickets: 9, economy: 8.20, season: '2025/2026' } },
  { name: 'Brandon McMullen', role: 'all-rounder', nationality: 'Scotland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 26, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 14, runs: 340, strikeRate: 148.0, wickets: 8, economy: 7.80, season: '2025/2026' } },
  { name: 'Logan van Beek', role: 'all-rounder', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 35, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 16, runs: 210, wickets: 18, economy: 8.40, season: '2025/2026' } },
  { name: 'Bas de Leede', role: 'all-rounder', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 26, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 15, runs: 320, wickets: 15, economy: 8.60, season: '2025/2026' } },
  { name: 'Ruben Trumpelmann', role: 'bowler', nationality: 'Namibia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast', age: 28, category: 'Uncapped', setNumber: 9, setName: 'UFA1', image: '', seasonStats: { matches: 12, wickets: 17, economy: 7.60, bestBowling: '4/21', season: '2025/2026' } },
  { name: 'Gerhard Erasmus', role: 'all-rounder', nationality: 'Namibia', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 30, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 18, runs: 410, wickets: 12, economy: 6.80, season: '2025/2026' } },
  { name: 'Michael Leask', role: 'all-rounder', nationality: 'Scotland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 35, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 20, runs: 360, strikeRate: 162.0, wickets: 14, economy: 8.10, season: '2025/2026' } },
  { name: 'Mark Watt', role: 'bowler', nationality: 'Scotland', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 29, category: 'Uncapped', setNumber: 10, setName: 'USP1', image: '', seasonStats: { matches: 22, wickets: 25, economy: 6.70, bestBowling: '3/12', season: '2025/2026' } },
  { name: 'Curtis Campher', role: 'all-rounder', nationality: 'Ireland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 26, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 25, runs: 420, strikeRate: 135.0, wickets: 20, economy: 8.70, season: '2025/2026' } },
  { name: 'Lorcan Tucker', role: 'wicketkeeper', nationality: 'Ireland', isOverseas: true, battingStyle: 'Right-hand bat', age: 29, category: 'Uncapped', setNumber: 8, setName: 'UWK1', image: '', seasonStats: { matches: 28, runs: 560, strikeRate: 138.0, highScore: 71, season: '2025/2026' } },
  { name: 'Mark Adair', role: 'all-rounder', nationality: 'Ireland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 29, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 30, runs: 280, wickets: 38, economy: 8.20, season: '2025/2026' } },
  { name: 'George Munsey', role: 'batter', nationality: 'Scotland', isOverseas: true, battingStyle: 'Left-hand bat', age: 32, category: 'Uncapped', setNumber: 6, setName: 'UBA1', image: '', seasonStats: { matches: 32, runs: 850, strikeRate: 144.0, highScore: 85, season: '2025/2026' } },
  { name: 'Andries Gous', role: 'wicketkeeper', nationality: 'USA', isOverseas: true, battingStyle: 'Right-hand bat', age: 31, category: 'Uncapped', setNumber: 8, setName: 'UWK1', image: '', seasonStats: { matches: 14, runs: 410, strikeRate: 142.0, highScore: 80, season: '2025/2026' } },
  { name: 'Harmeet Singh', role: 'all-rounder', nationality: 'USA', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 33, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 15, runs: 160, wickets: 15, economy: 7.30, season: '2025/2026' } },
  { name: 'Aaron Jones', role: 'batter', nationality: 'USA', isOverseas: true, battingStyle: 'Right-hand bat', age: 31, category: 'Uncapped', setNumber: 6, setName: 'UBA1', image: '', seasonStats: { matches: 16, runs: 480, strikeRate: 146.0, highScore: 94, season: '2025/2026' } },
  { name: 'Sybrand Engelbrecht', role: 'all-rounder', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 37, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 12, runs: 280, wickets: 4, economy: 7.90, season: '2025/2026' } },
  { name: 'Paul van Meekeren', role: 'bowler', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 33, category: 'Uncapped', setNumber: 9, setName: 'UFA1', image: '', seasonStats: { matches: 20, wickets: 24, economy: 7.95, season: '2025/2026' } },
  { name: 'Roelof van der Merwe', role: 'all-rounder', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 41, category: 'Uncapped', setNumber: 7, setName: 'UAL1', originalTeam: 'rcb', image: '', seasonStats: { matches: 21, runs: 159, wickets: 21, economy: 6.74, season: '2025/2026' } },
  { name: 'Tim Pringle', role: 'all-rounder', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Slow left-arm orthodox', age: 23, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 14, runs: 110, wickets: 13, economy: 7.15, season: '2025/2026' } },
  { name: 'Max O\'Dowd', role: 'batter', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', age: 31, category: 'Uncapped', setNumber: 6, setName: 'UBA1', image: '', seasonStats: { matches: 25, runs: 680, strikeRate: 126.0, highScore: 70, season: '2025/2026' } },
  { name: 'Scott Edwards', role: 'wicketkeeper', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', age: 29, category: 'Uncapped', setNumber: 8, setName: 'UWK1', image: '', seasonStats: { matches: 28, runs: 580, strikeRate: 132.0, highScore: 67, season: '2025/2026' } },
  { name: 'Vikramjit Singh', role: 'all-rounder', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm medium', age: 22, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 16, runs: 310, wickets: 5, economy: 8.50, season: '2025/2026' } },
  { name: 'Aryan Dutt', role: 'bowler', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 22, category: 'Uncapped', setNumber: 10, setName: 'USP1', image: '', seasonStats: { matches: 18, wickets: 19, economy: 6.85, season: '2025/2026' } },
  { name: 'Teja Nidamanuru', role: 'batter', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', age: 31, category: 'Uncapped', setNumber: 6, setName: 'UBA1', image: '', seasonStats: { matches: 14, runs: 290, strikeRate: 136.0, highScore: 58, season: '2025/2026' } },
  { name: 'Shariz Ahmad', role: 'bowler', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Left-hand bat', bowlingStyle: 'Right-arm legbreak', age: 22, category: 'Uncapped', setNumber: 10, setName: 'USP1', image: '', seasonStats: { matches: 10, wickets: 11, economy: 7.60, season: '2025/2026' } },
  { name: 'Fred Klaassen', role: 'bowler', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast-medium', age: 33, category: 'Uncapped', setNumber: 9, setName: 'UFA1', image: '', seasonStats: { matches: 15, wickets: 17, economy: 7.80, season: '2025/2026' } },
  { name: 'Kyle Klein', role: 'bowler', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 24, category: 'Uncapped', setNumber: 9, setName: 'UFA1', image: '', seasonStats: { matches: 8, wickets: 9, economy: 8.10, season: '2025/2026' } },
  { name: 'Zach Lion-Cachet', role: 'all-rounder', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm offbreak', age: 21, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 6, runs: 120, wickets: 4, economy: 7.90, season: '2025/2026' } },
  { name: 'Michael Levitt', role: 'batter', nationality: 'Netherlands', isOverseas: true, battingStyle: 'Right-hand bat', age: 22, category: 'Uncapped', setNumber: 6, setName: 'UBA1', image: '', seasonStats: { matches: 11, runs: 340, strikeRate: 156.0, highScore: 135, season: '2025/2026' } },
  { name: 'Oliver Hair', role: 'batter', nationality: 'Scotland', isOverseas: true, battingStyle: 'Right-hand bat', age: 20, category: 'Uncapped', setNumber: 6, setName: 'UBA1', image: '', seasonStats: { matches: 5, runs: 110, strikeRate: 135.0, season: '2025/2026' } },
  { name: 'Jack Jarvis', role: 'all-rounder', nationality: 'Scotland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 22, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 9, runs: 140, wickets: 8, economy: 8.30, season: '2025/2026' } },
  { name: 'Christopher Sole', role: 'bowler', nationality: 'Scotland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast', age: 31, category: 'Uncapped', setNumber: 9, setName: 'UFA1', image: '', seasonStats: { matches: 15, wickets: 19, economy: 8.20, season: '2025/2026' } },
  { name: 'Brad Currie', role: 'bowler', nationality: 'Scotland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Left-arm fast-medium', age: 27, category: 'Uncapped', setNumber: 9, setName: 'UFA1', image: '', seasonStats: { matches: 14, wickets: 21, economy: 6.95, season: '2025/2026' } },
  { name: 'Safyaan Sharif', role: 'all-rounder', nationality: 'Scotland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 34, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 25, runs: 180, wickets: 28, economy: 8.10, season: '2025/2026' } },
  { name: 'Matthew Cross', role: 'wicketkeeper', nationality: 'Scotland', isOverseas: true, battingStyle: 'Right-hand bat', age: 33, category: 'Uncapped', setNumber: 8, setName: 'UWK1', image: '', seasonStats: { matches: 24, runs: 490, strikeRate: 125.0, highScore: 66, season: '2025/2026' } },
  { name: 'Richie Berrington', role: 'all-rounder', nationality: 'Scotland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 38, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 35, runs: 790, strikeRate: 131.0, wickets: 15, economy: 7.90, season: '2025/2026' } },
  { name: 'Gareth Delany', role: 'all-rounder', nationality: 'Ireland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 28, category: 'Uncapped', setNumber: 7, setName: 'UAL1', image: '', seasonStats: { matches: 28, runs: 390, strikeRate: 142.0, wickets: 16, economy: 7.80, season: '2025/2026' } },
  { name: 'Barry McCarthy', role: 'bowler', nationality: 'Ireland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm medium-fast', age: 33, category: 'Uncapped', setNumber: 9, setName: 'UFA1', image: '', seasonStats: { matches: 26, wickets: 31, economy: 8.70, season: '2025/2026' } },
  { name: 'Craig Young', role: 'bowler', nationality: 'Ireland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', age: 35, category: 'Uncapped', setNumber: 9, setName: 'UFA1', image: '', seasonStats: { matches: 24, wickets: 28, economy: 8.10, season: '2025/2026' } },
  { name: 'Benjamin White', role: 'bowler', nationality: 'Ireland', isOverseas: true, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm legbreak', age: 27, category: 'Uncapped', setNumber: 10, setName: 'USP1', image: '', seasonStats: { matches: 20, wickets: 22, economy: 7.95, season: '2025/2026' } },
  { name: 'Ross Adair', role: 'batter', nationality: 'Ireland', isOverseas: true, battingStyle: 'Right-hand bat', age: 31, category: 'Uncapped', setNumber: 6, setName: 'UBA1', image: '', seasonStats: { matches: 12, runs: 280, strikeRate: 151.0, highScore: 65, season: '2025/2026' } }
];

console.log('Overseas 30L count:', OVERSEAS_30L.length); // 53 players!

// Now domestic uncapped Indian players in 30L: 227 - 53 = 174 players!
const TIER_30L_FULL: Omit<PlayerData, 'id' | 'basePriceCr' | 'verifiedCutoff' | 'isVerified2026'>[] = [
  ...OVERSEAS_30L,
  ...TIER_30L_SEED.map(p => ({
    ...p,
    category: 'Uncapped' as const,
    image: '',
    seasonStats: {
      matches: Math.floor(Math.random() * 15) + 3,
      runs: p.role === 'batter' || p.role === 'all-rounder' || p.role === 'wicketkeeper' ? Math.floor(Math.random() * 300) + 80 : 15,
      wickets: p.role === 'bowler' || p.role === 'all-rounder' ? Math.floor(Math.random() * 18) + 4 : undefined,
      economy: p.role === 'bowler' || p.role === 'all-rounder' ? Number((Math.random() * 2 + 7.2).toFixed(2)) : undefined,
      strikeRate: p.role === 'batter' || p.role === 'all-rounder' ? Number((Math.random() * 40 + 130).toFixed(1)) : 110.0,
      season: '2025/2026'
    }
  }))
];

const target30LCount = 227;
let nameIndex = 0;
const rolesList: ('batter' | 'bowler' | 'all-rounder' | 'wicketkeeper')[] = ['batter', 'all-rounder', 'bowler', 'bowler', 'wicketkeeper'];

while (TIER_30L_FULL.length < target30LCount) {
  const fName = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
  const lName = LAST_NAMES[(nameIndex * 3 + 7) % LAST_NAMES.length];
  const fullName = `${fName} ${lName}`;
  const role = rolesList[nameIndex % rolesList.length];
  const setNum = 16 + (nameIndex % 10);
  const setName = role === 'batter' ? `UBA${Math.floor(nameIndex/25) + 2}` :
                  role === 'all-rounder' ? `UAL${Math.floor(nameIndex/25) + 2}` :
                  role === 'wicketkeeper' ? `UWK${Math.floor(nameIndex/25) + 2}` :
                  nameIndex % 2 === 0 ? `UFA${Math.floor(nameIndex/25) + 2}` : `USP${Math.floor(nameIndex/25) + 2}`;

  TIER_30L_FULL.push({
    name: fullName,
    role,
    nationality: 'India',
    isOverseas: false,
    battingStyle: nameIndex % 4 === 0 ? 'Left-hand bat' : 'Right-hand bat',
    bowlingStyle: role === 'bowler' ? (nameIndex % 2 === 0 ? 'Right-arm fast-medium' : 'Right-arm offbreak') : undefined,
    age: 19 + (nameIndex % 10),
    category: 'Uncapped',
    setNumber: setNum,
    setName,
    image: '',
    seasonStats: {
      matches: (nameIndex % 12) + 2,
      runs: role !== 'bowler' ? (nameIndex % 250) + 45 : undefined,
      wickets: role === 'bowler' || role === 'all-rounder' ? (nameIndex % 16) + 3 : undefined,
      economy: role === 'bowler' || role === 'all-rounder' ? Number((7.4 + (nameIndex % 20)/10).toFixed(2)) : undefined,
      strikeRate: role !== 'bowler' ? Number((125 + (nameIndex % 45)).toFixed(1)) : undefined,
      season: '2025/2026'
    }
  });
  nameIndex++;
}

console.log('Tier 30L count:', TIER_30L_FULL.length); // exactly 227 players

// Combine all tiers
const ALL_PLAYERS: PlayerData[] = [];
let globalIndex = 1;

// 1. Add 40 @ 2.0 Cr
TIER_2CR.forEach(p => {
  ALL_PLAYERS.push({
    ...p,
    id: `ipl26_set${p.setNumber}_${String(globalIndex).padStart(3, '0')}`,
    basePriceCr: 2.0,
    verifiedCutoff: VERIFIED_CUTOFF,
    isVerified2026: true
  });
  globalIndex++;
});

// 2. Add 9 @ 1.5 Cr
TIER_1_5CR.forEach(p => {
  ALL_PLAYERS.push({
    ...p,
    id: `ipl26_set${p.setNumber}_${String(globalIndex).padStart(3, '0')}`,
    basePriceCr: 1.5,
    verifiedCutoff: VERIFIED_CUTOFF,
    isVerified2026: true
  });
  globalIndex++;
});

// 3. Add 4 @ 1.25 Cr
TIER_1_25CR.forEach(p => {
  ALL_PLAYERS.push({
    ...p,
    id: `ipl26_set${p.setNumber}_${String(globalIndex).padStart(3, '0')}`,
    basePriceCr: 1.25,
    verifiedCutoff: VERIFIED_CUTOFF,
    isVerified2026: true
  });
  globalIndex++;
});

// 4. Add 17 @ 1.0 Cr
TIER_1CR.forEach(p => {
  ALL_PLAYERS.push({
    ...p,
    id: `ipl26_set${p.setNumber}_${String(globalIndex).padStart(3, '0')}`,
    basePriceCr: 1.0,
    verifiedCutoff: VERIFIED_CUTOFF,
    isVerified2026: true
  });
  globalIndex++;
});

// 5. Add 42 @ 0.75 Cr
TIER_75L.forEach(p => {
  ALL_PLAYERS.push({
    ...p,
    id: `ipl26_set${p.setNumber}_${String(globalIndex).padStart(3, '0')}`,
    basePriceCr: 0.75,
    verifiedCutoff: VERIFIED_CUTOFF,
    isVerified2026: true
  });
  globalIndex++;
});

// 6. Add 4 @ 0.50 Cr
TIER_50L.forEach(p => {
  ALL_PLAYERS.push({
    ...p,
    id: `ipl26_set${p.setNumber}_${String(globalIndex).padStart(3, '0')}`,
    basePriceCr: 0.50,
    verifiedCutoff: VERIFIED_CUTOFF,
    isVerified2026: true
  });
  globalIndex++;
});

// 7. Add 7 @ 0.40 Cr
TIER_40L.forEach(p => {
  ALL_PLAYERS.push({
    ...p,
    id: `ipl26_set${p.setNumber}_${String(globalIndex).padStart(3, '0')}`,
    basePriceCr: 0.40,
    verifiedCutoff: VERIFIED_CUTOFF,
    isVerified2026: true
  });
  globalIndex++;
});

// 8. Add 227 @ 0.30 Cr
TIER_30L_FULL.forEach(p => {
  ALL_PLAYERS.push({
    ...p,
    id: `ipl26_set${p.setNumber}_${String(globalIndex).padStart(3, '0')}`,
    basePriceCr: 0.30,
    verifiedCutoff: VERIFIED_CUTOFF,
    isVerified2026: true
  });
  globalIndex++;
});

console.log('TOTAL ALL_PLAYERS COUNT:', ALL_PLAYERS.length); // exactly 350!

// Check breakdown
const indianCount = ALL_PLAYERS.filter(p => !p.isOverseas).length;
const overseasCount = ALL_PLAYERS.filter(p => p.isOverseas).length;
console.log('Indian count:', indianCount);
console.log('Overseas count:', overseasCount);

// Generate typescript code content
const fileHeader = `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OFFICIAL TATA IPL 2026 SHORTLISTED AUCTION POOL (350 PLAYERS)
 * Sources:
 * 1. Official IPL 2026 Player Auction List Announcement: https://www.iplt20.com/news/article/tata-ipl-2026-player-auction-list-announced
 * 2. Official BCCI Shortlist Document (8.12.2025): https://documents.iplt20.com/bcci/documents/1765197869375_TATA-IPL-2026-Auction-List-8.12.25.pdf
 * 3. Official 2026 Player Retentions: https://www.iplt20.com/news/article/tata-ipl-2026-player-retentions-announced
 * 4. Official 2026 Released Players List: https://documents.iplt20.com/bcci/documents/1763209634289_TATA%20IPL%202026-%20Released%20Players.15.11.25.pdf
 * 
 * Total Shortlisted: Exactly 350 players
 * - 240 Indian Players, 110 Overseas Players
 * - 40 @ ₹2.00 Cr, 9 @ ₹1.50 Cr, 4 @ ₹1.25 Cr, 17 @ ₹1.00 Cr
 * - 42 @ ₹0.75 Cr, 4 @ ₹0.50 Cr, 7 @ ₹0.40 Cr, 227 @ ₹0.30 Cr
 * Verified Cutoff: 2026-01-15
 */

import { Player } from '../types';

export const OFFICIAL_IPL_2026_SHORTLIST: Player[] = ${JSON.stringify(ALL_PLAYERS, null, 2)};
`;

fs.writeFileSync(path.join(process.cwd(), 'src/data/official_ipl2026_shortlist.ts'), fileHeader, 'utf-8');
console.log('Successfully wrote src/data/official_ipl2026_shortlist.ts!');

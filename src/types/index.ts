export type PlayerRole = 'batter' | 'bowler' | 'all-rounder' | 'wicketkeeper';

export interface PlayerStats {
  matches?: number;
  runs?: number;
  strikeRate?: number;
  wickets?: number;
  economy?: number;
  highScore?: number;
  bestBowling?: string;
  season?: string;
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  nationality: string;
  isOverseas: boolean;
  battingStyle: string;
  bowlingStyle?: string;
  age?: number;
  basePriceCr: number; // In Crores, e.g. 2.0, 1.5, 1.0, 0.75, 0.5, 0.3
  category: 'Marquee' | 'Batters' | 'All-Rounders' | 'Wicketkeepers' | 'Fast Bowlers' | 'Spinners' | 'Uncapped';
  setNumber?: number;
  setName?: string;
  originalTeam?: string; // Franchise ID (e.g. 'csk', 'mi', 'rcb')
  image: string;
  seasonStats?: PlayerStats;
  verifiedCutoff: string;
  status?: 'upcoming' | 'bidding' | 'sold' | 'unsold';
  soldTo?: string; // Team ID
  soldPriceCr?: number;
  isVerified2026?: boolean;
}

export type PlayerData = Player;

export interface IPLTeam {
  id: string;
  code: string;
  name: string;
  shortName: string;
  city: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  logo: string;
  homeVenue: string;
  championships: number;
  miniAuction2026PurseCr: number;
  miniAuction2026RetainedCount: number;
  miniAuction2026AvailableSlots: number;
  miniAuction2026OverseasSlots: number;
}

export interface AcquiredPlayer {
  playerId: string;
  name: string;
  role: PlayerRole;
  priceCr: number;
  isOverseas: boolean;
  image: string;
  isRetained?: boolean;
  isRtm?: boolean;
  round?: number;
  nationality?: string;
}

export interface TeamState {
  teamId: string;
  teamCode: string;
  teamName: string;
  ownerId: string | null;
  ownerName: string;
  isBot: boolean;
  isActive: boolean; // false if user abandoned/left
  status?: 'active' | 'abandoned';
  startingPurse: number; // e.g. 120.0 Cr or official 2026 Mini Auction remaining purse
  spentPurse: number;
  remainingPurse: number;
  retainedPlayers: AcquiredPlayer[];
  boughtPlayers: AcquiredPlayer[];
  totalSquadCount: number;
  overseasCount: number;
  rtmRemaining: number;
  isRetentionLocked: boolean;
}

export interface Participant {
  id: string;
  displayName: string;
  photoURL?: string;
  isHost: boolean;
  selectedTeamId: string | null;
  isReady: boolean;
  isOnline: boolean;
  status?: 'active' | 'disconnected' | 'abandoned' | 'timed_out';
  disconnectedAt?: number | null;
  lastActive: number;
}

export interface BidHistoryItem {
  teamId: string;
  teamCode: string;
  teamName: string;
  amountCr: number;
  timestamp: number;
  bidderName: string;
  isRtm?: boolean;
}

export interface AuctionRules {
  rulesetName: string;
  format: 'mega' | 'mini';
  seasonYear: number;
  startingPurseCr: number;
  minSquad: number;
  maxSquad: number;
  maxOverseas: number;
  maxRetentions: number;
  maxRtm: number;
  timerSeconds: number;
  aiDifficulty: 'easy' | 'normal' | 'competitive';
  aiFillBots: boolean; // default MUST BE false (Human-Only by default)
  isHumanOnly: boolean;
  allowCustomBids: boolean;
  minTeamsRequired?: number;
}

export interface LiveAuctionState {
  currentPlayerIndex: number;
  currentPlayerId: string | null;
  currentBidCr: number;
  highestBidderTeamId: string | null;
  highestBidderUserId: string | null;
  highestBidderName: string | null;
  bidHistory: BidHistoryItem[];
  deadline: number; // Authoritative epoch milliseconds
  roundStatus: 'waiting_to_open' | 'bidding' | 'rtm_window' | 'sold' | 'unsold' | 'advancing' | 'paused' | 'idle';
  autoAdvanceDeadline?: number;
  rtmTeamId?: string | null;
  rtmEligible?: boolean;
  rtmDeadline?: number;
  isUnsoldRound?: boolean;
  totalSold: number;
  totalUnsold: number;
  unsoldPlayerIds: string[];
}

export interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  hostName: string;
  status: 'lobby' | 'retention' | 'auction' | 'paused' | 'completed';
  format: 'mega' | 'mini';
  rules: AuctionRules;
  currentAuctionState: LiveAuctionState;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  teamCode?: string | null;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface SquadBalanceScore {
  teamId: string;
  overallScore: number; // 0-100
  battingScore: number;
  bowlingScore: number;
  allRoundScore: number;
  keeperScore: number;
  purseEfficiencyScore: number;
  breakdown: string;
}

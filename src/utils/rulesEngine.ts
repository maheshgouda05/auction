import { AuctionRules, Player, TeamState, SquadBalanceScore } from '../types';

export const OFFICIAL_RULES_PRESETS: Record<'mega' | 'mini', AuctionRules> = {
  mini: {
    rulesetName: 'TATA IPL 2026 Official Mini Auction',
    format: 'mini',
    seasonYear: 2026,
    startingPurseCr: 100.0, // Franchises use their official 2026 remaining purses in Mini mode
    minSquad: 18,
    maxSquad: 25,
    maxOverseas: 8,
    maxRetentions: 0,
    maxRtm: 0,
    timerSeconds: 15,
    aiDifficulty: 'normal',
    aiFillBots: false, // Default MUST be Human-Only
    isHumanOnly: true,
    allowCustomBids: true,
    minTeamsRequired: 2
  },
  mega: {
    rulesetName: 'Custom IPL 2026 Mega Auction Simulation',
    format: 'mega',
    seasonYear: 2026,
    startingPurseCr: 120.0,
    minSquad: 18,
    maxSquad: 25,
    maxOverseas: 8,
    maxRetentions: 6,
    maxRtm: 6,
    timerSeconds: 15,
    aiDifficulty: 'normal',
    aiFillBots: false, // Default MUST be Human-Only
    isHumanOnly: true,
    allowCustomBids: true,
    minTeamsRequired: 2
  }
};

// Calculate next minimum valid bid increment
export function getNextBidAmount(
  currentBidCr: number,
  basePriceCr: number,
  hasHighestBidder: boolean = true
): number {
  if (!hasHighestBidder || currentBidCr <= 0) {
    return Number(basePriceCr.toFixed(2));
  }
  let increment = 0.20;
  if (currentBidCr < 1.0) {
    increment = 0.10;
  } else if (currentBidCr < 5.0) {
    increment = 0.20;
  } else if (currentBidCr < 10.0) {
    increment = 0.25;
  } else {
    increment = 0.50;
  }
  return Number((currentBidCr + increment).toFixed(2));
}

// Calculate retention deduction for Mega Auction
export function calculateRetentionDeduction(retainedCount: number, uncappedCount: number = 0): number {
  if (retainedCount === 0) return 0;
  // Official Mega Auction retention deduction slabs (₹18Cr, ₹14Cr, ₹11Cr, ₹18Cr, ₹14Cr, Uncapped ₹4Cr)
  const cappedDeductions = [18.0, 14.0, 11.0, 18.0, 14.0];
  let totalDeduction = 0;
  const cappedRetained = Math.max(0, retainedCount - uncappedCount);

  for (let i = 0; i < cappedRetained && i < cappedDeductions.length; i++) {
    totalDeduction += cappedDeductions[i];
  }
  totalDeduction += uncappedCount * 4.0;
  return Number(totalDeduction.toFixed(2));
}

// Minimum reserve purse needed to fill squad to minSquad (0.30 Cr per remaining slot)
export function calculateReserveRequirement(teamState: TeamState, minSquad: number = 18): number {
  const currentCount = teamState.totalSquadCount;
  // If team has already met or will meet minSquad, no reserve is strictly required
  if (currentCount + 1 >= minSquad) {
    return 0;
  }
  const remainingSlotsToMin = Math.max(0, minSquad - currentCount - 1);
  return Number((remainingSlotsToMin * 0.30).toFixed(2));
}

// Validate whether a bid is legal
export function validateBid(
  teamState: TeamState,
  player: Player,
  bidAmountCr: number,
  rules: AuctionRules,
  currentHighestBidderTeamId?: string | null
): { valid: boolean; reason?: string } {
  // 0. Check active franchise status (handling friend left/abandoned)
  if (teamState.isActive === false || teamState.status === 'abandoned') {
    return {
      valid: false,
      reason: `${teamState.teamCode} is marked inactive/abandoned and cannot place further bids.`
    };
  }

  // 1. Check max squad size
  if (teamState.totalSquadCount >= rules.maxSquad) {
    return {
      valid: false,
      reason: `${teamState.teamCode} has already reached the maximum squad limit of ${rules.maxSquad} players.`
    };
  }

  // 2. Check overseas limit
  if (player.isOverseas && teamState.overseasCount >= rules.maxOverseas) {
    return {
      valid: false,
      reason: `${teamState.teamCode} already has the maximum ${rules.maxOverseas} overseas players.`
    };
  }

  // 3. Check base price minimum
  if (bidAmountCr < player.basePriceCr) {
    return {
      valid: false,
      reason: `Bid cannot be lower than the opening base price of ₹${player.basePriceCr.toFixed(2)} Cr.`
    };
  }

  // 4. Check remaining purse vs bid amount
  if (bidAmountCr > teamState.remainingPurse) {
    return {
      valid: false,
      reason: `Insufficient purse! ${teamState.teamCode} has ₹${teamState.remainingPurse.toFixed(2)} Cr left, but bid is ₹${bidAmountCr.toFixed(2)} Cr.`
    };
  }

  // 5. Check minimum reserve purse to fill remaining required squad slots
  const reserveNeeded = calculateReserveRequirement(teamState, rules.minSquad);
  if (teamState.remainingPurse - bidAmountCr < reserveNeeded) {
    return {
      valid: false,
      reason: `${teamState.teamCode} must keep a minimum reserve of ₹${reserveNeeded.toFixed(2)} Cr to complete the minimum required squad (${rules.minSquad} players).`
    };
  }

  return { valid: true };
}

// Validate RTM Exercise
export function validateRtm(
  teamState: TeamState,
  player: Player,
  finalPriceCr: number,
  rules: AuctionRules
): { valid: boolean; reason?: string } {
  if (teamState.isActive === false || teamState.status === 'abandoned') {
    return { valid: false, reason: `${teamState.teamCode} is inactive and cannot exercise RTM.` };
  }

  if (rules.format !== 'mega' || rules.maxRtm <= 0) {
    return { valid: false, reason: 'RTM (Right to Match) is not enabled in this auction format.' };
  }

  if (player.originalTeam?.toLowerCase() !== teamState.teamId.toLowerCase()) {
    return { valid: false, reason: `${teamState.teamCode} is not the original franchise for ${player.name}.` };
  }

  if (teamState.rtmRemaining <= 0) {
    return { valid: false, reason: `${teamState.teamCode} has used all available RTM cards.` };
  }

  return validateBid(teamState, player, finalPriceCr, rules);
}

// Calculate squad balance score and awards
export function evaluateSquadBalance(teamState: TeamState): SquadBalanceScore {
  const allPlayers = [...teamState.retainedPlayers, ...teamState.boughtPlayers];
  const total = allPlayers.length;

  if (total === 0) {
    return {
      teamId: teamState.teamId,
      overallScore: 0,
      battingScore: 0,
      bowlingScore: 0,
      allRoundScore: 0,
      keeperScore: 0,
      purseEfficiencyScore: 0,
      breakdown: 'Empty squad'
    };
  }

  const batters = allPlayers.filter(p => p.role === 'batter').length;
  const bowlers = allPlayers.filter(p => p.role === 'bowler').length;
  const allRounders = allPlayers.filter(p => p.role === 'all-rounder').length;
  const keepers = allPlayers.filter(p => p.role === 'wicketkeeper').length;

  // Batting score: Ideal 5-7
  const battingScore = Math.min(100, Math.round((batters / 6) * 100));
  // Bowling score: Ideal 6-8
  const bowlingScore = Math.min(100, Math.round((bowlers / 7) * 100));
  // All rounders: Ideal 3-5
  const allRoundScore = Math.min(100, Math.round((allRounders / 4) * 100));
  // Keepers: At least 2 keepers is ideal
  const keeperScore = keepers >= 2 ? 100 : keepers === 1 ? 75 : 10;

  // Purse efficiency: Having spent 85-98% of starting purse is optimal
  const spendRatio = teamState.spentPurse / (teamState.startingPurse || 1);
  const purseEfficiencyScore = spendRatio >= 0.85 && spendRatio <= 0.99 ? 95 : Math.round(spendRatio * 90);

  const overallScore = Math.round(
    battingScore * 0.25 +
    bowlingScore * 0.25 +
    allRoundScore * 0.2 +
    keeperScore * 0.15 +
    purseEfficiencyScore * 0.15
  );

  let breakdown = `${batters} Batters, ${bowlers} Bowlers, ${allRounders} All-Rounders, ${keepers} WKs.`;
  if (keepers === 0) breakdown += ' (Warning: No Wicketkeeper!)';

  return {
    teamId: teamState.teamId,
    overallScore,
    battingScore,
    bowlingScore,
    allRoundScore,
    keeperScore,
    purseEfficiencyScore,
    breakdown
  };
}

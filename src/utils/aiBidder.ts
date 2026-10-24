import { Player, TeamState, AuctionRules } from '../types';
import { validateBid, getNextBidAmount } from './rulesEngine';

export interface BotDecision {
  shouldBid: boolean;
  teamId: string;
  amountCr: number;
  reason?: string;
}

export function evaluateBotBid(
  currentBidCr: number,
  player: Player,
  activeBotTeams: TeamState[],
  rules: AuctionRules,
  currentHighestTeamId: string | null
): BotDecision | null {
  if (activeBotTeams.length === 0) return null;

  // Filter out the team that already holds the highest bid
  const eligibleBotTeams = activeBotTeams.filter(t => t.teamId !== currentHighestTeamId);
  if (eligibleBotTeams.length === 0) return null;

  const nextBidAmount = getNextBidAmount(currentBidCr, player.basePriceCr);

  // Shuffle teams to vary which bot bids first
  const shuffledTeams = [...eligibleBotTeams].sort(() => Math.random() - 0.5);

  for (const botTeam of shuffledTeams) {
    // 1. Strict Rules Engine Validation
    const validation = validateBid(botTeam, player, nextBidAmount, rules);
    if (!validation.valid) continue;

    // 2. Assess team role needs
    const allPlayers = [...botTeam.retainedPlayers, ...botTeam.boughtPlayers];
    const roleCount = allPlayers.filter(p => p.role === player.role).length;
    const isWk = player.role === 'wicketkeeper';
    const hasWk = allPlayers.some(p => p.role === 'wicketkeeper');

    // If team has no wicketkeeper, WK is urgent
    let needMultiplier = 1.0;
    if (isWk && !hasWk) {
      needMultiplier = 1.5;
    } else if (player.role === 'bowler' && roleCount < 5) {
      needMultiplier = 1.25;
    } else if (player.role === 'batter' && roleCount < 4) {
      needMultiplier = 1.2;
    } else if (player.role === 'all-rounder' && roleCount < 3) {
      needMultiplier = 1.3;
    }

    // 3. Determine Valuation Ceiling based on AI difficulty & category
    let maxValuation = player.basePriceCr;

    if (rules.aiDifficulty === 'easy') {
      maxValuation = Math.min(
        player.basePriceCr * 1.5 * needMultiplier,
        botTeam.remainingPurse * 0.25
      );
    } else if (rules.aiDifficulty === 'normal') {
      const baseMult = player.category === 'Marquee' ? 4.5 : player.category === 'Batters' || player.category === 'Fast Bowlers' ? 3.0 : 2.0;
      maxValuation = Math.min(
        player.basePriceCr * baseMult * needMultiplier,
        botTeam.remainingPurse * 0.45
      );
    } else {
      // Competitive difficulty
      const baseMult = player.category === 'Marquee' ? 7.0 : player.category === 'Fast Bowlers' || player.category === 'All-Rounders' ? 4.5 : 3.5;
      maxValuation = Math.min(
        player.basePriceCr * baseMult * needMultiplier,
        botTeam.remainingPurse * 0.65
      );
    }

    // 4. Decision check
    if (nextBidAmount <= maxValuation) {
      // Probability threshold to make bot bidding natural and not hyper-instant
      const prob = rules.aiDifficulty === 'easy' ? 0.6 : rules.aiDifficulty === 'normal' ? 0.8 : 0.95;
      if (Math.random() <= prob) {
        return {
          shouldBid: true,
          teamId: botTeam.teamId,
          amountCr: nextBidAmount,
          reason: `${botTeam.teamCode} bids ₹${nextBidAmount.toFixed(2)} Cr to bolster ${player.role} depth.`
        };
      }
    }
  }

  return null;
}

// Bot RTM Decision: Should the original franchise bot match the final bid?
export function evaluateBotRtm(
  botTeam: TeamState,
  player: Player,
  finalPriceCr: number,
  rules: AuctionRules
): boolean {
  if (rules.format !== 'mega' || botTeam.rtmRemaining <= 0) return false;
  if (player.originalTeam?.toLowerCase() !== botTeam.teamId.toLowerCase()) return false;

  const validation = validateBid(botTeam, player, finalPriceCr, rules);
  if (!validation.valid) return false;

  // Marquee players or key anchors are high RTM targets
  if (player.category === 'Marquee' || player.role === 'wicketkeeper') {
    return finalPriceCr <= botTeam.remainingPurse * 0.55;
  }

  // Normal player RTM valuation threshold
  return finalPriceCr <= player.basePriceCr * 3.5 && finalPriceCr <= botTeam.remainingPurse * 0.35;
}

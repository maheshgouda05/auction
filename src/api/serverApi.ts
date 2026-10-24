import { Player } from '../types';

export async function fetchLiveCommentary(
  event: 'bid' | 'sold' | 'unsold' | 'rtm',
  playerName: string,
  teamCode: string,
  teamName: string,
  amountCr: number,
  role?: string,
  isOverseas?: boolean
): Promise<string> {
  try {
    const res = await fetch('/api/commentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        playerName,
        teamCode,
        teamName,
        amountCr,
        role,
        isOverseas
      })
    });
    if (!res.ok) throw new Error('Failed to fetch commentary');
    const data = await res.json();
    return data.commentary || 'What sensational bidding here in the arena!';
  } catch {
    if (event === 'sold') {
      return `HAMMER DOWN! ${playerName} sold to ${teamCode} for ₹${amountCr.toFixed(2)} Cr!`;
    }
    if (event === 'rtm') {
      return `RTM EXERCISED! ${teamCode} matches the bid for ${playerName}!`;
    }
    if (event === 'unsold') {
      return `${playerName} remains unsold in this round.`;
    }
    return `Bid placed by ${teamCode} for ₹${amountCr.toFixed(2)} Cr!`;
  }
}

export async function fetchPlayerScoutingInsight(player: Player, teamCode?: string): Promise<string> {
  try {
    const res = await fetch('/api/player-scout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player, teamCode })
    });
    if (!res.ok) throw new Error('Failed to fetch scout');
    const data = await res.json();
    return data.insight || `${player.name} provides valuable ${player.role} prowess.`;
  } catch {
    return `${player.name} is a proven performer with extensive match experience.`;
  }
}

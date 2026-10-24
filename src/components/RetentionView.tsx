import React, { useState } from 'react';
import { Shield, Check, Lock, AlertCircle, Play, Info } from 'lucide-react';
import { Room, TeamState, Player, AcquiredPlayer } from '../types';
import { PRE_RETAINABLE_CANDIDATES } from '../data/players';
import { getTeamById } from '../data/teams';
import { calculateRetentionDeduction } from '../utils/rulesEngine';
import { TeamLogo } from './TeamLogo';

interface RetentionViewProps {
  room: Room;
  teamStates: TeamState[];
  currentUserId: string;
  isHost: boolean;
  onLockRetentions: (retainedPlayers: AcquiredPlayer[]) => Promise<void>;
  onStartLiveAuction: () => Promise<void>;
}

export const RetentionView: React.FC<RetentionViewProps> = ({
  room,
  teamStates,
  currentUserId,
  isHost,
  onLockRetentions,
  onStartLiveAuction,
}) => {
  const myTeam = teamStates.find(t => t.ownerId === currentUserId) || teamStates[0];
  const myTeamInfo = getTeamById(myTeam?.teamId);

  // Eligible pre-retainable stars for my franchise
  const candidates: Player[] = myTeam ? (PRE_RETAINABLE_CANDIDATES[myTeam.teamId] || []) : [];

  const [selectedIds, setSelectedIds] = useState<string[]>(
    myTeam?.retainedPlayers?.map(p => p.playerId) || []
  );
  const [submitting, setSubmitting] = useState(false);
  const [startingAuction, setStartingAuction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxRetentions = room.rules.maxRetentions || 6;

  // Toggle selection
  const toggleSelect = (player: Player) => {
    if (myTeam.isRetentionLocked) return;

    if (selectedIds.includes(player.id)) {
      setSelectedIds(selectedIds.filter(id => id !== player.id));
      setError(null);
    } else {
      if (selectedIds.length >= maxRetentions) {
        setError(`You can retain at most ${maxRetentions} players.`);
        return;
      }
      setSelectedIds([...selectedIds, player.id]);
      setError(null);
    }
  };

  // Calculate live purse impact
  const selectedPlayers = candidates.filter(c => selectedIds.includes(c.id));
  const uncappedCount = selectedPlayers.filter(p => p.category === 'Uncapped').length;
  const estimatedDeduction = calculateRetentionDeduction(selectedPlayers.length, uncappedCount);
  const projectedRemainingPurse = Number((room.rules.startingPurseCr - estimatedDeduction).toFixed(2));
  const projectedRtm = Math.max(0, maxRetentions - selectedPlayers.length);

  const handleLockIn = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const acquiredList: AcquiredPlayer[] = selectedPlayers.map((p, idx) => {
        // Official deduction or base price
        const slotPrice = idx === 0 ? 18.0 : idx === 1 ? 14.0 : idx === 2 ? 11.0 : idx === 3 ? 18.0 : idx === 4 ? 14.0 : 4.0;
        return {
          playerId: p.id,
          name: p.name,
          role: p.role,
          priceCr: slotPrice,
          isOverseas: p.isOverseas,
          image: p.image,
          isRetained: true
        };
      });

      await onLockRetentions(acquiredList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to lock retentions.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartLiveAuction = async () => {
    try {
      setStartingAuction(true);
      setError(null);
      await onStartLiveAuction();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to launch live auction.');
    } finally {
      setStartingAuction(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {myTeam && <TeamLogo teamId={myTeam.teamId} size="lg" className="shrink-0 mt-1" />}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Phase 1: Pre-Auction Retention
                </span>
                <span className="text-xs text-slate-400">
                  Max {maxRetentions} Retentions Allowed
                </span>
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
                {myTeamInfo ? `${myTeamInfo.name} Retention Desk` : 'Player Retention'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Select key players to retain before entering the auction arena. Retention deductions apply directly to your starting purse of ₹{room.rules.startingPurseCr} Cr. Unused retention slots become Right To Match (RTM) cards during the live auction!
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div className="text-center px-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Retained</span>
              <span className="font-display font-bold text-lg text-amber-400">
                {selectedIds.length}/{maxRetentions}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center px-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">RTM Cards</span>
              <span className="font-display font-bold text-lg text-sky-400">
                {projectedRtm}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center px-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Purse Left</span>
              <span className="font-display font-bold text-lg text-emerald-400">
                ₹{projectedRemainingPurse.toFixed(2)} Cr
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Eligible Candidates Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-lg text-white">
            Eligible Franchise Star Candidates
          </h3>
          <span className="text-xs text-slate-400">
            Click cards to select / deselect
          </span>
        </div>

        {candidates.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-sm">
            No pre-seeded candidates found for this franchise. You may proceed directly with the full starting purse of ₹{room.rules.startingPurseCr} Cr into the auction arena!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {candidates.map(candidate => {
              const isSelected = selectedIds.includes(candidate.id);

              return (
                <div
                  key={candidate.id}
                  onClick={() => toggleSelect(candidate)}
                  className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-400 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/40'
                      : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={candidate.image}
                      alt={candidate.name}
                      className="w-14 h-14 rounded-xl object-cover bg-slate-800 border border-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                          {candidate.role}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-white mt-1 truncate">
                        {candidate.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {candidate.nationality} • {candidate.isOverseas ? 'Overseas' : 'Indian'}
                      </p>
                    </div>
                  </div>

                  {/* Stats snippet */}
                  {candidate.seasonStats && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Matches: <strong className="text-white">{candidate.seasonStats.matches}</strong></span>
                      {candidate.seasonStats.runs ? (
                        <span>Runs: <strong className="text-white">{candidate.seasonStats.runs}</strong> (SR {candidate.seasonStats.strikeRate})</span>
                      ) : (
                        <span>Wickets: <strong className="text-white">{candidate.seasonStats.wickets}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            {myTeam.isRetentionLocked
              ? 'Your retention roster is locked in!'
              : 'Click "Lock In My Retentions" when finished.'}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!myTeam.isRetentionLocked ? (
            <button
              onClick={handleLockIn}
              disabled={submitting}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? 'Locking...' : 'Lock In My Retentions'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              <Check className="w-4 h-4" />
              <span>Retention Submitted</span>
            </div>
          )}

          {isHost && (
            <button
              onClick={handleStartLiveAuction}
              disabled={startingAuction}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>{startingAuction ? 'Entering Arena...' : 'Launch Live Auction Arena'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RetentionView: Official Previous-Season Squad Retentions
 * - Shows ONLY eligible previous-season squad players for the selected franchise
 * - Retention prices are strictly FIXED and READ-ONLY
 * - Non-retained players enter the auction at their official auction base price
 * - Mobile-first responsive layout (fits 320px, 375px, 390px, 430px, tablet, desktop)
 */

import React, { useState, useMemo } from 'react';
import {
  Shield, Check, Lock, Unlock, AlertCircle, Play, Info,
  Search, Users, Star, Sparkles, CheckCircle2, ChevronRight, UserMinus, Plus
} from 'lucide-react';
import { Room, TeamState, AcquiredPlayer } from '../types';
import { getPreviousSeasonSquadForTeam, PreviousSeasonPlayer } from '../data/retentionRosters';
import { getTeamById } from '../data/teams';
import { TeamLogo } from './TeamLogo';
import { PlayerAvatar } from './PlayerAvatar';
import { formatPrice, formatPurse, exactAddCr, exactSubtractCr } from '../utils/currency';

interface RetentionViewProps {
  room: Room;
  teamStates: TeamState[];
  currentUserId: string;
  isHost: boolean;
  onLockRetentions: (retainedPlayers: AcquiredPlayer[]) => Promise<void>;
  onUnlockRetentions?: () => Promise<void>;
  onStartLiveAuction: () => Promise<void>;
}

export const RetentionView: React.FC<RetentionViewProps> = ({
  room,
  teamStates,
  currentUserId,
  isHost,
  onLockRetentions,
  onUnlockRetentions,
  onStartLiveAuction,
}) => {
  const myTeam = teamStates.find(t => t.ownerId === currentUserId) || teamStates[0];
  const myTeamInfo = getTeamById(myTeam?.teamId);

  // Strictly get ONLY this franchise's eligible previous-season squad members
  const franchiseSquad = useMemo(() => {
    return getPreviousSeasonSquadForTeam(myTeam?.teamId || 'csk');
  }, [myTeam?.teamId]);

  const maxRetentions = room.rules.maxRetentions || 6;
  const startingPurse = room.rules.startingPurseCr || 120.0;

  // Selected player IDs for retention (initialized from teamState or empty)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (myTeam?.retainedPlayers && myTeam.retainedPlayers.length > 0) {
      return myTeam.retainedPlayers.map(p => p.playerId);
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [startingAuction, setStartingAuction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected player objects
  const selectedPlayers = useMemo(() => {
    return franchiseSquad.filter(p => selectedIds.includes(p.id));
  }, [franchiseSquad, selectedIds]);

  // Exact financial calculation using integer Lakhs
  const totalRetentionCostCr = useMemo(() => {
    return selectedPlayers.reduce((sum, p) => exactAddCr(sum, p.fixedRetentionPriceCr), 0);
  }, [selectedPlayers]);

  const remainingPurseCr = useMemo(() => {
    return exactSubtractCr(startingPurse, totalRetentionCostCr);
  }, [startingPurse, totalRetentionCostCr]);

  const rtmCardsCount = Math.max(0, maxRetentions - selectedPlayers.length);

  // Toggle selection for a player
  const handleTogglePlayer = (player: PreviousSeasonPlayer) => {
    if (myTeam?.isRetentionLocked) return;

    if (selectedIds.includes(player.id)) {
      // Remove
      setSelectedIds(prev => prev.filter(id => id !== player.id));
      setError(null);
    } else {
      // Check max limit
      if (selectedIds.length >= maxRetentions) {
        setError(`Maximum retention limit reached (${maxRetentions} players allowed).`);
        return;
      }

      // Check purse limit
      const nextTotal = exactAddCr(totalRetentionCostCr, player.fixedRetentionPriceCr);
      if (nextTotal > startingPurse) {
        setError(`Cannot retain ${player.name}: total retention cost (₹${nextTotal.toFixed(2)} Cr) exceeds starting purse (₹${startingPurse} Cr).`);
        return;
      }

      setSelectedIds(prev => [...prev, player.id]);
      setError(null);
    }
  };

  // Submit and lock retentions
  const handleConfirmLock = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Map to AcquiredPlayer with fixed official prices
      const acquiredList: AcquiredPlayer[] = selectedPlayers.map(p => ({
        playerId: p.id,
        name: p.name,
        role: p.role,
        priceCr: p.fixedRetentionPriceCr, // Strict fixed read-only retention price
        isOverseas: p.isOverseas,
        image: p.image || '',
        isRetained: true,
        nationality: p.nationality
      }));

      await onLockRetentions(acquiredList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to lock retentions.');
    } finally {
      setSubmitting(false);
    }
  };

  // Unlock retentions
  const handleUnlock = async () => {
    if (!onUnlockRetentions) return;
    try {
      setUnlocking(true);
      setError(null);
      await onUnlockRetentions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unlock retentions.');
    } finally {
      setUnlocking(false);
    }
  };

  // Launch live auction
  const handleStartAuction = async () => {
    try {
      setStartingAuction(true);
      setError(null);
      await onStartLiveAuction();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start live auction.');
    } finally {
      setStartingAuction(false);
    }
  };

  // Filter squad for display
  const filteredSquad = useMemo(() => {
    return franchiseSquad.filter(p => {
      const matchesSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nationality.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [franchiseSquad, searchQuery, roleFilter]);

  const allTeamsLocked = teamStates.every(t => t.isRetentionLocked || !t.ownerId);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Banner: Franchise Title & Pre-Auction Context */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <TeamLogo teamId={myTeam?.teamId || 'csk'} size="lg" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Previous Season (2025) Squad
                </span>
                <span className="text-xs text-slate-400">
                  Rules: <strong className="text-white">Max {maxRetentions} Retentions</strong>
                </span>
                {myTeam?.isRetentionLocked ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    <Unlock className="w-3 h-3" /> Selecting
                  </span>
                )}
              </div>
              <h2 className="font-display font-black text-xl sm:text-3xl text-white tracking-wide mt-1">
                {myTeamInfo?.name || myTeam?.teamName} Retentions
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Select star players from your 2025 squad to retain. Retention prices are <strong className="text-amber-300 font-semibold">fixed & read-only</strong>. Non-retained players enter the auction pool at their official base price.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {myTeam?.isRetentionLocked ? (
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
              >
                <Unlock className="w-4 h-4 text-amber-400" />
                <span>{unlocking ? 'Unlocking...' : 'Edit Retentions'}</span>
              </button>
            ) : (
              <button
                onClick={handleConfirmLock}
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Locking...' : `Confirm & Lock (${selectedIds.length}/${maxRetentions})`}</span>
              </button>
            )}

            {isHost && (
              <button
                onClick={handleStartAuction}
                disabled={startingAuction}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{startingAuction ? 'Launching...' : 'Start Live Auction'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Financial Metrics Banner */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-center">
          <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase block font-semibold">Starting Purse</span>
            <span className="font-display font-bold text-sm sm:text-lg text-white font-mono">
              {formatPurse(startingPurse)}
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase block font-semibold">Retention Cost</span>
            <span className="font-display font-bold text-sm sm:text-lg text-rose-400 font-mono">
              -{formatPurse(totalRetentionCostCr)}
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase block font-semibold">Auction Purse Remaining</span>
            <span className="font-display font-bold text-sm sm:text-lg text-emerald-400 font-mono">
              {formatPurse(remainingPurseCr)}
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase block font-semibold">RTM Cards Left</span>
            <span className="font-display font-bold text-sm sm:text-lg text-amber-300 font-mono">
              {rtmCardsCount} Cards
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs sm:text-sm flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: 2025 Squad Retention Selector (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Search & Role Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or nationality..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'batter', 'bowler', 'all-rounder', 'wicketkeeper'].map(role => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors capitalize ${
                    roleFilter === role
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Squad Player List Cards */}
          <div className="space-y-2.5">
            {filteredSquad.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <Users className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No players match the search or filter.</p>
              </div>
            ) : (
              filteredSquad.map(player => {
                const isSelected = selectedIds.includes(player.id);
                const isLocked = myTeam?.isRetentionLocked;

                return (
                  <div
                    key={player.id}
                    onClick={() => !isLocked && handleTogglePlayer(player)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all select-none cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-500/70 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                        : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                    } ${isLocked ? 'cursor-default opacity-85' : 'active:scale-[0.99]'}`}
                  >
                    {/* Player Info */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <PlayerAvatar
                          player={{
                            id: player.id,
                            name: player.name,
                            role: player.role,
                            nationality: player.nationality,
                            isOverseas: player.isOverseas,
                            battingStyle: player.battingStyle,
                            basePriceCr: player.auctionBasePriceCr,
                            category: player.category,
                            image: player.image,
                            verifiedCutoff: '2026-01-15'
                          }}
                          size="md"
                        />
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md">
                            ✓
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-white">
                            {player.name}
                          </h4>
                          {player.isUncapped ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Uncapped
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 capitalize">
                              {player.category}
                            </span>
                          )}
                          {player.isOverseas && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Overseas ({player.nationality})
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 capitalize mt-0.5">
                          {player.role} • {player.battingStyle} {player.bowlingStyle ? `• ${player.bowlingStyle}` : ''}
                        </p>

                        {/* Season Stats Preview */}
                        {player.seasonStats && (
                          <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mt-1">
                            {player.seasonStats.runs ? <span>{player.seasonStats.runs} Runs (SR {player.seasonStats.strikeRate})</span> : null}
                            {player.seasonStats.wickets ? <span>{player.seasonStats.wickets} Wickets (Econ {player.seasonStats.economy})</span> : null}
                            {player.seasonStats.highScore ? <span>HS: {player.seasonStats.highScore}</span> : null}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price and Action Box (Read-Only Fixed Retention Price) */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] uppercase font-semibold text-slate-400">Fixed Retention Price</div>
                        <div className="font-display font-black text-sm sm:text-base text-emerald-400 font-mono">
                          {formatPrice(player.fixedRetentionPriceCr)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Auction Base: {formatPrice(player.auctionBasePriceCr)}
                        </div>
                      </div>

                      {/* Retain / Release Button */}
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePlayer(player);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Release</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Retain</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Confirmed Retention Summary & Other Teams (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Confirmed Roster Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Your Retained Roster</span>
              <span className="font-mono text-xs text-amber-400">{selectedPlayers.length} / {maxRetentions}</span>
            </h3>

            {selectedPlayers.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No players selected yet. Tap "Retain" on players from the list to retain them.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedPlayers.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">{p.name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{p.role}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-emerald-400 block">
                        {formatPrice(p.fixedRetentionPriceCr)}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase">Fixed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All 10 Franchises Retention Status */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>All 10 Franchises</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">
                {teamStates.filter(t => t.isRetentionLocked).length} / 10 Locked
              </span>
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs">
              {teamStates.map(t => {
                const isMine = t.teamId === myTeam?.teamId;
                const isLocked = t.isRetentionLocked;
                const retainedCount = t.retainedPlayers?.length || 0;

                return (
                  <div
                    key={t.teamId}
                    className={`flex items-center justify-between p-2 rounded-xl border ${
                      isMine
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <TeamLogo teamId={t.teamId} size="xs" />
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">
                          {t.teamName} {isMine && '(You)'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {retainedCount} retained • Rem ₹{t.remainingPurse.toFixed(1)} Cr
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isLocked ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                          Selecting
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

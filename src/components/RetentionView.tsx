import React, { useState, useMemo } from 'react';
import {
  Shield, Check, Lock, Unlock, AlertCircle, Play, Info,
  Search, Trash2, ArrowUpDown, Star, Sparkles, Plus, Edit3
} from 'lucide-react';
import { Room, TeamState, Player, AcquiredPlayer } from '../types';
import { PRE_RETAINABLE_CANDIDATES } from '../data/players';
import { getTeamById } from '../data/teams';
import { getPlayerTier, PlayerTierInfo } from '../utils/rulesEngine';
import { TeamLogo } from './TeamLogo';
import { PlayerAvatar } from './PlayerAvatar';

interface RetentionViewProps {
  room: Room;
  teamStates: TeamState[];
  allPlayers?: Player[];
  currentUserId: string;
  isHost: boolean;
  onLockRetentions: (retainedPlayers: AcquiredPlayer[]) => Promise<void>;
  onUnlockRetentions?: () => Promise<void>;
  onStartLiveAuction: () => Promise<void>;
}

interface EditableRetentionItem {
  player: Player;
  priceCr: number;
  tierInfo: PlayerTierInfo;
}

export const RetentionView: React.FC<RetentionViewProps> = ({
  room,
  teamStates,
  allPlayers = [],
  currentUserId,
  isHost,
  onLockRetentions,
  onUnlockRetentions,
  onStartLiveAuction,
}) => {
  const myTeam = teamStates.find(t => t.ownerId === currentUserId) || teamStates[0];
  const myTeamInfo = getTeamById(myTeam?.teamId);

  // Pre-seeded candidates for my franchise
  const franchiseCandidates: Player[] = myTeam ? (PRE_RETAINABLE_CANDIDATES[myTeam.teamId] || []) : [];

  const maxRetentions = room.rules.maxRetentions || 6;
  const startingPurse = room.rules.startingPurseCr || 120.0;

  // Initialize editable retention list from myTeam.retainedPlayers or empty
  const [retainedList, setRetainedList] = useState<EditableRetentionItem[]>(() => {
    if (myTeam?.retainedPlayers && myTeam.retainedPlayers.length > 0) {
      return myTeam.retainedPlayers.map(rp => {
        // Find full player object if available
        const found = allPlayers.find(p => p.id === rp.playerId) ||
                      franchiseCandidates.find(p => p.id === rp.playerId) || {
                        id: rp.playerId,
                        name: rp.name,
                        role: rp.role,
                        nationality: 'India',
                        isOverseas: rp.isOverseas,
                        battingStyle: '',
                        basePriceCr: rp.priceCr,
                        category: 'Marquee',
                        image: rp.image || '',
                        verifiedCutoff: '2026-01-15'
                      } as Player;
        return {
          player: found,
          priceCr: rp.priceCr,
          tierInfo: getPlayerTier(found)
        };
      });
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCatalogTab, setActiveCatalogTab] = useState<'franchise' | 'all'>('franchise');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [startingAuction, setStartingAuction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute live financial metrics
  const totalCostCr = useMemo(() => {
    return Number(retainedList.reduce((sum, item) => sum + (Number(item.priceCr) || 0), 0).toFixed(2));
  }, [retainedList]);

  const remainingPurseCr = useMemo(() => {
    return Number((startingPurse - totalCostCr).toFixed(2));
  }, [startingPurse, totalCostCr]);

  const rtmCardsCount = Math.max(0, maxRetentions - retainedList.length);

  // Manual Edit: Update price for a specific player
  const handlePriceChange = (playerId: string, newPriceStr: string) => {
    if (myTeam?.isRetentionLocked) return;
    const newPrice = parseFloat(newPriceStr);
    setRetainedList(prev => prev.map(item => {
      if (item.player.id === playerId) {
        return {
          ...item,
          priceCr: isNaN(newPrice) ? 0 : Number(newPrice.toFixed(2))
        };
      }
      return item;
    }));
  };

  // Add a player to retention
  const handleAddPlayer = (player: Player) => {
    if (myTeam?.isRetentionLocked) return;
    if (retainedList.some(item => item.player.id === player.id)) {
      setError(`${player.name} is already in your retention roster.`);
      return;
    }
    if (retainedList.length >= maxRetentions) {
      setError(`You have reached the maximum of ${maxRetentions} retentions.`);
      return;
    }

    const tierInfo = getPlayerTier(player);
    // Assign high price based on tier rating by default (high rated = higher price)
    // Slabs: 18, 14, 11, 18, 14, 4 (or tierInfo.recommendedPriceCr)
    const initialPrice = tierInfo.recommendedPriceCr;

    if (totalCostCr + initialPrice > startingPurse) {
      setError(`Cannot retain ${player.name}: exceeds total purse limit of ₹${startingPurse} Cr.`);
      return;
    }

    setRetainedList(prev => [...prev, { player, priceCr: initialPrice, tierInfo }]);
    setError(null);
  };

  // Remove player from retention
  const handleRemovePlayer = (playerId: string) => {
    if (myTeam?.isRetentionLocked) return;
    setRetainedList(prev => prev.filter(item => item.player.id !== playerId));
    setError(null);
  };

  // Auto-Rank & Value by Player Rating: High rated stars get top slabs (₹18 Cr, ₹14 Cr, ₹11 Cr, etc.)
  const handleAutoValueByRating = () => {
    if (myTeam?.isRetentionLocked) return;
    // Sort retained players by rating score descending (highest rated first)
    const sorted = [...retainedList].sort((a, b) => b.tierInfo.ratingScore - a.tierInfo.ratingScore);

    const updated = sorted.map((item, idx) => {
      let price = item.tierInfo.recommendedPriceCr;
      if (item.tierInfo.tier === 'uncapped') {
        price = 4.0;
      } else {
        // High rated player priority slabs: 1st=18, 2nd=14, 3rd=11, 4th=18, 5th=14
        const cappedSlabs = [18.0, 14.0, 11.0, 18.0, 14.0];
        price = cappedSlabs[idx] || 11.0;
      }
      return {
        ...item,
        priceCr: price
      };
    });

    setRetainedList(updated);
    setError(null);
  };

  // Filter candidate pool
  const candidatePool = useMemo(() => {
    const source = activeCatalogTab === 'franchise' ? franchiseCandidates : allPlayers;
    return source.filter(p => {
      // Exclude players already retained
      if (retainedList.some(item => item.player.id === p.id)) return false;

      const matchesSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nationality.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || p.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [activeCatalogTab, franchiseCandidates, allPlayers, retainedList, searchQuery, roleFilter]);

  // Lock Retentions
  const handleLockIn = async () => {
    if (remainingPurseCr < 0) {
      setError(`Your retentions exceed the starting purse by ₹${Math.abs(remainingPurseCr).toFixed(2)} Cr. Please adjust prices or remove players.`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const acquiredList: AcquiredPlayer[] = retainedList.map(item => ({
        playerId: item.player.id,
        name: item.player.name,
        role: item.player.role,
        priceCr: Number(item.priceCr.toFixed(2)),
        isOverseas: item.player.isOverseas,
        image: item.player.image || '',
        isRetained: true
      }));

      await onLockRetentions(acquiredList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to lock retentions.');
    } finally {
      setSubmitting(false);
    }
  };

  // Unlock Retentions
  const handleUnlock = async () => {
    try {
      setUnlocking(true);
      setError(null);
      if (onUnlockRetentions) {
        await onUnlockRetentions();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unlock retentions.');
    } finally {
      setUnlocking(false);
    }
  };

  // Host Launch Live Auction
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
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {myTeam && <TeamLogo teamId={myTeam.teamId} size="lg" className="shrink-0 mt-1" />}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Phase 1: Pre-Auction Retention & Valuation
                </span>
                <span className="text-xs text-slate-400">
                  Max {maxRetentions} Retentions Allowed
                </span>
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
                {myTeamInfo ? `${myTeamInfo.name} Retention Desk` : 'Player Retention'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Manually select, price, and customize your retained franchise stars. High-rated superstars receive top retention values (up to ₹18 Cr), or you can manually adjust any player's retention price directly.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-center px-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Retained</span>
              <span className="font-display font-bold text-lg text-amber-400">
                {retainedList.length}/{maxRetentions}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center px-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Retention Cost</span>
              <span className="font-display font-bold text-lg text-rose-400">
                ₹{totalCostCr.toFixed(2)} Cr
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center px-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Purse Left</span>
              <span className={`font-display font-bold text-lg ${remainingPurseCr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{remainingPurseCr.toFixed(2)} Cr
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div className="text-center px-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">RTM Cards</span>
              <span className="font-display font-bold text-lg text-sky-400">
                {rtmCardsCount}
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

      {/* Main Retention Work Area (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Retained Stars List & Manual Pricing Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span>My Retained Roster ({retainedList.length}/{maxRetentions})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Edit player prices manually or auto-value high-rated stars.
                </p>
              </div>

              {!myTeam?.isRetentionLocked && retainedList.length > 0 && (
                <button
                  onClick={handleAutoValueByRating}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                  title="Automatically sort by rating and assign top slabs to marquee stars"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  <span>Auto-Value by Rating</span>
                </button>
              )}
            </div>

            {retainedList.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 space-y-2">
                <Edit3 className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">No Players Retained Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select players from the catalog on the right to retain them. High-rated marquee superstars will receive top valuations, and you can edit any price manually.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {retainedList.map((item, index) => {
                  const { player, priceCr, tierInfo } = item;

                  return (
                    <div
                      key={player.id}
                      className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      {/* Player info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>
                        <PlayerAvatar player={player} size="sm" showBadge={false} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white truncate">{player.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${tierInfo.badgeClass}`}>
                              {tierInfo.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 capitalize">
                            {player.role} • {player.nationality} {player.isOverseas ? '(Overseas)' : '(Indian)'} • Rating: <strong className="text-amber-400">{tierInfo.ratingScore}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Manual Price Controls */}
                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] text-slate-400 font-mono">₹</label>
                          <input
                            type="number"
                            step="0.25"
                            min="0.30"
                            max="30"
                            value={priceCr}
                            onChange={(e) => handlePriceChange(player.id, e.target.value)}
                            disabled={myTeam?.isRetentionLocked}
                            className="w-20 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2 py-1 text-xs font-bold text-amber-400 text-right focus:outline-none disabled:opacity-50"
                          />
                          <span className="text-xs text-slate-300 font-bold">Cr</span>
                        </div>

                        {/* Quick price presets for convenience */}
                        {!myTeam?.isRetentionLocked && (
                          <div className="hidden sm:flex items-center gap-1">
                            <button
                              onClick={() => handlePriceChange(player.id, '18')}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Set ₹18 Cr (Top Star)"
                            >
                              18
                            </button>
                            <button
                              onClick={() => handlePriceChange(player.id, '14')}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Set ₹14 Cr"
                            >
                              14
                            </button>
                            <button
                              onClick={() => handlePriceChange(player.id, '11')}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Set ₹11 Cr"
                            >
                              11
                            </button>
                            <button
                              onClick={() => handlePriceChange(player.id, '4')}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Set ₹4 Cr (Uncapped)"
                            >
                              4
                            </button>
                          </div>
                        )}

                        {/* Remove button */}
                        {!myTeam?.isRetentionLocked && (
                          <button
                            onClick={() => handleRemovePlayer(player.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove player from retention"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Player Catalog & Selection (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display font-bold text-base text-white">
                Add Star to Retention
              </h3>
              <span className="text-xs text-slate-400">
                {candidatePool.length} available
              </span>
            </div>

            {/* Source Tab Toggle: Franchise Stars vs All Catalog */}
            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveCatalogTab('franchise')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  activeCatalogTab === 'franchise'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Franchise Stars ({franchiseCandidates.length})
              </button>
              <button
                onClick={() => setActiveCatalogTab('all')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  activeCatalogTab === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All 350 Players
              </button>
            </div>

            {/* Search & Role Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search player by name or country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {(['all', 'batter', 'bowler', 'all-rounder', 'wicketkeeper'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                      roleFilter === role
                        ? 'bg-slate-700 text-white border border-slate-600'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {role === 'all' ? 'All Roles' : role}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidates Scroll List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {candidatePool.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No matching players found in this category.
                </div>
              ) : (
                candidatePool.map(candidate => {
                  const tier = getPlayerTier(candidate);

                  return (
                    <div
                      key={candidate.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 group transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PlayerAvatar player={candidate} size="xs" showBadge={false} />
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-white truncate group-hover:text-amber-400 transition-colors">
                            {candidate.name}
                          </h5>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="capitalize">{candidate.role}</span>
                            <span>•</span>
                            <span className={`px-1 py-0.2 rounded border font-semibold ${tier.badgeClass}`}>
                              {tier.recommendedPriceCr} Cr
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddPlayer(candidate)}
                        disabled={myTeam?.isRetentionLocked || retainedList.length >= maxRetentions}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Retain</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            {myTeam?.isRetentionLocked
              ? 'Your retention roster is currently locked. You can unlock and re-edit anytime before the live auction launches.'
              : `Total Retention: ₹${totalCostCr.toFixed(2)} Cr (${retainedList.length}/${maxRetentions} players). Starting purse left for live auction: ₹${remainingPurseCr.toFixed(2)} Cr.`}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!myTeam?.isRetentionLocked ? (
            <button
              onClick={handleLockIn}
              disabled={submitting || remainingPurseCr < 0}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? 'Locking...' : 'Lock In My Retentions'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                <Check className="w-4 h-4" />
                <span>Retention Locked</span>
              </div>

              {onUnlockRetentions && (
                <button
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{unlocking ? 'Unlocking...' : 'Unlock & Edit'}</span>
                </button>
              )}
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

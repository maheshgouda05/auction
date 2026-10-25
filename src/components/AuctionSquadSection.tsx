/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AuctionSquadSection: Displays franchise squad directly below the live auction chart.
 * - Shows Purchased Players and Retained Players in clearly separated sections
 * - Updates in real time when any player is sold to any franchise
 * - Displays player photo, name, role, winning price, nationality, and team logo
 * - Responsive layout optimized for phones (320px+) and desktops
 */

import React, { useState, useEffect } from 'react';
import { Users, Shield, Gavel, DollarSign, Globe, Award, ShoppingBag } from 'lucide-react';
import { TeamState, AcquiredPlayer } from '../types';
import { getTeamById } from '../data/teams';
import { TeamLogo } from './TeamLogo';
import { PlayerAvatar } from './PlayerAvatar';
import { formatPrice, formatPurse } from '../utils/currency';

interface AuctionSquadSectionProps {
  teamStates: TeamState[];
  currentUserId: string;
  latestWinningTeamId?: string | null;
}

export const AuctionSquadSection: React.FC<AuctionSquadSectionProps> = ({
  teamStates,
  currentUserId,
  latestWinningTeamId,
}) => {
  const myTeam = teamStates.find(t => t.ownerId === currentUserId);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    latestWinningTeamId || myTeam?.teamId || teamStates[0]?.teamId || 'csk'
  );

  // When a player is hammered sold, automatically highlight the winning team
  useEffect(() => {
    if (latestWinningTeamId) {
      setSelectedTeamId(latestWinningTeamId);
    }
  }, [latestWinningTeamId]);

  const activeTeam = teamStates.find(t => t.teamId === selectedTeamId) || teamStates[0];
  const activeTeamInfo = getTeamById(activeTeam?.teamId);

  const boughtPlayers = activeTeam?.boughtPlayers || [];
  const retainedPlayers = activeTeam?.retainedPlayers || [];

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-6">
      {/* Section Title & Franchise Switcher */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h3 className="font-display font-black text-lg sm:text-xl text-white uppercase tracking-wider">
              Franchise Squad Rosters & Purchases
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Select franchise below to view purchased & retained players
          </span>
        </div>

        {/* 10 Franchises Tab Bar (Horizontal Scroll on Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {teamStates.map(team => {
            const isSelected = team.teamId === selectedTeamId;
            const isWinner = team.teamId === latestWinningTeamId;

            return (
              <button
                key={team.teamId}
                onClick={() => setSelectedTeamId(team.teamId)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                    : isWinner
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                }`}
              >
                <TeamLogo teamId={team.teamId} size="xs" />
                <span>{team.teamCode}</span>
                <span className={`text-[10px] font-mono px-1 rounded ${
                  isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
                }`}>
                  {team.totalSquadCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Franchise Summary Card */}
      {activeTeam && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TeamLogo teamId={activeTeam.teamId} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display font-black text-base sm:text-lg text-white">
                  {activeTeam.teamName}
                </h4>
                {activeTeam.isBot ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    AI Bot
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {activeTeam.ownerName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTeamInfo?.city} • {activeTeamInfo?.championships}x Champions
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center sm:text-right">
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Remaining Purse</span>
              <span className="font-display font-bold text-xs sm:text-sm text-emerald-400 font-mono">
                {formatPurse(activeTeam.remainingPurse)}
              </span>
            </div>
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Squad</span>
              <span className="font-display font-bold text-xs sm:text-sm text-white font-mono">
                {activeTeam.totalSquadCount} / 25
              </span>
            </div>
            <div className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Overseas (OS)</span>
              <span className="font-display font-bold text-xs sm:text-sm text-purple-300 font-mono">
                {activeTeam.overseasCount} / 8
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Players Bought in Live Auction */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-amber-400" />
            <h4 className="font-display font-bold text-sm sm:text-base text-white uppercase tracking-wider">
              {activeTeam?.teamCode} — Players Bought in Auction ({boughtPlayers.length})
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total Spent: {formatPurse(boughtPlayers.reduce((s, p) => s + p.priceCr, 0))}
          </span>
        </div>

        {boughtPlayers.length === 0 ? (
          <div className="p-6 text-center bg-slate-950/50 rounded-2xl border border-slate-800/80">
            <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-slate-300">
              No players purchased in the auction yet.
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              When {activeTeam?.teamName} wins a bid, their purchased players appear here immediately.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {boughtPlayers.map((player, idx) => (
              <div
                key={`${player.playerId}_${idx}`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-amber-500/40 transition-all text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <PlayerAvatar
                    player={{
                      id: player.playerId,
                      name: player.name,
                      role: player.role,
                      nationality: player.nationality || (player.isOverseas ? 'Overseas' : 'India'),
                      isOverseas: player.isOverseas,
                      battingStyle: '',
                      basePriceCr: player.priceCr,
                      category: 'Batters',
                      image: player.image,
                      verifiedCutoff: '2026-01-15'
                    }}
                    size="sm"
                    showBadge={false}
                  />

                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white truncate">{player.name}</span>
                      {player.isRtm && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          RTM
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 capitalize block">
                      {player.role} • {player.nationality || (player.isOverseas ? 'Overseas' : 'India')}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-amber-400 text-xs sm:text-sm block">
                    {formatPrice(player.priceCr)}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase">Winning Price</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Retained Players */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h4 className="font-display font-bold text-sm sm:text-base text-white uppercase tracking-wider">
              {activeTeam?.teamCode} — Retained Players ({retainedPlayers.length})
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Retained Cost: {formatPurse(retainedPlayers.reduce((s, p) => s + p.priceCr, 0))}
          </span>
        </div>

        {retainedPlayers.length === 0 ? (
          <div className="p-4 text-center bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs text-slate-500">
            No players retained prior to the auction. Full purse is available.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {retainedPlayers.map((player, idx) => (
              <div
                key={`${player.playerId}_${idx}`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <PlayerAvatar
                    player={{
                      id: player.playerId,
                      name: player.name,
                      role: player.role,
                      nationality: player.nationality || (player.isOverseas ? 'Overseas' : 'India'),
                      isOverseas: player.isOverseas,
                      battingStyle: '',
                      basePriceCr: player.priceCr,
                      category: 'Batters',
                      image: player.image,
                      verifiedCutoff: '2026-01-15'
                    }}
                    size="sm"
                    showBadge={false}
                  />

                  <div className="truncate">
                    <span className="font-bold text-white truncate block">{player.name}</span>
                    <span className="text-[10px] text-slate-400 capitalize block">
                      {player.role} • {player.nationality || (player.isOverseas ? 'Overseas' : 'India')}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm block">
                    {formatPrice(player.priceCr)}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase">Fixed Retention</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

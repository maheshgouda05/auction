import React, { useState } from 'react';
import {
  Trophy, Award, DollarSign, Users, Share2, Check, Download, Flame, ShieldAlert,
  ArrowRight, ExternalLink
} from 'lucide-react';
import { Room, TeamState, Player, AcquiredPlayer } from '../types';
import { getTeamById } from '../data/teams';
import { evaluateSquadBalance } from '../utils/rulesEngine';
import { TeamLogo } from './TeamLogo';

interface AuctionResultsViewProps {
  room: Room;
  teamStates: TeamState[];
  unsoldPlayers: Player[];
  allAuctionedPlayers: AcquiredPlayer[];
  onRestartAuction?: () => void;
}

export const AuctionResultsView: React.FC<AuctionResultsViewProps> = ({
  room,
  teamStates,
  unsoldPlayers,
  allAuctionedPlayers,
  onRestartAuction,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedFranchiseId, setSelectedFranchiseId] = useState<string>(teamStates[0]?.teamId || 'csk');

  const copyShareLink = () => {
    const url = `${window.location.origin}?room=${room.code}&view=results`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Aggregate statistics
  const totalMoneySpent = teamStates.reduce((acc, t) => acc + t.spentPurse, 0);
  const totalPlayersAcquired = teamStates.reduce((acc, t) => acc + t.totalSquadCount, 0);

  // Top purchases (highest bids)
  const allAcquisitions = teamStates.flatMap(t =>
    t.boughtPlayers.map(p => ({ ...p, teamCode: t.teamCode, teamName: t.teamName }))
  ).sort((a, b) => b.priceCr - a.priceCr);

  const topBuys = allAcquisitions.slice(0, 5);

  // Best balanced squad calculation
  const evaluatedTeams = teamStates.map(t => ({
    team: t,
    score: evaluateSquadBalance(t)
  })).sort((a, b) => b.score.overallScore - a.score.overallScore);

  const championSquad = evaluatedTeams[0];
  const activeFranchise = teamStates.find(t => t.teamId === selectedFranchiseId) || teamStates[0];
  const activeFranchiseInfo = getTeamById(activeFranchise?.teamId);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Top Banner: Arena Finale & Share */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>IPL Auction Completed</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ROOM: {room.code}
              </span>
            </div>
            <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wide">
              {room.name} — Final Wrap
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              All bidding rounds and RTM windows have concluded. Here are the official squads, financial breakdowns, and championship awards.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copyShareLink}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Link Copied!' : 'Share Results'}</span>
            </button>
          </div>
        </div>

        {/* Global Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Total Expenditure</span>
            <span className="font-display font-black text-2xl text-emerald-400">
              ₹{totalMoneySpent.toFixed(2)} Cr
            </span>
            <span className="text-[11px] text-slate-500 block">Across 10 Franchises</span>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Players Acquired</span>
            <span className="font-display font-black text-2xl text-white">
              {totalPlayersAcquired}
            </span>
            <span className="text-[11px] text-slate-500 block">Retained & Auction Buys</span>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Highest Purchase</span>
            <span className="font-display font-black text-2xl text-amber-400">
              {topBuys[0] ? `₹${topBuys[0].priceCr.toFixed(2)} Cr` : '—'}
            </span>
            <span className="text-[11px] text-slate-500 block truncate">
              {topBuys[0] ? `${topBuys[0].name} (${topBuys[0].teamCode})` : 'None'}
            </span>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">Best Balanced Squad</span>
            <span className="font-display font-black text-2xl text-sky-400">
              {championSquad?.team.teamCode || '—'}
            </span>
            <span className="text-[11px] text-slate-500 block truncate">
              Rating {championSquad?.score.overallScore}/100
            </span>
          </div>
        </div>
      </div>

      {/* Top 5 Most Expensive Buys Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <span>Top Auction Signings</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {topBuys.map((buy, idx) => (
            <div
              key={idx}
              className="bg-slate-950 p-4 rounded-2xl border border-slate-800 relative overflow-hidden"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-display font-black text-xs flex items-center justify-center absolute top-3 right-3">
                #{idx + 1}
              </div>

              <img
                src={buy.image}
                alt={buy.name}
                className="w-14 h-14 rounded-xl object-cover bg-slate-800 border border-slate-700"
              />
              <h4 className="font-bold text-sm text-white mt-2 truncate">
                {buy.name}
              </h4>
              <p className="text-[11px] text-slate-400">
                {buy.teamName} ({buy.teamCode})
              </p>
              <div className="mt-2 text-xs font-mono font-bold text-emerald-400">
                ₹{buy.priceCr.toFixed(2)} Cr
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Franchise Squads Breakdown Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-display font-bold text-xl text-white">
              Official Franchise Rosters
            </h3>
            <p className="text-xs text-slate-400">
              Select franchise to view complete squad composition and expenditures
            </p>
          </div>

          {/* Franchise Select Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {teamStates.map(t => (
              <button
                key={t.teamId}
                onClick={() => setSelectedFranchiseId(t.teamId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  t.teamId === selectedFranchiseId
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-500/30'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <TeamLogo teamId={t.teamId} size="xs" />
                <span>{t.teamCode}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Franchise Squad Display */}
        {activeFranchise && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <TeamLogo teamId={activeFranchise.teamId} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-lg text-white">
                      {activeFranchise.teamName}
                    </h4>
                    {activeFranchise.status === 'abandoned' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        FROZEN / ABANDONED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Managed by <strong className="text-slate-200">{activeFranchise.ownerName}</strong> {activeFranchise.isBot && '(Computer AI)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Spent</span>
                  <span className="font-bold text-white">₹{activeFranchise.spentPurse.toFixed(2)} Cr</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Remaining</span>
                  <span className="font-bold text-emerald-400">₹{activeFranchise.remainingPurse.toFixed(2)} Cr</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Squad Size</span>
                  <span className="font-bold text-white">{activeFranchise.totalSquadCount} ({activeFranchise.overseasCount} OS)</span>
                </div>
              </div>
            </div>

            {/* Players in active franchise */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[...activeFranchise.retainedPlayers, ...activeFranchise.boughtPlayers].map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center gap-3"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-slate-700 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                        {p.role}
                      </span>
                      <span className="font-mono font-bold text-xs text-emerald-400">
                        ₹{p.priceCr.toFixed(2)} Cr
                      </span>
                    </div>
                    <h5 className="font-bold text-xs text-white truncate mt-0.5">
                      {p.name}
                    </h5>
                    <p className="text-[10px] text-slate-400">
                      {p.isOverseas ? 'Overseas' : 'Indian'} • {p.isRetained ? 'Retained' : 'Auction Buy'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Unsold Players Catalog */}
      {unsoldPlayers.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <h3 className="font-display font-bold text-base text-slate-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            <span>Unsold Player Pool ({unsoldPlayers.length})</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {unsoldPlayers.map(p => (
              <div
                key={p.id}
                className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-center"
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-10 h-10 mx-auto rounded-lg object-cover bg-slate-800 border border-slate-700 mb-1.5"
                />
                <span className="font-bold text-slate-300 block truncate">{p.name}</span>
                <span className="text-[10px] text-slate-500">Base ₹{p.basePriceCr} Cr</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

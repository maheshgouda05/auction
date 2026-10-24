import React, { useState } from 'react';
import { X, Users, DollarSign, Globe, Award, Shield, ChevronRight } from 'lucide-react';
import { TeamState, Room, AcquiredPlayer } from '../types';
import { getTeamById, IPL_TEAMS } from '../data/teams';
import { evaluateSquadBalance } from '../utils/rulesEngine';
import { TeamLogo } from './TeamLogo';

interface SquadDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamStates: TeamState[];
  room: Room;
  currentUserId: string;
}

export const SquadDashboardModal: React.FC<SquadDashboardModalProps> = ({
  isOpen,
  onClose,
  teamStates,
  room,
  currentUserId,
}) => {
  const myTeam = teamStates.find(t => t.ownerId === currentUserId);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(myTeam?.teamId || teamStates[0]?.teamId || 'csk');

  if (!isOpen) return null;

  const currentTeam = teamStates.find(t => t.teamId === selectedTeamId) || teamStates[0];
  const teamInfo = getTeamById(currentTeam?.teamId);
  const balance = currentTeam ? evaluateSquadBalance(currentTeam) : null;

  const allPlayers = currentTeam ? [...currentTeam.retainedPlayers, ...currentTeam.boughtPlayers] : [];
  const batters = allPlayers.filter(p => p.role === 'batter');
  const bowlers = allPlayers.filter(p => p.role === 'bowler');
  const allRounders = allPlayers.filter(p => p.role === 'all-rounder');
  const keepers = allPlayers.filter(p => p.role === 'wicketkeeper');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Franchise Squads & Finances</h3>
              <p className="text-xs text-slate-400">Track purses, roster balance, and squad limits</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-3 shrink-0 border-b border-slate-800/80">
          {teamStates.map(t => {
            const isSelected = t.teamId === selectedTeamId;
            const isMine = t.ownerId === currentUserId;

            return (
              <button
                key={t.teamId}
                onClick={() => setSelectedTeamId(t.teamId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-500/40'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <TeamLogo teamId={t.teamId} size="xs" />
                <span>{t.teamCode}</span>
                {isMine && <span className="text-[10px] bg-slate-900 text-amber-300 px-1 rounded font-normal">You</span>}
              </button>
            );
          })}
        </div>

        {/* Active Team Dashboard Content */}
        {currentTeam && (
          <div className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1">
            {/* Active Team Banner */}
            <div className="flex items-center gap-3.5 p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
              <TeamLogo teamId={currentTeam.teamId} size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-black text-lg text-white">{currentTeam.teamName}</h4>
                  {currentTeam.status === 'abandoned' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      FROZEN / ABANDONED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Manager: <strong className="text-slate-200">{currentTeam.ownerName}</strong> {currentTeam.isBot ? '(AI Coach)' : ''}
                </p>
              </div>
            </div>

            {/* Team Financial & Roster Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Remaining Purse</span>
                <span className="font-display font-black text-xl text-emerald-400">
                  ₹{currentTeam.remainingPurse.toFixed(2)} Cr
                </span>
                <span className="text-[11px] text-slate-500 block">
                  of ₹{currentTeam.startingPurse} Cr
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Squad Count</span>
                <span className="font-display font-black text-xl text-white">
                  {currentTeam.totalSquadCount}
                  <span className="text-xs text-slate-400 font-normal"> / {room.rules.maxSquad}</span>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Min {room.rules.minSquad} players
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Overseas Players</span>
                <span className="font-display font-black text-xl text-sky-400">
                  {currentTeam.overseasCount}
                  <span className="text-xs text-slate-400 font-normal"> / {room.rules.maxOverseas}</span>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Limit {room.rules.maxOverseas} max
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">RTM Cards Left</span>
                <span className="font-display font-black text-xl text-purple-400">
                  {currentTeam.rtmRemaining}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Right To Match
                </span>
              </div>
            </div>

            {/* Squad Balance Assessment */}
            {balance && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h5 className="font-bold text-white">Roster Balance Rating: {balance.overallScore}/100</h5>
                    <p className="text-slate-400 text-[11px]">{balance.breakdown}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300">
                  <span>Bat: {balance.battingScore}%</span>
                  <span>Bowl: {balance.bowlingScore}%</span>
                  <span>All: {balance.allRoundScore}%</span>
                  <span>WK: {balance.keeperScore}%</span>
                </div>
              </div>
            )}

            {/* Players List by Role */}
            <div className="space-y-4">
              <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                Full Squad Roster ({allPlayers.length})
              </h4>

              {allPlayers.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                  No players acquired yet. Bids and retentions will appear here.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {allPlayers.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3"
                    >
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-11 h-11 rounded-xl object-cover bg-slate-800 border border-slate-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
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
                          {p.isOverseas ? 'Overseas' : 'Indian'} • {p.isRetained ? 'Retained' : 'Auction'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

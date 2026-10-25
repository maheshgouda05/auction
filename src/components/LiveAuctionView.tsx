/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * LiveAuctionView: Multiplayer Live Auction Stage
 * - Mobile-first responsive layout (fits 320px, 375px, 390px, 430px, tablet, and desktop)
 * - Stacks Player Card, Bidding Controls, Franchise Purses, and Squad List vertically on mobile
 * - No unwanted horizontal scrolling
 * - Large touch targets (min 44px)
 * - Renders AuctionSquadSection directly below the auction chart showing purchased players
 * - 16-second countdown timer with tick audio and auto-finalization
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Gavel, Clock, ArrowUpRight, Shield, Sparkles, AlertCircle,
  Pause, Play, SkipForward, XCircle, Bot, Users, Check, Volume2,
  RefreshCw, ChevronUp, ChevronDown, CheckCircle2, Flame, Award
} from 'lucide-react';
import { Room, TeamState, Player, BidHistoryItem } from '../types';
import { getTeamById } from '../data/teams';
import { getNextBidAmount, validateBid } from '../utils/rulesEngine';
import { sounds } from '../utils/soundEffects';
import { fetchLiveCommentary, fetchPlayerScoutingInsight } from '../api/serverApi';
import { TeamLogo } from './TeamLogo';
import { PlayerAvatar } from './PlayerAvatar';
import { AuctionSquadSection } from './AuctionSquadSection';
import { formatPrice, formatPurse, exactAddCr } from '../utils/currency';

interface LiveAuctionViewProps {
  room: Room;
  teamStates: TeamState[];
  currentUserId: string;
  currentPlayer: Player | null;
  upcomingPlayers: Player[];
  isHost: boolean;
  onPlaceBid: (amountCr: number) => Promise<void>;
  onSellPlayer: (isRtm?: boolean) => Promise<void>;
  onMarkUnsold: () => Promise<void>;
  onNextPlayer: () => Promise<void>;
  onTogglePause: () => Promise<void>;
  onExerciseRtm: (matches: boolean) => Promise<void>;
  onTriggerBotBid?: () => Promise<void>;
}

export const LiveAuctionView: React.FC<LiveAuctionViewProps> = ({
  room,
  teamStates,
  currentUserId,
  currentPlayer,
  upcomingPlayers = [],
  isHost,
  onPlaceBid,
  onSellPlayer,
  onMarkUnsold,
  onNextPlayer,
  onTogglePause,
  onExerciseRtm,
  onTriggerBotBid,
}) => {
  const { currentAuctionState, rules } = room;
  const myTeam = teamStates.find(t => t.ownerId === currentUserId);
  const highestTeam = getTeamById(currentAuctionState.highestBidderTeamId);
  const originalTeam = getTeamById(currentPlayer?.originalTeam);

  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [scoutingInsight, setScoutingInsight] = useState<string>('');
  const [commentaryLine, setCommentaryLine] = useState<string>('');
  const [bidError, setBidError] = useState<string | null>(null);
  const [biddingInProgress, setBiddingInProgress] = useState<boolean>(false);
  const [customBidAmount, setCustomBidAmount] = useState<string>('');
  const [showCustomBidInput, setShowCustomBidInput] = useState<boolean>(false);

  const lastBidRef = useRef<number>(currentAuctionState.currentBidCr);
  const lastTickRef = useRef<number>(0);

  // Authoritative countdown & auto-advance loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentAuctionState.roundStatus === 'paused' || currentAuctionState.roundStatus === 'idle') {
        return;
      }
      const now = Date.now();

      // 1. Live Bidding Round Countdown
      if (currentAuctionState.roundStatus === 'bidding') {
        const remainingMs = Math.max(0, currentAuctionState.deadline - now);
        const remainingSec = Math.ceil(remainingMs / 1000);
        setSecondsLeft(remainingSec);

        // Play tick audio on last 5 seconds
        if (remainingSec <= 5 && remainingSec > 0 && remainingSec !== lastTickRef.current) {
          lastTickRef.current = remainingSec;
          sounds.playCountdownTick();
        }

        // Finalize round authoritatively when timer reaches 0
        if (remainingMs === 0) {
          if (currentAuctionState.highestBidderTeamId) {
            onSellPlayer(false);
          } else {
            onMarkUnsold();
          }
        }
      }

      // 2. Sold / Unsold Celebration Window -> Auto Advance to Next Player
      if (
        (currentAuctionState.roundStatus === 'sold' || currentAuctionState.roundStatus === 'unsold') &&
        currentAuctionState.autoAdvanceDeadline
      ) {
        const advRemainingMs = Math.max(0, currentAuctionState.autoAdvanceDeadline - now);
        if (advRemainingMs === 0) {
          onNextPlayer();
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [
    currentAuctionState.deadline,
    currentAuctionState.autoAdvanceDeadline,
    currentAuctionState.roundStatus,
    currentAuctionState.highestBidderTeamId,
    onSellPlayer,
    onMarkUnsold,
    onNextPlayer
  ]);

  // Load scouting insight on player change
  useEffect(() => {
    setScoutingInsight('');
    if (currentPlayer) {
      fetchPlayerScoutingInsight(currentPlayer).then(setScoutingInsight).catch(() => {});
    }
  }, [currentPlayer?.id]);

  // Bid update sounds & confetti trigger
  useEffect(() => {
    if (currentAuctionState.currentBidCr > lastBidRef.current) {
      sounds.playBidChime();
      lastBidRef.current = currentAuctionState.currentBidCr;
      setBidError(null);
    }

    if (currentAuctionState.roundStatus === 'sold') {
      sounds.playGavelKnock();
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    } else if (currentAuctionState.roundStatus === 'unsold') {
      sounds.playUnsoldBuzzer();
    }
  }, [currentAuctionState.currentBidCr, currentAuctionState.roundStatus]);

  // Handle bid action
  const handleBid = async (amount: number) => {
    if (!myTeam) {
      setBidError('You must select a franchise to place bids.');
      return;
    }
    if (currentAuctionState.highestBidderTeamId === myTeam.teamId) {
      setBidError('Your franchise already holds the highest bid!');
      return;
    }
    if (!currentPlayer) return;

    const val = validateBid(myTeam, currentPlayer, amount, rules, currentAuctionState.highestBidderTeamId);
    if (!val.valid) {
      setBidError(val.reason || 'Invalid bid.');
      return;
    }

    try {
      setBiddingInProgress(true);
      setBidError(null);
      await onPlaceBid(amount);
    } catch (err: unknown) {
      setBidError(err instanceof Error ? err.message : 'Failed to place bid.');
    } finally {
      setBiddingInProgress(false);
    }
  };

  if (!currentPlayer) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
        <h3 className="font-display font-black text-xl text-white">Preparing Auction Stage...</h3>
        <p className="text-sm text-slate-400">Loading shortlisted player catalog...</p>
      </div>
    );
  }

  // Next bid calculation (first bid starts at player base price!)
  const hasHighestBidder = Boolean(currentAuctionState.highestBidderTeamId);
  const nextBidAmount = getNextBidAmount(
    currentAuctionState.currentBidCr,
    currentPlayer.basePriceCr,
    hasHighestBidder
  );

  const isCurrentHighestBidder = myTeam && currentAuctionState.highestBidderTeamId === myTeam.teamId;
  const myValidation = myTeam ? validateBid(myTeam, currentPlayer, nextBidAmount, rules) : { valid: false, reason: 'No team claimed' };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Banner: Round Info, Timer, and Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="font-display font-black text-xs sm:text-sm text-white uppercase tracking-wider">
              Lot #{currentAuctionState.currentPlayerIndex + 1} • {currentPlayer.category}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">• {room.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Countdown Timer Display */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-black text-sm sm:text-base border transition-colors ${
              secondsLeft <= 5 && currentAuctionState.roundStatus === 'bidding'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                : 'bg-slate-950 text-amber-300 border-amber-500/30'
            }`}>
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                {currentAuctionState.roundStatus === 'paused'
                  ? 'PAUSED'
                  : currentAuctionState.roundStatus === 'sold'
                  ? 'SOLD!'
                  : currentAuctionState.roundStatus === 'unsold'
                  ? 'PASSED'
                  : `${secondsLeft}s`}
              </span>
            </div>

            {/* Host Pause / Trigger Bot Controls */}
            {isHost && (
              <div className="flex items-center gap-1">
                <button
                  onClick={onTogglePause}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-1"
                  title="Pause or Resume Timer"
                >
                  {currentAuctionState.roundStatus === 'paused' ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                  <span className="hidden sm:inline">{currentAuctionState.roundStatus === 'paused' ? 'Resume' : 'Pause'}</span>
                </button>

                {onTriggerBotBid && (
                  <button
                    onClick={onTriggerBotBid}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold transition-colors flex items-center gap-1"
                    title="Simulate bot competition"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Bot Bid</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Auction Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: Player Card & Live Bidding Controls (8 cols on desktop, full on mobile) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Active Player Card */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
            {/* Top Player Details */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
              {/* Player Avatar */}
              <div className="relative shrink-0">
                <PlayerAvatar player={currentPlayer} size="xl" showBadge={false} />
                {currentPlayer.isOverseas && (
                  <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold text-[10px] uppercase shadow-md border border-purple-400">
                    Overseas
                  </div>
                )}
              </div>

              {/* Player Bio & Stats */}
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide">
                    {currentPlayer.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {currentPlayer.role}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-300">
                  {currentPlayer.nationality} • {currentPlayer.battingStyle} {currentPlayer.bowlingStyle ? `• ${currentPlayer.bowlingStyle}` : ''} • Age {currentPlayer.age || '—'}
                </p>

                {/* Base Price Badge */}
                <div className="pt-1 flex items-center justify-center sm:justify-start gap-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Opening Base Price:</span>
                    <span className="font-display font-bold text-xs sm:text-sm text-amber-300 font-mono">
                      {formatPrice(currentPlayer.basePriceCr)}
                    </span>
                  </div>

                  {originalTeam && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                      <TeamLogo teamId={originalTeam.id} size="xs" />
                      <span>Prev: {originalTeam.shortName}</span>
                    </div>
                  )}
                </div>

                {/* Season Performance Stats */}
                {currentPlayer.seasonStats && (
                  <div className="pt-2 grid grid-cols-3 sm:grid-cols-4 gap-2 text-center text-xs">
                    {currentPlayer.seasonStats.matches ? (
                      <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">Matches</span>
                        <span className="font-bold text-white font-mono">{currentPlayer.seasonStats.matches}</span>
                      </div>
                    ) : null}
                    {currentPlayer.seasonStats.runs ? (
                      <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">Runs</span>
                        <span className="font-bold text-amber-300 font-mono">{currentPlayer.seasonStats.runs}</span>
                      </div>
                    ) : null}
                    {currentPlayer.seasonStats.strikeRate ? (
                      <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">Strike Rate</span>
                        <span className="font-bold text-white font-mono">{currentPlayer.seasonStats.strikeRate}</span>
                      </div>
                    ) : null}
                    {currentPlayer.seasonStats.wickets ? (
                      <div className="bg-slate-950/70 p-1.5 rounded-lg border border-slate-800/80">
                        <span className="text-[10px] text-slate-500 block">Wickets</span>
                        <span className="font-bold text-emerald-400 font-mono">{currentPlayer.seasonStats.wickets}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Current Highest Bid Banner */}
            <div className="mt-5 pt-4 border-t border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                {highestTeam ? (
                  <TeamLogo teamId={highestTeam.id} size="md" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs">
                    LOT
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    {hasHighestBidder ? 'Highest Leading Bidder' : 'Opening Base Price'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-lg text-white">
                      {hasHighestBidder ? (currentAuctionState.highestBidderName || highestTeam?.name) : 'Waiting for Opening Bid'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  {hasHighestBidder ? 'Current Bid' : 'Base Price'}
                </span>
                <span className="font-display font-black text-2xl sm:text-3xl text-amber-400 font-mono tracking-tight">
                  {formatPrice(currentAuctionState.currentBidCr)}
                </span>
              </div>
            </div>

            {/* Bid Error Alert */}
            {bidError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bidError}</span>
                </div>
                <button onClick={() => setBidError(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            )}

            {/* Bidding Controls Console */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
              {!myTeam ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-amber-300">
                  You are in Spectator Mode. Claim an official franchise from the lobby to place live bids.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Franchise Purse & Next Bid Status */}
                  <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                    <span>
                      Franchise: <strong className="text-white">{myTeam.teamName}</strong> • Purse: <strong className="text-emerald-400 font-mono">{formatPurse(myTeam.remainingPurse)}</strong>
                    </span>
                    <span>
                      Next Minimum Bid: <strong className="text-amber-400 font-mono">{formatPrice(nextBidAmount)}</strong>
                    </span>
                  </div>

                  {/* Primary Bidding Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    {/* Main Bid Button */}
                    {isCurrentHighestBidder ? (
                      <div className="sm:col-span-2 min-h-[48px] px-4 rounded-xl font-display font-bold text-xs sm:text-sm uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center justify-center gap-2 shadow-sm">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>You Hold Highest Bid ({formatPrice(currentAuctionState.currentBidCr)})</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleBid(nextBidAmount)}
                        disabled={
                          biddingInProgress ||
                          currentAuctionState.roundStatus !== 'bidding' ||
                          !myValidation.valid ||
                          myTeam?.status === 'abandoned' ||
                          myTeam?.isActive === false
                        }
                        className="sm:col-span-2 min-h-[48px] px-4 rounded-xl font-display font-black text-sm sm:text-base uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ArrowUpRight className="w-5 h-5" />
                        <span>Bid {formatPrice(nextBidAmount)}</span>
                      </button>
                    )}

                    {/* Quick Increment +0.20 Cr */}
                    <button
                      onClick={() => handleBid(exactAddCr(nextBidAmount, 0.20))}
                      disabled={
                        biddingInProgress ||
                        isCurrentHighestBidder ||
                        currentAuctionState.roundStatus !== 'bidding' ||
                        !myValidation.valid ||
                        myTeam?.status === 'abandoned' ||
                        myTeam?.isActive === false
                      }
                      className="min-h-[44px] px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-amber-400/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      +₹20 L
                    </button>

                    {/* Quick Increment +0.50 Cr */}
                    <button
                      onClick={() => handleBid(exactAddCr(nextBidAmount, 0.50))}
                      disabled={
                        biddingInProgress ||
                        isCurrentHighestBidder ||
                        currentAuctionState.roundStatus !== 'bidding' ||
                        !myValidation.valid ||
                        myTeam?.status === 'abandoned' ||
                        myTeam?.isActive === false
                      }
                      className="min-h-[44px] px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-amber-400/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      +₹50 L
                    </button>
                  </div>

                  {/* Custom Bid Toggle & Input */}
                  <div className="pt-1">
                    {!showCustomBidInput ? (
                      <button
                        onClick={() => setShowCustomBidInput(true)}
                        className="text-xs text-slate-400 hover:text-amber-300 font-semibold underline underline-offset-4"
                      >
                        Need a custom jump bid? Enter amount →
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 animate-fade-in">
                        <input
                          type="number"
                          step="0.05"
                          min={nextBidAmount}
                          max={myTeam.remainingPurse}
                          value={customBidAmount}
                          onChange={(e) => setCustomBidAmount(e.target.value)}
                          placeholder={`Enter amount in Cr (Min ₹${nextBidAmount.toFixed(2)} Cr)`}
                          disabled={currentAuctionState.roundStatus !== 'bidding' || isCurrentHighestBidder}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
                        />
                        <button
                          onClick={() => {
                            const val = parseFloat(customBidAmount);
                            if (!isNaN(val) && val >= nextBidAmount) {
                              handleBid(Number(val.toFixed(2)));
                              setCustomBidAmount('');
                              setShowCustomBidInput(false);
                            } else {
                              setBidError(`Custom bid must be at least ${formatPrice(nextBidAmount)}.`);
                            }
                          }}
                          disabled={!customBidAmount || parseFloat(customBidAmount) < nextBidAmount || currentAuctionState.roundStatus !== 'bidding' || isCurrentHighestBidder}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-40"
                        >
                          Place
                        </button>
                        <button
                          onClick={() => setShowCustomBidInput(false)}
                          className="px-2 py-2 text-slate-500 hover:text-slate-300 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SQUAD SECTION DISPLAYED DIRECTLY BELOW AUCTION CHART */}
          <AuctionSquadSection
            teamStates={teamStates}
            currentUserId={currentUserId}
            latestWinningTeamId={currentAuctionState.roundStatus === 'sold' ? currentAuctionState.highestBidderTeamId : null}
          />
        </div>

        {/* Right Column: 10 Franchises Live Purse Tracker & Bid History (4 cols on desktop) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Live Franchise Purses & Squad Slots */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 shadow-xl">
            <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>All 10 Franchises</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">Cap ₹{rules.startingPurseCr} Cr</span>
            </h4>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {teamStates.map(team => {
                const isLeader = team.teamId === currentAuctionState.highestBidderTeamId;
                const isMine = team.ownerId === currentUserId;

                return (
                  <div
                    key={team.teamId}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                      isLeader
                        ? 'bg-amber-500/10 border-amber-500 text-amber-200'
                        : isMine
                        ? 'bg-slate-850 border-slate-700 text-white'
                        : 'bg-slate-950 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <TeamLogo teamId={team.teamId} size="sm" />
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">
                          {team.teamName} {isMine && '(You)'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {team.ownerName}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-display font-black text-xs text-emerald-400 block font-mono">
                        {formatPurse(team.remainingPurse)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {team.totalSquadCount}/{rules.maxSquad} ({team.overseasCount} OS)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bid History Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 shadow-xl">
            <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Live Bid Log</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">This Round</span>
            </h4>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
              {currentAuctionState.bidHistory.length === 0 ? (
                <p className="text-slate-500 text-center py-6">
                  No bids placed for {currentPlayer.name} yet.
                </p>
              ) : (
                [...currentAuctionState.bidHistory].reverse().map((bid, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <TeamLogo teamId={bid.teamId} size="xs" />
                      <span className="font-bold text-white">{bid.teamCode}</span>
                      <span className="text-[11px] text-slate-400 truncate">({bid.bidderName})</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400 shrink-0">
                      {formatPrice(bid.amountCr)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Players Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 shadow-xl">
            <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Upcoming Players</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">{upcomingPlayers.length} on deck</span>
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
              {upcomingPlayers.length === 0 ? (
                <p className="text-slate-500 text-center py-4">
                  Final player set in progress.
                </p>
              ) : (
                upcomingPlayers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <PlayerAvatar player={p} size="xs" showBadge={false} />
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">{p.name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{p.role} • {p.nationality}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-300 shrink-0">
                      {formatPrice(p.basePriceCr)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

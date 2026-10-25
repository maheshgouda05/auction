import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Gavel, Clock, ArrowUpRight, Shield, Sparkles, AlertCircle,
  Pause, Play, SkipForward, XCircle, Bot, Users, Check, Volume2,
  RefreshCw, ChevronUp, ChevronDown, ListFilter
} from 'lucide-react';
import { Room, TeamState, Player, BidHistoryItem, AcquiredPlayer } from '../types';
import { getTeamById } from '../data/teams';
import { getNextBidAmount, validateBid } from '../utils/rulesEngine';
import { sounds } from '../utils/soundEffects';
import { fetchLiveCommentary, fetchPlayerScoutingInsight } from '../api/serverApi';
import { TeamLogo } from './TeamLogo';
import { PlayerAvatar } from './PlayerAvatar';

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

  // Time remaining calculation from authoritative deadline
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [scoutingInsight, setScoutingInsight] = useState<string>('');
  const [commentaryLine, setCommentaryLine] = useState<string>('');
  const [bidError, setBidError] = useState<string | null>(null);
  const [biddingInProgress, setBiddingInProgress] = useState<boolean>(false);
  const [customBidAmount, setCustomBidAmount] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'stage' | 'purses' | 'history' | 'upcoming'>('stage');
  const [showCustomDrawer, setShowCustomDrawer] = useState<boolean>(false);

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
      let isMounted = true;
      fetchPlayerScoutingInsight(currentPlayer, myTeam?.teamCode).then((text) => {
        if (isMounted && text) {
          setScoutingInsight(text);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [currentPlayer?.id, myTeam?.teamCode]);

  // Sound and commentary trigger on new bid
  useEffect(() => {
    if (currentAuctionState.currentBidCr > lastBidRef.current) {
      lastBidRef.current = currentAuctionState.currentBidCr;
      sounds.playBidChime();

      if (currentPlayer && highestTeam) {
        fetchLiveCommentary(
          'bid',
          currentPlayer.name,
          highestTeam.code,
          highestTeam.name,
          currentAuctionState.currentBidCr,
          currentPlayer.role,
          currentPlayer.isOverseas
        ).then(setCommentaryLine);
      }
    }
  }, [currentAuctionState.currentBidCr, currentPlayer, highestTeam]);

  // Confetti trigger on Sold
  useEffect(() => {
    if (currentAuctionState.roundStatus === 'sold') {
      sounds.playGavelKnock();
      sounds.playCelebrationFanfare();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else if (currentAuctionState.roundStatus === 'unsold') {
      sounds.playUnsoldBuzzer();
    }
  }, [currentAuctionState.roundStatus]);

  if (!currentPlayer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
          <Gavel className="w-8 h-8" />
        </div>
        <h2 className="font-display font-black text-2xl text-white">All Players Auctioned!</h2>
        <p className="text-slate-400 text-sm">
          The auction catalog has been completed. Review the final franchise rosters and championship awards below.
        </p>
      </div>
    );
  }

  const hasHighestBidder = Boolean(currentAuctionState.highestBidderTeamId);
  const isCurrentHighestBidder = myTeam?.teamId === currentAuctionState.highestBidderTeamId;
  const nextBidAmount = getNextBidAmount(currentAuctionState.currentBidCr, currentPlayer.basePriceCr, hasHighestBidder);

  // Validate if current user can bid
  const myValidation = myTeam ? validateBid(myTeam, currentPlayer, nextBidAmount, rules) : { valid: false, reason: 'You do not own an active franchise.' };

  const handleBid = async (amount: number) => {
    if (!myTeam) {
      setBidError('You must select and control an active franchise to bid.');
      return;
    }
    if (isCurrentHighestBidder) {
      setBidError('Your franchise already holds the highest bid!');
      return;
    }
    const val = validateBid(myTeam, currentPlayer, amount, rules);
    if (!val.valid) {
      setBidError(val.reason || 'Invalid bid amount.');
      return;
    }
    try {
      setBiddingInProgress(true);
      setBidError(null);
      await onPlaceBid(amount);
    } catch (err: unknown) {
      setBidError(err instanceof Error ? err.message : 'Bid rejected by server.');
    } finally {
      setBiddingInProgress(false);
    }
  };

  const isRtmWindow = currentAuctionState.roundStatus === 'rtm_window';
  const isOriginalTeamOwner = myTeam?.teamId.toLowerCase() === currentPlayer.originalTeam?.toLowerCase();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-28 lg:pb-6">
      {/* Top Ticker: Live Commentary Broadcast */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-display font-black text-[10px] sm:text-xs uppercase tracking-wider shrink-0">
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
          <span>BROADCAST DESK</span>
        </div>
        <div className="overflow-hidden flex-1">
          <p className="text-xs sm:text-sm text-slate-200 font-medium truncate">
            {commentaryLine || `Up on stage is ${currentPlayer.name} (Base ₹${currentPlayer.basePriceCr} Cr).`}
          </p>
        </div>
        {highestTeam && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold text-white shrink-0 bg-slate-800/90 border border-slate-700 shadow-sm">
            <TeamLogo teamId={highestTeam.id} size="xs" />
            <span className="hidden sm:inline">Leader:</span>
            <strong className="text-amber-400">{highestTeam.code}</strong>
          </div>
        )}
      </div>

      {/* Mobile-First Phone Navigation Tabs (Visible on Phone/Tablet Viewports) */}
      <div className="grid grid-cols-4 lg:hidden bg-slate-900/95 p-1 rounded-2xl border border-slate-800 backdrop-blur-md shadow-lg gap-1">
        <button
          onClick={() => setMobileTab('stage')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            mobileTab === 'stage'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Gavel className="w-3.5 h-3.5" />
          <span>Stage</span>
        </button>
        <button
          onClick={() => setMobileTab('purses')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            mobileTab === 'purses'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Purses</span>
        </button>
        <button
          onClick={() => setMobileTab('history')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            mobileTab === 'history'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Log</span>
        </button>
        <button
          onClick={() => setMobileTab('upcoming')}
          className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            mobileTab === 'upcoming'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Queue</span>
        </button>
      </div>

      {/* Main Auction Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Stage: Player Showcase & Bidding Console (8 cols) */}
        <div className={`lg:col-span-8 space-y-4 ${mobileTab === 'stage' ? 'block' : 'hidden lg:block'}`}>
          {/* Spotlight Player Broadcast Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-2xl">
            {/* Stadium lighting accent */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/15 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* RTM Window Banner if active */}
            {isRtmWindow && (
              <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-600/30 to-purple-600/30 border border-amber-400/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white">
                      RTM WINDOW: {originalTeam?.name || 'Original Franchise'}
                    </h4>
                    <p className="text-[11px] text-amber-200">
                      Match winning bid of ₹{currentAuctionState.currentBidCr.toFixed(2)} Cr?
                    </p>
                  </div>
                </div>

                {isOriginalTeamOwner && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => onExerciseRtm(true)}
                      className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs shadow-md"
                    >
                      Match & Acquire
                    </button>
                    <button
                      onClick={() => onExerciseRtm(false)}
                      className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sold Banner */}
            {currentAuctionState.roundStatus === 'sold' && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-emerald-400" />
                  <span className="font-display font-black text-sm sm:text-base text-emerald-300 uppercase tracking-wider">
                    SOLD TO {highestTeam?.name} (₹{currentAuctionState.currentBidCr.toFixed(2)} Cr)
                  </span>
                </div>
                {isHost && (
                  <button
                    onClick={onNextPlayer}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1 rounded-xl text-xs flex items-center gap-1 shadow-sm"
                  >
                    <span>Next</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Unsold Banner */}
            {currentAuctionState.roundStatus === 'unsold' && (
              <div className="mb-4 p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-slate-400" />
                  <span className="font-display font-bold text-xs sm:text-sm text-slate-300 uppercase tracking-wider">
                    UNSOLD IN THIS ROUND
                  </span>
                </div>
                {isHost && (
                  <button
                    onClick={onNextPlayer}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-xl text-xs flex items-center gap-1 shadow-sm"
                  >
                    <span>Next</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Main Player Display: Avatar + Info */}
            <div className="flex flex-row items-center gap-4">
              <div className="shrink-0">
                <PlayerAvatar player={currentPlayer} size="lg" className="w-20 h-20 sm:w-28 sm:h-28 shadow-xl" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {currentPlayer.role}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    {currentPlayer.nationality} {currentPlayer.isOverseas ? '(OS)' : '(IND)'}
                  </span>
                  {originalTeam && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      RTM: {originalTeam.code}
                    </span>
                  )}
                </div>

                <h3 className="font-display font-black text-xl sm:text-3xl text-white tracking-wide truncate">
                  {currentPlayer.name}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {currentPlayer.battingStyle} {currentPlayer.bowlingStyle ? `• ${currentPlayer.bowlingStyle}` : ''}
                </p>

                {/* Season stats snippet */}
                {currentPlayer.seasonStats && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                    <span>M: <strong>{currentPlayer.seasonStats.matches}</strong></span>
                    {currentPlayer.seasonStats.runs ? <span>Runs: <strong>{currentPlayer.seasonStats.runs}</strong></span> : null}
                    {currentPlayer.seasonStats.wickets ? <span>Wkts: <strong>{currentPlayer.seasonStats.wickets}</strong></span> : null}
                  </div>
                )}
              </div>
            </div>

            {/* Stage Centerpiece: Big Price & Authoritative 16s Countdown */}
            <div className="mt-4 pt-4 border-t border-slate-800/90 flex items-center justify-between gap-3">
              {/* Current Bid Display */}
              <div>
                <span className="text-[10px] sm:text-xs uppercase font-mono font-bold tracking-widest text-slate-400 block">
                  {currentAuctionState.highestBidderTeamId ? 'CURRENT HIGHEST BID' : 'OPENING BASE PRICE'}
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="font-display font-black text-3xl sm:text-5xl text-amber-400 tracking-tight">
                    ₹{currentAuctionState.currentBidCr.toFixed(2)}
                  </span>
                  <span className="font-display font-bold text-sm sm:text-lg text-amber-400/80">
                    CR
                  </span>
                </div>
                {highestTeam ? (
                  <div className="text-[11px] sm:text-xs font-semibold text-emerald-400 mt-0.5 flex items-center gap-1.5 truncate">
                    <TeamLogo teamId={highestTeam.id} size="xs" />
                    <span className="truncate">Held by <strong className="text-white">{highestTeam.code}</strong> ({currentAuctionState.highestBidderName})</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-0.5">Waiting for opening paddle...</p>
                )}
              </div>

              {/* Authoritative 16s Circular Countdown Timer */}
              <div className="flex items-center gap-2">
                <div
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex flex-col items-center justify-center border-4 shadow-xl transition-all ${
                    secondsLeft <= 5 && currentAuctionState.roundStatus === 'bidding'
                      ? 'border-rose-500 text-rose-400 bg-rose-500/10 animate-pulse'
                      : secondsLeft <= 10
                      ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                      : 'border-sky-500 text-sky-400 bg-sky-500/10'
                  }`}
                >
                  <span className="font-display font-black text-xl sm:text-2xl leading-none">
                    {secondsLeft}
                  </span>
                  <span className="text-[8px] sm:text-[9px] uppercase font-mono tracking-widest">
                    SEC
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inline Bidding Console (Desktop & Mobile Stage View) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-xs sm:text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <span>Franchise Bidding Paddle</span>
                {myTeam && (
                  <span className="text-xs font-normal text-slate-400 font-sans flex items-center gap-1.5">
                    <TeamLogo teamId={myTeam.teamId} size="xs" />
                    <span>({myTeam.teamCode} • ₹{myTeam.remainingPurse.toFixed(2)} Cr)</span>
                  </span>
                )}
              </h4>
              <span className="text-xs text-slate-400">
                Next: <strong className="text-amber-400 font-mono">₹{nextBidAmount.toFixed(2)} Cr</strong>
              </span>
            </div>

            {myTeam && (myTeam.status === 'abandoned' || myTeam.isActive === false) ? (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>
                  <strong>Franchise Frozen:</strong> This team has withdrawn from the live auction.
                </span>
              </div>
            ) : null}

            {bidError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bidError}</span>
              </div>
            )}

            {!myTeam ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center">
                <span className="font-semibold">Spectator Mode:</span> Claim an active franchise in the lobby to raise the bidding paddle.
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  {/* Primary Next Bid Button or Highest Bidder Badge */}
                  {isCurrentHighestBidder ? (
                    <div className="sm:col-span-2 py-3 px-4 rounded-xl font-display font-bold text-sm uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center justify-center gap-2 shadow-sm">
                      <Check className="w-5 h-5 text-emerald-400" />
                      <span>You Hold Highest Bid (₹{currentAuctionState.currentBidCr.toFixed(2)} Cr)</span>
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
                      className="sm:col-span-2 py-3 px-4 rounded-xl font-display font-black text-base uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                      <span>Bid ₹{nextBidAmount.toFixed(2)} Cr</span>
                    </button>
                  )}

                  {/* Jump Bid +0.25 Cr */}
                  <button
                    onClick={() => handleBid(Number((nextBidAmount + 0.25).toFixed(2)))}
                    disabled={
                      biddingInProgress ||
                      isCurrentHighestBidder ||
                      currentAuctionState.roundStatus !== 'bidding' ||
                      !myValidation.valid ||
                      myTeam?.status === 'abandoned' ||
                      myTeam?.isActive === false
                    }
                    className="py-3 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-amber-400/50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    +₹0.25 Cr
                  </button>

                  {/* Jump Bid +0.50 Cr */}
                  <button
                    onClick={() => handleBid(Number((nextBidAmount + 0.50).toFixed(2)))}
                    disabled={
                      biddingInProgress ||
                      isCurrentHighestBidder ||
                      currentAuctionState.roundStatus !== 'bidding' ||
                      !myValidation.valid ||
                      myTeam?.status === 'abandoned' ||
                      myTeam?.isActive === false
                    }
                    className="py-3 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-amber-400/50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    +₹0.50 Cr
                  </button>
                </div>

                {/* Custom Bid Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    step="0.05"
                    min={nextBidAmount}
                    max={myTeam.remainingPurse}
                    value={customBidAmount}
                    onChange={(e) => setCustomBidAmount(e.target.value)}
                    placeholder={`Custom Bid (Min ₹${nextBidAmount.toFixed(2)} Cr)`}
                    disabled={currentAuctionState.roundStatus !== 'bidding' || isCurrentHighestBidder}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
                  />
                  <button
                    onClick={() => {
                      const val = parseFloat(customBidAmount);
                      if (!isNaN(val) && val >= nextBidAmount) {
                        handleBid(Number(val.toFixed(2)));
                        setCustomBidAmount('');
                      } else {
                        setBidError(`Custom bid must be at least ₹${nextBidAmount.toFixed(2)} Cr.`);
                      }
                    }}
                    disabled={!customBidAmount || parseFloat(customBidAmount) < nextBidAmount || currentAuctionState.roundStatus !== 'bidding' || isCurrentHighestBidder}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 font-bold text-xs rounded-xl border border-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Place Custom Bid
                  </button>
                </div>
              </div>
            )}

            {/* Host Live Auction Controls */}
            {isHost && (
              <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase">
                  HOST CONTROLS
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={onTogglePause}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    {currentAuctionState.roundStatus === 'paused' ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                    <span>{currentAuctionState.roundStatus === 'paused' ? 'Resume' : 'Pause'}</span>
                  </button>

                  {onTriggerBotBid && (
                    <button
                      onClick={onTriggerBotBid}
                      title="Simulate bot competition"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-600 text-sky-400 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors border border-sky-500/30"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Trigger Bot</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Stage: 10 Franchises Tracker, Bid Log & Upcoming Queue (4 cols) */}
        <div className={`lg:col-span-4 space-y-4 ${mobileTab !== 'stage' ? 'block' : 'hidden lg:block'}`}>
          {/* Live 10 Teams Purse & Squad Tracker */}
          {(mobileTab === 'purses' || typeof window === 'undefined' || true) && (
            <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl ${mobileTab === 'purses' ? 'block' : 'hidden lg:block'}`}>
              <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Franchise Purses ({teamStates.length})</span>
                <span className="text-[10px] text-slate-400 font-sans font-normal">Cap ₹{rules.startingPurseCr} Cr</span>
              </h4>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {teamStates.map(team => {
                  const isLeader = team.teamId === currentAuctionState.highestBidderTeamId;
                  const isMine = team.ownerId === currentUserId;
                  const isAbandoned = team.status === 'abandoned' || team.isActive === false;

                  return (
                    <div
                      key={team.teamId}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                        isLeader
                          ? 'bg-amber-500/10 border-amber-500 text-amber-200'
                          : isMine
                          ? 'bg-slate-800/80 border-slate-700 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <TeamLogo teamId={team.teamId} size="sm" />
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold truncate text-white">{team.teamName}</span>
                            {isAbandoned ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                FROZEN
                              </span>
                            ) : team.isBot ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                BOT
                              </span>
                            ) : team.ownerId ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                HUMAN
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-800 text-slate-400">
                                AVAILABLE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {team.ownerName}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-display font-black text-xs text-emerald-400 block font-mono">
                          ₹{team.remainingPurse.toFixed(2)} Cr
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
          )}

          {/* Bid History Stream */}
          <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl ${mobileTab === 'history' ? 'block' : 'hidden lg:block'}`}>
            <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Bid Log</span>
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
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <TeamLogo teamId={bid.teamId} size="xs" />
                      <span className="font-bold text-white">{bid.teamCode}</span>
                      <span className="text-[11px] text-slate-400">({bid.bidderName})</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400">
                      ₹{bid.amountCr.toFixed(2)} Cr
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Player Queue (Visible in Queue tab or on Desktop) */}
          <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl ${mobileTab === 'upcoming' ? 'block' : 'hidden lg:block'}`}>
            <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Upcoming Queue</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">{upcomingPlayers.length} on deck</span>
            </h4>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {upcomingPlayers.length === 0 ? (
                <p className="text-slate-500 text-center py-6">
                  Final round in progress.
                </p>
              ) : (
                upcomingPlayers.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <PlayerAvatar player={p} size="xs" showBadge={false} />
                      <div className="truncate">
                        <span className="font-bold text-white block truncate">{p.name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{p.role} • {p.nationality}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-300 shrink-0">
                      ₹{p.basePriceCr} Cr
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Phone Sticky Bottom Thumb Paddle (Visible on Mobile) */}
      <div className="block lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 p-3 backdrop-blur-xl shadow-2xl safe-area-pb">
        {!myTeam ? (
          <div className="text-center text-xs text-amber-300 py-1 font-medium">
            Spectator Mode (Claim a team in lobby to bid)
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>{myTeam.teamCode} Purse: <strong className="text-emerald-400 font-mono">₹{myTeam.remainingPurse.toFixed(2)} Cr</strong></span>
              <span>Next: <strong className="text-amber-400 font-mono">₹{nextBidAmount.toFixed(2)} Cr</strong></span>
            </div>

            <div className="flex items-center gap-2">
              {isCurrentHighestBidder ? (
                <div className="flex-1 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>You Hold Highest Bid (₹{currentAuctionState.currentBidCr.toFixed(2)} Cr)</span>
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
                  className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 active:scale-95 text-slate-950 font-display font-black text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowUpRight className="w-5 h-5" />
                  <span>Bid ₹{nextBidAmount.toFixed(2)} Cr</span>
                </button>
              )}

              <button
                onClick={() => handleBid(Number((nextBidAmount + 0.25).toFixed(2)))}
                disabled={
                  biddingInProgress ||
                  isCurrentHighestBidder ||
                  currentAuctionState.roundStatus !== 'bidding' ||
                  !myValidation.valid ||
                  myTeam?.status === 'abandoned' ||
                  myTeam?.isActive === false
                }
                className="h-12 px-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs active:scale-95 disabled:opacity-40 shrink-0"
              >
                +0.25
              </button>

              <button
                onClick={() => handleBid(Number((nextBidAmount + 0.50).toFixed(2)))}
                disabled={
                  biddingInProgress ||
                  isCurrentHighestBidder ||
                  currentAuctionState.roundStatus !== 'bidding' ||
                  !myValidation.valid ||
                  myTeam?.status === 'abandoned' ||
                  myTeam?.isActive === false
                }
                className="h-12 px-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs active:scale-95 disabled:opacity-40 shrink-0"
              >
                +0.50
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

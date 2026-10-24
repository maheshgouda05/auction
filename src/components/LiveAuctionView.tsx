import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Gavel, Clock, ArrowUpRight, Shield, Sparkles, AlertCircle,
  Pause, Play, SkipForward, XCircle, Bot, Users, Check, Volume2, RefreshCw
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
  upcomingPlayers,
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

  // Load scouting insight on player change (strictly clear previous player's data immediately)
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

  const nextBidAmount = getNextBidAmount(currentAuctionState.currentBidCr, currentPlayer.basePriceCr);

  // Validate if current user can bid
  const myValidation = myTeam ? validateBid(myTeam, currentPlayer, nextBidAmount, rules) : { valid: false, reason: 'You do not own a team.' };

  const handleBid = async (amount: number) => {
    if (!myTeam) {
      setBidError('You must be assigned to an active franchise to bid.');
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      {/* Top Ticker: Live Commentary Broadcast */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-display font-black text-xs uppercase tracking-wider shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>BROADCAST DESK</span>
        </div>
        <div className="overflow-hidden flex-1">
          <p className="text-xs sm:text-sm text-slate-200 font-medium truncate">
            {commentaryLine || `Welcome to the live arena! Up on stage is ${currentPlayer.name} (Base ₹${currentPlayer.basePriceCr} Cr).`}
          </p>
        </div>
        {highestTeam && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-bold text-white shrink-0 bg-slate-800/90 border border-slate-700 shadow-sm">
            <TeamLogo teamId={highestTeam.id} size="xs" />
            <span>Current: <strong className="text-amber-400">{highestTeam.code}</strong></span>
          </div>
        )}
      </div>

      {/* Main Auction Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Stage: Player Showcase & Bidding Console (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Spotlight Player Broadcast Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-2xl">
            {/* Background stadium lighting effect */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/15 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* RTM Window Banner if active */}
            {isRtmWindow && (
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-600/30 to-purple-600/30 border border-amber-400/60 flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      RTM WINDOW ACTIVE: {originalTeam?.name || 'Original Franchise'}
                    </h4>
                    <p className="text-xs text-amber-200">
                      Does the original franchise want to match the winning bid of ₹{currentAuctionState.currentBidCr.toFixed(2)} Cr?
                    </p>
                  </div>
                </div>

                {isOriginalTeamOwner && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onExerciseRtm(true)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs shadow-md"
                    >
                      Match & Acquire
                    </button>
                    <button
                      onClick={() => onExerciseRtm(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sold / Unsold Banner */}
            {currentAuctionState.roundStatus === 'sold' && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-emerald-400" />
                  <span className="font-display font-black text-base text-emerald-300 uppercase tracking-wider">
                    SOLD TO {highestTeam?.name} (₹{currentAuctionState.currentBidCr.toFixed(2)} Cr)
                  </span>
                </div>
                {isHost && (
                  <button
                    onClick={onNextPlayer}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1 rounded-xl text-xs flex items-center gap-1 shadow-sm"
                  >
                    <span>Next Player</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {currentAuctionState.roundStatus === 'unsold' && (
              <div className="mb-4 p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-slate-400" />
                  <span className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider">
                    PLAYER UNSOLD IN THIS ROUND
                  </span>
                </div>
                {isHost && (
                  <button
                    onClick={onNextPlayer}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-xl text-xs flex items-center gap-1 shadow-sm"
                  >
                    <span>Next Player</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Main Player Display: Avatar + Info + Big Price */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Player Image with Role & Nationality Badges */}
              <div className="relative shrink-0">
                <img
                  src={currentPlayer.image}
                  alt={currentPlayer.name}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover bg-slate-800 border-2 border-slate-700 shadow-xl"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-amber-500/40 text-amber-300 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
                  {currentPlayer.category}
                </div>
              </div>

              {/* Player Details & Real Stats */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {currentPlayer.role}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    {currentPlayer.nationality} ({currentPlayer.isOverseas ? 'Overseas' : 'Indian'})
                  </span>
                  {originalTeam && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      RTM Eligible: {originalTeam.code}
                    </span>
                  )}
                </div>

                <h3 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide">
                  {currentPlayer.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentPlayer.battingStyle} {currentPlayer.bowlingStyle ? `• ${currentPlayer.bowlingStyle}` : ''}
                </p>

                {/* Season stats badge */}
                {currentPlayer.seasonStats && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400">
                      Matches: <strong className="text-white">{currentPlayer.seasonStats.matches}</strong>
                    </span>
                    {currentPlayer.seasonStats.runs ? (
                      <span className="text-slate-400">
                        Runs: <strong className="text-white">{currentPlayer.seasonStats.runs}</strong> (SR {currentPlayer.seasonStats.strikeRate})
                      </span>
                    ) : null}
                    {currentPlayer.seasonStats.wickets ? (
                      <span className="text-slate-400">
                        Wickets: <strong className="text-white">{currentPlayer.seasonStats.wickets}</strong> (Econ {currentPlayer.seasonStats.economy})
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Scouting Insight Pill */}
                {scoutingInsight && (
                  <p className="mt-2 text-xs text-sky-300/90 italic bg-sky-950/30 border border-sky-800/40 p-2 rounded-xl">
                    💡 <strong>Scout:</strong> {scoutingInsight}
                  </p>
                )}
              </div>
            </div>

            {/* Stage Centerpiece: Price & Authoritative Countdown */}
            <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Current Bid Display */}
              <div className="text-center sm:text-left">
                <span className="text-xs uppercase font-mono font-bold tracking-widest text-slate-400 block">
                  {currentAuctionState.highestBidderTeamId ? 'CURRENT HIGHEST BID' : 'STARTING BASE PRICE'}
                </span>
                <div className="flex items-baseline justify-center sm:justify-start gap-2 mt-0.5">
                  <span className="font-display font-black text-4xl sm:text-5xl text-amber-400 tracking-tight">
                    ₹{currentAuctionState.currentBidCr.toFixed(2)}
                  </span>
                  <span className="font-display font-bold text-xl text-amber-400/80">
                    CRORE
                  </span>
                </div>
                {highestTeam ? (
                  <div className="text-xs font-semibold text-emerald-400 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                    <TeamLogo teamId={highestTeam.id} size="xs" />
                    <span>Held by <strong className="text-white">{highestTeam.name}</strong> ({currentAuctionState.highestBidderName})</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">Waiting for opening paddle...</p>
                )}
              </div>

              {/* Authoritative Circular Countdown Timer */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">
                    ROUND DEADLINE
                  </span>
                  <span className="text-xs text-slate-300">
                    {currentAuctionState.roundStatus === 'paused' ? 'Paused' : `${secondsLeft}s remaining`}
                  </span>
                </div>

                <div
                  className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 shadow-xl transition-all ${
                    secondsLeft <= 5 && currentAuctionState.roundStatus === 'bidding'
                      ? 'border-rose-500 text-rose-400 bg-rose-500/10 animate-pulse'
                      : secondsLeft <= 10
                      ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                      : 'border-sky-500 text-sky-400 bg-sky-500/10'
                  }`}
                >
                  <span className="font-display font-black text-2xl leading-none">
                    {secondsLeft}
                  </span>
                  <span className="text-[9px] uppercase font-mono tracking-widest">
                    SEC
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Bidding Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <span>Franchise Bidding Paddle</span>
                {myTeam && (
                  <span className="text-xs font-normal text-slate-400 font-sans flex items-center gap-1.5">
                    <TeamLogo teamId={myTeam.teamId} size="xs" />
                    <span>({myTeam.teamCode} • Purse: ₹{myTeam.remainingPurse.toFixed(2)} Cr)</span>
                  </span>
                )}
              </h4>
              <span className="text-xs text-slate-400">
                Next Valid: <strong className="text-amber-400">₹{nextBidAmount.toFixed(2)} Cr</strong>
              </span>
            </div>

            {myTeam && (myTeam.status === 'abandoned' || myTeam.isActive === false) ? (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>
                  <strong>Franchise Frozen:</strong> This team has withdrawn from the live auction. Its roster and purse remain permanently locked, and it will not place further bids.
                </span>
              </div>
            ) : null}

            {bidError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bidError}</span>
              </div>
            )}

            {/* Quick Bid Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              {/* Primary Next Bid Button */}
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

              {/* Jump Bid +0.25 Cr */}
              <button
                onClick={() => handleBid(Number((nextBidAmount + 0.25).toFixed(2)))}
                disabled={
                  biddingInProgress ||
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

                  <button
                    onClick={() => onSellPlayer(false)}
                    disabled={!currentAuctionState.highestBidderTeamId}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-40"
                  >
                    <Gavel className="w-3.5 h-3.5" />
                    <span>Hammer Sold</span>
                  </button>

                  <button
                    onClick={onMarkUnsold}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Pass / Unsold</span>
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

        {/* Right Stage: 10 Franchises Tracker & Bid History (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Live 10 Teams Purse & Squad Tracker */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl">
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
                      <span className="font-display font-black text-xs text-emerald-400 block">
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

          {/* Bid History Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl">
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
        </div>
      </div>
    </div>
  );
};

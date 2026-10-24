import React, { useState } from 'react';
import {
  Users, CheckCircle2, Circle, Bot, Play, Send, Shield, Sparkles,
  AlertCircle, Share2, Check, UserMinus, Crown, RefreshCw
} from 'lucide-react';
import { Room, Participant, TeamState, ChatMessage } from '../types';
import { IPL_TEAMS, getTeamById } from '../data/teams';
import { TeamLogo } from './TeamLogo';

interface LobbyViewProps {
  room: Room;
  participants: Participant[];
  teamStates: TeamState[];
  currentUserId: string;
  isHost: boolean;
  messages: ChatMessage[];
  onSelectTeam: (teamId: string) => Promise<void>;
  onToggleReady: () => Promise<void>;
  onStartAuction: () => Promise<void>;
  onSendMessage: (text: string) => Promise<void>;
  onRemoveParticipant?: (participantId: string) => Promise<void>;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  participants,
  teamStates,
  currentUserId,
  isHost,
  messages,
  onSelectTeam,
  onToggleReady,
  onStartAuction,
  onSendMessage,
  onRemoveParticipant,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [selectingTeamId, setSelectingTeamId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const me = participants.find(p => p.id === currentUserId);
  const myTeamId = me?.selectedTeamId || null;

  const copyRoomLink = () => {
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const txt = chatInput.trim();
    setChatInput('');
    await onSendMessage(txt);
  };

  const handleCardClick = async (teamId: string) => {
    const state = teamStates.find(t => t.teamId === teamId);
    // If already owned by me, ignore
    if (state?.ownerId === currentUserId) return;
    // If taken by another human, inform
    if (state?.ownerId && state.ownerId !== currentUserId && !state.isBot) {
      setSelectError(`${state.teamName} is already claimed by ${state.ownerName}.`);
      return;
    }

    try {
      setSelectingTeamId(teamId);
      setSelectError(null);
      await onSelectTeam(teamId);
    } catch (err: unknown) {
      setSelectError(err instanceof Error ? err.message : 'Failed to select team.');
    } finally {
      setSelectingTeamId(null);
    }
  };

  // Readiness calculations
  const unselectedCount = participants.filter(p => !p.selectedTeamId).length;
  const unreadyCount = participants.filter(p => !p.isReady).length;
  const humanTeamCount = teamStates.filter(t => !t.isBot && t.ownerId).length;
  const canStart = unselectedCount === 0 && unreadyCount === 0 && humanTeamCount >= 1;

  const getStartExplanation = (): string | null => {
    if (unselectedCount > 0) {
      return `${unselectedCount} participant(s) haven't chosen a franchise yet.`;
    }
    if (unreadyCount > 0) {
      return `${unreadyCount} participant(s) are not ready yet.`;
    }
    if (humanTeamCount === 0) {
      return 'At least 1 human participant must select a franchise to start.';
    }
    return null;
  };

  const handleStart = async () => {
    const reason = getStartExplanation();
    if (reason) {
      setStartError(reason);
      return;
    }
    try {
      setStarting(true);
      setStartError(null);
      await onStartAuction();
    } catch (err: unknown) {
      setStartError(err instanceof Error ? err.message : 'Failed to start auction.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner: Room Status & Share */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 backdrop-blur-md relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-bl from-amber-500/10 via-sky-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {room.rules.rulesetName || (room.format === 'mini' ? 'TATA IPL 2026 Mini Auction' : 'Custom Mega Auction')}
              </span>
              <span className="text-xs text-slate-400">
                Host: <strong className="text-white">{room.hostName}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Human-Only Room
              </span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wide">
              {room.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Mode: {room.format.toUpperCase()} • {humanTeamCount} Human Franchise(s) Joined • Share code with friends to pick teams!
            </p>
          </div>

          {/* Share Code & Ready Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={copyRoomLink}
              title="Click to copy invite link"
              className="flex items-center gap-2 bg-slate-950 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 px-4 py-2 rounded-xl text-amber-300 font-mono font-bold text-sm shadow-sm transition-all active:scale-95"
            >
              <span>ROOM: {room.code}</span>
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* My Ready toggle */}
            <button
              onClick={onToggleReady}
              disabled={!myTeamId}
              className={`flex items-center gap-2 font-bold px-4 py-2 rounded-xl transition-all shadow-md text-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                me?.isReady
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-600'
              }`}
            >
              {me?.isReady ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Circle className="w-4 h-4 text-slate-400" />}
              <span>{me?.isReady ? 'Ready!' : myTeamId ? 'Mark Ready' : 'Choose Team to Ready Up'}</span>
            </button>
          </div>
        </div>
      </div>

      {selectError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{selectError}</span>
          </div>
          <button onClick={() => setSelectError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid: 10 Franchises Grid (Left/Center) + Participants & Chat (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Franchises Selection (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <span>Select Your IPL Franchise</span>
                <span className="text-xs font-normal text-slate-400 font-sans">
                  (Tap card to choose)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Each participant gets 1 unique team. Unclaimed teams remain unassigned.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              {humanTeamCount} / 10 Claimed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {IPL_TEAMS.map(team => {
              const state = teamStates.find(t => t.teamId === team.id);
              const isClaimedByMe = state?.ownerId === currentUserId;
              const isClaimedByOther = state?.ownerId && state.ownerId !== currentUserId && !state.isBot;
              const isClaimedByBot = state?.isBot;
              const isAvailable = !state?.ownerId && !state?.isBot;
              const isSelectingThis = selectingTeamId === team.id;

              const purseDisplay = room.format === 'mini'
                ? team.miniAuction2026PurseCr
                : (state?.startingPurse || room.rules.startingPurseCr);

              return (
                <div
                  key={team.id}
                  onClick={() => {
                    if (isAvailable || isClaimedByMe || (isClaimedByBot && isHost)) {
                      handleCardClick(team.id);
                    }
                  }}
                  role="button"
                  tabIndex={isAvailable || isClaimedByMe ? 0 : -1}
                  className={`relative p-4 rounded-2xl border transition-all select-none cursor-pointer text-left ${
                    isClaimedByMe
                      ? 'bg-amber-950/20 border-amber-400 shadow-xl shadow-amber-500/15 ring-2 ring-amber-500/50'
                      : isClaimedByOther
                      ? 'bg-slate-950/70 border-slate-800/80 opacity-60 cursor-not-allowed'
                      : isClaimedByBot
                      ? 'bg-slate-950/70 border-slate-800 opacity-70'
                      : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-amber-400/50 hover:shadow-lg active:scale-[0.99]'
                  }`}
                >
                  {/* Team Top Accent Strip */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: team.primaryColor }}
                  />

                  <div className="flex items-start justify-between gap-3 mt-1">
                    <div className="flex items-center gap-3">
                      {/* Authentic Team Logo */}
                      <TeamLogo teamId={team.id} size="md" />

                      <div>
                        <h4 className="font-bold text-sm text-white leading-tight">
                          {team.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {team.championships}x Champions • {team.city}
                        </p>
                      </div>
                    </div>

                    {/* Claim Button / Status Pill */}
                    {isSelectingThis ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Saving...</span>
                      </span>
                    ) : isClaimedByMe ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/20 border border-amber-400 px-2.5 py-1 rounded-lg shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                        <span>Your Team</span>
                      </span>
                    ) : isClaimedByOther ? (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">Taken by</span>
                        <span className="text-xs font-bold text-rose-300 truncate max-w-[100px] block">
                          {state?.ownerName}
                        </span>
                      </div>
                    ) : isClaimedByBot ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg">
                        <Bot className="w-3 h-3" />
                        <span>AI Bot</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardClick(team.id);
                        }}
                        className="text-xs font-bold bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/40 hover:border-amber-400 px-3 py-1 rounded-lg transition-all"
                      >
                        Select
                      </button>
                    )}
                  </div>

                  {/* Team details bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {room.format === 'mini' ? '2026 Purse' : 'Starting Purse'}:{' '}
                      <strong className="text-emerald-400">₹{purseDisplay.toFixed(2)} Cr</strong>
                    </span>
                    <span className="text-slate-500">
                      {isAvailable ? '🟢 Available' : isClaimedByMe ? '⭐ Selected' : '🔒 Taken'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Participants List & Lobby Chat */}
        <div className="space-y-6">
          {/* Participants Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Participants ({participants.length})</span>
              </h3>
              <span className="text-xs text-slate-400">
                {participants.filter(p => p.isReady).length}/{participants.length} Ready
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {participants.map(p => {
                const team = getTeamById(p.selectedTeamId);
                const isMe = p.id === currentUserId;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                      isMe ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                        {p.displayName[0].toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate max-w-[110px]">
                            {p.displayName}
                          </span>
                          {p.isHost && (
                            <span title="Room Host">
                              <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[10px] text-amber-400 bg-amber-500/20 px-1 py-0.2 rounded">You</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {team ? team.name : 'Selecting franchise...'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.isReady ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                          Not ready
                        </span>
                      )}

                      {/* Host can kick disconnected participant */}
                      {isHost && !isMe && onRemoveParticipant && (
                        <button
                          onClick={() => onRemoveParticipant(p.id)}
                          title="Remove user"
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Host Start Button & Explanations */}
            {isHost && (
              <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
                {startError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.2" />
                    <span>{startError}</span>
                  </div>
                )}

                <button
                  onClick={handleStart}
                  disabled={starting || !canStart}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                    canStart
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/20 active:scale-[0.98]'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>
                    {starting
                      ? 'Starting...'
                      : room.format === 'mega'
                      ? 'Proceed to Pre-Auction Retention'
                      : 'Launch Human-Only Live Auction'}
                  </span>
                </button>
                {!canStart && (
                  <p className="text-[11px] text-center text-slate-500">
                    {getStartExplanation()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Lobby Chat Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-64">
            <h3 className="font-display font-bold text-base text-white mb-2.5">
              Lobby Chat
            </h3>

            {/* Messages scroll */}
            <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1">
              {messages.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  Say hi to your fellow franchise owners!
                </p>
              ) : (
                messages.map(m => (
                  <div key={m.id} className="leading-relaxed">
                    {m.isSystem ? (
                      <span className="text-[11px] italic text-amber-400/90 block">
                        ⚙️ {m.text}
                      </span>
                    ) : (
                      <p>
                        <strong className="text-slate-300 font-bold">{m.senderName}: </strong>
                        <span className="text-slate-200">{m.text}</span>
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendChat} className="mt-3 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message room..."
                maxLength={200}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center transition-colors disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

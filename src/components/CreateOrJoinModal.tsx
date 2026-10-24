import React, { useState } from 'react';
import { PlusCircle, LogIn, Sparkles, Sliders, Trophy, Bot, Play, Users } from 'lucide-react';
import { AuctionRules } from '../types';
import { OFFICIAL_RULES_PRESETS } from '../utils/rulesEngine';

interface CreateOrJoinModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCreateRoom: (roomName: string, rules: AuctionRules) => Promise<void>;
  onJoinRoom: (roomCode: string) => Promise<void>;
  onSoloPractice: () => Promise<void>;
}

export const CreateOrJoinModal: React.FC<CreateOrJoinModalProps> = ({
  isOpen,
  onCreateRoom,
  onJoinRoom,
  onSoloPractice,
}) => {
  const [tab, setTab] = useState<'join' | 'create'>('join');
  const [joinCode, setJoinCode] = useState('');
  const [roomName, setRoomName] = useState('Premier IPL Auction');
  const [format, setFormat] = useState<'mini' | 'mega'>('mini'); // Default to 2026 Mini Auction
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'normal' | 'competitive'>('normal');
  const [aiFillBots, setAiFillBots] = useState(false); // DEFAULT MUST BE FALSE (Human-Only)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter a 6-character room code.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await onJoinRoom(joinCode.trim().toUpperCase());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not join room. Verify the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const basePreset = OFFICIAL_RULES_PRESETS[format];
      const rules: AuctionRules = {
        ...basePreset,
        timerSeconds,
        aiDifficulty,
        aiFillBots, // Defaults to false
        isHumanOnly: !aiFillBots
      };
      await onCreateRoom(roomName || 'IPL Auction Arena', rules);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  };

  const handleSolo = async () => {
    try {
      setLoading(true);
      setError(null);
      await onSoloPractice();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start simulation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 overflow-hidden my-8">
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Tab switch */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 mb-6">
          <button
            type="button"
            onClick={() => { setTab('join'); setError(null); }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              tab === 'join'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Join with Friends</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('create'); setError(null); }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              tab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Room</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
            {error}
          </div>
        )}

        {tab === 'join' ? (
          <div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  6-Letter Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. IPL890"
                  maxLength={10}
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-400 rounded-xl py-3 px-4 text-center font-mono font-black text-xl tracking-widest text-amber-300 placeholder-slate-600 focus:outline-none uppercase transition-all shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !joinCode.trim()}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Connecting...' : 'Join Auction Arena'}</span>
              </button>
            </form>

            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-widest font-mono">
                OR SOLO PRACTICE
              </span>
            </div>

            <button
              onClick={handleSolo}
              disabled={loading}
              className="w-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 text-slate-200 font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>Launch Solo Simulation (vs 9 Bots)</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Friends IPL Auction Night"
                maxLength={40}
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-400 rounded-xl py-2 px-3 text-sm text-white placeholder-slate-600 focus:outline-none"
              />
            </div>

            {/* Mode selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Auction Edition
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormat('mini')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    format === 'mini'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white mb-0.5">
                    <Sliders className="w-3.5 h-3.5 text-sky-400" />
                    <span>2026 Mini Auction</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Official 2026 squads, authentic franchise purses (KKR ₹64.3 Cr, CSK ₹43.4 Cr) & direct bidding.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('mega')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    format === 'mega'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white mb-0.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Custom Mega Auction</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Custom simulation: ₹120 Cr cap, pre-auction retentions (up to 6) & RTM cards.
                  </p>
                </button>
              </div>
            </div>

            {/* Settings grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Countdown Timer
                </label>
                <select
                  value={timerSeconds}
                  onChange={(e) => setTimerSeconds(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-2.5 text-xs text-white focus:outline-none"
                >
                  <option value={10}>10 Seconds (Fast)</option>
                  <option value={15}>15 Seconds (Standard)</option>
                  <option value={20}>20 Seconds (Relaxed)</option>
                  <option value={30}>30 Seconds (Strategic)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Room Type
                </label>
                <div className="bg-slate-950 border border-slate-700 rounded-xl py-2 px-2.5 text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Human-Only by Default</span>
                </div>
              </div>
            </div>

            {/* Optional Bot Filler Toggle (Default: OFF) */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">Optional Computer AI Bidders</span>
                  <span className="text-[11px] text-slate-500 block">Default is OFF. Enable only if you want bots to fill empty slots.</span>
                </div>
              </div>
              <input
                type="checkbox"
                id="botCheck"
                checked={aiFillBots}
                onChange={(e) => setAiFillBots(e.target.checked)}
                className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
              />
            </div>

            {aiFillBots && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  AI Bot Difficulty
                </label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as 'easy' | 'normal' | 'competitive')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="easy">Easy (Cautious Bidders)</option>
                  <option value="normal">Normal (Smart & Balanced)</option>
                  <option value="competitive">Competitive (Aggressive)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !roomName.trim()}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Creating Arena...' : 'Create Human-Only Room'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

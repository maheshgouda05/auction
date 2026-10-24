import React, { useState } from 'react';
import { Volume2, VolumeX, Share2, Users, Database, LogOut, Check, Shield, DoorOpen, AlertTriangle } from 'lucide-react';
import { Room, TeamState } from '../types';
import { sounds } from '../utils/soundEffects';
import { auth } from '../lib/firebase';
import { User } from 'firebase/auth';
import { TeamLogo } from './TeamLogo';

interface HeaderProps {
  room: Room | null;
  myTeam: TeamState | null;
  currentUser: User | null;
  onOpenSquads: () => void;
  onOpenPlayerManager: () => void;
  onSignOut: () => void;
  onOpenAuth: () => void;
  onLeaveRoom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  room,
  myTeam,
  currentUser,
  onOpenSquads,
  onOpenPlayerManager,
  onSignOut,
  onOpenAuth,
  onLeaveRoom,
}) => {
  const [soundOn, setSoundOn] = useState(sounds.isSoundEnabled());
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sounds.setSoundEnabled(next);
  };

  const copyInviteLink = () => {
    if (!room) return;
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmLeave = () => {
    setShowLeaveConfirm(false);
    if (onLeaveRoom) {
      onLeaveRoom();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/40">
              <span className="font-display font-black text-xl text-slate-950 tracking-tighter">IPL</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-black text-lg md:text-xl tracking-wider text-white uppercase bg-gradient-to-r from-amber-300 via-white to-amber-200 bg-clip-text text-transparent">
                  Auction Arena
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  2026 Season
                </span>
              </div>
              {room && (
                <p className="text-[11px] text-slate-400 font-medium truncate max-w-[140px] sm:max-w-xs">
                  {room.name} • {room.format === 'mini' ? 'Mini Auction 2026' : 'Mega Auction'}
                </p>
              )}
            </div>
          </div>

          {/* Center: Room Code and My Franchise Pill */}
          <div className="flex items-center gap-2">
            {room && (
              <button
                onClick={copyInviteLink}
                title="Click to copy invite link"
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-400/60 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-amber-300 transition-all shadow-sm active:scale-95"
              >
                <span className="text-slate-400 font-sans font-normal hidden sm:inline">ROOM:</span>
                <span className="tracking-widest">{room.code}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            )}

            {myTeam && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-lg text-xs">
                <TeamLogo teamId={myTeam.teamId} size="xs" />
                <span className="font-bold text-white">{myTeam.teamCode}</span>
                <span className="text-emerald-400 font-mono font-semibold text-[11px]">₹{myTeam.remainingPurse.toFixed(2)} Cr</span>
                {myTeam.status === 'abandoned' && (
                  <span className="text-[9px] font-bold bg-rose-500/20 text-rose-300 px-1 rounded">FROZEN</span>
                )}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {room && onLeaveRoom && (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                title="Leave Room / Auction"
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <DoorOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            )}

            {room && (
              <button
                onClick={onOpenSquads}
                title="Franchise Squads & Purses"
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Users className="w-4 h-4 text-sky-400" />
                <span className="hidden md:inline">Squads</span>
              </button>
            )}

            <button
              onClick={onOpenPlayerManager}
              title="Player Pool & Custom Imports"
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Database className="w-4 h-4 text-purple-400" />
              <span className="hidden md:inline">Players</span>
            </button>

            <button
              onClick={toggleSound}
              title={soundOn ? 'Mute Sounds' : 'Unmute Sounds'}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-1.5 pl-1">
                <div
                  title={currentUser.displayName || 'Player'}
                  className="w-7 h-7 rounded-full bg-slate-800 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-300"
                >
                  {(currentUser.displayName || 'U')[0].toUpperCase()}
                </div>
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Leave Auction Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-white">
                  Leave Auction Room?
                </h3>
                <p className="text-xs text-slate-400">
                  {room?.status === 'auction'
                    ? 'Your franchise will be marked abandoned and frozen. It will NOT be replaced by an AI bot.'
                    : 'You will leave the lobby and your team reservation will be released.'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
              <p>• Roster and purse spent remain permanently recorded.</p>
              <p>• Other participants can continue the auction without interruption.</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLeave}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-md"
              >
                Confirm & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

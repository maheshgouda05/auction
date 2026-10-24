import React, { useState } from 'react';
import { PlayerData } from '../types';

interface PlayerAvatarProps {
  player: PlayerData;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  size = 'md',
  className = '',
  showBadge = true
}) => {
  const [imgError, setImgError] = useState(false);

  // Compute initials (max 2 characters)
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(player.name);

  // Role themed gradient and accent colors
  const roleGradients: Record<PlayerData['role'], { bg: string; text: string; border: string; glow: string }> = {
    'batter': {
      bg: 'from-blue-950 via-slate-900 to-indigo-950',
      text: 'text-sky-400',
      border: 'border-sky-500/40',
      glow: 'shadow-sky-500/20'
    },
    'bowler': {
      bg: 'from-emerald-950 via-slate-900 to-teal-950',
      text: 'text-emerald-400',
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-500/20'
    },
    'all-rounder': {
      bg: 'from-purple-950 via-slate-900 to-indigo-950',
      text: 'text-purple-400',
      border: 'border-purple-500/40',
      glow: 'shadow-purple-500/20'
    },
    'wicketkeeper': {
      bg: 'from-amber-950 via-slate-900 to-orange-950',
      text: 'text-amber-400',
      border: 'border-amber-500/40',
      glow: 'shadow-amber-500/20'
    }
  };

  const theme = roleGradients[player.role] || roleGradients['all-rounder'];

  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-10 h-10 text-xs',
    md: 'w-16 h-16 text-base',
    lg: 'w-24 h-24 text-xl',
    xl: 'w-32 h-32 sm:w-40 sm:h-40 text-2xl sm:text-3xl'
  };

  const hasValidImage = player.image && player.image.trim() !== '' && !imgError;

  return (
    <div className={`relative shrink-0 select-none ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-2xl flex flex-col items-center justify-center font-display font-black border-2 ${theme.border} shadow-lg ${theme.glow} bg-gradient-to-br ${theme.bg} overflow-hidden relative`}
      >
        {hasValidImage ? (
          <img
            src={player.image}
            alt={player.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative p-2 text-center">
            {/* Neutral Cricket Silhouette Vector Watermark */}
            <svg
              className="absolute inset-0 w-full h-full opacity-15 text-slate-300 pointer-events-none p-2"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              {player.role === 'bowler' ? (
                // Bowler silhouette delivery action
                <path d="M50 12 A8 8 0 1 0 50 28 A8 8 0 1 0 50 12 Z M46 32 L36 50 L20 46 L14 52 L32 60 L42 46 L46 72 L36 94 L46 94 L54 74 L66 94 L76 94 L62 66 L60 38 L76 44 L80 36 L58 30 Z" />
              ) : player.role === 'wicketkeeper' ? (
                // Wicketkeeper crouch / gloves
                <path d="M50 16 A8 8 0 1 0 50 32 A8 8 0 1 0 50 16 Z M42 36 L30 46 L18 42 L16 50 L28 56 L38 48 L40 68 L24 88 L34 94 L48 76 L62 94 L72 88 L56 68 L58 48 L68 56 L80 50 L78 42 L66 46 L54 36 Z" />
              ) : (
                // Batter stance with bat
                <path d="M50 14 A8 8 0 1 0 50 30 A8 8 0 1 0 50 14 Z M44 34 L32 48 L36 54 L44 44 L44 70 L30 94 L40 94 L50 74 L60 94 L70 94 L54 70 L54 44 L66 52 L78 38 L84 42 L88 28 L72 32 L60 40 L52 34 Z" />
              )}
            </svg>

            {/* Stylized Player Initials */}
            <span className={`relative z-10 tracking-widest font-black ${theme.text}`}>
              {initials}
            </span>

            {/* Sub-label for large avatar size */}
            {(size === 'lg' || size === 'xl') && (
              <span className="relative z-10 text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                {player.nationality === 'India' ? 'IND' : player.nationality.slice(0, 3).toUpperCase()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Role / Nationality Pill Badge */}
      {showBadge && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-slate-700/80 text-slate-200 font-bold text-[9px] uppercase px-2 py-0.5 rounded-full shadow-md whitespace-nowrap flex items-center gap-1">
          <span className={player.isOverseas ? 'text-amber-400' : 'text-sky-400'}>
            {player.isOverseas ? '✈' : '🇮🇳'}
          </span>
          <span>{player.category === 'Uncapped' ? 'Uncapped' : player.role}</span>
        </div>
      )}
    </div>
  );
};

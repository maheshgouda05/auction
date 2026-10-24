import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { getTeamById } from '../data/teams';

interface TeamLogoProps {
  teamId?: string | null;
  teamCode?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showName?: boolean;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({
  teamId,
  teamCode,
  size = 'md',
  className = '',
  showName = false
}) => {
  const [imgError, setImgError] = useState(false);
  const team = getTeamById(teamId) || (teamCode ? getTeamById(teamCode.toLowerCase()) : undefined);

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl'
  };

  if (!team) {
    return (
      <div className={`${sizeClasses[size]} rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-400 ${className}`}>
        IPL
      </div>
    );
  }

  // Official Emblems Vector Elements for Authentic Visuals
  const renderEmblem = () => {
    switch (team.id) {
      case 'csk':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <path d="M50 5 L85 25 L85 65 C85 85 50 95 50 95 C50 95 15 85 15 65 L15 25 Z" fill="#FACC15" stroke="#1E3A8A" strokeWidth="4" />
            <path d="M50 22 C42 22 36 28 36 36 C36 44 42 50 50 50 C58 50 64 44 64 36 C64 28 58 22 50 22 Z" fill="#EA580C" />
            <path d="M35 45 C40 60 60 60 65 45 C70 65 30 65 35 45 Z" fill="#1E3A8A" />
            <text x="50" y="80" textAnchor="middle" fill="#1E3A8A" fontWeight="900" fontSize="16" fontFamily="sans-serif">CSK</text>
          </svg>
        );
      case 'mi':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <circle cx="50" cy="50" r="44" fill="#004BA0" stroke="#D4AF37" strokeWidth="4" />
            <path d="M50 15 L56 38 L80 38 L60 52 L68 76 L50 62 L32 76 L40 52 L20 38 L44 38 Z" fill="#D4AF37" />
            <circle cx="50" cy="50" r="14" fill="#004BA0" stroke="#38BDF8" strokeWidth="3" />
            <text x="50" y="55" textAnchor="middle" fill="#FFFFFF" fontWeight="900" fontSize="14" fontFamily="sans-serif">MI</text>
          </svg>
        );
      case 'rcb':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <path d="M50 5 L88 20 L88 65 C88 85 50 98 50 98 C50 98 12 85 12 65 L12 20 Z" fill="#DC2626" stroke="#111827" strokeWidth="4" />
            <path d="M50 12 L78 24 L78 58 C78 74 50 86 50 86 C50 86 22 74 22 58 L22 24 Z" fill="#111827" />
            <path d="M50 25 L58 40 L42 40 Z" fill="#EAB308" />
            <circle cx="50" cy="46" r="12" fill="#EAB308" />
            <text x="50" y="76" textAnchor="middle" fill="#EAB308" fontWeight="900" fontSize="18" fontFamily="sans-serif">RCB</text>
          </svg>
        );
      case 'kkr':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <path d="M50 5 L88 22 L88 65 C88 85 50 96 50 96 C50 96 12 85 12 65 L12 22 Z" fill="#3B185F" stroke="#D4AF37" strokeWidth="4" />
            <path d="M50 18 L70 34 L62 60 L38 60 L30 34 Z" fill="#D4AF37" />
            <path d="M50 24 L60 36 L40 36 Z" fill="#3B185F" />
            <text x="50" y="82" textAnchor="middle" fill="#FFFFFF" fontWeight="900" fontSize="16" fontFamily="sans-serif">KKR</text>
          </svg>
        );
      case 'srh':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <path d="M50 6 L90 25 L80 85 L20 85 L10 25 Z" fill="#EA580C" stroke="#18181B" strokeWidth="4" />
            <circle cx="50" cy="40" r="18" fill="#FACC15" />
            <path d="M25 45 C35 30 65 30 75 45 C65 60 35 60 25 45 Z" fill="#18181B" />
            <text x="50" y="78" textAnchor="middle" fill="#FFFFFF" fontWeight="900" fontSize="17" fontFamily="sans-serif">SRH</text>
          </svg>
        );
      case 'rr':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <path d="M50 8 C72 8 90 26 90 50 C90 74 72 92 50 92 C28 92 10 74 10 50 C10 26 28 8 50 8 Z" fill="#DB2777" stroke="#1D4ED8" strokeWidth="4" />
            <path d="M30 32 L40 24 L50 32 L60 24 L70 32 L65 48 L35 48 Z" fill="#FACC15" />
            <text x="50" y="76" textAnchor="middle" fill="#FFFFFF" fontWeight="900" fontSize="22" fontFamily="sans-serif">RR</text>
          </svg>
        );
      case 'dc':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <path d="M50 6 L88 22 L88 65 C88 85 50 96 50 96 C50 96 12 85 12 65 L12 22 Z" fill="#0284C7" stroke="#DC2626" strokeWidth="4" />
            <path d="M30 40 C35 25 65 25 70 40 C65 55 35 55 30 40 Z" fill="#DC2626" />
            <path d="M42 45 L58 45 L50 55 Z" fill="#FACC15" />
            <text x="50" y="82" textAnchor="middle" fill="#FFFFFF" fontWeight="900" fontSize="20" fontFamily="sans-serif">DC</text>
          </svg>
        );
      case 'pbks':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <path d="M50 6 L88 20 L88 65 C88 85 50 96 50 96 C50 96 12 85 12 65 L12 20 Z" fill="#E11D48" stroke="#D1D5DB" strokeWidth="4" />
            <path d="M50 18 C40 18 32 26 32 36 C32 46 40 54 50 54 C60 54 68 46 68 36 C68 26 60 18 50 18 Z" fill="#D1D5DB" />
            <text x="50" y="80" textAnchor="middle" fill="#FFFFFF" fontWeight="900" fontSize="16" fontFamily="sans-serif">PBKS</text>
          </svg>
        );
      case 'gt':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <polygon points="50,6 92,48 50,94 8,48" fill="#1E293B" stroke="#FBBF24" strokeWidth="4" />
            <polygon points="50,18 80,48 50,80 20,48" fill="#0F172A" />
            <text x="50" y="56" textAnchor="middle" fill="#FBBF24" fontWeight="900" fontSize="20" fontFamily="sans-serif">GT</text>
          </svg>
        );
      case 'lsg':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <path d="M50 6 L90 24 L84 84 L50 96 L16 84 L10 24 Z" fill="#0D9488" stroke="#EA580C" strokeWidth="4" />
            <path d="M25 40 Q50 20 75 40 Q50 55 25 40 Z" fill="#EA580C" />
            <text x="50" y="78" textAnchor="middle" fill="#FFFFFF" fontWeight="900" fontSize="18" fontFamily="sans-serif">LSG</text>
          </svg>
        );
      default:
        return (
          <span className="font-display font-black" style={{ color: team.textColor }}>
            {team.code}
          </span>
        );
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-display font-black shadow-md ring-1 ring-white/10 overflow-hidden relative ${className}`}
        style={{ backgroundColor: team.primaryColor }}
        title={team.name}
      >
        {team.logo && !imgError ? (
          <img
            src={team.logo}
            alt={team.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-0.5"
          />
        ) : (
          renderEmblem()
        )}
      </div>

      {showName && (
        <span className="font-bold text-white text-xs truncate">
          {team.name}
        </span>
      )}
    </div>
  );
};

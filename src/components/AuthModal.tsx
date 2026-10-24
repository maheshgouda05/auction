import React, { useState } from 'react';
import { X, Shield, Sparkles, User as UserIcon, AlertCircle, ExternalLink, Smartphone, Info } from 'lucide-react';
import { loginWithGoogle, loginWithGoogleRedirect, loginAsGuest, parseAuthError, ParsedAuthError } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [guestName, setGuestName] = useState(() => {
    try {
      return localStorage.getItem('ipl_guest_display_name') || '';
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<ParsedAuthError | null>(null);

  if (!isOpen) return null;

  // Detect mobile user agent
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleGooglePopupLogin = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setAuthError(null);
      const user = await loginWithGoogle();
      if (user) {
        onSuccess();
        onClose();
      }
      // If user is null, it was an intentional user cancellation (e.g. closed popup)
    } catch (err: unknown) {
      const parsed = parseAuthError(err, 'google');
      if (!parsed.isCancelled) {
        setAuthError(parsed);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirectLogin = async () => {
    if (loading) return;
    try {
      setLoading(true);
      setAuthError(null);
      await loginWithGoogleRedirect();
      // The browser will redirect to Google authentication
    } catch (err: unknown) {
      const parsed = parseAuthError(err, 'google');
      setAuthError(parsed);
      setLoading(false);
    }
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!guestName.trim()) {
      setAuthError({
        code: 'validation/empty-name',
        message: 'Please enter a manager or player display name.',
        isCancelled: false
      });
      return;
    }

    try {
      setLoading(true);
      setAuthError(null);
      await loginAsGuest(guestName);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const parsed = parseAuthError(err, 'guest');
      setAuthError(parsed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Glow ambient */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Sign In to Arena</h3>
              <p className="text-xs text-slate-400">Join multiplayer auction room from any phone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Structured, helpful error banner */}
        {authError && !authError.isCancelled && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs space-y-1.5 animate-fade-in">
            <div className="flex items-start gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError.message}</span>
            </div>

            {authError.solution && (
              <div className="mt-1.5 pl-6 text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                <span className="font-bold text-amber-400 block mb-0.5">Configuration Required:</span>
                {authError.solution}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 space-y-4">
          {/* Primary Google Sign In (Popup for Desktop / Direct) */}
          <button
            onClick={handleGooglePopupLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          {/* Alternative Mobile / Strict Popup Redirect button */}
          {(isMobile || authError?.code === 'auth/popup-blocked') && (
            <button
              onClick={handleGoogleRedirectLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 py-2.5 px-3 rounded-xl transition-all text-xs font-semibold"
            >
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              <span>Mobile Sign-In with Redirect (Full Screen)</span>
            </button>
          )}

          <div className="relative flex items-center justify-center py-1">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-widest font-mono">
              OR QUICK GUEST
            </span>
          </div>

          {/* Guest Sign In */}
          <form onSubmit={handleGuestLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Player / Manager Display Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Coach Sharma, DhoniFan7"
                  maxLength={25}
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/80 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !guestName.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Joining as Guest...' : 'Enter as Guest'}</span>
            </button>
          </form>

          <p className="text-[11px] text-center text-slate-500 pt-1 leading-relaxed">
            Your authenticated session syncs in real time with fellow franchise owners.
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import FinancialDisclaimer from '../legal/FinancialDisclaimer';
import TermsOfService from '../legal/TermsOfService';
import PrivacyPolicy from '../legal/PrivacyPolicy';
import AegisShield from '../shared/AegisShield';
import RitualBackdrop from '../shared/RitualBackdrop';

export default function AuthScreen({ recovery = false }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  // True when displayName was hydrated from the cold-open ritual.
  // Surfaces a small "Inscribed during your initiation." hint above the
  // input so the visitor recognises the name they just chose.
  const [nameInscribedFromRitual, setNameInscribedFromRitual] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [acknowledgedDisclaimer, setAcknowledgedDisclaimer] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // 'disclaimer' | 'tos' | 'privacy' | null
  const { signIn, signUp, signInWithProvider, resetPassword, updatePassword, submitting, error, clearError } = useAuthStore();

  // Pre-fill the signup display name with the call sign captured during
  // the cold-open ritual. Read once on mount so user edits aren't
  // overwritten on subsequent renders.
  useEffect(() => {
    try {
      const cs = localStorage.getItem('aegis-call-sign');
      if (cs && !displayName) {
        setDisplayName(cs);
        setNameInscribedFromRitual(true);
      }
    } catch {
      /* private mode / quota — ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOAuth = async (provider) => {
    if (mode === 'signup' && !acknowledgedDisclaimer) {
      useAuthStore.setState({ error: 'You must acknowledge the financial disclaimer to continue' });
      return;
    }
    clearError();
    await signInWithProvider(provider);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'reset') {
      const ok = await resetPassword(email);
      if (ok) setResetSent(true);
    } else if (mode === 'login') {
      await signIn(email, password);
    } else {
      if (!acknowledgedDisclaimer) {
        useAuthStore.setState({ error: 'You must acknowledge the financial disclaimer to continue' });
        return;
      }
      const safeName = (displayName || '').replace(/<[^>]*>/g, '').trim().slice(0, 50) || 'CEO';
      await signUp(email, password, safeName);
    }
  };

  const switchMode = () => {
    clearError();
    setResetSent(false);
    setMode(mode === 'login' ? 'signup' : 'login');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#060a12] flex items-center justify-center overflow-hidden">
      {/* Shared ritual atmosphere — same world as the rest of onboarding */}
      <RitualBackdrop density="subtle" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-4 mb-3">
            <div className="shrink-0">
              <AegisShield size={56} withWordmark={false} glowing />
            </div>
            <div className="text-left">
              <h1 className="text-[#00e5ff] font-mono font-bold text-2xl tracking-[0.3em]" style={{ textShadow: '0 0 20px rgba(0,229,255,0.4)' }}>
                AEGIS
              </h1>
              <p className="text-tactical-text/45 font-mono text-[8px] tracking-[0.4em] uppercase -mt-0.5">
                Knowledge is the shield.
              </p>
            </div>
          </div>

          <p className="font-serif italic text-tactical-text/80 text-[18px] mt-6 leading-relaxed">
            {recovery
              ? 'Set a new password.'
              : mode === 'reset'
              ? 'Reset your password.'
              : mode === 'login'
              ? 'The shield remembers you.'
              : 'Take the shield.'}
          </p>

          {!recovery && mode !== 'reset' && (
            <p className="text-tactical-text/30 font-mono text-[9px] tracking-[0.3em] uppercase mt-3 max-w-xs mx-auto leading-relaxed">
              {mode === 'login'
                ? 'Operator access.'
                : 'Trade, build, and dominate. Learn real finance through strategy gameplay.'}
            </p>
          )}
        </div>

        {/* Recovery: Set New Password */}
        {recovery && (
          <div className="bg-[#0a0e18]/90 border border-[rgba(124,58,237,0.15)] rounded-xl backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.5),0_0_80px_rgba(124,58,237,0.05)]">
            {passwordUpdated ? (
              <div className="flex flex-col gap-4 items-center">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-400 font-mono text-[11px] w-full text-center">
                  Password updated successfully
                </div>
                <button
                  onClick={() => {
                    useAuthStore.setState({ recoveryMode: false });
                  }}
                  className="w-full py-3.5 rounded-lg font-mono text-sm tracking-[0.15em] uppercase font-bold bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/40 hover:bg-[#00e5ff]/20 hover:shadow-[0_0_25px_rgba(0,229,255,0.2)] transition-all"
                >
                  Enter Terminal
                </button>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                clearError();
                if (password !== confirmPassword) {
                  useAuthStore.setState({ error: 'Passwords do not match' });
                  return;
                }
                if (password.length < 8) {
                  useAuthStore.setState({ error: 'Password must be at least 8 characters' });
                  return;
                }
                const ok = await updatePassword(password);
                if (ok) setPasswordUpdated(true);
              }} className="flex flex-col gap-4">
                <div>
                  <label className="block text-tactical-text/40 font-mono text-[9px] tracking-[0.15em] uppercase mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                    className="w-full bg-[#111827]/80 border border-tactical-border/30 rounded-lg px-4 py-3 text-tactical-text font-mono text-sm placeholder:text-tactical-text/20 focus:outline-none focus:border-[#00e5ff]/50 focus:shadow-[0_0_15px_rgba(0,229,255,0.1)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-tactical-text/40 font-mono text-[9px] tracking-[0.15em] uppercase mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    minLength={8}
                    className="w-full bg-[#111827]/80 border border-tactical-border/30 rounded-lg px-4 py-3 text-tactical-text font-mono text-sm placeholder:text-tactical-text/20 focus:outline-none focus:border-[#00e5ff]/50 focus:shadow-[0_0_15px_rgba(0,229,255,0.1)] transition-all"
                  />
                </div>

                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-2.5 text-rose-400 font-mono text-[11px]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-lg font-mono text-sm tracking-[0.15em] uppercase font-bold transition-all duration-300 bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/40 hover:bg-[#00e5ff]/20 hover:shadow-[0_0_25px_rgba(0,229,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#00e5ff]/30 border-t-[#00e5ff] rounded-full animate-spin" />
                      Updating...
                    </span>
                  ) : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Auth Card */}
        {!recovery && (
          <div className="bg-[#0a0e18]/90 border border-[rgba(124,58,237,0.15)] rounded-xl backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.5),0_0_80px_rgba(124,58,237,0.05)]">
          {/* OAuth providers (login + signup, not reset) */}
          {mode !== 'reset' && (
            <>
              <div className="flex flex-col gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={submitting}
                  className="w-full py-3 rounded-lg flex items-center justify-center gap-3 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-tactical-text/80 font-mono text-[11px] tracking-[0.1em] uppercase font-bold">
                    Continue with Google
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth('apple')}
                  disabled={submitting}
                  className="w-full py-3 rounded-lg flex items-center justify-center gap-3 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#fff">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <span className="text-tactical-text/80 font-mono text-[11px] tracking-[0.1em] uppercase font-bold">
                    Continue with Apple
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-tactical-text/25 font-mono text-[8px] tracking-[0.2em] uppercase">or</span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-tactical-text/40 font-mono text-[9px] tracking-[0.15em] uppercase mb-1.5">
                  Commander Name
                </label>
                {nameInscribedFromRitual && (
                  <p className="font-mono uppercase text-[9px] tracking-[0.3em] text-cyan-300/60 mb-1">
                    Inscribed during your initiation.
                  </p>
                )}
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (nameInscribedFromRitual) setNameInscribedFromRitual(false);
                  }}
                  placeholder="Enter your alias"
                  className="w-full bg-[#111827]/80 border border-tactical-border/30 rounded-lg px-4 py-3 text-tactical-text font-mono text-sm placeholder:text-tactical-text/20 focus:outline-none focus:border-[#00e5ff]/50 focus:shadow-[0_0_15px_rgba(0,229,255,0.1)] transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-tactical-text/40 font-mono text-[9px] tracking-[0.15em] uppercase mb-1.5">
                Email
              </label>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commander@aegis.io"
                required
                className="w-full bg-[#111827]/80 border border-tactical-border/30 rounded-lg px-4 py-3 text-tactical-text font-mono text-sm placeholder:text-tactical-text/20 focus:outline-none focus:border-[#00e5ff]/50 focus:shadow-[0_0_15px_rgba(0,229,255,0.1)] transition-all"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-tactical-text/40 font-mono text-[9px] tracking-[0.15em] uppercase mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="w-full bg-[#111827]/80 border border-tactical-border/30 rounded-lg px-4 py-3 text-tactical-text font-mono text-sm placeholder:text-tactical-text/20 focus:outline-none focus:border-[#00e5ff]/50 focus:shadow-[0_0_15px_rgba(0,229,255,0.1)] transition-all"
                />
                {mode === 'signup' && password.length > 0 && (() => {
                  let score = 0;
                  if (password.length >= 8) score++;
                  if (password.length >= 12) score++;
                  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
                  if (/\d/.test(password)) score++;
                  if (/[^A-Za-z0-9]/.test(password)) score++;
                  const label = ['Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'][score];
                  const color = ['#ef4444', '#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'][score];
                  const width = `${Math.max(20, score * 20)}%`;
                  return (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width, backgroundColor: color }} />
                      </div>
                      <span className="text-[8px] font-mono tracking-wider uppercase" style={{ color }}>{label}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Financial disclaimer checkbox (signup only) */}
            {mode === 'signup' && (
              <label className="flex items-start gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acknowledgedDisclaimer}
                  onChange={(e) => setAcknowledgedDisclaimer(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 accent-[#00e5ff] cursor-pointer shrink-0"
                />
                <span className="text-tactical-text/40 font-mono text-[9px] leading-relaxed">
                  I acknowledge that AEGIS Empire is for{' '}
                  <button
                    type="button"
                    onClick={(ev) => { ev.preventDefault(); setLegalModal('disclaimer'); }}
                    className="text-[#00e5ff]/70 hover:text-[#00e5ff] underline underline-offset-2"
                  >
                    educational and entertainment purposes only
                  </button>
                  , does not provide financial advice, and that all trading is simulated. I agree to the{' '}
                  <button
                    type="button"
                    onClick={(ev) => { ev.preventDefault(); setLegalModal('tos'); }}
                    className="text-[#00e5ff]/70 hover:text-[#00e5ff] underline underline-offset-2"
                  >
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button
                    type="button"
                    onClick={(ev) => { ev.preventDefault(); setLegalModal('privacy'); }}
                    className="text-[#00e5ff]/70 hover:text-[#00e5ff] underline underline-offset-2"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-2.5 text-rose-400 font-mono text-[11px]">
                {error}
              </div>
            )}

            {mode === 'reset' && resetSent && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5 text-emerald-400 font-mono text-[11px]">
                Reset link sent — check your email inbox
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (mode === 'reset' && resetSent) || (mode === 'signup' && !acknowledgedDisclaimer)}
              className="w-full py-3.5 rounded-lg font-mono text-sm tracking-[0.15em] uppercase font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: mode === 'signup'
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(0,229,255,0.15))'
                  : 'rgba(0,229,255,0.1)',
                color: '#00e5ff',
                border: mode === 'signup'
                  ? '1px solid rgba(124,58,237,0.4)'
                  : '1px solid rgba(0,229,255,0.4)',
                boxShadow: '0 0 20px rgba(124,58,237,0.1)',
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#00e5ff]/30 border-t-[#00e5ff] rounded-full animate-spin" />
                  Processing...
                </span>
              ) : mode === 'reset' ? (
                resetSent ? 'Check your email' : 'Send Reset Link'
              ) : mode === 'login' ? (
                'Access Terminal'
              ) : (
                'Begin Your Journey'
              )}
            </button>

            {/* Signup feature highlights */}
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { icon: '📈', text: 'Real market simulation' },
                  { icon: '🏛️', text: 'Build your empire' },
                  { icon: '🤖', text: 'AI-powered Athena' },
                  { icon: '🎓', text: 'Earn certifications' },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-1.5 text-tactical-text/30 font-mono text-[8px] tracking-wide">
                    <span className="text-[10px]">{f.icon}</span>
                    <span>{f.text}</span>
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* Forgot password link (login mode only) */}
          {mode === 'login' && (
            <div className="mt-3 text-center">
              <button
                onClick={() => { clearError(); setResetSent(false); setMode('reset'); }}
                className="text-tactical-text/30 font-mono text-[9px] tracking-[0.1em] hover:text-[#00e5ff] transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-[rgba(124,58,237,0.12)] text-center flex flex-col gap-2">
            <button
              onClick={switchMode}
              className="text-tactical-text/40 font-mono text-[10px] tracking-[0.1em] hover:text-[#a78bfa] transition-colors"
            >
              {mode === 'reset'
                ? '← Back to sign in'
                : mode === 'login'
                ? "New here? Create your account"
                : 'Already a commander? Sign in'}
            </button>
            <button
              onClick={() => useAuthStore.getState().enterGuestMode()}
              className="text-tactical-text/20 font-mono text-[9px] tracking-[0.1em] hover:text-tactical-text/40 transition-colors mt-1"
            >
              Explore as guest (offline only)
            </button>
          </div>
        </div>)}

        {/* Starting balance info */}
        {!recovery && mode === 'signup' && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
              <span className="text-emerald-400 font-mono text-[11px]">
                Starting Capital: <span className="font-bold">100,000</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legal modals */}
      {legalModal === 'disclaimer' && <FinancialDisclaimer onClose={() => setLegalModal(null)} />}
      {legalModal === 'tos' && <TermsOfService onClose={() => setLegalModal(null)} />}
      {legalModal === 'privacy' && <PrivacyPolicy onClose={() => setLegalModal(null)} />}
    </div>
  );
}

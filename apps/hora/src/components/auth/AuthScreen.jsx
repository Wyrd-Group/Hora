/**
 * Hora — minimal auth screen. Replaces AEGIS's AuthScreen entirely.
 */
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import HoraOrb from '../shared/HoraOrb';
import HoraBackdrop from '../shared/HoraBackdrop';
import JuicyButton from '../shared/JuicyButton';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [callSign, setCallSign] = useState('');
  const { signIn, signUp, submitting, error, clearError } = useAuthStore();

  const onSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (mode === 'signin') await signIn(email.trim(), password);
    else {
      const safeName = (callSign || '').trim().slice(0, 24) || 'Player';
      await signUp(email.trim(), password, safeName);
    }
  };

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <HoraBackdrop density="full" />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-6 py-10">
        <div className="flex flex-col items-center gap-3 mb-8">
          <HoraOrb size={104} animated />
          <h1 className="hora-wordmark text-6xl" style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700 }}>Hora</h1>
          <p className="text-sm" style={{ fontFamily: 'Nunito, system-ui, sans-serif', color: 'rgba(26,21,48,0.65)', fontWeight: 700, letterSpacing: 0.3 }}>
            Tap. Build. Raid. Repeat.
          </p>
        </div>
        <form onSubmit={onSubmit} className="w-full max-w-sm rounded-3xl p-6 shadow-xl" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}>
          <h2 className="text-2xl font-bold text-center mb-1" style={{ fontFamily: 'Fredoka, system-ui, sans-serif', color: '#1A1530' }}>
            {mode === 'signin' ? 'Welcome back' : 'Pick a call sign'}
          </h2>
          <p className="text-center text-sm mb-5" style={{ color: '#5C5470' }}>
            {mode === 'signin' ? 'Your treasury is waiting.' : 'This is what the Oracle will call you.'}
          </p>
          {mode === 'signup' && (
            <input type="text" value={callSign} onChange={(e) => setCallSign(e.target.value)} placeholder="Call sign" maxLength={24}
              className="w-full mb-3 px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-amber-400 transition-colors"
              style={{ borderColor: 'rgba(0,0,0,0.08)', fontFamily: 'Nunito, system-ui, sans-serif' }} required />
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
            className="w-full mb-3 px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-amber-400 transition-colors"
            style={{ borderColor: 'rgba(0,0,0,0.08)', fontFamily: 'Nunito, system-ui, sans-serif' }}
            autoComplete="email" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
            className="w-full mb-4 px-4 py-3 rounded-xl border-2 focus:outline-none focus:border-amber-400 transition-colors"
            style={{ borderColor: 'rgba(0,0,0,0.08)', fontFamily: 'Nunito, system-ui, sans-serif' }}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={6} required />
          {error && <p className="text-sm mb-3 text-center" style={{ color: '#FF5C6E', fontWeight: 600 }}>{error}</p>}
          <JuicyButton type="submit" disabled={submitting} size="lg" fullWidth variant="primary">
            {submitting ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </JuicyButton>
          <button type="button" onClick={() => { clearError(); setMode(mode === 'signin' ? 'signup' : 'signin'); }}
            className="w-full mt-4 text-sm font-bold transition-colors"
            style={{ color: '#7C5CFF', fontFamily: 'Fredoka, system-ui, sans-serif' }}>
            {mode === 'signin' ? 'New here? Create a call sign →' : '← Already playing? Sign in'}
          </button>
        </form>
        <p className="text-xs text-center mt-8 max-w-xs" style={{ color: 'rgba(26,21,48,0.5)', fontFamily: 'Nunito, system-ui, sans-serif' }}>
          Hora is a strategy game with a financial theme. Nothing in the game is financial advice. No real-money trading.
        </p>
      </div>
    </div>
  );
}

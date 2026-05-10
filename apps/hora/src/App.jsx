/**
 * Hora — app shell.
 *
 *   loading       → splash
 *   not signed in → AuthScreen
 *   signed in     → bottom-nav + active screen
 *
 * The TreasuryHome at active='base' is the real game loop; the other
 * tabs are placeholders pending their implementations.
 */
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import AuthScreen from './components/auth/AuthScreen';
import BottomNav from './components/nav/BottomNav';
import HoraBackdrop from './components/shared/HoraBackdrop';
import HoraOrb from './components/shared/HoraOrb';
import TreasuryHome from './screens/TreasuryHome';

function Placeholder({ title, blurb }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 pt-24">
      <h2 className="text-3xl font-bold" style={{ fontFamily: 'Fredoka, system-ui, sans-serif', color: '#1A1530' }}>{title}</h2>
      <p className="text-sm text-center max-w-xs" style={{ color: 'rgba(26,21,48,0.55)', fontFamily: 'Nunito, system-ui, sans-serif' }}>{blurb}</p>
    </div>
  );
}

function Splash() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <HoraBackdrop density="subtle" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <HoraOrb size={140} animated />
        <h1 className="hora-wordmark text-6xl" style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700 }}>Hora</h1>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, initialize } = useAuthStore();
  const [activeTab, setActiveTab] = useState('base');

  useEffect(() => { void initialize(); }, [initialize]);

  if (loading) return <Splash />;
  if (!user) return <AuthScreen />;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <HoraBackdrop density="full" />
      <main className="absolute inset-0 overflow-y-auto pb-24">
        {activeTab === 'base' && <TreasuryHome />}
        {activeTab === 'raid' && <Placeholder title="Raid" blurb="Find offline opponents. Steal alpha. 30-second timed engagements. Coming soon." />}
        {activeTab === 'funds' && <Placeholder title="Funds" blurb="50-member coordinated raid groups. Real-time chat. Post-MVP." />}
        {activeTab === 'league' && <Placeholder title="League" blurb="Global leaderboard by alpha generation. Seasons last 8 weeks. Coming soon." />}
        {activeTab === 'profile' && <Placeholder title="You" blurb="Your call sign, your trophies, your settings, and a sign-out button. Coming soon." />}
      </main>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}

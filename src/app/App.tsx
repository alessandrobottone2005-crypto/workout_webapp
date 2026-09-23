/* ============================================
   APP — Root component
   DB init, seed, error boundary
   ============================================ */

import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AppRouter } from './router';
import { seedDatabase } from '@/db/seed';
import { useTimerStore, unlockAudio } from '@/features/timer/timerStore';
import { useWorkoutStore } from '@/stores/workoutStore';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-bg-app px-5 text-center">
          <p className="text-heading text-text-primary mb-2">Qualcosa è andato storto</p>
          <p className="text-meta text-text-secondary mb-6">
            {this.state.error?.message ?? 'Errore sconosciuto'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="min-h-[44px] px-4 inline-flex items-center justify-center rounded-btn text-accent-primary text-meta font-semibold"
          >
            Ricarica l'app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loadFromDB } = useTimerStore();
  const { loadActiveWorkout } = useWorkoutStore();

  useEffect(() => {
    const init = async () => {
      try {
        await seedDatabase();
        // Hydrate timer + active workout before any route mounts,
        // so a browser reload anywhere recovers full workout state.
        await Promise.all([loadFromDB(), loadActiveWorkout()]);
        setReady(true);
      } catch (e) {
        console.error('Init error:', e);
        setError('Errore di inizializzazione del database.');
      }
    };
    void init();

    // Unlock audio on first interaction
    const unlock = () => {
      unlockAudio();
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('click', unlock);

    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, [loadFromDB, loadActiveWorkout]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-bg-app px-5 text-center">
        <p className="text-heading text-text-primary mb-2">Errore</p>
        <p className="text-meta text-text-secondary mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="min-h-[44px] px-4 inline-flex items-center justify-center rounded-btn text-accent-primary text-meta font-semibold"
        >
          Riprova
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-bg-app">
        <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => (
  <ErrorBoundary>
    {/* Respect OS-level reduced motion settings for all Framer Motion animations */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AppInitializer>
          <AppRouter />
        </AppInitializer>
      </BrowserRouter>
    </MotionConfig>
  </ErrorBoundary>
);

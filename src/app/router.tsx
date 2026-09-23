/* ============================================
   ROUTER — Application routes
   ============================================ */

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Eager load workout path for speed
import { HomeScreen } from '@/features/home/HomeScreen';
import { WorkoutOverviewScreen } from '@/features/workout/WorkoutOverviewScreen';
import { ExerciseFocusScreen } from '@/features/workout/ExerciseFocusScreen';
import { WorkoutCompletedScreen } from '@/features/workout/WorkoutCompletedScreen';

// Lazy load secondary screens
const ProgramScreen = lazy(() =>
  import('@/features/program/ProgramScreen').then((m) => ({ default: m.ProgramScreen }))
);
const SessionDetailScreen = lazy(() =>
  import('@/features/program/ProgramScreen').then((m) => ({ default: m.SessionDetailScreen }))
);
const EditSessionScreen = lazy(() =>
  import('@/features/program/EditSessionScreen').then((m) => ({ default: m.EditSessionScreen }))
);
const EditExerciseScreen = lazy(() =>
  import('@/features/program/EditExerciseScreen').then((m) => ({ default: m.EditExerciseScreen }))
);
const ProgressScreen = lazy(() =>
  import('@/features/progress/ProgressScreen').then((m) => ({ default: m.ProgressScreen }))
);
const ExerciseHistoryScreen = lazy(() =>
  import('@/features/progress/ProgressScreen').then((m) => ({
    default: m.ExerciseHistoryScreen,
  }))
);
const CalendarScreen = lazy(() =>
  import('@/features/calendar/CalendarScreen').then((m) => ({ default: m.CalendarScreen }))
);
const SettingsScreen = lazy(() =>
  import('@/features/settings/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);

const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[100dvh] bg-bg-app">
    <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
  </div>
);

const NotFoundScreen = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] bg-bg-app px-5 text-center">
    <p className="text-heading text-text-primary mb-2">404</p>
    <p className="text-meta text-text-secondary mb-6">Pagina non trovata</p>
    <a href="/" className="text-accent-primary text-meta font-semibold">
      Torna alla home
    </a>
  </div>
);

export const AppRouter: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          {/* Home */}
          <Route path="/" element={<HomeScreen />} />

          {/* Program */}
          <Route path="/program" element={<ProgramScreen />} />
          <Route path="/program/:programId/edit" element={<ProgramScreen />} />
          <Route path="/program/session/:sessionId" element={<SessionDetailScreen />} />
          <Route path="/program/session/:sessionId/edit" element={<EditSessionScreen />} />

          {/* Exercise edit */}
          <Route path="/exercise/:exerciseId/edit" element={<EditExerciseScreen />} />

          {/* Workout */}
          <Route path="/workout/:workoutId" element={<WorkoutOverviewScreen />} />
          <Route
            path="/workout/:workoutId/exercise/:exerciseId"
            element={<ExerciseFocusScreen />}
          />
          <Route
            path="/workout/:workoutId/complete"
            element={<WorkoutCompletedScreen />}
          />

          {/* Progress */}
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/progress/exercise/:exerciseId" element={<ExerciseHistoryScreen />} />

          {/* Calendar */}
          <Route path="/calendar" element={<CalendarScreen />} />

          {/* Settings */}
          <Route path="/settings" element={<SettingsScreen />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

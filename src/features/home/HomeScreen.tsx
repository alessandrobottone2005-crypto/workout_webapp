/* ============================================
   HOME SCREEN
   Shows today's workout, last workout, weekly progress
   ============================================ */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Dumbbell, TrendingUp, Settings } from 'lucide-react';
import { AppShell } from '@/components/layout';
import { Button, ProgressBar, EmptyState, AppLogo, ScreenTitle, IconButton } from '@/components/ui';
import { programRepo, workoutRepo } from '@/db/repositories';
import { useWorkoutStore } from '@/stores/workoutStore';
import { getNextSessionId, getWorkoutMetrics } from '@/lib/selectors';
import { getRepresentativeWeight } from '@/lib/selectors';
import {
  formatDuration,
  formatWeight,
} from '@/lib/formatters';
import { strings } from '@/lib/strings';
import type { Program, SessionTemplate, Workout } from '@/types';



export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { activeWorkout, loadActiveWorkout } = useWorkoutStore();
  const [program, setProgram] = useState<Program | null>(null);
  const [completedWorkouts, setCompletedWorkouts] = useState<Workout[]>([]);
  const [nextSession, setNextSession] = useState<SessionTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Buongiorno' : hour < 17 ? 'Buon pomeriggio' : 'Buonasera';

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await loadActiveWorkout();
      const [prog, workouts] = await Promise.all([
        programRepo.getFirst(),
        workoutRepo.getCompleted(),
      ]);
      setProgram(prog ?? null);
      setCompletedWorkouts(workouts);

      if (prog && prog.sessions.length > 0) {
        const nextId = getNextSessionId(prog.sessions, workouts);
        const next = prog.sessions.find((s) => s.id === nextId) ?? null;
        setNextSession(next);
      }
      setIsLoading(false);
    };
    void load();
  }, [loadActiveWorkout]);

  const lastWorkout = completedWorkouts[0];
  const metrics = getWorkoutMetrics(completedWorkouts);
  const weekTarget = 4; // from program eventually

  const handleStart = async () => {
    if (!program || !nextSession) return;
    const workout = await useWorkoutStore.getState().startWorkout(program.id, {
      id: nextSession.id,
      name: nextSession.name,
      exercises: nextSession.exercises,
    });
    navigate(`/workout/${workout.id}`);
  };

  const handleResume = () => {
    if (activeWorkout) navigate(`/workout/${activeWorkout.id}`);
  };

  // Get strength exercises from last workout for progress display
  const lastWorkoutProgress = lastWorkout?.exerciseLogs
    .filter((e) => e.exerciseTypeSnapshot === 'strength' && e.status === 'completed' && e.setLogs.length > 0)
    .slice(0, 2)
    .map((e) => ({
      name: e.exerciseNameSnapshot,
      weight: getRepresentativeWeight(e),
    })) ?? [];

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))]">
        {/* Header: LogoDef + Greeting */}
        <div className="pt-[calc(env(safe-area-inset-top)+16px)] px-5 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4"
          >
            <AppLogo width={156} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <ScreenTitle size="lg" className="tracking-[-0.42px]">
                  {greeting}
                </ScreenTitle>
                <p className="text-body text-text-secondary mt-1">
                  {strings.home.subtitle}
                </p>
              </div>
              <IconButton
                label="Impostazioni"
                onClick={() => navigate('/settings')}
                className="-mr-2 -mt-1"
              >
                <Settings className="w-5 h-5" strokeWidth={2} />
              </IconButton>
            </div>
          </motion.div>
        </div>

        <div className="px-5 space-y-4">
          {/* Resume Active Workout Banner */}
          {activeWorkout && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-accent-primary/10 border border-accent-primary/30 rounded-card p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-label-sm text-accent-primary mb-0.5">
                  ALLENAMENTO IN CORSO
                </p>
                <p className="text-heading text-text-primary">
                  {activeWorkout.sessionNameSnapshot}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleResume}
              >
                Riprendi
              </Button>
            </motion.div>
          )}

          {/* Today's Workout Card */}
          {nextSession && !activeWorkout ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-bg-surface rounded-card border border-border-default overflow-hidden"
            >
              <div className="p-5 pb-4">
                <p className="text-label-sm text-text-secondary mb-3">
                  {strings.home.todayLabel}
                </p>
                <h2 className="screen-title text-[28px] leading-tight">
                  {nextSession.name.toUpperCase()}
                </h2>
                <p className="text-meta text-text-secondary mt-1">
                  {nextSession.exercises.length} esercizi
                </p>
                <div className="mt-4 space-y-2">
                  {nextSession.exercises.slice(0, 3).map((ex) => (
                    <div key={ex.id} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-primary/60" />
                      <span className="text-meta text-text-secondary">{ex.name}</span>
                      {ex.type === 'strength' && ex.sets && (
                        <span className="text-meta text-text-secondary opacity-50">
                          {ex.sets} × {ex.targetReps}
                        </span>
                      )}
                    </div>
                  ))}
                  {nextSession.exercises.length > 3 && (
                    <p className="text-meta text-text-secondary opacity-50 pl-3.5">
                      +{nextSession.exercises.length - 3} altri
                    </p>
                  )}
                </div>
              </div>
              <div className="px-5 pb-5">
                <Button variant="primary" fullWidth onClick={handleStart}>
                  {strings.home.startWorkout}
                </Button>
              </div>
            </motion.div>
          ) : !activeWorkout && !isLoading ? (
            <EmptyState
              icon={<Dumbbell className="w-8 h-8" />}
              title="Nessuna scheda"
              description={strings.home.noProgram}
              action={
                <Button variant="secondary" size="sm" onClick={() => navigate('/program')}>
                  Vai alla scheda
                </Button>
              }
            />
          ) : null}

          {/* Last Workout */}
          {lastWorkout ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-bg-surface rounded-card border border-border-default p-5"
            >
              <p className="text-label-sm text-text-secondary mb-3">
                {strings.home.lastWorkout}
              </p>
              <button
                className="w-full text-left"
                onClick={() => navigate(`/workout/${lastWorkout.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-heading text-text-primary">
                      {lastWorkout.sessionNameSnapshot}
                    </h3>
                    <p className="text-meta text-text-secondary mt-0.5">
                      {lastWorkout.completedAt
                        ? formatDuration(lastWorkout.completedAt - lastWorkout.startedAt)
                        : '—'}
                      {' · '}
                      {lastWorkout.exerciseLogs.filter((e) => e.status === 'completed').length} esercizi
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-secondary mt-0.5" />
                </div>

                {lastWorkoutProgress.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {lastWorkoutProgress.map((ex) => (
                      <div key={ex.name} className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-accent-primary" />
                        <span className="text-meta text-text-secondary">
                          {ex.name}
                        </span>
                        <span className="text-meta text-accent-primary font-semibold ml-auto">
                          {formatWeight(ex.weight)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-bg-surface rounded-card border border-border-default p-5"
            >
              <p className="text-label-sm text-text-secondary mb-2">
                {strings.home.lastWorkout}
              </p>
              <p className="text-meta text-text-secondary">
                {strings.home.noWorkoutHistory}
              </p>
            </motion.div>
          )}

          {/* Weekly Progress */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-bg-surface rounded-card border border-border-default p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-label-sm text-text-secondary">
                {strings.home.thisWeek}
              </p>
              <p className="text-meta text-text-primary font-semibold">
                {metrics.thisWeekCount} / {weekTarget} workout
              </p>
            </div>
            <ProgressBar value={metrics.thisWeekCount / weekTarget} />
            <div className="flex gap-2 mt-4">
              {Array.from({ length: weekTarget }, (_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[18px] ${
                    i < metrics.thisWeekCount
                      ? 'text-accent-primary'
                      : 'text-text-secondary opacity-30'
                  }`}
                >
                  ●
                </div>
              ))}
            </div>
            {metrics.currentStreak > 0 && (
              <p className="text-meta text-text-secondary mt-3">
                🔥 Streak:{' '}
                <span className="text-text-primary font-semibold">
                  {metrics.currentStreak} giorni
                </span>
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
};

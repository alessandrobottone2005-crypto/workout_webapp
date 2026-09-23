/* ============================================
   WORKOUT COMPLETED SCREEN
   Summary of the completed workout session
   ============================================ */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui';
import { workoutRepo } from '@/db/repositories';
import { getRepresentativeWeight } from '@/lib/selectors';
import { formatDuration, formatWeight } from '@/lib/formatters';
import { strings } from '@/lib/strings';
import { useTimerStore } from '@/features/timer/timerStore';
import type { Workout } from '@/types';

export const WorkoutCompletedScreen: React.FC = () => {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { stopTimer } = useTimerStore();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [prevWorkoutLogs, setPrevWorkoutLogs] = useState<
    Map<string, number>
  >(new Map());

  useEffect(() => {
    const load = async () => {
      if (!workoutId) return;
      const w = await workoutRepo.getById(workoutId);
      if (!w) return;
      setWorkout(w);

      // Load previous weights for comparison
      const prevMap = new Map<string, number>();
      for (const exLog of w.exerciseLogs) {
        if (exLog.status !== 'completed' || exLog.exerciseTypeSnapshot === 'cardio') continue;
        const prevPerfs = await workoutRepo.getAllPerformancesForExercise(
          exLog.exerciseTemplateId
        );
        // Find the workout BEFORE this one
        const beforeThis = prevPerfs.filter(
          (p) => p.workoutDate < w.startedAt
        );
        if (beforeThis.length > 0) {
          const lastPrev = beforeThis[beforeThis.length - 1];
          prevMap.set(
            exLog.exerciseTemplateId,
            getRepresentativeWeight(lastPrev.log)
          );
        }
      }
      setPrevWorkoutLogs(prevMap);
    };
    void load();
    void stopTimer(); // Stop any running rest timer
  }, [workoutId, stopTimer]);

  const handleFinish = () => {
    navigate('/', { replace: true });
  };

  if (!workout) {
    return (
      <AppShell showNav={false}>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  const duration =
    workout.completedAt && workout.startedAt
      ? workout.completedAt - workout.startedAt
      : 0;

  const completedExLogs = workout.exerciseLogs.filter(
    (e) => e.status === 'completed'
  );
  const totalSets = completedExLogs.reduce(
    (sum, e) => sum + e.setLogs.length,
    0
  );

  // Build progress deltas
  const progressItems = completedExLogs
    .filter((e) => e.exerciseTypeSnapshot === 'strength' && e.setLogs.length > 0)
    .map((e) => {
      const current = getRepresentativeWeight(e);
      const prev = prevWorkoutLogs.get(e.exerciseTemplateId);
      return { name: e.exerciseNameSnapshot, current, prev };
    })
    .filter((p) => p.prev !== undefined && p.current !== p.prev)
    .slice(0, 4);

  return (
    <AppShell showNav={false}>
      <div className="flex-1 flex flex-col items-start justify-center px-5 pb-[calc(40px+env(safe-area-inset-bottom))]">
        {/* Success icon — 64px lime Check (Figma) */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 180 }}
          className="mb-4"
        >
          <Check className="w-16 h-16 text-accent-primary" strokeWidth={2} />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4 w-full"
        >
          <h1 className="screen-title text-[28px] leading-[38px] tracking-[-0.42px] whitespace-pre-line">
            {strings.workoutComplete.title}
          </h1>
          <p className="text-[16px] font-semibold text-text-secondary mt-3 whitespace-pre">
            {formatDuration(duration)}
            {'     '}
            {completedExLogs.length} esercizi
            {'     '}
            {totalSets} serie
          </p>
        </motion.div>

        {/* Stats (E2E labels) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full mb-5"
        >
          <div className="grid grid-cols-3 gap-4 text-left">
            <div>
              <p className="text-[28px] font-bold text-text-primary">
                {formatDuration(duration)}
              </p>
              <p className="text-label-sm text-text-secondary mt-1">DURATA</p>
            </div>
            <div>
              <p className="text-[28px] font-bold text-text-primary">
                {completedExLogs.length}
              </p>
              <p className="text-label-sm text-text-secondary mt-1">ESERCIZI</p>
            </div>
            <div>
              <p className="text-[28px] font-bold text-text-primary">{totalSets}</p>
              <p className="text-label-sm text-text-secondary mt-1">SERIE</p>
            </div>
          </div>
        </motion.div>

        {/* Progress deltas */}
        {progressItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full bg-bg-surface rounded-card border border-border-default p-5 mb-8"
          >
            <p className="text-label-sm text-text-secondary mb-3">
              {strings.workoutComplete.progress}
            </p>
            <div className="space-y-2">
              {progressItems.map((item) => {
                const isUp = (item.current ?? 0) > (item.prev ?? 0);
                return (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="text-meta text-text-primary">{item.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-meta text-text-secondary">
                        {formatWeight(item.prev!)}
                      </span>
                      <span className="text-text-secondary text-meta">→</span>
                      <span
                        className={`text-meta font-semibold ${
                          isUp ? 'text-accent-primary' : 'text-danger'
                        }`}
                      >
                        {formatWeight(item.current)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full"
        >
          <Button variant="primary" fullWidth onClick={handleFinish}>
            {strings.workoutComplete.end}
          </Button>
        </motion.div>
      </div>
    </AppShell>
  );
};

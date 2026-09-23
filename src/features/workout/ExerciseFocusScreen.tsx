/* ============================================
   EXERCISE FOCUS SCREEN — Most important screen
   Set logging, reps stepper, weight display, rest
   ============================================ */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft } from 'lucide-react';
import { AppShell } from '@/components/layout';
import { Button, NumericStepper } from '@/components/ui';
import { RestPresets } from '@/features/timer/TimerComponents';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useTimerStore } from '@/features/timer/timerStore';
import { workoutRepo, programRepo, settingsRepo } from '@/db/repositories';
import { formatWeight, formatWeightValue } from '@/lib/formatters';
import { strings } from '@/lib/strings';
import type { WorkoutExerciseLog } from '@/types';
import { WeightEditorSheet } from './WeightEditorSheet';

export const ExerciseFocusScreen: React.FC = () => {
  const { workoutId, exerciseId } = useParams<{
    workoutId: string;
    exerciseId: string;
  }>();
  const navigate = useNavigate();
  const { activeWorkout, resumeWorkout, completeSet, startExercise, completeExercise } =
    useWorkoutStore();
  const { timer, startTimer } = useTimerStore();

  const [exerciseLog, setExerciseLog] = useState<WorkoutExerciseLog | null>(null);
  const [reps, setReps] = useState(8);
  const [weight, setWeight] = useState(0);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [lastReps, setLastReps] = useState<number | null>(null);
  const [showWeightEditor, setShowWeightEditor] = useState(false);
  const [isCompletingSet, setIsCompletingSet] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [preferredRest, setPreferredRest] = useState(90);
  // Guards one-time initialization per exercise so that completing a set
  // (which updates the workout) never overwrites the user's current input.
  const initForExerciseRef = useRef<string | null>(null);

  const workout = activeWorkout;

  // Fallback: hydrate the workout from DB if the store is empty
  // (e.g. deep-link / reload directly on this route).
  useEffect(() => {
    if (!workoutId) return;
    if (activeWorkout?.id === workoutId) return;
    let cancelled = false;
    void workoutRepo.getById(workoutId).then((w) => {
      if (cancelled || !w) return;
      if (w.status === 'active') resumeWorkout(w);
    });
    return () => {
      cancelled = true;
    };
  }, [workoutId, activeWorkout?.id, resumeWorkout]);

  useEffect(() => {
    if (!workout || !exerciseId) return;
    // Already initialized for this exercise — do not reset user input
    if (initForExerciseRef.current === exerciseId) return;

    const log = workout.exerciseLogs.find((e) => e.id === exerciseId);
    if (!log) return;

    initForExerciseRef.current = exerciseId;
    setExerciseLog(log);

    // If exercise is pending, mark it as active
    if (log.status === 'pending') {
      void startExercise(log.id);
    }

    // One-time load: previous performance + program template defaults
    const loadInitial = async () => {
      const [lastPerf, program, settings] = await Promise.all([
        workoutRepo.getLastPerformanceForExercise(log.exerciseTemplateId),
        programRepo.getFirst(),
        settingsRepo.get(),
      ]);

      const template = program?.sessions
        .flatMap((s) => s.exercises)
        .find((e) => e.id === log.exerciseTemplateId);

      setPreferredRest(template?.restSeconds ?? settings.defaultRestSeconds);

      // "ULTIMA VOLTA" card: previous completed session performance
      const lastSet =
        lastPerf && lastPerf.setLogs.length > 0
          ? lastPerf.setLogs[lastPerf.setLogs.length - 1]
          : null;
      if (lastSet) {
        setLastWeight(lastSet.weight);
        setLastReps(lastSet.reps);
      } else {
        setLastWeight(null);
        setLastReps(null);
      }

      // Input prefill priority:
      // 1) this session's last completed set (survives reload / re-entry)
      // 2) previous session's last set
      // 3) program template defaults
      const currentSet =
        log.setLogs.length > 0 ? log.setLogs[log.setLogs.length - 1] : null;
      if (currentSet) {
        setWeight(currentSet.weight);
        setReps(currentSet.reps);
      } else if (lastSet) {
        setWeight(lastSet.weight);
        setReps(lastSet.reps);
      } else {
        setWeight(template?.defaultWeight ?? 0);
        setReps(template?.targetReps ?? log.targetRepsSnapshot ?? 8);
      }
    };
    void loadInitial();
  }, [workout, exerciseId, startExercise]);

  // Sync with store updates (never touches weight/reps input)
  useEffect(() => {
    if (!workout || !exerciseId) return;
    const log = workout.exerciseLogs.find((e) => e.id === exerciseId);
    if (log) setExerciseLog(log);
  }, [workout, exerciseId]);

  // Reset the one-time guard when leaving the screen
  useEffect(() => {
    return () => {
      initForExerciseRef.current = null;
    };
  }, [exerciseId]);

  const handleCompleteSet = useCallback(async () => {
    if (!exerciseLog || !workout) return;
    setIsCompletingSet(true);

    const completedSets = exerciseLog.setLogs.length;
    const isLastSet = completedSets + 1 >= exerciseLog.plannedSetsSnapshot;

    await completeSet(exerciseLog.id, {
      setNumber: completedSets + 1,
      weight,
      reps,
      completedAt: Date.now(),
    });

    if (isLastSet) {
      // Complete the exercise
      await completeExercise(exerciseLog.id);
      setShowSuccess(true);
    }

    setIsCompletingSet(false);
  }, [exerciseLog, workout, completeSet, completeExercise, weight, reps]);

  const handleStartTimer = async (seconds: number) => {
    await startTimer(seconds, exerciseLog?.id, workout?.id);
  };

  if (!exerciseLog || !workout) {
    return (
      <AppShell showNav={false}>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  // Determine if exercise is complete
  if (showSuccess || exerciseLog.status === 'completed') {
    return (
      <ExerciseCompletedScreen
        exerciseLog={exerciseLog}
        onContinue={() => navigate(`/workout/${workout.id}`)}
      />
    );
  }

  const sortedLogs = [...workout.exerciseLogs].sort((a, b) => a.order - b.order);
  const exerciseIndex = sortedLogs.findIndex((e) => e.id === exerciseId);
  const completedSets = exerciseLog.setLogs.length;
  const plannedSets = exerciseLog.plannedSetsSnapshot;
  const currentSetNum = completedSets + 1;
  const isCardio = exerciseLog.exerciseTypeSnapshot === 'cardio';

  return (
    <AppShell showNav={false}>
      <div className="flex-1 overflow-y-auto pb-[calc(96px+env(safe-area-inset-bottom))]">
        {/* Header */}
        <div className="pt-[calc(env(safe-area-inset-top)+8px)] px-5">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => navigate(`/workout/${workout.id}`)}
              className="flex items-center gap-1 min-h-[44px] text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Torna alla panoramica"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-meta">{workout.sessionNameSnapshot}</span>
            </button>
            <span className="text-meta text-text-secondary">
              {exerciseIndex + 1} / {sortedLogs.length}
            </span>
          </div>
        </div>

        {/* Exercise Name */}
        <div className="px-5 pt-2 pb-6">
          <motion.h1
            key={exerciseLog.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[32px] font-bold text-text-primary leading-tight uppercase"
          >
            {exerciseLog.exerciseNameSnapshot}
          </motion.h1>
          <p className="text-body text-text-secondary mt-1">
            {strings.workout.seriesLabel(currentSetNum, plannedSets)}
          </p>
        </div>

        {/* Last Performance */}
        {(lastWeight !== null || lastReps !== null) && (
          <div className="px-5 mb-5">
            <div className="bg-bg-elevated rounded-card p-4 border border-border-default">
              <p className="text-label-sm text-text-secondary mb-1.5">
                {strings.workout.lastTime}
              </p>
              <p className="text-heading text-text-primary">
                {lastWeight !== null ? formatWeight(lastWeight) : '—'}
                {lastReps !== null ? ` × ${lastReps}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Reps Stepper */}
        {!isCardio && (
          <div className="px-5 mb-6">
            <div className="bg-bg-surface rounded-card border border-border-default p-5">
              <NumericStepper
                value={reps}
                onChange={setReps}
                min={1}
                max={99}
                label={strings.workout.reps}
              />
            </div>
          </div>
        )}

        {/* Weight Display */}
        {!isCardio && (
          <div className="px-5 mb-6">
            <div className="bg-bg-surface rounded-card border border-border-default p-5">
              <p className="text-label-sm text-text-secondary mb-3">
                {strings.workout.weight}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[40px] font-bold text-text-primary tabular-nums">
                  {weight === 0 ? 'BW' : formatWeightValue(weight)}
                  {weight > 0 && (
                    <span className="text-[20px] font-normal text-text-secondary ml-1">
                      kg
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setShowWeightEditor(true)}
                  className="text-accent-primary text-meta font-semibold min-h-[44px] px-4 rounded-btn bg-accent-primary/10 hover:bg-accent-primary/20 transition-colors"
                >
                  {strings.workout.edit}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Set CTA */}
        <div className="px-5 mb-6">
          <Button
            variant="primary"
            fullWidth
            isLoading={isCompletingSet}
            onClick={handleCompleteSet}
          >
            {strings.workout.completeSet}
          </Button>
        </div>

        {/* Sets Overview */}
        <div className="px-5 mb-6">
          <div className="flex gap-3 flex-wrap">
            {Array.from({ length: plannedSets }, (_, i) => {
              const setLog = exerciseLog.setLogs[i];
              const isCurrent = i === completedSets;
              return (
                <div
                  key={i}
                  className={`flex-1 min-w-[70px] p-3 rounded-card border text-center ${
                    setLog
                      ? 'bg-accent-primary/10 border-accent-primary/30'
                      : isCurrent
                      ? 'bg-bg-elevated border-accent-primary/50'
                      : 'bg-bg-surface border-border-default opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">
                    {setLog ? (
                      <Check className="w-4 h-4 text-accent-primary" />
                    ) : isCurrent ? (
                      <div className="w-2 h-2 rounded-full bg-accent-primary" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-border-default" />
                    )}
                  </div>
                  <p className="text-label-sm text-text-secondary">
                    Serie {i + 1}
                  </p>
                  {setLog && (
                    <p className="text-meta text-text-primary mt-0.5">
                      {setLog.reps} × {formatWeightValue(setLog.weight)}kg
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rest Presets */}
        <div className="px-5 mb-4">
          <p className="text-label-sm text-text-secondary mb-3">
            {strings.workout.restPresets}
          </p>
          <RestPresets
            preferredSeconds={preferredRest}
            onSelect={handleStartTimer}
            activeSeconds={
              timer?.status === 'running' ? timer.durationSeconds : undefined
            }
          />
        </div>

        {/* Timer pill is rendered globally by RestTimerLayer (fixed above safe area) */}
      </div>

      {/* Weight Editor Sheet */}
      <AnimatePresence>
        {showWeightEditor && (
          <WeightEditorSheet
            currentWeight={weight}
            lastWeight={lastWeight ?? undefined}
            exerciseName={exerciseLog.exerciseNameSnapshot}
            setNumber={currentSetNum}
            onSave={(w) => {
              setWeight(w);
              setShowWeightEditor(false);
            }}
            onCancel={() => setShowWeightEditor(false)}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
};

/* ============================================
   EXERCISE COMPLETED SCREEN (inline)
   ============================================ */

interface ExerciseCompletedProps {
  exerciseLog: WorkoutExerciseLog;
  onContinue: () => void;
}

const ExerciseCompletedScreen: React.FC<ExerciseCompletedProps> = ({
  exerciseLog,
  onContinue,
}) => (
  <AppShell showNav={false}>
    <div className="flex-1 flex flex-col items-center justify-center px-5 pb-[calc(40px+env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
        className="w-24 h-24 rounded-full bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center mb-8"
      >
        <Check className="w-12 h-12 text-accent-primary" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-center mb-8"
      >
        <h2 className="text-[28px] font-bold text-text-primary">
          {exerciseLog.exerciseNameSnapshot.toUpperCase()}
        </h2>
        <p className="text-heading text-accent-primary mt-1">
          COMPLETATA
        </p>
        <p className="text-meta text-text-secondary mt-3">
          {exerciseLog.setLogs.length} serie
        </p>
      </motion.div>

      {/* Sets summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="w-full bg-bg-surface rounded-card border border-border-default p-4 mb-8"
      >
        {exerciseLog.setLogs.map((s, i) => (
          <div
            key={s.id}
            className={`flex items-center justify-between py-2 ${
              i < exerciseLog.setLogs.length - 1 ? 'border-b border-border-default' : ''
            }`}
          >
            <span className="text-meta text-text-secondary">Serie {i + 1}</span>
            <span className="text-meta text-text-primary font-semibold">
              {formatWeight(s.weight)} × {s.reps}
            </span>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full"
      >
        <Button variant="primary" fullWidth onClick={onContinue}>
          {strings.workout.continueCta}
        </Button>
      </motion.div>
    </div>
  </AppShell>
);

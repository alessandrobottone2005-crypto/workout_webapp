/* ============================================
   WORKOUT STORE — Zustand ephemeral state
   Active workout session management
   ============================================ */

import { create } from 'zustand';
import type { Workout, WorkoutExerciseLog, SetLog, ExerciseTemplate } from '@/types';
import { generateId } from '@/lib/ids';
import { workoutRepo, appStateRepo } from '@/db/repositories';

interface WorkoutStore {
  activeWorkout: Workout | null;
  isLoading: boolean;

  // Actions
  loadActiveWorkout: () => Promise<void>;
  startWorkout: (
    programId: string,
    session: { id: string; name: string; exercises: ExerciseTemplate[] }
  ) => Promise<Workout>;
  resumeWorkout: (workout: Workout) => void;
  updateExerciseLog: (log: WorkoutExerciseLog) => Promise<void>;
  completeSet: (exerciseLogId: string, setLog: Omit<SetLog, 'id'>) => Promise<void>;
  startExercise: (exerciseLogId: string) => Promise<void>;
  completeExercise: (exerciseLogId: string) => Promise<void>;
  reorderExercises: (orderedIds: string[]) => Promise<void>;
  completeWorkout: () => Promise<void>;
  cancelWorkout: () => Promise<void>;
  clearActiveWorkout: () => void;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  activeWorkout: null,
  isLoading: false,

  loadActiveWorkout: async () => {
    set({ isLoading: true });
    try {
      const appState = await appStateRepo.get();
      if (appState.activeWorkoutId) {
        const workout = await workoutRepo.getById(appState.activeWorkoutId);
        if (workout && workout.status === 'active') {
          set({ activeWorkout: workout });
        } else {
          // Clean up stale reference and clear any stale in-memory value
          await appStateRepo.setActiveWorkout(undefined);
          set({ activeWorkout: null });
        }
      } else {
        // No active workout persisted — clear stale in-memory state
        // (e.g. a workout that was just completed or cancelled)
        set({ activeWorkout: null });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  startWorkout: async (programId, session) => {
    const now = Date.now();
    const exerciseLogs: WorkoutExerciseLog[] = session.exercises.map((ex, i) => ({
      id: generateId(),
      exerciseTemplateId: ex.id,
      exerciseNameSnapshot: ex.name,
      exerciseTypeSnapshot: ex.type,
      plannedSetsSnapshot: ex.sets ?? 1,
      targetRepsSnapshot: ex.targetReps,
      order: i,
      status: 'pending',
      setLogs: [],
    }));

    const workout: Workout = {
      id: generateId(),
      programId,
      sessionTemplateId: session.id,
      sessionNameSnapshot: session.name,
      startedAt: now,
      status: 'active',
      exerciseLogs,
    };

    await workoutRepo.create(workout);
    await appStateRepo.setActiveWorkout(workout.id);
    set({ activeWorkout: workout });
    return workout;
  },

  resumeWorkout: (workout) => {
    set({ activeWorkout: workout });
  },

  updateExerciseLog: async (log) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const updated: Workout = {
      ...activeWorkout,
      exerciseLogs: activeWorkout.exerciseLogs.map((e) =>
        e.id === log.id ? log : e
      ),
    };
    set({ activeWorkout: updated });
    await workoutRepo.update(updated);
  },

  completeSet: async (exerciseLogId, setLogData) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const setLog: SetLog = {
      id: generateId(),
      ...setLogData,
    };

    const updated: Workout = {
      ...activeWorkout,
      exerciseLogs: activeWorkout.exerciseLogs.map((e) => {
        if (e.id !== exerciseLogId) return e;
        return {
          ...e,
          status: 'active',
          setLogs: [...e.setLogs, setLog],
        };
      }),
    };

    // Optimistic update
    set({ activeWorkout: updated });
    // Persist
    await workoutRepo.update(updated);
  },

  startExercise: async (exerciseLogId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const updated: Workout = {
      ...activeWorkout,
      exerciseLogs: activeWorkout.exerciseLogs.map((e) => {
        if (e.id !== exerciseLogId) return e;
        return { ...e, status: 'active', startedAt: Date.now() };
      }),
    };
    set({ activeWorkout: updated });
    await workoutRepo.update(updated);
  },

  completeExercise: async (exerciseLogId) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const updated: Workout = {
      ...activeWorkout,
      exerciseLogs: activeWorkout.exerciseLogs.map((e) => {
        if (e.id !== exerciseLogId) return e;
        return { ...e, status: 'completed', completedAt: Date.now() };
      }),
    };
    set({ activeWorkout: updated });
    await workoutRepo.update(updated);
  },

  reorderExercises: async (orderedIds) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const reordered = orderedIds
      .map((id, idx) => {
        const ex = activeWorkout.exerciseLogs.find((e) => e.id === id);
        return ex ? { ...ex, order: idx } : null;
      })
      .filter((e): e is WorkoutExerciseLog => e !== null);

    const updated: Workout = { ...activeWorkout, exerciseLogs: reordered };
    set({ activeWorkout: updated });
    await workoutRepo.update(updated);
  },

  completeWorkout: async () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const completed: Workout = {
      ...activeWorkout,
      status: 'completed',
      completedAt: Date.now(),
    };
    set({ activeWorkout: completed });
    await workoutRepo.update(completed);
    await appStateRepo.setActiveWorkout(undefined);
  },

  cancelWorkout: async () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const cancelled: Workout = {
      ...activeWorkout,
      status: 'cancelled',
      completedAt: Date.now(),
    };
    await workoutRepo.update(cancelled);
    await appStateRepo.setActiveWorkout(undefined);
    set({ activeWorkout: null });
  },

  clearActiveWorkout: () => {
    set({ activeWorkout: null });
  },
}));

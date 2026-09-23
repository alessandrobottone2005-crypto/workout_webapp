/* ============================================
   WORKOUT APP — DOMAIN TYPES
   All domain models for the application
   ============================================ */

export type UUID = string;

export type ExerciseType = 'strength' | 'cardio';

export type WorkoutStatus = 'active' | 'completed' | 'cancelled';

export type ExerciseLogStatus = 'pending' | 'active' | 'completed';

export type TimerStatus = 'idle' | 'running' | 'completed';

/* ============================================
   PROGRAM / TEMPLATE LAYER
   (What the user plans to do)
   ============================================ */

export interface Program {
  id: UUID;
  name: string;
  createdAt: number;
  startDate?: string; // ISO date string YYYY-MM-DD
  durationWeeks: number;
  sessions: SessionTemplate[];
}

export interface SessionTemplate {
  id: UUID;
  name: string;
  order: number;
  exercises: ExerciseTemplate[];
}

export interface ExerciseTemplate {
  id: UUID;
  name: string;
  type: ExerciseType;
  order: number;

  // Strength fields
  sets?: number;
  targetReps?: number;
  defaultWeight?: number;
  restSeconds?: number;

  // Cardio fields
  durationSeconds?: number;

  notes?: string;
}

/* ============================================
   WORKOUT / LOG LAYER
   (What the user actually did)
   ============================================ */

export interface Workout {
  id: UUID;
  programId: UUID;
  sessionTemplateId: UUID;

  /** Snapshot at workout creation — survives template renaming */
  sessionNameSnapshot: string;

  startedAt: number; // epoch ms
  completedAt?: number; // epoch ms

  status: WorkoutStatus;

  exerciseLogs: WorkoutExerciseLog[];
}

export interface WorkoutExerciseLog {
  id: UUID;
  exerciseTemplateId: UUID;

  /** Snapshot at workout creation — survives template renaming */
  exerciseNameSnapshot: string;
  exerciseTypeSnapshot: ExerciseType;

  /** Planned sets/reps snapshot */
  plannedSetsSnapshot: number;
  targetRepsSnapshot?: number;

  order: number;
  status: ExerciseLogStatus;

  setLogs: SetLog[];

  startedAt?: number;
  completedAt?: number;
}

export interface SetLog {
  id: UUID;
  setNumber: number;
  weight: number;
  reps: number;
  completedAt: number;
}

/** Cardio log — extends WorkoutExerciseLog semantics */
export interface CardioLog {
  id: UUID;
  exerciseTemplateId: UUID;
  exerciseNameSnapshot: string;
  exerciseTypeSnapshot: 'cardio';
  order: number;
  status: ExerciseLogStatus;
  plannedDurationSeconds: number;
  completedDurationSeconds?: number;
  setLogs: never[];
  startedAt?: number;
  completedAt?: number;
  plannedSetsSnapshot: 1;
  targetRepsSnapshot?: undefined;
}

/* ============================================
   SETTINGS
   ============================================ */

export interface AppSettings {
  defaultRestSeconds: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

/* ============================================
   APP STATE (persisted ephemeral state)
   ============================================ */

export interface AppState {
  id: 'default';
  activeWorkoutId?: UUID;
  timerState?: TimerState;
}

export interface TimerState {
  durationSeconds: number;
  startedAt: number;
  endAt: number;
  exerciseId?: UUID;
  workoutId?: UUID;
  status: TimerStatus;
}

/* ============================================
   PROGRESS / ANALYTICS (computed, not stored)
   ============================================ */

export interface ExercisePerformance {
  exerciseTemplateId: UUID;
  exerciseName: string;
  workoutDate: number;
  /** Highest weight lifted in that session (representative weight) */
  representativeWeight: number;
  sets: Array<{ weight: number; reps: number }>;
}

export interface StallInfo {
  exerciseTemplateId: UUID;
  exerciseName: string;
  currentWeight: number;
  daysSinceIncrease: number;
  isStalled: boolean;
}

export interface WeeklyProgress {
  weekStart: number;
  workoutCount: number;
  targetCount: number;
}

export interface WorkoutMetrics {
  totalCompleted: number;
  averageDurationMs: number;
  currentStreak: number;
  thisWeekCount: number;
}

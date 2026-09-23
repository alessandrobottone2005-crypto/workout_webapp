/* ============================================
   PROGRESS SELECTORS — Pure business logic functions
   No React dependencies, testable in isolation
   ============================================ */

import type {
  Workout,
  WorkoutExerciseLog,
  ExercisePerformance,
  StallInfo,
  WorkoutMetrics,
} from '@/types';
import { startOfDay, startOfWeek, isSameDay, daysBetween } from '@/lib/formatters';

/**
 * Representative session weight for an exercise.
 *
 * Rule: the highest weight from completed working sets in that exercise session.
 * This is the consistent metric used across charts and stall detection.
 * Sets with weight=0 (bodyweight) are included in count but max is 0.
 */
export function getRepresentativeWeight(log: WorkoutExerciseLog): number {
  if (log.setLogs.length === 0) return 0;
  return Math.max(...log.setLogs.map((s) => s.weight));
}

/**
 * Derive exercise performances from completed workouts.
 * Sorted chronologically ascending (oldest first).
 */
export function getExercisePerformances(
  workouts: Workout[],
  exerciseTemplateId: string
): ExercisePerformance[] {
  const completed = workouts
    .filter((w) => w.status === 'completed')
    .sort((a, b) => a.startedAt - b.startedAt);

  const performances: ExercisePerformance[] = [];

  for (const workout of completed) {
    const exLog = workout.exerciseLogs.find(
      (e) => e.exerciseTemplateId === exerciseTemplateId && e.status === 'completed'
    );
    if (!exLog || exLog.setLogs.length === 0) continue;

    performances.push({
      exerciseTemplateId,
      exerciseName: exLog.exerciseNameSnapshot,
      workoutDate: workout.startedAt,
      representativeWeight: getRepresentativeWeight(exLog),
      sets: exLog.setLogs.map((s) => ({ weight: s.weight, reps: s.reps })),
    });
  }

  return performances;
}

/**
 * Calculate total completed workouts.
 */
export function totalCompletedWorkouts(workouts: Workout[]): number {
  return workouts.filter((w) => w.status === 'completed').length;
}

/**
 * Calculate average workout duration in milliseconds.
 * Only considers completed workouts with valid timestamps.
 */
export function averageWorkoutDuration(workouts: Workout[]): number {
  const completed = workouts.filter(
    (w) => w.status === 'completed' && w.completedAt != null
  );
  if (completed.length === 0) return 0;
  const total = completed.reduce((sum, w) => sum + (w.completedAt! - w.startedAt), 0);
  return total / completed.length;
}

/**
 * Count workouts completed this week (Mon–Sun).
 */
export function weeklyWorkoutCount(workouts: Workout[]): number {
  const now = Date.now();
  const weekStart = startOfWeek(now);
  return workouts.filter(
    (w) => w.status === 'completed' && w.startedAt >= weekStart
  ).length;
}

/**
 * Calculate current workout streak (consecutive days with at least one workout).
 * Counts backwards from today.
 */
export function currentStreak(workouts: Workout[]): number {
  const completedDates = workouts
    .filter((w) => w.status === 'completed')
    .map((w) => startOfDay(w.startedAt))
    .sort((a, b) => b - a); // most recent first

  if (completedDates.length === 0) return 0;

  const uniqueDates = [...new Set(completedDates)];
  const today = startOfDay(Date.now());

  // Check if there's a workout today or yesterday (allow for mid-day streak)
  if (uniqueDates[0] < today - 24 * 60 * 60 * 1000) return 0;

  let streak = 0;
  let expected = uniqueDates[0];

  for (const date of uniqueDates) {
    if (date === expected) {
      streak++;
      expected = date - 24 * 60 * 60 * 1000;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get all metrics in one object.
 */
export function getWorkoutMetrics(workouts: Workout[]): WorkoutMetrics {
  return {
    totalCompleted: totalCompletedWorkouts(workouts),
    averageDurationMs: averageWorkoutDuration(workouts),
    currentStreak: currentStreak(workouts),
    thisWeekCount: weeklyWorkoutCount(workouts),
  };
}

/**
 * Determine the next session to do based on workout history.
 *
 * Logic:
 * 1. Find the last completed workout's sessionTemplateId.
 * 2. Find the next session in order (wraps around).
 * 3. If no history, start from session order 0.
 */
export function getNextSessionId(
  sessions: Array<{ id: string; order: number }>,
  completedWorkouts: Workout[]
): string | undefined {
  if (sessions.length === 0) return undefined;

  const sorted = [...sessions].sort((a, b) => a.order - b.order);

  const lastCompleted = completedWorkouts
    .filter((w) => w.status === 'completed')
    .sort((a, b) => b.startedAt - a.startedAt)[0];

  if (!lastCompleted) {
    return sorted[0].id;
  }

  const lastSessionIdx = sorted.findIndex(
    (s) => s.id === lastCompleted.sessionTemplateId
  );

  if (lastSessionIdx === -1) {
    return sorted[0].id;
  }

  // Next session, wrapping around
  const nextIdx = (lastSessionIdx + 1) % sorted.length;
  return sorted[nextIdx].id;
}

/**
 * Detect exercise weight stall.
 *
 * A stall is detected when:
 * - There are at least 2 performance entries
 * - The representative weight has not increased in the last `thresholdDays` days
 * - The most recent entry is within the threshold window
 *
 * @param performances - chronologically sorted (ascending) performances
 * @param thresholdDays - number of days without increase to flag (default 21)
 */
export function detectExerciseStall(
  performances: ExercisePerformance[],
  thresholdDays = 21
): StallInfo | null {
  if (performances.length < 2) return null;

  const sorted = [...performances].sort((a, b) => a.workoutDate - b.workoutDate);
  const latest = sorted[sorted.length - 1];
  const now = Date.now();

  // Only relevant if recent activity within threshold window
  if (daysBetween(latest.workoutDate, now) > thresholdDays) return null;

  // Find the entry ~thresholdDays ago
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const oldEnough = sorted.filter(
    (p) => p.workoutDate <= now - thresholdMs
  );

  if (oldEnough.length === 0) return null;

  const baseline = oldEnough[oldEnough.length - 1];

  const isStalled = latest.representativeWeight <= baseline.representativeWeight;

  if (!isStalled) return null;

  const daysSinceIncrease = daysBetween(baseline.workoutDate, now);

  return {
    exerciseTemplateId: latest.exerciseTemplateId,
    exerciseName: latest.exerciseName,
    currentWeight: latest.representativeWeight,
    daysSinceIncrease,
    isStalled: true,
  };
}

/**
 * Get the trend direction for an exercise.
 * Based on last 2 representative weights.
 */
export type TrendDirection = 'up' | 'down' | 'stable';

export function getExerciseTrend(performances: ExercisePerformance[]): TrendDirection {
  if (performances.length < 2) return 'stable';
  const last = performances[performances.length - 1].representativeWeight;
  const prev = performances[performances.length - 2].representativeWeight;
  if (last > prev) return 'up';
  if (last < prev) return 'down';
  return 'stable';
}

/**
 * Get days that have completed workouts for calendar display.
 */
export function getWorkoutDays(workouts: Workout[]): Set<number> {
  const days = new Set<number>();
  for (const w of workouts) {
    if (w.status === 'completed') {
      days.add(startOfDay(w.startedAt));
    }
  }
  return days;
}

/**
 * Get workout(s) on a specific calendar day.
 */
export function getWorkoutsOnDay(workouts: Workout[], dayTimestamp: number): Workout[] {
  return workouts.filter(
    (w) => w.status === 'completed' && isSameDay(w.startedAt, dayTimestamp)
  );
}

/**
 * Determine current program week based on start date.
 */
export function getCurrentProgramWeek(startDate?: string): number {
  if (!startDate) return 1;
  const start = new Date(startDate).getTime();
  const now = Date.now();
  const weeks = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  return Math.max(1, Math.min(weeks + 1, 999));
}

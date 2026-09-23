/* ============================================
   UNIT TESTS — Business logic
   Tests for pure functions (no React needed)
   ============================================ */

import { describe, it, expect } from 'vitest'
import {
  getNextSessionId,
  detectExerciseStall,
  getRepresentativeWeight,
  totalCompletedWorkouts,
  averageWorkoutDuration,
} from '@/lib/selectors'
import {
  formatWeight,
  parseWeight,
  formatTimerSeconds,
  formatDuration,
  formatDate,
  isSameDay,
} from '@/lib/formatters'
import type { Workout, WorkoutExerciseLog, ExercisePerformance } from '@/types'

/* ============================================
   FORMATTERS
   ============================================ */

describe('formatWeight', () => {
  it('formats integer weight', () => {
    expect(formatWeight(45)).toBe('45 kg')
  })
  it('formats decimal weight with Italian comma', () => {
    expect(formatWeight(82.5)).toBe('82,5 kg')
  })
  it('formats 0', () => {
    expect(formatWeight(0)).toBe('0 kg')
  })
})

describe('parseWeight', () => {
  it('parses integer string', () => {
    expect(parseWeight('45')).toBe(45)
  })
  it('parses decimal with comma (Italian)', () => {
    expect(parseWeight('82,5')).toBe(82.5)
  })
  it('parses decimal with dot', () => {
    expect(parseWeight('82.5')).toBe(82.5)
  })
  it('returns 0 for invalid input', () => {
    expect(parseWeight('')).toBe(0)
    expect(parseWeight('abc')).toBe(0)
  })
})

describe('formatTimerSeconds', () => {
  it('formats 90 seconds as 1:30', () => {
    expect(formatTimerSeconds(90)).toBe('1:30')
  })
  it('formats 60 as 1:00', () => {
    expect(formatTimerSeconds(60)).toBe('1:00')
  })
  it('formats 0 as 0:00', () => {
    expect(formatTimerSeconds(0)).toBe('0:00')
  })
  it('handles negative (clamps to 0)', () => {
    expect(formatTimerSeconds(-5)).toBe('0:00')
  })
})

describe('formatDuration', () => {
  it('formats 78 minutes correctly', () => {
    expect(formatDuration(78 * 60 * 1000)).toBe('1h 18min')
  })
  it('formats sub-hour', () => {
    expect(formatDuration(45 * 60 * 1000)).toBe('45min')
  })
})

describe('formatDate', () => {
  it('formats date in Italian', () => {
    // 2026-09-23 in UTC
    const ts = new Date('2026-09-23T10:00:00.000Z').getTime()
    const result = formatDate(ts)
    expect(result).toContain('settembre')
    expect(result).toContain('2026')
  })
})

describe('isSameDay', () => {
  it('returns true for same day timestamps', () => {
    const a = new Date('2026-09-23T08:00:00').getTime()
    const b = new Date('2026-09-23T20:00:00').getTime()
    expect(isSameDay(a, b)).toBe(true)
  })
  it('returns false for different days', () => {
    const a = new Date('2026-09-23T08:00:00').getTime()
    const b = new Date('2026-09-24T08:00:00').getTime()
    expect(isSameDay(a, b)).toBe(false)
  })
})

/* ============================================
   SELECTORS
   ============================================ */

const makeWorkout = (
  overrides: Partial<Workout> = {},
  exerciseLogs: WorkoutExerciseLog[] = []
): Workout => ({
  id: 'w1',
  programId: 'p1',
  sessionTemplateId: 's1',
  sessionNameSnapshot: 'Seduta 1',
  startedAt: Date.now() - 60 * 60 * 1000,
  completedAt: Date.now(),
  status: 'completed',
  exerciseLogs,
  ...overrides,
})

describe('getNextSessionId', () => {
  const sessions = [
    { id: 's1', order: 0 },
    { id: 's2', order: 1 },
    { id: 's3', order: 2 },
  ]

  it('returns first session when no history', () => {
    expect(getNextSessionId(sessions, [])).toBe('s1')
  })

  it('returns next session after last completed', () => {
    const workouts: Workout[] = [makeWorkout({ sessionTemplateId: 's1' })]
    expect(getNextSessionId(sessions, workouts)).toBe('s2')
  })

  it('wraps around to first session after last', () => {
    const workouts: Workout[] = [makeWorkout({ sessionTemplateId: 's3' })]
    expect(getNextSessionId(sessions, workouts)).toBe('s1')
  })

  it('returns undefined for empty sessions array', () => {
    expect(getNextSessionId([], [])).toBeUndefined()
  })
})

describe('totalCompletedWorkouts', () => {
  it('counts only completed workouts', () => {
    const workouts: Workout[] = [
      makeWorkout({ status: 'completed' }),
      makeWorkout({ id: 'w2', status: 'cancelled' }),
      makeWorkout({ id: 'w3', status: 'active' }),
    ]
    expect(totalCompletedWorkouts(workouts)).toBe(1)
  })
})

describe('averageWorkoutDuration', () => {
  it('calculates average correctly', () => {
    const now = Date.now()
    const workouts: Workout[] = [
      makeWorkout({ startedAt: now - 3600000, completedAt: now }), // 1h
      makeWorkout({
        id: 'w2',
        startedAt: now - 7200000,
        completedAt: now - 3600000,
      }), // 1h
    ]
    expect(averageWorkoutDuration(workouts)).toBe(3600000)
  })

  it('returns 0 for empty array', () => {
    expect(averageWorkoutDuration([])).toBe(0)
  })
})

describe('getRepresentativeWeight', () => {
  it('returns highest weight from set logs', () => {
    const log: WorkoutExerciseLog = {
      id: 'el1',
      exerciseTemplateId: 'ex1',
      exerciseNameSnapshot: 'Chest Press',
      exerciseTypeSnapshot: 'strength',
      plannedSetsSnapshot: 3,
      order: 0,
      status: 'completed',
      setLogs: [
        { id: 's1', setNumber: 1, weight: 45, reps: 8, completedAt: Date.now() },
        { id: 's2', setNumber: 2, weight: 47.5, reps: 8, completedAt: Date.now() },
        { id: 's3', setNumber: 3, weight: 47.5, reps: 7, completedAt: Date.now() },
      ],
    }
    expect(getRepresentativeWeight(log)).toBe(47.5)
  })

  it('returns 0 for no sets', () => {
    const log: WorkoutExerciseLog = {
      id: 'el1',
      exerciseTemplateId: 'ex1',
      exerciseNameSnapshot: 'Test',
      exerciseTypeSnapshot: 'strength',
      plannedSetsSnapshot: 3,
      order: 0,
      status: 'pending',
      setLogs: [],
    }
    expect(getRepresentativeWeight(log)).toBe(0)
  })
})

describe('detectExerciseStall', () => {
  it('returns null when fewer than 2 entries', () => {
    const perfs: ExercisePerformance[] = [
      {
        exerciseTemplateId: 'ex1',
        exerciseName: 'Test',
        workoutDate: Date.now() - 7 * 24 * 3600000,
        representativeWeight: 80,
        sets: [],
      },
    ]
    expect(detectExerciseStall(perfs)).toBeNull()
  })

  it('detects stall when weight unchanged for 21+ days', () => {
    const now = Date.now()
    const perfs: ExercisePerformance[] = [
      {
        exerciseTemplateId: 'ex1',
        exerciseName: 'Leg Press',
        workoutDate: now - 28 * 24 * 3600000,
        representativeWeight: 80,
        sets: [],
      },
      {
        exerciseTemplateId: 'ex1',
        exerciseName: 'Leg Press',
        workoutDate: now - 14 * 24 * 3600000,
        representativeWeight: 80,
        sets: [],
      },
      {
        exerciseTemplateId: 'ex1',
        exerciseName: 'Leg Press',
        workoutDate: now - 3 * 24 * 3600000,
        representativeWeight: 80,
        sets: [],
      },
    ]
    const stall = detectExerciseStall(perfs)
    expect(stall).not.toBeNull()
    expect(stall?.isStalled).toBe(true)
  })

  it('does not detect stall when weight increased', () => {
    const now = Date.now()
    const perfs: ExercisePerformance[] = [
      {
        exerciseTemplateId: 'ex1',
        exerciseName: 'Test',
        workoutDate: now - 28 * 24 * 3600000,
        representativeWeight: 75,
        sets: [],
      },
      {
        exerciseTemplateId: 'ex1',
        exerciseName: 'Test',
        workoutDate: now - 3 * 24 * 3600000,
        representativeWeight: 80,
        sets: [],
      },
    ]
    expect(detectExerciseStall(perfs)).toBeNull()
  })
})

describe('timer remaining time calculation', () => {
  it('calculates remaining time using endAt - Date.now()', () => {
    const durationSeconds = 90
    const startedAt = Date.now()
    const endAt = startedAt + durationSeconds * 1000

    // Simulate 30 seconds elapsed
    const simulatedNow = startedAt + 30000
    const remaining = (endAt - simulatedNow) / 1000

    expect(remaining).toBeCloseTo(60, 0)
  })

  it('clamps to 0 when timer expired', () => {
    const endAt = Date.now() - 5000 // 5 seconds ago
    const remaining = Math.max(0, (endAt - Date.now()) / 1000)
    expect(remaining).toBe(0)
  })
})

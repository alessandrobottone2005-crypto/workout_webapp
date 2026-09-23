/* ============================================
   DB REPOSITORIES — Data access layer
   Pure async functions wrapping Dexie operations
   ============================================ */

import { db } from './database';
import { generateId } from '@/lib/ids';
import type {
  Program,
  SessionTemplate,
  ExerciseTemplate,
  Workout,
  WorkoutExerciseLog,
  SetLog,
  AppSettings,
  AppState,
  TimerState,
  UUID,
} from '@/types';

/* ============================================
   PROGRAM REPOSITORY
   ============================================ */

export const programRepo = {
  async getAll(): Promise<Program[]> {
    return db.programs.orderBy('createdAt').toArray();
  },

  async getFirst(): Promise<Program | undefined> {
    return db.programs.orderBy('createdAt').first();
  },

  async getById(id: UUID): Promise<Program | undefined> {
    return db.programs.get(id);
  },

  async update(program: Program): Promise<void> {
    await db.programs.put(program);
  },

  async updateSession(programId: UUID, session: SessionTemplate): Promise<void> {
    const program = await db.programs.get(programId);
    if (!program) throw new Error(`Program ${programId} not found`);
    const idx = program.sessions.findIndex((s) => s.id === session.id);
    if (idx === -1) throw new Error(`Session ${session.id} not found in program`);
    program.sessions[idx] = session;
    await db.programs.put(program);
  },

  async addSession(programId: UUID, session: SessionTemplate): Promise<void> {
    const program = await db.programs.get(programId);
    if (!program) throw new Error(`Program ${programId} not found`);
    program.sessions.push(session);
    await db.programs.put(program);
  },

  async deleteSession(programId: UUID, sessionId: UUID): Promise<void> {
    const program = await db.programs.get(programId);
    if (!program) throw new Error(`Program ${programId} not found`);
    program.sessions = program.sessions.filter((s) => s.id !== sessionId);
    await db.programs.put(program);
  },

  async updateExercise(
    programId: UUID,
    sessionId: UUID,
    exercise: ExerciseTemplate
  ): Promise<void> {
    const program = await db.programs.get(programId);
    if (!program) throw new Error(`Program ${programId} not found`);
    const session = program.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    const idx = session.exercises.findIndex((e) => e.id === exercise.id);
    if (idx === -1) {
      // New exercise: append at the end of the session
      session.exercises.push({ ...exercise, order: session.exercises.length });
    } else {
      // Existing exercise: preserve its position in the session
      session.exercises[idx] = { ...exercise, order: session.exercises[idx].order };
    }
    await db.programs.put(program);
  },

  async deleteExercise(
    programId: UUID,
    sessionId: UUID,
    exerciseId: UUID
  ): Promise<void> {
    const program = await db.programs.get(programId);
    if (!program) throw new Error(`Program ${programId} not found`);
    const session = program.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.exercises = session.exercises.filter((e) => e.id !== exerciseId);
    await db.programs.put(program);
  },

  async create(name: string, durationWeeks: number): Promise<Program> {
    const program: Program = {
      id: generateId(),
      name,
      createdAt: Date.now(),
      durationWeeks,
      sessions: [],
    };
    await db.programs.add(program);
    return program;
  },

  async delete(id: UUID): Promise<void> {
    await db.programs.delete(id);
  },
};

/* ============================================
   WORKOUT REPOSITORY
   ============================================ */

export const workoutRepo = {
  async getAll(): Promise<Workout[]> {
    return db.workouts.orderBy('startedAt').reverse().toArray();
  },

  async getById(id: UUID): Promise<Workout | undefined> {
    return db.workouts.get(id);
  },

  async getActive(): Promise<Workout | undefined> {
    return db.workouts.where('status').equals('active').first();
  },

  async getCompleted(): Promise<Workout[]> {
    return db.workouts.where('status').equals('completed').reverse().sortBy('startedAt');
  },

  async getBySession(sessionTemplateId: UUID): Promise<Workout[]> {
    return db.workouts
      .where('sessionTemplateId')
      .equals(sessionTemplateId)
      .and((w) => w.status === 'completed')
      .reverse()
      .sortBy('startedAt');
  },

  async create(workout: Workout): Promise<Workout> {
    await db.workouts.add(workout);
    return workout;
  },

  async update(workout: Workout): Promise<void> {
    await db.workouts.put(workout);
  },

  async updateExerciseLog(
    workoutId: UUID,
    exerciseLog: WorkoutExerciseLog
  ): Promise<void> {
    const workout = await db.workouts.get(workoutId);
    if (!workout) throw new Error(`Workout ${workoutId} not found`);
    const idx = workout.exerciseLogs.findIndex((e) => e.id === exerciseLog.id);
    if (idx === -1) throw new Error(`Exercise log ${exerciseLog.id} not found`);
    workout.exerciseLogs[idx] = exerciseLog;
    await db.workouts.put(workout);
  },

  async addSetLog(
    workoutId: UUID,
    exerciseLogId: UUID,
    setLog: SetLog
  ): Promise<void> {
    const workout = await db.workouts.get(workoutId);
    if (!workout) throw new Error(`Workout ${workoutId} not found`);
    const exLog = workout.exerciseLogs.find((e) => e.id === exerciseLogId);
    if (!exLog) throw new Error(`Exercise log ${exerciseLogId} not found`);
    exLog.setLogs.push(setLog);
    await db.workouts.put(workout);
  },

  async complete(workoutId: UUID): Promise<void> {
    const workout = await db.workouts.get(workoutId);
    if (!workout) throw new Error(`Workout ${workoutId} not found`);
    workout.status = 'completed';
    workout.completedAt = Date.now();
    await db.workouts.put(workout);
  },

  async cancel(workoutId: UUID): Promise<void> {
    const workout = await db.workouts.get(workoutId);
    if (!workout) throw new Error(`Workout ${workoutId} not found`);
    workout.status = 'cancelled';
    workout.completedAt = Date.now();
    await db.workouts.put(workout);
  },

  /** Get the last completed workout for a specific exercise template */
  async getLastPerformanceForExercise(
    exerciseTemplateId: UUID
  ): Promise<WorkoutExerciseLog | undefined> {
    const completed = await db.workouts
      .where('status')
      .equals('completed')
      .reverse()
      .sortBy('startedAt');

    for (const workout of completed) {
      const exLog = workout.exerciseLogs.find(
        (e) => e.exerciseTemplateId === exerciseTemplateId && e.status === 'completed'
      );
      if (exLog) return exLog;
    }
    return undefined;
  },

  /** Get all completed workout exercise logs for a given exercise (for charts) */
  async getAllPerformancesForExercise(
    exerciseTemplateId: UUID
  ): Promise<Array<{ workoutDate: number; log: WorkoutExerciseLog }>> {
    const completed = await db.workouts
      .where('status')
      .equals('completed')
      .sortBy('startedAt');

    const results: Array<{ workoutDate: number; log: WorkoutExerciseLog }> = [];
    for (const workout of completed) {
      const exLog = workout.exerciseLogs.find(
        (e) => e.exerciseTemplateId === exerciseTemplateId && e.status === 'completed'
      );
      if (exLog) {
        results.push({ workoutDate: workout.startedAt, log: exLog });
      }
    }
    return results;
  },

  async deleteAll(): Promise<void> {
    await db.workouts.clear();
  },
};

/* ============================================
   SETTINGS REPOSITORY
   ============================================ */

export const settingsRepo = {
  async get(): Promise<AppSettings> {
    const settings = await db.settings.get('default');
    if (!settings) {
      // Return defaults if not found
      return {
        defaultRestSeconds: 90,
        soundEnabled: true,
        vibrationEnabled: true,
      };
    }
    return settings;
  },

  async update(settings: Partial<AppSettings>): Promise<void> {
    const current = await db.settings.get('default');
    if (current) {
      await db.settings.put({ ...current, ...settings });
    } else {
      await db.settings.put({
        id: 'default',
        defaultRestSeconds: 90,
        soundEnabled: true,
        vibrationEnabled: true,
        ...settings,
      });
    }
  },
};

/* ============================================
   APP STATE REPOSITORY
   ============================================ */

export const appStateRepo = {
  async get(): Promise<AppState> {
    const state = await db.appState.get('default');
    return state ?? { id: 'default' };
  },

  async setActiveWorkout(workoutId: UUID | undefined): Promise<void> {
    const state = await this.get();
    await db.appState.put({ ...state, activeWorkoutId: workoutId });
  },

  async setTimerState(timerState: TimerState | undefined): Promise<void> {
    const state = await this.get();
    await db.appState.put({ ...state, timerState });
  },

  async clear(): Promise<void> {
    await db.appState.put({ id: 'default' });
  },
};

/* ============================================
   RESET REPOSITORY
   ============================================ */

export async function resetAllData(): Promise<void> {
  await db.transaction('rw', [db.programs, db.workouts, db.settings, db.appState], async () => {
    await db.programs.clear();
    await db.workouts.clear();
    await db.settings.clear();
    await db.appState.clear();
  });
}

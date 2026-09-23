/* ============================================
   SEED DATA — Demo training program
   Realistic Italian workout plan
   ============================================ */

import { db } from './database';
import { generateId } from '@/lib/ids';
import type { Program, AppSettings, AppState } from '@/types';

const SEED_PROGRAM: Omit<Program, 'id' | 'createdAt'> = {
  name: 'La Mia Scheda',
  durationWeeks: 8,
  sessions: [
    {
      id: generateId(),
      name: 'Seduta 1',
      order: 0,
      exercises: [
        {
          id: generateId(),
          name: 'Cyclette',
          type: 'cardio',
          order: 0,
          durationSeconds: 10 * 60,
          notes: '10 min riscaldamento',
        },
        {
          id: generateId(),
          name: 'Chest Press',
          type: 'strength',
          order: 1,
          sets: 3,
          targetReps: 8,
          defaultWeight: 45,
          restSeconds: 120,
          notes: '',
        },
        {
          id: generateId(),
          name: 'Panca 45°',
          type: 'strength',
          order: 2,
          sets: 3,
          targetReps: 8,
          defaultWeight: 30,
          restSeconds: 120,
        },
        {
          id: generateId(),
          name: 'Lat Machine',
          type: 'strength',
          order: 3,
          sets: 3,
          targetReps: 10,
          defaultWeight: 50,
          restSeconds: 90,
        },
        {
          id: generateId(),
          name: 'Alzate laterali',
          type: 'strength',
          order: 4,
          sets: 3,
          targetReps: 12,
          defaultWeight: 8,
          restSeconds: 60,
        },
        {
          id: generateId(),
          name: 'Crunch',
          type: 'strength',
          order: 5,
          sets: 3,
          targetReps: 15,
          defaultWeight: 0,
          restSeconds: 60,
        },
        {
          id: generateId(),
          name: 'Tapis roulant',
          type: 'cardio',
          order: 6,
          durationSeconds: 25 * 60,
          notes: '5 min velocità 4.5 → 5 min velocità 5.5 → pendenza 4-5',
        },
      ],
    },
    {
      id: generateId(),
      name: 'Seduta 2',
      order: 1,
      exercises: [
        {
          id: generateId(),
          name: 'Ellittica',
          type: 'cardio',
          order: 0,
          durationSeconds: 6 * 60,
          notes: '6 min riscaldamento',
        },
        {
          id: generateId(),
          name: 'Leg Extension',
          type: 'strength',
          order: 1,
          sets: 4,
          targetReps: 12,
          defaultWeight: 35,
          restSeconds: 90,
        },
        {
          id: generateId(),
          name: 'Leg Press piedi stretti',
          type: 'strength',
          order: 2,
          sets: 3,
          targetReps: 8,
          defaultWeight: 80,
          restSeconds: 120,
        },
        {
          id: generateId(),
          name: 'Reverse Fly Machine',
          type: 'strength',
          order: 3,
          sets: 3,
          targetReps: 12,
          defaultWeight: 20,
          restSeconds: 90,
        },
        {
          id: generateId(),
          name: 'Lento avanti manubri',
          type: 'strength',
          order: 4,
          sets: 3,
          targetReps: 10,
          defaultWeight: 16,
          restSeconds: 90,
        },
        {
          id: generateId(),
          name: 'Tapis roulant',
          type: 'cardio',
          order: 5,
          durationSeconds: 20 * 60,
          notes: '5 min velocità 5.0 → 10 min velocità 6.0 → 5 min defatica',
        },
      ],
    },
    {
      id: generateId(),
      name: 'Seduta 3',
      order: 2,
      exercises: [
        {
          id: generateId(),
          name: 'Cyclette',
          type: 'cardio',
          order: 0,
          durationSeconds: 10 * 60,
          notes: '10 min riscaldamento',
        },
        {
          id: generateId(),
          name: 'Rematore bilanciere',
          type: 'strength',
          order: 1,
          sets: 3,
          targetReps: 8,
          defaultWeight: 40,
          restSeconds: 120,
        },
        {
          id: generateId(),
          name: 'Pull-down cavi',
          type: 'strength',
          order: 2,
          sets: 3,
          targetReps: 10,
          defaultWeight: 45,
          restSeconds: 90,
        },
        {
          id: generateId(),
          name: 'Curl bilanciere',
          type: 'strength',
          order: 3,
          sets: 3,
          targetReps: 10,
          defaultWeight: 25,
          restSeconds: 90,
        },
        {
          id: generateId(),
          name: 'Triceps pushdown',
          type: 'strength',
          order: 4,
          sets: 3,
          targetReps: 12,
          defaultWeight: 20,
          restSeconds: 60,
        },
        {
          id: generateId(),
          name: 'Plank',
          type: 'strength',
          order: 5,
          sets: 3,
          targetReps: 1,
          defaultWeight: 0,
          restSeconds: 60,
          notes: '3 × 45 secondi',
        },
      ],
    },
    {
      id: generateId(),
      name: 'Seduta 4',
      order: 3,
      exercises: [
        {
          id: generateId(),
          name: 'Ellittica',
          type: 'cardio',
          order: 0,
          durationSeconds: 8 * 60,
          notes: '8 min riscaldamento',
        },
        {
          id: generateId(),
          name: 'Squat guidato',
          type: 'strength',
          order: 1,
          sets: 3,
          targetReps: 10,
          defaultWeight: 60,
          restSeconds: 120,
        },
        {
          id: generateId(),
          name: 'Leg Curl',
          type: 'strength',
          order: 2,
          sets: 3,
          targetReps: 12,
          defaultWeight: 30,
          restSeconds: 90,
        },
        {
          id: generateId(),
          name: 'Calf press',
          type: 'strength',
          order: 3,
          sets: 3,
          targetReps: 15,
          defaultWeight: 50,
          restSeconds: 60,
        },
        {
          id: generateId(),
          name: 'Shoulder press',
          type: 'strength',
          order: 4,
          sets: 3,
          targetReps: 8,
          defaultWeight: 20,
          restSeconds: 90,
        },
        {
          id: generateId(),
          name: 'Crunch con rotazione',
          type: 'strength',
          order: 5,
          sets: 3,
          targetReps: 12,
          defaultWeight: 0,
          restSeconds: 60,
        },
        {
          id: generateId(),
          name: 'Tapis roulant',
          type: 'cardio',
          order: 6,
          durationSeconds: 20 * 60,
          notes: 'Corsa continua velocità 6-7',
        },
      ],
    },
  ],
};

const DEFAULT_SETTINGS: AppSettings & { id: string } = {
  id: 'default',
  defaultRestSeconds: 90,
  soundEnabled: true,
  vibrationEnabled: true,
};

const DEFAULT_APP_STATE: AppState = {
  id: 'default',
  activeWorkoutId: undefined,
  timerState: undefined,
};

/**
 * Seeds the database with demo data on first launch.
 * Will NOT reseed if data already exists.
 */
export async function seedDatabase(): Promise<void> {
  const existingPrograms = await db.programs.count();
  const existingSettings = await db.settings.get('default');
  const existingAppState = await db.appState.get('default');

  // Seed program only if none exists
  if (existingPrograms === 0) {
    const program: Program = {
      id: generateId(),
      name: SEED_PROGRAM.name,
      createdAt: Date.now(),
      durationWeeks: SEED_PROGRAM.durationWeeks,
      sessions: SEED_PROGRAM.sessions,
    };
    await db.programs.add(program);
  }

  // Seed settings if not present
  if (!existingSettings) {
    await db.settings.add(DEFAULT_SETTINGS);
  }

  // Initialize app state if not present
  if (!existingAppState) {
    await db.appState.add(DEFAULT_APP_STATE);
  }
}

/* ============================================
   DATABASE — Dexie.js IndexedDB Schema
   ============================================ */

import Dexie, { type Table } from 'dexie';
import type { Program, Workout, AppSettings, AppState } from '@/types';

/**
 * WorkoutDB — the application's IndexedDB database.
 *
 * Tables:
 * - programs: the user's training program (sessions + exercise templates)
 * - workouts: individual workout log instances with all set data
 * - settings: singleton row for app settings
 * - appState: singleton row for ephemeral state (active workout, timer)
 *
 * Versioning: always add new versions, never mutate old ones.
 */
class WorkoutDB extends Dexie {
  programs!: Table<Program, string>;
  workouts!: Table<Workout, string>;
  settings!: Table<AppSettings & { id: string }, string>;
  appState!: Table<AppState, string>;

  constructor() {
    super('WorkoutAppDB');

    // Version 1 — initial schema
    this.version(1).stores({
      programs: 'id, createdAt',
      workouts: 'id, programId, sessionTemplateId, status, startedAt, completedAt',
      settings: 'id',
      appState: 'id',
    });
  }
}

export const db = new WorkoutDB();

export type { WorkoutDB };

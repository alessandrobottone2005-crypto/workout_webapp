/* ============================================
   TIMER STORE — Zustand + IndexedDB persistence
   Timer uses timestamps (not countdown vars)
   to survive navigation, locks, and rerenders
   ============================================ */

import { create } from 'zustand';
import type { TimerState } from '@/types';
import { appStateRepo } from '@/db/repositories';
import { settingsRepo } from '@/db/repositories';

interface TimerStore {
  timer: TimerState | null;
  // Actions
  startTimer: (durationSeconds: number, exerciseId?: string, workoutId?: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  extendTimer: (extraSeconds: number) => Promise<void>;
  markCompleted: () => Promise<void>;
  loadFromDB: () => Promise<void>;
  getRemainingSeconds: () => number;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  timer: null,

  getRemainingSeconds: () => {
    const { timer } = get();
    if (!timer || timer.status !== 'running') return 0;
    return Math.max(0, (timer.endAt - Date.now()) / 1000);
  },

  startTimer: async (durationSeconds, exerciseId, workoutId) => {
    const now = Date.now();
    const newTimer: TimerState = {
      durationSeconds,
      startedAt: now,
      endAt: now + durationSeconds * 1000,
      exerciseId,
      workoutId,
      status: 'running',
    };
    set({ timer: newTimer });
    await appStateRepo.setTimerState(newTimer);
  },

  stopTimer: async () => {
    set({ timer: null });
    await appStateRepo.setTimerState(undefined);
  },

  extendTimer: async (extraSeconds) => {
    const { timer } = get();
    if (!timer || timer.status !== 'running') return;
    const now = Date.now();
    // Extend from the later of now/endAt so we never shrink remaining time
    const base = Math.max(timer.endAt, now);
    const extended: TimerState = {
      ...timer,
      endAt: base + extraSeconds * 1000,
      durationSeconds: timer.durationSeconds + extraSeconds,
      status: 'running',
    };
    set({ timer: extended });
    await appStateRepo.setTimerState(extended);
  },

  markCompleted: async () => {
    const { timer } = get();
    if (!timer) return;
    const completed: TimerState = { ...timer, status: 'completed' };
    set({ timer: completed });
    await appStateRepo.setTimerState(completed);
  },

  loadFromDB: async () => {
    const state = await appStateRepo.get();
    if (state.timerState) {
      const t = state.timerState;
      // If it was running and has expired, mark as completed
      if (t.status === 'running' && t.endAt <= Date.now()) {
        const completed: TimerState = { ...t, status: 'completed' };
        set({ timer: completed });
        await appStateRepo.setTimerState(completed);
      } else {
        set({ timer: t });
      }
    }
  },
}));

/* ============================================
   SOUND SERVICE — Web Audio API beep
   Unlocked via user interaction. iOS-safe.
   ============================================ */

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

export function unlockAudio(): void {
  if (audioUnlocked) return;
  try {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    // Play silent buffer to unlock
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
    audioUnlocked = true;
  } catch {
    // Audio not supported
  }
}

export async function playTimerBeep(settingsEnabled: boolean): Promise<void> {
  if (!settingsEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    // Three short beeps
    const beepTimes = [0, 0.2, 0.4];
    for (const t of beepTimes) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(0.3, now + t + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + t + 0.15);
      osc.start(now + t);
      osc.stop(now + t + 0.2);
    }
  } catch {
    // Audio unavailable — visual feedback still works
  }
}

/* ============================================
   VIBRATION SERVICE — Feature-detected
   ============================================ */

export function vibrateTimerComplete(enabled: boolean): void {
  if (!enabled) return;
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 400]);
  }
  // Silently falls back if unavailable
}

export async function getDefaultRestSeconds(): Promise<number> {
  const settings = await settingsRepo.get();
  return settings.defaultRestSeconds;
}

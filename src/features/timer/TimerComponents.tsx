/* ============================================
   REST TIMER — Persistent pill + focused sheet
   Pill is globally visible during workout mode.
   Tap opens the dedicated Rest Timer view with
   stop / adjust controls. All math uses
   endAt - Date.now() (anti-drift).
   ============================================ */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Timer, Check } from 'lucide-react';
import { useTimerStore, playTimerBeep, vibrateTimerComplete } from './timerStore';
import { settingsRepo } from '@/db/repositories';
import { formatTimerSeconds } from '@/lib/formatters';
import { strings } from '@/lib/strings';

/* ============================================
   useRemainingSeconds — shared ticker
   Returns seconds remaining, ticking every 250ms
   based on endAt - Date.now(). Fires onExpired
   exactly once per running timer.
   ============================================ */

function useRemainingSeconds(onExpired?: () => void): number {
  const timer = useTimerStore((s) => s.timer);
  const [remaining, setRemaining] = useState(0);
  const hasTriggeredRef = useRef(false);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (!timer || timer.status !== 'running') {
      setRemaining(0);
      return;
    }

    hasTriggeredRef.current = false;

    const update = () => {
      const secs = (timer.endAt - Date.now()) / 1000;
      if (secs <= 0) {
        setRemaining(0);
        if (!hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          onExpiredRef.current?.();
        }
      } else {
        setRemaining(secs);
      }
    };

    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [timer]);

  if (!timer) return 0;
  if (timer.status === 'completed') return 0;
  return remaining;
}

/* ============================================
   TIMER COMPLETION FEEDBACK — beep + vibration
   Feature-detected, never throws when unsupported.
   Guarded so multiple hook instances / StrictMode
   remounts never fire the feedback twice.
   ============================================ */

let lastFeedbackAt = 0;

async function fireCompletionFeedback(): Promise<void> {
  const { markCompleted, timer } = useTimerStore.getState();
  const now = Date.now();
  const alreadyCompleted = timer?.status === 'completed';
  await markCompleted();
  if (alreadyCompleted || now - lastFeedbackAt < 2000) return;
  lastFeedbackAt = now;
  try {
    const s = await settingsRepo.get();
    await playTimerBeep(s.soundEnabled);
    vibrateTimerComplete(s.vibrationEnabled);
  } catch {
    // Settings unavailable — visual feedback already applied
  }
}

/* ============================================
   REST TIMER LAYER — global pill + focused sheet
   Rendered once inside AppShell so the remaining
   time is visible from anywhere in workout mode.
   ============================================ */

interface RestTimerLayerProps {
  /** Position pill above the bottom navigation when it is shown */
  hasNav: boolean;
}

export const RestTimerLayer: React.FC<RestTimerLayerProps> = ({ hasNav }) => {
  const timer = useTimerStore((s) => s.timer);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Completed pill shows briefly (3s) then hides; the sheet (if open)
  // keeps showing the completed state until dismissed by the user.
  const [showCompletedPill, setShowCompletedPill] = useState(false);
  const sheetOpenRef = useRef(false);
  sheetOpenRef.current = sheetOpen;

  const handleExpired = useCallback(() => {
    void fireCompletionFeedback();
  }, []);

  const remaining = useRemainingSeconds(handleExpired);

  // Show completed feedback when the timer finishes (live or while app was closed)
  useEffect(() => {
    if (timer?.status !== 'completed') {
      setShowCompletedPill(false);
      return;
    }
    setShowCompletedPill(true);
    const t = setTimeout(() => {
      setShowCompletedPill(false);
      // Clear the dormant completed state unless the user has the sheet open
      if (!sheetOpenRef.current) {
        void useTimerStore.getState().stopTimer();
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [timer?.status]);

  if (!timer || timer.status === 'idle') return null;

  const isCompletedStatus = timer.status === 'completed';
  const pillCompleted = isCompletedStatus;
  const pillVisible =
    timer.status === 'running' ||
    (isCompletedStatus && (showCompletedPill || sheetOpen));

  const bottomOffset = hasNav
    ? 'calc(80px + env(safe-area-inset-bottom))'
    : 'calc(24px + env(safe-area-inset-bottom))';

  const handleCloseSheet = () => {
    setSheetOpen(false);
    // Dismissing a finished timer clears it entirely
    if (useTimerStore.getState().timer?.status === 'completed') {
      void useTimerStore.getState().stopTimer();
    }
  };

  return (
    <>
      {/* Persistent pill — fixed, visible from anywhere in workout mode */}
      {pillVisible && (
        <div
          className="fixed left-0 right-0 z-30 flex justify-center pointer-events-none px-5"
          style={{ bottom: bottomOffset }}
        >
          <AnimatePresence>
            <motion.button
              key={pillCompleted ? 'done' : 'running'}
              initial={{ y: 80, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={() => setSheetOpen(true)}
              className={`pointer-events-auto flex items-center gap-2.5 px-5 min-h-[44px] rounded-pill border shadow-lg transition-colors ${
                pillCompleted
                  ? 'bg-accent-primary border-accent-primary/50'
                  : 'bg-bg-elevated border-border-default'
              }`}
              aria-label={
                pillCompleted
                  ? `${strings.timer.restDone}. Apri timer`
                  : `${strings.timer.rest}: ${formatTimerSeconds(remaining)}. Apri timer`
              }
            >
              {!pillCompleted ? (
                <>
                  <Timer className="w-[18px] h-[18px] text-icon-accent" strokeWidth={2} aria-hidden />
                  <span className="text-label-sm text-text-secondary uppercase tracking-wider">
                    {strings.timer.rest}
                  </span>
                  <span className="text-[17px] font-bold text-text-primary tabular-nums">
                    {formatTimerSeconds(remaining)}
                  </span>
                </>
              ) : (
                <>
                  <Check className="w-[18px] h-[18px] text-bg-app" strokeWidth={2.5} aria-hidden />
                  <span className="text-label-sm font-bold text-bg-app uppercase tracking-wider">
                    {strings.timer.restDone}
                  </span>
                </>
              )}
            </motion.button>
          </AnimatePresence>
        </div>
      )}

      {/* Focused Rest Timer view */}
      <AnimatePresence>
        {sheetOpen && <RestTimerSheet onClose={handleCloseSheet} />}
      </AnimatePresence>
    </>
  );
};

/* ============================================
   REST TIMER SHEET — dedicated focused view
   Big time, progress, adjust (+30s/+60s),
   presets, stop. Reached by tapping the pill.
   ============================================ */

interface RestTimerSheetProps {
  onClose: () => void;
}

const PRESETS = [60, 90, 120, 150] as const;

const RestTimerSheet: React.FC<RestTimerSheetProps> = ({ onClose }) => {
  const { timer, stopTimer, startTimer, extendTimer } = useTimerStore();
  const [justCompleted, setJustCompleted] = useState(false);

  const handleExpired = useCallback(() => {
    void fireCompletionFeedback();
    setJustCompleted(true);
  }, []);

  const remaining = useRemainingSeconds(handleExpired);
  const isCompleted = timer?.status === 'completed' || justCompleted;

  if (!timer) return null;

  const duration = timer.durationSeconds || 1;
  const progress = isCompleted ? 1 : Math.max(0, Math.min(1, remaining / duration));

  const handleStop = async () => {
    await stopTimer();
    onClose();
  };

  const handlePreset = async (seconds: number) => {
    await startTimer(seconds, timer.exerciseId, timer.workoutId);
    setJustCompleted(false);
  };

  const handleExtend = async (seconds: number) => {
    await extendTimer(seconds);
    setJustCompleted(false);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        aria-label={strings.timer.rest}
        className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto bg-bg-elevated rounded-t-modal border-t border-border-default"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-default" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-2">
          <div className="flex items-center gap-2">
            <Timer className="w-7 h-7 text-icon-accent" strokeWidth={2} aria-hidden />
            <p className="text-label-sm text-accent-primary uppercase tracking-[1.4px]">
              {isCompleted ? strings.timer.restDone : strings.timer.rest}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={strings.timer.dismiss}
            className="w-11 h-11 -mr-2 flex items-center justify-center text-text-secondary hover:text-text-primary"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Big time */}
        <div className="px-5 pt-4 pb-2 text-center">
          <motion.p
            key={isCompleted ? 'done' : 'time'}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-[72px] font-bold tabular-nums leading-none ${
              isCompleted ? 'text-accent-primary' : 'text-text-primary'
            }`}
            aria-live="polite"
          >
            {isCompleted ? '0:00' : formatTimerSeconds(remaining)}
          </motion.p>

          {/* Progress bar */}
          <div className="mt-5 h-1.5 bg-bg-surface rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                isCompleted ? 'bg-accent-primary' : 'bg-accent-primary'
              }`}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.25, ease: 'linear' }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 pt-5 pb-5 space-y-3">
          {isCompleted ? (
            <button
              onClick={onClose}
              className="w-full h-[56px] rounded-btn bg-accent-primary text-bg-app text-[15px] font-semibold tracking-wide active:scale-[0.97] transition-transform"
            >
              {strings.timer.dismiss}
            </button>
          ) : (
            <>
              {/* Adjust row */}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleExtend(30)}
                  className="flex-1 h-[52px] rounded-btn bg-bg-surface border border-border-default text-text-primary text-[15px] font-semibold active:scale-[0.97] transition-transform"
                  aria-label="Aggiungi 30 secondi"
                >
                  +0:30
                </button>
                <button
                  onClick={() => void handleExtend(60)}
                  className="flex-1 h-[52px] rounded-btn bg-bg-surface border border-border-default text-text-primary text-[15px] font-semibold active:scale-[0.97] transition-transform"
                  aria-label="Aggiungi 60 secondi"
                >
                  +1:00
                </button>
                <button
                  onClick={() => void handleStop()}
                  className="flex-1 h-[52px] rounded-btn bg-danger/10 border border-danger/20 text-danger text-[15px] font-semibold active:scale-[0.97] transition-transform"
                >
                  {strings.timer.stop}
                </button>
              </div>

              {/* Preset restart row */}
              <div>
                <p className="text-label-sm text-text-secondary uppercase tracking-wider mb-2">
                  {strings.timer.presets}
                </p>
                <div className="flex gap-2">
                  {PRESETS.map((s) => {
                    const isActive = s === timer.durationSeconds;
                    return (
                      <button
                        key={s}
                        onClick={() => void handlePreset(s)}
                        aria-pressed={isActive}
                        className={`flex-1 min-h-[44px] rounded-btn text-[14px] font-semibold border transition-all ${
                          isActive
                            ? 'bg-accent-primary text-bg-app border-accent-primary'
                            : 'bg-bg-surface text-text-secondary border-border-default'
                        }`}
                      >
                        {formatTimerSeconds(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
};

/* ============================================
   REST PRESET BUTTONS (inline on Exercise Focus)
   ============================================ */

interface RestPresetsProps {
  preferredSeconds?: number;
  onSelect: (seconds: number) => void;
  activeSeconds?: number;
}

export const RestPresets: React.FC<RestPresetsProps> = ({
  preferredSeconds,
  onSelect,
  activeSeconds,
}) => (
  <div className="flex gap-2 flex-wrap">
    {PRESETS.map((s) => {
      const isPreferred = s === preferredSeconds;
      const isActive = s === activeSeconds;
      return (
        <motion.button
          key={s}
          whileTap={{ scale: 0.92 }}
          onClick={() => onSelect(s)}
          className={`flex-1 min-w-[60px] h-[44px] rounded-btn text-[14px] font-semibold border transition-all duration-200 ${
            isActive
              ? 'bg-accent-primary text-bg-app border-accent-primary'
              : isPreferred
              ? 'bg-accent-primary/10 text-accent-primary border-accent-primary/30'
              : 'bg-bg-elevated text-text-secondary border-border-default hover:border-text-secondary'
          }`}
          aria-label={`${formatTimerSeconds(s)} recupero`}
          aria-pressed={isActive}
        >
          {formatTimerSeconds(s)}
        </motion.button>
      );
    })}
  </div>
);

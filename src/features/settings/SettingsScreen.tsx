/* ============================================
   SETTINGS SCREEN
   Timer defaults, sound, vibration, data reset
   ============================================ */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell, ScreenHeader } from '@/components/layout';
import { Toggle, ConfirmDialog } from '@/components/ui';
import { settingsRepo, resetAllData } from '@/db/repositories';
import { seedDatabase } from '@/db/seed';
import { useTimerStore } from '@/features/timer/timerStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { strings } from '@/lib/strings';
import type { AppSettings } from '@/types';

const REST_OPTIONS = [
  { label: '1:00', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2:00', value: 120 },
  { label: '2:30', value: 150 },
];

const sectionClass = 'bg-bg-surface rounded-card border border-border-default overflow-hidden';
const rowClass = 'flex items-center justify-between px-5 py-4 border-b border-border-default last:border-b-0';

export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    defaultRestSeconds: 90,
    soundEnabled: true,
    vibrationEnabled: true,
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [, setIsResetting] = useState(false);

  useEffect(() => {
    void settingsRepo.get().then(setSettings);
  }, []);

  const updateSetting = async (patch: Partial<AppSettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await settingsRepo.update(patch);
  };

  const handleReset = async () => {
    setIsResetting(true);
    await resetAllData();
    // Clear any stale in-memory state referencing deleted records
    useTimerStore.setState({ timer: null });
    useWorkoutStore.getState().clearActiveWorkout();
    await seedDatabase();
    setIsResetting(false);
    setShowResetConfirm(false);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
    // Reload settings
    const fresh = await settingsRepo.get();
    setSettings(fresh);
  };

  return (
    <AppShell>
      <ScreenHeader title={strings.settings.title} />

      <div className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))]">
        <div className="px-5 pt-4 space-y-5">
          {/* Timer default */}
          <div>
            <p className="text-label-sm text-text-secondary mb-3 px-1">TIMER</p>
            <div className={sectionClass}>
              <div className="px-5 pt-4 pb-3">
                <p className="text-body text-text-primary mb-3">
                  {strings.settings.defaultTimer}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {REST_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.value}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => void updateSetting({ defaultRestSeconds: opt.value })}
                      className={`h-[44px] rounded-btn text-meta font-semibold border transition-all ${
                        settings.defaultRestSeconds === opt.value
                          ? 'bg-accent-primary text-bg-app border-accent-primary'
                          : 'bg-bg-elevated text-text-secondary border-border-default'
                      }`}
                    >
                      {opt.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div>
            <p className="text-label-sm text-text-secondary mb-3 px-1">FEEDBACK</p>
            <div className={sectionClass}>
              <div className={rowClass}>
                <Toggle
                  label={strings.settings.sound}
                  checked={settings.soundEnabled}
                  onChange={(v) => void updateSetting({ soundEnabled: v })}
                />
              </div>
              <div className={rowClass}>
                <Toggle
                  label={strings.settings.vibration}
                  checked={settings.vibrationEnabled}
                  onChange={(v) => void updateSetting({ vibrationEnabled: v })}
                />
              </div>
            </div>
          </div>

          {/* Apple Health */}
          <div>
            <p className="text-label-sm text-text-secondary mb-3 px-1">INTEGRAZIONI</p>
            <div className={sectionClass}>
              <div className={rowClass}>
                <span className="text-body text-text-primary">
                  {strings.settings.appleHealth}
                </span>
                <span className="text-meta text-text-secondary">
                  {strings.settings.appleHealthNote}
                </span>
              </div>
            </div>
          </div>

          {/* Data */}
          <div>
            <p className="text-label-sm text-text-secondary mb-3 px-1">
              {strings.settings.data}
            </p>
            <div className={sectionClass}>
              <div className="px-5 py-4">
                <p className="text-meta text-text-secondary">
                  {strings.settings.dataInfo}
                </p>
                <p className="text-meta text-text-secondary mt-1">
                  Tutti i dati rimangono sul dispositivo.
                </p>
              </div>
              <div className="px-5 pb-4">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="text-danger text-meta font-semibold min-h-[44px] px-2 -mx-2 py-2 flex items-center justify-center rounded-btn hover:bg-danger/10 transition-colors"
                >
                  {strings.settings.resetData}
                </button>
              </div>
            </div>
          </div>

          {/* Version */}
          <div className="text-center pb-4">
            <p className="text-label-sm text-text-secondary">
              {strings.settings.version} 1.0.0
            </p>
          </div>

          {/* Reset done toast */}
          <AnimatePresence>
            {resetDone && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-bg-elevated border border-border-default rounded-pill px-5 py-3 text-meta text-text-primary shadow-lg"
              >
                ✓ Dati resettati
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Reset Confirm */}
      <AnimatePresence>
        {showResetConfirm && (
          <ConfirmDialog
            isOpen={showResetConfirm}
            title={strings.settings.resetData}
            description={strings.settings.resetConfirm}
            confirmLabel={strings.settings.resetButton}
            cancelLabel={strings.settings.resetCancel}
            onConfirm={handleReset}
            onCancel={() => setShowResetConfirm(false)}
            isDanger
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
};

/* ============================================
   CALENDAR SCREEN
   Monthly calendar with workout day indicators
   ============================================ */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppShell, ScreenHeader } from '@/components/layout';
import { workoutRepo } from '@/db/repositories';
import { getWorkoutDays, getWorkoutsOnDay } from '@/lib/selectors';
import { formatMonthYear, formatDate, formatDuration, startOfDay } from '@/lib/formatters';
import { strings } from '@/lib/strings';
import type { Workout } from '@/types';

const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getMondayOffset(year: number, month: number): number {
  const firstDay = new Date(year, month, 1).getDay();
  // JS: 0=Sun, 1=Mon... We want Monday=0
  return firstDay === 0 ? 6 : firstDay - 1;
}

export const CalendarScreen: React.FC = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  useEffect(() => {
    void workoutRepo.getAll().then(setWorkouts);
  }, []);

  const workoutDays = getWorkoutDays(workouts);
  const days = getDaysInMonth(viewYear, viewMonth);
  const offset = getMondayOffset(viewYear, viewMonth);
  const today = startOfDay(Date.now());

  const selectedWorkouts = selectedDay
    ? getWorkoutsOnDay(workouts, selectedDay)
    : [];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  return (
    <AppShell>
      <ScreenHeader title={strings.calendar.title} variant="display" titleSize="lg" />

      <div className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))]">
        <div className="px-5 pt-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={prevMonth}
              aria-label="Mese precedente"
              className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-text-primary"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>
            <h2 className="text-heading text-text-primary capitalize">
              {formatMonthYear(new Date(viewYear, viewMonth, 1).getTime())}
            </h2>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={nextMonth}
              aria-label="Mese successivo"
              className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-text-primary"
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_IT.map((d) => (
              <div key={d} className="text-center">
                <span className="text-label-sm text-text-secondary">{d}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {/* Offset blank cells */}
            {Array.from({ length: offset }, (_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {days.map((day) => {
              const dayTs = startOfDay(day.getTime());
              const hasWorkout = workoutDays.has(dayTs);
              const isToday = dayTs === today;
              const isSelected = dayTs === selectedDay;
              const isCurrentMonth = day.getMonth() === viewMonth;

              return (
                <motion.button
                  key={dayTs}
                  whileTap={{ scale: 0.9 }}
                  onClick={() =>
                    setSelectedDay(isSelected ? null : dayTs)
                  }
                  aria-label={`${day.getDate()} ${hasWorkout ? '- allenamento' : ''}`}
                  aria-pressed={isSelected}
                  className={`relative flex flex-col items-center justify-center w-full aspect-square rounded-full mx-auto max-w-[44px] transition-all duration-150 ${
                    isSelected
                      ? 'bg-accent-primary text-bg-app'
                      : isToday
                      ? 'bg-bg-elevated border border-accent-primary/40 text-text-primary'
                      : 'text-text-primary hover:bg-bg-elevated'
                  } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <span
                    className={`text-[15px] font-semibold ${
                      isSelected ? 'text-bg-app' : ''
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {hasWorkout && (
                    <div
                      className={`absolute bottom-1.5 w-1 h-1 rounded-full ${
                        isSelected ? 'bg-bg-app' : 'bg-accent-primary'
                      }`}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Selected Day Details */}
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <p className="text-label-sm text-text-secondary mb-3">
                {formatDate(selectedDay).toUpperCase()}
              </p>
              {selectedWorkouts.length > 0 ? (
                <div className="space-y-3">
                  {selectedWorkouts.map((w) => (
                    <div
                      key={w.id}
                      className="bg-bg-surface rounded-card border border-border-default p-4"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[15px] font-semibold text-text-primary">
                          {w.sessionNameSnapshot}
                        </h3>
                        <span className="text-label-sm text-accent-primary">
                          {strings.calendar.completed}
                        </span>
                      </div>
                      <p className="text-meta text-text-secondary">
                        {w.completedAt
                          ? formatDuration(w.completedAt - w.startedAt)
                          : '—'}
                        {' · '}
                        {
                          w.exerciseLogs.filter((e) => e.status === 'completed')
                            .length
                        }{' '}
                        esercizi
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-bg-surface rounded-card border border-border-default p-5 text-center">
                  <p className="text-meta text-text-secondary">
                    Nessun allenamento in questo giorno
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

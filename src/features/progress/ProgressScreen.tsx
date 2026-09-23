/* ============================================
   PROGRESS SCREEN
   Metrics, trends, exercise history overview
   ============================================ */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { AppShell, ScreenHeader } from '@/components/layout';
import { MetricCard, EmptyState, SectionHeader } from '@/components/ui';
import { workoutRepo, programRepo } from '@/db/repositories';
import {
  getWorkoutMetrics,
  getExercisePerformances,
  getExerciseTrend,
  detectExerciseStall,
} from '@/lib/selectors';
import { formatDuration, formatWeight } from '@/lib/formatters';
import { strings } from '@/lib/strings';
import type { Workout, Program } from '@/types';

export const ProgressScreen: React.FC = () => {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [all, prog] = await Promise.all([
        workoutRepo.getAll(),
        programRepo.getFirst(),
      ]);
      setWorkouts(all);
      setProgram(prog ?? null);
      setIsLoading(false);
    };
    void load();
  }, []);

  const completed = workouts.filter((w) => w.status === 'completed');
  const metrics = getWorkoutMetrics(completed);

  // Get unique strength exercises from program
  const strengthExercises =
    program?.sessions
      .flatMap((s) => s.exercises)
      .filter((e) => e.type === 'strength')
      .slice(0, 6) ?? [];

  if (isLoading) {
    return (
      <AppShell>
        <ScreenHeader title={strings.progress.title} variant="display" titleSize="xl" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (completed.length === 0) {
    return (
      <AppShell>
        <ScreenHeader title={strings.progress.title} variant="display" titleSize="xl" />
        <div className="flex-1 flex items-center justify-center px-5">
          <EmptyState
            title="Nessun dato ancora"
            description={strings.progress.noData}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader title={strings.progress.title} variant="display" titleSize="xl" />

      <div className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))]">
        <div className="px-5 pt-4 space-y-5">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label={strings.progress.totalWorkouts}
              value={String(metrics.totalCompleted)}
            />
            <MetricCard
              label={strings.progress.streak}
              value={`${metrics.currentStreak}`}
              sub="giorni consecutivi"
            />
            <MetricCard
              label={strings.progress.thisWeek}
              value={String(metrics.thisWeekCount)}
              sub="questa settimana"
            />
            <MetricCard
              label={strings.progress.avgDuration}
              value={
                metrics.averageDurationMs > 0
                  ? formatDuration(metrics.averageDurationMs)
                  : '—'
              }
            />
          </div>

          {/* Exercise Trends */}
          {strengthExercises.length > 0 && (
            <div>
              <SectionHeader title={strings.progress.exerciseTrends} />
              <div className="space-y-2">
                {strengthExercises.map((ex) => {
                  const perfs = getExercisePerformances(completed, ex.id);
                  const trend = getExerciseTrend(perfs);
                  const latest = perfs[perfs.length - 1];
                  const stall = detectExerciseStall(perfs);

                  return (
                    <motion.button
                      key={ex.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => navigate(`/progress/exercise/${ex.id}`)}
                      className="w-full flex items-center gap-3 p-4 rounded-card border border-border-default bg-bg-surface text-left hover:border-text-secondary/30 transition-colors"
                    >
                      {/* Trend icon */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          trend === 'up'
                            ? 'bg-accent-primary/10 text-accent-primary'
                            : trend === 'down'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-bg-elevated text-text-secondary'
                        }`}
                      >
                        {trend === 'up' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : trend === 'down' ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-semibold text-text-primary">
                            {ex.name}
                          </p>
                          {stall?.isStalled && (
                            <span className="text-label-sm text-warning">
                              STALLO
                            </span>
                          )}
                        </div>
                        <p className="text-meta text-text-secondary mt-0.5">
                          {latest
                            ? formatWeight(latest.representativeWeight)
                            : 'Nessun dato'}
                        </p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-text-secondary" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

/* ============================================
   EXERCISE HISTORY SCREEN
   Per-exercise weight chart + set history
   ============================================ */

import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatDateShort } from '@/lib/formatters';

export const ExerciseHistoryScreen: React.FC = () => {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exerciseName, setExerciseName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [all, prog] = await Promise.all([
        workoutRepo.getAll(),
        programRepo.getFirst(),
      ]);
      setWorkouts(all);

      // Get exercise name from program
      if (prog && exerciseId) {
        const ex = prog.sessions
          .flatMap((s) => s.exercises)
          .find((e) => e.id === exerciseId);
        if (ex) setExerciseName(ex.name);
      }
      setIsLoading(false);
    };
    void load();
  }, [exerciseId]);

  const completed = workouts.filter((w) => w.status === 'completed');
  const perfs = exerciseId ? getExercisePerformances(completed, exerciseId) : [];
  const stall = detectExerciseStall(perfs);

  const chartData = perfs.map((p) => ({
    date: formatDateShort(p.workoutDate),
    weight: p.representativeWeight,
    timestamp: p.workoutDate,
  }));

  const latestPerf = perfs[perfs.length - 1];

  if (isLoading) {
    return (
      <AppShell showNav={false}>
        <ScreenHeader title="Storico" showBack />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showNav={false}>
      <ScreenHeader
        title={exerciseName.toUpperCase() || 'ESERCIZIO'}
        showBack
      />

      <div className="flex-1 overflow-y-auto pb-[calc(40px+env(safe-area-inset-bottom))]">
        <div className="px-5 pt-4 space-y-5">
          {/* Latest performance */}
          {latestPerf && (
            <div className="bg-bg-surface rounded-card border border-border-default p-5">
              <p className="text-label-sm text-text-secondary mb-1">
                {strings.exerciseHistory.last}
              </p>
              <p className="text-[32px] font-bold text-text-primary">
                {formatWeight(latestPerf.representativeWeight)}
              </p>
              <p className="text-meta text-text-secondary mt-1">
                {latestPerf.sets.length} serie ·{' '}
                {latestPerf.sets[0]?.reps} rep
              </p>
            </div>
          )}

          {/* Stall warning */}
          {stall?.isStalled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-warning/10 border border-warning/30 rounded-card p-4"
            >
              <p className="text-label-sm text-warning mb-1">
                {strings.progress.stall}
              </p>
              <p className="text-meta text-text-primary">
                {strings.progress.stallDetail(
                  formatWeight(stall.currentWeight),
                  stall.daysSinceIncrease
                )}
              </p>
            </motion.div>
          )}

          {/* Weight chart */}
          {chartData.length > 1 ? (
            <div className="bg-bg-surface rounded-card border border-border-default p-5">
              <p className="text-label-sm text-text-secondary mb-4">
                {strings.exerciseHistory.chart}
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2C2C2E"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#8E8E93', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8E8E93', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1C1C1E',
                      border: '1px solid #2C2C2E',
                      borderRadius: 10,
                      color: '#F5F5F7',
                      fontSize: 13,
                    }}
                    formatter={(value: number) => [formatWeight(value), 'Peso']}
                    labelStyle={{ color: '#8E8E93' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#C8FF3D"
                    strokeWidth={2}
                    dot={{ fill: '#C8FF3D', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#C8FF3D' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : chartData.length === 1 ? (
            <div className="bg-bg-surface rounded-card border border-border-default p-5 text-center">
              <p className="text-meta text-text-secondary">
                Completa un altro allenamento per vedere il grafico
              </p>
            </div>
          ) : (
            <EmptyState
              title={strings.exerciseHistory.noData}
              description="I dati appariranno dopo il primo allenamento"
            />
          )}

          {/* Historical entries */}
          {perfs.length > 0 && (
            <div>
              <SectionHeader title="STORICO" />
              <div className="space-y-3">
                {[...perfs].reverse().map((perf) => (
                  <div
                    key={perf.workoutDate}
                    className="bg-bg-surface rounded-card border border-border-default p-4"
                  >
                    <p className="text-meta text-text-secondary mb-2">
                      {formatDateShort(perf.workoutDate)}
                    </p>
                    <div className="space-y-1">
                      {perf.sets.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <span className="text-meta text-text-secondary">
                            Serie {i + 1}
                          </span>
                          <span className="text-meta text-text-primary font-semibold">
                            {formatWeight(s.weight)} × {s.reps}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

/* ============================================
   MY PROGRAM SCREEN
   Shows session list and program metadata
   ============================================ */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Pencil } from 'lucide-react';
import { AppShell, ScreenHeader } from '@/components/layout';
import { Button, EmptyState } from '@/components/ui';
import { programRepo, workoutRepo } from '@/db/repositories';
import { getNextSessionId, getCurrentProgramWeek } from '@/lib/selectors';
import { strings } from '@/lib/strings';
import type { Program, Workout } from '@/types';

export const ProgramScreen: React.FC = () => {
  const navigate = useNavigate();
  const [program, setProgram] = useState<Program | null>(null);
  const [completedWorkouts, setCompletedWorkouts] = useState<Workout[]>([]);
  const [nextSessionId, setNextSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [prog, workouts] = await Promise.all([
        programRepo.getFirst(),
        workoutRepo.getCompleted(),
      ]);
      setProgram(prog ?? null);
      setCompletedWorkouts(workouts);
      if (prog) {
        const nextId = getNextSessionId(prog.sessions, workouts);
        setNextSessionId(nextId ?? null);
      }
      setIsLoading(false);
    };
    void load();
  }, []);

  if (isLoading) {
    return (
      <AppShell>
        <ScreenHeader title="La Mia Scheda" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!program) {
    return (
      <AppShell>
        <ScreenHeader title="La Mia Scheda" />
        <div className="flex-1 flex items-center justify-center px-5">
          <EmptyState
            title={strings.program.noProgram}
            description="Crea una scheda per iniziare ad allenarti"
          />
        </div>
      </AppShell>
    );
  }

  const currentWeek = getCurrentProgramWeek(program.startDate);
  const sortedSessions = [...program.sessions].sort((a, b) => a.order - b.order);

  return (
    <AppShell>
      <ScreenHeader
        title={strings.program.title}
        rightAction={
          <button
            onClick={() => navigate(`/program/${program.id}/edit`)}
            aria-label="Modifica scheda"
            className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <Pencil className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))]">
        <div className="px-5 space-y-4 pt-4">
          {/* Program Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-surface rounded-card border border-border-default p-5"
          >
            <h2 className="text-heading text-text-primary">{program.name}</h2>
            <p className="text-meta text-text-secondary mt-1">
              {strings.program.current}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (currentWeek / program.durationWeeks) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-meta text-text-secondary whitespace-nowrap">
                {strings.program.weeks(
                  Math.min(currentWeek, program.durationWeeks),
                  program.durationWeeks
                )}
              </span>
            </div>
          </motion.div>

          {/* Sessions */}
          <div>
            <p className="text-label-sm text-text-secondary mb-3 px-1">SEDUTE</p>
            <div className="space-y-2">
              {sortedSessions.map((session, idx) => {
                const isNext = session.id === nextSessionId;
                const completedForSession = completedWorkouts.filter(
                  (w) => w.sessionTemplateId === session.id
                ).length;

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <button
                      onClick={() => navigate(`/program/session/${session.id}`)}
                      className={`w-full flex items-center gap-4 p-4 rounded-card border text-left transition-all duration-200 ${
                        isNext
                          ? 'bg-accent-primary/5 border-accent-primary/30'
                          : 'bg-bg-surface border-border-default hover:border-text-secondary/30'
                      }`}
                    >
                      {/* Session number */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[15px] font-bold ${
                          isNext
                            ? 'bg-accent-primary text-bg-app'
                            : 'bg-bg-elevated text-text-secondary'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-semibold text-text-primary">
                            {session.name}
                          </p>
                          {isNext && (
                            <span className="text-label-sm text-accent-primary">
                              PROSSIMA
                            </span>
                          )}
                        </div>
                        <p className="text-meta text-text-secondary mt-0.5">
                          {session.exercises.length} esercizi
                          {completedForSession > 0
                            ? ` · ${completedForSession} volte`
                            : ''}
                        </p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-text-secondary flex-shrink-0" />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Edit Button */}
          <div className="pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigate(`/program/${program.id}/edit`)}
            >
              {strings.program.editProgram}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

/* ============================================
   SESSION DETAIL SCREEN
   ============================================ */

import { useParams } from 'react-router-dom';
import type { SessionTemplate } from '@/types';

export const SessionDetailScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionTemplate | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const prog = await programRepo.getFirst();
      if (!prog || !sessionId) return;
      setProgramId(prog.id);
      const s = prog.sessions.find((s) => s.id === sessionId);
      setSession(s ?? null);
    };
    void load();
  }, [sessionId]);

  if (!session) {
    return (
      <AppShell>
        <ScreenHeader title="Seduta" showBack />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  const sortedExercises = [...session.exercises].sort((a, b) => a.order - b.order);

  return (
    <AppShell showNav={false}>
      <ScreenHeader
        title={session.name.toUpperCase()}
        showBack
        rightAction={
          <button
            onClick={() => navigate(`/program/session/${sessionId}/edit`)}
            aria-label="Modifica seduta"
            className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-text-primary"
          >
            <Pencil className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto pb-[calc(40px+env(safe-area-inset-bottom))]">
        <div className="px-5 pt-4 space-y-2">
          {sortedExercises.map((ex, i) => (
            <motion.button
              key={ex.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() =>
                navigate(`/exercise/${ex.id}/edit`, {
                  state: { programId, sessionId },
                })
              }
              className="w-full flex items-center gap-4 p-4 rounded-card border border-border-default bg-bg-surface text-left hover:border-text-secondary/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-meta text-text-secondary font-semibold">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-text-primary">{ex.name}</p>
                <p className="text-meta text-text-secondary mt-0.5">
                  {ex.type === 'cardio'
                    ? 'Cardio'
                    : `${ex.sets} × ${ex.targetReps}${
                        ex.defaultWeight ? ` · ${ex.defaultWeight} kg` : ''
                      }`}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary" />
            </motion.button>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

/* ============================================
   WORKOUT OVERVIEW SCREEN
   Shows exercise list with status + reordering
   ============================================ */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, ChevronRight, GripVertical, X } from 'lucide-react';
import { AppShell, ScreenHeader } from '@/components/layout';
import { Button, ProgressBar, ConfirmDialog } from '@/components/ui';
import { useWorkoutStore } from '@/stores/workoutStore';
import { workoutRepo } from '@/db/repositories';
import { formatDuration } from '@/lib/formatters';
import { strings } from '@/lib/strings';
import type { WorkoutExerciseLog, Workout } from '@/types';

/* ============================================
   SORTABLE EXERCISE ROW
   ============================================ */

interface ExerciseRowProps {
  log: WorkoutExerciseLog;
  isActive: boolean;
  onTap: () => void;
  isDragging?: boolean;
}

const SortableExerciseRow: React.FC<ExerciseRowProps & { id: string }> = ({
  id,
  log,
  isActive,
  onTap,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const completedSets = log.setLogs.length;
  const plannedSets = log.plannedSetsSnapshot;

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        animate={{ opacity: isDragging ? 0.7 : 1 }}
        className={`flex items-center gap-3 p-4 rounded-card border transition-colors duration-200 ${
          isActive
            ? 'bg-accent-primary/5 border-accent-primary/30'
            : log.status === 'completed'
            ? 'bg-bg-surface border-border-default opacity-60'
            : 'bg-bg-surface border-border-default'
        }`}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          aria-label={`Riordina ${log.exerciseNameSnapshot}`}
          className="touch-none w-11 h-11 -ml-2 flex items-center justify-center text-text-secondary opacity-40 hover:opacity-100 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Status icon */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            log.status === 'completed'
              ? 'bg-accent-primary/20 text-accent-primary'
              : isActive
              ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/30'
              : 'bg-bg-elevated border border-border-default text-text-secondary'
          }`}
        >
          {log.status === 'completed' ? (
            <Check className="w-4 h-4" />
          ) : (
            <span className="text-label-sm">{completedSets}</span>
          )}
        </div>

        {/* Exercise info */}
        <button className="flex-1 text-left min-w-0 min-h-[44px] flex flex-col justify-center" onClick={onTap}>
          <p
            className={`text-[15px] font-semibold truncate ${
              log.status === 'completed'
                ? 'text-text-secondary line-through'
                : 'text-text-primary'
            }`}
          >
            {log.exerciseNameSnapshot}
          </p>
          <p className="text-meta text-text-secondary mt-0.5">
            {log.exerciseTypeSnapshot === 'cardio'
              ? 'Cardio'
              : log.status === 'completed'
              ? `${completedSets} / ${plannedSets} serie`
              : isActive
              ? `${completedSets} / ${plannedSets} serie`
              : `${plannedSets} serie`}
          </p>
        </button>

        {/* Chevron */}
        {log.status !== 'completed' && (
          <button
            onClick={onTap}
            aria-label={`Apri ${log.exerciseNameSnapshot}`}
            className="w-11 h-11 -mr-2 flex items-center justify-center"
          >
            <ChevronRight
              className={`w-5 h-5 ${isActive ? 'text-accent-primary' : 'text-text-secondary'}`}
            />
          </button>
        )}
      </motion.div>
    </div>
  );
};

/* ============================================
   WORKOUT OVERVIEW SCREEN
   ============================================ */

export const WorkoutOverviewScreen: React.FC = () => {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const {
    activeWorkout,
    resumeWorkout,
    reorderExercises,
    completeWorkout,
    cancelWorkout,
  } = useWorkoutStore();

  const [localWorkout, setLocalWorkout] = useState<Workout | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  useEffect(() => {
    const load = async () => {
      if (!workoutId) return;
      // If store has it, use it
      if (activeWorkout?.id === workoutId) {
        setLocalWorkout(activeWorkout);
        return;
      }
      // Otherwise load from DB (e.g., viewing completed workout)
      const w = await workoutRepo.getById(workoutId);
      if (w) {
        setLocalWorkout(w);
        if (w.status === 'active') resumeWorkout(w);
      }
    };
    void load();
  }, [workoutId, activeWorkout, resumeWorkout]);

  // Sync local workout with store
  useEffect(() => {
    if (activeWorkout?.id === workoutId) {
      setLocalWorkout(activeWorkout);
    }
  }, [activeWorkout, workoutId]);

  // Elapsed timer
  useEffect(() => {
    if (!localWorkout || localWorkout.status !== 'active') return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - localWorkout.startedAt);
    }, 1000);
    setElapsedMs(Date.now() - localWorkout.startedAt);
    return () => clearInterval(interval);
  }, [localWorkout]);

  const workout = localWorkout;
  if (!workout) {
    return (
      <AppShell showNav={false}>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
        </div>
      </AppShell>
    );
  }

  const sortedLogs = [...workout.exerciseLogs].sort((a, b) => a.order - b.order);
  const completedCount = sortedLogs.filter((e) => e.status === 'completed').length;
  const totalCount = sortedLogs.length;
  const activeLog = sortedLogs.find((e) => e.status === 'active');
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const allCompleted = completedCount === totalCount;
  const isReadOnly = workout.status !== 'active';

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedLogs.findIndex((e) => e.id === active.id);
    const newIndex = sortedLogs.findIndex((e) => e.id === over.id);
    const reordered = arrayMove(sortedLogs, oldIndex, newIndex);
    void reorderExercises(reordered.map((e) => e.id));
  };

  const handleExerciseTap = (log: WorkoutExerciseLog) => {
    if (isReadOnly) return;
    navigate(`/workout/${workout.id}/exercise/${log.id}`);
  };

  const handleCompleteWorkout = async () => {
    setIsCompleting(true);
    await completeWorkout();
    navigate(`/workout/${workout.id}/complete`, { replace: true });
  };

  const handleCancel = async () => {
    setShowCancelConfirm(false);
    await cancelWorkout();
    navigate('/', { replace: true });
  };

  return (
    <AppShell showNav={false}>
      <ScreenHeader
        title={workout.sessionNameSnapshot.toUpperCase()}
        subtitle={isReadOnly ? undefined : formatDuration(elapsedMs)}
        showBack
        onBack={() => navigate('/')}
        rightAction={
          !isReadOnly ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              aria-label="Termina allenamento"
              className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-danger transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto pb-[calc(96px+env(safe-area-inset-bottom))]">
        {/* Progress */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-meta text-text-secondary">
              {strings.workout.progress(completedCount, totalCount)}
            </p>
            {!isReadOnly && allCompleted && (
              <span className="text-label-sm text-accent-primary">
                COMPLETO ✓
              </span>
            )}
          </div>
          <ProgressBar value={progress} />
        </div>

        {/* Exercise List */}
        <div className="px-5">
          {!isReadOnly ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedLogs.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {sortedLogs.map((log) => (
                    <SortableExerciseRow
                      key={log.id}
                      id={log.id}
                      log={log}
                      isActive={activeLog?.id === log.id}
                      onTap={() => handleExerciseTap(log)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-2">
              {sortedLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center gap-3 p-4 rounded-card border ${
                    log.status === 'completed'
                      ? 'bg-bg-surface border-border-default'
                      : 'bg-bg-surface border-border-default opacity-60'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      log.status === 'completed'
                        ? 'bg-accent-primary/20 text-accent-primary'
                        : 'bg-bg-elevated border border-border-default text-text-secondary'
                    }`}
                  >
                    {log.status === 'completed' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-label-sm">{log.setLogs.length}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-semibold text-text-primary">
                      {log.exerciseNameSnapshot}
                    </p>
                    <p className="text-meta text-text-secondary">
                      {log.status === 'completed'
                        ? `${log.setLogs.length} serie`
                        : `${log.plannedSetsSnapshot} serie`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Complete Workout CTA */}
        {!isReadOnly && (
          <div className="px-5 mt-6">
            {allCompleted ? (
              <Button
                variant="primary"
                fullWidth
                isLoading={isCompleting}
                onClick={handleCompleteWorkout}
              >
                COMPLETA WORKOUT
              </Button>
            ) : (
              <p className="text-center text-meta text-text-secondary">
                Completa tutti gli esercizi per terminare
              </p>
            )}
          </div>
        )}
      </div>

      {/* Confirm Cancel Dialog */}
      <AnimatePresence>
        {showCancelConfirm && (
          <ConfirmDialog
            isOpen={showCancelConfirm}
            title={strings.workout.inProgress}
            description={strings.workout.confirmCancelDetail}
            confirmLabel="Termina allenamento"
            cancelLabel={strings.workout.resumeWorkout}
            onConfirm={handleCancel}
            onCancel={() => setShowCancelConfirm(false)}
            isDanger
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
};

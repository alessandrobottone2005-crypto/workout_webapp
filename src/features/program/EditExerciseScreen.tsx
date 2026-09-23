/* ============================================
   EDIT EXERCISE SCREEN
   Form to edit all exercise fields
   ============================================ */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppShell, ScreenHeader } from '@/components/layout';
import { Button, ConfirmDialog } from '@/components/ui';
import { programRepo } from '@/db/repositories';
import { generateId } from '@/lib/ids';
import { parseWeight } from '@/lib/formatters';
import { strings } from '@/lib/strings';
import type { ExerciseTemplate, ExerciseType } from '@/types';

interface FormState {
  name: string;
  type: ExerciseType;
  sets: string;
  targetReps: string;
  defaultWeight: string;
  restSeconds: string;
  durationSeconds: string;
  notes: string;
}

const inputClass =
  'w-full bg-bg-elevated border border-border-default rounded-btn px-4 h-[52px] text-text-primary text-body focus:border-accent-primary focus:outline-none transition-colors placeholder:text-text-secondary/50';
const labelClass = 'text-label-sm text-text-secondary mb-2 block';

export const EditExerciseScreen: React.FC = () => {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    programId?: string;
    sessionId?: string;
    newExercise?: ExerciseTemplate;
    isNew?: boolean;
  } | null;

  const [form, setForm] = useState<FormState>({
    name: '',
    type: 'strength',
    sets: '3',
    targetReps: '8',
    defaultWeight: '0',
    restSeconds: '90',
    durationSeconds: '600',
    notes: '',
  });
  const [programId, setProgramId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    const load = async () => {
      const pId = state?.programId;
      const sId = state?.sessionId;
      setProgramId(pId ?? null);
      setSessionId(sId ?? null);

      // If new exercise passed via state
      if (state?.newExercise && state.isNew) {
        const ex = state.newExercise;
        setForm({
          name: ex.name === 'Nuovo esercizio' ? '' : ex.name,
          type: ex.type,
          sets: String(ex.sets ?? 3),
          targetReps: String(ex.targetReps ?? 8),
          defaultWeight: String(ex.defaultWeight ?? 0).replace('.', ','),
          restSeconds: String(ex.restSeconds ?? 90),
          durationSeconds: String(ex.durationSeconds ?? 600),
          notes: ex.notes ?? '',
        });
        return;
      }

      // Load from DB
      if (!pId || !sId || !exerciseId) return;
      const prog = await programRepo.getById(pId);
      if (!prog) return;
      const session = prog.sessions.find((s) => s.id === sId);
      if (!session) return;
      const ex = session.exercises.find((e) => e.id === exerciseId);
      if (!ex) return;

      setForm({
        name: ex.name,
        type: ex.type,
        sets: String(ex.sets ?? 3),
        targetReps: String(ex.targetReps ?? 8),
        defaultWeight: String(ex.defaultWeight ?? 0),
        restSeconds: String(ex.restSeconds ?? 90),
        durationSeconds: String(ex.durationSeconds ?? 600),
        notes: ex.notes ?? '',
      });
    };
    void load();
  }, [exerciseId, state]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = 'Il nome è obbligatorio';
    if (form.type === 'strength') {
      if (parseInt(form.sets) < 1) errs.sets = 'Minimo 1 serie';
      if (parseInt(form.targetReps) < 1) errs.targetReps = 'Minimo 1 ripetizione';
      if (Number.isNaN(parseFloat(form.defaultWeight.replace(',', '.'))))
        errs.defaultWeight = 'Peso non valido';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !programId || !sessionId) return;
    setIsSaving(true);

    const exercise: ExerciseTemplate = {
      id: exerciseId ?? generateId(),
      name: form.name.trim(),
      type: form.type,
      order: 0, // repository preserves existing order / appends new exercises
      sets: form.type === 'strength' ? parseInt(form.sets) || 3 : undefined,
      targetReps: form.type === 'strength' ? parseInt(form.targetReps) || 8 : undefined,
      defaultWeight:
        form.type === 'strength' ? parseWeight(form.defaultWeight) || 0 : undefined,
      restSeconds: form.type === 'strength' ? parseInt(form.restSeconds) || 90 : undefined,
      durationSeconds: form.type === 'cardio' ? parseInt(form.durationSeconds) || 600 : undefined,
      notes: form.notes.trim() || undefined,
    };

    await programRepo.updateExercise(programId, sessionId, exercise);
    setIsSaving(false);
    navigate(-1);
  };

  const handleDelete = async () => {
    if (!programId || !sessionId || !exerciseId) return;
    await programRepo.deleteExercise(programId, sessionId, exerciseId);
    setShowDeleteConfirm(false);
    navigate(-1);
  };

  const restMinutes = Math.floor(parseInt(form.restSeconds || '0') / 60);
  const restSecs = parseInt(form.restSeconds || '0') % 60;

  return (
    <AppShell showNav={false}>
      <ScreenHeader
        title={form.name.toUpperCase() || 'ESERCIZIO'}
        showBack
        titleSize="lg"
      />

      <div className="flex-1 overflow-y-auto pb-[calc(120px+env(safe-area-inset-bottom))]">
        <div className="px-5 pt-4 space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="ex-name" className={labelClass}>
              {strings.editExercise.name}
            </label>
            <input
              id="ex-name"
              type="text"
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              placeholder="Es: Chest Press"
              className={`${inputClass} ${errors.name ? 'border-danger' : ''}`}
            />
            {errors.name && (
              <p className="text-meta text-danger mt-1">{errors.name}</p>
            )}
          </div>

          {/* Type Toggle */}
          <div>
            <label className={labelClass}>Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['strength', 'cardio'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => set('type')(t)}
                  className={`h-[52px] rounded-btn border text-[15px] font-semibold transition-all ${
                    form.type === t
                      ? 'bg-accent-primary text-bg-app border-accent-primary'
                      : 'bg-bg-elevated text-text-secondary border-border-default'
                  }`}
                >
                  {t === 'strength' ? 'Forza' : 'Cardio'}
                </button>
              ))}
            </div>
          </div>

          {form.type === 'strength' ? (
            <>
              {/* Sets */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ex-sets" className={labelClass}>
                    {strings.editExercise.sets}
                  </label>
                  <input
                    id="ex-sets"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={20}
                    value={form.sets}
                    onChange={(e) => set('sets')(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="ex-reps" className={labelClass}>
                    {strings.editExercise.reps}
                  </label>
                  <input
                    id="ex-reps"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={form.targetReps}
                    onChange={(e) => set('targetReps')(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Weight */}
              <div>
                <label htmlFor="ex-weight" className={labelClass}>
                  {strings.editExercise.weight}
                </label>
                <div className="relative">
                  <input
                    id="ex-weight"
                    type="text"
                    inputMode="decimal"
                    value={form.defaultWeight}
                    onChange={(e) => set('defaultWeight')(e.target.value)}
                    className={`${inputClass} pr-12 ${errors.defaultWeight ? 'border-danger' : ''}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary text-meta">
                    kg
                  </span>
                </div>
                {errors.defaultWeight && (
                  <p className="text-meta text-danger mt-1">{errors.defaultWeight}</p>
                )}
              </div>

              {/* Rest */}
              <div>
                <label htmlFor="ex-rest" className={labelClass}>
                  {strings.editExercise.rest} ({restMinutes}m {restSecs > 0 ? `${restSecs}s` : ''})
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[60, 90, 120, 150].map((s) => (
                    <button
                      key={s}
                      onClick={() => set('restSeconds')(String(s))}
                      className={`h-[44px] rounded-btn text-meta font-semibold border transition-all ${
                        parseInt(form.restSeconds) === s
                          ? 'bg-accent-primary text-bg-app border-accent-primary'
                          : 'bg-bg-elevated text-text-secondary border-border-default'
                      }`}
                    >
                      {s === 60 ? '1:00' : s === 90 ? '1:30' : s === 120 ? '2:00' : '2:30'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Cardio duration */
            <div>
              <label htmlFor="ex-duration" className={labelClass}>
                Durata (secondi)
              </label>
              <input
                id="ex-duration"
                type="number"
                inputMode="numeric"
                min={60}
                value={form.durationSeconds}
                onChange={(e) => set('durationSeconds')(e.target.value)}
                className={inputClass}
              />
              <p className="text-meta text-text-secondary mt-1">
                = {Math.floor(parseInt(form.durationSeconds || '0') / 60)} minuti
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="ex-notes" className={labelClass}>
              {strings.editExercise.notes}
            </label>
            <textarea
              id="ex-notes"
              value={form.notes}
              onChange={(e) => set('notes')(e.target.value)}
              placeholder="Note, cues tecnici..."
              rows={3}
              className="w-full bg-bg-elevated border border-border-default rounded-card px-4 py-3 text-text-primary text-body focus:border-accent-primary focus:outline-none transition-colors placeholder:text-text-secondary/50 resize-none"
            />
          </div>

          {/* Delete Button */}
          {exerciseId && !state?.isNew && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full min-h-[44px] text-center text-danger text-meta font-semibold py-3"
            >
              {strings.editExercise.delete}
            </button>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-4 bg-bg-app border-t border-border-default">
        <Button variant="primary" fullWidth isLoading={isSaving} onClick={handleSave}>
          {strings.editExercise.save}
        </Button>
      </div>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title={strings.editExercise.confirmDelete}
          description={strings.editExercise.confirmDeleteDetail}
          confirmLabel={strings.actions.delete}
          cancelLabel={strings.actions.cancel}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          isDanger
        />
      )}
    </AppShell>
  );
};

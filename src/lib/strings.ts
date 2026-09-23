/* ============================================
   Italian UI strings
   Centralized for future localization
   ============================================ */

export const strings = {
  // Navigation
  nav: {
    home: 'Home',
    program: 'Scheda',
    progress: 'Progressi',
    calendar: 'Calendario',
  },

  // Home
  home: {
    greeting: 'Buongiorno',
    subtitle: 'Pronto ad allenarti?',
    todayLabel: 'OGGI',
    lastWorkout: 'ULTIMO WORKOUT',
    thisWeek: 'QUESTA SETTIMANA',
    startWorkout: 'INIZIA WORKOUT',
    resumeWorkout: 'RIPRENDI ALLENAMENTO',
    exercises: (n: number) => `${n} esercizi`,
    workoutsPerWeek: (done: number, target: number) => `${done} / ${target} workout`,
    noWorkoutHistory: 'Nessun allenamento completato ancora.',
    noProgram: 'Nessuna scheda configurata.',
  },

  // Workout
  workout: {
    overview: 'WORKOUT',
    progress: (done: number, total: number) => `${done} / ${total} esercizi completati`,
    status: {
      upcoming: 'PROSSIMO',
      active: 'ATTIVO',
      done: 'FATTO',
    },
    startCta: 'INIZIA WORKOUT',
    continueCta: 'CONTINUA WORKOUT',
    completeCta: 'COMPLETA',
    endCta: 'TERMINA',
    cancelWorkout: 'Termina allenamento',
    resumeWorkout: 'Riprendi',
    inProgress: 'Allenamento in corso',
    confirmCancel: 'Sei sicuro di voler terminare l\'allenamento?',
    confirmCancelDetail: 'Il progresso parziale verrà salvato.',
    seriesLabel: (current: number, total: number) => `Serie ${current} di ${total}`,
    lastTime: 'ULTIMA VOLTA',
    noLastTime: 'Primo allenamento',
    reps: 'RIPETIZIONI',
    weight: 'PESO',
    edit: 'modifica',
    completeSet: 'COMPLETA SERIE',
    restPresets: 'RECUPERO',
    cardioStart: 'AVVIA',
    cardioComplete: 'COMPLETA',
  },

  // Exercise
  exercise: {
    completed: 'COMPLETATA',
    series: (n: number) => `${n} serie`,
  },

  // Timer
  timer: {
    rest: 'RECUPERO',
    restDone: 'RECUPERO TERMINATO',
    adjust: 'AGGIUNGI TEMPO',
    stop: 'TERMINA RECUPERO',
    presets: 'RICOMINCIA',
    dismiss: 'CHIUDI',
    running: 'Recupero in corso',
  },

  // Workout Complete
  workoutComplete: {
    title: 'WORKOUT\nCOMPLETATO',
    exercises: (n: number) => `${n} esercizi`,
    sets: (n: number) => `${n} serie`,
    progress: 'PROGRESSI',
    end: 'TERMINA',
  },

  // Program
  program: {
    title: 'LA MIA SCHEDA',
    current: 'Programma attuale',
    weeks: (current: number, total: number) => `${current} / ${total} settimane`,
    editProgram: 'MODIFICA SCHEDA',
    addExercise: '+ AGGIUNGI ESERCIZIO',
    noProgram: 'Nessuna scheda configurata.',
    createProgram: 'Crea scheda',
  },

  // Edit exercise
  editExercise: {
    title: 'ESERCIZIO',
    name: 'Nome',
    sets: 'Serie',
    reps: 'Ripetizioni',
    weight: 'Peso iniziale',
    rest: 'Recupero',
    notes: 'Note',
    save: 'SALVA ESERCIZIO',
    cancel: 'Annulla',
    delete: 'Elimina esercizio',
    confirmDelete: 'Eliminare questo esercizio dalla scheda?',
    confirmDeleteDetail: 'Lo storico allenamenti non verrà eliminato.',
  },

  // Progress
  progress: {
    title: 'PROGRESSI',
    thisWeek: 'QUESTA SETTIMANA',
    streak: 'Streak',
    totalWorkouts: 'Workout completati',
    avgDuration: 'Durata media',
    exerciseTrends: 'ANDAMENTO ESERCIZI',
    noData: 'I tuoi progressi appariranno dopo i primi allenamenti.',
    stall: 'PROGRESSIONE',
    stallDetail: (weight: string, days: number) =>
      `Sei a ${weight} da ${days} giorni.\n\nTi senti stabile con tecnica e ripetizioni?\nPotresti provare un piccolo aumento di carico.`,
  },

  // Exercise history
  exerciseHistory: {
    last: 'ULTIMO',
    chart: 'Storico peso',
    noData: 'Nessun dato disponibile per questo esercizio.',
  },

  // Calendar
  calendar: {
    title: 'CALENDARIO',
    completed: 'COMPLETATO',
  },

  // Settings
  settings: {
    title: 'IMPOSTAZIONI',
    defaultTimer: 'Timer recupero predefinito',
    sound: 'Suono',
    vibration: 'Vibrazione',
    data: 'DATI',
    dataInfo: 'I dati sono salvati localmente su questo dispositivo.',
    resetData: 'Resetta dati app',
    resetConfirm: 'Questa azione eliminerà definitivamente scheda, allenamenti e storico presenti su questo dispositivo.',
    resetButton: 'ELIMINA TUTTO',
    resetCancel: 'Annulla',
    appleHealth: 'Apple Health',
    appleHealthNote: 'Richiede app nativa',
    version: 'Versione',
  },

  // Errors / Empty states
  errors: {
    genericError: 'Si è verificato un errore.',
    dbError: 'Errore nel salvataggio dei dati.',
    retry: 'Riprova',
    notFound: 'Pagina non trovata.',
    goHome: 'Torna alla home',
  },

  // Actions
  actions: {
    save: 'Salva',
    cancel: 'Annulla',
    confirm: 'Conferma',
    delete: 'Elimina',
    edit: 'Modifica',
    back: 'Indietro',
    done: 'Fatto',
  },
} as const;

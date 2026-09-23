# Workout App

App personale per il tracking degli allenamenti in palestra. Progettata per uso durante l'allenamento con pesi — veloce, offline-first, ottimizzata per iPhone.

## Caratteristiche principali

- **Offline-first** — funziona senza connessione dopo il primo caricamento
- **PWA installabile** — si installa come app nativa su iPhone
- **Nessun account** — tutti i dati locali su IndexedDB
- **14 schermate complete** — Home, Workout, Esercizio, Timer, Progressi, Calendario, Impostazioni
- **Timer anti-drift** — usa `endAt - Date.now()`, non un countdown variabile
- **Drag-and-drop** — riordina esercizi durante il workout
- **Stall detection** — rilevamento plateau automatico senza AI
- **UI italiana** — tutta l'interfaccia in italiano

## Stack tecnico

| Layer | Tecnologia |
|-------|-----------|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| Styling | Tailwind CSS v3 + CSS custom properties |
| Icons | lucide-react |
| Animation | Framer Motion |
| Routing | React Router v6 |
| Database | Dexie.js (IndexedDB) |
| State | Zustand (UI) + Dexie (persistente) |
| Drag & Drop | @dnd-kit |
| Charts | Recharts |
| PWA | vite-plugin-pwa + Workbox |
| Test | Vitest + React Testing Library |

## Installazione e avvio

```bash
# Installa dipendenze
npm install

# Dev server
npm run dev

# Build produzione
npm run build

# Preview build
npm run preview

# Typecheck
npm run typecheck

# Test
npm run test
```

## PWA

L'app è installabile come PWA su iPhone:

1. Apri `http://localhost:5174` su Safari iPhone
2. Tocca il pulsante "Condividi"
3. Seleziona "Aggiungi a schermata Home"
4. L'app funziona offline dopo il primo caricamento

Service worker pre-cacha tutti gli asset statici. I dati del workout vengono salvati in IndexedDB e sopravvivono ai refresh.

## Architettura database

**IndexedDB via Dexie.js** — 4 tabelle:

| Tabella | Chiave | Contenuto |
|---------|--------|-----------|
| `programs` | `id` | Programma + sedute + esercizi template |
| `workouts` | `id` | Log workout con tutti i set |
| `settings` | `id='default'` | Impostazioni utente |
| `appState` | `id='default'` | Workout attivo, stato timer |

## Struttura cartelle

```
src/
  app/           → App.tsx, router.tsx
  components/
    ui/           → Button, ProgressBar, NumericStepper, ecc.
    layout/       → AppShell, ScreenHeader, BottomNavigation
  features/
    home/         → HomeScreen
    workout/      → WorkoutOverview, ExerciseFocus, WeightEditor, WorkoutCompleted
    program/      → ProgramScreen, EditSession, EditExercise
    timer/        → timerStore, TimerPill, RestPresets
    progress/     → ProgressScreen, ExerciseHistory
    calendar/     → CalendarScreen
    settings/     → SettingsScreen
  db/             → database.ts, repositories.ts, seed.ts
  lib/            → formatters.ts, selectors.ts, strings.ts, ids.ts
  stores/         → workoutStore.ts
  types/          → index.ts
  styles/         → globals.css, tailwind.css
  test/           → selectors.test.ts, setup.ts
```

## Come funzionano i dati locali

Tutti i dati sono su IndexedDB (`WorkoutAppDB`). Non c'è backend, non c'è sincronizzazione cloud. I dati sopravvivono ai refresh grazie a Dexie.

**Snapshot strategy**: i record storici salvano snapshot del nome esercizio e dei parametri al momento del workout. Se rinomini "Chest Press" → "Chest Press Machine", i vecchi workout mostrano ancora il nome originale.

## Limitazioni note

- **Apple Health**: non disponibile da PWA. Richiede wrapper app nativa (Capacitor/Expo).
- **Background timer iOS**: iOS Safari può throttlare i timer quando l'app è in background. Il timer usa `endAt` timestamps per recuperare il tempo corretto alla riapertura.
- **Notifiche push**: non implementate in V1.
- **Vibrazione**: supportata solo dove disponibile `navigator.vibrate` (non iOS Safari).
- **Audio**: richiede interazione utente preventiva per sblocco su iOS.

## Dati seed

Al primo avvio, l'app carica un programma demo con 4 sedute realistiche (Seduta 1–4). La scheda è completamente modificabile dall'utente tramite la sezione "Scheda".

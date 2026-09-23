/* ============================================
   FORMATTERS — Italian locale formatting
   ============================================ */

/**
 * Format weight in kg with Italian decimal separator.
 * Stores as numbers internally, displays with comma.
 *
 * Examples: 45 → "45 kg", 82.5 → "82,5 kg"
 */
export function formatWeight(kg: number): string {
  const formatted = kg.toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} kg`;
}

/**
 * Format weight without the "kg" suffix.
 * Examples: 82.5 → "82,5"
 */
export function formatWeightValue(kg: number): string {
  return kg.toLocaleString('it-IT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse an Italian-formatted weight string to a number.
 * Handles both comma and dot as decimal separators.
 *
 * Examples: "82,5" → 82.5, "45" → 45
 */
export function parseWeight(value: string): number {
  // Replace comma with dot for JS parsing
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a duration in milliseconds to a human-readable string.
 * Examples: 4680000 → "1h 18min"
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Format seconds as MM:SS timer display.
 * Examples: 90 → "1:30", 3600 → "60:00"
 */
export function formatTimerSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

/**
 * Format a timestamp to Italian date string.
 * Examples: 1727000000000 → "23 settembre 2026"
 */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp));
}

/**
 * Format a timestamp to short Italian date.
 * Examples: 1727000000000 → "23 set"
 */
export function formatDateShort(timestamp: number): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp));
}

/**
 * Format a timestamp to month + year.
 * Examples: 1727000000000 → "settembre 2026"
 */
export function formatMonthYear(timestamp: number): string {
  return new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp));
}

/**
 * Format reps count.
 * Examples: 8 → "8 rip", 1 → "1 rip"
 */
export function formatReps(reps: number): string {
  return `${reps} rip`;
}

/**
 * Get start of day (00:00:00.000) for a given timestamp.
 */
export function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get start of week (Monday) for a given timestamp.
 */
export function startOfWeek(timestamp: number): number {
  const d = new Date(timestamp);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Check if two timestamps are on the same calendar day.
 */
export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/**
 * Get number of days between two timestamps (absolute).
 */
export function daysBetween(a: number, b: number): number {
  const ms = Math.abs(a - b);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

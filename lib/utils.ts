import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Convert "HH:MM" time string to minutes from midnight.
 * Returns null if input is null/undefined/empty.
 */
export function timeToMin(tstr: string | null | undefined): number | null {
  if (!tstr) return null;
  const trimmed = tstr.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Convert minutes from midnight to "HH:MM" string.
 * Handles values >= 1440 (next day) by wrapping.
 */
export function minToTime(m: number): string {
  const wrapped = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const min = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Returns true if a 9-hour shift starting at `start` minutes covers the slot at `slot`.
 * A shift covers slots from start (inclusive) to start+540 (exclusive).
 * Handles overnight shifts (wraps around midnight).
 */
export function covers(start: number, slot: number): boolean {
  const shiftEnd = start + 540; // 9 hours = 540 minutes
  if (shiftEnd <= 1440) {
    // Normal shift: start <= slot < end
    return slot >= start && slot < shiftEnd;
  } else {
    // Overnight shift: covers start..1440 and 0..(end-1440)
    return slot >= start || slot < shiftEnd - 1440;
  }
}

/**
 * Convert an off-pair (array of day names) to a 7-element mask.
 * Index 0 = Monday, 6 = Sunday.
 * Returns [1,1,1,...] with 0s at off positions.
 * (1 = working, 0 = off)
 */
export function offMask(pair: string[]): number[] {
  const dayIndex: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  const mask = [1, 1, 1, 1, 1, 1, 1];
  for (const day of pair) {
    const idx = dayIndex[day];
    if (idx !== undefined) {
      mask[idx] = 0;
    }
  }
  return mask;
}

/**
 * Parse weekday from date string "DD-MM-YYYY".
 * Returns "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", or null on failure.
 */
export function parseWeekdayFromDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  // Try DD-MM-YYYY format
  const ddmmyyyy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  let match = trimmed.match(ddmmyyyy);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }
  // Try YYYY-MM-DD format
  const yyyymmdd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  match = trimmed.match(yyyymmdd);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }
  // Try MM/DD/YYYY
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  match = trimmed.match(mmddyyyy);
  if (match) {
    const month = parseInt(match[1], 10) - 1;
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const date = new Date(year, month, day);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }
  return null;
}

/**
 * Format shift as "HH:MM–HH:MM" string.
 */
export function shiftStr(start: number, end: number): string {
  return `${minToTime(start)}–${minToTime(end)}`;
}

/**
 * Trigger a file download in the browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format a number as percentage string with 2 decimal places.
 */
export function formatPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

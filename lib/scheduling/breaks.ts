import { Agent, Weekday, WEEKDAYS } from './types';
import { minToTime, offMask } from '../utils';

export interface BreakRow {
  agent: string;
  shiftStart: string;
  shiftEnd: string;
  offDays: string;
  [key: string]: string;
}

const TEA_BREAK_MIN = 15;
const MIN_GAP = 60; // minimum gap between breaks in minutes

/**
 * Get the next weekday (Mon→Tue→...→Sun→Mon).
 */
function nextWeekday(wd: Weekday): Weekday {
  const idx = WEEKDAYS.indexOf(wd);
  return WEEKDAYS[(idx + 1) % 7];
}

/**
 * Resolve actual day and label for a break time that may cross midnight.
 * If t >= 1440, it's the next day.
 */
function resolveDayAndTime(wd: Weekday, t: number): { day: Weekday; timeStr: string } {
  if (t >= 1440) {
    return { day: nextWeekday(wd), timeStr: minToTime(t % 1440) };
  }
  return { day: wd, timeStr: minToTime(t) };
}

/**
 * Format a break as "HH:MM-HH:MM" string.
 */
function formatBreak(startMin: number, durationMin: number): string {
  const start = ((startMin % 1440) + 1440) % 1440;
  const end = ((startMin + durationMin) % 1440 + 1440) % 1440;
  return `${minToTime(start)}-${minToTime(end)}`;
}

/**
 * Pick a random element from an array.
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Schedule breaks (WFM break optimizer) for all agents.
 *
 * Break structure per working day:
 * - Break1: 15-min tea break (~1-3hrs into shift)
 * - Lunch: configurable duration
 * - Break2: 15-min tea break (~1hr before end)
 */
export function scheduleBreaks(
  agents: Agent[],
  allSlots: number[],
  scheduledCounts: Record<Weekday, Record<string, number>>,
  baselineReq: Record<Weekday, Record<string, number>>,
  lunchMinutes: number
): BreakRow[] {
  const rows: BreakRow[] = [];

  for (const agent of agents) {
    const s = agent.start;
    const e = agent.end;
    const mask = offMask(agent.off);

    // Handle overnight shifts
    const isOvernight = e <= s;
    const shiftEnd = isOvernight ? e + 1440 : e;

    // Extended slots for overnight coverage
    const extendedSlots = isOvernight
      ? [...allSlots, ...allSlots.map((t) => t + 1440)]
      : allSlots;

    const row: BreakRow = {
      agent: agent.id,
      shiftStart: minToTime(s),
      shiftEnd: minToTime(agent.end),
      offDays: agent.off.join(', '),
    };

    // Initialize all break columns to empty
    for (const wd of WEEKDAYS) {
      row[`${wd}_Break_1`] = '';
      row[`${wd}_Lunch`] = '';
      row[`${wd}_Break_2`] = '';
    }

    for (let wi = 0; wi < WEEKDAYS.length; wi++) {
      if (mask[wi] === 0) continue; // off day
      const wd = WEEKDAYS[wi];

      // Slots covered by this shift (using extended for overnight)
      const coveredSlots = extendedSlots.filter(
        (t) => t >= s && t + 30 <= shiftEnd
      );

      // Tea break candidate times: slot starts and slot starts + 15
      const teaSlots = [
        ...coveredSlots,
        ...coveredSlots.map((t) => t + TEA_BREAK_MIN),
      ].sort((a, b) => a - b);

      // ---- Break 1 ----
      const b1Candidates = teaSlots.filter(
        (t) =>
          t >= s + MIN_GAP &&
          t <= Math.min(s + 180, shiftEnd - 120) &&
          t + TEA_BREAK_MIN <= shiftEnd
      );

      let bestB1: number;
      if (b1Candidates.length > 0) {
        bestB1 = randomChoice(b1Candidates);
      } else {
        // Fallback: looser constraint
        const fallback1 = teaSlots.filter(
          (t) => t >= s + 30 && t <= shiftEnd - 150 && t + TEA_BREAK_MIN <= shiftEnd
        );
        if (fallback1.length > 0) {
          bestB1 = randomChoice(fallback1);
        } else {
          // Hard fallback
          const hardFallback = teaSlots.filter(
            (t) => t >= s && t + TEA_BREAK_MIN <= shiftEnd
          );
          bestB1 = hardFallback.length > 0 ? randomChoice(hardFallback) : s + 30;
        }
      }

      const b1End = bestB1 + TEA_BREAK_MIN;

      // ---- Lunch ----
      const lunchSlotCandidates = coveredSlots.filter(
        (t) =>
          t >= b1End + MIN_GAP &&
          t + lunchMinutes <= shiftEnd &&
          t <= shiftEnd - 90
      );

      let bestLunch: number;
      if (lunchSlotCandidates.length > 0) {
        bestLunch = randomChoice(lunchSlotCandidates);
      } else {
        // Fallback lunch
        const fallbackLunch = extendedSlots.filter(
          (t) =>
            t >= b1End + 45 &&
            t + lunchMinutes <= shiftEnd &&
            t <= shiftEnd - 60
        );
        if (fallbackLunch.length > 0) {
          bestLunch = randomChoice(fallbackLunch);
        } else {
          bestLunch = b1End + 45;
        }
      }

      const lunchEnd = bestLunch + lunchMinutes;

      // ---- Break 2 ----
      const b2Candidates = teaSlots.filter(
        (t) =>
          t >= lunchEnd + MIN_GAP &&
          t + TEA_BREAK_MIN <= shiftEnd &&
          t <= shiftEnd - 15
      );

      let bestB2: number;
      if (b2Candidates.length > 0) {
        bestB2 = randomChoice(b2Candidates);
      } else {
        // Fallback B2
        const fallback2 = teaSlots.filter(
          (t) =>
            t >= lunchEnd + 30 &&
            t + TEA_BREAK_MIN <= shiftEnd &&
            t <= shiftEnd - 15
        );
        if (fallback2.length > 0) {
          bestB2 = randomChoice(fallback2);
        } else {
          const hardFallback2 = teaSlots.filter(
            (t) => t >= s + 30 && t + TEA_BREAK_MIN <= shiftEnd
          );
          bestB2 =
            hardFallback2.length > 0
              ? randomChoice(hardFallback2)
              : shiftEnd - TEA_BREAK_MIN;
        }
      }

      // ---- Resolve overnight days ----
      const { day: b1Day, timeStr: _ } = resolveDayAndTime(wd, bestB1);
      const { day: lunchDay } = resolveDayAndTime(wd, bestLunch);
      const { day: b2Day } = resolveDayAndTime(wd, bestB2);

      // Format break strings
      const b1Str = formatBreak(bestB1, TEA_BREAK_MIN);
      const lunchStr = formatBreak(bestLunch, lunchMinutes);
      const b2Str = formatBreak(bestB2, TEA_BREAK_MIN);

      // Assign to row using resolved days
      row[`${b1Day}_Break_1`] = b1Str;
      row[`${lunchDay}_Lunch`] = lunchStr;
      row[`${b2Day}_Break_2`] = b2Str;
    }

    rows.push(row);
  }

  return rows;
}

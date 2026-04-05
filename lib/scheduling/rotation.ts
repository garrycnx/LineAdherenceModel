import { Agent, MonthlyRosterRow } from './types';

const SHIFT_SEQUENCE = ['Morning', 'Mid', 'Night', 'Mid'] as const;
type ShiftKey = (typeof SHIFT_SEQUENCE)[number];

export const SHIFT_LABELS: Record<ShiftKey, string> = {
  Morning: 'Morning 06:00–15:00',
  Mid: 'Mid 14:00–23:00',
  Night: 'Night 22:00–07:00',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Post-process a monthly roster row to ensure no agent works more than
 * `max` consecutive days. When a streak is found, the middle day of the
 * streak is converted to 'OFF'.
 */
function enforceMaxConsecutiveDays(
  row: MonthlyRosterRow,
  dateKeys: string[],
  max: number
): void {
  let changed = true;
  while (changed) {
    changed = false;
    let streak = 0;
    let streakStart = 0;

    for (let i = 0; i <= dateKeys.length; i++) {
      const isWork = i < dateKeys.length && row[dateKeys[i]] !== 'OFF';
      if (isWork) {
        if (streak === 0) streakStart = i;
        streak++;
      } else {
        if (streak > max) {
          const midIdx = streakStart + Math.floor(streak / 2);
          row[dateKeys[midIdx]] = 'OFF';
          changed = true;
          break;
        }
        streak = 0;
      }
    }
  }
}

/**
 * Generate monthly roster with shift and off-day rotation.
 *
 * Rotation rules:
 * - Agents split into 4 groups (by index % 4, stored in agent.shiftGroup)
 * - Week w (0-3), group g → shift = SHIFT_SEQUENCE[(g + w) % 4]
 * - Week w, agent → off_pair = offPairs[(agent.offPairIndex + w) % offPairs.length]
 * - "Week" defined as days 1-7, 8-14, 15-21, 22-end (week index = floor((day-1)/7), capped at 3)
 *
 * @returns rows and sorted date keys
 */
export function generateMonthlyRoster(
  agents: Agent[],
  offPairs: string[][],
  year: number,
  month: number // 1-12
): { rows: MonthlyRosterRow[]; dateKeys: string[] } {
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build date keys in order
  const dateKeys: string[] = [];
  const dayInfos: Array<{ dateKey: string; weekdayName: string; weekIndex: number }> = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const weekIndex = Math.min(3, Math.floor((day - 1) / 7));
    const date = new Date(year, month - 1, day);
    const weekdayName = DAY_NAMES[date.getDay()];
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateKey = `${year}-${mm}-${dd}`;
    dateKeys.push(dateKey);
    dayInfos.push({ dateKey, weekdayName, weekIndex });
  }

  const rows: MonthlyRosterRow[] = agents.map((agent) => {
    const row: MonthlyRosterRow = {
      agent: agent.id,
      shiftGroup: agent.shiftGroup,
    };

    for (const { dateKey, weekdayName, weekIndex } of dayInfos) {
      // Determine shift type for this week and group
      const shiftTypeIdx = (agent.shiftGroup + weekIndex) % 4;
      const shiftType = SHIFT_SEQUENCE[shiftTypeIdx];

      // Determine off pair for this week
      const offPairIdx = (agent.offPairIndex + weekIndex) % offPairs.length;
      const offDays = offPairs[offPairIdx];

      // Check if this is an off day
      if (offDays.includes(weekdayName)) {
        row[dateKey] = 'OFF';
      } else {
        row[dateKey] = SHIFT_LABELS[shiftType];
      }
    }

    // Enforce max 6 consecutive working days
    enforceMaxConsecutiveDays(row, dateKeys, 6);

    return row;
  });

  return { rows, dateKeys };
}

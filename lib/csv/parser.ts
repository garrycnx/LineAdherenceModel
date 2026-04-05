import Papa from 'papaparse';
import { ParsedCSVData, Weekday, WEEKDAYS, InputFormat } from '../scheduling/types';
import { timeToMin, minToTime, parseWeekdayFromDate } from '../utils';

/**
 * Normalize a number string: handle comma-decimal and thousands separators.
 */
function normaliseNumber(s: string): string {
  const trimmed = s.trim();
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    if (parts.length === 2 && /^\d+$/.test(parts[1]) && parts[1].length <= 2) {
      // comma-decimal: "7,5" → "7.5"
      return trimmed.replace(',', '.');
    }
    // thousands separator: "1,000" → "1000"
    return trimmed.replace(/,/g, '');
  }
  return trimmed;
}

/**
 * Strip BOM character from string.
 */
function stripBOM(s: string): string {
  return s.replace(/^\uFEFF/, '');
}

/**
 * Find column name by priority list (case-insensitive substring match).
 */
function findColumn(headers: string[], priorities: string[]): string | null {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  for (const p of priorities) {
    const idx = lowerHeaders.findIndex((h) => h.includes(p));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

/**
 * Convert time string to slot label.
 * Accepts: "HH:MM", "H:MM", "HH:MM:SS", "HHMM"
 */
function parseTimeSlot(tstr: string): { slotMin: number; slotLabel: string } | null {
  const trimmed = tstr.trim();

  // Try HH:MM or H:MM
  const hmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (hmMatch) {
    const h = parseInt(hmMatch[1], 10);
    const m = parseInt(hmMatch[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      const slotMin = h * 60 + m;
      const endMin = slotMin + 30;
      return {
        slotMin,
        slotLabel: `${minToTime(slotMin)}–${minToTime(endMin)}`,
      };
    }
  }

  // Try HHMM (4 digit)
  const hmm = trimmed.match(/^(\d{4})$/);
  if (hmm) {
    const h = parseInt(hmm[1].substring(0, 2), 10);
    const m = parseInt(hmm[1].substring(2), 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      const slotMin = h * 60 + m;
      return {
        slotMin,
        slotLabel: `${minToTime(slotMin)}–${minToTime(slotMin + 30)}`,
      };
    }
  }

  // Try range "HH:MM-HH:MM" or "HH:MM–HH:MM"
  const rangeMatch = trimmed.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (rangeMatch) {
    const min = timeToMin(rangeMatch[1]);
    if (min !== null) {
      return {
        slotMin: min,
        slotLabel: `${minToTime(min)}–${minToTime(min + 30)}`,
      };
    }
  }

  return null;
}

/**
 * Parse forecast CSV for SLA mode.
 * Expected columns: date, interval, volume
 */
export function parseForecastCSV(text: string): ParsedCSVData | { error: string } {
  const cleanText = stripBOM(text);

  const parsed = Papa.parse<Record<string, string>>(cleanText, {
    header: true,
    skipEmptyLines: true,
    trimHeaders: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { error: `CSV parse error: ${parsed.errors[0].message}` };
  }

  const headers = parsed.meta.fields ?? [];
  if (headers.length === 0) {
    return { error: 'No columns found in CSV' };
  }

  // Column detection
  const dateCol = findColumn(headers, ['date']);
  const intervalCol = findColumn(headers, ['interval', 'time', 'slot', 'period']);
  const volumeCol = findColumn(headers, ['volume', 'calls', 'forecast', 'demand', 'contact']);

  if (!dateCol) return { error: 'Could not find a "date" column in CSV' };
  if (!intervalCol)
    return { error: 'Could not find an interval/time/slot column in CSV' };
  if (!volumeCol)
    return { error: 'Could not find a volume/calls/forecast column in CSV' };

  // Aggregate by (weekday, slotMin)
  const aggMap: Map<
    string,
    { weekday: Weekday; slotMin: number; slotLabel: string; totalVolume: number; count: number }
  > = new Map();

  const slotSet = new Set<number>();
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const dateStr = row[dateCol]?.trim() ?? '';
    const intervalStr = row[intervalCol]?.trim() ?? '';
    const volumeStr = normaliseNumber(row[volumeCol]?.trim() ?? '0');

    // Parse weekday from date
    const weekday = parseWeekdayFromDate(dateStr);
    if (!weekday) {
      if (errors.length < 3) {
        errors.push(`Row ${i + 2}: Could not parse date "${dateStr}"`);
      }
      continue;
    }

    if (!WEEKDAYS.includes(weekday as Weekday)) {
      continue;
    }

    // Parse time slot
    const slotInfo = parseTimeSlot(intervalStr);
    if (!slotInfo) {
      if (errors.length < 3) {
        errors.push(`Row ${i + 2}: Could not parse interval "${intervalStr}"`);
      }
      continue;
    }

    const volume = parseFloat(volumeStr);
    if (isNaN(volume)) continue;

    const key = `${weekday}|${slotInfo.slotMin}`;
    const existing = aggMap.get(key);
    if (existing) {
      existing.totalVolume += volume;
      existing.count++;
    } else {
      aggMap.set(key, {
        weekday: weekday as Weekday,
        slotMin: slotInfo.slotMin,
        slotLabel: slotInfo.slotLabel,
        totalVolume: volume,
        count: 1,
      });
    }
    slotSet.add(slotInfo.slotMin);
  }

  if (aggMap.size === 0) {
    const errMsg = errors.length > 0 ? ` Errors: ${errors.join('; ')}` : '';
    return { error: `No valid data rows found in CSV.${errMsg}` };
  }

  // Convert to rawRows (use average volume per day-slot)
  const rawRows = Array.from(aggMap.values()).map((v) => ({
    weekday: v.weekday,
    slotMin: v.slotMin,
    slotLabel: v.slotLabel,
    volume: v.totalVolume / v.count,
    rawValue: v.totalVolume / v.count,
    displayRaw: (v.totalVolume / v.count).toFixed(1),
  }));

  // Sort by weekday order, then slot
  rawRows.sort((a, b) => {
    const wdDiff = WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday);
    if (wdDiff !== 0) return wdDiff;
    return a.slotMin - b.slotMin;
  });

  const allSlots = Array.from(slotSet).sort((a, b) => a - b);

  return {
    mode: 'sla',
    rawRows,
    allSlots,
  };
}

/**
 * Parse staffing requirements CSV for LA mode.
 * Expected columns: weekday, interval, required_staff OR required_hours
 */
export function parseStaffingCSV(
  text: string,
  inputFormat: InputFormat
): ParsedCSVData | { error: string } {
  const cleanText = stripBOM(text);

  const parsed = Papa.parse<Record<string, string>>(cleanText, {
    header: true,
    skipEmptyLines: true,
    trimHeaders: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { error: `CSV parse error: ${parsed.errors[0].message}` };
  }

  const headers = parsed.meta.fields ?? [];
  if (headers.length === 0) {
    return { error: 'No columns found in CSV' };
  }

  // Column detection with priority order (mutual exclusion)
  const weekdayCol = findColumn(headers, ['weekday', 'day', 'dow']);
  const intervalCol = findColumn(headers, [
    'interval',
    'time',
    'slot',
    'period',
    'timeslot',
    'halfhour',
  ]);

  // Value column: check for hours first if format is hours, otherwise staff
  let valueCol: string | null = null;
  if (inputFormat === 'Required Hours') {
    valueCol = findColumn(headers, ['hours', 'required_hours', 'req_hours']);
    if (!valueCol) {
      valueCol = findColumn(headers, ['required', 'staff', 'agent', 'headcount', 'fte', 'hc']);
    }
  } else {
    valueCol = findColumn(headers, ['required', 'staff', 'agent', 'headcount', 'fte', 'hc']);
    if (!valueCol) {
      valueCol = findColumn(headers, ['hours']);
    }
  }

  if (!weekdayCol) return { error: 'Could not find a weekday/day/dow column in CSV' };
  if (!intervalCol) return { error: 'Could not find an interval/time/slot column in CSV' };
  if (!valueCol) return { error: 'Could not find a required staff/hours column in CSV' };

  const dataMap: Map<
    string,
    { weekday: Weekday; slotMin: number; slotLabel: string; value: number }
  > = new Map();

  const slotSet = new Set<number>();
  const errors: string[] = [];
  const rawReqHoursByDay: Record<string, number> = {};

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const weekdayRaw = row[weekdayCol]?.trim() ?? '';
    const intervalStr = row[intervalCol]?.trim() ?? '';
    const valueStr = normaliseNumber(row[valueCol]?.trim() ?? '0');

    // Validate weekday
    const weekdayNorm = weekdayRaw.charAt(0).toUpperCase() + weekdayRaw.slice(1).toLowerCase();
    const weekdayShort = weekdayNorm.substring(0, 3) as Weekday;

    if (!WEEKDAYS.includes(weekdayShort)) {
      // Try full names
      const fullMap: Record<string, Weekday> = {
        monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
        friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
      };
      const mapped = fullMap[weekdayRaw.toLowerCase()];
      if (!mapped) {
        if (errors.length < 3) {
          errors.push(`Row ${i + 2}: Invalid weekday "${weekdayRaw}"`);
        }
        continue;
      }
      // Use mapped value
    }

    const finalWeekday: Weekday = (() => {
      const fullMap: Record<string, Weekday> = {
        monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
        friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
      };
      return fullMap[weekdayRaw.toLowerCase()] ?? (weekdayRaw.substring(0, 3) as Weekday);
    })();

    if (!WEEKDAYS.includes(finalWeekday)) {
      continue;
    }

    const slotInfo = parseTimeSlot(intervalStr);
    if (!slotInfo) {
      if (errors.length < 3) {
        errors.push(`Row ${i + 2}: Could not parse interval "${intervalStr}"`);
      }
      continue;
    }

    const value = parseFloat(valueStr);
    if (isNaN(value) || value < 0) continue;

    const key = `${finalWeekday}|${slotInfo.slotMin}`;
    dataMap.set(key, {
      weekday: finalWeekday,
      slotMin: slotInfo.slotMin,
      slotLabel: slotInfo.slotLabel,
      value,
    });
    slotSet.add(slotInfo.slotMin);

    // Accumulate raw required hours by day
    const hoursValue = inputFormat === 'Required Hours' ? value : value * 0.5;
    rawReqHoursByDay[finalWeekday] = (rawReqHoursByDay[finalWeekday] ?? 0) + hoursValue;
  }

  if (dataMap.size === 0) {
    const errMsg = errors.length > 0 ? ` Errors: ${errors.join('; ')}` : '';
    return { error: `No valid data rows found in CSV.${errMsg}` };
  }

  const rawRows = Array.from(dataMap.values()).map((v) => ({
    weekday: v.weekday,
    slotMin: v.slotMin,
    slotLabel: v.slotLabel,
    volume: v.value,
    rawValue: v.value,
    displayRaw: v.value.toFixed(
      inputFormat === 'Required Hours' ? 2 : 0
    ),
  }));

  rawRows.sort((a, b) => {
    const wdDiff = WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday);
    if (wdDiff !== 0) return wdDiff;
    return a.slotMin - b.slotMin;
  });

  const allSlots = Array.from(slotSet).sort((a, b) => a - b);

  return {
    mode: 'la',
    rawRows,
    allSlots,
    inputFormat,
    rawReqHoursByDay,
  };
}

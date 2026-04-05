import * as XLSX from 'xlsx';
import { RosterRow, ProjectionRow, MonthlyRosterRow } from '../scheduling/types';
import { BreakRow } from '../scheduling/breaks';

/**
 * Export multiple sheets to an Excel workbook Blob.
 */
export function exportToExcel(
  sheets: Array<{ name: string; data: Record<string, unknown>[] }>
): Blob {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31)); // Excel max sheet name = 31 chars
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Convert roster rows to CSV string.
 */
export function exportRosterCSV(rosterRows: RosterRow[]): string {
  if (rosterRows.length === 0) return '';

  const headers = ['Agent', 'Shift Start', 'Shift End', 'Off Days', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const lines = [headers.join(',')];

  for (const row of rosterRows) {
    const values = [
      csvEscape(row.agent),
      csvEscape(row.shiftStart),
      csvEscape(row.shiftEnd),
      csvEscape(row.offDays),
      csvEscape(row.Mon),
      csvEscape(row.Tue),
      csvEscape(row.Wed),
      csvEscape(row.Thu),
      csvEscape(row.Fri),
      csvEscape(row.Sat),
      csvEscape(row.Sun),
    ];
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Convert break rows to CSV string.
 */
export function exportBreaksCSV(breakRows: BreakRow[]): string {
  if (breakRows.length === 0) return '';

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const breakCols: string[] = [];
  for (const wd of weekdays) {
    breakCols.push(`${wd}_Break_1`, `${wd}_Lunch`, `${wd}_Break_2`);
  }

  const headers = ['Agent', 'Shift Start', 'Shift End', 'Off Days', ...breakCols];
  const lines = [headers.join(',')];

  for (const row of breakRows) {
    const values = [
      csvEscape(row.agent),
      csvEscape(row.shiftStart),
      csvEscape(row.shiftEnd),
      csvEscape(row.offDays),
      ...breakCols.map((col) => csvEscape(row[col] ?? '')),
    ];
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Convert projection rows to CSV string.
 */
export function exportProjectionsCSV(projectionRows: ProjectionRow[]): string {
  if (projectionRows.length === 0) return '';

  // Detect mode based on first row
  const isSLA = projectionRows[0].totalCalls !== undefined;

  let headers: string[];
  if (isSLA) {
    headers = ['Day', 'Total Calls', 'Projected SLA%', 'Projected Abandon%', 'Avg Occupancy%'];
  } else {
    headers = [
      'Day',
      'Required Hours',
      'Scheduled Hours',
      'Surplus',
      'Utilisation%',
      'Meets 105%',
      'Deficit Intervals',
      'Peak Deficit',
      'Peak Surplus',
    ];
  }

  const lines = [headers.join(',')];

  for (const row of projectionRows) {
    let values: string[];
    if (isSLA) {
      values = [
        csvEscape(row.day),
        String(row.totalCalls ?? 0),
        (row.projectedSlaPct ?? 0).toFixed(2),
        (row.projectedAbandonPct ?? 0).toFixed(2),
        (row.avgOccupancyPct ?? 0).toFixed(2),
      ];
    } else {
      values = [
        csvEscape(row.day),
        (row.requiredHours ?? 0).toFixed(2),
        (row.scheduledHours ?? 0).toFixed(2),
        (row.surplus ?? 0).toFixed(2),
        (row.utilisationPct ?? 0).toFixed(2),
        csvEscape(row.meetsTarget ?? ''),
        String(row.deficitIntervals ?? 0),
        (row.peakDeficit ?? 0).toFixed(1),
        (row.peakSurplus ?? 0).toFixed(1),
      ];
    }
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Convert monthly roster rows to CSV string.
 */
export function exportMonthlyRosterCSV(
  rows: MonthlyRosterRow[],
  dateKeys: string[]
): string {
  if (rows.length === 0) return '';

  const headers = ['Agent', 'Shift Group', ...dateKeys];
  const lines = [headers.join(',')];

  for (const row of rows) {
    const values = [
      csvEscape(String(row.agent)),
      String(row.shiftGroup),
      ...dateKeys.map((dk) => csvEscape(String(row[dk] ?? ''))),
    ];
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Escape a CSV field value.
 */
function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

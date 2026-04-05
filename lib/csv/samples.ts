import { minToTime } from '../utils';

/**
 * Generate sample forecast CSV for SLA mode.
 * date,interval,volume
 * Base date = Monday 2026-04-06, 7 days
 */
export function makeForecastSampleCSV(): string {
  const lines: string[] = ['date,interval,volume'];

  // day_factors = [1.0, 1.05, 0.95, 1.0, 1.1, 0.6, 0.4]
  const dayFactors = [1.0, 1.05, 0.95, 1.0, 1.1, 0.6, 0.4];

  // Base date: Monday 2026-04-06
  const baseDate = new Date(2026, 3, 6); // April 6, 2026

  for (let d = 0; d < 7; d++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + d);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const factor = dayFactors[d];

    // Generate 48 half-hour slots (00:00 to 23:30)
    for (let slot = 0; slot < 48; slot++) {
      const slotMin = slot * 30;
      const h = Math.floor(slotMin / 60);
      const m = slotMin % 60;
      const intervalStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      // vol = max(0, int(80 * sin(pi * max(0, h-7)/10) + 10)) if 7<=h<=20 else 0
      let vol = 0;
      if (h >= 7 && h <= 20) {
        vol = Math.max(0, Math.round(80 * Math.sin((Math.PI * Math.max(0, h - 7)) / 10) + 10));
      }

      const finalVol = Math.round(vol * factor);
      lines.push(`${dateStr},${intervalStr},${finalVol}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate sample staffing requirements CSV for LA mode (FTE format).
 * weekday,interval,required_staff
 */
export function makeStaffingFTESampleCSV(): string {
  const lines: string[] = ['weekday,interval,required_staff'];

  const dayFactors: Record<string, number> = {
    Mon: 1.0, Tue: 1.05, Wed: 0.95, Thu: 1.0, Fri: 1.1, Sat: 0.6, Sun: 0.4,
  };

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (const wd of weekdays) {
    const factor = dayFactors[wd];

    for (let slot = 0; slot < 48; slot++) {
      const slotMin = slot * 30;
      const h = Math.floor(slotMin / 60);
      const m = slotMin % 60;
      const intervalStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      let req = 0;
      if (h >= 7 && h <= 20) {
        req = Math.max(
          0,
          Math.round(
            (20 * Math.sin((Math.PI * Math.max(0, h - 7)) / 10) + 3) * factor
          )
        );
      }

      lines.push(`${wd},${intervalStr},${req}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate sample staffing requirements CSV for LA mode (Hours format).
 * weekday,interval,required_hours
 */
export function makeStaffingHoursSampleCSV(): string {
  const lines: string[] = ['weekday,interval,required_hours'];

  const dayFactors: Record<string, number> = {
    Mon: 1.0, Tue: 1.05, Wed: 0.95, Thu: 1.0, Fri: 1.1, Sat: 0.6, Sun: 0.4,
  };

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (const wd of weekdays) {
    const factor = dayFactors[wd];

    for (let slot = 0; slot < 48; slot++) {
      const slotMin = slot * 30;
      const h = Math.floor(slotMin / 60);
      const m = slotMin % 60;
      const intervalStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      let fte = 0;
      if (h >= 7 && h <= 20) {
        fte = Math.max(
          0,
          Math.round(
            (20 * Math.sin((Math.PI * Math.max(0, h - 7)) / 10) + 3) * factor
          )
        );
      }

      // hours = fte * 0.5 (each 30-min slot = 0.5 h)
      const hours = fte * 0.5;
      lines.push(`${wd},${intervalStr},${hours.toFixed(1)}`);
    }
  }

  return lines.join('\n');
}

'use client';

import { Weekday, WEEKDAYS } from '@/lib/scheduling/types';
import { minToTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CoverageTableProps {
  scheduledCounts: Record<Weekday, Record<string, number>>;
  baselineReq: Record<Weekday, Record<string, number>>;
  allSlots: number[];
}

export default function CoverageTable({
  scheduledCounts,
  baselineReq,
  allSlots,
}: CoverageTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-900 sticky top-0 z-10">
          <tr>
            <th className="sticky left-0 z-20 bg-gray-900 px-3 py-2.5 text-left font-medium text-gray-400 border-r border-gray-800 whitespace-nowrap">
              Interval
            </th>
            {WEEKDAYS.map((wd) => (
              <th
                key={wd}
                className="px-3 py-2.5 text-center font-medium text-gray-400 whitespace-nowrap"
              >
                {wd}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {allSlots.map((slot, idx) => {
            const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
            return (
              <tr
                key={slot}
                className={cn(
                  'hover:bg-gray-800/20 transition-colors',
                  idx % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/30'
                )}
              >
                <td className="sticky left-0 bg-inherit px-3 py-1.5 text-gray-300 border-r border-gray-800/50 font-mono whitespace-nowrap">
                  {label}
                </td>
                {WEEKDAYS.map((wd) => {
                  const req = baselineReq[wd]?.[label] ?? 0;
                  const sched = scheduledCounts[wd]?.[label] ?? 0;
                  const diff = sched - req;

                  if (req === 0 && sched === 0) {
                    return (
                      <td key={wd} className="px-3 py-1.5 text-center text-gray-700">
                        —
                      </td>
                    );
                  }

                  return (
                    <td
                      key={wd}
                      className={cn(
                        'px-3 py-1.5 text-center font-medium',
                        diff > 0
                          ? 'text-green-400'
                          : diff < 0
                          ? 'text-red-400'
                          : 'text-gray-400'
                      )}
                      title={`Required: ${req}, Scheduled: ${sched}`}
                    >
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            diff > 0
                              ? 'bg-green-900/30'
                              : diff < 0
                              ? 'bg-red-900/30'
                              : 'bg-gray-800'
                          )}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                        <span className="text-gray-600 text-[10px] mt-0.5">
                          {sched}/{req}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

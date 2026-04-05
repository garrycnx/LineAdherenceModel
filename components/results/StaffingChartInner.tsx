'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Weekday, WEEKDAYS } from '@/lib/scheduling/types';
import { minToTime } from '@/lib/utils';

interface StaffingChartInnerProps {
  pivotReq: Record<string, Partial<Record<Weekday, number>>>;
  pivotFore?: Record<string, Partial<Record<Weekday, number>>>;
  allSlots: number[];
}

export default function StaffingChartInner({
  pivotReq,
  pivotFore,
  allSlots,
}: StaffingChartInnerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {WEEKDAYS.map((wd) => {
        const data = allSlots.map((slot, idx) => {
          const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
          return {
            name: idx % 4 === 0 ? minToTime(slot) : '',
            fullName: label,
            required: pivotReq[label]?.[wd] ?? 0,
            scheduled: pivotFore?.[label]?.[wd] ?? undefined,
          };
        });

        const maxVal = Math.max(
          ...data.map((d) => Math.max(d.required, d.scheduled ?? 0)),
          1
        );

        return (
          <div
            key={wd}
            className="bg-gray-900 border border-gray-800 rounded-xl p-3"
          >
            <h3 className="text-sm font-semibold text-brand-400 mb-2">{wd}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={data}
                margin={{ top: 4, right: 8, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  angle={-45}
                  textAnchor="end"
                  height={30}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  domain={[0, Math.ceil(maxVal * 1.15)]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  labelStyle={{ color: '#d1d5db' }}
                  formatter={(val: number, name: string) => [
                    val,
                    name === 'required' ? 'Required' : 'Scheduled',
                  ]}
                  labelFormatter={(label, payload: Array<{ payload?: { fullName?: string } }>) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullName ?? label;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px' }}
                  formatter={(v) => (v === 'required' ? 'Required' : 'Scheduled')}
                />
                <Line
                  type="monotone"
                  dataKey="required"
                  stroke="#0096c7"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                {pivotFore && (
                  <Line
                    type="monotone"
                    dataKey="scheduled"
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}

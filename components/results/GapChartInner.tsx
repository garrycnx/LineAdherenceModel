'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from 'recharts';
import { ProjectionRow } from '@/lib/scheduling/types';

interface GapChartInnerProps {
  projectionRows: ProjectionRow[];
}

export default function GapChartInner({ projectionRows }: GapChartInnerProps) {
  const data = projectionRows
    .filter((r) => r.day !== 'TOTAL')
    .map((r) => ({
      day: r.day,
      'Required Hours': parseFloat((r.requiredHours ?? 0).toFixed(1)),
      'Scheduled Hours': parseFloat((r.scheduledHours ?? 0).toFixed(1)),
    }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-brand-400 mb-4">
        Required vs Scheduled Hours by Day
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(val: number, name: string) => [`${val}h`, name]}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="Required Hours" fill="#0096c7" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="Required Hours"
              position="top"
              style={{ fontSize: '10px', fill: '#9ca3af' }}
            />
          </Bar>
          <Bar dataKey="Scheduled Hours" fill="#22c55e" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="Scheduled Hours"
              position="top"
              style={{ fontSize: '10px', fill: '#9ca3af' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

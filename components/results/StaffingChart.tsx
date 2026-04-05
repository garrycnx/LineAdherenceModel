'use client';

import dynamic from 'next/dynamic';
import { Weekday } from '@/lib/scheduling/types';

// Dynamic import to avoid SSR issues with Recharts
const ChartInner = dynamic(() => import('./StaffingChartInner'), { ssr: false });

interface StaffingChartProps {
  pivotReq: Record<string, Partial<Record<Weekday, number>>>;
  pivotFore?: Record<string, Partial<Record<Weekday, number>>>;
  allSlots: number[];
}

export default function StaffingChart({ pivotReq, pivotFore, allSlots }: StaffingChartProps) {
  return (
    <ChartInner pivotReq={pivotReq} pivotFore={pivotFore} allSlots={allSlots} />
  );
}

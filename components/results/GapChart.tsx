'use client';

import dynamic from 'next/dynamic';
import { ProjectionRow } from '@/lib/scheduling/types';

const GapChartInner = dynamic(() => import('./GapChartInner'), { ssr: false });

interface GapChartProps {
  projectionRows: ProjectionRow[];
}

export default function GapChart({ projectionRows }: GapChartProps) {
  return <GapChartInner projectionRows={projectionRows} />;
}

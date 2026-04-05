'use client';

import { FormState } from '@/lib/scheduling/types';
import Input from '@/components/ui/Input';
import SectionHeader from '@/components/layout/SectionHeader';

interface SlaParamsProps {
  form: FormState;
  onChange: (updates: Partial<FormState>) => void;
}

export default function SlaParams({ form, onChange }: SlaParamsProps) {
  const getError = (field: string, value: number, min: number, max: number): string => {
    if (value < min || value > max) return `Must be ${min}–${max}`;
    return '';
  };

  return (
    <div className="space-y-3">
      <SectionHeader title="SLA Parameters" icon="⚙️" />

      <Input
        label="Average Handle Time (seconds)"
        type="number"
        min={1}
        max={3000}
        step={1}
        value={form.ahtSeconds}
        onChange={(e) => onChange({ ahtSeconds: Number(e.target.value) })}
        error={getError('aht', form.ahtSeconds, 1, 3000)}
        hint="Total time per call: talk + hold + wrap-up"
      />

      <Input
        label="SLA Target (%)"
        type="number"
        min={1}
        max={100}
        step={1}
        value={form.slaPct}
        onChange={(e) => onChange({ slaPct: Number(e.target.value) })}
        error={getError('sla', form.slaPct, 1, 100)}
        hint="e.g. 80 means 80% of calls answered within threshold"
      />

      <Input
        label="SLA Threshold (seconds)"
        type="number"
        min={1}
        max={300}
        step={1}
        value={form.slaSeconds}
        onChange={(e) => onChange({ slaSeconds: Number(e.target.value) })}
        error={getError('slaThresh', form.slaSeconds, 1, 300)}
        hint="Answer within this many seconds to count as SLA met"
      />

      <Input
        label="Abandon Target (%)"
        type="number"
        min={0}
        max={50}
        step={0.5}
        value={form.abandonPctTarget}
        onChange={(e) => onChange({ abandonPctTarget: Number(e.target.value) })}
        error={getError('abandon', form.abandonPctTarget, 0, 50)}
        hint="Maximum acceptable abandonment rate"
      />

      <Input
        label="Average Patience (seconds)"
        type="number"
        min={1}
        max={600}
        step={1}
        value={form.patienceSeconds}
        onChange={(e) => onChange({ patienceSeconds: Number(e.target.value) })}
        error={getError('patience', form.patienceSeconds, 1, 600)}
        hint="How long callers wait before abandoning"
      />
    </div>
  );
}

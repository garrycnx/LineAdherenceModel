'use client';

import { FormState, InputFormat } from '@/lib/scheduling/types';
import Input from '@/components/ui/Input';
import SectionHeader from '@/components/layout/SectionHeader';
import { cn } from '@/lib/utils';

interface LineAdherenceParamsProps {
  form: FormState;
  onChange: (updates: Partial<FormState>) => void;
}

const inputFormats: Array<{ value: InputFormat; label: string; hint: string }> = [
  {
    value: 'Required FTEs (headcount)',
    label: 'Required FTEs (headcount)',
    hint: 'CSV has number of agents per slot',
  },
  {
    value: 'Required Hours',
    label: 'Required Hours',
    hint: 'CSV has total hours needed per slot',
  },
];

export default function LineAdherenceParams({ form, onChange }: LineAdherenceParamsProps) {
  return (
    <div className="space-y-3">
      <SectionHeader title="Line Adherence Parameters" icon="📊" />

      <div>
        <p className="text-xs font-medium text-gray-300 mb-2">Input Format</p>
        <div className="space-y-2">
          {inputFormats.map((fmt) => (
            <button
              key={fmt.value}
              type="button"
              onClick={() => onChange({ inputFormat: fmt.value })}
              className={cn(
                'w-full text-left p-2.5 rounded-lg border text-xs transition-all duration-150',
                form.inputFormat === fmt.value
                  ? 'border-brand-500 bg-brand-900/20 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-3 h-3 rounded-full border-2 flex-shrink-0',
                    form.inputFormat === fmt.value
                      ? 'border-brand-400 bg-brand-400'
                      : 'border-gray-600'
                  )}
                />
                <div>
                  <div className="font-medium text-current">{fmt.label}</div>
                  <div className="text-gray-500 mt-0.5">{fmt.hint}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Max Staffing Cap (%)"
        type="number"
        min={100}
        max={200}
        step={5}
        value={form.staffingCapPct}
        onChange={(e) => onChange({ staffingCapPct: Number(e.target.value) })}
        error={
          form.staffingCapPct < 100 || form.staffingCapPct > 200
            ? 'Must be 100–200'
            : ''
        }
        hint="Maximum % above requirement before trimming agents"
      />
    </div>
  );
}

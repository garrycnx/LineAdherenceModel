'use client';

import { FormState, OffPolicy, HeadcountMode } from '@/lib/scheduling/types';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SectionHeader from '@/components/layout/SectionHeader';
import { cn } from '@/lib/utils';

interface ScheduleSettingsProps {
  form: FormState;
  onChange: (updates: Partial<FormState>) => void;
}

const offPolicies: Array<{ value: OffPolicy; label: string }> = [
  { value: 'Consecutive Off Days', label: 'Consecutive (e.g. Sat+Sun)' },
  { value: 'Split Off Days', label: 'Split (e.g. Mon+Thu)' },
  { value: 'Single Day Off', label: 'Single Day Off' },
];

const lunchOptions = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
];

const headcountModes: Array<{ value: HeadcountMode; label: string }> = [
  { value: 'Auto-generate (demand-driven)', label: 'Auto (demand-driven)' },
  { value: 'Fixed headcount', label: 'Fixed headcount' },
];

const monthOptions = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export default function ScheduleSettings({ form, onChange }: ScheduleSettingsProps) {
  return (
    <div className="space-y-3">
      <SectionHeader title="Schedule Settings" icon="🗓️" />

      <Input
        label="Out-of-Office Shrinkage (%)"
        type="number"
        min={0}
        max={100}
        step={1}
        value={form.oooShrinkagePct}
        onChange={(e) => onChange({ oooShrinkagePct: Number(e.target.value) })}
        hint="Added buffer for leave, training, absences"
      />

      {/* Off Policy */}
      <div>
        <p className="text-xs font-medium text-gray-300 mb-2">Weekly Off Pattern</p>
        <div className="space-y-1.5">
          {offPolicies.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange({ offPolicy: p.value })}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg border text-xs transition-all duration-150',
                form.offPolicy === p.value
                  ? 'border-brand-500 bg-brand-900/20 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-3 h-3 rounded-full border-2 flex-shrink-0',
                    form.offPolicy === p.value
                      ? 'border-brand-400 bg-brand-400'
                      : 'border-gray-600'
                  )}
                />
                {p.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lunch Duration */}
      <div>
        <p className="text-xs font-medium text-gray-300 mb-2">Lunch Break Duration</p>
        <div className="flex gap-2">
          {lunchOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ lunchMinutes: opt.value })}
              className={cn(
                'flex-1 py-1.5 rounded-lg border text-xs transition-all duration-150',
                form.lunchMinutes === opt.value
                  ? 'border-brand-500 bg-brand-900/20 text-brand-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shift times */}
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="Earliest Start"
          type="time"
          value={form.earliestStart}
          onChange={(e) => onChange({ earliestStart: e.target.value })}
        />
        <Input
          label="Latest Start"
          type="time"
          value={form.latestStart}
          onChange={(e) => onChange({ latestStart: e.target.value })}
        />
      </div>

      <Input
        label="Max Agents Cap"
        type="number"
        min={10}
        max={5000}
        step={10}
        value={form.maxAgents}
        onChange={(e) => onChange({ maxAgents: Number(e.target.value) })}
        hint="Hard ceiling on total agents generated"
      />

      {/* Headcount Mode */}
      <div>
        <p className="text-xs font-medium text-gray-300 mb-2">Headcount Mode</p>
        <div className="space-y-1.5">
          {headcountModes.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange({ headcountMode: m.value })}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg border text-xs transition-all duration-150',
                form.headcountMode === m.value
                  ? 'border-brand-500 bg-brand-900/20 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-3 h-3 rounded-full border-2 flex-shrink-0',
                    form.headcountMode === m.value
                      ? 'border-brand-400 bg-brand-400'
                      : 'border-gray-600'
                  )}
                />
                {m.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {form.headcountMode === 'Fixed headcount' && (
        <Input
          label="Number of Employees"
          type="number"
          min={1}
          max={5000}
          step={1}
          value={form.fixedHeadcount}
          onChange={(e) => onChange({ fixedHeadcount: Number(e.target.value) })}
        />
      )}

      {/* Monthly Schedule */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.generateMonthly}
            onChange={(e) => onChange({ generateMonthly: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-xs font-medium text-gray-300">
            Generate Monthly Schedule
          </span>
        </label>
      </div>

      {form.generateMonthly && (
        <div className="pl-6 space-y-2 border-l-2 border-brand-800">
          <Input
            label="Year"
            type="number"
            min={2024}
            max={2030}
            step={1}
            value={form.targetYear}
            onChange={(e) => onChange({ targetYear: Number(e.target.value) })}
          />
          <Select
            label="Month"
            value={String(form.targetMonth)}
            options={monthOptions}
            onChange={(e) => onChange({ targetMonth: Number(e.target.value) })}
          />
        </div>
      )}
    </div>
  );
}

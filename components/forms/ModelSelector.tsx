'use client';

import { SchedulingModel } from '@/lib/scheduling/types';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  value: SchedulingModel;
  onChange: (value: SchedulingModel) => void;
}

const models: Array<{
  value: SchedulingModel;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    value: 'SLA-Based Model',
    label: 'SLA-Based Model',
    icon: '📞',
    description:
      'Upload call volume forecast CSV. Erlang-C computes required staff per interval to meet your SLA target.',
  },
  {
    value: 'Line Adherence Model',
    label: 'Line Adherence Model',
    icon: '📊',
    description:
      'Upload staffing requirements directly (FTE or hours). Schedule staff to meet the requirements with cap enforcement.',
  },
];

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      {models.map((model) => (
        <button
          key={model.value}
          type="button"
          onClick={() => onChange(model.value)}
          className={cn(
            'w-full text-left p-3 rounded-lg border transition-all duration-150',
            value === model.value
              ? 'border-brand-500 bg-brand-900/20 text-white'
              : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-gray-300'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{model.icon}</span>
            <span className="text-sm font-semibold">{model.label}</span>
            {value === model.value && (
              <span className="ml-auto w-2 h-2 rounded-full bg-brand-400" />
            )}
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">{model.description}</p>
        </button>
      ))}
    </div>
  );
}

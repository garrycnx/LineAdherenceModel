'use client';

import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 border-b border-gray-800 mb-4',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-150 flex items-center gap-1.5',
            activeTab === tab.id
              ? 'bg-gray-900 text-brand-400 border border-gray-800 border-b-brand-500 -mb-px'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          )}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

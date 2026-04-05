'use client';

import { useState } from 'react';
import { SavedSchedule, deleteSchedule } from '@/lib/store';
import Button from '@/components/ui/Button';

interface ScheduleHistoryProps {
  schedules: SavedSchedule[];
  onLoad: (schedule: SavedSchedule) => void;
  onRefresh: () => void;
}

export default function ScheduleHistory({ schedules, onLoad, onRefresh }: ScheduleHistoryProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    deleteSchedule(id);
    setConfirmDelete(null);
    onRefresh();
  };

  if (schedules.length === 0) {
    return (
      <p className="text-[11px] text-gray-600 text-center py-2">
        No saved schedules yet.
      </p>
    );
  }

  return (
    <div className="space-y-1.5 max-h-52 overflow-y-auto">
      {schedules.map((s) => (
        <div
          key={s.id}
          className="bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{s.name}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {new Date(s.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
                {' · '}{s.agentCount} agents · {s.model.replace(' Model', '')}
              </p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button size="sm" variant="secondary" onClick={() => onLoad(s)}>
                Load
              </Button>
              {confirmDelete === s.id ? (
                <>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-[10px] text-red-400 hover:text-red-300 px-1.5 rounded hover:bg-red-900/20"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(s.id)}
                  className="text-[10px] text-red-600 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-900/20"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

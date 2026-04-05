'use client';

import { useState } from 'react';
import { SchedulerOutput } from '@/lib/scheduling/types';
import { NamedAgent, saveSchedule } from '@/lib/store';

interface SaveScheduleModalProps {
  results: SchedulerOutput;
  agents: NamedAgent[];
  onSaved: () => void;
  onClose: () => void;
}

export default function SaveScheduleModal({
  results,
  agents,
  onSaved,
  onClose,
}: SaveScheduleModalProps) {
  const [name, setName] = useState(
    `Schedule ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  );

  // Build agent-to-slot mapping: Agent_001 → employeeId
  // We assign in order: first N agents in the roster → first N named agents
  const rosterSlotIds = results.rosterRows.map((r) => r.agent);
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    rosterSlotIds.forEach((slotId, i) => {
      if (agents[i]) m[slotId] = agents[i].employeeId;
    });
    return m;
  });

  const handleSave = () => {
    if (!name.trim()) return;
    saveSchedule(name.trim(), results, mappings);
    onSaved();
    onClose();
  };

  const assignedCount = Object.values(mappings).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-white">Save Schedule</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Assign agents and publish to their portal.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Schedule Name</label>
            <input
              className="input-field w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Week 14 Schedule"
            />
          </div>

          {/* Assignment summary */}
          <div className="bg-gray-800/50 rounded-xl p-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-medium text-gray-300">Agent Assignments</p>
              <span className="text-xs text-gray-500">
                {assignedCount}/{rosterSlotIds.length} assigned
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              Roster slots are mapped to named agents in order. Unassigned slots remain as Agent_XXX.
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {rosterSlotIds.map((slotId) => {
                const rr = results.rosterRows.find((r) => r.agent === slotId)!;
                return (
                  <div key={slotId} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-500 w-20 flex-shrink-0">{slotId}</span>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">
                      {rr.shiftStart}–{rr.shiftEnd}
                    </span>
                    <select
                      className="flex-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200 px-2 py-0.5 focus:outline-none focus:border-brand-500"
                      value={mappings[slotId] ?? ''}
                      onChange={(e) =>
                        setMappings((m) => ({ ...m, [slotId]: e.target.value }))
                      }
                    >
                      <option value="">— Unassigned —</option>
                      {agents.map((a) => (
                        <option key={a.employeeId} value={a.employeeId}>
                          {a.name} ({a.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-5 border-t border-gray-800">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2 rounded-xl">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary text-sm px-4 py-2 rounded-xl">
            💾 Save & Publish
          </button>
        </div>
      </div>
    </div>
  );
}

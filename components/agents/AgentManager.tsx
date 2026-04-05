'use client';

import { useState, useEffect } from 'react';
import { NamedAgent, getAgents, addAgent, removeAgent, saveAgents } from '@/lib/store';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface AgentManagerProps {
  onAgentsChange?: (agents: NamedAgent[]) => void;
}

export default function AgentManager({ onAgentsChange }: AgentManagerProps) {
  const [agents, setAgents] = useState<NamedAgent[]>([]);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Form state
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');

  const refresh = () => {
    const a = getAgents();
    setAgents(a);
    onAgentsChange?.(a);
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!empId.trim()) return setFormError('Employee ID is required.');
    if (!name.trim()) return setFormError('Name is required.');
    const existing = getAgents().find((a) => a.employeeId === empId.trim());
    if (existing && editId !== empId.trim()) return setFormError('Employee ID already exists.');

    if (editId) {
      // Edit
      const all = getAgents().map((a) =>
        a.employeeId === editId
          ? { ...a, employeeId: empId.trim(), name: name.trim(), department: dept.trim() || undefined, email: email.trim() || undefined }
          : a
      );
      saveAgents(all);
    } else {
      addAgent({ employeeId: empId.trim(), name: name.trim(), department: dept.trim() || undefined, email: email.trim() || undefined });
    }
    resetForm();
    refresh();
  }

  function handleEdit(agent: NamedAgent) {
    setEditId(agent.employeeId);
    setEmpId(agent.employeeId);
    setName(agent.name);
    setDept(agent.department ?? '');
    setEmail(agent.email ?? '');
    setAdding(true);
    setFormError('');
  }

  function handleRemove(employeeId: string) {
    removeAgent(employeeId);
    refresh();
  }

  function resetForm() {
    setAdding(false);
    setEditId(null);
    setEmpId('');
    setName('');
    setDept('');
    setEmail('');
    setFormError('');
  }

  function handleBulkImport() {
    const lines = bulkText.trim().split('\n').filter(Boolean);
    const current = getAgents();
    const newAgents: NamedAgent[] = [];
    const errors: string[] = [];

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length < 2) { errors.push(`Skipped: "${line}" — need at least ID,Name`); continue; }
      const [eid, nm, dp, em] = parts;
      if (current.find((a) => a.employeeId === eid) || newAgents.find((a) => a.employeeId === eid)) {
        errors.push(`Skipped: "${eid}" — already exists`);
        continue;
      }
      newAgents.push({ employeeId: eid, name: nm, department: dp || undefined, email: em || undefined, createdAt: new Date().toISOString() });
    }

    saveAgents([...current, ...newAgents]);
    setBulkText('');
    setBulkMode(false);
    refresh();
    if (errors.length > 0) alert(`Import done.\n\n${errors.join('\n')}`);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-300">{agents.length} agent(s)</p>
        </div>
        <div className="flex gap-1.5">
          {!adding && !bulkMode && (
            <>
              <Button size="sm" variant="secondary" onClick={() => setBulkMode(true)}>
                ⬆ Import
              </Button>
              <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
                + Add
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bulk import */}
      {bulkMode && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 space-y-2">
          <p className="text-xs text-gray-400">
            One agent per line: <code className="text-brand-400">EmployeeID, Name, Department, Email</code>
          </p>
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-xs text-gray-200 font-mono resize-none focus:outline-none focus:border-brand-500"
            rows={5}
            placeholder={"EMP001, Alice Smith, Support\nEMP002, Bob Jones, Sales"}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={handleBulkImport}>Import</Button>
            <Button size="sm" variant="secondary" onClick={() => { setBulkMode(false); setBulkText(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Add/edit form */}
      {adding && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-700 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-300">{editId ? 'Edit Agent' : 'New Agent'}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500">Employee ID *</label>
              <input
                className="input-field w-full text-xs"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                placeholder="EMP001"
                disabled={!!editId}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Full Name *</label>
              <input
                className="input-field w-full text-xs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alice Smith"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Department</label>
              <input
                className="input-field w-full text-xs"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                placeholder="Support"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Email</label>
              <input
                className="input-field w-full text-xs"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@company.com"
              />
            </div>
          </div>
          {formError && <p className="text-[10px] text-red-400">{formError}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="primary" type="submit">{editId ? 'Save' : 'Add'}</Button>
            <Button size="sm" variant="secondary" type="button" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Agent list */}
      {agents.length > 0 ? (
        <div className="space-y-1 max-h-52 overflow-y-auto">
          {agents.map((agent) => (
            <div
              key={agent.employeeId}
              className="flex items-center justify-between bg-gray-900/60 border border-gray-800 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', 'bg-brand-700 text-white')}>
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{agent.name}</p>
                  <p className="text-[10px] text-gray-500 font-mono">{agent.employeeId}
                    {agent.department && <span className="ml-1 text-gray-600">· {agent.department}</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleEdit(agent)}
                  className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleRemove(agent.employeeId)}
                  className="text-[10px] text-red-600 hover:text-red-400 px-1.5 py-0.5 rounded hover:bg-red-900/20"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !adding && !bulkMode && (
          <p className="text-[11px] text-gray-600 text-center py-2">
            No agents yet — add agents to assign them to schedules.
          </p>
        )
      )}
    </div>
  );
}

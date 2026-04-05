'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { getAgentSchedules, SavedSchedule } from '@/lib/store';
import { RosterRow, BreakRow } from '@/lib/scheduling/types';
import { cn } from '@/lib/utils';
import TopNav from '@/components/layout/TopNav';

interface AgentScheduleEntry {
  schedule: SavedSchedule;
  rosterRow: RosterRow | null;
  breakRow: BreakRow | null;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export default function PortalPage() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<AgentScheduleEntry[]>([]);
  const [selected, setSelected] = useState<AgentScheduleEntry | null>(null);

  useEffect(() => {
    if (!loading && !session) router.replace('/login');
    if (!loading && session?.role === 'admin') router.replace('/');
  }, [session, loading, router]);

  useEffect(() => {
    if (session?.role === 'agent') {
      setEntries(getAgentSchedules(session.userId));
    }
  }, [session]);

  if (loading || !session) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <TopNav />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">My Schedules</h1>
          <p className="text-sm text-gray-400 mt-1">
            Hello, <span className="text-brand-400 font-medium">{session.name}</span> · Employee ID:{' '}
            <span className="font-mono text-gray-300">{session.userId}</span>
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-lg font-semibold text-gray-300 mb-2">No schedules yet</h2>
            <p className="text-sm text-gray-500">
              Your administrator hasn&apos;t published a schedule for you yet. Check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Schedule list */}
            {!selected && (
              <>
                <p className="text-sm text-gray-400">{entries.length} schedule(s) found</p>
                {entries.map(({ schedule, rosterRow }) => (
                  <button
                    key={schedule.id}
                    onClick={() => setSelected({ schedule, rosterRow, breakRow: null })}
                    className="w-full bg-gray-900 border border-gray-800 hover:border-brand-600 rounded-xl p-5 text-left transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white">{schedule.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(schedule.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                          {' · '}{schedule.model}
                        </p>
                      </div>
                      <span className="text-brand-400 text-sm">View →</span>
                    </div>
                    {rosterRow && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs bg-brand-900/30 text-brand-300 px-2 py-1 rounded-lg">
                          {rosterRow.shiftStart} – {rosterRow.shiftEnd}
                        </span>
                        <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-lg">
                          Off: {rosterRow.offDays}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </>
            )}

            {/* Schedule detail */}
            {selected && (
              <div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-sm text-gray-400 hover:text-white mb-4 flex items-center gap-1"
                >
                  ← Back to schedules
                </button>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-1">{selected.schedule.name}</h2>
                  <p className="text-sm text-gray-400 mb-6">
                    Generated on{' '}
                    {new Date(selected.schedule.createdAt).toLocaleDateString('en-GB', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>

                  {selected.rosterRow ? (
                    <>
                      {/* Shift info */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                          { label: 'Shift Start', value: selected.rosterRow.shiftStart },
                          { label: 'Shift End', value: selected.rosterRow.shiftEnd },
                          { label: 'Off Days', value: selected.rosterRow.offDays },
                        ].map((item) => (
                          <div key={item.label} className="bg-gray-800/60 rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                            <p className="font-semibold text-white text-sm">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Weekly calendar */}
                      <h3 className="text-sm font-semibold text-gray-300 mb-3">Weekly Schedule</h3>
                      <div className="grid grid-cols-7 gap-1.5">
                        {WEEKDAYS.map((wd) => {
                          const val = selected.rosterRow![wd];
                          const isOff = val === 'OFF';
                          return (
                            <div
                              key={wd}
                              className={cn(
                                'rounded-xl p-2.5 text-center',
                                isOff
                                  ? 'bg-red-900/30 border border-red-800/50'
                                  : 'bg-brand-900/30 border border-brand-800/50'
                              )}
                            >
                              <p className="text-xs font-semibold text-gray-400 mb-1">{wd}</p>
                              {isOff ? (
                                <p className="text-xs text-red-400 font-medium">OFF</p>
                              ) : (
                                <p className="text-[10px] text-brand-300 leading-tight">{val}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Your shift details are not available in this schedule.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

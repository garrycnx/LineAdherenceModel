'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormState, ParsedCSVData, SchedulerOutput, EngineLog, SchedulingModel } from '@/lib/scheduling/types';
import { runEngine } from '@/lib/scheduling/engine';
import { parseForecastCSV, parseStaffingCSV } from '@/lib/csv/parser';
import { makeForecastSampleCSV, makeStaffingFTESampleCSV, makeStaffingHoursSampleCSV } from '@/lib/csv/samples';
import { exportToExcel, exportRosterCSV, exportBreaksCSV, exportProjectionsCSV, exportMonthlyRosterCSV } from '@/lib/csv/exporter';
import { downloadBlob } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { getAgents, getSchedules, SavedSchedule, NamedAgent } from '@/lib/store';

// Layout
import TopNav from '@/components/layout/TopNav';
import SectionHeader from '@/components/layout/SectionHeader';
import Sidebar from '@/components/layout/Sidebar';

// UI
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Tabs from '@/components/ui/Tabs';

// Forms
import ModelSelector from '@/components/forms/ModelSelector';
import SlaParams from '@/components/forms/SlaParams';
import LineAdherenceParams from '@/components/forms/LineAdherenceParams';
import ScheduleSettings from '@/components/forms/ScheduleSettings';

// Upload
import FileUploader from '@/components/upload/FileUploader';

// Results
import RosterTable from '@/components/results/RosterTable';
import BreaksTable from '@/components/results/BreaksTable';
import CoverageTable from '@/components/results/CoverageTable';
import ProjectionsTable from '@/components/results/ProjectionsTable';
import StaffingChart from '@/components/results/StaffingChart';
import GapChart from '@/components/results/GapChart';
import MonthlyRosterTable from '@/components/results/MonthlyRosterTable';

// New
import AgentManager from '@/components/agents/AgentManager';
import ScheduleHistory from '@/components/schedules/ScheduleHistory';
import SaveScheduleModal from '@/components/schedules/SaveScheduleModal';

// ─── Default form state ────────────────────────────────────────────────────────
const defaultFormState: FormState = {
  schedulingModel: 'SLA-Based Model',
  ahtSeconds: 360,
  slaPct: 80,
  slaSeconds: 20,
  abandonPctTarget: 5,
  patienceSeconds: 120,
  inputFormat: 'Required FTEs (headcount)',
  staffingCapPct: 120,
  oooShrinkagePct: 15,
  offPolicy: 'Consecutive Off Days',
  lunchMinutes: 60,
  earliestStart: '00:00',
  latestStart: '23:00',
  maxAgents: 800,
  headcountMode: 'Auto-generate (demand-driven)',
  fixedHeadcount: 100,
  generateMonthly: false,
  targetYear: new Date().getFullYear(),
  targetMonth: new Date().getMonth() + 1,
};

function getResultTabs(results: SchedulerOutput | null) {
  const base = [
    { id: 'roster', label: 'Roster', icon: '👥' },
    { id: 'breaks', label: 'Breaks', icon: '☕' },
    { id: 'coverage', label: 'Coverage', icon: '📐' },
    { id: 'projections', label: 'Projections', icon: '📈' },
    { id: 'charts', label: 'Charts', icon: '📊' },
  ];
  if (results?.schedulingModel === 'Line Adherence Model') {
    base.push({ id: 'gap', label: 'Gap Chart', icon: '📉' });
  }
  if (results?.monthlyRoster && results.monthlyRoster.length > 0) {
    base.push({ id: 'monthly', label: 'Monthly', icon: '🗓️' });
  }
  return base;
}

function Divider() {
  return <div className="border-t border-gray-800 my-3" />;
}

function LogsCard({ logs }: { logs: EngineLog[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="mb-4">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between text-sm font-medium text-gray-300 hover:text-white"
      >
        <span className="flex items-center gap-2"><span>🔍</span> Engine Logs ({logs.length})</span>
        <span className="text-gray-500">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className={log.type === 'success' ? 'text-green-400' : log.type === 'warning' ? 'text-yellow-400' : 'text-gray-400'}>
                {log.type === 'success' ? '✓' : log.type === 'warning' ? '⚠' : 'ℹ'}
              </span>
              <span className="text-gray-500 font-mono">[{log.step}]</span>
              <span className="text-gray-300">{log.detail}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function KPICards({ results }: { results: SchedulerOutput }) {
  const isSLA = results.schedulingModel === 'SLA-Based Model';
  const kpis = isSLA
    ? [
        { label: 'Total Agents', value: results.finalCount, icon: '👥' },
        { label: 'Pre-Prune Agents', value: results.prePruneCount, icon: '✂️' },
        { label: 'Pruned', value: results.prePruneCount - results.finalCount, icon: '🗑️' },
        { label: 'Intervals Covered', value: results.allSlots.length, icon: '⏱️' },
      ]
    : [
        { label: 'Total Agents', value: results.finalCount, icon: '👥' },
        { label: 'Cap Violations Before', value: results.capViolationsBefore ?? 0, icon: '⚠️' },
        { label: 'Cap Violations After', value: results.capViolationsAfter ?? 0, icon: results.capViolationsAfter ? '❌' : '✅' },
        { label: 'Intervals Covered', value: results.allSlots.length, icon: '⏱️' },
      ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="kpi-card">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{kpi.icon}</span>
            <span className="text-xs text-gray-400">{kpi.label}</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">
            {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function UploadCTA({ model }: { model: SchedulingModel }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">📁</div>
      <h2 className="text-xl font-semibold text-gray-200 mb-2">
        Upload your {model === 'SLA-Based Model' ? 'Forecast' : 'Staffing Requirements'} CSV
      </h2>
      <p className="text-gray-500 text-sm max-w-md">
        {model === 'SLA-Based Model'
          ? 'Upload a CSV with date, interval, and volume columns.'
          : 'Upload a CSV with weekday, interval, and required_staff or required_hours columns.'}
      </p>
      <p className="text-gray-600 text-xs mt-3">Use the uploader in the sidebar ←</p>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="bg-red-950/30 border border-red-800 rounded-xl p-4 flex gap-3 items-start mb-4">
      <span className="text-red-400 text-lg">⛔</span>
      <div>
        <p className="text-sm font-semibold text-red-300">Error</p>
        <p className="text-xs text-red-400 mt-1">{message}</p>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="spinner mb-4" style={{ width: 40, height: 40, borderWidth: 3 }} />
      <p className="text-gray-300 font-medium">Generating schedule...</p>
      <p className="text-gray-500 text-sm mt-1">Running Erlang-C calculations and greedy scheduler</p>
    </div>
  );
}

function DataPreview({ parsedData }: { parsedData: ParsedCSVData }) {
  const totalRows = parsedData.rawRows.length;
  const slots = parsedData.allSlots.length;
  const days = new Set(parsedData.rawRows.map((r) => r.weekday)).size;
  return (
    <Card className="mb-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">✅</span>
        <div>
          <p className="text-sm font-semibold text-green-300">CSV Parsed Successfully</p>
          <p className="text-xs text-gray-400">{totalRows} rows · {days} weekdays · {slots} time slots</p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-3 py-2 text-left text-gray-400">Weekday</th>
              <th className="px-3 py-2 text-left text-gray-400">Interval</th>
              <th className="px-3 py-2 text-right text-gray-400">{parsedData.mode === 'sla' ? 'Volume' : 'Required'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {parsedData.rawRows.slice(0, 10).map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-800/20">
                <td className="px-3 py-1.5 text-gray-300">{row.weekday}</td>
                <td className="px-3 py-1.5 text-gray-300 font-mono">{row.slotLabel}</td>
                <td className="px-3 py-1.5 text-right text-gray-300">{row.displayRaw}</td>
              </tr>
            ))}
            {parsedData.rawRows.length > 10 && (
              <tr>
                <td colSpan={3} className="px-3 py-1.5 text-center text-gray-600 text-[11px]">
                  ... {parsedData.rawRows.length - 10} more rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-brand-400 mt-3 text-center">Ready to generate ✓ Click &quot;🚀 Generate Roster&quot; in the sidebar</p>
    </Card>
  );
}

function DownloadSection({ results }: { results: SchedulerOutput }) {
  const handleExcelDownload = () => {
    const sheets: Array<{ name: string; data: Record<string, unknown>[] }> = [
      { name: 'Roster', data: results.rosterRows.map((r) => ({ Agent: r.agent, 'Shift Start': r.shiftStart, 'Shift End': r.shiftEnd, 'Off Days': r.offDays, Mon: r.Mon, Tue: r.Tue, Wed: r.Wed, Thu: r.Thu, Fri: r.Fri, Sat: r.Sat, Sun: r.Sun })) },
      { name: 'Breaks', data: results.breakRows.map((r) => ({ ...r })) },
      { name: 'Projections', data: results.projectionRows.map((r) => ({ ...r })) },
    ];
    if (results.monthlyRoster && results.monthDates) {
      sheets.push({
        name: 'Monthly Roster',
        data: results.monthlyRoster.map((r) => {
          const row: Record<string, unknown> = { Agent: r.agent, 'Shift Group': r.shiftGroup };
          for (const dk of results.monthDates!) row[dk] = r[dk];
          return row;
        }),
      });
    }
    downloadBlob(exportToExcel(sheets), 'schedule.xlsx');
  };

  return (
    <Card className="mt-4">
      <SectionHeader title="Download Results" icon="⬇️" />
      <div className="flex flex-wrap gap-2 mt-2">
        <Button variant="primary" size="sm" onClick={handleExcelDownload}>📊 Excel (All Sheets)</Button>
        <Button variant="secondary" size="sm" onClick={() => downloadBlob(new Blob([exportRosterCSV(results.rosterRows)], { type: 'text/csv' }), 'roster.csv')}>📄 Roster CSV</Button>
        <Button variant="secondary" size="sm" onClick={() => downloadBlob(new Blob([exportBreaksCSV(results.breakRows)], { type: 'text/csv' }), 'breaks.csv')}>☕ Breaks CSV</Button>
        <Button variant="secondary" size="sm" onClick={() => downloadBlob(new Blob([exportProjectionsCSV(results.projectionRows)], { type: 'text/csv' }), 'projections.csv')}>📈 Projections CSV</Button>
        {results.monthlyRoster && results.monthDates && (
          <Button variant="secondary" size="sm" onClick={() => downloadBlob(new Blob([exportMonthlyRosterCSV(results.monthlyRoster!, results.monthDates!)], { type: 'text/csv' }), 'monthly_roster.csv')}>🗓️ Monthly CSV</Button>
        )}
      </div>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(defaultFormState);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [results, setResults] = useState<SchedulerOutput | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<EngineLog[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeResultTab, setActiveResultTab] = useState('roster');
  const [sidebarTab, setSidebarTab] = useState<'config' | 'agents' | 'history'>('config');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [agents, setAgents] = useState<NamedAgent[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);

  // Auth guard
  useEffect(() => {
    if (!loading && !session) router.replace('/login');
    if (!loading && session?.role === 'agent') router.replace('/portal');
  }, [session, loading, router]);

  useEffect(() => {
    setAgents(getAgents());
    setSavedSchedules(getSchedules());
  }, []);

  const updateForm = useCallback((updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleModelChange = useCallback((model: typeof form.schedulingModel) => {
    updateForm({ schedulingModel: model });
    setUploadedFile(null); setParsedData(null); setParseError(null); setResults(null);
  }, [updateForm]);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadedFile(file); setParseError(null); setParsedData(null); setResults(null); setError(null);
    try {
      const text = await file.text();
      const result = form.schedulingModel === 'SLA-Based Model'
        ? parseForecastCSV(text)
        : parseStaffingCSV(text, form.inputFormat);
      if ('error' in result) setParseError(result.error);
      else setParsedData(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Unknown error reading file');
    }
  }, [form.schedulingModel, form.inputFormat]);

  const handleGenerate = useCallback(() => {
    if (!parsedData) return;
    setLoadingSchedule(true); setError(null); setResults(null); setActiveResultTab('roster');
    setTimeout(() => {
      try {
        const output = runEngine({ form, parsedData });
        setResults(output); setLogs(output.logs);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoadingSchedule(false);
      }
    }, 50);
  }, [parsedData, form]);

  const handleLoadSchedule = useCallback((schedule: SavedSchedule) => {
    // Reconstruct a minimal results view from saved data
    setResults({
      ...schedule,
      agents: [],
      scheduledCounts: {} as never,
      baselineReq: {} as never,
      pivotReq: {},
      pivotFore: {},
      allSlots: [],
      dfWeek: [],
      projectionRows: schedule.projectionRows as never,
      logs: [],
      prePruneCount: schedule.agentCount,
      finalCount: schedule.agentCount,
      schedulingModel: schedule.model as never,
    });
    setActiveResultTab('roster');
    setSidebarTab('config');
  }, []);

  const sampleCsvContent = form.schedulingModel === 'SLA-Based Model'
    ? makeForecastSampleCSV()
    : form.inputFormat === 'Required Hours' ? makeStaffingHoursSampleCSV() : makeStaffingFTESampleCSV();

  const sampleFileName = form.schedulingModel === 'SLA-Based Model'
    ? 'sample_forecast.csv'
    : form.inputFormat === 'Required Hours' ? 'sample_staffing_hours.csv' : 'sample_staffing_fte.csv';

  const resultTabs = getResultTabs(results);

  if (loading || !session) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      <TopNav />

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="lg:hidden fixed top-16 left-4 z-50 bg-gray-900 border border-gray-700 rounded-lg p-2 text-gray-400 hover:text-white"
        >
          ☰
        </button>

        {/* Sidebar */}
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)}>

          {/* Sidebar tab switcher */}
          <div className="flex rounded-xl bg-gray-900 p-1 mb-3">
            {([
              { id: 'config', label: 'Config' },
              { id: 'agents', label: 'Agents' },
              { id: 'history', label: 'History' },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setSidebarTab(t.id)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                  sidebarTab === t.id
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Config tab ── */}
          {sidebarTab === 'config' && (
            <>
              <SectionHeader title="Scheduling Model" icon="🎯" />
              <ModelSelector value={form.schedulingModel} onChange={handleModelChange} />
              <Divider />
              {form.schedulingModel === 'SLA-Based Model'
                ? <SlaParams form={form} onChange={updateForm} />
                : <LineAdherenceParams form={form} onChange={updateForm} />}
              <Divider />
              <SectionHeader title="Upload Data" icon="📁" />
              <FileUploader
                onFile={handleFileUpload}
                accept=".csv"
                label={form.schedulingModel === 'SLA-Based Model' ? 'Upload Forecast CSV' : 'Upload Staffing Requirements CSV'}
                hint="Drag & drop or click to browse"
                sampleCsvContent={sampleCsvContent}
                sampleFileName={sampleFileName}
                currentFile={uploadedFile}
                parseError={parseError}
              />
              <Divider />
              <ScheduleSettings form={form} onChange={updateForm} />
              <Divider />
              <Button
                onClick={handleGenerate}
                loading={loadingSchedule}
                disabled={!parsedData || loadingSchedule}
                fullWidth size="lg" variant="primary"
              >
                🚀 Generate Roster
              </Button>
              {parsedData && !loadingSchedule && !results && (
                <p className="text-xs text-center text-green-400 mt-2">✓ CSV ready — click Generate</p>
              )}
              {results && !loadingSchedule && (
                <Button
                  onClick={() => setShowSaveModal(true)}
                  fullWidth size="sm" variant="secondary"
                  className="mt-2"
                >
                  💾 Save & Assign Agents
                </Button>
              )}
              <div className="h-8" />
            </>
          )}

          {/* ── Agents tab ── */}
          {sidebarTab === 'agents' && (
            <>
              <SectionHeader title="Agent Roster" icon="👥" />
              <p className="text-xs text-gray-500 mb-3">
                Add your team members here. They can log in with their Employee ID to view schedules.
              </p>
              <AgentManager onAgentsChange={(a) => setAgents(a)} />
              <div className="h-8" />
            </>
          )}

          {/* ── History tab ── */}
          {sidebarTab === 'history' && (
            <>
              <SectionHeader title="Saved Schedules" icon="📂" />
              <p className="text-xs text-gray-500 mb-3">
                Load a previously saved schedule to view results again.
              </p>
              <ScheduleHistory
                schedules={savedSchedules}
                onLoad={handleLoadSchedule}
                onRefresh={() => setSavedSchedules(getSchedules())}
              />
              <div className="h-8" />
            </>
          )}
        </Sidebar>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">AI Schedule Generator</h1>
            <p className="text-sm text-gray-400 mt-1">
              Erlang-C · Line Adherence Engine · WFM Club
            </p>
          </div>

          {!parsedData && !parseError && !loadingSchedule && !results && (
            <UploadCTA model={form.schedulingModel} />
          )}
          {parseError && <ErrorCard message={parseError} />}
          {parsedData && !results && !loadingSchedule && <DataPreview parsedData={parsedData} />}
          {loadingSchedule && <LoadingCard />}
          {error && <ErrorCard message={error} />}

          {results && !loadingSchedule && (
            <div className="space-y-4">
              <LogsCard logs={logs} />
              <KPICards results={results} />
              <Tabs tabs={resultTabs} activeTab={activeResultTab} onChange={setActiveResultTab} />

              <div className="min-h-[400px]">
                {activeResultTab === 'roster' && <RosterTable rosterRows={results.rosterRows} />}
                {activeResultTab === 'breaks' && <BreaksTable breakRows={results.breakRows} />}
                {activeResultTab === 'coverage' && (
                  <CoverageTable
                    scheduledCounts={results.scheduledCounts}
                    baselineReq={results.baselineReq}
                    allSlots={results.allSlots}
                  />
                )}
                {activeResultTab === 'projections' && (
                  <ProjectionsTable
                    projectionRows={results.projectionRows}
                    mode={results.schedulingModel === 'SLA-Based Model' ? 'sla' : 'la'}
                    slaPct={form.slaPct}
                  />
                )}
                {activeResultTab === 'charts' && (
                  <StaffingChart pivotReq={results.pivotReq} pivotFore={results.pivotFore} allSlots={results.allSlots} />
                )}
                {activeResultTab === 'gap' && results.schedulingModel === 'Line Adherence Model' && (
                  <GapChart projectionRows={results.projectionRows} />
                )}
                {activeResultTab === 'monthly' && results.monthlyRoster && results.monthDates && (
                  <MonthlyRosterTable rows={results.monthlyRoster} dateKeys={results.monthDates} year={form.targetYear} month={form.targetMonth} />
                )}
              </div>

              <DownloadSection results={results} />
            </div>
          )}
        </main>
      </div>

      {/* Save modal */}
      {showSaveModal && results && (
        <SaveScheduleModal
          results={results}
          agents={agents}
          onSaved={() => setSavedSchedules(getSchedules())}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}

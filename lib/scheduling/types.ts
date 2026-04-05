export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type ShiftType = 'Morning' | 'Mid' | 'Night';
export type OffPolicy = 'Consecutive Off Days' | 'Split Off Days' | 'Single Day Off';
export type SchedulingModel = 'SLA-Based Model' | 'Line Adherence Model';
export type HeadcountMode = 'Auto-generate (demand-driven)' | 'Fixed headcount';
export type InputFormat = 'Required FTEs (headcount)' | 'Required Hours';

export interface Agent {
  id: string;
  start: number; // minutes from midnight
  end: number; // minutes from midnight (may be > 1440 for overnight)
  off: string[]; // off-day pair e.g. ['Sat','Sun']
  offPairIndex: number; // index in off_pairs array (for rotation)
  shiftGroup: number; // 0-3 (for 4-group monthly rotation)
}

export interface WeekRow {
  weekday: Weekday;
  slotMin: number;
  slotLabel: string;
  volume: number;
  required: number; // after shrinkage
  requiredRaw: number; // before shrinkage
}

export interface FormState {
  schedulingModel: SchedulingModel;
  // SLA params
  ahtSeconds: number;
  slaPct: number;
  slaSeconds: number;
  abandonPctTarget: number;
  patienceSeconds: number;
  // LA params
  inputFormat: InputFormat;
  staffingCapPct: number;
  // Common
  oooShrinkagePct: number;
  offPolicy: OffPolicy;
  lunchMinutes: number;
  earliestStart: string; // "HH:MM"
  latestStart: string;
  maxAgents: number;
  headcountMode: HeadcountMode;
  fixedHeadcount: number;
  // Monthly
  generateMonthly: boolean;
  targetYear: number;
  targetMonth: number; // 1-12
}

export interface ParsedCSVData {
  mode: 'sla' | 'la';
  rawRows: Array<{
    weekday: Weekday;
    slotMin: number;
    slotLabel: string;
    volume: number; // for SLA mode
    rawValue: number; // for LA mode (FTE or hours)
    displayRaw: string;
  }>;
  allSlots: number[];
  inputFormat?: InputFormat;
  rawReqHoursByDay?: Record<string, number>;
}

export interface RosterRow {
  agent: string;
  shiftStart: string;
  shiftEnd: string;
  offDays: string;
  Mon: string;
  Tue: string;
  Wed: string;
  Thu: string;
  Fri: string;
  Sat: string;
  Sun: string;
}

export interface BreakRow {
  agent: string;
  shiftStart: string;
  shiftEnd: string;
  offDays: string;
  [key: string]: string; // "{Day}_Break_1", "{Day}_Lunch", "{Day}_Break_2"
}

export interface ProjectionRow {
  day: string;
  // SLA mode
  totalCalls?: number;
  projectedSlaPct?: number;
  projectedAbandonPct?: number;
  avgOccupancyPct?: number;
  // LA mode
  requiredHours?: number;
  scheduledHours?: number;
  surplus?: number;
  utilisationPct?: number;
  meetsTarget?: string;
  deficitIntervals?: number;
  peakDeficit?: number;
  peakSurplus?: number;
}

export interface MonthlyRosterRow {
  agent: string;
  shiftGroup: number;
  [dateKey: string]: string | number; // "YYYY-MM-DD" → "OFF" | "Morning 06:00–15:00" etc.
}

export interface EngineLog {
  step: string;
  detail: string;
  type: 'info' | 'success' | 'warning';
}

export interface SchedulerOutput {
  agents: Agent[];
  rosterRows: RosterRow[];
  breakRows: BreakRow[];
  scheduledCounts: Record<Weekday, Record<string, number>>;
  baselineReq: Record<Weekday, Record<string, number>>;
  pivotReq: Record<string, Partial<Record<Weekday, number>>>;
  pivotFore: Record<string, Partial<Record<Weekday, number>>>;
  allSlots: number[];
  dfWeek: WeekRow[];
  projectionRows: ProjectionRow[];
  monthlyRoster?: MonthlyRosterRow[];
  monthDates?: string[]; // "YYYY-MM-DD" ordered
  logs: EngineLog[];
  // Metadata
  prePruneCount: number;
  finalCount: number;
  capViolationsBefore?: number;
  capViolationsAfter?: number;
  rawReqHoursByDay?: Record<string, number>;
  schedulingModel: SchedulingModel;
}

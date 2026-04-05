/**
 * WFM Club - Client-side data store (localStorage).
 * Handles auth sessions, named agents, and saved schedules.
 */

import { SchedulerOutput, RosterRow, BreakRow } from '@/lib/scheduling/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminConfig {
  adminId: string;
  passwordHash: string; // simple base64 encode for demo
}

export interface NamedAgent {
  employeeId: string;
  name: string;
  email?: string;
  department?: string;
  createdAt: string;
}

export interface AuthSession {
  role: 'admin' | 'agent';
  userId: string;
  name: string;
  loginAt: string;
}

export interface SavedSchedule {
  id: string;
  name: string;
  createdAt: string;
  model: string;
  agentCount: number;
  rosterRows: RosterRow[];
  breakRows: BreakRow[];
  projectionRows: unknown[];
  agentMappings: Record<string, string>; // slotId (Agent_001) → employeeId
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  admin: 'wfm_admin',
  agents: 'wfm_agents',
  schedules: 'wfm_schedules',
  session: 'wfm_session',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function hashPassword(pw: string): string {
  // Simple reversible encoding — not cryptographic, fine for local demo
  return btoa(unescape(encodeURIComponent(pw)));
}

function checkPassword(pw: string, hash: string): boolean {
  return hashPassword(pw) === hash;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export function getAdmin(): AdminConfig | null {
  return load<AdminConfig>(KEYS.admin);
}

export function setupAdmin(adminId: string, password: string): void {
  save(KEYS.admin, { adminId, passwordHash: hashPassword(password) } as AdminConfig);
}

export function isAdminSetup(): boolean {
  return getAdmin() !== null;
}

export function verifyAdmin(adminId: string, password: string): boolean {
  const admin = getAdmin();
  if (!admin) return false;
  return admin.adminId === adminId && checkPassword(password, admin.passwordHash);
}

export function changeAdminPassword(oldPassword: string, newPassword: string): boolean {
  const admin = getAdmin();
  if (!admin) return false;
  if (!checkPassword(oldPassword, admin.passwordHash)) return false;
  save(KEYS.admin, { ...admin, passwordHash: hashPassword(newPassword) });
  return true;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export function getSession(): AuthSession | null {
  return load<AuthSession>(KEYS.session);
}

export function setSession(session: AuthSession): void {
  save(KEYS.session, session);
}

export function clearSession(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(KEYS.session);
}

export function loginAdmin(adminId: string, password: string): AuthSession | null {
  if (!verifyAdmin(adminId, password)) return null;
  const session: AuthSession = {
    role: 'admin',
    userId: adminId,
    name: `Admin (${adminId})`,
    loginAt: new Date().toISOString(),
  };
  setSession(session);
  return session;
}

export function loginAgent(employeeId: string): AuthSession | null {
  const agents = getAgents();
  const agent = agents.find((a) => a.employeeId === employeeId);
  if (!agent) return null;
  const session: AuthSession = {
    role: 'agent',
    userId: employeeId,
    name: agent.name,
    loginAt: new Date().toISOString(),
  };
  setSession(session);
  return session;
}

// ─── Named Agents ─────────────────────────────────────────────────────────────

export function getAgents(): NamedAgent[] {
  return load<NamedAgent[]>(KEYS.agents) ?? [];
}

export function saveAgents(agents: NamedAgent[]): void {
  save(KEYS.agents, agents);
}

export function addAgent(agent: Omit<NamedAgent, 'createdAt'>): NamedAgent {
  const agents = getAgents();
  const newAgent: NamedAgent = { ...agent, createdAt: new Date().toISOString() };
  save(KEYS.agents, [...agents, newAgent]);
  return newAgent;
}

export function removeAgent(employeeId: string): void {
  const agents = getAgents().filter((a) => a.employeeId !== employeeId);
  save(KEYS.agents, agents);
}

export function updateAgent(employeeId: string, updates: Partial<NamedAgent>): void {
  const agents = getAgents().map((a) =>
    a.employeeId === employeeId ? { ...a, ...updates } : a
  );
  save(KEYS.agents, agents);
}

// ─── Saved Schedules ──────────────────────────────────────────────────────────

export function getSchedules(): SavedSchedule[] {
  return load<SavedSchedule[]>(KEYS.schedules) ?? [];
}

export function saveSchedule(
  name: string,
  results: SchedulerOutput,
  agentMappings: Record<string, string>
): SavedSchedule {
  const schedules = getSchedules();
  const entry: SavedSchedule = {
    id: uid(),
    name,
    createdAt: new Date().toISOString(),
    model: results.schedulingModel,
    agentCount: results.finalCount,
    rosterRows: results.rosterRows,
    breakRows: results.breakRows,
    projectionRows: results.projectionRows,
    agentMappings,
  };
  // Keep max 20 schedules
  const updated = [entry, ...schedules].slice(0, 20);
  save(KEYS.schedules, updated);
  return entry;
}

export function deleteSchedule(id: string): void {
  const schedules = getSchedules().filter((s) => s.id !== id);
  save(KEYS.schedules, schedules);
}

export function getSchedule(id: string): SavedSchedule | null {
  return getSchedules().find((s) => s.id === id) ?? null;
}

/**
 * Get the schedule rows for a specific employee across all saved schedules.
 */
export function getAgentSchedules(employeeId: string): Array<{
  schedule: SavedSchedule;
  rosterRow: RosterRow | null;
  breakRow: BreakRow | null;
}> {
  const schedules = getSchedules();
  return schedules
    .map((schedule) => {
      const slotId = Object.entries(schedule.agentMappings).find(
        ([, eid]) => eid === employeeId
      )?.[0];
      if (!slotId) return null;
      const rosterRow = schedule.rosterRows.find((r) => r.agent === slotId) ?? null;
      const breakRow = schedule.breakRows.find((r) => r.agent === slotId) ?? null;
      return { schedule, rosterRow, breakRow };
    })
    .filter(Boolean) as Array<{
    schedule: SavedSchedule;
    rosterRow: RosterRow | null;
    breakRow: BreakRow | null;
  }>;
}

import { Agent, Weekday, WEEKDAYS } from './types';
import { timeToMin, minToTime, covers, offMask } from '../utils';

const SHIFT_MIN = 9 * 60; // 540 minutes per shift

/**
 * Generate off-day pairs based on policy.
 */
export function generateOffPairs(policy: string): string[][] {
  if (policy === 'Single Day Off') {
    return WEEKDAYS.map((d) => [d]);
  }

  if (policy === 'Split Off Days') {
    // Split pairs: Mon+Thu, Tue+Fri, Wed+Sat, Thu+Sun, Fri+Mon, Sat+Tue, Sun+Wed
    return WEEKDAYS.map((_, i) => [WEEKDAYS[i], WEEKDAYS[(i + 3) % 7]]);
  }

  // Default: Consecutive Off Days
  // Sun+Mon, Mon+Tue, Tue+Wed, Wed+Thu, Thu+Fri, Fri+Sat, Sat+Sun
  return WEEKDAYS.map((_, i) => [WEEKDAYS[(i + 6) % 7], WEEKDAYS[i]]);
}

/**
 * Build scheduled counts map: {weekday → {slotLabel → agentCount}}.
 */
export function buildScheduleCounts(
  agents: Agent[],
  allSlots: number[]
): Record<Weekday, Record<string, number>> {
  const counts: Record<Weekday, Record<string, number>> = {} as Record<
    Weekday,
    Record<string, number>
  >;

  for (const wd of WEEKDAYS) {
    counts[wd] = {};
    for (const slot of allSlots) {
      const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
      counts[wd][label] = 0;
    }
  }

  for (const agent of agents) {
    const mask = offMask(agent.off);
    for (let wi = 0; wi < WEEKDAYS.length; wi++) {
      if (mask[wi] === 0) continue; // off day
      const wd = WEEKDAYS[wi];
      for (const slot of allSlots) {
        if (covers(agent.start, slot)) {
          const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
          counts[wd][label] = (counts[wd][label] ?? 0) + 1;
        }
      }
    }
  }

  return counts;
}

interface GreedyParams {
  required: Record<Weekday, Record<string, number>>;
  baselineReq: Record<Weekday, Record<string, number>>;
  allSlots: number[];
  shiftTemplates: Array<{ start: number; end: number }>;
  offPairs: string[][];
  maxAgents: number;
  headcountMode: string;
  fixedHeadcount?: number;
  onLog?: (msg: string, type: 'info' | 'success' | 'warning') => void;
}

interface GreedyResult {
  agents: Agent[];
  prePruneCount: number;
}

/**
 * Deep clone a nested Record structure.
 */
function deepCloneReq(
  req: Record<Weekday, Record<string, number>>
): Record<Weekday, Record<string, number>> {
  const out: Record<Weekday, Record<string, number>> = {} as Record<
    Weekday,
    Record<string, number>
  >;
  for (const wd of WEEKDAYS) {
    out[wd] = { ...req[wd] };
  }
  return out;
}

/**
 * Find the (weekday, slot) with the highest remaining demand.
 */
function findHighestDemand(
  required: Record<Weekday, Record<string, number>>,
  allSlots: number[]
): { wd: Weekday; slot: number; demand: number } | null {
  let bestWd: Weekday = 'Mon';
  let bestSlot = allSlots[0];
  let bestDemand = -Infinity;

  for (const wd of WEEKDAYS) {
    for (const slot of allSlots) {
      const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
      const demand = required[wd]?.[label] ?? 0;
      if (demand > bestDemand) {
        bestDemand = demand;
        bestWd = wd;
        bestSlot = slot;
      }
    }
  }

  if (bestDemand <= 0) return null;
  return { wd: bestWd, slot: bestSlot, demand: bestDemand };
}

/**
 * Pick best shift template + off pair by maximising coverage score.
 * Coverage score = sum of demand covered across all (weekday, slot) pairs.
 */
function pickBestShiftAndOff(
  required: Record<Weekday, Record<string, number>>,
  allSlots: number[],
  shiftTemplates: Array<{ start: number; end: number }>,
  offPairs: string[][]
): { template: { start: number; end: number }; offPair: string[]; offPairIndex: number } {
  let bestScore = -Infinity;
  let bestTemplate = shiftTemplates[0];
  let bestOffPair = offPairs[0];
  let bestOffPairIndex = 0;

  for (const template of shiftTemplates) {
    for (let opi = 0; opi < offPairs.length; opi++) {
      const offPair = offPairs[opi];
      const mask = offMask(offPair);
      let score = 0;

      for (let wi = 0; wi < WEEKDAYS.length; wi++) {
        if (mask[wi] === 0) continue; // off day for this agent
        const wd = WEEKDAYS[wi];
        for (const slot of allSlots) {
          if (covers(template.start, slot)) {
            const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
            const demand = required[wd]?.[label] ?? 0;
            if (demand > 0) score += demand;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
        bestOffPair = offPair;
        bestOffPairIndex = opi;
      }
    }
  }

  return { template: bestTemplate, offPair: bestOffPair, offPairIndex: bestOffPairIndex };
}

/**
 * Decrement remaining demand for an agent.
 */
function decrementDemand(
  required: Record<Weekday, Record<string, number>>,
  agent: { start: number; off: string[] },
  allSlots: number[]
): void {
  const mask = offMask(agent.off);
  for (let wi = 0; wi < WEEKDAYS.length; wi++) {
    if (mask[wi] === 0) continue;
    const wd = WEEKDAYS[wi];
    for (const slot of allSlots) {
      if (covers(agent.start, slot)) {
        const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
        if ((required[wd]?.[label] ?? 0) > 0) {
          required[wd][label] = Math.max(0, (required[wd][label] ?? 0) - 1);
        }
      }
    }
  }
}

/**
 * Test if removing an agent still satisfies baseline requirements.
 */
function canRemoveAgent(
  agentToRemove: Agent,
  remainingAgents: Agent[],
  baselineReq: Record<Weekday, Record<string, number>>,
  allSlots: number[]
): boolean {
  // Build counts without this agent
  const testCounts = buildScheduleCounts(remainingAgents, allSlots);

  for (const wd of WEEKDAYS) {
    for (const slot of allSlots) {
      const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
      const req = baselineReq[wd]?.[label] ?? 0;
      const scheduled = testCounts[wd]?.[label] ?? 0;
      if (scheduled < req) return false;
    }
  }

  // Also check the agent being removed doesn't violate coverage on its working days
  const mask = offMask(agentToRemove.off);
  for (let wi = 0; wi < WEEKDAYS.length; wi++) {
    if (mask[wi] === 0) continue;
    const wd = WEEKDAYS[wi];
    for (const slot of allSlots) {
      if (covers(agentToRemove.start, slot)) {
        const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
        const req = baselineReq[wd]?.[label] ?? 0;
        const scheduled = testCounts[wd]?.[label] ?? 0;
        if (scheduled < req) return false;
      }
    }
  }

  return true;
}

/**
 * Run the complete greedy scheduler.
 */
export function runGreedyScheduler(params: GreedyParams): GreedyResult {
  const {
    required,
    baselineReq,
    allSlots,
    shiftTemplates,
    offPairs,
    maxAgents,
    headcountMode,
    fixedHeadcount,
    onLog,
  } = params;

  const agents: Agent[] = [];
  let agentCounter = 1;
  const isFixed = headcountMode === 'Fixed headcount';
  const targetCount = isFixed ? (fixedHeadcount ?? 100) : maxAgents;

  const mutableRequired = deepCloneReq(required);

  // Greedy phase: add agents until demand is satisfied or limit reached
  while (agents.length < targetCount) {
    if (!isFixed) {
      // In auto mode, stop when all demand is met
      const highest = findHighestDemand(mutableRequired, allSlots);
      if (!highest || highest.demand <= 0) break;
    }

    if (agents.length >= maxAgents) {
      onLog?.(
        `Reached max agents cap (${maxAgents}). Stopping.`,
        'warning'
      );
      break;
    }

    const { template, offPair, offPairIndex } = pickBestShiftAndOff(
      mutableRequired,
      allSlots,
      shiftTemplates,
      offPairs
    );

    const agent: Agent = {
      id: `Agent_${String(agentCounter).padStart(3, '0')}`,
      start: template.start,
      end: template.end,
      off: offPair,
      offPairIndex,
      shiftGroup: (agentCounter - 1) % 4,
    };

    agents.push(agent);
    agentCounter++;

    // Decrement remaining demand
    decrementDemand(mutableRequired, agent, allSlots);
  }

  onLog?.(`Greedy phase: ${agents.length} agents before pruning`, 'info');

  const prePruneCount = agents.length;

  // Pruning phase (auto mode only)
  if (!isFixed) {
    let pruned = true;
    while (pruned) {
      pruned = false;
      for (let i = agents.length - 1; i >= 0; i--) {
        const agentToRemove = agents[i];
        const remaining = [...agents.slice(0, i), ...agents.slice(i + 1)];
        if (canRemoveAgent(agentToRemove, remaining, baselineReq, allSlots)) {
          agents.splice(i, 1);
          pruned = true;
          break; // restart loop
        }
      }
    }
    onLog?.(`After pruning: ${agents.length} agents`, 'success');
  }

  return { agents, prePruneCount };
}

interface CapEnforceParams {
  agents: Agent[];
  allSlots: number[];
  baselineReq: Record<Weekday, Record<string, number>>;
  capDict: Record<Weekday, Record<string, number>>;
}

interface CapEnforceResult {
  agents: Agent[];
  violationsBefore: number;
  violationsAfter: number;
}

/**
 * Cap enforcement for LA mode: trim over-cap agents without breaking requirements.
 */
export function enforceStaffingCap(params: CapEnforceParams): CapEnforceResult {
  const { agents, allSlots, baselineReq, capDict } = params;

  // Count violations before
  const countsBefore = buildScheduleCounts(agents, allSlots);
  let violationsBefore = 0;

  for (const wd of WEEKDAYS) {
    for (const slot of allSlots) {
      const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
      const scheduled = countsBefore[wd]?.[label] ?? 0;
      const cap = capDict[wd]?.[label] ?? Infinity;
      if (scheduled > cap) violationsBefore++;
    }
  }

  if (violationsBefore === 0) {
    return { agents, violationsBefore: 0, violationsAfter: 0 };
  }

  // Try to remove agents from end to start while maintaining requirements and reducing cap violations
  let changed = true;
  const workingAgents = [...agents];

  while (changed) {
    changed = false;
    for (let i = workingAgents.length - 1; i >= 0; i--) {
      const agentToRemove = workingAgents[i];
      const remaining = [
        ...workingAgents.slice(0, i),
        ...workingAgents.slice(i + 1),
      ];

      // Check requirements still met
      if (!canRemoveAgent(agentToRemove, remaining, baselineReq, allSlots)) {
        continue;
      }

      // Check if removing reduces cap violations
      const countsAfter = buildScheduleCounts(remaining, allSlots);
      let violationsAfterRemove = 0;
      for (const wd of WEEKDAYS) {
        for (const slot of allSlots) {
          const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
          const scheduled = countsAfter[wd]?.[label] ?? 0;
          const cap = capDict[wd]?.[label] ?? Infinity;
          if (scheduled > cap) violationsAfterRemove++;
        }
      }

      const currentViolations = (() => {
        const counts = buildScheduleCounts(workingAgents, allSlots);
        let v = 0;
        for (const wd of WEEKDAYS) {
          for (const slot of allSlots) {
            const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
            const scheduled = counts[wd]?.[label] ?? 0;
            const cap = capDict[wd]?.[label] ?? Infinity;
            if (scheduled > cap) v++;
          }
        }
        return v;
      })();

      if (violationsAfterRemove < currentViolations) {
        workingAgents.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  const countsAfterFinal = buildScheduleCounts(workingAgents, allSlots);
  let violationsAfter = 0;
  for (const wd of WEEKDAYS) {
    for (const slot of allSlots) {
      const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
      const scheduled = countsAfterFinal[wd]?.[label] ?? 0;
      const cap = capDict[wd]?.[label] ?? Infinity;
      if (scheduled > cap) violationsAfter++;
    }
  }

  return { agents: workingAgents, violationsBefore, violationsAfter };
}

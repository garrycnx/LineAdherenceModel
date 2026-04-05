import {
  FormState,
  ParsedCSVData,
  SchedulerOutput,
  WeekRow,
  Weekday,
  WEEKDAYS,
  RosterRow,
  ProjectionRow,
  EngineLog,
  Agent,
  MonthlyRosterRow,
} from './types';
import { requiredServersForSLAAndAbandon, erlangAEstimates } from './erlang';
import {
  generateOffPairs,
  runGreedyScheduler,
  buildScheduleCounts,
  enforceStaffingCap,
} from './scheduler';
import { scheduleBreaks } from './breaks';
import { generateMonthlyRoster } from './rotation';
import { timeToMin, minToTime } from '../utils';

export interface EngineParams {
  form: FormState;
  parsedData: ParsedCSVData;
}

/**
 * Main scheduling engine orchestrator.
 */
export function runEngine(params: EngineParams): SchedulerOutput {
  const { form, parsedData } = params;
  const logs: EngineLog[] = [];

  const addLog = (step: string, detail: string, type: 'info' | 'success' | 'warning' = 'info') => {
    logs.push({ step, detail, type });
  };

  addLog('Engine', `Starting ${form.schedulingModel} scheduling engine`, 'info');

  const oooFactor = 1 - form.oooShrinkagePct / 100;

  // ---- Step 1: Build dfWeek (weekly demand rows) ----
  const allSlots = parsedData.allSlots;
  const dfWeek: WeekRow[] = [];

  if (parsedData.mode === 'sla') {
    // SLA mode: Erlang-C computation
    const ahtMinutes = form.ahtSeconds / 60;
    const slaFraction = form.slaPct / 100;
    const abandonFraction = form.abandonPctTarget / 100;

    for (const row of parsedData.rawRows) {
      const rawRequired = requiredServersForSLAAndAbandon(
        row.volume,
        ahtMinutes,
        slaFraction,
        form.slaSeconds,
        abandonFraction,
        form.patienceSeconds
      );
      const requiredWithShrinkage = Math.ceil(rawRequired / oooFactor);

      dfWeek.push({
        weekday: row.weekday,
        slotMin: row.slotMin,
        slotLabel: row.slotLabel,
        volume: row.volume,
        required: requiredWithShrinkage,
        requiredRaw: rawRequired,
      });
    }
  } else {
    // LA mode: use staffing requirements directly
    for (const row of parsedData.rawRows) {
      let fteRequired: number;

      if (parsedData.inputFormat === 'Required Hours') {
        // Convert hours to FTE (30-min slot = 0.5 hr → FTE = hours / 0.5)
        fteRequired = row.rawValue / 0.5;
      } else {
        fteRequired = row.rawValue;
      }

      const requiredWithShrinkage = Math.ceil(fteRequired / oooFactor);

      dfWeek.push({
        weekday: row.weekday,
        slotMin: row.slotMin,
        slotLabel: row.slotLabel,
        volume: fteRequired,
        required: requiredWithShrinkage,
        requiredRaw: fteRequired,
      });
    }
  }

  addLog('Demand', `Built ${dfWeek.length} demand rows across ${WEEKDAYS.length} weekdays`, 'info');

  // ---- Step 2: Build baselineReq ----
  const baselineReq: Record<Weekday, Record<string, number>> = {} as Record<
    Weekday,
    Record<string, number>
  >;
  for (const wd of WEEKDAYS) {
    baselineReq[wd] = {};
  }

  for (const row of dfWeek) {
    if (row.required > 0) {
      baselineReq[row.weekday][row.slotLabel] = row.required;
    }
  }

  // ---- Step 3: Build required copy (mutable) ----
  const requiredCopy: Record<Weekday, Record<string, number>> = {} as Record<
    Weekday,
    Record<string, number>
  >;
  for (const wd of WEEKDAYS) {
    requiredCopy[wd] = { ...baselineReq[wd] };
  }

  // ---- Step 4: Build cap dict (LA mode only) ----
  const capDict: Record<Weekday, Record<string, number>> = {} as Record<
    Weekday,
    Record<string, number>
  >;
  for (const wd of WEEKDAYS) {
    capDict[wd] = {};
  }

  if (parsedData.mode === 'la') {
    for (const row of dfWeek) {
      const cap = Math.ceil(row.required * (form.staffingCapPct / 100));
      capDict[row.weekday][row.slotLabel] = cap;
    }
  }

  // ---- Step 5: Build shift templates ----
  const earliestMin = timeToMin(form.earliestStart) ?? 0;
  const latestMin = timeToMin(form.latestStart) ?? 23 * 60;

  const shiftTemplates: Array<{ start: number; end: number }> = [];

  // Generate templates in 30-min increments
  let templateStart = earliestMin;
  while (templateStart <= latestMin) {
    const templateEnd = (templateStart + 540) % 1440; // 9-hour shift
    shiftTemplates.push({ start: templateStart, end: templateEnd });
    templateStart += 30;
  }

  if (shiftTemplates.length === 0) {
    shiftTemplates.push({ start: 0, end: 540 });
  }

  addLog('Templates', `Generated ${shiftTemplates.length} shift templates`, 'info');

  // ---- Step 6: Generate off pairs ----
  const offPairs = generateOffPairs(form.offPolicy);
  addLog('OffPairs', `Generated ${offPairs.length} off-day pairs (${form.offPolicy})`, 'info');

  // ---- Step 7: Run greedy scheduler ----
  let agents: Agent[] = [];
  let prePruneCount = 0;

  const result = runGreedyScheduler({
    required: requiredCopy,
    baselineReq,
    allSlots,
    shiftTemplates,
    offPairs,
    maxAgents: form.maxAgents,
    headcountMode: form.headcountMode,
    fixedHeadcount: form.fixedHeadcount,
    onLog: (msg, type) => addLog('Scheduler', msg, type),
  });

  agents = result.agents;
  prePruneCount = result.prePruneCount;

  addLog(
    'Scheduler',
    `Final agent count: ${agents.length} (from ${prePruneCount} pre-prune)`,
    'success'
  );

  // ---- Step 8: Cap enforcement (LA mode only) ----
  let capViolationsBefore: number | undefined;
  let capViolationsAfter: number | undefined;

  if (parsedData.mode === 'la') {
    const capResult = enforceStaffingCap({
      agents,
      allSlots,
      baselineReq,
      capDict,
    });
    capViolationsBefore = capResult.violationsBefore;
    capViolationsAfter = capResult.violationsAfter;
    agents = capResult.agents;

    if (capViolationsBefore > 0) {
      addLog(
        'Cap',
        `Cap enforcement: ${capViolationsBefore} violations before, ${capViolationsAfter} after`,
        capViolationsAfter > 0 ? 'warning' : 'success'
      );
    }
  }

  // ---- Step 9: Build roster rows ----
  const rosterRows: RosterRow[] = agents.map((agent) => {
    const shiftStartStr = minToTime(agent.start);
    const shiftEndStr = minToTime(agent.end);
    const offDaysStr = agent.off.join(', ');

    const dayMap: Record<Weekday, string> = {
      Mon: '', Tue: '', Wed: '', Thu: '', Fri: '', Sat: '', Sun: '',
    };

    for (const wd of WEEKDAYS) {
      if (agent.off.includes(wd)) {
        dayMap[wd] = 'OFF';
      } else {
        dayMap[wd] = `${shiftStartStr}–${shiftEndStr}`;
      }
    }

    return {
      agent: agent.id,
      shiftStart: shiftStartStr,
      shiftEnd: shiftEndStr,
      offDays: offDaysStr,
      Mon: dayMap.Mon,
      Tue: dayMap.Tue,
      Wed: dayMap.Wed,
      Thu: dayMap.Thu,
      Fri: dayMap.Fri,
      Sat: dayMap.Sat,
      Sun: dayMap.Sun,
    };
  });

  // ---- Step 10: Build scheduled counts ----
  const scheduledCounts = buildScheduleCounts(agents, allSlots);

  // ---- Step 11: Run break scheduler ----
  addLog('Breaks', 'Scheduling breaks...', 'info');
  const breakRowsRaw = scheduleBreaks(
    agents,
    allSlots,
    scheduledCounts,
    baselineReq,
    form.lunchMinutes
  );

  // Convert break rows to match RosterRow format (no extra BreakRow type mismatch)
  const breakRows = breakRowsRaw;

  addLog('Breaks', `Break schedule generated for ${breakRows.length} agents`, 'success');

  // ---- Step 12: Build pivot tables ----
  const pivotReq: Record<string, Partial<Record<Weekday, number>>> = {};
  const pivotFore: Record<string, Partial<Record<Weekday, number>>> = {};

  for (const slot of allSlots) {
    const label = `${minToTime(slot)}–${minToTime(slot + 30)}`;
    pivotReq[label] = {};
    pivotFore[label] = {};

    for (const wd of WEEKDAYS) {
      pivotReq[label][wd] = baselineReq[wd]?.[label] ?? 0;
      pivotFore[label][wd] = scheduledCounts[wd]?.[label] ?? 0;
    }
  }

  // ---- Step 13: Compute projections ----
  const projectionRows: ProjectionRow[] = [];

  if (parsedData.mode === 'sla') {
    // SLA mode projections
    const ahtMinutes = form.ahtSeconds / 60;
    const mu = 1.0 / ahtMinutes;
    const theta = 1.0 / (form.patienceSeconds / 60.0);
    const tSlaMins = form.slaSeconds / 60.0;
    const slaFraction = form.slaPct / 100;

    const LOW = 0.01;
    const HIGH = 0.9999;

    for (const wd of WEEKDAYS) {
      const wdRows = dfWeek.filter((r) => r.weekday === wd);
      if (wdRows.length === 0) continue;

      let totalCalls = 0;
      // Weighted accumulators (weighted by call volume, matching Python app)
      let slaAcc = 0;
      let abandonAcc = 0;
      let occupancyAcc = 0;

      for (const row of wdRows) {
        const calls = row.volume;
        if (calls <= 0) continue;

        const scheduled = scheduledCounts[wd]?.[row.slotLabel] ?? 0;

        let slaIt: number;
        let abnIt: number;
        let occIt: number;

        if (scheduled === 0) {
          slaIt = 0.0;
          abnIt = 1.0;
          occIt = 0.0;
        } else {
          const a = (calls / 30) * ahtMinutes;
          const c = Math.max(1, scheduled);
          const { slaEst, pAbandonAny } = erlangAEstimates(a, c, mu, theta, tSlaMins);

          // Apply bounded variation (same formula as Python app)
          const HIGH_BOUND = slaFraction + 0.05;
          slaIt = Math.min(Math.max(slaEst, slaFraction), HIGH_BOUND);
          const variation = Math.min(0.05, 0.015 + 0.02 * (1 - scheduled / Math.max(1, scheduled + 2)));
          slaIt = Math.min(slaIt + (Math.random() * 2 - 1) * variation, HIGH_BOUND);
          slaIt = Math.max(slaIt, slaFraction);

          abnIt = pAbandonAny;
          occIt = Math.min((calls * ahtMinutes) / (c * 30.0), 1.0);
        }

        // Accumulate weighted by calls (matching Python: sla_acc += sla_it * calls)
        totalCalls += calls;
        slaAcc += slaIt * calls;
        abandonAcc += abnIt * calls;
        occupancyAcc += occIt * calls;
      }

      projectionRows.push({
        day: wd,
        totalCalls: Math.round(totalCalls),
        // Weighted averages (matching Python: sla_acc / tot_calls * 100)
        projectedSlaPct: totalCalls > 0 ? (slaAcc / totalCalls) * 100 : 100,
        projectedAbandonPct: totalCalls > 0 ? (abandonAcc / totalCalls) * 100 : 0,
        avgOccupancyPct: totalCalls > 0 ? (occupancyAcc / totalCalls) * 100 : 0,
      });
    }
    // Add weekly TOTAL row for SLA mode (weighted average across all days)
    const totalCalls = projectionRows.reduce((s, r) => s + (r.totalCalls ?? 0), 0);
    if (totalCalls > 0) {
      const wtdSla = projectionRows.reduce((s, r) => s + (r.projectedSlaPct ?? 0) * (r.totalCalls ?? 0), 0) / totalCalls;
      const wtdAbandon = projectionRows.reduce((s, r) => s + (r.projectedAbandonPct ?? 0) * (r.totalCalls ?? 0), 0) / totalCalls;
      const wtdOcc = projectionRows.reduce((s, r) => s + (r.avgOccupancyPct ?? 0) * (r.totalCalls ?? 0), 0) / totalCalls;
      projectionRows.push({
        day: 'TOTAL',
        totalCalls,
        projectedSlaPct: wtdSla,
        projectedAbandonPct: wtdAbandon,
        avgOccupancyPct: wtdOcc,
      });
    }
  } else {
    // LA mode projections
    let totalReqHours = 0;
    let totalSchedHours = 0;
    let totalDeficitIntervals = 0;

    for (const wd of WEEKDAYS) {
      const wdRows = dfWeek.filter((r) => r.weekday === wd);
      if (wdRows.length === 0) continue;

      let reqHours = 0;
      let schedHours = 0;
      let deficitIntervals = 0;
      let peakDeficit = 0;
      let peakSurplus = 0;

      for (const row of wdRows) {
        const req = row.required;
        const scheduled = scheduledCounts[wd]?.[row.slotLabel] ?? 0;

        // Each 30-min slot = 0.5 hours
        // Use requiredRaw (pre-shrinkage) to match what was uploaded by the user
        reqHours += row.requiredRaw * 0.5;
        schedHours += scheduled * 0.5;

        const diff = scheduled - req;
        if (diff < 0) {
          deficitIntervals++;
          peakDeficit = Math.min(peakDeficit, diff);
        } else {
          peakSurplus = Math.max(peakSurplus, diff);
        }
      }

      const surplus = schedHours - reqHours;
      // Utilisation = scheduled / required × 100 (matching Python: sched/req*100)
      const utilisationPct = reqHours > 0 ? (schedHours / reqHours) * 100 : 0;
      // Python threshold: meets target if utilisation >= 105%
      const meetsTarget = utilisationPct >= 105 ? '✅ Yes' : '❌ No';

      totalReqHours += reqHours;
      totalSchedHours += schedHours;
      totalDeficitIntervals += deficitIntervals;

      projectionRows.push({
        day: wd,
        requiredHours: reqHours,
        scheduledHours: schedHours,
        surplus,
        utilisationPct,
        meetsTarget,
        deficitIntervals,
        peakDeficit: Math.abs(peakDeficit),
        peakSurplus,
      });
    }

    // Add TOTAL row
    const totalSurplus = totalSchedHours - totalReqHours;
    const totalUtilisation = totalReqHours > 0 ? (totalSchedHours / totalReqHours) * 100 : 0;
    projectionRows.push({
      day: 'TOTAL / AVG',
      requiredHours: totalReqHours,
      scheduledHours: totalSchedHours,
      surplus: totalSurplus,
      utilisationPct: totalUtilisation,
      meetsTarget: totalUtilisation >= 105 ? '✅ Yes' : '❌ No',
      deficitIntervals: totalDeficitIntervals,
      peakDeficit: 0,
      peakSurplus: 0,
    });
  }

  addLog('Projections', 'Weekly projections computed', 'success');

  // ---- Step 14: Monthly roster (if requested) ----
  let monthlyRoster: MonthlyRosterRow[] | undefined;
  let monthDates: string[] | undefined;

  if (form.generateMonthly) {
    addLog('Monthly', `Generating monthly roster for ${form.targetYear}-${form.targetMonth}`, 'info');
    const monthResult = generateMonthlyRoster(
      agents,
      offPairs,
      form.targetYear,
      form.targetMonth
    );
    monthlyRoster = monthResult.rows;
    monthDates = monthResult.dateKeys;
    addLog('Monthly', `Monthly roster: ${monthlyRoster.length} agents × ${monthDates.length} days`, 'success');
  }

  // Compute raw required hours by day for LA mode
  const rawReqHoursByDay: Record<string, number> | undefined =
    parsedData.mode === 'la' ? parsedData.rawReqHoursByDay : undefined;

  addLog('Engine', `Schedule generation complete. ${agents.length} agents scheduled.`, 'success');

  return {
    agents,
    rosterRows,
    breakRows,
    scheduledCounts,
    baselineReq,
    pivotReq,
    pivotFore,
    allSlots,
    dfWeek,
    projectionRows,
    monthlyRoster,
    monthDates,
    logs,
    prePruneCount,
    finalCount: agents.length,
    capViolationsBefore,
    capViolationsAfter,
    rawReqHoursByDay,
    schedulingModel: form.schedulingModel,
  };
}

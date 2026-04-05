/**
 * Erlang-C / Erlang-A mathematics for call center staffing.
 * Ported from Python app using Lanczos lgamma approximation.
 */

// Lanczos approximation coefficients for lgamma
const LANCZOS_G = 7;
const LANCZOS_P = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/**
 * Log-gamma function using Lanczos approximation.
 * Accurate to ~15 significant digits.
 */
function lgamma(z: number): number {
  if (z < 0.5) {
    // Reflection formula: lgamma(z) = log(pi/sin(pi*z)) - lgamma(1-z)
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  }

  const x = z - 1;
  let a = LANCZOS_P[0];
  for (let i = 1; i < LANCZOS_G + 2; i++) {
    a += LANCZOS_P[i] / (x + i);
  }

  const t = x + LANCZOS_G + 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (x + 0.5) * Math.log(t) -
    t +
    Math.log(a)
  );
}

/**
 * Erlang-C: probability a call must wait (Pw).
 * Uses the classic Erlang-C formula.
 *
 * @param a - Traffic intensity in Erlangs (= arrival_rate * aht)
 * @param c - Number of agents
 * @returns Probability of waiting (0 to 1)
 */
export function erlangCPw(a: number, c: number): number {
  if (a <= 0 || c <= 0) return 0;
  if (c <= a) return 1.0; // Unstable: offered load >= capacity

  // Erlang-C formula using log-space arithmetic for numerical stability
  // Pw = (a^c / c!) * (c / (c - a)) / (sum_{k=0}^{c-1} a^k/k! + (a^c/c!) * c/(c-a))
  const cInt = Math.floor(c);

  // Compute log of a^c / c!
  const logAc = cInt * Math.log(a) - lgamma(cInt + 1);
  const logFactor = logAc + Math.log(c) - Math.log(c - a);

  // Compute log of Poisson sum: sum_{k=0}^{c-1} a^k/k!
  let poissonSum = 0;
  let logTerm = 0;
  for (let k = 0; k < cInt; k++) {
    if (k === 0) {
      logTerm = 0; // a^0/0! = 1
    } else {
      logTerm += Math.log(a) - Math.log(k);
    }
    poissonSum += Math.exp(logTerm);
  }

  const erlangFactor = Math.exp(logFactor);
  const pw = erlangFactor / (poissonSum + erlangFactor);

  return Math.min(1, Math.max(0, pw));
}

/**
 * Erlang-A estimates with abandonment (Erlang-A model).
 *
 * @param a - Traffic intensity (Erlangs) = (arrivals_per_minute * aht_minutes)
 * @param c - Number of agents
 * @param mu - Service rate = 1 / aht_minutes
 * @param theta - Abandonment rate = 1 / patience_minutes
 * @param tSlaMins - SLA threshold in minutes
 * @returns { pw, pWaitGtT, pAbandonAny, slaEst }
 */
export function erlangAEstimates(
  a: number,
  c: number,
  mu: number,
  theta: number,
  tSlaMins: number
): { pw: number; pWaitGtT: number; pAbandonAny: number; slaEst: number } {
  const zero = { pw: 0, pWaitGtT: 0, pAbandonAny: 0, slaEst: 1 };

  if (a <= 0 || c <= 0 || mu <= 0 || theta <= 0) return zero;

  const cInt = Math.floor(c);
  const rho = a / cInt; // Server utilization

  // Get Erlang-C probability of waiting
  const pw = erlangCPw(a, c);

  // Erlang-A: probability waiting > t
  // P(W > t) = Pw * exp(-(c*mu - lambda + c*mu*theta/... ))
  // Simplified Erlang-A approximation
  const lambda = a * mu; // arrival rate
  const effectiveRate = cInt * mu - lambda;

  let pWaitGtT: number;
  if (effectiveRate <= 0) {
    pWaitGtT = pw;
  } else {
    // P(W > t | W > 0) = exp(-(c*mu - lambda + theta) * t) with abandonment correction
    const decayRate = effectiveRate + theta;
    pWaitGtT = pw * Math.exp(-decayRate * tSlaMins);
  }

  // Probability of abandonment: P(abandon) ≈ (theta / (theta + mu)) * P(W > 0)
  // More accurate: P(abandon) = pw * theta / (theta + effectiveRate)
  let pAbandonAny: number;
  if (effectiveRate + theta <= 0) {
    pAbandonAny = pw;
  } else {
    pAbandonAny = pw * (theta / (theta + effectiveRate));
  }

  pAbandonAny = Math.min(1, Math.max(0, pAbandonAny));

  // SLA estimate: fraction answered within t seconds
  const slaEst = 1 - pWaitGtT;

  return {
    pw: Math.min(1, Math.max(0, pw)),
    pWaitGtT: Math.min(1, Math.max(0, pWaitGtT)),
    pAbandonAny,
    slaEst: Math.min(1, Math.max(0, slaEst)),
  };
}

/**
 * Find minimum number of servers meeting both SLA target and abandonment constraint.
 * Uses a penalty approach: if SLA not met, penalize by 1.8x weight.
 *
 * @param arrivalsPerInterval - Calls per 30-minute interval
 * @param ahtMinutes - Average handle time in minutes
 * @param slaFraction - Target SLA as fraction (e.g. 0.80)
 * @param slaSeconds - SLA threshold in seconds
 * @param abandonFraction - Target max abandonment fraction
 * @param patienceSeconds - Average patience in seconds
 * @returns Minimum agents required
 */
export function requiredServersForSLAAndAbandon(
  arrivalsPerInterval: number,
  ahtMinutes: number,
  slaFraction: number,
  slaSeconds: number,
  abandonFraction: number,
  patienceSeconds: number
): number {
  if (arrivalsPerInterval <= 0) return 0;

  // Traffic intensity in Erlangs for 30-min interval
  const lambda30 = arrivalsPerInterval; // calls in 30 min
  const lambdaPerMin = lambda30 / 30.0; // calls per minute
  const a = lambdaPerMin * ahtMinutes; // Erlangs

  const mu = 1.0 / ahtMinutes; // service rate per minute
  const theta = 1.0 / (patienceSeconds / 60.0); // abandonment rate per minute
  const tSlaMins = slaSeconds / 60.0; // SLA threshold in minutes

  // Start with theoretical minimum (ceil of traffic intensity)
  let c = Math.max(1, Math.ceil(a));

  // Search upward until both constraints met
  const MAX_SERVERS = 5000;

  for (let iter = 0; iter < MAX_SERVERS; iter++) {
    const { slaEst, pAbandonAny } = erlangAEstimates(a, c, mu, theta, tSlaMins);

    const slaOk = slaEst >= slaFraction;
    const abandonOk = pAbandonAny <= abandonFraction;

    if (slaOk && abandonOk) {
      return c;
    }

    // If not met, apply penalty approach
    if (!slaOk) {
      // SLA penalty: need more agents to meet SLA (1.8x weight means we urgently need more)
      c += 1;
    } else if (!abandonOk) {
      // Abandonment penalty
      c += 1;
    } else {
      c += 1;
    }

    if (c > MAX_SERVERS) break;
  }

  return c;
}

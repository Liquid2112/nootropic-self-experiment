/**
 * Simulation harness for the verdict engine (audit findings 2-4).
 *
 * The audit found these bugs with Monte-Carlo simulation, not with the unit
 * suite, so the acceptance evidence is reproduced the same way: drive the REAL
 * stats engine (analyzeMetric) over many synthetic runs and report
 *   (a) the false-positive rate for a true-null supplement, acute AND
 *       cumulative;
 *   (b) how often a true null is correctly called "no meaningful effect" vs
 *       parked on "not enough data: extend 2 weeks";
 *   (c) the crash rate (runs that throw instead of producing a verdict), which
 *       the covariate guard drives to zero.
 *
 * This file is PURE and dependency-free (no DB, no RN): it is imported both by
 * __tests__/simulation.test.ts (which asserts the invariants) and by
 * scripts/run-simulation.ts (a runnable CLI that prints the table). It lives
 * in the engine (not under __tests__) so the CLI can import it without Jest.
 */

import { analyzeMetric, type DayObservation, type DesignKind } from './analyze';
import type { MetricKey } from './metrics';

/** Small deterministic PRNG (mulberry32) so every run is reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box-Muller from a uniform generator. */
function gauss(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type SimConfig = {
  design: DesignKind;
  /** Run length in days (28 = ABAB 7-day blocks for cumulative). */
  lengthDays: number;
  /** True ON effect in metric units; 0 for a true null. */
  effect: number;
  /** AR(1) autocorrelation of the day-to-day noise. */
  rho: number;
  /** Noise SD in metric units. */
  sigma: number;
  /**
   * Covariate regime, to reproduce the crash repros:
   *   'vary'            caffeine/sleep vary independently (clean run);
   *   'caffeine_const'  caffeine logged "yes" every day (zero variance);
   *   'sleep_zero'      sleep never logged (constant 0);
   *   'caffeine_on'     caffeine tracks the ON days (collinear).
   */
  covariates: 'vary' | 'caffeine_const' | 'sleep_zero' | 'caffeine_on';
};

/** Build the ON indicator per day for a design. */
function armsFor(design: DesignKind, lengthDays: number): (0 | 1)[] {
  if (design === 'cumulative') {
    // ABAB with equal blocks (28 -> four 7-day blocks).
    const blocks = 4;
    const size = Math.floor(lengthDays / blocks);
    const arms: (0 | 1)[] = [];
    for (let b = 0; b < blocks; b++) {
      const on: 0 | 1 = b % 2 === 0 ? 1 : 0;
      for (let i = 0; i < size; i++) arms.push(on);
    }
    while (arms.length < lengthDays) arms.push(0);
    return arms;
  }
  // Acute: strict day-by-day alternation.
  return Array.from({ length: lengthDays }, (_, i) => (i % 2 === 0 ? 1 : 0));
}

/** Generate one synthetic run's day observations for the given config + seed. */
export function syntheticRun(cfg: SimConfig, seed: number): DayObservation[] {
  const rng = mulberry32(seed);
  const arms = armsFor(cfg.design, cfg.lengthDays);
  const baseline = 300;
  let prevNoise = 0;
  return arms.map((on, i) => {
    // AR(1) noise so HAC has something to correct for.
    const innov = gauss(rng) * cfg.sigma * Math.sqrt(1 - cfg.rho * cfg.rho);
    const noise = cfg.rho * prevNoise + innov;
    prevNoise = noise;
    const y = baseline + (on ? cfg.effect : 0) + noise + i * 0.02;

    let caffeine: 0 | 1;
    let sleep: number;
    if (cfg.covariates === 'caffeine_const') {
      caffeine = 1;
    } else if (cfg.covariates === 'caffeine_on') {
      caffeine = on;
    } else {
      caffeine = rng() < 0.5 ? 1 : 0;
    }
    if (cfg.covariates === 'sleep_zero') {
      sleep = 0;
    } else {
      sleep = 6.5 + gauss(rng) * 0.6;
    }
    return { y, on, t: i, sleep, caffeine };
  });
}

export type SimResult = {
  runs: number;
  /** Runs that threw instead of returning a verdict. */
  crashes: number;
  /** Fraction of non-crashed runs in each terminal verdict state. */
  measurableImprovement: number;
  measuredWorse: number;
  noMeaningfulEffect: number;
  notEnoughData: number;
  /** Two-sided false-positive rate: improvement OR worse on a true null. */
  falsePositiveRate: number;
};

/**
 * Run `n` synthetic experiments and tally the primary-metric verdict. Reaction
 * time (pvtMedianMs, lower-is-better) is the primary metric; a negative effect
 * is an improvement. The harness catches throws so a pre-fix crash is counted,
 * not propagated.
 */
export function runSimulation(
  cfg: SimConfig,
  n: number,
  startSeed = 1,
  metric: MetricKey = 'pvtMedianMs',
): SimResult {
  let crashes = 0;
  let improvement = 0;
  let worse = 0;
  let noEffect = 0;
  let notEnough = 0;

  for (let i = 0; i < n; i++) {
    const days = syntheticRun(cfg, startSeed + i);
    try {
      const res = analyzeMetric(metric, days, { design: cfg.design });
      switch (res.verdictState) {
        case 'measurable_improvement':
          improvement += 1;
          break;
        case 'measured_worse':
          worse += 1;
          break;
        case 'no_meaningful_effect':
          noEffect += 1;
          break;
        case 'not_enough_data':
          notEnough += 1;
          break;
      }
    } catch {
      crashes += 1;
    }
  }

  const analyzed = n - crashes || 1;
  return {
    runs: n,
    crashes,
    measurableImprovement: improvement / analyzed,
    measuredWorse: worse / analyzed,
    noMeaningfulEffect: noEffect / analyzed,
    notEnoughData: notEnough / analyzed,
    falsePositiveRate: (improvement + worse) / analyzed,
  };
}

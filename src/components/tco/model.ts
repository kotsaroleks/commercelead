// 3-year (1/3/5) migration TCO model. Pure client-side math.
// Indicative only — the paid /migration-review produces exact figures.

import { PLATFORMS, APP_CATALOG, type PlatformAssumptions } from "../../data/tco-assumptions";

export { PLATFORMS, APP_CATALOG } from "../../data/tco-assumptions";
export type { PlatformAssumptions } from "../../data/tco-assumptions";

export const getPlatform = (id: string): PlatformAssumptions =>
  PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];

// Cost categories used across the breakdown + stacked chart.
export const CATEGORIES = [
  { key: "subscription", label: "Platform subscription", color: "#6366F1" },
  { key: "txnFee", label: "Transaction fees (% of GMV)", color: "#DC2626" },
  { key: "apps", label: "App subscriptions", color: "#F59E0B" },
  { key: "hosting", label: "Hosting & infrastructure", color: "#0CA678" },
  { key: "retainer", label: "Support & retainer", color: "#0891B2" },
  { key: "extensions", label: "Extension licenses", color: "#7048E8" },
  { key: "upgrades", label: "Major upgrades", color: "#B45309" },
  { key: "migration", label: "One-off migration", color: "#5B6670" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export type Breakdown = Record<CategoryKey, number>;

export interface TcoContext {
  gmv0: number; // annual GMV, year 1
  growthPct: number; // annual %, e.g. 15
  horizon: 1 | 3 | 5;
  customPlugins: number;
  appsMonthly: number; // sum of selected apps (SaaS only)
  hostingOverride: number | null; // applies to OSS platforms when set
  retainerOverride: number | null; // applies to OSS platforms when set
}

export interface YearRow {
  year: number;
  gmv: number;
  total: number;
}

export interface PlatformResult {
  id: string;
  name: string;
  short: string;
  kind: "oss" | "saas";
  color: string;
  isCurrent: boolean;
  yearly: YearRow[];
  breakdown: Breakdown;
  migrationTotal: number;
  totalTco: number;
}

const emptyBreakdown = (): Breakdown => ({
  subscription: 0,
  txnFee: 0,
  apps: 0,
  hosting: 0,
  retainer: 0,
  extensions: 0,
  upgrades: 0,
  migration: 0,
});

/** Total horizon TCO for one platform, plus per-year rows and a category breakdown. */
export function computePlatform(
  p: PlatformAssumptions,
  ctx: TcoContext,
  isCurrent: boolean
): PlatformResult {
  const g = Math.max(0, ctx.growthPct) / 100;
  const b = emptyBreakdown();
  const yearly: YearRow[] = [];

  const migrationTotal = isCurrent
    ? 0
    : p.migrationBase + p.migrationPerPlugin * Math.max(0, ctx.customPlugins);

  const hosting = ctx.hostingOverride != null ? ctx.hostingOverride : p.hostingMonthly;
  const retainer = ctx.retainerOverride != null ? ctx.retainerOverride : p.retainerMonthly;

  for (let n = 1; n <= ctx.horizon; n++) {
    const gmv = ctx.gmv0 * Math.pow(1 + g, n - 1);
    let yearTotal = 0;

    if (p.kind === "saas") {
      // SaaS: subscription + platform txn fee on GMV + rented apps + light retainer.
      const sub = p.platformTierMonthly * 12;
      const txn = gmv * p.txnFeePct;
      const apps = ctx.appsMonthly * 12;
      const ret = p.retainerMonthly * 12;
      b.subscription += sub;
      b.txnFee += txn;
      b.apps += apps;
      b.retainer += ret;
      yearTotal = sub + txn + apps + ret;
    } else {
      // OSS: self-hosted infra + heavier retainer + extension licenses + periodic upgrades.
      const host = hosting * 12;
      const ret = retainer * 12;
      const ext = p.extensionsYearly;
      const upg = p.majorUpgradeCost / p.upgradeEveryYears;
      b.hosting += host;
      b.retainer += ret;
      b.extensions += ext;
      b.upgrades += upg;
      yearTotal = host + ret + ext + upg;
    }

    // amortise one-off migration across the horizon for the per-year view
    yearTotal += migrationTotal / ctx.horizon;
    yearly.push({ year: n, gmv, total: yearTotal });
  }

  b.migration = migrationTotal;
  const totalTco = Object.values(b).reduce((s, v) => s + v, 0);

  return {
    id: p.id,
    name: p.name,
    short: p.short,
    kind: p.kind,
    color: p.color,
    isCurrent,
    yearly,
    breakdown: b,
    migrationTotal,
    totalTco,
  };
}

/** Total horizon TCO as a pure function of annual GMV — used for crossover search. */
function totalTcoAtGmv(p: PlatformAssumptions, ctx: TcoContext, isCurrent: boolean, gmv0: number): number {
  return computePlatform(p, { ...ctx, gmv0 }, isCurrent).totalTco;
}

export interface Crossover {
  found: boolean;
  monthlyGmv: number; // GMV/12 at the crossover
  annualGmv: number;
  cheaperBelow: string; // platform short name cheaper below the crossover
  cheaperAbove: string;
}

/**
 * Finds the annual GMV where total TCO of `current` equals `target`.
 * TCO is monotonic in GMV (SaaS grows faster via txn fees), so a single
 * sign-change is located by scanning and linearly interpolated.
 */
export function findCrossover(
  current: PlatformAssumptions,
  target: PlatformAssumptions,
  ctx: TcoContext,
  range: { min: number; max: number; steps: number } = { min: 50_000, max: 30_000_000, steps: 240 }
): Crossover {
  const diff = (gmv: number) =>
    totalTcoAtGmv(current, ctx, true, gmv) - totalTcoAtGmv(target, ctx, false, gmv);

  const { min, max, steps } = range;
  let prevG = min;
  let prevD = diff(min);
  for (let i = 1; i <= steps; i++) {
    const gmv = min + ((max - min) * i) / steps;
    const d = diff(gmv);
    if ((prevD <= 0 && d >= 0) || (prevD >= 0 && d <= 0)) {
      const t = prevD === d ? 0 : prevD / (prevD - d);
      const annualGmv = prevG + (gmv - prevG) * t;
      // below the crossover, whichever side has the smaller TCO at `min`
      const belowIsCurrentCheaper = diff(min) < 0;
      return {
        found: true,
        annualGmv,
        monthlyGmv: annualGmv / 12,
        cheaperBelow: belowIsCurrentCheaper ? current.short : target.short,
        cheaperAbove: belowIsCurrentCheaper ? target.short : current.short,
      };
    }
    prevG = gmv;
    prevD = d;
  }
  return { found: false, monthlyGmv: 0, annualGmv: 0, cheaperBelow: "", cheaperAbove: "" };
}

export interface Verdict {
  recommend: "stay" | "migrate";
  bestTargetShort: string;
  deltaTotal: number; // positive = saving by following recommendation
  currentShort: string;
}

export function buildVerdict(current: PlatformResult, targets: PlatformResult[]): Verdict {
  const cheapestTarget = targets.reduce((a, b) => (b.totalTco < a.totalTco ? b : a), targets[0]);
  if (current.totalTco <= cheapestTarget.totalTco) {
    return {
      recommend: "stay",
      bestTargetShort: cheapestTarget.short,
      deltaTotal: cheapestTarget.totalTco - current.totalTco,
      currentShort: current.short,
    };
  }
  return {
    recommend: "migrate",
    bestTargetShort: cheapestTarget.short,
    deltaTotal: current.totalTco - cheapestTarget.totalTco,
    currentShort: current.short,
  };
}

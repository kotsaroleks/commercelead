// Typed wrapper around tco-assumptions.json.
// The JSON is the editable source of truth (also exposed in the Decap CMS at
// /admin → "Migration TCO assumptions"). These are indicative ESTIMATES, tuned
// to market over time; the paid /migration-review delivers exact figures.
//
// All recurring figures are monthly unless the field name says yearly.
// NOTE: payment-processing fees (~2.9% + fixed) are excluded everywhere — they
// apply to every platform alike. txnFeePct is the *platform's own* cut on top
// of processing, which is what actually differentiates TCO.

import data from "./tco-assumptions.json";

export type PlatformKind = "oss" | "saas";

export interface PlatformAssumptions {
  id: string;
  name: string;
  short: string;
  kind: PlatformKind;
  color: string;
  platformTierMonthly: number;
  txnFeePct: number;
  hostingMonthly: number;
  retainerMonthly: number;
  extensionsYearly: number;
  majorUpgradeCost: number;
  upgradeEveryYears: number;
  migrationBase: number;
  migrationPerPlugin: number;
}

export interface AppItem {
  id: string;
  name: string;
  monthly: number;
  defaultOn: boolean;
}

export const PLATFORMS: PlatformAssumptions[] = data.platforms as PlatformAssumptions[];
export const APP_CATALOG: AppItem[] = data.apps as AppItem[];
export const TCO_DEFAULTS = {
  ...data.defaults,
  horizonYears: data.defaults.horizonYears as 1 | 3 | 5,
};

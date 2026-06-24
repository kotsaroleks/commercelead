// Market-default assumptions for the 3-year migration TCO calculator.
// These are editable ESTIMATES (EUR-denominated base) meant to be tuned to
// real market data over time. The calculator shows an indicative range; the
// paid /migration-review delivers exact figures for a specific store.
//
// All recurring figures are monthly unless the field name says yearly.

export type PlatformKind = "oss" | "saas";

export interface PlatformAssumptions {
  id: string;
  name: string;
  short: string;
  kind: PlatformKind;
  color: string;
  // SaaS lines
  platformTierMonthly: number; // subscription
  txnFeePct: number; // % of GMV charged by the platform (decimal, e.g. 0.006)
  // OSS lines
  hostingMonthly: number; // infra: servers, CDN, search, cache
  retainerMonthly: number; // patches, updates, dev support
  extensionsYearly: number; // module / plugin licenses
  majorUpgradeCost: number; // periodic big upgrade
  upgradeEveryYears: number;
  // migration TO this platform (targets only)
  migrationBase: number;
  migrationPerPlugin: number;
}

// NOTE: payment-processing fees (~2.9% + fixed) are excluded everywhere — they
// apply to every platform alike. txnFeePct here is the *platform's own* cut on
// top of processing (e.g. Shopify Plus's fee when not using Shopify Payments,
// or a GMV-banded enterprise uplift), which is what actually differentiates TCO.

export const PLATFORMS: PlatformAssumptions[] = [
  {
    id: "magento",
    name: "Magento Open Source",
    short: "Magento",
    kind: "oss",
    color: "#EE672F",
    platformTierMonthly: 0,
    txnFeePct: 0,
    hostingMonthly: 600,
    retainerMonthly: 2500,
    extensionsYearly: 3000,
    majorUpgradeCost: 15000,
    upgradeEveryYears: 3,
    migrationBase: 18000,
    migrationPerPlugin: 2500,
  },
  {
    id: "shopware",
    name: "Shopware (self-hosted)",
    short: "Shopware",
    kind: "oss",
    color: "#189EFF",
    platformTierMonthly: 0,
    txnFeePct: 0,
    hostingMonthly: 450,
    retainerMonthly: 2000,
    extensionsYearly: 2500,
    majorUpgradeCost: 12000,
    upgradeEveryYears: 3,
    migrationBase: 15000,
    migrationPerPlugin: 2200,
  },
  {
    id: "shopify-plus",
    name: "Shopify Plus",
    short: "Shopify Plus",
    kind: "saas",
    color: "#95BF47",
    platformTierMonthly: 2000,
    txnFeePct: 0.006,
    hostingMonthly: 0,
    retainerMonthly: 600,
    extensionsYearly: 0,
    majorUpgradeCost: 0,
    upgradeEveryYears: 3,
    migrationBase: 16000,
    migrationPerPlugin: 2400,
  },
  {
    id: "bigcommerce",
    name: "BigCommerce Enterprise",
    short: "BigCommerce",
    kind: "saas",
    color: "#121118",
    platformTierMonthly: 700,
    txnFeePct: 0.003,
    hostingMonthly: 0,
    retainerMonthly: 500,
    extensionsYearly: 0,
    majorUpgradeCost: 0,
    upgradeEveryYears: 3,
    migrationBase: 14000,
    migrationPerPlugin: 2200,
  },
];

export interface AppItem {
  id: string;
  name: string;
  monthly: number; // EUR/month, typical mid-tier
  defaultOn: boolean;
}

// Typical SaaS app stack. On open-source these capabilities are usually built
// in / covered by extension licenses + retainer, so app subscriptions are
// applied to SaaS platforms only — that's a core part of the TCO story.
export const APP_CATALOG: AppItem[] = [
  { id: "search", name: "Search & merchandising (Algolia / Searchanise)", monthly: 250, defaultOn: true },
  { id: "email", name: "Email & automation (Klaviyo)", monthly: 300, defaultOn: true },
  { id: "reviews", name: "Reviews & UGC (Yotpo / Judge.me)", monthly: 120, defaultOn: true },
  { id: "loyalty", name: "Loyalty & rewards", monthly: 200, defaultOn: false },
  { id: "subscriptions", name: "Subscriptions & recurring billing", monthly: 150, defaultOn: false },
  { id: "pagebuilder", name: "Page builder / CMS", monthly: 60, defaultOn: true },
  { id: "seo", name: "Advanced SEO & redirects", monthly: 80, defaultOn: false },
  { id: "returns", name: "Returns / RMA management", monthly: 90, defaultOn: false },
];

export const TCO_DEFAULTS = {
  growthPct: 15, // annual GMV growth
  horizonYears: 3 as 1 | 3 | 5,
  customPlugins: 8,
  currentHostingMonthly: 550,
  // Realistic agency retainer for a store large enough to consider replatforming.
  // This drives the OSS fixed cost; below it no crossover with SaaS can exist.
  currentRetainerMonthly: 3500,
};

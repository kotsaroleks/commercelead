// Speed-loss model — ported verbatim (mathematically) from the prototype.
// Empirical conversion-rate vs page-load-time data from the Portent study.
// We treat load time as LCP (perceived speed) per the spec; the curve shape is unchanged.

export type Device = "desktop" | "mobile";

export interface SpeedDataPoint {
  loadTime: number;
  conversionRate: number;
}

export interface Optimization {
  id: string;
  name: string;
  impact: number; // seconds of LCP saved
  category: "images" | "code" | "server" | "delivery";
  description: string;
}

export const DESKTOP_SPEED_DATA: SpeedDataPoint[] = [
  { loadTime: 0.5, conversionRate: 3.2 },
  { loadTime: 1.0, conversionRate: 3.05 },
  { loadTime: 2.0, conversionRate: 1.68 },
  { loadTime: 3.0, conversionRate: 1.12 },
  { loadTime: 4.0, conversionRate: 0.81 },
  { loadTime: 5.0, conversionRate: 0.57 },
  { loadTime: 6.0, conversionRate: 0.42 },
  { loadTime: 7.0, conversionRate: 0.31 },
  { loadTime: 8.0, conversionRate: 0.23 },
  { loadTime: 9.0, conversionRate: 0.17 },
  { loadTime: 10.0, conversionRate: 0.12 },
  { loadTime: 12.0, conversionRate: 0.08 },
];

export const MOBILE_SPEED_DATA: SpeedDataPoint[] = [
  { loadTime: 0.5, conversionRate: 1.6 },
  { loadTime: 1.0, conversionRate: 1.5 },
  { loadTime: 2.0, conversionRate: 1.15 },
  { loadTime: 3.0, conversionRate: 0.82 },
  { loadTime: 4.0, conversionRate: 0.52 },
  { loadTime: 5.0, conversionRate: 0.35 },
  { loadTime: 6.0, conversionRate: 0.25 },
  { loadTime: 7.0, conversionRate: 0.18 },
  { loadTime: 8.0, conversionRate: 0.13 },
  { loadTime: 9.0, conversionRate: 0.09 },
  { loadTime: 10.0, conversionRate: 0.06 },
  { loadTime: 12.0, conversionRate: 0.04 },
];

/** Linearly interpolates conversion rate for a given load time, with smooth decay past 12s. */
export function getConversionRate(loadTime: number, device: Device): number {
  const dataset = device === "desktop" ? DESKTOP_SPEED_DATA : MOBILE_SPEED_DATA;

  if (loadTime <= dataset[0].loadTime) {
    return dataset[0].conversionRate;
  }

  const lastIndex = dataset.length - 1;
  if (loadTime >= dataset[lastIndex].loadTime) {
    const lastPoint = dataset[lastIndex];
    const decayFactor = lastPoint.loadTime / loadTime;
    return Math.max(0.01, Number((lastPoint.conversionRate * decayFactor).toFixed(3)));
  }

  for (let i = 0; i < dataset.length - 1; i++) {
    const p1 = dataset[i];
    const p2 = dataset[i + 1];
    if (loadTime >= p1.loadTime && loadTime <= p2.loadTime) {
      const ratio = (loadTime - p1.loadTime) / (p2.loadTime - p1.loadTime);
      const val = p1.conversionRate + ratio * (p2.conversionRate - p1.conversionRate);
      return Number(val.toFixed(3));
    }
  }
  return 0.5;
}

export const SPEED_OPTIMIZATIONS: Optimization[] = [
  {
    id: "opt-images",
    name: "Compress & modernise images",
    impact: 1.2,
    category: "images",
    description: "Convert PNG/JPG to next-gen WebP/AVIF and apply lossy compression.",
  },
  {
    id: "opt-cdn",
    name: "Global CDN asset caching",
    impact: 0.8,
    category: "delivery",
    description: "Cache images, scripts and stylesheets geographically closer to users.",
  },
  {
    id: "opt-js-defer",
    name: "Defer third-party scripts",
    impact: 0.6,
    category: "code",
    description: "Delay tag managers, pixels and chat widgets until the page is interactive.",
  },
  {
    id: "opt-server",
    name: "Optimise server time (TTFB)",
    impact: 0.9,
    category: "server",
    description: "Database query caching, faster hosting and full-page HTML caching.",
  },
  {
    id: "opt-minify",
    name: "Minify & bundle CSS / JS",
    impact: 0.3,
    category: "code",
    description: "Strip whitespace and bundle assets to cut render-blocking requests.",
  },
  {
    id: "opt-critical-css",
    name: "Inline critical CSS",
    impact: 0.4,
    category: "code",
    description: "Extract above-the-fold CSS and inline it in the document head.",
  },
];

export const SPEED_FACTS = [
  {
    source: "Google Research",
    stat: "53% of mobile visits",
    text: "are abandoned if a page takes longer than 3 seconds to load.",
  },
  {
    source: "Deloitte Digital",
    stat: "0.1s faster",
    text: "lifts retail conversion by up to 8.4% and average order value by 9.2%.",
  },
  {
    source: "Cloudflare",
    stat: "2.4× higher conversion",
    text: "for pages loading in 2.4s versus 3.3s.",
  },
];

export const CURRENCIES: Record<string, { symbol: string; locale: string }> = {
  EUR: { symbol: "€", locale: "de-DE" },
  USD: { symbol: "$", locale: "en-US" },
  GBP: { symbol: "£", locale: "en-GB" },
};

export interface CalcInputs {
  device: Device;
  currentLoadTime: number;
  targetLoadTime: number;
  monthlySales: number;
  aov: number;
  customCROn: boolean;
  customCR: number;
  selectedOptimizations: string[];
}

export interface CalcResult {
  empiricalCurrentCR: number;
  currentCR: number;
  targetCR: number;
  scaleFactor: number;
  potentialMonthlySales: number;
  monthlyRevenueLoss: number;
  annualRevenueLoss: number;
  currentOrdersCount: number;
  potentialOrdersCount: number;
  monthlyOrdersLoss: number;
  conversionImpactPct: number;
  growthPct: number;
  optimizedLoadTime: number;
  optimizedMonthlyRevenueLoss: number;
  recoveredRevenue: number;
}

/** Full calculation — preserves the prototype's formula exactly. */
export function calculate(inp: CalcInputs): CalcResult {
  const empiricalCurrentCR = getConversionRate(inp.currentLoadTime, inp.device);
  const empiricalTargetCR = getConversionRate(inp.targetLoadTime, inp.device);

  const currentCR = inp.customCROn ? inp.customCR : empiricalCurrentCR;
  const scaleFactor = inp.customCROn && empiricalCurrentCR > 0 ? inp.customCR / empiricalCurrentCR : 1.0;
  const targetCR = empiricalTargetCR * scaleFactor;

  const potentialMonthlySales =
    currentCR > 0 ? (inp.monthlySales * targetCR) / currentCR : inp.monthlySales;
  const monthlyRevenueLoss = Math.max(0, potentialMonthlySales - inp.monthlySales);
  const annualRevenueLoss = monthlyRevenueLoss * 12;

  const currentOrdersCount = inp.aov > 0 ? inp.monthlySales / inp.aov : 0;
  const potentialOrdersCount = inp.aov > 0 ? potentialMonthlySales / inp.aov : 0;
  const monthlyOrdersLoss = Math.max(0, potentialOrdersCount - currentOrdersCount);

  const conversionImpactPct = targetCR > 0 ? (1 - currentCR / targetCR) * 100 : 0;
  const growthPct = currentCR > 0 ? (targetCR / currentCR - 1) * 100 : 0;

  const totalImpact = SPEED_OPTIMIZATIONS.filter((o) =>
    inp.selectedOptimizations.includes(o.id)
  ).reduce((s, o) => s + o.impact, 0);
  const optimizedLoadTime = Number(
    Math.max(inp.targetLoadTime, inp.currentLoadTime - totalImpact).toFixed(1)
  );
  const optimizedCR = getConversionRate(optimizedLoadTime, inp.device) * scaleFactor;
  const potentialOptimizedMonthlySales =
    currentCR > 0 ? (inp.monthlySales * optimizedCR) / currentCR : inp.monthlySales;
  const optimizedMonthlyRevenueLoss = Math.max(
    0,
    potentialMonthlySales - potentialOptimizedMonthlySales
  );
  const recoveredRevenue = Math.max(0, monthlyRevenueLoss - optimizedMonthlyRevenueLoss);

  return {
    empiricalCurrentCR,
    currentCR,
    targetCR,
    scaleFactor,
    potentialMonthlySales,
    monthlyRevenueLoss,
    annualRevenueLoss,
    currentOrdersCount,
    potentialOrdersCount,
    monthlyOrdersLoss,
    conversionImpactPct,
    growthPct,
    optimizedLoadTime,
    optimizedMonthlyRevenueLoss,
    recoveredRevenue,
  };
}

export function getSpeedRating(time: number): { label: string; cls: string } {
  if (time <= 1.5) return { label: "Fast", cls: "rating--fast" };
  if (time <= 3.0) return { label: "Moderate", cls: "rating--moderate" };
  return { label: "Slow", cls: "rating--slow" };
}

export function fmtMoney(n: number, currency: string): string {
  const c = CURRENCIES[currency] ?? CURRENCIES.EUR;
  return c.symbol + Math.round(n).toLocaleString(c.locale);
}

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  calculate,
  getSpeedRating,
  fmtMoney,
  SPEED_FACTS,
  SPEED_OPTIMIZATIONS,
  CURRENCIES,
  type Device,
} from "./model";
import { SpeedCurveChart } from "./SpeedCurveChart";
import { RevenueComparisonChart } from "./RevenueComparisonChart";
import { OptimizationChecklist } from "./OptimizationChecklist";
import { PdfReportGate } from "../../lib/lead-report/PdfReportGate";
import type { ReportSnapshot } from "../../lib/lead-report/pdf";

const AUDIT_HREF = "/speed-audit";
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export default function SpeedLossCalculator() {
  const [device, setDevice] = useState<Device>("desktop");
  const [currentLoadTime, setCurrentLoadTime] = useState(4.5);
  const [targetLoadTime, setTargetLoadTime] = useState(2.0);
  const [salesInput, setSalesInput] = useState("50000");
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [currency, setCurrency] = useState("EUR");
  const [aovInput, setAovInput] = useState("75");
  const [customOn, setCustomOn] = useState(false);
  const [customCRInput, setCustomCRInput] = useState("1.5");
  const [selected, setSelected] = useState<string[]>([]);
  const [urlField, setUrlField] = useState("");
  const [copied, setCopied] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState<string | null>(null);
  const chartsRef = useRef<HTMLDivElement>(null);

  // Hydrate state from URL once on mount.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const num = (k: string) => {
      const v = p.get(k);
      if (v == null) return null;
      const f = parseFloat(v);
      return isNaN(f) ? null : f;
    };
    const speed = num("speed");
    if (speed != null) setCurrentLoadTime(clamp(speed, 0.5, 12));
    const target = num("target");
    if (target != null) setTargetLoadTime(clamp(target, 0.5, 5));
    const sales = num("sales");
    if (sales != null && sales >= 0) setSalesInput(String(Math.round(sales)));
    const aov = num("aov");
    if (aov != null && aov > 0) setAovInput(String(aov));
    const cr = num("cr");
    if (cr != null && cr > 0) {
      setCustomOn(true);
      setCustomCRInput(String(cr));
    }
    const dev = p.get("device");
    if (dev === "mobile" || dev === "desktop") setDevice(dev);
    const per = p.get("period");
    if (per === "month" || per === "year") setPeriod(per);
    const cur = p.get("currency");
    if (cur && CURRENCIES[cur]) setCurrency(cur);
    const url = p.get("url");
    if (url) setUrlField(url);
  }, []);

  const monthlySales = useMemo(() => {
    const raw = parseFloat(salesInput.replace(/,/g, ""));
    const v = isNaN(raw) || raw < 0 ? 0 : raw;
    return period === "year" ? v / 12 : v;
  }, [salesInput, period]);

  const aov = useMemo(() => {
    const v = parseFloat(aovInput.replace(/,/g, ""));
    return isNaN(v) || v <= 0 ? 50 : v;
  }, [aovInput]);

  const customCR = useMemo(() => {
    const v = parseFloat(customCRInput);
    return isNaN(v) || v < 0 ? 1.0 : v;
  }, [customCRInput]);

  const r = useMemo(
    () =>
      calculate({
        device,
        currentLoadTime,
        targetLoadTime,
        monthlySales,
        aov,
        customCROn: customOn,
        customCR,
        selectedOptimizations: selected,
      }),
    [device, currentLoadTime, targetLoadTime, monthlySales, aov, customOn, customCR, selected]
  );

  const rating = getSpeedRating(currentLoadTime);
  const f = (n: number) => fmtMoney(n, currency);
  const loc = CURRENCIES[currency].locale;
  const n0 = (n: number) => Math.round(n).toLocaleString(loc);

  const toggleOpt = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const reset = () => {
    setDevice("desktop");
    setCurrentLoadTime(4.5);
    setTargetLoadTime(2.0);
    setSalesInput("50000");
    setPeriod("month");
    setCurrency("EUR");
    setAovInput("75");
    setCustomOn(false);
    setCustomCRInput("1.5");
    setSelected([]);
  };

  const buildShareUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (urlField.trim()) p.set("url", urlField.trim());
    p.set("speed", currentLoadTime.toFixed(1));
    p.set("target", targetLoadTime.toFixed(1));
    p.set("sales", String(Math.round(parseFloat(salesInput.replace(/,/g, "")) || 0)));
    p.set("period", period);
    p.set("currency", currency);
    p.set("aov", String(aov));
    p.set("device", device);
    if (customOn) p.set("cr", String(customCR));
    p.set("utm_source", "calculator");
    p.set("utm_medium", "share");
    return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
  }, [urlField, currentLoadTime, targetLoadTime, salesInput, period, currency, aov, device, customOn, customCR]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const buildSnapshot = useCallback((): ReportSnapshot => {
    const selectedNames = SPEED_OPTIMIZATIONS.filter((o) => selected.includes(o.id)).map((o) => o.name);
    return {
      toolLabel: "Site Speed Revenue-Loss Calculator",
      headline: `−${f(r.monthlyRevenueLoss)}/month lost to a ${currentLoadTime.toFixed(1)}s load time`,
      metrics: [
        { label: "Revenue lost / month", value: `−${f(r.monthlyRevenueLoss)}`, sub: `−${r.conversionImpactPct.toFixed(1)}% conversion impact` },
        { label: "Projected annual leakage", value: `−${f(r.annualRevenueLoss)}` },
        { label: "Potential revenue / mo", value: f(r.potentialMonthlySales), sub: `at ${targetLoadTime.toFixed(1)}s · +${r.growthPct.toFixed(0)}% upside` },
        { label: "Potential orders / mo", value: n0(r.potentialOrdersCount), sub: `up from ${n0(r.currentOrdersCount)} today` },
      ],
      bullets: selectedNames,
      ctaLabel: "See the Speed Audit",
      ctaHref: `${window.location.origin}${AUDIT_HREF}`,
    };
  }, [r, currentLoadTime, targetLoadTime, selected, f, n0]);

  // Fetch the store's real LCP from Google PageSpeed Insights (via our Netlify
  // Function proxy so the API key stays server-side). Falls back to manual entry.
  const handleAnalyzeUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = urlField.trim();
    if (!u || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisSuccess(null);
    try {
      const res = await fetch(
        `/.netlify/functions/pagespeed?url=${encodeURIComponent(u)}&strategy=${device}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analysis failed.");
      const lcp = clamp(Number(data.lcp), 0.5, 12);
      setCurrentLoadTime(lcp);
      if (lcp < targetLoadTime) setTargetLoadTime(clamp(lcp, 0.5, 5));
      setAnalysisSuccess(
        `Measured LCP ${data.lcp}s (${data.source === "field" ? "real-user data" : "lab"})` +
          (data.fcp ? `, FCP ${data.fcp}s` : "") +
          ". Applied to current load time."
      );
    } catch {
      setAnalysisError(
        "Couldn't measure this URL. Make sure it's public and reachable, or set the speed manually below."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="calc">
      {/* ---------- CONTROLS ---------- */}
      <div className="calc-panel">
        <div className="calc-panel__head">
          <span className="calc-eyebrow">01 · Inputs</span>
          <button type="button" className="calc-reset" onClick={reset}>
            ↺ Reset
          </button>
        </div>

        <form className="calc-urlrow" onSubmit={handleAnalyzeUrl}>
          <label className="calc-label" htmlFor="calc-url">
            Your store URL <span className="calc-soon">auto-fills real LCP</span>
          </label>
          <div className="calc-urlinput">
            <input
              id="calc-url"
              type="text"
              className="calc-input"
              placeholder="example.com"
              value={urlField}
              onChange={(e) => setUrlField(e.target.value)}
              disabled={isAnalyzing}
            />
            <button type="submit" className="calc-fetch" disabled={isAnalyzing || !urlField.trim()}>
              {isAnalyzing ? "Analyzing…" : "Fetch speed"}
            </button>
          </div>
          {analysisError && <p className="calc-hint calc-hint--err">{analysisError}</p>}
          {analysisSuccess && <p className="calc-hint calc-hint--ok">{analysisSuccess}</p>}
        </form>

        <div className="calc-field">
          <span className="calc-label">Device profile</span>
          <div className="calc-toggle">
            <button type="button" className={device === "desktop" ? "is-on" : ""} onClick={() => setDevice("desktop")}>
              Desktop
            </button>
            <button type="button" className={device === "mobile" ? "is-on" : ""} onClick={() => setDevice("mobile")}>
              Mobile
            </button>
          </div>
        </div>

        <div className="calc-field">
          <span className="calc-label calc-label--row">
            The revenue I enter is
            <span className="calc-period">
              <button type="button" className={period === "month" ? "is-on" : ""} onClick={() => setPeriod("month")}>
                monthly
              </button>
              <button type="button" className={period === "year" ? "is-on" : ""} onClick={() => setPeriod("year")}>
                yearly
              </button>
            </span>
          </span>
          <div className="calc-money">
            <select
              className="calc-cur"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Currency"
            >
              {Object.keys(CURRENCIES).map((k) => (
                <option key={k} value={k}>
                  {CURRENCIES[k].symbol} {k}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="numeric"
              className="calc-input"
              value={salesInput}
              onChange={(e) => setSalesInput(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="50000"
            />
          </div>
          <p className="calc-hint">
            {period === "year"
              ? `≈ ${f(monthlySales)}/mo — the model works per month`
              : `≈ ${f(monthlySales * 12)}/yr`}
          </p>
        </div>

        <div className="calc-field">
          <span className="calc-label">Average order value (AOV)</span>
          <div className="calc-money">
            <span className="calc-cur calc-cur--static">{CURRENCIES[currency].symbol}</span>
            <input
              type="text"
              inputMode="decimal"
              className="calc-input"
              value={aovInput}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, "");
                const parts = v.split(".");
                setAovInput(parts[0] + (parts.length > 1 ? "." + parts.slice(1).join("") : ""));
              }}
              placeholder="75"
            />
          </div>
        </div>

        <div className="calc-field">
          <span className="calc-label calc-label--row">
            Current load time (LCP)
            <b className="calc-val calc-val--loss">{currentLoadTime.toFixed(1)}s</b>
          </span>
          <input
            type="range"
            min={0.5}
            max={12}
            step={0.1}
            value={currentLoadTime}
            onChange={(e) => setCurrentLoadTime(parseFloat(e.target.value))}
            className="calc-range calc-range--loss"
          />
          <div className="calc-range__scale">
            <span>0.5s</span>
            <span className={`calc-rating ${rating.cls}`}>{rating.label}</span>
            <span>12s</span>
          </div>
        </div>

        <div className="calc-field">
          <span className="calc-label calc-label--row">
            Target load time (LCP)
            <b className="calc-val calc-val--gain">{targetLoadTime.toFixed(1)}s</b>
          </span>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.1}
            value={targetLoadTime}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setTargetLoadTime(v);
              if (currentLoadTime < v) setCurrentLoadTime(v);
            }}
            className="calc-range calc-range--gain"
          />
          <div className="calc-range__scale">
            <span>0.5s (peak)</span>
            <span>5s (ok)</span>
          </div>
        </div>

        <div className="calc-field calc-field--custom">
          <label className="calc-check">
            <input type="checkbox" checked={customOn} onChange={(e) => setCustomOn(e.target.checked)} />
            Override baseline conversion rate?
          </label>
          {customOn && (
            <div className="calc-custom">
              <div className="calc-money">
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  max={20}
                  className="calc-input"
                  value={customCRInput}
                  onChange={(e) => setCustomCRInput(e.target.value)}
                />
                <span className="calc-cur calc-cur--static">%</span>
              </div>
              <p className="calc-hint">
                We scale the curve proportionally. Baseline for {currentLoadTime.toFixed(1)}s ={" "}
                <b>{r.empiricalCurrentCR}%</b>.
              </p>
            </div>
          )}
        </div>

        <div className="calc-facts">
          {SPEED_FACTS.map((fact) => (
            <p key={fact.source}>
              <b>{fact.stat}</b> {fact.text} <span>— {fact.source}</span>
            </p>
          ))}
        </div>
      </div>

      {/* ---------- RESULTS ---------- */}
      <div className="calc-results">
        <span className="calc-eyebrow">02 · Impact</span>

        <div className="calc-hero-grid">
          <div className="calc-loss">
            <p className="calc-loss__label">Revenue lost / month</p>
            <p className="calc-loss__num">−{f(r.monthlyRevenueLoss)}</p>
            <p className="calc-loss__pct">−{r.conversionImpactPct.toFixed(1)}% conversion impact</p>
          </div>
          <div className="calc-annual">
            <p className="calc-annual__label">Projected annual leakage</p>
            <p className="calc-annual__num">−{f(r.annualRevenueLoss)}</p>
            <p className="calc-annual__sub">▸ recoverable with speed work</p>
          </div>
        </div>

        <div className="calc-metrics">
          <div className="calc-metric">
            <p className="calc-metric__label">Potential revenue / mo</p>
            <p className="calc-metric__num">{f(r.potentialMonthlySales)}</p>
            <p className="calc-metric__sub">at {targetLoadTime.toFixed(1)}s · +{r.growthPct.toFixed(0)}% upside</p>
          </div>
          <div className="calc-metric">
            <p className="calc-metric__label">Potential orders / mo</p>
            <p className="calc-metric__num">{n0(r.potentialOrdersCount)}</p>
            <p className="calc-metric__sub">up from {n0(r.currentOrdersCount)} today</p>
          </div>
        </div>

        <div className="calc-charts" ref={chartsRef}>
          <SpeedCurveChart currentLoadTime={currentLoadTime} targetLoadTime={targetLoadTime} device={device} />
          <RevenueComparisonChart
            currentMonthlySales={monthlySales}
            monthlyRevenueLoss={r.monthlyRevenueLoss}
            targetLoadTime={targetLoadTime}
            currency={currency}
          />
        </div>

        <div className="calc-share">
          <button type="button" className="calc-share__btn" onClick={copyLink}>
            {copied ? "✓ Link copied" : "⎘ Copy shareable link"}
          </button>
          <PdfReportGate
            formName="speed-report-lead"
            buildSnapshot={buildSnapshot}
            getChartEls={() => (chartsRef.current ? Array.from(chartsRef.current.children) : [])}
            filename="commercelead-speed-loss-report.pdf"
          />
          <span className="calc-share__hint">Recreates this exact report for anyone you send it to.</span>
        </div>

        {/* CTA → speed-audit */}
        <div className="calc-cta">
          <div>
            <p className="calc-eyebrow">This number is fixable</p>
            <h3>Turn {f(r.monthlyRevenueLoss)}/mo of lost revenue into a fix plan.</h3>
            <p className="calc-cta__lede">
              Our fixed-price Speed &amp; Core Web Vitals Audit measures every page, quantifies the loss
              with your real traffic, and ranks the fixes by ROI.
            </p>
          </div>
          <a className="calc-cta__btn" href={AUDIT_HREF}>
            See the Speed Audit →
          </a>
        </div>
      </div>

      {/* ---------- CHECKLIST (full width) ---------- */}
      <OptimizationChecklist
        selectedIds={selected}
        onToggle={toggleOpt}
        originalTime={currentLoadTime}
        newTime={r.optimizedLoadTime}
        originalLoss={r.monthlyRevenueLoss}
        newLoss={r.optimizedMonthlyRevenueLoss}
        currency={currency}
      />
    </div>
  );
}

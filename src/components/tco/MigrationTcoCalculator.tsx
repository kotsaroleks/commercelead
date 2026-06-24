import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  PLATFORMS,
  APP_CATALOG,
  getPlatform,
  computePlatform,
  findCrossover,
  buildVerdict,
  CATEGORIES,
  type TcoContext,
} from "./model";
import { CURRENCIES, fmtMoney } from "../calculator/model";
import { TcoStackedChart } from "./TcoStackedChart";
import { CrossoverChart } from "./CrossoverChart";

const CTA_HREF = "/migration-review";
const HORIZONS = [1, 3, 5] as const;
const clampInt = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

export default function MigrationTcoCalculator() {
  const [currentId, setCurrentId] = useState("magento");
  const [targetIds, setTargetIds] = useState<string[]>(["shopify-plus"]);
  const [gmvInput, setGmvInput] = useState("2000000");
  const [growthInput, setGrowthInput] = useState("15");
  const [horizon, setHorizon] = useState<1 | 3 | 5>(3);
  const [pluginsInput, setPluginsInput] = useState("8");
  const [currency, setCurrency] = useState("EUR");
  const [hostingInput, setHostingInput] = useState("550");
  const [retainerInput, setRetainerInput] = useState("3500");
  const [apps, setApps] = useState<string[]>(APP_CATALOG.filter((a) => a.defaultOn).map((a) => a.id));
  const [copied, setCopied] = useState(false);

  // hydrate from URL once
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const from = p.get("from");
    if (from && PLATFORMS.some((x) => x.id === from)) setCurrentId(from);
    const to = p.get("to");
    if (to) {
      const ids = to.split(",").filter((id) => PLATFORMS.some((x) => x.id === id)).slice(0, 3);
      if (ids.length) setTargetIds(ids);
    }
    const gmv = p.get("gmv");
    if (gmv && !isNaN(+gmv)) setGmvInput(String(Math.round(+gmv)));
    const gr = p.get("growth");
    if (gr && !isNaN(+gr)) setGrowthInput(gr);
    const hz = p.get("horizon");
    if (hz === "1" || hz === "3" || hz === "5") setHorizon(+hz as 1 | 3 | 5);
    const pl = p.get("plugins");
    if (pl && !isNaN(+pl)) setPluginsInput(pl);
    const cur = p.get("currency");
    if (cur && CURRENCIES[cur]) setCurrency(cur);
    const ho = p.get("hosting");
    if (ho && !isNaN(+ho)) setHostingInput(ho);
    const re = p.get("retainer");
    if (re && !isNaN(+re)) setRetainerInput(re);
    const ap = p.get("apps");
    if (ap != null) setApps(ap ? ap.split(",").filter((id) => APP_CATALOG.some((a) => a.id === id)) : []);
  }, []);

  const gmv0 = useMemo(() => Math.max(0, parseFloat(gmvInput.replace(/,/g, "")) || 0), [gmvInput]);
  const growthPct = useMemo(() => clampInt(parseFloat(growthInput) || 0, 0, 100), [growthInput]);
  const customPlugins = useMemo(() => clampInt(parseFloat(pluginsInput) || 0, 0, 200), [pluginsInput]);
  const hostingOverride = useMemo(() => (hostingInput.trim() === "" ? null : Math.max(0, +hostingInput || 0)), [hostingInput]);
  const retainerOverride = useMemo(() => (retainerInput.trim() === "" ? null : Math.max(0, +retainerInput || 0)), [retainerInput]);
  const appsMonthly = useMemo(
    () => APP_CATALOG.filter((a) => apps.includes(a.id)).reduce((s, a) => s + a.monthly, 0),
    [apps]
  );

  const ctx: TcoContext = useMemo(
    () => ({ gmv0, growthPct, horizon, customPlugins, appsMonthly, hostingOverride, retainerOverride }),
    [gmv0, growthPct, horizon, customPlugins, appsMonthly, hostingOverride, retainerOverride]
  );

  const currentPlatform = getPlatform(currentId);
  const validTargets = targetIds.filter((id) => id !== currentId);

  const currentResult = useMemo(() => computePlatform(currentPlatform, ctx, true), [currentPlatform, ctx]);
  const targetResults = useMemo(
    () => validTargets.map((id) => computePlatform(getPlatform(id), ctx, false)),
    [validTargets, ctx]
  );
  const allResults = [currentResult, ...targetResults];

  // crossover: current vs the first target of the opposite kind (most insightful)
  const primaryTarget = useMemo(() => {
    const opp = validTargets.map(getPlatform).find((t) => t.kind !== currentPlatform.kind);
    return opp ?? (validTargets.length ? getPlatform(validTargets[0]) : null);
  }, [validTargets, currentPlatform]);

  const crossover = useMemo(
    () => (primaryTarget ? findCrossover(currentPlatform, primaryTarget, ctx) : null),
    [currentPlatform, primaryTarget, ctx]
  );

  const verdict = useMemo(
    () => (targetResults.length ? buildVerdict(currentResult, targetResults) : null),
    [currentResult, targetResults]
  );

  const f = (n: number) => fmtMoney(n, currency);
  const loc = CURRENCIES[currency].locale;
  const n0 = (n: number) => Math.round(n).toLocaleString(loc);

  const toggleTarget = (id: string) => {
    setTargetIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };
  const toggleApp = (id: string) =>
    setApps((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const reset = () => {
    setCurrentId("magento");
    setTargetIds(["shopify-plus"]);
    setGmvInput("2000000");
    setGrowthInput("15");
    setHorizon(3);
    setPluginsInput("8");
    setCurrency("EUR");
    setHostingInput("550");
    setRetainerInput("3500");
    setApps(APP_CATALOG.filter((a) => a.defaultOn).map((a) => a.id));
  };

  const buildShareUrl = useCallback(() => {
    const p = new URLSearchParams();
    p.set("from", currentId);
    p.set("to", validTargets.join(","));
    p.set("gmv", String(Math.round(gmv0)));
    p.set("growth", String(growthPct));
    p.set("horizon", String(horizon));
    p.set("plugins", String(customPlugins));
    p.set("currency", currency);
    if (hostingOverride != null) p.set("hosting", String(hostingOverride));
    if (retainerOverride != null) p.set("retainer", String(retainerOverride));
    p.set("apps", apps.join(","));
    p.set("utm_source", "calculator");
    p.set("utm_medium", "share");
    return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
  }, [currentId, validTargets, gmv0, growthPct, horizon, customPlugins, currency, hostingOverride, retainerOverride, apps]);

  const share = async () => {
    const url = buildShareUrl();
    const text = `${horizon}-year TCO for my store: ${currentPlatform.short} vs ${
      primaryTarget?.short ?? "SaaS"
    }`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Migration TCO", text, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const empty = gmv0 <= 0;
  const noTargets = validTargets.length === 0;

  return (
    <div className="calc tco">
      {/* ---------- CONTROLS ---------- */}
      <div className="calc-panel">
        <div className="calc-panel__head">
          <span className="calc-eyebrow">01 · Your store</span>
          <button type="button" className="calc-reset" onClick={reset}>↺ Reset</button>
        </div>

        <div className="calc-field">
          <span className="calc-label">Current platform</span>
          <div className="tco-platgrid">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`tco-plat ${currentId === p.id ? "is-on" : ""}`}
                style={{ ["--pc" as any]: p.color }}
                onClick={() => {
                  setCurrentId(p.id);
                  setTargetIds((prev) => prev.filter((x) => x !== p.id));
                }}
              >
                <i className="tco-plat__dot" />
                {p.short}
                <span className="tco-plat__kind">{p.kind === "oss" ? "open-source" : "SaaS"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="calc-field">
          <span className="calc-label calc-label--row">
            Compare to <span className="calc-hint" style={{ textTransform: "none" }}>pick up to 3</span>
          </span>
          <div className="tco-platgrid">
            {PLATFORMS.filter((p) => p.id !== currentId).map((p) => (
              <button
                key={p.id}
                type="button"
                className={`tco-plat ${targetIds.includes(p.id) ? "is-on" : ""}`}
                style={{ ["--pc" as any]: p.color }}
                onClick={() => toggleTarget(p.id)}
              >
                <i className="tco-plat__dot" />
                {p.short}
                <span className="tco-plat__kind">{p.kind === "oss" ? "open-source" : "SaaS"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="calc-field">
          <span className="calc-label">Annual GMV / revenue</span>
          <div className="calc-money">
            <select className="calc-cur" value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency">
              {Object.keys(CURRENCIES).map((k) => (
                <option key={k} value={k}>{CURRENCIES[k].symbol} {k}</option>
              ))}
            </select>
            <input
              type="text"
              inputMode="numeric"
              className="calc-input"
              value={gmvInput}
              onChange={(e) => setGmvInput(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="2000000"
            />
          </div>
          <p className="calc-hint">≈ {f(gmv0 / 12)}/mo — the main driver of SaaS transaction fees.</p>
        </div>

        <div className="tco-two">
          <div className="calc-field">
            <span className="calc-label">GMV growth / yr</span>
            <div className="calc-money">
              <input type="text" inputMode="numeric" className="calc-input" value={growthInput} onChange={(e) => setGrowthInput(e.target.value.replace(/[^0-9]/g, ""))} />
              <span className="calc-cur calc-cur--static">%</span>
            </div>
          </div>
          <div className="calc-field">
            <span className="calc-label">Custom plugins</span>
            <input type="text" inputMode="numeric" className="calc-input" value={pluginsInput} onChange={(e) => setPluginsInput(e.target.value.replace(/[^0-9]/g, ""))} />
          </div>
        </div>

        <div className="calc-field">
          <span className="calc-label">Horizon</span>
          <div className="calc-toggle">
            {HORIZONS.map((h) => (
              <button key={h} type="button" className={horizon === h ? "is-on" : ""} onClick={() => setHorizon(h)}>
                {h} {h === 1 ? "year" : "years"}
              </button>
            ))}
          </div>
        </div>

        <div className="tco-two">
          <div className="calc-field">
            <span className="calc-label">Your hosting /mo</span>
            <div className="calc-money">
              <span className="calc-cur calc-cur--static">{CURRENCIES[currency].symbol}</span>
              <input type="text" inputMode="numeric" className="calc-input" value={hostingInput} onChange={(e) => setHostingInput(e.target.value.replace(/[^0-9]/g, ""))} />
            </div>
          </div>
          <div className="calc-field">
            <span className="calc-label">Your retainer /mo</span>
            <div className="calc-money">
              <span className="calc-cur calc-cur--static">{CURRENCIES[currency].symbol}</span>
              <input type="text" inputMode="numeric" className="calc-input" value={retainerInput} onChange={(e) => setRetainerInput(e.target.value.replace(/[^0-9]/g, ""))} />
            </div>
          </div>
        </div>
        <p className="calc-hint">Hosting &amp; retainer apply to open-source platforms (you own the infra).</p>

        <div className="calc-field calc-field--custom">
          <span className="calc-label calc-label--row">
            App subscriptions <span className="calc-val" style={{ fontSize: ".9rem" }}>{f(appsMonthly)}/mo</span>
          </span>
          <p className="calc-hint" style={{ marginBottom: 4 }}>Rented on SaaS; built-in / owned on open-source.</p>
          <div className="tco-apps">
            {APP_CATALOG.map((a) => (
              <button key={a.id} type="button" className={`tco-app ${apps.includes(a.id) ? "is-on" : ""}`} onClick={() => toggleApp(a.id)}>
                <span className="tco-app__box">{apps.includes(a.id) ? "✓" : ""}</span>
                <span className="tco-app__name">{a.name}</span>
                <span className="tco-app__price">{f(a.monthly)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- RESULTS ---------- */}
      <div className="calc-results">
        <span className="calc-eyebrow">02 · 3-year cost of ownership</span>

        {empty || noTargets ? (
          <div className="tco-empty">
            <p>{empty ? "Enter your annual GMV to run the model." : "Pick at least one platform to compare against."}</p>
          </div>
        ) : (
          <>
            {verdict && (
              <div className={`tco-verdict tco-verdict--${verdict.recommend}`}>
                <p className="tco-verdict__label">Verdict · indicative</p>
                <h3>
                  {verdict.recommend === "stay" ? (
                    <>For your profile, <em>staying on {verdict.currentShort}</em> is cheaper over {horizon} years.</>
                  ) : (
                    <>For your profile, <em>migrating to {verdict.bestTargetShort}</em> could be cheaper over {horizon} years.</>
                  )}
                </h3>
                <p className="tco-verdict__delta">
                  {verdict.recommend === "stay"
                    ? `Cheapest alternative (${verdict.bestTargetShort}) costs ${f(verdict.deltaTotal)} more.`
                    : `Estimated ${horizon}-year saving vs ${verdict.currentShort}: ${f(verdict.deltaTotal)}.`}
                </p>
                <ul className="tco-caveats">
                  <li>Excludes payment-processing fees (equal across platforms).</li>
                  <li>Migration is a one-off; SaaS transaction fees compound with GMV growth.</li>
                  <li>Indicative only — custom functionality can change this materially.</li>
                </ul>
              </div>
            )}

            {crossover?.found && (
              <div className="tco-crossover-note">
                <span className="calc-eyebrow" style={{ marginBottom: 6 }}>Crossover</span>
                <p>
                  Below <b>{f(crossover.monthlyGmv)}/mo</b> GMV, <b>{crossover.cheaperBelow}</b> is cheaper.
                  Above it, <b>{crossover.cheaperAbove}</b> wins — transaction fees overtake the savings.
                </p>
              </div>
            )}

            <div className="tco-table-wrap">
              <table className="tco-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    {Array.from({ length: horizon }, (_, i) => <th key={i}>Year {i + 1}</th>)}
                    <th>{horizon}-yr total</th>
                  </tr>
                </thead>
                <tbody>
                  {allResults.map((r) => (
                    <tr key={r.id} className={r.isCurrent ? "is-current" : ""}>
                      <td className="tco-table__plat">
                        <i style={{ background: r.color }} />
                        {r.short}
                        {r.isCurrent && <span className="tco-table__badge">current</span>}
                      </td>
                      {r.yearly.map((y) => <td key={y.year}>{f(y.total)}</td>)}
                      <td className="tco-table__total">{f(r.totalTco)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="calc-charts">
              <TcoStackedChart results={allResults} currency={currency} horizon={horizon} />
              {primaryTarget && crossover && (
                <CrossoverChart current={currentPlatform} target={primaryTarget} ctx={ctx} crossover={crossover} currency={currency} />
              )}
            </div>

            <div className="tco-legend">
              {CATEGORIES.map((c) => (
                <span key={c.key}><i style={{ background: c.color }} />{c.label}</span>
              ))}
            </div>

            <div className="calc-share">
              <button type="button" className="calc-share__btn" onClick={share}>
                {copied ? "✓ Link copied" : "↗ Share this comparison"}
              </button>
              <span className="calc-share__hint">Recreates this exact TCO comparison for anyone you send it to.</span>
            </div>

            <div className="calc-cta">
              <div>
                <p className="calc-eyebrow">This is an estimate</p>
                <h3>Get an exact, independent migration assessment for your store.</h3>
                <p className="calc-cta__lede">
                  We plug in your real hosting, plugins and payment fees, audit what won't port to SaaS,
                  and deliver a {horizon}-year financial-technical verdict. We don't sell platforms — the
                  recommendation is neutral.
                </p>
              </div>
              <a className="calc-cta__btn" href={CTA_HREF}>See the Migration Review →</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

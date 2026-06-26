import React, { useState, useEffect, useMemo, useCallback } from "react";
import { QUESTIONS, CATEGORIES, evaluate, type Status } from "./model";

const SERVICE_HREF = "/evacuation-plan";
const STATUS_CLASS: Record<Status, string> = { green: "is-green", amber: "is-amber", red: "is-red" };

export default function HostageCheck() {
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [copied, setCopied] = useState(false);

  // hydrate from URL (share links land straight on the result)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const a = p.get("a");
    if (a) {
      const parsed = a.split("").map((c) => {
        const n = parseInt(c, 10);
        return isNaN(n) ? null : n;
      });
      if (parsed.length === QUESTIONS.length) {
        // validate each index against its question's options
        const valid = parsed.map((v, i) => (v != null && QUESTIONS[i].options[v] ? v : null));
        if (valid.every((v) => v != null)) {
          setAnswers(valid);
          setFinished(true);
        }
      }
    }
  }, []);

  const result = useMemo(() => evaluate(answers), [answers]);

  // Publish the result so the on-page contact form can submit it to Netlify.
  useEffect(() => {
    if (!finished) return;
    const detail = {
      score: result.score,
      tier: result.bandLabel,
      gaps: result.topRisks.map((r) => r.asset).join(", "),
    };
    (window as any).__quizResult = detail;
    try {
      localStorage.setItem("cl_quiz_result", JSON.stringify({ ...detail, source: "hostage-check", ts: Date.now() }));
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new CustomEvent("quizresult", { detail }));
  }, [finished, result]);

  const answer = (optionIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = optionIndex;
      return next;
    });
    // auto-advance
    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep((s) => Math.min(QUESTIONS.length - 1, s + 1)), 140);
    } else {
      setTimeout(() => setFinished(true), 160);
    }
  };

  const restart = () => {
    setAnswers(QUESTIONS.map(() => null));
    setStep(0);
    setFinished(false);
  };

  const buildShareUrl = useCallback(() => {
    const code = answers.map((a) => (a == null ? 0 : a)).join("");
    const p = new URLSearchParams();
    p.set("a", code);
    p.set("utm_source", "hostage-check");
    p.set("utm_medium", "share");
    return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
  }, [answers]);

  const share = async () => {
    const url = buildShareUrl();
    const text = `My agency-dependency risk score is ${result.score}/100. Check yours:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Are you a hostage to your agency?", text, url });
        return;
      } catch {
        /* cancelled — fall through */
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

  const q = QUESTIONS[step];
  const progress = Math.round(((step + (finished ? 1 : 0)) / QUESTIONS.length) * 100);
  const catLabel = CATEGORIES.find((c) => c.key === q?.category)?.label ?? "";

  if (!finished) {
    return (
      <div className="hc">
        <div className="hc-quiz">
          <div className="hc-progress">
            <div className="hc-progress__bar"><span style={{ width: `${(step / QUESTIONS.length) * 100}%` }} /></div>
            <span className="hc-progress__txt">
              Question {step + 1} / {QUESTIONS.length}
            </span>
          </div>

          <p className="hc-cat">{catLabel}</p>
          <h2 className="hc-q">{q.text}</h2>

          <div className="hc-opts">
            {q.options.map((o, i) => (
              <button
                key={i}
                type="button"
                className={`hc-opt ${answers[step] === i ? "is-sel" : ""}`}
                onClick={() => answer(i)}
              >
                <span className="hc-opt__mark" />
                {o.label}
              </button>
            ))}
          </div>

          <div className="hc-nav">
            <button type="button" className="hc-back" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              ← Back
            </button>
            <span className="hc-nav__hint">“Don't know” counts as a risk — not knowing is the danger.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hc">
      <div className="hc-result">
        {/* score */}
        <div className={`hc-score ${STATUS_CLASS[result.status]}`}>
          <div className="hc-score__num">
            <span>{result.score}</span>
            <small>/100</small>
          </div>
          <div className="hc-score__meta">
            <p className="hc-score__eyebrow">Hostage Risk Score</p>
            <h2>{result.bandLabel}</h2>
            <p className="hc-score__sub">
              Based on {result.answered} answers across {CATEGORIES.length} categories. “Don't know” is treated as risk.
            </p>
          </div>
        </div>

        {/* category breakdown */}
        <div className="hc-cats">
          <p className="calc-eyebrow">Where you stand</p>
          <div className="hc-cats__grid">
            {result.categories.map((c) => (
              <div key={c.key} className="hc-catrow">
                <span className="hc-catrow__label">{c.label}</span>
                <div className="hc-catrow__bar">
                  <span className={STATUS_CLASS[c.status]} style={{ width: `${Math.max(4, c.pct)}%` }} />
                </div>
                <span className={`hc-badge ${STATUS_CLASS[c.status]}`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* top risks */}
        {result.topRisks.length > 0 && (
          <div className="hc-risks">
            <p className="calc-eyebrow">Your top {result.topRisks.length} gaps</p>
            <div className="hc-risks__list">
              {result.topRisks.map((r, i) => (
                <div key={i} className={`hc-risk ${STATUS_CLASS[r.status]}`}>
                  <span className="hc-risk__n">{i + 1}</span>
                  <div>
                    <h3>{r.asset}</h3>
                    <p>{r.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* share + restart */}
        <div className="calc-share">
          <button type="button" className="calc-share__btn" onClick={share}>
            {copied ? "✓ Link copied" : "↗ Share my result"}
          </button>
          <button type="button" className="hc-restart" onClick={restart}>↺ Retake</button>
        </div>

        {/* CTA */}
        <div className="calc-cta hc-cta">
          <div>
            <p className="calc-eyebrow">Close these gaps</p>
            <h3>Get your Evacuation Plan — €350, fixed price.</h3>
            <p className="calc-cta__lede">
              We take an independent backup, audit every access and ownership, and hand you an emergency
              “go-bag”: your code, a restore-tested backup, and a runbook — so you can leave your agency
              without fear. We only ever recover what's <em>yours</em>.
            </p>
          </div>
          <div className="hc-cta__actions">
            <a className="calc-cta__btn" href={SERVICE_HREF}>Get the Evacuation Plan →</a>
            <a className="hc-cta__alt" href={`${SERVICE_HREF}#contact`}>or book a free 20-min call</a>
          </div>
        </div>
      </div>
    </div>
  );
}

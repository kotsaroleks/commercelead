import React, { useState, useEffect, useMemo, useCallback } from "react";
import { QUESTIONS, DIMENSIONS, evaluate, type Tier } from "./model";

const TIER_CLASS: Record<Tier, string> = {
  red: "is-red",
  amber: "is-amber",
  green: "is-green",
  native: "is-native",
};

export default function AiReadiness() {
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const a = p.get("a");
    if (a && a.length === QUESTIONS.length) {
      const parsed = a.split("").map((c, i) => {
        const n = parseInt(c, 10);
        return !isNaN(n) && QUESTIONS[i].options[n] ? n : null;
      });
      if (parsed.every((v) => v != null)) {
        setAnswers(parsed);
        setFinished(true);
      }
    }
  }, []);

  const result = useMemo(() => evaluate(answers), [answers]);

  // Publish the result so the on-page contact form can submit it to Netlify.
  useEffect(() => {
    if (!finished) return;
    const detail = {
      score: result.score,
      tier: result.tierLabel,
      gaps: result.priorities.map((p) => p.label).join(", "),
    };
    (window as any).__quizResult = detail;
    try {
      localStorage.setItem("cl_quiz_result", JSON.stringify({ ...detail, source: "ai-readiness", ts: Date.now() }));
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
    p.set("utm_source", "ai-readiness");
    p.set("utm_medium", "share");
    return `${window.location.origin}${window.location.pathname}?${p.toString()}#score`;
  }, [answers]);

  const share = async () => {
    const url = buildShareUrl();
    const text = `My store's AI Readiness Score is ${result.score}/100 — ${result.tierLabel}. Check yours:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "AI Readiness Score", text, url });
        return;
      } catch {
        /* cancelled */
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
  const dimLabel = DIMENSIONS.find((d) => d.key === q?.dimension)?.label ?? "";

  if (!finished) {
    return (
      <div className="hc air">
        <div className="hc-quiz">
          <div className="hc-progress">
            <div className="hc-progress__bar"><span style={{ width: `${(step / QUESTIONS.length) * 100}%` }} /></div>
            <span className="hc-progress__txt">Question {step + 1} / {QUESTIONS.length}</span>
          </div>

          <p className="hc-cat">{dimLabel}</p>
          <h2 className="hc-q">{q.text}</h2>

          <div className="hc-opts">
            {q.options.map((o, i) => (
              <button key={i} type="button" className={`hc-opt ${answers[step] === i ? "is-sel" : ""}`} onClick={() => answer(i)}>
                <span className="hc-opt__mark" />
                {o.label}
              </button>
            ))}
          </div>

          <div className="hc-nav">
            <button type="button" className="hc-back" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              ← Back
            </button>
            <span className="hc-nav__hint">6 dimensions · ~2 minutes · instant score</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hc air">
      <div className="hc-result">
        <div className={`hc-score ${TIER_CLASS[result.tier]}`}>
          <div className="hc-score__num">
            <span>{result.score}</span>
            <small>/100</small>
          </div>
          <div className="hc-score__meta">
            <p className="hc-score__eyebrow">AI Readiness Score</p>
            <h2>{result.tierLabel}</h2>
            <p className="hc-score__sub">{result.tierIntro}</p>
          </div>
        </div>

        <div className="hc-cats">
          <p className="calc-eyebrow">Your 6 dimensions</p>
          <div className="hc-cats__grid">
            {result.dimensions.map((d) => (
              <div key={d.key} className="hc-catrow">
                <span className="hc-catrow__label">{d.label}</span>
                <div className="hc-catrow__bar">
                  <span className={TIER_CLASS[d.tier]} style={{ width: `${Math.max(4, d.pct)}%` }} />
                </div>
                <span className={`hc-badge ${TIER_CLASS[d.tier]}`}>{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {result.priorities.length > 0 && (
          <div className="hc-risks">
            <p className="calc-eyebrow">Fix these first</p>
            <div className="hc-risks__list">
              {result.priorities.map((d, i) => (
                <div key={d.key} className={`hc-risk ${TIER_CLASS[d.tier]}`}>
                  <span className="hc-risk__n">{i + 1}</span>
                  <div>
                    <h3>{d.label} <span className="air-prio-pct">{d.pct}%</span></h3>
                    <p>{d.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="calc-share">
          <button type="button" className="calc-share__btn" onClick={share}>
            {copied ? "✓ Link copied" : "↗ Share my score"}
          </button>
          <button type="button" className="hc-restart" onClick={restart}>↺ Retake</button>
        </div>

        <div className="calc-cta hc-cta">
          <div>
            <p className="calc-eyebrow">Turn the score into a plan</p>
            <h3>Get your AI Readiness Audit — €650, fixed price.</h3>
            <p className="calc-cta__lede">
              A senior, vendor-neutral assessment across all six dimensions: prioritised findings by
              impact and effort, a scored report, and a 60-minute debrief. Credited in full toward your
              AI Roadmap if you continue.
            </p>
          </div>
          <div className="hc-cta__actions">
            <a className="calc-cta__btn" href="#contact">Order the AI Audit →</a>
            <a className="hc-cta__alt" href="#contact">or book a free 20-min call</a>
          </div>
        </div>
      </div>
    </div>
  );
}

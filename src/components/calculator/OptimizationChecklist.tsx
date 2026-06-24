import React from "react";
import { SPEED_OPTIMIZATIONS, fmtMoney } from "./model";

interface Props {
  selectedIds: string[];
  onToggle: (id: string) => void;
  originalTime: number;
  newTime: number;
  originalLoss: number;
  newLoss: number;
  currency: string;
}

export const OptimizationChecklist: React.FC<Props> = ({
  selectedIds,
  onToggle,
  originalTime,
  newTime,
  originalLoss,
  newLoss,
  currency,
}) => {
  const recovered = Math.max(0, originalLoss - newLoss);
  const secondsSaved = Math.max(0, originalTime - newTime);

  return (
    <div className="calc-checklist">
      <div className="calc-checklist__head">
        <p className="calc-eyebrow">Bridge to a fix</p>
        <h3>What could you recover?</h3>
        <p className="calc-checklist__lede">
          Tick the optimisations you could apply. We subtract their estimated LCP saving and recompute
          the recoverable revenue.
        </p>
      </div>

      <div className="calc-checklist__grid">
        <div className="calc-checklist__items">
          {SPEED_OPTIMIZATIONS.map((opt) => {
            const on = selectedIds.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                className={`calc-opt${on ? " is-on" : ""}`}
                onClick={() => onToggle(opt.id)}
                aria-pressed={on}
              >
                <span className="calc-opt__box" aria-hidden="true">
                  {on ? "✓" : ""}
                </span>
                <span className="calc-opt__text">
                  <span className="calc-opt__name">{opt.name}</span>
                  <span className="calc-opt__desc">{opt.description}</span>
                </span>
                <span className="calc-opt__impact">−{opt.impact.toFixed(1)}s</span>
              </button>
            );
          })}
        </div>

        <aside className="calc-checklist__summary">
          <div className="calc-sum-row">
            <span>Projected LCP</span>
            <b>{newTime.toFixed(1)}s</b>
          </div>
          <div className="calc-sum-row">
            <span>Speed regained</span>
            <b>−{secondsSaved.toFixed(1)}s</b>
          </div>
          <div className="calc-sum-row calc-sum-row--hero">
            <span>Revenue recovered / mo</span>
            <b>{fmtMoney(recovered, currency)}</b>
          </div>
          <p className="calc-sum-note">
            That's the slice of the monthly loss these fixes would claw back — before touching the rest.
          </p>
        </aside>
      </div>
    </div>
  );
};

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { computePlatform, type PlatformAssumptions, type TcoContext, type Crossover } from "./model";
import { fmtMoney } from "../calculator/model";

interface Props {
  current: PlatformAssumptions;
  target: PlatformAssumptions;
  ctx: TcoContext;
  crossover: Crossover;
  currency: string;
}

const compact = (n: number, currency: string) => {
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}k`;
  return `${sym}${Math.round(n)}`;
};

export function CrossoverChart({ current, target, ctx, crossover, currency }: Props) {
  const data = useMemo(() => {
    const min = 50_000;
    const max = Math.max(ctx.gmv0 * 2.5, crossover.found ? crossover.annualGmv * 1.8 : 6_000_000);
    const steps = 40;
    const rows = [];
    for (let i = 0; i <= steps; i++) {
      const gmv = min + ((max - min) * i) / steps;
      rows.push({
        gmv,
        monthly: gmv / 12,
        current: Math.round(computePlatform(current, { ...ctx, gmv0: gmv }, true).totalTco),
        target: Math.round(computePlatform(target, { ...ctx, gmv0: gmv }, false).totalTco),
      });
    }
    return rows;
  }, [current, target, ctx, crossover]);

  const Tip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const monthly = payload[0]?.payload?.monthly;
    return (
      <div className="calc-tip">
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{compact(monthly, currency)}/mo GMV</p>
        {payload.map((p: any) => (
          <p key={p.dataKey}>
            <span style={{ color: p.color }}>■</span> {p.dataKey === "current" ? current.short : target.short}:{" "}
            {fmtMoney(p.value, currency)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="calc-chart tco-chart--tall">
      <div className="calc-chart__head">
        <div>
          <h4>Crossover: TCO vs GMV</h4>
          <p>Where the two platforms cost the same.</p>
        </div>
        <div className="calc-chart__legend">
          <span><i style={{ background: current.color }} />{current.short}</span>
          <span><i style={{ background: target.color }} />{target.short}</span>
        </div>
      </div>
      <div className="calc-chart__body">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#E3E6E5" vertical={false} />
            <XAxis
              dataKey="monthly"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => compact(v, currency)}
              tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }}
            />
            <YAxis tickFormatter={(v) => compact(v, currency)} tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} width={48} />
            <Tooltip content={<Tip />} />
            {crossover.found && (
              <ReferenceLine
                x={crossover.monthlyGmv}
                stroke="#14181D"
                strokeDasharray="4 3"
                label={{ value: "crossover", position: "top", fontSize: 10, fontFamily: "IBM Plex Mono", fill: "#14181D" }}
              />
            )}
            <ReferenceLine x={ctx.gmv0 / 12} stroke="#F59E0B" strokeWidth={2} label={{ value: "you", position: "insideTopRight", fontSize: 10, fontFamily: "IBM Plex Mono", fill: "#B45309" }} />
            <Line type="monotone" dataKey="current" stroke={current.color} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="target" stroke={target.color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

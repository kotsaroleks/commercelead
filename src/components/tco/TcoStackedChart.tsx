import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CATEGORIES, type PlatformResult } from "./model";
import { fmtMoney } from "../calculator/model";

interface Props {
  results: PlatformResult[];
  currency: string;
  horizon: number;
}

const compact = (n: number, currency: string) => {
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : "€";
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}k`;
  return `${sym}${Math.round(n)}`;
};

export function TcoStackedChart({ results, currency, horizon }: Props) {
  const data = results.map((r) => {
    const row: Record<string, number | string> = { name: r.short };
    for (const c of CATEGORIES) row[c.key] = Math.round(r.breakdown[c.key]);
    return row;
  });

  const Tip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
    return (
      <div className="calc-tip">
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
        {payload
          .filter((p: any) => p.value > 0)
          .reverse()
          .map((p: any) => (
            <p key={p.dataKey}>
              <span style={{ color: p.color }}>■</span> {CATEGORIES.find((c) => c.key === p.dataKey)?.label}:{" "}
              {fmtMoney(p.value, currency)}
            </p>
          ))}
        <p style={{ marginTop: 4, fontWeight: 600 }}>Total: {fmtMoney(total, currency)}</p>
      </div>
    );
  };

  return (
    <div className="calc-chart tco-chart--tall">
      <div className="calc-chart__head">
        <div>
          <h4>{horizon}-year TCO by platform</h4>
          <p>Where the money goes — transaction fees in red.</p>
        </div>
      </div>
      <div className="calc-chart__body">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#E3E6E5" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} />
            <YAxis tickFormatter={(v) => compact(v, currency)} tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }} width={48} />
            <Tooltip content={<Tip />} cursor={{ fill: "rgba(0,0,0,.03)" }} />
            {CATEGORIES.map((c) => (
              <Bar key={c.key} dataKey={c.key} stackId="a" fill={c.color} maxBarSize={84} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

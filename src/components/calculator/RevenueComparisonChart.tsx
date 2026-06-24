import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CURRENCIES } from "./model";

interface Props {
  currentMonthlySales: number;
  monthlyRevenueLoss: number;
  targetLoadTime: number;
  currency: string;
}

const REALIZED = "#14181D";
const LOSS = "#DC2626";

export const RevenueComparisonChart: React.FC<Props> = ({
  currentMonthlySales,
  monthlyRevenueLoss,
  targetLoadTime,
  currency,
}) => {
  const c = CURRENCIES[currency] ?? CURRENCIES.EUR;
  const data = [
    { name: "Current", "Realized revenue": currentMonthlySales, "Speed penalty": 0 },
    { name: `Optimised (${targetLoadTime}s)`, "Realized revenue": currentMonthlySales, "Speed penalty": monthlyRevenueLoss },
  ];

  const fmtAxis = (val: number) => {
    if (val >= 1_000_000) return `${c.symbol}${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1000) return `${c.symbol}${(val / 1000).toFixed(0)}K`;
    return `${c.symbol}${val}`;
  };

  return (
    <div className="calc-chart">
      <div className="calc-chart__head">
        <div>
          <h4>Monthly revenue you could unlock</h4>
          <p>Realized sales vs the recoverable speed penalty</p>
        </div>
      </div>
      <div className="calc-chart__body">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E6E4" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#5B6670", fontFamily: "IBM Plex Mono, monospace" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#5B6670", fontFamily: "IBM Plex Mono, monospace" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtAxis}
            />
            <Tooltip
              cursor={{ fill: "rgba(20,24,29,.04)" }}
              formatter={(value: number, name: string) => {
                if (value === 0) return null as unknown as [string, string];
                return [`${c.symbol}${Math.round(value).toLocaleString(c.locale)}`, name];
              }}
              contentStyle={{
                backgroundColor: "rgba(255,255,255,.97)",
                borderRadius: 0,
                border: "1px solid #D8DDDB",
                fontSize: "11px",
                fontFamily: "IBM Plex Mono, monospace",
              }}
            />
            <Bar dataKey="Realized revenue" stackId="a" fill={REALIZED} maxBarSize={64} />
            <Bar dataKey="Speed penalty" stackId="a" fill={LOSS} maxBarSize={64} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

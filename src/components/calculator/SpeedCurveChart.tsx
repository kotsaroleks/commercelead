import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  CartesianGrid,
} from "recharts";
import { getConversionRate, type Device } from "./model";

interface Props {
  currentLoadTime: number;
  targetLoadTime: number;
  device: Device;
}

const PERF = "#B45309";
const LOSS = "#DC2626";
const GAIN = "#0CA678";

export const SpeedCurveChart: React.FC<Props> = ({ currentLoadTime, targetLoadTime, device }) => {
  const chartData = useMemo(() => {
    const points: { loadTime: number; conversionRate: number }[] = [];
    for (let t = 0.5; t <= 10.0; t += 0.25) {
      points.push({ loadTime: Number(t.toFixed(2)), conversionRate: getConversionRate(t, device) });
    }
    if (currentLoadTime > 0.5 && currentLoadTime < 10.0) {
      points.push({
        loadTime: Number(currentLoadTime.toFixed(2)),
        conversionRate: getConversionRate(currentLoadTime, device),
      });
    }
    if (targetLoadTime > 0.5 && targetLoadTime < 10.0) {
      points.push({
        loadTime: Number(targetLoadTime.toFixed(2)),
        conversionRate: getConversionRate(targetLoadTime, device),
      });
    }
    return points.sort((a, b) => a.loadTime - b.loadTime);
  }, [device, currentLoadTime, targetLoadTime]);

  const currentConvRate = getConversionRate(currentLoadTime, device);
  const targetConvRate = getConversionRate(targetLoadTime, device);
  const maxConvRate = device === "desktop" ? 3.05 : 1.5;

  return (
    <div className="calc-chart">
      <div className="calc-chart__head">
        <div>
          <h4>Conversion-rate decay curve</h4>
          <p>Empirical Portent data for {device} sessions</p>
        </div>
        <div className="calc-chart__legend">
          <span>
            <i style={{ background: LOSS }} />Current {currentLoadTime}s
          </span>
          <span>
            <i style={{ background: GAIN }} />Target {targetLoadTime}s
          </span>
        </div>
      </div>
      <div className="calc-chart__body">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PERF} stopOpacity={0.22} />
                <stop offset="95%" stopColor={PERF} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E6E4" />
            <XAxis
              dataKey="loadTime"
              type="number"
              domain={[0.5, 10.0]}
              tickCount={10}
              tick={{ fontSize: 10, fill: "#5B6670", fontFamily: "IBM Plex Mono, monospace" }}
              tickLine={false}
              axisLine={false}
              unit="s"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#5B6670", fontFamily: "IBM Plex Mono, monospace" }}
              tickLine={false}
              axisLine={false}
              unit="%"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as { loadTime: number; conversionRate: number };
                  const drop = ((maxConvRate - d.conversionRate) / maxConvRate) * 100;
                  return (
                    <div className="calc-tip">
                      <p>
                        Load time: <b>{d.loadTime}s</b>
                      </p>
                      <p>
                        Conversion: <b>{d.conversionRate}%</b>
                      </p>
                      {drop > 0 && <p className="calc-tip__drop">−{drop.toFixed(0)}% from peak</p>}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="conversionRate"
              stroke={PERF}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#curveFill)"
            />
            <ReferenceDot x={currentLoadTime} y={currentConvRate} r={6} fill={LOSS} stroke="#fff" strokeWidth={2} isFront />
            <ReferenceDot x={targetLoadTime} y={targetConvRate} r={6} fill={GAIN} stroke="#fff" strokeWidth={2} isFront />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

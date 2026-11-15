/**
 * TrendChart — SVG line chart of recent readings against the clinical bands.
 *
 * Uses only the shared threshold source, so the shaded bands always match the
 * interpretation engine.
 */

import type { Metric, VitalReading } from "@/types/schema";
import { THRESHOLDS, getWatchBounds } from "@/lib/thresholds";
import { rateOfChange, trendDirection } from "@/lib/engine/trends";

type TrendChartProps = {
  readings: VitalReading[];
  metric: Metric;
  className?: string;
};

const WIDTH = 320;
const HEIGHT = 150;
const PADDING_X = 12;
const PADDING_Y = 12;

const STATUS_HEX = {
  GREEN: "#059669",
  YELLOW: "#d97706",
  RED: "#dc2626",
} as const;

export function TrendChart({
  readings,
  metric,
  className = "",
}: TrendChartProps) {
  const range = THRESHOLDS[metric];
  const { lowWatch, highWatch } = getWatchBounds(metric);
  const series = readings
    .filter((reading) => reading.metric === metric)
    .sort((a, b) => a.recordedAt - b.recordedAt)
    .slice(-24);

  const values = series.map((reading) => reading.value);
  const dataMin = values.length > 0 ? Math.min(...values) : range.min;
  const dataMax = values.length > 0 ? Math.max(...values) : range.max;

  let yMin = Math.min(dataMin, lowWatch);
  let yMax = Math.max(dataMax, highWatch);
  const rawSpan = yMax - yMin || 1;
  yMin -= rawSpan * 0.1;
  yMax += rawSpan * 0.1;
  const span = yMax - yMin || 1;

  const scaleY = (value: number) =>
    PADDING_Y + (1 - (value - yMin) / span) * (HEIGHT - PADDING_Y * 2);
  const scaleX = (index: number) =>
    series.length <= 1
      ? WIDTH / 2
      : PADDING_X + (index / (series.length - 1)) * (WIDTH - PADDING_X * 2);

  const linePath = series
    .map((reading, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${scaleX(index).toFixed(1)},${scaleY(reading.value).toFixed(1)}`;
    })
    .join(" ");

  const latest = series[series.length - 1];
  const trend = trendDirection(rateOfChange(series, 10), metric);
  const trendLabel =
    trend.charAt(0).toUpperCase() + trend.slice(1);

  const band = (top: number, bottom: number, fill: string, opacity: number) => (
    <rect
      x={0}
      y={scaleY(top)}
      width={WIDTH}
      height={Math.max(0, scaleY(bottom) - scaleY(top))}
      fill={fill}
      opacity={opacity}
    />
  );

  return (
    <figure className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{range.label}</span>
        <span className="text-xs text-muted-foreground">
          {series.length} reading{series.length === 1 ? "" : "s"} · {trendLabel}
        </span>
      </figcaption>

      <svg
        className="mt-3 w-full"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${range.label} trend. Normal range ${range.min} to ${range.max} ${range.unit}. ${series.length} readings. Trend ${trend}.`}
      >
        {band(yMax, highWatch, STATUS_HEX.RED, 0.12)}
        {band(highWatch, range.max, STATUS_HEX.YELLOW, 0.14)}
        {band(range.max, range.min, STATUS_HEX.GREEN, 0.12)}
        {band(range.min, lowWatch, STATUS_HEX.YELLOW, 0.14)}
        {band(lowWatch, yMin, STATUS_HEX.RED, 0.12)}

        <line
          x1={0}
          x2={WIDTH}
          y1={scaleY(range.min)}
          y2={scaleY(range.min)}
          stroke={STATUS_HEX.GREEN}
          strokeDasharray="4 4"
          strokeWidth={0.75}
        />
        <line
          x1={0}
          x2={WIDTH}
          y1={scaleY(range.max)}
          y2={scaleY(range.max)}
          stroke={STATUS_HEX.GREEN}
          strokeDasharray="4 4"
          strokeWidth={0.75}
        />

        {series.length > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {latest && (
          <circle
            cx={scaleX(series.length - 1)}
            cy={scaleY(latest.value)}
            r={3.5}
            fill={STATUS_HEX.GREEN}
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        )}
      </svg>

      {series.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No readings yet for this metric.
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Normal {range.min}–{range.max} {range.unit}
          {latest
            ? ` · latest ${latest.value.toFixed(range.decimals)} ${range.unit}`
            : ""}
        </p>
      )}
    </figure>
  );
}

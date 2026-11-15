/**
 * VitalCard — one reading with value, status and a small trend line.
 */

import type { VitalReading } from "@/types/schema";
import { interpretReading } from "@/lib/engine/interpret";
import { THRESHOLDS, formatMetricValue } from "@/lib/thresholds";
import { StatusPill } from "./StatusPill";

type VitalCardProps = {
  reading: VitalReading;
  history?: VitalReading[];
  showSparkline?: boolean;
  className?: string;
};

export function VitalCard({
  reading,
  history = [],
  showSparkline = true,
  className = "",
}: VitalCardProps) {
  const interpretation =
    reading.interpretation ??
    interpretReading(reading, history.filter((item) => item.id !== reading.id));
  const range = THRESHOLDS[reading.metric];

  const series = history
    .filter((item) => item.metric === reading.metric)
    .sort((a, b) => a.recordedAt - b.recordedAt)
    .slice(-12)
    .map((item) => item.value);

  if (series.length === 0) series.push(reading.value);

  const min = Math.min(...series, range.min);
  const max = Math.max(...series, range.max);
  const span = max - min || 1;
  const points = series
    .map((value, index) => {
      const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
      const y = 22 - ((value - min) / span) * 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <article
      className={`bg-card border border-border rounded-xl p-4 ${className}`}
      aria-label={`${range.label}: ${formatMetricValue(reading.metric, reading.value)}. ${interpretation.reason}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          {range.label}
        </h3>
        <span className="text-xl font-bold tabular-nums">
          {formatMetricValue(reading.metric, reading.value)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <StatusPill interpretation={interpretation} size="sm" />
        <span className="text-xs text-muted-foreground">
          {interpretation.recordedAt}
        </span>
      </div>

      {showSparkline && (
        <svg
          className="mt-3 h-6 w-full text-muted-foreground"
          viewBox="0 0 100 24"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Trend for ${range.label}`}
        >
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      <p className="mt-2 text-xs text-muted-foreground">{interpretation.guidance}</p>
    </article>
  );
}

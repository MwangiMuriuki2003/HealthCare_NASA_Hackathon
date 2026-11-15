/**
 * BodyMap — clickable anatomy view coloured by the latest metric status.
 *
 * Regions are keyboard-operable buttons and every status is also written out
 * in text below the diagram, so colour is never the only signal.
 */

import { Metric, type VitalStatus } from "@/types/schema";
import { THRESHOLDS } from "@/lib/thresholds";

type BodyMapProps = {
  statuses: Record<Metric, VitalStatus | null>;
  onMetricClick?: (metric: Metric) => void;
  className?: string;
};

type Region = {
  metric: Metric;
  x: number;
  y: number;
  r: number;
  label: string;
};

const REGIONS: Region[] = [
  { metric: Metric.BODY_TEMPERATURE, x: 60, y: 18, r: 11, label: "Temperature" },
  { metric: Metric.HEART_RATE, x: 60, y: 74, r: 13, label: "Heart" },
  { metric: Metric.BLOOD_PRESSURE_SYSTOLIC, x: 38, y: 66, r: 10, label: "Systolic" },
  { metric: Metric.BLOOD_PRESSURE_DIASTOLIC, x: 82, y: 66, r: 10, label: "Diastolic" },
  { metric: Metric.BLOOD_GLUCOSE, x: 60, y: 108, r: 12, label: "Glucose" },
  { metric: Metric.SLEEP_DURATION, x: 60, y: 148, r: 10, label: "Recovery" },
];

const STATUS_COLOURS: Record<VitalStatus, string> = {
  GREEN: "#10b981",
  YELLOW: "#f59e0b",
  RED: "#ef4444",
};

const STATUS_LABELS: Record<VitalStatus | "NONE", string> = {
  GREEN: "Nominal",
  YELLOW: "Watch",
  RED: "Critical",
  NONE: "No reading",
};

export function BodyMap({
  statuses,
  onMetricClick,
  className = "",
}: BodyMapProps) {
  return (
    <section
      className={`rounded-xl border border-border bg-card p-4 ${className}`}
      aria-labelledby="body-map-title"
    >
      <h2 id="body-map-title" className="text-sm font-medium">
        Body Map
      </h2>

      <svg
        className="mx-auto mt-2 h-56 w-full max-w-[220px]"
        viewBox="0 0 120 180"
        role="group"
        aria-label="Body regions linked to vital metrics"
      >
        <circle cx="60" cy="18" r="13" fill="#e2e8f0" />
        <path
          d="M47 33 Q60 40 73 33 L78 54 L72 58 L72 96 L48 96 L48 58 L42 54 Z"
          fill="#e2e8f0"
        />
        <path d="M46 96 L42 150 L52 150 L58 108 L62 108 L68 150 L78 150 L74 96 Z" fill="#e2e8f0" />
        <path d="M42 56 L26 92 L33 96 L46 66" fill="#e2e8f0" />
        <path d="M78 56 L94 92 L87 96 L74 66" fill="#e2e8f0" />

        {REGIONS.map((region) => {
          const status = statuses[region.metric];
          const colour = status ? STATUS_COLOURS[status] : "#94a3b8";

          return (
            <g
              key={region.metric}
              role="button"
              tabIndex={0}
              aria-label={`${region.label}: ${status ? STATUS_LABELS[status] : STATUS_LABELS.NONE}. Open ${THRESHOLDS[region.metric].label}.`}
              className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => onMetricClick?.(region.metric)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onMetricClick?.(region.metric);
                }
              }}
            >
              <circle
                cx={region.x}
                cy={region.y}
                r={region.r}
                fill={colour}
                opacity={status ? 0.75 : 0.25}
                stroke={colour}
                strokeWidth={2}
              />
              <text
                x={region.x}
                y={region.y + 3}
                textAnchor="middle"
                fontSize="7"
                fill="#0f172a"
                pointerEvents="none"
              >
                {THRESHOLDS[region.metric].shortLabel}
              </text>
            </g>
          );
        })}
      </svg>

      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {REGIONS.map((region) => {
          const status = statuses[region.metric];
          return (
            <li key={region.metric} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{region.label}</span>
              <span className="font-medium">
                {status ? STATUS_LABELS[status] : STATUS_LABELS.NONE}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * StatusPill — WCAG-accessible status indicator.
 *
 * Status is communicated with text and an icon, not colour alone.
 */

import type { Interpretation } from "@/types/schema";
import { STATUS_COLORS } from "@/theme/status";

type StatusPillProps = {
  interpretation: Pick<
    Interpretation,
    "status" | "trend" | "metricLabel" | "reason" | "guidance"
  >;
  size?: "sm" | "md" | "lg";
  showTrend?: boolean;
};

const SIZE_STYLES = {
  sm: "min-h-6 px-2 py-1 text-xs",
  md: "min-h-8 px-3 py-1.5 text-sm",
  lg: "min-h-10 px-4 py-2 text-base",
} as const;

const TREND_ICONS = {
  improving: "↑",
  stable: "→",
  declining: "↓",
} as const;

const TREND_TEXT = {
  improving: "improving",
  stable: "stable",
  declining: "declining",
} as const;

const STATUS_LABELS = {
  GREEN: "Nominal",
  YELLOW: "Watch",
  RED: "Critical",
} as const;

export function StatusPill({
  interpretation,
  size = "md",
  showTrend = true,
}: StatusPillProps) {
  const colours = STATUS_COLORS[interpretation.status];
  const statusLabel = STATUS_LABELS[interpretation.status];

  return (
    <span
      role="status"
      aria-label={`${interpretation.metricLabel}: ${statusLabel}. ${interpretation.reason} ${interpretation.guidance}`}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${SIZE_STYLES[size]} ${colours.bg} ${colours.text} ${colours.border}`}
    >
      <span aria-hidden="true">
        {interpretation.status === "GREEN"
          ? "✓"
          : interpretation.status === "YELLOW"
            ? "!"
            : "×"}
      </span>
      <span>{statusLabel}</span>
      {showTrend && interpretation.trend && (
        <span className="inline-flex items-center gap-0.5 opacity-80">
          <span aria-hidden="true">{TREND_ICONS[interpretation.trend]}</span>
          <span className="sr-only">{TREND_TEXT[interpretation.trend]} trend</span>
        </span>
      )}
    </span>
  );
}

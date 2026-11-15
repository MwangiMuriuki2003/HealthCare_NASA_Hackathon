/**
 * Status colour system.
 *
 * Colours are supplemental: every status also has a text label and icon in the
 * UI. The values here are re-exported from the single threshold source so the
 * clinician bands cannot drift between components.
 */

import { Metric } from "@/types/schema";
import { THRESHOLDS, WARNING_BUFFER_PERCENT } from "@/lib/thresholds";

export const STATUS_COLORS = {
  GREEN: {
    bg: "bg-emerald-100",
    text: "text-emerald-900",
    border: "border-emerald-500",
    hex: "#059669",
  },
  YELLOW: {
    bg: "bg-amber-100",
    text: "text-amber-900",
    border: "border-amber-500",
    hex: "#d97706",
  },
  RED: {
    bg: "bg-red-100",
    text: "text-red-900",
    border: "border-red-600",
    hex: "#dc2626",
  },
} as const;

export const NORMAL_RANGES: Record<Metric, [number, number]> = Object.fromEntries(
  (Object.keys(THRESHOLDS) as Metric[]).map((metric) => [
    metric,
    [THRESHOLDS[metric].min, THRESHOLDS[metric].max] as [number, number],
  ])
) as Record<Metric, [number, number]>;

export const CRITICAL_MULTIPLIER = 1.5;

export const TREND_WINDOWS: Record<Metric, number> = {
  [Metric.BLOOD_PRESSURE_SYSTOLIC]: 12,
  [Metric.BLOOD_PRESSURE_DIASTOLIC]: 12,
  [Metric.HEART_RATE]: 24,
  [Metric.BLOOD_GLUCOSE]: 12,
  [Metric.BODY_TEMPERATURE]: 12,
  [Metric.SLEEP_DURATION]: 1,
};

export const COMBINED_SIGNAL_RULES = {
  escalateIfYellowCount: 3,
  requireMedicalOfficerAlert: true,
} as const;

export { WARNING_BUFFER_PERCENT };

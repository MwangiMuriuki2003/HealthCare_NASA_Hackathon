/**
 * Clinician-facing thresholds and metric metadata.
 *
 * Bands:
 *   GREEN  — value inside the normal range
 *   YELLOW — value outside the normal range, but within the warning buffer
 *   RED    — value beyond the warning buffer (critical)
 *
 * The buffer is a percentage of the normal range span so it behaves the same
 * for narrow ranges (temperature) and wide ones (glucose).
 */

import { Metric, VitalStatus } from "@/types/schema";

export interface ThresholdRange {
  min: number;
  max: number;
  unit: string;
  label: string;
  shortLabel: string;
  step: number;
  /** Display formatter, e.g. one decimal for temperature. */
  decimals: number;
  /** Plausible input bounds for the logging form (not clinical bands). */
  inputMin: number;
  inputMax: number;
}

export const THRESHOLDS: Record<Metric, ThresholdRange> = {
  [Metric.HEART_RATE]: {
    min: 60,
    max: 100,
    unit: "bpm",
    label: "Heart Rate",
    shortLabel: "HR",
    step: 1,
    decimals: 0,
    inputMin: 30,
    inputMax: 220,
  },
  [Metric.BLOOD_PRESSURE_SYSTOLIC]: {
    min: 90,
    max: 120,
    unit: "mmHg",
    label: "Blood Pressure (Systolic)",
    shortLabel: "SYS",
    step: 1,
    decimals: 0,
    inputMin: 50,
    inputMax: 250,
  },
  [Metric.BLOOD_PRESSURE_DIASTOLIC]: {
    min: 60,
    max: 80,
    unit: "mmHg",
    label: "Blood Pressure (Diastolic)",
    shortLabel: "DIA",
    step: 1,
    decimals: 0,
    inputMin: 30,
    inputMax: 150,
  },
  [Metric.BLOOD_GLUCOSE]: {
    min: 70,
    max: 140,
    unit: "mg/dL",
    label: "Blood Glucose",
    shortLabel: "GLU",
    step: 1,
    decimals: 0,
    inputMin: 10,
    inputMax: 600,
  },
  [Metric.BODY_TEMPERATURE]: {
    min: 36.1,
    max: 37.2,
    unit: "°C",
    label: "Body Temperature",
    shortLabel: "TEMP",
    step: 0.1,
    decimals: 1,
    inputMin: 33,
    inputMax: 42,
  },
  [Metric.SLEEP_DURATION]: {
    min: 7,
    max: 9,
    unit: "h",
    label: "Sleep Duration",
    shortLabel: "SLEEP",
    step: 0.25,
    decimals: 1,
    inputMin: 0,
    inputMax: 24,
  },
};

/** Buffer beyond a range edge that still counts as "watch" rather than critical. */
export const WARNING_BUFFER_PERCENT = 0.1;

export const STATUS_LABELS: Record<VitalStatus, string> = {
  GREEN: "Nominal",
  YELLOW: "Watch",
  RED: "Critical",
};

export interface StatusResult {
  status: VitalStatus;
  label: string;
  color: string;
  hasReading: boolean;
}

/** Inclusive watch bounds for a metric. */
export function getWatchBounds(metric: Metric): {
  lowWatch: number;
  highWatch: number;
} {
  const range = THRESHOLDS[metric];
  const buffer = (range.max - range.min) * WARNING_BUFFER_PERCENT;
  return {
    lowWatch: range.min - buffer,
    highWatch: range.max + buffer,
  };
}

/** Classify a value against the metric's normal range. */
export function getVitalStatus(metric: Metric, value: number): StatusResult {
  const range = THRESHOLDS[metric];

  if (!Number.isFinite(value)) {
    return {
      status: "YELLOW",
      label: "No reading",
      color: "gray",
      hasReading: false,
    };
  }

  const { lowWatch, highWatch } = getWatchBounds(metric);

  if (value < lowWatch || value > highWatch) {
    return {
      status: "RED",
      label: STATUS_LABELS.RED,
      color: "red",
      hasReading: true,
    };
  }

  if (value < range.min || value > range.max) {
    return {
      status: "YELLOW",
      label: STATUS_LABELS.YELLOW,
      color: "yellow",
      hasReading: true,
    };
  }

  return {
    status: "GREEN",
    label: STATUS_LABELS.GREEN,
    color: "green",
    hasReading: true,
  };
}

export function formatMetricValue(metric: Metric, value: number): string {
  const range = THRESHOLDS[metric];
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(range.decimals)} ${range.unit}`;
}

/**
 * Trends engine — rolling statistics, rate of change and drift detection.
 * Pure functions, no network access.
 */

import { Metric, TrendDirection, VitalReading } from "@/types/schema";
import { THRESHOLDS } from "@/lib/thresholds";

export interface RollingStats {
  mean: number | null;
  median: number | null;
  stddev: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

const EMPTY_STATS: RollingStats = {
  mean: null,
  median: null,
  stddev: null,
  min: null,
  max: null,
  count: 0,
};

function chronological(readings: VitalReading[]): VitalReading[] {
  return [...readings].sort((a, b) => a.recordedAt - b.recordedAt);
}

/** Statistics over the most recent `windowSize` readings. */
export function rollingStats(readings: VitalReading[], windowSize = 24): RollingStats {
  if (!readings || readings.length === 0) return { ...EMPTY_STATS };

  const window = chronological(readings)
    .slice(-windowSize)
    .map((reading) => reading.value)
    .filter((value) => Number.isFinite(value));

  if (window.length === 0) return { ...EMPTY_STATS };

  const sorted = [...window].sort((a, b) => a - b);
  const count = sorted.length;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / count;
  const median =
    count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];
  const stddev =
    count < 2
      ? 0
      : Math.sqrt(
          sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
            (count - 1)
        );

  return {
    mean: round(mean),
    median: round(median),
    stddev: round(stddev),
    min: round(sorted[0]),
    max: round(sorted[count - 1]),
    count,
  };
}

/** Rate of change in units per minute across the most recent readings. */
export function rateOfChange(
  readings: VitalReading[],
  windowSize = 10
): number | null {
  const window = chronological(readings).slice(-windowSize);
  if (window.length < 2) return null;

  const first = window[0];
  const last = window[window.length - 1];
  const minutes = (last.recordedAt - first.recordedAt) / 60_000;
  if (minutes <= 0) return null;

  return round((last.value - first.value) / minutes, 3);
}

/**
 * Map a metric-specific rate to a trend direction.
 *
 * Increasing sleep duration is good; increasing HR/BP/glucose/temperature is
 * not. The threshold is 1% of the normal span per minute.
 */
export function trendDirection(
  rate: number | null,
  metric: Metric
): TrendDirection {
  if (rate === null) return "stable";

  const { max, min } = THRESHOLDS[metric];
  const threshold = (max - min) * 0.01;
  const higherIsBetter = metric === Metric.SLEEP_DURATION;

  if (rate > threshold) return higherIsBetter ? "improving" : "declining";
  if (rate < -threshold) return higherIsBetter ? "declining" : "improving";
  return "stable";
}

export interface DriftResult {
  drift: boolean;
  zScore: number;
  direction: "above" | "below" | "stable";
}

/** Detect whether a reading sits more than 2 standard deviations from baseline. */
export function detectDrift(
  reading: VitalReading,
  baseline: RollingStats
): DriftResult {
  const { mean, stddev } = baseline;
  if (mean === null || stddev === null || stddev === 0) {
    return { drift: false, zScore: 0, direction: "stable" };
  }

  const zScore = (reading.value - mean) / stddev;
  if (Math.abs(zScore) <= 2) {
    return { drift: false, zScore: round(zScore), direction: "stable" };
  }

  return {
    drift: true,
    zScore: round(zScore),
    direction: zScore > 0 ? "above" : "below",
  };
}

/** Whether a value is inside the normal band (no warning buffer applied). */
export function isWithinBaseline(metric: Metric, value: number): boolean {
  const range = THRESHOLDS[metric];
  return value >= range.min && value <= range.max;
}

/** How far a value sits outside the normal band, normalised to the span. */
export function deviationFromBaseline(metric: Metric, value: number): number {
  const range = THRESHOLDS[metric];
  const span = range.max - range.min || 1;
  if (value > range.max) return (value - range.max) / span;
  if (value < range.min) return (value - range.min) / span;
  return 0;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

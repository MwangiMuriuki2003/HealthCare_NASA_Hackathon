/**
 * Interpretation engine — the product's core.
 *
 * Given a reading (and optionally the rest of the recent readings), produce a
 * plain-language status, reason and conservative guidance. Everything runs
 * on-device; no network calls.
 *
 * Steps:
 *   1. Baseline-relative band classification
 *   2. Trend downgrade (a strong decline inside the normal band is "watch")
 *   3. Combined-signal escalation (three or more metrics off-nominal)
 *   4. Plain-language reason + conservative guidance
 */

import {
  Interpretation,
  Metric,
  TrendDirection,
  VitalReading,
  VitalStatus,
} from "@/types/schema";
import {
  formatMetricValue,
  getVitalStatus,
  STATUS_LABELS,
  THRESHOLDS,
} from "@/lib/thresholds";

const STATUS_ORDER: VitalStatus[] = ["GREEN", "YELLOW", "RED"];
const COMBINED_SIGNAL_LIMIT = 3;
const CONTEXT_WINDOW_MS = 24 * 60 * 60 * 1000;

function escalate(status: VitalStatus): VitalStatus {
  const index = Math.min(
    STATUS_ORDER.indexOf(status) + 1,
    STATUS_ORDER.length - 1
  );
  return STATUS_ORDER[index];
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Classify a reading against the configured ranges.
 * `context` is an optional list of recent readings used for combined signals.
 */
export function classifyReading(
  reading: VitalReading,
  context: VitalReading[] = []
): { status: VitalStatus; reason: string; guidance: string } {
  const range = THRESHOLDS[reading.metric];
  const band = getVitalStatus(reading.metric, reading.value);
  let status = band.status;
  let reason: string;

  if (!band.hasReading) {
    return {
      status: "YELLOW",
      reason: `${range.label} has no usable value.`,
      guidance:
        "Retake the reading. If the problem persists, tell the Medical Officer.",
    };
  }

  if (status === "GREEN") {
    reason = `${range.label} is within the normal range (${range.min}–${range.max} ${range.unit}).`;
  } else if (status === "YELLOW") {
    reason =
      reading.value > range.max
        ? `${range.label} is slightly above the normal maximum of ${range.max} ${range.unit}.`
        : `${range.label} is slightly below the normal minimum of ${range.min} ${range.unit}.`;
  } else {
    reason =
      reading.value > range.max
        ? `${range.label} is critically above the normal maximum of ${range.max} ${range.unit}.`
        : `${range.label} is critically below the normal minimum of ${range.min} ${range.unit}.`;
  }

  // --- Step 2: trend downgrade -------------------------------------------
  if (status === "GREEN" && reading.trend === "declining") {
    status = escalate(status);
    reason += " The recent trend is declining.";
  }

  // --- Step 3: combined signals ------------------------------------------
  const latestByMetric = new Map<Metric, VitalReading>();
  const cutoff = reading.recordedAt - CONTEXT_WINDOW_MS;

  for (const item of context) {
    if (item.metric === reading.metric) continue;
    if (item.recordedAt < cutoff) continue;
    if (!Number.isFinite(item.value)) continue;

    const existing = latestByMetric.get(item.metric);
    if (!existing || item.recordedAt > existing.recordedAt) {
      latestByMetric.set(item.metric, item);
    }
  }

  const offNominalOtherMetrics = Array.from(latestByMetric.values()).filter(
    (item) => getVitalStatus(item.metric, item.value).status !== "GREEN"
  ).length;
  const offNominalTotal =
    offNominalOtherMetrics + (status === "GREEN" ? 0 : 1);

  if (offNominalTotal >= COMBINED_SIGNAL_LIMIT) {
    const escalated = escalate(status);
    if (escalated !== status) {
      status = escalated;
      reason += ` ${offNominalTotal} metrics are currently off-nominal, so this reading is escalated.`;
    }
  }

  return {
    status,
    reason,
    guidance: guidanceFor(status, reading.metric, reading.trend),
  };
}

/** Full interpretation object for display. */
export function interpretReading(
  reading: VitalReading,
  context: VitalReading[] = []
): Interpretation {
  const { status, reason, guidance } = classifyReading(reading, context);
  const range = THRESHOLDS[reading.metric];

  return {
    metric: reading.metric,
    metricLabel: range.label,
    value: reading.value,
    unit: range.unit,
    status,
    reason,
    guidance,
    trend: reading.trend,
    recordedAt: formatTime(reading.recordedAt),
  };
}

const GUIDANCE: Record<Metric, Record<VitalStatus, string>> = {
  [Metric.HEART_RATE]: {
    GREEN: "Continue normal mission activities.",
    YELLOW:
      "Rest for 10 minutes and retake the reading. If it remains abnormal, notify the Medical Officer.",
    RED: "Sit down, stay calm and notify the Medical Officer now. Repeat the reading in 5 minutes.",
  },
  [Metric.BLOOD_PRESSURE_SYSTOLIC]: {
    GREEN: "Continue normal mission activities.",
    YELLOW:
      "Rest for 10 minutes and retake. If systolic stays above 130 mmHg, notify the Medical Officer.",
    RED: "Lie down, hydrate and notify the Medical Officer now. Do not start strenuous tasks.",
  },
  [Metric.BLOOD_PRESSURE_DIASTOLIC]: {
    GREEN: "Continue normal mission activities.",
    YELLOW:
      "Rest for 10 minutes and retake. If diastolic stays above 90 mmHg, notify the Medical Officer.",
    RED: "Lie down, hydrate and notify the Medical Officer now.",
  },
  [Metric.BLOOD_GLUCOSE]: {
    GREEN: "Continue the normal meal and hydration schedule.",
    YELLOW: "Follow the meal plan and retest in 30 minutes.",
    RED: "Follow the hypo/hyperglycaemia protocol, retest in 15 minutes and notify the Medical Officer.",
  },
  [Metric.BODY_TEMPERATURE]: {
    GREEN: "Continue normal mission activities.",
    YELLOW:
      "Rest, hydrate and retake in 30 minutes. If above 38 °C, notify the Medical Officer.",
    RED: "Start cooling measures, hydrate and notify the Medical Officer now.",
  },
  [Metric.SLEEP_DURATION]: {
    GREEN: "Recovery is adequate for mission duties.",
    YELLOW:
      "Schedule a sleep opportunity soon and avoid critical tasks while tired.",
    RED: "Notify the Medical Officer and postpone critical tasks until rest is restored.",
  },
};

function guidanceFor(
  status: VitalStatus,
  metric: Metric,
  trend: TrendDirection
): string {
  const base = GUIDANCE[metric][status];
  if (trend === "declining" && status !== "GREEN") {
    return `${base} The trend is declining — escalate if the next reading is worse.`;
  }
  return base;
}

export function statusLabel(status: VitalStatus): string {
  return STATUS_LABELS[status];
}

export const interpretationEngine = {
  classifyReading,
  interpretReading,
  getGuidance: (status: VitalStatus, metric: Metric) => GUIDANCE[metric][status],
  formatValue: formatMetricValue,
};

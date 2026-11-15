"use client";

/**
 * LogVitals — guided entry → engine → encrypted store → outbox.
 */

import { useEffect, useMemo, useState } from "react";
import type { Metric, VitalReading } from "@/types/schema";
import { METRICS } from "@/types/schema";
import { interpretReading } from "@/lib/engine/interpret";
import type { Interpretation } from "@/types/schema";
import { rateOfChange, trendDirection } from "@/lib/engine/trends";
import { THRESHOLDS, formatMetricValue } from "@/lib/thresholds";
import { ReadingStore, RoutineStore, OutboxQueue } from "@/lib/store";
import { StatusPill } from "./StatusPill";

type LogVitalsProps = {
  astronautId: string;
  onReadingLogged?: (reading: VitalReading) => void;
};

export function LogVitals({ astronautId, onReadingLogged }: LogVitalsProps) {
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [enteredValue, setEnteredValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<VitalReading[]>([]);

  const readingStore = useMemo(() => new ReadingStore(), []);
  const routineStore = useMemo(() => new RoutineStore(), []);
  const outboxQueue = useMemo(() => new OutboxQueue(), []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedMetric) {
      setHistory([]);
      return;
    }

    readingStore
      .getReadingsByAstronaut(astronautId, selectedMetric, 24)
      .then((items) => {
        if (!cancelled) setHistory(items);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, [astronautId, selectedMetric, readingStore]);

  const preview: Interpretation | null = useMemo(() => {
    if (!selectedMetric || enteredValue.trim() === "") return null;
    const value = Number(enteredValue);
    if (!Number.isFinite(value)) return null;

    const trend = trendDirection(rateOfChange(history, 10), selectedMetric);
    const draft: VitalReading = {
      id: "preview",
      astronautId,
      metric: selectedMetric,
      value,
      unit: THRESHOLDS[selectedMetric].unit,
      source: "MANUAL",
      recordedAt: Date.now(),
      trend,
      isFirstOfDay: !hasReadingToday(history),
    };

    return interpretReading(draft, history);
  }, [astronautId, enteredValue, history, selectedMetric]);

  const handleSave = async () => {
    if (!selectedMetric) return;

    const value = Number(enteredValue);
    const range = THRESHOLDS[selectedMetric];

    if (!Number.isFinite(value)) {
      setError("Enter a valid number.");
      return;
    }
    if (value < range.inputMin || value > range.inputMax) {
      setError(
        `Enter a value between ${range.inputMin} and ${range.inputMax} ${range.unit}.`
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const trend = trendDirection(rateOfChange(history, 10), selectedMetric);
      const reading: VitalReading = {
        id: crypto.randomUUID(),
        astronautId,
        metric: selectedMetric,
        value,
        unit: range.unit,
        source: "MANUAL",
        recordedAt: Date.now(),
        trend,
        isFirstOfDay: !hasReadingToday(history),
      };

      reading.interpretation = interpretReading(reading, history);

      await readingStore.addReading(reading);
      await routineStore.recordLog(astronautId);
      await outboxQueue.addPackage(astronautId, "vital-reading", {
        reading,
        interpretation: reading.interpretation,
      });

      onReadingLogged?.(reading);
      setEnteredValue("");
      setSelectedMetric(null);
      setHistory([]);
    } catch (saveError) {
      console.error("AstraVitals: could not save reading.", saveError);
      setError(
        "The reading could not be saved on this device. Check browser storage permissions and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-labelledby="log-vitals-title"
    >
      <h2 id="log-vitals-title" className="text-sm font-medium">
        Log a vital
      </h2>

      {!selectedMetric ? (
        <fieldset className="mt-3">
          <legend className="text-xs text-muted-foreground">
            Which metric would you like to log?
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {METRICS.map((metric) => (
              <button
                key={metric}
                type="button"
                onClick={() => {
                  setSelectedMetric(metric);
                  setEnteredValue("");
                  setError(null);
                }}
                className="min-h-11 rounded-lg border border-border bg-muted px-3 py-2 text-left text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {THRESHOLDS[metric].label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="vital-value" className="text-sm font-medium">
              {THRESHOLDS[selectedMetric].label}
            </label>
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() => {
                setSelectedMetric(null);
                setEnteredValue("");
                setError(null);
              }}
            >
              Change metric
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="vital-value"
              type="number"
              inputMode="decimal"
              value={enteredValue}
              onChange={(event) => {
                setEnteredValue(event.target.value);
                setError(null);
              }}
              min={THRESHOLDS[selectedMetric].inputMin}
              max={THRESHOLDS[selectedMetric].inputMax}
              step={THRESHOLDS[selectedMetric].step}
              className="min-h-11 flex-1 rounded-lg border border-border px-3 py-2 text-center text-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-describedby="vital-range"
            />
            <span className="text-sm text-muted-foreground">
              {THRESHOLDS[selectedMetric].unit}
            </span>
          </div>

          <p id="vital-range" className="text-xs text-muted-foreground">
            Plausible entry range {THRESHOLDS[selectedMetric].inputMin}–
            {THRESHOLDS[selectedMetric].inputMax}{" "}
            {THRESHOLDS[selectedMetric].unit}. Clinical normal band{" "}
            {THRESHOLDS[selectedMetric].min}–{THRESHOLDS[selectedMetric].max}.
          </p>

          {preview && (
            <div className="rounded-lg bg-muted p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill interpretation={preview} size="sm" />
                <span className="text-sm font-semibold">
                  {formatMetricValue(selectedMetric, preview.value)}
                </span>
              </div>
              <p className="mt-2 text-xs">{preview.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {preview.guidance}
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 p-2 text-xs text-red-800" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !preview}
            className="min-h-11 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "Saving…" : "Save reading"}
          </button>
        </div>
      )}
    </section>
  );
}

function hasReadingToday(readings: VitalReading[]): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return readings.some(
    (reading) => new Date(reading.recordedAt).toISOString().slice(0, 10) === today
  );
}

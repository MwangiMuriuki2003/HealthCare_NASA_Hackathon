"use client";

/**
 * Dashboard — the crew home screen.
 *
 * Reads only from the encrypted on-device store. No mock readings are shown:
 * an empty device is a valid state.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AchievementType,
  Metric,
  METRICS,
  type RoutineState,
  type TrendDirection,
  type VitalReading,
  type VitalStatus,
  type WellnessScore,
} from "@/types/schema";
import { interpretReading } from "@/lib/engine/interpret";
import { THRESHOLDS } from "@/lib/thresholds";
import { ReadingStore, RoutineStore, OutboxQueue } from "@/lib/store";
import { BodyMap } from "./BodyMap";
import { LogVitals } from "./LogVitals";
import { ScoreRing } from "./ScoreRing";
import { TrendChart } from "./TrendChart";
import { VitalCard } from "./VitalCard";
import { BadgeGrid } from "./gamification/BadgeGrid";
import { AchievementsOverview } from "./gamification/AchievementsOverview";

type DashboardProps = {
  astronautId?: string;
};

export function Dashboard({
  astronautId = process.env.NEXT_PUBLIC_ASTRONAUT_ID ?? "crew-1",
}: DashboardProps) {
  const [readings, setReadings] = useState<VitalReading[]>([]);
  const [routine, setRoutine] = useState<RoutineState | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<Metric>(Metric.HEART_RATE);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const readingStore = new ReadingStore();
    const routineStore = new RoutineStore();
    const outbox = new OutboxQueue();

    Promise.all([
      readingStore.getReadingsByAstronaut(astronautId),
      routineStore.getRoutine(astronautId),
      outbox.getPendingPackages(),
    ])
      .then(([storedReadings, storedRoutine, pending]) => {
        if (cancelled) return;
        setReadings(storedReadings);
        setRoutine(storedRoutine ?? null);
        setPendingSync(pending.length);
      })
      .catch((error) => {
        console.error("AstraVitals: could not read local storage.", error);
        if (!cancelled) {
          setStorageError(
            "Local encrypted storage is unavailable in this browser context. Readings cannot be saved."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [astronautId]);

  const latestReadings = useMemo(() => {
    const latest = new Map<Metric, VitalReading>();
    for (const reading of readings) {
      if (!latest.has(reading.metric)) latest.set(reading.metric, reading);
    }
    return latest;
  }, [readings]);

  const context = useMemo(() => Array.from(latestReadings.values()), [latestReadings]);

  const interpretedLatest = useMemo(() => {
    const result = new Map<Metric, VitalReading>();
    for (const [metric, reading] of latestReadings) {
      result.set(metric, {
        ...reading,
        interpretation:
          reading.interpretation ??
          interpretReading(
            reading,
            context.filter((item) => item.metric !== metric)
          ),
      });
    }
    return result;
  }, [context, latestReadings]);

  const statuses = useMemo(() => {
    const result = {} as Record<Metric, VitalStatus | null>;
    for (const metric of METRICS) {
      result[metric] = interpretedLatest.get(metric)?.interpretation?.status ?? null;
    }
    return result;
  }, [interpretedLatest]);

  const score = useMemo(
    () =>
      computeWellnessScore(
        astronautId,
        interpretedLatest,
        routine,
        readings
      ),
    [astronautId, interpretedLatest, readings, routine]
  );

  const unlocked = useMemo(
    () => computeAchievements(interpretedLatest, score, routine),
    [interpretedLatest, routine, score]
  );

  const handleLogged = (reading: VitalReading) => {
    setReadings((previous) => [reading, ...previous]);
    setSelectedMetric(reading.metric);
    new RoutineStore()
      .getRoutine(astronautId)
      .then((updated) => setRoutine(updated ?? null))
      .catch(() => undefined);
    new OutboxQueue()
      .getPendingPackages()
      .then((pending) => setPendingSync(pending.length))
      .catch(() => undefined);
  };

  const latestList = Array.from(interpretedLatest.values());
  const greenCount = latestList.filter(
    (reading) => reading.interpretation?.status === "GREEN"
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Crew Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {routine?.streakDays ?? 0}-day logging streak ·{" "}
            {routine?.totalLogs ?? 0} total logs · {pendingSync} waiting to sync
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          All readings are encrypted on this device.
        </p>
      </header>

      {storageError && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {storageError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <ScoreRing score={score} showDetail />

        <section className="rounded-xl border border-border bg-card p-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Latest readings</h2>
            <span className="text-xs text-muted-foreground">
              {greenCount}/{latestList.length || 0} nominal
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Opening encrypted store…</p>
            ) : latestList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No readings yet. Use the form below to log the first one.
              </p>
            ) : (
              latestList.map((reading) => (
                <VitalCard
                  key={reading.id}
                  reading={reading}
                  history={readings.filter(
                    (item) => item.metric === reading.metric
                  )}
                />
              ))
            )}
          </div>
        </section>

        <BodyMap
          statuses={statuses}
          onMetricClick={(metric) => setSelectedMetric(metric)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-sm font-medium">Trends</h2>
            <label htmlFor="metric-select" className="sr-only">
              Metric to chart
            </label>
            <select
              id="metric-select"
              value={selectedMetric}
              onChange={(event) => setSelectedMetric(event.target.value as Metric)}
              className="min-h-10 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              {METRICS.map((metric) => (
                <option key={metric} value={metric}>
                  {THRESHOLDS[metric].label}
                </option>
              ))}
            </select>
          </div>

          <TrendChart readings={readings} metric={selectedMetric} />

          <AchievementsOverview
            streakDays={routine?.streakDays ?? 0}
            totalLogs={routine?.totalLogs ?? 0}
            unlockedCount={unlocked.length}
          />
        </div>

        <div className="space-y-4">
          <LogVitals astronautId={astronautId} onReadingLogged={handleLogged} />
          <BadgeGrid unlocked={unlocked} />
        </div>
      </div>
    </div>
  );
}

function computeWellnessScore(
  astronautId: string,
  latest: Map<Metric, VitalReading>,
  routine: RoutineState | null,
  readings: VitalReading[]
): WellnessScore {
  const metrics = {} as Record<Metric, number>;
  let available = 0;
  let green = 0;
  let red = 0;
  let total = 0;

  for (const metric of METRICS) {
    const interpretation = latest.get(metric)?.interpretation;
    if (!interpretation) {
      metrics[metric] = 0;
      continue;
    }

    const value =
      interpretation.status === "GREEN"
        ? 100
        : interpretation.status === "YELLOW"
          ? 55
          : 0;

    metrics[metric] = value;
    total += value;
    available += 1;
    if (interpretation.status === "GREEN") green += 1;
    if (interpretation.status === "RED") red += 1;
  }

  const recent = readings.slice(0, 8);
  const improving = recent.filter((reading) => reading.trend === "improving").length;
  const declining = recent.filter((reading) => reading.trend === "declining").length;
  const trend: TrendDirection =
    improving > declining
      ? "improving"
      : declining > improving
        ? "declining"
        : "stable";

  const overall = available > 0 ? Math.round(total / available) : 0;
  const adherence = Math.min(100, Math.round(((routine?.streakDays ?? 0) / 7) * 100));

  return {
    astronautId,
    overall,
    metrics,
    trend,
    lastUpdated: Date.now(),
    components: {
      compliance: available > 0 ? Math.round((green / available) * 100) : 0,
      adherence,
      risk: available > 0 ? Math.round((red / available) * 100) : 0,
    },
  };
}

function computeAchievements(
  latest: Map<Metric, VitalReading>,
  score: WellnessScore,
  routine: RoutineState | null
): AchievementType[] {
  const unlocked: AchievementType[] = [];
  const status = (metric: Metric) => latest.get(metric)?.interpretation?.status;

  if ((routine?.totalLogs ?? 0) > 0) unlocked.push(AchievementType.FIRST_READING);
  if ((routine?.streakDays ?? 0) >= 7) unlocked.push(AchievementType.SEVEN_DAY_LOGGER);
  if (status(Metric.HEART_RATE) === "GREEN") unlocked.push(AchievementType.HEART_HEALTHY);
  if (status(Metric.BLOOD_GLUCOSE) === "GREEN") unlocked.push(AchievementType.GLUCOSE_CONTROL);
  if (status(Metric.SLEEP_DURATION) === "GREEN") unlocked.push(AchievementType.SLEEP_CHAMPION);
  if (status(Metric.BODY_TEMPERATURE) === "GREEN")
    unlocked.push(AchievementType.TEMPERATURE_STABLE);
  if (score.components.compliance >= 90 && (routine?.totalLogs ?? 0) >= 7)
    unlocked.push(AchievementType.COMPLIANCE_HERO);

  return unlocked;
}

/**
 * DB Configuration — database name, version and default clinician ranges.
 *
 * Used by the encrypted IndexedDB store in `store.ts`. Bump DB_VERSION
 * whenever the object stores or indexes change.
 */

export const DB_NAME = "AstraVitalsDB";
export const DB_VERSION = 2;

/** Kept for older imports. */
export const dbName = DB_NAME;

/**
 * Default normal ranges per metric. Mirrors `THRESHOLDS` in
 * `src/lib/thresholds.ts`; the interpretation engine remains the source of
 * truth and clinicians can override these values.
 */
export const DEFAULT_NORMAL_RANGES: Record<string, [number, number]> = {
  BLOOD_PRESSURE_SYSTOLIC: [90, 120],
  BLOOD_PRESSURE_DIASTOLIC: [60, 80],
  HEART_RATE: [60, 100],
  BLOOD_GLUCOSE: [70, 140],
  BODY_TEMPERATURE: [36.1, 37.2],
  SLEEP_DURATION: [7, 9],
};

/** Object stores and indexes created by the IndexedDB layer. */
export const TABLE_SCHEMAS = {
  readings: {
    primaryKey: "id",
    indexes: ["astronautId", "metric", "recordedAt"],
  },
  baselines: {
    primaryKey: "id",
    indexes: ["astronautId", "metric"],
  },
  routine: {
    primaryKey: "id",
    indexes: ["astronautId"],
  },
  outbox: {
    primaryKey: "id",
    indexes: ["astronautId", "status", "createdAt"],
  },
  keys: {
    primaryKey: "id",
    indexes: [],
  },
} as const;

/**
 * Shared data model for AstraVitals.
 *
 * These types are the contract between the on-device stores, the
 * interpretation engine and the UI.
 */

// ———————————————————————————————————————————————————————————
// Metrics
// ———————————————————————————————————————————————————————————

/** The six vitals the crew app tracks. */
export enum Metric {
  BLOOD_PRESSURE_SYSTOLIC = "BLOOD_PRESSURE_SYSTOLIC",
  BLOOD_PRESSURE_DIASTOLIC = "BLOOD_PRESSURE_DIASTOLIC",
  HEART_RATE = "HEART_RATE",
  BLOOD_GLUCOSE = "BLOOD_GLUCOSE",
  BODY_TEMPERATURE = "BODY_TEMPERATURE",
  SLEEP_DURATION = "SLEEP_DURATION",
}

export const METRICS: Metric[] = [
  Metric.HEART_RATE,
  Metric.BLOOD_PRESSURE_SYSTOLIC,
  Metric.BLOOD_PRESSURE_DIASTOLIC,
  Metric.BLOOD_GLUCOSE,
  Metric.BODY_TEMPERATURE,
  Metric.SLEEP_DURATION,
];

export type VitalStatus = "GREEN" | "YELLOW" | "RED";
export type TrendDirection = "improving" | "stable" | "declining";
export type ReadingSource = "MANUAL" | "CAMERA" | "AUTOMATED";
export type UserRole = "ASTRONAUT" | "MEDICAL_OFFICER" | "MISSION_CONTROL";

// ———————————————————————————————————————————————————————————
// Readings and interpretation
// ———————————————————————————————————————————————————————————

export interface VitalReading {
  id: string;
  astronautId: string;
  metric: Metric;
  value: number;
  unit: string;
  source: ReadingSource;
  recordedAt: number; // UTC ms
  trend: TrendDirection;
  isFirstOfDay: boolean;
  interpretation?: Interpretation;
}

export interface Interpretation {
  metric: Metric;
  metricLabel: string;
  value: number;
  unit: string;
  status: VitalStatus;
  reason: string;
  guidance: string;
  trend: TrendDirection;
  recordedAt: string; // formatted for display
}

// ———————————————————————————————————————————————————————————
// Crew / mission
// ———————————————————————————————————————————————————————————

export interface Astronaut {
  id: string;
  name: string;
  role: UserRole;
  environment: Environment;
  missionStart: number; // MET hours
}

export enum Environment {
  Spacecraft = "Spacecraft",
  SpaceStation = "Space Station",
  Rover = "Rover",
  Base = "Base",
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  startTime: number;
  targetDuration: number; // hours
  crewSize: number;
  environments: Environment[];
}

// ———————————————————————————————————————————————————————————
// Offline storage / DTN sync
// ———————————————————————————————————————————————————————————

/** Per-astronaut normal range learned from reading history. */
export interface AstronautBaseline {
  id: string;
  astronautId: string;
  metric: Metric;
  normalMin: number;
  normalMax: number;
  updatedAt: number;
  lastCalculated: number;
  readingCount: number;
}

/** Consecutive-day logging state. */
export interface RoutineState {
  id: string;
  astronautId: string;
  streakDays: number;
  lastLogAt: number;
  totalLogs: number;
  lastMedReading: number | null;
  lastCriticalReading: number | null;
}

export type OutboxPayloadType =
  | "vital-reading"
  | "baseline-update"
  | "achievement-unlock"
  | "reminder";

export type OutboxStatus = "pending" | "synced" | "failed";

/** Store-and-forward package for delay-tolerant sync. */
export interface OutboxPackage {
  id: string;
  astronautId: string;
  payloadType: OutboxPayloadType;
  payload: unknown;
  status: OutboxStatus;
  createdAt: number;
  attempts: number;
  lastAttemptAt: number | null;
}

/** Signed bundle sent to the ground API. */
export interface SyncBundle {
  payload: string;
  hash: string;
  signature: string;
  timestamp: number;
}

// ———————————————————————————————————————————————————————————
// Achievements / reminders
// ———————————————————————————————————————————————————————————

export const AchievementType = {
  FIRST_READING: "FIRST_READING",
  SEVEN_DAY_LOGGER: "SEVEN_DAY_LOGGER",
  HEART_HEALTHY: "HEART_HEALTHY",
  GLUCOSE_CONTROL: "GLUCOSE_CONTROL",
  SLEEP_CHAMPION: "SLEEP_CHAMPION",
  TEMPERATURE_STABLE: "TEMPERATURE_STABLE",
  COMPLIANCE_HERO: "COMPLIANCE_HERO",
} as const;

export type AchievementType =
  (typeof AchievementType)[keyof typeof AchievementType];

export interface Achievement {
  id: string;
  astronautId: string;
  type: AchievementType;
  earnedAt: number;
  metadata?: Record<string, unknown>;
}

export const ReminderType = {
  MEDICATION: "MEDICATION",
  VITAL_CHECK: "VITAL_CHECK",
  HYDRATION: "HYDRATION",
  SLEEP: "SLEEP",
} as const;

export type ReminderType = (typeof ReminderType)[keyof typeof ReminderType];

export interface Reminder {
  id: string;
  astronautId: string;
  type: ReminderType;
  time: string; // HH:mm
  message: string;
  active: boolean;
  createdAt: number;
}

// ———————————————————————————————————————————————————————————
// Wellness score
// ———————————————————————————————————————————————————————————

export interface WellnessScore {
  astronautId: string;
  overall: number; // 0-100
  metrics: Record<Metric, number>;
  trend: TrendDirection;
  lastUpdated: number;
  components: {
    compliance: number;
    adherence: number;
    risk: number;
  };
}

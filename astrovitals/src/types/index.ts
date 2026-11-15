// Public type barrel for AstraVitals.

import type { VitalReading } from "./schema";

export { Metric, METRICS, Environment, AchievementType, ReminderType } from "./schema";
export type {
  Achievement,
  Astronaut,
  AstronautBaseline,
  Interpretation,
  Mission,
  OutboxPackage,
  OutboxPayloadType,
  OutboxStatus,
  ReadingSource,
  Reminder,
  RoutineState,
  SyncBundle,
  TrendDirection,
  UserRole,
  VitalReading,
  VitalStatus,
  WellnessScore,
} from "./schema";

/** Alias kept for older imports. */
export type Source = "MANUAL" | "CAMERA" | "AUTOMATED";
/** Alias kept for older imports. */
export type Role = "ASTRONAUT" | "MEDICAL_OFFICER" | "MISSION_CONTROL";

export type DashboardStats = {
  astronautId: string;
  currentVitals: VitalReading[];
  lastUpdated: Date;
};

/**
 * packages/shared-types — TypeScript types shared between crew PWA and ground dashboard.
 *
 * These are re-exports of the canonical types in src/types/schema.ts so that
 * both the Electron/PWA frontend and the FastAPI backend (via generators) stay
 * in sync with a single source of truth.
 */

export {
  Metric,
  METRICS,
  Environment,
  AchievementType,
  ReminderType,
} from "@/types/schema";

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
} from "@/types/schema";

"use client";

import { AchievementType } from "@/types/schema";
import type { AchievementType as TAchievementType } from "@/types/schema";

export function BadgeGrid({ unlocked }: { unlocked: TAchievementType[] }) {
  const allAchievements: { type: TAchievementType; label: string }[] = [
    { type: AchievementType.FIRST_READING, label: "First Reading" },
    { type: AchievementType.SEVEN_DAY_LOGGER, label: "7-Day Logger" },
    { type: AchievementType.HEART_HEALTHY, label: "Heart Healthy" },
    { type: AchievementType.GLUCOSE_CONTROL, label: "Glucose Control" },
    { type: AchievementType.SLEEP_CHAMPION, label: "Sleep Champion" },
    { type: AchievementType.TEMPERATURE_STABLE, label: "Temperature Stable" },
    { type: AchievementType.COMPLIANCE_HERO, label: "Compliance Hero" },
  ];

  const isUnlocked = (type: TAchievementType) => unlocked.includes(type);

  return (
    <div className="p-6 bg-card border border-border rounded-lg">
      <h2 className="mb-4 text-lg font-semibold">Achievements & Badges</h2>

      <div className="grid grid-cols-2 gap-3">
        {allAchievements.map(({ type, label }) => (
          <div
            key={type}
            className={`p-3 rounded flex items-center gap-2 ${isUnlocked(type)
              ? "bg-green-100 text-green-800 border border-green-500"
              : "bg-muted border border-border"
              }`}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zM12 4l-2 4h4l2-4H12zM12 9l-3 8 3 8 3-8-3-8z" />
            </svg>
            <span className="font-medium">{label}</span>
            {isUnlocked(type) && (
              <svg
                className="h-4 w-4 text-green-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
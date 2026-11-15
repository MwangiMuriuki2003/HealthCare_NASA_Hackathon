"use client";

export function AchievementsOverview({
  streakDays,
  totalLogs,
  unlockedCount,
}: {
  streakDays: number;
  totalLogs: number;
  unlockedCount: number;
}) {
  const compliancePct =
    totalLogs > 0 ? Math.round(Math.min(100, (unlockedCount / 7) * 100)) : 0;

  return (
    <div className="p-6 bg-card border border-border rounded-lg">
      <h2 className="mb-4 text-lg font-semibold">Mission XP & Leaderboard</h2>

      <div className="space-y-3">
        <div>
          <div className="text-sm font-medium">Overall Health Compliance</div>
          <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
              style={{ width: `${compliancePct}%` }}
            />
          </div>
          <div className="text-xs text-foreground mt-1">
            {compliancePct}% compliance · {totalLogs} logs
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded border" />
            <span className="text-sm">Opt-in to crew leaderboard</span>
          </label>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Badges unlocked</div>
          <div className="text-sm font-medium">{unlockedCount} of 7</div>
        </div>
      </div>
    </div>
  );
}
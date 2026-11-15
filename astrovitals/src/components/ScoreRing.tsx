/**
 * ScoreRing — overall wellness score with an accessible detail breakdown.
 */

import type { Metric, WellnessScore } from "@/types/schema";
import { THRESHOLDS } from "@/lib/thresholds";

type ScoreRingProps = {
  score: WellnessScore;
  showDetail?: boolean;
  className?: string;
};

const SCORE_COLOURS = {
  good: "#059669",
  watch: "#d97706",
  risk: "#dc2626",
} as const;

export function ScoreRing({
  score,
  showDetail = false,
  className = "",
}: ScoreRingProps) {
  const diameter = 160;
  const strokeWidth = 12;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score.overall));
  const dashOffset = circumference - (clamped / 100) * circumference;
  const colour =
    clamped >= 80
      ? SCORE_COLOURS.good
      : clamped >= 50
        ? SCORE_COLOURS.watch
        : SCORE_COLOURS.risk;

  return (
    <section
      className={`rounded-xl border border-border bg-card p-4 ${className}`}
      aria-labelledby="score-ring-title"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="score-ring-title" className="text-sm font-medium">
          Wellness
        </h2>
        <span className="text-xs text-muted-foreground">{score.trend}</span>
      </div>

      <div className="mt-2 flex justify-center">
        <svg
          width={diameter}
          height={diameter}
          viewBox={`0 0 ${diameter} ${diameter}`}
          role="img"
          aria-label={`Wellness score ${clamped} out of 100. ${score.components.compliance}% of available metrics nominal, ${score.components.risk}% critical.`}
        >
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            fill="none"
            stroke={colour}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
          />
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#0f172a"
            fontSize={34}
            fontWeight={700}
          >
            {Math.round(clamped)}
          </text>
          <text
            x="50%"
            y="61%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#475569"
            fontSize={12}
          >
            of 100
          </text>
        </svg>
      </div>

      {showDetail && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <Progress label="Compliance" value={score.components.compliance} />
          <Progress label="Adherence" value={score.components.adherence} />
          <Progress label="Risk" value={score.components.risk} invert />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-xs">
            {(Object.keys(score.metrics) as Metric[]).map((metric) => (
              <div key={metric} className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {THRESHOLDS[metric].shortLabel}
                </span>
                <span>{Math.round(score.metrics[metric])}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Progress({
  label,
  value,
  invert = false,
}: {
  label: string;
  value: number;
  invert?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const colour = invert
    ? clamped > 50
      ? SCORE_COLOURS.risk
      : SCORE_COLOURS.good
    : clamped >= 80
      ? SCORE_COLOURS.good
      : clamped >= 50
        ? SCORE_COLOURS.watch
        : SCORE_COLOURS.risk;

  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{clamped}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{ width: `${clamped}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  );
}

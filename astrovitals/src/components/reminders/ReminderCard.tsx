"use client";

import { useState, useEffect } from "react";

type Reminder = {
  id: string;
  type: string;
  message: string;
  active: boolean;
};

export function ReminderCard() {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    setReminders([
      {
        id: "1",
        type: "CHECK_VITALS",
        message: "Morning vitals check - 08:00",
        active: true,
      },
      {
        id: "2",
        type: "EXERCISE",
        message: "Post-exercise nutrition - 12:00",
        active: true,
      },
      {
        id: "3",
        type: "SLEEP",
        message: "Wind down routine - 22:00",
        active: true,
      },
    ]);
  }, []);

  return (
    <div className="p-6 bg-card border border-border rounded-lg">
      <h2 className="mb-4 text-lg font-semibold">Reminders</h2>

      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className={`flex items-start gap-3 p-3 rounded ${
            reminder.active ? "bg-green-50" : "bg-red-50 border"
          } ${!reminder.active ? "line-through text-muted-foreground" : ""}`}
        >
          <span
            className={`w-2 h-2 rounded-full mt-1 mr-2 flex-shrink-0 ${
              reminder.active ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{reminder.message}</p>
            <p className="text-xs text-muted-foreground">{reminder.type}</p>
          </div>
          {!reminder.active && (
            <span className="text-xs text-red-500 flex-shrink-0">Snoozed</span>
          )}
        </div>
      ))}

      <div className="mt-4 pt-4 border-t">
        <button className="bg-primary text-primary-foreground rounded-lg py-1 px-3 text-sm">
          Set Custom Reminder
        </button>
      </div>
    </div>
  );
}

import { splitByDueStatus } from "./dueStatus";
import type { Todo } from "../types/database.types";

export interface ReminderSummary {
  overdueCount: number;
  dueTodayCount: number;
}

/**
 * 開著才提醒（不做背景推播，見 packages/shared 這份邏輯的呼叫端 useDueDateReminders.ts /
 * widget App.tsx）：一天最多一個彙總通知，不是每個任務跳一則、也不是每次到期就跳。
 * 回傳 null 代表沒有東西好提醒。
 */
export function buildReminderSummary(todos: readonly Todo[], today: string): ReminderSummary | null {
  const { overdue, dueToday } = splitByDueStatus(todos, today);
  const summary: ReminderSummary = {
    overdueCount: overdue.length,
    dueTodayCount: dueToday.filter((t) => !t.is_completed).length,
  };
  return summary.overdueCount === 0 && summary.dueTodayCount === 0 ? null : summary;
}

export function reminderMessage(summary: ReminderSummary): string {
  const parts: string[] = [];
  if (summary.overdueCount > 0) parts.push(`${summary.overdueCount} 項逾期`);
  if (summary.dueTodayCount > 0) parts.push(`${summary.dueTodayCount} 項今天到期`);
  return parts.join("、");
}

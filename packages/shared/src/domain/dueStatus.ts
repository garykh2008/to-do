import type { Todo } from "../types/database.types";

/**
 * 「今天」相關檢視（今天總覽頁、widget 的今天 chip、到期提醒）共用的分類邏輯。
 * overdue 只算未完成的（完成了就不算逾期，跟 Todoist 的邏輯一致）；
 * dueToday 故意把已完成的也包進去，讓今天頁面上完成的項目還是看得到
 * （交給 TodoTree 自己處理已完成/未完成的分組顯示，這裡不用再篩一次）。
 */
export function splitByDueStatus(todos: readonly Todo[], today: string): { overdue: Todo[]; dueToday: Todo[] } {
  const overdue = todos.filter((t) => !t.is_completed && t.due_date !== null && t.due_date < today);
  const dueToday = todos.filter((t) => t.due_date === today);
  return { overdue, dueToday };
}

"use client";

import { splitByDueStatus } from "@to-do/shared";
import { useAllTodos, useLists } from "@/lib/queries";
import { AddTodoForm } from "./AddTodoForm";
import { TodoTree } from "./TodoTree";

const TODAY = new Date().toISOString().slice(0, 10);

export function TodayView() {
  const { data: lists = [], isLoading: listsLoading, error: listsError } = useLists();
  const { data: todos = [], isLoading: todosLoading, error: todosError } = useAllTodos();

  const inbox = lists.find((l) => l.is_inbox) ?? lists[0];
  const isLoading = listsLoading || todosLoading;
  const error = listsError ?? todosError;
  const knownLabels = [...new Set(todos.flatMap((t) => t.labels))].sort();
  const { overdue, dueToday } = splitByDueStatus(todos, TODAY);

  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-6 p-4 md:p-8">
      <datalist id="web-known-labels">
        {knownLabels.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
      <h1 className="text-2xl font-semibold text-neutral-800">今天</h1>

      {inbox && <AddTodoForm listId={inbox.id} />}

      {error ? (
        <p className="text-sm text-red-600">讀取待辦事項失敗：{error.message}</p>
      ) : isLoading ? (
        <p className="text-sm text-neutral-400">載入中…</p>
      ) : overdue.length === 0 && dueToday.length === 0 ? (
        <p className="text-sm text-neutral-400">今天沒有到期或逾期的待辦事項。</p>
      ) : (
        <div className="flex flex-col gap-6">
          {overdue.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="px-1 text-sm font-semibold text-red-600">逾期</h2>
              <TodoTree todos={overdue} />
            </section>
          )}
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-semibold text-neutral-600">今天</h2>
            <TodoTree todos={dueToday} emptyMessage="今天沒有到期的待辦事項" />
          </section>
        </div>
      )}
    </div>
  );
}

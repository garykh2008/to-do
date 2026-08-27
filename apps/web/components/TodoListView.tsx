"use client";

import { useAllTodos, useTodos } from "@/lib/queries";
import { AddTodoForm } from "./AddTodoForm";
import { TodoTree } from "./TodoTree";

export function TodoListView({ listId, listName }: { listId: string; listName: string }) {
  const { data: todos = [], isLoading, error } = useTodos(listId);
  // 標籤自動完成用：不限這個清單，列出使用者用過的所有標籤，跟 Todoist 一樣是跨清單共用的概念。
  const { data: allTodos = [] } = useAllTodos();
  const knownLabels = [...new Set(allTodos.flatMap((t) => t.labels))].sort();

  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-4 p-4 md:p-8">
      <datalist id="web-known-labels">
        {knownLabels.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
      <h1 className="text-2xl font-semibold text-neutral-800">{listName}</h1>

      <AddTodoForm listId={listId} />

      {error ? (
        <p className="text-sm text-red-600">讀取待辦事項失敗：{error.message}</p>
      ) : isLoading ? (
        <p className="text-sm text-neutral-400">載入中…</p>
      ) : (
        <TodoTree todos={todos} />
      )}
    </div>
  );
}

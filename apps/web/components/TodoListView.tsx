"use client";

import { useTodos } from "@/lib/queries";
import { AddTodoForm } from "./AddTodoForm";
import { TodoTree } from "./TodoTree";

export function TodoListView({ listId, listName }: { listId: string; listName: string }) {
  const { data: todos = [], isLoading, error } = useTodos(listId);

  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-4 p-4 md:p-8">
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

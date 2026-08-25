"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CircleCheck } from "lucide-react";
import { useTodos } from "@/lib/queries";
import { AddTodoForm } from "./AddTodoForm";
import { TodoItem } from "./TodoItem";

export function TodoListView({ listId, listName }: { listId: string; listName: string }) {
  const { data: todos = [], isLoading, error } = useTodos(listId);

  const incomplete = todos.filter((t) => !t.is_completed);
  const completed = todos.filter((t) => t.is_completed);

  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-4 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-neutral-800">{listName}</h1>

      <AddTodoForm listId={listId} />

      {error ? (
        <p className="text-sm text-red-600">讀取待辦事項失敗：{error.message}</p>
      ) : isLoading ? (
        <p className="text-sm text-neutral-400">載入中…</p>
      ) : (
        <SortableContext items={incomplete.map((t) => `todo:${t.id}`)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {incomplete.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
            {incomplete.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-neutral-300">
                <CircleCheck size={32} />
                <p className="text-sm text-neutral-400">目前沒有待辦事項</p>
              </div>
            )}
          </div>
        </SortableContext>
      )}

      {completed.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-neutral-400 hover:text-neutral-600">
            已完成 ({completed.length})
          </summary>
          <div className="mt-2 flex flex-col gap-2 opacity-70">
            {completed.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

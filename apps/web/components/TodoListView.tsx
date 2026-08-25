"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useTodos } from "@/lib/queries";
import { AddTodoForm } from "./AddTodoForm";
import { TodoItem } from "./TodoItem";

export function TodoListView({ listId, listName }: { listId: string; listName: string }) {
  const { data: todos = [], isLoading } = useTodos(listId);

  const incomplete = todos.filter((t) => !t.is_completed);
  const completed = todos.filter((t) => t.is_completed);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{listName}</h1>

      <AddTodoForm listId={listId} />

      {isLoading ? (
        <p className="text-sm text-neutral-400">載入中…</p>
      ) : (
        <SortableContext items={incomplete.map((t) => `todo:${t.id}`)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {incomplete.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
            {incomplete.length === 0 && <p className="text-sm text-neutral-400">目前沒有待辦事項</p>}
          </div>
        </SortableContext>
      )}

      {completed.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-neutral-400">已完成 ({completed.length})</summary>
          <div className="mt-2 flex flex-col gap-2">
            {completed.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

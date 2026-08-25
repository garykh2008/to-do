"use client";

import { CircleCheck } from "lucide-react";
import { groupTodosByParent } from "@to-do/shared";
import { useTodos } from "@/lib/queries";
import { AddTodoForm } from "./AddTodoForm";
import { TodoItem } from "./TodoItem";

export function TodoListView({ listId, listName }: { listId: string; listName: string }) {
  const { data: todos = [], isLoading, error } = useTodos(listId);

  const { topLevel, childrenByParentId } = groupTodosByParent(todos);
  const incompleteTop = topLevel.filter((t) => !t.is_completed);
  const completedTop = topLevel.filter((t) => t.is_completed);

  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-4 p-4 md:p-8">
      <h1 className="text-2xl font-semibold text-neutral-800">{listName}</h1>

      <AddTodoForm listId={listId} />

      {error ? (
        <p className="text-sm text-red-600">讀取待辦事項失敗：{error.message}</p>
      ) : isLoading ? (
        <p className="text-sm text-neutral-400">載入中…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {incompleteTop.map((todo) => (
            <TodoItem key={todo.id} todo={todo} childTodos={childrenByParentId.get(todo.id) ?? []} />
          ))}
          {incompleteTop.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-neutral-300">
              <CircleCheck size={32} />
              <p className="text-sm text-neutral-400">目前沒有待辦事項</p>
            </div>
          )}
        </div>
      )}

      {completedTop.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-neutral-400 hover:text-neutral-600">
            已完成 ({completedTop.length})
          </summary>
          <div className="mt-2 flex flex-col gap-2 opacity-70">
            {completedTop.map((todo) => (
              <TodoItem key={todo.id} todo={todo} childTodos={childrenByParentId.get(todo.id) ?? []} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

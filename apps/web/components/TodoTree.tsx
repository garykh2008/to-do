"use client";

import { CircleCheck } from "lucide-react";
import { groupTodosByParent, type Todo } from "@to-do/shared";
import { TodoItem } from "./TodoItem";

export function TodoTree({
  todos,
  emptyMessage = "目前沒有待辦事項",
}: {
  todos: Todo[];
  emptyMessage?: string;
}) {
  const { topLevel, childrenByParentId } = groupTodosByParent(todos);
  const incompleteTop = topLevel.filter((t) => !t.is_completed);
  const completedTop = topLevel.filter((t) => t.is_completed);

  return (
    <>
      <div className="flex flex-col gap-2">
        {incompleteTop.map((todo) => (
          <TodoItem key={todo.id} todo={todo} childTodos={childrenByParentId.get(todo.id) ?? []} />
        ))}
        {incompleteTop.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-neutral-300">
            <CircleCheck size={32} />
            <p className="text-sm text-neutral-400">{emptyMessage}</p>
          </div>
        )}
      </div>

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
    </>
  );
}

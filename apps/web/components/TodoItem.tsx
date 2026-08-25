"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Todo } from "@to-do/shared";
import { useDeleteTodo, useUpdateTodo } from "@/lib/queries";

export function TodoItem({ todo }: { todo: Todo }) {
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(todo.title);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `todo:${todo.id}`,
    data: { todoId: todo.id, listId: todo.list_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab select-none text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
        aria-label="拖曳排序"
      >
        ⠿
      </button>

      <input
        type="checkbox"
        checked={todo.is_completed}
        onChange={(e) =>
          updateTodo.mutate({ id: todo.id, listId: todo.list_id, is_completed: e.target.checked })
        }
        className="h-4 w-4 shrink-0"
      />

      {editingTitle ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            setEditingTitle(false);
            if (title.trim() && title !== todo.title) {
              updateTodo.mutate({ id: todo.id, listId: todo.list_id, title: title.trim() });
            } else {
              setTitle(todo.title);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setTitle(todo.title);
              setEditingTitle(false);
            }
          }}
          className="flex-1 rounded border border-neutral-300 px-1 py-0.5 text-sm outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingTitle(true)}
          className={`flex-1 truncate text-left text-sm ${todo.is_completed ? "text-neutral-400 line-through" : ""}`}
        >
          {todo.title}
        </button>
      )}

      <input
        type="date"
        value={todo.due_date ?? ""}
        onChange={(e) =>
          updateTodo.mutate({ id: todo.id, listId: todo.list_id, due_date: e.target.value || null })
        }
        className="shrink-0 rounded border border-neutral-200 px-1 py-0.5 text-xs text-neutral-600 outline-none"
      />

      <button
        type="button"
        onClick={() => deleteTodo.mutate({ id: todo.id, listId: todo.list_id })}
        className="shrink-0 rounded px-1 text-xs text-neutral-400 hover:text-red-600"
        aria-label="刪除"
      >
        ✕
      </button>
    </div>
  );
}

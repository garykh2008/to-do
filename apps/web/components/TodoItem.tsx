"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, Trash2 } from "lucide-react";
import type { Todo } from "@to-do/shared";
import { useDeleteTodo, useUpdateTodo } from "@/lib/queries";

const TODAY = new Date().toISOString().slice(0, 10);

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

  const isOverdue = !!todo.due_date && !todo.is_completed && todo.due_date < TODAY;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex flex-wrap items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 shadow-card transition-shadow hover:shadow-popover"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-neutral-300 hover:text-neutral-500 active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100"
        aria-label="拖曳排序"
      >
        <GripVertical size={15} />
      </button>

      <input
        type="checkbox"
        checked={todo.is_completed}
        onChange={(e) =>
          updateTodo.mutate({ id: todo.id, listId: todo.list_id, is_completed: e.target.checked })
        }
        className="h-4 w-4 shrink-0 rounded"
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
          className="flex-1 rounded border border-accent-300 px-1 py-0.5 text-sm outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingTitle(true)}
          className={`min-w-[6rem] flex-1 truncate text-left text-sm ${todo.is_completed ? "text-neutral-400 line-through" : "text-neutral-800"}`}
        >
          {todo.title}
        </button>
      )}

      <label
        className={`flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${
          isOverdue
            ? "border-red-200 bg-red-50 text-red-600"
            : todo.due_date
              ? "border-neutral-200 bg-neutral-50 text-neutral-600"
              : "border-transparent text-neutral-300 hover:border-neutral-200 hover:text-neutral-400"
        }`}
      >
        <CalendarDays size={12} />
        <input
          type="date"
          value={todo.due_date ?? ""}
          onChange={(e) =>
            updateTodo.mutate({ id: todo.id, listId: todo.list_id, due_date: e.target.value || null })
          }
          className="w-[6.5rem] bg-transparent outline-none"
        />
      </label>

      <button
        type="button"
        onClick={() => deleteTodo.mutate({ id: todo.id, listId: todo.list_id })}
        className="shrink-0 rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"
        aria-label="刪除"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react";
import type { Todo } from "@to-do/shared";
import { useAddTodo, useDeleteTodo, useUpdateTodo } from "@/lib/queries";

const TODAY = new Date().toISOString().slice(0, 10);

export interface TodoDragData {
  todoId: string;
  listId: string;
  parentId: string | null;
  isCompleted: boolean;
  hasChildren: boolean;
}

export function TodoItem({
  todo,
  childTodos = [],
  isChild = false,
}: {
  todo: Todo;
  childTodos?: Todo[];
  isChild?: boolean;
}) {
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const addTodo = useAddTodo();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [expanded, setExpanded] = useState(true);
  const [addingSub, setAddingSub] = useState(false);
  const [subTitle, setSubTitle] = useState("");

  const dragData: TodoDragData = {
    todoId: todo.id,
    listId: todo.list_id,
    parentId: todo.parent_id,
    isCompleted: todo.is_completed,
    hasChildren: childTodos.length > 0,
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: `todo:${todo.id}`,
    data: dragData,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = !!todo.due_date && !todo.is_completed && todo.due_date < TODAY;

  function handleAddSub(event: FormEvent) {
    event.preventDefault();
    const trimmed = subTitle.trim();
    if (!trimmed) return;
    addTodo.mutate({ listId: todo.list_id, title: trimmed, parentId: todo.id });
    setSubTitle("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex flex-wrap items-center gap-2.5 rounded-lg border bg-white px-3 py-2.5 shadow-card transition-shadow hover:shadow-popover ${
          isOver ? "border-accent-400 ring-2 ring-accent-200" : "border-neutral-200"
        }`}
      >
        {!isChild && childTodos.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-neutral-400 hover:text-neutral-600"
            aria-label={expanded ? "收合子項目" : "展開子項目"}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-neutral-300 hover:text-neutral-500 active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100"
          aria-label="拖曳排序／拖到其他項目上可變成子項目"
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
            className="min-w-[6rem] flex-1 rounded border border-accent-300 px-1 py-0.5 text-sm outline-none"
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

        {!isChild && (
          <button
            type="button"
            onClick={() => setAddingSub((v) => !v)}
            className="shrink-0 rounded p-1 text-neutral-300 hover:bg-accent-50 hover:text-accent-600 md:opacity-0 md:group-hover:opacity-100"
            aria-label="新增子項目"
          >
            <Plus size={14} />
          </button>
        )}

        <button
          type="button"
          onClick={() => deleteTodo.mutate({ id: todo.id, listId: todo.list_id })}
          className="shrink-0 rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"
          aria-label="刪除"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {addingSub && (
        <form onSubmit={handleAddSub} className="ml-7 flex items-center gap-2">
          <input
            autoFocus
            value={subTitle}
            onChange={(e) => setSubTitle(e.target.value)}
            onBlur={() => {
              if (!subTitle.trim()) setAddingSub(false);
            }}
            placeholder="新增子項目…"
            className="min-w-0 flex-1 rounded-md border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-accent-400"
          />
        </form>
      )}

      {!isChild && expanded && childTodos.length > 0 && (
        <SortableContext items={childTodos.map((c) => `todo:${c.id}`)} strategy={verticalListSortingStrategy}>
          <div className="ml-7 flex flex-col gap-1.5 border-l-2 border-neutral-100 pl-3">
            {childTodos.map((child) => (
              <TodoItem key={child.id} todo={child} isChild />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

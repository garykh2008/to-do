"use client";

import { useState, type FormEvent } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Flag,
  GripVertical,
  Plus,
  Repeat,
  StickyNote,
  Tag,
  Trash2,
} from "lucide-react";
import {
  cyclePriority,
  describeRecurrence,
  hashLabelToColor,
  NO_PRIORITY,
  parseLabelsInput,
  priorityColor,
  RECURRENCE_PRESETS,
  resolveCompletion,
  type RecurrenceRule,
  type Todo,
} from "@to-do/shared";
import { useAddTodo, useDeleteTodo, useUpdateTodo } from "@/lib/queries";
import { useDragOverState } from "@/lib/dragOverContext";

const TODAY = new Date().toISOString().slice(0, 10);

// 直接切字串取月/日，不用 Date 物件轉換，避免時區造成日期跑掉
function formatShortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export interface TodoDragData {
  todoId: string;
  listId: string;
  parentId: string | null;
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
  const [dateEditing, setDateEditing] = useState(false);
  const [labelsEditing, setLabelsEditing] = useState(false);
  const [recurrenceEditing, setRecurrenceEditing] = useState(false);
  const [notesEditing, setNotesEditing] = useState(false);

  const dragData: TodoDragData = {
    todoId: todo.id,
    listId: todo.list_id,
    parentId: todo.parent_id,
    hasChildren: childTodos.length > 0,
  };

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `todo:${todo.id}`,
    data: dragData,
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: `todo:${todo.id}`,
    data: dragData,
  });

  function setNodeRef(node: HTMLDivElement | null) {
    setDragRef(node);
    setDropRef(node);
  }

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = !!todo.due_date && !todo.is_completed && todo.due_date < TODAY;
  const dragZone = useDragOverState(todo.id);

  function handleAddSub(event: FormEvent) {
    event.preventDefault();
    const trimmed = subTitle.trim();
    if (!trimmed) return;
    addTodo.mutate({ listId: todo.list_id, title: trimmed, parentId: todo.id });
    setSubTitle("");
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      {/* 用絕對定位疊加的插入線，不佔文件流的空間，避免拖曳時項目因為線條出現/消失而跳動 */}
      {dragZone === "before" && (
        <div className="pointer-events-none absolute -top-[7px] right-0 left-0 z-10 mx-2 h-1 rounded-full bg-accent-500" />
      )}
      {dragZone === "after" && (
        <div className="pointer-events-none absolute -bottom-[7px] right-0 left-0 z-10 mx-2 h-1 rounded-full bg-accent-500" />
      )}

      <div
        ref={setNodeRef}
        style={style}
        className={`group relative flex flex-wrap items-center gap-2.5 rounded-lg border bg-white px-3 py-2.5 shadow-card transition-shadow hover:shadow-popover ${
          dragZone === "nest" ? "border-accent-500 bg-accent-50 ring-2 ring-accent-300" : "border-neutral-200"
        }`}
      >
        {dragZone === "nest" && (
          <span className="absolute -top-2 right-2 flex items-center gap-1 rounded-full bg-accent-600 px-2 py-0.5 text-[10px] font-medium text-white shadow-popover">
            <CornerDownRight size={10} />
            變成子項目
          </span>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
            className="touch-none cursor-grab text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
            aria-label="拖曳排序／拖到其他項目上可變成子項目"
          >
            <GripVertical size={15} />
          </button>

          <input
            type="checkbox"
            checked={todo.is_completed}
            onChange={(e) =>
              updateTodo.mutate({
                id: todo.id,
                listId: todo.list_id,
                ...resolveCompletion(todo, e.target.checked, TODAY),
              })
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
              className="min-w-[4rem] flex-1 rounded border border-accent-300 px-1 py-0.5 text-sm outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className={`min-w-[4rem] flex-1 truncate text-left text-sm ${todo.is_completed ? "text-neutral-400 line-through" : "text-neutral-800"}`}
            >
              {todo.title}
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {dateEditing ? (
            <label
              className={`flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${
                isOverdue
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-neutral-200 bg-neutral-50 text-neutral-600"
              }`}
            >
              <CalendarDays size={12} />
              <input
                type="date"
                autoFocus
                value={todo.due_date ?? ""}
                onChange={(e) =>
                  updateTodo.mutate({ id: todo.id, listId: todo.list_id, due_date: e.target.value || null })
                }
                onBlur={() => setDateEditing(false)}
                className="w-[6.5rem] bg-transparent outline-none"
              />
            </label>
          ) : todo.due_date ? (
            // 已經有日期時只顯示精簡的「月/日」文字，點了才展開成完整的日期輸入框，
            // 避免每一列都固定佔用一整個 <input type="date"> 的寬度，手機上標題會被擠掉。
            <button
              type="button"
              onClick={() => setDateEditing(true)}
              className={`flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${
                isOverdue
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-neutral-200 bg-neutral-50 text-neutral-600"
              }`}
            >
              <CalendarDays size={11} />
              {formatShortDate(todo.due_date)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDateEditing(true)}
              className="shrink-0 rounded p-1 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500"
              aria-label="設定截止日期"
            >
              <CalendarDays size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => updateTodo.mutate({ id: todo.id, listId: todo.list_id, priority: cyclePriority(todo.priority) })}
            className={`shrink-0 rounded p-1 ${priorityColor(todo.priority).text} hover:bg-neutral-100`}
            aria-label="設定優先權"
          >
            <Flag size={14} fill={todo.priority === NO_PRIORITY ? "none" : "currentColor"} />
          </button>

          <button
            type="button"
            onClick={() => setLabelsEditing((v) => !v)}
            className={`shrink-0 rounded p-1 hover:bg-neutral-100 ${todo.labels.length > 0 ? "text-accent-600" : "text-neutral-300"}`}
            aria-label="設定標籤"
          >
            <Tag size={14} />
          </button>

          <button
            type="button"
            onClick={() => setNotesEditing((v) => !v)}
            className={`shrink-0 rounded p-1 hover:bg-neutral-100 ${todo.notes ? "text-accent-600" : "text-neutral-300"}`}
            aria-label="設定備註"
          >
            <StickyNote size={14} />
          </button>

          {recurrenceEditing ? (
            <select
              autoFocus
              value={todo.recurrence_rule ? JSON.stringify(todo.recurrence_rule) : ""}
              onChange={(e) => {
                updateTodo.mutate({
                  id: todo.id,
                  listId: todo.list_id,
                  recurrence_rule: e.target.value ? (JSON.parse(e.target.value) as RecurrenceRule) : null,
                });
                setRecurrenceEditing(false);
              }}
              onBlur={() => setRecurrenceEditing(false)}
              className="shrink-0 rounded-md border border-accent-300 px-1 py-0.5 text-xs outline-none"
            >
              <option value="">不重複</option>
              {RECURRENCE_PRESETS.map((preset) => (
                <option key={preset.label} value={JSON.stringify(preset.rule)}>
                  {preset.label}
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              onClick={() => setRecurrenceEditing(true)}
              className={`shrink-0 rounded p-1 hover:bg-neutral-100 ${todo.recurrence_rule ? "text-accent-600" : "text-neutral-300"}`}
              aria-label="設定重複規則"
              title={todo.recurrence_rule ? describeRecurrence(todo.recurrence_rule) : "設定重複"}
            >
              <Repeat size={14} />
            </button>
          )}

          {!isChild && (
            <button
              type="button"
              onClick={() => setAddingSub((v) => !v)}
              className="shrink-0 rounded p-1 text-neutral-300 hover:bg-accent-50 hover:text-accent-600"
              aria-label="新增子項目"
            >
              <Plus size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => deleteTodo.mutate({ id: todo.id, listId: todo.list_id })}
            className="shrink-0 rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-600"
            aria-label="刪除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {(labelsEditing || todo.labels.length > 0) && (
        <div className="ml-7 flex flex-wrap items-center gap-1">
          {labelsEditing ? (
            <input
              type="text"
              autoFocus
              list="web-known-labels"
              defaultValue={todo.labels.join(", ")}
              onBlur={(e) => {
                updateTodo.mutate({ id: todo.id, listId: todo.list_id, labels: parseLabelsInput(e.currentTarget.value) });
                setLabelsEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setLabelsEditing(false);
              }}
              placeholder="標籤1, 標籤2"
              className="w-48 rounded-md border border-accent-300 px-2 py-1 text-xs outline-none"
            />
          ) : (
            todo.labels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setLabelsEditing(true)}
                className={`rounded px-1.5 py-0.5 text-xs ${hashLabelToColor(label).bg} ${hashLabelToColor(label).text}`}
              >
                {label}
              </button>
            ))
          )}
        </div>
      )}

      {(notesEditing || todo.notes) && (
        <div className="ml-7">
          {notesEditing ? (
            <textarea
              autoFocus
              defaultValue={todo.notes ?? ""}
              onBlur={(e) => {
                const trimmed = e.currentTarget.value.trim();
                updateTodo.mutate({ id: todo.id, listId: todo.list_id, notes: trimmed || null });
                setNotesEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setNotesEditing(false);
              }}
              placeholder="備註…"
              rows={3}
              className="w-full max-w-sm resize-y rounded-md border border-accent-300 px-2 py-1 text-xs outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setNotesEditing(true)}
              className="w-full max-w-sm truncate rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-left text-xs whitespace-pre-line text-neutral-600 hover:border-neutral-300"
            >
              {todo.notes}
            </button>
          )}
        </div>
      )}

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
        <div className="ml-7 flex flex-col gap-1.5 border-l-2 border-neutral-100 pl-3">
          {childTodos.map((child) => (
            <TodoItem key={child.id} todo={child} isChild />
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CircleCheck, GripVertical } from "lucide-react";
import type { List, Todo } from "@to-do/shared";

const TODAY = new Date().toISOString().slice(0, 10);

function TodoRow({
  todo,
  listName,
  lists,
  onToggle,
  onMove,
}: {
  todo: Todo;
  listName: string;
  lists: List[];
  onToggle: (id: string, completed: boolean) => void;
  onMove: (todoId: string, targetListId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `todo:${todo.id}`,
    data: { todoId: todo.id, listId: todo.list_id },
  });
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  const isOverdue = !!todo.due_date && todo.due_date < TODAY;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
      }}
      className="relative flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs shadow-card"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-neutral-300 hover:text-neutral-400 active:cursor-grabbing"
      >
        <GripVertical size={13} />
      </span>
      <input
        type="checkbox"
        checked={todo.is_completed}
        onChange={(e) => onToggle(todo.id, e.target.checked)}
        className="h-3.5 w-3.5 shrink-0 rounded"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate">{todo.title}</p>
        <p className={`truncate text-[10px] ${isOverdue ? "font-medium text-red-500" : "text-neutral-400"}`}>
          {listName}
          {todo.due_date ? ` · ${todo.due_date}` : ""}
        </p>
      </div>

      {menuPos && (
        <>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div className="fixed inset-0 z-10" onClick={() => setMenuPos(null)} />
          <div
            className="fixed z-20 min-w-[120px] rounded-md border border-neutral-200 bg-white py-1 text-xs shadow-popover"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            <p className="px-2 py-1 text-neutral-400">移到清單</p>
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => {
                  onMove(todo.id, list.id);
                  setMenuPos(null);
                }}
                disabled={list.id === todo.list_id}
                className="block w-full px-2 py-1 text-left hover:bg-neutral-100 disabled:text-neutral-300"
              >
                {list.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function CompactList({
  todos,
  lists,
  onToggle,
  onMove,
}: {
  todos: Todo[];
  lists: List[];
  onToggle: (id: string, completed: boolean) => void;
  onMove: (todoId: string, targetListId: string) => void;
}) {
  const listNameById = new Map(lists.map((l) => [l.id, l.name]));

  return (
    <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
      {todos.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-6 text-neutral-300">
          <CircleCheck size={22} />
          <p className="text-xs text-neutral-400">目前沒有待辦事項</p>
        </div>
      )}
      {todos.map((todo) => (
        <TodoRow
          key={todo.id}
          todo={todo}
          listName={listNameById.get(todo.list_id) ?? ""}
          lists={lists}
          onToggle={onToggle}
          onMove={onMove}
        />
      ))}
    </div>
  );
}

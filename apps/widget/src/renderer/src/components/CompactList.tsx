import { useLayoutEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, CircleCheck, GripVertical, Plus } from "lucide-react";
import { groupTodosByParent, type List, type Todo } from "@to-do/shared";

const TODAY = new Date().toISOString().slice(0, 10);

function TodoRow({
  todo,
  listName,
  lists,
  onToggle,
  onMove,
  onDelete,
  onUpdateDueDate,
  onToggleAddSub,
  isChild = false,
}: {
  todo: Todo;
  listName: string;
  lists: List[];
  onToggle: (id: string, completed: boolean) => void;
  onMove: (todoId: string, targetListId: string) => void;
  onDelete: (todoId: string) => void;
  onUpdateDueDate: (todoId: string, dueDate: string | null) => void;
  onToggleAddSub?: () => void;
  isChild?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `todo:${todo.id}`,
    data: { todoId: todo.id, listId: todo.list_id },
  });
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [dateEditing, setDateEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 小工具視窗很小，選單很容易超出視窗邊界被裁掉；量出選單實際大小後夾回可視範圍內，
  // 在瀏覽器繪製前（useLayoutEffect）就調整好位置，不會讓使用者看到選單先跑版再跳回來。
  useLayoutEffect(() => {
    if (!menuPos || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const clampedLeft = Math.min(menuPos.x, Math.max(4, window.innerWidth - rect.width - 4));
    const clampedTop = Math.min(menuPos.y, Math.max(4, window.innerHeight - rect.height - 4));
    menuRef.current.style.left = `${clampedLeft}px`;
    menuRef.current.style.top = `${clampedTop}px`;
  }, [menuPos]);

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  const isOverdue = !!todo.due_date && !todo.is_completed && todo.due_date < TODAY;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuPos({ x: e.clientX, y: e.clientY });
      }}
      className={`relative flex items-center gap-1.5 rounded-md border bg-white text-xs shadow-card ${
        isChild ? "border-neutral-100 px-1.5 py-1" : "border-neutral-200 px-2 py-1.5"
      }`}
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
        <p className={`truncate ${todo.is_completed ? "text-neutral-400 line-through" : ""}`}>{todo.title}</p>
        <div className="flex items-center gap-1 text-[10px] text-neutral-400">
          <span className="truncate">{listName}</span>
          {dateEditing ? (
            <input
              type="date"
              autoFocus
              value={todo.due_date ?? ""}
              onChange={(e) => onUpdateDueDate(todo.id, e.target.value || null)}
              onBlur={() => setDateEditing(false)}
              className="w-[6rem] shrink-0 rounded border border-accent-300 px-1 outline-none"
            />
          ) : todo.due_date ? (
            <button
              type="button"
              onClick={() => setDateEditing(true)}
              className={`shrink-0 truncate ${isOverdue ? "font-medium text-red-500" : "hover:text-neutral-600"}`}
            >
              · {todo.due_date}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDateEditing(true)}
              className="shrink-0 text-neutral-300 hover:text-neutral-500"
              aria-label="設定截止日期"
            >
              <CalendarDays size={10} />
            </button>
          )}
        </div>
      </div>

      {onToggleAddSub && (
        <button
          type="button"
          onClick={onToggleAddSub}
          className="shrink-0 rounded p-1 text-neutral-300 hover:bg-accent-50 hover:text-accent-600"
          aria-label="新增子項目"
        >
          <Plus size={12} />
        </button>
      )}

      {menuPos && (
        <>
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div className="fixed inset-0 z-10" onClick={() => setMenuPos(null)} />
          <div
            ref={menuRef}
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
            <div className="mt-1 border-t border-neutral-100 pt-1">
              <button
                type="button"
                onClick={() => {
                  onDelete(todo.id);
                  setMenuPos(null);
                }}
                className="block w-full px-2 py-1 text-left text-red-600 hover:bg-red-50"
              >
                刪除
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AddSubForm({ onAdd, onCancel }: { onAdd: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) return;
        onAdd(trimmed);
      }}
      className="ml-4"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (!title.trim()) onCancel();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        placeholder="新增子項目…"
        className="min-w-0 flex-1 rounded-md border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-accent-400"
      />
    </form>
  );
}

export function CompactList({
  todos,
  lists,
  onToggle,
  onMove,
  onDelete,
  onAddSub,
  onUpdateDueDate,
}: {
  todos: Todo[];
  lists: List[];
  onToggle: (id: string, completed: boolean) => void;
  onMove: (todoId: string, targetListId: string) => void;
  onDelete: (todoId: string) => void;
  onAddSub: (parentTodo: Todo, title: string) => void;
  onUpdateDueDate: (todoId: string, dueDate: string | null) => void;
}) {
  const listNameById = new Map(lists.map((l) => [l.id, l.name]));
  const { topLevel, childrenByParentId } = groupTodosByParent(todos);
  const incompleteTop = topLevel.filter((t) => !t.is_completed);
  const completedTop = topLevel.filter((t) => t.is_completed);
  const [addingSubId, setAddingSubId] = useState<string | null>(null);

  function renderItem(todo: Todo) {
    const children = childrenByParentId.get(todo.id) ?? [];
    return (
      <div key={todo.id} className="flex flex-col gap-1">
        <TodoRow
          todo={todo}
          listName={listNameById.get(todo.list_id) ?? ""}
          lists={lists}
          onToggle={onToggle}
          onMove={onMove}
          onDelete={onDelete}
          onUpdateDueDate={onUpdateDueDate}
          onToggleAddSub={() => setAddingSubId((id) => (id === todo.id ? null : todo.id))}
        />
        {addingSubId === todo.id && (
          <AddSubForm
            onAdd={(title) => {
              onAddSub(todo, title);
              setAddingSubId(null);
            }}
            onCancel={() => setAddingSubId(null)}
          />
        )}
        {children.length > 0 && (
          <div className="ml-4 flex flex-col gap-1 border-l border-neutral-200 pl-2">
            {children.map((child) => (
              <TodoRow
                key={child.id}
                todo={child}
                listName={listNameById.get(child.list_id) ?? ""}
                lists={lists}
                onToggle={onToggle}
                onMove={onMove}
                onDelete={onDelete}
                onUpdateDueDate={onUpdateDueDate}
                isChild
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
      {incompleteTop.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-6 text-neutral-300">
          <CircleCheck size={22} />
          <p className="text-xs text-neutral-400">目前沒有待辦事項</p>
        </div>
      )}
      {incompleteTop.map(renderItem)}

      {completedTop.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-[11px] text-neutral-400 hover:text-neutral-600">
            已完成 ({completedTop.length})
          </summary>
          <div className="mt-1.5 flex flex-col gap-1.5 opacity-70">{completedTop.map(renderItem)}</div>
        </details>
      )}
    </div>
  );
}

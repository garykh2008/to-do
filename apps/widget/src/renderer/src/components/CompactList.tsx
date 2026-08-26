import { useLayoutEffect, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CalendarDays, ChevronDown, ChevronRight, CircleCheck, CornerDownRight, GripVertical, Plus } from "lucide-react";
import { groupTodosByParent, type DropZone, type List, type Todo } from "@to-do/shared";

const TODAY = new Date().toISOString().slice(0, 10);

export interface TodoDragData {
  todoId: string;
  listId: string;
  parentId: string | null;
  hasChildren: boolean;
}

function TodoRow({
  todo,
  listName,
  lists,
  hasChildren,
  expanded,
  onToggleExpand,
  dragZone,
  onToggle,
  onMove,
  onDelete,
  onUpdateDueDate,
  onUpdateTitle,
  onToggleAddSub,
  isChild = false,
}: {
  todo: Todo;
  listName: string;
  lists: List[];
  hasChildren: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  dragZone: DropZone | null;
  onToggle: (id: string, completed: boolean) => void;
  onMove: (todoId: string, targetListId: string) => void;
  onDelete: (todoId: string) => void;
  onUpdateDueDate: (todoId: string, dueDate: string | null) => void;
  onUpdateTitle: (todoId: string, title: string) => void;
  onToggleAddSub?: () => void;
  isChild?: boolean;
}) {
  const dragData: TodoDragData = {
    todoId: todo.id,
    listId: todo.list_id,
    parentId: todo.parent_id,
    hasChildren,
  };
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `todo:${todo.id}`,
    data: dragData,
  });
  const { setNodeRef: setDropRef } = useDroppable({ id: `todo:${todo.id}`, data: dragData });
  function setNodeRef(node: HTMLDivElement | null) {
    setDragRef(node);
    setDropRef(node);
  }

  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [dateEditing, setDateEditing] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(todo.title);
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

  // 拖曳中的視覺跟隨改由 DragOverlay 負責（見 App.tsx），這裡不要對原地的項目套用
  // transform：這個項目還留在 overflow-y-auto 的清單容器裡，瀏覽器算可捲動範圍時
  // 會把 transform 移動後的視覺位置也算進去，容器就會一直往拖曳方向「長」出新的可捲動空間，
  // 看起來像清單被無限往下/往右撐開。原地項目只淡出當提示，實際跟著游標的是另一份浮動預覽。
  const style = {
    opacity: isDragging ? 0.3 : 1,
  };

  const isOverdue = !!todo.due_date && !todo.is_completed && todo.due_date < TODAY;

  function commitTitle() {
    setTitleEditing(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== todo.title) {
      onUpdateTitle(todo.id, trimmed);
    } else {
      setTitleDraft(todo.title);
    }
  }

  return (
    <div className="relative">
      {/* 用絕對定位疊加的插入線，不佔文件流的空間，避免拖曳時項目因為線條出現/消失而跳動 */}
      {dragZone === "before" && (
        <div className="pointer-events-none absolute -top-[5px] right-0 left-0 z-10 mx-1 h-0.5 rounded-full bg-accent-500" />
      )}
      {dragZone === "after" && (
        <div className="pointer-events-none absolute -bottom-[5px] right-0 left-0 z-10 mx-1 h-0.5 rounded-full bg-accent-500" />
      )}

      <div
        ref={setNodeRef}
        style={style}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuPos({ x: e.clientX, y: e.clientY });
        }}
        className={`relative flex items-center gap-1.5 rounded-md border bg-white text-xs shadow-card ${
          dragZone === "nest" ? "border-accent-500 bg-accent-50 ring-2 ring-accent-300" : ""
        } ${isChild ? "border-neutral-100 px-1.5 py-1" : "border-neutral-200 px-2 py-1.5"}`}
      >
        {dragZone === "nest" && (
          <span className="absolute -top-2 right-2 flex items-center gap-0.5 rounded-full bg-accent-600 px-1.5 py-0.5 text-[9px] font-medium text-white shadow-popover">
            <CornerDownRight size={9} />
            變成子項目
          </span>
        )}

        {!isChild && hasChildren && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="shrink-0 text-neutral-400 hover:text-neutral-600"
            aria-label={expanded ? "收合子項目" : "展開子項目"}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        )}
        <span
          {...attributes}
          {...listeners}
          className="touch-none cursor-grab text-neutral-300 hover:text-neutral-400 active:cursor-grabbing"
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
          {titleEditing ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setTitleDraft(todo.title);
                  setTitleEditing(false);
                }
              }}
              className="w-full rounded border border-accent-300 px-1 outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setTitleEditing(true)}
              className={`block w-full truncate text-left ${todo.is_completed ? "text-neutral-400 line-through" : ""}`}
            >
              {todo.title}
            </button>
          )}
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
    </div>
  );
}

// DragOverlay 用的浮動預覽：只負責視覺跟隨游標，不需要任何互動或狀態。
export function TodoDragPreview({ todo }: { todo: Todo }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-accent-300 bg-white px-2 py-1.5 text-xs shadow-popover">
      <GripVertical size={13} className="shrink-0 text-neutral-300" />
      <input type="checkbox" checked={todo.is_completed} readOnly className="h-3.5 w-3.5 shrink-0 rounded" />
      <p className="min-w-0 flex-1 truncate">{todo.title}</p>
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
  dragOverState,
  onToggle,
  onMove,
  onDelete,
  onAddSub,
  onUpdateDueDate,
  onUpdateTitle,
}: {
  todos: Todo[];
  lists: List[];
  dragOverState: { todoId: string; zone: DropZone } | null;
  onToggle: (id: string, completed: boolean) => void;
  onMove: (todoId: string, targetListId: string) => void;
  onDelete: (todoId: string) => void;
  onAddSub: (parentTodo: Todo, title: string) => void;
  onUpdateDueDate: (todoId: string, dueDate: string | null) => void;
  onUpdateTitle: (todoId: string, title: string) => void;
}) {
  const listNameById = new Map(lists.map((l) => [l.id, l.name]));

  // 「全部」檢視會把所有清單的項目混在一起，原始 todos 是全域依 position 排序，
  // 不同清單的項目會因此交錯出現。改成先依清單分組（穩定排序，同清單內仍保留原本的
  // position 順序），畫面上才會一個清單一個清單分開顯示，不會混雜。
  const listOrder = new Map(lists.map((l, index) => [l.id, index]));
  const sortedTodos = [...todos].sort(
    (a, b) => (listOrder.get(a.list_id) ?? 0) - (listOrder.get(b.list_id) ?? 0),
  );
  const { topLevel, childrenByParentId } = groupTodosByParent(sortedTodos);
  const incompleteTop = topLevel.filter((t) => !t.is_completed);
  const completedTop = topLevel.filter((t) => t.is_completed);
  const [addingSubId, setAddingSubId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  function zoneFor(todoId: string): DropZone | null {
    return dragOverState?.todoId === todoId ? dragOverState.zone : null;
  }

  function toggleExpand(todoId: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(todoId)) {
        next.delete(todoId);
      } else {
        next.add(todoId);
      }
      return next;
    });
  }

  function renderItem(todo: Todo) {
    const children = childrenByParentId.get(todo.id) ?? [];
    const expanded = !collapsedIds.has(todo.id);
    return (
      <div key={todo.id} className="flex flex-col gap-1">
        <TodoRow
          todo={todo}
          listName={listNameById.get(todo.list_id) ?? ""}
          lists={lists}
          hasChildren={children.length > 0}
          expanded={expanded}
          onToggleExpand={() => toggleExpand(todo.id)}
          dragZone={zoneFor(todo.id)}
          onToggle={onToggle}
          onMove={onMove}
          onDelete={onDelete}
          onUpdateDueDate={onUpdateDueDate}
          onUpdateTitle={onUpdateTitle}
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
        {children.length > 0 && expanded && (
          <div className="ml-4 flex flex-col gap-1 border-l border-neutral-200 pl-2">
            {children.map((child) => (
              <TodoRow
                key={child.id}
                todo={child}
                listName={listNameById.get(child.list_id) ?? ""}
                lists={lists}
                hasChildren={false}
                dragZone={zoneFor(child.id)}
                onToggle={onToggle}
                onMove={onMove}
                onDelete={onDelete}
                onUpdateDueDate={onUpdateDueDate}
                onUpdateTitle={onUpdateTitle}
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

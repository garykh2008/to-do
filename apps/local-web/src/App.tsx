import { useRef, useState } from "react";
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { Menu } from "lucide-react";
import { resolveDropZone, type DropZone } from "@to-do/shared";
import { LocalDataProvider } from "./lib/localData";
import { useLists, useReorderTodo } from "./lib/queries";
import { DragOverContext, type DragOverState } from "./lib/dragOverContext";
import type { View } from "./lib/view";
import { Sidebar } from "./components/Sidebar";
import { AllListsView } from "./components/AllListsView";
import { TodoListView } from "./components/TodoListView";
import { CalendarGrid } from "./components/CalendarGrid";
import type { TodoDragData } from "./components/TodoItem";

interface ResolvedDragTarget {
  overTodoId: string;
  listId: string;
  parentId: string | null;
  zone: DropZone;
  canNest: boolean;
}

// 這個元件的拖曳邏輯是照 apps/web/components/AppShell.tsx 原封不動搬過來的
// （只有 collisionDetection 換成 pointerWithin——小工具那邊已經證實預設的 rectIntersection
// 在窄版面下常常框錯目標，這裡多這一道防呆沒有壞處）。
function Shell() {
  const { data: lists } = useLists();
  const reorderTodo = useReorderTodo();
  const [view, setView] = useState<View>({ type: "all" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragOverState, setDragOverState] = useState<DragOverState | null>(null);
  const dragTargetRef = useRef<ResolvedDragTarget | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function resolveTodoOverZone(event: DragMoveEvent): ResolvedDragTarget | null {
    const { active, over } = event;
    if (!over) return null;
    const overId = String(over.id);
    if (!overId.startsWith("todo:")) return null;

    const overTodoId = overId.slice("todo:".length);
    const activeData = active.data.current as TodoDragData | undefined;
    const overData = over.data.current as TodoDragData | undefined;
    if (!activeData || !overData) return null;
    if (overTodoId === activeData.todoId) return null;

    const canNest = overData.parentId === null && !activeData.hasChildren;
    const zone = resolveDropZone(active.rect.current.translated, over.rect, canNest);

    return { overTodoId, listId: overData.listId, parentId: overData.parentId, zone, canNest };
  }

  function handleDragMove(event: DragMoveEvent) {
    const resolved = resolveTodoOverZone(event);
    dragTargetRef.current = resolved;
    setDragOverState(resolved ? { todoId: resolved.overTodoId, zone: resolved.zone } : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const target = dragTargetRef.current;
    dragTargetRef.current = null;
    setDragOverState(null);

    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as TodoDragData | undefined;
    if (!activeData) return;
    const { todoId, listId: sourceListId, parentId: sourceParentId } = activeData;

    const overId = String(over.id);

    // 拖到側邊欄的清單上 -> 移到該清單頂層，附加到最後面
    if (overId.startsWith("list:")) {
      const targetListId = overId.slice("list:".length);
      if (targetListId === sourceListId && sourceParentId === null) return;
      reorderTodo.mutate({
        id: todoId,
        sourceListId,
        targetListId,
        targetParentId: null,
        anchorTodoId: null,
        anchorPosition: "after",
      });
      return;
    }

    if (!overId.startsWith("todo:")) return;
    if (!target || target.overTodoId !== overId.slice("todo:".length)) return;

    if (target.zone === "nest" && target.canNest) {
      reorderTodo.mutate({
        id: todoId,
        sourceListId,
        targetListId: target.listId,
        targetParentId: target.overTodoId,
        anchorTodoId: null,
        anchorPosition: "after",
      });
      return;
    }

    reorderTodo.mutate({
      id: todoId,
      sourceListId,
      targetListId: target.listId,
      targetParentId: target.parentId,
      anchorTodoId: target.overTodoId,
      anchorPosition: target.zone === "before" ? "before" : "after",
    });
  }

  const activeList = view.type === "list" ? lists.find((l) => l.id === view.listId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        dragTargetRef.current = null;
        setDragOverState(null);
      }}
    >
      <DragOverContext.Provider value={dragOverState}>
        <div className="flex min-h-screen">
          {sidebarOpen && (
            <button
              type="button"
              aria-label="關閉選單"
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-black/30 md:hidden"
            />
          )}

          <div
            className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar
              view={view}
              onNavigate={(next) => {
                setView(next);
                setSidebarOpen(false);
              }}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-3 py-2 md:hidden">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100"
                aria-label="開啟選單"
              >
                <Menu size={20} />
              </button>
              <span className="text-sm font-semibold text-neutral-800">TODO</span>
            </header>
            <main className="min-w-0 flex-1">
              {view.type === "all" && <AllListsView />}
              {view.type === "calendar" && <CalendarGrid />}
              {view.type === "list" && activeList && (
                <TodoListView listId={activeList.id} listName={activeList.name} />
              )}
            </main>
          </div>
        </div>
      </DragOverContext.Provider>
    </DndContext>
  );
}

export default function App() {
  return (
    <LocalDataProvider>
      <Shell />
    </LocalDataProvider>
  );
}

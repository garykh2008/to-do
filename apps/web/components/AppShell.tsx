"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { Menu } from "lucide-react";
import { resolveDropZone, type DropZone } from "@to-do/shared";
import { useReorderTodo } from "@/lib/queries";
import { useRealtimeSync } from "@/lib/useRealtimeSync";
import { DragOverContext, type DragOverState } from "@/lib/dragOverContext";
import { ListSidebar } from "./ListSidebar";
import type { TodoDragData } from "./TodoItem";

interface ResolvedDragTarget {
  overTodoId: string;
  listId: string;
  parentId: string | null;
  zone: DropZone;
  canNest: boolean;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
  const reorderTodo = useReorderTodo();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragOverState, setDragOverState] = useState<DragOverState | null>(null);
  // 用 ref 記住 onDragOver 最後一次算出來的目標：onDragEnd 一律直接用這個，絕對不會重新量測，
  // 保證使用者看到的插入線／巢狀化提示，跟放開後實際發生的動作百分之百一致。
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

  // onDragOver 只有在「碰撞到的目標換人」時才會觸發，滑鼠在同一個目標裡繼續移動
  // （例如從它下緣移到上緣）並不會讓插入線重新計算，畫面就會卡在第一次算出來的位置。
  // onDragMove 則是滑鼠每移動一次就觸發，搭配當下最新的碰撞結果重新算一次，才會即時跟著滑鼠位置更新。
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
    // target 是 onDragOver 最後一次算出來的（跟畫面上顯示的插入線/巢狀化提示同一份），
    // 這裡只確認它還是對應同一個目標項目，不會再重新用 event 自己的座標算一次。
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

  return (
    <DndContext
      sensors={sensors}
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
            <ListSidebar onNavigate={() => setSidebarOpen(false)} />
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
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </div>
      </DragOverContext.Provider>
    </DndContext>
  );
}

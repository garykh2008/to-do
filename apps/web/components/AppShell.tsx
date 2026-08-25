"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import type { Todo } from "@to-do/shared";
import { queryKeys, useReorderTodo } from "@/lib/queries";
import { useRealtimeSync } from "@/lib/useRealtimeSync";
import { resolveDropZone } from "@/lib/dndZones";
import { DragOverContext, type DragOverState } from "@/lib/dragOverContext";
import { ListSidebar } from "./ListSidebar";
import type { TodoDragData } from "./TodoItem";

export function AppShell({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
  const queryClient = useQueryClient();
  const reorderTodo = useReorderTodo();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragOverState, setDragOverState] = useState<DragOverState | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function resolveTodoOverZone(event: DragEndEvent | DragOverEvent) {
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

    return { overTodoId, overData, activeData, zone, canNest };
  }

  function handleDragOver(event: DragOverEvent) {
    const resolved = resolveTodoOverZone(event);
    setDragOverState(resolved ? { todoId: resolved.overTodoId, zone: resolved.zone } : null);
  }

  function handleDragEnd(event: DragEndEvent) {
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
        beforeId: null,
        afterId: null,
      });
      return;
    }

    const resolved = resolveTodoOverZone(event);
    if (!resolved) return;
    const { overTodoId, overData, zone, canNest } = resolved;
    const targetListId = overData.listId;

    if (zone === "nest" && canNest) {
      reorderTodo.mutate({
        id: todoId,
        sourceListId,
        targetListId,
        targetParentId: overTodoId,
        beforeId: null,
        afterId: null,
      });
      return;
    }

    // 排序：只在「同一個 parent + 同一個完成狀態」的兄弟項目之間排
    const targetParentId = overData.parentId;
    const todos = queryClient.getQueryData<Todo[]>(queryKeys.todosByList(targetListId)) ?? [];
    const siblings = todos.filter(
      (t) => t.parent_id === targetParentId && t.is_completed === overData.isCompleted && t.id !== todoId,
    );
    const overIndex = siblings.findIndex((t) => t.id === overTodoId);
    if (overIndex === -1) return;

    // zone === "before"：插在 over 項目前面；zone === "after"：插在 over 項目後面
    const beforeId = zone === "before" ? (siblings[overIndex - 1]?.id ?? null) : overTodoId;
    const afterId = zone === "before" ? overTodoId : (siblings[overIndex + 1]?.id ?? null);

    reorderTodo.mutate({ id: todoId, sourceListId, targetListId, targetParentId, beforeId, afterId });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragOverState(null)}
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

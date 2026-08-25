"use client";

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import type { Todo } from "@to-do/shared";
import { queryKeys, useReorderTodo } from "@/lib/queries";
import { useRealtimeSync } from "@/lib/useRealtimeSync";
import { ListSidebar } from "./ListSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
  const queryClient = useQueryClient();
  const reorderTodo = useReorderTodo();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as { todoId: string; listId: string } | undefined;
    if (!activeData) return;
    const { todoId, listId: sourceListId } = activeData;

    const overId = String(over.id);

    // 拖到側邊欄的清單上 -> 直接附加到該清單最後面
    if (overId.startsWith("list:")) {
      const targetListId = overId.slice("list:".length);
      if (targetListId === sourceListId) return;
      reorderTodo.mutate({ id: todoId, sourceListId, targetListId, beforeId: null, afterId: null });
      return;
    }

    // 拖到另一筆待辦事項上 -> 在同一份清單內重新排序
    if (overId.startsWith("todo:")) {
      const overTodoId = overId.slice("todo:".length);
      const overData = over.data.current as { todoId: string; listId: string } | undefined;
      const targetListId = overData?.listId ?? sourceListId;

      const todos = queryClient.getQueryData<Todo[]>(queryKeys.todosByList(targetListId)) ?? [];
      const incomplete = todos.filter((t) => !t.is_completed && t.id !== todoId);
      const overIndex = incomplete.findIndex((t) => t.id === overTodoId);
      if (overIndex === -1) return;

      const beforeId = incomplete[overIndex - 1]?.id ?? null;
      const afterId = incomplete[overIndex]?.id ?? null;

      reorderTodo.mutate({ id: todoId, sourceListId, targetListId, beforeId, afterId });
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex min-h-screen">
        <ListSidebar />
        <main className="flex-1">{children}</main>
      </div>
    </DndContext>
  );
}

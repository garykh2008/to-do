import { useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core";
import { LogOut } from "lucide-react";
import { resolveDropZone, type DropZone } from "@to-do/shared";
import { useAuth } from "./hooks/useAuth";
import { useTodoData } from "./hooks/useTodoData";
import { supabase } from "./lib/supabaseClient";
import { TitleBar } from "./components/TitleBar";
import { LoginForm } from "./components/LoginForm";
import { QuickAddBar } from "./components/QuickAddBar";
import { CompactList, type TodoDragData } from "./components/CompactList";
import { ListChips } from "./components/ListChips";

interface ResolvedDragTarget {
  overTodoId: string;
  listId: string;
  parentId: string | null;
  zone: DropZone;
  canNest: boolean;
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const {
    lists,
    todos,
    loading,
    addTodo,
    moveTodoToList,
    reorderTodo,
    toggleComplete,
    deleteTodo,
    addSubTodo,
    updateDueDate,
    updateTitle,
    addList,
    renameList,
    deleteList,
  } = useTodoData();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [dragOverState, setDragOverState] = useState<{ todoId: string; zone: DropZone } | null>(null);
  // 用 ref 記住 onDragMove 最後一次算出來的目標：onDragEnd 一律直接用這個，絕對不會重新量測，
  // 保證使用者看到的插入線／巢狀化提示，跟放開後實際發生的動作百分之百一致。
  const dragTargetRef = useRef<ResolvedDragTarget | null>(null);

  const visibleTodos = selectedListId ? todos.filter((t) => t.list_id === selectedListId) : todos;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
  // 並不會讓插入線重新計算；onDragMove 則是滑鼠每移動一次就觸發，才會即時跟著滑鼠位置更新。
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

    const overId = String(over.id);

    if (overId.startsWith("list:")) {
      const targetListId = overId.slice("list:".length);
      if (targetListId === activeData.listId && activeData.parentId === null) return;
      moveTodoToList(activeData.todoId, targetListId);
      return;
    }

    if (!overId.startsWith("todo:")) return;
    // target 是 onDragMove 最後一次算出來的（跟畫面上顯示的插入線/巢狀化提示同一份），
    // 這裡只確認它還是對應同一個目標項目，不會再重新用 event 自己的座標算一次。
    if (!target || target.overTodoId !== overId.slice("todo:".length)) return;

    if (target.zone === "nest" && target.canNest) {
      reorderTodo({
        id: activeData.todoId,
        targetListId: target.listId,
        targetParentId: target.overTodoId,
        anchorTodoId: null,
        anchorPosition: "after",
      });
      return;
    }

    reorderTodo({
      id: activeData.todoId,
      targetListId: target.listId,
      targetParentId: target.parentId,
      anchorTodoId: target.overTodoId,
      anchorPosition: target.zone === "before" ? "before" : "after",
    });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200">
      <TitleBar />

      {authLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">載入中…</div>
      ) : !user ? (
        <LoginForm />
      ) : (
        <DndContext
          sensors={sensors}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            dragTargetRef.current = null;
            setDragOverState(null);
          }}
        >
          <div className="flex flex-1 flex-col overflow-hidden border-t border-neutral-200">
            <QuickAddBar onAdd={addTodo} />
            {loading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">載入中…</div>
            ) : (
              <CompactList
                todos={visibleTodos}
                lists={lists}
                dragOverState={dragOverState}
                onToggle={toggleComplete}
                onMove={moveTodoToList}
                onDelete={deleteTodo}
                onAddSub={addSubTodo}
                onUpdateDueDate={updateDueDate}
                onUpdateTitle={updateTitle}
              />
            )}
            <ListChips
              lists={lists}
              selectedListId={selectedListId}
              onSelectList={setSelectedListId}
              onAddList={addList}
              onRenameList={renameList}
              onDeleteList={(listId) => {
                if (selectedListId === listId) setSelectedListId(null);
                deleteList(listId);
              }}
            />
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="flex items-center justify-center gap-1 border-t border-neutral-200 py-1.5 text-[11px] text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
            >
              <LogOut size={11} />
              登出
            </button>
          </div>
        </DndContext>
      )}
    </div>
  );
}

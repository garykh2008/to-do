import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { resolveDropZone, type DropZone, type Todo } from "@to-do/shared";
import { useAuth } from "./hooks/useAuth";
import { useLocalAuth } from "./hooks/useLocalAuth";
import { useTodoData } from "./hooks/useTodoData";
import { getSupabase } from "./lib/supabaseClient";
import { TitleBar } from "./components/TitleBar";
import { LoginForm } from "./components/LoginForm";
import { QuickAddBar } from "./components/QuickAddBar";
import { CompactList, TodoDragPreview, type TodoDragData } from "./components/CompactList";
import { ListChips } from "./components/ListChips";
import { HelpModal } from "./components/HelpModal";

interface ResolvedDragTarget {
  overTodoId: string;
  listId: string;
  parentId: string | null;
  zone: DropZone;
  canNest: boolean;
}

// 拖曳中 onDragMove 幾乎每個影格都會 setState 觸發整個 App 重新 render；
// 這個設定物件如果寫成 inline literal，每次 render 都會是新的參照，dnd-kit 內部
// 用來累加捲動量的邏輯會被這個「參照一直變」誤判成設定改變而不斷重置，
// 結果就是捲動量算飛掉、畫面看起來像無限往下/往右展開。搬到元件外面保持參照穩定。
const AUTO_SCROLL_OPTIONS = { threshold: { x: 0.3, y: 0.15 } };

// 跟 useTodoData 同一套道理：VITE_DATA_MODE 是 build 時就決定的常數，
// 在模組載入時選好要用哪個 auth hook 不會違反 React hooks 規則。
// 本機模式沒有登入流程，也不需要、不該去建立 Supabase client。
const IS_LOCAL_MODE = import.meta.env.VITE_DATA_MODE === "local";
const useAppAuth = IS_LOCAL_MODE ? useLocalAuth : useAuth;

export default function App() {
  const { user, loading: authLoading } = useAppAuth();
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeDragTodo, setActiveDragTodo] = useState<Todo | null>(null);
  const [dragOverState, setDragOverState] = useState<{ todoId: string; zone: DropZone } | null>(null);
  // 用 ref 記住 onDragMove 最後一次算出來的目標：onDragEnd 一律直接用這個，絕對不會重新量測，
  // 保證使用者看到的插入線／巢狀化提示，跟放開後實際發生的動作百分之百一致。
  const dragTargetRef = useRef<ResolvedDragTarget | null>(null);

  const visibleTodos = selectedListId ? todos.filter((t) => t.list_id === selectedListId) : todos;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function resolveTodoOverZone(event: DragMoveEvent): ResolvedDragTarget | null {
    // 「全部」檢視把不同清單的項目混在同一份列表裡，position 只在各自清單內才有意義，
    // 讓使用者在這裡拖曳排序/巢狀化，結果會混到別的清單裡去，觀感上很混亂。
    // 這個檢視下只保留「拖到清單標籤搬移」，項目對項目的排序/巢狀化整個關掉。
    if (selectedListId === null) return null;

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

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as TodoDragData | undefined;
    if (!data) return;
    setActiveDragTodo(todos.find((t) => t.id === data.todoId) ?? null);
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
    setActiveDragTodo(null);

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
    <div className="relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200">
      <TitleBar
        onHelp={() => setHelpOpen(true)}
        onLogout={IS_LOCAL_MODE ? undefined : () => getSupabase().auth.signOut()}
      />
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      {authLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">載入中…</div>
      ) : !user ? (
        <LoginForm />
      ) : (
        <DndContext
          sensors={sensors}
          // dnd-kit 預設的 rectIntersection 是拿「整個被拖曳項目的框」去跟每個 droppable 比重疊面積，
          // 不是看游標位置。項目本身（整列待辦事項）比清單標籤寬很多，抓取點又通常在項目左側，
          // 導致框住的高亮/命中的清單常常是游標右邊、跟項目重疊面積比較大的那個標籤，而不是游標真正在的那個。
          // 換成 pointerWithin：只看游標當下實際落在哪個 droppable 裡面，才會跟游標指到的標籤一致。
          collisionDetection={pointerWithin}
          // 底部清單標籤是橫向捲動區，視窗本身又窄，把水平的自動捲動觸發區加大，
          // 拖曳項目靠近標籤列左右邊緣時能自動捲到目標清單，不用中途放開再手動捲動。
          autoScroll={AUTO_SCROLL_OPTIONS}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            dragTargetRef.current = null;
            setDragOverState(null);
            setActiveDragTodo(null);
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
          </div>
          <DragOverlay>{activeDragTodo && <TodoDragPreview todo={activeDragTodo} />}</DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useAuth } from "./hooks/useAuth";
import { useTodoData } from "./hooks/useTodoData";
import { supabase } from "./lib/supabaseClient";
import { LoginForm } from "./components/LoginForm";
import { QuickAddBar } from "./components/QuickAddBar";
import { CompactList } from "./components/CompactList";
import { ListChips } from "./components/ListChips";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { lists, todos, loading, addTodo, moveTodoToList, toggleComplete } = useTodoData();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("list:")) return;

    const targetListId = overId.slice("list:".length);
    const data = active.data.current as { todoId: string; listId: string } | undefined;
    if (!data || data.listId === targetListId) return;

    moveTodoToList(data.todoId, targetListId);
  }

  if (authLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-neutral-400">載入中…</div>;
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full flex-col">
        <QuickAddBar onAdd={addTodo} />
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">載入中…</div>
        ) : (
          <CompactList todos={todos} lists={lists} onToggle={toggleComplete} onMove={moveTodoToList} />
        )}
        <ListChips lists={lists} />
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="border-t border-neutral-200 py-1 text-[10px] text-neutral-400 hover:text-neutral-600"
        >
          登出
        </button>
      </div>
    </DndContext>
  );
}

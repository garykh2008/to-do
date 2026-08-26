import { useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { LogOut } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { useTodoData } from "./hooks/useTodoData";
import { supabase } from "./lib/supabaseClient";
import { TitleBar } from "./components/TitleBar";
import { LoginForm } from "./components/LoginForm";
import { QuickAddBar } from "./components/QuickAddBar";
import { CompactList } from "./components/CompactList";
import { ListChips } from "./components/ListChips";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { lists, todos, loading, addTodo, moveTodoToList, toggleComplete, deleteTodo, addSubTodo, updateDueDate } =
    useTodoData();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const visibleTodos = selectedListId ? todos.filter((t) => t.list_id === selectedListId) : todos;

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

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200">
      <TitleBar />

      {authLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">載入中…</div>
      ) : !user ? (
        <LoginForm />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex flex-1 flex-col overflow-hidden border-t border-neutral-200">
            <QuickAddBar onAdd={addTodo} />
            {loading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">載入中…</div>
            ) : (
              <CompactList
                todos={visibleTodos}
                lists={lists}
                onToggle={toggleComplete}
                onMove={moveTodoToList}
                onDelete={deleteTodo}
                onAddSub={addSubTodo}
                onUpdateDueDate={updateDueDate}
              />
            )}
            <ListChips lists={lists} selectedListId={selectedListId} onSelectList={setSelectedListId} />
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

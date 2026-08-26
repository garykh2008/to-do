import { useCallback, useEffect, useState } from "react";
import { appendPosition, type List, type Todo } from "@to-do/shared";
import { supabase } from "../lib/supabaseClient";

export function useTodoData() {
  const [lists, setLists] = useState<List[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [{ data: listData }, { data: todoData }] = await Promise.all([
      supabase.from("lists").select("*").order("position", { ascending: true }),
      supabase.from("todos").select("*").order("position", { ascending: true }),
    ]);
    setLists(listData ?? []);
    setTodos(todoData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();

    const channel = supabase
      .channel("widget-todo-realtime")
      .on("postgres_changes", { event: "*", schema: "todo", table: "lists" }, reload)
      .on("postgres_changes", { event: "*", schema: "todo", table: "todos" }, reload)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  const inboxList = lists.find((l) => l.is_inbox) ?? null;

  const addTodo = useCallback(
    async (title: string, dueDate: string | null) => {
      if (!inboxList) return;
      const inboxTodos = todos.filter((t) => t.list_id === inboxList.id);
      const lastPosition = inboxTodos.length ? Math.max(...inboxTodos.map((t) => t.position)) : null;
      await supabase.from("todos").insert({
        list_id: inboxList.id,
        title,
        due_date: dueDate,
        position: appendPosition(lastPosition),
      });
      reload();
    },
    [inboxList, todos, reload],
  );

  const moveTodoToList = useCallback(
    async (todoId: string, targetListId: string) => {
      const targetTodos = todos.filter((t) => t.list_id === targetListId);
      const lastPosition = targetTodos.length ? Math.max(...targetTodos.map((t) => t.position)) : null;
      await supabase
        .from("todos")
        .update({ list_id: targetListId, position: appendPosition(lastPosition) })
        .eq("id", todoId);
      reload();
    },
    [todos, reload],
  );

  const toggleComplete = useCallback(
    async (todoId: string, isCompleted: boolean) => {
      await supabase
        .from("todos")
        .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
        .eq("id", todoId);
      reload();
    },
    [reload],
  );

  const deleteTodo = useCallback(
    async (todoId: string) => {
      await supabase.from("todos").delete().eq("id", todoId);
      reload();
    },
    [reload],
  );

  const addSubTodo = useCallback(
    async (parentTodo: Todo, title: string) => {
      const siblings = todos.filter((t) => t.parent_id === parentTodo.id);
      const lastPosition = siblings.length ? Math.max(...siblings.map((t) => t.position)) : null;
      await supabase.from("todos").insert({
        list_id: parentTodo.list_id,
        parent_id: parentTodo.id,
        title,
        position: appendPosition(lastPosition),
      });
      reload();
    },
    [todos, reload],
  );

  const updateDueDate = useCallback(
    async (todoId: string, dueDate: string | null) => {
      await supabase.from("todos").update({ due_date: dueDate }).eq("id", todoId);
      reload();
    },
    [reload],
  );

  return {
    lists,
    todos,
    loading,
    inboxList,
    addTodo,
    moveTodoToList,
    toggleComplete,
    deleteTodo,
    addSubTodo,
    updateDueDate,
  };
}

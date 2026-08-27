import { useCallback, useEffect, useState } from "react";
import { appendPosition, reorderTodo as reorderTodoInDb, type List, type Todo } from "@to-do/shared";
import { getSupabase } from "../lib/supabaseClient";
import type { TodoDataApi } from "./todoDataTypes";

export function useSupabaseTodoData(): TodoDataApi {
  const [lists, setLists] = useState<List[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data: listData }, { data: todoData }] = await Promise.all([
      supabase.from("lists").select("*").order("position", { ascending: true }),
      supabase.from("todos").select("*").order("position", { ascending: true }),
    ]);
    setLists(listData ?? []);
    setTodos(todoData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
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
    async (title: string, dueDate: string | null, listId?: string) => {
      const targetListId = listId ?? inboxList?.id;
      if (!targetListId) return;
      const targetTodos = todos.filter((t) => t.list_id === targetListId);
      const lastPosition = targetTodos.length ? Math.max(...targetTodos.map((t) => t.position)) : null;
      await getSupabase()
        .from("todos")
        .insert({
          list_id: targetListId,
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
      // 搬到別的清單一律變回頂層項目：parent_id 指向的父項目留在原清單，
      // 跨清單還讓它們維持親子關係沒有意義，也會讓 groupTodosByParent 找不到同清單的父鏈。
      const targetTopLevelTodos = todos.filter((t) => t.list_id === targetListId && !t.parent_id);
      const lastPosition = targetTopLevelTodos.length
        ? Math.max(...targetTopLevelTodos.map((t) => t.position))
        : null;
      await getSupabase()
        .from("todos")
        .update({ list_id: targetListId, parent_id: null, position: appendPosition(lastPosition) })
        .eq("id", todoId);
      reload();
    },
    [todos, reload],
  );

  const reorderTodo = useCallback(
    async (params: {
      id: string;
      targetListId: string;
      targetParentId: string | null;
      anchorTodoId: string | null;
      anchorPosition: "before" | "after";
    }) => {
      try {
        await reorderTodoInDb(getSupabase(), params);
      } catch (error) {
        console.error("[reorderTodo] 拖曳排序/巢狀化失敗：", error, params);
      }
      reload();
    },
    [reload],
  );

  const toggleComplete = useCallback(
    async (todoId: string, isCompleted: boolean) => {
      await getSupabase()
        .from("todos")
        .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
        .eq("id", todoId);
      reload();
    },
    [reload],
  );

  const deleteTodo = useCallback(
    async (todoId: string) => {
      await getSupabase().from("todos").delete().eq("id", todoId);
      reload();
    },
    [reload],
  );

  const addSubTodo = useCallback(
    async (parentTodo: Todo, title: string) => {
      const siblings = todos.filter((t) => t.parent_id === parentTodo.id);
      const lastPosition = siblings.length ? Math.max(...siblings.map((t) => t.position)) : null;
      await getSupabase()
        .from("todos")
        .insert({
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
      await getSupabase().from("todos").update({ due_date: dueDate }).eq("id", todoId);
      reload();
    },
    [reload],
  );

  const updateTitle = useCallback(
    async (todoId: string, title: string) => {
      await getSupabase().from("todos").update({ title }).eq("id", todoId);
      reload();
    },
    [reload],
  );

  const addList = useCallback(
    async (name: string) => {
      const lastPosition = lists.length ? Math.max(...lists.map((l) => l.position)) : null;
      await getSupabase()
        .from("lists")
        .insert({ name, position: appendPosition(lastPosition) });
      reload();
    },
    [lists, reload],
  );

  const renameList = useCallback(
    async (listId: string, name: string) => {
      await getSupabase().from("lists").update({ name }).eq("id", listId);
      reload();
    },
    [reload],
  );

  const deleteList = useCallback(
    async (listId: string) => {
      await getSupabase().from("lists").delete().eq("id", listId);
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
    reorderTodo,
    toggleComplete,
    deleteTodo,
    addSubTodo,
    updateDueDate,
    updateTitle,
    addList,
    renameList,
    deleteList,
  };
}

import { useCallback, useEffect, useState } from "react";
import type { List, Todo } from "@to-do/shared";
import type { TodoDataApi } from "./todoDataTypes";

/**
 * 本機模式的實際資料狀態跟業務邏輯都在 main process 的 localDataEngine 裡（本機瀏覽器頁面
 * 走 HTTP 打同一份 engine，兩邊看到、寫入的是同一份資料）。這個 hook 只是薄薄一層：
 * 每個操作發一個 IPC，main process 回傳完整的最新 {lists, todos} 就直接套用到畫面。
 */
export function useLocalTodoData(): TodoDataApi {
  const [lists, setLists] = useState<List[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  function applyState(state: { lists: List[]; todos: Todo[] }) {
    setLists(state.lists);
    setTodos(state.todos);
  }

  useEffect(() => {
    window.localStore.getState().then((state) => {
      applyState(state);
      setLoading(false);
    });

    // 資料在別的地方被改動時（系統匣匯入、本機瀏覽器頁面透過 HTTP API 改資料）同步過來，
    // 不用手動重新整理視窗。
    return window.localStore.onChanged(applyState);
  }, []);

  const inboxList = lists.find((l) => l.is_inbox) ?? null;

  const addTodo = useCallback(async (title: string, dueDate: string | null, listId?: string) => {
    applyState(await window.localStore.addTodo(title, dueDate, listId));
  }, []);

  const moveTodoToList = useCallback(async (todoId: string, targetListId: string) => {
    applyState(await window.localStore.moveTodoToList(todoId, targetListId));
  }, []);

  const reorderTodo = useCallback(
    async (params: {
      id: string;
      targetListId: string;
      targetParentId: string | null;
      anchorTodoId: string | null;
      anchorPosition: "before" | "after";
    }) => {
      applyState(await window.localStore.reorderTodo(params));
    },
    [],
  );

  const toggleComplete = useCallback(async (todoId: string, isCompleted: boolean) => {
    applyState(await window.localStore.toggleComplete(todoId, isCompleted));
  }, []);

  const deleteTodo = useCallback(async (todoId: string) => {
    applyState(await window.localStore.deleteTodo(todoId));
  }, []);

  const addSubTodo = useCallback(async (parentTodo: Todo, title: string) => {
    applyState(await window.localStore.addSubTodo(parentTodo.id, title));
  }, []);

  const updateDueDate = useCallback(async (todoId: string, dueDate: string | null) => {
    applyState(await window.localStore.updateDueDate(todoId, dueDate));
  }, []);

  const updateTitle = useCallback(async (todoId: string, title: string) => {
    applyState(await window.localStore.updateTitle(todoId, title));
  }, []);

  const addList = useCallback(async (name: string) => {
    applyState(await window.localStore.addList(name));
  }, []);

  const renameList = useCallback(async (listId: string, name: string) => {
    applyState(await window.localStore.renameList(listId, name));
  }, []);

  const deleteList = useCallback(async (listId: string) => {
    applyState(await window.localStore.deleteList(listId));
  }, []);

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

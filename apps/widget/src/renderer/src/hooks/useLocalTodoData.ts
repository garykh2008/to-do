import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendPosition,
  firstPosition,
  reorderTodoCore,
  type List,
  type Todo,
  type TodoPositionSource,
} from "@to-do/shared";
import type { TodoDataApi } from "./todoDataTypes";

// 本機模式沒有登入、沒有多使用者概念，這個欄位純粹是資料形狀相容線上模式的 Todo/List 型別要求。
const LOCAL_USER_ID = "local";

function nowIso(): string {
  return new Date().toISOString();
}

function newList(name: string, position: number, isInbox = false): List {
  return {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    name,
    color: null,
    is_inbox: isInbox,
    position,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

function newTodo(input: { listId: string; parentId?: string | null; title: string; dueDate?: string | null; position: number }): Todo {
  return {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    list_id: input.listId,
    parent_id: input.parentId ?? null,
    title: input.title,
    notes: null,
    is_completed: false,
    completed_at: null,
    due_date: input.dueDate ?? null,
    position: input.position,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

export function useLocalTodoData(): TodoDataApi {
  const [lists, setLists] = useState<List[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  // 用 ref 保存「當下最新」的陣列，讓同一次操作內連續好幾步的讀寫（例如 reorderTodo 的
  // renumber）都能立刻看到彼此的結果，不用等 React state 真的更新完、也不會因為 closure
  // 抓到舊的 state 而算錯。每次修改後才把 ref 同步回 state 觸發畫面重新渲染。
  const listsRef = useRef<List[]>([]);
  const todosRef = useRef<Todo[]>([]);

  const persist = useCallback(async () => {
    await window.localStore.save({ lists: listsRef.current, todos: todosRef.current });
    setLists([...listsRef.current]);
    setTodos([...todosRef.current]);
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await window.localStore.load();
      if (stored) {
        listsRef.current = stored.lists;
        todosRef.current = stored.todos;
      } else {
        // 第一次啟動，沒有任何資料檔：比照 Supabase 版的預設狀態，先建一個 Inbox 清單。
        listsRef.current = [newList("Inbox", firstPosition(), true)];
        todosRef.current = [];
        await window.localStore.save({ lists: listsRef.current, todos: todosRef.current });
      }
      setLists([...listsRef.current]);
      setTodos([...todosRef.current]);
      setLoading(false);
    })();

    // 使用者可能從系統匣選單「匯入資料」，那個流程完全在 main process 裡完成
    // （跳對話框、覆蓋掉本機檔案），這裡負責把匯入結果同步進畫面，不用整個視窗重開。
    return window.localStore.onImported((data) => {
      listsRef.current = data.lists;
      todosRef.current = data.todos;
      setLists(data.lists);
      setTodos(data.todos);
    });
  }, []);

  const inboxList = lists.find((l) => l.is_inbox) ?? null;

  const addTodo = useCallback(
    async (title: string, dueDate: string | null) => {
      const inbox = listsRef.current.find((l) => l.is_inbox);
      if (!inbox) return;
      const siblings = todosRef.current.filter((t) => t.list_id === inbox.id && !t.parent_id);
      const lastPosition = siblings.length ? Math.max(...siblings.map((t) => t.position)) : null;
      todosRef.current = [
        ...todosRef.current,
        newTodo({ listId: inbox.id, title, dueDate, position: appendPosition(lastPosition) }),
      ];
      await persist();
    },
    [persist],
  );

  const moveTodoToList = useCallback(
    async (todoId: string, targetListId: string) => {
      const targetTopLevel = todosRef.current.filter((t) => t.list_id === targetListId && !t.parent_id);
      const lastPosition = targetTopLevel.length ? Math.max(...targetTopLevel.map((t) => t.position)) : null;
      const position = appendPosition(lastPosition);
      todosRef.current = todosRef.current.map((t) =>
        t.id === todoId ? { ...t, list_id: targetListId, parent_id: null, position, updated_at: nowIso() } : t,
      );
      await persist();
    },
    [persist],
  );

  const reorderTodo = useCallback(
    async (params: {
      id: string;
      targetListId: string;
      targetParentId: string | null;
      anchorTodoId: string | null;
      anchorPosition: "before" | "after";
    }) => {
      const source: TodoPositionSource = {
        async getParentId(todoId) {
          const todo = todosRef.current.find((t) => t.id === todoId);
          if (!todo) throw new Error(`todo not found: ${todoId}`);
          return todo.parent_id;
        },
        async countChildren(parentId) {
          return todosRef.current.filter((t) => t.parent_id === parentId).length;
        },
        async getSiblings(listId, parentId) {
          return todosRef.current
            .filter((t) => t.list_id === listId && t.parent_id === parentId)
            .sort((a, b) => a.position - b.position)
            .map((t) => ({ id: t.id, position: t.position }));
        },
        async setPosition(todoId, position) {
          todosRef.current = todosRef.current.map((t) => (t.id === todoId ? { ...t, position } : t));
        },
        async moveTodo(todoId, changes) {
          todosRef.current = todosRef.current.map((t) =>
            t.id === todoId
              ? { ...t, list_id: changes.listId, parent_id: changes.parentId, position: changes.position, updated_at: nowIso() }
              : t,
          );
        },
      };

      try {
        await reorderTodoCore(source, params);
      } catch (error) {
        console.error("[reorderTodo] 拖曳排序/巢狀化失敗：", error, params);
      }
      await persist();
    },
    [persist],
  );

  const toggleComplete = useCallback(
    async (todoId: string, isCompleted: boolean) => {
      todosRef.current = todosRef.current.map((t) =>
        t.id === todoId
          ? { ...t, is_completed: isCompleted, completed_at: isCompleted ? nowIso() : null, updated_at: nowIso() }
          : t,
      );
      await persist();
    },
    [persist],
  );

  const deleteTodo = useCallback(
    async (todoId: string) => {
      // 跟資料庫的 on delete cascade 一樣：刪掉一個項目，它的子項目（僅一層）要一起刪掉。
      todosRef.current = todosRef.current.filter((t) => t.id !== todoId && t.parent_id !== todoId);
      await persist();
    },
    [persist],
  );

  const addSubTodo = useCallback(
    async (parentTodo: Todo, title: string) => {
      const siblings = todosRef.current.filter((t) => t.parent_id === parentTodo.id);
      const lastPosition = siblings.length ? Math.max(...siblings.map((t) => t.position)) : null;
      todosRef.current = [
        ...todosRef.current,
        newTodo({
          listId: parentTodo.list_id,
          parentId: parentTodo.id,
          title,
          position: appendPosition(lastPosition),
        }),
      ];
      await persist();
    },
    [persist],
  );

  const updateDueDate = useCallback(
    async (todoId: string, dueDate: string | null) => {
      todosRef.current = todosRef.current.map((t) =>
        t.id === todoId ? { ...t, due_date: dueDate, updated_at: nowIso() } : t,
      );
      await persist();
    },
    [persist],
  );

  const updateTitle = useCallback(
    async (todoId: string, title: string) => {
      todosRef.current = todosRef.current.map((t) => (t.id === todoId ? { ...t, title, updated_at: nowIso() } : t));
      await persist();
    },
    [persist],
  );

  const addList = useCallback(
    async (name: string) => {
      const lastPosition = listsRef.current.length ? Math.max(...listsRef.current.map((l) => l.position)) : null;
      listsRef.current = [...listsRef.current, newList(name, appendPosition(lastPosition))];
      await persist();
    },
    [persist],
  );

  const renameList = useCallback(
    async (listId: string, name: string) => {
      listsRef.current = listsRef.current.map((l) => (l.id === listId ? { ...l, name, updated_at: nowIso() } : l));
      await persist();
    },
    [persist],
  );

  const deleteList = useCallback(
    async (listId: string) => {
      // 跟資料庫的 on delete cascade 一樣：刪清單要連裡面的待辦事項一起刪掉。
      listsRef.current = listsRef.current.filter((l) => l.id !== listId);
      todosRef.current = todosRef.current.filter((t) => t.list_id !== listId);
      await persist();
    },
    [persist],
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

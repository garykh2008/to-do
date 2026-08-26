"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  INBOX_LIST_NAME,
  appendPosition,
  reorderTodo as reorderTodoInDb,
  type List,
  type Todo,
  type TodoUpdate,
} from "@to-do/shared";
import { createClient } from "./supabase/client";

export const queryKeys = {
  lists: ["lists"] as const,
  todosByList: (listId: string) => ["todos", "list", listId] as const,
  allTodos: ["todos", "all"] as const,
  todosInRange: (start: string, end: string) => ["todos", "range", start, end] as const,
};

// ---- Lists -----------------------------------------------------------

export function useLists() {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.lists,
    queryFn: async () => {
      const { data, error } = await supabase.from("lists").select("*").order("position", { ascending: true });
      if (error) throw error;
      return data as List[];
    },
  });
}

export function useAddList() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const lists = queryClient.getQueryData<List[]>(queryKeys.lists) ?? [];
      const lastPosition = lists.length ? Math.max(...lists.map((l) => l.position)) : null;
      const { data, error } = await supabase
        .from("lists")
        .insert({ name, position: appendPosition(lastPosition) })
        .select()
        .single();
      if (error) throw error;
      return data as List;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.lists }),
    onError: (error) => console.error("[useAddList] 新增清單失敗：", error),
  });
}

export function useRenameList() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("lists").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.lists }),
    onError: (error) => console.error("[useRenameList] 重新命名清單失敗：", error),
  });
}

export function useDeleteList() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.lists }),
    onError: (error) => console.error("[useDeleteList] 刪除清單失敗：", error),
  });
}

// ---- Todos -------------------------------------------------------------

export function useTodos(listId: string | undefined) {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.todosByList(listId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("list_id", listId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as Todo[];
    },
    enabled: !!listId,
  });
}

/** 「所有清單」頁用：一次抓這個使用者名下所有清單的待辦事項，畫面上再依 list_id 分組顯示 */
export function useAllTodos() {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.allTodos,
    queryFn: async () => {
      const { data, error } = await supabase.from("todos").select("*").order("position", { ascending: true });
      if (error) throw error;
      return data as Todo[];
    },
  });
}

export function useTodosInRange(startDate: string, endDate: string) {
  const supabase = createClient();
  return useQuery({
    queryKey: queryKeys.todosInRange(startDate, endDate),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .gte("due_date", startDate)
        .lte("due_date", endDate)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as Todo[];
    },
  });
}

export function useAddTodo() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listId,
      title,
      dueDate,
      parentId = null,
    }: {
      listId: string;
      title: string;
      dueDate?: string | null;
      parentId?: string | null;
    }) => {
      const todos = queryClient.getQueryData<Todo[]>(queryKeys.todosByList(listId)) ?? [];
      const siblings = todos.filter((t) => t.parent_id === parentId);
      const lastPosition = siblings.length ? Math.max(...siblings.map((t) => t.position)) : null;
      const { data, error } = await supabase
        .from("todos")
        .insert({
          list_id: listId,
          parent_id: parentId,
          title,
          due_date: dueDate ?? null,
          position: appendPosition(lastPosition),
        })
        .select()
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todosByList(variables.listId) });
    },
    onError: (error) => console.error("[useAddTodo] 新增待辦事項失敗：", error),
  });
}

export function useUpdateTodo() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 只用來讓 onSuccess 知道要 invalidate 哪個 query key
      listId,
      ...changes
    }: { id: string; listId: string } & Partial<
      Pick<Todo, "title" | "notes" | "due_date" | "is_completed">
    >) => {
      const payload: TodoUpdate = { ...changes };
      if (typeof changes.is_completed === "boolean") {
        payload.completed_at = changes.is_completed ? new Date().toISOString() : null;
      }
      const { error } = await supabase.from("todos").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todosByList(variables.listId) });
    },
    onError: (error) => console.error("[useUpdateTodo] 更新待辦事項失敗：", error),
  });
}

export function useDeleteTodo() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; listId: string }) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todosByList(variables.listId) });
    },
    onError: (error) => console.error("[useDeleteTodo] 刪除待辦事項失敗：", error),
  });
}

/**
 * 拖曳排序/跨清單移動/巢狀化共用的 mutation。核心邏輯在 [[reorderTodo]]（packages/shared），
 * 網頁版跟小工具共用同一份實作；這裡只負責接上 react-query 的 cache invalidation。
 */
export function useReorderTodo() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      sourceListId: string;
      targetListId: string;
      targetParentId: string | null;
      anchorTodoId: string | null;
      anchorPosition: "before" | "after";
    }) => {
      await reorderTodoInDb(supabase, params);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todosByList(variables.sourceListId) });
      if (variables.targetListId !== variables.sourceListId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.todosByList(variables.targetListId) });
      }
    },
    onError: (error, variables) => {
      // react-query 預設不會把 mutate() 的錯誤丟出來或印出來，拖曳失敗時使用者/開發者
      // 完全看不到發生什麼事，只會覺得「拖了沒反應」。先印到 console 方便除錯。
      console.error("[useReorderTodo] 拖曳排序/巢狀化失敗：", error, variables);
    },
  });
}

export { INBOX_LIST_NAME };

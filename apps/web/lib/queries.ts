"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  INBOX_LIST_NAME,
  appendPosition,
  insertBetweenPosition,
  renumberPositions,
  type List,
  type Todo,
  type TodoUpdate,
} from "@to-do/shared";
import { createClient } from "./supabase/client";

export const queryKeys = {
  lists: ["lists"] as const,
  todosByList: (listId: string) => ["todos", "list", listId] as const,
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
 * 拖曳排序/跨清單移動/巢狀化共用的 mutation。
 * anchorTodoId/anchorPosition 描述「要插在哪個項目的前面或後面」（anchorTodoId 傳 null 代表附加到最後）；
 * 實際的 beforeId/afterId 一律從這裡重新查詢 Supabase 的最新順序反推，不依賴前端快取算 —
 * 前端快取可能還沒吃到上一次操作的結果，用它算鄰居會找不到、直接整個排序動作沒反應。
 * targetParentId 傳 null 代表移到頂層；傳某個 todo id 代表變成該 todo 的子項目。
 */
export function useReorderTodo() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      targetListId,
      targetParentId,
      anchorTodoId,
      anchorPosition,
    }: {
      id: string;
      sourceListId: string;
      targetListId: string;
      targetParentId: string | null;
      anchorTodoId: string | null;
      anchorPosition: "before" | "after";
    }) => {
      // 巢狀化之前用最新資料重新驗證一次，避免拖曳快取還沒更新完就連續操作，
      // 造成循環參照（例如兩個項目互為彼此的子項目）—— 這種資料一旦寫進去，
      // 兩個項目都會因為「父鏈找不到頂層」而從畫面上完全消失。
      if (targetParentId !== null) {
        if (targetParentId === id) {
          throw new Error("不能把項目拖到自己身上");
        }
        const { data: targetRow, error: targetError } = await supabase
          .from("todos")
          .select("parent_id")
          .eq("id", targetParentId)
          .single();
        if (targetError) throw targetError;
        if (targetRow.parent_id !== null) {
          throw new Error("目標項目已經是子項目，不能再巢狀化");
        }
        const { count, error: childError } = await supabase
          .from("todos")
          .select("id", { count: "exact", head: true })
          .eq("parent_id", id);
        if (childError) throw childError;
        if ((count ?? 0) > 0) {
          throw new Error("這個項目已經有子項目，不能再變成別人的子項目");
        }
      }

      let siblingsQuery = supabase
        .from("todos")
        .select("id, position")
        .eq("list_id", targetListId)
        .order("position", { ascending: true });
      siblingsQuery =
        targetParentId === null ? siblingsQuery.is("parent_id", null) : siblingsQuery.eq("parent_id", targetParentId);
      const { data: siblings, error: fetchError } = await siblingsQuery;
      if (fetchError) throw fetchError;

      const others = (siblings ?? []).filter((t) => t.id !== id);

      // 用「剛從資料庫查回來的」順序反推 beforeId/afterId，而不是相信呼叫端傳進來的猜測
      let beforeId: string | null = null;
      let afterId: string | null = null;
      if (anchorTodoId) {
        const anchorIndex = others.findIndex((t) => t.id === anchorTodoId);
        if (anchorIndex !== -1) {
          if (anchorPosition === "before") {
            beforeId = others[anchorIndex - 1]?.id ?? null;
            afterId = anchorTodoId;
          } else {
            beforeId = anchorTodoId;
            afterId = others[anchorIndex + 1]?.id ?? null;
          }
        }
      }

      const before = beforeId ? (others.find((t) => t.id === beforeId)?.position ?? null) : null;
      const after = afterId ? (others.find((t) => t.id === afterId)?.position ?? null) : null;

      let targetPosition: number;
      if (before === null && after === null) {
        const last = others.at(-1);
        targetPosition = appendPosition(last?.position ?? null);
      } else {
        const { position, needsRenumber } = insertBetweenPosition(before, after);
        if (needsRenumber) {
          const renumbered = renumberPositions(others);
          for (const { item, position: pos } of renumbered) {
            const { error } = await supabase.from("todos").update({ position: pos }).eq("id", item.id);
            if (error) throw error;
          }
          const newBefore = beforeId ? (renumbered.find((r) => r.item.id === beforeId)?.position ?? null) : null;
          const newAfter = afterId ? (renumbered.find((r) => r.item.id === afterId)?.position ?? null) : null;
          targetPosition = insertBetweenPosition(newBefore, newAfter).position;
        } else {
          targetPosition = position;
        }
      }

      const { error } = await supabase
        .from("todos")
        .update({ list_id: targetListId, parent_id: targetParentId, position: targetPosition })
        .eq("id", id);
      if (error) throw error;
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

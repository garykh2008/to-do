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
    }: {
      listId: string;
      title: string;
      dueDate?: string | null;
    }) => {
      const todos = queryClient.getQueryData<Todo[]>(queryKeys.todosByList(listId)) ?? [];
      const lastPosition = todos.length ? Math.max(...todos.map((t) => t.position)) : null;
      const { data, error } = await supabase
        .from("todos")
        .insert({
          list_id: listId,
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
  });
}

/**
 * 拖曳排序/跨清單移動共用的 mutation。
 * beforeId/afterId 是「移動後」在目標清單中緊鄰的待辦事項 id（沒有則傳 null），
 * 每次都直接向 Supabase 重新查詢目標清單目前的實際順序，避免依賴前端快取的舊資料算錯 position。
 */
export function useReorderTodo() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      targetListId,
      beforeId,
      afterId,
    }: {
      id: string;
      sourceListId: string;
      targetListId: string;
      beforeId: string | null;
      afterId: string | null;
    }) => {
      const { data: siblings, error: fetchError } = await supabase
        .from("todos")
        .select("id, position")
        .eq("list_id", targetListId)
        .order("position", { ascending: true });
      if (fetchError) throw fetchError;

      const others = (siblings ?? []).filter((t) => t.id !== id);
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
        .update({ list_id: targetListId, position: targetPosition })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todosByList(variables.sourceListId) });
      if (variables.targetListId !== variables.sourceListId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.todosByList(variables.targetListId) });
      }
    },
  });
}

export { INBOX_LIST_NAME };

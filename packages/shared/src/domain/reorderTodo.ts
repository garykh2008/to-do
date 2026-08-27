import type { TodoSupabaseClient } from "../supabase/createClient";
import { appendPosition, insertBetweenPosition, renumberPositions } from "./reorder";

export interface ReorderTodoParams {
  id: string;
  targetListId: string;
  /** null = 移到頂層；某個 todo id = 變成該 todo 的子項目 */
  targetParentId: string | null;
  /** 要插在哪個項目的前面或後面；null = 附加到最後 */
  anchorTodoId: string | null;
  anchorPosition: "before" | "after";
}

/**
 * reorderTodoCore 需要的最小資料存取介面。Supabase（網頁版/小工具線上模式）跟本機檔案
 * （小工具本機模式）各自實作一份，排序演算法本身（見 reorderTodoCore）完全共用，
 * 不用為了兩種儲存方式各寫一份巢狀化/位置計算邏輯。
 */
export interface TodoPositionSource {
  /** 找不到該筆 todo 時要 throw，跟原本 Supabase `.single()` 找不到列會回傳 error 的行為一致 */
  getParentId(todoId: string): Promise<string | null>;
  countChildren(parentId: string): Promise<number>;
  /** 依 position 由小到大排序 */
  getSiblings(listId: string, parentId: string | null): Promise<{ id: string; position: number }[]>;
  setPosition(todoId: string, position: number): Promise<void>;
  moveTodo(todoId: string, changes: { listId: string; parentId: string | null; position: number }): Promise<void>;
}

/**
 * 拖曳排序/跨清單移動/巢狀化共用的核心邏輯，網頁版跟小工具（不管線上還是本機模式）都呼叫這個函式。
 * beforeId/afterId 一律從這裡重新查詢最新順序反推，不依賴呼叫端快取算 ——
 * 呼叫端快取可能還沒吃到上一次操作的結果，用它算鄰居會找不到、直接整個排序動作沒反應。
 */
export async function reorderTodoCore(source: TodoPositionSource, params: ReorderTodoParams): Promise<void> {
  const { id, targetListId, targetParentId, anchorTodoId, anchorPosition } = params;

  // 巢狀化之前用最新資料重新驗證一次，避免拖曳快取還沒更新完就連續操作，
  // 造成循環參照（例如兩個項目互為彼此的子項目）—— 這種資料一旦寫進去，
  // 兩個項目都會因為「父鏈找不到頂層」而從畫面上完全消失。
  if (targetParentId !== null) {
    if (targetParentId === id) {
      throw new Error("不能把項目拖到自己身上");
    }
    const targetParentParentId = await source.getParentId(targetParentId);
    if (targetParentParentId !== null) {
      throw new Error("目標項目已經是子項目，不能再巢狀化");
    }
    const childCount = await source.countChildren(id);
    if (childCount > 0) {
      throw new Error("這個項目已經有子項目，不能再變成別人的子項目");
    }
  }

  const siblings = await source.getSiblings(targetListId, targetParentId);
  const others = siblings.filter((t) => t.id !== id);

  // 用「剛查回來的」順序反推 beforeId/afterId，而不是相信呼叫端傳進來的猜測
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
        await source.setPosition(item.id, pos);
      }
      const newBefore = beforeId ? (renumbered.find((r) => r.item.id === beforeId)?.position ?? null) : null;
      const newAfter = afterId ? (renumbered.find((r) => r.item.id === afterId)?.position ?? null) : null;
      targetPosition = insertBetweenPosition(newBefore, newAfter).position;
    } else {
      targetPosition = position;
    }
  }

  await source.moveTodo(id, { listId: targetListId, parentId: targetParentId, position: targetPosition });
}

export function createSupabaseTodoPositionSource(supabase: TodoSupabaseClient): TodoPositionSource {
  return {
    async getParentId(todoId) {
      const { data, error } = await supabase.from("todos").select("parent_id").eq("id", todoId).single();
      if (error) throw error;
      return data.parent_id;
    },
    async countChildren(parentId) {
      const { count, error } = await supabase
        .from("todos")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", parentId);
      if (error) throw error;
      return count ?? 0;
    },
    async getSiblings(listId, parentId) {
      let query = supabase
        .from("todos")
        .select("id, position")
        .eq("list_id", listId)
        .order("position", { ascending: true });
      query = parentId === null ? query.is("parent_id", null) : query.eq("parent_id", parentId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    async setPosition(todoId, position) {
      const { error } = await supabase.from("todos").update({ position }).eq("id", todoId);
      if (error) throw error;
    },
    async moveTodo(todoId, changes) {
      const { error } = await supabase
        .from("todos")
        .update({ list_id: changes.listId, parent_id: changes.parentId, position: changes.position })
        .eq("id", todoId);
      if (error) throw error;
    },
  };
}

/** 沿用既有呼叫端（網頁版、小工具線上模式）習慣的簡便入口，內部組出 Supabase 版的 source。 */
export async function reorderTodo(supabase: TodoSupabaseClient, params: ReorderTodoParams): Promise<void> {
  return reorderTodoCore(createSupabaseTodoPositionSource(supabase), params);
}

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
 * 拖曳排序/跨清單移動/巢狀化共用的核心邏輯，網頁版跟小工具都呼叫這個函式。
 * beforeId/afterId 一律從這裡重新查詢 Supabase 的最新順序反推，不依賴呼叫端快取算 ——
 * 呼叫端快取可能還沒吃到上一次操作的結果，用它算鄰居會找不到、直接整個排序動作沒反應。
 */
export async function reorderTodo(supabase: TodoSupabaseClient, params: ReorderTodoParams): Promise<void> {
  const { id, targetListId, targetParentId, anchorTodoId, anchorPosition } = params;

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
}

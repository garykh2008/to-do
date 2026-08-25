import type { Todo } from "../types/database.types";

/**
 * 把某個 list 的 todos 攤平陣列，依 parent_id 分組成「頂層項目 -> 子項目陣列」。
 * 只支援一層巢狀：子項目不會再被拿去找自己的子項目。
 *
 * 防呆：正常情況下不該出現循環參照或 parent 指到不存在/不同清單的項目，
 * 但拖曳巢狀化牽涉到樂觀 UI + 非同步寫入，理論上還是可能發生 race condition。
 * 一旦真的出現這種異常資料，與其讓項目整個從畫面上消失（父鏈斷掉/循環，怎麼找都找不到根），
 * 不如保底當成頂層項目顯示出來，至少使用者看得到、刪得掉。
 */
export function groupTodosByParent(todos: readonly Todo[]): {
  topLevel: Todo[];
  childrenByParentId: Map<string, Todo[]>;
} {
  const byId = new Map(todos.map((t) => [t.id, t]));

  function reachesTopLevel(todo: Todo, seen: Set<string>): boolean {
    if (!todo.parent_id) return true;
    if (seen.has(todo.id)) return false; // 循環參照
    const parent = byId.get(todo.parent_id);
    if (!parent) return false; // parent 不在這份清單裡
    seen.add(todo.id);
    return reachesTopLevel(parent, seen);
  }

  const topLevel: Todo[] = [];
  const childrenByParentId = new Map<string, Todo[]>();

  for (const todo of todos) {
    if (todo.parent_id && reachesTopLevel(todo, new Set())) {
      const siblings = childrenByParentId.get(todo.parent_id) ?? [];
      siblings.push(todo);
      childrenByParentId.set(todo.parent_id, siblings);
    } else {
      topLevel.push(todo);
    }
  }

  return { topLevel, childrenByParentId };
}

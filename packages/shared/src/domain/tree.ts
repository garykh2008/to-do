import type { Todo } from "../types/database.types";

/**
 * 把某個 list 的 todos 攤平陣列，依 parent_id 分組成「頂層項目 -> 子項目陣列」。
 * 只支援一層巢狀：子項目不會再被拿去找自己的子項目。
 */
export function groupTodosByParent(todos: readonly Todo[]): {
  topLevel: Todo[];
  childrenByParentId: Map<string, Todo[]>;
} {
  const topLevel: Todo[] = [];
  const childrenByParentId = new Map<string, Todo[]>();

  for (const todo of todos) {
    if (todo.parent_id) {
      const siblings = childrenByParentId.get(todo.parent_id) ?? [];
      siblings.push(todo);
      childrenByParentId.set(todo.parent_id, siblings);
    } else {
      topLevel.push(todo);
    }
  }

  return { topLevel, childrenByParentId };
}

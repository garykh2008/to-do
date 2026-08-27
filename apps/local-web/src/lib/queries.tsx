import type { List, Todo } from "@to-do/shared";
import { useLocalData } from "./localData";

/**
 * 刻意模仿 apps/web/lib/queries.ts 的 hook 介面（同樣的 hook 名稱、同樣 .mutate() 的呼叫方式），
 * 這樣從 apps/web 搬過來的 TodoTree/TodoItem/AddTodoForm 幾乎不用改 import 以外的東西。
 * 底層資料來源換成本機小工具的 HTTP API（見 lib/localData.tsx），不是 Supabase。
 */

export function useLists(): { data: List[] } {
  const { state } = useLocalData();
  return { data: state.lists };
}

export function useAllTodos(): { data: Todo[]; isLoading: boolean; error: null } {
  const { state, loading } = useLocalData();
  return { data: state.todos, isLoading: loading, error: null };
}

export function useTodos(listId: string | undefined): { data: Todo[]; isLoading: boolean; error: null } {
  const { state, loading } = useLocalData();
  return { data: listId ? state.todos.filter((t) => t.list_id === listId) : [], isLoading: loading, error: null };
}

export function useTodosInRange(startDate: string, endDate: string): { data: Todo[]; isLoading: boolean } {
  const { state, loading } = useLocalData();
  const data = state.todos.filter((t) => t.due_date && t.due_date >= startDate && t.due_date <= endDate);
  return { data, isLoading: loading };
}

export function useAddTodo(): {
  mutate: (input: {
    listId: string;
    title: string;
    dueDate?: string | null;
    parentId?: string | null;
    priority?: number;
    labels?: string[];
  }) => void;
} {
  const { mutate } = useLocalData();
  return {
    mutate: (input) => {
      if (input.parentId) {
        mutate("addSubTodo", [input.parentId, input.title]);
      } else {
        mutate("addTodo", [
          input.title,
          input.dueDate ?? null,
          input.listId,
          { priority: input.priority, labels: input.labels },
        ]);
      }
    },
  };
}

export function useUpdateTodo(): {
  mutate: (
    input: { id: string; listId: string } & Partial<
      Pick<Todo, "title" | "notes" | "due_date" | "priority" | "labels" | "recurrence_rule" | "is_completed">
    >,
  ) => void;
} {
  const { mutate } = useLocalData();
  return {
    mutate: (input) => {
      if (typeof input.is_completed === "boolean") {
        mutate("toggleComplete", [input.id, input.is_completed]);
      } else if (typeof input.title === "string") {
        mutate("updateTitle", [input.id, input.title]);
      } else if (typeof input.priority === "number") {
        mutate("updatePriority", [input.id, input.priority]);
      } else if (input.labels !== undefined) {
        mutate("updateLabels", [input.id, input.labels]);
      } else if (input.recurrence_rule !== undefined) {
        mutate("updateRecurrence", [input.id, input.recurrence_rule]);
      } else if (input.notes !== undefined) {
        mutate("updateNotes", [input.id, input.notes]);
      } else if (input.due_date !== undefined) {
        mutate("updateDueDate", [input.id, input.due_date]);
      }
    },
  };
}

export function useDeleteTodo(): { mutate: (input: { id: string; listId: string }) => void } {
  const { mutate } = useLocalData();
  return { mutate: (input) => mutate("deleteTodo", [input.id]) };
}

export interface ReorderTodoInput {
  id: string;
  sourceListId: string;
  targetListId: string;
  targetParentId: string | null;
  anchorTodoId: string | null;
  anchorPosition: "before" | "after";
}

export function useReorderTodo(): { mutate: (input: ReorderTodoInput) => void } {
  const { mutate } = useLocalData();
  return {
    mutate: (input) =>
      mutate("reorderTodo", [
        {
          id: input.id,
          targetListId: input.targetListId,
          targetParentId: input.targetParentId,
          anchorTodoId: input.anchorTodoId,
          anchorPosition: input.anchorPosition,
        },
      ]),
  };
}

export function useAddList(): { mutate: (name: string) => void } {
  const { mutate } = useLocalData();
  return { mutate: (name) => mutate("addList", [name]) };
}

export function useRenameList(): { mutate: (input: { id: string; name: string }) => void } {
  const { mutate } = useLocalData();
  return { mutate: (input) => mutate("renameList", [input.id, input.name]) };
}

export function useDeleteList(): { mutate: (id: string) => void } {
  const { mutate } = useLocalData();
  return { mutate: (id) => mutate("deleteList", [id]) };
}

export function useMoveTodoToList(): { mutate: (input: { id: string; targetListId: string }) => void } {
  const { mutate } = useLocalData();
  return { mutate: (input) => mutate("moveTodoToList", [input.id, input.targetListId]) };
}

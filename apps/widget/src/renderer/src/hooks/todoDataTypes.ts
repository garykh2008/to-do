import type { List, Todo } from "@to-do/shared";

export interface ReorderTodoInput {
  id: string;
  targetListId: string;
  targetParentId: string | null;
  anchorTodoId: string | null;
  anchorPosition: "before" | "after";
}

/**
 * useSupabaseTodoData（線上模式）跟 useLocalTodoData（本機模式）都要實作這個介面，
 * App.tsx／useTodoData.ts 的切換器只認這份形狀，不管底層資料實際存在 Supabase 還是本機檔案。
 */
export interface TodoDataApi {
  lists: List[];
  todos: Todo[];
  loading: boolean;
  inboxList: List | null;
  /** listId 不給的話兩邊實作都會照本機模式的規則落到 Inbox（見 App.tsx 呼叫端的判斷） */
  addTodo: (title: string, dueDate: string | null, listId?: string) => Promise<void>;
  moveTodoToList: (todoId: string, targetListId: string) => Promise<void>;
  reorderTodo: (params: ReorderTodoInput) => Promise<void>;
  toggleComplete: (todoId: string, isCompleted: boolean) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
  addSubTodo: (parentTodo: Todo, title: string) => Promise<void>;
  updateDueDate: (todoId: string, dueDate: string | null) => Promise<void>;
  updateTitle: (todoId: string, title: string) => Promise<void>;
  addList: (name: string) => Promise<void>;
  renameList: (listId: string, name: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
}

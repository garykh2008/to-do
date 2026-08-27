import type { List, RecurrenceRule, ReorderTodoParams, Todo } from "@to-do/shared";

export interface AuthStorageBridge {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface WindowControlsBridge {
  minimize(): void;
  close(): void;
  show(): void;
}

export interface LocalStoreData {
  lists: List[];
  todos: Todo[];
}

export interface LocalStoreBridge {
  getState(): Promise<LocalStoreData>;
  addTodo(
    title: string,
    dueDate: string | null,
    listId?: string,
    extra?: { priority?: number; labels?: string[] },
  ): Promise<LocalStoreData>;
  moveTodoToList(todoId: string, targetListId: string): Promise<LocalStoreData>;
  reorderTodo(params: ReorderTodoParams): Promise<LocalStoreData>;
  toggleComplete(todoId: string, isCompleted: boolean): Promise<LocalStoreData>;
  deleteTodo(todoId: string): Promise<LocalStoreData>;
  addSubTodo(parentTodoId: string, title: string): Promise<LocalStoreData>;
  updateDueDate(todoId: string, dueDate: string | null): Promise<LocalStoreData>;
  updatePriority(todoId: string, priority: number): Promise<LocalStoreData>;
  updateLabels(todoId: string, labels: string[]): Promise<LocalStoreData>;
  updateRecurrence(todoId: string, recurrenceRule: RecurrenceRule | null): Promise<LocalStoreData>;
  updateNotes(todoId: string, notes: string | null): Promise<LocalStoreData>;
  updateTitle(todoId: string, title: string): Promise<LocalStoreData>;
  addList(name: string): Promise<LocalStoreData>;
  renameList(listId: string, name: string): Promise<LocalStoreData>;
  deleteList(listId: string): Promise<LocalStoreData>;
  /** 訂閱「資料在別的地方被改動」事件（系統匣匯入、本機瀏覽器頁面）；回傳取消訂閱函式 */
  onChanged(callback: (data: LocalStoreData) => void): () => void;
}

declare global {
  interface Window {
    authStorage: AuthStorageBridge;
    windowControls: WindowControlsBridge;
    localStore: LocalStoreBridge;
  }
}

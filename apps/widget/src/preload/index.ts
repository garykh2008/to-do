import { contextBridge, ipcRenderer } from "electron";

const authStorage = {
  getItem: (key: string): Promise<string | null> => ipcRenderer.invoke("secure-store:get", key),
  setItem: (key: string, value: string): Promise<void> => ipcRenderer.invoke("secure-store:set", key, value),
  removeItem: (key: string): Promise<void> => ipcRenderer.invoke("secure-store:remove", key),
};

const windowControls = {
  minimize: (): void => ipcRenderer.send("window:minimize"),
  close: (): void => ipcRenderer.send("window:close"),
};

type LocalStoreData = { lists: unknown[]; todos: unknown[] };

// 每個方法都是一個 invoke，main process 那邊（見 main/index.ts）用同一份 localDataEngine
// 處理，回傳的都是完整的最新 {lists, todos}，renderer 收到後直接整份套用到畫面。
const localStore = {
  getState: (): Promise<LocalStoreData> => ipcRenderer.invoke("local-store:get-state"),
  addTodo: (
    title: string,
    dueDate: string | null,
    listId?: string,
    extra?: { priority?: number; labels?: string[] },
  ): Promise<LocalStoreData> => ipcRenderer.invoke("local-store:add-todo", title, dueDate, listId, extra),
  moveTodoToList: (todoId: string, targetListId: string): Promise<LocalStoreData> =>
    ipcRenderer.invoke("local-store:move-todo-to-list", todoId, targetListId),
  reorderTodo: (params: unknown): Promise<LocalStoreData> => ipcRenderer.invoke("local-store:reorder-todo", params),
  toggleComplete: (todoId: string, isCompleted: boolean): Promise<LocalStoreData> =>
    ipcRenderer.invoke("local-store:toggle-complete", todoId, isCompleted),
  deleteTodo: (todoId: string): Promise<LocalStoreData> => ipcRenderer.invoke("local-store:delete-todo", todoId),
  addSubTodo: (parentTodoId: string, title: string): Promise<LocalStoreData> =>
    ipcRenderer.invoke("local-store:add-sub-todo", parentTodoId, title),
  updateDueDate: (todoId: string, dueDate: string | null): Promise<LocalStoreData> =>
    ipcRenderer.invoke("local-store:update-due-date", todoId, dueDate),
  updatePriority: (todoId: string, priority: number): Promise<LocalStoreData> =>
    ipcRenderer.invoke("local-store:update-priority", todoId, priority),
  updateLabels: (todoId: string, labels: string[]): Promise<LocalStoreData> =>
    ipcRenderer.invoke("local-store:update-labels", todoId, labels),
  updateRecurrence: (todoId: string, recurrenceRule: unknown): Promise<LocalStoreData> =>
    ipcRenderer.invoke("local-store:update-recurrence", todoId, recurrenceRule),
  updateTitle: (todoId: string, title: string): Promise<LocalStoreData> =>
    ipcRenderer.invoke("local-store:update-title", todoId, title),
  addList: (name: string): Promise<LocalStoreData> => ipcRenderer.invoke("local-store:add-list", name),
  renameList: (listId: string, name: string): Promise<LocalStoreData> =>
    ipcRenderer.invoke("local-store:rename-list", listId, name),
  deleteList: (listId: string): Promise<LocalStoreData> => ipcRenderer.invoke("local-store:delete-list", listId),
  // 資料在 main process 之外被改動時（系統匣匯入、本機瀏覽器頁面透過 HTTP API 改資料）推播用，
  // 讓已經開著的小工具視窗跟著更新，不用手動重新整理。
  onChanged: (callback: (data: LocalStoreData) => void): (() => void) => {
    const listener = (_event: unknown, data: LocalStoreData) => callback(data);
    ipcRenderer.on("local-store:changed", listener);
    return () => ipcRenderer.removeListener("local-store:changed", listener);
  },
};

contextBridge.exposeInMainWorld("authStorage", authStorage);
contextBridge.exposeInMainWorld("windowControls", windowControls);
contextBridge.exposeInMainWorld("localStore", localStore);

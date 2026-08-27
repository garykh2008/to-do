import { randomUUID } from "node:crypto";
import {
  appendPosition,
  firstPosition,
  reorderTodoCore,
  type List,
  type ReorderTodoParams,
  type Todo,
  type TodoPositionSource,
} from "@to-do/shared";
import { loadLocalStore, saveLocalStore } from "./localStore";

// 本機模式沒有登入、沒有多使用者概念，這個欄位純粹是資料形狀相容線上模式的 Todo/List 型別要求。
const LOCAL_USER_ID = "local";

function nowIso(): string {
  return new Date().toISOString();
}

function newList(name: string, position: number, isInbox = false): List {
  return {
    id: randomUUID(),
    user_id: LOCAL_USER_ID,
    name,
    color: null,
    is_inbox: isInbox,
    position,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

function newTodo(input: {
  listId: string;
  parentId?: string | null;
  title: string;
  dueDate?: string | null;
  position: number;
}): Todo {
  return {
    id: randomUUID(),
    user_id: LOCAL_USER_ID,
    list_id: input.listId,
    parent_id: input.parentId ?? null,
    title: input.title,
    notes: null,
    is_completed: false,
    completed_at: null,
    due_date: input.dueDate ?? null,
    position: input.position,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

export interface LocalDataState {
  lists: List[];
  todos: Todo[];
}

/**
 * 本機模式的資料狀態跟業務邏輯，整個都活在 main process 這一份記憶體裡，是唯一的真相來源。
 * Electron 視窗（透過 IPC）跟本機瀏覽器頁面（透過 HTTP，見 httpServer.ts）都是呼叫同一份
 * engine 的方法，兩邊看到的、寫入的都是同一份資料，不會各自快取出兩份不同步的狀態。
 */
class LocalDataEngine {
  private lists: List[] = [];
  private todos: Todo[] = [];
  private loaded = false;

  private ensureLoaded(): void {
    if (this.loaded) return;
    const stored = loadLocalStore();
    if (stored) {
      this.lists = stored.lists;
      this.todos = stored.todos;
    } else {
      // 第一次啟動，沒有任何資料檔：比照 Supabase 版的預設狀態，先建一個 Inbox 清單。
      this.lists = [newList("Inbox", firstPosition(), true)];
      this.todos = [];
      this.persist();
    }
    this.loaded = true;
  }

  private persist(): void {
    saveLocalStore({ lists: this.lists, todos: this.todos });
  }

  getState(): LocalDataState {
    this.ensureLoaded();
    return { lists: this.lists, todos: this.todos };
  }

  /** 匯入資料用：整份取代掉目前的記憶體狀態並寫檔 */
  replaceState(data: LocalDataState): LocalDataState {
    this.lists = data.lists;
    this.todos = data.todos;
    this.loaded = true;
    this.persist();
    return this.getState();
  }

  /** listId 不給的話沿用小工具的行為：一律加到 Inbox（本機網頁版會傳目前選的清單） */
  addTodo(title: string, dueDate: string | null, listId?: string): LocalDataState {
    this.ensureLoaded();
    const targetList = listId ? this.lists.find((l) => l.id === listId) : this.lists.find((l) => l.is_inbox);
    if (targetList) {
      const siblings = this.todos.filter((t) => t.list_id === targetList.id && !t.parent_id);
      const lastPosition = siblings.length ? Math.max(...siblings.map((t) => t.position)) : null;
      this.todos = [
        ...this.todos,
        newTodo({ listId: targetList.id, title, dueDate, position: appendPosition(lastPosition) }),
      ];
      this.persist();
    }
    return this.getState();
  }

  moveTodoToList(todoId: string, targetListId: string): LocalDataState {
    this.ensureLoaded();
    const targetTopLevel = this.todos.filter((t) => t.list_id === targetListId && !t.parent_id);
    const lastPosition = targetTopLevel.length ? Math.max(...targetTopLevel.map((t) => t.position)) : null;
    const position = appendPosition(lastPosition);
    this.todos = this.todos.map((t) =>
      t.id === todoId ? { ...t, list_id: targetListId, parent_id: null, position, updated_at: nowIso() } : t,
    );
    this.persist();
    return this.getState();
  }

  async reorderTodo(params: ReorderTodoParams): Promise<LocalDataState> {
    this.ensureLoaded();
    const source: TodoPositionSource = {
      getParentId: async (todoId) => {
        const todo = this.todos.find((t) => t.id === todoId);
        if (!todo) throw new Error(`todo not found: ${todoId}`);
        return todo.parent_id;
      },
      countChildren: async (parentId) => this.todos.filter((t) => t.parent_id === parentId).length,
      getSiblings: async (listId, parentId) =>
        this.todos
          .filter((t) => t.list_id === listId && t.parent_id === parentId)
          .sort((a, b) => a.position - b.position)
          .map((t) => ({ id: t.id, position: t.position })),
      setPosition: async (todoId, position) => {
        this.todos = this.todos.map((t) => (t.id === todoId ? { ...t, position } : t));
      },
      moveTodo: async (todoId, changes) => {
        this.todos = this.todos.map((t) =>
          t.id === todoId
            ? {
                ...t,
                list_id: changes.listId,
                parent_id: changes.parentId,
                position: changes.position,
                updated_at: nowIso(),
              }
            : t,
        );
      },
    };

    try {
      await reorderTodoCore(source, params);
    } catch (error) {
      console.error("[reorderTodo] 拖曳排序/巢狀化失敗：", error, params);
    }
    this.persist();
    return this.getState();
  }

  toggleComplete(todoId: string, isCompleted: boolean): LocalDataState {
    this.ensureLoaded();
    this.todos = this.todos.map((t) =>
      t.id === todoId
        ? { ...t, is_completed: isCompleted, completed_at: isCompleted ? nowIso() : null, updated_at: nowIso() }
        : t,
    );
    this.persist();
    return this.getState();
  }

  deleteTodo(todoId: string): LocalDataState {
    this.ensureLoaded();
    // 跟資料庫的 on delete cascade 一樣：刪掉一個項目，它的子項目（僅一層）要一起刪掉。
    this.todos = this.todos.filter((t) => t.id !== todoId && t.parent_id !== todoId);
    this.persist();
    return this.getState();
  }

  addSubTodo(parentTodoId: string, title: string): LocalDataState {
    this.ensureLoaded();
    const parentTodo = this.todos.find((t) => t.id === parentTodoId);
    if (parentTodo) {
      const siblings = this.todos.filter((t) => t.parent_id === parentTodo.id);
      const lastPosition = siblings.length ? Math.max(...siblings.map((t) => t.position)) : null;
      this.todos = [
        ...this.todos,
        newTodo({
          listId: parentTodo.list_id,
          parentId: parentTodo.id,
          title,
          position: appendPosition(lastPosition),
        }),
      ];
      this.persist();
    }
    return this.getState();
  }

  updateDueDate(todoId: string, dueDate: string | null): LocalDataState {
    this.ensureLoaded();
    this.todos = this.todos.map((t) => (t.id === todoId ? { ...t, due_date: dueDate, updated_at: nowIso() } : t));
    this.persist();
    return this.getState();
  }

  updateTitle(todoId: string, title: string): LocalDataState {
    this.ensureLoaded();
    this.todos = this.todos.map((t) => (t.id === todoId ? { ...t, title, updated_at: nowIso() } : t));
    this.persist();
    return this.getState();
  }

  addList(name: string): LocalDataState {
    this.ensureLoaded();
    const lastPosition = this.lists.length ? Math.max(...this.lists.map((l) => l.position)) : null;
    this.lists = [...this.lists, newList(name, appendPosition(lastPosition))];
    this.persist();
    return this.getState();
  }

  renameList(listId: string, name: string): LocalDataState {
    this.ensureLoaded();
    this.lists = this.lists.map((l) => (l.id === listId ? { ...l, name, updated_at: nowIso() } : l));
    this.persist();
    return this.getState();
  }

  deleteList(listId: string): LocalDataState {
    this.ensureLoaded();
    // 跟資料庫的 on delete cascade 一樣：刪清單要連裡面的待辦事項一起刪掉。
    this.lists = this.lists.filter((l) => l.id !== listId);
    this.todos = this.todos.filter((t) => t.list_id !== listId);
    this.persist();
    return this.getState();
  }
}

export const localDataEngine = new LocalDataEngine();

/**
 * HTTP 端（httpServer.ts）用的通用派送器：本機瀏覽器頁面只有一個 POST /api/rpc 端點，
 * 不用另外寫一套路由規則，直接對應同一份 engine 方法。IPC 端則各自掛獨立 channel
 * （見 main/index.ts），比較好在 devtools 裡追蹤，不透過這個派送器。
 */
export async function dispatchLocalEngine(method: string, args: unknown[]): Promise<LocalDataState> {
  switch (method) {
    case "getState":
      return localDataEngine.getState();
    case "addTodo":
      return localDataEngine.addTodo(args[0] as string, args[1] as string | null, args[2] as string | undefined);
    case "moveTodoToList":
      return localDataEngine.moveTodoToList(args[0] as string, args[1] as string);
    case "reorderTodo":
      return localDataEngine.reorderTodo(args[0] as ReorderTodoParams);
    case "toggleComplete":
      return localDataEngine.toggleComplete(args[0] as string, args[1] as boolean);
    case "deleteTodo":
      return localDataEngine.deleteTodo(args[0] as string);
    case "addSubTodo":
      return localDataEngine.addSubTodo(args[0] as string, args[1] as string);
    case "updateDueDate":
      return localDataEngine.updateDueDate(args[0] as string, args[1] as string | null);
    case "updateTitle":
      return localDataEngine.updateTitle(args[0] as string, args[1] as string);
    case "addList":
      return localDataEngine.addList(args[0] as string);
    case "renameList":
      return localDataEngine.renameList(args[0] as string, args[1] as string);
    case "deleteList":
      return localDataEngine.deleteList(args[0] as string);
    default:
      throw new Error(`unknown local-data method: ${method}`);
  }
}

import type { List, Todo } from "@to-do/shared";

export interface AuthStorageBridge {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface WindowControlsBridge {
  minimize(): void;
  close(): void;
}

export interface LocalStoreData {
  lists: List[];
  todos: Todo[];
}

export interface LocalStoreBridge {
  load(): Promise<LocalStoreData | null>;
  save(data: LocalStoreData): Promise<void>;
  /** 訂閱「系統匣選單匯入完成」事件；回傳取消訂閱函式 */
  onImported(callback: (data: LocalStoreData) => void): () => void;
}

declare global {
  interface Window {
    authStorage: AuthStorageBridge;
    windowControls: WindowControlsBridge;
    localStore: LocalStoreBridge;
  }
}

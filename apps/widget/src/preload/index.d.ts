export interface AuthStorageBridge {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface WindowControlsBridge {
  minimize(): void;
  close(): void;
}

declare global {
  interface Window {
    authStorage: AuthStorageBridge;
    windowControls: WindowControlsBridge;
  }
}

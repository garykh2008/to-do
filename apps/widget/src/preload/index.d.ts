export interface AuthStorageBridge {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

declare global {
  interface Window {
    authStorage: AuthStorageBridge;
  }
}

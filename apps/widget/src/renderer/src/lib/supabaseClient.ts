import { createTodoClient, type AuthStorageAdapter, type TodoSupabaseClient } from "@to-do/shared";

const authStorage: AuthStorageAdapter = {
  getItem: (key) => window.authStorage.getItem(key),
  setItem: (key, value) => window.authStorage.setItem(key, value),
  removeItem: (key) => window.authStorage.removeItem(key),
};

let client: TodoSupabaseClient | undefined;

/**
 * 延遲建立：本機模式（VITE_DATA_MODE=local）打包出去的版本不需要、也通常沒有設定
 * Supabase 的網址/金鑰。只有真的呼叫得到這個函式的程式路徑（線上模式的 hooks）才會
 * 觸發建立 client；本機模式完全不會呼叫到，就不會因為缺環境變數而在啟動時就炸掉。
 */
export function getSupabase(): TodoSupabaseClient {
  if (!client) {
    client = createTodoClient({
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      storage: authStorage,
      detectSessionInUrl: false,
    });
  }
  return client;
}

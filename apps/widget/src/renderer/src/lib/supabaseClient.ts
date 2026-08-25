import { createTodoClient, type AuthStorageAdapter } from "@to-do/shared";

const authStorage: AuthStorageAdapter = {
  getItem: (key) => window.authStorage.getItem(key),
  setItem: (key, value) => window.authStorage.setItem(key, value),
  removeItem: (key) => window.authStorage.removeItem(key),
};

export const supabase = createTodoClient({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  storage: authStorage,
  detectSessionInUrl: false,
});

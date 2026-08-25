import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SCHEMA } from "../domain/constants";
import type { Database } from "../types/database.types";

/**
 * auth.storage 的最小介面，讓網頁版 (localStorage/cookie) 與
 * Electron 小工具 (safeStorage) 可以各自帶入自己的實作。
 */
export interface AuthStorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface CreateTodoClientOptions {
  url: string;
  anonKey: string;
  /** 不帶則使用 supabase-js 預設的 storage (瀏覽器環境會用 localStorage) */
  storage?: AuthStorageAdapter;
  /** Electron 等非瀏覽器環境沒有實體 URL 可偵測 session，需手動關閉 */
  detectSessionInUrl?: boolean;
}

export type TodoSupabaseClient = SupabaseClient<Database, "todo">;

export function createTodoClient({
  url,
  anonKey,
  storage,
  detectSessionInUrl = true,
}: CreateTodoClientOptions): TodoSupabaseClient {
  return createSupabaseClient<Database, "todo">(url, anonKey, {
    db: { schema: SCHEMA },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl,
      ...(storage ? { storage } : {}),
    },
  });
}

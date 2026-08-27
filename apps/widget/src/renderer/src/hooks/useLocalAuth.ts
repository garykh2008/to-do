import type { User } from "@supabase/supabase-js";

// 本機模式沒有登入流程，給一個固定的假 user 讓 App.tsx 的畫面邏輯（loading/已登入判斷）
// 不用整套另外寫一份；不會、也不需要呼叫 Supabase，本機模式的 build 通常根本沒有設定
// Supabase 的網址/金鑰。
const LOCAL_USER = { id: "local" } as User;

export function useLocalAuth(): { user: User | null; loading: boolean } {
  return { user: LOCAL_USER, loading: false };
}

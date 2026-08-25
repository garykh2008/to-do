import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 小工具常駐在系統匣、視窗常常被隱藏很久；從隱藏恢復顯示時主動確認一次目前的
    // session 狀態（而不是被動等待 supabase-js 背景排程的 token 刷新），避免因為
    // 視窗隱藏期間刷新沒準時執行、重新打開卻變成已登出的情況。
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { user, loading };
}

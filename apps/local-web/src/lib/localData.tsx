import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { List, Todo } from "@to-do/shared";

interface LocalDataState {
  lists: List[];
  todos: Todo[];
}

async function rpc(method: string, args: unknown[] = []): Promise<LocalDataState> {
  const res = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, args }),
  });
  if (!res.ok) throw new Error(`${method} 失敗（HTTP ${res.status}）`);
  return res.json();
}

interface LocalDataContextValue {
  state: LocalDataState;
  loading: boolean;
  /** 呼叫本機小工具的資料引擎方法，拿到最新的完整狀態後直接套用，不用另外重新整理 */
  mutate: (method: string, args?: unknown[]) => Promise<void>;
}

const LocalDataContext = createContext<LocalDataContextValue | null>(null);

export function LocalDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LocalDataState>({ lists: [], todos: [] });
  const [loading, setLoading] = useState(true);

  const mutate = useCallback(async (method: string, args: unknown[] = []) => {
    const data = await rpc(method, args);
    setState(data);
  }, []);

  useEffect(() => {
    rpc("getState")
      .then(setState)
      .finally(() => setLoading(false));
  }, []);

  return <LocalDataContext.Provider value={{ state, loading, mutate }}>{children}</LocalDataContext.Provider>;
}

export function useLocalData(): LocalDataContextValue {
  const ctx = useContext(LocalDataContext);
  if (!ctx) throw new Error("useLocalData 必須在 LocalDataProvider 底下使用");
  return ctx;
}

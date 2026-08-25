"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "./supabase/client";

/**
 * 訂閱 todo.lists / todo.todos 的異動，讓小工具端新增的項目
 * 即時反映在網頁版（反之亦然），不用手動重新整理。
 */
export function useRealtimeSync() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("todo-realtime")
      .on("postgres_changes", { event: "*", schema: "todo", table: "lists" }, () => {
        queryClient.invalidateQueries({ queryKey: ["lists"] });
      })
      .on("postgres_changes", { event: "*", schema: "todo", table: "todos" }, () => {
        queryClient.invalidateQueries({ queryKey: ["todos"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);
}

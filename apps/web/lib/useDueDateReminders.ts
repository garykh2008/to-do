"use client";

import { useEffect, useState } from "react";
import { buildReminderSummary, reminderMessage } from "@to-do/shared";
import { useAllTodos } from "./queries";

const ENABLED_KEY = "todo:notificationsEnabled";
const LAST_REMINDER_KEY = "todo:lastReminderDate";
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

function readEnabled(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(ENABLED_KEY) === "1";
}

/**
 * 「開著才提醒」（不做背景推播，見專案筆記）：回傳目前開關狀態跟切換函式。切換成開啟時
 * 才會跟瀏覽器要通知權限——權限請求一定要是使用者主動點擊觸發，不能一載入就跳。
 * 開啟且有權限時，每 5 分鐘檢查一次全部 todos，一天最多跳一次彙總通知（不是每個任務跳一則）。
 */
export function useDueDateReminders(): { enabled: boolean; toggle: () => void } {
  const [enabled, setEnabled] = useState(false);
  const { data: todos = [] } = useAllTodos();

  useEffect(() => {
    setEnabled(readEnabled());
  }, []);

  useEffect(() => {
    if (!enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    function check() {
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem(LAST_REMINDER_KEY) === today) return;
      const summary = buildReminderSummary(todos, today);
      if (!summary) return;
      localStorage.setItem(LAST_REMINDER_KEY, today);
      const notification = new Notification("待辦事項提醒", { body: reminderMessage(summary) });
      notification.onclick = () => window.focus();
    }

    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [enabled, todos]);

  async function toggle() {
    if (enabled) {
      setEnabled(false);
      localStorage.setItem(ENABLED_KEY, "0");
      return;
    }
    if (typeof Notification === "undefined") return;
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") return;
    setEnabled(true);
    localStorage.setItem(ENABLED_KEY, "1");
  }

  return { enabled, toggle };
}

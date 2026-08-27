import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import type { ReorderTodoParams, RecurrenceRule } from "@to-do/shared";
import { createTray } from "./tray";
import { resourcePath } from "./resourcePath";
import { secureGetItem, secureRemoveItem, secureSetItem } from "./secureStore";
import { localDataEngine } from "./localDataEngine";
import { startLocalWebServer } from "./httpServer";

// 預設的 userData 路徑是依 app name 算的，兩個 build 變體不設定的話會共用同一個
// package.json name（"widget"），本機模式的 todo-data.json 跟線上模式的 session token
// 就會存進同一個資料夾。要在第一次呼叫 app.getPath('userData') 之前設好，這裡是最早的時機。
const IS_LOCAL_MODE = import.meta.env.VITE_DATA_MODE === "local";
if (IS_LOCAL_MODE) {
  app.setName("todo-widget-local");
}

// 常駐系統匣的 App 很容易被不小心開第二次（捷徑點兩下、開機自動啟動又手動再開一次）。
// 沒有這道鎖的話兩個實例會各自在記憶體裡維護一份 {lists, todos}、各自寫同一個資料檔，
// 後寫的蓋掉先寫的，等於随機遺失其中一邊的修改。拿不到鎖就直接結束，讓既有實例處理。
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 340,
    height: 520,
    minWidth: 300,
    minHeight: 400,
    title: "TODO 小工具",
    icon: resourcePath("icon.png"),
    frame: false,
    backgroundColor: "#fafafa",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      // 常駐在系統匣時視窗會被隱藏；預設 Chromium 會節流背景頁面的計時器，
      // 導致 supabase-js 排程好的 token 自動刷新沒有準時執行，重新打開後就變成已登出。
      backgroundThrottling: false,
    },
  });

  // 建構子的 alwaysOnTop 選項在 Windows 上只等同一般的 topmost，另一個螢幕若有
  // 全螢幕獨佔（DXGI exclusive fullscreen，例如遊戲/播放器）的視窗，會搶走 topmost
  // 的 z-order，害小工具被壓到最底層（看起來像「消失」，其實是被蓋住了）。
  // "screen-saver" 是 Electron 在 Windows 上會給到更高 z-order band 的層級，
  // 且在每次拿到 focus 時（例如使用者點擊小工具）重新宣告一次，把 topmost 搶回來。
  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.on("focus", () => mainWindow?.setAlwaysOnTop(true, "screen-saver"));
  mainWindow.on("show", () => mainWindow?.setAlwaysOnTop(true, "screen-saver"));

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  const rendererUrl = process.env["ELECTRON_RENDERER_URL"];
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.handle("secure-store:get", (_event, key: string) => secureGetItem(key));
  ipcMain.handle("secure-store:set", (_event, key: string, value: string) => secureSetItem(key, value));
  ipcMain.handle("secure-store:remove", (_event, key: string) => secureRemoveItem(key));

  ipcMain.on("window:minimize", () => mainWindow?.minimize());
  ipcMain.on("window:close", () => mainWindow?.close());
  ipcMain.on("window:show", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // 本機模式的所有資料操作都走這些 channel，實際的狀態跟業務邏輯全部在 localDataEngine 裡
  // （小工具視窗自己是這樣，本機瀏覽器頁面則是走 httpServer.ts 的 /api/rpc 打同一份 engine）。
  ipcMain.handle("local-store:get-state", () => localDataEngine.getState());
  ipcMain.handle(
    "local-store:add-todo",
    (_e, title: string, dueDate: string | null, listId?: string, extra?: { priority?: number; labels?: string[] }) =>
      localDataEngine.addTodo(title, dueDate, listId, extra),
  );
  ipcMain.handle("local-store:move-todo-to-list", (_e, todoId: string, targetListId: string) =>
    localDataEngine.moveTodoToList(todoId, targetListId),
  );
  ipcMain.handle("local-store:reorder-todo", (_e, params: ReorderTodoParams) => localDataEngine.reorderTodo(params));
  ipcMain.handle("local-store:toggle-complete", (_e, todoId: string, isCompleted: boolean) =>
    localDataEngine.toggleComplete(todoId, isCompleted),
  );
  ipcMain.handle("local-store:delete-todo", (_e, todoId: string) => localDataEngine.deleteTodo(todoId));
  ipcMain.handle("local-store:add-sub-todo", (_e, parentTodoId: string, title: string) =>
    localDataEngine.addSubTodo(parentTodoId, title),
  );
  ipcMain.handle("local-store:update-due-date", (_e, todoId: string, dueDate: string | null) =>
    localDataEngine.updateDueDate(todoId, dueDate),
  );
  ipcMain.handle("local-store:update-priority", (_e, todoId: string, priority: number) =>
    localDataEngine.updatePriority(todoId, priority),
  );
  ipcMain.handle("local-store:update-labels", (_e, todoId: string, labels: string[]) =>
    localDataEngine.updateLabels(todoId, labels),
  );
  ipcMain.handle("local-store:update-recurrence", (_e, todoId: string, recurrenceRule: RecurrenceRule | null) =>
    localDataEngine.updateRecurrence(todoId, recurrenceRule),
  );
  ipcMain.handle("local-store:update-notes", (_e, todoId: string, notes: string | null) =>
    localDataEngine.updateNotes(todoId, notes),
  );
  ipcMain.handle("local-store:update-title", (_e, todoId: string, title: string) =>
    localDataEngine.updateTitle(todoId, title),
  );
  ipcMain.handle("local-store:add-list", (_e, name: string) => localDataEngine.addList(name));
  ipcMain.handle("local-store:rename-list", (_e, listId: string, name: string) =>
    localDataEngine.renameList(listId, name),
  );
  ipcMain.handle("local-store:delete-list", (_e, listId: string) => localDataEngine.deleteList(listId));

  createWindow();
  if (mainWindow) createTray(mainWindow);
  if (IS_LOCAL_MODE) {
    // 從本機瀏覽器頁面（HTTP API）改的資料，推給小工具視窗即時反映，不用手動重新整理。
    startLocalWebServer((state) => mainWindow?.webContents.send("local-store:changed", state));
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 被擋下的第二個實例會觸發原本那個實例的這個事件；比照一般常駐 App 的習慣，
// 直接把已經開著的視窗叫出來，而不是靜默忽略讓使用者以為點了沒反應。
app.on("second-instance", () => {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
});

app.on("before-quit", () => {
  isQuitting = true;
});

// 小工具常駐在系統匣：關掉視窗不結束整個 App，只能從系統匣選單「結束」
app.on("window-all-closed", () => {});

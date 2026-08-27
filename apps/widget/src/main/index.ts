import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { createTray } from "./tray";
import { resourcePath } from "./resourcePath";
import { secureGetItem, secureRemoveItem, secureSetItem } from "./secureStore";
import { loadLocalStore, saveLocalStore, type LocalStoreData } from "./localStore";

// 預設的 userData 路徑是依 app name 算的，兩個 build 變體不設定的話會共用同一個
// package.json name（"widget"），本機模式的 todo-data.json 跟線上模式的 session token
// 就會存進同一個資料夾。要在第一次呼叫 app.getPath('userData') 之前設好，這裡是最早的時機。
if (import.meta.env.VITE_DATA_MODE === "local") {
  app.setName("todo-widget-local");
}

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 340,
    height: 520,
    minWidth: 300,
    minHeight: 400,
    alwaysOnTop: true,
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

  ipcMain.handle("local-store:load", () => loadLocalStore());
  ipcMain.handle("local-store:save", (_event, data: LocalStoreData) => saveLocalStore(data));

  createWindow();
  if (mainWindow) createTray(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

// 小工具常駐在系統匣：關掉視窗不結束整個 App，只能從系統匣選單「結束」
app.on("window-all-closed", () => {});

import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { createTray } from "./tray";
import { resourcePath } from "./resourcePath";
import { secureGetItem, secureRemoveItem, secureSetItem } from "./secureStore";

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

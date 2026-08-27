import { app, dialog, shell, Menu, Tray, nativeImage, type BrowserWindow } from "electron";
import { resourcePath } from "./resourcePath";
import { exportLocalStoreTo, pickImportFile } from "./localStore";
import { localDataEngine } from "./localDataEngine";
import { localWebUrl } from "./httpServer";

export function createTray(mainWindow: BrowserWindow): Tray {
  const icon = nativeImage.createFromPath(resourcePath("tray-icon.png")).resize({ width: 16, height: 16 });
  const tray = new Tray(icon);
  tray.setToolTip("TODO 小工具");

  function toggleWindow() {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  }

  async function handleExport() {
    const filePath = await exportLocalStoreTo(localDataEngine.getState());
    if (filePath) {
      dialog.showMessageBox(mainWindow, { type: "info", message: `已匯出到：\n${filePath}` });
    }
  }

  async function handleImport() {
    const confirmed = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      buttons: ["匯入", "取消"],
      defaultId: 1,
      cancelId: 1,
      message: "匯入資料會整份覆蓋掉目前這台電腦上的待辦事項，確定要繼續嗎？",
    });
    if (confirmed.response !== 0) return;

    try {
      const imported = await pickImportFile();
      if (!imported) return; // 使用者取消選檔
      const state = localDataEngine.replaceState(imported);
      // 通知 renderer 用剛匯入的資料重新整理畫面，不用整個視窗重開。
      mainWindow.webContents.send("local-store:changed", state);
      dialog.showMessageBox(mainWindow, { type: "info", message: "匯入完成" });
    } catch (error) {
      dialog.showErrorBox("匯入失敗", error instanceof Error ? error.message : String(error));
    }
  }

  const localModeMenuItems =
    import.meta.env.VITE_DATA_MODE === "local"
      ? ([
          { type: "separator" },
          { label: "在瀏覽器開啟…", click: () => shell.openExternal(localWebUrl()) },
          { type: "separator" },
          { label: "匯出資料…", click: handleExport },
          { label: "匯入資料…", click: handleImport },
        ] as const)
      : [];

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "顯示/隱藏", click: toggleWindow },
      ...localModeMenuItems,
      { type: "separator" },
      { label: "結束", click: () => app.quit() },
    ]),
  );

  tray.on("click", toggleWindow);

  return tray;
}

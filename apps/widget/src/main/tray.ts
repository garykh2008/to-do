import { app, Menu, Tray, nativeImage, type BrowserWindow } from "electron";
import { resourcePath } from "./resourcePath";

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

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "顯示/隱藏", click: toggleWindow },
      { type: "separator" },
      { label: "結束", click: () => app.quit() },
    ]),
  );

  tray.on("click", toggleWindow);

  return tray;
}

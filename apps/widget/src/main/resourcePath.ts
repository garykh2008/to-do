import { app } from "electron";
import { join } from "node:path";

/**
 * 開發模式下直接讀專案內的 resources/ 目錄；
 * 打包後改讀 electron-builder 透過 extraResources 複製到 process.resourcesPath 的檔案。
 */
export function resourcePath(filename: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, filename)
    : join(__dirname, "../../resources", filename);
}

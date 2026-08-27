import { app } from "electron";
import { join } from "node:path";

/**
 * 開發模式下直接讀 monorepo 裡 apps/local-web 的 build 產物；
 * 打包後改讀 electron-builder 透過 extraResources 複製到 process.resourcesPath 的檔案
 * （見 electron-builder.local.yml 的 extraResources 設定）。
 */
export function localWebDistPath(): string {
  return app.isPackaged ? join(process.resourcesPath, "local-web") : join(__dirname, "../../../local-web/dist");
}

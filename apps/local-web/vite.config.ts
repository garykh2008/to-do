import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 給小工具本機模式當「開啟網頁」用的頁面：純靜態單頁 SPA，build 完直接被
// electron-builder 打包進本機版安裝檔，由小工具內建的本機 HTTP server 當靜態檔案伺服器發布。
export default defineConfig({
  plugins: [react()],
  resolve: {
    // 跟 apps/web 用同一套 @/ 別名，方便直接搬 apps/web/components 裡的元件過來，
    // import 路徑不用大改。
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
  },
});

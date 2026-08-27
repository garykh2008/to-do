import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    // @to-do/shared 是 workspace 套件，package.json 的 main 直接指到 TS/ESM 原始檔（沒有編譯產物）。
    // externalizeDepsPlugin 預設把它當一般 npm 套件用 require() 外部載入，Node 的 CJS loader
    // 解析不了裡面的 `export * from ...` 語法會直接炸掉；排除它讓 Vite 自己 bundle 進去。
    plugins: [externalizeDepsPlugin({ exclude: ["@to-do/shared"] })],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ["@to-do/shared"] })],
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer/src"),
      },
    },
    plugins: [react()],
  },
});

# 個人 TODO 工具

網頁版（Next.js）+ 桌面常駐小工具（Electron）+ 自架 Supabase 的個人待辦事項工具。

## 結構

```
supabase/          資料庫 migration、seed、VPS 設定步驟說明
packages/shared/   兩個 App 共用的 Supabase client 工廠 / 型別 / 排序邏輯 / zod 驗證
apps/web/          Next.js 網頁版：完整功能頁面 + 行事曆
apps/widget/       Electron 桌面小工具：常駐置頂視窗，快速新增/瀏覽/拖曳分類
```

## 開始之前：設定 Supabase

照著 [`supabase/README.md`](supabase/README.md) 的步驟，在你 VPS 上的 Supabase：

1. 執行 `supabase/migrations/0001_init.sql` 建立 `todo` schema。
2. 設定 `PGRST_DB_SCHEMAS=public,todo` 並重啟 PostgREST 服務。
3. （建議）關閉公開註冊。
4. 決定要用哪個使用者帳號（可沿用其他專案的帳號）。
5. 用該帳號 UUID 執行 `supabase/seed.sql` 建立 Inbox 清單。

## 安裝

```bash
pnpm install
```

## 設定環境變數

- `apps/web/.env.local`（參考 `apps/web/.env.local.example`）：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `apps/widget/.env.local`（參考 `apps/widget/.env.local.example`）：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`

兩邊的值可以一樣，都是指向你 VPS 上 Supabase 的網址與 anon key（Studio → Project Settings → API）。

## 開發

```bash
pnpm dev:web       # Next.js，預設 http://localhost:3000
pnpm dev:widget     # Electron 小工具（會開啟一個常駐視窗）
```

## 打包小工具（Windows）

```bash
pnpm --filter widget package:win
```

輸出在 `apps/widget/release/`。打包前建議把 `apps/widget/resources/icon.png` 換成正式設計的圖示（目前是程式產生的純色方塊佔位圖）。

## 型別檢查 / 建置

```bash
pnpm typecheck
pnpm build
```

# TODO

個人待辦事項工具：清單、子項目、拖曳排序/巢狀化、行事曆檢視。有 Windows 桌面小工具跟網頁版兩種介面。

## 下載小工具（本機版）

到 [Releases](../../releases) 下載「TODO 小工具（本機版）」安裝檔。

- **不用註冊、不用登入**，資料存在你自己電腦上的一個 JSON 檔
- 常駐系統匣，快速新增/瀏覽/打勾
- 系統匣選單可以匯出/匯入資料（換電腦就是搬那個檔案），也可以「在瀏覽器開啟」用比較大的畫面操作，跟小工具本身即時同步
- 拖曳排序、子項目巢狀化、行事曆檢視，功能齊全

沒有帳號同步機制——如果你想要多台裝置、多個瀏覽器即時同步同一份資料，看下面「線上版」。

## 兩種模式

| | 本機版小工具 | 線上版（小工具 + 網頁版） |
| --- | --- | --- |
| 需要架設 | 不用，下載安裝檔就能跑 | 需要一個 Supabase 專案 |
| 帳號登入 | 不用 | 需要（email/密碼） |
| 資料存放 | 本機一個 JSON 檔 | Supabase（Postgres） |
| 跨裝置同步 | 不會自動同步（用匯出/匯入手動搬） | 即時同步 |
| 介面 | Windows 小工具 + 小工具內建的本機網頁 | Windows 小工具 + 獨立的 Next.js 網頁版 |

兩種模式的功能、拖曳互動、UI 是同一套程式碼，差別只在資料存在哪裡、要不要登入。

## 結構

```
apps/web/          Next.js 網頁版（線上模式專用）
apps/widget/        Electron 桌面小工具，build 時用 VITE_DATA_MODE 切換本機/線上模式
apps/local-web/      本機模式專用的瀏覽器頁面，由小工具內建的 HTTP server 發布
packages/shared/    兩邊共用的型別、排序/巢狀化邏輯、Supabase client 工廠
supabase/           資料庫 schema migration（線上模式用）
```

## 開發環境設定

```bash
pnpm install
```

### 只想改本機模式（不需要架 Supabase）

```bash
cd apps/widget
pnpm exec cross-env VITE_DATA_MODE=local electron-vite dev
```

小工具會用本機 JSON 檔存資料，不會連任何資料庫，改完 `apps/widget/src/renderer` 或 `apps/local-web` 裡的程式碼都能直接跑起來測。

### 想改線上模式（網頁版 / 小工具的 Supabase 同步）

需要一個 Supabase 專案——用 [官方 Hosted Supabase](https://supabase.com/)（最簡單）或自架都可以：

1. 建一個 Supabase 專案。
2. 在 SQL editor 依序執行 `supabase/migrations/` 底下的 migration。
3. 把 `todo` schema 加進 API 可以看到的 schema 清單（Hosted 版在 Dashboard → Project Settings → API → Exposed schemas 加 `todo`；自架版的步驟見 [`supabase/README.md`](supabase/README.md)）。
4. 建一個使用者帳號，並用 `supabase/seed.sql`（把裡面的 UUID 換成該帳號的）建立 Inbox 清單。
5. 複製 `apps/web/.env.local.example` → `apps/web/.env.local`、`apps/widget/.env.local.example` → `apps/widget/.env.local`，填入專案的 URL 跟 anon key（Dashboard → Project Settings → API）。

```bash
pnpm dev:web       # Next.js，預設 http://localhost:3000
pnpm dev:widget     # Electron 小工具（線上模式）
```

## 打包小工具

```bash
pnpm --filter widget run package:win          # 線上模式安裝檔
pnpm --filter widget run package:win:local    # 本機模式安裝檔
```

輸出在 `apps/widget/release/`。打包前建議把 `apps/widget/resources/icon.png` 換成正式設計的圖示（目前是程式產生的純色方塊佔位圖）。

Push 一個 `v*` 的 git tag（例如 `v1.0.1`）會觸發 GitHub Actions 自動打包本機版安裝檔並發布到 Releases，設定見 [`.github/workflows/release-local-widget.yml`](.github/workflows/release-local-widget.yml)。

## 型別檢查 / 建置

```bash
pnpm typecheck
pnpm build
```

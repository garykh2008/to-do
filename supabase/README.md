# Supabase 設定步驟（自架在 VPS 上）

這個 App 的資料放在獨立的 `todo` schema，不是預設的 `public`，所以除了套用 migration 之外，還需要在 VPS 上做幾個手動設定。

## 1. 套用 schema

在 Supabase Studio 的 SQL editor 中，依序貼上並執行：

1. `migrations/0001_init.sql`

## 2. 讓 PostgREST 看得到 `todo` schema

自架版預設只公開 `public` schema，不會像 Hosted 版一樣在 Dashboard 有開關可以切換。

1. 找到你 VPS 上 Supabase docker-compose 用的 `.env` 檔案。
2. 設定（或新增）這一行：
   ```
   PGRST_DB_SCHEMAS=public,todo
   ```
3. 用 `docker compose ps` 確認 PostgREST 服務的實際名稱（官方 compose 檔通常叫 `rest`，不是 `postgrest`），然後重啟該服務，例如：
   ```
   docker compose restart rest
   ```

## 3. （可選，建議做）關閉公開註冊

因為這個 App 只有你自己用，不需要開放任何人在登入頁自行註冊帳號：

1. 在同一個 `.env` 加上：
   ```
   DISABLE_SIGNUP=true
   ```
2. 重啟 auth 服務（官方名稱通常是 `auth`）：
   ```
   docker compose restart auth
   ```

如果你的 Supabase 本來就沒有對外公開，這步可以先跳過。

## 4. 決定要用哪個使用者帳號

`auth.users` 是整個 Supabase 實例共用的，不是每個專案（schema）各自獨立。所以你可以：

- **沿用既有帳號**（例如其他專案已經在用的帳號）：到 Studio → Authentication → Users，或用 SQL `select id, email from auth.users;` 找到 UUID。
- 或到 Studio → Authentication → 「Add user」另外建立一個新帳號。

## 5. 建立 Inbox 清單

把 `seed.sql` 裡的 `<the-one-user-uuid>` 換成第 4 步拿到的 UUID，然後在 SQL editor 執行一次。

## 6. 環境變數

把 App 用的 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（網頁版）與 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`（小工具）指到你的 VPS 網址與 anon key（在 Studio → Project Settings → API 可以找到）。參考根目錄的 `.env.example`。

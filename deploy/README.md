# 部署到 VPS（Docker）

網頁版用 Next.js 的 `output: "standalone"` 模式建置成一個獨立的 Docker image，只需要 Node runtime，不需要在 VPS 上額外裝 Node/pnpm。

## 1. 把專案拉到 VPS 上

```bash
git clone git@github.com:garykh2008/to-do.git
cd to-do
```

之後要更新版本，直接 `git pull` 再重新 build（見下面「更新部署」）。

## 2. 設定環境變數

```bash
cd deploy
cp .env.example .env
nano .env   # 填入 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**注意**：`NEXT_PUBLIC_*` 這類變數 Next.js 會在 **build 的時候**直接寫死進前端的 JS 檔案裡，不是 container 啟動時才讀取。所以如果之後要換 Supabase 網址或 key，必須重新 `docker compose build`，只是 `restart` container 不會生效。

## 3. Build 並啟動

```bash
docker compose -f docker-compose.todo.yml up -d --build
```

第一次 build 會比較久（要下載 base image、跑 `pnpm install`、`next build`）。完成後容器只在 `127.0.0.1:3300` 監聽，不直接對外開放，由 Caddy 反向代理進來。

確認容器狀態：

```bash
docker compose -f docker-compose.todo.yml ps
docker compose -f docker-compose.todo.yml logs -f todo-web
```

先用 `curl http://localhost:3300` 確認本機能連上，再接 Caddy。

## 4. 設定 Caddy 反向代理

把 `todo.你的網域.com` 換成你實際要用的網域，並確認該網域的 DNS A/AAAA record 已經指向這台 VPS。

**如果 Caddy 是直接裝在 host 上**（不是跑在 Docker 裡），在 Caddyfile 加一段：

```
todo.你的網域.com {
    reverse_proxy localhost:3300
}
```

**如果 Caddy 本身也是跑在 Docker 裡**：因為 `todo-web` 目前只綁定 `127.0.0.1:3300`，Caddy 容器內部看不到 host 的 `localhost`。這種情況有兩個選擇：
- 讓 `todo-web` 加入 Caddy 所在的 Docker network，Caddyfile 改用 `reverse_proxy todo-web:3000`（容器名稱 + 容器內部的 port，不是 3300）。跟我說 Caddy 是用哪個 compose 專案跑的，我再幫你把 `docker-compose.todo.yml` 改成加入同一個 network。
- 或是把 `docker-compose.todo.yml` 裡的 port 改成綁定 `0.0.0.0:3300`（對外開放這個 port），Caddy 直接連 VPS 的 IP:3300 —— 這個做法比較不建議，等於繞過了 Docker network 隔離。

改完設定後：

```bash
caddy reload   # 或 systemctl reload caddy，依你實際的安裝方式
```

## 5. 更新部署

```bash
cd to-do
git pull
docker compose -f deploy/docker-compose.todo.yml up -d --build
```

## 6. 驗證

- 瀏覽器開 `https://todo.你的網域.com`，應該會看到登入頁
- 用你自己的帳號登入，確認能讀到清單、新增待辦事項
- 跟本機開發時一樣，如果卡在「Invalid schema: todo」，代表 Supabase 那邊 `PGRST_DB_SCHEMAS` 設定還沒生效（參考 `supabase/README.md`），跟部署本身無關

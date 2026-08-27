import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, isAbsolute, join, relative } from "node:path";
import { dispatchLocalEngine, type LocalDataState } from "./localDataEngine";
import { localWebDistPath } from "./localWebPath";

const PORT = 51823;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleRpc(
  req: IncomingMessage,
  res: ServerResponse,
  onStateChanged: (state: LocalDataState) => void,
): Promise<void> {
  try {
    const body = await readBody(req);
    const { method, args } = JSON.parse(body || "{}") as { method: string; args?: unknown[] };
    const result = await dispatchLocalEngine(method, args ?? []);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(result));
    // 從瀏覽器頁面改的資料，也讓開著的小工具視窗跟著更新，不用兩邊各自手動重新整理。
    if (method !== "getState") onStateChanged(result);
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  }
}

function resolveStaticFile(distDir: string, urlPath: string): string {
  const requested = join(distDir, urlPath === "/" ? "index.html" : urlPath);
  // 防路徑穿越：算出相對路徑，只要跳出 distDir（開頭是 ".." 或變成絕對路徑）就一律退回首頁，
  // 反正這是單頁 SPA，找不到對應靜態檔的路徑本來就該交給前端路由處理。
  const rel = relative(distDir, requested);
  if (rel.startsWith("..") || isAbsolute(rel) || !existsSync(requested)) {
    return join(distDir, "index.html");
  }
  return requested;
}

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  const distDir = localWebDistPath();
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
  const filePath = resolveStaticFile(distDir, urlPath);
  try {
    const content = readFileSync(filePath);
    const type = MIME_TYPES[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

let started = false;

/**
 * 給小工具本機模式「開啟網頁」用的本機 HTTP server：靜態檔案伺服器（發布 apps/local-web
 * 的 build 產物）+ 一個 POST /api/rpc 端點（見 localDataEngine.ts 的 dispatchLocalEngine）。
 * 完全沒有身份驗證，所以只綁 127.0.0.1（loopback），不對區域網路開放。
 */
export function startLocalWebServer(onStateChanged: (state: LocalDataState) => void): void {
  if (started) return;
  started = true;

  const server = createServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/rpc") {
      void handleRpc(req, res, onStateChanged);
      return;
    }
    serveStatic(req, res);
  });

  server.on("error", (error) => {
    console.error("[localWebServer] 啟動失敗：", error);
  });

  server.listen(PORT, "127.0.0.1");
}

export function localWebUrl(): string {
  return `http://127.0.0.1:${PORT}`;
}

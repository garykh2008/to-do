// 極簡 service worker：只負責讓瀏覽器判定「可安裝成 App」，不做離線資料快取
// （待辦事項要即時，不希望使用者看到過期的快取內容）。
// 只快取同來源的頁面殼層，離線時至少能看到一個能重新連線的畫面，
// Supabase 的 API 請求（跨網域）完全不經過這裡的快取邏輯。

const CACHE_NAME = "todo-shell-v1";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((cached) => cached ?? caches.match("/"))),
  );
});

// ═══════════════════════════════════════════════════════════
// PrepareKora — Service Worker
// Safe caching: only static public assets are cached.
// API responses, private data, and auth tokens are NEVER cached.
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = "preparekora-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./about.html",
  "./find-us.html",
  "./terms.html",
  "./privacy-policy.html",
  "./login.html",
  "./signup.html",
  "./style.css",
  "./assets/icons/favicon.svg",
  "./js/translation.js",
  "./js/loader.js",
  "./js/main.js",
  "./js/auth.js",
  "./manifest.webmanifest"
];

// API origin that must NEVER be cached
const API_HOSTS = ["preparekora-worker.yadavsubba2003.workers.dev"];

// ─────────────────────────────────────────────────────────
// INSTALL
// ─────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add assets one-by-one so a single 404 doesn't fail the entire install
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[sw] Failed to cache:", url, err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ─────────────────────────────────────────────────────────
// ACTIVATE — clean old caches
// ─────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────
// FETCH — cache-first for static, network-only for API
// ─────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== "GET") return;

  // Never cache API calls
  if (API_HOSTS.includes(url.hostname)) {
    return; // Let network handle it — do not intercept
  }

  // Never cache chrome-extension or cross-origin (except firebase auth)
  if (url.origin !== self.location.origin) return;

  // Never cache HTML that might be private (dashboard, mock-test, admin)
  const privatePages = ["dashboard.html", "mock-test.html", "admin.html"];
  const pathName = url.pathname.split("/").pop();
  if (privatePages.includes(pathName)) return;

  // Cache-first, then network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Only cache successful same-origin responses
        if (res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (req.mode === "navigate") {
          return caches.match("./index.html");
        }
        return new Response("Offline", { status: 503 });
      });
    })
  );
});

// ─────────────────────────────────────────────────────────
// MESSAGE — allow page to trigger skipWaiting
// ─────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

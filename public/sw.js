const CACHE_NAME = "edutap-pwa-v2";
const OFFLINE_URL = "/offline";
const CORE_ASSETS = [OFFLINE_URL, "/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Next.js chunks and API responses must always come from the network. Caching
  // them independently can combine fresh server HTML with stale client code and
  // cause hydration errors after a deployment.
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/") || url.pathname === "/sw.js") {
    return;
  }

  if (CORE_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "EduTap",
    body: "You have a new EduTap alert.",
    data: {}
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = {
        title: "EduTap",
        body: event.data.text() || "You have a new EduTap alert.",
        data: {}
      };
    }
  }

  const title = payload.title || "EduTap";
  const options = {
    body: payload.body || payload.message || "",
    icon: "/icons/icon-192.svg",
    badge: "/icons/maskable-192.svg",
    data: payload.data || payload,
    tag: payload.tag || payload.data?.type || "edutap-alert"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.actionUrl || event.notification.data?.url || "/portal/notifications", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        return existing.focus().then((client) => client.navigate(targetUrl));
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

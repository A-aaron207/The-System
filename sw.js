// ═══════════════════════════════════════════════════
// THE SYSTEM — Service Worker v9.1.0
// GitHub Pages compatible, smart caching strategies
// ═══════════════════════════════════════════════════

const CACHE_VERSION = 'system-v9.1.0';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;
const FONT_CACHE    = `${CACHE_VERSION}-fonts`;
const ALL_CACHES    = [STATIC_CACHE, IMAGE_CACHE, FONT_CACHE];

// GitHub Pages compatible base path
const BASE = self.registration.scope;

// ── ASSETS TO PRE-CACHE ──────────────────────────────
const STATIC_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'offline.html',
  BASE + 'manifest.json',
  BASE + 'system-v5.js',
  BASE + 'system-v6.js',
  BASE + 'system-v7.js',
  BASE + 'system-v8.js',
  BASE + 'system-ai-model.js',
  BASE + 'system-v9.js',
  BASE + 'system-native-notifications.js',
  BASE + 'firebase-config.js',
  BASE + 'system-cloud.js',
];

const IMAGE_ASSETS = [
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
];

const FONT_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap',
];

// ── INSTALL: Pre-cache all assets ────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(c =>
        c.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[SW] Some static assets failed to cache:', err);
        })
      ),
      caches.open(IMAGE_CACHE).then(c =>
        c.addAll(IMAGE_ASSETS).catch(err => {
          console.warn('[SW] Some image assets failed to cache:', err);
        })
      ),
      caches.open(FONT_CACHE).then(c =>
        c.addAll(FONT_ASSETS).catch(err => {
          console.warn('[SW] Some font assets failed to cache:', err);
        })
      ),
    ])
  );
  self.skipWaiting();
});

// ── ACTIVATE: Clean old caches ───────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !ALL_CACHES.includes(k))
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => {
      // Notify all clients about the new version
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
      });
    })
  );
  self.clients.claim();
});

// ── FETCH: Smart strategy routing ───────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http requests
  if (!request.url.startsWith('http')) return;

  // ── FONTS: Cache First ──────────────────────────
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // ── IMAGES: Cache First ─────────────────────────
  if (request.destination === 'image') {
    e.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // ── JS: Stale While Revalidate ──────────────────
  if (request.destination === 'script' || request.destination === 'style') {
    e.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // ── HTML (navigation): Network First ───────────
  if (request.mode === 'navigate' || request.destination === 'document') {
    e.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // ── Everything else: Network First ─────────────
  e.respondWith(networkFirst(request, STATIC_CACHE));
});

// ── STRATEGY: Cache First ────────────────────────────
async function cacheFirst(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaque') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// ── STRATEGY: Network First ──────────────────────────
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline page for navigations
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(BASE + 'offline.html');
      return offlinePage || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
    }
    return new Response('Offline', { status: 503 });
  }
}

// ── STRATEGY: Stale While Revalidate ────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cached || fetchPromise;
}

// ── PUSH NOTIFICATIONS ───────────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'THE SYSTEM', body: 'System alert.', urgent: false, tag: 'system' };
  try { data = Object.assign(data, e.data.json()); } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: BASE + 'icons/icon-192.png',
      badge: BASE + 'icons/icon-192.png',
      vibrate: data.urgent ? [200, 100, 200, 100, 400] : [100, 50, 100],
      requireInteraction: !!data.urgent,
      tag: data.tag,
      data: { url: BASE },
    })
  );
});

// ── NOTIFICATION CLICK ───────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url === BASE && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(BASE);
    })
  );
});

// ── BACKGROUND SYNC ──────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'overdue-check') {
    e.waitUntil(
      self.registration.showNotification('⚠ THE SYSTEM', {
        body: 'You have overdue quests. The System is watching.',
        icon: BASE + 'icons/icon-192.png',
        badge: BASE + 'icons/icon-192.png',
        vibrate: [300, 100, 300],
        requireInteraction: true,
        tag: 'overdue',
      })
    );
  }
});

// ── PERIODIC BACKGROUND SYNC (Chrome Android) ────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'daily-reminder') {
    e.waitUntil(
      self.registration.showNotification('⚡ THE SYSTEM', {
        body: 'Daily quests are waiting. Do not break your streak.',
        icon: BASE + 'icons/icon-192.png',
        badge: BASE + 'icons/icon-192.png',
        vibrate: [100, 50, 100],
        tag: 'daily',
      })
    );
  }
});

// ── MESSAGE HANDLER ───────────────────────────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

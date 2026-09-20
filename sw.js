/* Tankebænken service worker.
   Rule from the fitness system, kept as law: bump CACHE on EVERY deploy. */
const CACHE = 'tankebaenken-1.1.1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  /* Only ever handle our own origin. Found 20 Sep 2026: the asset branch below was
     catching calls to api.github.com too, so a 401 from a bad token got cached and
     was replayed forever — and a cached 200 would have frozen the store just as
     badly. The API must reach the network every time. */
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    // Network-first for HTML: always try for the fresh app, fall back to cache offline.
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  } else {
    // Cache-first for assets.
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});

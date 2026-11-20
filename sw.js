---
layout: null
permalink: /sw.js
sitemap: false
---
// Offline reading. Pages: network first, so an online visit always gets the current HTML; each page that loads is
// saved, and offline the saved copy (or /offline/) is shown. Assets: cache first inside this build's cache, which is
// renamed on every Jekyll build, so a new deploy starts a fresh cache and drops the old one.
// To retire offline support, do NOT delete this file: replace its body with a worker that deletes every 'cp-*' cache and
// calls self.registration.unregister(), and keep it deployed until visitors have picked it up.
{% assign VERSION = site.time | date: '%s' | prepend: '?v=' %}
const CACHE = 'cp-{{ site.time | date: "%s" }}';  // the stylesheet and shared scripts carry the same ?v= (default.html)
const OFFLINE = {{ '/offline/' | relative_url | jsonify }};
const ASSETS = {{ '/assets/' | relative_url | jsonify }};
const SEARCH = {{ '/search.json' | relative_url | jsonify }};
const PRECACHE = [
  {{ '/' | relative_url | jsonify }},
  OFFLINE,
  {{ '/assets/css/style.css' | relative_url | append: VERSION | jsonify }},
  {{ '/assets/js/theme.js' | relative_url | append: VERSION | jsonify }},
  {{ '/assets/js/palette.js' | relative_url | append: VERSION | jsonify }},
  {{ '/assets/js/lib/lenis.min.js' | relative_url | append: VERSION | jsonify }},
  {{ '/assets/js/motion.js' | relative_url | append: VERSION | jsonify }},
  {{ '/assets/js/mastery.js' | relative_url | append: VERSION | jsonify }},
  {{ '/assets/js/home.js' | relative_url | append: VERSION | jsonify }},
  {{ '/assets/js/hero-animals.js' | relative_url | append: VERSION | jsonify }},
  {{ '/assets/js/algo-visualizer.js' | relative_url | append: VERSION | jsonify }},
  {{ '/assets/js/constellation-graph.js' | relative_url | append: VERSION | jsonify }},
  {{ '/assets/fonts/Geist-Variable-latin.woff2' | relative_url | jsonify }},
  {{ '/assets/fonts/GeistMono-Variable-latin.woff2' | relative_url | jsonify }}
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cp-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Store only successful same-origin responses (status 200-299, type 'basic').
const storable = (res) => res.ok && res.type === 'basic';

function save(event, req, res) {
  if (storable(res)) {
    const copy = res.clone();
    event.waitUntil(caches.open(CACHE).then((cache) => cache.put(req, copy)));
  }
  return res;
}

async function networkFirst(event, req, fallback) {
  try {
    // 'no-cache' makes the browser's HTTP cache check with the server before reusing a stored page.
    return save(event, req, await fetch(req, { cache: 'no-cache' }));
  } catch (err) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (fallback) {
      const offline = await cache.match(OFFLINE);
      if (offline) return offline;
    }
    throw err;
  }
}

async function cacheFirst(event, req) {
  const hit = await (await caches.open(CACHE)).match(req);
  return hit || save(event, req, await fetch(req));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') event.respondWith(networkFirst(event, req, true));
  else if (url.pathname === SEARCH) event.respondWith(networkFirst(event, req, false));
  else if (url.pathname.startsWith(ASSETS) && !req.headers.has('range')) event.respondWith(cacheFirst(event, req));
  // Everything else (sw.js, feed.xml, the manifest, sitemap) goes straight to the network.
});

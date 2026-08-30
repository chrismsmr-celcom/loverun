/**
 * SERVICE WORKER - LoveRun
 * Cache strategy et offline support
 */

const CACHE_NAME = 'loverun-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/utils/constants.js',
  '/utils/helpers.js',
  '/manifest.json',
  'https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.js',
  'https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css',
  'https://unpkg.com/lucide@0.451.0/dist/umd/lucide.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://sdk.scdn.co/spotify-player.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap',
];

// === INSTALL EVENT ===
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache uniquement les assets critiques
      const criticalAssets = ASSETS_TO_CACHE.slice(0, 6);
      return cache.addAll(criticalAssets).catch(err => {
        console.warn('Cache install failed (non-critical):', err);
      });
    })
  );
  self.skipWaiting();
});

// === ACTIVATE EVENT ===
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// === FETCH EVENT ===
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external APIs (Spotify, DeepSeek, etc)
  if (
    url.origin !== location.origin &&
    !url.host.includes('api.mapbox.com') &&
    !url.host.includes('fonts.googleapis.com')
  ) {
    return;
  }

  // === CACHE FIRST STRATEGY (Assets statiques) ===
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) return response;

        return fetch(request).then(freshResponse => {
          if (!freshResponse || freshResponse.status !== 200) {
            return freshResponse;
          }

          // Clone et cache la réponse
          const responseToCache = freshResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });

          return freshResponse;
        });
      })
    );
  }

  // === NETWORK FIRST STRATEGY (API calls) ===
  else {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache les réponses ok
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback au cache
          return caches.match(request).then(response => {
            if (response) return response;

            // Offline fallback
            if (request.headers.get('accept').includes('application/json')) {
              return new Response(
                JSON.stringify({
                  offline: true,
                  error: 'Vous êtes hors ligne',
                }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            }

            return new Response('Vous êtes hors ligne', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            });
          });
        })
    );
  }
});

// === HELPER FUNCTIONS ===
function isStaticAsset(url) {
  const path = url.pathname;
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.woff', '.woff2'];
  return staticExtensions.some(ext => path.endsWith(ext));
}

// === BACKGROUND SYNC ===
self.addEventListener('sync', event => {
  if (event.tag === 'sync-runs') {
    event.waitUntil(syncRuns());
  }
});

async function syncRuns() {
  try {
    const db = await openDB();
    const unsyncedRuns = await db.getAll('unsyncedRuns');

    for (const run of unsyncedRuns) {
      await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(run),
      });

      await db.delete('unsyncedRuns', run.id);
    }
  } catch (error) {
    console.error('Sync failed:', error);
    throw error; // Retry
  }
}

// === PERIODIC BACKGROUND SYNC (optionnel) ===
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-stats') {
    event.waitUntil(updateStats());
  }
});

async function updateStats() {
  // Mettre à jour les stats en arrière-plan
  console.log('Updating stats in background');
}

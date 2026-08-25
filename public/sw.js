/**
 * Basit uygulama kabuğu önbelleği (PWA "ana ekrana ekle" için).
 *
 * DİKKAT — geçmişte yaşanan hata: eksik bir dosya istendiğinde sunucu
 * SPA yönlendirmesi gereği 200 + index.html döndürüyor. Bu yanıt asset
 * adresinin altına önbelleklenince, dosya sonradan eklense bile "önbellek
 * önce" kuralı bozuk HTML'i servis etmeye devam ediyordu (arka planlar ve
 * sesler görünmüyordu). Bu yüzden:
 *   1) belge olmayan isteklerde HTML yanıtı ASLA önbelleğe alınmaz,
 *   2) önbellekte böyle bir kalıntı bulunursa yok sayılıp ağa gidilir.
 */
const CACHE = 'vampir-koylu-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

/** Yanıt bu istek için önbelleğe alınabilir mi? */
function isCacheable(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return false;
  const type = response.headers.get('content-type') || '';
  // Belge dışı bir istek HTML döndüyse bu, eksik dosyanın SPA yedeğidir.
  if (request.destination !== 'document' && type.includes('text/html')) return false;
  return true;
}

/** Önbellekteki kayıt gerçekten bu isteğin yanıtı mı? */
function isUsable(request, response) {
  if (!response) return false;
  const type = response.headers.get('content-type') || '';
  if (request.destination !== 'document' && type.includes('text/html')) return false;
  return true;
}

function putInCache(request, response) {
  if (!isCacheable(request, response)) return;
  const copy = response.clone();
  void caches.open(CACHE).then((cache) => cache.put(request, copy));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // WebSocket yükseltmeleri ve oda aktarıcısı önbelleğe girmez.
  if (url.pathname.startsWith('/room/')) return;

  // Gezinme istekleri: ağ önce, çevrimdışıysa önbellekten kabuk.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          putInCache(request, response);
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit ?? caches.match('./'))),
    );
    return;
  }

  // Statik dosyalar: önbellek önce, ama bozuk kalıntı varsa ağa git.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (isUsable(request, hit)) return hit;
      return fetch(request).then((response) => {
        putInCache(request, response);
        return response;
      });
    }),
  );
});

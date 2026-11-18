const galenoApp = "galeno-sv-v1";

const cacheFiles = [
  "./",
  "./index.html",
  "./manifest.json",
  "./js/ofiuco-spa-orquestador.js",
  "./resources/styles/main.css",
  "./resources/styles/palette.css",
  "./resources/styles/components/page_consulta.css",
  "./resources/styles/login.css",
  "./resources/styles/login_button.css",
  "./resources/styles/login_card.css",
  "./resources/img/icons/galeno-17-09-2026.svg",
  "./resources/img/icons/galeno-06-10-2026.svg",
];

// 1. Instalación: precachea los recursos estáticos de la aplicación
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(galenoApp).then((cache) => {
      return cache.addAll(cacheFiles);
    }),
  );
  self.skipWaiting();
});

// 2. Activación: elimina cachés de versiones anteriores
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== galenoApp)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

// 3. Intercepción de peticiones (online / offline)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Peticiones al API REST (puerto 9080 u otro origen): Network-First con respaldo en caché
  if (
    url.origin !== self.location.origin ||
    url.pathname.includes("/resources/v1/")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copia = networkResponse.clone();
            caches
              .open(galenoApp)
              .then((cache) => cache.put(event.request, copia));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Total-registros": "0",
              "X-Offline-Fallback": "true",
            },
          });
        }),
    );
    return;
  }

  // Archivos estáticos de la SPA (HTML, JS, CSS, imágenes): Cache-First
  // Además cachea dinámicamente cada módulo ES (.js) y CSS que cargue la SPA al navegar
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copia = networkResponse.clone();
            caches
              .open(galenoApp)
              .then((cache) => cache.put(event.request, copia));
          }
          return networkResponse;
        })
      );
    }),
  );
});

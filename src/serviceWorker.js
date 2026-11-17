const galenoApp = "galeno-sv-v1";

const cacheFiles = [
  "./",
  "./index.html",
  "./src/manifest.json",
  "./src/resources/styles/main.css",
  "./src/resources/styles/palette.css",
  "./src/resources/styles/components/auto_complete.css",
  "./src/resources/styles/components/busqueda_citas.css",
  "./src/resources/styles/components/button.css",
  "./src/resources/styles/components/confirm_dialog.css",
  "./src/resources/styles/components/exam_assigner.css",
  "./src/resources/styles/components/exam_results.css",
  "./src/resources/styles/components/icon.css",
  "./src/resources/styles/components/page_consulta.css",
  "./src/resources/styles/components/patient_info.css",
  "./src/resources/styles/components/toast.css",
  "./src/resources/img/icon-192.png",
  "./src/resources/img/icon-512.png",
  // Agrega aquí tus rutas de JS principales (ej. "./src/js/app.js", servicios y componentes)
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
  // Solo cachear peticiones GET
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Si es una petición al API REST (ej. puerto 9080 o ruta /resources/ /api/)
  // usar Network-First con respaldo en caché para modo offline
  if (
    url.origin !== self.location.origin ||
    url.pathname.includes("/resources/")
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
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // Para archivos estáticos de la SPA (HTML, JS, CSS, imágenes): Cache-First
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

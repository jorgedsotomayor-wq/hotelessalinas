/* Offline support for the Jorge A games: pages and scripts load from the network when possible, pictures from the cache. */
var CACHE = "jorge-a-v4";
var FILES = [
"/juego/inicio.html",
"/juego/index.html",
"/juego/mar.html",
"/juego/pesca.html",
"/juego/pesca-niveles.js",
"/juego/manifest.webmanifest",
"/juego/img/app-bucear.png",
"/juego/img/app-correr.png",
"/juego/img/app-pescar.png",
"/juego/img/app-icon-180.png",
"/juego/img/app-icon-192.png",
"/juego/img/app-icon-512.png",
"/juego/img/buzo.png",
"/juego/img/calle.png",
"/juego/img/edificio-1.png",
"/juego/img/edificio-2.png",
"/juego/img/edificio-3.png",
"/juego/img/malecon.png",
"/juego/img/mar-anchor.png",
"/juego/img/mar-angel.png",
"/juego/img/mar-coral.png",
"/juego/img/mar-jelly.png",
"/juego/img/mar-manta.png",
"/juego/img/mar-octopus.png",
"/juego/img/mar-puffer.png",
"/juego/img/mar-rock.png",
"/juego/img/mar-school.png",
"/juego/img/mar-seaweed.png",
"/juego/img/mar-shark.png",
"/juego/img/mar-spondylus.png",
"/juego/img/mar-tropical.png",
"/juego/img/mar-turtle.png",
"/juego/img/mar-urchin.png",
"/juego/img/mar-whale.png",
"/juego/img/nino.png",
"/juego/img/nube-1.png",
"/juego/img/nube-2.png",
"/juego/img/nube-3.png",
"/juego/img/ob-ball.png",
"/juego/img/ob-banana.png",
"/juego/img/ob-cart.png",
"/juego/img/ob-castle.png",
"/juego/img/ob-cooler.png",
"/juego/img/ob-gull.png",
"/juego/img/ob-man.png",
"/juego/img/ob-surf.png",
"/juego/img/ob-umbrella.png",
"/juego/img/ob-woman.png",
"/juego/img/palma-1.png",
"/juego/img/palma-2.png",
"/juego/img/palma-3.png",
"/juego/img/skyline.png",
"/juego/img/sol.png",
"/juego/img/sprite-casas.png",
"/juego/img/sprite-costa-azul.png",
"/juego/img/sprite-hotel-salinas.png",
"/juego/img/sprite-suite-salinas.png"
];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener("fetch", function (e) {
  var r = e.request; if (r.method !== "GET") return;
  var url = new URL(r.url);
  if (url.origin !== location.origin) return;
  if (r.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith(".js")) {
    e.respondWith(fetch(r).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); return res; }).catch(function () { return caches.match(r, { ignoreSearch: true }).then(function (m) { return m || caches.match("/juego/inicio.html"); }); }));
  } else {
    e.respondWith(caches.match(r, { ignoreSearch: true }).then(function (m) { return m || fetch(r).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); return res; }); }));
  }
});

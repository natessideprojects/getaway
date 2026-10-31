const CACHE='getaway-shell-v5';
const SHELL=['/','/index.html','/styles.css','/base.css','/app.mjs','/airports.mjs','/carriers.mjs','/regions.mjs','/search-plan.mjs','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;if(!SHELL.includes(url.pathname))return;event.respondWith(fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return r;}).catch(()=>caches.match(event.request)));});

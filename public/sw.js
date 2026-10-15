// Only public branding and the generic offline screen are stored here.
// Never cache signed-in pages, API responses, video records or credentials.
const CACHE='three21-public-v1';
const PUBLIC_FILES=['/offline.html','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-512.png','/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC_FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('three21-public-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(async()=>await caches.match('/offline.html')||new Response('You are offline. Reconnect and try again.',{status:503,headers:{'Content-Type':'text/plain'}})));
 }else if(PUBLIC_FILES.includes(url.pathname)&&!url.search){
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
 }
});

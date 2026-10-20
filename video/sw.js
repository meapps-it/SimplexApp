const CACHE='simplex-video-v12';
const SHELL=['./','./index.html','./style.css?v=9','./app.js?v=7','./manifest.webmanifest','../install-pwa.js?v=5','../assets/pwa-192.png','../assets/pwa-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('simplex-video-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put('./index.html',copy));
      return r;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{
    if(r.ok)caches.open(CACHE).then(c=>c.put(req,r.clone()));
    return r;
  })));
});
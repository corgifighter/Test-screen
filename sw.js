const CACHE='hearthmere-v45';
const CORE=["./","./index.html","./app.js","./manifest.webmanifest","./assets/ASSET_MANIFEST.json"];
const CDN=[
  "https://cdn.jsdelivr.net/npm/three@0.181.1/build/three.module.js",
  "https://cdn.jsdelivr.net/npm/three@0.181.1/examples/jsm/controls/OrbitControls.js",
  "https://cdn.jsdelivr.net/npm/three@0.181.1/examples/jsm/loaders/GLTFLoader.js"
];
self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(async c=>{
    await c.addAll(CORE);
    // Prime the Three.js runtime while online. Cross-origin CORS responses
    // are cacheable and can subsequently be served without another network hop.
    await Promise.all(CDN.map(async u=>{
      try { const r=await fetch(u,{mode:'cors'}); if(r.ok) await c.put(u,r.clone()); } catch(_) {}
    }));
  }).then(()=>self.skipWaiting())
));
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=e.request.url;
  e.respondWith(caches.match(e.request).then(r=>{
    if(r) return r;
    return fetch(e.request).then(res=>{
      if(res.ok && (new URL(url).origin===location.origin || CDN.includes(url))){
        const copy=res.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy));
      }
      return res;
    }).catch(()=>caches.match('./index.html'));
  }));
});

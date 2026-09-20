// Uygulamayı telefona kaydeder; internet olmasa da açılır.
// v2: sayfa açılırken önce internete bakar, böylece güncellemeler hemen gelir.
const CACHE='ajanda-v5';
const FILES=['./','./index.html','./icon.png','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  const ks=await caches.keys();
  await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
  // eski sürüm ekranda kaldıysa bir kez tazele (kayıtlar telefonda, silinmez)
  const cs=await self.clients.matchAll({type:'window'});
  // beklemeden tetikle: aktivasyon bitmeden beklenirse sayfa kilitlenir
  cs.forEach(c=>{ try{ if('navigate' in c) c.navigate(c.url).catch(()=>{}) }catch(err){} });
})())});
function isPage(req){
  if(req.mode==='navigate'||req.destination==='document')return true;
  try{return new URL(req.url).pathname.endsWith('/index.html')}catch(e){return false}
}
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  if(isPage(req)){
    // önce internetten: yeni sürüm varsa ilk açılışta gelsin, internet yoksa kayıtlı sürüm açılsın
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);
      try{
        const r=await fetch(req,{cache:'no-store'});
        if(r&&r.ok){c.put('./index.html',r.clone());c.put('./',r.clone())}
        return r;
      }catch(err){
        return (await c.match(req,{ignoreSearch:true}))||(await c.match('./index.html'))||Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(req,{ignoreSearch:true});
    const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}).catch(()=>hit);
    return hit||net;
  }));
});

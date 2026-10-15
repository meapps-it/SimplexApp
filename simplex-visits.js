'use strict';
// SimplexApp: statistiche aggregate senza cookie, identificatori personali o IP.
(() => {
  const endpoint = CLOUD.url + '/rest/v1/rpc/simplex_track_event';
  const kinds = new Set(['visit','page','app_view','demo','open','download','contact']);
  const productPattern = /^[a-zA-Z0-9_-]{1,64}$/;
  const params = new URLSearchParams(location.search);
  const ref = (() => { try { return new URL(document.referrer).hostname.toLowerCase(); } catch { return ''; } })();
  const utm = (params.get('utm_source') || '').toLowerCase().slice(0,60);
  const source = /instagram|\binsta\b/.test(utm) || /(^|\.)instagram\.com$/.test(ref) ? 'instagram' :
    /facebook|\bmeta\b|\bfb\b/.test(utm) || /(^|\.)(facebook\.com|fb\.com|fb\.me|l\.facebook\.com)$/.test(ref) ? 'facebook' :
    /google/.test(utm) || /(^|\.)google\.[a-z.]+$/.test(ref) ? 'google' : !ref && !utm ? 'direct' : 'other';
  const isOwner = () => {
    try { return !!localStorage.getItem('simplex_admin_session'); } catch { return false; }
  };
  function route() {
    const hash = location.hash.replace(/^#/,'');
    if (hash.startsWith('app/')) {
      let product = '';
      try { product = decodeURIComponent(hash.slice(4)); } catch {}
      return {page:'detail',product:productPattern.test(product)?product:''};
    }
    return {page:['catalogo','preferiti'].includes(hash)?hash:'home',product:''};
  }
  function track(kind, product='', page=route().page) {
    if (isOwner() || !kinds.has(kind)) return;
    const data={p_kind:kind,p_page:page,p_source:source,p_product:productPattern.test(product)?product:''};
    try {
      fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',keepalive:true,
        headers:{'Content-Type':'application/json',apikey:CLOUD.key},
        body:JSON.stringify(data)
      }).catch(()=>{});
    } catch {}
  }
  function recordVisit() {
    if (isOwner()) return;
    let countVisit = true;
    try {
      const previous = Number(sessionStorage.getItem('simplex_visit_timestamp')||0);
      countVisit = !previous || Date.now()-previous>30*60*1000;
      sessionStorage.setItem('simplex_visit_timestamp',String(Date.now()));
    } catch {}
    if (countVisit) track('visit');
  }
  let lastRoute='', lastRouteAt=0;
  function routeChanged() {
    if (isOwner() || location.hash==='#admin') return;
    const current=route(), key=current.page+':'+current.product;
    if(key===lastRoute && Date.now()-lastRouteAt<1000) return;
    lastRoute=key;lastRouteAt=Date.now();
    track('page',current.product,current.page);
    if(current.page==='detail' && current.product) track('app_view',current.product,current.page);
  }
  recordVisit();
  routeChanged();
  addEventListener('hashchange',routeChanged);
  addEventListener('popstate',routeChanged);
  document.addEventListener('click',event=>{
    const el=event.target.closest('a,button');
    if(!el || el.closest('#adminView')) return;
    if(el.matches('[data-view],[data-cat]')) {
      setTimeout(routeChanged,0);
      return;
    }
    const link=el.closest('a');
    if(link && /^#app\//.test(link.getAttribute('href')||'')) return;
    if(link && (link.getAttribute('href')||'').startsWith('#contatti')) track('contact');
    if(el.matches('[data-customize]')) { track('contact',el.dataset.customize||''); return; }
    if(!el.closest('#detailView')) return;
    const {page,product}=route();
    if(!product || page!=='detail') return;
    const label=(el.textContent||'').trim().toLocaleLowerCase('it-IT');
    if(label.includes('demo')) track('demo',product);
    else if(label.includes('scarica') || el.classList.contains('google-play-download')) track('download',product);
    else if(label==='apri' || label.includes('versione completa')) track('open',product);
  }, {capture:true});
  document.addEventListener('submit',event=>{
    if(event.target.closest('#contatti') && !isOwner()) track('contact');
  },{capture:true});
})();

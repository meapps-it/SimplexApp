/* Reuse the existing home layout, catalogue and authenticated editor. */
(()=>{'use strict';
window.renderGestionaleSpotlight=function(apps=[]){
const box=document.getElementById('gestionaleSpotlight');if(!box)return;
const app=apps.find(a=>a.visiblePublic!==false&&(a.id==='simplexristo'||/^simplex\s*(risto|ristorante)$/i.test(a.name||'')));
const link=app?'#app/'+encodeURIComponent(app.id):'#soluzioni';
box.hidden=false;
box.innerHTML=`<div class="gestionale-spotlight-copy"><p class="spotlight-eyebrow">IN EVIDENZA SU SIMPLEXAPP</p><div class="spotlight-title-line"><h2 id="gestionaleSpotlightTitle">SimplexRisto</h2></div><p class="spotlight-lead">Dalla sala alla cucina, senza perdere una comanda.</p><p class="spotlight-description">Menu QR, ordinazioni da smartphone, tavoli e personale: gli strumenti per seguire il servizio.</p><div class="spotlight-chips" aria-label="Funzioni di SimplexRisto"><span>Menu QR</span><span>Ordini al tavolo</span><span>Comande cucina</span></div><div class="spotlight-actions"><a class="spotlight-main-action" href="${link}">Scopri SimplexRisto <span aria-hidden="true">→</span></a></div></div><div class="gestionale-spotlight-visual"><div class="risto-service-demo"><div class="risto-demo-top"><strong>SimplexRisto</strong><span>Esempio dimostrativo</span></div><h3>Il servizio di oggi</h3><div class="risto-demo-tables"><span>Tavolo 1<small>Libero</small></span><span>Tavolo 2<small>In preparazione</small></span><span>Tavolo 3<small>Libero</small></span></div><div class="risto-demo-ticket"><strong>Comanda · Tavolo 2</strong><p>2 × Spaghetti al pomodoro</p><p>1 × Insalata mista</p><span>In preparazione</span></div><p class="risto-demo-note">La sala e la cucina, nello stesso posto.</p></div></div>`;
if(app?.icon){const url=safeIcon(app.icon);document.querySelectorAll('.home-brand-logo').forEach(img=>{img.src=url;img.alt='SimplexRisto'});}
};
})();
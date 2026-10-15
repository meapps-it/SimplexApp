'use strict';
// Cruscotto visite: dati letti solo con JWT admin e verifica membership lato database.
(() => {
  const anchor=document.getElementById('adminAnalytics');
  if(!anchor) return;
  const root=document.createElement('section');
  root.id='adminVisits';
  root.className='admin-card visits-card';
  root.setAttribute('aria-label','Statistiche visite');
  anchor.before(root);
  let days=30,loading=false,loadedAt=0,data=null,error='';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const count=x=>Math.max(0,Number(x)||0);
  const fmt=x=>count(x).toLocaleString('it-IT');
  const titles={facebook:'Facebook',instagram:'Instagram',google:'Google',direct:'Accesso diretto',other:'Altre fonti'};
  const products=()=>{try{return getApps()||[]}catch{return []}};
  function visible(){
    return !document.getElementById('adminControls').classList.contains('hidden') &&
      !document.getElementById('adminAppsPanel').classList.contains('hidden') &&
      !document.getElementById('adminView').classList.contains('hidden');
  }
  function draw(){
    let inner='';
    if(loading && !data) inner='<p role="status">Caricamento delle visite…</p>';
    else if(error) inner='<p class="error" role="alert">'+esc(error)+'</p>';
    else if(!data) inner='<p>Statistiche non ancora disponibili.</p>';
    else {
      const t=data.totals||{},series=Array.isArray(data.days)?data.days:[],max=Math.max(1,...series.map(x=>count(x.visits)));
      const columns=[['Visite',t.visits,'Accessi stimati, non visitatori unici'],['Visualizzazioni',t.pageviews,'Visualizzazioni delle pagine del sito'],['App consultate',t.app_views,'Aperture delle schede delle applicazioni'],['Demo',t.demos,'Clic sui pulsanti demo']];
      const allSources=Array.isArray(data.sources)?data.sources:[],denom=Math.max(1,count(t.visits));
      const sourceHtml=allSources.length?allSources.map(s=>{
        const pct=Math.min(100,Math.round(count(s.visits)/denom*100));
        return '<div class="visits-source"><div><span>'+esc(titles[s.source]||'Altre fonti')+'</span><strong>'+fmt(s.visits)+' · '+pct+'%</strong></div><span class="visits-track"><span style="width:'+pct+'%"></span></span></div>';
      }).join(''):'<p class="note">Ancora nessuna provenienza registrata.</p>';
      const appRows=(Array.isArray(data.products)?data.products:[]).filter(x=>count(x.views)+count(x.demos)+count(x.opens)+count(x.downloads)>0);
      const productHtml=appRows.length?'<div class="visits-table-wrap"><table class="visits-table"><thead><tr><th>Applicazione</th><th>Schede</th><th>Demo</th><th>Apri</th><th>Download</th></tr></thead><tbody>'+appRows.map(x=>{
        const name=products().find(p=>p.id===x.product)?.name||x.product;
        return '<tr><th>'+esc(name)+'</th><td>'+fmt(x.views)+'</td><td>'+fmt(x.demos)+'</td><td>'+fmt(x.opens)+'</td><td>'+fmt(x.downloads)+'</td></tr>';
      }).join('')+'</tbody></table></div>':'<p class="note">Ancora nessun clic sulle applicazioni.</p>';
      const points=series.length>45?series.filter((x,i)=>i%3===0):series;
      inner='<div class="visits-overview">'+columns.map(([label,value,tip])=>'<div class="visits-kpi" title="'+esc(tip)+'"><span>'+esc(label)+'</span><strong>'+fmt(value)+'</strong></div>').join('')+'</div>'+
      '<h3>Visite nel periodo</h3><div class="visits-chart" role="img" aria-label="Andamento visite nei '+days+' giorni"><div class="visits-bars">'+points.map(d=>{
        const value=count(d.visits),height=Math.max(2,Math.round(value/max*100));
        const date=new Date(d.day+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'short'});
        return '<span class="visits-bar" style="height:'+height+'%" title="'+esc(date)+' · '+fmt(value)+' visite" aria-label="'+esc(date)+': '+fmt(value)+' visite"></span>';
      }).join('')+'</div></div><p class="visits-caption">Passa sul grafico per vedere il valore giornaliero. I grafici mostrano accessi, non persone identificate.</p>'+
      '<div class="visits-lower"><div><h3>Da dove arrivano</h3>'+sourceHtml+'</div><div><h3>Interesse per le applicazioni</h3>'+productHtml+'</div></div>'+
      '<p class="visits-caption">Statistiche anonime a partire dall’attivazione. Non sono disponibili dati delle visite precedenti. Le tue visite sul browser con sessione admin salvata sono escluse; filtri anti-bot non garantiti.</p>';
    }
    root.innerHTML='<div class="visits-header"><div><span class="analytics-eyebrow">PUBBLICO E INTERESSE</span><h2>Visite a SimplexApp</h2><p class="note">Scopri se Facebook, Instagram e Google portano persone al sito.</p></div><div class="visits-actions"><label>Periodo<select id="visits-range"><option value="7" '+(days===7?'selected':'')+'>7 giorni</option><option value="30" '+(days===30?'selected':'')+'>30 giorni</option><option value="90" '+(days===90?'selected':'')+'>90 giorni</option></select></label><button id="visits-refresh" type="button" class="secondary" '+(loading?'disabled':'')+'>Aggiorna</button></div></div><div aria-live="polite">'+inner+'</div>';
    root.querySelector('#visits-range').onchange=e=>{days=Number(e.target.value);data=null;load(true);};
    root.querySelector('#visits-refresh').onclick=()=>load(true);
  }
  async function load(force=false){
    if(!visible()||loading||(!force&&Date.now()-loadedAt<60000))return;
    loading=true;error='';draw();
    try{
      const token=await accessToken();
      const result=await cloudFetch('/rest/v1/rpc/simplex_visit_summary',{method:'POST',token,body:{p_days:days}});
      if(!result || !result.totals || !Array.isArray(result.days))throw Error('Risposta delle statistiche non valida');
      data=result;loadedAt=Date.now();
    }catch(e){error=e.message||'Impossibile caricare le statistiche';}
    finally{loading=false;draw();}
  }
  const watch=new MutationObserver(()=>{if(visible())load();});
  for(const id of ['adminControls','adminAppsPanel','adminView']){
    const target=document.getElementById(id);
    if(target)watch.observe(target,{attributes:true,attributeFilter:['class']});
  }
  document.getElementById('adminAppsTab')?.addEventListener('click',()=>setTimeout(()=>load(),0));
  addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  draw();
  if(visible())load();
})();

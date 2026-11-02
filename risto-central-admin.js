'use strict';
// Tokens stay in memory and cross only this exact parent/iframe pair.
(()=>{
 const origin='https://risto.simplexapp.it';
 const panel=document.getElementById('adminRestaurantsPanel');
 const host=document.getElementById('restaurantCentralHost');
 const status=document.getElementById('restaurantCentralStatus');
 let frame=null,generation=0,pending=null;
 function clear(){generation++;pending=null;if(frame){frame.contentWindow?.postMessage({type:'simplex-risto-clear'},origin);frame.remove();frame=null;}status.textContent='Accedi con il tuo account amministratore SimplexApp.';}
 async function send(){
  if(pending)return pending;
  const current=generation;
  pending=(async()=>{try{
   const verified=await adminCall('status');
   if(verified.admin!==true)throw Error('Account non autorizzato alla gestione ristoranti.');
   const token=await accessToken();
   if(current!==generation||!frame)return;
   frame.contentWindow?.postMessage({type:'simplex-risto-auth',token},origin);
   status.textContent='Clienti, piani e moduli SimplexRisto.';
  }catch(e){if(current===generation){clear();status.textContent=e.message;}}})().finally(()=>{if(current===generation)pending=null;});
  return pending;
 }
 async function open(){
  if(!await checkAdmin())return;
  adminSection('restaurants');
  if(frame)return send();
  status.textContent='Apertura gestione ristoranti…';
  frame=document.createElement('iframe');
  frame.title='Gestione centrale ristoranti SimplexRisto';
  frame.src=origin+'/platform?embed=1';
  frame.referrerPolicy='no-referrer';
  frame.style.cssText='display:block;width:100%;min-height:80vh;height:1050px;border:0;border-radius:16px;background:#f3f6f7';
  host.replaceChildren(frame);
 }
 document.getElementById('adminRestaurantsTab').onclick=open;
 document.getElementById('restaurantCentralRetry').onclick=open;
 window.addEventListener('message',event=>{
  if(event.origin!==origin||event.source!==frame?.contentWindow||event.data?.type!=='simplex-risto-ready')return;
  send();
 });
 window.simplexRistoCentral={clear};
 window.addEventListener('storage',event=>{if(event.key==='simplex_admin_session'&&!event.newValue)clear();});
 setInterval(()=>{if(!adminSession){if(frame)clear();return;}if(frame&&!panel.classList.contains('hidden')&&!document.hidden)send();},45000);
})();

'use strict';
// Presentation navigation only. Application routes and backend calls are unchanged.
(() => {
 function reveal(id){
  const section=document.getElementById(id);if(!section)return;
  if(document.getElementById('homeView').classList.contains('hidden'))navigate('home');
  if(id==='contatti')section.open=true;
  requestAnimationFrame(()=>section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
 }
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href="#soluzioni"],a[href="#contatti"]');if(!link)return;
  event.preventDefault();reveal(link.getAttribute('href').slice(1));
 });
 if(['#soluzioni','#contatti'].includes(location.hash))reveal(location.hash.slice(1));
})();

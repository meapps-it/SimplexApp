'use strict';
(()=>{
  const button=document.getElementById('installBtn');
  if(!button)return;

  let deferredPrompt=null;
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;

  function markInstalled(){
    button.textContent='Installata';
    button.disabled=true;
    button.setAttribute('aria-label','App già installata');
  }

  function showInstructions(){
    if(isStandalone()){markInstalled();return}
    const ua=navigator.userAgent||'';
    if(/iphone|ipad|ipod/i.test(ua)){
      alert('Per installare questa PWA: tocca Condividi e poi “Aggiungi alla schermata Home”.');
      return;
    }
    alert('Se il browser non apre l’installazione automatica, usa il menu ⋮ e scegli “Installa app” oppure “Aggiungi alla schermata Home”.');
  }

  if(isStandalone())markInstalled();

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    if(!isStandalone()){
      button.disabled=false;
      button.textContent='Installa';
    }
  });

  window.addEventListener('appinstalled',()=>{
    deferredPrompt=null;
    markInstalled();
  });

  button.addEventListener('click',async()=>{
    if(isStandalone()){markInstalled();return}
    if(!deferredPrompt){showInstructions();return}
    try{
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    }finally{
      deferredPrompt=null;
    }
  });
})();
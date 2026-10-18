'use strict';
(()=>{
  let deferredPrompt=null;
  let button=null;
  let installed=false;

  const manifestLink=()=>document.querySelector('link[rel="manifest"]');
  const manifestUrl=()=>{try{return new URL(manifestLink()?.href||location.href,location.href).href}catch{return location.href}};
  const markerKey=()=> 'simplex_pwa_installed:'+manifestUrl();
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;

  function getButton(){
    button=button||document.getElementById('installBtn');
    return button;
  }
  function hideButton(){
    const b=getButton(); if(!b)return;
    b.hidden=true;
    b.classList.add('hidden');
    b.setAttribute('aria-hidden','true');
  }
  function showButton(){
    const b=getButton(); if(!b||installed)return;
    b.hidden=false;
    b.classList.remove('hidden');
    b.removeAttribute('aria-hidden');
    b.disabled=false;
    b.textContent='Installa';
  }
  function rememberInstalled(){
    installed=true;
    try{localStorage.setItem(markerKey(),'1')}catch{}
    hideButton();
  }
  async function detectInstalled(){
    if(isStandalone()){rememberInstalled();return true}
    try{
      if(localStorage.getItem(markerKey())==='1'){installed=true;hideButton();return true}
    }catch{}
    try{
      if(typeof navigator.getInstalledRelatedApps==='function'){
        const apps=await navigator.getInstalledRelatedApps();
        if(Array.isArray(apps)&&apps.some(app=>app.platform==='webapp')){
          rememberInstalled();return true;
        }
      }
    }catch{}
    return false;
  }
  function manualInstructions(){
    if(/iphone|ipad|ipod/i.test(navigator.userAgent||'')){
      alert('Per installare questa PWA: tocca Condividi e poi “Aggiungi alla schermata Home”.');
    }else{
      alert('Apri il menu ⋮ del browser e scegli “Installa app” oppure “Aggiungi alla schermata Home”.');
    }
  }
  async function install(){
    if(await detectInstalled())return;
    if(!deferredPrompt){
      alert('Installazione non disponibile in questo browser in questo momento.');
      return;
    }
    const prompt=deferredPrompt;
    deferredPrompt=null;
    try{
      prompt.prompt();
      const choice=await prompt.userChoice;
      if(choice?.outcome==='accepted') setTimeout(detectInstalled,600);
    }catch{
      manualInstructions();
    }
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    showButton();
  });
  window.addEventListener('appinstalled',rememberInstalled);

  document.addEventListener('DOMContentLoaded',async()=>{
    const b=getButton();
    if(!b)return;
    b.addEventListener('click',install);
    if(await detectInstalled())return;
    showButton();
  });
})();
'use strict';
(()=>{
  let deferredPrompt=null;
  let installed=false;
  const getButton=()=>document.getElementById('installBtn');
  const manifestUrl=()=>{try{return new URL(document.querySelector('link[rel="manifest"]')?.href||location.href,location.href).href}catch{return location.href}};
  const isStandalone=()=>['standalone','fullscreen','minimal-ui','window-controls-overlay'].some(mode=>window.matchMedia?.('(display-mode: '+mode+')').matches)||navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const embedded=()=>/FBAN|FBAV|Instagram|; wv\)/i.test(navigator.userAgent||'');
  function renderButton(){
    const button=getButton();if(!button)return;
    const hide=installed||isStandalone()||embedded()||(!deferredPrompt&&!isIOS());
    button.hidden=hide;button.classList.toggle('hidden',hide);
    if(hide)button.setAttribute('aria-hidden','true');else button.removeAttribute('aria-hidden');
    button.disabled=false;button.textContent='Installa';
  }
  function rememberInstalled(){installed=true;renderButton();}
  async function detectInstalled(){
    if(isStandalone()){rememberInstalled();return;}
    // A stored flag cannot prove an app is still installed after uninstalling it.
    // Related apps must match THIS manifest, not merely share the same domain.
    try{
      const related=await navigator.getInstalledRelatedApps?.();
      if(Array.isArray(related)&&related.some(app=>{
        if(app.platform!=='webapp'||!app.url)return false;
        try{return new URL(app.url,location.href).href===manifestUrl();}catch{return false;}
      }))rememberInstalled();
    }catch{}
  }
  function manualInstructions(){
    const ua=navigator.userAgent||'';
    if(/FBAN|FBAV|Instagram|; wv\)/i.test(ua)){
      alert('Puoi usare l’app senza installarla. Per installarla, apri il menu e scegli “Apri nel browser”. Poi usa “Installa app” o “Aggiungi alla schermata Home” nel menu del browser.');
    }else if(/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)){
      alert('Puoi già usare l’app qui. Per installarla, apri il menu Condividi e scegli “Aggiungi alla schermata Home”.');
    }else{
      alert('Puoi già usare l’app nel browser. Per installarla, apri il menu del browser e scegli “Installa app” oppure “Aggiungi alla schermata Home”. Se non trovi queste voci, apri lo stesso indirizzo in un browser che supporta l’installazione.');
    }
  }
  function install(){
    if(isStandalone()){rememberInstalled();return;}
    if(!deferredPrompt){manualInstructions();return;}
    const prompt=deferredPrompt;deferredPrompt=null;
    const button=getButton();if(button)button.disabled=true;
    // Must run directly inside the click, before any asynchronous installation check.
    try{
      const showing=prompt.prompt();
      Promise.resolve(showing).then(()=>prompt.userChoice).then(()=>{
        renderButton();detectInstalled();
      }).catch(()=>{renderButton();manualInstructions();});
    }catch{renderButton();manualInstructions();}
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();if(installed||isStandalone())return;deferredPrompt=event;renderButton();
  });
  window.addEventListener('appinstalled',rememberInstalled);
  for(const mode of ['standalone','fullscreen','minimal-ui','window-controls-overlay'])window.matchMedia?.('(display-mode: '+mode+')').addEventListener?.('change',()=>{renderButton();detectInstalled();});
  window.addEventListener('pageshow',()=>{renderButton();detectInstalled();});
  function init(){const button=getButton();if(!button)return;button.addEventListener('click',install);installed=isStandalone();renderButton();detectInstalled();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

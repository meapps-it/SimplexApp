(()=> {
 const button=document.getElementById('installShop');
 const help=document.getElementById('installShopHelp');
 const standalone=matchMedia('(display-mode: standalone)');
 const installed=()=>standalone.matches||navigator.standalone===true;
 let promptEvent;
 function update(){button.hidden=installed();if(button.hidden)help.hidden=true;}
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  promptEvent=event;
  update();
 });
 window.addEventListener('appinstalled',()=>{
  promptEvent=null;
  button.hidden=true;
  help.hidden=true;
 });
 standalone.addEventListener?.('change',update);
 button.addEventListener('click',async()=>{
  if(promptEvent){
   const event=promptEvent;
   promptEvent=null;
   try{await event.prompt();return;}catch{}
  }
  help.textContent='Apri il menu del browser e scegli “Installa app” o “Aggiungi alla schermata Home”. Su iPhone, in Safari, usa Condividi → Aggiungi alla schermata Home.';
  help.hidden=!help.hidden;
 });
 update();
})();
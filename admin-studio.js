/* Admin presentation only: existing authenticated handlers own all writes. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),root=$('adminView'),editor=$('appEditor');
 if(!root||!editor||root.dataset.studioMounted)return;root.dataset.studioMounted='true';
 $('adminAppsPanel').prepend($('adminDashboard'));
 $('adminSearch').placeholder='Cerca per nome, categoria o stato…';
 const art={
  home:['#47c9ff','#2167e8','M9 23l15-13 15 13 M14 21v18h8V28h5v11h8V21'],
  favorites:['#ff91c9','#d94187','M24 38L11 25a8 8 0 0 1 11-12l2 2 2-2a8 8 0 0 1 11 12z'],
  apps:['#408dff','#1555d6','M12 12h10v10H12z M26 12h10v10H26z M12 26h10v10H12z M26 26h10v10H26z'],
  clients:['#43c9ff','#2961df','M18 23a6 6 0 1 0 0-12 6 6 0 0 0 0 12 M8 37v-4a10 10 0 0 1 20 0v4 M30 13a5 5 0 0 1 0 10 M33 28a8 8 0 0 1 7 8'],
  modules:['#ba8aff','#703bd7','M13 13h9v-2a4 4 0 0 1 8 0v2h7v9h-2a4 4 0 0 0 0 8h2v7H13V27h-2a4 4 0 0 1 0-8h2z'],
  demo:['#35dcc1','#0d8b8c','M19 10h10 M21 10v13L12 36h24l-9-13V10 M17 29h14'],
  settings:['#94a6c0','#445679','M20 10h8l1 6 5-2 4 7-5 4 1 5-7 5-4-4-5 2-5-7 4-4-1-6 6-3z M24 20a5 5 0 1 0 0 10 5 5 0 0 0 0-10'],
  image:['#fc96cb','#c13b86','M11 12h26v25H11z M11 31l8-9 8 9 4-4 6 7 M28 18h2'],
  link:['#4bd4ed','#087fae','M21 16l4-4a8 8 0 0 1 11 11l-5 5 M27 32l-4 4a8 8 0 0 1-11-11l5-5 M18 30l12-12'],
  publish:['#ffcd61','#ee8b23','M12 29v9h24v-9 M24 30V10 M16 18l8-8 8 8'],
  products:['#ffd469','#e48a20','M10 17l14-8 14 8v16l-14 8-14-8z M10 17l14 8 14-8 M24 25v16 M17 13l14 8v8'],
  inventory:['#ffbd77','#e06c24','M10 25l14-7 14 7-14 7z M10 31l14 7 14-7 M10 37l14 7 14-7 M17 15l7-4 7 4'],
  orders:['#d997ff','#8b3fce','M12 18h24l2 21H10z M18 19v-5a6 6 0 0 1 12 0v5'],
  services:['#ffbc78','#de702d','M28 11a10 10 0 0 0-12 13L8 34l6 6 10-10a10 10 0 0 0 13-12l-7 7-7-7z'],
  appointments:['#5bd7ee','#0c829f','M12 13h24v26H12z M12 21h24 M18 9v8 M30 9v8 M18 27h3 M27 27h3 M18 33h3'],
  suppliers:['#54dfb8','#10896b','M8 15h21v21H8z M29 22h7l5 8v6H29 M14 34a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M35 34a4 4 0 1 0 0 8 4 4 0 0 0 0-8'],
  statistics:['#a592ff','#5b44ce','M10 38h29 M14 32V23h5v9 M24 32V16h5v16 M34 32V9h5v23'],
  backup:['#7baaff','#3759cb','M11 30v9h26v-9 M24 10v20 M16 22l8 8 8-8']
 };
 let serial=0,step=0,iconURL='',baseline='',disposed=false,lastModuleProduct=null;const observers=[];
 function icon(name){const a=art[name]||art.modules,id='studio-g'+(++serial);return `<span class="studio-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><defs><linearGradient id="${id}" x1=".1" y1="0" x2=".8" y2="1"><stop stop-color="${a[0]}"/><stop offset=".6" stop-color="${a[1]}"/><stop offset="1" stop-color="${a[1]}"/></linearGradient><radialGradient id="${id}-light" cx=".2" cy="0" r="1"><stop stop-color="white" stop-opacity=".65"/><stop offset=".65" stop-color="white" stop-opacity="0"/></radialGradient></defs><rect x="3" y="6" width="42" height="40" rx="13" fill="${a[1]}"/><rect x="2" y="2" width="44" height="41" rx="13" fill="url(#${id})" stroke="${a[1]}" stroke-width=".7"/><rect x="2.6" y="2.6" width="42.8" height="39.8" rx="12.5" fill="url(#${id}-light)" stroke="white" stroke-opacity=".45" stroke-width=".8"/><path d="M9 13a8 8 0 0 1 8-6h15" stroke="white" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/><path d="${a[2]}" transform="translate(0 1.5)" stroke="#0b2349" stroke-opacity=".3" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="${a[2]}" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;}

 const iconFor=key=>({categories:'inventory',dashboard:'apps',clients:'clients',customers:'clients',warehouse:'inventory',movements:'inventory',quotes:'orders',documents:'orders',scan:'products',turni:'appointments'}[key]||key);
 $('addApp').innerHTML=icon('apps')+'<span>Nuova app</span>';
 const groups=[...editor.querySelectorAll(':scope > fieldset.editor-group')];
 const names=['Informazioni','Icona e screenshot','Foto della scheda','Accessi e download','Pubblicazione'];
 const kinds=['apps','image','image','link','publish'];
 const tools=document.createElement('div');tools.className='studio-editor-tools';tools.innerHTML='<div class="studio-editor-intro"><span class="studio-kicker">EDITOR APP</span><p>Una sezione alla volta. Le modifiche diventano online quando salvi.</p></div><div class="studio-steps" role="group" aria-label="Sezioni della scheda"></div>';
 editor.querySelector('#editorHint').after(tools);
 groups.forEach((group,i)=>{group.id='studio-section-'+i;const b=document.createElement('button');b.type='button';b.dataset.studioStep=i;b.setAttribute('aria-controls',group.id);b.innerHTML=icon(kinds[i])+`<span>${names[i]}</span>`;b.onclick=()=>selectStep(i);tools.querySelector('.studio-steps').append(b);});
 const preview=document.createElement('aside');preview.className='studio-preview';preview.setAttribute('aria-label','Anteprima della scheda non salvata');preview.innerHTML='<span class="studio-kicker">ANTEPRIMA SCHEDA</span><div class="studio-preview-heading"><img id="studioPreviewIcon" alt=""><div><strong id="studioPreviewName"></strong><small id="studioPreviewMeta"></small></div></div><p id="studioPreviewDescription"></p><span id="studioPreviewVisibility"></span>';
 tools.after(preview);
 const draftStatus=document.createElement('span');draftStatus.id='studioDraftStatus';draftStatus.setAttribute('role','status');editor.querySelector('.editor-actions').prepend(draftStatus);
 function fingerprint(){return JSON.stringify([...editor.querySelectorAll('input,select,textarea')].map(e=>[e.id,e.type==='file'?[...e.files].map(f=>[f.name,f.size,f.lastModified]):e.type==='checkbox'?e.checked:e.value]));}
 function selectStep(i,focus=false){step=i;groups.forEach((g,n)=>{g.hidden=n!==i;});tools.querySelectorAll('button').forEach((b,n)=>{b.setAttribute('aria-pressed',String(n===i));b.classList.toggle('active',n===i);});if(focus)groups[i].querySelector('input,textarea,select')?.focus();}
 function safeImage(value){try{const u=new URL(value,location.href);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'assets/logo.png';}catch{return 'assets/logo.png';}}
 function updatePreview(){if(disposed)return;
  $('studioPreviewName').textContent=$('appName').value.trim()||'Nome della tua app';
  $('studioPreviewMeta').textContent=[$('appCat').value,$('appVersion').value&&'v'+$('appVersion').value,$('appStatus').value].filter(Boolean).join(' · ');
  $('studioPreviewDescription').textContent=$('appDesc').value.trim()||'La descrizione breve della scheda apparirà qui.';
  $('studioPreviewVisibility').textContent=$('appPublic').checked?'Visibilità: catalogo pubblico':'Visibilità: solo amministratore';
  const src=iconURL||safeImage($('appIcon').value||window.getApps?.().find(a=>a.id===$('appId').value)?.icon||'assets/logo.png');
  if($('studioPreviewIcon').getAttribute('src')!==src)$('studioPreviewIcon').src=src;
  draftStatus.textContent=fingerprint()===baseline?'Nessuna modifica da salvare':'Modifiche da salvare';
 }
 $('studioPreviewIcon').addEventListener('error',()=>{if(!$('studioPreviewIcon').src.endsWith('/assets/logo.png'))$('studioPreviewIcon').src='assets/logo.png';});
 editor.addEventListener('input',updatePreview);editor.addEventListener('change',e=>{if(e.target.id==='appIconFile'){if(iconURL)URL.revokeObjectURL(iconURL);iconURL=e.target.files[0]?URL.createObjectURL(e.target.files[0]):'';}updatePreview();});
 editor.addEventListener('click',()=>queueMicrotask(updatePreview));
 function opened(){if(iconURL)URL.revokeObjectURL(iconURL);iconURL='';selectStep(0);baseline=fingerprint();updatePreview();}
 const filters=document.createElement('div');filters.className='studio-filters';filters.innerHTML='<label>Visibilità<select id="studioVisibility"><option value="">Tutte le app</option><option value="public">Pubbliche</option><option value="private">Solo admin</option></select></label><label>Ordina<select id="studioSort"><option value="default">Ordine catalogo</option><option value="name">Nome A–Z</option><option value="incomplete">Da completare prima</option></select></label><p id="studioResults" role="status"></p>';$('adminSearch').after(filters);
 function missing(a){return [!a.description,!a.icon,!a.screenshots?.length,!(a.webUrl||a.playUrl||a.apkUrl)].filter(Boolean).length;}
 function filterApps(apps){const v=$('studioVisibility').value;let result=apps.filter(a=>!v||(v==='private'?a.visiblePublic===false:a.visiblePublic!==false));if($('studioSort').value==='name')result.sort((a,b)=>a.name.localeCompare(b.name,'it'));if($('studioSort').value==='incomplete')result.sort((a,b)=>missing(b)-missing(a));$('studioResults').textContent=result.length+' app visualizzate';return result;}
 filters.addEventListener('change',()=>window.renderAdminList?.());
 function decorateCards(){const all=window.getApps?.()||[];root.querySelectorAll('#adminList .admin-item').forEach(card=>{if(card.dataset.studioCard)return;card.dataset.studioCard='true';const id=card.querySelector('[data-app-modules]')?.dataset.appModules,app=all.find(a=>a.id===id);if(!app)return;
  const badges=document.createElement('div');badges.className='studio-app-badges';for(const label of [app.visiblePublic===false?'Solo admin':'Pubblica',app.status||'Stato da definire',app.featured?'In evidenza':'']){if(!label)continue;const badge=document.createElement('span');badge.textContent=label;badge.dataset.status=/test|arrivo/i.test(label)?'pending':/admin/i.test(label)?'private':'available';badges.append(badge);}card.querySelector('.admin-app-heading').after(badges);
  const hint=document.createElement('p');hint.className='studio-completeness';hint.textContent=missing(app)?'Da completare: '+[!app.description&&'descrizione',!app.icon&&'icona',!app.screenshots?.length&&'screenshot',!(app.webUrl||app.playUrl||app.apkUrl)&&'accesso o download'].filter(Boolean).join(', '):'Scheda completa di descrizione, icona, screenshot e accesso';card.querySelector('.admin-manage-actions').before(hint);
  for(const [selector,name,label] of [['.e','apps','Modifica scheda'],['[data-app-modules]','modules','Gestisci moduli']]){const b=card.querySelector(selector);b.innerHTML=icon(name)+'<span>'+label+'</span>';}
  const button=document.createElement('button');button.type='button';button.className='secondary studio-open-preview';button.textContent='Anteprima scheda';button.onclick=()=>window.showDetail?.(app.id);card.querySelector('.admin-manage-actions').append(button);
 });}
 const moduleContainers=['clientModuleGrid','serverModuleGrid','productModulesList'];
 const moduleSearch=document.createElement('label');moduleSearch.className='studio-module-search';moduleSearch.textContent='Trova un modulo';const moduleSearchInput=document.createElement('input');moduleSearchInput.type='search';moduleSearchInput.placeholder='Articoli, clienti, appuntamenti…';moduleSearch.append(moduleSearchInput);const moduleCounter=document.createElement('p');moduleCounter.className='note';moduleCounter.setAttribute('role','status');$('productModulesList').before(moduleSearch,moduleCounter);
 function filterModules(){const term=moduleSearchInput.value.trim().toLocaleLowerCase('it');const tiles=[...$('productModulesList').querySelectorAll('.studio-module-tile')];let visible=0;for(const tile of tiles){tile.hidden=!tile.textContent.toLocaleLowerCase('it').includes(term);if(!tile.hidden)visible++;}moduleCounter.textContent=tiles.length?visible+' di '+tiles.length+' moduli · quelli in sviluppo non sono attivabili':'';}
 moduleSearchInput.addEventListener('input',filterModules);
 const moduleIntro=document.createElement('div');moduleIntro.className='studio-module-intro';moduleIntro.innerHTML=icon('modules')+'<div><strong>I moduli giusti, per ogni app</strong><p>Scegli l’app, aggiorna le opzioni dalla PWA e seleziona il cliente. Attiva i moduli disponibili e salva. Un nuovo modulo deve prima essere realizzato e dichiarato dalla sua app.</p></div>';$('moduleProductSelect').closest('label').before(moduleIntro);

 function decorateModules(){if(lastModuleProduct!==$('moduleProductSelect').value){lastModuleProduct=$('moduleProductSelect').value;moduleSearchInput.value='';}for(const id of moduleContainers){const box=$(id);if(!box)continue;box.querySelectorAll(':scope > label,:scope > span').forEach((tile,i)=>{if(tile.dataset.studioModule)return;tile.dataset.studioModule='true';tile.classList.add('studio-module-tile');const input=tile.querySelector('input'),defs=window.modulesForProduct?.($('moduleProductSelect')?.value)||[],key=input?.dataset.module||input?.dataset.serverModule||defs[i]?.key;tile.classList.toggle('studio-disabled',input?input.disabled:defs[i]?.ready===false);const symbol=document.createElement('span');symbol.className='studio-symbol';symbol.innerHTML=icon(iconFor(key));tile.prepend(symbol);if(input){tile.classList.toggle('studio-disabled',input.disabled);tile.classList.toggle('studio-enabled',input.checked);}});}filterModules();}
 for(const id of moduleContainers){const box=$(id);if(box){const observer=new MutationObserver(decorateModules);observer.observe(box,{childList:true});observers.push(observer);}}
 root.addEventListener('change',e=>{const tile=e.target.closest('.studio-module-tile');if(tile&&e.target.type==='checkbox')tile.classList.toggle('studio-enabled',e.target.checked);});
 for(const [id,name] of [['adminAppsTab','apps'],['adminClientsTab','clients'],['adminDemosTab','demo'],['adminModulesTab','modules'],['adminSettingsTab','settings']]){const b=$(id);b.querySelector('svg')?.remove();b.insertAdjacentHTML('afterbegin',icon(name));b.classList.remove('hidden');}
 root.addEventListener('click',e=>{if(!e.target.closest('#cancelEdit,#newApp'))return;if(!editor.classList.contains('hidden')&&fingerprint()!==baseline&&!confirm('Hai modifiche non salvate. Vuoi scartarle e tornare all’elenco?')){e.preventDefault();e.stopImmediatePropagation();}},true);
 window.addEventListener('beforeunload',e=>{if(!editor.classList.contains('hidden')&&fingerprint()!==baseline){e.preventDefault();e.returnValue='';}});
 const syncNavigation=()=>document.body.classList.toggle('studio-admin-open',!root.classList.contains('hidden'));
 const navObserver=new MutationObserver(syncNavigation);navObserver.observe(root,{attributes:true,attributeFilter:['class']});observers.push(navObserver);syncNavigation();
 window.adminStudio={icon,destroy(){disposed=true;observers.forEach(o=>o.disconnect());if(iconURL)URL.revokeObjectURL(iconURL);},opened,filterApps,refresh(){decorateCards();decorateModules();},selectStep};
 // New controls do not replace or bypass existing authentication, save or permission handlers.
 opened();decorateCards();decorateModules();
})();

'use strict';
const CLOUD={
  url:'https://qfjwtawsqfwmsmrrgqfi.supabase.co',
  key:'sb_publishable_-EUVjwsk3txKk2Opqrc7Kw_xFNa9Hw1'
};
const SESSION_KEY='simplex_admin_session';
const PENDING_KEY='simplex_video_pending';
const HISTORY_KEY='simplex_video_history';
const $=id=>document.getElementById(id);

let mode='image';
let session=null;
let connected=false;
let polling=false;
let models=[];
let currentQuote=null;
let quoteTimer=null;
let quoteSeq=0;
let currentBlobUrl=null;

function setStatus(el,text,type=''){
  el.textContent=text||'';
  el.className='status'+(type?' '+type:'');
}
function loadSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}
}
function saveSession(value){
  session=value;
  if(value)localStorage.setItem(SESSION_KEY,JSON.stringify(value));
  else localStorage.removeItem(SESSION_KEY);
}
async function cloud(path,{method='GET',body,token}={}){
  const r=await fetch(CLOUD.url+path,{
    method,
    cache:'no-store',
    headers:{
      apikey:CLOUD.key,
      ...(token?{Authorization:'Bearer '+token}:{}),
      ...(body!==undefined?{'Content-Type':'application/json'}:{})
    },
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
    const raw=data.error_description||data.msg||data.error||data.message||'Connessione non riuscita';
    let message=typeof raw==='string'?raw:(raw?.message||'Operazione non riuscita');
    const d=data.veniceDetails;
    if(d){
      const extra=[];
      if(d.model)extra.push('Modello: '+d.model);
      if(d.mode)extra.push('Modalità: '+d.mode);
      if(d.stage)extra.push('Fase: '+d.stage);
      if(d.code)extra.push('Codice: '+d.code);
      if(d.reason)extra.push('Motivo: '+d.reason);
      if(extra.length)message+='\n'+extra.join(' · ');
    }
    const e=Error(message);
    e.status=r.status;
    e.data=data;
    throw e;
  }
  return data;
}
async function ensureSession(force=false){
  session=loadSession();
  if(!session)throw Error('Accedi prima');
  const expiry=Number(session.expires_at||0)*1000;
  if(!force && expiry>Date.now()+60000)return session;
  const data=await cloud('/auth/v1/token?grant_type=refresh_token',{
    method:'POST',
    body:{refresh_token:session.refresh_token}
  });
  const next={...data,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)};
  saveSession(next);
  return next;
}
async function videoCall(action,body={}){
  try{
    const s=await ensureSession();
    return await cloud('/functions/v1/simplex-video?action='+encodeURIComponent(action),{
      method:'POST',body,token:s.access_token
    });
  }catch(e){
    if(e.status!==401)throw e;
    const s=await ensureSession(true);
    return cloud('/functions/v1/simplex-video?action='+encodeURIComponent(action),{
      method:'POST',body,token:s.access_token
    });
  }
}
async function videoDownload(body){
  const run=async force=>{
    const s=await ensureSession(force);
    const r=await fetch(CLOUD.url+'/functions/v1/simplex-video?action=download',{
      method:'POST',
      cache:'no-store',
      headers:{
        apikey:CLOUD.key,
        Authorization:'Bearer '+s.access_token,
        'Content-Type':'application/json'
      },
      body:JSON.stringify(body)
    });
    if(r.status===401&&!force)return run(true);
    if(!r.ok){
      const data=await r.json().catch(()=>({}));
      throw Error(data.error||data.message||'Download del video non riuscito');
    }
    return r.blob();
  };
  return run(false);
}
async function signIn(email,password){
  const data=await cloud('/auth/v1/token?grant_type=password',{
    method:'POST',body:{email,password}
  });
  saveSession({...data,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in||3600)});
}
async function signOut(){
  try{
    const s=await ensureSession();
    await fetch(CLOUD.url+'/auth/v1/logout',{method:'POST',headers:{apikey:CLOUD.key,Authorization:'Bearer '+s.access_token}});
  }catch{}
  saveSession(null);
  localStorage.removeItem(PENDING_KEY);
  showLogin();
}
function showLogin(){
  $('loginView').classList.remove('hidden');
  $('studioView').classList.add('hidden');
  $('logoutBtn').classList.add('hidden');
}
function showStudio(){
  $('loginView').classList.add('hidden');
  $('studioView').classList.remove('hidden');
  $('logoutBtn').classList.remove('hidden');
}
function updateConnection(value){
  connected=value;
  $('connectionBadge').textContent=value?'Venice collegato':'Venice non collegato';
  $('connectionBadge').className='badge '+(value?'good':'bad');
  $('connectBox').classList.toggle('hidden',value);
  $('disconnectBtn').classList.toggle('hidden',!value);
  $('connectedText').textContent=value
    ?'La chiave Venice è custodita sul server e non viene restituita al browser.'
    :'Incolla qui la chiave API Venice. Dopo il collegamento non verrà più mostrata.';
  if(value)$('connectionPanel').open=false;
  if(!value){
    models=[];
    currentQuote=null;
    $('model').innerHTML='<option value="">Collega Venice per caricare i modelli</option>';
    $('generateBtn').disabled=true;
    $('balanceBadge').classList.add('hidden');
    $('costBadge').textContent='Costo —';
  }
}
function updateBalance(balances){
  const usd=Number(balances?.USD);
  const diem=Number(balances?.DIEM);
  if(Number.isFinite(usd)){
    $('balanceBadge').textContent='Saldo $'+usd.toFixed(2)+(Number.isFinite(diem)&&diem>0?' · DIEM '+diem.toFixed(2):'');
    $('balanceBadge').classList.remove('hidden');
  }else{
    $('balanceBadge').classList.add('hidden');
  }
}
async function refreshBalance(){
  if(!connected)return;
  try{
    const data=await videoCall('balance');
    updateBalance(data.balances);
  }catch{}
}
async function refreshStatus(){
  const data=await videoCall('status');
  updateConnection(!!data.connected);
  if(data.connected){
    await loadModels();
    await refreshBalance();
  }
}
function inferMode(id){
  const v=(id||'').toLowerCase();
  if(v.includes('reference-to-video'))return'reference';
  if(v.includes('image-to-video'))return'image';
  if(v.includes('text-to-video'))return'text';
  return'other';
}
function effectiveMode(){
  if(mode==='text')return'text';
  return $('referenceFiles').files?.length ? 'reference' : 'image';
}
function modelRank(id){
  const v=id.toLowerCase();
  const families=['seedance-2-5','grok-imagine-1-5','kling-o3','wan-3','minimax-h3','runway','ltx','vidu','veo3','flux','gemini'];
  const i=families.findIndex(x=>v.includes(x));
  return i<0?99:i;
}
function modeDefaultId(){
  const m=effectiveMode();
  if(m==='image')return'seedance-2-5-image-to-video-basic';
  if(m==='reference')return'seedance-2-5-reference-to-video-basic';
  return'seedance-2-5-text-to-video-basic';
}
function selectedModel(){
  return models.find(m=>m.id===$('model').value)||null;
}
function setSelectValues(select,values,preferred,labeler=v=>v){
  const clean=[...new Set(values.filter(v=>v!==''&&v!==null&&v!==undefined).map(String))];
  select.innerHTML='';
  for(const value of clean){
    const opt=document.createElement('option');
    opt.value=value;
    opt.textContent=labeler(value);
    select.appendChild(opt);
  }
  if(!clean.length){
    const opt=document.createElement('option');
    opt.value='';
    opt.textContent='Non configurabile';
    select.appendChild(opt);
    select.disabled=true;
    return;
  }
  select.disabled=false;
  select.value=clean.includes(String(preferred))?String(preferred):clean[clean.length-1];
}
function applyModelConstraints(){
  const m=selectedModel();
  if(!m){scheduleQuote();return}
  const c=m.constraints||{};

  const currentDuration=$('duration').value;
  const durationValues=Array.isArray(c.durations)
    ? c.durations.map(v=>String(v).replace(/s$/i,'')).filter(v=>/^\d+$/.test(v))
    : [];
  if(durationValues.length){
    setSelectValues($('duration'),durationValues,currentDuration,v=>v+' secondi');
  }

  const currentResolution=$('resolution').value;
  const resolutionValues=Array.isArray(c.resolutions)?c.resolutions.map(String):[];
  if(resolutionValues.length){
    const preferred=resolutionValues.includes(currentResolution)?currentResolution:(resolutionValues.includes('480p')?'480p':resolutionValues[0]);
    setSelectValues($('resolution'),resolutionValues,preferred,v=>v);
  }

  const currentAspect=$('aspect').value;
  const aspectValues=Array.isArray(c.aspect_ratios)?c.aspect_ratios.map(String):[];
  if(aspectValues.length){
    const preferred=aspectValues.includes(currentAspect)?currentAspect:(aspectValues.includes('9:16')?'9:16':aspectValues[0]);
    setSelectValues($('aspect'),aspectValues,preferred,v=>{
      if(v==='9:16')return'9:16 · Reel/TikTok';
      if(v==='16:9')return'16:9 · Orizzontale';
      if(v==='1:1')return'1:1 · Quadrato';
      return v;
    });
  }

  const configurable=c.audio_configurable===true;
  $('audio').disabled=!configurable;
  if(!configurable)$('audio').checked=c.audio===true;
  scheduleQuote();
}
function populateModels(){
  const select=$('model');
  const previous=select.value;
  const filtered=models
    .filter(m=>inferMode(m.id)===effectiveMode())
    .sort((a,b)=>modelRank(a.id)-modelRank(b.id)||String(a.name).localeCompare(String(b.name),'it'));
  select.innerHTML='';
  for(const m of filtered){
    const opt=document.createElement('option');
    opt.value=m.id;
    const privacy=m.privacy?' · '+m.privacy:'';
    opt.textContent=(m.name||m.id)+privacy;
    select.appendChild(opt);
  }
  if(!filtered.length){
    const opt=document.createElement('option');
    opt.value='';
    opt.textContent='Nessun modello compatibile trovato';
    select.appendChild(opt);
  }else if(filtered.some(x=>x.id===previous)){
    select.value=previous;
  }else{
    const preferred=filtered.find(x=>x.id===modeDefaultId())||filtered.find(x=>x.id.includes('seedance-2-5'))||filtered[0];
    select.value=preferred.id;
  }
  applyModelConstraints();
}
async function loadModels(prefetched){
  try{
    const data=prefetched?{models:prefetched}:await videoCall('models');
    models=Array.isArray(data.models)?data.models:[];
    populateModels();
  }catch(err){
    models=[];
    $('model').innerHTML='<option value="">Errore caricamento modelli</option>';
    setStatus($('generateStatus'),err.message,'error');
  }
}
function selectMode(next){
  mode=next;
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  $('imageField').classList.toggle('hidden',mode!=='image');
  if(models.length)populateModels();
  else scheduleQuote();
}
function quoteBody(){
  return{
    mode:effectiveMode(),
    model:$('model').value,
    duration:Number($('duration').value),
    resolution:$('resolution').value,
    aspectRatio:$('aspect').value,
    generateAudio:$('audio').checked
  };
}
async function requestQuote(){
  if(!connected||!$('model').value){
    currentQuote=null;
    $('costBadge').textContent='Costo —';
    $('generateBtn').disabled=true;
    return null;
  }
  const seq=++quoteSeq;
  $('costBadge').textContent='Calcolo…';
  $('generateBtn').disabled=true;
  try{
    const data=await videoCall('quote',quoteBody());
    if(seq!==quoteSeq)return null;
    const q=Number(data.quote);
    if(!Number.isFinite(q))throw Error('Costo non disponibile');
    currentQuote=q;
    $('costBadge').textContent='Costo $'+q.toFixed(2);
    $('generateBtn').disabled=false;
    setStatus($('generateStatus'),'');
    return q;
  }catch(err){
    if(seq!==quoteSeq)return null;
    currentQuote=null;
    $('costBadge').textContent='Combinazione non valida';
    $('generateBtn').disabled=true;
    setStatus($('generateStatus'),err.message,'error');
    return null;
  }
}
function scheduleQuote(){
  currentQuote=null;
  clearTimeout(quoteTimer);
  quoteTimer=setTimeout(()=>requestQuote(),350);
}
function fileAsDataURL(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=()=>reject(Error('Non riesco a leggere l’immagine'));
    r.readAsDataURL(file);
  });
}
async function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(Error('Immagine non valida'));
    img.src=src;
  });
}
async function prepareImage(file){
  if(!file)throw Error('Seleziona un’immagine');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Usa JPG, PNG o WebP');
  if(file.size>20*1024*1024)throw Error('Immagine troppo grande: massimo 20 MB');
  const original=await fileAsDataURL(file);
  const img=await loadImage(original);
  const max=1280;
  const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
  const w=Math.max(1,Math.round(img.naturalWidth*scale));
  const h=Math.max(1,Math.round(img.naturalHeight*scale));
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:false});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  ctx.drawImage(img,0,0,w,h);
  return canvas.toDataURL('image/jpeg',.84);
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function savePending(value){
  if(value)localStorage.setItem(PENDING_KEY,JSON.stringify(value));
  else localStorage.removeItem(PENDING_KEY);
}
function getPending(){
  try{return JSON.parse(localStorage.getItem(PENDING_KEY)||'null')}catch{return null}
}
function history(){
  try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{return[]}
}
function addHistory(item){
  const list=[item,...history().filter(x=>x.requestId!==item.requestId)].slice(0,10);
  localStorage.setItem(HISTORY_KEY,JSON.stringify(list));
  renderHistory();
}
function renderHistory(){
  const list=history();
  $('historyCard').classList.toggle('hidden',!list.length);
  $('historyList').innerHTML='';
  for(const item of list){
    const row=document.createElement('div');
    row.className='history-item';
    const text=document.createElement('div');
    const title=document.createElement('strong');
    title.textContent=item.prompt||'Video';
    const meta=document.createElement('small');
    meta.textContent=new Date(item.date).toLocaleString('it-IT')+' · '+item.duration+'s · '+item.resolution+' · $'+Number(item.quote||0).toFixed(2);
    text.append(title,meta);
    const side=document.createElement(item.videoUrl?'a':'span');
    if(item.videoUrl){
      side.href=item.videoUrl;side.target='_blank';side.rel='noopener';side.textContent='Apri';
    }else{
      side.textContent='temporaneo';side.className='muted';
    }
    row.append(text,side);
    $('historyList').append(row);
  }
}
function showResult(videoUrl,context){
  if(currentBlobUrl&&currentBlobUrl!==videoUrl){
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl=null;
  }
  $('resultVideo').src=videoUrl;
  $('openVideo').href=videoUrl;
  $('resultCard').classList.remove('hidden');
  $('resultCard').scrollIntoView({behavior:'smooth',block:'start'});
  addHistory({
    requestId:context.requestId,
    prompt:context.prompt,
    videoUrl:videoUrl.startsWith('http')?videoUrl:null,
    date:new Date().toISOString(),
    duration:context.duration,
    resolution:context.resolution,
    quote:context.quote
  });
}
// Use the last decoded frame of a finished clip as the next initial photo.
async function continueFromLastFrame(){
  const source=$('resultVideo').currentSrc||$('resultVideo').src;
  if(!source)throw Error('Nessun video pronto da continuare');
  const btn=$('continueVideoBtn');
  btn.disabled=true;
  setStatus($('generateStatus'),'Estraggo l’ultimo fotogramma…');
  const video=document.createElement('video');
  video.muted=true;
  video.preload='auto';
  video.playsInline=true;
  video.crossOrigin='anonymous';
  try{
    const wait=(event)=>new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{cleanup();reject(Error('Impossibile leggere il fotogramma: video scaduto o non disponibile'))},20000);
      const success=()=>{cleanup();resolve()};
      const failure=()=>{cleanup();reject(Error('Impossibile leggere il video. Salvalo e riprova'))};
      function cleanup(){clearTimeout(timer);video.removeEventListener(event,success);video.removeEventListener('error',failure)}
      video.addEventListener(event,success,{once:true});
      video.addEventListener('error',failure,{once:true});
    });
    const metadata=wait('loadedmetadata');
    video.src=source;
    video.load();
    await metadata;
    if(!Number.isFinite(video.duration)||video.duration<=0||!video.videoWidth)throw Error('Durata o dimensioni del video non disponibili');
    const seeked=wait('seeked');
    video.currentTime=Math.max(0,video.duration-0.12);
    await seeked;
    const canvas=document.createElement('canvas');
    canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Impossibile creare il fotogramma');
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Impossibile esportare il fotogramma')),'image/jpeg',0.92));
    const file=new File([blob],'ultimo-fotogramma.jpg',{type:'image/jpeg'});
    const transfer=new DataTransfer();
    transfer.items.add(file);
    $('imageFile').files=transfer.files;
    selectMode('image');
    $('resultCard').classList.add('hidden');
    $('prompt').focus();
    window.scrollTo({top:0,behavior:'smooth'});
    setStatus($('generateStatus'),'Ultimo fotogramma caricato come foto iniziale. Scrivi la scena successiva e controlla il costo prima di generare.','ok');
    scheduleQuote();
  }finally{
    video.pause();
    video.removeAttribute('src');
    video.load();
    btn.disabled=false;
  }
}
async function getFinishedVideo(context){
  if(context.downloadUrl)return context.downloadUrl;
  setStatus($('generateStatus'),'Scarico il video finito…');
  const blob=await videoDownload({requestId:context.requestId,model:context.model});
  if(!blob.type.startsWith('video/'))throw Error('Venice non ha restituito un file video valido');
  currentBlobUrl=URL.createObjectURL(blob);
  return currentBlobUrl;
}
async function pollRequest(context){
  if(polling)return;
  polling=true;
  $('generateBtn').disabled=true;
  try{
    for(let i=0;i<240;i++){
      setStatus($('generateStatus'),'Venice sta preparando il video… controllo '+(i+1));
      const data=await videoCall('poll',{requestId:context.requestId,model:context.model});
      if(data.status==='COMPLETED'||data.ready===true){
        const url=await getFinishedVideo(context);
        savePending(null);
        setStatus($('generateStatus'),'Video pronto.','ok');
        showResult(url,context);
        await refreshBalance();
        return;
      }
      await sleep(5000);
    }
    throw Error('Il video sta impiegando troppo. La richiesta resta salvata e verrà ripresa quando riapri la pagina.');
  }finally{
    polling=false;
    $('generateBtn').disabled=!connected||currentQuote===null;
  }
}
async function startGeneration(body){
  try{
    return await videoCall('generate',body);
  }catch(err){
    if(err.status===409&&err.data?.needsConsent){
      const policy=err.data.policyText||'Venice richiede la conferma che hai il diritto di usare le immagini con volti presenti nella richiesta.';
      const ok=confirm(policy+'\n\nConfermi e vuoi procedere con questa generazione?');
      if(!ok)throw Error('Generazione annullata: consenso non confermato.');
      body.seedanceConsent=true;
      return videoCall('generate',body);
    }
    throw err;
  }
}
async function generate(){
  if(!connected)throw Error('Prima collega Venice');
  const prompt=$('prompt').value.trim();
  if(!prompt)throw Error('Scrivi cosa deve succedere nel video');
  const quote=await requestQuote();
  if(quote===null){
    const detail=$('generateStatus').textContent.trim();
    throw Error(detail||'Questa combinazione di modello, durata e risoluzione non è disponibile');
  }
  const body={...quoteBody(),prompt};

  if(mode==='image'){
    const initial=$('imageFile').files?.[0];
    if(!initial)throw Error('Seleziona la foto iniziale');
    const refs=[...($('referenceFiles').files||[])];
    if(refs.length>9)throw Error('Puoi aggiungere al massimo 9 riferimenti oltre alla foto iniziale');

    if(refs.length){
      body.mode='reference';
      body.referenceImages=[];
      setStatus($('generateStatus'),'Preparo la foto iniziale…');
      body.referenceImages.push(await prepareImage(initial));
      for(let i=0;i<refs.length;i++){
        setStatus($('generateStatus'),'Preparo riferimento '+(i+1)+' di '+refs.length+'…');
        body.referenceImages.push(await prepareImage(refs[i]));
      }
      body.initialFrameIncluded=true;
    }else{
      body.mode='image';
      setStatus($('generateStatus'),'Preparo la foto iniziale…');
      body.image=await prepareImage(initial);
    }
  }

  setStatus($('generateStatus'),'Invio la richiesta a Venice…');
  const start=await startGeneration(body);
  const context={
    requestId:start.requestId,
    model:start.model||body.model,
    downloadUrl:start.downloadUrl||null,
    prompt,
    duration:start.duration||body.duration,
    resolution:start.resolution||body.resolution,
    quote,
    startedAt:Date.now()
  };
  savePending(context);
  await pollRequest(context);
}
async function restore(){
  session=loadSession();
  if(!session){showLogin();return}
  try{
    await ensureSession();
    showStudio();
    await refreshStatus();
    renderHistory();
    const pending=getPending();
    if(pending&&connected){
      setStatus($('generateStatus'),'Riprendo il controllo dell’ultimo video…');
      pollRequest(pending).catch(e=>setStatus($('generateStatus'),e.message,'error'));
    }
  }catch{
    showLogin();
  }
}

$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  setStatus($('loginStatus'),'Accesso in corso…');
  try{
    await signIn($('email').value.trim(),$('password').value);
    showStudio();
    await refreshStatus();
    renderHistory();
    setStatus($('loginStatus'),'');
  }catch(err){setStatus($('loginStatus'),err.message,'error')}
});
$('logoutBtn').addEventListener('click',signOut);
$('connectBtn').addEventListener('click',async()=>{
  const key=$('veniceKey').value.trim();
  if(!key){setStatus($('connectionStatus'),'Incolla prima la chiave Venice.','error');return}
  $('connectBtn').disabled=true;
  setStatus($('connectionStatus'),'Verifico la chiave con Venice…');
  try{
    const data=await videoCall('connect',{key});
    $('veniceKey').value='';
    updateConnection(true);
    updateBalance(data.balances);
    await loadModels(data.models);
    setStatus($('connectionStatus'),'Venice collegato.','ok');
  }catch(err){setStatus($('connectionStatus'),err.message,'error')}
  finally{$('connectBtn').disabled=false}
});
$('disconnectBtn').addEventListener('click',async()=>{
  if(!confirm('Scollegare la chiave Venice?'))return;
  try{
    await videoCall('disconnect');
    updateConnection(false);
    setStatus($('connectionStatus'),'Chiave Venice scollegata.','ok');
  }catch(err){setStatus($('connectionStatus'),err.message,'error')}
});
document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.mode)));
$('model').addEventListener('change',applyModelConstraints);
['duration','resolution','aspect','audio'].forEach(id=>$(id).addEventListener('change',scheduleQuote));
$('imageFile').addEventListener('change',scheduleQuote);
$('referenceFiles').addEventListener('change',()=>{
  const n=$('referenceFiles').files.length;
  if(n>9)setStatus($('generateStatus'),'Massimo 9 riferimenti aggiuntivi oltre alla foto iniziale.','error');
  if(models.length)populateModels();
  else scheduleQuote();
});
$('generatorForm').addEventListener('submit',async e=>{
  e.preventDefault();
  $('resultCard').classList.add('hidden');
  setStatus($('generateStatus'),'');
  $('generateBtn').disabled=true;
  try{await generate()}catch(err){setStatus($('generateStatus'),err.message,'error')}
  finally{if(!polling)$('generateBtn').disabled=!connected||currentQuote===null}
});
$('continueVideoBtn').addEventListener('click',()=>continueFromLastFrame().catch(err=>setStatus($('generateStatus'),err.message,'error')));
$('newVideoBtn').addEventListener('click',()=>{
  $('resultCard').classList.add('hidden');
  $('prompt').focus();
  window.scrollTo({top:0,behavior:'smooth'});
});
$('clearHistory').addEventListener('click',()=>{
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});
window.addEventListener('online',()=>{if(loadSession())ensureSession().catch(()=>{})});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&loadSession())ensureSession().catch(()=>{})});
window.addEventListener('beforeunload',()=>{if(currentBlobUrl)URL.revokeObjectURL(currentBlobUrl)});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
selectMode('image');
restore();

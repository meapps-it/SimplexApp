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
    const e=Error(data.error_description||data.msg||data.error||data.message||'Connessione non riuscita');
    e.status=r.status;
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
  $('connectionBadge').textContent=value?'xAI collegato':'xAI non collegato';
  $('connectionBadge').className='badge '+(value?'good':'bad');
  $('connectBox').classList.toggle('hidden',value);
  $('disconnectBtn').classList.toggle('hidden',!value);
  $('connectedText').textContent=value
    ?'La chiave xAI è custodita sul server. Non viene inviata al browser.'
    :'Crea una chiave nella console xAI e incollala qui. Non viene salvata nel telefono né mostrata dopo il collegamento.';
  $('generateBtn').disabled=!value;
  if(value)$('connectionPanel').open=false;
}
async function refreshStatus(){
  const data=await videoCall('status');
  updateConnection(!!data.connected);
}
function selectMode(next){
  mode=next;
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  $('imageField').classList.toggle('hidden',mode!=='image');
  $('referenceField').classList.toggle('hidden',mode!=='reference');
  $('aspectLabel').classList.toggle('hidden',mode==='image');
  if(mode==='reference'){
    $('model').value='grok-imagine-video-1.5';
    $('model').disabled=true;
    if($('resolution').value==='1080p')$('resolution').value='720p';
    $('resolution').querySelector('option[value="1080p"]').disabled=true;
  }else{
    $('model').disabled=false;
    $('resolution').querySelector('option[value="1080p"]').disabled=false;
  }
  updateCost();
}
function priceRate(){
  const m=$('model').value;
  const r=$('resolution').value;
  const table={
    'grok-imagine-video-1.5-lite':{'480p':.02,'720p':.03,'1080p':.14},
    'grok-imagine-video-1.5':{'480p':.08,'720p':.14,'1080p':.25}
  };
  return table[m]?.[r]||0;
}
function updateCost(){
  const seconds=Number($('duration').value||8);
  const inputCount=mode==='image'?($('imageFile').files?.length?1:0):mode==='reference'?Math.min(7,$('referenceFiles').files?.length||0):0;
  const estimate=seconds*priceRate()+inputCount*.01;
  $('costBadge').textContent='Stima $'+estimate.toFixed(2);
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
  if(file.size>15*1024*1024)throw Error('Immagine troppo grande: massimo 15 MB');
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
  return canvas.toDataURL('image/jpeg',.82);
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
    meta.textContent=new Date(item.date).toLocaleString('it-IT')+' · '+item.duration+'s · '+item.resolution;
    text.append(title,meta);
    const a=document.createElement('a');
    a.href=item.videoUrl;a.target='_blank';a.rel='noopener';a.textContent='Apri';
    row.append(text,a);
    $('historyList').append(row);
  }
}
function showResult(data,context){
  $('resultVideo').src=data.videoUrl;
  $('openVideo').href=data.videoUrl;
  $('resultCard').classList.remove('hidden');
  $('resultCard').scrollIntoView({behavior:'smooth',block:'start'});
  addHistory({
    requestId:context.requestId,
    prompt:context.prompt,
    videoUrl:data.videoUrl,
    date:new Date().toISOString(),
    duration:context.duration,
    resolution:context.resolution
  });
}
async function pollRequest(context){
  if(polling)return;
  polling=true;
  $('generateBtn').disabled=true;
  try{
    for(let i=0;i<180;i++){
      setStatus($('generateStatus'),'Grok sta preparando il video… controllo '+(i+1));
      const data=await videoCall('poll',{requestId:context.requestId});
      if(data.status==='done'&&data.videoUrl){
        savePending(null);
        setStatus($('generateStatus'),'Video pronto.','ok');
        showResult(data,context);
        return;
      }
      if(['failed','expired','cancelled'].includes(data.status)){
        savePending(null);
        throw Error(data.error||'Generazione '+data.status);
      }
      await sleep(5000);
    }
    throw Error('Il video sta impiegando troppo. La richiesta resta salvata e puoi riaprire la pagina.');
  }finally{
    polling=false;
    $('generateBtn').disabled=!connected;
  }
}
async function generate(){
  if(!connected)throw Error('Prima collega xAI');
  const prompt=$('prompt').value.trim();
  if(!prompt)throw Error('Scrivi cosa deve succedere nel video');
  const body={
    mode,
    prompt,
    model:$('model').value,
    duration:Number($('duration').value),
    resolution:$('resolution').value,
    aspectRatio:$('aspect').value,
    generateAudio:$('audio').checked
  };
  if(mode==='image'){
    setStatus($('generateStatus'),'Preparo la foto…');
    body.image=await prepareImage($('imageFile').files?.[0]);
  }else if(mode==='reference'){
    const files=[...($('referenceFiles').files||[])];
    if(!files.length||files.length>7)throw Error('Seleziona da 1 a 7 immagini di riferimento');
    body.referenceImages=[];
    for(let i=0;i<files.length;i++){
      setStatus($('generateStatus'),'Preparo immagine '+(i+1)+' di '+files.length+'…');
      body.referenceImages.push(await prepareImage(files[i]));
    }
  }
  setStatus($('generateStatus'),'Invio la richiesta a Grok…');
  const start=await videoCall('generate',body);
  const context={
    requestId:start.requestId,
    prompt,
    duration:start.duration,
    resolution:start.resolution,
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
  const key=$('xaiKey').value.trim();
  if(!key){setStatus($('connectionStatus'),'Incolla prima la chiave xAI.','error');return}
  $('connectBtn').disabled=true;
  setStatus($('connectionStatus'),'Verifico la chiave con xAI…');
  try{
    await videoCall('connect',{key});
    $('xaiKey').value='';
    updateConnection(true);
    setStatus($('connectionStatus'),'xAI collegato.','ok');
  }catch(err){setStatus($('connectionStatus'),err.message,'error')}
  finally{$('connectBtn').disabled=false}
});
$('disconnectBtn').addEventListener('click',async()=>{
  if(!confirm('Scollegare la chiave xAI?'))return;
  try{
    await videoCall('disconnect');
    updateConnection(false);
    setStatus($('connectionStatus'),'Chiave xAI scollegata.','ok');
  }catch(err){setStatus($('connectionStatus'),err.message,'error')}
});
document.querySelectorAll('.mode').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.mode)));
['model','duration','resolution','aspect'].forEach(id=>$(id).addEventListener('change',updateCost));
$('imageFile').addEventListener('change',updateCost);
$('referenceFiles').addEventListener('change',()=>{
  if($('referenceFiles').files.length>7){
    setStatus($('generateStatus'),'Massimo 7 immagini di riferimento.','error');
  }
  updateCost();
});
$('generatorForm').addEventListener('submit',async e=>{
  e.preventDefault();
  $('resultCard').classList.add('hidden');
  setStatus($('generateStatus'),'');
  $('generateBtn').disabled=true;
  try{await generate()}catch(err){setStatus($('generateStatus'),err.message,'error')}
  finally{if(!polling)$('generateBtn').disabled=!connected}
});
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
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
selectMode('image');
restore();

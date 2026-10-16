const ORIGINS=new Set(['https://simplexapp.it','https://www.simplexapp.it','https://meapps-it.github.io']);
const BASE=Deno.env.get('SUPABASE_URL')||'';
function adminKey(){
  try{
    const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
    if(keys.default)return keys.default;
  }catch{}
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
}
const SERVICE=adminKey();
function cors(req){
  const origin=req.headers.get('Origin')||'';
  const allowed=ORIGINS.has(origin)?origin:'https://simplexapp.it';
  return {
    'Access-Control-Allow-Origin':allowed,
    'Access-Control-Allow-Headers':'authorization, apikey, content-type',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Vary':'Origin'
  };
}
function reply(req,data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{...cors(req),'Content-Type':'application/json','Cache-Control':'no-store'}
  });
}
function adminHeaders(extra={}){
  const h={apikey:SERVICE,...extra};
  if(SERVICE && !SERVICE.startsWith('sb_secret_'))h.Authorization='Bearer '+SERVICE;
  return h;
}
async function db(path,method='GET',body){
  const headers=adminHeaders({Accept:'application/json'});
  if(body!==undefined)headers['Content-Type']='application/json';
  if(method==='POST')headers.Prefer='resolution=merge-duplicates,return=representation';
  if(method==='PATCH')headers.Prefer='return=representation';
  const r=await fetch(BASE+'/rest/v1/'+path,{
    method,
    headers,
    body:body===undefined?undefined:JSON.stringify(body)
  });
  if(!r.ok){
    await r.text().catch(()=> '');
    throw Error('Configurazione server non disponibile');
  }
  return r.status===204?null:r.json();
}
async function requireAdmin(req){
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))throw Object.assign(Error('Accedi con l’account Admin di SimplexApp'),{status:401});
  const ur=await fetch(BASE+'/auth/v1/user',{headers:{apikey:SERVICE,Authorization:auth}});
  if(!ur.ok)throw Object.assign(Error('Sessione scaduta: accedi di nuovo'),{status:401});
  const user=await ur.json();
  const allowed=await db('simplex_admins?user_id=eq.'+encodeURIComponent(user.id)+'&select=user_id');
  if(!allowed.length)throw Object.assign(Error('Questo account non è autorizzato'),{status:403});
  return user;
}
async function xaiKey(){
  const rows=await db('simplex_private_settings?id=eq.1&select=xai_api_key');
  return rows[0]?.xai_api_key||'';
}
function xaiError(data,status){
  const raw=data?.error?.message||data?.error||data?.message;
  const msg=typeof raw==='string'?raw:'Richiesta xAI non riuscita';
  const clean=msg.replace(/xai-[A-Za-z0-9._-]+/g,'[chiave nascosta]').slice(0,600);
  const err=Error(clean);
  err.status=status===402?402:status===429?429:400;
  return err;
}
function validDataImage(value){
  return typeof value==='string' &&
    value.length<=4500000 &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
  if(req.method!=='POST')return reply(req,{error:'Metodo non consentito'},405);
  const origin=req.headers.get('Origin');
  if(origin && !ORIGINS.has(origin))return reply(req,{error:'Origine non consentita'},403);
  try{
    const user=await requireAdmin(req);
    const action=new URL(req.url).searchParams.get('action')||'status';

    if(action==='status'){
      const key=await xaiKey();
      return reply(req,{connected:!!key,email:user.email||''});
    }

    if(action==='connect'){
      const body=await req.json().catch(()=>({}));
      const key=typeof body.key==='string'?body.key.trim():'';
      if(key.length<20||key.length>500)return reply(req,{error:'Chiave xAI non valida'},400);
      const test=await fetch('https://api.x.ai/v1/models',{headers:{Authorization:'Bearer '+key}});
      if(!test.ok){
        const data=await test.json().catch(()=>({}));
        throw xaiError(data,test.status);
      }
      await db('simplex_private_settings','POST',{id:1,xai_api_key:key});
      return reply(req,{connected:true});
    }

    if(action==='disconnect'){
      await db('simplex_private_settings?id=eq.1','PATCH',{xai_api_key:null});
      return reply(req,{connected:false});
    }

    const key=await xaiKey();
    if(!key)return reply(req,{error:'Prima collega la chiave API xAI'},409);

    if(action==='generate'){
      const body=await req.json().catch(()=>({}));
      const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
      if(!prompt||prompt.length>5000)return reply(req,{error:'Scrivi una descrizione del video (massimo 5000 caratteri)'},400);

      const mode=['text','image','reference'].includes(body.mode)?body.mode:'image';
      let model=['grok-imagine-video-1.5-lite','grok-imagine-video-1.5'].includes(body.model)?body.model:'grok-imagine-video-1.5-lite';
      const duration=Math.trunc(Number(body.duration)||8);
      if(duration<1||duration>15)return reply(req,{error:'Durata non valida'},400);
      let resolution=['480p','720p','1080p'].includes(body.resolution)?body.resolution:'720p';
      const aspect=['9:16','16:9','1:1','4:3','3:4','3:2','2:3','21:9','5:2'].includes(body.aspectRatio)?body.aspectRatio:'9:16';
      const generateAudio=body.generateAudio!==false;

      const payload={
        model,
        prompt,
        duration,
        resolution,
        generate_audio:generateAudio
      };

      if(mode==='image'){
        if(!validDataImage(body.image))return reply(req,{error:'Carica una foto JPG, PNG o WebP valida'},400);
        payload.image={url:body.image};
      }else if(mode==='reference'){
        model='grok-imagine-video-1.5';
        payload.model=model;
        if(resolution==='1080p'){resolution='720p';payload.resolution=resolution;}
        const refs=Array.isArray(body.referenceImages)?body.referenceImages:[];
        if(refs.length<1||refs.length>7||refs.some(x=>!validDataImage(x)))return reply(req,{error:'Usa da 1 a 7 immagini di riferimento valide'},400);
        const total=refs.reduce((n,x)=>n+x.length,0);
        if(total>16000000)return reply(req,{error:'Le immagini di riferimento sono troppo pesanti'},400);
        payload.reference_images=refs.map(url=>({url}));
        payload.aspect_ratio=aspect;
      }else{
        payload.aspect_ratio=aspect;
      }

      const xr=await fetch('https://api.x.ai/v1/videos/generations',{
        method:'POST',
        headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      const data=await xr.json().catch(()=>({}));
      if(!xr.ok)throw xaiError(data,xr.status);
      if(typeof data.request_id!=='string')throw Error('xAI non ha restituito l’identificativo del video');
      return reply(req,{requestId:data.request_id,model:payload.model,resolution:payload.resolution,duration});
    }

    if(action==='poll'){
      const body=await req.json().catch(()=>({}));
      const id=typeof body.requestId==='string'?body.requestId.trim():'';
      if(!/^[A-Za-z0-9._:-]{6,220}$/.test(id))return reply(req,{error:'Richiesta video non valida'},400);
      const xr=await fetch('https://api.x.ai/v1/videos/'+encodeURIComponent(id),{
        headers:{Authorization:'Bearer '+key}
      });
      const data=await xr.json().catch(()=>({}));
      if(!xr.ok)throw xaiError(data,xr.status);
      const status=typeof data.status==='string'?data.status:'unknown';
      const videoUrl=typeof data.video?.url==='string'?data.video.url:null;
      const error=typeof data.error?.message==='string'?data.error.message:(typeof data.error==='string'?data.error:null);
      return reply(req,{status,videoUrl,error});
    }

    return reply(req,{error:'Operazione non riconosciuta'},400);
  }catch(e){
    const status=Number(e?.status)||400;
    return reply(req,{error:e instanceof Error?e.message:'Operazione non riuscita'},status);
  }
});
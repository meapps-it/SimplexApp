const ORIGINS=new Set(['https://simplexapp.it','https://www.simplexapp.it','https://meapps-it.github.io']);
const BASE=Deno.env.get('SUPABASE_URL')||'';
const VENICE='https://api.venice.ai/api/v1';

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
    'Access-Control-Expose-Headers':'Content-Type, Content-Disposition',
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
    method,headers,body:body===undefined?undefined:JSON.stringify(body)
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
async function veniceKey(){
  const rows=await db('simplex_private_settings?id=eq.1&select=venice_api_key');
  return rows[0]?.venice_api_key||'';
}
function cleanMessage(value){
  if(typeof value!=='string')return '';
  return value.replace(/Bearer\s+[A-Za-z0-9._-]+/gi,'Bearer [chiave nascosta]').slice(0,900);
}
function veniceError(data,status){
  const raw=
    (typeof data?.error?.message==='string'&&data.error.message)||
    (typeof data?.error==='string'&&data.error)||
    (typeof data?.message==='string'&&data.message)||
    'Richiesta Venice non riuscita';
  const err=Error(cleanMessage(raw));
  err.status=status===401?401:status===402?402:status===403?403:status===409?409:status===429?429:400;
  return err;
}
async function veniceJson(path,key,{method='GET',body}={}){
  const r=await fetch(VENICE+path,{
    method,
    headers:{
      Authorization:'Bearer '+key,
      Accept:'application/json',
      ...(body!==undefined?{'Content-Type':'application/json'}:{})
    },
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw veniceError(data,r.status);
  return data;
}
function normalizeModels(data){
  const list=Array.isArray(data?.data)?data.data:[];
  return list
    .filter(x=>x&&x.type==='video'&&typeof x.id==='string')
    .map(x=>({
      id:x.id,
      name:x.model_spec?.name||x.id,
      description:x.model_spec?.description||'',
      privacy:x.model_spec?.privacy||'',
      constraints:x.model_spec?.constraints||{},
      capabilities:x.model_spec?.capabilities||{},
      pricing:x.model_spec?.pricing||{}
    }));
}
async function listModels(key){
  const data=await veniceJson('/models?type=video',key);
  return normalizeModels(data);
}
async function balances(key){
  try{
    const data=await veniceJson('/api_keys/rate_limits',key);
    return data?.data?.balances||null;
  }catch{
    return null;
  }
}
function validModel(value){
  return typeof value==='string' && /^[A-Za-z0-9._:-]{2,220}$/.test(value);
}
function validDataImage(value){
  return typeof value==='string' &&
    value.length<=6500000 &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}
function generationSettings(body){
  const model=validModel(body.model)?body.model:'';
  if(!model)throw Error('Seleziona un modello video');
  const duration=Math.trunc(Number(body.duration)||0);
  if(duration<1||duration>30)throw Error('Durata non valida');
  const resolutions=new Set(['256p','360p','480p','540p','580p','720p','768P','1080p','true_1080p','1440p','2160p','2K','4k']);
  const resolution=resolutions.has(body.resolution)?body.resolution:'720p';
  const aspects=new Set(['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','9:21','16:9','21:9','adaptive','auto']);
  const aspectRatio=aspects.has(body.aspectRatio)?body.aspectRatio:'9:16';
  const audio=body.generateAudio!==false;
  return {model,duration,resolution,aspectRatio,audio};
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
      const key=await veniceKey();
      return reply(req,{connected:!!key,email:user.email||''});
    }

    if(action==='connect'){
      const body=await req.json().catch(()=>({}));
      const key=typeof body.key==='string'?body.key.trim():'';
      if(key.length<20||key.length>800)return reply(req,{error:'Chiave Venice non valida'},400);
      const models=await listModels(key);
      if(!models.length)return reply(req,{error:'La chiave è valida, ma non risultano modelli video disponibili'},400);
      const accountBalances=await balances(key);
      await db('simplex_private_settings?id=eq.1','PATCH',{venice_api_key:key});
      return reply(req,{connected:true,models,balances:accountBalances});
    }

    if(action==='disconnect'){
      await db('simplex_private_settings?id=eq.1','PATCH',{venice_api_key:null});
      return reply(req,{connected:false});
    }

    const key=await veniceKey();
    if(!key)return reply(req,{error:'Prima collega la chiave API Venice'},409);

    if(action==='models'){
      return reply(req,{models:await listModels(key)});
    }

    if(action==='balance'){
      return reply(req,{balances:await balances(key)});
    }

    if(action==='quote'){
      const body=await req.json().catch(()=>({}));
      const s=generationSettings(body);
      const q=await veniceJson('/video/quote',key,{
        method:'POST',
        body:{
          model:s.model,
          duration:String(s.duration)+'s',
          resolution:s.resolution,
          aspect_ratio:s.aspectRatio,
          audio:s.audio
        }
      });
      return reply(req,{quote:Number(q.quote),currency:'USD'});
    }

    if(action==='generate'){
      const body=await req.json().catch(()=>({}));
      const prompt=typeof body.prompt==='string'?body.prompt.trim():'';
      if(!prompt||prompt.length>15000)return reply(req,{error:'Scrivi una descrizione del video (massimo 15000 caratteri)'},400);
      const mode=['text','image','reference'].includes(body.mode)?body.mode:'image';
      const s=generationSettings(body);
      const payload={
        model:s.model,
        prompt,
        duration:String(s.duration)+'s',
        resolution:s.resolution,
        aspect_ratio:s.aspectRatio,
        audio:s.audio
      };

      if(mode==='image'){
        if(!validDataImage(body.image))return reply(req,{error:'Carica una foto JPG, PNG o WebP valida'},400);
        payload.image_url=body.image;
      }else if(mode==='reference'){
        const refs=Array.isArray(body.referenceImages)?body.referenceImages:[];
        if(refs.length<1||refs.length>10||refs.some(x=>!validDataImage(x))){
          return reply(req,{error:'Usa da 1 a 10 immagini di riferimento valide'},400);
        }
        const total=refs.reduce((n,x)=>n+x.length,0);
        if(total>19000000)return reply(req,{error:'Le immagini di riferimento sono troppo pesanti'},400);
        payload.reference_image_urls=refs;
      }

      if(body.seedanceConsent===true){
        payload.consents={
          seedance:{
            confirmed_terms_and_privacy:true,
            confirmed_legal_right:true,
            confirmed_screening_acknowledged:true
          }
        };
      }

      const vr=await fetch(VENICE+'/video/queue',{
        method:'POST',
        headers:{Authorization:'Bearer '+key,'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify(payload)
      });
      const data=await vr.json().catch(()=>({}));
      if(!vr.ok){
        if(vr.status===409 && data?.error?.code==='needs_consent'){
          return reply(req,{
            error:data.error?.message||'Venice richiede il consenso per i volti presenti nelle immagini.',
            needsConsent:true,
            consentFlow:data.consent_flow||'seedance',
            policyText:data.consent?.policy_text||'',
            faceMediaRoles:Array.isArray(data.face_media_roles)?data.face_media_roles:[],
            docsUrl:data.docs_url||''
          },409);
        }
        throw veniceError(data,vr.status);
      }
      if(typeof data.queue_id!=='string')throw Error('Venice non ha restituito l’identificativo del video');
      return reply(req,{
        requestId:data.queue_id,
        model:data.model||s.model,
        downloadUrl:typeof data.download_url==='string'?data.download_url:null,
        resolution:s.resolution,
        duration:s.duration
      });
    }

    if(action==='poll'){
      const body=await req.json().catch(()=>({}));
      const id=typeof body.requestId==='string'?body.requestId.trim():'';
      const model=validModel(body.model)?body.model:'';
      if(!id||id.length>260||!model)return reply(req,{error:'Richiesta video non valida'},400);
      const vr=await fetch(VENICE+'/video/retrieve',{
        method:'POST',
        headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
        body:JSON.stringify({model,queue_id:id,delete_media_on_completion:false})
      });
      const type=(vr.headers.get('content-type')||'').toLowerCase();
      if(vr.ok && type.includes('video/')){
        if(vr.body)try{await vr.body.cancel();}catch{}
        return reply(req,{status:'COMPLETED',ready:true,delivery:'proxy'});
      }
      const data=await vr.json().catch(()=>({}));
      if(!vr.ok)throw veniceError(data,vr.status);
      return reply(req,{
        status:typeof data.status==='string'?data.status:'PROCESSING',
        ready:data.status==='COMPLETED',
        averageExecutionTime:Number(data.average_execution_time)||null,
        executionDuration:Number(data.execution_duration)||null
      });
    }

    if(action==='download'){
      const body=await req.json().catch(()=>({}));
      const id=typeof body.requestId==='string'?body.requestId.trim():'';
      const model=validModel(body.model)?body.model:'';
      if(!id||id.length>260||!model)return reply(req,{error:'Richiesta video non valida'},400);
      const vr=await fetch(VENICE+'/video/retrieve',{
        method:'POST',
        headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
        body:JSON.stringify({model,queue_id:id,delete_media_on_completion:false})
      });
      const type=(vr.headers.get('content-type')||'').toLowerCase();
      if(vr.ok && type.includes('video/')){
        return new Response(vr.body,{
          status:200,
          headers:{
            ...cors(req),
            'Content-Type':vr.headers.get('content-type')||'video/mp4',
            'Content-Disposition':'inline; filename="simplex-video.mp4"',
            'Cache-Control':'no-store'
          }
        });
      }
      const data=await vr.json().catch(()=>({}));
      if(!vr.ok)throw veniceError(data,vr.status);
      return reply(req,{error:'Il file non è ancora disponibile per il download',status:data.status||'PROCESSING'},409);
    }

    return reply(req,{error:'Operazione non riconosciuta'},400);
  }catch(e){
    const status=Number(e?.status)||400;
    return reply(req,{error:e instanceof Error?e.message:'Operazione non riuscita'},status);
  }
});
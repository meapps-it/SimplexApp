import '../tenant-config.js';
const tenantTools=(globalThis as any).SimplexTenants;
import { uploadAsset } from './github-upload.ts';
// GitHub credential is confined to a service-role-only table; never returned to clients.
const ORIGIN='https://meapps-it.github.io';
const REPO='meapps-it/SimplexApp';
const MAX_APK=2*1024*1024*1024-1;
const DEMO_BUCKET='simplex-demo';
const DEMO_ARTICLE_RE=/^demo-art-(00[1-9]|010)$/;
const cors={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-file-size','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sh={apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'};
function reply(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})}
async function db(path:string,method='GET',body?:unknown){const r=await fetch(base+'/rest/v1/'+path,{method,headers:{...sh,Prefer:'return=representation,resolution=merge-duplicates'},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw Error('Operazione sul catalogo non riuscita');return r.status===204?null:r.json()}
async function github(token:string,path:string,method='GET',body?:unknown){const r=await fetch('https://api.github.com/'+path,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw Error(r.status===401||r.status===403?'Accesso GitHub rifiutato: verifica permessi e scadenza della connessione.':'GitHub non ha completato l’operazione ('+r.status+').');return r.status===204?null:r.json()}
const str=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
function cleanCategories(v:unknown){if(!Array.isArray(v))return ['Produttività','Comunicazione','Utility','Giochi'];const out=[...new Set(v.map(x=>str(x,80)).filter(Boolean))];return out.length?out.slice(0,100):['Produttività','Comunicazione','Utility','Giochi']}
function cleanModules(v:unknown){
 if(!v||typeof v!=='object'||Array.isArray(v))return {};
 const out:Record<string,boolean>={};
 for(const [k,val] of Object.entries(v as Record<string,unknown>)){
  const key=str(k,60).replace(/[^a-zA-Z0-9_-]/g,'');
  if(key&&Object.keys(out).length<60)out[key]=val===true;
 }
 return out;
}
function moduleDefinitions(value:unknown){
 if(!Array.isArray(value)||value.length>60)throw Error('Elenco moduli non valido');
 const seen=new Set();return value.map((m:any)=>{
  if(!m||typeof m.key!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(m.key)||!str(m.label,120)||seen.has(m.key))throw Error('Modulo non valido o duplicato');
  seen.add(m.key);return {key:m.key,label:str(m.label,120),ready:m.ready!==false,default_enabled:m.default_enabled!==false,requires:Array.isArray(m.requires)?m.requires.filter((k:any)=>typeof k==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(k)):[],feature_requires:Array.isArray(m.feature_requires)?m.feature_requires.filter((k:any)=>typeof k==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(k)):[]};
 });
}
function supportedModules(values:unknown,definitions:any[],strict=false){
 const valuesClean=cleanModules(values),allowed=new Set(definitions.filter(m=>m.ready!==false).map(m=>m.key));
 if(strict&&Object.entries(valuesClean).some(([key,on])=>on&&!allowed.has(key)))throw Error('Modulo non disponibile per questa applicazione');
 return tenantTools.modules(valuesClean,definitions,strict);
}
async function profileFor(product:string|null){
 if(!product)return {modules:[],capabilities:{}};const rows=await db('simplex_product_modules?product_id=eq.'+encodeURIComponent(product)+'&select=modules,capabilities');return rows[0]||{modules:[],capabilities:{}};
}
async function definitionsFor(product:string|null){
 if(!product)return [];const rows=await db('simplex_product_modules?product_id=eq.'+encodeURIComponent(product)+'&select=modules');return rows[0]?.modules||[];
}
async function managerFor(product:string|null){
 if(!product)return null;
 const rows=await db('simplex_product_modules?product_id=eq.'+encodeURIComponent(product)+'&select=management_url');
 const endpoint=rows[0]?.management_url;if(!endpoint)return null;
 const target=new URL(endpoint);
 const allowedPath=target.pathname==='/functions/v1/simplex-modules'||target.pathname==='/functions/v1/simplex-control';
 if(target.protocol!=='https:'||!target.hostname.endsWith('.supabase.co')||!allowedPath||target.username||target.password||target.port)throw Error('Destinazione gestione non valida');
 return target.href;
}
async function callManager(product:string|null,auth:string,payload:unknown){
 const endpoint=await managerFor(product);if(!endpoint)return null;
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const result=await response.json().catch(()=>({error:'Risposta prodotto non valida'}));
 if(!response.ok)throw Error(result?.error||'Sincronizzazione prodotto non riuscita');
 return result;
}
function demoStoragePath(path:string){return path.split('/').map(encodeURIComponent).join('/')}
async function validDemoLicense(key:string){
 if(!/^[a-f0-9]{48}$/.test(key))return false;
 const rows=await db('simplex_clients?license_key=eq.'+encodeURIComponent(key)+'&select=status,expires_at');
 if(!rows.length)return false;
 const c=rows[0];
 if(c.status!=='demo')return false;
 return !(c.expires_at&&new Date(c.expires_at).getTime()<Date.now());
}
function cleanClient(x:any){
 if(!x||!str(x.name,160))throw Error('Inserisci il nome del cliente');
 const status=['demo','active','suspended','expired'].includes(x.status)?x.status:'demo';
 const amount=Number(x.amount||0);if(!Number.isFinite(amount)||amount<0||amount>999999999)throw Error('Importo non valido');
 const demoDays=Math.max(1,Math.min(365,Math.trunc(Number(x.demo_days)||7)));
 const date=(v:unknown)=>{if(!v)return null;const d=new Date(String(v));if(Number.isNaN(d.getTime()))throw Error('Data non valida');return d.toISOString()};
 return {name:str(x.name,160),product_id:str(x.product_id,100)||null,status,paid:x.paid===true,amount:Math.round(amount*100)/100,paid_at:date(x.paid_at),expires_at:date(x.expires_at),demo_days:demoDays,modules:cleanModules(x.modules),notes:str(x.notes,4000),updated_at:new Date().toISOString()};
}
function validateApp(x:any){if(!x||!/^[a-zA-Z0-9_-]{1,100}$/.test(x.id)||!str(x.name,160))throw Error('Nome o identificativo app non valido');const y:any={id:x.id,name:str(x.name,160),customizable:x.customizable===true,featured:!!x.featured,visiblePublic:x.visiblePublic!==false,fullDescription:str(x.fullDescription,12000),screenshots:[]};if(x.screenshots!==undefined&&(!Array.isArray(x.screenshots)||x.screenshots.length>12))throw Error('Inserisci al massimo 12 screenshot');for(const image of x.screenshots||[]){if(typeof image!=='string'||image.length>3000||!/^https:\/\//.test(image))throw Error('Usa link HTTPS per gli screenshot');y.screenshots.push(image.trim())}for(const k of ['promoImages']){if(x[k]===undefined)continue;if(!Array.isArray(x[k])||x[k].length>6)throw Error('Inserisci al massimo 6 contenuti per tipo');y[k]=x[k].map((u:unknown)=>{if(typeof u!=='string'||u.length>3000||!/^https:\/\//.test(u))throw Error('Usa link HTTPS per i contenuti promozionali');const parsed=new URL(u);if(parsed.username||parsed.password)throw Error('Link promozionale non valido');return parsed.href})}for(const k of ['description','version','status','update','updateKind','category'])y[k]=str(x[k],k==='description'||k==='update'?2000:120);if(!y.category)y.category='Utility';for(const k of ['playUrl','apkUrl','icon','webUrl','demoUrl']){y[k]=str(x[k],3000);if(y[k]&&!/^https:\/\//.test(y[k]))throw Error('Usa indirizzi HTTPS per link e icone');}for(const k of ['webUrl','demoUrl'])if(y[k]){const u=new URL(y[k]);if(u.protocol!=='https:'||u.username||u.password)throw Error('Link online non valido')}return y}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Metodo non consentito'},405);
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==ORIGIN)return reply({error:'Origine non consentita'},403);
 try{
  const url=new URL(req.url),action=url.searchParams.get('action');
  if(action==='client-config'){
   const {licenseKey}=await req.json().catch(()=>({}));
   const key=str(licenseKey,120);
   if(!/^[a-f0-9]{48}$/.test(key))return reply({error:'Licenza non valida'},400);
   const rows=await db('simplex_clients?license_key=eq.'+encodeURIComponent(key)+'&select=name,product_id,status,paid,expires_at,demo_days,modules,updated_at');
   if(!rows.length)return reply({error:'Licenza non trovata'},404);
   const c=rows[0];const expired=c.expires_at&&new Date(c.expires_at).getTime()<Date.now();
   c.modules=supportedModules(c.modules,await definitionsFor(c.product_id));
   return reply({client:{name:c.name,productId:c.product_id,status:expired?'expired':c.status,paid:c.paid===true,expiresAt:c.expires_at,demoDays:c.demo_days,modules:c.modules||{},updatedAt:c.updated_at}});
  }
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))return reply({error:'Accedi all’Admin'},401);
  const ur=await fetch(base+'/auth/v1/user',{headers:{apikey:service,Authorization:auth}});
  if(!ur.ok)return reply({error:'Sessione scaduta: accedi di nuovo'},401);
  const user=await ur.json();const allowed=await db('simplex_admins?user_id=eq.'+encodeURIComponent(user.id)+'&select=user_id');
  if(!allowed.length)return reply({error:'Questo account non è autorizzato a pubblicare'},403);
  if(action==='tenant-asset'){
   const kind=url.searchParams.get('kind');if(!['logo','icon'].includes(kind||''))throw Error('Tipo immagine non valido');
   const blob=await req.arrayBuffer(),bytes=new Uint8Array(blob);if(blob.byteLength<32||blob.byteLength>2*1024*1024||bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71)throw Error('Usa PNG fino a 2 MB');
   const width=new DataView(blob).getUint32(16),height=new DataView(blob).getUint32(20);if(width<1||height<1||width>4096||height>4096||(kind==='icon'&&(width!==512||height!==512)))throw Error('Icona 512×512 richiesta; logo massimo 4096×4096');
   const path='tenants/'+crypto.randomUUID()+'.png';const upload=await fetch(base+'/storage/v1/object/simplex-icons/'+path,{method:'POST',headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'image/png'},body:blob});if(!upload.ok)throw Error('Caricamento immagine non riuscito');return reply({url:base+'/storage/v1/object/public/simplex-icons/'+path});
  }
  if(action==='product-modules'){
   const rows=await db('simplex_product_modules?select=product_id,modules,management_url,capabilities');return reply({products:rows.map((p:any)=>({product_id:p.product_id,modules:p.modules,managed:!!p.management_url,capabilities:tenantTools.capabilities(p.capabilities)}))});
  }
  if(action==='product-customers'||action==='product-customer-modules'||action==='product-customer-status'){
   const body=await req.json();if(typeof body.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(body.id))throw Error('Applicazione non valida');
   const payload=action==='product-customers'?{action:'list'}:action==='product-customer-status'?{action:'status',customerId:body.customerId,status:body.status}:{action:'save',customerId:body.customerId,modules:body.modules};
   const result=await callManager(body.id,auth,payload);if(!result)throw Error('Gestione server non configurata per questa applicazione');
   if(result.saved&&action==='product-customer-modules'&&result.modules){await db('simplex_clients?product_id=eq.'+encodeURIComponent(body.id)+'&remote_customer_id=eq.'+encodeURIComponent(body.customerId),'PATCH',{modules:result.modules,updated_at:new Date().toISOString()});}
   return reply(result);
  }
  if(action==='product-profile-refresh'){
   const {id}=await req.json();if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('Prodotto non valido');
   const result=await callManager(id,auth,{action:'capabilities'});if(!result||result.capabilities?.version!==2)throw Error('Questa PWA non dichiara il protocollo di personalizzazione');
   const definitions=moduleDefinitions(result.modules),capabilities=tenantTools.capabilities(result.capabilities);const keys=new Set(definitions.map((m:any)=>m.key));if(definitions.some((m:any)=>[...m.requires,...m.feature_requires].some((key:string)=>!keys.has(key)||key===m.key)))throw Error('Dipendenze moduli non valide');
   await db('simplex_product_modules?product_id=eq.'+encodeURIComponent(id),'PATCH',{modules:definitions,capabilities,updated_at:new Date().toISOString()});return reply({saved:true});
  }
  if(action==='product-modules-save'){
   const {id,modules}=await req.json();if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('Prodotto non valido');
   const apps=await db('simplex_apps?id=eq.'+encodeURIComponent(id)+'&select=id');if(!apps.length)throw Error('Applicazione non trovata');
   const definitions=moduleDefinitions(modules);await db('simplex_product_modules','POST',{product_id:id,modules:definitions,updated_at:new Date().toISOString()});return reply({saved:true});
  }
  if(action==='demo-photo-upload'){
   const article=str(url.searchParams.get('article'),40),license=str(url.searchParams.get('license'),120);
   if(!DEMO_ARTICLE_RE.test(article))return reply({error:'Articolo demo non valido'},400);
   if(!(await validDemoLicense(license)))return reply({error:'Licenza demo non valida'},403);
   const type=(req.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
   if(!['image/jpeg','image/png','image/webp'].includes(type))return reply({error:'Usa una foto JPG, PNG o WebP'},400);
   const body=await req.arrayBuffer();
   if(body.byteLength<16||body.byteLength>8*1024*1024)return reply({error:'Foto non valida o troppo grande (massimo 8 MB)'},400);
   const bytes=new Uint8Array(body);
   const jpg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
   const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
   const webp=bytes[0]===82&&bytes[1]===73&&bytes[2]===70&&bytes[3]===70&&bytes[8]===87&&bytes[9]===69&&bytes[10]===66&&bytes[11]===80;
   if((type==='image/jpeg'&&!jpg)||(type==='image/png'&&!png)||(type==='image/webp'&&!webp))return reply({error:'Il contenuto della foto non corrisponde al formato dichiarato'},400);
   const path='products/'+article+'/main';
   const up=await fetch(base+'/storage/v1/object/'+DEMO_BUCKET+'/'+demoStoragePath(path),{method:'POST',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':type,'x-upsert':'true','cache-control':'3600'},body});
   if(!up.ok){const msg=await up.text().catch(()=> '');throw Error('Caricamento foto demo non riuscito'+(msg?' ('+up.status+')':''));}
   return reply({url:base+'/storage/v1/object/public/'+DEMO_BUCKET+'/'+demoStoragePath(path)+'?v='+Date.now()});
  }
  if(action==='product-links'){
   const rows=await db('simplex_product_private?select=product_id,full_url');
   return reply({links:rows});
  }
  if(action==='product-link-save'){
   const {id,fullUrl}=await req.json();
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('Prodotto non valido');
   if(!fullUrl){await db('simplex_product_private?product_id=eq.'+encodeURIComponent(id),'DELETE');return reply({saved:true})}
   if(typeof fullUrl!=='string'||fullUrl.length>3000)throw Error('Link non valido');
   const parsed=new URL(fullUrl);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw Error('Usa HTTPS senza credenziali');
   await db('simplex_product_private','POST',{product_id:id,full_url:parsed.href,updated_at:new Date().toISOString()});return reply({saved:true});
  }
  if(action==='status'){const saved=await db('simplex_private_settings?id=eq.1&select=id');return reply({admin:true,email:user.email,githubConnected:!!saved.length})}
  if(action==='list'){const rows=await db('simplex_apps?select=payload&order=id');return reply({apps:rows.map((x:any)=>x.payload)})}
  if(action==='connect'){const {token}=await req.json();if(typeof token!=='string'||token.length<20||token.length>300)return reply({error:'Credenziale GitHub non valida'},400);const owner=await github(token,'user');if(owner.login.toLowerCase()!=='meapps-it')return reply({error:'Collega l’account GitHub meapps-it'},403);const repo=await github(token,'repos/'+REPO);if(!repo.permissions?.push)return reply({error:'Il collegamento deve consentire scrittura sul repository SimplexApp'},403);await db('simplex_private_settings','POST',{id:1,github_token:token});return reply({connected:true})}
  if(action==='disconnect'){await db('simplex_private_settings?id=eq.1','DELETE');return reply({connected:false})}
  if(action==='clients-list'){
   const rows=await db('simplex_clients?select=id,name,product_id,status,paid,amount,paid_at,expires_at,demo_days,modules,notes,license_key,remote_customer_id,business_name,email,plan,branding,sync_state,sync_error,created_at,updated_at&order=name.asc');
   const products=await db('simplex_product_modules?select=product_id,modules');const definitions=new Map(products.map((p:any)=>[p.product_id,p.modules]));
   for(const c of rows)c.modules=supportedModules(c.modules,definitions.get(c.product_id) as any[]||[]);
   return reply({clients:rows});
  }
  if(action==='client-save'){
   const body=await req.json();const client:any=cleanClient(body?.client);const id=str(body?.client?.id,80);
   const previous=id?(await db('simplex_clients?id=eq.'+encodeURIComponent(id)+'&select=*'))[0]:null;
   if(id&&!previous)throw Error('Cliente non trovato');
   if(previous?.remote_customer_id&&previous.product_id!==client.product_id)throw Error('Questa installazione è già collegata: crea una nuova installazione per cambiare PWA');
   const profile=await profileFor(client.product_id);
   for(const field of ['business_name','email','plan','branding']){
    if(!Object.hasOwn(body.client,field))continue;
    if(field==='branding')client.branding=tenantTools.branding(body.client.branding,profile.capabilities);
    else if(field==='plan'){if(!['demo','base','premium','custom'].includes(body.client.plan))throw Error('Piano non valido');client.plan=body.client.plan;}
    else {client[field]=str(body.client[field],field==='email'?254:160);if(field==='email'&&client.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email))throw Error('Email non valida');}
   }
   const v2=profile.capabilities?.version===2;
   if(!id&&Object.hasOwn(body.client,'email')&&(!client.product_id||!client.email||!client.business_name))throw Error('PWA, email e nome attività richiesti');
   if(v2&&!id&&(!client.product_id||!client.email||!client.business_name))throw Error('PWA, email e nome attività richiesti');
   if(v2)client.sync_state='pending';
   client.modules=supportedModules(client.modules,await definitionsFor(client.product_id),true);
   let rows;
   if(id){if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('Cliente non valido');rows=await db('simplex_clients?id=eq.'+encodeURIComponent(id),'PATCH',client)}
   else rows=await db('simplex_clients','POST',client);
   let saved=rows?.[0]||null;
   if(saved&&v2){
    try{const result=await callManager(client.product_id,auth,{action:'configure',externalId:saved.id,customerId:saved.remote_customer_id||null,name:saved.business_name||saved.name,email:saved.email,plan:saved.plan,status:saved.status,expiresAt:saved.expires_at,branding:saved.branding||{},modules:saved.modules||{}});
     if(!result?.saved||!result?.customerId)throw Error('Sincronizzazione non confermata');
     saved=(await db('simplex_clients?id=eq.'+encodeURIComponent(saved.id),'PATCH',{remote_customer_id:result.customerId,sync_state:'synced',sync_error:null}))[0];
    }catch(e){const warning=e instanceof Error?e.message:'Sincronizzazione non riuscita';saved=(await db('simplex_clients?id=eq.'+encodeURIComponent(saved.id),'PATCH',{sync_state:'error',sync_error:warning}))[0];return reply({client:saved,warning:'Configurazione salvata in SimplexApp, ma non applicata alla PWA: '+warning});}
   }else if(saved&&client.product_id&&client.status!=='demo'&&await managerFor(client.product_id)){
    const provision=await callManager(client.product_id,auth,{action:'provision',externalId:saved.id,name:saved.name,status:saved.status});
    const remoteId=provision?.customerId;
    if(typeof remoteId==='string'&&/^[0-9a-f-]{36}$/i.test(remoteId)){
     const linked=await db('simplex_clients?id=eq.'+encodeURIComponent(saved.id),'PATCH',{remote_customer_id:remoteId,updated_at:new Date().toISOString()});
     saved=linked?.[0]||{...saved,remote_customer_id:remoteId};
     const remoteStatus=saved.status==='active'?'active':saved.status==='expired'?'expired':'suspended';
     await callManager(client.product_id,auth,{action:'status',customerId:remoteId,status:remoteStatus});
     await callManager(client.product_id,auth,{action:'save',customerId:remoteId,modules:saved.modules||{}});
    }
   }
   return reply({client:saved});
  }
  if(action==='client-issue-license'){
   const body=await req.json();const id=str(body.id,80);if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('Cliente non valido');
   const clients=await db('simplex_clients?id=eq.'+encodeURIComponent(id)+'&select=id,name,product_id,status,modules,remote_customer_id');const client=clients[0];
   if(!client||client.status!=='active')throw Error('Salva prima il cliente con stato Attivo e i moduli autorizzati');
   let customerId=client.remote_customer_id;
   if(!customerId){const created=await callManager(client.product_id,auth,{action:'provision',externalId:client.id,name:client.name,status:'active'});customerId=created?.customerId;if(!customerId)throw Error('Gestione prodotto non configurata');await db('simplex_clients?id=eq.'+encodeURIComponent(id),'PATCH',{remote_customer_id:customerId});}
   const expiresAt=new Date(body.expiresAt);if(!body.expiresAt||!Number.isFinite(expiresAt.getTime())||expiresAt.getTime()<=Date.now())throw Error('Scegli una scadenza futura');
   const modules=supportedModules(client.modules,await definitionsFor(client.product_id),true);
   const result=await callManager(client.product_id,auth,{action:'issue-license',customerId,email:str(body.email,254),plan:str(body.plan,80),expiresAt:expiresAt.toISOString(),modules});
   if(!result?.key)throw Error('Codice non generato');return reply(result);
  }
  if(action==='client-delete'){
   const body=await req.json();const id=str(body?.id,80);if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('Cliente non valido');
   await db('simplex_clients?id=eq.'+encodeURIComponent(id),'DELETE');return reply({deleted:true});
  }
  if(action==='save'){const {app}=await req.json();const a=validateApp(app);await db('simplex_apps','POST',{id:a.id,payload:a,updated_at:new Date().toISOString()});return reply({app:a})}
  if(action==='import'){const {apps,site}=await req.json();if(!Array.isArray(apps)||apps.length>1000)throw Error('Catalogo non valido');const a=apps.map(validateApp);if(new Set(a.map(x=>x.id)).size!==a.length)throw Error('ID duplicati');const s=site?{title:str(site.title,160)||'SimplexApp',tagline:str(site.tagline,300),hero:str(site.hero,2000),theme:site.theme==='classic'?'classic':'premium',categories:cleanCategories(site.categories)}:null;await db('rpc/simplex_replace_catalog','POST',{p_apps:a,p_site:s});return reply({published:true})}
  if(action==='delete'){const {id}=await req.json();if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('ID non valido');await db('simplex_apps?id=eq.'+encodeURIComponent(id),'DELETE');return reply({deleted:true})}
  if(action==='site'){const {site}=await req.json();const s={title:str(site?.title,160)||'SimplexApp',tagline:str(site?.tagline,300),hero:str(site?.hero,2000),theme:site?.theme==='classic'?'classic':'premium',categories:cleanCategories(site?.categories)};await db('simplex_site','POST',{id:1,payload:s,updated_at:new Date().toISOString()});return reply({site:s})}
  if(action==='icon'){const blob=await req.arrayBuffer();const bytes=new Uint8Array(blob);if(blob.byteLength>8*1024*1024||bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71)throw Error('Icona PNG non valida (massimo 8 MB)');const path=crypto.randomUUID()+'.png';const r=await fetch(base+'/storage/v1/object/simplex-icons/'+path,{method:'POST',headers:{apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'image/png'},body:blob});if(!r.ok)throw Error('Caricamento icona non riuscito');return reply({url:base+'/storage/v1/object/public/simplex-icons/'+path})}
  if(action==='apk'){
   const size=Number(req.headers.get('x-file-size'));if(!Number.isSafeInteger(size)||size<4||size>MAX_APK)throw Error('APK non valida o troppo grande (deve essere inferiore a 2 GiB)');
   const id=str(url.searchParams.get('id'),100),version=str(url.searchParams.get('version'),100);
   if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||!version)throw Error('Inserisci nome e versione prima di caricare l’APK');
   const config=await db('simplex_private_settings?id=eq.1&select=github_token');if(!config.length)return reply({error:'Prima collega GitHub nella sezione Connessione APK'},409);
   const token=config[0].github_token,reader=req.body?.getReader();if(!reader)throw Error('Nessun file ricevuto');
   // Check the ZIP header without buffering the complete APK.
   let prefix=new Uint8Array(0);while(prefix.length<4){const chunk=await reader.read();if(chunk.done)throw Error('File APK incompleto');const join=new Uint8Array(prefix.length+chunk.value.length);join.set(prefix);join.set(chunk.value,prefix.length);prefix=join;}
   if(prefix[0]!==80||prefix[1]!==75||prefix[2]!==3||prefix[3]!==4){await reader.cancel();throw Error('Il file selezionato non è un archivio APK valido');}
   const release=await github(token,'repos/'+REPO+'/releases','POST',{tag_name:id+'-'+version.replace(/[^a-zA-Z0-9._-]/g,'-')+'-'+crypto.randomUUID().slice(0,8),target_commitish:'main',name:id+' · '+version,draft:true,body:'APK pubblicata dall’Admin SimplexApp.'});
   let count=prefix.length;const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(prefix)},async pull(c){const chunk=await reader.read();if(chunk.done){if(count!==size)c.error(Error('File incompleto'));else c.close();return}count+=chunk.value.length;if(count>size){await reader.cancel();c.error(Error('Dimensione del file non valida'));return}c.enqueue(chunk.value)},cancel(){return reader.cancel()}});
   try{const uploadURL=release.upload_url.split('{')[0]+'?name='+encodeURIComponent(id+'-'+version.replace(/[^a-zA-Z0-9._-]/g,'-')+'.apk');const asset=await uploadAsset(uploadURL,token,size,stream);await github(token,'repos/'+REPO+'/releases/'+release.id,'PATCH',{draft:false});const publishedAsset=await github(token,'repos/'+REPO+'/releases/assets/'+asset.id);if(publishedAsset.size!==size||typeof publishedAsset.browser_download_url!=='string'||!publishedAsset.browser_download_url.startsWith('https://github.com/'+REPO+'/releases/download/')||publishedAsset.browser_download_url.includes('/untagged-'))throw Error('GitHub non ha confermato il link pubblico. Riprova.');return reply({url:publishedAsset.browser_download_url,size:publishedAsset.size})}
   catch(e){await github(token,'repos/'+REPO+'/releases/'+release.id,'DELETE').catch(()=>{});throw e}
  }
  return reply({error:'Operazione non riconosciuta'},400);
 }catch(e){return reply({error:e instanceof Error?e.message:'Operazione non riuscita'},400)}
});

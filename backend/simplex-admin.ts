import { uploadAsset } from './github-upload.ts';
// GitHub credential is confined to a service-role-only table; never returned to clients.
const ORIGIN='https://meapps-it.github.io';
const REPO='meapps-it/SimplexApp';
const MAX_APK=2*1024*1024*1024-1;
const cors={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-file-size','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
const base=Deno.env.get('SUPABASE_URL')!;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sh={apikey:service,Authorization:`Bearer ${service}`,'Content-Type':'application/json'};
function reply(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})}
async function db(path:string,method='GET',body?:unknown){const r=await fetch(base+'/rest/v1/'+path,{method,headers:{...sh,Prefer:'return=representation,resolution=merge-duplicates'},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw Error('Operazione sul catalogo non riuscita');return r.status===204?null:r.json()}
async function github(token:string,path:string,method='GET',body?:unknown){const r=await fetch('https://api.github.com/'+path,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw Error(r.status===401||r.status===403?'Accesso GitHub rifiutato: verifica permessi e scadenza della connessione.':'GitHub non ha completato l’operazione ('+r.status+').');return r.status===204?null:r.json()}
const str=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
function cleanCategories(v:unknown){if(!Array.isArray(v))return ['Produttività','Comunicazione','Utility','Giochi'];const out=[...new Set(v.map(x=>str(x,80)).filter(Boolean))];return out.length?out.slice(0,100):['Produttività','Comunicazione','Utility','Giochi']}
function validateApp(x:any){if(!x||!/^[a-zA-Z0-9_-]{1,100}$/.test(x.id)||!str(x.name,160))throw Error('Nome o identificativo app non valido');const y:any={id:x.id,name:str(x.name,160),customizable:x.customizable===true,featured:!!x.featured,visiblePublic:x.visiblePublic!==false,fullDescription:str(x.fullDescription,12000),screenshots:[]};if(x.screenshots!==undefined&&(!Array.isArray(x.screenshots)||x.screenshots.length>12))throw Error('Inserisci al massimo 12 screenshot');for(const image of x.screenshots||[]){if(typeof image!=='string'||image.length>3000||!/^https:\/\//.test(image))throw Error('Usa link HTTPS per gli screenshot');y.screenshots.push(image.trim())}for(const k of ['promoImages']){if(x[k]===undefined)continue;if(!Array.isArray(x[k])||x[k].length>6)throw Error('Inserisci al massimo 6 contenuti per tipo');y[k]=x[k].map((u:unknown)=>{if(typeof u!=='string'||u.length>3000||!/^https:\/\//.test(u))throw Error('Usa link HTTPS per i contenuti promozionali');const parsed=new URL(u);if(parsed.username||parsed.password)throw Error('Link promozionale non valido');return parsed.href})}for(const k of ['description','version','status','update','updateKind','category'])y[k]=str(x[k],k==='description'||k==='update'?2000:120);if(!y.category)y.category='Utility';for(const k of ['playUrl','apkUrl','icon','webUrl','demoUrl']){y[k]=str(x[k],3000);if(y[k]&&!/^https:\/\//.test(y[k]))throw Error('Usa indirizzi HTTPS per link e icone');}for(const k of ['webUrl','demoUrl'])if(y[k]){const u=new URL(y[k]);if(u.protocol!=='https:'||u.username||u.password)throw Error('Link online non valido')}return y}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply({error:'Metodo non consentito'},405);
 if(req.headers.get('Origin')&&req.headers.get('Origin')!==ORIGIN)return reply({error:'Origine non consentita'},403);
 try{
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))return reply({error:'Accedi all’Admin'},401);
  const ur=await fetch(base+'/auth/v1/user',{headers:{apikey:service,Authorization:auth}});
  if(!ur.ok)return reply({error:'Sessione scaduta: accedi di nuovo'},401);
  const user=await ur.json();const allowed=await db('simplex_admins?user_id=eq.'+encodeURIComponent(user.id)+'&select=user_id');
  if(!allowed.length)return reply({error:'Questo account non è autorizzato a pubblicare'},403);
  const url=new URL(req.url),action=url.searchParams.get('action');
  if(action==='status'){const saved=await db('simplex_private_settings?id=eq.1&select=id');return reply({admin:true,email:user.email,githubConnected:!!saved.length})}
  if(action==='list'){const rows=await db('simplex_apps?select=payload&order=id');return reply({apps:rows.map((x:any)=>x.payload)})}
  if(action==='connect'){const {token}=await req.json();if(typeof token!=='string'||token.length<20||token.length>300)return reply({error:'Credenziale GitHub non valida'},400);const owner=await github(token,'user');if(owner.login.toLowerCase()!=='meapps-it')return reply({error:'Collega l’account GitHub meapps-it'},403);const repo=await github(token,'repos/'+REPO);if(!repo.permissions?.push)return reply({error:'Il collegamento deve consentire scrittura sul repository SimplexApp'},403);await db('simplex_private_settings','POST',{id:1,github_token:token});return reply({connected:true})}
  if(action==='disconnect'){await db('simplex_private_settings?id=eq.1','DELETE');return reply({connected:false})}
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

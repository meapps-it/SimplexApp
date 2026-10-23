'use strict';
// Private preview sandbox: local fixtures only. Never talks to the real admin API.
const CLOUD={url:location.origin,key:''};
let adminSession={access_token:'preview-only',expires_at:4102444800};
const previewState=Promise.all([fetch('./data/apps.json').then(r=>r.json()),fetch('./data/preview-modules.json').then(r=>r.json())]).then(([apps,definitions])=>{
 for(const a of apps){if(a.icon)a.icon=new URL(a.icon,location.origin+'/').href;for(const key of ['screenshots','promoImages'])if(Array.isArray(a[key]))a[key]=a[key].map(u=>new URL(u,location.origin+'/').href);}
 const id='app_1791209955436',all=Object.fromEntries((definitions[id]||[]).filter(m=>m.ready!==false).map(m=>[m.key,true]));
 return {apps,definitions,site:{title:'SimplexApp',tagline:'App e soluzioni digitali',hero:'App e PWA personalizzabili per aziende e professionisti.',theme:'premium'},customers:[{id:'preview-customer-1',name:'Attività dimostrativa Alba',email:'alba@example.invalid',state:'trial',modules:{...all},trial_expires_at:'2099-01-01T00:00:00Z'},{id:'preview-customer-2',name:'Laboratorio dimostrativo Blu',email:'blu@example.invalid',state:'licensed',modules:{products:true,clients:true,orders:true,dashboard:true},license_plan:'Dimostrativo',license_expires_at:'2099-01-01T00:00:00Z'}]};
});
const previewBlocked=()=>{throw Error('Operazione reale disattivata: questa è un’anteprima privata. Nessun dato è stato inviato.');};
async function cloudFetch(){return previewBlocked()}
async function uploadFile(){throw Error('Puoi vedere le foto selezionate. Il caricamento sul server è disattivato nell’anteprima.');}
async function accessToken(){return 'preview-only'}
function rememberSession(){adminSession={access_token:'preview-only',expires_at:4102444800}}
async function loadCloud(){const s=await previewState;return structuredClone({apps:s.apps,site:s.site});}
async function adminCall(action,body={}){
 const s=await previewState,id='app_1791209955436';
 switch(action){
 case 'status':return {email:'Anteprima privata · dati di esempio',githubConnected:false};
 case 'list':return structuredClone({apps:s.apps});
 case 'clients-list':return {clients:[]};
 case 'product-links':return {links:[]};
 case 'product-modules':return {products:s.apps.map(a=>({product_id:a.id,managed:a.id===id,modules:s.definitions[a.id]||[]}))};
 case 'product-customers':return structuredClone({customers:body.id===id?s.customers:[],registrations:[]});
 case 'save':{
  if(!body.app?.id||!body.app.name?.trim())throw Error('Compila il nome della scheda.');
  const app=structuredClone(body.app),index=s.apps.findIndex(a=>a.id===app.id);if(index<0)s.apps.push(app);else s.apps[index]=app;
  return {app:structuredClone(app)};
 }
 case 'delete':s.apps=s.apps.filter(a=>a.id!==body.id);return {deleted:true};
 case 'site':s.site={...s.site,...body.site};return {site:structuredClone(s.site)};
 case 'product-profile-refresh':if(body.id!==id)return previewBlocked();return {refreshed:true};
 case 'product-customer-modules':{
  if(body.id!==id)return previewBlocked();const customer=s.customers.find(c=>c.id===body.customerId);if(!customer)throw Error('Scegli un cliente dimostrativo.');
  const definitions=s.definitions[id]||[],allowed=new Set(definitions.filter(m=>m.ready!==false).map(m=>m.key));
  if(Object.entries(body.modules||{}).some(([key,on])=>typeof on!=='boolean'||on&&!allowed.has(key)))throw Error('Modulo non disponibile nell’app.');
  customer.modules=Object.fromEntries([...allowed].map(key=>[key,body.modules?.[key]===true]));for(let pass=0;pass<definitions.length;pass++)for(const m of definitions)if(customer.modules[m.key]&&(m.requires||[]).some(key=>!customer.modules[key]))customer.modules[m.key]=false;return {saved:true,modules:structuredClone(customer.modules)};
 }
 case 'product-analytics':return {analytics:{totals:{registered:0,trials_active:0,subscriptions_active:0,trials_expired:0},months:['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'].map(key=>({key,registrations:0,trials:0})),registrations:[],generated_at:'2026-10-23T10:00:00Z'}};
 default:return previewBlocked();
 }
}

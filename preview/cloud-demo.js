'use strict';
// Preview adapter only. No production endpoint, credentials or authenticated session.
const CLOUD={url:location.origin,key:''};
let adminSession={access_token:'demo-only',expires_at:4102444800};
const previewCatalog=fetch('./data/apps.json').then(r=>r.json());
const blocked=()=>{throw Error('Anteprima in sola lettura: nessuna modifica è stata inviata.');};
async function cloudFetch(){return blocked()}
async function uploadFile(){return blocked()}
async function accessToken(){return 'demo-only'}
function rememberSession(){adminSession={access_token:'demo-only',expires_at:4102444800}}
async function loadCloud(){return {apps:await previewCatalog,site:{title:'SimplexApp',tagline:'App e soluzioni digitali',hero:'App e PWA personalizzabili per aziende e professionisti.',theme:'premium'}}}
async function adminCall(action){
 const apps=await previewCatalog;
 switch(action){
 case 'status': return {email:'demo@example.com',githubConnected:false};
 case 'list':return {apps};
 case 'clients-list':return {clients:[]};
 case 'product-links':return {links:[]};
 case 'product-modules':return {products:[{product_id:'vg',managed:true,modules:[{key:'articoli',label:'Articoli',ready:true},{key:'clienti',label:'Clienti',ready:true},{key:'appuntamenti',label:'Appuntamenti',ready:true}]}]};
 case 'product-customers':return {customers:[],registrations:[]};
 case 'product-analytics':return {analytics:{totals:{registered:0,trials_active:0,subscriptions_active:0,trials_expired:0},months:['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'].map(key=>({key,registrations:0,trials:0})),registrations:[],generated_at:'2026-10-21T12:00:00Z'}};
 default:return blocked();
 }
}

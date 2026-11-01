'use strict';
// Enable after verifying the external deployment; never advertise the private test Site.
(function(root){
 const launchUrl='';
 function verified(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hostname.endsWith('.chatgpt.site')&&u.hostname!=='chatgpt.com'?u.href:'';}catch{return '';}}
 const launch=verified(launchUrl);
 root.SimplexRistoCatalog={launchUrl:launch,merge(apps){
  if(!launch||apps.some(app=>app.id==='simplexristo'||String(app.name||'').toLowerCase()==='simplexristo'))return apps;
  return [...apps,{id:'simplexristo',name:'SimplexRisto',version:'0.1.0',description:'Menu digitale, ordinazioni al tavolo e comande in cucina.',fullDescription:'PWA per il servizio al ristorante: menu QR, ordinazioni dei clienti e dei camerieri, tavoli, pannello cucina e gestione menu e personale. Un ristorante per installazione. Sono esclusi cassa, pagamenti degli ordini, magazzino e fatturazione.',category:'Produttività',status:'In test',webUrl:new URL('simplexristo/',location.href.split('#')[0]).href,demoUrl:'',apkUrl:'',playUrl:'',icon:new URL('assets/simplexristo-192.png',location.href.split('#')[0]).href,screenshots:[],featured:false,visiblePublic:true,customizable:false}];
 }};
})(window);

import {mkdir,copyFile,cp,readFile,writeFile,rm} from 'node:fs/promises';
const studio=process.argv.includes('--admin-studio');
const out=new URL('../preview-dist/',import.meta.url),root=new URL('../',import.meta.url);
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const files=['admin-studio.js','admin-studio.css','admin-editor-guide.js','admin-editor-guide.css','screenshots-editor.js','screenshots-editor.css','gestionale-spotlight.js','gestionale-spotlight.css','app-detail.css','index.html','style.css','premium.css','design.css','catalog-refresh.css','workspace.css','admin.css','visits.css','restyling.css','restyling-ui.js','app.js','media.js','vitrine.js','tenant-config.js','tenant-customization.js','admin-analytics.js'];
for(const file of files)await copyFile(new URL(file,root),new URL(file,out));
await cp(new URL('assets/',root),new URL('assets/',out),{recursive:true});
await cp(new URL('data/',root),new URL('data/',out),{recursive:true});
await copyFile(new URL(studio?'preview/studio-demo.js':'preview/cloud-demo.js',root),new URL('cloud-demo.js',out));
await copyFile(new URL('preview/demo-ui.js',root),new URL('demo-ui.js',out));
let html=await readFile(new URL('index.html',out),'utf8');
html=html.replace(/<script src="(?:cloud|contact|simplex-visits|admin-visits|install-pwa)\.js[^\"]*"><\/script>/g,'').replace('<script src="media.js','<script src="cloud-demo.js"></script><script src="media.js');
html=html.replace('</body>','<script src="demo-ui.js"></script></body>').replace(/<link rel="manifest"[^>]*>/,'').replace('content="index,follow,max-image-preview:large"','content="noindex,nofollow"');
const csp="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; form-action 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'self'";
html=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+csp+'">');
if(studio){html=html.replace('</head>','<link rel="stylesheet" href="studio-preview.css"></head>').replace('</body>','<script src="studio-preview-ui.js"></script></body>');await copyFile(new URL('preview/studio.css',root),new URL('studio-preview.css',out));await copyFile(new URL('preview/studio-ui.js',root),new URL('studio-preview-ui.js',out));}
await writeFile(new URL('index.html',out),html);
let js=await readFile(new URL('app.js',out),'utf8');
js=js.replace("if('serviceWorker'in navigator&&['https:','http:'].includes(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>toast('Modalità offline non disponibile su questo indirizzo'))",'/* Service worker omitted in isolated preview. */');
if(studio)js=js.replaceAll('Moduli salvati. Nella versione completa premi Sincronizza per aggiornare i permessi.','Moduli salvati solo nell’anteprima privata.').replaceAll('Clienti reali','Clienti dimostrativi').replaceAll('App pubblicata per tutti','Salvata solo nell’anteprima').replaceAll('App visibile solo all’Admin','Salvata solo nell’anteprima').replaceAll('pubblicata nel sito pubblico.','salvata nell’anteprima privata.').replaceAll('Pubblica app','Salva nella demo');
await writeFile(new URL('app.js',out),js);
if(studio){const demo=await readFile(new URL('demo-ui.js',out),'utf8');await writeFile(new URL('demo-ui.js',out),demo.replace('Area dimostrativa in sola lettura. Statistiche illustrative a zero, nessun cliente reale. I comandi di salvataggio sono bloccati.','Puoi modificare schede e moduli con dati dimostrativi: i salvataggi restano in questa anteprima fino al ricaricamento. Nessun dato reale.'));}
await writeFile(new URL('robots.txt',out),'User-agent: *\nDisallow: /\n');
if(studio){const definitions=JSON.parse(await readFile(new URL('backend/product-modules-seed.json',root),'utf8'));definitions.app_1791209955436=JSON.parse(await readFile(new URL('preview/manager-modules.json',root),'utf8'));await writeFile(new URL('data/preview-modules.json',out),JSON.stringify(definitions));}
// Native media already in the repository; keep these as promotional images.
const apps=JSON.parse(await readFile(new URL('data/apps.json',out),'utf8'));
apps.find(a=>a.id==='toi').promoImages=['assets/promotional/turni-operai.png'];
if(studio){const legacy=apps.findIndex(a=>a.id==='vg');const manager={id:'app_1791209955436',name:'Simplex Manager',version:'0.1.1',category:'Aziendale',status:'Disponibile',description:'Articoli, magazzino, clienti, ordini e servizi in un unico gestionale modulare.',fullDescription:'Organizza la tua attività con i moduli che ti servono. Gestisci articoli, clienti, fornitori, ordini, servizi e appuntamenti.',icon:'assets/simplex-manager-512.png',screenshots:['assets/simplex-manager-demo-mobile.png','assets/simplex-manager-demo-charts.png','assets/simplex-manager-demo-desktop.png'],webUrl:'https://simplex-gestionale.pages.dev/',demoUrl:'https://simplex-gestionale.pages.dev/?mode=demo',visiblePublic:true,featured:true,customizable:true};if(legacy>=0)apps[legacy]=manager;else apps.push(manager);}
await writeFile(new URL('data/apps.json',out),JSON.stringify(apps,null,2));
await writeFile(new URL('responsive.html',out),`<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SimplexApp · Anteprima smartphone</title><style>body{margin:0;background:#e7edf6;font:14px system-ui}header{padding:16px;display:flex;align-items:center;justify-content:center;gap:18px}a{color:#0754d6}iframe{display:block;border:1px solid #ced9e8;border-radius:20px;margin:0 auto;background:white;width:393px;height:852px;max-width:100%}</style><header><label>Viewport <select id="viewport"><option>320</option><option>360</option><option selected>393</option><option>768</option><option>1024</option></select> px</label><a href="./">Versione desktop</a></header><iframe title="Anteprima smartphone" src="./"></iframe><script>document.getElementById("viewport").onchange=e=>document.querySelector("iframe").style.width=e.target.value+"px";</script></html>`);
let analytics=await readFile(new URL('admin-analytics.js',out),'utf8');await writeFile(new URL('admin-analytics.js',out),analytics.replace('La tendenza reale degli ultimi sei mesi.','Dati dimostrativi: nessuna statistica di produzione.'));
console.log('Isolated preview built: '+out.pathname);

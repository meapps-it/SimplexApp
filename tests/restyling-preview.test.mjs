import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
test('preview adapter only loads local fixtures and rejects all production writes',async()=>{
 const calls=[],fixtures=JSON.parse(await read('data/apps.json'));
 const context=vm.createContext({location:{origin:'https://preview.invalid'},fetch:async(url)=>{calls.push(url);return {json:async()=>fixtures}}});
 vm.runInContext(await read('preview/cloud-demo.js'),context);
 assert.equal((await vm.runInContext('loadCloud()',context)).apps.length,3);
 assert.equal((await vm.runInContext("adminCall('list')",context)).apps.length,3);
 for(const action of ['save','delete','site','client-save','client-delete','connect','import','product-customer-modules','client-issue-license'])await assert.rejects(vm.runInContext(`adminCall('${action}')`,context),/sola lettura/);
 await assert.rejects(vm.runInContext('cloudFetch()',context),/sola lettura/);
 await assert.rejects(vm.runInContext('uploadFile()',context),/sola lettura/);
 assert.deepEqual(calls,['./data/apps.json']);
});
test('packaged preview has restrictive CSP and excludes live integrations and service workers',async()=>{
 const html=await read('preview-dist/index.html'),js=await read('preview-dist/app.js');
 for(const file of ['cloud.js','contact.js','simplex-visits.js','admin-visits.js','install-pwa.js'])assert.ok(!html.includes('src="'+file));
 assert.ok(html.includes("connect-src 'self'"));assert.ok(html.includes("form-action 'none'"));assert.ok(html.includes("worker-src 'none'"));
 assert.ok(!js.includes('navigator.serviceWorker.register'));
 assert.ok(html.includes('cloud-demo.js'));assert.ok(html.includes('demo-ui.js'));assert.ok(html.includes('noindex,nofollow'));
});
test('restyling preserves original download/PWA routing, logo and administrative controls',async()=>{
 const html=await read('index.html'),app=await read('app.js');
 assert.ok(html.includes('assets/simplexapp-header-horizontal.webp'));assert.ok(html.includes('id="contactForm"'));
 for(const id of ['saveApp','saveClient','adminAnalytics','adminSettingsPanel','loginForm'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(app.includes('Apri PWA nel browser'));assert.ok(app.includes('Scarica APK Android'));assert.ok(app.includes('href="#app/${encodeURIComponent(a.id)}"'));
});

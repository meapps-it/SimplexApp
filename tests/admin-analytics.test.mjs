import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import {JSDOM} from 'jsdom';
test('analytics shows real values, changes series, ignores stale requests and clears private results',async()=>{
 const dom=new JSDOM('<section id="adminAnalytics"></section>'),w=dom.window,pending=[];
 const c=vm.createContext({window:w,document:w.document,Date,getApps:()=>[{id:'a',name:'App A'},{id:'b',name:'App B'}],adminCall:(action,body)=>{assert.equal(action,'product-analytics');return new Promise((resolve,reject)=>pending.push({id:body.id,resolve,reject}));}});
 vm.runInContext(readFileSync('admin-analytics.js','utf8'),c);const api=w.adminAnalytics;
 const data={generated_at:'2026-10-12T14:00:00Z',totals:{registered:3,trials_active:1,subscriptions_active:0,trials_expired:1},months:[5,6,7,8,9,10].map(m=>({key:'2026-'+String(m).padStart(2,'0'),registrations:m===10?3:0,trials:m===10?1:0}))};
 api.setProducts([{product_id:'a'},{product_id:'b'}]);pending.shift().resolve({analytics:data});await new Promise(r=>setTimeout(r,0));
 assert.match(w.document.querySelector('#analytics-selection').textContent,/3 registrazioni/);assert.equal(w.document.querySelectorAll('.analytics-month').length,6);assert.equal(w.document.querySelector('.analytics-metrics strong').textContent,'3');
 const metric=w.document.querySelector('#analytics-metric');metric.value='trials';metric.onchange({target:metric});assert.match(w.document.querySelector('#analytics-selection').textContent,/1 prove avviate/);
 w.document.querySelector('[data-analytics-month="2026-05"]').click();assert.match(w.document.querySelector('#analytics-selection').textContent,/0 prove avviate/);
 const loadA=api.load();const old=pending.shift();const select=w.document.querySelector('#analytics-product');select.value='b';select.onchange({target:select});const current=pending.shift();current.reject(Error('Statistiche non disponibili'));await new Promise(r=>setTimeout(r,0));old.resolve({analytics:data});await loadA;assert.match(w.document.querySelector('#analytics-data').textContent,/Statistiche non disponibili/);assert.equal(w.document.querySelectorAll('.analytics-metrics').length,0);
 const lateLoad=api.load();const late=pending.shift();api.clear();late.resolve({analytics:data});await lateLoad;assert.equal(w.document.querySelector('#adminAnalytics').innerHTML,'');dom.window.close();
});

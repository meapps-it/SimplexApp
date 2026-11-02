import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../risto-central-admin.js',import.meta.url),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(){const dom=new JSDOM('<button id="adminRestaurantsTab"></button><section id="adminRestaurantsPanel"><p id="restaurantCentralStatus"></p><button id="restaurantCentralRetry"></button><div id="restaurantCentralHost"></div></section>',{url:'https://simplexapp.it/#admin',runScripts:'outside-only'});const w=dom.window;w.eval("let adminSession={}; async function checkAdmin(){return true;} async function adminCall(){return {admin:true};} async function accessToken(){return 'private-test-token';} function adminSection(mode){window.selected=mode;}");w.eval(source);return dom;}
test('central iframe authenticates only the exact trusted frame and clears on logout',async()=>{
 const dom=fixture(),w=dom.window;try{
  w.document.getElementById('adminRestaurantsTab').click();await tick();const frame=w.document.querySelector('iframe');assert.ok(frame);assert.equal(w.selected,'restaurants');assert.equal(frame.src,'https://risto.simplexapp.it/platform?embed=1');assert.doesNotMatch(frame.src,/token/);
  const sent=[];frame.contentWindow.postMessage=(...args)=>sent.push(args);
  w.dispatchEvent(new w.MessageEvent('message',{origin:'https://evil.example',source:frame.contentWindow,data:{type:'simplex-risto-ready'}}));await tick();assert.equal(sent.length,0);
  w.dispatchEvent(new w.MessageEvent('message',{origin:'https://risto.simplexapp.it',source:w,data:{type:'simplex-risto-ready'}}));await tick();assert.equal(sent.length,0);
  w.dispatchEvent(new w.MessageEvent('message',{origin:'https://risto.simplexapp.it',source:frame.contentWindow,data:{type:'simplex-risto-ready'}}));await tick();assert.equal(sent[0][0].token,'private-test-token');assert.equal(sent[0][1],'https://risto.simplexapp.it');assert.equal(w.localStorage.length,0);
  w.simplexRistoCentral.clear();assert.equal(w.document.querySelector('iframe'),null);assert.equal(sent.at(-1)[0].type,'simplex-risto-clear');
 }finally{w.close();}
});
test('both public and PWA entrypoints include the management section',()=>{
 for(const path of ['index.html','app.html']){const dom=new JSDOM(readFileSync(new URL('../'+path,import.meta.url),'utf8'));try{const d=dom.window.document;assert.equal(d.querySelectorAll('#adminRestaurantsTab').length,1);assert.ok(d.querySelector('#adminRestaurantsPanel.hidden'));assert.ok(d.querySelector('script[src="risto-central-admin.js?v=1"]'));}finally{dom.window.close();}}
});

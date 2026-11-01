import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const code=readFileSync('risto-branding-admin.js','utf8');
for(const existing of [false,true])test(`logo shortcut reveals upload section for ${existing?'existing':'new'} restaurant card`,()=>{
 const dom=new JSDOM('<button id="editRistoLogo"></button><input id="appName"><input id="appDesc"><input id="appStatus"><fieldset hidden><label>Icona app<input id="appIconFile" type="file"></label></fieldset>',{runScripts:'outside-only'});
 const w=dom.window,group=w.document.querySelector('fieldset'),app={id:'risto-1',name:'SimplexRisto',icon:'https://example.com/logo.png'};let edited;
 w.getApps=()=>existing?[app]:[];w.editApp=a=>{edited=a;group.hidden=true};w.openEditor=()=>{group.hidden=true};w.resetForm=()=>{};
 w.adminStudio={selectStep(step){assert.equal(step,1);group.hidden=false}};
 w.document.getElementById('appIconFile').scrollIntoView=()=>assert.equal(group.hidden,false);
 w.eval(code);w.document.getElementById('editRistoLogo').click();
 assert.equal(group.hidden,false);assert.match(group.textContent,/Logo SimplexRisto/);
 assert.equal(w.document.activeElement.id,'appIconFile');
 if(existing)assert.equal(edited,app);else assert.equal(w.document.getElementById('appName').value,'SimplexRisto');
});

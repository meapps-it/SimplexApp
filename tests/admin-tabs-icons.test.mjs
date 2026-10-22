import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
test('tutte le sezioni di Area gestione hanno un simbolo e una label leggibile',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 try{
  const d=dom.window.document;
  const labels={adminAppsTab:'Dashboard',adminClientsTab:'Clienti',adminDemosTab:'Demo',adminModulesTab:'Moduli',adminSettingsTab:'Impostazioni'};
  for(const [id,label] of Object.entries(labels)){
   const button=d.getElementById(id);
   assert.ok(button, id);
   assert.equal(button.querySelector('span')?.textContent,label);
   assert.ok(button.querySelector('svg[aria-hidden="true"] path[d]'),id+' senza icona');
  }
  const paths=Object.keys(labels).map(k=>d.getElementById(k).querySelector('path').getAttribute('d'));
  assert.equal(new Set(paths).size,paths.length,'icone delle sezioni diverse tra loro');
 }finally{dom.window.close();}
});

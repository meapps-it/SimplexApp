import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const script = readFileSync(new URL('../gestionale-spotlight.js', import.meta.url), 'utf8');
function fixture() {
  const dom = new JSDOM('<main><section id="gestionaleSpotlight" hidden aria-labelledby="gestionaleSpotlightTitle"></section></main>', {
    url:'https://simplexapp.it/',runScripts:'outside-only'
  });
  const w = dom.window, d = w.document;
  w.esc = value => String(value ?? '').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  w.safeIcon = value => /^https:\/\//.test(value||'')?value:'https://simplexapp.it/assets/logo.png';
  w.onlineURL = value => /^https:\/\/[^\s]+$/.test(value||'')?value:'';
  w.eval(script);
  return {dom,w,d,box:d.getElementById('gestionaleSpotlight')};
}
test('solo Gestionale & Inventario reale e pubblico appare in primo piano',()=>{
  const t=fixture();
  try {
    const products=[
      {id:'vg',name:'Gestionale V&G',featured:true},
      {id:'prod_443',name:'Gestionale & Inventario',description:'Catalogo',icon:'https://simplexapp.it/assets/app.png',webUrl:'https://simplex-gestionale.pages.dev/',screenshots:['https://example.test/shot.png']}
    ];
    t.w.renderGestionaleSpotlight(products);
    assert.equal(t.box.hidden,false);
    assert.equal(t.box.querySelector('h2').textContent,'Gestionale & Inventario');
    assert.equal(t.box.querySelector('.spotlight-main-action').getAttribute('href'),'#app/prod_443');
    assert.equal(t.box.querySelector('.spotlight-open-action').getAttribute('href'),'https://simplex-gestionale.pages.dev/');
    assert.match(t.box.querySelector('.spotlight-open-action').textContent,/Apri demo/);
    assert.equal(t.box.querySelector('.spotlight-screenshot').getAttribute('src'),'https://example.test/shot.png');
    assert.equal(t.box.querySelector('.spotlight-main-action').textContent.includes('Scopri il gestionale'),true);
  } finally {t.dom.window.close();}
});
test('il riquadro non pubblicizza app disattivate e scompare senza scheda',()=>{
  const t=fixture();
  try {
    t.w.renderGestionaleSpotlight([{id:'inventario',name:'Gestione e Inventario',visiblePublic:false}]);
    assert.equal(t.box.hidden,true);
    assert.equal(t.box.childNodes.length,0);
    t.w.renderGestionaleSpotlight([{id:'g',name:'Gestione e Inventario'}]);
    assert.equal(t.box.hidden,false);
    t.w.renderGestionaleSpotlight([{id:'vg',name:'Gestionale V&G'}]);
    assert.equal(t.box.hidden,true);
    assert.equal(t.box.childNodes.length,0);
  } finally {t.dom.window.close();}
});
test('screenshot assente mostra grafica decorativa, nessun link diretto inventato',()=>{
  const t=fixture();
  try {
    t.w.renderGestionaleSpotlight([{id:'gestionale-inventario',name:'Gestione Inventario',webUrl:'javascript:alert(1)'}]);
    assert.equal(t.box.hidden,false);
    assert.equal(t.box.querySelectorAll('.spotlight-preview').length,1);
    assert.equal(t.box.querySelectorAll('.spotlight-open-action').length,0);
    assert.equal(t.box.querySelector('.spotlight-main-action').getAttribute('href'),'#app/gestionale-inventario');
  } finally {t.dom.window.close();}
});
test('nome utente e icona non possono iniettare HTML',()=>{
  const t=fixture();
  try {
    t.w.renderGestionaleSpotlight([{id:'g1',name:'Gestionale & Inventario <img src=x onerror=alert(1)>',icon:'javascript:alert(1)'}]);
    assert.equal(t.box.querySelectorAll('h2 img').length,0);
    assert.equal(t.box.querySelector('h2').textContent,'Gestionale & Inventario <img src=x onerror=alert(1)>');
    assert.equal(t.box.querySelector('.spotlight-icon').getAttribute('src'),'https://simplexapp.it/assets/logo.png');
  } finally {t.dom.window.close();}
});
test('solo home pubblica, aggiornamento al render, inclusione nel cache offline',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(html,/id="gestionaleSpotlight"[^>]+hidden/);
  assert.ok(html.indexOf('id="gestionaleSpotlight"')<html.indexOf('id="catalogGrid"'));
  assert.ok(html.indexOf('id="gestionaleSpotlight"')<html.indexOf('id="detailView"'));
  assert.ok(html.indexOf('gestionale-spotlight.js?v=2')<html.indexOf('app.js?v=43'));
  assert.match(app,/renderGestionaleSpotlight\?\.\(a\)/);
  assert.match(sw,/gestionale-spotlight\.js\?v=1/);
  assert.match(sw,/gestionale-spotlight\.css\?v=1/);
  assert.match(sw,/app\.js\?v=43/);
});

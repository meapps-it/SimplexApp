import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

function setup(initial = 'https://example.test/precedente.png') {
  const dom = new JSDOM('<input id="pick" type="file" multiple><textarea id="urls"></textarea><div id="preview"></div><p id="count"></p>', {runScripts:'outside-only'});
  const w = dom.window, d = w.document, errors=[], revoked=[];
  d.getElementById('urls').value = initial;
  let next = 0;
  w.URL.createObjectURL = () => 'blob:screen-' + (++next);
  w.URL.revokeObjectURL = url => revoked.push(url);
  w.eval(readFileSync(new URL('../screenshots-editor.js', import.meta.url), 'utf8'));
  const input = d.getElementById('pick');
  const picker = w.createScreenshotPicker({
    input,links:d.getElementById('urls'),preview:d.getElementById('preview'),
    counter:d.getElementById('count'),onError:error=>errors.push(error.message)
  });
  function pick(files) {
    Object.defineProperty(input,'files',{configurable:true,value:files});
    input.dispatchEvent(new w.Event('change'));
  }
  function file(name, type='image/png') {
    return new w.File(['foto'], name, {type,lastModified:15});
  }
  return {dom,w,d,picker,pick,file,errors,revoked};
}
test('Android: più selezioni successive si sommano senza perdere screenshot',()=>{
  const t=setup();
  try{
    const a=t.file('uno.png'), b=t.file('due.jpg','image/jpeg'), c=t.file('tre.webp','image/webp');
    t.pick([a]);
    t.pick([b,c]);
    assert.deepEqual(t.picker.files(),[a,b,c]);
    assert.equal(t.d.querySelectorAll('.screen-editor-pending').length,3);
    assert.equal(t.d.querySelectorAll('.screen-editor-tile').length,4);
    assert.match(t.d.getElementById('count').textContent,/4 di 12 screenshot \(3 da caricare\)/);
    t.pick([a]);
    assert.equal(t.picker.files().length,3,'la stessa foto non va duplicata');
    assert.equal(t.errors.length,0);
    assert.equal(t.d.getElementById('urls').value,'https://example.test/precedente.png');
  }finally{t.dom.window.close();}
});
test('rimuovere una nuova foto non elimina gli screenshot già salvati',()=>{
  const t=setup();
  try{
    const a=t.file('uno.png'),b=t.file('due.png');
    t.pick([a,b]);
    t.d.querySelector('.screen-editor-pending button').click();
    assert.deepEqual(t.picker.files(),[b]);
    assert.equal(t.revoked.length,1);
    assert.equal(t.d.getElementById('urls').value,'https://example.test/precedente.png');
    t.d.querySelector('.screen-editor-tile:not(.screen-editor-pending) button').click();
    assert.equal(t.d.getElementById('urls').value,'');
    assert.equal(t.picker.files().length,1);
  }finally{t.dom.window.close();}
});
test('quota 12, dimensione e formato vengono verificati prima di aggiungere',()=>{
  const t=setup();
  try{
    t.pick(Array.from({length:12},(_,i)=>t.file('foto-'+i+'.png')));
    assert.equal(t.picker.files().length,0,'non superare 12 contando la foto già presente');
    assert.match(t.errors[0],/Massimo 12 screenshot/);
    t.pick([t.file('non-immagine.pdf','application/pdf')]);
    assert.match(t.errors.at(-1),/PNG, JPG o WebP/);
    const large=new t.w.File(['foto'], 'big.png', {type:'image/png'});
    Object.defineProperty(large,'size',{value:9*1024*1024});
    t.pick([large]);
    assert.match(t.errors.at(-1),/8 MB/);
    t.pick(Array.from({length:11},(_,i)=>t.file('foto-'+i+'.png')));
    assert.equal(t.picker.files().length,11);
    t.pick([t.file('foto-11.png')]);
    assert.equal(t.picker.files().length,11);
    t.picker.clear();
    assert.equal(t.revoked.length,11);
    assert.equal(t.picker.files().length,0);
    assert.equal(t.d.getElementById('urls').value,'https://example.test/precedente.png');
  }finally{t.dom.window.close();}
});
test('dopo ogni upload riuscito il file esce dalla coda e il link resta in scheda',()=>{
  const t=setup('');
  try{
    const a=t.file('foto.png'),b=t.file('foto2.png');t.pick([a,b]);
    const urls=t.d.getElementById('urls');
    urls.value='https://example.test/upload1.png';t.picker.remove(a);
    assert.deepEqual(t.picker.files(),[b]);
    assert.equal(t.d.querySelectorAll('.screen-editor-tile').length,2);
    t.picker.clear();
    assert.equal(urls.value,'https://example.test/upload1.png');
  }finally{t.dom.window.close();}
});
test('file statici e service worker caricano il gestore prima di app.js',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const worker=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(html,/screenshots-editor\.js\?v=1/);
  assert.ok(html.indexOf('screenshots-editor.js?v=1')<html.indexOf('app.js?v=42'));
  assert.match(html,/id="appScreensFile"[^>]+multiple/);
  assert.match(worker,/screenshots-editor\.js\?v=1/);
  assert.match(worker,/screenshots-editor\.css\?v=1/);
  assert.match(worker,/app\.js\?v=42/);
});

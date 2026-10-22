import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

test('descrizioni: anteprima locale sicura, senza alterare i campi', () => {
  const html = '<div id="appEditor" class="hidden"><div class="form-grid"><label>Breve<textarea id="appDesc"></textarea></label><label>Completa<textarea id="appFullDesc"></textarea></label></div></div><button id="addApp"></button><div id="adminList"></div>';
  const dom = new JSDOM(html, {runScripts:'outside-only'});
  try {
    dom.window.eval(readFileSync(new URL('../admin-editor-guide.js', import.meta.url), 'utf8'));
    const d = dom.window.document, brief = d.getElementById('appDesc'), full = d.getElementById('appFullDesc');
    assert.ok(d.getElementById('descriptionGuide'));
    brief.value = '<script>alert(1)</script>';
    full.value = 'Funzioni principali:\nGestione articoli.';
    brief.dispatchEvent(new dom.window.Event('input', {bubbles:true}));
    full.dispatchEvent(new dom.window.Event('input', {bubbles:true}));
    assert.equal(d.getElementById('shortPreview').textContent, brief.value);
    assert.equal(d.getElementById('shortPreview').querySelector('script'), null);
    assert.equal(d.getElementById('fullPreview').textContent, full.value);
    assert.match(d.getElementById('shortLength').textContent,/caratteri/);
    assert.equal(brief.value, '<script>alert(1)</script>');
  } finally {dom.window.close();}
});
test('descrizioni: gli asset vengono caricati e sono disponibili offline',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.match(html,/admin-editor-guide\.js\?v=1/);
  assert.match(html,/admin-editor-guide\.css\?v=1/);
  assert.match(sw,/admin-editor-guide\.js\?v=1/);
  assert.match(sw,/admin-editor-guide\.css\?v=1/);
});

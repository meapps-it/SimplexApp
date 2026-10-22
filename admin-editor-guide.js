/* Guida locale alla scrittura delle schede: non modifica dati e non invia nulla. */
(() => {
  'use strict';
  const short = document.getElementById('appDesc');
  const full = document.getElementById('appFullDesc');
  const editor = document.getElementById('appEditor');
  if (!short || !full || !editor) return;
  const label = full.closest('label');
  if (!label || !label.parentElement || document.getElementById('descriptionGuide')) return;

  const guide = document.createElement('section');
  guide.id = 'descriptionGuide';
  guide.className = 'description-guide';
  guide.setAttribute('aria-label', 'Aiuto per le descrizioni');
  guide.innerHTML = `<h3>✎ Descrizione dell'app, senza complicazioni</h3>
    <p class="note">Breve: spiega a chi serve e cosa risolve, in una frase. Completa: indica le funzioni principali e come si usa. I suggerimenti non vengono pubblicati.</p>
    <div class="description-guide-status"><span id="shortLength"></span><span id="fullLength"></span></div>
    <details><summary>Vedi un esempio di struttura</summary>
      <p class="note"><strong>Breve:</strong> Gestisci articoli e magazzino dal telefono, senza fogli sparsi.</p>
      <p class="note"><strong>Completa:</strong> A chi serve. Cosa puoi fare. Come inizi. Quali vantaggi offre. Scrivi solo caratteristiche realmente disponibili.</p>
    </details>
    <div class="description-preview"><strong>Anteprima del testo che stai scrivendo</strong>
      <p id="shortPreview" class="description-short-preview"></p>
      <p id="fullPreview" class="description-full-preview"></p>
    </div>`;
  label.insertAdjacentElement('afterend', guide);
  const byId = id => guide.querySelector('#' + id);
  const count = (value) => [...value].length;
  const refresh = () => {
    const brief = short.value.trim(), details = full.value.trim();
    const briefSize = count(brief), fullSize = count(details);
    byId('shortLength').textContent = 'Breve: ' + briefSize + ' caratteri' +
      (briefSize === 0 ? ' · da compilare' : briefSize > 160 ? ' · prova ad accorciare' : '');
    byId('fullLength').textContent = 'Completa: ' + fullSize + ' caratteri' +
      (fullSize === 0 ? ' · da compilare' : '');
    byId('shortPreview').textContent = brief || 'La frase breve apparirà qui.';
    byId('fullPreview').textContent = details || 'La descrizione completa apparirà qui.';
  };
  short.addEventListener('input', refresh);
  full.addEventListener('input', refresh);
  short.addEventListener('change', refresh);
  full.addEventListener('change', refresh);
  editor.addEventListener('focusin', refresh);
  new MutationObserver(refresh).observe(editor, {attributes: true, attributeFilter: ['class']});
  document.getElementById('addApp')?.addEventListener('click', () => setTimeout(refresh, 0));
  document.getElementById('adminList')?.addEventListener('click', () => setTimeout(refresh, 0));
  refresh();
})();

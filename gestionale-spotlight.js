/* Primo piano commerciale: usa esclusivamente una scheda pubblica esistente. */
(function () {
  'use strict';
  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/&/g, ' e ').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function matchesGestionale(app) {
    if (!app || app.visiblePublic === false) return false;
    const name = normalize(app.name), id = normalize(app.id);
    const words = name.split(' ');
    return (name === 'simplex manager' || ((words.includes('gestionale') || words.includes('gestione')) && words.includes('inventario'))
      || (id.includes('gestionale') && id.includes('inventario')));
  }
  function renderGestionaleSpotlight(apps = []) {
    const container = document.getElementById('gestionaleSpotlight');
    if (!container) return;
    const app = apps.find(matchesGestionale);
    if (!app) {
      container.replaceChildren();
      container.hidden = true;
      return;
    }
    const label = typeof esc === 'function' ? esc : value => String(value || '');
    const icon = typeof safeIcon === 'function' ? safeIcon(app.icon) : '';
    const web = typeof onlineURL === 'function' ? onlineURL(app.demoUrl) : '';
    const screenshot = Array.isArray(app.screenshots)
      ? app.screenshots.find(url => typeof url === 'string' && /^https:\/\//i.test(url)) : '';
    container.hidden = false;
    const link = '#app/' + encodeURIComponent(app.id);
    container.innerHTML = `<div class="gestionale-spotlight-copy">
        <p class="spotlight-eyebrow">IL GESTIONALE DI SIMPLEXAPP</p>
        <div class="spotlight-title-line">
          <img src="${label(icon)}" alt="" class="spotlight-icon" loading="lazy">
          <h2 id="gestionaleSpotlightTitle">${label(app.name)}</h2>
        </div>
        <p class="spotlight-lead">Tutto ciò che serve alla tua attività, senza complicazioni.</p>
        <p class="spotlight-description">Articoli, magazzino, clienti, ordini e servizi in un unico gestionale modulare. Attivi le funzioni adatte al tuo lavoro e aggiungi le altre quando servono.</p>
        <div class="spotlight-chips" aria-label="Funzioni del gestionale">
          <span>Articoli e magazzino</span><span>Clienti e ordini</span><span>Servizi e appuntamenti</span>
        </div>
        <div class="spotlight-actions">
          <a class="spotlight-main-action" href="${label(link)}">Scopri il gestionale <span aria-hidden="true">→</span></a>
          ${web ? `<a class="spotlight-open-action" href="${label(web)}" target="_blank" rel="noopener noreferrer">APRI DEMO <span aria-hidden="true">↗</span></a>` : ''}
        </div>
      </div>
      <div class="gestionale-spotlight-visual" aria-hidden="true">
        ${app.name === 'Simplex Manager' ? '<img class="spotlight-brand-logo" src="assets/simplex-manager-logo.png" alt="">' : ''}
        ${screenshot ? `<img class="spotlight-screenshot" src="${label(screenshot)}" alt="" loading="lazy">` :
          `<div class="spotlight-preview"><div class="spotlight-preview-bar"><span></span><span></span><span></span></div><div class="spotlight-preview-body"><div class="spotlight-preview-side"></div><div class="spotlight-preview-data"><div></div><div></div><div></div><div></div></div></div></div>`}
      </div>`;
  }
  window.renderGestionaleSpotlight = renderGestionaleSpotlight;
  window.matchesGestionaleSpotlight = matchesGestionale;
})();

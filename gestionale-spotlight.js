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
    return name === 'turni operai italia' || id === 'toi';
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
        <p class="spotlight-eyebrow">IN EVIDENZA SU SIMPLEXAPP</p>
        <div class="spotlight-title-line">
          <img src="${label(icon)}" alt="" class="spotlight-icon" loading="lazy">
          <h2 id="gestionaleSpotlightTitle">${label(app.name)}</h2>
        </div>
        <p class="spotlight-lead">I tuoi turni di lavoro, sempre a portata di mano.</p>
        <p class="spotlight-description">Organizza i turni, consulta il calendario di lavoro e tieni sotto controllo riposi, ferie e permessi in modo semplice.</p>
        <div class="spotlight-chips" aria-label="Funzioni di Turni Operai Italia">
          <span>Turni di lavoro</span><span>Calendario</span><span>Ferie e riposi</span>
        </div>
        <div class="spotlight-actions">
          <a class="spotlight-main-action" href="${label(link)}">Scopri l’app <span aria-hidden="true">→</span></a>
          ${web ? `<a class="spotlight-open-action" href="${label(web)}" target="_blank" rel="noopener noreferrer">APRI DEMO <span aria-hidden="true">↗</span></a>` : ''}
        </div>
      </div>
      <div class="gestionale-spotlight-visual" aria-hidden="true">
        
        ${screenshot ? `<img class="spotlight-screenshot" src="${label(screenshot)}" alt="" loading="lazy">` :
          `<div class="spotlight-preview"><div class="spotlight-preview-bar"><span></span><span></span><span></span></div><div class="spotlight-preview-body"><div class="spotlight-preview-side"></div><div class="spotlight-preview-data"><div></div><div></div><div></div><div></div></div></div></div>`}
      </div>`;
  }
  window.renderGestionaleSpotlight = renderGestionaleSpotlight;
  window.matchesGestionaleSpotlight = matchesGestionale;
})();

'use strict';
(() => {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('contactStatus');
  const fieldset = document.getElementById('contactFields');
  const button = document.getElementById('contactSend');
  const endpoint = CLOUD.url + '/functions/v1/simplex-contact';
  let token = '', widget, sending = false;
  async function setup() {
    try {
      const r = await fetch(endpoint, {headers: {apikey: CLOUD.key}, signal: AbortSignal.timeout(10000), cache: 'no-store'});
      const data = await r.json();
      if (!r.ok || !data.ready || !data.sitekey) throw Error();
      window.simplexContactCaptchaReady = () => {
        widget = window.turnstile.render('#contactCaptcha', {sitekey: data.sitekey, action: 'simplex-contact', callback: value => {token = value; button.disabled = sending || !token;}, 'expired-callback': () => {token = ''; button.disabled = true;}, 'error-callback': () => {token = ''; button.disabled = true; status.textContent = 'Verifica antispam non riuscita. Ricarica la pagina per riprovare.';}});
        fieldset.disabled = false;
        status.textContent = '';
      };
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=simplexContactCaptchaReady&render=explicit';
      script.async = true;
      script.onerror = () => {status.textContent = 'Verifica antispam non disponibile. Ricarica la pagina per riprovare.';};
      document.head.appendChild(script);
    } catch {status.textContent = 'Il modulo contatti non è disponibile in questo momento. Riprova più tardi.';}
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending || !token || !form.reportValidity()) return;
    sending = true; button.disabled = true; status.textContent = 'Invio in corso…';
    const data = new FormData(form);
    try {
      const r = await fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json', apikey: CLOUD.key}, body: JSON.stringify({email: data.get('email'), topic: data.get('topic'), message: data.get('message'), website: data.get('website'), acknowledged: data.get('acknowledged') === 'on', token}), signal: AbortSignal.timeout(30000)});
      const result = await r.json();
      if (!r.ok || result.sent !== true) throw Error(result.error || 'Invio non confermato. Riprova.');
      form.reset(); status.textContent = 'Messaggio inviato. Maurizio potrà risponderti all’email indicata.';
    } catch (err) {status.textContent = err.name === 'AbortError' || err.name === 'TimeoutError' ? 'Invio non confermato. Il testo è conservato: riprova più tardi.' : err.message || 'Invio non confermato. Il testo è conservato: riprova più tardi.';}
    finally {sending = false; token = ''; button.disabled = true; window.turnstile.reset(widget);}
  });
  // Load the external challenge only when the visitor opens the contact section.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {if (entries.some(e => e.isIntersecting)) {observer.disconnect(); setup();}});
    observer.observe(form);
  } else setup();
})();

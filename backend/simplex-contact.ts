// Public contact endpoint. Recipient and credentials stay in server secrets.
const origin = 'https://meapps-it.github.io';
const cors = {'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, apikey', 'Vary': 'Origin'};
const topics = ['Problema', 'Suggerimento', 'Altro', 'Personalizzazione'];
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
}
function config() {
  return {key: Deno.env.get('SIMPLEX_CONTACT_RESEND_KEY'), from: Deno.env.get('SIMPLEX_CONTACT_FROM'), to: Deno.env.get('SIMPLEX_CONTACT_TO'), secret: Deno.env.get('SIMPLEX_CONTACT_TURNSTILE_SECRET'), sitekey: Deno.env.get('SIMPLEX_CONTACT_TURNSTILE_SITEKEY')};
}
Deno.serve(async (req: Request) => {
  if (req.headers.get('Origin') && req.headers.get('Origin') !== origin) return response({error: 'Origine non consentita'}, 403);
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
  const c = config(), ready = !!(c.key && c.from && c.to && c.secret && c.sitekey);
  if (req.method === 'GET') return response({ready, ...(ready ? {sitekey: c.sitekey} : {})});
  if (req.method !== 'POST') return response({error: 'Metodo non consentito'}, 405);
  if (!ready) return response({error: 'Il modulo contatti non è ancora disponibile. Riprova più tardi.'}, 503);
  if (!req.headers.get('Content-Type')?.startsWith('application/json')) return response({error: 'Richiesta non valida'}, 415);
  try {
    // Read a bounded body even when the sender omits Content-Length.
    const reader = req.body?.getReader();
    if (!reader) return response({error: 'Messaggio mancante'}, 400);
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 24000) {await reader.cancel(); return response({error: 'Messaggio troppo lungo'}, 413);} chunks.push(chunk.value); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length;}
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return response({error: 'Richiesta non valida'}, 400);
    const email = typeof data.email === 'string' ? data.email.trim() : '';
    const product = typeof data.product === 'string' ? data.product.trim() : '';
    if (product.length > 160 || /[\r\n]/.test(product)) return response({error: 'Nome app o soluzione non valido'}, 400);
    const message = typeof data.message === 'string' ? data.message.trim() : '';
    if (data.website || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !topics.includes(data.topic) || message.length < 10 || message.length > 5000 || data.acknowledged !== true || typeof data.token !== 'string' || !data.token || data.token.length > 2048) return response({error: 'Controlla email, argomento, messaggio e verifica antispam.'}, 400);
    const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({secret: c.secret, response: data.token}), signal: AbortSignal.timeout(10000)});
    if (!check.ok) return response({error: 'Verifica antispam non disponibile. Riprova.'}, 503);
    const verified = await check.json();
    if (!verified.success || verified.hostname !== 'meapps-it.github.io' || verified.action !== 'simplex-contact') return response({error: 'Ripeti la verifica antispam.'}, 400);
    const sent = await fetch('https://api.resend.com/emails', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + c.key}, body: JSON.stringify({from: c.from, to: [c.to], reply_to: email, subject: 'SimplexApp · ' + data.topic, text: 'Mittente: ' + email + '\nArgomento: ' + data.topic + (product ? '\nApp o soluzione: ' + product : '') + '\n\n' + message}), signal: AbortSignal.timeout(15000)});
    const result = await sent.json().catch(() => ({}));
    if (!sent.ok || !result.id) return response({error: 'Invio non confermato. Il testo è conservato: riprova più tardi.'}, 502);
    return response({sent: true});
  } catch {return response({error: 'Invio non confermato. Il testo è conservato: riprova più tardi.'}, 502);}
});

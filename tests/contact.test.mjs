import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../backend/simplex-contact.ts',import.meta.url),'utf8'));
function setup(overrides={}) {
  let handler; const calls=[];
  const env={SIMPLEX_CONTACT_RESEND_KEY:'test-secret',SIMPLEX_CONTACT_FROM:'sender@example.com',SIMPLEX_CONTACT_TO:'private@example.com',SIMPLEX_CONTACT_TURNSTILE_SECRET:'captcha-secret',SIMPLEX_CONTACT_TURNSTILE_SITEKEY:'public-sitekey',...overrides};
  let captcha={success:true,hostname:'meapps-it.github.io',action:'simplex-contact'}, mailStatus=200;
  const context=vm.createContext({Request,Response,AbortSignal,TextDecoder,Uint8Array,Deno:{env:{get:k=>env[k]},serve:f=>handler=f},fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return url.includes('siteverify')?Response.json(captcha):Response.json(mailStatus===200?{id:'accepted'}:{error:'failure'},{status:mailStatus});}});
  vm.runInContext(source,context);
  return {handler,calls,setCaptcha:v=>captcha=v,setMailStatus:v=>mailStatus=v};
}
const body={email:'visitor@example.com',topic:'Problema',message:'Descrizione del problema',token:'valid-test-token',acknowledged:true,website:''};
const request=(payload=body,origin='https://meapps-it.github.io')=>new Request('https://example.com/contact',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(payload)});
test('unconfigured endpoint is unavailable and never exposes recipient/secrets',async()=>{const s=setup({SIMPLEX_CONTACT_RESEND_KEY:undefined});const r=await s.handler(new Request('https://example.com/contact'));assert.deepEqual(await r.json(),{ready:false});assert.equal((await s.handler(request())).status,503);assert.equal(s.calls.length,0);const ready=await setup().handler(new Request('https://example.com/contact'));assert.deepEqual(await ready.json(),{ready:true,sitekey:'public-sitekey'});});
test('valid message goes only to server recipient with visitor reply-to',async()=>{const s=setup();const r=await s.handler(request({...body,to:'attacker@example.com'}));assert.deepEqual(await r.json(),{sent:true});assert.equal(s.calls.length,2);assert.deepEqual(s.calls[1].body.to,['private@example.com']);assert.equal(s.calls[1].body.reply_to,body.email);assert.equal(s.calls[1].body.subject,'SimplexApp · Problema');});
test('foreign origins, malformed fields, injection, honeypot and oversized bodies cannot send',async()=>{const s=setup();assert.equal((await s.handler(request(body,'https://evil.example'))).status,403);for(const invalid of [{email:'a@example.com\r\nBcc: evil@example.com'},{website:'spam'},{topic:'Problema\r\nInjected'},{acknowledged:false},{message:'short'},{message:'a'.repeat(5001)},{token:''}])assert.equal((await s.handler(request({...body,...invalid}))).status,400);assert.equal((await s.handler(request({...body,message:'a'.repeat(25000)}))).status,413);assert.equal(s.calls.length,0);});
test('captcha rejection, wrong hostname/action and provider failure never report success',async()=>{for(const result of [{success:false},{success:true,hostname:'evil.example',action:'simplex-contact'},{success:true,hostname:'meapps-it.github.io',action:'other'}]){const s=setup();s.setCaptcha(result);assert.equal((await s.handler(request())).status,400);assert.equal(s.calls.length,1);}const s=setup();s.setMailStatus(429);const r=await s.handler(request());assert.equal(r.status,502);assert.equal((await r.json()).sent,undefined);});

test('personalization includes the product in the email and rejects multiline/oversized product',async()=>{const s=setup();const r=await s.handler(request({...body,topic:'Personalizzazione',product:'Gestionale'}));assert.equal(r.status,200);assert.ok(s.calls[1].body.text.includes('App o soluzione: Gestionale'));assert.equal(s.calls[1].body.subject,'SimplexApp · Personalizzazione');for(const product of ['a'.repeat(161),'App\nInjected']){const reject=setup();assert.equal((await reject.handler(request({...body,product}))).status,400);assert.equal(reject.calls.length,0);}});

'use strict';
// Presentation-only preview behavior; this file is excluded from the real site.
const banner=document.createElement('div');banner.className='preview-banner';banner.textContent='ANTEPRIMA RISERVATA · Dati dimostrativi · Nessun invio o pagamento reale';document.body.prepend(banner);
const contact=document.getElementById('contatti');
document.addEventListener('click',e=>{
 if(e.target.closest('a[href="#contatti"]'))contact.open=true;
 const external=e.target.closest('a[href^="http"]');
 if(external){e.preventDefault();toast('Link originale conservato. Apertura esterna disattivata nell’anteprima.');}
},true);
addEventListener('hashchange',()=>{if(location.hash==='#contatti')contact.open=true});
if(location.hash==='#contatti')contact.open=true;
document.getElementById('contactFields').disabled=false;
document.getElementById('contactSend').disabled=false;
document.getElementById('contactStatus').textContent='Modalità dimostrativa: puoi compilare il modulo, il messaggio non sarà inviato.';
document.querySelector('.contact-note').textContent='Anteprima: inserisci soltanto dati di fantasia. Il modulo non invia email e non contatta servizi esterni.';
document.getElementById('contactForm').addEventListener('submit',e=>{e.preventDefault();document.getElementById('contactStatus').textContent='Prova completata: nessun messaggio è stato inviato.'});
document.getElementById('adminEmail').disabled=true;document.getElementById('adminPassword').disabled=true;
const note=document.createElement('p');note.className='note';note.textContent='Area dimostrativa in sola lettura. Statistiche illustrative a zero, nessun cliente reale. I comandi di salvataggio sono bloccati.';document.querySelector('.admin-head').after(note);

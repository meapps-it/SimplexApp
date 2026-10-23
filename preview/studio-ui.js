(() => {
 'use strict';
 const entry=document.createElement('a');entry.className='preview-admin-entry';entry.href='#admin';entry.innerHTML='<span class="preview-rich-icon">'+window.adminStudio.icon('settings')+'</span><span><strong>Prova il nuovo pannello</strong><small>App in due colonne · editor guidato · moduli</small></span><span aria-hidden="true">→</span>';
 document.querySelector('#homeView .top').after(entry);
 const text=document.querySelector('#adminView .admin-head>div>div');if(text)text.textContent='Schede app e moduli · anteprima privata';
 // No real registration, email, licence or payment operations in this preview.
 for(const id of ['logoutAdmin','issuePersonalLicense','saveClient','importData','connectGithub','disconnectGithub']){const button=document.getElementById(id);if(button){button.disabled=true;button.title='Operazione reale disattivata nell’anteprima';}}
 const intro=document.querySelector('.studio-editor-intro p');if(intro)intro.textContent='Una sezione alla volta. Qui i salvataggi restano nella demo fino al ricaricamento.';
 const footer=document.querySelector('#adminSettingsPanel>.admin-card.note');if(footer)footer.textContent='Anteprima privata: nessuna modifica viene inviata al catalogo ufficiale o ai clienti.';
})();

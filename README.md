# SimplexApp

PWA del catalogo, HTML/CSS/JS senza framework. Sito: https://meapps-it.github.io/SimplexApp/

## Uso dell’Admin

1. Apri Admin e accedi con l’account Supabase autorizzato.
2. Solo al primo utilizzo, apri **Connessione APK · configurazione iniziale**.
3. Crea un token GitHub fine-grained dell’account meapps-it: repository **SimplexApp**, permesso **Contents: Read and write**, scadenza a tua scelta. Incollalo nel campo e premi **Collega GitHub**. Non inviarlo in chat.
4. Modifica una scheda, inserisci la versione, scegli l’APK e l’icona dal telefono e premi **Pubblica app**.
5. Il file APK viene pubblicato in GitHub Releases. La scheda è salvata nel catalogo condiviso su Supabase. Non serve copiare il link.

Mantieni la PWA aperta durante il caricamento. L’indicatore mostra l’invio al server; al 100% occorre ancora attendere la conferma di GitHub. La pubblicazione del catalogo avviene soltanto dopo il successo del caricamento. Se la scheda non si salva, il link già caricato rimane nel modulo per riprovare senza duplicare l’APK.

GitHub impone file inferiori a 2 GiB; il caricamento attraverso la funzione Supabase ha anche un limite di durata dell’esecuzione (150 secondi nel piano gratuito; il trasferimento a GitHub viene interrotto dopo 120 secondi per gestire l’errore). Una connessione lenta o APK molto grandi possono superarlo. Non è un caricamento riprendibile: in caso di interruzione si riprova. Caricamento e download della APK SpesaScan verificati sul servizio reale.

Eliminare una scheda non elimina gli APK già pubblicati. Esporta/Importa JSON conserva o ripristina il catalogo; l’importazione sostituisce il catalogo pubblico con conferma. Preferiti personali nel browser; copia dell’ultimo catalogo disponibile offline. Il sito aggiorna il catalogo all’apertura, al ritorno in primo piano e ogni minuto mentre si consulta la home.

## Architettura e accesso

- Catalogo pubblico in `simplex_apps` e `simplex_site`, lettura anonima via REST.
- Mutazioni soltanto tramite Edge Function `simplex-admin`: verifica del token con Auth e controllo dell’utente in `simplex_admins` su ogni richiesta.
- `simplex_private_settings` custodisce il token GitHub. Nessun permesso a `anon` o `authenticated`, RLS attiva senza policy permissive; accesso esclusivamente service_role sul server. Il token non viene restituito al client né incluso nei file pubblici.
- Icone nel bucket pubblico `simplex-icons`; scrittura soltanto tramite funzione autorizzata.
- Sessione Admin persistente sul dispositivo in localStorage, password mai salvata dall’app; nessuna chiave service_role nel frontend.
- La verifica JWT del gateway Edge è disabilitata perché la funzione implementa la verifica Auth esplicita e l’autorizzazione per account, anche con le chiavi publishable moderne.
- Progetto Supabase generale esistente, tabelle SimplexApp separate dalle altre app.

`backend/setup.sql` documenta lo schema iniziale, già applicato. Non rieseguirlo sul progetto attivo. La funzione è in `backend/simplex-admin.ts`, già distribuita. GitHub Pages pubblica `main` / `(root)`. Manifest e service worker mantengono percorsi relativi.

## Verifica

`node tests/backend.test.mjs` (Node 24): auth, autorizzazione, CORS, isolamento del segreto, validazione del catalogo/APK, upload streaming e pulizia della release fallita con servizi simulati. Verificati sul servizio reale: lettura pubblica catalogo, rifiuto lettura privata, rifiuto scrittura anonima e rifiuto accesso non autenticato alla funzione. L’utente ha già collegato GitHub e pubblicato APK reali. La verifica automatica del rinnovo della sessione usa token fittizi e non richiede credenziali private.

### Pagine app e screenshot
Tocca una scheda in Home, Catalogo o Novità per aprire la pagina dell’app. Il cuore continua a gestire i preferiti. Download e Google Play sono nella pagina dettagli. Le pagine sono condivisibili tramite `#app/ID` e supportano il tasto Indietro.

L’accesso Admin si trova nel footer, al termine della pagina, e non è più nella barra fissa o nell’avatar. Nell’Admin trovi Descrizione completa e Screenshot dell’app: fino a 12 immagini PNG/JPEG/WebP (8 MB per immagine), ottimizzate a 1600 pixel e salvate nel bucket immagini. Puoi anche gestire i link, uno per riga, per rimuovere o riordinare screenshot. Pubblica app salva questi dati per tutti. Le schede esistenti conservano i loro dati; gli screenshot devono essere aggiunti dall’Admin.

La pagina `tests/responsive.html` permette di controllare l’app in un riquadro a 360, 393, 412 o 430 pixel senza cambiare i dati pubblicati.

### Blu Premium e condivisione
La grafica Blu Premium integra nome e mascotte in una copertina compatta, con tre app in evidenza (se il catalogo ne contiene almeno tre), categorie e catalogo responsive. In **Accesso Admin → Grafica** puoi pubblicare uno stile o premere **Torna alla Classica**. Il tema è salvato nell’identità del sito, senza cambiare app o APK. `style.css` conserva lo stile Classica; `premium.css` contiene le personalizzazioni.

Ogni scheda e pagina dettagli ha **Condividi**: su dispositivi compatibili apre il menu nativo con le destinazioni installate. In alternativa mostra il link da copiare e incollare nei social. Instagram decide quali contenuti può ricevere: il link può essere usato nella bio o nei messaggi. Nessun post viene pubblicato automaticamente. I link puntano alla pagina `#app/ID`; il sito statico offre metadati social generici, senza anteprime separate per app.

L’accesso Admin rimane disponibile dopo la chiusura della PWA nello stesso browser, con rinnovo del token. **Esci dall’Admin** elimina la sessione dal dispositivo. Un errore temporaneo di rete non cancella l’accesso; una sessione revocata richiede un nuovo login. Browser e PWA con archivi separati possono richiedere un accesso ciascuno.

Per aprire in locale: `npm run dev`, quindi http://localhost:4173. Per installare sul telefono usa il sito HTTPS pubblicato e il menu del browser **Installa app / Aggiungi a schermata Home**. Nessun framework o dipendenza di produzione. `npm test` verifica backend, temi, sessioni e condivisione.

Le app in evidenza sono affiancate in orizzontale: tre colonne su desktop, fila scorrevole con aggancio delle card sul telefono. Lo scorrimento è confinato alla sezione e non alla pagina.

Il tasto Indietro del browser/Android usa la cronologia delle schermate: torna da dettagli, Admin, Preferiti o Catalogo allo stato precedente, conservando ricerca, categoria e posizione. Alla Home una voce di protezione nella cronologia evita l’uscita involontaria e mostra “Sei già nella Home”. La verifica sul dispositivo Android fisico resta consigliata perché la gestione del tasto appartiene anche al browser/OS.

## Admin v9
- Apri Accesso Admin in fondo al sito. Dopo il primo accesso la sessione resta su questo browser; viene rinnovata all'apertura, al ritorno online e mentre la PWA è visibile. Non viene salvata la password.
- Le mie app: cerca la scheda, premi Modifica, cambia i dati e premi Salva modifiche. Nuova app apre una scheda vuota. Annulla torna all'elenco.
- Il modulo è diviso in informazioni, immagini, download e novità. Non scegliere un nuovo APK se vuoi conservare quello attuale.
- Impostazioni contiene account/GitHub, grafica, identità sito e backup. Il pulsante Sito torna al catalogo; Disconnetti account termina esplicitamente l'accesso.
- Browser differenti, navigazione privata o cancellazione dei dati richiedono un nuovo accesso. Sessioni revocate richiedono nuove credenziali.

### Immagini promozionali

La scheda app mostra le immagini promozionali separate dagli screenshot, con download e condivisione del file quando supportata dal browser. Nell’Admin puoi caricare fino a 6 immagini (8 MB ciascuna) oppure usare URL HTTPS. L’elenco `promoImages` è preservato da salvataggio, esportazione e importazione. Un elenco vuoto rimuove anche il materiale iniziale. Turni Operai Italia e NoiDue usano le immagini originali in `assets/promotional`. Nessun post viene pubblicato automaticamente.

Verifica: `node --test tests/*.test.mjs`.

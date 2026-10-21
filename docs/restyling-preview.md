# SimplexApp — restyling professionale, anteprima isolata

Base: `main` al commit `bbf07c9b7da1fccedbf257e72222f0e87faf6d46`.
Branch: `preview/restyling-professionale`. Nessun merge o rilascio sul sito ufficiale.

## Interventi

- Logo e illustrazione originali; copertina blu, call to action gialla e testi brevi.
- Navigazione desktop, catalogo con categorie visibili, schede più leggibili e pulsanti coerenti.
- Sezione aziende più evidente, contatti e footer riorganizzati.
- Stile coerente per dettagli, gallerie e amministrazione; contrasto, focus da tastiera e rispetto della preferenza di movimento ridotto.
- Foglio CSS aggiuntivo e piccolo script per gli ancoraggi; logica amministrativa preservata. Cache aggiornata per includere gli asset nuovi e la versione corrente dello script.

## Isolamento dell'anteprima

`npm run preview:build` produce `preview-dist/` partendo dai file esistenti. Solo questa copia viene distribuita sul sito di anteprima privato.

- Adapter locale al posto di cloud.js, senza endpoint Supabase o credenziali.
- Catalogo dimostrativo originale del repository, non un'esportazione del database.
- Nessuna autenticazione reale. Pannello dimostrativo in sola lettura, clienti vuoti e statistiche a zero chiaramente segnalate.
- Tutte le operazioni di scrittura e gli upload rifiutati nell'adapter.
- Contatti simulati, statistiche visite e service worker esclusi.
- CSP: connessioni solo alla stessa origine; form e worker disabilitati. Link esterni bloccati nell'anteprima.
- Configurazioni DNS, dominio, hosting di produzione e backend non modificate. Gli URL del codice originale sono conservati.

## Verifiche

- `git diff --check` e controlli sintattici JavaScript: superati.
- `npm test`: **28 superati, 1 fallito** (29 totali).
- Il test fallito `catalog opens safe web apps directly and preserves app details and APK-only discovery` fallisce anche sul commit iniziale di main: si aspetta apertura esterna dove il codice attuale mostra Dettagli. La logica corrente non è stata cambiata per far passare un test non coerente con essa.
- La baseline presentava anche un errore di cache app.js v39/v40; corretto aggiornando la cache agli asset del branch.
- Tre verifiche aggiunte: adapter locale e rifiuto scritture, isolamento del pacchetto, conservazione dei comandi PWA/APK e amministrativi.
- Browser: ricerca SpesaScan, preferiti, apertura dettagli, collegamenti aziende/contatti, compilazione e invio simulato del modulo, apertura amministrazione e rifiuto di Salva modifiche.
- Responsive: 320, 360, 393, 768, 1024 px, senza overflow orizzontale; controllo visivo desktop a 1363 px.

## Limiti

- Il catalogo nel repository è dimostrativo e meno aggiornato di quello del sito pubblico. Non sono stati esportati dati dal backend. La lettura diretta del catalogo live con chiave Supabase è stata bloccata dal controllo automatico; non è stato tentato un aggiramento.
- Questi dati non contengono APK/PWA o screenshot delle app. Le gallerie mostrano lo stato vuoto; il CSS per le immagini è predisposto ma non è stato verificato nel browser con screenshot reali. I comandi PWA e APK rimangono separati nel codice originale.
- Nessuna verifica reale di pagamenti, autenticazione, invii email, installazione PWA o operazioni clienti è stata eseguita: l'anteprima le isola intenzionalmente.
- Prima di un eventuale rilascio servirà l'approvazione esplicita dell'utente e una verifica dei contenuti correnti. Questa PR non autorizza il merge.

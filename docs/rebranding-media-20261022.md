# Simplex Manager e foto della scheda — 22 ottobre 2026

Scheda esistente conservata: `app_1791209955436`. Riquadro blu conservato; nuovo logo illustrato nella Home e nel dettaglio, link APRI DEMO distinto dall'accesso completo. Icona e screenshot aggiornati senza duplicare il prodotto.

## Foto della scheda
La gestione precedente non mostrava anteprime né comandi per eliminare o sostituire le foto caricate. Ogni nuova selezione Android sostituiva la FileList precedente; le nuove foto venivano aggiunte alle vecchie, con possibile superamento del limite sei.

Il picker già usato per gli screenshot viene ora riutilizzato con limite sei: anteprime di foto salvate e nuove, Rimuovi su ciascuna, selezioni successive cumulative, Sostituisci tutte le foto. La sostituzione è applicata soltanto dopo una selezione valida; annullare il selettore o fornire file non validi conserva il contenuto corrente. Le modifiche sono pubblicate soltanto con Salva modifiche.

Gli upload riusciti aggiornano subito i link nel form ed escono dalla coda. Un errore al file successivo lascia solo quel file da riprovare, senza ricaricare o duplicare i precedenti. Nessuna modifica ad autenticazione, endpoint di upload o storage. Nessuna eliminazione di file remoti.

Tolto il titolo visibile della galleria pubblica, sia il termine «pubblicitarie» nell'editor. La galleria mantiene una descrizione accessibile ai lettori di schermo. Le immagini promozionali già scelte dall'utente vengono conservate.

## Verifiche
- 46 test superati, 0 falliti.
- Regressioni per sostituzione atomica, annullamento, limite sei e ripresa di un upload parziale senza duplicati.
- Browser 393 px: due selezioni consecutive conservate, rimozione foto salvata, sostituzione completa, conversione reale in PNG, payload di salvataggio e persistenza dopo reload.
- Upload e salvataggio Admin verificati su server locale con risposte simulate; nessuna modifica a un account o a immagini reali durante il test.
- Controllati anche Home pubblica, scheda Simplex Manager, logo, link demo e assenza del titolo sopra la galleria.

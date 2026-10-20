# Apertura e installazione delle app — 20 ottobre 2026

Le schede delle app con un URL web pubblico ora hanno un collegamento Apri diretto in una nuova scheda del browser. Il collegamento Dettagli conserva descrizione, screenshot e download già disponibili. Nelle schede dettagli il collegamento web è etichettato Apri, non Installa app. Le app disponibili solo come APK/Play mantengono il percorso esistente.

L'installazione avviene dalla pagina di ogni app. Il pulsante richiama la richiesta nativa quando il browser la mette a disposizione; altrimenti spiega come usare il menu del browser o Condividi su iPhone/iPad. Non compare più un vicolo cieco con il solo messaggio installazione non disponibile.

Correzioni tecniche: prompt richiamato direttamente dal clic prima di attese asincrone; vecchio indicatore locale di installazione non più considerato prova permanente; un'altra app installata sullo stesso dominio non nasconde il pulsante dell'app corrente. Versione condivisa install-pwa.js v4 aggiornata su SimplexApp, Scadenze, Solleciti e Video Studio; cache dei rispettivi service worker aggiornate. Dati locali degli utenti non cancellati.

Verifiche: 25 test superati con Node 24/JSDOM, inclusi 6 nuovi test di installazione, istruzioni manuali, annullamento, installazioni separate, link sicuri e asset aggiornati. Tre fixture backend avevano ancora l'Origin del vecchio dominio GitHub: aggiornate a https://simplexapp.it senza modificare i controlli di sicurezza del backend.

Limiti: il sito non può forzare un browser o il sistema operativo a mostrare una finestra nativa di installazione. L'apertura esterna può dipendere dalle associazioni dei link del dispositivo. Installazione effettiva su Android fisico, Samsung Internet e iOS non collaudata in questa sessione.

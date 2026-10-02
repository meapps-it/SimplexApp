# SimplexApp

PWA mobile del catalogo delle app, realizzata in HTML, CSS e JavaScript senza dipendenze.

## Pubblicazione su GitHub Pages

In Settings → Pages, selezionare Deploy from a branch, branch main e cartella /(root).
Il file .nojekyll permette di pubblicare direttamente i file statici.

Manifest e service worker usano percorsi relativi, compatibili con il percorso del repository.

## Dati e Admin

Le schede iniziali sono in data/apps.json e l'identità del sito in data/site.json.
Admin modifica i dati solo nel browser locale. Le modifiche compaiono subito nella home,
ma non vengono salvate automaticamente nel repository né condivise tra dispositivi.
Usare Esporta JSON per conservare un backup. Per aggiornare il catalogo per i visitatori,
aggiornare i file JSON nel repository.

Non ci sono credenziali né un backend amministrativo.

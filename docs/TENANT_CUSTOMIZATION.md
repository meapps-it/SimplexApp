# Configurazione installazioni, protocollo v2

Il pannello estende `simplex_clients` e `simplex_product_modules`: gli ID cliente,
le licenze precedenti, i moduli e gli endpoint restano quelli esistenti.
Una riga cliente rappresenta un'installazione di un prodotto. Per assegnare una
seconda PWA alla stessa attività si crea una seconda installazione; non si sposta
un'installazione già collegata a un altro backend.

## Dichiarazione di una PWA

Il manager registrato in `management_url` implementa `action: capabilities` e
restituisce `modules` e `capabilities`. I moduli usano `key`, `label`, `ready`,
`default_enabled`, `requires` (dipendenze obbligatorie) e `feature_requires`
(funzioni limitate senza disabilitare l'intera sezione).

`capabilities` contiene `version: 2`, `fields`, `menu_layouts`, `themes`,
`defaults`. I campi accettati sono dichiarati da `tenant-config.js`; CSS, HTML,
layout liberi e chiavi non dichiarate sono rifiutati dal server.
Il pulsante **Aggiorna opzioni dalla PWA** importa la dichiarazione dal manager
già registrato. I prodotti v1 mantengono la gestione precedente e non mostrano
controlli grafici che non possono applicare.

## Configurazione e sincronizzazione

`action: configure` riceve `externalId` (ID centrale stabile), `customerId`
(collegamento remoto da verificare), `name`, `email`, `plan`, `status`,
`expiresAt`, `branding`, `modules`. Il manager autorizza l'amministratore
Simplex sul server, normalizza le opzioni e applica i dati in una transazione.
La risposta include `saved: true`, `customerId` e i moduli normalizzati.
Nessuna configurazione crea automaticamente utenti o attiva una licenza senza
il flusso di attivazione già previsto.

Simplex conserva `sync_state`: `legacy`, `pending`, `synced`, `error`.
Un errore remoto conserva il salvataggio centrale e mostra un avviso; aprire
e salvare nuovamente l'installazione ritenta la sincronizzazione. Il modulo
Moduli aggiorna anche la configurazione centrale quando modifica un cliente
remoto collegato, evitando che il successivo salvataggio del branding
ripristini permessi precedenti.

## Sicurezza e compatibilità

Le tabelle centrali sono accessibili solo al backend con service role.
Le PWA leggono la propria configurazione attraverso i propri controlli Auth/RLS.
Nel Gestionale restano `sg_members`, `sg_customers`, `sg_licenses`, `sg_modules`
e i controlli server su record, ruoli, scadenza e dipendenze.
Un parametro `workspace` suggerisce l'azienda solo se è presente nelle
membership autenticate; non concede alcun accesso.
Disattivare un modulo non cancella dati. Un branding `{}` ripristina i valori
originali, anche se esiste un precedente logo configurato dal cliente.

I loghi e le icone vengono convertiti in PNG e caricati dal solo amministratore
nel bucket immagini esistente, con nomi casuali. Sono asset pubblici; le
configurazioni, le licenze e i dati aziendali restano privati.
L'icona viene normalizzata a 512×512. Manifest, favicon e touch icon vengono
aggiornati dopo il riconoscimento dell'azienda. Il manifest personale è generato
localmente da dati autorizzati, senza pubblicare configurazioni clienti.
Installazione e aggiornamento automatico di un collegamento già installato
dipendono dal browser e richiedono verifica su dispositivo reale.

## Verifica e rilascio

Applicare `backend/tenant-customization.sql` sul backend Simplex e il file
omonimo del Gestionale sul suo database. Pubblicare i manager aggiornati con
tutte le dipendenze, poi registrare/importare le capabilities dichiarate dalla
PWA. Le pubblicazioni frontend usano i repository e gli hosting esistenti.

I test coprono autorizzazione Admin, validazione, preview, separazione
configurazioni, dipendenze, fallback, sincronizzazione fallita, transazione
database, RLS, route disattivate, manifest e compatibilità demo.

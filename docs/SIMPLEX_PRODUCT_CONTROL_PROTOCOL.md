# Simplex Product Control Protocol v1

Ogni PWA/APK gestita da SimplexApp espone un endpoint HTTPS di controllo (consigliato: `/functions/v1/simplex-control` oppure `/functions/v1/simplex-modules`).

SimplexApp è la fonte centrale per stato cliente e moduli. Il prodotto conserva i propri dati applicativi.

## Comandi obbligatori

### list
Input:
```json
{"action":"list"}
```
Output:
```json
{"customers":[{"id":"uuid","name":"Cliente","active":true,"simplex_client_id":"uuid","modules":{}}]}
```

### provision
Crea o aggiorna il cliente nel backend prodotto usando l'ID centrale Simplex.
Input:
```json
{"action":"provision","externalId":"uuid","name":"Cliente","status":"active"}
```
Output:
```json
{"saved":true,"customerId":"uuid","active":true}
```

### status
Input:
```json
{"action":"status","customerId":"uuid","status":"active|suspended|expired"}
```
Regole:
- active => accesso/licenza attivi
- suspended => accesso/licenza disattivati, dati conservati
- expired => accesso/licenza disattivati, dati conservati

### save
Aggiorna i moduli disponibili per il cliente.
Input:
```json
{"action":"save","customerId":"uuid","modules":{"module_a":true,"module_b":false}}
```

## Requisiti di sicurezza
- L'endpoint deve autorizzare solo l'amministratore Simplex.
- Nessuna service-role key nel frontend.
- La sospensione non elimina dati.
- Il prodotto deve verificare lato server licenza/stato e moduli.
- L'ID `simplex_client_id` è il legame stabile tra SimplexApp e il cliente del prodotto.

## Onboarding di un nuovo prodotto
1. Registrare il prodotto in SimplexApp.
2. Definire i moduli in `simplex_product_modules`.
3. Impostare `management_url` all'endpoint del prodotto.
4. Implementare i quattro comandi sopra nel backend della PWA/APK.

Da quel momento il pannello clienti di SimplexApp può gestire stato e moduli con lo stesso flusso per qualunque prodotto.

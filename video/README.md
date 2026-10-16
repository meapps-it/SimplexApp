# Simplex Video Studio

PWA privata disponibile sotto `/video/` sul dominio SimplexApp.

## Architettura

- Frontend statico: `video/`, pubblicato insieme a SimplexApp.
- Autenticazione: riusa l'account Admin e la sessione Supabase di SimplexApp.
- Backend: Edge Function Supabase `simplex-video`.
- Credenziale Venice: salvata esclusivamente in `simplex_private_settings.venice_api_key`, tabella service-role-only con RLS. La chiave non viene restituita al browser.
- API Venice: elenco modelli video caricato da `/models?type=video`.
- Prezzo: calcolato prima di ogni generazione tramite `/video/quote`.
- Generazione: `/video/queue`, polling su `/video/retrieve`.

## Modalità

- **Da foto**: image-to-video.
- **Riferimenti**: reference-to-video con fino a 10 immagini nel client.
- **Solo testo**: text-to-video.
- Seedance 2.5 viene preferito automaticamente quando disponibile e permette fino a 30 secondi; gli altri modelli Venice restano selezionabili.

Il client ridimensiona le immagini prima dell'invio per limitare peso e memoria. L'ultima richiesta in corso resta in localStorage e viene ripresa alla riapertura.

## Sicurezza

L'Edge Function verifica la sessione Supabase e controlla l'utente in `simplex_admins` prima di ogni azione. La funzione accetta soltanto le origini SimplexApp/GitHub Pages previste e non espone la chiave Venice.

Quando Seedance richiede consenso per media contenenti volti, il backend inoltra la richiesta di consenso e il client la presenta prima dell'eventuale secondo invio.

La funzione distribuita è mantenuta anche in `backend/simplex-video.ts`.

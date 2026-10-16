# Simplex Video Studio

PWA privata disponibile sotto \`/video/\` sul dominio SimplexApp.

## Architettura

- Frontend statico: \`video/\`, pubblicato insieme a SimplexApp.
- Autenticazione: riusa l'account Admin e la sessione Supabase di SimplexApp.
- Backend: Edge Function Supabase \`simplex-video\`.
- Credenziale xAI: salvata esclusivamente in \`simplex_private_settings.xai_api_key\`, tabella service-role-only. La chiave non viene restituita al browser.
- API xAI: \`grok-imagine-video-1.5-lite\` e \`grok-imagine-video-1.5\`.

## Modalità

- **Da foto**: una foto come primo fotogramma.
- **Riferimenti**: 1–7 immagini, modello 1.5 e massimo 720p.
- **Solo testo**: text-to-video con formato selezionabile.

Il client ridimensiona le immagini prima dell'invio per limitare peso e memoria. Il backend avvia la generazione e il client interroga lo stato tramite request ID. L'ultima richiesta in corso resta in localStorage e viene ripresa alla riapertura.

## Sicurezza

L'Edge Function verifica la sessione Supabase e controlla l'utente in \`simplex_admins\` prima di ogni azione. La funzione accetta soltanto le origini SimplexApp/GitHub Pages previste e non espone la chiave xAI.

La funzione distribuita è mantenuta anche in \`backend/simplex-video.ts\`.

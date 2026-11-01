# Home SimplexRisto — 1 novembre 2026

Il backup completo del sito precedente è nel branch `backup/pre-simplexristo-20261101`, commit `6e2771d1fb5b6e955f56676fa6a08344abb14181`. Il precedente index.html è mantenuto byte per byte in app.html; catalogo e amministrazione continuano a usare i medesimi file e dati.

Per ripristinare la home: copiare index.html dal branch backup su main e aggiornare il nome CACHE di sw.js, mantenendo app.html per eventuali link già condivisi. Nessuna migrazione dati è necessaria.

La home include solo un esempio interattivo locale, chiaramente dimostrativo. Nessun link alla PWA viene inventato: il collegamento reale va aggiunto dopo verifica dell’URL esterno. Nessun cambiamento a Supabase, Stripe, Simplex Manager, DNS o altre applicazioni.

Verifica: home controllata nel browser desktop e a 390px; simulazione comanda funzionante. Suite esistente: 44 test superati e 8 errori presenti identici anche sul commit precedente. I test del catalogo e il generatore anteprima ora leggono app.html, mantenendo le verifiche originali.

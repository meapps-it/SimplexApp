# Verifica grafica SimplexApp — 20 ottobre 2026

final result: passed

Ambito: vetrina pubblica esistente, riferimento selezionato prima immagine (Catalogo immediato). Nessuna ricreazione del progetto.

Verifica visiva: riferimento e screenshot implementazione ispezionati insieme. Anteprima nel browser Chrome, desktop 1363×936 e iframe con viewport CSS 390×844 e 834×844. Gli iframe verificano il responsive; non sono dispositivi Android/iOS fisici. Screenshot: /workspace/scratch/simplex-responsive-home.jpg. Riferimento: generated_images/exec-32a8e05f-9161-404c-bfe7-6a0d2a172bd2.png (file di lavoro esterno al repository).

Tipografia: stesso font di sistema, titoli leggibili, descrizioni limitate a quattro righe; testo completo nelle schede dettaglio. Spazi: logo compatto, ricerca e categorie prima della griglia, due colonne mobile e tre desktop/tablet. Colori: sfondo lavanda chiaro, superfici bianche, azioni web blu e scoperta Android azzurro. Immagini: logo e icone reali preservati. Contenuto: dati, categorie e ordine reali del catalogo, non i dati illustrativi del mock. Nessuna app Android presentata come web app.

Funzioni mantenute: dettagli, preferiti, condivisione, categorie, contatti e accesso amministrativo. Sezioni complementari sotto il catalogo. Test manuali browser: ricerca Scadenze (un risultato), Tutte (sei risultati), aggiunta/rimozione preferito e vista Preferiti, ritorno Home. Apri Scadenze apre una nuova scheda browser su https://simplexapp.it/scadenze/. Console: i messaggi di errore osservati appartengono all'estensione Chrome dell'ambiente, non agli script dell'app.

Installazione: test automatici per prompt diretto, display-mode installato, related-app corrispondente, iframe/browser incorporato e prompt tardivo dopo installazione. Installazione reale Android/iOS e uscita da PWA installata verso browser nativo non verificabili in questo ambiente. target=_blank e rel=external sono richieste al browser; associazioni del sistema operativo possono aprire una PWA già installata. Una pagina web non può forzare universalmente Chrome/Samsung Internet o rilevare tutte le installazioni.

Scostamenti intenzionali: accesso gestione mantenuto; categorie e icone reali conservate; etichette di disponibilità, dettagli e condivisione mantenute; Installa assente nell'anteprima HTTP senza prompt. Nessun problema P0/P1/P2 visivo aperto. P3: ulteriore regolazione spazi e icona ricerca possibile dopo prova su telefono fisico.

26 test automatici superati; controlli sintassi JS superati. Nessuna modifica a database, dati clienti o licenze.

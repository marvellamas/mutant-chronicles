Fai questo lavoro, senza chiedere conferma. Siamo sul branch `layout-sd`. Correzione di layout nella tab Artefatti, niente altro.

Problema (visto a 2000 px di larghezza, personaggio con quattro Batterie da 5 PM): nella sezione «Artefatti posseduti» il riquadro «Sintonizzato · occupa 1» (sfondo marrone/oro) esce dal fondo della scheda dell'Artefatto e si sovrappone all'intestazione «Riserve di Chroma» e alla riga di spiegazione sotto. Le quattro schede hanno il bordo verde chiuso sopra il riquadro marrone, che sporge per circa 80 px.

Trova la causa e sistemala: probabilmente la griglia delle schede ha un'altezza di riga fissa o `overflow: visible` con il figlio che non partecipa al flusso, oppure il riquadro del toggle eredita un `min-height`/`height` dal componente dei toggle situazionali. La scheda deve crescere con il contenuto; il toggle è una riga compatta (altezza del testo più il padding), non un blocco. Controlla che lo stesso stile non produca lo stesso effetto negli altri punti dove il toggle è usato (Combattimento, Inventario, Abilità).

Verifica nel browser a 1280, 1920 e 375 px con il personaggio `b` di `tests/collaudo/` e con uno che ha un solo Artefatto: nessuna sovrapposizione, sezione «Riserve di Chroma» leggibile. Un commit, push di `layout-sd`. Riepilogo in due righe: causa e correzione.

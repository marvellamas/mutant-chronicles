# Pacchetto per il Doc «per-davide.md» — 22 ottobre 2026

Tre voci passano alle **Risolte**: A.171, A.172 e A.173, rispondendo alle risposte di Davide del 21 ottobre
(sezione 7 del Doc), applicate e verificate nell'app il 22/10. Una **domanda nuova**, la A.178, nata da un
disallineamento fra la risposta A.173 e il Manuale del Giocatore 0.49 uscito lo stesso giorno.

Lo applica Cowork o Marcello, seguendo `docs/protocollo-davide.md` §5. Claude Code non scrive nei Google Doc.

- **Tre voci da spostare alle «Risolte»:** A.171, A.172, A.173.
- **Una domanda nuova:** A.178 (sezione delle domande aperte).
- Restano aperte A.174, A.175, A.176, A.177 e la nuova A.178.
- **Una correzione approvata da fare nei manuali** (dentro la A.173): Armamenti §7.10 e Magia §24.2.

Dettaglio di che cosa è stato fatto: `docs/risposte-master.md` (voce del 22/10) e
`docs/diff-manuali-2026-10-22.md`.

---

```
*** DOC per-davide.md — voci A.171, A.172, A.173
*** AZIONE: spostale alle «Risolte», sostituendo la riga con il testo qui sotto

--- TESTO ---
A.171 — Portata degli attacchi degli Sciami. RISOLTA (risposta approvata il 21/10/2026, applicata nell’app il 22/10). Il formato dei dati dell’app accetta ora portata 0 Q, e i sei Sciami del bestiario (pipistrelli, corvi, ratti, insetti, quipper, serpenti velenosi) ce l’hanno davvero: la nota di ripiego che registrava 1 Q con la condizione a parole non c’è più. Portata 0 Q vuol dire «solo nello spazio condiviso»: l’attacco è valido soltanto contro un bersaglio con cui lo Sciame condivide almeno un quadretto occupato, e un bersaglio soltanto adiacente non è valido. Quando il bersaglio non condivide lo spazio, il pannello d’attacco lo dice con parole sue — «serve lo spazio condiviso: qui la portata è 0 Q» — invece di proporre un attacco impossibile; come sempre l’app avvisa e non blocca, l’ultima parola resta al Direttore. Una portata negativa resta un errore dei dati.

A.172 — Sagome ruotate, quadretti occupati e portata. RISOLTA (risposta approvata il 21/10/2026, applicata nell’app il 22/10). I due criteri sono stati separati, perché fino a ieri l’app ne usava uno solo per tutti e due i casi. Per i quadretti occupati e per la portata vale la copertura di almeno metà quadretto: una creatura 3 × 10 Q ruotata a 45° risulta occupare 28 quadretti invece di 30, e va bene, perché cambia la rappresentazione sulla griglia e non le dimensioni fisiche. Per le collisioni con muri, ostacoli e altre pedine vale invece la sagoma geometrica effettiva, comprese le parti che coprono meno di metà quadretto: la rotazione non permette più a un angolo della pedina di attraversare un muro, cosa che prima succedeva senza che nessuno al tavolo se ne accorgesse, perché quel quadretto non risultava occupato. I quadretti toccati sono sempre un sovrainsieme di quelli occupati, quindi le collisioni sono diventate soltanto più prudenti: niente che prima fosse vietato è ora permesso, e agli angoli retti i due criteri coincidono. Il bordo della griglia resta misurato sui quadretti occupati: non è un muro che un angolo possa attraversare, e una sagoma ruotata deve potercisi appoggiare. La portata si misura dal quadretto occupato più favorevole e mai dal centro, restando valide linea di visuale, coperture e impedimenti: non si può scegliere un punto d’origine che permetta di colpire attraverso un ostacolo invalicabile.

A.173 — Hachimaki, costi delle Tecniche e sintonizzazione. RISOLTA (risposta approvata il 21/10/2026, verificata nell’app il 22/10: l’app faceva già esattamente così, nessun dato è stato cambiato). La riduzione di 1 PM si applica al costo dell’uso scelto, a ogni attivazione; i costi positivi non scendono sotto 1 PM; una Tecnica gratuita resta gratuita; i quattro usi di Imposizione della Mano Curativa sono alternative e si paga il costo ridotto di quello scelto; più riduzioni dello stesso costo non si sommano; la scheda mostra sempre costo base e costo finale, con la fonte della riduzione. Sulla sintonizzazione la precisazione è stata recepita: l’Hachimaki mantiene SnT 1, perché la regola «artefatti esclusivamente passivi → SnT 0» è soggetta alla maggiorazione prevista per i benefici sui PM (0 di base + 1 per la riduzione del costo in PM). Nei manuali resta da fare la correzione corrispondente: il Manuale della Magia §24.2 e il Manuale dell’Equipaggiamento §10.10 lo dicono già, mentre il Manuale degli Armamenti §7.10 afferma ancora che un artefatto con sole proprietà passive ha SnT 0 «qualunque sia la sua potenza», senza l’eccezione per i benefici sui PM.
--- FINE TESTO ---
```

---

```
*** DOC per-davide.md — sezione delle domande aperte
*** AZIONE: aggiungi in coda la voce nuova A.178

--- TESTO ---
A.178 — I costi di Imposizione della Mano Curativa: vale la regola o la tabella? (seguito della A.173). La risposta A.173 del 21 ottobre elenca i costi «0 → 0; 1 → 1; 2 → 1; 4 → 3; 10 → 9»: sono i quattro usi della Tecnica come stanno nel Manuale del Giocatore 0.48. Il Manuale del Giocatore 0.49, pubblicato lo stesso 21 ottobre cinque ore dopo la risposta, porta però quella tabella a 1 / 2 / 2 / 4 PM, e quindi con l’Hachimaki i costi diventano 1 / 1 / 1 / 3 PM e non 1 / 1 / 3 / 9. La regola della riduzione non cambia: cambiano i costi a cui si applica. Si conferma che vale la regola applicata ai costi della 0.49, cioè 1 / 1 / 1 / 3, e che la tabella della A.173 era l’esempio sui costi di allora? La 0.49 aggiunge anche un limite nuovo, il miglioramento della Ferita una volta ogni 24 ore per beneficiario, condiviso con Guarigione: lo recepiamo insieme. Nel frattempo l’app tiene i costi della 0.48 e la regola della A.173, verificata; l’adeguamento al Manuale del Giocatore 0.49 — che riequilibra in tutto 11 Tecniche Interiori su 28, il recupero della Meditazione e l’AR dell’Aura di Resistenza — è un lotto a parte, non ancora fatto.
--- FINE TESTO ---
```

## Nota per Marcello

La A.178 non è un cavillo: senza risposta l'app resterebbe sui costi della 0.48 mentre il manuale sul tavolo
dice altro, e al tavolo il giocatore leggerebbe un numero diverso da quello della scheda. L'adeguamento alla
0.49 è comunque un lotto da fare (11 Tecniche, Meditazione, Aura di Resistenza): l'elenco puntuale di che cosa
toccare è in coda a `docs/diff-manuali-2026-10-22.md`.

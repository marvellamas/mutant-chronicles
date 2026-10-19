# Hachimaki e Tomo dei Guardiani (19/10/2026)

Equipaggiamento 0.8 §10.10 e §10.11; Magia 1.5 §28.1 e §28.4. Lotto: `tools/lotti/lotto_hachimaki_tomo.mjs`.

## Ricerca dei possessori (solo lettura)

Cercati: «Hachimaki» (e storpiature: hachi, machi, kanji), «Respiro Disciplinato», «Tomo», «Guardiani», «fascia», «Scrigno», «Sigillo», «pergamena», «CyberArma».

| Dove | Esito |
|---|---|
| `personaggi/` (26 file, 7 PG: Botha-Pretorius, Dimitri Orlav, Duncan McDuff, Lucas, Michele Giorgetti, Oshi Nagata, Pablo Zaion, tutte le copie datate) | nessuno dei tre; nessuna voce personalizzata con quei nomi, nessuna nota. Gli unici Artefatti sono Batteria e Scheggia (Dimitri), Guanti, Pietra, Scheggia e Batteria (Lucas). «fascia» compare solo nel calendario di Lucas (mattina/pomeriggio/sera) |
| `tavolo/`, `scontri/` (archivio e bozze), `nemici/`, `veicoli/`, `scene/`, `esempi/` | nessuno (le uniche corrispondenze sono la «Disciplina Interiore» dei modron in `esempi/nemici/mostri/`, che è un'altra cosa) |

Quindi: caso «non posseduto da nessuno». Gli oggetti vanno nel catalogo senza toccare nessun PG; nessun doppione possibile (verificato anche con una riga scritta a mano, che resta una sola).

## Cosa è stato messo

- `artefatti:hachimaki-della-disciplina-interiore`, con `sconto_tecniche` (`data/equipaggiamento/artefatti.json`), validato (`src/validate.js`: `sconto_tecniche`, `snt_beneficio`, perché §7.10 dice «solo passive → SnT 0» ma §10.10 dà 1 per il beneficio).
- `artefatti:tomo-dei-guardiani`, senza profilo meccanico.
- `src/equipaggiamento.js` → `scontoTecniche` (solo con l'oggetto in uso e sintonizzato; più fonti non si sommano); `src/tecniche.js` → `costoEffettivo`; `src/ui/tecniche.js` mostra il costo con la fascia, la base e la fonte, e avvisa se la fascia è indossata ma non sintonizzata. Incantesimi, Rituali, ricariche e altri Artefatti non leggono lo sconto (test).

## Pacchetto per il Doc «per-davide.md»

```
*** DOC per-davide.md — sezione «Risolte»
*** AZIONE: aggiungi la riga

--- TESTO ---
Equipaggiamento 0.8 §§10.8–10.11 — Pergamene, CyberArma, Hachimaki e Tomo dei Guardiani. APPLICATO (19/10/2026); una domanda, A.173 (riduzione sui quattro usi di Imposizione della Mano Curativa). Nessun personaggio, nemico o scontro salvato possiede l’Hachimaki o il Tomo: sono nel catalogo come oggetti del manuale, senza assegnarli a nessuno. L’Hachimaki riduce di 1 PM il costo delle Tecniche Interiori (minimo 1 PM) se indossato e sintonizzato; il costo mostrato nella scheda dice la base e la riduzione. Il Tomo ha peso, SnT e Integrità «da definire», come scrive il manuale.
```

## Da dove vengono le tre regole dello sconto (verifica del 19/10/2026)

Tutte e tre sono scritte nel manuale; il codice non cambia.

1. **Minimo 1 PM per un costo positivo.** Equipaggiamento §10.10: «Una Tecnica con costo positivo non scende sotto 1 PM»; Magia §28.1: «Il costo positivo minimo resta 1 PM» (esempio: «una Tecnica da 3 PM costa 2 PM; una da 1 PM continua a costare 1 PM»).
2. **Una Tecnica gratuita resta gratuita.** Equipaggiamento §10.10: «una Tecnica già gratuita resta gratuita»; Magia §28.1: «una Tecnica già gratuita non cambia».
3. **Più fonti non si sommano.** Equipaggiamento §10.10: «Più fasce o altre riduzioni dello stesso costo non si sommano: si applica soltanto la riduzione più favorevole»; Magia §28.1: «Più esemplari o altre riduzioni del medesimo costo non si sommano: si usa soltanto il beneficio più favorevole». Oggi nell'app esiste una sola fonte (l'Hachimaki): più esemplari valgono −1, non −2 (test `Hachimaki: più fasce…`).

Parte nostra, non del manuale: l'applicazione agli usi di **Imposizione della Mano Curativa** (tabella 1/2/4/10 PM): −1 su ciascuno, minimo 1, cioè 1/1/3/9. Il manuale parla di «costo» di una Tecnica e non dice come leggere una tabella di costi: è la **A.173**, con il comportamento provvisorio già coperto dal test (`costoEffettivo`, 1/1/3/9).

## Errata sulla Sintonizzazione (da correggere nei manuali)

Contraddizione fra paragrafi: Armamenti §7.10 («Un Artefatto con sole proprietà passive ha SnT 0, qualunque sia la sua potenza») e Magia §24.2 («quelli con sole proprietà passive hanno SnT 0») non prevedono eccezioni, mentre Equipaggiamento §10.10 e Magia §28.1 danno SnT 1 all'Hachimaki, proprietà solo passiva («base 0 … più 1 per il beneficio sui PM»). L'app segue il §10.10 e il §28.1: sono le schede specifiche dell'oggetto, spiegano da dove viene il +1 e la tabella del Magia §28 riporta «SnT: 1». Il comportamento non cambia (campo `snt_beneficio` del catalogo).

## Pacchetto per il Doc «per-davide.md» (19/10, seconda parte)

\`\`\`
*** DOC per-davide.md — A.173 nella sezione 2 «Domande aperte» (Bestiario/Equipaggiamento); una riga nella sezione 4 «Da correggere nella prossima edizione dei manuali», sotto «Manuale dell'Equipaggiamento / Manuale della Magia / Manuale degli Armamenti»

--- TESTO (sezione 2) ---
A.173 — Hachimaki della Disciplina Interiore e Tecniche con più costi (Equipaggiamento §10.10, Magia §28.1). Il manuale dice che il costo di una Tecnica scende di 1 PM (minimo 1 PM se il costo è positivo; una Tecnica gratuita resta gratuita; più riduzioni non si sommano). Imposizione della Mano Curativa non ha un costo solo ma una tabella di quattro usi (1, 2, 4 e 10 PM). Nel frattempo: l'app toglie 1 PM a ciascun uso, con il minimo di 1 PM, cioè 1, 1, 3 e 9 PM, e lo mostra in «Attiva» («N PM della scheda − 1 per Hachimaki»). Se la riduzione deve valere diversamente, basta dirlo.

--- TESTO (sezione 4) ---
Armamenti §7.10 e Magia §24.2, SnT degli Artefatti con sole proprietà passive. Dicono «SnT 0» senza eccezioni; Equipaggiamento §10.10 e Magia §28.1 danno all'Hachimaki della Disciplina Interiore SnT 1, con proprietà solo passiva (0 + 1 per il beneficio sui PM). L'app segue il §10.10 e il §28.1 (schede specifiche dell'oggetto). Da correggere: aggiungere l'eccezione ai §7.10 e §24.2, oppure togliere la maggiorazione.
\`\`\`

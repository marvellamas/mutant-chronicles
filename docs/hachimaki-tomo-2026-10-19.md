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
Equipaggiamento 0.8 §§10.8–10.11 — Pergamene, CyberArma, Hachimaki e Tomo dei Guardiani. APPLICATO (19/10/2026), nessuna domanda. Nessun personaggio, nemico o scontro salvato possiede l’Hachimaki o il Tomo: sono nel catalogo come oggetti del manuale, senza assegnarli a nessuno. L’Hachimaki riduce di 1 PM il costo delle Tecniche Interiori (minimo 1 PM) se indossato e sintonizzato; il costo mostrato nella scheda dice la base e la riduzione. Il Tomo ha peso, SnT e Integrità «da definire», come scrive il manuale.
```

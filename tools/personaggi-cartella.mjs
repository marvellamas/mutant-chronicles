// **L'unico modo in cui uno strumento sceglie i file dei personaggi di una cartella** (lotto 200, 15/11/2026).
//
// **Perché esiste.** Nella cartella vera convivono più versioni datate dello stesso personaggio: l'istantanea del
// 14/11/2026 porta 37 file per sette personaggi, perché l'app salva un file nuovo a ogni serata e non sovrascrive
// mai. Quale sia quello che conta lo dice `src/cartella.js → fileAttuale`, e `CLAUDE.md` lo scrive come regola:
// «il file attuale di un personaggio lo sceglie solo src/cartella.js → fileAttuale (app, server, menu)».
//
// Gli strumenti però camminavano sui file. `tools/stato-personaggi.mjs` e `tools/migra-talenti.mjs` avevano già
// ciascuno la propria versione della stessa scelta; `tools/adegua-abilita.mjs`, `tools/migra-parata.mjs`,
// `tools/riserve-intere.mjs` e tutti i «prima e dopo» non ce l'avevano. Il danno non era il conto: `--annulla
// NOME` dell'adeguamento prendeva il primo file con quel nome — la versione più vecchia — e lasciava adeguato
// l'attuale dicendo di aver annullato, cioè mentiva proprio all'unico attrezzo di sicurezza della serata.
//
// Da qui in avanti chi legge o scrive i personaggi di una cartella chiama `personaggiDellaCartella`. Chi deve
// guardare la **storia** chiama `tuttiIFileDiPersonaggio` e scrive perché: ci sono casi giusti (la copia zip di
// sicurezza, la pulizia dei doppioni, la ricerca di una cartella smarrita), e sono quelli in cui prendere solo
// l'attuale sarebbe sbagliato.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { NOME_FILE, chiaveDaFile } from '../src/cartella.js';
import { elencoDaDisco, perPersonaggio } from './stato-personaggi.mjs';

/** Il nome leggibile di un personaggio: quello delle scelte, o la chiave del nome del file. */
export const nomeDi = (o, file) => (typeof o?.scelte?.nome === 'string' && o.scelte.nome.trim() ? o.scelte.nome.trim() : chiaveDaFile(file));

/**
 * I personaggi di una cartella: **uno per personaggio**, col suo file attuale.
 *
 * @returns [{ id, nome, file, percorso, json, versioni, altri }] ordinati per nome
 *   - `file` e `percorso`: il file attuale, quello che l'app apre;
 *   - `json`: il suo contenuto già letto;
 *   - `versioni`: quante ce ne sono in tutto (1 nella nostra copia, 5 in quella vera);
 *   - `altri`: i nomi delle versioni che non sono l'attuale, da non toccare.
 */
export function personaggiDellaCartella(cartella) {
  return perPersonaggio(elencoDaDisco(cartella).filter((r) => r.o?.formato === 'mutant-personaggio'))
    .map((g) => ({
      id: g.id,
      nome: nomeDi(g.attuale.o, g.attuale.file),
      file: g.attuale.file,
      percorso: join(cartella, g.attuale.file),
      json: g.attuale.o,
      versioni: g.files.length,
      altri: g.files.filter((x) => x.file !== g.attuale.file).map((x) => x.file),
    }));
}

/**
 * Tutti i file di personaggio di una cartella, storico compreso, anche nelle sottocartelle.
 *
 * Si usa **solo** dove guardare la storia è la cosa giusta, e il chiamante scrive perché: la copia zip di sicurezza
 * prima di una modifica (serve tutto, altrimenti non si torna indietro), la pulizia dei doppioni, la ricerca dei
 * personaggi su un PC. Per decidere qualcosa su «un personaggio» si usa `personaggiDellaCartella`.
 */
export function tuttiIFileDiPersonaggio(cartella, base = cartella) {
  if (!existsSync(cartella)) return [];
  return readdirSync(cartella, { withFileTypes: true }).flatMap((d) => {
    const p = join(cartella, d.name);
    if (d.isDirectory()) return tuttiIFileDiPersonaggio(p, base);
    if (!/\.json$/i.test(d.name)) return [];
    return [{ nome: relative(base, p).split(sep).join('/'), file: p, mtime: statSync(p).mtimeMs }];
  });
}

/**
 * Trova **un** personaggio per nome o per nome di file. Si rifiuta invece di scegliere.
 *
 * È il cuore della correzione del lotto 200: un comando che agisce su un personaggio (annullare, migrare) non può
 * prendere «il primo che trova». Con due personaggi diversi che si chiamano allo stesso modo la risposta giusta è
 * fermarsi ed elencarli, perché sceglierne uno al posto del Direttore è il modo di toccare quello sbagliato.
 *
 * @returns {{ ok: true, voce }} oppure {{ ok: false, motivo, candidati }}
 */
export function trovaPersonaggio(lista, chi) {
  const cerca = String(chi ?? '').trim().toLowerCase();
  if (!cerca) return { ok: false, motivo: 'dimmi quale personaggio: il nome, o il nome del suo file', candidati: [] };
  const perNome = (lista ?? []).filter((v) => v.nome.toLowerCase() === cerca);
  const perFile = (lista ?? []).filter((v) => v.file.toLowerCase() === cerca || v.altri.some((f) => f.toLowerCase() === cerca));
  const trovati = perNome.length ? perNome : perFile;
  if (!trovati.length) {
    return {
      ok: false,
      motivo: `non trovo «${chi}» nella cartella. Ci sono: ${(lista ?? []).map((v) => v.nome).join(', ') || 'nessun personaggio'}`,
      candidati: [],
    };
  }
  if (trovati.length > 1) {
    return {
      ok: false,
      motivo: `«${chi}» è di più di un personaggio (${trovati.map((v) => `${v.nome} → ${v.file}`).join('; ')}): dimmi il nome del file, non scelgo io`,
      candidati: trovati,
    };
  }
  return { ok: true, voce: trovati[0] };
}

/** La riga che dice su che cosa si è basato un rapporto: senza, non si sa che cosa si è guardato. */
export function rigaSuCosa(lista, cartella) {
  const voci = lista ?? [];
  const file = voci.reduce((n, v) => n + v.versioni, 0);
  return `${voci.length} ${voci.length === 1 ? 'personaggio' : 'personaggi'} in ${cartella}`
    + `${file > voci.length ? `, su ${file} file (le versioni vecchie non si toccano: si guarda il file attuale di ciascuno)` : ''}.`;
}

/** Il nome del file di `NOME_FILE`, riesportato per chi lo controlla senza importare due moduli. */
export { NOME_FILE };

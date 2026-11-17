// Controllo in SOLA LETTURA dei due conti delle quote degli incantesimi (lotto 216, A.287).
//
// Dal lotto 131 il conto delle quote è «in un posto solo» (src/quote-incantesimi.js), ma il numero dei **liberi** viene dalla Caratteristica
// Intelligenza, e fino al lotto 216 ne esistevano due letture: i controlli (creazione, «Sali di livello», «Da scegliere», storico) la
// leggevano **senza** le correzioni del Direttore, la scheda **con** (`schedaARiposo` applica le correzioni prima di contare). Su un
// personaggio con una correzione di Intelligenza (Dimitri: −2 del 26/10) i due conti davano 8 e 6 liberi: la scheda diceva «18/20», il
// controllo ne voleva 22.
//
// Per ogni personaggio (file attuale), al livello di adesso e al prossimo, stampa i due conti e dice se divergono. Non scrive niente.
//
//   node tools/quote-incantesimi-controllo.mjs [cartella-personaggi]        (di norma l'istantanea aperta in istantanee/)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { personaggiDellaCartella } from './personaggi-cartella.mjs';
import { caricaDati } from '../src/rules.js';
import { applicaLivello, migraPersonaggio, ricalcolaAvanzamento, calcolaSchedaPersonaggio, statoQuote } from '../src/avanzamento.js';

const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));

/** Il file di un personaggio come lo vede l'app: le correzioni del master stanno nelle scelte. */
export const comeApp = (json) => migraPersonaggio({ creazione: { ...json.scelte, correzioniMaster: json.correzioni_master ?? json.scelte?.correzioniMaster ?? [] }, livelli: json.livelli ?? [] });

/**
 * I due conti per un personaggio: quello dei controlli (`statoQuote` sullo stato ricalcolato) e quello della scheda.
 * @returns { controlli: {liberi, totale, noti}, scheda: {liberi, totale, noti}, diverge: boolean } oppure null se non si calcola
 */
export function dueConti(personaggio, dati) {
  const r = ricalcolaAvanzamento(personaggio, dati);
  if (!r.stato) return null;
  const q = statoQuote(r.stato, dati);
  const s = calcolaSchedaPersonaggio(personaggio, dati).incantesimi;
  const controlli = { liberi: q.liberi, totale: q.totale, noti: q.noti.length, perMacro: q.perMacro };
  const scheda = { liberi: s?.quote?.liberi ?? 0, totale: s?.quote?.totale ?? 0, noti: s?.conosciuti?.length ?? 0, perMacro: s?.quote?.perMacro ?? {} };
  return { controlli, scheda, diverge: controlli.liberi !== scheda.liberi || controlli.totale !== scheda.totale || JSON.stringify(controlli.perMacro) !== JSON.stringify(scheda.perMacro) };
}

/** Il personaggio al livello dopo, con il solo Grado (come la prima schermata di «Sali di livello»). */
export function alProssimoLivello(personaggio, dati) {
  const st = ricalcolaAvanzamento(personaggio, dati).stato;
  if (!st?.classi?.length) return null;
  return applicaLivello(personaggio, { grado: { classe: st.classi[0].nome }, tiroPV: 1, tiroPM: 1 });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const cartella = process.argv[2];
  if (!cartella) { console.error('Uso: node tools/quote-incantesimi-controllo.mjs <cartella dei personaggi>'); process.exit(2); }
  const dati = (await caricaDati(async (n) => readFileSync(join(RADICE, 'data', `${n}.json`), 'utf8'))).dati;
  let divergono = 0;
  for (const v of personaggiDellaCartella(cartella).filter((x) => x.json?.scelte)) {
    const p = comeApp(v.json);
    for (const [quando, pp] of [['adesso', p], ['livello dopo', alProssimoLivello(p, dati)]]) {
      const c = pp ? dueConti(pp, dati) : null;
      if (!c) { console.log(`${v.nome.padEnd(18)} ${quando.padEnd(12)} (non calcolabile)`); continue; }
      if (c.diverge) divergono += 1;
      console.log(`${v.nome.padEnd(18)} ${quando.padEnd(12)} controlli: ${c.controlli.liberi} liberi, totale ${c.controlli.totale}, noti ${c.controlli.noti} | scheda: ${c.scheda.liberi} liberi, totale ${c.scheda.totale}, noti ${c.scheda.noti}${c.diverge ? '   ← DIVERGONO' : ''}`);
    }
  }
  console.log(divergono ? `\n${divergono} conti divergono.` : '\nI due conti coincidono per tutti.');
  process.exit(divergono ? 1 : 0);
}

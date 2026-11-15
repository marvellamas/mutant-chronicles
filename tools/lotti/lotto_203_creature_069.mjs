// Lotto 203 (15/11/2026): il corpus delle creature passa al Manuale dei Mostri **0.69**.
//
// Uso:  node tools/lotti/lotto_203_creature_069.mjs [--scrivi]
//
// **Perché solo i PV, e non «tutto quello che il confronto segnala».** L'importatore, confrontando le 307 schede
// che abbiamo con la 0.69, trova differenze su quattro campi: `pv` su tutte e 307, `attacchi` su 44 (e di queste
// **33 diventerebbero vuote**), `abilità` su 18 e `iniziativa` su 4 (`0 → undefined`). Le ultime tre non sono
// cambiamenti del manuale: sono righe che il lettore non riesce a leggere in quelle pagine, e scriverle
// **cancellerebbe** attacchi, Abilità e Iniziativa che abbiamo già. Quindi questo lotto tocca **i soli PV**, che
// sono la cosa che la 0.66 ha davvero cambiato e la sola urgente — Davide prepara gli scontri dal suo manuale, e
// finché l'app sta alla 0.47 i numeri che legge non sono quelli che l'app usa. Gli altri campi restano come sono,
// e quante schede li avrebbero persi è scritto nel rapporto, non nascosto.
//
// **IL RISCHIO DA NON CORRERE: il +30% due volte.** Il §4.2 della 0.69 lo dice in chiaro: «I PV massimi delle
// schede di questa edizione comprendono già un aumento del 30% rispetto al profilo precedente: nuovi PV =
// precedenti PV × 1,30, arrotondati per eccesso. È una taratura di playtest; **non si applica nuovamente
// l'aumento al valore stampato**». E il §4.2.1 dà l'esempio: «Il Lorath ha 52 PV massimi… Non si applicano
// ulteriormente né ×1,30 né ×1,33 o ×1,50». Quindi qui **non si moltiplica niente**: si prende il numero stampato
// nel manuale e si scrive. Il Lorath passa da 40 a **52**, non a 68, e `tests/creature-069-203.test.js` fallisce
// se qualcuno rimette una moltiplicazione — con quel caso concreto dentro.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importa, leggiEsistenti, norm, nomeCanonico } from '../importa-mostri.mjs';
import { testoManuale, registro } from '../manuali.mjs';

const RADICE = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** L'edizione corrente del Manuale dei Mostri, dal registro: non si scrive a mano (nona regola, lotto 191). */
export const edizioneMostri = () => `Mostri ${registro().manuali.find((m) => m.id === 'mostri').versione}`;

/** I campi che questo lotto tocca. Uno solo, e il motivo sta in testa al file. */
export const CAMPI = ['pv'];

/**
 * **Le due Dragomedusa: una lettura dichiarata, non un numero inventato.**
 *
 * Il §7.12 della 0.69 le presenta in una tabella a due colonne («giovane / adulto») che il lettore non sa
 * dividere, quindi l'importatore non le produce affatto. I PV però ci sono, stampati: **1.170** e **2.080**, e
 * sono già convertiti — coincidono con i 900 e i 1.600 della 0.46 moltiplicati **una volta** per 1,30, ed è la
 * prova che il manuale l'aumento l'ha già applicato. Gli stessi due numeri sono in
 * `data/formato_nemici.json → sistema_salute.conversione_pv.esempi` dal lotto 197.
 *
 * Stanno scritti qui, col paragrafo accanto, perché un numero che non viene dal lettore si dichiara: così chi
 * rilegge sa da dove viene e `tests/creature-069-203.test.js` controlla che sia davvero quello del manuale.
 */
export const DAL_TESTO = [
  { nome: 'Dragomedusa giovane', pv: 1170, paragrafo: 'Mostri 0.69 §7.12, tabella «Dragomedusa caratteristiche e competenze»' },
  { nome: 'Dragomedusa adulto', pv: 2080, paragrafo: 'Mostri 0.69 §7.12, tabella «Dragomedusa caratteristiche e competenze»' },
];

/**
 * Il piano: che cosa cambierebbe, senza scrivere.
 * @returns {{ nuove, pv, invariate, nonToccati, perdite }}
 */
export function piano({ testo = null } = {}) {
  const { risultati } = importa(testo ?? testoManuale('mostri'));
  // leggiEsistenti torna una Map: nome normalizzato → { file, nemico }
  const perNome = leggiEsistenti();

  const nuove = [];
  const pv = [];
  const invariate = [];
  const nonToccati = { attacchi: [], abilita: [], iniziativa: [], altro: [] };
  // le schede che il lettore non sa leggere affatto: i loro PV restano quelli di prima, e si dice quali
  const illeggibili = [];
  // le creature del corpus che il manuale non contiene: restano provvisorie (A.258)
  const fuoriManuale = [];

  for (const r of risultati) {
    if (r.esclusa && !perNome.get(norm(nomeCanonico(r.nome)))) continue;
    const e = perNome.get(norm(nomeCanonico(r.nome)));
    if (!e) { nuove.push(r); continue; }
    // i PV: dalla scheda letta per intero, oppure dall'anteprima. I quattro Elementali Maggiori hanno la pagina
    // senza un'Iniziativa leggibile — quindi la scheda intera è esclusa — ma i PV stampati si leggono comunque
    // (42, 37, 37, 52, cioè i 32/28/28/40 della 0.47 convertiti una volta). Prenderli dall'anteprima è leggere il
    // manuale, non indovinare: quello che resta illeggibile è solo ciò per cui non c'è nessun numero.
    const pvLetti = Number.isInteger(r.json?.pv) ? r.json.pv : (Number.isInteger(r.anteprima?.pv) ? r.anteprima.pv : null);
    if (pvLetti === null) { illeggibili.push({ nome: e.nemico.nome, pv: e.nemico.pv, motivo: r.esclusa ?? 'il manuale non dà i PV in una forma leggibile' }); continue; }
    const vecchio = e.nemico;
    // i PV: si prende il numero del manuale, **senza toccarlo**
    if (pvLetti !== vecchio.pv) pv.push({ id: vecchio.id ?? e.file, nome: vecchio.nome, file: e.file, prima: vecchio.pv, dopo: pvLetti });
    else invariate.push(vecchio.nome);
    // quello che il lettore non legge bene in queste pagine, e che quindi **non** si scrive
    const vuoto = (x) => x === undefined || x === null || (Array.isArray(x) && !x.length);
    if (!vuoto(vecchio.attacchi) && vuoto(r.json?.attacchi)) nonToccati.attacchi.push(vecchio.nome);
    if (!vuoto(vecchio.abilita) && JSON.stringify(vecchio.abilita) !== JSON.stringify(r.json?.abilita)) nonToccati.abilita.push(vecchio.nome);
    if (Number.isInteger(vecchio.iniziativa) && !Number.isInteger(r.json?.iniziativa)) nonToccati.iniziativa.push(vecchio.nome);
  }
  // le due Dragomedusa, dalla lettura dichiarata del §7.12
  const dalTesto = [];
  for (const d of DAL_TESTO) {
    const e = perNome.get(norm(nomeCanonico(d.nome)));
    if (!e) continue;
    if (e.nemico.pv !== d.pv) dalTesto.push({ id: e.nemico.id ?? e.file, nome: e.nemico.nome, file: e.file, prima: e.nemico.pv, dopo: d.pv, paragrafo: d.paragrafo });
  }
  // quello che il manuale non contiene: resta provvisorio
  const nelManuale = new Set(risultati.map((r) => norm(nomeCanonico(r.nome))));
  const dichiarate = new Set(DAL_TESTO.map((d) => norm(nomeCanonico(d.nome))));
  for (const [k, e] of perNome) {
    if (nelManuale.has(k) || dichiarate.has(k)) continue;
    fuoriManuale.push({ nome: e.nemico.nome, file: e.file, fonte: e.nemico.fonte ?? null });
  }
  return { nuove, pv, dalTesto, invariate, illeggibili, fuoriManuale, nonToccati, lette: risultati.length };
}

/** Applica: i PV delle schede che cambiano, le creature nuove, e l'edizione dichiarata su ogni file toccato. */
export function applica(p, { edizione = edizioneMostri() } = {}) {
  const scritti = [];
  for (const x of [...p.pv, ...p.dalTesto]) {
    const o = JSON.parse(readFileSync(x.file, 'utf8'));
    // **niente moltiplicazioni**: il valore è quello stampato nel manuale (§4.2)
    o.pv = x.dopo;
    o._bestiario = { ...(o._bestiario ?? {}), edizione, sistema_salute: o._bestiario?.sistema_salute ?? 'solo_PV' };
    writeFileSync(x.file, `${JSON.stringify(o, null, 2)}\n`);
    scritti.push({ nome: x.nome, file: x.file, pv: `${x.prima} → ${x.dopo}` });
  }
  const nuovi = [];
  for (const r of p.nuove) {
    const dove = join(RADICE, 'esempi', 'nemici', 'mostri', `${r.id}.json`);
    const json = { ...r.json, _bestiario: { ...(r.json._bestiario ?? {}), edizione, sistema_salute: 'solo_PV' } };
    writeFileSync(dove, `${JSON.stringify(json, null, 2)}\n`);
    nuovi.push({ nome: r.nome, id: r.id, pv: json.pv, file: dove });
  }
  return { scritti, nuovi };
}

/** Le righe del rapporto: si leggono prima di scrivere, e restano nel documento del lotto. */
export function righe(p) {
  const out = [];
  out.push(`Manuale: ${edizioneMostri()}. Schede lette: ${p.lette}.`);
  out.push(`Creature nuove: ${p.nuove.length}${p.nuove.length ? ` — ${p.nuove.map((r) => `${r.nome} (${r.id}, PV ${r.json?.pv ?? '—'})`).join(', ')}` : ''}`);
  out.push(`PV che cambiano: ${p.pv.length} dal lettore + ${p.dalTesto.length} da una lettura dichiarata del testo${p.dalTesto.length ? ` (${p.dalTesto.map((x) => `${x.nome} ${x.prima} → ${x.dopo}`).join('; ')})` : ''}. Invariate: ${p.invariate.length}.`);
  out.push(`PV che NON cambiano perché il manuale non si legge in quelle pagine: ${p.illeggibili.length}${p.illeggibili.length ? ` — ${p.illeggibili.map((x) => `${x.nome} (resta ${x.pv})`).join(', ')}` : ''}`);
  out.push(`Creature del corpus che il manuale non contiene, e restano provvisorie: ${p.fuoriManuale.length}`);
  out.push(`In tutto: ${p.pv.length} + ${p.dalTesto.length} + ${p.illeggibili.length} + ${p.fuoriManuale.length} + ${p.nuove.length} nuova = ${p.pv.length + p.dalTesto.length + p.illeggibili.length + p.fuoriManuale.length} schede nel corpus, ${p.nuove.length} in arrivo.`);
  out.push('');
  out.push('Campi NON toccati, perché il lettore non li legge in queste pagine e scriverli cancellerebbe quello che abbiamo:');
  out.push(`  attacchi che diventerebbero vuoti: ${p.nonToccati.attacchi.length}${p.nonToccati.attacchi.length ? ` (${p.nonToccati.attacchi.slice(0, 6).join(', ')}${p.nonToccati.attacchi.length > 6 ? ', …' : ''})` : ''}`);
  out.push(`  Abilità che cambierebbero: ${p.nonToccati.abilita.length}${p.nonToccati.abilita.length ? ` (${p.nonToccati.abilita.slice(0, 6).join(', ')}${p.nonToccati.abilita.length > 6 ? ', …' : ''})` : ''}`);
  out.push(`  Iniziativa che diventerebbe assente: ${p.nonToccati.iniziativa.length}${p.nonToccati.iniziativa.length ? ` (${p.nonToccati.iniziativa.join(', ')})` : ''}`);
  return out;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const scrivi = process.argv.includes('--scrivi');
  const p = piano();
  for (const r of righe(p)) console.log(r);
  if (p.pv.length) {
    console.log('\nPrimi dieci PV che cambiano:');
    for (const x of p.pv.slice(0, 10)) console.log(`  ${x.nome.padEnd(30)} ${x.prima} → ${x.dopo}`);
    const lorath = p.pv.find((x) => /lorath/i.test(x.nome));
    if (lorath) console.log(`\nIl caso di controllo del §4.2.1: ${lorath.nome} ${lorath.prima} → ${lorath.dopo} (il manuale dice 52; ×1,30 due volte darebbe 68).`);
  }
  if (!scrivi) { console.log('\n(Niente scritto. Con --scrivi si applica.)'); process.exit(0); }
  const e = applica(p);
  console.log(`\nScritte: ${e.scritti.length} schede (solo i PV) e ${e.nuovi.length} creature nuove.`);
  for (const n of e.nuovi) console.log(`  nuova: ${n.nome} (${n.id}), PV ${n.pv}`);
}

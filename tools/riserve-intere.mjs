// A.252 (Davide, 06/11/2026), lotto 178: «CM e NeC si consumano solo in quantità intere. Le eventuali frazioni prodotte
// dalla conversione di regole pregresse vanno arrotondate una sola volta all'intero superiore.»
//
// Questo strumento dice quali riserve dei file veri hanno ancora una frazione e a quanto salgono. **Di suo legge e
// basta**: con `--scrivi` applica l'arrotondamento ai file indicati, scrivendo nello storico del personaggio da dove si
// viene. Rilanciarlo non cambia niente: dopo la prima volta le riserve sono intere e non c'è più niente da fare.
//
//   node tools/riserve-intere.mjs <cartella personaggi> [<cartella veicoli>]
//   node tools/riserve-intere.mjs <cartella personaggi> [<cartella veicoli>] --scrivi
//
// Sulle cartelle vere lo lancia il Direttore dal suo PC; qui le prove si fanno su copie (tools/cartella-di-prova.mjs).
import '../tools/guardia-subito.mjs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { caricaDati } from '../src/rules.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';
import { conFrazione, interoRiserva, numeroRiserva } from '../src/cariche-mistiche.js';
import { normalizzaVeicoli } from '../src/veicoli.js';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';

const SCRIVI = process.argv.includes('--scrivi');
const QUANDO = new Date().toISOString();

/** Le riserve con una frazione di un personaggio: NEC dell'inventario e CM dei contenitori. */
export function riserveDaArrotondare(sessione, massimi, nomi = {}) {
  const fuori = [];
  for (const [chiave, n] of Object.entries(sessione?.nec ?? {})) {
    if (!conFrazione(n)) continue;
    fuori.push({ dove: 'NEC', chiave, nome: nomi.nec?.[chiave] ?? chiave, prima: n, dopo: Math.min(interoRiserva(n), massimi?.nec?.[chiave] ?? Infinity) });
  }
  for (const [uid, c] of Object.entries(sessione?.chroma ?? {})) {
    const n = c?.pmAttuali;
    if (!conFrazione(n)) continue;
    const capacita = massimi?.contenitori?.[uid] ?? Infinity;
    fuori.push({ dove: c?.unita === 'CM' ? 'CM' : 'PM', chiave: uid, nome: nomi.contenitori?.[uid] ?? uid, prima: n, dopo: Math.min(interoRiserva(n), capacita) });
  }
  return fuori;
}

/** Le riserve con una frazione di un mezzo: Rossa, Verde e i loro ricambi. */
export function riserveMezzo(mezzo) {
  const e = mezzo?.energia;
  const fuori = [];
  if (!e || e.modello !== 'cariche') return fuori;
  for (const k of ['rosso', 'verde']) {
    if (conFrazione(e[k])) fuori.push({ dove: `riserva ${k}`, prima: e[k], dopo: interoRiserva(e[k]) });
    for (const [i, n] of (e[`${k}_ricambi`] ?? []).entries()) {
      if (conFrazione(n)) fuori.push({ dove: `ricambio ${k} ${i + 1}`, prima: n, dopo: interoRiserva(n) });
    }
  }
  return fuori;
}

const riga = (r) => `${r.dove} ${r.nome ?? ''}`.trim() + `: ${numeroRiserva(r.prima)} → ${r.dopo}`;

async function personaggi(cartella, dati) {
  const file = (await readdir(cartella)).filter((f) => f.endsWith('.json'));
  let conFrazioni = 0;
  let scritti = 0;
  for (const f of file) {
    let testo;
    try { testo = await readFile(join(cartella, f), 'utf8'); } catch { continue; }
    let pg;
    try { pg = deserializzaPersonaggio(testo); } catch { console.log(` ${f}: non leggibile, saltato`); continue; }
    const scelte = normalizza(pg.creazione, dati).scelte;
    const scheda = calcolaScheda({ creazione: scelte, livelli: pg.livelli ?? [] }, dati);
    const m = massimiSessione(scheda, scelte, dati);
    const nomi = {
      nec: Object.fromEntries((m.riserveNec ?? []).map((x) => [x.chiave, x.nome])),
      contenitori: Object.fromEntries((scheda.equipaggiamento?.contenitori ?? []).map((c) => [c.uid, c.nome])),
    };
    const prima = riserveDaArrotondare(pg.sessione, m, nomi);
    if (!prima.length) continue;
    conFrazioni += 1;
    console.log(` ${f}`);
    for (const r of prima) console.log(`   ${riga(r)}`);
    if (!SCRIVI) continue;
    // allineaSessione applica da sé la A.252 e scrive il valore di prima nello storico delle conversioni
    const sessione = allineaSessione(pg.sessione, m);
    const storico = [...(pg.scelte.storico ?? []), {
      quando: QUANDO, cosa: `A.252: riserve portate a cariche intere — ${prima.map(riga).join('; ')}`, da: 'tools/riserve-intere.mjs',
    }];
    const fuori = serializzaPersonaggio({ ...pg, scelte: { ...pg.scelte, storico }, sessione });
    await writeFile(join(cartella, f), `${JSON.stringify(fuori, null, 2)}\n`);
    scritti += 1;
  }
  console.log(`${file.length} file, ${conFrazioni} con riserve da arrotondare${SCRIVI ? `, ${scritti} scritti` : ''}.`);
}

async function veicoli(cartella, dati) {
  const file = (await readdir(cartella)).filter((f) => f.endsWith('.json'));
  let conFrazioni = 0;
  let scritti = 0;
  for (const f of file) {
    let rec;
    try { rec = JSON.parse(await readFile(join(cartella, f), 'utf8')); } catch { continue; }
    if (!rec?.mezzo) continue;
    const prima = riserveMezzo(rec.mezzo);
    if (!prima.length) continue;
    conFrazioni += 1;
    console.log(` ${f} (${rec.mezzo.nome ?? rec.id})`);
    for (const r of prima) console.log(`   ${riga(r)}`);
    if (!SCRIVI) continue;
    const [mezzo] = normalizzaVeicoli([rec.mezzo], dati);
    const storico = [...(rec.storico ?? []), { quando: QUANDO, cosa: `A.252: riserve portate a cariche intere — ${prima.map(riga).join('; ')}`, da: 'tools/riserve-intere.mjs' }];
    await writeFile(join(cartella, f), `${JSON.stringify({ ...rec, mezzo, storico, revisione: (rec.revisione ?? 0) + 1 }, null, 2)}\n`);
    scritti += 1;
  }
  console.log(`${file.length} veicoli, ${conFrazioni} con riserve da arrotondare${SCRIVI ? `, ${scritti} scritti` : ''}.`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['riserve-intere.mjs'], 'riserve-intere.mjs');
  const [cartellaPg, cartellaVeicoli] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!cartellaPg) {
    console.error('Uso: node tools/riserve-intere.mjs <cartella personaggi> [<cartella veicoli>] [--scrivi]');
    process.exit(2);
  }
  const { dati } = await caricaDati((nome) => readFile(new URL(`../data/${nome}.json`, import.meta.url), 'utf8'));
  console.log(SCRIVI ? 'A.252: arrotondo le riserve (una volta sola).' : 'A.252: che cosa cambierebbe (nessun file toccato; --scrivi per applicare).');
  await personaggi(cartellaPg, dati);
  if (cartellaVeicoli) await veicoli(cartellaVeicoli, dati);
}

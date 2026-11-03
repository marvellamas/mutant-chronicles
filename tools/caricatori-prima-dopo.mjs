// Caricatori parziali (03/11/2026): per ogni personaggio con armi da fuoco a caricatore, i colpi PRIMA (conto del modello
// di prima: caricatore nell'arma + caricatori pieni di riserva × capacità + parziali + munizioni sciolte disponibili) e
// DOPO (src/ricarica.js → totaleColpi, sulla sessione allineata come all'apertura della scheda), con i caricatori come si
// vedono adesso, «(15/30)». SOLA LETTURA: non scrive niente, nemmeno nei file che legge.
//
// Uso: node tools/caricatori-prima-dopo.mjs <file o cartella> [altri…]
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { caricaDati } from '../src/rules.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';
import { caricatoreInserito, caricatoriDiScorta, totaleColpi, disponibili } from '../src/ricarica.js';

/** { nome, armi: [{ uid, nome, capacita, prima, dopo, caricatori: ['nell’arma (18/30)', '(30/30)', …], sciolte }] } */
export function contaColpi(testo, dati) {
  const p = deserializzaPersonaggio(testo);
  const { scelte } = normalizza(p.creazione, dati);
  const riposo = calcolaScheda({ creazione: scelte, livelli: p.livelli ?? [] }, dati);
  if (!riposo.caratteristiche) return { nome: scelte.nome ?? '—', armi: [] };
  const m = massimiSessione(riposo, scelte, dati);
  const grezza = p.sessione?.munizioni ?? {};
  const s = allineaSessione(p.sessione, m);
  const nomi = new Map([...(riposo.equipaggiamento?.oggetti ?? []), ...(riposo.equipaggiamento?.armi ?? [])].map((a) => [a.uid, a.nome]));
  const armi = [];
  for (const [uid, info] of Object.entries(m.ricarica ?? {})) {
    if (info.modo !== 'caricatore' || !Number.isInteger(info.capacita)) continue;
    const cap = info.capacita;
    // prima: il conto del modello di prima, sui numeri del file (un'arma senza valori parte dal caricatore pieno)
    const g = grezza[uid];
    const vecchio = Number.isInteger(g) ? { colpi: g, riserve: 0 } : g ?? { colpi: cap, riserve: 0 };
    const sciolte = (info.scorte ?? []).reduce((n, x) => n + Math.max(0, x.quantita - Math.min(x.quantita, p.sessione?.scorte?.[x.uid] ?? 0)), 0);
    const prima = Math.min(vecchio.colpi ?? 0, cap) + (vecchio.riserve ?? 0) * cap + (vecchio.parziali ?? []).filter((n) => n > 0).reduce((a, n) => a + Math.min(n, cap), 0) + sciolte;
    const mun = s.munizioni[uid];
    const dopo = totaleColpi(info, mun, s.scorte);
    const caricatori = [...(caricatoreInserito(mun) ? [`nell’arma (${mun.colpi}/${cap})`] : ['nessuno nell’arma']), ...caricatoriDiScorta(mun, cap).map((n) => `(${n}/${cap})`)];
    armi.push({ uid, nome: nomi.get(uid) ?? uid, capacita: cap, prima, dopo, caricatori, sciolte: (info.scorte ?? []).reduce((n, x) => n + disponibili(x, s.scorte), 0) });
  }
  return { nome: scelte.nome ?? '—', armi };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const percorsi = process.argv.slice(2);
  if (!percorsi.length) { console.error('Uso: node tools/caricatori-prima-dopo.mjs <file o cartella> [altri…]'); process.exit(1); }
  const radice = new URL('../', import.meta.url);
  const { dati } = await caricaDati(async (n) => readFileSync(new URL(`data/${n}.json`, radice), 'utf8'));
  const file = percorsi.flatMap((x) => (statSync(x).isDirectory() ? readdirSync(x).filter((f) => f.endsWith('.json')).map((f) => join(x, f)) : [x]));
  let diversi = 0;
  for (const f of file) {
    let r;
    try { r = contaColpi(readFileSync(f, 'utf8'), dati); } catch { continue; }
    if (!r.armi.length) continue;
    console.log(`${r.nome} (${f.split(/[\\/]/).pop()})`);
    for (const a of r.armi) {
      if (a.prima !== a.dopo) diversi++;
      console.log(`  ${a.nome}: prima ${a.prima} colpi, dopo ${a.dopo}${a.prima === a.dopo ? '' : '  ← DIVERSO'} · ${a.caricatori[0]}${a.caricatori.length > 1 ? ` · di scorta ${a.caricatori.slice(1).join(' ')}` : ''} · sciolti ${a.sciolte}`);
    }
  }
  console.log(diversi ? `\n${diversi} armi con un totale diverso.` : '\nNessun colpo in più o in meno (sola lettura, nessun file scritto).');
}

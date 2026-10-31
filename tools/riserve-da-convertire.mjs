// Lotto 149 (A.193): quante riserve di energia dei personaggi e dei veicoli passano alle cariche con la frazione residua e quante
// restano «da convertire». SOLA LETTURA: non scrive nulla, neppure nelle copie.
//   node tools/riserve-da-convertire.mjs <cartella personaggi> [<cartella veicoli>]
// Per ogni personaggio rilegge il file come lo fa l'app (normalizza + allineaSessione): una riserva in Lx, in UE o in ore di
// un oggetto ora in cariche è «convertita» se la capacità di prima è certa (nec.precedente, rif_sostituiti), altrimenti «da
// convertire». Per i veicoli (record di veicoli/ e veicoli locali dei file dei PG) conta riserve Rosse, Verdi e ricambi di prima.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { caricaDati } from '../src/rules.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';
import { normalizzaVeicoli } from '../src/veicoli.js';

const radice = new URL('../data/', import.meta.url);
const { dati } = await caricaDati((nome) => readFile(new URL(`${nome}.json`, radice), 'utf8'));

const json = async (cartella) => {
  let voci;
  try { voci = await readdir(cartella, { withFileTypes: true }); } catch { return []; }
  return voci.filter((v) => v.isFile() && v.name.endsWith('.json')).map((v) => join(cartella, v.name)).sort();
};

/** Le riserve di un personaggio: { convertite: [{chiave, ...}], daConvertire: [chiave] }. */
export function riserveDelPg(testo) {
  const { creazione, livelli, sessione } = deserializzaPersonaggio(testo);
  const scelte = normalizza(creazione, dati).scelte;
  const m = massimiSessione(calcolaScheda({ creazione: scelte, livelli }, dati), scelte, dati);
  const s = allineaSessione(sessione ?? {}, m);
  const convertite = Object.entries(s.necConvertite ?? {}).map(([chiave, c]) => ({ chiave, ...c }));
  const daConvertire = Object.entries(m.necDaConvertire ?? {})
    .filter(([k, prima]) => !(k in (s.nec ?? {})) && prima.some((v) => Number.isInteger((sessione?.nec ?? {})[v]))).map(([k]) => k);
  return { convertite, daConvertire, veicoliLocali: scelte.veicoli.filter((v) => !v.rif) };
}

/** Le riserve di un veicolo: { convertite: n, daConvertire: [...] }. */
export function riserveDelVeicolo(mezzo) {
  const prima = mezzo?.energia && mezzo.energia.modello !== 'cariche' ? 'lx' : (Number.isFinite(mezzo?.nec?.lx) ? 'lx' : null);
  const [m] = normalizzaVeicoli([mezzo], dati);
  const e = m?.energia;
  if (!e) return { convertite: 0, daConvertire: [] };
  const da = [...(e.da_convertire ?? []).map((k) => `riserva ${k === 'rosso' ? 'Rossa' : 'Verde'}`),
    ...Object.entries(e.ricambi_da_convertire ?? {}).flatMap(([k, l]) => l.map((lx) => `ricambio ${k === 'rosso' ? 'Rosso' : 'Verde'} da ${lx} Lx`))];
  const convertite = prima ? ['rosso', 'verde'].filter((k) => Number.isFinite(e[k])).length : 0;
  return { convertite, daConvertire: da };
}

if (process.argv[1]?.endsWith('riserve-da-convertire.mjs')) {
  const [cartellaPg, cartellaVeicoli] = process.argv.slice(2);
  if (!cartellaPg) { console.log('Uso: node tools/riserve-da-convertire.mjs <cartella personaggi> [<cartella veicoli>]'); process.exit(1); }
  let nConv = 0; let nDa = 0; let vConv = 0; let vDa = 0;
  for (const f of await json(cartellaPg)) {
    let r;
    try { r = riserveDelPg(await readFile(f, 'utf8')); } catch (e) { console.log(`- ${f}: non letto (${e.message})`); continue; }
    nConv += r.convertite.length;
    nDa += r.daConvertire.length;
    for (const c of r.convertite) console.log(`- ${f}: ${c.chiave} convertita da ${c.valore} su ${c.capacita} → ${c.esatto} cariche su ${c.massimo} (segnate ${c.applicato})`);
    for (const k of r.daConvertire) console.log(`- ${f}: ${k} resta da convertire`);
    for (const v of r.veicoliLocali) { const x = riserveDelVeicolo(v); vConv += x.convertite; vDa += x.daConvertire.length; for (const d of x.daConvertire) console.log(`- ${f}: veicolo ${v.nome ?? v.profilo}: ${d} resta da convertire`); }
  }
  if (cartellaVeicoli) {
    for (const f of await json(cartellaVeicoli)) {
      let rec;
      try { rec = JSON.parse(await readFile(f, 'utf8')); } catch { continue; }
      if (rec?.formato !== 'mutant-veicolo') continue;
      const x = riserveDelVeicolo(rec.mezzo);
      vConv += x.convertite;
      vDa += x.daConvertire.length;
      console.log(`- ${f}: ${rec.mezzo?.nome ?? rec.id}: ${x.convertite} riserve convertite${x.daConvertire.length ? `; da convertire: ${x.daConvertire.join(', ')}` : ''}`);
    }
  }
  console.log(`Riserve dei personaggi: ${nConv} convertite, ${nDa} da convertire. Riserve dei veicoli: ${vConv} convertite, ${vDa} da convertire.`);
}

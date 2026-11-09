// Lotto 173 (A.226, A.227): lo Scout dei PG, il FIAT LUX, è un veicolo solo. SOLA LETTURA: non scrive nulla.
//   node tools/fiat-lux.mjs <cartella veicoli> [<cartella personaggi>]
// Elenca gli Scout MK4 del registro (veicoli/) e i PG che li hanno nel file (riferimento o copia locale), e dice che cosa
// l'app farà del record alla prossima apertura: nome, munizioni conservate, ricambi di prima convertiti per frazione
// (A.227), dotazione di prima conservata, valore stimato (vuoto finché lo decide il Direttore). Se gli Scout del gruppo
// sono più di uno, o un PG ne ha una copia locale distinta, lo segnala: è un difetto da sistemare (A.226).
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { caricaDati } from '../src/rules.js';
import { normalizzaRecord } from '../src/veicoli-registro.js';
import { testoCariche } from '../src/veicoli.js';

const radice = new URL('../data/', import.meta.url);
const { dati } = await caricaDati((nome) => readFile(new URL(`${nome}.json`, radice), 'utf8'));
const PROFILO = 'asa-scout-mk4';

const json = async (cartella) => {
  if (!cartella) return [];
  let voci;
  try { voci = await readdir(cartella, { withFileTypes: true }); } catch { return []; }
  return voci.filter((v) => v.isFile() && v.name.endsWith('.json')).map((v) => join(cartella, v.name)).sort();
};
const leggiJson = async (f) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return null; } };

/** Il quadro degli Scout: { record: [...], copie: [...], avvisi: [...] }. Pura sui contenuti letti. */
export function quadroScout(record, personaggi) {
  const scout = record.filter((r) => r?.mezzo?.profilo === PROFILO);
  const avvisi = [];
  const delGruppo = scout.filter((r) => r.proprietario?.tipo === 'gruppo');
  if (delGruppo.length > 1) avvisi.push(`Scout del gruppo nel registro: ${delGruppo.length} (${delGruppo.map((r) => `${r.mezzo.nome} ${r.id}`).join(', ')}). Il FIAT LUX è uno solo (A.226): va tenuto un record.`);
  const copie = [];
  for (const { file, pg } of personaggi) {
    for (const v of pg?.scelte?.veicoli ?? []) {
      if (v?.rif && scout.some((r) => r.id === v.rif)) copie.push({ file, tipo: 'riferimento', id: v.rif });
      else if (!v?.rif && (v?.profilo === PROFILO)) {
        copie.push({ file, tipo: 'copia locale', id: v.uid });
        if (!scout.some((r) => r.id === v.uid)) avvisi.push(`${file}: una copia locale di uno Scout (${v.nome ?? v.uid}) che non è nel registro: sarebbe un secondo veicolo (A.226).`);
      }
    }
  }
  const righe = scout.map((r) => {
    const n = normalizzaRecord(r, dati);
    const e = n.mezzo.energia ?? {};
    const mun = (n.mezzo.munizioni ?? [])[0];
    return {
      id: r.id, nome: r.mezzo.nome, proprietario: r.proprietario?.tipo === 'gruppo' ? 'il gruppo' : r.proprietario?.nome ?? '—', conducente: r.conducente?.nome ?? '—',
      // lotto 185: il nome dell'esemplare lo mostra la scheda da sé (src/veicoli.js → nomiVeicolo), senza riscrivere
      // il record; qui resta l'informazione di che nome porta il file, per chi legge il registro.
      nomeNelRecord: r.proprietario?.tipo === 'gruppo' && r.mezzo.nome !== 'FIAT LUX' ? r.mezzo.nome : null,
      munizioni: mun ? `${mun.caricate} caricate e ${mun.riserva} di riserva` : '—',
      rosso: Number.isFinite(e.rosso) ? testoCariche(e.rosso) : 'da convertire', verde: Number.isFinite(e.verde) ? testoCariche(e.verde) : 'da convertire',
      ricambi: [...(e.rosso_ricambi ?? []).map((x) => `MEC Rosso ${testoCariche(x)}`), ...(e.verde_ricambi ?? []).map((x) => `CEC Verde ${testoCariche(x)}`)],
      ricambiDaVerificare: e.ricambi_da_convertire ?? null,
      dotazione: n.mezzo.dotazione_esemplare ? `quella di prima (${n.mezzo.dotazione_esemplare.da})` : 'standard',
      valoreStimato: Number.isInteger(n.mezzo.valore_stimato_cr) ? `${n.mezzo.valore_stimato_cr} cr` : 'da stimare (Direttore)',
    };
  });
  return { righe, copie, avvisi };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/').replace(/^\/?/, '/')}` || process.argv[1]?.endsWith('fiat-lux.mjs')) {
  const [cartellaVeicoli, cartellaPg] = process.argv.slice(2);
  if (!cartellaVeicoli) {
    console.log('Uso: node tools/fiat-lux.mjs <cartella veicoli> [<cartella personaggi>]   (sola lettura)');
    process.exit(1);
  }
  const record = (await Promise.all((await json(cartellaVeicoli)).map(leggiJson))).filter(Boolean);
  const personaggi = (await Promise.all((await json(cartellaPg)).map(async (f) => ({ file: f.split(/[\\/]/).pop(), pg: await leggiJson(f) })))).filter((x) => x.pg);
  const q = quadroScout(record, personaggi);
  console.log(`Scout MK4 nel registro: ${q.righe.length}`);
  for (const r of q.righe) {
    console.log(`- ${r.nome} (${r.id}) · proprietario ${r.proprietario} · conducente ${r.conducente}`);
    if (r.nomeNelRecord) console.log(`  Nome nel file: «${r.nomeNelRecord}». La scheda scrive «FIAT LUX» con «Modello: ASA Scout MK4» accanto (A.226, lotto 185): il file non va riscritto. Per un nome diverso, il campo in alto nella tab Veicoli.`);
    console.log(`  Munizioni M606: ${r.munizioni} · Rosso ${r.rosso} · Verde ${r.verde}`);
    console.log(`  Ricambi: ${r.ricambi.length ? r.ricambi.join(', ') : 'nessuno'}${r.ricambiDaVerificare ? ` · da verificare dal Direttore: ${JSON.stringify(r.ricambiDaVerificare)}` : ''}`);
    console.log(`  Dotazione: ${r.dotazione} · valore stimato: ${r.valoreStimato}`);
  }
  for (const c of q.copie) console.log(`  ${c.file}: ${c.tipo} (${c.id})`);
  console.log(q.avvisi.length ? q.avvisi.map((a) => `ATTENZIONE: ${a}`).join('\n') : 'Nessuno sdoppiamento: un veicolo solo.');
}

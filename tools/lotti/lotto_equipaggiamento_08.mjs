// Lotto 4 dell'aggiornamento del 01/10/2026, seconda parte: Manuale dell'Equipaggiamento 0.5, cap. 8
// «Cataloghi e dotazioni iniziali». Il capitolo non ha cataloghi propri: rimanda al Manuale del Giocatore
// (§§2.16.1–2.16.30, recepiti con il lotto 1 in data/dotazioni.json e regole.json) e ne riassume le regole
// (§8.1 assegnazione e registrazione, §8.2 crediti, acquisti, naniti e postazioni). Qui si controlla che
// ogni regola del cap. 8 corrisponda ai dati e al motore; con --scrivi si aggiunge il rimando al cap. 8 in
// regole.json → dotazioni_iniziali (testo, idempotente).
//   node tools/lotti/lotto_equipaggiamento_08.mjs            controlli
//   node tools/lotti/lotto_equipaggiamento_08.mjs --scrivi   controlli e rimando in regole.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { normalizza, testoManuali } from '../verifica_frasi.mjs';

const RADICE = new URL('../../', import.meta.url);

/** Frasi del cap. 8 su cui poggiano i controlli (verificate nel testo del Doc). */
export const FRASI_CAP8 = [
  'Ogni personaggio riceve una dotazione comune, la dotazione della propria Classe iniziale, i modelli corporativi espressamente previsti e 1.000 + (2d6 × 100) crediti. Le dotazioni si ricevono una sola volta, alla creazione: acquisire successivamente un’altra Classe non assegna nuovo equipaggiamento.',
  'Si riceve integro, funzionante e senza Prova di Reperibilità.',
  'Durante la creazione gli armamenti ceduti valgono il 100% del prezzo di catalogo. Si paga o si riceve la differenza rispetto al nuovo acquisto.',
  'I crediti iniziali si aggiungono agli oggetti assegnati: da 1.200 a 2.200 cr, con valore medio 1.700 cr. Il denaro non speso rimane al personaggio.',
  'Le munizioni conservano il totale assegnato dalla Classe anche quando cambia la capacità dei caricatori del modello corporativo.',
  'Naniti e postazioni medicochirurgiche sono acquisti o dotazioni di missione: non sono assegnati gratuitamente come parte della dotazione personale iniziale.',
];

/**
 * Controlli del cap. 8 sui dati caricati: [{ paragrafo, regola, ok, dettaglio }]. Usati dal test
 * (tests/dotazioni-cap8.test.js) e dalla riga di comando.
 */
export function controlliCap8(dati) {
  const out = [];
  const c = (paragrafo, regola, ok, dettaglio = '') => out.push({ paragrafo, regola, ok: !!ok, dettaglio });
  const ci = dati.regole.crediti_iniziali;
  const min = ci.fisso + ci.dadi * 1 * ci.moltiplicatore;
  const max = ci.fisso + ci.dadi * ci.facce * ci.moltiplicatore;
  c('§8, §8.2', 'crediti 1.000 + (2d6 × 100), da 1.200 a 2.200, media 1.700', ci.fisso === 1000 && ci.dadi === 2 && ci.facce === 6 && ci.moltiplicatore === 100 && min === 1200 && max === 2200 && (min + max) / 2 === 1700 && ci.minimo === 1200 && ci.massimo === 2200, `${ci.formula}: ${min}–${max}`);
  c('§8', 'dotazioni una sola volta, dalla Classe iniziale', dati.regole.dotazioni_iniziali?.una_sola_volta === true);
  c('§8.1', 'armamenti ceduti al 100% durante la creazione', dati.dotazioni.scambio?.valutazione_cessione === 1, `valutazione_cessione ${dati.dotazioni.scambio?.valutazione_cessione}`);
  // §8.2: naniti (§6.7) e postazioni medicochirurgiche (§6.8) non sono in nessuna dotazione
  const testo = JSON.stringify({ comune: dati.dotazioni.comune, classi: dati.dotazioni.classi, oggetti: dati.dotazioni.oggetti_dotazione, sotto: dati.dotazioni.sotto_scelte, corporativi: dati.dotazioni.corporativi });
  const vietati = (testo.match(/"sanitario:(naniti-medici|postazione-[a-z-]+-(fissa|mobile))"/g) ?? []);
  c('§8.2', 'naniti e postazioni medicochirurgiche non sono dotazioni gratuite', !vietati.length, vietati.join(', '));
  // §8: le dotazioni sono quelle del Giocatore (§§2.16.1–2.16.30), alla versione corrente
  c('§8', 'dotazioni dal Manuale del Giocatore 0.45', /Giocatore 0\.45/.test(dati.dotazioni.versione_manuale ?? ''), dati.dotazioni.versione_manuale);
  // §8.1 «Dispositivo alimentato»: il NEC previsto dalla scheda è compreso e del catalogo
  const cat = dati.equipaggiamento;
  const perRif = new Map(Object.entries(cat.file).flatMap(([f, x]) => (x.oggetti ?? []).map((o) => [`${f}:${o.id}`, o])));
  const rifs = [...new Set([...testo.matchAll(/"rif":"([a-z_]+:[^"]+)"/g)].map((m) => m[1]))];
  const mancanti = rifs.filter((r) => !perRif.has(r));
  c('§8', 'ogni voce di dotazione con scheda esiste nel catalogo', !mancanti.length, mancanti.length ? mancanti.join(', ') : `${rifs.length} rif`);
  const necSbagliati = rifs.map((r) => perRif.get(r)).filter((o) => o?.alimentazione).flatMap((o) => [o.alimentazione].flat().filter((a) => a.nec && !perRif.has(a.nec)).map(() => o.id));
  c('§8.1', 'i dispositivi alimentati comprendono un NEC del catalogo', !necSbagliati.length, necSbagliati.join(', '));
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const DOC = testoManuali();
  const assenti = FRASI_CAP8.filter((f) => !DOC.includes(normalizza(f)));
  if (assenti.length) { console.error(`frasi del cap. 8 non trovate nel Doc:\n- ${assenti.join('\n- ')}`); process.exit(1); }
  const { caricaDati } = await import(new URL('src/rules.js', RADICE));
  const { readFile } = await import('node:fs/promises');
  const { dati } = await caricaDati((nome) => readFile(new URL(`data/${nome}.json`, RADICE), 'utf8'));
  const esiti = controlliCap8(dati);
  for (const e of esiti) console.log(`${e.ok ? '✔' : '✘'} ${e.paragrafo} ${e.regola}${e.dettaglio ? ` — ${e.dettaglio}` : ''}`);
  if (esiti.some((e) => !e.ok)) process.exit(1);
  if (process.argv.includes('--scrivi')) {
    // rimando al cap. 8 nella regola delle dotazioni (testo, senza riformattare regole.json)
    const p = new URL('data/regole.json', RADICE);
    const t = readFileSync(p, 'utf8');
    const vecchio = '"paragrafo": "Giocatore §2.16 (0.45, Google Doc del 01/10/2026)",';
    const nuovo = '"paragrafo": "Giocatore §2.16 (0.45, Google Doc del 01/10/2026); Equipaggiamento 0.5, cap. 8 (stesse regole, riassunte)",';
    if (t.includes(vecchio)) writeFileSync(p, t.replace(vecchio, nuovo));
    console.log(t.includes(vecchio) ? 'regole.json: rimando al cap. 8 scritto' : 'regole.json: rimando al cap. 8 già presente');
  }
}

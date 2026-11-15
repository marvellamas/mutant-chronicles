// I riferimenti che non puntano a niente (lotto 201, 15/11/2026): li elenca e, su richiesta, li ricollega.
//
//   node tools/riferimenti-rotti.mjs [<cartella personaggi> <cartella veicoli>]     sola lettura
//   node tools/riferimenti-rotti.mjs … --scrivi                                    ricollega dove il candidato è uno solo
//
// **Il caso vero.** Nell'istantanea del 14/11/2026 il file attuale di PABLO ZAION rimanda al veicolo
// `veimuu14mqa0` e quello di LUCAS a `veimv15h6e40`: nel registro di Davide c'è solo `veimvozx57q0`, il FIAT LUX.
// Pablo è il pilota e al tavolo il mezzo non si apriva.
//
// **Perché `--scrivi` può ricollegare, mentre l'app no.** Nella scheda l'app non ricollega da sé nemmeno con un
// candidato solo, perché lì nessuno ha chiesto niente e un collegamento sbagliato è peggio di uno mancante. Qui il
// Direttore ha scritto `--scrivi`: è una sua decisione, e prima di scrivere si vede l'elenco di che cosa cambierà.
// Con **più di un candidato** non si scrive comunque: si lascia e si dice, perché scelga lui dalla scheda.
//
// Agisce sul **file attuale** di ciascuno (lotto 200, `tools/personaggi-cartella.mjs`) e non tocca le versioni
// vecchie. Rilanciato, non trova più niente.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cartellaDati } from './dati-pc.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';
import { personaggiDellaCartella, rigaSuCosa } from './personaggi-cartella.mjs';

const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));

async function dati() {
  const { caricaDati } = await import(pathToFileURL(join(RADICE, 'src', 'rules.js')));
  return (await caricaDati(async (n) => readFileSync(join(RADICE, 'data', `${n}.json`), 'utf8'))).dati;
}

/** I record del registro dei veicoli di una cartella. Un file rovinato non conta e non ferma il programma. */
export function recordDelRegistro(cartella) {
  let nomi = [];
  try { nomi = readdirSync(cartella).filter((f) => f.endsWith('.json')); } catch { return []; }
  const out = [];
  for (const f of nomi) {
    try {
      const r = JSON.parse(readFileSync(join(cartella, f), 'utf8'));
      if (r?.formato === 'mutant-veicolo') out.push(r);
    } catch { /* rovinato: non conta */ }
  }
  return out;
}
/**
 * Il quadro: che cosa c'è da ricollegare. Non scrive niente.
 * @returns {{ quadro, voci, suCosa }}
 */
export async function rapporto({ personaggi: cartellaPg, veicoli: cartellaVeicoli, d = null }) {
  const D = d ?? await dati();
  const { quadroRiferimentiRotti } = await import(pathToFileURL(join(RADICE, 'src', 'riferimenti-rotti.js')));
  const voci = personaggiDellaCartella(cartellaPg);
  const record = recordDelRegistro(cartellaVeicoli);
  return { quadro: quadroRiferimentiRotti(voci, record, D, { master: true }), voci, record, suCosa: rigaSuCosa(voci, cartellaPg) };
}

/**
 * Ricollega dove il candidato è uno solo. Scrive nel file attuale del personaggio e aggiunge una riga allo
 * storico della sessione, così dal file si capisce che cosa è stato fatto e quando.
 * @returns {{ scritti, lasciati, senzaCandidati }}
 */
export async function applica({ personaggi: cartellaPg, veicoli: cartellaVeicoli, d = null, quando = new Date() }) {
  const D = d ?? await dati();
  const { ricollegaVeicolo } = await import(pathToFileURL(join(RADICE, 'src', 'riferimenti-rotti.js')));
  const { rigaStorico } = await import(pathToFileURL(join(RADICE, 'src', 'storico.js')));
  const r = await rapporto({ personaggi: cartellaPg, veicoli: cartellaVeicoli, d: D });
  const scritti = [];
  const lasciati = r.quadro.righe.filter((x) => x.attesa);
  const senzaCandidati = r.quadro.righe.filter((x) => x.senzaCandidati);
  // un personaggio per volta, e solo il suo file attuale: più righe dello stesso personaggio si applicano insieme
  for (const voce of r.voci) {
    const mie = r.quadro.righe.filter((x) => x.file === voce.file && x.sistemabile);
    if (!mie.length) continue;
    let scelte = voce.json.scelte;
    const righe = [];
    for (const x of mie) {
      const e = ricollegaVeicolo(scelte.veicoli ?? [], x.rif, x.candidati[0].id, r.record, { master: true, quando: quando.toISOString(), da: 'tools/riferimenti-rotti.mjs' });
      if (e.errore) { righe.push(`NON FATTO (${x.rif}): ${e.errore}`); continue; }
      scelte = { ...scelte, veicoli: e.veicoli };
      righe.push(e.riga);
    }
    const fatte = righe.filter((x) => !x.startsWith('NON FATTO'));
    if (!fatte.length) { scritti.push({ personaggio: voce.nome, file: voce.file, righe }); continue; }
    const sessione = rigaStorico(voce.json.sessione ?? null, `Lotto 201: ${fatte.join(' ')}`, quando);
    const fuori = { ...voce.json, scelte, ...(sessione ? { sessione } : {}) };
    writeFileSync(voce.percorso, `${JSON.stringify(fuori, null, 2)}\n`);
    scritti.push({ personaggio: voce.nome, file: voce.file, righe });
  }
  return { scritti, lasciati, senzaCandidati };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['riferimenti-rotti.mjs'], 'riferimenti-rotti.mjs');
  const liberi = argv.filter((a) => !a.startsWith('--'));
  const base = cartellaDati(RADICE).cartella;
  const cartellaPg = liberi[0] ?? join(base, 'personaggi');
  const cartellaVeicoli = liberi[1] ?? join(base, 'veicoli');
  const scrivi = argv.includes('--scrivi');
  const D = await dati();

  const r = await rapporto({ personaggi: cartellaPg, veicoli: cartellaVeicoli, d: D });
  console.log(r.suCosa);
  console.log(`Registro dei veicoli: ${r.record.length} record in ${cartellaVeicoli}.\n`);
  if (!r.quadro.quanti) {
    console.log('Nessun riferimento rotto: ogni veicolo citato da una scheda è nel registro.');
    process.exit(0);
  }
  for (const x of r.quadro.righe) {
    console.log(`${x.personaggio} [${x.file}]`);
    console.log(`   ${x.testo}`);
    console.log(`   ${x.sistemabile ? 'si può ricollegare con --scrivi' : x.attesa ? 'DUE O PIÙ CANDIDATI: lo lascio, scegli dalla scheda' : 'nessun candidato: lo rimetti o lo togli dalla scheda'}`);
  }
  console.log(`\n${r.quadro.quanti} riferimenti rotti: ${r.quadro.sistemabili} con un candidato solo, ${r.quadro.inAttesa} da scegliere, ${r.quadro.senzaCandidati} senza candidati.`);
  if (!scrivi) { console.log('\nNiente scritto (sola lettura). Con --scrivi ricollego quelli con un candidato solo.'); process.exit(0); }

  const e = await applica({ personaggi: cartellaPg, veicoli: cartellaVeicoli, d: D });
  console.log('');
  for (const s of e.scritti) {
    console.log(`${s.personaggio} [${s.file}]`);
    for (const riga of s.righe) console.log(`   ${riga}`);
  }
  for (const x of e.lasciati) console.log(`${x.personaggio}: lasciato, ${x.candidati.length} candidati — sceglie il Direttore dalla scheda.`);
  for (const x of e.senzaCandidati) console.log(`${x.personaggio}: lasciato, nessun candidato nel registro.`);
  console.log(`\nScritti ${e.scritti.length} personaggi (solo il file attuale di ciascuno; una riga nello storico).`);
}

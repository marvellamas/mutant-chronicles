// L'istantanea dello stato dei personaggi, dal PC di Davide a noi (lotto 196, 14/11/2026).
//
//   node tools/istantanea.mjs                 fa l'istantanea adesso (voce «Manda lo stato»)
//   node tools/istantanea.mjs --stato         dice di che giorno è l'ultima, e se è vecchia; non scrive niente
//   node tools/istantanea.mjs --elenco        le istantanee che ci sono, dalla più recente
//   opzioni: --cartella DIR (i dati), --dove DIR (dove mettere le istantanee), --tieni N
//
// **Perché esiste.** Noi non vediamo i personaggi di Davide. L'unica copia che abbiamo è `personaggi/` sul PC di
// Marcello, e al 14/11/2026 contiene file del 4 ottobre (Dimitri), 7 ottobre (Oshi), 25 ottobre (Botha, Duncan,
// Michele, Pablo) e 10 novembre (Lucas). In mezzo ci sono almeno due serate di gioco, i PX del 26 ottobre e la
// migrazione dei Talenti al tavolo. Per settimane abbiamo chiamato quella copia «i file veri» e tratto conclusioni
// su di essa — a che livello sono i sette, se Dimitri ha una CyberArma, chi perde un VA — presentando come
// «adesso» affermazioni su ottobre. Una di queste ha prodotto una domanda sbagliata a Davide (A.268, lotto 195).
//
// **Come funziona, e perché così.** A fine sessione l'app scrive uno zip in una cartella che Davide **già
// sincronizza col cloud**: arriva a noi da sé. Nessun invio in rete da parte dell'app, nessuna credenziale sul suo
// PC, nessun servizio nuovo che possa rifiutare un allegato — è il motivo per cui questa strada batte la posta.
// La cartella la sceglie lui una volta, dalle impostazioni di Mutant.bat: non si indovina e non si deduce.
//
// **Quando.** «Nuova sessione», lo spegnimento del server e il pulsante «Manda lo stato» del Tavolo. **Non a ogni
// salvataggio:** durante un combattimento l'app salva decine di volte in pochi minuti, e un invio per salvataggio
// rallenterebbe proprio il momento in cui non deve rallentare niente.
//
// **Due vincoli che non si toccano.** La cartella delle istantanee non diventa mai la cartella dei dati dell'app
// (`tools/dati-pc.mjs` la rifiuta: è l'errore che a fine ottobre è costato i personaggi, `docs/diagnosi-dati-
// spariti-2026-10-12.md`), e le istantanee non entrano in git. Entrambe le cose le pretende
// `tests/istantanea-196.test.js`.
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostname } from 'node:os';
import { creaZip, leggiZip, leggiConfig, cartellaIstantanee, quanteIstantanee as quanteTenere } from './salva-sessione.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';

export const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));

/** Le cartelle di dati che entrano nell'istantanea: lo stato dei personaggi, non la sessione intera. */
export const CARTELLE = ['personaggi', 'veicoli', 'px'];

/** Il prefisso del nome: riconoscibile a occhio in una cartella del cloud piena di altra roba. */
export const PREFISSO = 'mutant-stato_';

/**
 * Quante istantanee si tengono.
 *
 * **Venti.** A fine sessione se ne fanno una o due (il «Nuova sessione» e lo spegnimento), e si gioca una o due
 * volte a settimana: venti coprono circa due mesi di partite, cioè abbastanza per tornare indietro di qualche
 * serata se ci accorgiamo tardi che qualcosa non torna. Una pesa quanto i sette personaggi più il registro dei
 * veicoli e i PX — qualche centinaio di KB — quindi venti stanno in pochi MB e il cloud non si riempie. Si cambia
 * con `istantanee_da_tenere` in config-salvataggi.json.
 */
export const TIENI = 20;

const due = (n) => String(n).padStart(2, '0');

/** «mutant-stato_2026-11-14_2340.zip»: la data e l'ora nel nome, così si ordina da sé e si legge a occhio. */
export const nomeIstantanea = (d) => `${PREFISSO}${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}_${due(d.getHours())}${due(d.getMinutes())}.zip`;

/** La data e l'ora dal nome del file, o null se non è un'istantanea. */
export function quandoDalNome(nome) {
  const m = /^mutant-stato_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(?:_\d+)?\.zip$/.exec(basename(nome));
  if (!m) return null;
  const [, a, me, g, h, mi] = m.map(Number);
  const d = new Date(a, me - 1, g, h, mi);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Le due regole di configurazione stanno con le altre, in tools/salva-sessione.mjs: una regola, un posto.
export { cartellaIstantanee, quanteTenere };

/**
 * **Il vincolo che non si tocca:** la cartella delle istantanee non può essere (né contenere, né stare dentro) la
 * cartella dei dati dell'app. Sono due cose opposte: una la scrive l'app e la sincronizza il cloud, l'altra è dove
 * vivono i personaggi. A fine ottobre le due si sono confuse e i personaggi sono spariti.
 * @returns {string|null} il motivo del rifiuto, o null se va bene
 */
export function erroreCartellaIstantanee(istantanee, dati) {
  if (!istantanee) return null;
  const a = `${resolve(istantanee).toLowerCase()}\\`;
  const b = `${resolve(dati).toLowerCase()}\\`;
  if (a === b) return 'è la cartella dei dati di Mutant: le istantanee vanno in una cartella a parte, sincronizzata col cloud';
  if (a.startsWith(b)) return `sta dentro la cartella dei dati di Mutant (${resolve(dati)}): scegline una fuori, sincronizzata col cloud`;
  if (b.startsWith(a)) return `contiene la cartella dei dati di Mutant (${resolve(dati)}): scegline una a parte`;
  return null;
}

/** Vero se quella cartella è (o sta dentro) una cartella di istantanee: la riconosce dai file, non dal nome. */
export function eCartellaIstantanee(cartella) {
  try {
    return readdirSync(cartella).some((f) => quandoDalNome(f) !== null);
  } catch { return false; }
}

const fileJson = (dove) => {
  if (!existsSync(dove)) return [];
  return readdirSync(dove).sort().filter((f) => f.endsWith('.json')).map((f) => ({ nome: f, file: join(dove, f) }));
};

/** I soli file di personaggio, riconosciuti dal contenuto e non dal nome (come il lotto 161). */
const filePersonaggi = (dove) => fileJson(dove).filter(({ file }) => {
  try { return JSON.parse(readFileSync(file, 'utf8'))?.formato === 'mutant-personaggio'; } catch { return true; } // illeggibile: entra e lo dice
});

/**
 * L'indice dell'istantanea: che c'è dentro, in una forma che la nostra parte legge senza aprire i personaggi.
 * `livello` e `px` vengono dal file del personaggio; un file illeggibile resta nell'elenco e lo dice.
 */
export function indiceIstantanea({ cartelle, adesso = new Date(), pc = hostname(), versione = null }) {
  const personaggi = filePersonaggi(cartelle.personaggi ?? '').map(({ nome, file }) => {
    try {
      const o = JSON.parse(readFileSync(file, 'utf8'));
      return { file: nome, nome: o?.scelte?.nome ?? null, livello: Array.isArray(o?.livelli) ? o.livelli.length + 1 : null, px: o?.px ?? o?.sessione?.px ?? null, modificato: statSync(file).mtime.toISOString(), leggibile: true };
    } catch { return { file: nome, nome: null, livello: null, px: null, modificato: null, leggibile: false }; }
  });
  return {
    formato: 'mutant-istantanea',
    versione: 1,
    quando: adesso.toISOString(),
    pc,
    versione_app: versione,
    personaggi,
    veicoli: fileJson(cartelle.veicoli ?? '').length,
    px: fileJson(cartelle.px ?? '').length,
  };
}

/** Le voci dello zip: i personaggi, i veicoli, i PX, l'indice e, se c'è, lo stato-mutant.txt già scritto. */
export function vociIstantanea({ cartelle, indice, statoTxt = null }) {
  const voci = [];
  const mtime = new Date(indice.quando);
  for (const c of CARTELLE) {
    for (const { nome, file } of (c === 'personaggi' ? filePersonaggi(cartelle[c] ?? '') : fileJson(cartelle[c] ?? ''))) {
      try { voci.push({ nome: `${c}/${nome}`, dati: readFileSync(file), mtime: statSync(file).mtime }); } catch { /* sparito nel frattempo */ }
    }
  }
  if (statoTxt && existsSync(statoTxt)) {
    try { voci.push({ nome: 'stato-mutant.txt', dati: readFileSync(statoTxt), mtime: statSync(statoTxt).mtime }); } catch { /* niente */ }
  }
  voci.push({ nome: 'istantanea.json', dati: Buffer.from(`${JSON.stringify(indice, null, 2)}\n`, 'utf8'), mtime });
  return voci;
}

/** Le istantanee di una cartella, dalla più recente: [{ file, percorso, quando, dimensione }]. */
export function elencoIstantanee(dove) {
  if (!dove || !existsSync(dove)) return [];
  return readdirSync(dove)
    .map((f) => ({ file: f, quando: quandoDalNome(f) }))
    .filter((x) => x.quando)
    .map((x) => ({ ...x, percorso: join(dove, x.file), dimensione: (() => { try { return statSync(join(dove, x.file)).size; } catch { return 0; } })() }))
    .sort((a, b) => b.quando - a.quando);
}

/** Butta le istantanee oltre le ultime `tieni`. Torna i nomi tolti. */
export function ruota(dove, tieni = TIENI) {
  const vecchie = elencoIstantanee(dove).slice(tieni);
  const tolte = [];
  for (const v of vecchie) {
    try { unlinkSync(v.percorso); tolte.push(v.file); } catch { /* occupata dal cloud: si riprova al prossimo giro */ }
  }
  return tolte;
}

/**
 * Fa l'istantanea. Non tocca niente se la cartella non è impostata: lo dice e basta, una volta — non insiste.
 * @returns {{ fatto, file?, quanti?, tolte?, motivo?, riga }}
 */
export function faiIstantanea({ cartelle, dove, dati = null, statoTxt = null, adesso = new Date(), tieni = TIENI, pc = hostname(), versione = null }) {
  if (!dove) return { fatto: false, motivo: 'non impostata', riga: 'Istantanea dello stato: cartella non impostata (Impostazioni di Mutant.bat → cartella delle istantanee). Si salta.' };
  const male = dati ? erroreCartellaIstantanee(dove, dati) : null;
  if (male) return { fatto: false, motivo: male, riga: `Istantanea dello stato: non fatta, la cartella ${dove} ${male}.` };
  const indice = indiceIstantanea({ cartelle, adesso, pc, versione });
  if (!indice.personaggi.length) return { fatto: false, motivo: 'nessun personaggio', riga: 'Istantanea dello stato: non fatta, nella cartella dei personaggi non c’è niente.' };
  const voci = vociIstantanea({ cartelle, indice, statoTxt });
  let percorso;
  try {
    mkdirSync(dove, { recursive: true });
    percorso = join(dove, nomeIstantanea(adesso));
    let n = 2;
    while (existsSync(percorso)) percorso = join(dove, nomeIstantanea(adesso).replace(/\.zip$/, `_${n++}.zip`));
    writeFileSync(percorso, creaZip(voci), { flag: 'wx' });
  } catch (e) {
    return { fatto: false, motivo: e.message, riga: `Istantanea dello stato: non riuscita (${e.message}). I personaggi non sono stati toccati.` };
  }
  const tolte = ruota(dove, tieni);
  return {
    fatto: true,
    file: percorso,
    quanti: indice.personaggi.length,
    tolte,
    riga: `Istantanea dello stato: ${basename(percorso)} (${indice.personaggi.length} personaggi, ${indice.veicoli} veicoli) in ${dove}${tolte.length ? `; tolte le ${tolte.length} più vecchie` : ''}.`,
  };
}

/** Legge un'istantanea: l'indice che ha dentro, oppure quello che si capisce dai nomi dei file. */
export function leggiIstantanea(percorso) {
  const dentro = leggiZip(readFileSync(percorso));
  let indice = null;
  try { indice = JSON.parse(dentro['istantanea.json'].toString('utf8')); } catch { /* istantanea senza indice */ }
  const personaggi = indice?.personaggi ?? Object.keys(dentro).filter((n) => n.startsWith('personaggi/')).map((n) => ({ file: basename(n), nome: null, livello: null }));
  return {
    file: basename(percorso),
    percorso,
    quando: indice?.quando ? new Date(indice.quando) : quandoDalNome(percorso),
    pc: indice?.pc ?? null,
    personaggi,
    veicoli: indice?.veicoli ?? Object.keys(dentro).filter((n) => n.startsWith('veicoli/')).length,
    px: indice?.px ?? Object.keys(dentro).filter((n) => n.startsWith('px/')).length,
    stato: dentro['stato-mutant.txt'] ? dentro['stato-mutant.txt'].toString('utf8') : null,
  };
}

/** Quanti giorni dopo i quali un'istantanea è «vecchia»: è il segnale che qualcosa non è arrivato. */
export const GIORNI_AVVISO = 7;

/**
 * La riga del controllo di inizio sessione: di che giorno sono i personaggi che stiamo guardando.
 * È la prima cosa da sapere aprendo una sessione, accanto alla ricognizione dei manuali.
 */
export function rigaFreschezza(ultima, { adesso = new Date(), giorni = GIORNI_AVVISO } = {}) {
  if (!ultima) {
    return {
      fresca: false,
      vecchia: true,
      riga: 'Istantanea dei personaggi: nessuna. Ogni affermazione sui personaggi riguarda la copia locale di personaggi/, con la data del file su cui si basa.',
    };
  }
  const q = ultima.quando;
  const giorniPassati = Math.floor((adesso - q) / 86400000);
  const quando = `${due(q.getDate())}/${due(q.getMonth() + 1)} alle ${due(q.getHours())}:${due(q.getMinutes())}`;
  const quanti = ultima.personaggi.length;
  const base = `Istantanea del ${quando}, ${quanti} ${quanti === 1 ? 'personaggio' : 'personaggi'}`;
  const vecchia = giorniPassati >= giorni;
  return {
    fresca: !vecchia,
    vecchia,
    giorni: giorniPassati,
    riga: vecchia
      ? `${base} — ${giorniPassati} giorni fa: VECCHIA. Qualcosa non è arrivato: prima di dire qualunque cosa sullo stato dei personaggi, chiedi a Davide «Manda lo stato».`
      : `${base} (${giorniPassati === 0 ? 'oggi' : giorniPassati === 1 ? 'ieri' : `${giorniPassati} giorni fa`}).`,
  };
}

/** L'ultima istantanea di una cartella, già letta, o null. */
export function ultimaIstantanea(dove) {
  for (const v of elencoIstantanee(dove)) {
    try { return leggiIstantanea(v.percorso); } catch { /* zip rotto o a metà sincronizzazione: si prova la precedente */ }
  }
  return null;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('istantanea.mjs')) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['istantanea.mjs'], 'istantanea.mjs');
  const valore = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null; };
  const { cartellaDati } = await import('./dati-pc.mjs');
  const dd = cartellaDati(RADICE).cartella;
  const config = leggiConfig(join(dd, 'config-salvataggi.json'));
  const dove = valore('dove') ?? cartellaIstantanee(config);
  const base = valore('cartella') ?? dd;
  const cartelle = Object.fromEntries(CARTELLE.map((c) => [c, join(base, c)]));

  if (argv.includes('--elenco')) {
    const l = elencoIstantanee(dove);
    console.log(dove ? `Istantanee in ${dove}: ${l.length}` : 'Cartella delle istantanee non impostata.');
    for (const v of l) console.log(`  ${v.file}  ${(v.dimensione / 1024).toFixed(0)} KB`);
    process.exit(0);
  }
  if (argv.includes('--stato')) {
    console.log(rigaFreschezza(ultimaIstantanea(dove)).riga);
    process.exit(0);
  }
  const e = faiIstantanea({ cartelle, dove, dati: dd, statoTxt: join(RADICE, 'stato-mutant.txt'), tieni: quanteTenere(config) });
  console.log(e.riga);
  process.exit(e.fatto ? 0 : 1);
}

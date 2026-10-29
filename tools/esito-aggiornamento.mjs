// Che cosa ha fatto «Aggiorna» (25/10/2026, «un ingresso solo», parte B): prima dell'aggiornamento si annota la
// versione, dopo si dice in chiaro che cosa è cambiato — «Aggiornato: prima eri alla versione del 22/10, ora sei a quella
// del 25/10 (Talenti nuovi).» — oppure che era già aggiornato. La versione in parole è la stessa dell'app e del menu
// (src/versione.js → versioneInParole). Lo chiamano aggiorna.bat (Git) e, per lo zip, lo stesso aggiorna.bat attorno a
// 1_scarica_o_aggiorna_app.bat.
//
//   node tools/esito-aggiornamento.mjs prima [--radice=<cartella dell'app>]
//   node tools/esito-aggiornamento.mjs dopo  [--radice=<cartella dell'app>]
// Senza lettere accentate a schermo: la console di Windows non è in UTF-8.
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leggiVersione, leggiNovita } from '../src/versione.js';
import { cartellaDati } from './dati-pc.mjs';
import { statoDaDisco, statoDalServer } from './stato-personaggi.mjs';
import { serverPerScrivere } from './migra-talenti.mjs';
import { ascii } from './menu.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const FILE = join('backup-prima-aggiornamento', '.versione-prima.json');

/** L'impronta del codice: lo sha dello zip (.versione, scritto da 1_scarica) o il commit di Git; null se non si sa. */
export function codiceInstallato(radice) {
  try {
    const z = readFileSync(join(radice, '.versione'), 'utf8').trim();
    if (z) return z;
  } catch { /* non è una copia da zip */ }
  try {
    const head = readFileSync(join(radice, '.git', 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref: ')) return head || null;
    const ref = head.slice(5);
    try { return readFileSync(join(radice, '.git', ref), 'utf8').trim() || null; } catch { /* nei packed-refs */ }
    const riga = readFileSync(join(radice, '.git', 'packed-refs'), 'utf8').split(/\r?\n/).find((l) => l.endsWith(` ${ref}`));
    return riga ? riga.split(' ')[0] : null;
  } catch { return null; }
}

/** La versione installata: { versione, data, titolo, codice } o null. */
export function versioneInstallata(radice) {
  try {
    const v = leggiVersione(JSON.parse(readFileSync(join(radice, 'versione.json'), 'utf8')));
    if (!v) return null;
    let titolo = null;
    try { titolo = leggiNovita(JSON.parse(readFileSync(join(radice, 'novita.json'), 'utf8'))); } catch { /* senza titolo */ }
    return { ...v, titolo, codice: codiceInstallato(radice) };
  } catch { return null; }
}

const giorno = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v?.data ?? ''); return m ? `${m[3]}/${m[2]}` : null; };
const quale = (v) => (giorno(v) ? `quella del ${giorno(v)}` : `la ${v.versione}`);

/** La frase finale dell'aggiornamento. */
export function testoEsito(prima, dopo) {
  if (!dopo) return 'Non riesco a leggere la versione installata: controlla che la cartella sia quella di Mutant.';
  const titolo = dopo.titolo ? ` (${dopo.titolo})` : '';
  if (!prima) return `Ora sei alla versione ${giorno(dopo) ? `del ${giorno(dopo)}` : dopo.versione}${titolo}.`;
  const stessa = `${giorno(dopo) ? `del ${giorno(dopo)}` : dopo.versione}${titolo}`;
  if (prima.versione === dopo.versione) {
    // l'app è la stessa, ma possono essere cambiati i programmi di servizio (menu, aggiornamento, controlli)
    if (prima.codice && dopo.codice && prima.codice !== dopo.codice) return `Aggiornato: l'app resta alla versione ${stessa}; sono cambiati solo i programmi di servizio (menu, aggiornamento, controlli).`;
    return `Era gia' aggiornato: sei alla versione ${stessa}. Non e' cambiato niente.`;
  }
  if (giorno(prima) && giorno(prima) === giorno(dopo)) return `Aggiornato: eri gia' a una versione del ${giorno(dopo)}, ora sei all'ultima di quel giorno${titolo}.`;
  return `Aggiornato: prima eri alla versione ${giorno(prima) ? `del ${giorno(prima)}` : prima.versione}, ora sei a ${quale(dopo)}${titolo}.`;
}

// ---------------------------------------------------------------------------------------------------------------
// 26/10/2026 («Davide non trova i personaggi dopo l'aggiornamento»): prima di aggiornare si annota dove sono i
// personaggi, quanti e con quanti PX; dopo si rileggono dal server, per la strada dell'app, e si confronta.

/** I personaggi come stanno adesso nella cartella dei dati di questo PC: { cartella, personaggi: [{ id, nome, px }] }. */
export function personaggiAdesso(radice) {
  const d = cartellaDati(radice);
  return { cartella: join(d.cartella, 'personaggi'), personaggi: statoDaDisco(join(d.cartella, 'personaggi')).map((p) => ({ id: p.id, nome: p.nome, px: p.px })) };
}

/**
 * Il confronto, in parole: { ok, righe }. `prima` e `dopo`: { cartella, personaggi: [{ id, nome, px }] }.
 * Cambiati la cartella, il numero o i PX di qualcuno: ok false, con i nomi e che cosa fare.
 */
export function confrontaPersonaggi(prima, dopo) {
  if (!dopo) return { ok: false, righe: ['Non riesco a leggere i personaggi dal server di Mutant dopo l\'aggiornamento.', 'Accendi Mutant (voce 1) e premi C "Controlla lo stato"; se mancano, P "Cerca i personaggi".'] };
  const testoPx = (x) => (x === null || x === undefined ? 'senza PX' : `${x} PX`);
  if (!prima?.personaggi) {
    return { ok: true, righe: [`Personaggi: ${dopo.personaggi.length} in ${dopo.cartella}.`, '(Non avevo un elenco di prima con cui confrontare i PX: guardali con la voce C "Controlla lo stato". Dal prossimo aggiornamento li confronto da solo.)'] };
  }
  const problemi = [];
  if (norma(prima.cartella) !== norma(dopo.cartella)) problemi.push(`La cartella dei personaggi e' cambiata: prima ${prima.cartella}, adesso ${dopo.cartella}.`);
  const per = new Map(dopo.personaggi.map((p) => [p.id, p]));
  for (const p of prima.personaggi) {
    const q = per.get(p.id);
    if (!q) problemi.push(`  - ${p.nome}: non c'e' piu' (prima ${testoPx(p.px)}).`);
    else if ((p.px ?? null) !== (q.px ?? null)) problemi.push(`  - ${p.nome}: prima ${testoPx(p.px)}, adesso ${testoPx(q.px)}.`);
  }
  const ids = new Set(prima.personaggi.map((p) => p.id));
  for (const q of dopo.personaggi) if (!ids.has(q.id)) problemi.push(`  - ${q.nome}: non c'era prima.`);
  if (!problemi.length) return { ok: true, righe: [`Personaggi: ${dopo.personaggi.length} in ${dopo.cartella}, PX invariati.`] };
  return {
    ok: false,
    righe: [`ATTENZIONE: i personaggi non sono quelli di prima (prima ${prima.personaggi.length}, adesso ${dopo.personaggi.length}).`, ...problemi,
      'Non giocare e non fare il passaggio ai Talenti (voce 7) finche\' non tornano:',
      'premi P "Cerca i personaggi" nel menu: li cerca nelle altre cartelle e nei salvataggi, e ti fa scegliere quella giusta.'],
  };
}
// il percorso reale: la stessa cartella scritta con il nome corto (BEASTM~1) o lungo è la stessa
const norma = (p) => { let x = String(p ?? ''); try { x = realpathSync.native(x); } catch { /* non c'è: si confronta com'è */ } return x.replace(/[\\/]+$/, '').toLowerCase(); };

/** Dopo l'aggiornamento: i personaggi come li vede il server (acceso, o acceso un momento solo per questo). */
export async function personaggiDalServer(radice, { porta = Number(process.env.MUTANT_PORTA) || 3000 } = {}) {
  const cartella = join(cartellaDati(radice).cartella, 'personaggi');
  const s = await serverPerScrivere({ cartella, porta });
  try {
    const stato = await statoDalServer(s.base);
    if (!stato) return null;
    let percorso = cartella;
    try { percorso = (await (await fetch(`${s.base}/api/avvio`, { signal: AbortSignal.timeout(3000) })).json()).percorso || cartella; } catch { /* resta quella calcolata */ }
    return { cartella: percorso, personaggi: stato.map((p) => ({ id: p.id, nome: p.nome, px: p.px })) };
  } finally { await s.chiudi(); }
}

export function annotaPrima(radice) {
  const v = versioneInstallata(radice);
  mkdirSync(join(radice, 'backup-prima-aggiornamento'), { recursive: true });
  let pg = null;
  try { pg = personaggiAdesso(radice); } catch { /* senza personaggi: il confronto lo dira' */ }
  writeFileSync(join(radice, FILE), `${JSON.stringify({ ...v, ...(pg ? { dati: pg } : {}) })}\n`);
  return { ...v, dati: pg };
}

export function esitoDopo(radice) {
  return testoEsito(primaAnnotata(radice), versioneInstallata(radice));
}

function primaAnnotata(radice) {
  const p = join(radice, FILE);
  try { if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8')); } catch { /* senza confronto */ }
  return null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['esito-aggiornamento.mjs'], 'esito-aggiornamento.mjs');
  const radice = process.argv.find((x) => x.startsWith('--radice='))?.slice(9) || RADICE;
  const comando = process.argv[2];
  if (comando === 'prima') {
    const v = annotaPrima(radice);
    if (v?.versione) console.log(`  Versione di adesso: ${giorno(v) ? `del ${giorno(v)}` : v.versione}${v.titolo ? ` (${v.titolo})` : ''}.`);
    if (v?.dati) console.log(`  Personaggi di adesso: ${v.dati.personaggi.length} in ${v.dati.cartella}.`);
  } else if (comando === 'dopo') {
    console.log('');
    console.log(' ==============================================================');
    console.log(`  ${esitoDopo(radice)}`);
    // 26/10: i personaggi, riletti dal server, confrontati con quelli di prima
    const c = confrontaPersonaggi(primaAnnotata(radice)?.dati ?? null, await personaggiDalServer(radice).catch(() => null));
    for (const r of c.righe) console.log(c.ok ? `\x1b[32m  ${ascii(r)}\x1b[0m` : `\x1b[31m  ${ascii(r)}\x1b[0m`);
    console.log(' ==============================================================');
    if (!c.ok) process.exitCode = 3;
  } else {
    console.error('Comandi: prima, dopo [--radice=<cartella>]');
    process.exitCode = 2;
  }
}

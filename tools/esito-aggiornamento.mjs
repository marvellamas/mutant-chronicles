// Che cosa ha fatto «Aggiorna» (25/10/2026, «un ingresso solo», parte B): prima dell'aggiornamento si annota la
// versione, dopo si dice in chiaro che cosa è cambiato — «Aggiornato: prima eri alla versione del 22/10, ora sei a quella
// del 25/10 (Talenti nuovi).» — oppure che era già aggiornato. La versione in parole è la stessa dell'app e del menu
// (src/versione.js → versioneInParole). Lo chiamano aggiorna.bat (Git) e, per lo zip, lo stesso aggiorna.bat attorno a
// 1_scarica_o_aggiorna_app.bat.
//
//   node tools/esito-aggiornamento.mjs prima [--radice=<cartella dell'app>]
//   node tools/esito-aggiornamento.mjs dopo  [--radice=<cartella dell'app>]
// Senza lettere accentate a schermo: la console di Windows non è in UTF-8.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leggiVersione, leggiNovita } from '../src/versione.js';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const FILE = join('backup-prima-aggiornamento', '.versione-prima.json');

/** La versione installata: { versione, data, titolo } o null. */
export function versioneInstallata(radice) {
  try {
    const v = leggiVersione(JSON.parse(readFileSync(join(radice, 'versione.json'), 'utf8')));
    if (!v) return null;
    let titolo = null;
    try { titolo = leggiNovita(JSON.parse(readFileSync(join(radice, 'novita.json'), 'utf8'))); } catch { /* senza titolo */ }
    return { ...v, titolo };
  } catch { return null; }
}

const giorno = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v?.data ?? ''); return m ? `${m[3]}/${m[2]}` : null; };
const quale = (v) => (giorno(v) ? `quella del ${giorno(v)}` : `la ${v.versione}`);

/** La frase finale dell'aggiornamento. */
export function testoEsito(prima, dopo) {
  if (!dopo) return 'Non riesco a leggere la versione installata: controlla che la cartella sia quella di Mutant.';
  const titolo = dopo.titolo ? ` (${dopo.titolo})` : '';
  if (!prima) return `Ora sei alla versione ${giorno(dopo) ? `del ${giorno(dopo)}` : dopo.versione}${titolo}.`;
  if (prima.versione === dopo.versione) return `Era gia' aggiornato: sei alla versione ${giorno(dopo) ? `del ${giorno(dopo)}` : dopo.versione}${titolo}. Non e' cambiato niente.`;
  return `Aggiornato: prima eri alla versione ${giorno(prima) ? `del ${giorno(prima)}` : prima.versione}, ora sei a ${quale(dopo)}${titolo}.`;
}

export function annotaPrima(radice) {
  const v = versioneInstallata(radice);
  mkdirSync(join(radice, 'backup-prima-aggiornamento'), { recursive: true });
  writeFileSync(join(radice, FILE), `${JSON.stringify(v)}\n`);
  return v;
}

export function esitoDopo(radice) {
  const p = join(radice, FILE);
  let prima = null;
  try { if (existsSync(p)) prima = JSON.parse(readFileSync(p, 'utf8')); } catch { /* senza confronto */ }
  return testoEsito(prima, versioneInstallata(radice));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const radice = process.argv.find((x) => x.startsWith('--radice='))?.slice(9) || RADICE;
  const comando = process.argv[2];
  if (comando === 'prima') {
    const v = annotaPrima(radice);
    if (v) console.log(`  Versione di adesso: ${giorno(v) ? `del ${giorno(v)}` : v.versione}${v.titolo ? ` (${v.titolo})` : ''}.`);
  } else if (comando === 'dopo') {
    console.log('');
    console.log(' ==============================================================');
    console.log(`  ${esitoDopo(radice)}`);
    console.log(' ==============================================================');
  } else {
    console.error('Comandi: prima, dopo [--radice=<cartella>]');
    process.exitCode = 2;
  }
}

// Una cartella di prova fatta a mano (lotto 161, 02/11/2026). In una prova (un test, un server su un'altra porta o con
// --cartella=) la guardia rifiuta ogni scrittura in una cartella con personaggi, ovunque stia, salvo le cartelle nate
// dentro la prova (tools/protezione-reali.mjs → registro delle cartelle di prova). Per una prova nel browser su una copia
// dei personaggi (server sulla 3017 con --cartella= nello scratchpad) la cartella si crea prima con questo strumento,
// VUOTA, e solo dopo ci si copiano dentro i file:
//   node tools/cartella-di-prova.mjs <cartella nuova dentro %TEMP%>
// Rifiuta una cartella che esiste già e non è vuota (quindi non si può «liberare» una cartella che ha già personaggi,
// come i file di Davide), una fuori dalla cartella temporanea del sistema, e di girare dentro una prova.
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';
import { registraCartellaDiProva, tempProve, dentroCartella } from './protezione-reali.mjs';
import { riconosciProva } from './guardia-automatica.mjs';

/** Crea e annota la cartella. @returns {{ ok: boolean, cartella?: string, motivo?: string }} */
export function creaCartellaDiProva(percorso, { temp = tempProve(), prova = riconosciProva() } = {}) {
  if (!percorso) return { ok: false, motivo: 'manca la cartella: node tools/cartella-di-prova.mjs <cartella nuova dentro la cartella temporanea>' };
  if (prova) return { ok: false, motivo: `questo processo è una prova (${prova}): una prova non annota cartelle a mano, usa mkdtemp` };
  const dir = resolve(percorso);
  if (!dentroCartella(dir, temp)) return { ok: false, motivo: `${dir} non è dentro la cartella temporanea del sistema (${temp})` };
  if (existsSync(dir) && readdirSync(dir).length) return { ok: false, motivo: `${dir} esiste già e non è vuota: una cartella di prova nasce vuota (poi ci si copiano i file)` };
  mkdirSync(dir, { recursive: true });
  registraCartellaDiProva(dir, { temp });
  return { ok: true, cartella: dir };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['cartella-di-prova.mjs'], 'cartella-di-prova.mjs');
  const e = creaCartellaDiProva(process.argv.slice(2).find((a) => !a.startsWith('--')));
  if (!e.ok) { console.error(`Non fatto: ${e.motivo}`); process.exit(1); }
  console.log(`Cartella di prova pronta: ${e.cartella}\nOra copiaci dentro i file e avvia il server di prova con --cartella=.`);
}

import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { BROWSER } from './browser-vero.js';

// Lotto 250, parte A — **la guardia guarda la pagina, non il motore.**
//
// Il difetto del 249: «Sposta i punti» del giocatore lanciava un ReferenceError, la pagina se lo mangiava, il file si
// salvava e l'avviso al Direttore non partiva mai. `tests/pulsanti-che-non-fingono-247.test.js` non lo vedeva perché
// prova le funzioni; nessun test premeva il pulsante. Qui si preme, in un browser vero, e si guardano tre cose che
// solo la pagina può dire:
//   1. il clic non ha lasciato un errore o un'eccezione non gestita;
//   2. qualcosa è cambiato **su disco** — sul file, non in memoria (la lezione del 207);
//   3. l'avviso è arrivato al **diario del Direttore** (lotto 249), per i comandi che ne hanno uno.
//
// Il giro vero è `node tools/ripassa-clic.mjs`, che ripassa tutti i comandi liberati dal 241 al 249: qui si provano i
// tre che pesano di più al tavolo (i PV, l'attacco, lo spostamento dei punti), per non allungare `npm test` oltre il
// necessario. **Senza un browser sul PC il controllo si salta e lo dice nel nome**: un verde senza aver premuto
// niente sarebbe esattamente il difetto che questo file deve trovare.
const CASI = 'pv-meno,attacco,sposta-punti-giocatore';

test(BROWSER ? 'i comandi premuti nella pagina vera non fingono' : 'SALTATO (nessun browser sul PC): i comandi premuti nella pagina vera', { skip: !BROWSER }, () => {
  const fuori = execFileSync(process.execPath, ['tools/ripassa-clic.mjs', `--solo=${CASI}`], {
    cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
    encoding: 'utf8',
    env: { ...process.env, MUTANT_PROVA: '1' },
    timeout: 10 * 60 * 1000,
  });
  const riga = fuori.split('\n').find((r) => r.startsWith('errori inghiottiti:')) ?? '';
  assert.ok(riga, `il ripasso non ha stampato il suo conto:\n${fuori}`);
  const n = (etichetta) => { const m = riga.split(String.fromCharCode(183)).map((x) => x.trim()).find((x) => x.startsWith(etichetta)); return m ? Number(m.split(":").pop().trim()) : -1; };
  assert.equal(n('errori inghiottiti'), 0, `un comando ha lasciato un errore nella pagina:\n${fuori}`);
  assert.equal(n('comandi senza effetto'), 0, `un comando premuto non ha cambiato niente su disco:\n${fuori}`);
  assert.equal(n('senza voce nel diario'), 0, `un comando con un avviso non è arrivato al diario del Direttore:\n${fuori}`);
  assert.equal(n('non provati'), 0, `un comando non si è potuto premere: il ripasso non prova quello che dice\n${fuori}`);
});

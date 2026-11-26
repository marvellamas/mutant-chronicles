import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Lotto 251 — **un tasto che si spegne lo dice, anche quando si spegne da vivo.**
//
// Il ripasso nel browser ha trovato che il «+5» dei PV, arrivato al massimo **senza un ridisegno** (il valore vivo di
// `src/ui/vivi.js` aggiorna numero, barra e tasti da sé), restava spento e **muto**: il motivo c'era nel codice, ma
// solo sul percorso del disegno. È la classe del difetto dei Distintivi del 250, in un altro punto.
//
// La correzione è «un posto solo»: `motivoTasto` decide insieme se il tasto è spento e perché, e tutti e due i
// percorsi la chiamano. Questo controllo fallisce se tornano a decidere ciascuno per conto proprio.
const RADICE = new URL('../', import.meta.url);
const tab = readFileSync(new URL('src/ui/tab.js', RADICE), 'utf8');

test('lo spegnimento e il motivo di un tasto vengono dalla stessa funzione', () => {
  assert.match(tab, /const motivoTasto = \(x, delta\) =>/, 'manca `motivoTasto` in src/ui/tab.js');
  // al disegno
  assert.match(tab, /disabled: !!motivo,\s*\n\s*title: motivo,/, 'il pulsante non prende spegnimento e motivo da `motivoTasto`');
  // e nell'aggiornamento vivo, che è il percorso su cui il motivo si perdeva
  const vivo = tab.slice(tab.indexOf('registraVivo(campo, () => {'));
  assert.match(vivo.slice(0, 600), /const m = motivoTasto\(x, delta\);/, 'il valore vivo non chiede il motivo a `motivoTasto`');
  assert.match(vivo.slice(0, 600), /setAttribute\('title', m\)/, 'il valore vivo spegne il tasto senza dargli il motivo');
});

test('il motivo non torna a essere calcolato due volte con due testi diversi', () => {
  // il testo del motivo compare una volta sola: due copie sono due cose che possono dire il contrario
  const quante = (tab.match(/già al massimo \(\$\{massimo\}\)/g) ?? []).length;
  assert.equal(quante, 1, `il testo «già al massimo» compare ${quante} volte: deve stare in un posto solo`);
});

test('il censimento dei motivi nel solo title gira e dice i suoi numeri', () => {
  const fuori = execFileSync(process.execPath, ['tools/motivi-nel-title.mjs'], {
    cwd: RADICE.pathname.replace(/^\/([A-Za-z]:)/, '$1'), encoding: 'utf8',
  });
  // non si congelano i numeri (cambiano a ogni lotto): si pretende che il censimento li sappia dire
  assert.match(fuori, /col motivo nel `title`: \d+/);
  assert.match(fuori, /spenti senza nessun motivo: \d+/);
  assert.match(fuori, /Il numero è quello dei candidati/, 'il censimento deve dichiarare il limite del metodo');
});

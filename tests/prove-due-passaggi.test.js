import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 185: `npm test` dà lo stesso esito ogni volta perché i file che avviano processi veri non girano nella stessa
// ondata degli altri (tools/prove.mjs). Questo test tiene onesta quella divisione: se qualcuno rimette `npm test` a
// un passaggio solo, se il riconoscimento smette di vedere un modo di avviare processi, o se un file che avvia
// `server.mjs` finisce fra quelli puri, qui diventa rosso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { avviaProcessi, dueGruppi, concorrenzaProcessi, leggiRiepilogo, AVVIA_PROCESSI, RADICE } from '../tools/prove.mjs';

const files = globSync('tests/**/*.test.js', { cwd: RADICE }).map((f) => join(RADICE, f));
const nome = (f) => f.replace(/.*tests[\\/]/, '');

test('npm test passa da tools/prove.mjs: nessun ritorno al passaggio unico', () => {
  const pkg = JSON.parse(readFileSync(join(RADICE, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.test, 'node tools/prove.mjs');
  // la cache di compilazione non va in git
  assert.match(readFileSync(join(RADICE, '.gitignore'), 'utf8'), /^\.cache\/$/m);
});

test('i due gruppi coprono tutti i file di prova, una volta ciascuno', () => {
  const { processi, puri } = dueGruppi(files);
  assert.equal(processi.length + puri.length, files.length);
  assert.equal(new Set([...processi, ...puri]).size, files.length, 'nessun file in entrambi i gruppi');
  assert.ok(processi.length > 0 && puri.length > 0);
  // la divisione non è un elenco scritto a mano: viene dal codice del file
  for (const f of processi) assert.ok(avviaProcessi(f), `${nome(f)} sta fra quelli che avviano processi ma non li avvia`);
  for (const f of puri) assert.ok(!avviaProcessi(f), `${nome(f)} avvia processi ma sta fra quelli puri`);
});

// Controllo indipendente dal riconoscimento: chi importa node:child_process apre processi, e se il riconoscimento
// venisse indebolito finirebbe fra i puri senza che nessuno se ne accorga.
test('nessun file che importa node:child_process sta fra quelli puri', () => {
  const { puri } = dueGruppi(files);
  const fuori = puri.filter((f) => /from ['"]node:child_process['"]/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(fuori.map(nome), [], 'questi aprono processi e andrebbero nel primo passaggio');
});

// I nomi si compongono a pezzi (`'spa' + 'wn'`) di proposito: scritti per intero, questo file finirebbe da sé fra
// quelli che avviano processi, e il primo passaggio porterebbe in giro un file che non ne avvia nessuno.
const APERTA = '(';
test('il riconoscimento vede tutti i modi di avviare un processo', () => {
  for (const modo of ['spa' + 'wn', 'spa' + 'wnSync', 'execF' + 'ile', 'execF' + 'ileSync', 'ex' + 'ec', 'ex' + 'ecSync', 'fo' + 'rk']) {
    assert.ok(AVVIA_PROCESSI.test(`const x = ${modo}${APERTA}process.execPath)`), modo);
  }
  assert.ok(!AVVIA_PROCESSI.test("const s = 'spawnato a mano';"), 'una parola in una stringa non basta');
  // i metodi con lo stesso nome non c'entrano: senza questo il primo passaggio si gonfiava di file puri
  assert.ok(!AVVIA_PROCESSI.test(`const m = /ab/.ex${'ec'}${APERTA}testo);`), 'exec di un’espressione regolare');
  assert.ok(!AVVIA_PROCESSI.test(`const m = re.ex${'ec'}${APERTA}testo);`), 'exec su una variabile');
  assert.ok(!AVVIA_PROCESSI.test(`coda.fo${'rk'}${APERTA}ramo);`), 'fork di un oggetto nostro');
  assert.ok(AVVIA_PROCESSI.test(`const { exec } = cp;\nex${'ec'}${APERTA}"dir");`), 'exec destrutturato da child_process');
});

test('il primo passaggio ha poca concorrenza: i suoi file aprono altri processi', () => {
  assert.equal(concorrenzaProcessi(32), 4);
  assert.equal(concorrenzaProcessi(8), 2);
  assert.equal(concorrenzaProcessi(2), 2, 'mai meno di due, altrimenti su un PC piccolo la suite si allunga troppo');
  assert.ok(concorrenzaProcessi(64) <= 64 / 4);
});

test('leggiRiepilogo somma i numeri dei due passaggi', () => {
  const uno = 'ℹ tests 129\nℹ pass 129\nℹ fail 0\n';
  const due = 'ℹ tests 2830\nℹ pass 2830\nℹ fail 0\n';
  assert.deepEqual(leggiRiepilogo(uno + due), { tests: 2959, pass: 2959, fail: 0 });
  assert.deepEqual(leggiRiepilogo('ℹ fail 2\n'), { fail: 2 });
  assert.deepEqual(leggiRiepilogo('niente numeri'), {});
});

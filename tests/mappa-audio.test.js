// Suoni della mappa (richiesta di Marcello del 07/10/2026; src/mappa/audio.js): eventi dello scontro → effetto,
// impostazioni del PC (muto, volumi), dati validati, file degli effetti leggeri e nel progetto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { effettoDi, eventiScontro, impostazioniAudio, volumeDi, EVENTI_AUDIO } from '../src/mappa/audio.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';

const { dati } = await datiReali();
const AU = dati.mappa.audio;

test('dati: evento → file; per ora suona solo il nuovo Round; file leggeri e tracciati in git; validatore', () => {
  assert.equal(effettoDi('nuovo_round', dati), 'Sounds/Effects/RoundBell.mp3');
  assert.equal(effettoDi('attacco_opportunita', dati), null);
  assert.equal(effettoDi('inventato', dati), null);
  assert.deepEqual(Object.keys(AU.effetti).sort(), [...EVENTI_AUDIO].sort());
  for (const f of Object.values(AU.effetti).filter(Boolean)) {
    assert.ok(statSync(new URL(`../${f}`, import.meta.url)).size < 200 * 1024, `${f} leggero`);
    assert.equal(execFileSync('git', ['ls-files', f], { cwd: new URL('..', import.meta.url) }).toString().trim(), f, `${f} tracciato in git`);
  }
  for (const [k, cambia] of [
    ['audio.effetti.campanella', (d) => { d.mappa.audio.effetti.campanella = 'x.mp3'; }],
    ['audio.effetti.nuovo_round', (d) => { d.mappa.audio.effetti.nuovo_round = 'Sounds/x.exe'; }],
    ['audio.volume_predefinito.musica', (d) => { d.mappa.audio.volume_predefinito.musica = 2; }],
    ['audio.giocatori_predefinito', (d) => { d.mappa.audio.giocatori_predefinito = 'no'; }],
  ]) {
    const d = copia(dati);
    cambia(d);
    assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === k), k);
  }
});

test('eventi: nuovo Round solo quando il Round sale nello stesso scontro aperto', () => {
  const s = (round, o = {}) => ({ id: 'sc', stato: 'aperto', round, ...o });
  assert.deepEqual(eventiScontro(s(1), s(2)), ['nuovo_round']);
  assert.deepEqual(eventiScontro(s(2), s(2)), [], 'stesso Round: un «Avanti» di turno');
  assert.deepEqual(eventiScontro(s(3), s(2)), [], '«Indietro» oltre il Round: niente campanella');
  assert.deepEqual(eventiScontro(null, s(2)), [], 'prima lettura (mappa appena aperta)');
  assert.deepEqual(eventiScontro(s(1), s(2, { id: 'altro' })), [], 'un altro scontro');
  assert.deepEqual(eventiScontro(s(1), s(2, { stato: 'chiuso' })), []);
  assert.deepEqual(eventiScontro(s(1), null), []);
});

test('impostazioni del PC: predefinite dai dati, volumi fra 0 e 1, muto generale', () => {
  assert.deepEqual(impostazioniAudio(null, dati), { muto: false, musica: AU.volume_predefinito.musica, effetti: AU.volume_predefinito.effetti });
  const i = impostazioniAudio({ muto: true, musica: 1.7, effetti: -1, altro: 3 }, dati);
  assert.deepEqual(i, { muto: true, musica: 1, effetti: 0 });
  assert.equal(volumeDi(i, 'musica'), 0, 'con il muto');
  assert.equal(volumeDi({ ...i, muto: false }, 'musica'), 1);
  // si salvano come JSON (localStorage) e si rileggono uguali
  assert.deepEqual(impostazioniAudio(JSON.parse(JSON.stringify(i)), dati), i);
});

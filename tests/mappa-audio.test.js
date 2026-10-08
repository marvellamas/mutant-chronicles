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

test('dati: un file per evento (Round, Tocca a te, Chiedi di muovere); file leggeri e tracciati in git; validatore', () => {
  assert.equal(effettoDi('nuovo_round', dati), 'Sounds/Effects/RoundBell.mp3');
  assert.equal(effettoDi('tocca_a_te', dati), 'Sounds/Effects/PlayerAlert.mp3');
  assert.equal(effettoDi('chiedi_di_muovere', dati), 'Sounds/Effects/PlayerAlert.mp3');
  assert.equal(effettoDi('avviso_giocatore', dati), null, 'l’evento unico di prima non c’è più');
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

test('vista giocatori: suoni solo con «suona anche nella vista giocatori» (spento di norma), con la musica dello scontro', async () => {
  const { nuovaScena, validaScena } = await import('../src/mappa/scena.js');
  const { vistaGiocatori } = await import('../src/mappa/vista.js');
  assert.equal(AU.giocatori_predefinito, false);
  const base = { ...nuovaScena({ id: 'aud', nome: 'Aud', colonne: 10, righe: 10, nebbia: 'scoperta', dati }), revisione: 0, collegamento: { scontro: 'sc', bozza: null } };
  const scontro = { id: 'sc', stato: 'aperto', round: 2, turno: 0, ordineAlleati: [], durate: [], registro: [], partecipanti: [], musica: 'Tema.ogg' };
  const contesto = { scontro, pezzi: [], round: 2, regoleMappa: dati.mappa, regoleTemplate: dati.mappa.template };
  assert.equal(vistaGiocatori(base, contesto).audio, undefined, 'spento: niente');
  const accesa = { ...base, audio: { giocatori: true } };
  assert.equal(validaScena(accesa, dati), null);
  assert.deepEqual(vistaGiocatori(accesa, contesto).audio, { giocatori: true, musica: 'Tema.ogg' });
  assert.deepEqual(vistaGiocatori(accesa, { ...contesto, scontro: { ...scontro, musica: null } }).audio, { giocatori: true, musica: null });
  assert.match(validaScena({ ...base, audio: { giocatori: 'sì' } }, dati), /^audio/);
});

test('campanella della vista giocatori: una volta sola quando il Round sale; mai alla prima lettura, al ricaricamento o alla riconnessione', async () => {
  const { campanellaVista, eventoAvviso } = await import('../src/mappa/audio.js');
  const P = dati.mappa.audio.campanella_vista_pausa_max_ms;
  const l = (round, quando, scontro = 'sc') => ({ scontro, round, quando });
  assert.deepEqual(campanellaVista(l(2, 1000), l(3, 2000), P), { evento: 'nuovo_round', round: 3 });
  // la lettura dopo, con lo stesso Round: niente (non suona due volte)
  assert.equal(campanellaVista(l(3, 2000), l(3, 3000), P), null);
  // prima lettura (apertura, ricaricamento, mappa aperta dalla scheda): niente
  assert.equal(campanellaVista(null, l(3, 1000), P), null);
  // riconnessione dopo un buco più lungo della pausa massima: niente, anche se il Round è salito
  assert.equal(campanellaVista(l(2, 1000), l(3, 1000 + P + 1), P), null);
  // «Indietro», altro scontro, nessuno scontro: niente
  assert.equal(campanellaVista(l(3, 1000), l(2, 1500), P), null);
  assert.equal(campanellaVista(l(2, 1000, 'a'), l(3, 1500, 'b'), P), null);
  assert.equal(campanellaVista({ scontro: null, round: null, quando: 1 }, l(3, 2), P), null);
  // gli avvisi al tablet: un evento audio per tipo
  assert.equal(eventoAvviso('turno'), 'tocca_a_te');
  assert.equal(eventoAvviso('muovi'), 'chiedi_di_muovere');
});

// Lettore dei suoni della mappa (src/ui/mappa/audio.js), con Audio, document e localStorage finti: evento → suono con
// il volume «Effetti», muto generale, impostazioni salvate su questo PC, musica di fondo ripetuta e fermata, autoplay
// bloccato dal browser e sblocco al primo clic, vista giocatori spenta.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

let suoni;
let memoria;
let ascolta;
let blocca;
class AudioFinto {
  constructor(src) { this.src = src; this.volume = 1; this.loop = false; this.paused = true; suoni.push(this); }
  play() { if (blocca) return Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })); this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}
beforeEach(() => {
  suoni = []; memoria = new Map(); ascolta = new Map(); blocca = false;
  globalThis.Audio = AudioFinto;
  globalThis.localStorage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, String(v)) };
  globalThis.document = {
    addEventListener: (ev, f) => ascolta.set(ev, f), removeEventListener: (ev) => ascolta.delete(ev),
    // avviso() (src/ui/avvisi.js) senza pagina: non disegna nulla
  };
});
const { creaAudio } = await import('../src/ui/mappa/audio.js');
const { CHIAVE_AUDIO } = await import('../src/mappa/audio.js');
const attesa = () => new Promise((ok) => setTimeout(ok, 0));

test('evento → suono con il volume Effetti; evento senza file e muto: niente', () => {
  const a = creaAudio(dati);
  assert.equal(a.effetto('nuovo_round'), true);
  assert.equal(suoni[0].src, 'Sounds/Effects/RoundBell.mp3');
  assert.equal(suoni[0].volume, dati.mappa.audio.volume_predefinito.effetti);
  assert.equal(a.effetto('attacco_opportunita'), false, 'nessun file per ora');
  a.imposta({ muto: true });
  assert.equal(a.effetto('nuovo_round'), false);
  a.imposta({ muto: false, effetti: 0 });
  assert.equal(a.effetto('nuovo_round'), false, 'volume a 0');
  assert.equal(suoni.length, 1);
});

test('impostazioni salvate su questo PC e rilette alla prossima apertura', () => {
  creaAudio(dati).imposta({ musica: 0.25, effetti: 0.6, muto: true });
  assert.deepEqual(JSON.parse(memoria.get(CHIAVE_AUDIO)), { muto: true, musica: 0.25, effetti: 0.6 });
  assert.deepEqual(creaAudio(dati).impostazioni(), { muto: true, musica: 0.25, effetti: 0.6 });
  memoria.set(CHIAVE_AUDIO, 'rotto{');
  assert.deepEqual(creaAudio(dati).impostazioni().musica, dati.mappa.audio.volume_predefinito.musica, 'valori rovinati: i predefiniti');
});

test('musica di fondo: ripetuta, stesso file non riparte, pausa, muto a volume 0, fermata alla chiusura', async () => {
  const a = creaAudio(dati);
  a.musica('Battaglia.mp3');
  await attesa();
  assert.equal(suoni.length, 1);
  const m = suoni[0];
  assert.deepEqual([m.src, m.loop, m.paused, m.volume], ['api/musica/Battaglia.mp3', true, false, dati.mappa.audio.volume_predefinito.musica]);
  a.musica('Battaglia.mp3');
  assert.equal(suoni.length, 1, 'stesso file: continua');
  a.pausa(true);
  assert.equal(m.paused, true);
  a.pausa(false);
  await attesa();
  assert.equal(m.paused, false);
  a.imposta({ muto: true });
  assert.equal(m.volume, 0);
  a.imposta({ muto: false, musica: 0.9 });
  assert.equal(m.volume, 0.9);
  a.musica(null);
  assert.equal(m.paused, true, 'scontro chiuso: si ferma');
});

test('autoplay bloccato: niente suono finché non c’è un clic; al clic la musica parte', async () => {
  blocca = true;
  let avvisi = 0;
  const a = creaAudio(dati, { avvisa: () => { avvisi++; } });
  a.musica('Tema.ogg');
  await attesa();
  assert.equal(suoni[0].paused, true);
  assert.equal(a.sbloccato(), false);
  assert.equal(avvisi, 1, '«Clic per attivare l’audio»');
  blocca = false;
  ascolta.get('pointerdown')();
  await attesa();
  assert.equal(a.sbloccato(), true);
  assert.equal(suoni[0].paused, false);
});

test('vista giocatori senza «suona anche qui»: nessun suono', async () => {
  let acceso = false;
  const a = creaAudio(dati, { attivo: () => acceso });
  assert.equal(a.effetto('nuovo_round'), false);
  a.musica('Tema.ogg');
  assert.equal(suoni.length, 0);
  acceso = true;
  a.riprova();
  await attesa();
  assert.equal(suoni.length, 1);
  assert.equal(a.effetto('nuovo_round'), true);
});

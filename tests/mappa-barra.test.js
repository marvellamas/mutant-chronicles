// Barra della mappa su una riga anche a 1024 px (12/10/2026, seguito dei ritocchi alla barra): i volumi in un menu
// sotto l'altoparlante, lo stato del salvataggio in un'icona a larghezza fissa. Le prove nel browser (barra su una riga
// a 1024 e a 1280 px, tela della stessa misura dopo 20 azioni di fila) sono nel riepilogo; qui ciò che le tiene ferme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { iconaSalvataggio, pulsanteAudio, clicFuori, STATI_SALVATAGGIO } from '../src/mappa/barra.js';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const pagina = readFileSync(new URL('../src/ui/mappa/pagina.js', import.meta.url), 'utf8');

test('salvataggio: un’icona per stato, con la scritta intera (e l’orario) nel suggerimento', () => {
  assert.deepEqual(iconaSalvataggio('Salvata alle 12:22'), { stato: 'salvata', icona: '✓', titolo: 'Salvata alle 12:22', modificata: false });
  assert.deepEqual(iconaSalvataggio('Modifiche da salvare…', true), { stato: 'da_salvare', icona: '●', titolo: 'Modifiche da salvare…', modificata: true });
  assert.deepEqual(iconaSalvataggio('Salvataggio…', true), { stato: 'in_corso', icona: '…', titolo: 'Salvataggio…', modificata: true });
  assert.equal(iconaSalvataggio('Non salvata: riprovo…', true).stato, 'errore');
  assert.equal(iconaSalvataggio('Non salvata: rifiutata dal server', true).icona, '⚠');
  assert.deepEqual(iconaSalvataggio(''), { stato: 'nessuno', icona: '○', titolo: 'Scena non ancora salvata', modificata: false });
});

test('salvataggio: con modifiche non salvate l’icona cambia subito, anche se la scritta dice ancora «Salvata alle…»', () => {
  const prima = iconaSalvataggio('Salvata alle 12:22', false);
  const dopo = iconaSalvataggio('Salvata alle 12:22', true);
  assert.notEqual(dopo.icona, prima.icona);
  assert.equal(dopo.stato, 'da_salvare');
  assert.match(dopo.titolo, /^Modifiche da salvare…/);
  assert.match(dopo.titolo, /12:22/, 'l’orario dell’ultimo salvataggio resta nel suggerimento');
  assert.equal(iconaSalvataggio('', true).titolo, 'Modifiche da salvare…');
});

test('salvataggio: ogni stato occupa lo stesso spazio (un segno solo, larghezza fissa nel CSS)', () => {
  const icone = Object.values(STATI_SALVATAGGIO).map((x) => x.icona);
  assert.ok(icone.every((i) => [...i].length === 1), icone.join(' '));
  assert.equal(new Set(icone).size, icone.length, 'icone tutte diverse');
  assert.match(css, /\.mappa-gruppo\.gruppo-suoni \.mappa-stato\.icona-salvataggio \{ width: [\d.]+rem; max-width: none; flex: none;/);
  // la pagina scrive l'icona, non più la scritta
  assert.match(pagina, /el\.stato\.textContent = sv\.icona;/);
  assert.doesNotMatch(pagina, /el\.stato\.textContent = st\.salvataggio\.testo/);
});

test('volumi: l’altoparlante apre il menu e mostra comunque se l’audio è muto', () => {
  const acceso = pulsanteAudio({ muto: false, musica: 0.6, effetti: 1 });
  assert.equal(acceso.icona, '🔊');
  assert.equal(acceso.muto, false);
  assert.match(acceso.titolo, /Musica 60 %, Effetti 100 %/);
  const muto = pulsanteAudio({ muto: true, musica: 0.6, effetti: 1 });
  assert.equal(muto.icona, '🔇');
  assert.equal(muto.muto, true);
  assert.match(muto.titolo, /muto/);
  assert.match(muto.etichetta, /muto/);
  assert.equal(pulsanteAudio(null).icona, '🔊');
});

test('volumi: i due cursori e «Muto» stanno nel menu sotto l’altoparlante, non più nella barra', () => {
  assert.match(pagina, /el\.audioMenu = h\('details', \{ class: 'menu-strumenti menu-audio' \}, el\.audioAltoparlante,\s*h\('div', \{[^}]*\}, \.\.\.el\.audioCursori, el\.audioMuto\)\);/);
  assert.match(pagina, /el\.audio\.append\(el\.audioMusica, el\.audioMenu\);/);
  assert.doesNotMatch(pagina, /el\.audio\.append\([^)]*\.\.\.el\.audioCursori/);
});

test('volumi: un clic fuori chiude il menu; un clic dentro (cursori, «Muto») no; Esc lo chiude', () => {
  const dentro = {};
  const menu = { open: true, contains: (x) => x === dentro };
  assert.equal(clicFuori(menu, {}), true);
  assert.equal(clicFuori(menu, dentro), false);
  assert.equal(clicFuori({ ...menu, open: false }, {}), false, 'chiuso: niente da fare');
  assert.equal(clicFuori(null, {}), false);
  assert.match(pagina, /document\.addEventListener\('pointerdown', suClicFuoriAudio\);/);
  assert.match(pagina, /document\.removeEventListener\('pointerdown', suClicFuoriAudio\);/, 'lasciando la mappa l’ascolto si toglie');
  assert.match(pagina, /e\.key === 'Escape' && \(el\.strumenti\.open \|\| el\.altro\.open \|\| el\.audioMenu\.open\)/);
});

test('barra su una riga: i gruppi non vanno a capo (tranne sul telefono), il titolo si accorcia con i puntini', () => {
  assert.match(css, /\.mappa-barra \{ flex-wrap: nowrap; \}\n\.mappa-barra > \.mappa-gruppo \{ flex: none; \}\n\.mappa-barra > \.mappa-gruppo\.gruppo-app \{ flex: 0 1 auto; min-width: 0; \}/);
  assert.match(css, /@media \(max-width: 46rem\) \{ \.mappa-barra \{ flex-wrap: wrap; \} \}\n/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RITRATTO, dimensioniRitratto, byteDataUrl, ritrattoValido, testoPeso } from '../src/ritratto.js';
import { nuoveScelte, normalizza, serializza, deserializzaPersonaggio } from '../src/character.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

// Ritratto del personaggio (scelte.ritratto): ridimensionamento, peso, export e import
const { dati } = await datiReali();

test('ridimensionamento: lato lungo al massimo 600 px, proporzioni conservate, mai ingrandire', () => {
  assert.deepEqual(dimensioniRitratto(4000, 3000), { larghezza: 600, altezza: 450 });
  assert.deepEqual(dimensioniRitratto(3000, 4000), { larghezza: 450, altezza: 600 });
  assert.deepEqual(dimensioniRitratto(1200, 1200), { larghezza: 600, altezza: 600 });
  assert.deepEqual(dimensioniRitratto(400, 300), { larghezza: 400, altezza: 300 }); // già piccola
  assert.deepEqual(dimensioniRitratto(6000, 10), { larghezza: 600, altezza: 1 }); // mai 0
  assert.deepEqual(dimensioniRitratto(1000, 750, 100), { larghezza: 100, altezza: 75 });
  assert.throws(() => dimensioniRitratto(0, 100), /non valide/);
});

// data URL di prova: n byte di immagine «finta» in base64
const dataUrl = (n, tipo = 'jpeg') => `data:image/${tipo};base64,${Buffer.alloc(n, 7).toString('base64')}`;

test('peso del data URL e limite di 200 KB', () => {
  for (const n of [1, 2, 3, 1000, 12345]) assert.equal(byteDataUrl(dataUrl(n)), n);
  assert.equal(RITRATTO.byteMassimi, 200 * 1024);
  assert.ok(ritrattoValido(dataUrl(RITRATTO.byteMassimi)));
  assert.ok(!ritrattoValido(dataUrl(RITRATTO.byteMassimi + 1)));
  assert.ok(ritrattoValido(dataUrl(500, 'png')));
  assert.ok(!ritrattoValido('data:image/gif;base64,R0lGOD'));
  assert.ok(!ritrattoValido('https://esempio.it/foto.jpg'));
  assert.equal(testoPeso(84 * 1024), '84 KB');
});

test('serializzazione con ritratto: export e import lo conservano; uno non valido si toglie con avviso', () => {
  const ritratto = dataUrl(50 * 1024);
  const { scelte } = normalizza({ ...MISHIMA_AGENTE, ritratto }, dati);
  assert.equal(scelte.ritratto, ritratto);
  const testo = serializza(scelte, { livelli: [], sessione: null });
  assert.equal(JSON.parse(testo).scelte.ritratto, ritratto);
  const { creazione } = deserializzaPersonaggio(testo);
  assert.equal(normalizza(creazione, dati).scelte.ritratto, ritratto);
  // senza ritratto il campo non compare nel file, e rileggendolo vale null
  assert.equal('ritratto' in JSON.parse(serializza(nuoveScelte())).scelte, false);
  assert.equal(normalizza(deserializzaPersonaggio(serializza(nuoveScelte())).creazione, dati).scelte.ritratto, null);
  const troppo = normalizza({ ...MISHIMA_AGENTE, ritratto: dataUrl(RITRATTO.byteMassimi + 10) }, dati);
  assert.equal(troppo.scelte.ritratto, null);
  assert.ok(troppo.avvisi.some((a) => /Ritratto non valido/.test(a)));
});

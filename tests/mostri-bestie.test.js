// Blocco «Bestie e predatori» (cap. 8 del Manuale dei Mostri v0.13): i dieci profili prestabiliti in
// esempi/nemici/mostri/ sono validi, con Spazio e portata dai dati, GS/PX informativo e gli attacchi senza
// danni (Getto di seta) come capacità. La validità generale è già nel test della Covata; qui le specificità.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const BESTIE = ['lupo', 'lupo-feroce', 'orso-bruno', 'cinghiale-gigante', 'leone', 'iena-gigante',
  'ragno-gigante', 'scorpione-gigante', 'serpente-costrittore-gigante', 'coccodrillo-gigante'];

test('le dieci Bestie ci sono, sono valide e vengono dal cap. 8', () => {
  for (const id of BESTIE) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.13.*Bestie e predatori/);
  }
});

test('Spazio dai dati: quadrati nel campo, non quadrati nelle note con A.167', () => {
  assert.equal(leggi('lupo').spazio, '1 Q');
  assert.equal(leggi('orso-bruno').spazio, '2 × 2 Q');
  assert.equal(leggi('serpente-costrittore-gigante').spazio, '3 × 3 Q');
  // 2 × 1 Q e 3 × 2 Q non sono ammessi dal formato (A.126): campo vuoto, ingombro nelle note (A.167)
  for (const [id, ingombro] of [['lupo-feroce', '2 × 1 Q'], ['leone', '2 × 1 Q'],
    ['iena-gigante', '2 × 1 Q'], ['coccodrillo-gigante', '3 × 2 Q']]) {
    const n = leggi(id);
    assert.equal(n.spazio, undefined, `${id} senza spazio quadrato`);
    // Taglia Grande solo se l’ingombro contiene 2 × 2 Q (formato dei nemici): il 3 × 2 Q sì, il 2 × 1 Q no
    assert.equal(n.taglia, ingombro === '3 × 2 Q' ? 'grande' : undefined, `${id} taglia`);
    assert.ok(n.note.includes(ingombro) && n.note.includes('A.167'), `${id} ingombro e A.167 nelle note`);
  }
});

test('portata degli attacchi dai dati (Morso del Serpente 2 Q)', () => {
  const serp = leggi('serpente-costrittore-gigante');
  assert.equal(serp.attacchi.find((a) => a.nome === 'Morso').portata_q, 2);
  assert.equal(serp.attacchi.find((a) => a.nome === 'Costrizione').portata_q, 1);
  assert.equal(leggi('coccodrillo-gigante').attacchi.find((a) => a.nome === 'Coda').portata_q, 2);
});

test('GS/PX informativo per ogni bestia, non calcolato', () => {
  for (const id of BESTIE) {
    const g = leggi(id).gs_px;
    assert.ok(g && typeof g.gs === 'string' && Number.isInteger(g.px) && g.per_pg === 4, `${id} GS/PX`);
  }
  assert.deepEqual(leggi('coccodrillo-gigante').gs_px, { gs: 'Eroe', px: 70, per_pg: 4 });
  // le bestie non combattenti non esistono in questo blocco: px sempre > 0
  assert.ok(BESTIE.every((id) => leggi(id).gs_px.px > 0));
});

test('il Getto di seta del Ragno è una capacità (non infligge danni), non un attacco', () => {
  const ragno = leggi('ragno-gigante');
  assert.ok(!ragno.attacchi.some((a) => a.nome === 'Getto di seta'), 'non fra gli attacchi');
  const getto = ragno.capacita.find((c) => c.nome === 'Getto di seta');
  assert.ok(getto, 'è fra le capacità');
  assert.match(getto.effetto, /Immobilizzato/);
  assert.deepEqual(getto.azioni, { principali: 1 });
  // l’unico attacco con danno è il Morso
  assert.deepEqual(ragno.attacchi.map((a) => a.nome), ['Morso']);
});

test('le bestie non sono Covata: niente Ignifugo né tratti del nido', () => {
  for (const id of BESTIE) {
    const n = leggi(id);
    assert.equal(n.contromisure, undefined, `${id} senza contromisure`);
    assert.ok(!n.capacita.some((c) => c.nome === 'Resistenza al fuoco'), `${id} senza tratto Covata`);
  }
});

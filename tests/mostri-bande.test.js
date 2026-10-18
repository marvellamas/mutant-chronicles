// Blocco «Bande e grandi avversari» (cap. 8 del Manuale dei Mostri v0.16): i dieci profili prestabiliti in
// esempi/nemici/mostri/ sono validi, con Spazio e portata dai dati, GS/PX informativo e le scelte ricorrenti
// sugli umanoidi (AR con scudo, nomi d'Abilità del catalogo, armi a distanza come attacchi distanza).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const BANDE = ['goblin', 'hobgoblin', 'bugbear', 'coboldo', 'orco', 'gnoll', 'ogre', 'ettin', 'minotauro', 'troll'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of BANDE) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0\.16.*Bande e grandi avversari/);
  }
});

test('Spazio quadrato dai dati; i grandi sono 2 × 2 Q', () => {
  for (const id of ['goblin', 'hobgoblin', 'bugbear', 'coboldo', 'orco', 'gnoll']) {
    assert.equal(leggi(id).spazio, '1 Q', `${id} 1 Q`);
    assert.equal(leggi(id).taglia, undefined, `${id} taglia normale`);
  }
  for (const id of ['ogre', 'ettin', 'minotauro', 'troll']) {
    assert.equal(leggi(id).spazio, '2 × 2 Q', `${id} 2×2`);
    assert.equal(leggi(id).taglia, undefined, `${id} Grande`);
  }
});

test('GS/PX informativo e non calcolato', () => {
  assert.deepEqual(leggi('goblin').gs_px, { gs: 'Principiante', px: 11, per_pg: 4 });
  assert.deepEqual(leggi('troll').gs_px, { gs: 'Eroe', px: 70, per_pg: 4 });
  for (const id of BANDE) {
    const g = leggi(id).gs_px;
    assert.ok(g && typeof g.gs === 'string' && Number.isInteger(g.px) && g.px > 0, `${id} GS/PX`);
  }
});

test('nomi d’Abilità del catalogo (Mischia→Armi da mischia, Guerra→Armi da guerra, Lancio→Armi da lancio)', () => {
  const nomiValidi = new Set(dati.abilita.abilita.map((a) => a.nome));
  for (const id of BANDE) {
    for (const a of leggi(id).abilita) assert.ok(nomiValidi.has(a.nome), `${id}: Abilità «${a.nome}» del catalogo`);
  }
  assert.ok(leggi('goblin').abilita.some((a) => a.nome === 'Armi da mischia'));
  assert.ok(leggi('hobgoblin').abilita.some((a) => a.nome === 'Armi da guerra'));
});

test('armi a distanza «massimo N Q» come attacchi di tipo distanza con gittata e modalità', () => {
  const arco = leggi('hobgoblin').attacchi.find((a) => a.nome === 'Arco da guerra');
  assert.equal(arco.tipo, 'distanza');
  assert.equal(arco.gittata_q, 100);
  assert.deepEqual(arco.modalita, ['S', 'TR']);
  const balestra = leggi('goblin').attacchi.find((a) => a.nome === 'Balestra piccola');
  assert.deepEqual([balestra.tipo, balestra.gittata_q, balestra.modalita], ['distanza', 30, ['S']]);
  // il giavellotto scagliato è un attacco distanza, quello a mano è ravvicinato
  const bug = leggi('bugbear');
  assert.equal(bug.attacchi.find((a) => a.nome === 'Giavellotto scagliato').tipo, 'distanza');
  assert.equal(bug.attacchi.find((a) => a.nome === 'Giavellotto a mano').tipo, 'ravvicinato');
});

test('AR con scudo nel campo, senza scudo e Parata/Schivata nelle note; attacchi Naturali AC 1', () => {
  // Hobgoblin: AR 5 con scudo (Parata 11), note con «3 senza» e «Schivata/Elusione 10»
  const hob = leggi('hobgoblin');
  assert.equal(hob.ar.totale, 5);
  assert.equal(hob.difese, 11);
  assert.ok(/3 senza/.test(hob.note) && /Schivata\/Elusione 10/.test(hob.note));
  // Goblin: AR 2 con scudo, nota 1 senza
  assert.equal(leggi('goblin').ar.totale, 2);
  assert.match(leggi('goblin').note, /AR 1 senza scudo/);
  // natura Naturale e AC 1 per ogni attacco (Regole del blocco)
  for (const id of BANDE) for (const a of leggi(id).attacchi) {
    assert.equal(a.natura, 'Naturale', `${id}/${a.nome} Naturale`);
    assert.equal(a.ac, 1, `${id}/${a.nome} AC 1`);
  }
});

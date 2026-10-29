// Blocco «Capi e varianti dei popoli guerrieri» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi, AR con
// scudo nel campo, Parata come Difese, Disciplina e Attacco coordinato degli hobgoblin, Frenesia gnoll, Urlo di
// guerra, repertorio chiuso dell'Occhio, GS «Elite», Spazio e Taglia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));
const cap = (id, nome) => leggi(id).capacita.find((c) => c.nome === nome);

const CAPI = ['capo-goblin', 'capitano-hobgoblin', 'signore-della-guerra-hobgoblin', 'capobanda-bugbear', 'coboldo-alato',
  'capobranco-gnoll', 'zanna-di-yeenoghu', 'capoguerra-orco', 'occhio-di-gruumsh', 'mezzogre'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of CAPI) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /Manuale dei Mostri v0.(23|46).*Capi e varianti dei popoli guerrieri/);
    assert.ok(Number.isInteger(n.salvezze.volonta) && Number.isInteger(n.pm), `${id} Volontà e PM`);
  }
});

test('Spazio: 1 Q per tutti, Mezzogre 2 × 2 Q; nessuna Taglia dedotta dall’ingombro (A.167)', () => {
  for (const id of CAPI.filter((x) => x !== 'mezzogre')) assert.equal(leggi(id).spazio, '1 Q', id);
  assert.equal(leggi('mezzogre').spazio, '2 × 2 Q');
  for (const id of CAPI) assert.equal(leggi(id).taglia, undefined, id);
});

test('AR con scudo nel campo e senza nelle note; Difese = Parata dove il manuale la dà', () => {
  const ar = { 'capo-goblin': [2, /AR 2 con Scudo piccolo, 1 senza/], 'signore-della-guerra-hobgoblin': [7, /AR 7 con Scudo medio, 5 senza/], 'capobanda-bugbear': [4, /AR 4 con Scudo piccolo, 3 senza/], 'occhio-di-gruumsh': [5, /AR 5 con Scudo medio, 3 senza/] };
  for (const [id, [valore, nota]] of Object.entries(ar)) { assert.equal(leggi(id).ar.totale, valore, id); assert.match(leggi(id).note, nota, id); }
  const parata = { 'capitano-hobgoblin': 12, 'signore-della-guerra-hobgoblin': 14, 'capobanda-bugbear': 12, 'capobranco-gnoll': 11, 'capoguerra-orco': 12, 'occhio-di-gruumsh': 11 };
  for (const [id, p] of Object.entries(parata)) { assert.equal(leggi(id).difese, p, id); assert.match(leggi(id).note, /Schivata \/ Elusione \d+/, id); }
});

test('hobgoblin: Disciplina (1 AzP, una volta per scontro, +1 a 4 alleati) e Attacco coordinato +3 non inclusi nei danni', () => {
  for (const id of ['capitano-hobgoblin', 'signore-della-guerra-hobgoblin']) {
    const d = cap(id, 'Disciplina hobgoblin');
    assert.deepEqual([d.azioni, d.usi], [{ principali: 1 }, { quanti: 1, per: 'scontro' }], id);
    assert.match(d.effetto, /quattro alleati/);
    assert.match(cap(id, 'Attacco coordinato').effetto, /\+3 danni/);
  }
  assert.equal(leggi('signore-della-guerra-hobgoblin').azioni.principali, 3);
  assert.deepEqual(leggi('signore-della-guerra-hobgoblin').gs_px, { gs: 'Elite', px: 77, per_pg: 4 });
  assert.equal(leggi('signore-della-guerra-hobgoblin').movimento.passo, 4);
  assert.match(cap('signore-della-guerra-hobgoblin', 'Urto di Scudo').effetto, /senza danno/);
});

test('gnoll: Frenesia (AzP aggiuntiva solo per un Morso), Incitare la Frenesia (2 PM), Tossina della Zanna una volta per Round', () => {
  for (const id of ['capobranco-gnoll', 'zanna-di-yeenoghu']) {
    assert.match(cap(id, 'Frenesia gnoll').effetto, /1 AzP aggiuntiva utilizzabile soltanto per un Morso/);
    assert.match(leggi(id).azioni.eccezioni, /Frenesia/);
  }
  const i = cap('capobranco-gnoll', 'Incitare la Frenesia');
  assert.deepEqual([i.azioni, i.risorsa], [{ principali: 1 }, '2 PM']);
  assert.equal(leggi('zanna-di-yeenoghu').azioni.principali, 3);
  assert.match(cap('zanna-di-yeenoghu', 'Tossina').effetto, /1d6 Naturale da veleno immediato/);
  assert.deepEqual(leggi('capobranco-gnoll').attacchi.map((a) => a.nome), ['Arma inastata pesante', 'Morso', 'Arco da guerra']);
  assert.equal(leggi('capobranco-gnoll').attacchi[2].gittata_q, 100);
});

test('orchi: Capoguerra con Urlo di guerra (una volta per scontro, 2 PM, +2 al VA) e Avanzata; Occhio con repertorio chiuso di tre incantesimi', () => {
  const u = cap('capoguerra-orco', 'Urlo di guerra');
  assert.deepEqual([u.azioni, u.risorsa, u.usi], [{ principali: 1 }, '2 PM', { quanti: 1, per: 'scontro' }]);
  assert.match(u.effetto, /\+2 al VA dei tiri per colpire/);
  assert.deepEqual(leggi('capoguerra-orco').attacchi.map((a) => [a.nome, a.danno]), [['Ascia bipenne', '2d6+5'], ['Lancia a una mano', '1d6+5'], ['Lancia a due mani', '1d6+7']]);
  const o = leggi('occhio-di-gruumsh');
  for (const n of ['Benedizione 3', 'Comando 3', 'Dardo Spirituale 3']) assert.equal(cap('occhio-di-gruumsh', n).risorsa, '3 PM', n);
  assert.match(cap('occhio-di-gruumsh', 'Repertorio e lancio').effetto, /repertorio chiuso/);
  assert.equal(o.pm, 18);
  assert.equal(o.azioni.principali, 1);
  assert.equal(o.abilita.find((a) => a.nome === 'Potere').va, 12);
});

test('goblin e bugbear: Protezione opportunista, Sgusciare, Agguato; Coboldo alato che vola; Mezzogre con un attacco per Round', () => {
  assert.deepEqual(cap('capo-goblin', 'Protezione opportunista').azioni, { principali: 1 });
  assert.ok(cap('capo-goblin', 'Sgusciare'));
  assert.deepEqual(cap('capobanda-bugbear', 'Agguato').usi, { quanti: 1, per: 'scontro' });
  assert.match(cap('capobanda-bugbear', 'Tenacia').effetto, /\+2 alla sola PS/);
  assert.equal(leggi('coboldo-alato').movimento.volo, 6);
  assert.equal(leggi('coboldo-alato').attacchi.find((a) => a.nome === 'Pietra lasciata cadere').gittata_q, 6);
  assert.match(cap('mezzogre', 'Dotazione').effetto, /Al massimo un attacco per Round/);
  assert.deepEqual(leggi('coboldo-alato').gs_px, { gs: 'Principiante', px: 11, per_pg: 4 });
});

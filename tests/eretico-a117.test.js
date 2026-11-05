// Lotto 175, A.117 (Davide, 03/11/2026): «Manteniamo ai gradi Semplice e Medio il profilo umano senza Doni automatici,
// confermando l’eccezione «più fragile del grado». […] Il nome e la corruzione non attribuiscono automaticamente poteri,
// danni Magici o altre capacità. Eventuali Doni, mutazioni o dotazioni superiori vengono assegnati esplicitamente dal
// Direttore e riportati nel singolo profilo.» Prima del lotto 175 «Crea nemico» dava ai due gradi il modulo «Posseduto».
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { scelteCreatura, profiloNemico } from '../src/crea-nemico.js';
import { ECCEZIONI } from '../tools/taratura_bestiario.mjs';

const { dati } = await datiReali();
const umani = Object.fromEntries(['recluta', 'veterano', 'elite'].map((x) => [`eretico-${x}`, JSON.parse(readFileSync(new URL(`../esempi/nemici/umani/eretico-${x}.json`, import.meta.url), 'utf8'))]));
const eretico = (grado, boss = false) => profiloNemico(scelteCreatura('eretico-corrotto', grado, { boss }, dati), dati, { umani }).nemico;
const OSCURI = ['Presenza terrificante', 'Sussurro continuo', 'Sguardo del vuoto', 'Grido dell’Oscura Simmetria', 'Esposizione alla Corruzione'];

test('Semplice e Medio: profilo umano, nessun Dono, nessun danno Magico, nessuna AR magica', () => {
  for (const g of ['semplice', 'medio']) {
    assert.equal(scelteCreatura('eretico-corrotto', g, {}, dati).corrotto, null, `${g}: nessun modulo Corrotto automatico`);
    const n = eretico(g);
    assert.equal(n.ar.magica, 0, g);
    assert.ok(n.attacchi.every((a) => a.natura === 'Naturale'), `${g}: nessun danno Magico`);
    assert.deepEqual((n.capacita ?? []).map((c) => c.nome).filter((x) => OSCURI.includes(x)), [], `${g}: nessun Dono`);
  }
  // resta l'eccezione dichiarata nella taratura
  assert.match(ECCEZIONI['eretico-corrotto'], /più fragile del grado/);
});

test('Minore e Boss: non toccati dalla risposta (restano Toccato e Consacrato, domanda A.258)', () => {
  assert.equal(scelteCreatura('eretico-corrotto', 'minore', {}, dati).corrotto.livello, 'toccato');
  assert.equal(scelteCreatura('eretico-corrotto', 'medio', { boss: true }, dati).corrotto.livello, 'consacrato');
  assert.ok(eretico('medio', true).capacita.some((c) => c.nome === 'Sguardo del vuoto'));
});

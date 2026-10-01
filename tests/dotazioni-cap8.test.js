// Equipaggiamento 0.5, cap. 8 «Cataloghi e dotazioni iniziali» (lotto 4): il capitolo riassume il
// Giocatore §2.16 senza cataloghi propri; ogni sua regola deve corrispondere ai dati e al motore
// (tools/lotti/lotto_equipaggiamento_08.mjs → controlliCap8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { controlliCap8, FRASI_CAP8 } from '../tools/lotti/lotto_equipaggiamento_08.mjs';
import { normalizza as norm, testoManuali } from '../tools/verifica_frasi.mjs';
import { vociDotazione, contiDotazione, armamentiCedibili, creditiIniziali, acquistabili } from '../src/dotazioni.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const tiro = (valore) => ({ valore, origine: 'manuale' });

test('cap. 8: ogni regola corrisponde a dati e motore; le frasi sono nel Doc', () => {
  const esiti = controlliCap8(dati);
  assert.deepEqual(esiti.filter((e) => !e.ok).map((e) => `${e.paragrafo} ${e.regola}: ${e.dettaglio}`), []);
  assert.equal(esiti.length, 7);
  const doc = testoManuali();
  assert.deepEqual(FRASI_CAP8.filter((f) => !doc.includes(norm(f))), []);
  assert.match(dati.regole.dotazioni_iniziali.paragrafo, /Equipaggiamento 0\.5, cap\. 8/);
});

test('cap. 8 nel wizard: crediti 1.200–2.200, cessione al 100%, Medico e Paramedico senza naniti né postazioni', () => {
  assert.deepEqual([creditiIniziali(tiro(2), dati), creditiIniziali(tiro(12), dati)], [1200, 2200]);
  // §8.1: l'arma ceduta vale il 100% del prezzo del modello assegnato (Pistola semiautomatica)
  const d = { opzioni: { arma_da_fuoco: 'armi_distanza:pistola-semiautomatica', arma_da_mischia: 'armi:coltello' }, sotto: {}, crediti: tiro(7), acquisti: [] };
  const cedibili = armamentiCedibili(d, 'Agente', 'Freelance', dati);
  const pistola = cedibili.find((x) => x.rif === 'armi_distanza:pistola-semiautomatica');
  assert.equal(pistola.valore, dati.equipaggiamento.file.armi_distanza.oggetti.find((o) => o.id === 'pistola-semiautomatica').costo);
  // §8.2: naniti e postazioni non sono dotazioni (Medico e Paramedico tengono le loro), ma si possono comprare
  for (const classe of ['Medico', 'Paramedico']) {
    const rifs = vociDotazione({ opzioni: {} }, classe, 'Freelance', dati).map((v) => v.rif ?? '');
    assert.ok(rifs.includes('sanitario:kit-di-pronto-soccorso-professionale'), classe);
    assert.ok(!rifs.some((r) => /naniti|postazione-.*-(fissa|mobile)/.test(r)), classe);
  }
  const comprabili = acquistabili('Freelance', dati).map((o) => o.id);
  assert.ok(comprabili.includes('naniti-medici') && comprabili.includes('postazione-semiautomatica-fissa'));
  // il budget resta quello dei crediti: una postazione non si paga con 1.700 crediti
  const conti = contiDotazione({ ...d, acquisti: [{ rif: 'sanitario:naniti-medici', cede: [] }] }, 'Agente', 'Freelance', dati);
  assert.equal(conti.saldo, 1700 - 5000);
});

// A.35 (confermata da Davide l'08/10/2026, decisione 155): l'eccedenza del valore degli armamenti ceduti torna in crediti
// (data/dotazioni.json → scambio.eccedenza «restituita»; src/dotazioni.js → contiDotazione, saldoIniziale).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contiDotazione, saldoIniziale, applicaDotazione, mancanzeDotazione, vociDotazione } from '../src/dotazioni.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';

const { dati } = await datiReali();
const tiro = (valore) => ({ valore, origine: 'manuale' });
const AGENTE = {
  opzioni: { arma_da_fuoco: 'armi_distanza:pistola-semiautomatica', arma_da_mischia: 'armi:coltello' },
  sotto: {}, crediti: tiro(7), acquisti: [],
};

test('A.35: i dati dicono che l’eccedenza è restituita, con la decisione', () => {
  assert.equal(dati.dotazioni.scambio.eccedenza, 'restituita');
  assert.match(dati.dotazioni.scambio.decisione, /^A\.35/);
});

test('A.35: eccedenza restituita (Pistola semiautomatica da 1.300 ceduta per un Martello da 80: +1.220 cr)', () => {
  const d = { ...AGENTE, acquisti: [{ rif: 'armi:martello', cede: ['arma_da_fuoco'] }] };
  const c = contiDotazione(d, 'Agente', 'Freelance', dati);
  assert.equal(c.iniziali, 1700);
  assert.deepEqual([c.acquisti[0].valoreCeduto, c.acquisti[0].conguaglio, c.acquisti[0].eccedenza, c.acquisti[0].restituito], [1300, 0, 1220, 1220]);
  assert.equal(c.restituito, 1220);
  assert.equal(c.saldo, 1700 + 1220);
  assert.deepEqual(mancanzeDotazione(d, 'Agente', 'Freelance', dati).filter((m) => /Crediti/.test(m)), []);
});

test('A.35: nessuna eccedenza quando si paga un conguaglio; più acquisti si sommano', () => {
  const d = { ...AGENTE, acquisti: [{ rif: 'armi_distanza:pistola-pesante', cede: ['arma_da_fuoco'] }] };
  const c = contiDotazione(d, 'Agente', 'Freelance', dati);
  assert.deepEqual([c.acquisti[0].conguaglio, c.acquisti[0].restituito, c.restituito, c.saldo], [800, 0, 0, 900]);
  // con l'eccedenza di un acquisto si paga un acquisto senza cessione
  const due = { ...AGENTE, acquisti: [{ rif: 'armi:martello', cede: ['arma_da_fuoco'] }, { rif: 'armi:randello', cede: [] }] };
  assert.equal(contiDotazione(due, 'Agente', 'Freelance', dati).saldo, 1700 + 1220 - 40);
});

test('A.35 con «Modifica creazione»: rifacendo gli acquisti il saldo iniziale si ricalcola con l’eccedenza', () => {
  const base = { classe: 'Agente', corporazione: 'Freelance' };
  const prima = { ...base, dotazione: { ...AGENTE, acquisti: [{ rif: 'armi_distanza:pistola-pesante', cede: ['arma_da_fuoco'] }] } };
  const conPrima = { ...prima, equipaggiamento: applicaDotazione([], vociDotazione(prima.dotazione, 'Agente', 'Freelance', dati)) };
  assert.equal(saldoIniziale(conPrima, dati), 900);
  const dopo = { ...base, dotazione: { ...AGENTE, acquisti: [{ rif: 'armi:martello', cede: ['arma_da_fuoco'] }] } };
  const conDopo = { ...dopo, equipaggiamento: applicaDotazione(conPrima.equipaggiamento, vociDotazione(dopo.dotazione, 'Agente', 'Freelance', dati)) };
  assert.equal(saldoIniziale(conDopo, dati), 2920);
});

test('A.35: senza la regola (eccedenza «persa») il resto non torna; il validatore controlla il valore', () => {
  const d2 = copia(dati);
  d2.dotazioni.scambio.eccedenza = 'persa';
  const c = contiDotazione({ ...AGENTE, acquisti: [{ rif: 'armi:martello', cede: ['arma_da_fuoco'] }] }, 'Agente', 'Freelance', d2);
  assert.deepEqual([c.restituito, c.saldo], [0, 1700]);
  d2.dotazioni.scambio.eccedenza = 'boh';
  assert.ok(validaDati(d2).some((e) => /scambio\.eccedenza/.test(JSON.stringify(e))));
});

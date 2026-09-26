import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contenutoTooltip, testoTooltip, schedaIncantesimo, rigaAlLivello } from '../src/descrizioni.js';
import { avvisiDati, validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';

const { dati, avvisi } = await datiReali();

// --- tooltip: Abilità ---------------------------------------------------------------------

test('tooltip Abilità: nome, Caratteristica e categoria, ambito e descrizione §4.4', () => {
  const c = contenutoTooltip('abilita', 'Furtività', dati);
  assert.equal(c.titolo, 'Furtività');
  assert.equal(c.sottotitolo, 'Destrezza (DES) · Operative');
  const t = testoTooltip('abilita', 'Furtività', dati);
  assert.match(t, /Ambito: Nascondersi, infiltrarsi/);
  assert.match(t, /Comprende nascondersi, muoversi silenziosamente/);
  assert.equal(c.apriScheda, false);
});

test('tooltip Abilità: le Mistiche hanno descrizioni su più paragrafi', () => {
  const t = testoTooltip('abilita', 'Potere', dati);
  assert.match(t, /Potere \(Saggezza\) rappresenta la capacità/);
  assert.match(t, /Meditare\. Potere permette/);
});

// --- tooltip: Caratteristica --------------------------------------------------------------

test('tooltip Caratteristica: descrizione del master, Abilità collegate e Salvezza', () => {
  const t = testoTooltip('caratteristica', 'DES', dati);
  assert.match(t, /^Destrezza \(DES\)/);
  // testo del master, parola per parola (docs/risposte-master.md, 26/09/2026)
  assert.match(t, /Esprime agilità, coordinazione e precisione dei movimenti\./);
  assert.match(t, /Abilità: Armi da lancio, Armi leggere, Armi da mischia, Difese, Furtività/);
  assert.match(t, /Salvezza: Riflessi/);
});

test('tooltip Caratteristica: Volontà è la Salvezza del Carisma (master, 26/09/2026)', () => {
  assert.match(testoTooltip('caratteristica', 'CAR', dati), /Salvezza: Volontà/);
  assert.doesNotMatch(testoTooltip('caratteristica', 'INT', dati), /Salvezza: Volontà/);
  assert.equal(dati.caratteristiche.salvezze.find((s) => s.id === 'volonta').caratteristica, 'CAR');
});

test('tooltip Caratteristica: Costituzione non ha Abilità ma ha Tempra', () => {
  const t = testoTooltip('caratteristica', 'COS', dati);
  assert.match(t, /Nessuna Abilità usa questa Caratteristica/);
  assert.match(t, /Salvezza: Tempra/);
});

test('tooltip Caratteristica: se Davide scrive la descrizione, compare quella', () => {
  const d = copia(dati);
  d.caratteristiche.caratteristiche.find((c) => c.sigla === 'FOR').descrizione = 'Potenza fisica.';
  assert.match(testoTooltip('caratteristica', 'FOR', d), /^Forza \(FOR\)\nPotenza fisica\./);
});

// --- tooltip: Incantesimo -----------------------------------------------------------------

test('tooltip Incantesimo: intestazione, lancio, descrizione e sola riga del livello base', () => {
  const c = contenutoTooltip('incantesimo', 'Colpo Elementale', dati);
  assert.match(c.sottotitolo, /^Scheda 13\.1 • Macrofamiglia Fisica • Specializzazione Elementi/);
  assert.match(c.sezioni[0].testo, /^Lancio: 1 AP\./);
  assert.match(c.sezioni[1].testo, /^Un colpo concentrato di energia elementale/);
  assert.equal(c.tabella.righe.length, 1);
  assert.deepEqual(c.tabella.righe[0], {
    Livello: '1', PM: '1', 'Gittata Q': '6', Colpi: '1', 'Danno per colpo': '1d6', Natura: 'Naturale', 'Elementi max': '1', 'Mod PS': '0',
  });
  assert.equal(c.apriScheda, true);
  assert.match(testoTooltip('incantesimo', 'Colpo Elementale', dati), /Apri scheda completa$/);
});

test('tooltip Incantesimo: livello base 3 con prima colonna «Livello e PM»', () => {
  const i = dati.incantesimi.incantesimi.find((x) => x.nome === 'Armatura Elementale');
  assert.equal(i.livello_base, 3);
  assert.equal(Object.values(rigaAlLivello(i, 3))[0], '3');
});

test('ogni incantesimo ha la riga del proprio livello base', () => {
  for (const i of dati.incantesimi.incantesimi) {
    assert.ok(contenutoTooltip('incantesimo', i.nome, dati).tabella, `${i.scheda} ${i.nome}`);
  }
});

test('scheda completa: tabella intera, altre tabelle e regole', () => {
  const s = schedaIncantesimo('Controllo Elementale', dati);
  assert.equal(s.tabelle[0].righe.length, 5);
  assert.equal(s.tabelle[0].evidenzia, '1');
  assert.equal(s.tabelle[1].righe.length, 18); // Eco Elementale, divisa fra due pagine nel PDF
  assert.match(s.regole, /Anticipazione:/);
  assert.equal(s.riferimento, 'Manuale della Magia, scheda 13.2, p. 25');
});

test('id sconosciuti: nessun contenuto, nessuna eccezione', () => {
  assert.equal(contenutoTooltip('abilita', 'Cucina', dati), null);
  assert.equal(contenutoTooltip('incantesimo', 'Palla di Fuoco', dati), null);
  assert.equal(contenutoTooltip('boh', 'x', dati), null);
  assert.equal(testoTooltip('abilita', 'Cucina', dati), '');
});

// --- validatore sulle descrizioni ---------------------------------------------------------

test('dati reali: le Caratteristiche hanno tutte la descrizione, nessun avviso', () => {
  assert.deepEqual(validaDati(dati), []);
  assert.deepEqual(avvisi.filter((a) => a.file === 'caratteristiche.json'), []);
  assert.ok(dati.caratteristiche.caratteristiche.every((c) => c.descrizione.length > 100));
});

test('validatore: Abilità o incantesimo senza descrizione sono errori', () => {
  const d = copia(dati);
  d.abilita.abilita[0].descrizione = '';
  delete d.incantesimi.incantesimi[5].descrizione;
  const e = validaDati(d);
  assert.ok(e.some((x) => x.file === 'abilita.json' && /descrizione/.test(x.problema)));
  assert.ok(e.some((x) => x.file === 'incantesimi.json' && x.chiave.includes(d.incantesimi.incantesimi[5].nome)));
});

test('validatore: Caratteristica senza descrizione è un errore, con TODO un avviso', () => {
  const d = copia(dati);
  delete d.caratteristiche.caratteristiche[0].descrizione;
  assert.ok(validaDati(d).some((x) => x.chiave.includes('(FOR).descrizione')));
  d.caratteristiche.caratteristiche[0].descrizione = 'TODO(Davide)';
  assert.deepEqual(validaDati(d), []);
  assert.ok(avvisiDati(d).some((x) => x.chiave.includes('(FOR)')));
});

test('validatore: tabella delle versioni senza il livello base o con colonne diverse', () => {
  const d = copia(dati);
  const i = d.incantesimi.incantesimi[0];
  i.versioni = i.versioni.filter((r) => r.Livello !== '1');
  i.versioni[1] = { ...i.versioni[1], Extra: 'x' };
  const e = validaDati(d).filter((x) => x.chiave.includes('Colpo Elementale'));
  assert.ok(e.some((x) => /livello base 1/.test(x.problema)));
  assert.ok(e.some((x) => /colonne diverse/.test(x.problema)));
  // una tabella non ricostruita si può marcare TODO: avviso, non errore
  i.versioni = 'TODO(Davide)';
  assert.deepEqual(validaDati(d).filter((x) => x.chiave.includes('Colpo Elementale')), []);
  assert.ok(avvisiDati(d).some((x) => x.chiave.includes('Colpo Elementale')));
});

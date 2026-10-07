// SS, foglio 4 (Inventario) e piè di pagina: sigle della Qualità dai dati (regole.json → integrita.sigle_qualita),
// Costo e Peso senza unità (sono nell'intestazione), versioni dei manuali una volta ciascuna, la più recente.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versioniCompatte, siglaQualita, preparaStampa, testoPiede } from '../src/stampa.js';
import { versioniPersonaggio } from '../src/rules.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();

test('piè di pagina: ogni manuale una volta, con la versione più recente (numero, poi data del Doc)', () => {
  assert.equal(versioniCompatte([
    'Giocatore 0.43', 'Giocatore 0.45 (Google Doc del 01/10/2026, 21:25 UTC)', 'Giocatore 0.43 + Doc del 29/09/2026',
    'Giocatore 0.43; Magia 1.1 + Google Doc del 27/09/2026', 'Giocatore 0.45 (Google Doc del 03/10/2026, 19:16 UTC)',
    'Giocatore 0.45; Magia 1.3; Equipaggiamento 0.1; E&L del 03/10/2026', 'Giocatore 0.45 (Google Doc del 01/10/2026); E&L del 02/10/2026, decisioni 5–9 (A.73)',
    'Magia 1.3 (Google Doc del 01/10/2026, 21:50 UTC)', 'Armamenti 0.52',
  ]), 'Giocatore 0.45 (03/10/2026), Magia 1.3 (01/10/2026), Equipaggiamento 0.1, E&L del 03/10/2026, Armamenti 0.52');
  const reali = versioniCompatte(Object.values(versioniPersonaggio(dati)));
  for (const m of ['Giocatore', 'Magia', 'E&L']) assert.equal(reali.split(', ').filter((x) => x.startsWith(m)).length, 1, m);
  assert.match(testoPiede({ nome: 'Ada', livello: 3, versioni: reali }, { foglio: 4, pagina: 6, totale: 10 }), /^Ada · 3° livello · foglio 4 · pagina 6 di 10 · Dati: Giocatore 0\.46/); // Giocatore 0.46 del 06/10/2026
});

test('foglio 4: Qualità in sigla con la legenda dai dati, Costo e Peso senza unità', () => {
  assert.equal(siglaQualita('Non comune', dati), 'NC');
  assert.equal(siglaQualita('Scarsa', dati), 'SC');
  assert.equal(siglaQualita(null, dati), '—');
  const voce = (uid, rif, stato) => ({ uid, rif, stato, quantita: 1, note: '' });
  const st = preparaStampa({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [voce('a', 'armi:tonfa', 'pronta'), voce('b', 'impianti:potenziamento-visivo', 'installato')] }, livelli: [] }, dati);
  const inv = st.fogli.find((f) => f.id === 'inventario').dati;
  assert.deepEqual(inv.qualita.map((x) => x.sigla), ['SC', 'CO', 'NC', 'RA', 'MR', 'LE']);
  const righe = inv.sezioni.flatMap((s) => [...s.righe, ...(s.sottosezioni ?? []).flatMap((x) => x.righe)]);
  const tonfa = righe.find((r) => r.uid === 'a');
  assert.deepEqual([tonfa.costo, tonfa.qualita], ['90', 'CO']);
  const imp = righe.find((r) => r.uid === 'b');
  assert.deepEqual([imp.costo, imp.qualita, imp.peso], ['4.000', 'NC', 'corpo']);
});

test('validatore: una sigla per Qualità, brevi e diverse', () => {
  const d = copia(dati);
  d.regole.integrita.sigle_qualita = { ...d.regole.integrita.sigle_qualita, Rara: 'NC' };
  delete d.regole.integrita.sigle_qualita.Leggendaria;
  const e = validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n');
  assert.match(e, /integrita\.sigle_qualita: sigla di 1–3 maiuscole mancante per: Leggendaria/);
  assert.match(e, /integrita\.sigle_qualita: sigle ripetute/);
});

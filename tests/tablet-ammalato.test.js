// Tablet del 19/10/2026, punto 6: Ammalato non tocca le Prove Salvezza (A.119, risposta approvata da Davide: «tutte le
// Prove di Abilità, attacchi e Difese compresi; mai alle Prove Salvezza»). Il Manuale del Giocatore non nomina Ammalato:
// la regola è la A.119 (per-davide.md, sezione 7, «A.119 — Ammalato: intensità ed effetti nell'app»; decisione 127).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { costruisci, ESEMPIO_TECNICHE } from '../tools/genera_esempio_tecniche.mjs';
import { applicaCondizioni, condizioniAttive, penalitaStatiAbilita } from '../src/condizioni.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const { scheda } = costruisci(ESEMPIO_TECNICHE, dati);
const base = { statiAttivi: [], intensitaStati: {}, ferite: 0, affaticamento: 0, corruzione: 0 };
const effettivi = (sessione) => applicaCondizioni(structuredClone(scheda), sessione, dati);
const salvezze = (s) => Object.fromEntries(Object.entries(s.salvezze).map(([k, v]) => [k, v.effettivo]));

test('Ammalato, ogni intensità: le Prove Salvezza non cambiano, le Abilità sì', () => {
  const senza = effettivi(base);
  const penalita = [-1, -2, -4, -6, -8, -10];
  penalita.forEach((p, i) => {
    const con = effettivi({ ...base, statiAttivi: ['ammalato'], intensitaStati: { ammalato: i + 1 } });
    assert.deepEqual(salvezze(con), salvezze(senza), `intensità ${i + 1}: Salvezze invariate`);
    for (const id of Object.keys(con.salvezze)) {
      assert.ok(!(con.salvezze[id].scomposizione ?? []).some((v) => /Ammalato/.test(v.etichetta ?? '')), `${id}: nessuna riga «Ammalato» nel calcolo`);
    }
    const percezione = (s) => s.abilita.find((a) => a.nome === 'Percezione').effettivo;
    assert.equal(percezione(con) - percezione(senza), p, `intensità ${i + 1}: Abilità ${p}`);
  });
});

test('Ammalato: il dato dice «non alle Prove Salvezza» e l’effetto è solo sul VA', () => {
  const [c] = condizioniAttive({ ...base, statiAttivi: ['ammalato'], intensitaStati: { ammalato: 3 } }, dati);
  assert.deepEqual(c.effetto, { va: -4 });
  assert.equal(c.effetto.salvezze, undefined);
  const stato = dati.regole.stati.elenco.find((s) => s.id === 'ammalato');
  assert.match(stato.promemoria, /non alle Prove Salvezza/);
  assert.match(stato.sintesi_fonte, /A\.119/);
});

test('Ammalato su un nemico: penalità alle Abilità e alle Difese, nessuna alle Prove Salvezza', () => {
  assert.equal(penalitaStatiAbilita(['ammalato'], { ammalato: 3 }, 'Percezione', dati).totale, -4);
  assert.equal(penalitaStatiAbilita(['ammalato'], { ammalato: 3 }, 'Difese', dati).totale, -4);
  // il motore dei nemici non ha altra via per applicare Stati alle Salvezze
  const sorgente = readFileSync(new URL('../src/nemico-attacco.js', import.meta.url), 'utf8');
  assert.doesNotMatch(sorgente, /penalitaStati\w*\([^)]*[Ss]alvezz/);
});

test('Ammalato insieme a una Ferita: alle Salvezze arriva solo la Ferita (§5.14)', () => {
  const solo = effettivi({ ...base, ferite: 2 });
  const insieme = effettivi({ ...base, ferite: 2, statiAttivi: ['ammalato'], intensitaStati: { ammalato: 6 } });
  assert.deepEqual(salvezze(insieme), salvezze(solo));
});

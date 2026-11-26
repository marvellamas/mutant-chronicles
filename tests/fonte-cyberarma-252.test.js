import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { rigaAlimentazione } from '../src/cyberarma.js';
import { calcolaEquipaggiamento } from '../src/equipaggiamento.js';

// Lotto 252, parte D — **dove si leggono fonte e cariche della CyberArma.**
//
// Il collaudo di Davide, prova 02: «Nell'Inventario l'arma è integra (4/4 PI). Il dettaglio identifica il cristallo
// focalizzatore verde, non la fonte. In Artefatti compaiono solo la Batteria Matrice rossa e due Schegge verdi: non
// sono prova di cosa alimenti l'arma». Il cristallo dice il **colore**, non **con che cosa si accende**.
const { dati } = await datiReali();

test('LA CARTA DELL’ARMA DICE LA FONTE: PM personali, riserva di CM, NeC', () => {
  const pm = rigaAlimentazione({ rif: 'armi:cyberarma-verde' }, dati);
  assert.ok(pm, 'una CyberArma ha la riga della fonte');
  assert.equal(pm.fonte, 'PM personali');
  assert.match(pm.testo, /PM personali/);
  assert.match(pm.testo, /Custode/, 'a PM personali le proprietà da Custode restano (A.309)');

  const cm = rigaAlimentazione({ rif: 'armi:cyberarma-batteria-verde' }, dati);
  assert.match(cm.fonte, /CM/);
  assert.match(cm.testo, /10 Round/, 'una carica intera alimenta 10 Round (A.260)');
  assert.match(cm.testo, /cariche: da registrare/, 'senza il valore della sessione la riga lo dice, non inventa un numero');

  const nec = rigaAlimentazione({ rif: 'armi:cyberarma-nec' }, dati);
  assert.match(nec.fonte, /NeC/);
  assert.match(nec.testo, /Rosso/);
});

test('le cariche di adesso entrano nella riga, con i Round che restano', () => {
  const r = rigaAlimentazione({ rif: 'armi:cyberarma-batteria-verde' }, dati, { attuali: 3, massime: 5, unita: 'CM' });
  assert.match(r.testo, /adesso 3 \/ 5 CM/);
  assert.match(r.testo, /30 Round con queste/, '3 cariche × 10 Round = 30');
});

test('per un’arma che non è una CyberArma la riga non c’è (nessuna riga in più dove non serve)', () => {
  assert.equal(rigaAlimentazione({ rif: 'armi_distanza:pistola-semiautomatica' }, dati), null);
  assert.equal(rigaAlimentazione({ rif: 'armi:spada-lunga' }, dati), null);
  assert.equal(rigaAlimentazione({}, dati), null);
});

test('LA VISTA DELL’ARMA porta la riga, e la scheda la mostra', () => {
  const base = {
    livello: 8,
    caratteristiche: { FOR: { valore: 5, mod: 1 }, COS: { valore: 5, mod: 1 }, DES: { valore: 7, mod: 2 }, INT: { valore: 5, mod: 1 }, SAG: { valore: 5, mod: 1 }, CAR: { valore: 5, mod: 1 } },
    abilita: dati.abilita.abilita.map((a) => ({ nome: a.nome, caratteristica: a.caratteristica, totale: 8, effettivo: 8 })),
    specializzazioni: [],
  };
  const voci = [{ uid: 'arma-1', rif: 'armi:cyberarma-batteria-verde', stato: 'impugnata', quantita: 1 }];
  const e = calcolaEquipaggiamento(base, voci, dati);
  const a = (e.armi ?? []).find((x) => x.uid === 'arma-1');
  assert.ok(a, 'la CyberArma è fra le armi della scheda');
  assert.ok(a.rigaFonte, 'la vista dell’arma porta la riga della fonte');
  assert.match(a.rigaFonte.testo, /CM/);
  // e la scheda la stampa: la sezione «Fonte» del «?» dell'arma
  const tab = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  assert.match(tab, /etichetta: 'Fonte', testo: testoFonteArma\(ctx, a\)/, 'il «?» dell’arma deve avere la sezione «Fonte»');
  assert.match(tab, /function testoFonteArma/, 'e la funzione che vi aggiunge le cariche della sessione');
});

test('i numeri vengono dai dati, non dal codice', () => {
  // la capacità e il consumo stanno in data/equipaggiamento (alimentazione_modifiche e il contenitore della voce):
  // se qualcuno li scrive dentro src/cyberarma.js, il giorno che Davide li cambia l'app dice un numero vecchio
  const sorgente = readFileSync(new URL('../src/cyberarma.js', import.meta.url), 'utf8');
  const righe = sorgente.split('\n').filter((r) => !r.trim().startsWith('*') && !r.trim().startsWith('//'));
  const sospette = righe.filter((r) => /rigaAlimentazione|consumo/.test(r) && /\b(10|5)\b/.test(r));
  assert.deepEqual(sospette, [], `numeri scritti nel codice invece che letti dai dati:\n${sospette.join('\n')}`);
});

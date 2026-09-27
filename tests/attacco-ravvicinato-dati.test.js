// Dati dell'utility «Attacca!» corpo a corpo: regole.json → attacco_ravvicinato e
// effetti.attacco_ravvicinato dei Talenti (Giocatore §1.6, §5.3–5.7, §5.12, §5.13).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';

const { dati, errori } = await datiReali();
const R = dati.regole.attacco_ravvicinato;
const libero = (id) => dati.talenti_liberi.talenti.find((t) => t.id === id);
const classe = (c, n) => { const x = dati.classi.classi.find((k) => k.nome === c); return [...x.talenti_fissi, ...x.talenti_a_scelta].find((t) => t.nome === n); };

test('corpo a corpo: i dati reali passano il validatore', () => {
  assert.deepEqual(errori, []);
});

test('Manovre del §5.12 con Azioni, VA, danno e Prova del bersaglio', () => {
  assert.deepEqual(Object.keys(R.manovre), ['normale', 'mirato', 'affondo', 'spazzata', 'immobilizzare', 'sbilanciare', 'stordire', 'disarmare', 'incalzare']);
  assert.deepEqual([R.manovre.mirato.azioni_principali, R.manovre.mirato.va, R.manovre.mirato.danno], [2, 2, 2]);
  assert.deepEqual([R.manovre.affondo.va, R.manovre.affondo.danno, R.manovre.affondo.dopo_armatura.valore], [-4, 1, 1]);
  assert.deepEqual(R.manovre.spazzata.va_per_bersagli, { 2: -4, 3: -6 });
  assert.deepEqual(R.manovre.immobilizzare.prova, { tipo: 'contrapposta', abilita: ['Corpo a corpo'], contro: ['Corpo a corpo', 'Atletica'] });
  assert.equal(R.manovre.stordire.dopo_armatura.salvezza, 'Tempra');
  assert.deepEqual(R.carica.fasce.map((f) => [f.da, f.a, f.va, f.avversari]), [[3, 6, -2, -4], [7, 12, -4, -6]]);
  assert.deepEqual([R.magistrale.raddoppio, R.magistrale.da_x2, R.magistrale.massimo], [2, 3, 3]);
});

test('Talenti: versioni Migliorate e Talenti di Classe con un numero come effetti strutturati', () => {
  assert.deepEqual(libero('affondo-migliorato').effetti.attacco_ravvicinato, { manovra: { affondo: { danno: 2, dopo_armatura: 2 } } });
  assert.deepEqual(libero('carica-migliorata').effetti.attacco_ravvicinato, { carica: { moltiplicatore: 3 } });
  assert.deepEqual(libero('schermidore').effetti.attacco_ravvicinato.due_armi, { combinazione: 'ravvicinate', va: -2 });
  assert.deepEqual(classe('Assaltatore', 'Carica Brutale').effetti.attacco_ravvicinato, { carica: { danno: 2 } });
  assert.deepEqual(classe('Lottatore', 'Raffica di Colpi').effetti.attacco_ravvicinato, { raffica_di_colpi: { attacchi: 2, va: -2 } });
  // §3.5.4: Rapidità Operativa «Ottiene sempre +2 Iniziativa» (ricognizione-manovre §4.3)
  assert.equal(classe('Incursore', 'Rapidità Operativa').effetti.iniziativa, 2);
});

test('validatore: Manovra sconosciuta, effetto sconosciuto e combinazione errata sono errori leggibili', () => {
  const x = copia(dati);
  x.regole.attacco_ravvicinato.manovre.affondo.compatibilita = 'forse';
  x.talenti_liberi.talenti.find((t) => t.id === 'schermidore').effetti.attacco_ravvicinato.due_armi.combinazione = 'tre';
  x.talenti_liberi.talenti.find((t) => t.id === 'affondo-migliorato').effetti.attacco_ravvicinato.manovra.volare = { va: 1 };
  const e = validaDati(x).map((y) => `${y.chiave}: ${y.problema}`).join('\n');
  assert.match(e, /manovre\.affondo\.compatibilita: uno fra generale, arma/);
  assert.match(e, /schermidore\.effetti\.attacco_ravvicinato\.due_armi\.combinazione/);
  assert.match(e, /manovra\.volare: "volare" non è una Manovra/);
});

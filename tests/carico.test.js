import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { calcolaCarico, livelloCarico, soglieCarico } from '../src/carico.js';
import { normalizzaEquipaggiamento } from '../src/equipaggiamento.js';
import { allineaSessione, inizializzaSessione } from '../src/sessione.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

// Capacità di carico: Giocatore §5.2.6 ed Equipaggiamento 0.1 §1.6 (regole.json → carico)
const { dati } = await datiReali();

/** Scheda minima per le soglie: FOR e Talenti di Classe. */
const finta = (FOR, talenti = []) => ({ caratteristiche: { FOR: { valore: FOR } }, classi: [{ talenti: talenti.map((nome) => ({ nome })) }], movimento: { passo: 6 } });
const id = (peso, s) => livelloCarico(peso, s, dati).id;

test('soglie del §5.2.6 con FOR 5: 50 kg ordinario, 100 kg massimo, spinta 200 kg; Passo 6 → 4 Q in Sovraccarico', () => {
  const s = soglieCarico(finta(5), dati);
  assert.deepEqual(s, { ordinario: 50, massimo: 100, spinta: 200, fattore: 1, talento: null });
  // limiti inclusi: «fino a FOR × 10», «oltre FOR × 10 e fino a FOR × 20», «superiore a FOR × 20»
  assert.deepEqual([0, 50, 50.1, 100, 100.1].map((p) => id(p, s)), ['ordinario', 'ordinario', 'sovraccarico', 'sovraccarico', 'oltre_il_massimo']);
  // esempio del §5.2.6: il Passo ordinario passa da 6 a 4 Q
  const c = calcolaCarico({ ...finta(5), equipaggiamento: { oggetti: [] } }, { caricoExtra: 60 }, dati);
  assert.equal(c.livello.id, 'sovraccarico');
  assert.equal(c.passo, 4);
});

test('Forza da Lavoro raddoppia tutte le soglie (§5.2.6, «Interazioni con le capacità»)', () => {
  const s = soglieCarico(finta(5, ['Forza da Lavoro']), dati);
  assert.deepEqual(s, { ordinario: 100, massimo: 200, spinta: 400, fattore: 2, talento: 'Forza da Lavoro' });
  assert.equal(id(100, s), 'ordinario');
  assert.equal(id(150, s), 'sovraccarico');
});

// Agente Mishima, FOR 6: ordinario fino a 60 kg, massimo 120 kg
const pers = (nome, peso, quantita = 1) => ({ uid: nome, rif: null, personalizzato: { nome, tipo: 'altro', peso }, stato: null, quantita, note: '' });
const conEquip = (equipaggiamento, sessione) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento }, livelli: [], ...(sessione ? { sessione } : {}) }, dati);
const sessione = (modifica = {}) => ({ ...inizializzaSessione({ pv: 16, pm: 9, puntiEroe: 10, ferite: 6, caricatori: {} }), ...modifica });
const abil = (sc, nome) => sc.abilita.find((a) => a.nome === nome);

test('peso trasportato: pesi per unità × quantità + peso aggiuntivo; gli oggetti senza peso si elencano', () => {
  const equip = [pers('Tenda', 12.5, 2), pers('Cassa di attrezzi', 20), { uid: 'k', rif: 'armi:coltello', stato: 'pronta', quantita: 1, note: '' }];
  const sc = conEquip(equip, sessione({ caricoExtra: 4 }));
  assert.equal(sc.carico.pesoOggetti, 45);
  assert.equal(sc.carico.peso, 49);
  assert.deepEqual(sc.carico.senzaPeso, ['Coltello']); // il Manuale degli Armamenti non dà pesi
  assert.equal(sc.carico.livello.id, 'ordinario');
  assert.equal(sc.carico.soglie.ordinario, 60);
  assert.ok(!sc.condizioni.some((c) => c.fonte === 'carico'));
});

test('Sovraccarico nei valori effettivi: −2 alle Abilità fisiche (attacchi e Difese), non alle Salvezze né alle altre Abilità', () => {
  const equip = [pers('Zaino pieno', 31, 2)]; // 62 kg > 60
  const riposo = conEquip(equip);
  const s = conEquip(equip, sessione());
  assert.equal(s.carico.livello.id, 'sovraccarico');
  assert.equal(riposo.carico, null); // senza sessione (stampa, creazione) il carico non si applica
  const fisiche = dati.regole.categorie_prove.fisiche;
  for (const a of s.abilita) {
    const atteso = abil(riposo, a.nome).effettivo + (fisiche.includes(a.nome) ? -2 : 0);
    assert.equal(a.effettivo, atteso, a.nome);
    assert.equal(a.totale, abil(riposo, a.nome).totale); // il valore da regole non cambia
  }
  assert.deepEqual(abil(s, 'Difese').scomposizione.at(-1), { etichetta: 'Sovraccarico', valore: -2, fonte: 'carico' });
  for (const [k, v] of Object.entries(s.salvezze)) assert.equal(v.effettivo, riposo.salvezze[k].effettivo, k);
  // oltre il massimo (> 120 kg): stesse penalità, con l'avviso che il carico non si trasporta
  const oltre = conEquip(equip, sessione({ caricoExtra: 60 }));
  assert.equal(oltre.carico.livello.id, 'oltre_il_massimo');
  assert.equal(abil(oltre, 'Atletica').effettivo, abil(riposo, 'Atletica').effettivo - 2);
});

test('forme salvate: peso degli oggetti personalizzati e peso aggiuntivo della sessione', () => {
  const [v] = normalizzaEquipaggiamento([{ uid: 'x', rif: null, personalizzato: { nome: 'Corda', tipo: 'altro', peso: 2.345 }, quantita: 1 }]);
  assert.equal(v.personalizzato.peso, 2.35);
  const [w] = normalizzaEquipaggiamento([{ uid: 'y', rif: null, personalizzato: { nome: 'Sasso', peso: -3 } }]);
  assert.equal(w.personalizzato.peso, undefined);
  const m = { pv: 10, pm: 5, puntiEroe: 10, puntiEroeIniziali: 0, ferite: 6, affaticamento: 6, stati: [], caricatori: {} };
  assert.equal(allineaSessione({ caricoExtra: 12.34 }, m).caricoExtra, 12.3);
  assert.equal(allineaSessione({ caricoExtra: -5 }, m).caricoExtra, 0);
  assert.equal(allineaSessione({ caricoExtra: 'tanto' }, m).caricoExtra, 0);
});

test('dati: blocchi carico e integrita presenti, versione_manuale «Equipaggiamento 0.1»; il catalogo rispetta Qualità → PS Integrità', () => {
  assert.equal(dati.regole.carico.versione_manuale, 'Equipaggiamento 0.1');
  assert.equal(dati.regole.integrita.versione_manuale, 'Equipaggiamento 0.1');
  assert.deepEqual(dati.regole.integrita.ps_per_qualita, { Scarsa: 8, Comune: 10, 'Non comune': 12, Rara: 14, 'Molto rara': 16, Leggendaria: 18 });
  assert.deepEqual(validaDati(dati), []);
});

test('validatore: errori sui blocchi carico e integrita con file, chiave e motivo', () => {
  const d = copia(dati);
  const c = d.regole.carico;
  c.caratteristica = 'FORZA';
  c.livelli[1].fino_a_kg_per_punto = 5; // non maggiore della soglia ordinaria
  c.livelli[0].effetto = { va: -1, fonte: 'prova' };
  c.livelli[1].effetto.va_gruppi = { inesistente: -2 };
  c.moltiplicatori[0].talento = 'Forza da Lavorro';
  d.regole.integrita.ps_per_qualita.Rara = 11; // non crescente
  const coltello = d.equipaggiamento.file.armi.oggetti[0];
  coltello.ps_int = 99;
  coltello.peso = -1;
  const e = validaDati(d);
  const ha = (file, chiave, re) => e.some((x) => x.file === file && x.chiave.includes(chiave) && re.test(x.problema));
  assert.ok(ha('regole.json', 'carico.caratteristica', /non è una Caratteristica/), JSON.stringify(e));
  assert.ok(ha('regole.json', 'carico.livelli[1].fino_a_kg_per_punto', /maggiore della soglia precedente/));
  assert.ok(ha('regole.json', 'carico.livelli[0].effetto', /non ha penalità/));
  assert.ok(ha('regole.json', 'carico.livelli[1] (Sovraccarico).effetto.va_gruppi.inesistente', /gruppo/));
  assert.ok(ha('regole.json', 'carico.moltiplicatori[0].talento', /non è un Talento di Classe/));
  assert.ok(ha('regole.json', 'integrita.ps_per_qualita', /crescenti/));
  // una Qualità con la PS sbagliata, e ogni oggetto Raro che ora non torna più con la tabella
  assert.ok(ha('equipaggiamento/armi.json', 'oggetti[0] (Coltello).ps_int', /Qualità Comune vuole PS Integrità 10, trovata 99/));
  assert.ok(ha('equipaggiamento/scudi.json', '.ps_int', /Qualità Rara vuole PS Integrità 11, trovata 14/));
  assert.ok(ha('equipaggiamento/armi.json', 'oggetti[0] (coltello).peso', /numero ≥ 0/));
});

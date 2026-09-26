import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { normalizza } from '../src/character.js';
import { contenitori, caricatori, normalizzaEquipaggiamento } from '../src/equipaggiamento.js';
import { massimiSessione, inizializzaSessione, allineaSessione, variaChroma, ricaricaArma, nuovaSessione } from '../src/sessione.js';
import { validaDati } from '../src/validate.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const massimi = (equipaggiamento) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  return massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
};
const copia = (x) => structuredClone(x);
const problemi = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((e) => `${e.chiave}: ${e.problema}`).join('\n'); };

test('regole.json → chroma: sei colori, rapporti, Talenti, Prova per gruppi, un contenitore per lancio', () => {
  const c = dati.regole.chroma;
  assert.deepEqual(Object.keys(c.colori), ['Bianco', 'Rosso', 'Blu', 'Verde', 'Viola', 'Trasparente']);
  assert.deepEqual(c.colori.Bianco.macrofamiglie, ['Fisica', 'Mentale', 'Spirituale']);
  assert.deepEqual([c.colori.Rosso.macrofamiglie, c.colori.Blu.macrofamiglie, c.colori.Verde.macrofamiglie], [['Fisica'], ['Mentale'], ['Spirituale']]);
  assert.equal(c.colori.Viola.regole_rimandate, true);
  assert.equal(c.colori.Trasparente.esausto, true);
  // Magia p. 9: 3:1, uno dei due Talenti 2:1, entrambi 1:1; il Bianco resta 2:1
  assert.deepEqual(c.conversione.rapporto_per_talenti, [3, 2, 1]);
  assert.deepEqual(c.conversione.rapporti_fissi, { Bianco: 2 });
  assert.deepEqual(c.conversione.talenti_riduzione, ['Ricarica Efficiente', 'Conversione Migliorata']);
  assert.equal(c.conversione.addestramento_richiesto, 'Taumaturgo');
  assert.deepEqual(c.conversione.prova_gruppi, { automatici: 1, penalita: { 2: 0, 3: -2, 4: -4, 5: -6, 6: -8 }, per_gruppo_oltre: -2 });
  assert.equal(c.contenitori_per_lancio, 1);
});

test('validatore: dati reali senza errori; colori, Talenti, rapporti e contenitori sbagliati', () => {
  assert.deepEqual(validaDati(dati), []);
  assert.match(problemi((d) => { d.regole.chroma.colori.Rosso.macrofamiglie = ['Oscura']; }), /chroma\.colori\.Rosso\.macrofamiglie: "Oscura" non è una macrofamiglia/);
  assert.match(problemi((d) => { d.regole.chroma.conversione.talenti_riduzione = ['Ricarica Veloce', 'Conversione Migliorata']; }), /"Ricarica Veloce" non è un Talento/);
  assert.match(problemi((d) => { d.regole.chroma.conversione.rapporto_per_talenti = [3, 4, 1]; }), /rapporto_per_talenti/);
  assert.match(problemi((d) => { d.regole.chroma.conversione.addestramento_richiesto = 'Mago'; }), /"Mago" non è un Addestramento/);
  assert.match(problemi((d) => { delete d.regole.chroma.colori.Trasparente; }), /contenitore esausto/);
  const batteria = (d) => d.equipaggiamento.file.artefatti.oggetti[0].artefatto;
  assert.match(problemi((d) => { batteria(d).contenitore.energia = 'Arancione'; }), /"Arancione" non è un colore del Chroma/);
  assert.match(problemi((d) => { batteria(d).contenitore.energia = 'Trasparente'; }), /non è un colore del Chroma/); // l'esausto è uno stato
  assert.match(problemi((d) => { batteria(d).contenitore.capacita_pm = 0; }), /capacita_pm: intero ≥ 1/);
  assert.match(problemi((d) => { batteria(d).riserva = { pm: 5, chroma: 'Rosso' }; }), /sostituito da "contenitore"/);
  assert.match(problemi((d) => { delete batteria(d).sintonizzabile; }), /sintonizzabile: deve valere true/);
});

test('contenitori: batterie del catalogo, riserve integrate (Bordone, Scudo delle Guardie Sacre), personalizzati', () => {
  const voci = [
    voce('b', 'artefatti:batteria-da-5-pm-chroma-bianco', 'trasportato', { sintonizzato: true }),
    voce('o', 'armi_corporative:bordone-templare', 'impugnata', { sintonizzato: true }),
    voce('s', 'scudi:scudo-delle-guardie-sacre', 'zaino'),
    voce('p', null, 'zaino', { personalizzato: { nome: 'Cristallo votivo', tipo: 'artefatto', potenza: 'Non Comune', energia: 'Verde', capacita_pm: 8 } }),
  ];
  const c = Object.fromEntries(contenitori(normalizzaEquipaggiamento(voci), dati).map((x) => [x.uid, x]));
  assert.deepEqual(Object.keys(c), ['b', 'o', 's', 'p']);
  assert.deepEqual([c.b.energia, c.b.capacita, c.b.macrofamiglie.length, c.b.costo, c.b.integrato, c.b.trasportato], ['Bianco', 5, 3, 2, false, true]);
  assert.deepEqual([c.o.energia, c.o.macrofamiglie, c.o.integrato, c.o.trasportato, c.o.costo], ['Rosso', ['Fisica'], true, true, 2]);
  assert.deepEqual([c.s.integrato, c.s.trasportato, c.s.costo], [true, false, 3]);
  // personalizzato: colore, capacità e potenza non si scartano; il costo viene dalla potenza (§7.10)
  assert.deepEqual([c.p.energia, c.p.capacita, c.p.macrofamiglie, c.p.potenza, c.p.costo, c.p.personalizzato, c.p.trasportato], ['Verde', 8, ['Spirituale'], 'Non Comune', 2, true, false]);
  // il personalizzato sintonizzato conta nel budget del §7.10
  const eq = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [{ ...voci[3], sintonizzato: true }] }, livelli: [] }, dati).equipaggiamento;
  assert.deepEqual([eq.sintonizzazione.usata, eq.sintonizzazione.artefatti[0].nome], [2, 'Cristallo votivo']);
  // un Artefatto personalizzato senza potenza non ha costo né contenitore
  assert.deepEqual(contenitori(normalizzaEquipaggiamento([voce('x', null, null, { personalizzato: { nome: 'Pietra', tipo: 'artefatto', energia: 'Rosso', capacita_pm: 3 } })]), dati), []);
  // il Bordone non ha più un caricatore: la sua riserva è un contenitore (niente «Ricarica»)
  assert.deepEqual(caricatori(normalizzaEquipaggiamento(voci), dati), {});
  // l'arma porta con sé il contenitore integrato, per mostrarlo accanto all'arma
  const arma = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [voci[1]] }, livelli: [] }, dati).equipaggiamento.armi[0];
  assert.deepEqual(arma.contenitore, { energia: 'Rosso', capacita_pm: 5, integrato: true });
});

test('migrazione: un contenitore per voce (quantità > 1 divisa), stato «trasportato» per le batterie salvate prima', () => {
  const vecchia = { ...MISHIMA_AGENTE, equipaggiamento: [
    voce('b', 'artefatti:batteria-da-5-pm-chroma-rosso', null, { quantita: 3, sintonizzato: true, note: 'dal mercato' }),
    voce('k', 'sanitario:kit-di-pronto-soccorso-standard', null, { quantita: 2 }),
    voce('o', 'armi_corporative:bordone-templare', 'pronta', { quantita: 2 }),
  ] };
  const { scelte, avvisi } = normalizza(vecchia, dati);
  const e = scelte.equipaggiamento;
  assert.deepEqual(e.map((v) => [v.uid, v.quantita, v.stato ?? null, v.sintonizzato ?? false, v.note]), [
    ['b', 1, 'trasportato', true, 'dal mercato'],
    ['b-2', 1, 'trasportato', false, ''],
    ['b-3', 1, 'trasportato', false, ''],
    ['k', 2, null, false, ''], // i consumabili tengono la quantità
    ['o', 2, 'pronta', false, ''], // una riserva integrata segue l'oggetto
  ]);
  assert.ok(avvisi.some((a) => /Batteria da 5 PM \(Chroma Rosso\) ×3: diviso in 3 voci/.test(a)), avvisi.join('\n'));
  // la migrazione è stabile: normalizzare di nuovo non cambia niente
  const ancora = normalizza(scelte, dati);
  assert.deepEqual(ancora.scelte.equipaggiamento, e);
  assert.ok(!ancora.avvisi.some((a) => /diviso/.test(a)));
  // il budget di sintonizzazione non cambia: resta sintonizzato solo il primo
  assert.equal(calcolaScheda({ creazione: scelte, livelli: [] }, dati).equipaggiamento.sintonizzazione.usata, 1);
});

test('sessione: PM dei contenitori pieni all’inizio (A.19), limitati alla capacità, solo +/− manuali', () => {
  const b = voce('b', 'artefatti:batteria-da-5-pm-chroma-blu', 'trasportato');
  const o = voce('o', 'armi_corporative:bordone-templare', 'impugnata');
  const p = voce('p', null, 'trasportato', { personalizzato: { nome: 'Cristallo', tipo: 'artefatto', potenza: 'Rara', energia: 'Bianco', capacita_pm: 8 } });
  let m = massimi([b, o, p]);
  assert.deepEqual(m.contenitori, { b: 5, o: 5, p: 8 });
  // TODO(Davide) A.19: un contenitore nuovo arriva pieno
  let s = inizializzaSessione(m);
  assert.deepEqual(s.chroma, { b: { pmAttuali: 5 }, o: { pmAttuali: 5 }, p: { pmAttuali: 8 } });
  // +/− entro 0 e la capacità
  s = variaChroma(s, 'p', -6, m);
  assert.equal(s.chroma.p.pmAttuali, 2);
  s = variaChroma(s, 'p', -5, m);
  assert.equal(s.chroma.p.pmAttuali, 0); // Trasparente, con l'alone del Bianco
  s = variaChroma(s, 'b', +3, m);
  assert.equal(s.chroma.b.pmAttuali, 5);
  // valori salvati oltre la capacità o negativi si riportano nei limiti
  s = allineaSessione({ ...s, chroma: { b: { pmAttuali: 9 }, o: { pmAttuali: -2 }, p: { pmAttuali: 7 } } }, m);
  assert.deepEqual(s.chroma, { b: { pmAttuali: 5 }, o: { pmAttuali: 0 }, p: { pmAttuali: 7 } });
  // la capacità cambia (contenitore personalizzato da 8 a 4 PM): i PM si limitano, non si riempiono
  m = massimi([b, o, { ...p, personalizzato: { ...p.personalizzato, capacita_pm: 4 } }]);
  s = allineaSessione(s, m);
  assert.equal(s.chroma.p.pmAttuali, 4);
  // un contenitore tolto dalla lista sparisce; uno nuovo parte pieno
  m = massimi([b, voce('n', 'artefatti:batteria-da-5-pm-chroma-verde', 'trasportato')]);
  s = allineaSessione(s, m);
  assert.deepEqual(s.chroma, { b: { pmAttuali: 5 }, n: { pmAttuali: 5 } });
});

test('«Ricarica» non tocca le riserve mistiche; «Nuova sessione» nemmeno; le celle sì', () => {
  const o = voce('o', 'armi_corporative:bordone-templare', 'impugnata');
  const t = voce('t', 'armi_corporative:tonfa-stella-cadente', 'impugnata'); // cella tecnologica sostituibile
  const m = massimi([o, t]);
  assert.deepEqual(m.caricatori, { t: 5 });
  let s = inizializzaSessione(m);
  s = variaChroma(s, 'o', -4, m);
  s = { ...s, munizioni: { ...s.munizioni, t: { colpi: 1, riserve: 0 } } };
  const dopo = ricaricaArma(s, 'o', m);
  assert.equal(dopo.chroma.o.pmAttuali, 1);
  assert.equal(nuovaSessione(s, m).chroma.o.pmAttuali, 1);
  assert.equal(ricaricaArma(s, 't', m).munizioni.t.colpi, 5);
});

test('sessione salvata prima: la riserva del Bordone passa da «munizioni» a «chroma» con il suo valore', () => {
  const o = voce('o', 'armi_corporative:bordone-templare', 'impugnata');
  const m = massimi([o]);
  const s = allineaSessione({ pvAttuali: 5, pmAttuali: 3, munizioni: { o: { colpi: 2, riserve: 0 } } }, m);
  assert.deepEqual(s.chroma, { o: { pmAttuali: 2 } });
  assert.deepEqual(s.munizioni, {});
});

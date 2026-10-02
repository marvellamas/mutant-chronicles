// Ricarica dalle riserve nella modalità tavolo (Giocatore §5.1.1; Armamenti §7.20.2; src/ricarica.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { massimiSessione, inizializzaSessione, ricaricaArma, variaMunizioni, modificaSessione, allineaSessione } from '../src/sessione.js';
import { statoRicarica, modoRicarica } from '../src/ricarica.js';
import { catalogo } from '../src/equipaggiamento.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato = null, quantita = 1) => ({ uid, rif, stato, quantita, note: '' });
const prepara = (voci) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: voci };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  return { m, s: inizializzaSessione(m) };
};
const stato = (s, m, uid) => statoRicarica(m.ricarica[uid], s.munizioni[uid], s.scorte);

test('modo di ricarica dai dati: caricatore, inserimento, tamburo, cella, nessun dato', () => {
  const cat = catalogo(dati);
  const modo = (rif) => modoRicarica(cat.perRif.get(rif), dati, cat).modo;
  assert.equal(modo('armi_distanza:pistola-semiautomatica'), 'caricatore');
  // E&L 19: il revolver usa il tamburo; pompa e doppiette una cartuccia per operazione
  assert.equal(modo('armi_distanza:revolver'), 'tamburo');
  assert.equal(modo('armi_distanza:fucile-a-pompa'), 'inserimento');
  assert.equal(modo('armi_distanza_corporative:jemson-45'), 'tamburo'); // famiglia «Revolver»
  // M310 e SA SG2001: caricatore amovibile specifico
  assert.equal(modo('armi_distanza_corporative:m310'), 'caricatore');
  assert.equal(modo('armi_distanza_corporative:sa-sg2001'), 'caricatore');
  assert.equal(modo('armi_distanza:fucile-al-plasma'), 'cella');
  assert.equal(modo('armi_distanza:lanciarazzi'), 'inserimento'); // razzi compatibili, uno per colpo
  // §7.20.3: le granate del formato standard si inseriscono nel lanciagranate
  assert.equal(modo('armi_distanza:lanciagranate'), 'inserimento');
  assert.equal(modo('armi_distanza:shuriken'), null);
  assert.deepEqual(modoRicarica(cat.perRif.get('armi_distanza:carabina'), dati, cat).vuoto,
    { rif: 'munizioni:caricatore-vuoto-per-arma-media', nome: 'Caricatore vuoto per Arma Media' });
});

test('caricatore con riserve: torna alla capacità, la riserva scende di 1, il vuoto resta', () => {
  let { m, s } = prepara([voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata')]);
  s = variaMunizioni(s, 'p', 'riserve', 2, m);
  s = variaMunizioni(s, 'p', 'colpi', -15, m);
  assert.equal(stato(s, m, 'p').possibile, true);
  s = ricaricaArma(s, 'p', m);
  assert.deepEqual(s.munizioni.p, { colpi: 15, riserve: 1, vuoti: 1 });
});

test('senza riserve: «Ricarica» disabilitato con il motivo e nessuna modifica', () => {
  let { m, s } = prepara([voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata')]);
  s = variaMunizioni(s, 'p', 'colpi', -10, m);
  assert.deepEqual(stato(s, m, 'p'), { possibile: false, motivo: 'nessun caricatore compatibile', avviso: null });
  assert.deepEqual(ricaricaArma(s, 'p', m), s);
  // a caricatore pieno il pulsante è disabilitato comunque
  const pieno = prepara([voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata')]);
  assert.equal(stato(pieno.s, pieno.m, 'p').motivo, 'caricatore già pieno');
});

test('caricatore parziale: il caricatore tolto resta con i suoi colpi e si può reinserire', () => {
  let { m, s } = prepara([voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata')]);
  s = variaMunizioni(s, 'p', 'riserve', 1, m);
  s = variaMunizioni(s, 'p', 'colpi', -8, m); // 7 colpi
  s = ricaricaArma(s, 'p', m);
  assert.deepEqual(s.munizioni.p, { colpi: 15, riserve: 0, parziali: [7] });
  s = variaMunizioni(s, 'p', 'colpi', -12, m); // 3 colpi: si reinserisce il parziale da 7
  s = ricaricaArma(s, 'p', m);
  assert.deepEqual(s.munizioni.p, { colpi: 7, riserve: 0, parziali: [3] });
  // un parziale con meno colpi di quelli inseriti non serve: nessun caricatore compatibile
  s = variaMunizioni(s, 'p', 'colpi', -2, m); // 5 colpi, parziale da 3
  assert.equal(stato(s, m, 'p').motivo, 'nessun caricatore compatibile');
});

test('munizioni sciolte (revolver): si inseriscono fino alla capacità, la scorta scende della quantità inserita', () => {
  let { m, s } = prepara([voce('r', 'armi_distanza:revolver', 'impugnata'), voce('m', 'munizioni:proiettili-da-pistola', null, 5)]);
  assert.deepEqual(m.ricarica.r.scorte, [{ uid: 'm', nome: 'Proiettili da pistola', quantita: 5, rif: 'munizioni:proiettili-da-pistola' }]);
  s = variaMunizioni(s, 'r', 'colpi', -4, m); // 2 nel tamburo
  s = ricaricaArma(s, 'r', m);
  assert.equal(s.munizioni.r.colpi, 6);
  assert.deepEqual(s.scorte, { m: 4 });
  s = variaMunizioni(s, 'r', 'colpi', -6, m);
  s = ricaricaArma(s, 'r', m); // ne resta 1
  assert.equal(s.munizioni.r.colpi, 1);
  assert.deepEqual(s.scorte, { m: 5 });
  assert.deepEqual(stato(s, m, 'r'), { possibile: false, motivo: 'nessuna munizione compatibile', avviso: null });
  // la quantità della voce (scelta del giocatore) non cambia; il consumo non supera la quantità
  assert.deepEqual(allineaSessione({ ...s, scorte: { m: 99, x: 3 } }, m).scorte, { m: 5 });
});

test('celle: una cella piena sostituisce quella esaurita', () => {
  let { m, s } = prepara([voce('f', 'armi_distanza:fucile-al-plasma', 'impugnata'), voce('c', 'munizioni:cella-del-fucile-al-plasma-commerciale', null, 1)]);
  s = variaMunizioni(s, 'f', 'colpi', -20, m);
  s = ricaricaArma(s, 'f', m);
  assert.equal(s.munizioni.f.colpi, 20);
  s = variaMunizioni(s, 'f', 'colpi', -5, m);
  assert.equal(stato(s, m, 'f').motivo, 'nessuna cella compatibile');
});

test('senza dati di compatibilità: avviso e ricarica libera, nessun blocco', () => {
  let { m, s } = prepara([voce('g', 'armi_distanza_corporative:kr10', 'impugnata')]);
  const cap = m.caricatori.g;
  s = variaMunizioni(s, 'g', 'colpi', -cap, m);
  const st = stato(s, m, 'g');
  assert.equal(st.possibile, true);
  assert.match(st.avviso, /non nei dati/);
  assert.equal(ricaricaArma(s, 'g', m).munizioni.g.colpi, cap);
});

test('«Annulla ultima modifica»: la ricarica è una modifica di sessione come le altre (stato precedente intatto)', () => {
  let { m, s } = prepara([voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata')]);
  s = modificaSessione(s, { munizioni: { p: { colpi: 0, riserve: 1 } } }, m);
  const prima = structuredClone(s);
  const dopo = ricaricaArma(s, 'p', m);
  assert.deepEqual(s, prima); // funzione pura: l'app conserva «prima» per l'annullamento
  assert.notDeepEqual(dopo, prima);
});

test('validatore: famiglie e riferimenti di munizioni.json → ricarica', () => {
  const x = copia(dati);
  x.equipaggiamento.file.munizioni.ricarica.inserimento_singolo.famiglie.push('Balestre giganti');
  x.equipaggiamento.file.munizioni.ricarica.caricatori_vuoti['Armi leggere'] = 'munizioni:non-esiste';
  const e = validaDati(x).filter((y) => y.chiave.startsWith('ricarica')).map((y) => y.problema);
  assert.ok(e.some((p) => p.includes('"Balestre giganti" non è una famiglia')));
  assert.ok(e.some((p) => p.includes('"munizioni:non-esiste" non esiste')));
});

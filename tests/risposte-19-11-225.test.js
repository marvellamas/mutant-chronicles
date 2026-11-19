import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 225 — le risposte di Davide del 19/11/2026 (E&L): A.289, A.290, A.291, A.292.
//   A.289  il Modulo al plasma Banshee è del catalogo Capitol, non in vendita da solo, si monta solo su un Banshee compatibile;
//   A.292  la Cartuccia Stabilizzante pesa 0,10 kg e il carico moltiplica per le cartucce (10 = 1 kg);
//   A.290  balestre d'osso e quadrelli dei Mutanti: i quadrelli lunari non sono in vendita (né baratto): solo in dono; il valore non è un
//          prezzo; le quantità sono la disponibilità della campagna e NON diventano scorte dell'app; nessuna sigla di Reperibilità nuova;
//   A.291  Pietre di Luna intere: tre voci (5, 10, 15 PM), colore scelto alla sintonizzazione, promemoria dei 7 giorni, e **la scadenza
//          la conferma solo il Direttore**: l'app non svuota mai una pietra da sola.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { calcolaScheda } from '../src/calc.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { catalogo, contenitori, infoArtefattoVoce, normalizzaEquipaggiamento, risolvi, condizioneCessione } from '../src/equipaggiamento.js';
import { allineaSessione, inizializzaSessione, nuovaSessione } from '../src/sessione.js';
import { calcolaCarico } from '../src/carico.js';
import { COLORI_PIETRA, PROMEMORIA_VINCOLO, colorePietra, sntPietra, confermaScadenzaVincolo } from '../src/pietre-di-luna.js';
import { installaDomFinto } from './dom-finto.js';

installaDomFinto();
const { bottoneCompra } = await import('../src/ui/equipaggiamento.js');
const { dati } = await datiReali();
const cat = catalogo(dati);
const def = (rif) => cat.perRif.get(rif);

// ———————————————————————————————————————————————————————————————— A.289

test('A.289: il Modulo al plasma Banshee è Capitol (non Bauhaus), non in vendita da solo, e si monta solo su un Banshee compatibile', () => {
  const m = def('armi_distanza_corporative:modulo-al-plasma-banshee');
  assert.ok(m, 'la voce c’è');
  assert.equal(m.catalogo, 'Capitol', 'A.289: «fra i moduli Bauhaus» va letto «fra i moduli Capitol»');
  assert.notEqual(m.catalogo, 'Bauhaus');
  assert.equal(m.non_in_vendita, true);
  assert.deepEqual(m.montabile_su, ['corredi_dispositivi:propulsore-d-assalto-banshee']);
  assert.ok(condizioneCessione(m), 'non è comprabile: la condizione di cessione c’è');
  const bottone = bottoneCompra({ dati, crediti: 100000, compra: () => {}, ui: {}, storico: null }, m, () => ({}));
  assert.equal(bottone.disabled, true, '«Compra» è spento: non si vende da solo');
});

// ———————————————————————————————————————————————————————————————— A.292

test('A.292: la Cartuccia Stabilizzante pesa 0,10 kg, non è più «da definire», e 10 cartucce fanno 1 kg di carico', () => {
  const c = def('sanitario:cartuccia-stabilizzante');
  assert.equal(c.peso, 0.1);
  assert.equal(c.da_definire, undefined, 'non è più «da definire»');
  const pesoCon = (n) => {
    const equip = n ? [{ uid: 'cs', rif: 'sanitario:cartuccia-stabilizzante', stato: 'trasportato', quantita: n, note: '' }] : [];
    const sc = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: equip }, livelli: [], sessione: inizializzaSessione({ pv: 16, pm: 9, puntiEroe: 10, ferite: 6, caricatori: {} }) }, dati);
    return { peso: sc.carico.peso, senzaPeso: sc.carico.senzaPeso };
  };
  const zero = pesoCon(0), una = pesoCon(1), dieci = pesoCon(10);
  assert.ok(Math.abs((una.peso - zero.peso) - 0.1) < 1e-9, `1 cartuccia: +0,1 kg (${una.peso - zero.peso})`);
  assert.ok(Math.abs((dieci.peso - zero.peso) - 1) < 1e-9, `10 cartucce: +1 kg (${dieci.peso - zero.peso})`);
  assert.ok(!dieci.senzaPeso.includes('Cartuccia Stabilizzante'), 'non compare più fra gli oggetti senza peso');
  // «il valore riguarda soltanto la Cartuccia Stabilizzante»: le altre cartucce non cambiano
  for (const id of ['cartuccia-curativa', 'cartuccia-emostatica', 'cartuccia-coagulante']) {
    const d = def(`sanitario:${id}`);
    if (d) assert.notEqual(d.peso, 0.1, `${id} non prende il peso della Stabilizzante`);
  }
});

// ———————————————————————————————————————————————————————————————— A.290

test('A.290: i quadrelli lunari NON sono in vendita né in baratto: solo in dono; il valore non è un prezzo; il pulsante «Compra» è spento e lo dice', () => {
  const q = def('manufatti_lunari:quadrelli-lunari-d-osso');
  assert.ok(q, 'la voce c’è');
  assert.equal(q.non_in_vendita, true);
  assert.equal(q.cessione.modo, 'solo_dono');
  assert.match(q.cessione.testo, /soltanto in dono/);
  assert.match(q.cessione.testo, /fiducia dei Mutanti/);
  assert.match(q.cessione.testo, /non è un prezzo d.acquisto/);
  assert.equal(q.cessione.valore_non_e_prezzo, true);
  assert.equal(q.costo, 50, 'il valore del manuale resta: nessun importo nuovo');
  const c = condizioneCessione(q);
  assert.equal(c.valoreNonPrezzo, true);
  // IL CONTROLLO CHE CONTA: un quadrello lunare non risulta acquistabile (né singolo né a confezione)
  const ctx = { dati, crediti: 100000, compra: () => {}, ui: {}, storico: null };
  assert.equal(bottoneCompra(ctx, q, () => ({})).disabled, true, 'Compra spento');
  assert.match(bottoneCompra(ctx, q, () => ({})).attributi.title, /dono/, 'e il motivo dice «dono»');
  assert.equal(bottoneCompra(ctx, { ...q, costo: q.munizione.confezione.costo }, () => ({}), 'Compra 10').disabled, true, 'anche la confezione da dieci');
  // senza i crediti il pulsante dice lo stesso: non è un problema di soldi
  assert.equal(bottoneCompra({ ...ctx, crediti: 0 }, q, () => ({})).disabled, true);
});

test('A.290: la Balestra d’osso dice come si ottiene (3–4 al massimo, non una quota), e le quantità della campagna NON sono scorte dell’app', () => {
  const b = def('manufatti_lunari:balestra-d-osso');
  assert.match(b.cessione.testo, /3–4/);
  assert.match(b.cessione.testo, /non sono una quota garantita né un limite assoluto/);
  assert.equal(b.cessione.disponibilita_campagna, 16);
  assert.equal(b.costo, 700);
  // nessuna sigla di Reperibilità nuova, e la domanda è chiusa (nessun TODO)
  assert.equal(b.reperibilita, null);
  assert.equal(def('manufatti_lunari:quadrelli-lunari-d-osso').reperibilita, null);
  assert.equal(b['TODO(Davide)'], undefined);
  assert.equal(def('manufatti_lunari:quadrelli-lunari-d-osso')['TODO(Davide)'], undefined);
  const campagna = dati.equipaggiamento.file.manufatti_lunari.disponibilita_campagna;
  assert.deepEqual([campagna.balestre_d_osso, campagna.quadrelli_normali.quantita, campagna.quadrelli_lunari], [16, 100, 30]);
  // **non scorte**: nessuna voce del file ha una quantità, una scorta o un massimo preso da quei numeri
  for (const o of dati.equipaggiamento.file.manufatti_lunari.oggetti) {
    for (const k of ['quantita', 'scorta', 'scorte', 'massimo', 'quantita_massima']) assert.equal(o[k], undefined, `${o.id}.${k}: la disponibilità non è una scorta`);
  }
  // e un PG che compra/aggiunge una balestra non ne scala una dalla «campagna»: l'app non tiene quel conto
  const catalogoStr = JSON.stringify(dati.equipaggiamento.file.manufatti_lunari.oggetti.map((o) => Object.keys(o)));
  assert.ok(!/disponibili/.test(catalogoStr), 'nessun campo «disponibili» sulle voci');
});

test('A.290: tutte le voci «non in vendita» del catalogo hanno una condizione di cessione leggibile (nessuna resta muta)', () => {
  const nonVendibili = [...cat.perRif.values()].filter((o) => o.non_in_vendita === true);
  assert.ok(nonVendibili.length >= 6, `le voci non in vendita (${nonVendibili.length})`);
  for (const o of nonVendibili) {
    const c = condizioneCessione(o);
    assert.ok(c && c.testo.length > 20, `${o.nome}: manca la condizione di cessione`);
    assert.equal(bottoneCompra({ dati, crediti: 1e6, compra: () => {}, ui: {}, storico: null }, o, () => ({})).disabled, true, `${o.nome}: «Compra» deve restare spento`);
  }
});

// ———————————————————————————————————————————————————————————————— A.291

const PIETRE = [['pietra-di-luna-5-pm', 5, 1], ['pietra-di-luna-10-pm', 10, 2], ['pietra-di-luna-15-pm', 15, 3]];
const voce = (id, extra = {}) => ({ uid: `p-${id}`, rif: `manufatti_lunari:${id}`, stato: 'trasportato', quantita: 1, note: '', ...extra });

test('A.291: le Pietre di Luna intere sono TRE voci distinte (5, 10, 15 PM), con la SnT del §26.8 per colore', () => {
  for (const [id, pm, snt] of PIETRE) {
    const d = def(`manufatti_lunari:${id}`);
    assert.ok(d, `${id}: la voce c’è`);
    assert.equal(d.pietra_di_luna.capacita_pm, pm);
    for (const c of ['Rosso', 'Blu', 'Verde']) assert.equal(sntPietra(d, c), snt, `${pm} PM ${c}: SnT ${snt}`);
    assert.equal(sntPietra(d, 'Bianco'), snt + 1, `${pm} PM Bianco: SnT ${snt + 1}`);
    assert.equal(d.costo, null, 'nessun prezzo inventato');
    assert.deepEqual(d.da_definire, ['costo', 'peso']);
  }
  assert.deepEqual(COLORI_PIETRA, ['Rosso', 'Blu', 'Verde', 'Bianco'], 'il Viola non rientra in questa procedura');
});

test('A.291: senza colore la pietra è neutra (nessuna riserva); col colore sceglie è una Batteria di quel colore, con la SnT di quel colore', () => {
  for (const [id, pm, snt] of PIETRE) {
    const neutra = risolvi(voce(id), cat);
    const iN = infoArtefattoVoce(neutra, dati);
    assert.equal(iN.contenitore, undefined, 'neutra: nessuna riserva');
    assert.equal(contenitori([voce(id)], dati).length, 0, 'neutra: non è un contenitore');
    for (const colore of COLORI_PIETRA) {
      const v = voce(id, { pietra: { colore } });
      const i = infoArtefattoVoce(risolvi(v, cat), dati);
      assert.deepEqual(i.contenitore, { energia: colore, capacita_pm: pm }, `${pm} PM ${colore}`);
      assert.equal(i.sintonizzazione, snt + (colore === 'Bianco' ? 1 : 0));
      const c = contenitori([v], dati);
      assert.equal(c.length, 1);
      assert.equal(c[0].energia, colore);
      assert.equal(c[0].capacita, pm);
      assert.equal(c[0].costo, snt + (colore === 'Bianco' ? 1 : 0), 'la SnT del colore scelto');
    }
  }
});

test('A.291: il colore scelto alla sintonizzazione si registra sulla voce e sopravvive a ogni normalizzazione; un colore non valido (Viola) no', () => {
  const v = voce('pietra-di-luna-10-pm', { sintonizzato: true, pietra: { colore: 'Verde' } });
  const n = normalizzaEquipaggiamento([v], dati)[0];
  assert.equal(n.pietra.colore, 'Verde');
  assert.equal(n.sintonizzato, true);
  assert.equal(colorePietra(n), 'Verde');
  const viola = normalizzaEquipaggiamento([voce('pietra-di-luna-10-pm', { pietra: { colore: 'Viola' } })], dati)[0];
  assert.equal(viola.pietra, undefined, 'il Viola non rientra in questa procedura (§26.8)');
  assert.equal(colorePietra(viola), null);
});

test('A.291: il promemoria dei 7 giorni è scritto, e dice che la scadenza la conferma il Direttore', () => {
  assert.match(PROMEMORIA_VINCOLO, /7 giorni di gioco consecutivi senza contatto/);
  assert.match(PROMEMORIA_VINCOLO, /Il Direttore tiene il conto e conferma la scadenza/);
  assert.match(PROMEMORIA_VINCOLO, /L.app non applica la scadenza da sola/);
});

test('A.291 — IL CONTROLLO CHE CONTA: una pietra NON si svuota senza la conferma del Direttore (né da una chiamata senza «dalDirettore», né da nuova sessione, né dal tempo che passa)', () => {
  const eq = [voce('pietra-di-luna-15-pm', { sintonizzato: true, pietra: { colore: 'Blu' } })];
  const sessione = { ...inizializzaSessione({ pv: 16, pm: 9, puntiEroe: 10, ferite: 6, caricatori: {} }), chroma: { [eq[0].uid]: { pmAttuali: 12 } } };
  // 1. la funzione che svuota, senza il Direttore: rifiuta e non cambia niente
  for (const opz of [undefined, {}, { dalDirettore: false }, { dalDirettore: 'sì' }, { dalDirettore: 1 }]) {
    const r = confermaScadenzaVincolo(eq, sessione, eq[0].uid, opz);
    assert.equal(r.ok, false, `senza il Direttore (${JSON.stringify(opz)}) non parte`);
    assert.match(r.motivo, /solo il Direttore/);
  }
  assert.equal(sessione.chroma[eq[0].uid].pmAttuali, 12, 'la sessione non è stata toccata');
  assert.equal(eq[0].pietra.colore, 'Blu');
  // 2. nessun altro percorso la svuota: nuova sessione e riallineamento dei massimi, anche ripetuti
  const sc = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: eq }, livelli: [], sessione }, dati);
  const massimi = { pv: 16, pm: 9, puntiEroe: 10 };
  let s = sessione;
  for (let i = 0; i < 30; i++) { s = allineaSessione(s, massimi); s = nuovaSessione(s, massimi); }
  assert.equal(s.chroma?.[eq[0].uid]?.pmAttuali, 12, 'trenta «Nuova sessione» di fila (≥ 7 giorni di gioco) non svuotano la pietra: la scadenza la conferma il Direttore');
  assert.equal(normalizzaEquipaggiamento(eq, dati)[0].pietra.colore, 'Blu', 'e il colore resta');
  assert.ok(sc, 'la scheda si calcola');
  // 3. solo con la conferma del Direttore: svuota, toglie colore e sintonizzazione, scrive la riga
  const ok = confermaScadenzaVincolo(eq, sessione, eq[0].uid, { dalDirettore: true, quando: new Date('2026-11-23T20:00:00Z') });
  assert.equal(ok.ok, true);
  assert.equal(ok.sessione.chroma[eq[0].uid].pmAttuali, 0, 'si svuota');
  assert.equal(ok.voci[0].pietra, undefined, 'torna neutra');
  assert.equal(ok.voci[0].sintonizzato, undefined, 'la sintonizzazione si interrompe');
  assert.match(ok.riga, /confermato dal Direttore/);
  assert.match(ok.riga, /12 PM dispersi/);
  assert.equal(contenitori(ok.voci, dati).length, 0, 'neutra: non è più un contenitore');
  // e una pietra già neutra non ha un vincolo da far scadere
  assert.equal(confermaScadenzaVincolo(ok.voci, ok.sessione, eq[0].uid, { dalDirettore: true }).ok, false);
});

test('A.291: nel codice dell’app l’unico chiamante della scadenza è il pulsante del Direttore (modalità master)', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const radice = new URL('../src/', import.meta.url);
  const chiamanti = [];
  const visita = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
      if (e.isDirectory()) visita(p);
      else if (e.name.endsWith('.js') && /confermaScadenzaVincolo\(/.test(readFileSync(p, 'utf8')) && !/pietre-di-luna\.js$/.test(e.name)) chiamanti.push(e.name);
    }
  };
  visita(radice);
  assert.deepEqual(chiamanti, ['app.js'], 'solo app.js, dentro ctx.master.scadenzaPietra');
  const app = readFileSync(new URL('ui/app.js', radice), 'utf8');
  assert.match(app, /scadenzaPietra: \(uid\) => \{[\s\S]{0,200}dalDirettore: true/, 'con dalDirettore: true, e solo lì');
  const tab = readFileSync(new URL('ui/tab.js', radice), 'utf8');
  assert.match(tab, /ctx\.master && colore \? h\('button'/, 'il pulsante compare solo con ctx.master');
});

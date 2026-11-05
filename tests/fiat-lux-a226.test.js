// Lotto 173, A.226 e A.227 (Davide, 02/11 e 03/11/2026): «FIAT LUX è il nome personalizzato dello Scout dei PG. Le
// denominazioni «FIAT LUX» e «Scout dei PG» indicano la stessa istanza di veicolo, con un unico inventario, le stesse
// riserve, munizioni, Integrità e storico. […] Applicare a questa istanza gli aggiornamenti approvati senza creare un
// altro veicolo o duplicarne le dotazioni.» Il record di prova ha la forma di quello della campagna (veicoli/, in Lx).
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { normalizzaVeicoli, nuovoVeicolo, vistaVeicoloPersonaggio, aggiungiRicambioEnergia, installaRicambioEnergia } from '../src/veicoli.js';
import { normalizzaRecord, migraVeicoli, riferimento, conCopie, nuovoRecord } from '../src/veicoli-registro.js';

const { dati } = await datiReali();
const SCOUT = dati.veicoli.profili.find((p) => p.id === 'asa-scout-mk4');

/** Il record com'è nella campagna: salvato prima del 31/10, riserve in Lx, 800 colpi di riserva, ricambi Rosso e Verde. */
const fiatLux = (nome = 'FIAT LUX') => ({
  formato: 'mutant-veicolo', versione: 1, id: 'veimuu14mqa0', revisione: 12, aggiornato: '2026-10-20T10:00:00.000Z',
  proprietario: { tipo: 'gruppo' }, conducente: { chiave: 'Pablo-Zaion', nome: 'PABLO ZAION' }, mitragliere: null, movimento: null,
  mezzo: {
    uid: 'veimuu14mqa0', profilo: 'asa-scout-mk4', nome, andatura: 'fermo', pi: { corpo: 52, propulsione: 36, motore: 21 },
    energia: { rosso: [50000, 50000], rosso_ricambi: [50000], verde: [10000], verde_ricambi: [10000], aria: { fissa: 8, bombole: [8, 8] } },
    munizioni: [{ caricate: 400, riserva: 800 }], avarie: 'graffio sul portellone',
  },
});
const riapri = (rec) => normalizzaRecord(JSON.parse(JSON.stringify(rec)), dati);

test('A.226: lo standard della scheda 0.6 è il catalogo; il FIAT LUX tiene quello che ha', () => {
  assert.equal(SCOUT.prezzo_cr, 126510);
  assert.equal(SCOUT.valore_voci.reduce((t, x) => t + x.cr, 0), 126510);
  assert.deepEqual(SCOUT.ricambi_cr_per_pi, { corpo: 300, propulsione: 100, motore: 300 });
  assert.deepEqual(SCOUT.armi[0].munizioni_iniziali, { caricate: 400, riserva: 400 });
  // il FIAT LUX: i 400 colpi in più restano, danni e avarie anche
  const r = riapri(fiatLux());
  assert.deepEqual(r.mezzo.munizioni, [{ caricate: 400, riserva: 800 }]);
  assert.deepEqual(r.mezzo.pi, { corpo: 52, propulsione: 36, motore: 21 });
  assert.equal(r.mezzo.avarie, 'graffio sul portellone');
  assert.equal(r.mezzo.nome, 'FIAT LUX', 'il nome personalizzato resta');
  assert.equal(r.mezzo.profilo, 'asa-scout-mk4', 'il modello di riferimento resta Scout MK4');
  // la dotazione di prima (A.101) resta all'esemplare
  assert.equal(r.mezzo.dotazione_esemplare.da, 'A.101');
  assert.match(r.mezzo.dotazione_esemplare.testo, /Pistola sanitaria/);
  // prezzo di catalogo e valore stimato: due campi; il secondo vuoto finché lo decide il Direttore
  const v = vistaVeicoloPersonaggio(r.mezzo, dati);
  assert.deepEqual([v.valore.catalogo, v.valore.stimato, v.valore.esemplareUnico], [126510, null, false]);
  assert.equal(v.dotazione.esemplare, true);
  const stimato = vistaVeicoloPersonaggio(riapri({ ...fiatLux(), mezzo: { ...r.mezzo, valore_stimato_cr: 90000 } }).mezzo, dati);
  assert.deepEqual([stimato.valore.catalogo, stimato.valore.stimato], [126510, 90000]);
  // uno Scout nuovo parte dallo standard: 400 + 400, niente ricambi, niente dotazione di prima
  const nuovo = nuovoVeicolo('asa-scout-mk4', dati);
  assert.deepEqual(nuovo.munizioni, [{ caricate: 400, riserva: 400 }]);
  assert.deepEqual([nuovo.energia.rosso_ricambi, nuovo.energia.verde_ricambi], [[], []]);
  assert.equal(normalizzaVeicoli([nuovo], dati)[0].dotazione_esemplare, undefined);
});

test('A.227: il Banco Rosso diventa un MEC Rosso e il Modulo Verde una CEC Verde, con la frazione, una volta sola', () => {
  const r = riapri(fiatLux());
  const e = r.mezzo.energia;
  assert.deepEqual([e.rosso, e.rosso_ricambi, e.verde, e.verde_ricambi], [10, [10], 10, [10]]);
  assert.equal(e.ricambi_da_convertire, undefined);
  assert.deepEqual(e.ricambi_prima, { regola: 'A.227', rosso: { lx: [50000], capacita_lx: 50000, cariche: 10 }, verde: { lx: [10000], capacita_lx: 10000, cariche: 10 } });
  // riaprendo non si riconverte e non si aggiungono ricambi
  const due = riapri(riapri(r));
  assert.deepEqual(due.mezzo.energia, e);
  // un ricambio a metà vale metà delle cariche; a 6.666 Lx su 10.000 la frazione resta (A.228)
  const meta = fiatLux();
  meta.mezzo.energia.rosso_ricambi = [25000];
  meta.mezzo.energia.verde_ricambi = [6666];
  const m = riapri(meta).mezzo.energia;
  assert.deepEqual([m.rosso_ricambi, m.verde_ricambi], [[5], [6.666]]);
  // senza la capacità di prima la frazione non si ricostruisce: resta da verificare dal Direttore, senza numero
  const senza = structuredClone(dati);
  delete senza.veicoli.profili.find((p) => p.id === 'asa-scout-mk4').energia_precedente.ricambio_verde_lx;
  const d = normalizzaRecord(fiatLux(), senza).mezzo.energia;
  assert.deepEqual([d.verde_ricambi, d.ricambi_da_convertire], [[], { verde: [10000] }]);
  // i ricambi convertiti si installano come quelli di sempre (niente travaso)
  const inst = installaRicambioEnergia({ ...r.mezzo, energia: { ...e, rosso: 3 } }, 'rosso', dati);
  assert.deepEqual([inst.energia.rosso, inst.energia.rosso_ricambi], [10, [3]]);
});

test('il FIAT LUX non si sdoppia: un record, un inventario, comunque lo si apra o lo si rinomini', () => {
  const rec = riapri(fiatLux('ASA Scout MK4'));
  // il nome personalizzato si scrive sul record: lo stesso id, nessun veicolo nuovo
  const rinominato = riapri({ ...rec, mezzo: { ...rec.mezzo, nome: 'FIAT LUX' } });
  assert.equal(rinominato.id, rec.id);
  assert.deepEqual({ ...rinominato.mezzo, nome: 'x' }, { ...rec.mezzo, nome: 'x' }, 'cambia solo il nome');
  // due PG che lo vedono: entrambi un riferimento allo stesso record, nessuna copia in più
  const registro = [rinominato];
  const pablo = migraVeicoli([riferimento(rinominato)], { chiave: 'Pablo-Zaion' }, registro);
  const duncan = migraVeicoli([{ ...rinominato.mezzo, gruppo: true }], { chiave: 'DUNCAN-MCDUFF' }, registro);
  assert.deepEqual([pablo.nuovi.length, duncan.nuovi.length], [0, 0], 'nessun record nuovo');
  assert.equal(duncan.veicoli[0].rif, 'veimuu14mqa0', 'la copia con lo stesso uid diventa il riferimento');
  assert.equal(conCopie(pablo.veicoli, registro)[0].nome, 'FIAT LUX');
  // aggiungere un ricambio cambia le riserve dell'esemplare, non crea un veicolo
  const piu = aggiungiRicambioEnergia(rinominato.mezzo, 'rosso', dati);
  assert.equal(piu.uid, rinominato.id);
  assert.deepEqual(piu.energia.rosso_ricambi, [10, 10]);
  // e riaprendo un record già aggiornato non si raddoppiano munizioni, ricambi né dotazione
  const tre = riapri(riapri(riapri(rinominato)));
  assert.deepEqual(tre.mezzo, rinominato.mezzo);
  assert.equal(nuovoRecord(tre.mezzo, { chiave: 'Pablo-Zaion' }, { gruppo: true }).id, 'veimuu14mqa0');
});

test('tools/fiat-lux.mjs (sola lettura) segnala uno sdoppiamento: due Scout del gruppo, o una copia locale fuori dal registro', async () => {
  const { quadroScout } = await import('../tools/fiat-lux.mjs');
  const uno = fiatLux();
  assert.deepEqual(quadroScout([uno], [{ file: 'Pablo.json', pg: { scelte: { veicoli: [riferimento(uno)] } } }]).avvisi, []);
  const doppio = { ...fiatLux(), id: 'veialtro01', mezzo: { ...fiatLux().mezzo, uid: 'veialtro01', nome: 'Scout dei PG' } };
  assert.match(quadroScout([uno, doppio], []).avvisi.join(), /Scout del gruppo nel registro: 2/);
  const locale = { uid: 'veilocale1', profilo: 'asa-scout-mk4', nome: 'Scout dei PG', gruppo: true };
  assert.match(quadroScout([uno], [{ file: 'Duncan.json', pg: { scelte: { veicoli: [locale] } } }]).avvisi.join(), /sarebbe un secondo veicolo/);
});

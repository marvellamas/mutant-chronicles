import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 186, parte B (dal tavolo del 9/11): Davide aveva configurato il progetto della CyberArma di Dimitri («la
// cyberlama») e poi l'aveva cercata fra gli oggetti senza trovarla. Non è un difetto: è la regola del lotto 157 —
// l'arma del progetto non è di nessuno finché il Direttore non preme «Consegna l'arma». Il difetto era che non lo
// diceva nessuno: né il pannello del progetto, né l'Inventario, né la ricerca.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avvisoNonConsegnata, vociProgetti, apriProgetto, consegnaArma, modelliProgetto } from '../src/progetti.js';
import { vociScheda, cercaVoci } from '../src/cerca-scheda.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const MODELLO = 'paradise-dimitri';
const progetto = () => apriProgetto([], MODELLO, dati, { quando: '2026-11-09T20:00:00.000Z', da: 'Direttore' }).lista[0];

test('il modello del progetto della CyberArma è nel catalogo (è quello che Davide ha configurato)', () => {
  const m = modelliProgetto(dati).find((x) => x.id === MODELLO);
  assert.ok(m, 'il modello c’è');
  assert.match(m.nome, /CyberArma/);
  assert.equal(m.risultato.aggiorna_esemplare, true, 'aggiorna l’arma che il PG ha già, non ne crea una seconda');
});

test('un progetto aperto dice in chiaro che l’arma non è ancora di nessuno', () => {
  const p = progetto();
  // il caso di Davide: nessuna CyberArma nell’inventario
  const senza = avvisoNonConsegnata(p, dati, { equipaggiamento: [] });
  assert.ok(senza, 'l’avviso c’è');
  assert.match(senza.titolo, /non è nell’inventario di nessuno/);
  assert.match(senza.testo, /Consegna l’arma/);
  assert.match(senza.testo, /non crea un’arma nuova/);
  // con l’arma già nell’inventario: le modifiche non ci sono ancora
  const con = avvisoNonConsegnata(p, dati, { equipaggiamento: [{ uid: 'a', rif: 'armi:cyberarma' }] });
  assert.match(con.titolo, /non sono ancora sull’arma/);
  assert.match(con.testo, /Consegna l’arma/);
});

test('consegnata, l’avviso sparisce: è il segno che non resta appiccicato', () => {
  const p = progetto();
  assert.ok(avvisoNonConsegnata(p, dati, { equipaggiamento: [] }));
  assert.equal(avvisoNonConsegnata({ ...p, consegna: { quando: '2026-11-10T10:00:00.000Z', da: 'Direttore' } }, dati, { equipaggiamento: [] }), null);
});

test('chi cerca quel nome nella scheda lo trova come progetto, invece di non trovare niente', () => {
  const scheda = { equipaggiamento: { voci: [], oggetti: [], armi: [] } };
  const voci = vociScheda(scheda, {}, dati, { progetti: [progetto()], equipaggiamento: [] });
  for (const parola of ['cyberarma', 'paradise', 'dimitri']) {
    const r = cercaVoci(voci, parola);
    assert.ok(r.length, `cercando «${parola}» si trova qualcosa`);
    assert.ok(r.some((x) => x.gruppo === 'Progetto del Direttore'), `«${parola}» porta al progetto`);
    assert.ok(r.some((x) => /non ancora consegnato/.test(x.valore ?? '')), `«${parola}» dice che non è consegnato`);
    assert.ok(r.some((x) => x.tab === 'artefatti'), `«${parola}» porta dove sta il progetto`);
  }
});

test('senza progetti la ricerca non cambia di una riga', () => {
  const scheda = { equipaggiamento: { voci: [], oggetti: [], armi: [] } };
  const senza = vociScheda(scheda, {}, dati);
  const vuoto = vociScheda(scheda, {}, dati, { progetti: [] });
  assert.deepEqual(senza, vuoto);
  assert.equal(senza.filter((x) => x.gruppo === 'Progetto del Direttore').length, 0);
});

test('l’arma consegnata arriva davvero nell’inventario, e una volta sola', () => {
  const p = progetto();
  const creazione = { equipaggiamento: [{ uid: 'cy1', rif: 'armi:cyberarma', stato: 'impugnata' }], progettiMaster: [p] };
  const r = consegnaArma(creazione, p.id, dati, { quando: '2026-11-10T10:00:00.000Z', master: true, uid: 'nuovo', provenienza: 'l’originale di Park' });
  assert.ok(!r.errore, r.errore);
  const cy = (r.creazione.equipaggiamento ?? []).filter((v) => typeof v.rif === 'string' && v.rif.startsWith('armi:cyberarma'));
  assert.equal(cy.length, 1, 'resta una sola CyberArma: si aggiorna quella che c’è (A.231)');
  assert.ok(cy[0].consegna, 'la voce porta la consegna');
  // da qui l’avviso non c’è più
  const dopo = r.creazione.progettiMaster.find((x) => x.id === p.id);
  assert.equal(avvisoNonConsegnata(dopo, dati, { equipaggiamento: r.creazione.equipaggiamento }), null);
});

test('senza l’arma da aggiornare la consegna si ferma e lo dice: nessun oggetto si perde per strada', () => {
  const p = progetto();
  const creazione = { equipaggiamento: [], progettiMaster: [p] };
  const r = consegnaArma(creazione, p.id, dati, { quando: '2026-11-10T10:00:00.000Z', master: true, uid: 'nuovo' });
  assert.match(r.errore ?? '', /non c’è la CyberArma da modificare/);
  assert.equal(r.creazione, undefined, 'niente viene scritto');
});

test('solo il Direttore consegna: dal tablet non parte', () => {
  const p = progetto();
  const r = consegnaArma({ equipaggiamento: [{ uid: 'cy1', rif: 'armi:cyberarma' }], progettiMaster: [p] }, p.id, dati, { quando: 'x', master: false, uid: 'n' });
  assert.match(r.errore ?? '', /solo il Direttore/);
});

test('vociProgetti distingue consegnato e non consegnato', () => {
  const p = progetto();
  const [a] = vociProgetti([p], dati, { equipaggiamento: [] });
  assert.equal(a.consegnata, false);
  assert.equal(a.nome, 'CyberArma Dimitri');
  const [b] = vociProgetti([{ ...p, consegna: { quando: '2026-11-10T10:00:00.000Z' } }], dati, { equipaggiamento: [] });
  assert.equal(b.consegnata, true);
  assert.match(b.stato, /consegnata/);
  assert.deepEqual(vociProgetti(null, dati), []);
});

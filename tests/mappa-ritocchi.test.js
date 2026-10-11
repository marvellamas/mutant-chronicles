// Ritocchi del 12/10/2026 (segnalazioni di Marcello): menu «Vista» della barra della mappa, porte che si cancellano (gomma e selezione), nebbia che si apre muovendo i PG anche con «Mappa
// semplice».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { daBase64, inBase64, impostaCella, cella, nuovaMaschera } from '../src/mappa/celle.js';
import { DISPOSIZIONI, NOMI_DISPOSIZIONI, etichettaVista, prossimaDisposizione, disposizioneIniziale, normalizzaDisposizione, chiaveSchermo } from '../src/mappa/disposizione.js';
import { nuovaPorta, agganciaPorta, portaSotto, porteNellaForma, lineePerDisegno, lineeEffettive, muriPerDisegno, muriEffettivi } from '../src/mappa/porte.js';
import { nuovaLinea, attraversa } from '../src/mappa/muri-linee.js';
import { cambiaPortaAnnullabile, annullaUltima } from '../src/mappa/annulla.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { apriNebbiaConPg } from '../src/mappa/visuale.js';
import { nebbiaConPg, modoNebbia, conSemplice, semplicePredefinita } from '../src/mappa/semplice.js';

const { dati } = await datiReali();
const scena = (extra = {}) => ({ ...nuovaScena({ id: 'chiesa', nome: 'Chiesa', colonne: 12, righe: 8, nebbia: 'scoperta', dati }), revisione: 1, ...extra });

// ── 2. barra della mappa: menu «Vista» ──
test('menu «Vista»: l’etichetta dice la disposizione attuale; sceglierla la cambia e si ricorda come prima', () => {
  assert.deepEqual(DISPOSIZIONI.map(etichettaVista), ['Vista: Mappa grande', 'Vista: Equilibrata', 'Vista: Scontro grande']);
  assert.deepEqual(DISPOSIZIONI.map((d) => NOMI_DISPOSIZIONI[d]), ['Mappa grande', 'Equilibrata', 'Scontro grande']);
  const B = dati.mappa.vista?.barra ?? dati.mappa.disposizione ?? Object.values(dati.mappa).find((v) => v && typeof v === 'object' && 'scontro_grande' in v);
  // scelta dal menu: lo stato salvato (per schermo) torna uguale alla lettura
  const iniziale = disposizioneIniziale(B);
  assert.equal(etichettaVista(iniziale.disposizione), 'Vista: Equilibrata');
  const scelta = { ...iniziale, disposizione: 'scontro' };
  const riletta = normalizzaDisposizione(JSON.parse(JSON.stringify(scelta)), B);
  assert.deepEqual([riletta.disposizione, etichettaVista(riletta.disposizione)], ['scontro', 'Vista: Scontro grande']);
  assert.equal(normalizzaDisposizione({ disposizione: 'inventata' }, B).disposizione, 'equilibrata');
  assert.equal(chiaveSchermo(1280, 720), 'mutant-mappa-disposizione:1280x720');
  // Tab passa ancora alla prossima
  assert.equal(prossimaDisposizione('equilibrata'), 'scontro');
});

// ── 3. cancellare le porte ──
const parete = () => nuovaLinea({ id: 'parete', punti: [[0, 3], [12, 3]], spessore: 0.25 });
const conPorta = (stato = 'chiusa') => {
  const base = scena({ muriLinee: [parete()] });
  // una porta agganciata al muro disegnato sul bordo fra due Q: il suo Q è [5, 2], ma si vede sul tratto a y = 3
  return { ...base, porte: [nuovaPorta({ id: 'p1', q: [5, 2], stato, aggancio: agganciaPorta(base, [5, 2], [5.5, 2.95], dati) })] };
};

test('selezione: un clic dove la porta si vede la trova, anche se il suo Q è un altro; eliminata, il muro si richiude; Ctrl+Z la rimette', () => {
  const s = conPorta();
  assert.equal(portaSotto(s, [5.4, 3.1], dati).id, 'p1', 'sul battente, nel Q sotto');
  assert.equal(portaSotto(s, [5.6, 2.9], dati).id, 'p1');
  assert.equal(portaSotto(s, [9, 3], dati), null, 'sul muro, lontano dalla porta');
  assert.equal(portaSotto(s, [5.5, 5], dati), null);
  // con la porta il muro è interrotto; tolta, è di nuovo intero
  assert.equal(lineePerDisegno(s, dati).length, 2);
  const senza = cambiaPortaAnnullabile(s, s.porte[0], null, dati);
  assert.deepEqual([senza.porte, lineePerDisegno(senza, dati).map((l) => l.punti)], [[], [[[0, 3], [12, 3]]]]);
  assert.equal(attraversa(lineeEffettive(senza), [5.5, 2], [5.5, 4]), true, 'il muro blocca di nuovo dove c’era la porta');
  assert.equal(validaScena(senza, dati), null);
  // i giocatori non vedono più la porta e vedono il muro intero
  const vista = vistaGiocatori(senza, { regoleTemplate: dati.mappa.template, regoleMappa: dati.mappa, pezzi: [] });
  assert.deepEqual([vista.porte, vista.muriLinee.map((l) => l.punti)], [[], [[[0, 3], [12, 3]]]]);
  // Ctrl+Z
  const rimessa = annullaUltima(senza).scena;
  assert.deepEqual([rimessa.porte.map((p) => p.id), lineePerDisegno(rimessa, dati).length], [['p1'], 2]);
});

test('gomma: toglie le porte che tocca, a pennello e a rettangolo; quelle fuori restano', () => {
  const s = conPorta('aperta');
  // pennello sul Q [5, 3] (sotto il muro): il battente a y = 3 è sul bordo del quadrato
  assert.deepEqual(porteNellaForma(s, { tipo: 'rettangolo', x0: 5, y0: 3, x1: 6, y1: 4 }, dati).map((p) => p.id), ['p1']);
  // pennello sul Q della porta
  assert.deepEqual(porteNellaForma(s, { tipo: 'rettangolo', x0: 5, y0: 2, x1: 6, y1: 3 }, dati).map((p) => p.id), ['p1']);
  // rettangolo largo
  assert.deepEqual(porteNellaForma(s, { tipo: 'rettangolo', x0: 2, y0: 1, x1: 9, y1: 5 }, dati).map((p) => p.id), ['p1']);
  // lontano: niente
  assert.deepEqual(porteNellaForma(s, { tipo: 'rettangolo', x0: 8, y0: 2, x1: 9, y1: 4 }, dati), []);
  assert.deepEqual(porteNellaForma(s, { tipo: 'rettangolo', x0: 5, y0: 5, x1: 6, y1: 6 }, dati), []);
  // porta su un muro a quadretto: la gomma sul suo Q la toglie, e il Q torna muro
  const m = daBase64(scena().muri);
  for (let x = 0; x < 12; x++) impostaCella(m, 12, 8, x, 3, true);
  const murata = scena({ muri: inBase64(m), porte: [nuovaPorta({ id: 'q1', q: [5, 3], stato: 'aperta', orientamento: 'orizzontale' })] });
  const prese = porteNellaForma(murata, { tipo: 'rettangolo', x0: 5, y0: 3, x1: 6, y1: 4 }, dati);
  assert.deepEqual(prese.map((p) => p.id), ['q1']);
  const senza = cambiaPortaAnnullabile(murata, prese[0], null, dati);
  assert.deepEqual([cella(muriPerDisegno(senza), 12, 8, 5, 3), cella(muriEffettivi(senza), 12, 8, 5, 3)], [true, true]);
});

// ── 4. la nebbia si apre con i PG ──
// stanza a sinistra (PG in [1, 1]), un muro verticale di Q in colonna 5 con una porta in [5, 3]; tutto coperto
const conNebbia = ({ semplice, porta = 'chiusa', automatica = undefined, pg = [1, 3] } = {}) => {
  const base = nuovaScena({ id: 'stanza', nome: 'Stanza', colonne: 12, righe: 8, nebbia: 'coperta', dati, ...(semplice === undefined ? {} : { semplice }) });
  const m = daBase64(base.muri);
  for (let y = 0; y < 8; y++) impostaCella(m, 12, 8, 5, y, true);
  return {
    ...base, revisione: 1, muri: inBase64(m),
    porte: [nuovaPorta({ id: 'p', q: [5, 3], stato: porta, orientamento: 'verticale' })],
    token: [{ id: 't-pg', rif: { tipo: 'partecipante', id: 'pg:Akira' }, q: pg, ingombro: 1, nascosto: false }],
    ...(automatica === undefined ? {} : { visuale: { automatica } }),
  };
};
const coperto = (s, x, y) => cella(daBase64(s.nebbia.coperti), 12, 8, x, y);

test('diagnosi: l’interruttore è acceso di base per le scene nuove; le scene di prima restano spente', () => {
  assert.equal(dati.mappa.visuale.automatica_predefinita, true);
  // scena nuova creata dall'app: Mappa semplice e nebbia che si apre con i PG
  const nuova = nuovaScena({ id: 'n', nome: 'N', colonne: 4, righe: 4, dati, semplice: semplicePredefinita(dati), nebbiaConPg: dati.mappa.visuale.automatica_predefinita });
  assert.deepEqual([nuova.visuale, nebbiaConPg(nuova, dati), modoNebbia(nuova, dati)], [{ automatica: true }, true, 'semplice']);
  // scena creata dopo «Mappa semplice» ma prima di questo ritocco (ha `semplice`, non ha `visuale`): era il caso di Marcello
  assert.deepEqual([nebbiaConPg(conNebbia({ semplice: true }), dati), modoNebbia(conNebbia({ semplice: true }), dati)], [true, 'semplice']);
  // scena più vecchia (né l'uno né l'altro): resta com'era, spenta
  assert.deepEqual([nebbiaConPg(conNebbia(), dati), modoNebbia(conNebbia(), dati)], [false, null]);
  // con la mappa completa: luci e sensi
  assert.equal(modoNebbia(conNebbia({ semplice: false, automatica: true }), dati), 'completa');
});

test('con «Mappa semplice» accesa la nebbia si apre dove il PG vede, fermata dal muro e dalla porta chiusa', () => {
  const s = conNebbia({ semplice: true });
  const aperta = apriNebbiaConPg(s, dati);
  assert.ok(aperta, 'si apre');
  assert.deepEqual([coperto(aperta, 1, 3), coperto(aperta, 3, 1), coperto(aperta, 4, 6)], [false, false, false], 'la stanza del PG');
  assert.deepEqual([coperto(aperta, 8, 3), coperto(aperta, 10, 6), coperto(aperta, 7, 0)], [true, true, true], 'oltre il muro e la porta chiusa resta coperto');
  assert.equal(validaScena(aperta, dati), null);
  // porta aperta: si vede oltre la porta, non oltre il muro
  const conPortaAperta = apriNebbiaConPg(conNebbia({ semplice: true, porta: 'aperta' }), dati);
  assert.equal(coperto(conPortaAperta, 8, 3), false, 'attraverso la porta aperta');
  assert.equal(coperto(conPortaAperta, 7, 0), true, 'dietro il muro no');
  // quello che è scoperto resta scoperto quando il PG torna indietro; il master può ricoprire a mano
  const tornato = { ...conPortaAperta, token: [{ ...conPortaAperta.token[0], q: [1, 6] }], porte: [{ ...conPortaAperta.porte[0], stato: 'chiusa' }] };
  const dopo = apriNebbiaConPg(tornato, dati) ?? tornato;
  assert.equal(coperto(dopo, 8, 3), false);
  const ricoperta = { ...dopo, nebbia: { ...dopo.nebbia, coperti: inBase64(nuovaMaschera(12, 8, true)) } };
  assert.equal(coperto(ricoperta, 8, 3), true);
  // senza PG sulla mappa non si apre niente
  assert.equal(apriNebbiaConPg({ ...s, token: [] }, dati), null);
});

test('con «Mappa semplice» spenta (mappa completa) si apre lo stesso, con le stesse barriere', () => {
  const s = conNebbia({ semplice: false, automatica: true });
  const aperta = apriNebbiaConPg(s, dati);
  assert.ok(aperta);
  assert.deepEqual([coperto(aperta, 1, 3), coperto(aperta, 8, 3)], [false, true]);
  // passando da completa a semplice l'interruttore resta acceso
  assert.equal(modoNebbia(conSemplice(s, true), dati), 'semplice');
});

test('interruttore spento: la nebbia non si apre, né con la Mappa semplice né senza', () => {
  assert.equal(apriNebbiaConPg(conNebbia({ semplice: true, automatica: false }), dati), null);
  assert.equal(apriNebbiaConPg(conNebbia({ semplice: false, automatica: false }), dati), null);
  assert.equal(apriNebbiaConPg(conNebbia(), dati), null, 'scena di prima: spento finché il master non lo accende');
  // riacceso, si apre
  assert.ok(apriNebbiaConPg(conNebbia({ automatica: true }), dati));
});

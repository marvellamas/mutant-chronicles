// Porte della mappa di battaglia (fase 2, lotto 2; src/mappa/porte.js; A.125, decisione 130): stati aperta, chiusa,
// bloccata e segreta; movimento (porta aperta = passaggio, chiusa o bloccata = muro), AzP e registro, segrete mai
// inviate ai giocatori, formato della scena e Ctrl+Z.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { muriEffettivi, portaA, apriChiudi, nuovaPorta, conAzione, azpNelRound, adiacente, porteVicine, portePerGiocatori, muriPerGiocatori, orientamento, orientamentoPorta, ruotaPorta, bloccaVista, agganciaPorta, agganciaDiPorta, latoVicino } from '../src/mappa/porte.js';
import { nuovaLinea, spessoreQ } from '../src/mappa/muri-linee.js';
import { areaRaggiungibile, costoVerso } from '../src/mappa/area.js';
import { cambiaPortaAnnullabile, annullaUltima } from '../src/mappa/annulla.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { vistaGiocatori } from '../src/mappa/vista.js';
import { nuovoScontro, rigaPorta } from '../src/scontro.js';
import { daBase64, inBase64, rettangolo, cella, nuovaMaschera, impostaCella } from '../src/mappa/celle.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const RP = dati.mappa.porte;
const C = 12, R = 8;

/** Muro verticale sulla colonna 5 (righe 0–7) con una porta in (5, 3). */
function scena(stato = 'chiusa', o = {}) {
  const s = { ...nuovaScena({ id: 'porte', nome: 'Porte', colonne: C, righe: R, nebbia: 'scoperta', dati }), revisione: 0 };
  s.muri = inBase64(rettangolo(nuovaMaschera(C, R), C, R, 5, 0, 5, R - 1, true));
  s.porte = [nuovaPorta({ id: 'p1', q: [5, 3], stato, ...o })];
  return s;
}
const area = (s, chi = [3, 3], massimo = 10) => areaRaggiungibile({ colonne: C, righe: R, muri: muriEffettivi(s), terreno: daBase64(s.terreno), token: [], chi: { id: 'me', q: chi, ingombro: 1, lato: 'pg' }, massimo, regole: dati.mappa.movimento });

test('dati: la regola di Davide (A.125) e gli stati distinti', () => {
  assert.match(RP._nota, /costa 1 AzP, senza prova/);
  assert.match(RP._nota, /«chiusa» e «bloccata» sono condizioni distinte/);
  assert.deepEqual(RP.stati, ['aperta', 'chiusa', 'bloccata']);
  assert.equal(RP.costo_azp, 1);
  assert.deepEqual(RP.bloccano_vista, ['chiusa', 'bloccata']);
  assert.ok(bloccaVista({ stato: 'chiusa' }, RP) && !bloccaVista({ stato: 'aperta' }, RP), 'prossimo lotto: una porta chiusa blocca la vista');
  const d = copia(dati);
  d.mappa.porte.stati = ['aperta', 'chiusa'];
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'porte.stati'));
});

test('movimento: aperta = passaggio, chiusa e bloccata = muro (percorso dall’altra parte del muro)', () => {
  assert.equal(costoVerso(area(scena('aperta')), [7, 3]), 4, 'attraverso la porta aperta, al costo normale');
  for (const stato of ['chiusa', 'bloccata']) assert.equal(costoVerso(area(scena(stato)), [7, 3]), Infinity, stato);
  assert.ok(cella(muriEffettivi(scena('chiusa')), C, R, 5, 3));
  assert.ok(!cella(muriEffettivi(scena('aperta')), C, R, 5, 3));
  // una porta aperta messa dove non c'è muro resta un passaggio; chiusa diventa muro
  const libera = { ...scena('chiusa'), muri: inBase64(nuovaMaschera(C, R)) };
  assert.ok(cella(muriEffettivi(libera), C, R, 5, 3));
});

test('diagonali accanto alla porta come per i muri (A.124, A.134): rasente sì, fra porta chiusa e muro a spigolo no', () => {
  // una porta chiusa isolata in (5, 3), senza muri attorno: la diagonale (4, 3) → (5, 2) le passa rasente
  const s = { ...nuovaScena({ id: 'd', nome: 'D', colonne: C, righe: R, nebbia: 'scoperta', dati }), revisione: 0 };
  s.muri = inBase64(nuovaMaschera(C, R));
  s.porte = [nuovaPorta({ id: 'p', q: [5, 3], stato: 'chiusa' })];
  // da (4, 3) a (5, 2) in diagonale: un lato (5, 3) è la porta chiusa, l'altro (4, 2) libero → si passa (A.134)
  assert.equal(costoVerso(area(s, [4, 3], 3), [5, 2]), 1);
  // porta chiusa in (5, 3) e muro in (4, 2): passaggio chiuso a spigolo, la diagonale no; aperta sì
  s.muri = inBase64(impostaCella(nuovaMaschera(C, R), C, R, 4, 2, true));
  assert.equal(costoVerso(area(s, [4, 3], 3), [5, 2]), 3);
  s.porte = [{ ...s.porte[0], stato: 'bloccata' }];
  assert.equal(costoVerso(area(s, [4, 3], 3), [5, 2]), 3, 'la bloccata come la chiusa');
  s.porte = [{ ...s.porte[0], stato: 'aperta' }];
  assert.equal(costoVerso(area(s, [4, 3], 3), [5, 2]), 1);
});

test('aprire e chiudere: la bloccata non si apre; AzP del token nel Round e riga nel registro', () => {
  assert.deepEqual(apriChiudi(nuovaPorta({ id: 'p', q: [1, 1], stato: 'bloccata' }), 'apri'), { errore: 'bloccata' });
  assert.equal(apriChiudi(nuovaPorta({ id: 'p', q: [1, 1], stato: 'chiusa' }), 'apri').porta.stato, 'aperta');
  assert.equal(apriChiudi(nuovaPorta({ id: 'p', q: [1, 1], stato: 'aperta' }), 'chiudi').porta.stato, 'chiusa');
  let s = scena('chiusa');
  s = conAzione(s, { id: 'a1', token: 'me', porta: 'p1', azione: 'apri', scontro: 'sc', round: 2, quando: 'x' }, RP);
  s = conAzione(s, { id: 'a2', token: 'me', porta: 'p1', azione: 'chiudi', scontro: 'sc', round: 3, quando: 'x' }, RP);
  assert.equal(azpNelRound(s, 'me', 'sc', 2), 1);
  assert.equal(azpNelRound(s, 'me', 'sc', 4), 0);
  assert.equal(azpNelRound(conAzione(s, { id: 'a3', token: 'me', porta: 'p1', azione: 'apri', scontro: null, round: null, turno: 0, quando: 'x' }, RP), 'me', null, null, 0), 1, 'senza scontro, per turno');
  const r = rigaPorta({ ...nuovoScontro({ id: 'sc', nome: 'S', pg: [] }), round: 2 }, { nome: 'Michele', azione: 'apri', azp: 1 });
  assert.match(r.registro.at(-1).testo, /Michele apre una porta \(1 AzP\)/);
  // adiacente anche in diagonale; un token 2 × 2 con un Q vicino
  const porta = s.porte[0];
  assert.ok(adiacente({ q: [4, 2], ingombro: 1 }, porta) && adiacente({ q: [6, 4], ingombro: 1 }, porta));
  assert.ok(!adiacente({ q: [3, 3], ingombro: 1 }, porta));
  assert.ok(adiacente({ q: [2, 3], ingombro: 2 }, porta) === false && adiacente({ q: [3, 3], ingombro: 2 }, porta));
  assert.deepEqual(porteVicine(s, { q: [4, 3], ingombro: 1 }).map((p) => p.id), ['p1']);
});

test('giocatori: la porta segreta resta muro anche nei dati inviati; le altre arrivano con lo stato; niente sotto la nebbia', () => {
  const s = scena('aperta', { segreta: true });
  s.porte.push(nuovaPorta({ id: 'p2', q: [5, 6], stato: 'bloccata' }));
  const v = vistaGiocatori(s, null, dati.mappa.template);
  assert.deepEqual(v.porte.map((p) => [p.id, p.stato]), [['p2', 'bloccata']]);
  assert.ok(cella(daBase64(v.muri), C, R, 5, 3), 'la segreta è muro');
  assert.ok(!cella(daBase64(v.muri), C, R, 5, 6), 'la porta visibile esce dalla maschera dei muri');
  const testo = JSON.stringify(v);
  assert.ok(!testo.includes('p1') && !testo.includes('segreta'), 'della segreta non arriva nulla');
  // l'area dei giocatori: la segreta aperta è muro
  assert.ok(cella(muriEffettivi(s, { perGiocatori: true }), C, R, 5, 3));
  // rivelata: arriva
  assert.deepEqual(portePerGiocatori({ ...s, porte: s.porte.map((p) => ({ ...p, segreta: false })) }).map((p) => p.id), ['p1', 'p2']);
  // sotto la nebbia: niente
  const coperta = { ...s, nebbia: { ...s.nebbia, coperti: inBase64(rettangolo(nuovaMaschera(C, R), C, R, 4, 5, 6, 7, true)) } };
  assert.deepEqual(portePerGiocatori(coperta).map((p) => p.id), []);
  assert.equal(orientamento(s, [5, 6]), 'verticale', 'lungo il muro verticale');
  assert.ok(cella(muriPerGiocatori(s), C, R, 5, 3) && !cella(muriPerGiocatori(s), C, R, 5, 6));
});

test('formato della scena: porte e azioni validate; Ctrl+Z della porta toglie anche l’AzP del token', () => {
  let s = scena('chiusa');
  assert.equal(validaScena(s, dati), null);
  assert.match(validaScena({ ...s, porte: [{ ...s.porte[0], stato: 'socchiusa' }] }, dati), /^porte\[0\]\.stato/);
  assert.match(validaScena({ ...s, porte: [s.porte[0], { ...s.porte[0], id: 'p9' }] }, dati), /porte\[1\]\.q/);
  assert.match(validaScena({ ...s, porte: [{ ...s.porte[0], q: [C, 0] }] }, dati), /porte\[0\]\.q/);
  assert.match(validaScena({ ...s, azioni: [{ token: 'me', tipo: 'salto' }] }, dati), /^azioni\[0\]/);
  const { porte, azioni, ...vecchia } = s;
  assert.equal(validaScena(vecchia, dati), null, 'le scene di prima, senza porte, restano valide');
  // il token apre: azione + porta nella stessa voce di Ctrl+Z
  s = conAzione(s, { id: 'az1', token: 'me', porta: 'p1', azione: 'apri', azp: 1, scontro: null, round: null, turno: 0, quando: 'x' }, RP);
  s = cambiaPortaAnnullabile(s, s.porte[0], { ...s.porte[0], stato: 'aperta' }, dati, 'az1');
  assert.equal(validaScena(s, dati), null);
  assert.equal(portaA(s, [5, 3]).stato, 'aperta');
  const u = annullaUltima(s);
  assert.equal(portaA(u.scena, [5, 3]).stato, 'chiusa');
  assert.equal(u.scena.azioni.length, 0);
});

test('porte verticali (ritocchi del 07/10): orientamento dai muri vicini, salvato, «Ruota»; scene di prima compatibili', () => {
  // muro verticale (colonna 5) con un muro che sporge a destra accanto alla porta: prima bastava per farla orizzontale
  const s = scena('chiusa');
  const sporgente = { ...s, muri: inBase64(impostaCella(daBase64(s.muri), C, R, 6, 3, true)) };
  assert.equal(orientamento(sporgente, [5, 3]), 'verticale', 'due muri sopra e sotto contro uno a lato');
  // muro orizzontale (riga 4): porta orizzontale; incrocio pieno: orizzontale
  const oriz = { ...s, muri: inBase64(rettangolo(nuovaMaschera(C, R), C, R, 0, 4, C - 1, 4, true)), porte: [] };
  assert.equal(orientamento(oriz, [3, 4]), 'orizzontale');
  // altre porte contano come muro: due porte una sopra l'altra in un muro verticale
  const due = { ...s, muri: inBase64(nuovaMaschera(C, R)), porte: [nuovaPorta({ id: 'a', q: [5, 3] }), nuovaPorta({ id: 'b', q: [5, 4] })] };
  assert.equal(orientamento(due, [5, 3]), 'verticale');
  // salvato: vale quello della porta; senza campo (scene di prima) quello automatico
  assert.equal(nuovaPorta({ id: 'x', q: [1, 1] }).orientamento, undefined);
  const salvata = { ...s, porte: [nuovaPorta({ id: 'p1', q: [5, 3], orientamento: 'orizzontale' })] };
  assert.equal(orientamentoPorta(salvata, salvata.porte[0]), 'orizzontale');
  assert.equal(orientamentoPorta(s, s.porte[0]), 'verticale');
  // «Ruota»: 90°, salvato
  assert.equal(ruotaPorta(s, s.porte[0]).orientamento, 'orizzontale');
  assert.equal(ruotaPorta(salvata, salvata.porte[0]).orientamento, 'verticale');
  // ai giocatori arriva quello salvato; il movimento non cambia (la porta è il Q intero)
  assert.deepEqual(portePerGiocatori(salvata).map((p) => p.orientamento), ['orizzontale']);
  assert.deepEqual(muriEffettivi(salvata), muriEffettivi(s));
  // formato: orientamento facoltativo, solo i due valori
  assert.equal(validaScena(salvata, dati), null);
  assert.equal(validaScena(s, dati), null);
  assert.match(validaScena({ ...s, porte: [{ ...s.porte[0], orientamento: 'obliquo' }] }, dati), /^porte\[0\]\.orientamento/);
});

test('M3 (11/10): la porta si aggancia al muro su cui si mette, non più al centro del Q', () => {
  const s = scena('chiusa');
  // muro a quadretto: si aggancia alla linea della griglia più vicina al punto scelto, lungo l'asse del muro
  // (muro verticale sulla colonna 5: lato ovest o lato est del Q)
  assert.equal(latoVicino(s, [5, 3], [5.2, 3.5]), 'o');
  assert.equal(latoVicino(s, [5, 3], [5.9, 3.5]), 'e');
  // con l'asse scelto a mano (← →) conta quello, non i muri vicini
  assert.equal(latoVicino(s, [5, 3], [5.5, 3.1], 'orizzontale'), 'n');
  assert.equal(latoVicino(s, [5, 3], [5.5, 3.9], 'orizzontale'), 's');
  const a = agganciaPorta(s, [5, 3], [5.9, 3.5], dati);
  assert.deepEqual(a, { lato: 'e', spessore: RP.spessore_q });
  // l'orientamento esce dall'aggancio
  const porta = nuovaPorta({ id: 'p', q: [5, 3], aggancio: a });
  assert.equal(orientamentoPorta(s, porta), 'verticale');
  assert.equal(validaScena({ ...s, porte: [porta] }, dati), null);
  // «Ruota» passa al lato dopo (n → e → s → o): gira e si sposta sulla linea giusta
  assert.equal(ruotaPorta(s, porta).aggancio.lato, 's');
  assert.equal(ruotaPorta(s, porta).orientamento, 'orizzontale');
  assert.equal(ruotaPorta(s, ruotaPorta(s, ruotaPorta(s, ruotaPorta(s, porta)))).aggancio.lato, 'e', 'quattro giri e torna');
  // apertura e chiusura non cambiano (A.139), e per il movimento la porta resta il suo Q
  assert.equal(apriChiudi(porta, 'apri').porta.stato, 'aperta');
  assert.deepEqual(muriEffettivi({ ...s, porte: [porta] }), muriEffettivi(s));
});

test('M3: su un muro disegnato la porta prende il tratto e il suo spessore', () => {
  const s = scena('chiusa');
  const muro = nuovaLinea({ id: 'm1', punti: [[5, 0], [5, R]], spessore: spessoreQ('sottile', dati) });
  const conMuro = { ...s, muriLinee: [muro] };
  const a = agganciaPorta(conMuro, [5, 3], [5.1, 3.5], dati);
  assert.equal(a.muro, 'm1', 'il tratto vicino vince sulla linea della griglia');
  assert.deepEqual(a.punto, [5, 3.5], 'il punto si aggancia sul tratto');
  assert.equal(a.spessore, spessoreQ('sottile', dati), 'lo stesso spessore del muro');
  assert.deepEqual([a.da, a.a], [[5, 0], [5, 8]]);
  // lontano dal tratto si torna alla linea della griglia
  assert.equal(agganciaPorta(conMuro, [8, 3], [8.5, 3.5], dati).muro, undefined);
  // una porta agganciata al tratto non si gira: la direzione la dà il muro
  const porta = nuovaPorta({ id: 'p', q: [5, 3], aggancio: a });
  assert.deepEqual(ruotaPorta(conMuro, porta), porta);
  assert.equal(orientamentoPorta(conMuro, porta), 'verticale');
  assert.equal(validaScena({ ...conMuro, porte: [porta] }, dati), null);
  // un aggancio sbagliato si vede
  assert.match(validaScena({ ...conMuro, porte: [{ ...porta, aggancio: { lato: 'su' } }] }, dati), /aggancio\.lato/);
  assert.match(validaScena({ ...conMuro, porte: [{ ...porta, aggancio: { muro: 'm1' } }] }, dati), /aggancio\.punto/);
  assert.match(validaScena({ ...conMuro, porte: [{ ...porta, aggancio: { lato: 'n', spessore: 0 } }] }, dati), /aggancio\.spessore/);
});

test('M3: le porte già salvate restano utilizzabili e si convertono alla linea più vicina', () => {
  const s = scena('chiusa'); // porta del 07/10: nessun aggancio
  assert.equal(s.porte[0].aggancio, undefined);
  assert.equal(validaScena(s, dati), null, 'la scena di prima resta valida');
  // conversione alla lettura: muro verticale → lato ovest, con lo spessore predefinito
  const a = agganciaDiPorta(s, s.porte[0], dati);
  assert.deepEqual(a, { lato: 'o', spessore: RP.spessore_q });
  // una porta orizzontale salvata va sulla linea nord
  const oriz = { ...s, porte: [nuovaPorta({ id: 'p1', q: [5, 3], orientamento: 'orizzontale' })] };
  assert.equal(agganciaDiPorta(oriz, oriz.porte[0], dati).lato, 'n');
  // l'aggancio salvato vince sempre sulla conversione
  const mia = nuovaPorta({ id: 'p1', q: [5, 3], aggancio: { lato: 'e', spessore: 0.5 } });
  assert.deepEqual(agganciaDiPorta(s, mia, dati), { lato: 'e', spessore: 0.5 });
  // ai giocatori la porta arriva con l'aggancio (così la vedono dove la vede il master)
  assert.deepEqual(portePerGiocatori(s, dati).map((p) => p.aggancio.lato), ['o']);
  assert.equal(vistaGiocatori(s, null, dati.mappa.template, dati.mappa).porte[0].aggancio.lato, 'o');
  // e aprire, chiudere e il movimento restano come prima della conversione
  assert.equal(apriChiudi(s.porte[0], 'apri').porta.stato, 'aperta');
  assert.ok(Number.isFinite(costoVerso(area({ ...s, porte: [nuovaPorta({ id: 'p1', q: [5, 3], stato: 'aperta' })] }), [7, 3])));
});

test('M3: dati del vano e dell’aggancio in data/mappa.json', () => {
  assert.deepEqual(RP.lati, ['n', 'e', 's', 'o']);
  assert.ok(RP.spessore_q > 0 && RP.spessore_q <= 1);
  assert.equal(RP.larghezza_q, 1, 'il vano di una porta normale è un quadretto');
  assert.ok(RP.aggancio_raggio_q > 0);
  assert.match(RP._nota_aggancio, /^Porte agganciate al muro/);
  const d = copia(dati);
  d.mappa.porte.spessore_q = 0;
  assert.match(validaDati(d).map((e) => e.chiave).join(' | '), /porte\.spessore_q/);
});

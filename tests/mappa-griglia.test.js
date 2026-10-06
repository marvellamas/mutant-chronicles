// Mappa di battaglia, lotto 2 (docs/battlemap/piano.md): camera (zoom, spostamento, adatta) e griglia (calibrazione,
// applicazione, linee visibili), più id e duplicazione delle scene.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { cameraIniziale, mappaDaSchermo, schermoDaMappa, zoomVerso, fattoreRotella, sposta, adatta, rettangoloVisibile } from '../src/mappa/camera.js';
import { normalizzaScosto, calibraDaQuadretto, applicaGriglia, dimensioniMappa, lineeVisibili, qDaPunto, testoScala } from '../src/mappa/griglia.js';
import { nuovaScena, validaScena, idScena, duplicaScena } from '../src/mappa/scena.js';
import { daBase64, inBase64, conta, rettangolo, nuovaMaschera } from '../src/mappa/celle.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const V = dati.mappa.vista;
const vicino = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('camera: andata e ritorno fra schermo e mappa', () => {
  const cam = { scala: 0.4, ox: 120, oy: -35 };
  const m = mappaDaSchermo(cam, 300, 200);
  const s = schermoDaMappa(cam, m.x, m.y);
  vicino(s.x, 300);
  vicino(s.y, 200);
  assert.deepEqual(mappaDaSchermo(cameraIniziale(), 10, 20), { x: 10, y: 20 });
});

test('camera: lo zoom tiene fermo il punto sotto il puntatore e resta nei limiti', () => {
  const cam = { scala: 0.5, ox: 10, oy: 20 };
  const prima = mappaDaSchermo(cam, 400, 300);
  const dopo = zoomVerso(cam, 400, 300, 1.7, V);
  vicino(dopo.scala, 0.85);
  const ancora = mappaDaSchermo(dopo, 400, 300);
  vicino(ancora.x, prima.x);
  vicino(ancora.y, prima.y);
  assert.equal(zoomVerso(cam, 0, 0, 1e6, V).scala, V.zoom_max);
  assert.equal(zoomVerso(cam, 0, 0, 1e-6, V).scala, V.zoom_min);
  // al limite il punto resta comunque fermo
  const limite = zoomVerso({ scala: V.zoom_max, ox: 5, oy: 5 }, 100, 100, 2, V);
  assert.deepEqual(limite, { scala: V.zoom_max, ox: 5, oy: 5 });
  // rotella: verso di sé allontana, via da sé avvicina, una tacca (100) è un passo moderato
  assert.ok(fattoreRotella(100, V) < 1 && fattoreRotella(-100, V) > 1);
  vicino(fattoreRotella(100, V) * fattoreRotella(-100, V), 1);
  assert.ok(fattoreRotella(-100, V) < 1.5);
});

test('camera: spostamento, «Adatta allo schermo» e rettangolo visibile', () => {
  assert.deepEqual(sposta({ scala: 2, ox: 1, oy: 2 }, 10, -5), { scala: 2, ox: 11, oy: -3 });
  // 4000 × 3000 in un riquadro 1200 × 800 con margine 24: scala = min(1152/4000, 752/3000) = 0,2507
  const cam = adatta(4000, 3000, 1200, 800, V);
  vicino(cam.scala, (800 - 2 * V.margine_adatta_px) / 3000);
  vicino(cam.oy, V.margine_adatta_px);
  vicino(cam.ox, (1200 - 4000 * cam.scala) / 2);
  const r = rettangoloVisibile(cam, 1200, 800);
  assert.ok(r.x0 < 0 && r.x1 > 4000 && r.y0 < 0 && r.y1 > 3000, 'la mappa intera si vede');
  assert.deepEqual(adatta(0, 0, 1200, 800, V), cameraIniziale());
  assert.deepEqual(adatta(100, 100, 10, 10, V), cameraIniziale(), 'riquadro più piccolo dei margini');
});

test('calibrazione tracciando un quadretto o più quadretti', () => {
  // quadretto da (113, 77) a (183, 147): 70 px, scostamento 113 mod 70 = 43, 77 mod 70 = 7
  assert.deepEqual(calibraDaQuadretto({ x: 113, y: 77 }, { x: 183, y: 147 }, 1, dati), { q_px: 70, scosto_x: 43, scosto_y: 7, scarto: 0 });
  // tracciato al contrario e su 4 quadretti, un po' storto: media dei lati
  const k = calibraDaQuadretto({ x: 400, y: 300 }, { x: 100, y: 4 }, 4, dati);
  vicino(k.q_px, 74.5);
  vicino(k.scosto_x, normalizzaScosto(100, 74.5));
  vicino(k.scarto, (75 - 74) / 75);
  // fuori dai limiti e quadretti non validi
  assert.match(calibraDaQuadretto({ x: 0, y: 0 }, { x: 3, y: 3 }, 1, dati).errore, /fra 8 e 600/);
  assert.match(calibraDaQuadretto({ x: 0, y: 0 }, { x: 30, y: 30 }, 0, dati).errore, /intero/);
  assert.equal(normalizzaScosto(-10, 64), 54);
  assert.equal(normalizzaScosto(130, 64), 2);
});

const conImmagine = () => nuovaScena({ id: 'sala', nome: 'Sala', mappa: { file: 'sala-0123456789ab.jpg', ridotta: null, larghezza: 4000, altezza: 3000 }, dati });

test('applicaGriglia: righe e colonne dall’immagine, maschere e token che seguono, blocco', () => {
  const s = conImmagine();
  assert.deepEqual([s.griglia.colonne, s.griglia.righe], [63, 47]); // 4000/64, 3000/64 per eccesso
  s.token = [{ id: 't', rif: { tipo: 'segnaposto' }, nome: 'Cassa', q: [60, 45], ingombro: 2, nascosto: false }];
  s.muri = inBase64(rettangolo(daBase64(s.muri), 63, 47, 0, 0, 2, 2, true));
  const { scena } = applicaGriglia(s, { q_px: 100, scosto_x: 30, scosto_y: -20 }, dati);
  assert.deepEqual([scena.griglia.colonne, scena.griglia.righe], [40, 30]); // (4000−30)/100, (3000−80)/100 per eccesso
  assert.equal(scena.griglia.scosto_y, 80, 'scostamento normalizzato');
  assert.equal(validaScena(scena, dati), null);
  assert.deepEqual(scena.token[0].q, [38, 28], 'token riportato dentro la griglia');
  assert.equal(conta(daBase64(scena.muri), 40, 30), 9, 'i muri restano nei Q che c’erano');
  assert.equal(conta(daBase64(scena.nebbia.coperti), 40, 30), 40 * 30, 'nebbia iniziale coperta: tutti coperti');
  assert.equal(s.griglia.q_px, 64, 'la scena di partenza non cambia');
  // colore e opacità non toccano la geometria
  const colore = applicaGriglia(s, { colore: '#ff0000', opacita: 0.8 }, dati).scena;
  assert.equal(colore.muri, s.muri);
  // bloccata: la geometria e l'immagine non cambiano, colore e opacità sì; sbloccando sì
  const bloccata = applicaGriglia(s, { bloccata: true }, dati).scena;
  assert.match(applicaGriglia(bloccata, { q_px: 80 }, dati).errore, /bloccata/);
  assert.match(applicaGriglia(bloccata, {}, dati, { mappa: { ...s.mappa, larghezza: 100 } }).errore, /bloccata/);
  assert.equal(applicaGriglia(bloccata, { opacita: 0.1 }, dati).scena.griglia.opacita, 0.1);
  assert.equal(applicaGriglia(bloccata, { bloccata: false, q_px: 80 }, dati).scena.griglia.q_px, 80);
  // limiti
  assert.match(applicaGriglia(s, { q_px: 2 }, dati).errore, /da 8 a 600/);
  assert.match(applicaGriglia(s, { q_px: 9 }, dati).errore, /al massimo 300 × 300/);
  assert.match(applicaGriglia(s, { opacita: 2 }, dati).errore, /opacità/);
});

test('applicaGriglia: scena senza immagine (colonne e righe a mano) e nuova immagine', () => {
  const s = nuovaScena({ id: 'vuota', nome: 'Vuota', dati });
  assert.deepEqual([s.griglia.colonne, s.griglia.righe], [dati.mappa.scena.colonne_predefinite, dati.mappa.scena.righe_predefinite]);
  assert.deepEqual(dimensioniMappa(s), { larghezza: 30 * 64, altezza: 20 * 64 });
  const piu = applicaGriglia(s, { colonne: 40, righe: 25 }, dati).scena;
  assert.deepEqual([piu.griglia.colonne, piu.griglia.righe], [40, 25]);
  assert.equal(validaScena(piu, dati), null);
  const conMappa = applicaGriglia(piu, {}, dati, { mappa: { file: 'x-0123456789ab.png', ridotta: null, larghezza: 1280, altezza: 640 } }).scena;
  assert.deepEqual([conMappa.griglia.colonne, conMappa.griglia.righe], [20, 10]);
  assert.deepEqual(dimensioniMappa(conMappa), { larghezza: 1280, altezza: 640 });
  assert.equal(validaScena(conMappa, dati), null);
});

test('linee visibili: solo quelle nel riquadro, niente se troppo fitte', () => {
  const g = { q_px: 50, scosto_x: 10, scosto_y: 20, colonne: 10, righe: 6 };
  const l = lineeVisibili(g, { x0: 0, y0: 0, x1: 1000, y1: 1000 }, 1, V);
  assert.equal(l.xs.length, 11);
  assert.equal(l.ys.length, 7);
  assert.deepEqual([l.xs[0], l.xs.at(-1), l.ys[0], l.ys.at(-1)], [10, 510, 20, 320]);
  const parte = lineeVisibili(g, { x0: 100, y0: 100, x1: 220, y1: 180 }, 1, V);
  assert.deepEqual(parte.xs, [110, 160, 210]);
  assert.deepEqual(parte.ys, [120, 170]);
  assert.deepEqual([parte.x0, parte.x1, parte.y0, parte.y1], [100, 220, 100, 180]);
  assert.equal(lineeVisibili(g, { x0: 0, y0: 0, x1: 1000, y1: 1000 }, (V.griglia_px_schermo_minimi - 1) / 50, V), null);
  assert.equal(lineeVisibili(g, { x0: 600, y0: 0, x1: 900, y1: 100 }, 1, V), null, 'fuori dalla griglia');
  assert.deepEqual(qDaPunto(g, 10, 20), [0, 0]);
  assert.deepEqual(qDaPunto(g, 509, 319), [9, 5]);
  assert.equal(qDaPunto(g, 9, 20), null);
  assert.equal(testoScala(dati), '1 Q = 1,5 m');
});

test('scene: id dal nome e dall’ora, duplicazione, archiviata', () => {
  assert.equal(idScena('Cripta di Mishima!', new Date(2026, 9, 6, 20, 15, 3)), 'cripta-di-mishima-20261006-201503');
  assert.equal(idScena('   ', new Date(2026, 0, 2, 3, 4, 5)), 'scena-20260102-030405');
  assert.match(idScena('Città è più'), /^citta-e-piu-\d{8}-\d{6}$/);
  const s = { ...conImmagine(), revisione: 7, aggiornato: 'x', archiviata: false, movimenti: [{}], annulla: [{}] };
  const d = duplicaScena(s, { id: 'sala-2', nome: 'Sala (copia)' });
  assert.deepEqual([d.id, d.nome, d.revisione, d.movimenti.length, d.annulla.length], ['sala-2', 'Sala (copia)', 0, 0, 0]);
  assert.ok(!('aggiornato' in d) && !('archiviata' in d));
  assert.equal(d.mappa.file, s.mappa.file);
  assert.equal(validaScena(d, dati), null);
  assert.equal(validaScena({ ...s, archiviata: true }, dati), null);
  assert.match(validaScena({ ...s, archiviata: 'sì' }, dati), /^archiviata/);
});

test('data/mappa.json: vista e dimensioni predefinite validate', () => {
  const d = copia(dati);
  d.mappa.vista.zoom_max = 0.01;
  d.mappa.scena.colonne_predefinite = 0;
  const e = validaDati(d);
  assert.ok(e.some((x) => x.file === 'mappa.json' && x.chiave === 'vista'));
  assert.ok(e.some((x) => x.file === 'mappa.json' && x.chiave === 'scena.colonne_predefinite'));
});

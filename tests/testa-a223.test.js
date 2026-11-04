// Lotto 172, A.223 (Davide, 03/11/2026): la testa della Madre delle Murene sta all'estremità del muso e segue spostamenti e
// rotazioni; il Direttore può spostarne a mano il segno in una posizione plausibile sulla sagoma; distanze e linee di tiro
// partono dalla testa confermata; spostare il segno non concede movimento né portata in più.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { cellaTesta, tokenTesta, spostaTesta, testaAutomatica, testaManuale } from '../src/mappa/sagoma.js';
import { formaRuotata, ruotaDi } from '../src/mappa/forma.js';
import { celleToken } from '../src/mappa/token.js';
import { adattaToken } from '../src/mappa/partecipanti.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { areaRaggiungibile } from '../src/mappa/area.js';
import { inBase64, nuovaMaschera } from '../src/mappa/celle.js';

const { dati } = await datiReali();
const G = { colonne: 60, righe: 60 };
// la Madre completamente emersa: 6 × 2 (larghezza × lunghezza nei campi), qui disposta lunga 6 verso l'alto
const madre = (angolo = 0, q = [20, 20]) => { const f = formaRuotata([6, 2], angolo); return { id: 'madre', rif: { tipo: 'partecipante', id: 'n1' }, q, angolo, base: [6, 2], ingombro: f.ingombro, nascosto: false }; };
const dist = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
const k = (c) => c.join(',');

test('la testa è all’estremità del muso e segue spostamenti e rotazioni', () => {
  const t = madre(0);
  const h = cellaTesta(t);
  const mie = celleToken(t);
  assert.ok(mie.some((c) => k(c) === k(h)), 'sulla sagoma');
  assert.equal(h[1], Math.min(...mie.map((c) => c[1])), 'a 0° guarda in alto: la testa è sulla riga più in alto');
  // spostata di 5 Q a destra: la testa la segue
  const sp = { ...t, q: [t.q[0] + 5, t.q[1]] };
  assert.deepEqual(cellaTesta(sp), [h[0] + 5, h[1]]);
  // girata di 90°: guarda a destra, la testa è sulla colonna più a destra
  const r = ruotaDi(t, 90, G);
  const mr = celleToken(r);
  assert.equal(cellaTesta(r)[0], Math.max(...mr.map((c) => c[0])));
});

test('il Direttore sposta il segno su un quadretto della sagoma; fuori dalla sagoma no; e il segno segue la creatura', () => {
  const t = madre(0);
  const mie = celleToken(t);
  const coda = mie.reduce((a, c) => (c[1] > a[1] ? c : a));
  const r = spostaTesta(t, coda);
  assert.ok(r.token && testaManuale(r.token));
  assert.deepEqual(cellaTesta(r.token), coda);
  assert.match(spostaTesta(t, [0, 0]).errore, /sagoma/);
  // si muove: il segno resta sullo stesso punto del corpo
  const sp = { ...r.token, q: [r.token.q[0] + 3, r.token.q[1] + 2] };
  assert.deepEqual(cellaTesta(sp), [coda[0] + 3, coda[1] + 2]);
  // si gira di 180°: la coda di prima ora è in alto (la testa spostata gira con il corpo)
  const g = ruotaDi(ruotaDi(r.token, 90, G), 90, G);
  const mg = celleToken(g);
  assert.equal(cellaTesta(g)[1], Math.min(...mg.map((c) => c[1])));
  // e anche a 45°: sempre su un quadretto occupato
  const d = ruotaDi(r.token, 45, G);
  assert.ok(celleToken(d).some((c) => k(c) === k(cellaTesta(d))));
  // torna automatica
  const a = testaAutomatica(r.token);
  assert.equal(testaManuale(a), false);
  assert.deepEqual(cellaTesta(a), cellaTesta(t));
});

test('spostare il segno non concede movimento né portata: il token non cambia, l’area è la stessa, nessuna distanza scende sotto quella dal corpo', () => {
  const t = madre(0);
  const C = 60; const R = 60; const vuota = inBase64(nuovaMaschera(C, R));
  const area = (x) => areaRaggiungibile({ colonne: C, righe: R, muri: vuota, terreno: vuota, token: [], chi: { id: x.id, q: x.q, ingombro: x.ingombro, angolo: x.angolo, base: x.base, lato: 'avversario' }, massimo: 8, regole: dati.mappa.movimento });
  const a0 = area(t);
  const bersagli = [[20, 5], [40, 22], [21, 40], [5, 21], [30, 30]];
  for (const c of celleToken(t)) {
    const r = spostaTesta(t, c).token;
    const { testa: _, ...senza } = r;
    assert.deepEqual(senza, t, 'q, ingombro, angolo e base non cambiano');
    assert.deepEqual(Array.from(area(r).costo), Array.from(a0.costo), 'stessa area di movimento');
    const h = tokenTesta(r);
    assert.equal(h.ingombro, 1);
    for (const b of bersagli) {
      const dalCorpo = Math.min(...celleToken(t).map((x) => dist(x, b)));
      assert.ok(dist(h.q, b) >= dalCorpo, `dalla testa in ${c} verso ${b} non è più vicino che dal corpo`);
    }
  }
});

test('la scena salva il segno; con un’altra configurazione la testa torna automatica', () => {
  const s0 = nuovaScena({ id: 'testa', nome: 'Testa', colonne: 60, righe: 60, dati });
  const t = spostaTesta(madre(0), celleToken(madre(0)).at(-1)).token;
  assert.equal(validaScena({ ...s0, token: [t] }, dati), null);
  assert.match(String(validaScena({ ...s0, token: [{ ...t, testa: { avanti: 'x', lato: 0 } }] }, dati)), /testa/);
  const adattato = adattaToken(t, { ingombro: [2, 2] }, G);
  assert.equal('testa' in adattato, false);
});

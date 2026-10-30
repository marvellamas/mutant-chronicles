// A.167 (18/10/2026), la mappa con le sagome vere delle creature: ingombro dalla scheda (Madre 3 × 10, Roc 6 × 6), scena e
// validazione, rotazione a 45° con muri e token, movimento che tiene conto della sagoma, ZoC sui quadretti veri, luce,
// selezione, posizione iniziale, e nessuna regressione per scene e scontri salvati col vecchio formato.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { ingombroCreatura, ingombroDaTaglia, celleToken, spazioEffettivo } from '../src/mappa/token.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { ruotaSeLibero } from '../src/mappa/veicoli-mappa.js';
import { ruotaDi, formaDi } from '../src/mappa/forma.js';
import { sagoma, area as areaSagoma } from '../src/mappa/sagoma.js';
import { areaRaggiungibile, costoVerso } from '../src/mappa/area.js';
import { celleZoc, inPortata, attacchiDiOpportunita, distanzaIngombri } from '../src/mappa/zoc.js';
import { luceQ, luceIngombro } from '../src/mappa/luce.js';
import { tokenNelRettangolo } from '../src/mappa/gruppo.js';
import { salvaIniziale, ripristinaIniziale } from '../src/mappa/iniziale.js';
import { nuovaMaschera } from '../src/mappa/celle.js';
import { vistaGiocatori } from '../src/mappa/vista.js';

const { dati } = await datiReali();
const profilo = (id) => JSON.parse(readFileSync(new URL(`../esempi/nemici/mostri/${id}.json`, import.meta.url), 'utf8'));
const tok = (id, q, ingombro, extra = {}) => ({ id: `t-${id}`, rif: { tipo: 'partecipante', id: `nem:${id}:1` }, q, ingombro, nascosto: false, ...extra });
const scena = (token, C = 40, R = 40) => ({ ...nuovaScena({ id: 'p', nome: 'P', colonne: C, righe: R, nebbia: 'scoperta', dati }), token });
const metti = (m, x, y) => { m[(y * 40 + x) >> 3] |= 1 << ((y * 40 + x) & 7); };

test('l’ingombro vero della scheda: quadrato = lato, rettangolo = [colonne, righe], senza campo = Taglia; la mini-scheda lo dice', () => {
  assert.equal(ingombroCreatura(profilo('roc'), dati), 6);
  assert.equal(ingombroCreatura(profilo('drago-tartaruga'), dati), 4);
  assert.deepEqual(ingombroCreatura(profilo('covata-regina-madre'), dati), [3, 10]);
  assert.deepEqual(ingombroCreatura(profilo('covata-regina-incubatrice'), dati), [3, 5]);
  assert.deepEqual(ingombroCreatura(profilo('covata-regina-comandante'), dati), [2, 3]);
  assert.deepEqual(ingombroCreatura(profilo('covata-corazzato'), dati), [1, 2]);
  assert.deepEqual(ingombroCreatura(profilo('worg'), dati), [2, 1]);
  assert.equal(ingombroCreatura(profilo('lupo'), dati), 1);
  assert.equal(ingombroCreatura({ taglia: 'grande' }, dati), 2);
  assert.equal(ingombroCreatura(null, dati), 1);
  const sp = spazioEffettivo(profilo('covata-regina-madre'), dati);
  assert.equal(sp.testo, '3 × 10 Q');
  assert.equal(sp.ripiego, false);
  assert.equal(sp.fonte, 'profilo');
  // il ripiego del lato quadrato resta disponibile (chiamate vecchie)
  assert.equal(ingombroDaTaglia(profilo('covata-regina-madre'), dati), 3);
});

test('la scena accetta i token rettangolari e grandi delle creature, con angolo e base; rifiuta il quadrato che gira e i lati oltre il massimo', () => {
  const madre = tok('madre', [4, 4], [3, 10]);
  assert.equal(validaScena(scena([madre]), dati), null);
  assert.equal(validaScena(scena([tok('roc', [4, 4], 6)]), dati), null);
  const girata = ruotaDi(madre, 45, { colonne: 40, righe: 40 });
  assert.equal(validaScena(scena([girata]), dati), null);
  assert.deepEqual(girata.base, [10, 3]);
  assert.match(validaScena(scena([{ ...girata, base: [3, 3], ingombro: [3, 3], angolo: 0 }]), dati), /quadrata non si gira/);
  assert.match(validaScena(scena([tok('x', [0, 0], [21, 2])]), dati), /veicoli e le creature/);
  assert.match(validaScena(scena([tok('x', [0, 0], 21)]), dati), /ingombro/);
  // i token liberi restano ai lati ammessi
  const libero = { id: 'b', rif: { tipo: 'segnaposto', id: null }, q: [0, 0], ingombro: 6, nascosto: false, nome: 'B', blocca: false };
  assert.match(validaScena(scena([libero]), dati), /ingombro/);
});

test('scene e scontri salvati col vecchio formato si aprono ancora: ingombri interi 1–3 invariati, nessun campo nuovo obbligatorio', () => {
  const vecchia = scena([tok('a', [1, 1], 1), tok('b', [5, 5], 2), tok('c', [10, 10], 3), { ...tok('v', [20, 20], [4, 2]), rif: { tipo: 'veicolo', id: 'v1' }, direzione: 'e' }]);
  assert.equal(validaScena(vecchia, dati), null);
  // un Roc messo in mappa col ripiego (3 × 3) prima delle sagome resta valido e non cambia da solo
  assert.equal(validaScena(scena([tok('roc', [4, 4], 3)]), dati), null);
  // lo stesso profilo senza «spazio» (nemici di prima) dà la Taglia
  assert.equal(ingombroCreatura({ nome: 'Vecchio', taglia: 'grande' }, dati), 2);
  assert.equal(ingombroCreatura({ nome: 'Vecchio', spazio: '2 × 2 Q' }, dati), 2);
});

test('girare la Madre: libera di 45°; contro un muro o un altro token dice perché; con «Procedi comunque» (ruotaDi) gira lo stesso', () => {
  const madre = tok('madre', [10, 10], [3, 10]);
  const s = scena([madre]);
  const r = ruotaSeLibero(s, madre.id, 45);
  assert.equal(r.errore, undefined);
  assert.equal(r.token.angolo, 225);
  assert.deepEqual(r.token.base, [10, 3]);
  assert.equal(areaSagoma(r.token) >= 26 && areaSagoma(r.token) <= 34, true, 'circa 30 Q');
  // un muro su un quadretto della sagoma girata
  const celleGirate = celleToken(r.token);
  const muro = nuovaMaschera(40, 40);
  const [mx, my] = celleGirate.find(([x, y]) => !celleToken(madre).some(([a, b]) => a === x && b === y));
  metti(muro, mx, my);
  const bloccata = ruotaSeLibero(s, madre.id, 45, (x, y) => ((muro[(y * 40 + x) >> 3] >> ((y * 40 + x) & 7)) & 1) === 1);
  assert.match(bloccata.errore, /muro o su un altro token/);
  // forzata: la sagoma girata esiste lo stesso e sta nella griglia
  const forzata = ruotaDi(madre, 45, s.griglia);
  assert.deepEqual(forzata.base, [10, 3]);
  // un altro token nel posto della diagonale la blocca
  const altro = tok('altro', [mx, my], 1);
  assert.match(ruotaSeLibero({ ...s, token: [madre, altro] }, madre.id, 45).errore, /muro o su un altro token/);
  // tornando a 0° (quattro mezzi giri da 45° dopo 180° di partenza) la forma è quella scritta
  let t = madre;
  for (let i = 0; i < 8; i++) t = ruotaDi(t, 45, s.griglia);
  assert.deepEqual(t.ingombro, [3, 10]);
  // un quadrato non gira
  assert.match(ruotaSeLibero(scena([tok('roc', [4, 4], 6)]), 't-roc', 45).errore, /non è un veicolo né una creatura/);
});

test('movimento: la Madre orizzontale passa nel corridoio largo 3, quella verticale no; a 45° non entra in un corridoio di 3', () => {
  const C = 40, R = 20;
  const muri = nuovaMaschera(C, R);
  for (let y = 0; y < R; y++) for (let x = 14; x < 26; x++) if (!(y >= 8 && y <= 10)) { muri[(y * C + x) >> 3] |= 1 << ((y * C + x) & 7); }
  const base = { colonne: C, righe: R, muri, terreno: nuovaMaschera(C, R), token: [], massimo: 40, regole: dati.mappa.movimento };
  const orizzontale = { id: 'm', q: [0, 8], ingombro: [10, 3], angolo: 90, base: [10, 3], lato: 'avversario' };
  const a1 = areaRaggiungibile({ ...base, chi: orizzontale });
  assert.notEqual(costoVerso(a1, [28, 8]), Infinity, 'orizzontale attraversa');
  const verticale = { id: 'm', q: [0, 4], ingombro: [3, 10], lato: 'avversario' };
  const a2 = areaRaggiungibile({ ...base, chi: verticale });
  assert.equal(costoVerso(a2, [28, 4]), Infinity, 'verticale non attraversa');
  const diagonale = { id: 'm', q: [0, 0], ingombro: sagoma([10, 3], 45).ingombro, angolo: 45, base: [10, 3], lato: 'avversario' };
  const a3 = areaRaggiungibile({ ...base, chi: diagonale });
  assert.equal(costoVerso(a3, [28, 0]), Infinity, 'diagonale non attraversa un corridoio di 3');
});

test('ZoC e Attacchi di Opportunità sui quadretti veri della sagoma ruotata, non sul rettangolo che la contiene', () => {
  const madre = tok('madre', [10, 10], [3, 10]);
  const g = scena([madre]).griglia;
  const diag = ruotaDi(madre, 45, g);
  const sue = celleToken(diag);
  const [w, h] = diag.ingombro;
  const zoc = celleZoc(scena([diag]), [{ token: diag, portata: 1 }]);
  const C = g.colonne;
  const inZoc = (x, y) => zoc[y * C + x] === 1;
  // un Q adiacente alla sagoma è in ZoC
  const [sx, sy] = sue[0];
  assert.equal(inZoc(sx + 1, sy) || inZoc(sx - 1, sy) || inZoc(sx, sy - 1) || inZoc(sx, sy + 1), true);
  // l’angolo vuoto del rettangolo che la contiene non lo è (la sagoma è lontana): angolo opposto alla diagonale
  const angolo = sue.some(([x, y]) => x === diag.q[0] && y === diag.q[1]) ? [diag.q[0] + w - 1, diag.q[1]] : [diag.q[0], diag.q[1]];
  assert.equal(sue.some(([x, y]) => x === angolo[0] && y === angolo[1]), false, 'angolo vuoto');
  assert.equal(inZoc(angolo[0], angolo[1]), false, 'l’angolo vuoto non è in ZoC');
  // distanza e portata sulle sagome
  assert.ok(distanzaIngombri([30, 30], 1, diag.q, diag.ingombro, null, diag) > distanzaIngombri([30, 30], 1, diag.q, diag.ingombro));
  assert.equal(inPortata(angolo, 1, { token: diag, portata: 1 }), false);
  assert.equal(inPortata([sx + 1, sy], 1, { token: diag, portata: 1 }), true);
  // un Attacco di Opportunità: lo spostamento da un Q a portata a uno fuori, calcolato sulla sagoma
  const percorso = [[sx + 1, sy], [sx + 3, sy], [sx + 5, sy]];
  const aoo = attacchiDiOpportunita(percorso, 1, [{ token: diag, portata: 1 }]);
  assert.ok(aoo.length <= 1);
  // una sagoma che si muove: il suo stesso ingombro conta sui suoi quadretti veri
  const mover = ruotaDi(tok('altra', [0, 0], [3, 10]), 45, g);
  assert.equal(attacchiDiOpportunita([[20, 20], [24, 24]], mover.ingombro, [{ token: diag, portata: 1 }], mover).length, 0);
  assert.ok(h >= 8);
});

test('luce, selezione e vista dei giocatori usano i quadretti veri della sagoma', () => {
  const madre = tok('madre', [10, 10], [3, 10]);
  const g = scena([madre]).griglia;
  const diag = ruotaDi(madre, 45, g);
  const sue = celleToken(diag);
  const [w, h] = diag.ingombro;
  const vuoto = (x, y) => !sue.some(([a, b]) => a === x && b === y);
  // il rettangolo di selezione sull’angolo vuoto non prende la sagoma; su un suo quadretto sì
  let cx = diag.q[0], cy = diag.q[1];
  if (!vuoto(cx, cy)) { cx = diag.q[0] + w - 1; }
  assert.ok(vuoto(cx, cy));
  assert.deepEqual(tokenNelRettangolo(scena([diag]), [cx + 0.1, cy + 0.1], [cx + 0.9, cy + 0.9]), []);
  const [qx, qy] = sue[3];
  assert.deepEqual(tokenNelRettangolo(scena([diag]), [qx + 0.1, qy + 0.1], [qx + 0.9, qy + 0.9]), [diag.id]);
  // luce: nell’angolo vuoto non arriva la luce della sagoma con raggio 1
  const conLuce = scena([{ ...diag, luce: 1 }]);
  const mappa = luceQ(conLuce, dati);
  const buio = dati.mappa.luci.categorie.indexOf(dati.mappa.luci.predefinita);
  assert.equal(mappa[(cy) * conLuce.griglia.colonne + cx], buio, 'angolo lontano: luce di scena');
  assert.ok(luceIngombro(conLuce, diag, dati, mappa));
  // vista giocatori: arrivano angolo e base, così lo schermo disegna la sagoma ruotata
  const v = vistaGiocatori(scena([diag]));
  assert.equal(v.token.length, 1);
  assert.equal(v.token[0].angolo, diag.angolo);
  assert.deepEqual(v.token[0].base, diag.base);
  assert.ok(formaDi(v.token[0]));
});

test('posizione iniziale: salva e ripristina anche la sagoma ruotata; se allora non c’era, il token torna allineato', () => {
  const madre = tok('madre', [10, 10], [3, 10]);
  const s0 = scena([madre]);
  const ini = salvaIniziale(s0);
  const girata = ruotaDi(madre, 45, s0.griglia);
  const dopo = { ...s0, token: [girata], iniziale: ini.iniziale };
  const r = ripristinaIniziale(dopo);
  assert.equal(r.scena.token[0].angolo, undefined);
  assert.equal(r.scena.token[0].base, undefined);
  assert.deepEqual(r.scena.token[0].ingombro, [3, 10]);
  // salvata già ruotata: torna ruotata
  const ini2 = salvaIniziale({ ...s0, token: [girata] });
  const r2 = ripristinaIniziale({ ...s0, token: [madre], iniziale: ini2.iniziale });
  assert.equal(r2.scena.token[0].angolo, girata.angolo);
  assert.deepEqual(r2.scena.token[0].base, [10, 3]);
  assert.deepEqual(r2.scena.token[0].ingombro, girata.ingombro);
  assert.equal(validaScena(r2.scena, dati), null);
});

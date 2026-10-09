// Template ad area (fase 2, lotto 1; src/mappa/template.js). Forme dai manuali: Magia, «Gittate e geometria»
// (Raggio, Linea, Cono; «un Q rientra nell'Area se è incluso per almeno metà»; Linee e Coni non includono il Q del
// lanciatore), Cono Elementale (dal bordo dello spazio del Taumaturgo), Giocatore §5.10 (3 × 3 Q).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { celleTemplate, qCoperto, tokenDentro, fineRound, scaduto, roundRimasti, templatePerGiocatori, celleDaMaschera, erroreTemplate, nuovoTemplate, direzioneVerso } from '../src/mappa/template.js';
import { cambiaTemplateAnnullabile, annullaUltima } from '../src/mappa/annulla.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { daBase64, inBase64, rettangolo } from '../src/mappa/celle.js';
import { validaDati } from '../src/validate.js';

const { dati } = await datiReali();
const RT = dati.mappa.template;
const G = { colonne: 30, righe: 30 };
const conta = (m) => m.reduce((n, v) => n + v, 0);
const tpl = (forma, misure, o = {}) => ({ id: 'tp', forma, origine: [15, 15], misure, nascosto: false, colore: '#f76707', ...o });

test('dati: forme dei manuali, regola «almeno metà», misure proposte; le ambiguità sono A.137 e A.138', () => {
  assert.deepEqual(RT.forme, ['cerchio', 'cono', 'linea', 'quadrato', 'rettangolo']);
  assert.equal(RT.regola_copertura, 'almeno_meta');
  assert.match(RT._nota, /incluso per almeno metà/);
  assert.equal(RT['TODO(Davide) metrica'], undefined);
  assert.match(RT._nota_metrica, /^A\.137/);
  assert.equal(RT.metrica_raggio, 'quadretti', 'A.137, decisione 141: raggio a quadretti');
  assert.match(RT['TODO(Davide) cono'], /^A\.138/);
  assert.deepEqual(RT.misure_proposte.cono.at(-1), { lunghezza: 18, larghezza: 9 }, 'Cono Elementale al livello 18');
  const d = copia(dati);
  d.mappa.template.metrica_raggio = 'manhattan';
  assert.ok(validaDati(d).some((e) => e.file === 'mappa.json' && e.chiave === 'template.metrica_raggio'));
});

test('raggio: a quadretti (diagonale 1 Q, A.124) un quadrato di 2r + 1; in euclidea un cerchio con i Q coperti per metà', () => {
  assert.equal(conta(celleTemplate(tpl('cerchio', { raggio: 2 }), G, RT)), 25);
  assert.equal(conta(celleTemplate(tpl('cerchio', { raggio: 1 }), G, RT)), 9, 'granata RS 1 Q: il Q e gli otto attorno');
  const eu = { ...RT, metrica_raggio: 'euclidea' };
  const c = celleTemplate(tpl('cerchio', { raggio: 2 }), G, eu);
  assert.ok(c[15 * 30 + 17] && c[17 * 30 + 15], 'a 2 Q in linea retta, dentro');
  assert.ok(!c[17 * 30 + 17], 'l’angolo (2, 2) è fuori dal cerchio');
  assert.ok(conta(c) > 9 && conta(c) < 25);
});

test('quadrato centrato (Fuoco di Soppressione 3 × 3 Q) e rettangolo dal Q d’origine', () => {
  const q = celleTemplate(tpl('quadrato', { lato: 3 }), G, RT);
  assert.equal(conta(q), 9);
  assert.ok(q[14 * 30 + 14] && q[16 * 30 + 16]);
  const pari = celleTemplate(tpl('quadrato', { lato: 2 }), G, RT);
  assert.ok(pari[15 * 30 + 15] && pari[16 * 30 + 16] && !pari[14 * 30 + 14], 'lato pari: il Q d’origine in alto a sinistra');
  const r = celleTemplate(tpl('rettangolo', { larghezza: 4, altezza: 2 }), G, RT);
  assert.equal(conta(r), 8);
  assert.ok(r[15 * 30 + 18] && r[16 * 30 + 15] && !r[15 * 30 + 14]);
});

test('cono e linea: dal bordo del Q di chi lancia, il suo Q escluso; diagonale a quadretti', () => {
  const cono = tpl('cono', { lunghezza: 6, larghezza: 3 }, { direzione: 0 });
  const c = celleTemplate(cono, G, RT);
  assert.ok(!c[15 * 30 + 15], 'il Q del lanciatore non è incluso');
  for (let x = 16; x <= 21; x++) assert.ok(c[15 * 30 + x], `asse, Q ${x}`);
  assert.ok(!c[15 * 30 + 22], 'non oltre 6 Q');
  assert.ok(c[14 * 30 + 21] && c[16 * 30 + 21], 'larghezza 3 in fondo');
  assert.ok(!c[14 * 30 + 16], 'stretto all’inizio (larghezza iniziale 1 Q, A.138)');
  const giu = celleTemplate({ ...cono, direzione: 90 }, G, RT);
  assert.equal(conta(giu), conta(c), 'ruotato di 90° copre lo stesso numero di Q');
  const diag = celleTemplate({ ...cono, direzione: 45 }, G, RT);
  assert.ok(diag[21 * 30 + 21], 'in diagonale arriva a 6 Q (diagonale 1 Q)');
  const linea = celleTemplate(tpl('linea', { lunghezza: 5 }, { direzione: 180 }), G, RT);
  assert.equal(conta(linea), 5);
  assert.ok(linea[15 * 30 + 10] && !linea[15 * 30 + 15]);
  const ld = celleTemplate(tpl('linea', { lunghezza: 5 }, { direzione: 45 }), G, RT);
  assert.equal(conta(ld), 5, 'linea diagonale: 5 Q');
});

test('regola «almeno metà»: un Q coperto per poco meno della metà resta fuori', () => {
  // una linea centrata su una fila: larga 2,2 Q copre 0,6 dei Q sopra e sotto (dentro), larga 1,8 Q ne copre 0,4 (fuori)
  const R2 = { ...RT, metrica_raggio: 'euclidea' };
  const larga = tpl('linea', { lunghezza: 4, larghezza: 2.2 }, { direzione: 0 });
  assert.ok(qCoperto(larga, 17, 15, R2));
  assert.ok(qCoperto(larga, 17, 14, R2), '0,6 del Q: almeno metà');
  assert.ok(!qCoperto(tpl('linea', { lunghezza: 4, larghezza: 1.8 }, { direzione: 0 }), 17, 14, R2), '0,4 del Q: meno di metà');
});

test('chi è dentro: token con almeno un Q coperto, anche grandi', () => {
  const s = { griglia: G, token: [
    { id: 'a', q: [16, 15], ingombro: 1 }, { id: 'b', q: [20, 20], ingombro: 1 }, { id: 'c', q: [13, 12], ingombro: 2 },
  ] };
  assert.deepEqual(tokenDentro(tpl('cerchio', { raggio: 2 }), s, RT).map((t) => t.id), ['a', 'c']);
});

test('durata: il Round del piazzamento non conta, fine del Round R + N; vuota = finché non lo tolgo', () => {
  assert.equal(fineRound(1, 3), 4);
  assert.equal(fineRound(null, 3), null);
  assert.equal(fineRound(2, null), null, 'senza scontro nessuna scadenza');
  const t = nuovoTemplate({ id: 'x', forma: 'cerchio', misure: { raggio: 2 }, origine: [1, 1], colore: '#e03131', durata: 2, round: 3, scontro: 'sc' });
  assert.equal(t.fine_round, 5);
  assert.deepEqual([scaduto(t, 5), scaduto(t, 6)], [false, true]);
  assert.deepEqual([roundRimasti(t, 3), roundRimasti(t, 5)], [3, 1]);
  assert.equal(scaduto({ ...t, fine_round: null }, 99), false);
  assert.equal(direzioneVerso([0, 0], [3.5, 0.5]), 0);
  assert.equal(direzioneVerso([0, 0], [0.5, 3.5]), 90);
});

test('vista giocatori: niente template nascosti; dei visibili solo i Q fuori dalla nebbia; tutto sotto la nebbia = niente', () => {
  const s = nuovaScena({ id: 'p', nome: 'P', colonne: 30, righe: 30, nebbia: 'scoperta', dati });
  s.nebbia.coperti = inBase64(rettangolo(daBase64(s.nebbia.coperti), 30, 30, 17, 0, 29, 29, true));
  const lista = [tpl('cerchio', { raggio: 2 }, { id: 'a' }), tpl('cerchio', { raggio: 2 }, { id: 'b', nascosto: true }), tpl('cerchio', { raggio: 2 }, { id: 'c', origine: [25, 25] })];
  const g = templatePerGiocatori(lista, s, RT);
  assert.deepEqual(g.map((t) => t.id), ['a']);
  const celle = celleDaMaschera(g[0].celle, s.griglia);
  assert.equal(conta(celle), 20, 'del 5 × 5 restano le quattro colonne fuori dalla nebbia (13–16)');
  assert.ok(!celle[15 * 30 + 17]);
  assert.ok(!('origine' in g[0]) && !('misure' in g[0]), 'la forma non arriva, solo i Q visibili');
});

test('scena: template validati e salvati; Ctrl+Z annulla piazzamento, spostamento e «Togli»', () => {
  let s = { ...nuovaScena({ id: 'p', nome: 'P', colonne: 30, righe: 30, dati }), revisione: 0 };
  const t = nuovoTemplate({ id: 'tpl-1', forma: 'cono', misure: { lunghezza: 6, larghezza: 3 }, origine: [5, 5], direzione: 0, colore: '#e03131', nome: 'Fiammata', durata: 1, round: 2, scontro: null });
  s = cambiaTemplateAnnullabile(s, null, t, dati);
  assert.equal(validaScena(s, dati), null);
  assert.match(validaScena({ ...s, template: [{ ...t, misure: { lunghezza: 6 } }] }, dati), /template\[0\]\.misure\.larghezza/);
  assert.match(erroreTemplate({ ...t, forma: 'stella' }, RT), /^forma/);
  const spostato = { ...t, origine: [9, 9] };
  s = cambiaTemplateAnnullabile(s, t, spostato, dati);
  s = cambiaTemplateAnnullabile(s, spostato, null, dati);
  assert.equal(s.template.length, 0);
  const passi = [];
  for (let i = 0; i < 3; i++) { const e = annullaUltima(s); passi.push(e.testo); s = e.scena; }
  assert.deepEqual(passi, ['template tolto', 'template spostato', 'template piazzato']);
  assert.equal(s.template.length, 0);
});

test('«Mostra / nascondi template»: senza durata (e, a scelta, anche a durata); scelta del master e dei giocatori nella scena', async () => {
  const { templateVisibili, ostacoliVisibili, permanente } = await import('../src/mappa/template.js');
  const { vistaGiocatori } = await import('../src/mappa/vista.js');
  const fisso = tpl('cerchio', { raggio: 1 }, { id: 'f', durata: null });
  const aRound = tpl('cerchio', { raggio: 1 }, { id: 'r', durata: 2, fine_round: 4 });
  assert.deepEqual(templateVisibili([fisso, aRound], undefined).map((t) => t.id), ['f', 'r']);
  assert.deepEqual(templateVisibili([fisso, aRound], { nascoste: true, ancheDurata: false }).map((t) => t.id), ['r']);
  assert.deepEqual(templateVisibili([fisso, aRound], { nascoste: true, ancheDurata: true }), []);
  assert.ok(permanente({}) && !permanente(aRound), 'senza durata = finché non lo tolgo');
  assert.ok(ostacoliVisibili(null) && !ostacoliVisibili({ nascoste: true }));
  const s = { ...nuovaScena({ id: 'p', nome: 'P', colonne: 30, righe: 30, nebbia: 'scoperta', dati }), revisione: 0, template: [fisso, aRound] };
  s.sovrapposizioni = { master: { nascoste: true, ancheDurata: false }, giocatori: { nascoste: true, ancheDurata: true } };
  assert.equal(validaScena(s, dati), null);
  assert.match(validaScena({ ...s, sovrapposizioni: { giocatori: { nascoste: 'sì' } } }, dati), /sovrapposizioni\.giocatori/);
  const v = vistaGiocatori(s, null, RT);
  assert.deepEqual(v.sovrapposizioni, { nascoste: true, ancheDurata: true }, 'la scelta dei giocatori, non quella del master');
  assert.deepEqual(v.template.map((t) => [t.id, t.permanente]), [['f', true], ['r', false]]);
});

test('frecce: cono e linea a 45° (agganciati alle 8 direzioni), rettangolo di 90°; ↑ ↓ fra le misure proposte', async () => {
  const { ruota, cambiaMisura } = await import('../src/mappa/template.js');
  const cono = tpl('cono', { lunghezza: 6, larghezza: 3 }, { direzione: 127 });
  assert.equal(ruota(cono, 1).direzione, 180, 'da 127° (verso il mouse) al multiplo di 45° successivo');
  assert.equal(ruota(cono, -1).direzione, 90);
  assert.equal(ruota({ ...cono, direzione: 0 }, -1).direzione, 315);
  assert.deepEqual(ruota(tpl('rettangolo', { larghezza: 4, altezza: 2 }), 1).misure, { larghezza: 2, altezza: 4 });
  const r = tpl('cerchio', { raggio: 2 });
  assert.equal(ruota(r, 1), r, 'il raggio non ha verso');
  assert.deepEqual(cambiaMisura(cono, 1, RT).misure, { lunghezza: 9, larghezza: 5 });
  assert.deepEqual(cambiaMisura(cono, -1, RT).misure, { lunghezza: 3, larghezza: 2 });
  assert.deepEqual(cambiaMisura(tpl('cono', { lunghezza: 18, larghezza: 9 }), 1, RT).misure, { lunghezza: 18, larghezza: 9 }, 'oltre l’ultima resta');
  assert.deepEqual(cambiaMisura(tpl('cerchio', { raggio: 7 }), 1, RT).misure, { raggio: 8 }, 'da una misura fuori elenco: la successiva');
  assert.deepEqual(cambiaMisura(tpl('cerchio', { raggio: 7 }), -1, RT).misure, { raggio: 6 });
  assert.deepEqual(cambiaMisura(tpl('rettangolo', { larghezza: 2, altezza: 4 }), 1, RT).misure, { larghezza: 2, altezza: 3 }, 'il rettangolo girato resta girato');
  // la linea a 45° copre davvero la diagonale
  const ld = celleTemplate(ruota(tpl('linea', { lunghezza: 3 }, { direzione: 0 }), 1), G, RT);
  assert.ok(ld[16 * 30 + 16] && ld[18 * 30 + 18]);
});

test('«Cancella template temporanei»: via quelli a durata in un colpo, restano gli altri; Ctrl+Z li rimette; riga nel registro', async () => {
  const { togliTemplateAnnullabile } = await import('../src/mappa/annulla.js');
  const { permanente } = await import('../src/mappa/template.js');
  const { nuovoScontro, rigaTemplateTolti } = await import('../src/scontro.js');
  let s = { ...nuovaScena({ id: 'p', nome: 'P', colonne: 30, righe: 30, dati }), revisione: 0 };
  s.template = [tpl('cerchio', { raggio: 1 }, { id: 'f', durata: null }), tpl('cerchio', { raggio: 2 }, { id: 'a', durata: 1, fine_round: 3 }), tpl('cono', { lunghezza: 6, larghezza: 3 }, { id: 'b', durata: 2, fine_round: 4, direzione: 0 })];
  const r = togliTemplateAnnullabile(s, (t) => !permanente(t), dati);
  assert.deepEqual(r.tolti.map((t) => t.id), ['a', 'b']);
  assert.deepEqual(r.scena.template.map((t) => t.id), ['f']);
  const u = annullaUltima(r.scena);
  assert.equal(u.testo, 'template rimessi');
  assert.deepEqual(u.scena.template.map((t) => t.id), ['f', 'a', 'b'], 'una sola voce: tutti di nuovo, nell’ordine');
  assert.equal(togliTemplateAnnullabile(r.scena, (t) => !permanente(t), dati).tolti.length, 0);
  const tutti = togliTemplateAnnullabile(s, () => true, dati);
  assert.equal(tutti.scena.template.length, 0);
  const sc = rigaTemplateTolti({ ...nuovoScontro({ id: 'sc', nome: 'S', pg: [] }), round: 2 }, { quanti: 2 });
  assert.match(sc.registro.at(-1).testo, /tolti 2 template temporanei/);
});

// Modello unico degli oggetti della mappa (12/10/2026, src/mappa/editor.js): un solo strumento attivo, le stesse
// azioni per muri, porte, terreno difficile e token liberi, annulla e rifai per tutto.
// Ogni difetto della ricognizione (docs/battlemap/ricognizione-editor-2026-10-12.md) ha qui il suo test: D1…D13.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import { nuovaScena, validaScena } from '../src/mappa/scena.js';
import { daBase64, inBase64, rettangolo, cella, conta } from '../src/mappa/celle.js';
import { nuovaLinea } from '../src/mappa/muri-linee.js';
import { nuovaPorta } from '../src/mappa/porte.js';
import { annullaUltima, rifaiUltima, blocchiCambiati } from '../src/mappa/annulla.js';
import {
  STRUMENTI, ID_STRUMENTI, STRUMENTO_PREDEFINITO, statoEditor, cambiaStrumento, esci, chiaveDi, dallaChiave,
  areeTerreno, oggettiScena, oggettoSotto, oggettiNelRiquadro, conSelezione, ripulisciSelezione,
  agganciaPunto, agganciaPunti, agganciaSpostamento, PASSO_AGGANCIO,
  spostaOggetti, eliminaOggetti, spostaVertice, cambiaProprieta, riassuntoSelezione, nomeOggetto, proprietaOggetto,
} from '../src/mappa/editor.js';

const RADICE = new URL('../', import.meta.url);
const { dati } = await caricaDati((n) => readFile(new URL(`data/${n}.json`, RADICE), 'utf8'));

/** Una scena come quella di prova: muri a quadretto, tre muri disegnati, due porte, due macchie di terreno. */
function scenaDiProva() {
  const C = 20;
  const R = 16;
  let s = nuovaScena({ id: 'prova', nome: 'Prova', colonne: C, righe: R, dati });
  let t = daBase64(s.terreno);
  t = rettangolo(t, C, R, 10, 3, 12, 5, true);   // macchia A: 3×3
  t = rettangolo(t, C, R, 2, 12, 3, 13, true);   // macchia B: 2×2, staccata
  s = { ...s, terreno: inBase64(t) };
  return {
    ...s,
    muriLinee: [
      nuovaLinea({ id: 'm1', punti: [[4, 4], [8, 4]], spessore: 0.1 }),
      nuovaLinea({ id: 'm2', punti: [[4, 8], [4, 11], [7, 11]], spessore: 0.25 }),
    ],
    porte: [nuovaPorta({ id: 'p1', q: [6, 4], stato: 'chiusa', segreta: false, orientamento: 'orizzontale' })],
    token: [
      { id: 'lib1', rif: { tipo: 'segnaposto', id: null }, q: [15, 10], ingombro: 1, nascosto: false, nome: 'Statua' },
      { id: 'pg1', rif: { tipo: 'partecipante', id: 'aiko' }, q: [1, 1], ingombro: 1, nascosto: false },
    ],
  };
}

// --- la barra degli strumenti (D5, D6) ---------------------------------------------------------------------------

test('la barra ha sei strumenti, uno solo attivo, e Seleziona è il predefinito', () => {
  assert.deepEqual(ID_STRUMENTI, ['seleziona', 'muro', 'porta', 'terreno', 'token-libero', 'gomma']);
  assert.equal(STRUMENTO_PREDEFINITO, 'seleziona');
  for (const s of STRUMENTI) { assert.ok(s.nome && s.titolo && s.tasto, s.id); }
  assert.equal(new Set(STRUMENTI.map((s) => s.tasto)).size, STRUMENTI.length, 'ogni strumento ha un tasto diverso');
  const st = statoEditor();
  assert.equal(st.strumento, 'seleziona');
  assert.deepEqual(st.selezione, []);
});

test('D1, D2: cambiando strumento la selezione sparisce sempre', () => {
  let st = conSelezione(statoEditor(), ['muro:m1']);
  assert.deepEqual(st.selezione, ['muro:m1']);
  st = cambiaStrumento(st, 'muro');
  assert.deepEqual(st.selezione, [], 'dipingendo non deve restare niente sotto Canc');
  st = conSelezione(st, ['muro:m1']);
  st = cambiaStrumento(st, 'porta');
  assert.deepEqual(st.selezione, [], 'mettendo le porte non deve restare selezionato un muro');
  assert.equal(st.hover, null);
  // uno strumento che non esiste riporta a Seleziona
  assert.equal(cambiaStrumento(st, 'inventato').strumento, 'seleziona');
});

test('D5: Esc torna sempre a Seleziona, senza niente selezionato', () => {
  const st = conSelezione(cambiaStrumento(statoEditor(), 'gomma'), ['porta:p1']);
  const dopo = esci(st);
  assert.equal(dopo.strumento, 'seleziona');
  assert.deepEqual(dopo.selezione, []);
  // anche da Seleziona: deseleziona e basta
  assert.deepEqual(esci(conSelezione(statoEditor(), ['muro:m1'])), { strumento: 'seleziona', selezione: [], hover: null });
});

// --- l'elenco unico degli oggetti ---------------------------------------------------------------------------------

test('tutti gli oggetti della scena hanno la stessa forma: muri, porte, terreno, token liberi', () => {
  const s = scenaDiProva();
  const o = oggettiScena(s);
  assert.deepEqual(o.map((x) => x.chiave).sort(), ['muro:m1', 'muro:m2', 'porta:p1', 'terreno:10-3', 'terreno:2-12', 'token:lib1'].sort());
  for (const x of o) {
    assert.ok(x.chiave && x.tipo && x.id && x.nome, JSON.stringify(x));
    assert.deepEqual(dallaChiave(x.chiave), { tipo: x.tipo, id: x.id });
  }
  // il token di un partecipante non è dell'editor: si muove con le regole del gioco
  assert.ok(!o.some((x) => x.id === 'pg1'));
  assert.equal(chiaveDi('muro', 'm1'), 'muro:m1');
});

test('D11: il terreno difficile è fatto di aree, una per macchia collegata', () => {
  const s = scenaDiProva();
  const aree = areeTerreno(s);
  assert.equal(aree.length, 2);
  assert.deepEqual(aree.map((a) => a.id), ['10-3', '2-12']);
  assert.equal(aree[0].celle.length, 9);
  assert.equal(aree[1].celle.length, 4);
  // due macchie che si toccano d'angolo restano due macchie (si attraversano solo di lato)
  const C = 20;
  const R = 16;
  let t = daBase64(nuovaScena({ id: 'x', nome: 'X', colonne: C, righe: R, dati }).terreno);
  t = rettangolo(t, C, R, 1, 1, 1, 1, true);
  t = rettangolo(t, C, R, 2, 2, 2, 2, true);
  assert.equal(areeTerreno({ ...s, terreno: inBase64(t) }).length, 2);
});

test('D7: l’oggetto sotto il puntatore, con la tolleranza che decide la UI', () => {
  const s = scenaDiProva();
  assert.equal(oggettoSotto(s, [5, 4.2])?.chiave, 'muro:m1', 'sul muro sottile, entro la tolleranza');
  assert.equal(oggettoSotto(s, [5, 4.6]), null, 'troppo lontano');
  assert.equal(oggettoSotto(s, [5, 4.6], { tolleranzaQ: 1.2 })?.chiave, 'muro:m1', 'con più tolleranza lo prende');
  assert.equal(oggettoSotto(s, [6.5, 4.5])?.chiave, 'porta:p1', 'la porta sta sopra il muro');
  assert.equal(oggettoSotto(s, [11.5, 4.5])?.chiave, 'terreno:10-3');
  assert.equal(oggettoSotto(s, [15.5, 10.5])?.chiave, 'token:lib1');
  assert.equal(oggettoSotto(s, [19, 1]), null, 'il vuoto non è un oggetto');
  // un token libero sopra un’area di terreno: vince il token
  const s2 = { ...s, token: [{ ...s.token[0], q: [11, 4] }] };
  assert.equal(oggettoSotto(s2, [11.5, 4.5])?.chiave, 'token:lib1');
});

test('D10: selezione multipla con Maiusc e con il riquadro', () => {
  const s = scenaDiProva();
  let st = conSelezione(statoEditor(), ['muro:m1']);
  st = conSelezione(st, ['porta:p1'], { aggiungi: true });
  assert.deepEqual(st.selezione.sort(), ['muro:m1', 'porta:p1']);
  // Maiusc su uno già selezionato lo toglie
  st = conSelezione(st, ['muro:m1'], { aggiungi: true });
  assert.deepEqual(st.selezione, ['porta:p1']);
  // senza Maiusc sostituisce
  st = conSelezione(st, ['muro:m2']);
  assert.deepEqual(st.selezione, ['muro:m2']);
  // riquadro
  const presi = oggettiNelRiquadro(s, [3, 3], [9, 12]).map((o) => o.chiave).sort();
  assert.deepEqual(presi, ['muro:m1', 'muro:m2', 'porta:p1']);
  assert.deepEqual(oggettiNelRiquadro(s, [9, 2], [13, 6]).map((o) => o.chiave), ['terreno:10-3']);
  assert.deepEqual(oggettiNelRiquadro(s, [18, 1], [19, 2]), []);
});

test('la selezione si ripulisce da sola quando un oggetto non c’è più', () => {
  const s = scenaDiProva();
  const st = conSelezione(statoEditor(), ['muro:m1', 'muro:sparito']);
  const dopo = ripulisciSelezione({ ...st, hover: 'porta:mai-esistita' }, s);
  assert.deepEqual(dopo.selezione, ['muro:m1']);
  assert.equal(dopo.hover, null);
  // niente da ripulire: lo stesso oggetto, senza copie inutili
  const pulito = conSelezione(statoEditor(), ['muro:m1']);
  assert.equal(ripulisciSelezione(pulito, s), pulito);
});

// --- aggancio alla griglia (D12, punto 3) --------------------------------------------------------------------------

test('D12: i vertici si agganciano agli incroci e ai punti medi, a qualunque spessore', () => {
  assert.equal(PASSO_AGGANCIO, 0.5);
  assert.deepEqual(agganciaPunto([4.12, 7.9]), [4, 8]);
  assert.deepEqual(agganciaPunto([4.3, 7.6]), [4.5, 7.5], 'il punto medio della linea');
  assert.deepEqual(agganciaPunto([4.26, 7.74]), [4.5, 7.5]);
  // spento: il punto resta dov’è (due decimali, come i file)
  assert.deepEqual(agganciaPunto([4.123, 7.987], false), [4.12, 7.99]);
  assert.deepEqual(agganciaPunti([[1.1, 1.1], [2.4, 2.6]]), [[1, 1], [2.5, 2.5]]);
  // lo spostamento si aggancia a mezzi quadretti: un muro storto resta storto
  assert.deepEqual(agganciaSpostamento([1.2, -0.4]), [1, -0.5]);
  assert.deepEqual(agganciaSpostamento([1.23, -0.44], false), [1.23, -0.44]);
});

test('D12: lo spessore non cambia l’aggancio (sottile, medio, un quadretto)', () => {
  const s = scenaDiProva();
  for (const sp of (dati.mappa.muri_linee.spessori ?? []).map((x) => x.q)) {
    const base = { ...s, muriLinee: [nuovaLinea({ id: 'x', punti: [[2.13, 3.87], [5.4, 3.87]], spessore: sp })] };
    const dopo = spostaVertice(base, 'muro:x', 0, [2.13, 3.87], dati, { aggancia: true });
    assert.deepEqual(dopo.muriLinee[0].punti[0], [2, 4], `spessore ${sp}`);
  }
});

// --- spostare, cancellare, annullare, rifare (D3, D8, D9) ----------------------------------------------------------

test('D8: spostare muri, porte, terreno e token liberi insieme, con una sola voce di annulla', () => {
  const s = scenaDiProva();
  const chiavi = ['muro:m1', 'porta:p1', 'terreno:10-3', 'token:lib1'];
  const d = spostaOggetti(s, chiavi, [2, 1], dati);
  assert.deepEqual(d.muriLinee.find((l) => l.id === 'm1').punti, [[6, 5], [10, 5]]);
  assert.deepEqual(d.porte[0].q, [8, 5]);
  assert.deepEqual(areeTerreno(d).map((a) => a.id).sort(), ['12-4', '2-12']);
  assert.deepEqual(d.token.find((t) => t.id === 'lib1').q, [17, 11]);
  assert.equal(d.token.find((t) => t.id === 'pg1').q[0], 1, 'il token di un PG non si tocca');
  assert.equal(d.annulla.length, s.annulla.length + 1, 'una voce sola per tutto lo spostamento');
  assert.equal(d.annulla.at(-1).tipo, 'editor');
  assert.equal(validaScena(d, dati), null);

  // Ctrl+Z rimette tutto insieme
  const a = annullaUltima(d);
  assert.deepEqual(a.scena.muriLinee.find((l) => l.id === 'm1').punti, [[4, 4], [8, 4]]);
  assert.deepEqual(a.scena.porte[0].q, [6, 4]);
  assert.deepEqual(areeTerreno(a.scena).map((x) => x.id).sort(), ['10-3', '2-12']);
  assert.deepEqual(a.scena.token.find((t) => t.id === 'lib1').q, [15, 10]);
});

test('D3: Ctrl+Y rimette quello che Ctrl+Z ha annullato, per qualunque tipo di voce', () => {
  const s = scenaDiProva();
  const d = spostaOggetti(s, ['muro:m1'], [3, 0], dati);
  const a = annullaUltima(d);
  assert.deepEqual(a.scena.muriLinee.find((l) => l.id === 'm1').punti, [[4, 4], [8, 4]]);
  assert.equal(a.scena.rifai.length, 1);
  const r = rifaiUltima(a.scena, dati);
  assert.deepEqual(r.scena.muriLinee.find((l) => l.id === 'm1').punti, [[7, 4], [11, 4]]);
  assert.equal(r.scena.rifai.length, 0);
  // e si può riannullare
  assert.deepEqual(annullaUltima(r.scena).scena.muriLinee.find((l) => l.id === 'm1').punti, [[4, 4], [8, 4]]);
  // niente da rifare
  assert.equal(rifaiUltima({ ...s, rifai: [] }, dati), null);
});

test('D3: una modifica nuova butta la pila del rifai, non la rimette sopra il lavoro nuovo', () => {
  const s = scenaDiProva();
  const d = spostaOggetti(s, ['muro:m1'], [3, 0], dati);
  const a = annullaUltima(d);
  // dopo l'annullamento il master fa altro
  const altro = eliminaOggetti(a.scena, ['porta:p1'], dati);
  const r = rifaiUltima(altro, dati);
  assert.equal(r.vecchia, true, 'la pila è vecchia');
  assert.deepEqual(r.scena.rifai, []);
  assert.equal(r.scena.porte.length, 0, 'il lavoro nuovo resta');
});

test('cancellare: muri, porte, aree di terreno e token liberi, con annulla', () => {
  const s = scenaDiProva();
  const d = eliminaOggetti(s, ['muro:m2', 'porta:p1', 'terreno:2-12', 'token:lib1'], dati);
  assert.deepEqual(d.muriLinee.map((l) => l.id), ['m1']);
  assert.deepEqual(d.porte, []);
  assert.deepEqual(areeTerreno(d).map((a) => a.id), ['10-3']);
  assert.deepEqual(d.token.map((t) => t.id), ['pg1'], 'resta il token del PG');
  assert.equal(conta(daBase64(d.terreno), 20, 16), 9);
  assert.equal(validaScena(d, dati), null);
  const a = annullaUltima(d);
  assert.deepEqual(a.scena.muriLinee.map((l) => l.id), ['m1', 'm2']);
  assert.equal(a.scena.porte.length, 1);
  assert.equal(areeTerreno(a.scena).length, 2);
  assert.equal(a.scena.token.length, 2);
  // niente da cancellare: la scena com'era
  assert.equal(eliminaOggetti(s, [], dati), s);
});

test('il trascinamento si calcola sempre dalla scena di partenza, non a passetti', () => {
  // difetto trovato provando nel browser: sommando spostamenti di mezzo quadretto, i token e il terreno (che stanno
  // su Q interi) arrotondavano ogni passo a zero e non si muovevano mai. Lo spostamento parte dalla scena iniziale.
  const s = scenaDiProva();
  const chiavi = ['token:lib1', 'terreno:10-3', 'muro:m1'];
  let aPassetti = s;
  for (let i = 1; i <= 6; i++) aPassetti = spostaOggetti(aPassetti, chiavi, [0.5, 0], dati);
  const inUnaVolta = spostaOggetti(s, chiavi, [3, 0], dati);
  assert.deepEqual(inUnaVolta.token.find((t) => t.id === 'lib1').q, [18, 10]);
  assert.deepEqual(areeTerreno(inUnaVolta).map((a) => a.id).sort(), ['13-3', '2-12']);
  assert.deepEqual(inUnaVolta.muriLinee.find((l) => l.id === 'm1').punti, [[7, 4], [11, 4]]);
  // e una voce sola di «annulla», non sei
  assert.equal(inUnaVolta.annulla.length, s.annulla.length + 1);
  assert.deepEqual(annullaUltima(inUnaVolta).scena.token.find((t) => t.id === 'lib1').q, [15, 10]);
});

test('D9: le maniglie spostano un vertice del muro, agganciato o libero', () => {
  const s = scenaDiProva();
  const d = spostaVertice(s, 'muro:m2', 1, [5.4, 11.2], dati, { aggancia: true });
  assert.deepEqual(d.muriLinee.find((l) => l.id === 'm2').punti, [[4, 8], [5.5, 11], [7, 11]]);
  assert.equal(d.annulla.at(-1).tipo, 'editor');
  const libero = spostaVertice(s, 'muro:m2', 1, [5.4, 11.2], dati, { aggancia: false });
  assert.deepEqual(libero.muriLinee.find((l) => l.id === 'm2').punti, [[4, 8], [5.4, 11.2], [7, 11]]);
  // vertice che non esiste, o muro che non c'è: la scena com'era
  assert.equal(spostaVertice(s, 'muro:m2', 9, [1, 1], dati), s);
  assert.equal(spostaVertice(s, 'muro:mai', 0, [1, 1], dati), s);
  // spostare dove già si trova non crea una voce
  assert.equal(spostaVertice(s, 'muro:m2', 0, [4, 8], dati), s);
  assert.deepEqual(annullaUltima(d).scena.muriLinee.find((l) => l.id === 'm2').punti, [[4, 8], [4, 11], [7, 11]]);
});

test('spostare fuori dalla griglia non butta via niente', () => {
  const s = scenaDiProva();
  const d = spostaOggetti(s, ['porta:p1', 'token:lib1'], [-100, 0], dati);
  assert.deepEqual(d.porte[0].q, [6, 4], 'la porta resta dov’era');
  assert.deepEqual(d.token.find((t) => t.id === 'lib1').q, [0, 10], 'il token si ferma al bordo');
  assert.equal(validaScena(d, dati), null);
});

// --- proprietà (D13) ----------------------------------------------------------------------------------------------

test('D13: il pannello dice che cosa è selezionato e con quali proprietà', () => {
  const s = scenaDiProva();
  assert.equal(riassuntoSelezione(s, [], dati).testo, 'Niente selezionato');
  const uno = riassuntoSelezione(s, ['muro:m2'], dati);
  assert.equal(uno.quanti, 1);
  assert.equal(uno.testo, 'Muro disegnato (Medio)');
  assert.deepEqual(uno.proprieta.map((p) => p.chiave), ['spessore']);
  assert.equal(riassuntoSelezione(s, ['porta:p1'], dati).testo, 'Porta chiusa');
  assert.deepEqual(riassuntoSelezione(s, ['porta:p1'], dati).proprieta.map((p) => p.chiave), ['stato', 'segreta']);
  assert.equal(riassuntoSelezione(s, ['terreno:10-3'], dati).testo, 'Terreno difficile (9 Q)');
  assert.equal(riassuntoSelezione(s, ['token:lib1'], dati).testo, 'Token libero «Statua»');
  // più oggetti: quanti e di che tipo
  assert.equal(riassuntoSelezione(s, ['muro:m1', 'muro:m2'], dati).testo, '2 muri');
  assert.equal(riassuntoSelezione(s, ['muro:m1', 'porta:p1'], dati).testo, '2 oggetti');
  assert.equal(riassuntoSelezione(s, ['muro:m1', 'porta:p1'], dati).proprieta, null);
  assert.equal(nomeOggetto({ tipo: 'muro', spessore: 1 }, dati), 'Muro disegnato (Un quadretto)');
});

test('le proprietà si cambiano, con annulla', () => {
  const s = scenaDiProva();
  const d = cambiaProprieta(s, 'porta:p1', { stato: 'bloccata' }, dati);
  assert.equal(d.porte[0].stato, 'bloccata');
  assert.equal(validaScena(d, dati), null);
  assert.equal(annullaUltima(d).scena.porte[0].stato, 'chiusa');
  const sp = cambiaProprieta(s, 'muro:m1', { spessore: 1 }, dati);
  assert.equal(sp.muriLinee[0].spessore, 1);
  assert.equal(riassuntoSelezione(sp, ['muro:m1'], dati).testo, 'Muro disegnato (Un quadretto)');
  // una proprietà uguale a quella di prima non crea una voce
  assert.equal(cambiaProprieta(s, 'porta:p1', { stato: 'chiusa' }, dati), s);
  assert.equal(cambiaProprieta(s, 'nonesiste', { x: 1 }, dati), s);
});

test('blocchiCambiati guarda solo i blocchi della scena', () => {
  const s = scenaDiProva();
  const d = { ...s, porte: [], nome: 'altro nome' };
  assert.deepEqual(Object.keys(blocchiCambiati(s, d)), ['porte']);
  assert.deepEqual(blocchiCambiati(s, s), {});
});

// --- punto 6: niente regressioni ------------------------------------------------------------------------------------

test('una scena vecchia (senza muriLinee, porte, rifai) si apre e si usa lo stesso', () => {
  const vecchia = nuovaScena({ id: 'vecchia', nome: 'Vecchia', colonne: 12, righe: 10, dati });
  delete vecchia.muriLinee;
  delete vecchia.porte;
  assert.equal(validaScena(vecchia, dati), null);
  assert.deepEqual(oggettiScena(vecchia), []);
  assert.equal(oggettoSotto(vecchia, [3, 3]), null);
  assert.deepEqual(oggettiNelRiquadro(vecchia, [0, 0], [12, 10]), []);
  assert.equal(eliminaOggetti(vecchia, ['muro:x'], dati), vecchia);
  assert.equal(spostaOggetti(vecchia, ['muro:x'], [1, 1], dati), vecchia);
  assert.equal(rifaiUltima(vecchia, dati), null);
  assert.equal(riassuntoSelezione(vecchia, [], dati).quanti, 0);
});

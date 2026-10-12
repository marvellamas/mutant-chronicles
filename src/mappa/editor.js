// Modello unico degli oggetti della mappa (12/10/2026, richiesta urgente di Marcello e Davide:
// docs/battlemap/ricognizione-editor-2026-10-12.md). Prima ogni cosa si selezionava a modo suo — i muri disegnati
// con «Seleziona muro», le porte solo dallo strumento «Porta», il terreno difficile per niente — e la selezione
// restava appesa cambiando strumento, così Canc cancellava un muro mentre dipingevi (D1, D2).
//
// Qui ogni oggetto della mappa è una voce con la stessa forma, e le stesse cinque azioni valgono per tutti:
//   { chiave: 'muro:<id>' | 'porta:<id>' | 'terreno:<id>' | 'token:<id>', tipo, id, nome, punti?, celle?, q? }
// Un solo strumento attivo alla volta; Esc torna sempre a «seleziona».
//
// Funzioni pure, senza DOM: le prova tests/mappa-editor.test.js, le usa src/ui/mappa/pagina.js.
// Il terreno difficile resta una maschera di Q nel file (le scene vecchie si aprono com'erano): per l'editor le sue
// «aree» sono le macchie collegate della maschera, calcolate alla lettura.
import { cella, daBase64, impostaCella, inBase64 } from './celle.js';
import { lineeDi, tratti, distanzaPuntoSegmento, conMuriLinee } from './muri-linee.js';
import { celleToken, dimensioni } from './token.js';
import { portaA } from './porte.js';

/** Gli strumenti della barra, nell'ordine. `seleziona` è il predefinito e quello a cui torna Esc. */
export const STRUMENTI = [
  { id: 'seleziona', nome: 'Seleziona', icona: '➤', tasto: 'V', titolo: 'Clic per scegliere, trascina per spostare; Maiusc o riquadro per più oggetti' },
  { id: 'muro', nome: 'Muro', icona: '▬', tasto: 'M', titolo: 'Trascina per disegnare un muro' },
  { id: 'porta', nome: 'Porta', icona: '🚪', tasto: 'P', titolo: 'Clic su un muro: mette una porta' },
  { id: 'terreno', nome: 'Terreno difficile', icona: '▨', tasto: 'T', titolo: 'Dipingi i quadretti che costano di più' },
  { id: 'token-libero', nome: 'Token libero', icona: '⬤', tasto: 'L', titolo: 'Una pedina senza regole: un carro, una statua, un PNG di passaggio' },
  { id: 'gomma', nome: 'Gomma', icona: '🧹', tasto: 'G', titolo: 'Cancella quello che tocchi; taglia i muri disegnati dove passa' },
];
export const ID_STRUMENTI = STRUMENTI.map((s) => s.id);
export const STRUMENTO_PREDEFINITO = 'seleziona';
/** I tipi di oggetto che la selezione conosce. */
export const TIPI = ['muro', 'porta', 'terreno', 'token'];

/** Lo stato dell'editor all'apertura della mappa. */
export const statoEditor = () => ({ strumento: STRUMENTO_PREDEFINITO, selezione: [], hover: null });

/**
 * Cambia strumento. La selezione e l'evidenziazione si azzerano sempre (D1, D2): quello che era scelto prima non
 * deve restare sotto Canc mentre fai altro.
 */
export function cambiaStrumento(stato, id) {
  const s = ID_STRUMENTI.includes(id) ? id : STRUMENTO_PREDEFINITO;
  return { ...stato, strumento: s, selezione: [], hover: null };
}

/** Esc: torna sempre a Seleziona, senza niente di selezionato (D5). */
export const esci = (stato) => cambiaStrumento(stato, STRUMENTO_PREDEFINITO);

export const chiaveDi = (tipo, id) => `${tipo}:${id}`;
export function dallaChiave(chiave) {
  const i = String(chiave ?? '').indexOf(':');
  return i < 0 ? null : { tipo: chiave.slice(0, i), id: chiave.slice(i + 1) };
}

// --- le aree di terreno difficile ------------------------------------------------------------------------------

/**
 * Le macchie collegate della maschera del terreno difficile, in ordine stabile (dalla cella più in alto a sinistra).
 * L'id di un'area è il suo quadretto d'angolo: `12-7`. Così selezionare, spostare e cancellare il terreno funziona
 * come per gli altri oggetti senza cambiare il formato della scena.
 * @returns [{ id, celle: [[x, y], …] }]
 */
export function areeTerreno(scena) {
  const { colonne: C, righe: R } = scena.griglia;
  const m = daBase64(scena.terreno);
  const visti = new Set();
  const aree = [];
  for (let y = 0; y < R; y++) {
    for (let x = 0; x < C; x++) {
      const k = y * C + x;
      if (visti.has(k) || !cella(m, C, R, x, y)) continue;
      const celle = [];
      const coda = [[x, y]];
      visti.add(k);
      while (coda.length) {
        const [cx, cy] = coda.pop();
        celle.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= C || ny >= R) continue;
          const nk = ny * C + nx;
          if (visti.has(nk) || !cella(m, C, R, nx, ny)) continue;
          visti.add(nk);
          coda.push([nx, ny]);
        }
      }
      celle.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      aree.push({ id: `${celle[0][0]}-${celle[0][1]}`, celle });
    }
  }
  return aree;
}

// --- l'elenco unico degli oggetti ------------------------------------------------------------------------------

/** I token che l'editor seleziona: solo i token liberi (segnaposto). Gli altri si muovono con le regole del gioco. */
export const tokenLiberi = (scena) => (scena.token ?? []).filter((t) => t.rif?.tipo === 'segnaposto');

/**
 * Tutti gli oggetti selezionabili della scena, con la stessa forma.
 * @returns [{ chiave, tipo, id, nome, punti?, celle?, q?, ingombro?, spessore? }]
 */
export function oggettiScena(scena) {
  const out = [];
  for (const l of lineeDi(scena)) out.push({ chiave: chiaveDi('muro', l.id), tipo: 'muro', id: l.id, nome: 'Muro disegnato', punti: l.punti, spessore: l.spessore });
  for (const p of scena.porte ?? []) out.push({ chiave: chiaveDi('porta', p.id), tipo: 'porta', id: p.id, nome: 'Porta', q: p.q, stato: p.stato, segreta: p.segreta });
  for (const a of areeTerreno(scena)) out.push({ chiave: chiaveDi('terreno', a.id), tipo: 'terreno', id: a.id, nome: 'Terreno difficile', celle: a.celle });
  for (const t of tokenLiberi(scena)) out.push({ chiave: chiaveDi('token', t.id), tipo: 'token', id: t.id, nome: t.nome || 'Token libero', q: t.q, ingombro: t.ingombro, blocca: !!t.blocca, nascosto: !!t.nascosto });
  return out;
}

/** L'oggetto di una chiave, o null. */
export const oggettoDi = (scena, chiave) => oggettiScena(scena).find((o) => o.chiave === chiave) ?? null;

/**
 * L'oggetto sotto il punto p (in Q frazionari), o null. L'ordine conta: prima i token liberi e le porte (piccoli e
 * ben visibili), poi i muri disegnati, poi le aree di terreno (grandi, stanno sotto).
 * @param tolleranzaQ quanto si può sbagliare sui muri disegnati (la UI la calcola dallo zoom, D7)
 */
export function oggettoSotto(scena, p, { tolleranzaQ = 0.35 } = {}) {
  const dentroCella = (q, ingombro, [px, py]) => {
    const [lc, lr] = dimensioni(ingombro);
    return px >= q[0] && px < q[0] + lc && py >= q[1] && py < q[1] + lr;
  };
  const oggetti = oggettiScena(scena);
  for (const o of oggetti) if (o.tipo === 'token' && dentroCella(o.q, o.ingombro, p)) return o;
  for (const o of oggetti) if (o.tipo === 'porta' && dentroCella(o.q, 1, p)) return o;
  let muro = null;
  let dMin = Infinity;
  for (const o of oggetti) {
    if (o.tipo !== 'muro') continue;
    let d = Infinity;
    for (const [a, b] of tratti({ punti: o.punti })) d = Math.min(d, distanzaPuntoSegmento(p, a, b));
    if (d <= tolleranzaQ + (o.spessore ?? 0) / 2 && d < dMin) { dMin = d; muro = o; }
  }
  if (muro) return muro;
  for (const o of oggetti) if (o.tipo === 'terreno' && o.celle.some(([x, y]) => dentroCella([x, y], 1, p))) return o;
  return null;
}

/** Gli oggetti che il riquadro fra a e b (Q frazionari, in qualunque ordine) prende per intero o in parte. */
export function oggettiNelRiquadro(scena, a, b) {
  const x0 = Math.min(a[0], b[0]);
  const x1 = Math.max(a[0], b[0]);
  const y0 = Math.min(a[1], b[1]);
  const y1 = Math.max(a[1], b[1]);
  const dentro = ([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const cellaDentro = ([x, y]) => x + 1 > x0 && x < x1 && y + 1 > y0 && y < y1;
  return oggettiScena(scena).filter((o) => {
    if (o.tipo === 'muro') return o.punti.some(dentro);
    if (o.tipo === 'terreno') return o.celle.some(cellaDentro);
    const [lc, lr] = dimensioni(o.ingombro ?? 1);
    return o.q[0] + lc > x0 && o.q[0] < x1 && o.q[1] + lr > y0 && o.q[1] < y1;
  });
}

// --- la selezione -----------------------------------------------------------------------------------------------

/**
 * La selezione nuova. Senza `aggiungi` sostituisce; con `aggiungi` (Maiusc) aggiunge o toglie.
 * `chiavi` null o [] con `aggiungi` falso: non selezionato niente.
 */
export function conSelezione(stato, chiavi, { aggiungi = false } = {}) {
  const nuove = (Array.isArray(chiavi) ? chiavi : [chiavi]).filter(Boolean);
  if (!aggiungi) return { ...stato, selezione: [...new Set(nuove)] };
  const insieme = new Set(stato.selezione);
  for (const k of nuove) { if (insieme.has(k)) insieme.delete(k); else insieme.add(k); }
  return { ...stato, selezione: [...insieme] };
}

/** Toglie dalla selezione le chiavi che non esistono più (dopo una cancellazione o il ricarico della scena). */
export function ripulisciSelezione(stato, scena) {
  const presenti = new Set(oggettiScena(scena).map((o) => o.chiave));
  const selezione = stato.selezione.filter((k) => presenti.has(k));
  const hover = stato.hover && presenti.has(stato.hover) ? stato.hover : null;
  return selezione.length === stato.selezione.length && hover === stato.hover ? stato : { ...stato, selezione, hover };
}

// --- aggancio alla griglia (punto 3, richiesta di Davide) --------------------------------------------------------

/** Il passo dell'aggancio: mezzo quadretto, cioè gli incroci della griglia e i punti medi delle sue linee. */
export const PASSO_AGGANCIO = 0.5;

/** Un punto in Q frazionari agganciato alla griglia (o lasciato dov'è se l'aggancio è spento). */
export function agganciaPunto(p, acceso = true) {
  if (!acceso) return [arrotonda(p[0]), arrotonda(p[1])];
  return [Math.round(p[0] / PASSO_AGGANCIO) * PASSO_AGGANCIO, Math.round(p[1] / PASSO_AGGANCIO) * PASSO_AGGANCIO];
}

/** Tutti i punti di un tracciato agganciati. */
export const agganciaPunti = (punti, acceso = true) => punti.map((p) => agganciaPunto(p, acceso));

/**
 * Lo spostamento (dx, dy) agganciato: si aggancia lo spostamento, non il punto, così un muro storto resta storto e
 * trasla di mezzi quadretti. Con l'aggancio spento lo spostamento resta libero.
 */
export function agganciaSpostamento(d, acceso = true) {
  if (!acceso) return [arrotonda(d[0]), arrotonda(d[1])];
  return [Math.round(d[0] / PASSO_AGGANCIO) * PASSO_AGGANCIO, Math.round(d[1] / PASSO_AGGANCIO) * PASSO_AGGANCIO];
}

const arrotonda = (n) => Math.round(n * 100) / 100;

// --- spostare, cancellare ------------------------------------------------------------------------------------------

/** Le celle di una maschera spostate di (dx, dy) interi; quelle che escono dalla griglia si perdono. */
function spostaCelle(maschera, C, R, celle, dx, dy) {
  let m = maschera;
  for (const [x, y] of celle) m = impostaCella(m, C, R, x, y, false);
  for (const [x, y] of celle) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < C && ny < R) m = impostaCella(m, C, R, nx, ny, true);
  }
  return m;
}

/**
 * La scena con gli oggetti selezionati spostati di (dx, dy) Q, con **una sola** voce di «annulla» per tutto lo
 * spostamento (così Ctrl+Z rimette tutto insieme).
 * Muri e porte si spostano in Q frazionari; terreno e token stanno sui Q interi e lo spostamento si arrotonda.
 */
export function spostaOggetti(scena, chiavi, [dx, dy], dati, adesso = new Date()) {
  if (!chiavi?.length || (!dx && !dy)) return scena;
  const { colonne: C, righe: R } = scena.griglia;
  const scelte = new Set(chiavi);
  const prima = { muriLinee: lineeDi(scena), porte: scena.porte ?? [], terreno: scena.terreno, token: scena.token ?? [] };
  const dxi = Math.round(dx);
  const dyi = Math.round(dy);

  const muriLinee = prima.muriLinee.map((l) => (scelte.has(chiaveDi('muro', l.id))
    ? { ...l, punti: l.punti.map(([x, y]) => [arrotonda(x + dx), arrotonda(y + dy)]) } : l));
  const porte = prima.porte.map((p) => {
    if (!scelte.has(chiaveDi('porta', p.id))) return p;
    const q = [p.q[0] + dxi, p.q[1] + dyi];
    if (q[0] < 0 || q[1] < 0 || q[0] >= C || q[1] >= R) return p;
    const aggancio = p.aggancio?.punto ? { ...p.aggancio, punto: [arrotonda(p.aggancio.punto[0] + dxi), arrotonda(p.aggancio.punto[1] + dyi)] } : p.aggancio;
    return { ...p, q, aggancio };
  });
  let terreno = daBase64(prima.terreno);
  for (const a of areeTerreno(scena)) if (scelte.has(chiaveDi('terreno', a.id))) terreno = spostaCelle(terreno, C, R, a.celle, dxi, dyi);
  const token = prima.token.map((t) => {
    if (t.rif?.tipo !== 'segnaposto' || !scelte.has(chiaveDi('token', t.id))) return t;
    const [lc, lr] = dimensioni(t.ingombro);
    const q = [Math.min(Math.max(0, t.q[0] + dxi), C - lc), Math.min(Math.max(0, t.q[1] + dyi), R - lr)];
    return { ...t, q };
  });

  return conVoceEditor(scena, { ...scena, muriLinee, porte, terreno: inBase64(terreno), token }, prima, dati, adesso);
}

/** La scena senza gli oggetti selezionati, con una sola voce di «annulla». */
export function eliminaOggetti(scena, chiavi, dati, adesso = new Date()) {
  if (!chiavi?.length) return scena;
  const { colonne: C, righe: R } = scena.griglia;
  const scelte = new Set(chiavi);
  const prima = { muriLinee: lineeDi(scena), porte: scena.porte ?? [], terreno: scena.terreno, token: scena.token ?? [] };
  const muriLinee = prima.muriLinee.filter((l) => !scelte.has(chiaveDi('muro', l.id)));
  const porte = prima.porte.filter((p) => !scelte.has(chiaveDi('porta', p.id)));
  let terreno = daBase64(prima.terreno);
  for (const a of areeTerreno(scena)) {
    if (!scelte.has(chiaveDi('terreno', a.id))) continue;
    for (const [x, y] of a.celle) terreno = impostaCella(terreno, C, R, x, y, false);
  }
  const token = prima.token.filter((t) => !(t.rif?.tipo === 'segnaposto' && scelte.has(chiaveDi('token', t.id))));
  return conVoceEditor(scena, { ...scena, muriLinee, porte, terreno: inBase64(terreno), token }, prima, dati, adesso);
}

/**
 * Sposta un vertice di un muro disegnato (maniglia): `indice` è il numero del vertice.
 * Con l'aggancio acceso il vertice finisce sull'incrocio o sul punto medio più vicino.
 */
export function spostaVertice(scena, chiaveMuro, indice, punto, dati, { aggancia = true, adesso = new Date() } = {}) {
  const r = dallaChiave(chiaveMuro);
  const linea = lineeDi(scena).find((l) => l.id === r?.id);
  if (!linea || indice < 0 || indice >= linea.punti.length) return scena;
  const p = agganciaPunto(punto, aggancia);
  if (linea.punti[indice][0] === p[0] && linea.punti[indice][1] === p[1]) return scena;
  const punti = linea.punti.map((x, i) => (i === indice ? p : x));
  const prima = { muriLinee: lineeDi(scena) };
  const muriLinee = prima.muriLinee.map((l) => (l.id === linea.id ? { ...l, punti } : l));
  return conVoceEditor(scena, { ...scena, muriLinee }, prima, dati, adesso);
}

/** Cambia le proprietà di un oggetto (spessore del muro, stato della porta, «blocca» del token libero). */
export function cambiaProprieta(scena, chiave, modifiche, dati, adesso = new Date()) {
  const r = dallaChiave(chiave);
  if (!r) return scena;
  const prima = { muriLinee: lineeDi(scena), porte: scena.porte ?? [], token: scena.token ?? [] };
  if (r.tipo === 'muro') {
    const muriLinee = prima.muriLinee.map((l) => (l.id === r.id ? { ...l, ...modifiche } : l));
    return conVoceEditor(scena, { ...scena, muriLinee }, prima, dati, adesso);
  }
  if (r.tipo === 'porta') {
    const porte = prima.porte.map((p) => (p.id === r.id ? { ...p, ...modifiche } : p));
    return conVoceEditor(scena, { ...scena, porte }, prima, dati, adesso);
  }
  if (r.tipo === 'token') {
    const token = prima.token.map((t) => (t.id === r.id && t.rif?.tipo === 'segnaposto' ? { ...t, ...modifiche } : t));
    return conVoceEditor(scena, { ...scena, token }, prima, dati, adesso);
  }
  return scena;
}

/**
 * Una voce di «annulla» dell'editor: tiene il prima e il dopo dei soli blocchi toccati, così Ctrl+Z e Ctrl+Y
 * rimettono tutto in una volta (D3). Niente è cambiato: la scena com'era.
 */
export function conVoceEditor(scenaPrima, scenaDopo, prima, dati, adesso = new Date()) {
  const chiavi = ['muriLinee', 'porte', 'terreno', 'token'].filter((k) => k in prima);
  const dopo = {};
  const vecchio = {};
  let cambiato = false;
  for (const k of chiavi) {
    const a = prima[k];
    const b = scenaDopo[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    vecchio[k] = a;
    dopo[k] = b;
    cambiato = true;
  }
  if (!cambiato) return scenaPrima;
  const max = dati?.mappa?.scena?.annulla_max ?? 50;
  return {
    ...scenaDopo,
    annulla: [...(scenaDopo.annulla ?? []), { tipo: 'editor', prima: vecchio, dopo, quando: adesso.toISOString() }].slice(-max),
  };
}

// --- il pannello delle proprietà (D13) -----------------------------------------------------------------------------

/**
 * Che cosa è selezionato, per il pannello: { quanti, tipo, testo, oggetti, proprieta }.
 * `tipo` è il tipo comune quando sono tutti uguali, altrimenti null; `proprieta` c'è solo con un oggetto solo.
 */
export function riassuntoSelezione(scena, chiavi, dati) {
  const oggetti = (chiavi ?? []).map((k) => oggettoDi(scena, k)).filter(Boolean);
  if (!oggetti.length) return { quanti: 0, tipo: null, testo: 'Niente selezionato', oggetti: [], proprieta: null };
  const tipi = [...new Set(oggetti.map((o) => o.tipo))];
  const tipo = tipi.length === 1 ? tipi[0] : null;
  if (oggetti.length > 1) {
    const nomi = { muro: ['muro', 'muri'], porta: ['porta', 'porte'], terreno: ['area di terreno difficile', 'aree di terreno difficile'], token: ['token libero', 'token liberi'] };
    const testo = tipo ? `${oggetti.length} ${nomi[tipo][1]}` : `${oggetti.length} oggetti`;
    return { quanti: oggetti.length, tipo, testo, oggetti, proprieta: null };
  }
  const o = oggetti[0];
  return { quanti: 1, tipo: o.tipo, testo: nomeOggetto(o, dati), oggetti, proprieta: proprietaOggetto(o, dati) };
}

/** «Muro disegnato (Medio)», «Porta chiusa», «Terreno difficile (12 Q)», «Token libero «Statua»». */
export function nomeOggetto(o, dati) {
  if (o.tipo === 'muro') return `Muro disegnato (${nomeSpessore(o.spessore, dati)})`;
  if (o.tipo === 'porta') return `Porta ${o.stato}${o.segreta ? ', segreta' : ''}`;
  if (o.tipo === 'terreno') return `Terreno difficile (${o.celle.length} Q)`;
  return `Token libero «${o.nome}»`;
}

/** Il nome dello spessore più vicino (data/mappa.json → muri_linee.spessori). */
export function nomeSpessore(q, dati) {
  const sp = dati?.mappa?.muri_linee?.spessori ?? [];
  if (!sp.length) return `${q} Q`;
  return sp.reduce((a, b) => (Math.abs(b.q - q) < Math.abs(a.q - q) ? b : a)).nome;
}

/** Le proprietà modificabili di un oggetto, per il pannello: [{ chiave, etichetta, tipo, valore, valori? }]. */
export function proprietaOggetto(o, dati) {
  if (o.tipo === 'muro') {
    return [{ chiave: 'spessore', etichetta: 'Spessore', tipo: 'scelta', valore: o.spessore, valori: (dati?.mappa?.muri_linee?.spessori ?? []).map((s) => ({ valore: s.q, nome: s.nome })) }];
  }
  if (o.tipo === 'porta') {
    return [
      { chiave: 'stato', etichetta: 'Porta', tipo: 'scelta', valore: o.stato, valori: ['aperta', 'chiusa', 'bloccata'].map((s) => ({ valore: s, nome: s[0].toUpperCase() + s.slice(1) })) },
      { chiave: 'segreta', etichetta: 'Segreta', tipo: 'casella', valore: !!o.segreta },
    ];
  }
  if (o.tipo === 'token') {
    return [
      { chiave: 'nascosto', etichetta: 'Nascosto ai giocatori', tipo: 'casella', valore: !!o.nascosto },
      { chiave: 'blocca', etichetta: 'Blocca il movimento e dà Copertura', tipo: 'casella', valore: !!o.blocca },
    ];
  }
  return [{ chiave: 'celle', etichetta: 'Quadretti', tipo: 'testo', valore: String(o.celle.length) }];
}

export { conMuriLinee, portaA, celleToken };

/**
 * Fonde le ultime due voci «editor» della pila in una sola: un trascinamento fa tanti passi, ma Ctrl+Z deve
 * riportare indietro tutto lo spostamento in una volta. Se le ultime due non sono dell'editor, la pila com'è.
 */
export function fondiUltimeDue(annulla) {
  const n = annulla?.length ?? 0;
  if (n < 2) return annulla;
  const vecchia = annulla[n - 2];
  const nuova = annulla[n - 1];
  if (vecchia.tipo !== 'editor' || nuova.tipo !== 'editor') return annulla;
  return [...annulla.slice(0, n - 2), { ...nuova, prima: { ...nuova.prima, ...vecchia.prima }, dopo: { ...vecchia.dopo, ...nuova.dopo } }];
}

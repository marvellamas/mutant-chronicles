// Nome del template sulla mappa (12/10/2026, punto 4 della sessione di gioco di Marcello e Davide): il nome
// facoltativo si vede dentro l'area, largo fra 1 e 3 Q, mai fuori dall'area, accorciato con i puntini se l'area è
// più piccola, leggibile su immagini chiare e scure (bordo bianco come i muri) e visibile ai giocatori con il template.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { celleTemplate, postoNome, postoNomeCelle, celleDaMaschera, templatePerGiocatori, nuovoTemplate } from '../src/mappa/template.js';
import { nomeNellArea } from '../src/ui/mappa/disegno-aree.js';

const { dati } = await caricaDati((n) => readFile(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));
const RT = dati.mappa.template;
const C = 20;
const R = 14;
const scena = (token = []) => ({ ...nuovaScena({ id: 'p', nome: 'P', colonne: C, righe: R, nebbia: 'scoperta', dati }), token });
const griglia = scena().griglia;
const tpl = (o) => nuovoTemplate({ id: 't1', colore: RT.colori[0].valore, ...o });

/** Il Q che contiene il punto del nome. */
const qDi = (p) => [Math.floor(p.q[0]), Math.floor(p.q[1])];
const coperto = (celle, [x, y]) => !!celle[y * C + x];

test('il nome sta su un Q coperto, non sul Q d’origine (cono e linea non lo coprono)', () => {
  const t = tpl({ forma: 'cono', misure: { lunghezza: 6, larghezza: 6 }, origine: [3, 7], direzione: 0 });
  const celle = celleTemplate(t, griglia, RT);
  const p = postoNome(t, griglia, RT, celle);
  assert.ok(p, 'il posto c’è');
  assert.ok(coperto(celle, qDi(p)), 'il Q del nome è dentro l’area');
  assert.ok(!coperto(celle, t.origine), 'il Q d’origine del cono non è nell’area');
  assert.notDeepEqual(qDi(p), t.origine);
});

test('la larghezza sta fra 1 e 3 Q, e il nome non esce dall’area', () => {
  const grande = tpl({ forma: 'cerchio', misure: { raggio: 4 }, origine: [10, 7] });
  const p = postoNome(grande, griglia, RT);
  assert.equal(p.larghezza, RT.nome.larghezza_max_q, 'area larga: si ferma al massimo (3 Q)');
  // la linea larga 1 Q: il nome resta largo 1 Q (il minimo), non di più
  const stretto = tpl({ forma: 'linea', misure: { lunghezza: 5, larghezza: 1 }, origine: [2, 2], direzione: 90 });
  const q = postoNome(stretto, griglia, RT);
  assert.equal(q.larghezza, RT.nome.larghezza_min_q);
  // il riquadro del nome (centro ± metà larghezza) sta dentro i Q coperti della sua riga
  const celle = celleTemplate(stretto, griglia, RT);
  const [x0, x1] = [Math.floor(q.q[0] - q.larghezza / 2), Math.ceil(q.q[0] + q.larghezza / 2) - 1];
  for (let x = x0; x <= x1; x++) assert.ok(coperto(celle, [x, Math.floor(q.q[1])]), `il Q ${x} sotto il nome è dell’area`);
});

test('un’area di un solo quadretto: larghezza 1 Q', () => {
  const t = tpl({ forma: 'quadrato', misure: { lato: 1 }, origine: [5, 5] });
  const p = postoNome(t, griglia, RT);
  assert.deepEqual([qDi(p), p.larghezza], [[5, 5], 1]);
});

test('senza Q coperti non c’è nessun posto (niente nome da scrivere)', () => {
  assert.equal(postoNomeCelle(new Uint8Array(C * R), griglia, RT), null);
});

test('ai giocatori arriva il nome, e il posto si calcola dalla maschera come dal master', () => {
  const t = tpl({ forma: 'cerchio', misure: { raggio: 2 }, origine: [8, 6], nome: 'Nube di gas' });
  const s = { ...scena(), template: [t] };
  const [v] = templatePerGiocatori(s.template, s, RT);
  assert.equal(v.nome, 'Nube di gas');
  const dalMaster = postoNome(t, griglia, RT);
  const daiGiocatori = postoNomeCelle(celleDaMaschera(v.celle, griglia), griglia, RT);
  assert.deepEqual(daiGiocatori, dalMaster, 'stesso posto e stessa larghezza');
  // un template nascosto non arriva: nemmeno il nome
  assert.deepEqual(templatePerGiocatori([{ ...t, nascosto: true }], s, RT), []);
});

// --- il disegno: misura, bordo e puntini -----------------------------------------------------------------------

/** Contesto di disegno finto: misura un carattere mezzo corpo e registra che cosa scrive. */
function contestoFinto() {
  const c = {
    font: '', lineWidth: 0, lineJoin: '', strokeStyle: '', fillStyle: '', textAlign: '', textBaseline: '',
    scritte: [], bordi: [],
    save() {}, restore() {},
    measureText(t) { const px = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 12); return { width: t.length * px * 0.5 }; },
    strokeText(t, x, y) { this.bordi.push({ t, x, y, px: Number(/(\d+(?:\.\d+)?)px/.exec(this.font)[1]), colore: this.strokeStyle, spessore: this.lineWidth }); },
    fillText(t, x, y) { this.scritte.push({ t, x, y, px: Number(/(\d+(?:\.\d+)?)px/.exec(this.font)[1]), colore: this.fillStyle }); },
  };
  return c;
}
const disegna = (etichetta, posto, scala = 1) => {
  const c = contestoFinto();
  nomeNellArea(c, { scena: scena(), cam: { scala, ox: 0, oy: 0 }, etichetta, posto, regole: RT.nome });
  return c;
};
const qpx = griglia.q_px;

test('il nome si scrive con il bordo bianco, come i muri, e il pieno scuro', () => {
  const c = disegna('Fumo', { q: [5.5, 5.5], larghezza: 3 });
  assert.equal(c.scritte.length, 1);
  assert.equal(c.bordi.length, 1);
  assert.deepEqual([c.bordi[0].colore, c.bordi[0].spessore], [RT.nome.bordo, RT.nome.bordo_px]);
  assert.equal(c.scritte[0].colore, RT.nome.colore);
  assert.equal(c.scritte[0].t, 'Fumo', 'ci sta tutto: nessun taglio');
  assert.ok(c.scritte[0].px >= RT.nome.px_min && c.scritte[0].px <= RT.nome.px_max);
});

test('se non ci sta, prima si rimpicciolisce e poi si accorcia con i puntini', () => {
  const lungo = 'Nube di gas corrosivo della Legione Oscura';
  const c = disegna(lungo, { q: [5.5, 5.5], larghezza: 1 });
  const scritta = c.scritte[0];
  assert.ok(scritta.t.endsWith('…'), 'accorciato con i puntini');
  assert.ok(scritta.t.length < lungo.length);
  assert.equal(scritta.px, RT.nome.px_min, 'prima si è rimpicciolito fino al minimo');
  // e quello che resta sta dentro 1 Q
  assert.ok(scritta.t.length * scritta.px * 0.5 <= qpx, 'il testo tagliato non esce dall’area');
});

test('il nome non supera mai la larghezza concessa, a nessuno zoom', () => {
  for (const scala of [0.5, 1, 2, 3]) {
    for (const larghezza of [1, 2, 3]) {
      const c = disegna('Zona di fuoco', { q: [5.5, 5.5], larghezza }, scala);
      if (!c.scritte.length) continue; // mappa troppo rimpicciolita: non si scrive
      const s = c.scritte[0];
      const massimo = larghezza * qpx * scala;
      assert.ok(s.t.length * s.px * 0.5 <= massimo + 0.01, `scala ${scala}, ${larghezza} Q: ${s.t} a ${s.px}px sta dentro`);
    }
  }
});

test('mappa molto rimpicciolita: il nome non si scrive (sarebbe illeggibile)', () => {
  const c = disegna('Fumo', { q: [5.5, 5.5], larghezza: 1 }, 0.05);
  assert.deepEqual([c.scritte.length, c.bordi.length], [0, 0]);
});

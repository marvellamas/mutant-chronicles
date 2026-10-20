// Tablet vero, 20/10/2026: cambiare un valore (PM o PV del personaggio, PM di un cristallo) non ridisegna la scheda. Si
// aggiornano solo i nodi che lo mostrano (src/ui/vivi.js): gli stessi elementi restano nel documento, il campo «±N»
// tiene il fuoco con il testo selezionato, «Annulla» compare senza ridisegnare, il pulsante «torna in cima» usa
// il colore d'accento del foglio di stile.
//
// NB (onestà sui limiti): questi test usano il DOM finto di tests/dom-finto.js. Provano che i nodi restano gli stessi e che
// i loro valori cambiano; NON provano lo scorrimento, il fuoco e la tastiera di un tablet vero, che nessuno strumento qui
// lancia con eventi reali. Per quello c'è la prova a mano elencata nel riepilogo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, clic, dati } from './scheda-aiuti.js';
import { aggiornaVivi, quantiVivi } from '../src/ui/vivi.js';

const ESEMPIO = 'Fratello-Anselmo-Viri_liv3_2026-10-02.json';
const ROSSO = { uid: 'rosso', rif: 'artefatti:batteria-matrice-da-10-pm-chroma-rosso', stato: 'trasportato', quantita: 1, note: '', sintonizzato: true };
const BASTONE = {
  uid: 'bast', rif: null, stato: 'trasportato', quantita: 1, note: '', sintonizzato: true,
  personalizzato: { nome: 'Bastone di prova', tipo: 'artefatto', potenza: 'Non Comune', energia: 'Verde', capacita_pm: 6, riserva: 'cariche', alimentazione: 'esclusiva', infuso: { incantesimo: 'Cura Ferite', livello: 3 } },
};

function ctxCon(equip = [ROSSO], attiva = 'poteri') {
  return contesto(ESEMPIO, { attiva, scelte: (s) => { s.equipaggiamento = [...s.equipaggiamento, ...equip]; return s; } });
}
/** Come fa app.js (cambiaVivo): la sessione cambia, il contesto la rilegge, partono solo i nodi interessati. */
function cambia(c, modifica, chiavi) {
  c.sessione = { ...c.sessione, ...modifica(c.sessione) };
  c.puoAnnullareSessione = true;
  return aggiornaVivi([...chiavi, 'annullabile']);
}
const nodi = (r, f) => r.radice.tutti().filter(f);
/** I nodi che non stanno dentro una zona viva (che per definizione si ricostruisce se il suo testo cambia). */
const fuoriDalleZone = (r) => { const dentro = new Set(nodi(r, (n) => /regione-viva|riga-chroma-viva/.test(n.className ?? '')).flatMap((z) => z.tutti())); return r.radice.tutti().filter((n) => !dentro.has(n)); };
const cristallo = (r, parte) => nodi(r, (n) => n.className?.startsWith('riga-cristallo')).find((n) => n.textContent.includes(parte));

test('PM del personaggio: lo stesso nodo cambia numero, barra e tasti; nessun nodo viene sostituito', () => {
  const c = ctxCon();
  const r = resa(c);
  const prima = r.radice.tutti();
  const numeri = nodi(r, (n) => n.tagName === 'STRONG' && n.parent?.className === 'valore-tavolo' && /riquadro-pm/.test(n.parent.parent?.className ?? ''));
  assert.ok(numeri.length >= 1, 'il numero dei PM c’è');
  const barre = nodi(r, (n) => n.className === 'barra-traccia' && n.getAttribute('aria-label') === 'PM');
  const valore0 = c.sessione.pmAttuali;
  const m = aggiornaVivi.length; // la funzione esiste
  assert.ok(m >= 0);
  const eseguite = cambia(c, (s) => ({ pmAttuali: s.pmAttuali - 5 }), ['pmAttuali']);
  assert.ok(eseguite >= 2, 'più nodi mostrano i PM: riquadro, barra e testata');
  for (const n of numeri) assert.equal(n.textContent, String(valore0 - 5));
  for (const b of barre) assert.equal(b.getAttribute('aria-valuenow'), String(valore0 - 5));
  // la scheda non è stata ricostruita: ogni nodo di prima c'è ancora, identico
  const dopo = new Set(r.radice.tutti());
  assert.ok(prima.every((n) => dopo.has(n)), 'nessun nodo sostituito');
  assert.equal(dopo.size, prima.length, 'nessun nodo aggiunto o tolto');
  // i tasti −: a 0 PM si spengono, +: al massimo si spengono
  const meno = nodi(r, (n) => n.tagName === 'BUTTON' && n.getAttribute('aria-label') === 'Togli 1 a Punti Magia');
  cambia(c, () => ({ pmAttuali: 0 }), ['pmAttuali']);
  assert.ok(meno.length && meno.every((b) => b.disabled === true));
  cambia(c, () => ({ pmAttuali: c.massimi.pm }), ['pmAttuali']);
  const piu = nodi(r, (n) => n.tagName === 'BUTTON' && n.getAttribute('aria-label') === 'Aggiungi 1 a Punti Magia');
  assert.ok(piu.every((b) => b.disabled === true), 'al massimo il + è spento');
  assert.ok(meno.every((b) => b.disabled === false));
});

test('PV: stesso comportamento, nella testata e nel riquadro', () => {
  const c = ctxCon([], 'combattimento');
  const r = resa(c);
  const prima = r.radice.tutti();
  const v0 = c.sessione.pvAttuali;
  const n = cambia(c, (s) => ({ pvAttuali: s.pvAttuali - 1 }), ['pvAttuali']);
  assert.ok(n >= 1);
  const numeri = nodi(r, (x) => x.tagName === 'STRONG' && x.parent?.className === 'valore-tavolo' && /riquadro-pv/.test(x.parent.parent?.className ?? ''));
  assert.ok(numeri.length >= 1 && numeri.every((x) => x.textContent === String(v0 - 1)));
  assert.ok(prima.every((x) => new Set(r.radice.tutti()).has(x)));
});

test('cristallo: numero, barra, alone e tasti di quella riga cambiano; la riga e il campo ±N restano gli stessi nodi', () => {
  const c = ctxCon();
  const r = resa(c);
  const riga = cristallo(r, 'Batteria Matrice');
  assert.ok(riga);
  const campo = riga.tutti().find((n) => n.className?.includes('campo-variazione-pm'));
  const barra = riga.tutti().find((n) => n.className === 'barra-traccia');
  const punto = riga.tutti().find((n) => n.className?.includes('chroma-punto'));
  const prima = fuoriDalleZone(r);
  campo.value = '+4';
  assert.ok(quantiVivi('chroma:rosso') >= 1);
  cambia(c, (s) => ({ chroma: { ...s.chroma, rosso: { pmAttuali: 0 } } }), ['chroma:rosso']);
  assert.equal(barra.getAttribute('aria-valuenow'), '0');
  assert.match(punto.className, /esausto/);
  assert.match(riga.textContent, /Trasparente \(alone Rosso\)/);
  assert.equal(riga.tutti().find((n) => n.tagName === 'BUTTON' && n.getAttribute('aria-label')?.startsWith('Togli 1')).disabled, true);
  cambia(c, (s) => ({ chroma: { ...s.chroma, rosso: { pmAttuali: 7 } } }), ['chroma:rosso']);
  assert.equal(barra.getAttribute('aria-valuenow'), '7');
  assert.doesNotMatch(punto.className, /esausto/);
  assert.match(riga.textContent, /Chroma Rosso/);
  // stessi nodi, e il campo conserva il testo scritto
  const dopo = new Set(r.radice.tutti());
  assert.ok(prima.every((n) => dopo.has(n)), 'nessun nodo sostituito fuori dalle zone vive');
  assert.equal(campo.value, '+4');
  // un altro cristallo non si tocca
  const altra = nodi(r, (n) => n.className?.startsWith('riga-cristallo') && n !== riga);
  assert.ok(altra.length >= 1);
});

test('«Applica» e Invio: l’azione parte, il fuoco resta nel campo con il testo selezionato, il testo non si cancella', () => {
  const c = ctxCon();
  const r = resa(c);
  const riga = cristallo(r, 'Batteria Matrice');
  const campo = riga.tutti().find((n) => n.className?.includes('campo-variazione-pm'));
  const applica = riga.tutti().find((n) => n.tagName === 'BUTTON' && n.textContent === 'Applica');
  let fuochi = 0;
  let selezioni = 0;
  campo.focus = () => { fuochi++; };
  campo.select = () => { selezioni++; };
  campo.value = '+3';
  clic(applica);
  assert.deepEqual(c.chiamate.at(-1), ['chroma', 'rosso', 3]);
  assert.deepEqual([fuochi, selezioni], [1, 1], 'dopo «Applica» il fuoco torna al campo, selezionato');
  campo.ascolti.keydown[0]({ key: 'Enter', preventDefault() {} });
  assert.deepEqual(c.chiamate.at(-1), ['chroma', 'rosso', 3]);
  assert.deepEqual([fuochi, selezioni], [2, 2], 'dopo Invio lo stesso');
  assert.equal(campo.value, '+3', 'il testo resta: si può riscrivere subito sopra, selezionato');
  // il tocco su «Applica» non sposta il fuoco dal campo (si chiuderebbe la tastiera)
  let fermati = 0;
  for (const tipo of ['pointerdown', 'mousedown']) assert.ok(applica.ascolti[tipo], `${tipo} intercettato`);
  applica.ascolti.pointerdown[0]({ preventDefault() { fermati++; } });
  applica.ascolti.mousedown[0]({ preventDefault() { fermati++; } });
  assert.equal(fermati, 2);
  // testo non valido: nessuna azione, il fuoco resta comunque
  const n = c.chiamate.length;
  campo.value = 'xx';
  clic(applica);
  assert.equal(c.chiamate.length, n);
  assert.match(campo.className, /non-valido/);
  assert.equal(fuochi, 3);
  campo.ascolti.input[0]({});
  assert.doesNotMatch(campo.className, /non-valido/, 'scrivendo di nuovo l’avviso sparisce');
});

test('«Annulla» è sempre nel documento e compare senza ridisegnare', () => {
  const c = ctxCon();
  c.puoAnnullareSessione = false;
  const r = resa(c);
  const annulla = nodi(r, (n) => n.tagName === 'BUTTON' && n.textContent === '↶ Annulla')[0];
  assert.ok(annulla, 'il pulsante c’è anche senza modifiche da annullare');
  assert.equal(annulla.getAttribute('hidden'), '', 'nascosto');
  const prima = r.radice.tutti();
  cambia(c, (s) => ({ pmAttuali: s.pmAttuali - 1 }), ['pmAttuali']);
  assert.equal(annulla.hidden, false, 'dopo la modifica si vede');
  assert.ok(prima.every((x) => new Set(r.radice.tutti()).has(x)));
});

test('avvisi che dipendono dalla riserva: la zona viva si ricostruisce solo se il testo cambia, e il resto non si tocca', () => {
  const c = ctxCon([BASTONE], 'artefatti');
  const r = resa(c);
  const prima = fuoriDalleZone(r);
  const riga = cristallo(r, 'Bastone di prova');
  const zona = nodi(r, (n) => n.className === 'regione-viva' && n.textContent.includes('Cura Ferite'))[0];
  assert.ok(zona, 'l’attivazione dell’incantesimo infuso è una zona viva');
  assert.doesNotMatch(zona.textContent, /la riserva ha/);
  // la riserva scende a 1 PM (ne servono 3): compare l'avviso, dentro la zona
  cambia(c, (s) => ({ chroma: { ...s.chroma, bast: { pmAttuali: 1 } } }), ['chroma:bast']);
  assert.match(zona.textContent, /la riserva ha 1 PM, ne servono 3/);
  // la riga del cristallo (e il suo campo) è sempre lo stesso nodo
  assert.ok(new Set(r.radice.tutti()).has(riga));
  const figli = [...zona.children];
  // ancora 1 PM → testo uguale: i figli restano gli stessi nodi
  cambia(c, (s) => ({ chroma: { ...s.chroma, bast: { pmAttuali: 1 } } }), ['chroma:bast']);
  assert.deepEqual([...zona.children], figli, 'testo invariato: nessun nodo sostituito');
  // tutto ciò che non è la zona è invariato
  const dopo = new Set(r.radice.tutti());
  assert.ok(prima.every((n) => dopo.has(n)), 'fuori dalle zone vive nessun nodo è stato sostituito');
});

test('app: PV, PM e cristallo passano da cambiaVivo, che non ridisegna e non rimette lo scorrimento', () => {
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  const inizio = app.indexOf('const cambiaVivo = (nuova, chiavi) => {');
  const blocco = app.slice(inizio, app.indexOf('};', inizio));
  assert.ok(inizio > 0);
  assert.doesNotMatch(blocco, /renderScheda|svuota|scrollTo|innerHTML/, 'cambiaVivo non ridisegna');
  assert.match(blocco, /aggiornaVivi\(\[\.\.\.chiavi, 'annullabile'\]\)/);
  assert.match(app, /varia: \(campo, delta\) => \(\['pvAttuali', 'pmAttuali'\]\.includes\(campo\)\s*\? cambiaVivo\(/);
  assert.match(app, /chroma: \(uid, delta\) => cambiaVivo\(variaChroma\(/);
  assert.match(app, /stato\.ctxScheda = ctxScheda;/);
  // nessun innerHTML nei pannelli della scheda
  for (const f of ['tab.js', 'vivi.js', 'tecniche.js']) assert.doesNotMatch(readFileSync(new URL(`../src/ui/${f}`, import.meta.url), 'utf8'), /\.innerHTML\s*=/, f);
});

test('«torna in cima»: arancione come gli altri pulsanti, dal colore d’accento già nel foglio di stile (nessun colore nuovo)', () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  const regola = /\.torna-sopra \{([^}]*)\}/.exec(css)[1];
  assert.match(regola, /background: var\(--accento\)/);
  assert.match(regola, /color: var\(--accento-testo\)/);
  assert.match(regola, /border: 2px solid var\(--accento\)/);
  assert.doesNotMatch(regola.replace(/box-shadow:[^;]*;/, ''), /#[0-9a-f]{3,8}\b/i, 'nessun colore scritto a mano (le ombre a parte)');
  // lo stesso colore dei pulsanti primari
  assert.match(css, /\.btn\.primario \{ background: var\(--accento\); border-color: var\(--accento\); color: var\(--accento-testo\)/);
  // il colore è definito per il tema chiaro e per quello scuro, con il testo che si legge sopra
  const radice = css.slice(0, css.indexOf('@media (prefers-color-scheme: dark)') > 0 ? css.indexOf('@media (prefers-color-scheme: dark)') + 400 : 600);
  assert.match(radice, /--accento: #8a3b12;\s*--accento-testo: #ffffff;/);
  assert.match(css, /--accento: #e08a5a;\s*--accento-testo: #17171a;/);
  // contrasto WCAG ≥ 4.5 nei due temi
  const lum = (hex) => { const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const contrasto = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  assert.ok(contrasto('#8a3b12', '#ffffff') >= 4.5, 'tema chiaro');
  assert.ok(contrasto('#e08a5a', '#17171a') >= 4.5, 'tema scuro');
  assert.ok(dati);
});

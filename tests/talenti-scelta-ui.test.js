// Talenti v1.0 (lotto 2, 25/10/2026): il riquadro «Da scegliere» della scheda, con il DOM finto. I posti vengono da
// postiTalenti (il conto unico); qui si prova che cosa si vede e che cosa fa ogni pulsante.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installaDomFinto } from './dom-finto.js';
import { datiReali } from './helpers.js';
import { postiTalenti, applicaSceltaTalento } from '../src/avanzamento.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';

installaDomFinto();
const { riquadroTalenti, testoDaScegliere, rigaEffetto } = await import('../src/ui/talenti-scelta.js');
const { dati } = await datiReali();

/** Dimitri dopo il passaggio: regime nuovo, posti vuoti. */
function dimitri() {
  const p = deserializzaPersonaggio(readFileSync(new URL('./fixtures/talenti-vecchi/Dimitri-Orlav_liv6_2026-10-04.json', import.meta.url), 'utf8'));
  const creazione = { ...normalizza(p.creazione, dati).scelte, regimeTalenti: 2 };
  return { creazione, livelli: p.livelli.map((v) => { const x = { ...v }; delete x.talentoLibero; return x; }) };
}

const tutti = (el) => [el, ...el.tutti()];
const testo = (el) => el.textContent;
const pulsante = (el, t) => tutti(el).find((x) => x.tagName === 'BUTTON' && x.textContent.trim() === t);
const clic = (b) => { for (const f of b.ascolti.click ?? []) f({ target: b }); };

/** Un banco di prova: il personaggio, le azioni che cambiano il personaggio come fa app.js, e il riquadro ridisegnato. */
function banco({ master = false, bloccato = null, p = dimitri() } = {}) {
  const b = { p, ui: { aperto: false, posto: null, filtro: '' }, scelte: [], el: null };
  const disegna = () => {
    b.el = riquadroTalenti({
      posti: postiTalenti(b.p, dati), dati, ui: b.ui, master, bloccato,
      azioni: {
        ridisegna: disegna,
        scegli: (posto, scelta, o = {}) => { b.scelte.push({ posto, scelta, ...o }); b.p = applicaSceltaTalento(b.p, posto, scelta); b.ui.posto = null; disegna(); },
        svuota: (posto) => { b.p = applicaSceltaTalento(b.p, posto, null); b.ui.posto = `${posto.categoria}:${posto.livello}`; disegna(); },
        chiudi: () => { b.p = { ...b.p, creazione: { ...b.p.creazione, talentiChiusiFino: 6 } }; disegna(); },
        riapri: () => { b.p = { ...b.p, creazione: { ...b.p.creazione, talentiChiusiFino: null } }; disegna(); },
      },
    });
    return b.el;
  };
  b.apri = (posto = null) => { b.ui.aperto = true; b.ui.posto = posto; return disegna(); };
  disegna();
  return b;
}

test('«Da scegliere» dice quanti per categoria e che la scheda è incompleta', () => {
  const b = banco();
  assert.match(testo(b.el), /Da scegliere: 2 Talenti Liberi, 2 Maestrie, 2 Specializzazioni/);
  assert.match(testo(b.el), /La scheda è incompleta finché non scegli i Talenti/);
  assert.equal(testoDaScegliere({ talento_libero: { mancanti: 1 }, maestria: { mancanti: 2 }, specializzazione: { mancanti: 1 } }), '1 Talento Libero, 2 Maestrie, 1 Specializzazione');
  // un personaggio con i Talenti di prima non ha il riquadro
  const vecchio = dimitri();
  vecchio.creazione = { ...vecchio.creazione, regimeTalenti: null };
  assert.equal(riquadroTalenti({ posti: postiTalenti(vecchio, dati), dati, ui: {}, azioni: {} }), null);
});

test('aperto, mostra il primo posto vuoto; scelto un Talento passa al successivo', () => {
  const b = banco();
  clic(pulsante(b.el, 'Scegli'));
  assert.match(testo(b.el), /Specializzazione del 1° livello · elenco del Tecnomante/);
  // le opzioni ammesse con una riga d'effetto; Spade non c'è fra le ammesse
  const opzioni = b.el.querySelectorAll('.opzione-talento').filter((x) => !x.className.includes('bloccato'));
  assert.equal(opzioni.length, dati.specializzazioni.per_classe.Tecnomante.length);
  const info = opzioni.find((x) => /Specializzazione in Informatica/.test(testo(x)));
  assert.match(testo(info), /\+2 VA/);
  clic(tutti(info).find((x) => x.tagName === 'BUTTON' && x.textContent === 'Scegli'));
  assert.deepEqual(b.scelte.at(-1).scelta, { id: 'specializzazione-informatica' });
  // il posto successivo è la Maestria del 2° livello
  assert.match(testo(b.el), /Maestria del 2° livello/);
  assert.match(testo(b.el), /Da scegliere: 2 Talenti Liberi, 2 Maestrie, 1 Specializzazione/);
});

test('un’opzione non ammessa: il giocatore non la può prendere, il Direttore la forza con una conferma', async () => {
  const g = banco();
  g.apri('maestria:2');
  const rm = g.el.querySelectorAll('.opzione-talento').find((x) => /Ritualista Maggiore/.test(testo(x)));
  assert.ok(rm.className.includes('bloccato'));
  assert.match(testo(rm), /richiede Ritualista Minore/);
  assert.equal(tutti(rm).filter((x) => x.tagName === 'BUTTON').length, 0, 'il giocatore non ha un pulsante');
  // il Direttore: «Forza…» chiede conferma (finestrella) e poi sceglie, con il motivo
  const m = banco({ master: true });
  m.apri('maestria:2');
  const rmM = m.el.querySelectorAll('.opzione-talento').find((x) => /Ritualista Maggiore/.test(testo(x)));
  clic(tutti(rmM).find((x) => x.tagName === 'BUTTON' && x.textContent === 'Forza…'));
  await new Promise((r) => setTimeout(r, 0));
  const conferma = tutti(document.body).find((x) => x.tagName === 'BUTTON' && x.textContent === 'Forza la scelta');
  assert.ok(conferma, 'la conferma c’è');
  clic(conferma);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(m.scelte.at(-1).scelta.id, 'ritualista-maggiore');
  assert.match(m.scelte.at(-1).forzata, /richiede Ritualista Minore/);
});

test('una scelta si cambia finché il Direttore non chiude; dopo, il giocatore non la cambia più', () => {
  const b = banco();
  b.p = applicaSceltaTalento(b.p, { categoria: 'specializzazione', livello: 1 }, { id: 'specializzazione-informatica' });
  b.apri('specializzazione:1');
  assert.match(testo(b.el), /Specializzazione in Informatica|Informatica/);
  clic(pulsante(b.el, 'Cambia questa scelta'));
  assert.equal(b.p.creazione.specializzazioneIniziale, null, 'svuotato: si risceglie');
  assert.match(testo(b.el), /Specializzazione del 1° livello/);
  // chiuso dal Direttore: niente «Cambia»
  b.p = applicaSceltaTalento(b.p, { categoria: 'specializzazione', livello: 1 }, { id: 'specializzazione-laboratorio' });
  b.p = { ...b.p, creazione: { ...b.p.creazione, talentiChiusiFino: 6 } };
  b.apri('specializzazione:1');
  assert.equal(pulsante(b.el, 'Cambia questa scelta'), undefined);
  assert.match(testo(b.el), /Il Direttore ha chiuso questa scelta/);
});

test('senza connessione nessuna scelta: il riquadro lo dice e non offre «Scegli»', () => {
  const b = banco({ bloccato: 'Per scegliere i Talenti serve la connessione con il PC del Direttore: adesso il tablet è offline.' });
  assert.match(testo(b.el), /serve la connessione/);
  assert.equal(pulsante(b.el, 'Scegli'), undefined);
  b.ui.aperto = true;
  const di_nuovo = banco({ bloccato: 'offline' });
  di_nuovo.ui.aperto = true;
  assert.equal(di_nuovo.el.querySelectorAll('.opzione-talento').length, 0);
});

test('la riga d’effetto: sintesi o prima frase; Specializzazioni con il bonus', () => {
  assert.match(rigaEffetto('specializzazione-pistole', dati), /^\+1 VA, \+1 danno/);
  assert.ok(rigaEffetto('buona-costituzione', dati).length > 10);
  assert.match(rigaEffetto('raffiche-migliorate', dati), /Sostituisce Raffica Breve/);
});

test('app.js: la scelta passa dal salvataggio normale; offline e coda bloccano; i PG nuovi nascono nei Talenti v1.0', () => {
  const a = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(a, /function talentiBloccati\(\)[\s\S]*eOffline\(\)[\s\S]*inCoda\(/);
  assert.match(a, /scegli: \(posto, scelta[\s\S]*if \(talentiBloccati\(\)\)[\s\S]*persisti\(\)/);
  assert.match(a, /scelte: \{ \.\.\.nuoveScelte\(\), regimeTalenti: 2 \}/);
  assert.match(readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8'), /ctx\.talenti \? ctx\.talenti\.disegna\(ctx\.talenti\)/);
});

// Lotto 131 (27/10/2026): il conto degli incantesimi è uno solo (src/quote-incantesimi.js) e gli incantesimi presi con un
// Talento stanno nell'elenco della tab Poteri, con la loro origine, «Togli» e «Sostituisci». Dal 28/10 (A.188) quote, famiglie
// e livello massimo valgono di nuovo per il giocatore: l'opzione fuori regola è in grigio con il motivo (tests/incantesimi-a188.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { contesto, resa, clic, dati } from './scheda-aiuti.js';
import { calcolaScheda } from '../src/calc.js';
import { statoIncantesimi } from '../src/incantesimi.js';
import { scelteSuccessive, applicaSceltaSuccessiva } from '../src/avanzamento.js';
import { contoDaScheda, avvisoIncantesimo } from '../src/quote-incantesimi.js';
import { aggiungiIncantesimoAMano } from '../src/incantesimi-a-mano.js';
import { preparaTab } from '../src/stampa.js';
import { tabFissi } from '../src/ui/tab.js';
import { ARCANISTA } from './personaggi.js';

const FIX = new URL('./fixtures/talenti-vecchi/', import.meta.url);
const dimitri = () => JSON.parse(readFileSync(new URL(readdirSync(FIX).find((f) => f.startsWith('Dimitri')), FIX), 'utf8'));
const al7 = () => {
  const d = dimitri();
  return { versione: 2, creazione: d.scelte, livelli: [...d.livelli, { livello: 7, talentoLibero: { id: 'incrementare-incantesimi' } }] };
};

test('C: Dimitri al 7° livello con Incrementare Incantesimi: la quota somma i 2 del Talento, restano 2 da scegliere; le opzioni fuori regola sono in grigio con il motivo', () => {
  const prima = contoDaScheda(calcolaScheda({ versione: 2, creazione: dimitri().scelte, livelli: dimitri().livelli }, dati).incantesimi);
  const p = al7();
  const conto = contoDaScheda(calcolaScheda(p, dati).incantesimi);
  assert.equal(conto.totale, prima.totale + 2, 'quota di Classe + quote dei Talenti');
  assert.equal(conto.liberi, prima.liberi + 2);
  assert.equal(conto.residuo, 2, 'imparati: solo quelli davvero imparati');
  const s = scelteSuccessive(p, dati).find((x) => x.tipo === 'incantesimi' && x.livello === 7);
  assert.equal(s.quanti, 2);
  assert.ok(s.opzioni.length > 20);
  assert.ok(s.opzioni.filter((o) => !o.ammesso).every((o) => typeof o.motivo === 'string' && o.motivo), 'in grigio sempre con il motivo');
  assert.ok(s.opzioni.filter((o) => !o.ammesso).some((o) => /oltre il livello massimo/.test(o.motivo)), 'il livello massimo torna un blocco');
  assert.ok(s.opzioni.filter((o) => o.ammesso).length > 5, 'quelli che rientrano si possono scegliere');
  // scelti i due, il conto torna pari
  const due = s.opzioni.filter((o) => o.ammesso).slice(0, 2).reduce((q, o) => applicaSceltaSuccessiva(q, s, o.id), p);
  const dopo = contoDaScheda(calcolaScheda(due, dati).incantesimi);
  assert.deepEqual([dopo.imparati, dopo.residuo], [conto.imparati + 2, 0]);
});

test('C: gli incantesimi degli artefatti e quelli aggiunti a mano non occupano posti', () => {
  const p = al7();
  const base = contoDaScheda(calcolaScheda(p, dati).incantesimi);
  const aMano = ['cura-ferite', 'scudo', 'esorcizzare-oscurita'].reduce((l, id) => aggiungiIncantesimoAMano(l, id, { origine: 'a_mano' }, dati) ?? l, []);
  const conAMano = { ...p, creazione: { ...p.creazione, incantesimiAMano: aMano } };
  const c2 = contoDaScheda(calcolaScheda(conAMano, dati).incantesimi);
  assert.deepEqual([c2.totale, c2.imparati, c2.residuo, c2.liberiUsati], [base.totale, base.imparati, base.residuo, base.liberiUsati]);
});

test('C: un solo conto — il passo della creazione e la scheda dicono lo stesso totale', () => {
  const st = statoIncantesimi(ARCANISTA, dati);
  const conto = contoDaScheda(calcolaScheda({ versione: 2, creazione: ARCANISTA, livelli: [] }, dati).incantesimi);
  assert.deepEqual([st.totale, st.liberiUsati], [conto.totale, conto.liberiUsati]);
});

test('C: il motivo è un testo chiaro: livello oltre il massimo, quota esaurita, nessun accesso', () => {
  const i = dati.incantesimi.incantesimi.find((x) => x.livello_base === 4) ?? dati.incantesimi.incantesimi.find((x) => x.livello_base > 3);
  const conto = { livelloMassimo: 3, accesso: true, perMacro: { [i.macrofamiglia]: { quota: 1, scelti: 1 } }, liberi: 2, liberiUsati: 2 };
  assert.match(avvisoIncantesimo(i, conto), /livello base [0-9]+ oltre il livello massimo 3/);
  const basso = dati.incantesimi.incantesimi.find((x) => x.livello_base === 1 && x.macrofamiglia === i.macrofamiglia);
  assert.match(avvisoIncantesimo(basso, conto), /oltre la quota/);
  assert.equal(avvisoIncantesimo(basso, { ...conto, liberiUsati: 1 }), null);
  assert.match(avvisoIncantesimo(basso, { ...conto, accesso: false }), /non ha accesso/);
});

/** Fratello Anselmo (Taumaturgo) con Incrementare Incantesimi al 3° livello e due incantesimi presi con quel Talento. */
function ctxConTalento() {
  const c = contesto('Fratello-Anselmo-Viri_liv3_2026-10-02.json', { attiva: 'poteri' });
  const voci = JSON.parse(readFileSync(new URL('../esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json', import.meta.url), 'utf8')).livelli;
  const livelli = voci.map((v) => (v.livello === 3 ? { livello: 3, talentoLibero: { id: 'incrementare-incantesimi' }, incantesimi: ['Dardo Psichico', 'Terrore'] } : v));
  const tab = preparaTab({ creazione: c.scelte, livelli }, dati, { sessione: c.sessione });
  tab.tab = tabFissi(tab.tab);
  return { ...c, livelli, tab };
}

test('D: gli incantesimi presi con Incrementare Incantesimi sono nell’elenco della tab Poteri, con l’origine, «Sostituisci» e «Togli»', () => {
  const c = ctxConTalento();
  const r = resa(c);
  const schede = r.radice.tutti().filter((n) => n.tagName === 'ARTICLE' && /incantesimo-scheda/.test(n.className));
  for (const nome of ['Dardo Psichico', 'Terrore']) {
    const s = schede.find((x) => x.textContent.includes(nome));
    assert.ok(s, `${nome} nell'elenco`);
    assert.match(s.textContent, /Da Incrementare Incantesimi/);
    assert.match(s.textContent, /al 3° livello./);
    const pulsanti = s.tutti().filter((n) => n.tagName === 'BUTTON').map((b) => b.textContent);
    assert.ok(pulsanti.includes('Togli') && pulsanti.includes('Sostituisci'), `${nome}: ${pulsanti}`);
  }
  // un incantesimo imparato in un altro modo non dice «Da Incrementare…»
  const altri = schede.filter((x) => !/Dardo Psichico|Terrore/.test(x.textContent));
  assert.ok(altri.length && altri.every((x) => !/Da Incrementare/.test(x.textContent)));
});

test('D: «Sostituisci» apre la scelta e sostituisce nella voce di quel livello', () => {
  const c = ctxConTalento();
  c.azioni = new Proxy(c.azioni, { get: (t, n) => (n === 'sostituisciIncantesimoLivello' ? (...a) => { c.chiamate.push([n, ...a]); return true; } : t[n]) });
  let r = resa(c);
  const scheda = r.radice.tutti().find((n) => n.tagName === 'ARTICLE' && /incantesimo-scheda/.test(n.className) && n.textContent.includes('Terrore'));
  clic(scheda.tutti().find((b) => b.tagName === 'BUTTON' && b.textContent === 'Sostituisci'));
  assert.deepEqual(c.ui.incantesimoAMano.sostituisce, { nome: 'Terrore', livello: 3 });
  assert.equal(c.ui.incantesimoAMano.aperto, true);
  r = resa(c);
  const s = r.radice.tutti().find((n) => n.tagName === 'DETAILS' && /incantesimi-a-mano/.test(n.className));
  assert.match(s.textContent, /Stai sostituendo Terrore \(3° livello\)/);
  const campo = s.tutti().find((n) => n.tagName === 'INPUT' && n.getAttribute('type') === 'search');
  (campo.ascolti.input ?? []).forEach((f) => f({ target: { value: 'Barriera Mentale' } }));
  clic(s.tutti().find((n) => n.tagName === 'BUTTON' && /risultato-incantesimo/.test(n.className)));
  r = resa(c);
  const conferma = r.radice.tutti().find((n) => n.tagName === 'BUTTON' && /^Sostituisci con Barriera Mentale$/.test(n.textContent));
  assert.ok(conferma, 'il pulsante dice che cosa farà');
  clic(conferma);
  assert.deepEqual(c.chiamate.find(([a]) => a === 'sostituisciIncantesimoLivello'), ['sostituisciIncantesimoLivello', 3, 'Terrore', 'Barriera Mentale', { forza: false }]);
  assert.equal(c.ui.incantesimoAMano.sostituisce, null);
  assert.equal(c.ui.incantesimoAMano.esito, 'Sostituito: Terrore con Barriera Mentale');
});

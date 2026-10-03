// Ritocchi alla plancia dopo la prima prova (docs/tavolo-direttore.md, «Dopo la prima prova»): il ridisegno
// periodico non chiude le tendine né toglie il focus (src/ui/ridisegno.js), le conferme delle azioni vengono
// dalle righe nuove del registro (src/scontro.js → righeNuove), il nemico a 0 PV ha la carta ridotta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creaCustode, chiaveControllo, controlloInUso } from '../src/ui/ridisegno.js';
import { nuovoScontro, aggiungiNemici, variaPvNemico, variaPmNemico, registraColpo, annullaUltimoColpo, riduciNemico, righeNuove, avanti, registraTiro, validaScontro } from '../src/scontro.js';
import { applicaColpo, testoColpo } from '../src/danno.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

// DOM finto: quel che serve al custode (querySelectorAll, contains, eventi, value, focus)
function elemento(tag, { chiave = null, value = '', opzioni = null } = {}) {
  const el = {
    tagName: tag, type: tag === 'INPUT' ? 'number' : undefined, value, dataset: chiave ? { chiave } : {},
    options: opzioni?.map((v) => ({ value: v })), focusato: false,
    getAttribute: () => null, closest: () => null,
    matches: () => true,
    focus() { documento.activeElement = el; },
  };
  return el;
}
const documento = { activeElement: null };
function radice(elementi) {
  const r = { elementi, ascolti: {} };
  r.contains = (el) => r.elementi.includes(el);
  r.querySelectorAll = () => r.elementi;
  r.addEventListener = (tipo, fn) => { (r.ascolti[tipo] ??= []).push(fn); };
  r.removeEventListener = (tipo, fn) => { r.ascolti[tipo] = (r.ascolti[tipo] ?? []).filter((x) => x !== fn); };
  r.emetti = (tipo, target) => (r.ascolti[tipo] ?? []).forEach((fn) => fn({ target }));
  return r;
}

test('tendina aperta: un ciclo di polling non ridisegna, non cambia il valore né il focus', async () => {
  const tipo = elemento('SELECT', { chiave: 'nemici-tipo', value: 'eretico-veterano', opzioni: ['agente', 'eretico-veterano'] });
  const quanti = elemento('INPUT', { chiave: 'nemici-quanti', value: '1' });
  const r = radice([tipo, quanti]);
  let ridisegni = 0;
  const custode = creaCustode(r, { documento, ridisegna: () => { ridisegni++; } });
  tipo.focus(); // l'utente ha aperto la tendina
  // aggiornamento periodico con novità (cambiato): il ridisegno si rinvia
  assert.equal(custode.puoRidisegnare(), false);
  assert.equal(custode.rinviato, true);
  assert.deepEqual([tipo.value, documento.activeElement], ['eretico-veterano', tipo]);
  // anche dieci giri di fila (10 secondi con la tendina aperta)
  for (let i = 0; i < 10; i++) assert.equal(custode.puoRidisegnare(), false);
  assert.equal(ridisegni, 0);
  // il focus esce dai controlli: il ridisegno rinviato si fa
  documento.activeElement = null;
  r.emetti('focusout', tipo);
  await new Promise((ok) => setTimeout(ok, 5));
  assert.equal(ridisegni, 1);
  assert.equal(custode.rinviato, false);
  assert.equal(custode.puoRidisegnare(), true);
});

test('campo in cui si scrive: il valore non confermato e il focus restano dopo un ridisegno', () => {
  const quanti = elemento('INPUT', { chiave: 'nemici-quanti', value: '1' });
  const tiro = elemento('INPUT', { chiave: 'Tiro d’Iniziativa di Lucas, dal vivo', value: '' });
  const r = radice([quanti, tiro]);
  const custode = creaCustode(r, { documento });
  tiro.value = '7';
  r.emetti('input', tiro); // scritto, non ancora «Inserisci»
  quanti.value = '3';
  r.emetti('input', quanti);
  quanti.focus();
  const foto = custode.fotografa();
  assert.equal(foto.attivo, 'nemici-quanti');
  // ridisegno (per esempio dopo un'azione): elementi nuovi con i valori di partenza
  const quanti2 = elemento('INPUT', { chiave: 'nemici-quanti', value: '1' });
  const tiro2 = elemento('INPUT', { chiave: 'Tiro d’Iniziativa di Lucas, dal vivo', value: '' });
  r.elementi = [quanti2, tiro2];
  custode.ripristina(foto);
  assert.deepEqual([quanti2.value, tiro2.value, documento.activeElement], ['3', '7', quanti2]);
  // il campo non c'è più (tiro inserito): la bozza si dimentica
  r.elementi = [quanti2];
  custode.ripristina({ attivo: null });
  assert.deepEqual([...custode.bozze.keys()], ['nemici-quanti']);
  // una tendina riprende la scelta solo se l'opzione c'è ancora
  const stato = elemento('SELECT', { chiave: 'Aggiungi uno Stato a Eretico 1', value: '', opzioni: ['', 'a-terra'] });
  r.elementi = [stato];
  stato.value = 'a-terra';
  r.emetti('change', stato);
  const stato2 = elemento('SELECT', { chiave: 'Aggiungi uno Stato a Eretico 1', value: '', opzioni: [''] });
  r.elementi = [stato2];
  custode.ripristina({ attivo: null });
  assert.equal(stato2.value, '');
  custode.smonta();
  assert.equal((r.ascolti.input ?? []).length, 0);
});

test('chiavi e controlli in uso: data-chiave, aria-label; fuori dalla radice non conta', () => {
  assert.equal(chiaveControllo({ dataset: { chiave: 'x' }, getAttribute: () => 'y' }), 'x');
  assert.equal(chiaveControllo({ dataset: {}, getAttribute: (k) => (k === 'aria-label' ? 'Durata di A Terra di Eretico 1' : null) }), 'Durata di A Terra di Eretico 1');
  const el = elemento('INPUT', { chiave: 'a' });
  assert.equal(controlloInUso(radice([el]), el), true);
  assert.equal(controlloInUso(radice([]), el), false);
  // la plancia dà una chiave stabile ai controlli senza aria-label
  const ui = readFileSync(new URL('../src/ui/scontro.js', import.meta.url), 'utf8');
  for (const k of ['nemici-tipo', 'nemici-quanti', 'nemici-lato', 'manuale-lato', 'manuale-tipo', 'manuale-natura', 'manuale-${k}']) assert.ok(ui.includes(`chiave: '${k}'`) || ui.includes(`chiave: \`${k}\``), k);
});

const legionario = JSON.parse(readFileSync(new URL('./nemici/legionario-non-morto.json', import.meta.url), 'utf8'));
const T0 = new Date(2026, 9, 3, 21, 0, 0);
const conNemico = () => aggiungiNemici(nuovoScontro({ id: 'avvisi', adesso: T0, pg: [{ chiave: 'Lucas', nome: 'Lucas', iniziativa: 3, des: 7, int: 5 }] }), { ...legionario, pm: 6 }, 2, {}, T0);
const ID = 'nem:legionario-non-morto:1';

test('conferme delle azioni: le righe nuove del registro (una per nemico per i clic su − e +)', () => {
  const prima = conNemico();
  assert.deepEqual(righeNuove(null, prima).map((x) => x.testo)[0], 'Scontro aperto con Lucas.');
  let s = variaPvNemico(prima, ID, -3, T0);
  assert.deepEqual(righeNuove(prima, s), [{ testo: 'Legionario Non Morto 1: PV 22 → 19 (−3).', chiave: `pv:${ID}` }]);
  // un altro clic riscrive la stessa riga: la conferma si aggiorna
  const s2 = variaPvNemico(s, ID, -2, T0);
  assert.deepEqual(righeNuove(s, s2), [{ testo: 'Legionario Non Morto 1: PV 22 → 17 (−5).', chiave: `pv:${ID}` }]);
  assert.deepEqual(righeNuove(s2, variaPmNemico(s2, ID, -1, T0)), [{ testo: 'Legionario Non Morto 1: PM 6 → 5.', chiave: `pm:${ID}` }]);
  // Iniziativa, di turno, nuovo Round
  let t = registraTiro(s2, 'pg:Lucas', 'd10', { valore: 9, origine: 'manuale' }, dati, T0);
  for (const id of [ID, 'nem:legionario-non-morto:2']) t = registraTiro(t, id, 'd10', { valore: 1, origine: 'manuale' }, dati, T0);
  const u = avanti(t, T0);
  assert.match(righeNuove(t, u)[0].testo, /^Tocca a /);
});

test('colpo a un nemico: la conferma dice danni, PV, a 0 PV, Ferita e Menomazione', () => {
  const r = applicaColpo({ nome: 'Eretico 1', pv: { attuali: 5, massimo: 25 }, ferite: 2, ar: { totale: 1, magica: 0 } }, { danni: [9, 14], natura: 'Naturale', tipo: 'distanza', tempra: [null, 'fallimento'] }, dati);
  const testo = testoColpo('Eretico 1', { natura: 'Naturale', proprieta: [] }, r);
  assert.match(testo, /PV 5 → 0, a 0 PV, Ferite 2 → 5 \(Grave\)/);
  assert.match(testo, /PS di Tempra per la Menomazione: Profonda .*Seria .*Grave/);
});

test('nemico a 0 PV: carta ridotta, riaperta, di nuovo aperta sopra 0 PV; salvata con lo scontro', () => {
  let s = conNemico();
  s = variaPvNemico(s, ID, -30, T0);
  const p = () => s.partecipanti.find((x) => x.id === ID);
  assert.deepEqual([p().pv.attuali, p().ridotta], [0, true]);
  assert.equal(validaScontro(s), null);
  s = riduciNemico(s, ID, false); // un clic la riapre
  assert.equal(p().ridotta, undefined);
  s = variaPvNemico(s, ID, 0, T0);
  assert.equal(p().ridotta, undefined); // resta aperta finché è a 0
  s = riduciNemico(s, ID, true);
  assert.equal(p().ridotta, true);
  s = variaPvNemico(s, ID, 4, T0); // curato: torna al suo posto, aperta
  assert.deepEqual([p().pv.attuali, p().ridotta], [4, undefined]);
  assert.equal(riduciNemico(s, ID, true), s); // sopra 0 non si riduce
  // con «Colpito» e con «Annulla ultimo colpo»
  const colpo = { bersaglio: ID, nome: 'Legionario Non Morto 1', tipo: 'nemico', testo: 'colpo', prima: { pv: 4, ferite: 0, menomazioni: [], stati: [] }, dopo: { pv: 0, ferite: 0, menomazioni: [], stati: [] } };
  s = registraColpo(s, colpo, T0);
  assert.equal(p().ridotta, true);
  s = annullaUltimoColpo(s, T0).scontro;
  assert.deepEqual([p().pv.attuali, p().ridotta], [4, undefined]);
  // l'ordine d'Iniziativa non cambia: il nemico resta fra i partecipanti, al suo posto
  assert.deepEqual(s.partecipanti.map((x) => x.id).slice(1), [ID, 'nem:legionario-non-morto:2']);
});

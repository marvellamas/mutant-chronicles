// Lotto 162 (02/11/2026): A.229, risposta di Davide del 01/11/2026. Gli elenchi per Classe sono quelli del Giocatore 0.54
// (§8.10) e della Magia 1.11: le Specializzazioni di Potere che il manuale toglie a Custode, Invocatore, Mistico e
// Tecnomante escono dagli elenchi. Chi le ha già: «l'app segnala le Specializzazioni già acquisite che richiedono una
// verifica e le conserva operative fino alla decisione del Direttore. Il Direttore può mantenerle come eccezione oppure
// autorizzarne la sostituzione gratuita con una scelta consentita». Restano le eccezioni basate sui requisiti posseduti
// (Usufruitore di Magia).
import '../tools/guardia-subito.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { postiTalenti, controllaSceltaTalento, eccezioneSpecializzazione, applicaSceltaTalento, regolaVoceTolta } from '../src/avanzamento.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { controllaTalentiDaTablet } from '../src/talenti-tablet.js';
import { preparaStampa } from '../src/stampa.js';

const { dati } = await datiReali();
const SINTONIA = 'specializzazione-sintonia';
const ELEMENTI = 'specializzazione-elementi';

/** Lucas (Invocatore, 6° livello, copia del 20/10) dei Talenti nuovi, con la Specializzazione iniziale data. */
function lucas(spec1) {
  const p = deserializzaPersonaggio(readFileSync(new URL('./fixtures/talenti-vecchi/LUCAS_liv6_2026-10-20.json', import.meta.url), 'utf8'));
  const creazione = { ...normalizza(p.creazione, dati).scelte, regimeTalenti: 2, specializzazioneIniziale: spec1 };
  const livelli = p.livelli.map((v) => { const x = { ...v }; delete x.talentoLibero; delete x.maestria; delete x.specializzazione; return x; });
  return { creazione, livelli };
}
const posto1 = (p) => postiTalenti(p, dati, { opzioni: true }).posti.find((x) => x.categoria === 'specializzazione' && x.livello === 1);
const file = (p) => JSON.parse(serializza(p.creazione, { livelli: p.livelli }));

test('A.229: per l’Invocatore Sintonia è tolta (decide il Direttore), Archi e Balestre resta della A.230', () => {
  assert.equal(regolaVoceTolta(SINTONIA, 'Invocatore', dati), 'A.229');
  assert.equal(regolaVoceTolta('specializzazione-archi-e-balestre', 'Invocatore', dati), 'A.230');
  assert.equal(regolaVoceTolta(ELEMENTI, 'Invocatore', dati), null);
  assert.equal(regolaVoceTolta(SINTONIA, 'Arcanista', dati), null, 'l’Arcanista ha ancora le nove');
});

test('scelta nuova: il Taumaturgo vede solo le voci di Potere della sua Classe; le tolte sono in grigio con il motivo', () => {
  const p = posto1(lucas(null));
  const potere = p.opzioni.filter((o) => dati.specializzazioni.gruppi.potere.includes(o.id));
  assert.deepEqual(potere.filter((o) => o.ammesso).map((o) => o.id).sort(), [...dati.specializzazioni.per_classe.Invocatore.filter((id) => dati.specializzazioni.gruppi.potere.includes(id))].sort());
  const s = p.opzioni.find((o) => o.id === SINTONIA);
  assert.equal(s.ammesso, false);
  assert.equal(s.motivo, 'Non è più nell’elenco dell’Invocatore (Giocatore 0.54; A.229)');
  // Tecnomante: Manifestazione, Psionica, Incantamento
  const st = { regime: 'nuovo', talentiLiberi: [], classi: [{ nome: 'Tecnomante', grado: 1, talenti: [] }], car: { FOR: 6, COS: 6, DES: 6, INT: 6, SAG: 6, CAR: 6 }, abil: {}, livello: 1 };
  const ok = (id) => !controllaSceltaTalento(st, 'specializzazione', { id }, dati, { classe: 'Tecnomante' }).some((e) => e.tipo === 'violazione' || e.tipo === 'tolta');
  assert.deepEqual(dati.specializzazioni.gruppi.potere.filter(ok).sort(), ['specializzazione-incantamento', 'specializzazione-manifestazione', 'specializzazione-psionica']);
  // «le eccezioni basate sui requisiti posseduti»: con Usufruitore di Magia le nove si aprono di nuovo
  const conUsufruitore = { ...st, talentiLiberi: [{ id: 'usufruitore-di-magia', livello: 1 }] };
  assert.deepEqual(controllaSceltaTalento(conUsufruitore, 'specializzazione', { id: SINTONIA }, dati, { classe: 'Tecnomante' }).filter((e) => e.tipo !== 'incompleto'), []);
});

test('chi l’ha già la tiene, operativa e segnalata, finché decide il Direttore', () => {
  const p = lucas({ id: SINTONIA });
  const x = posto1(p);
  assert.equal(x.valida, true, 'non è una regola infranta');
  const avviso = x.problemi.find((e) => e.tipo === 'tolta');
  assert.equal(avviso.regola, 'A.229');
  assert.match(avviso.problema, /resta, con i suoi effetti, finché il Direttore non decide se tenerla come eccezione o sostituirla gratis/);
  const s = calcolaScheda(p, dati);
  assert.ok(!s.errori.some((e) => e.tipo === 'violazione'));
  const sp = s.specializzazioni.find((y) => y.id === SINTONIA);
  assert.deepEqual([sp.tolta, sp.regolaTolta], [true, 'A.229']);
  // la stampa la segna
  const testo = JSON.stringify(preparaStampa(p, dati).fogli);
  assert.match(testo, /"tolta":true,"regolaTolta":"A.229"/);
});

test('il Direttore la tiene come eccezione: niente più avviso, la nota con il motivo; il file la conserva; si può togliere', () => {
  const p = eccezioneSpecializzazione(lucas({ id: SINTONIA }), { categoria: 'specializzazione', livello: 1 }, { quando: '2026-11-02T10:00:00.000Z', motivo: 'scelta al tavolo prima del 0.54' });
  assert.deepEqual(p.creazione.specializzazioneIniziale, { id: SINTONIA, eccezione: { quando: '2026-11-02T10:00:00.000Z', motivo: 'scelta al tavolo prima del 0.54' } });
  const x = posto1(p);
  assert.ok(!x.problemi.some((e) => e.tipo === 'tolta'));
  assert.match(x.problemi.find((e) => e.tipo === 'eccezione').problema, /il Direttore la tiene come eccezione \(A\.229\)/);
  const sp = calcolaScheda(p, dati).specializzazioni.find((y) => y.id === SINTONIA);
  assert.equal(sp.tolta, undefined);
  assert.equal(sp.eccezione.motivo, 'scelta al tavolo prima del 0.54');
  // salvataggio e riapertura: l'eccezione resta
  const riletto = deserializzaPersonaggio(serializza(p.creazione, { livelli: p.livelli }));
  assert.deepEqual(normalizza(riletto.creazione, dati).scelte.specializzazioneIniziale.eccezione, { quando: '2026-11-02T10:00:00.000Z', motivo: 'scelta al tavolo prima del 0.54' });
  // tolta l'eccezione, torna da decidere
  const di = eccezioneSpecializzazione(p, { categoria: 'specializzazione', livello: 1 }, { togli: true });
  assert.equal(posto1(di).problemi.find((e) => e.tipo === 'tolta').regola, 'A.229');
  // l'eccezione non vale per una voce che è nell'elenco: è un'informazione e basta
  assert.ok(!posto1(eccezioneSpecializzazione(lucas({ id: ELEMENTI }), { categoria: 'specializzazione', livello: 1 })).problemi.length);
});

test('sostituzione gratuita: il posto resta, si sceglie una voce dell’elenco; l’eccezione non passa alla voce nuova', () => {
  const con = eccezioneSpecializzazione(lucas({ id: SINTONIA }), { categoria: 'specializzazione', livello: 1 });
  const nuovo = applicaSceltaTalento(con, { categoria: 'specializzazione', livello: 1 }, { id: ELEMENTI, eccezione: { quando: 'x' } });
  assert.deepEqual(nuovo.creazione.specializzazioneIniziale, { id: ELEMENTI });
  const x = posto1(nuovo);
  assert.deepEqual([x.valida, x.problemi], [true, []]);
  const P = postiTalenti(nuovo, dati, { opzioni: false });
  assert.equal(P.posti.find((y) => y.categoria === 'specializzazione' && y.livello === 1).scelta.id, ELEMENTI, 'il posto non si perde');
});

test('tablet: la decisione è del Direttore (né sostituire né mettere l’eccezione); senza cambi passa', () => {
  const disco = lucas({ id: SINTONIA });
  assert.deepEqual(controllaTalentiDaTablet(file(disco), file(disco), dati), { ok: true });
  const sostituita = controllaTalentiDaTablet(file(lucas({ id: ELEMENTI })), file(disco), dati);
  assert.deepEqual([sostituita.ok, sostituita.stato], [false, 403]);
  assert.match(sostituita.errore, /La decisione è del Direttore/);
  const conEccezione = eccezioneSpecializzazione(disco, { categoria: 'specializzazione', livello: 1 });
  const r = controllaTalentiDaTablet(file(conEccezione), file(disco), dati);
  assert.deepEqual([r.ok, r.stato], [false, 403]);
  // con l'eccezione già decisa dal Direttore, il tablet non la toglie
  const tolta = controllaTalentiDaTablet(file(disco), file(conEccezione), dati);
  assert.deepEqual([tolta.ok, tolta.stato], [false, 403]);
  assert.match(tolta.errore, /eccezione.*Direttore/);
  // e non la sceglie di nuovo per un posto vuoto
  const vuoto = lucas(null);
  const nuova = controllaTalentiDaTablet(file(lucas({ id: SINTONIA })), file(vuoto), dati);
  assert.deepEqual([nuova.ok, nuova.stato], [false, 403]);
});

// Lotto 175: le frequenze degli usi (Giocatore 0.54 §3.2) e la A.233 (Davide, 02/11/2026): «Il Direttore stabilisce
// quando iniziano una nuova scena o un nuovo capitolo, tramite comandi nella propria plancia che rinnovano sui tablet
// soltanto gli utilizzi pertinenti. Gli usi per sessione si rinnovano all’inizio della partita; quelli per giorno o
// settimana seguono il calendario della campagna. Questi comandi non ripristinano PM, munizioni o altre risorse.»
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { datiReali } from './helpers.js';
import { creaServer } from '../server.mjs';
import { vociConUso, usatiDi, usaUnaVolta, statoUsiTalenti, rinnovaSessione, quandoTorna, chiaveTalentoClasse, FREQUENZE } from '../src/usi-talenti.js';
import { avanzaMomento, annullaMomento, normalizzaMomento } from '../src/momento.js';
import { riepilogoRinnovo, testoConferma } from '../src/rinnovi.js';
import { massimiSessione, allineaSessione, nuovaSessione, usaUnaVoltaSessione, variaNec, variaChroma } from '../src/sessione.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { frequenzaDaTesto, AL_TAVOLO } from '../tools/lotti/lotto_175_frequenze.mjs';

const { dati } = await datiReali();
const F = dati.regole.frequenze;
const TESTO_NADIA = readFileSync(new URL('../esempi/Nadia-Ferro_liv4_2026-10-02.json', import.meta.url), 'utf8');

/** Nadia d'esempio: Hacker (per sessione per sistema), Intrusione Rapida (per scena), Mestiere Solido (per sessione). */
function nadia(sessione = null) {
  const p = deserializzaPersonaggio(TESTO_NADIA);
  const creazione = normalizza(p.creazione, dati).scelte;
  const scheda = calcolaScheda({ creazione, livelli: p.livelli }, dati);
  const m = massimiSessione(scheda, creazione, dati);
  return { scheda, m, s: allineaSessione(sessione ?? p.sessione ?? {}, m) };
}
const voce = (scheda, nome) => vociConUso(scheda).find((v) => v.nome === nome);

test('dati: le frequenze sono sei, con «quando torna»; i Talenti con un uso vengono dal testo del catalogo', () => {
  assert.deepEqual(FREQUENZE, ['combattimento', 'sessione', 'giorno', 'settimana', 'scena', 'capitolo']);
  for (const f of FREQUENZE) assert.ok(F[f]?.torna && F[f]?.breve, `regole.json → frequenze.${f}.torna e .breve`);
  // ogni Talento (Liberi e di Classe) che dice «Una volta per …» di sé ha il suo «usi»; quelli al tavolo no
  const tutti = [...dati.talenti_liberi.talenti, ...dati.classi.classi.flatMap((c) => [...c.talenti_fissi, ...c.talenti_a_scelta])];
  for (const t of tutti) {
    const f = frequenzaDaTesto(t.testo);
    if (AL_TAVOLO[t.nome]) { assert.equal(t.usi, undefined, `${t.nome} resta al tavolo: ${AL_TAVOLO[t.nome]}`); continue; }
    if (f && t.id !== 'hacker') assert.equal(t.usi?.frequenza, f, `${t.nome}: ${f}`);
  }
  // nessun «ambito» del lotto 129 è rimasto
  const conUsi = [];
  const visita = (o) => { if (Array.isArray(o)) o.forEach(visita); else if (o && typeof o === 'object') { if (o.usi && typeof o.usi === 'object') conUsi.push(o.usi); Object.values(o).forEach(visita); } };
  visita([dati.talenti_liberi, dati.addestramenti, dati.classi]);
  assert.ok(conUsi.length >= 55 && conUsi.every((u) => u.ambito === undefined && FREQUENZE.includes(u.frequenza)));
  const L = (id) => dati.talenti_liberi.talenti.find((t) => t.id === id);
  assert.deepEqual(L('hacker').usi, { frequenza: 'sessione', quantita: 1, per: 'sistema' });
  assert.deepEqual(L('pilotaggio-acrobatico').usi, { frequenza: 'scena', quantita: 1 });
  assert.deepEqual(L('maestria-hacker').toglie_limite, ['hacker']);
});

test('combattimento: consumato, si rinnova da solo all’inizio di uno scontro nuovo', () => {
  const v = { chiave: 'colpo', nome: 'Colpo Perentorio', frequenza: 'combattimento', quantita: 1 };
  const s = usaUnaVolta({}, v, { scontro: 's1' });
  assert.equal(usatiDi(s, v, { scontro: 's1' }), 1);
  assert.equal(usatiDi(s, v, { scontro: 's2' }), 0, 'scontro nuovo: di nuovo disponibile');
  assert.equal(usatiDi(s, v, 's1'), 1, 'anche con l’id dello scontro come prima (lotto 129)');
  assert.equal(quandoTorna(v, F, { scontro: 's1' }), 'torna al prossimo scontro');
});

test('scena: il comando del Direttore la rinnova; il capitolo no, e viceversa; «Annulla» rimette tutto com’era', () => {
  const { scheda, s } = nadia();
  const ir = voce(scheda, 'Intrusione Rapida');
  assert.equal(ir.frequenza, 'scena');
  let mo = normalizzaMomento(null);
  const ctx = () => ({ scena: mo.scena, capitolo: mo.capitolo });
  const usata = usaUnaVolta(s, ir, ctx());
  assert.equal(usatiDi(usata, ir, ctx()), 1);
  // un capitolo nuovo non rinnova gli usi per scena
  mo = avanzaMomento(mo, 'capitolo');
  assert.equal(usatiDi(usata, ir, ctx()), 1);
  // una scena nuova sì
  mo = avanzaMomento(mo, 'scena');
  assert.equal(usatiDi(usata, ir, ctx()), 0);
  assert.equal(quandoTorna(ir, F, ctx()), 'torna a inizio scena');
  // «Annulla»: la scena torna quella di prima e l'uso è di nuovo consumato
  mo = annullaMomento(mo);
  assert.equal(usatiDi(usata, ir, ctx()), 1);
  // e un uso per capitolo non torna con una scena nuova
  const cap = { chiave: 'cap', nome: 'Uso da capitolo', frequenza: 'capitolo', quantita: 1 };
  const c = usaUnaVolta({}, cap, ctx());
  assert.equal(usatiDi(c, cap, { ...ctx(), scena: ctx().scena + 1 }), 1);
  assert.equal(usatiDi(c, cap, { ...ctx(), capitolo: ctx().capitolo + 1 }), 0);
  // senza server (nessun numero) l'uso resta finché non si tocca «↺»
  const off = usaUnaVolta({}, ir, { scena: null });
  assert.equal(usatiDi(off, ir, { scena: 4 }), 1);
  assert.match(quandoTorna(ir, F, { scena: null }), /senza server/);
});

test('sessione: «Nuova sessione» rinnova gli usi per sessione e non gli altri', () => {
  const { scheda, m, s } = nadia();
  const ms = voce(scheda, 'Mestiere Solido');
  const ir = voce(scheda, 'Intrusione Rapida');
  let x = usaUnaVoltaSessione(s, ms, {}, m);
  x = usaUnaVoltaSessione(x, ir, { scena: 3 }, m);
  // anche un contatore salvato prima del lotto 175 (senza «frequenza»): la riconosce dai dati
  x = { ...x, usiTalenti: { ...x.usiTalenti, vantaggio: { usati: 1 } } };
  const dopo = nuovaSessione(x, m);
  assert.equal(usatiDi(dopo, ms, {}), 0);
  assert.equal(dopo.usiTalenti.vantaggio, undefined, 'Mestiere Solido (il vantaggio) è per sessione');
  assert.equal(usatiDi(dopo, ir, { scena: 3 }), 1, 'gli usi per scena restano');
  assert.deepEqual(rinnovaSessione({ a: { usati: 1, frequenza: 'sessione' }, b: { usati: 1, frequenza: 'giorno' } }), { b: { usati: 1, frequenza: 'giorno' } });
});

test('giorno e settimana seguono il Calendario; senza Calendario si rimettono a mano', () => {
  const g = { chiave: 'mezzofondista', nome: 'Mezzofondista', frequenza: 'giorno', quantita: 1 };
  const s = usaUnaVolta({}, g, { data: '2026-05-10' });
  assert.equal(usatiDi(s, g, { data: '2026-05-10' }), 1);
  assert.equal(usatiDi(s, g, { data: '2026-05-11' }), 0, 'il giorno dopo è di nuovo disponibile');
  assert.equal(quandoTorna(g, F, { data: '2026-05-10' }), 'torna domani');
  assert.match(quandoTorna(g, F, { data: null }), /senza Calendario/);
  const w = { chiave: 'w', nome: 'Settimanale', frequenza: 'settimana', quantita: 1 };
  const sw = usaUnaVolta({}, w, { data: '2026-05-10' });
  assert.equal(usatiDi(sw, w, { data: '2026-05-16' }), 1, 'sei giorni dopo: ancora consumato');
  assert.equal(usatiDi(sw, w, { data: '2026-05-17' }), 0, 'sette giorni dopo: di nuovo disponibile');
});

test('Hacker: una volta per sessione per ciascun sistema, con il conteggio separato; Maestria Hacker toglie il limite', () => {
  const { scheda } = nadia();
  const h = voce(scheda, 'Hacker');
  assert.deepEqual([h.frequenza, h.per], ['sessione', 'sistema']);
  let s = usaUnaVolta({}, h, {}, null, { sistema: 'Terminale del porto' });
  assert.equal(usaUnaVolta(s, h, {}, null, { sistema: 'Terminale del porto' }), s, 'stesso sistema: già usato');
  s = usaUnaVolta(s, h, {}, null, { sistema: 'Rete della Mishima' });
  assert.equal(usatiDi(s, h, {}, { sistema: 'Terminale del porto' }), 1);
  assert.equal(usatiDi(s, h, {}, { sistema: 'Rete della Mishima' }), 1);
  assert.equal(usatiDi(s, h, {}, { sistema: 'Archivio civico' }), 0);
  const stato = statoUsiTalenti(scheda, s, {}).find((v) => v.chiave === 'hacker');
  assert.deepEqual([stato.usati, stato.sistemi], [2, ['Terminale del porto', 'Rete della Mishima']]);
  assert.equal(usaUnaVolta(s, h, {}), s, 'senza sistema non si segna niente');
  // con Maestria Hacker il contatore di Hacker sparisce (dai dati: toglie_limite)
  const conMaestria = { ...scheda, talentiLiberi: [...scheda.talentiLiberi, dati.talenti_liberi.talenti.find((t) => t.id === 'maestria-hacker')] };
  assert.equal(vociConUso(conMaestria).some((v) => v.chiave === 'hacker'), false);
});

test('Talenti di Classe: chiave stabile dal nome, nella riga degli usi', () => {
  const { scheda } = nadia();
  assert.equal(voce(scheda, 'Intrusione Rapida').chiave, chiaveTalentoClasse('Intrusione Rapida'));
  assert.equal(chiaveTalentoClasse('Riparazione d’Emergenza'), 'classe:riparazione-d-emergenza');
});

test('la conferma della plancia dice quanti usi torna e a chi, e che PM e munizioni non cambiano', () => {
  const { scheda, m, s } = nadia();
  const usata = usaUnaVoltaSessione(s, voce(scheda, 'Intrusione Rapida'), { scena: 2, capitolo: 1 }, m);
  const p = deserializzaPersonaggio(TESTO_NADIA);
  const obj = JSON.parse(TESTO_NADIA);
  obj.sessione = usata;
  const r = riepilogoRinnovo([{ file: 'n.json', testo: JSON.stringify(obj) }], 'scena', { scena: 2, capitolo: 1 }, dati);
  assert.equal(r.totale, 1);
  assert.deepEqual(r.personaggi[0].voci.map((v) => v.nome), ['Intrusione Rapida']);
  const t = testoConferma('scena', { scena: 2, capitolo: 1 }, r, dati.regole);
  assert.match(t, /Comincia la scena 3/);
  assert.match(t, /Torna disponibile 1 uso per scena/);
  assert.match(t, /PM, munizioni e altre riserve non cambiano/);
  assert.equal(riepilogoRinnovo([{ file: 'n.json', testo: JSON.stringify(obj) }], 'capitolo', { scena: 2, capitolo: 1 }, dati).totale, 0, 'un capitolo nuovo non rinnova gli usi per scena');
  assert.ok(p);
});

test('il comando del Direttore non tocca PM, munizioni né altre riserve: cambia solo scena e capitolo', () => {
  const prima = { scena: 3, capitolo: 2, storico: [] };
  for (const azione of ['scena', 'capitolo']) {
    const dopo = avanzaMomento(prima, azione, '2026-11-05T10:00:00Z');
    assert.deepEqual(Object.keys(dopo).sort(), ['capitolo', 'scena', 'storico'], 'nessun altro campo');
    assert.equal(dopo[azione], prima[azione] + 1);
    assert.equal(dopo[azione === 'scena' ? 'capitolo' : 'scena'], prima[azione === 'scena' ? 'capitolo' : 'scena']);
  }
  // la sessione di un PG con PM, munizioni, NEC, Chroma e usi: rinnovare (cambiare il numero) non la cambia; la vista
  // degli usi sì. Nessuna funzione del rinnovo scrive nella sessione.
  const { scheda, m, s } = nadia();
  const conRisorse = { ...usaUnaVoltaSessione(s, voce(scheda, 'Intrusione Rapida'), { scena: 3 }, m), pmAttuali: 2, munizioni: { x: { colpi: 4, riserve: 1 } } };
  const foto = JSON.stringify(conRisorse);
  usatiDi(conRisorse, voce(scheda, 'Intrusione Rapida'), { scena: 4 });
  statoUsiTalenti(scheda, conRisorse, { scena: 4 });
  riepilogoRinnovo([{ file: 'n.json', testo: JSON.stringify({ ...JSON.parse(TESTO_NADIA), sessione: conRisorse }) }], 'scena', { scena: 3, capitolo: 1 }, dati);
  assert.equal(JSON.stringify(conRisorse), foto);
  assert.ok(variaNec && variaChroma);
});

// --- il server: GET per tutti, POST solo dal PC del Direttore, nessun file dei PG toccato
const radice = mkdtempSync(join(tmpdir(), 'mutant-momento-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srvM, srvT, baseM, baseT;
before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  writeFileSync(join(c.personaggi, 'Nadia-Ferro_liv4_2026-10-02.json'), TESTO_NADIA);
  const opz = (m) => ({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster: () => m });
  srvM = creaServer(opz(true));
  srvT = creaServer(opz(false));
  await new Promise((ok) => srvM.listen(0, '127.0.0.1', ok));
  await new Promise((ok) => srvT.listen(0, '127.0.0.1', ok));
  baseM = `http://127.0.0.1:${srvM.address().port}`;
  baseT = `http://127.0.0.1:${srvT.address().port}`;
});
after(async () => {
  await new Promise((ok) => srvM.close(ok));
  await new Promise((ok) => srvT.close(ok));
  rmSync(radice, { recursive: true, force: true });
});
const post = (base, azione) => fetch(`${base}/api/momento`, { method: 'POST', body: JSON.stringify({ azione }), headers: { 'Content-Type': 'application/json' } });
const fotoCartella = () => readdirSync(c.personaggi).map((f) => [f, readFileSync(join(c.personaggi, f), 'utf8'), statSync(join(c.personaggi, f)).mtimeMs]);

test('server: scena e capitolo li cambia solo il Direttore; i file dei PG non si toccano; «annulla» torna indietro', async () => {
  assert.deepEqual(await (await fetch(`${baseT}/api/momento`)).json(), { scena: 1, capitolo: 1 });
  const prima = fotoCartella();
  assert.equal((await post(baseT, 'scena')).status, 403, 'un tablet non comincia una scena');
  let r = await (await post(baseM, 'scena')).json();
  assert.deepEqual([r.scena, r.capitolo, r.ultimo.azione], [2, 1, 'scena']);
  r = await (await post(baseM, 'capitolo')).json();
  assert.deepEqual([r.scena, r.capitolo], [2, 2]);
  r = await (await post(baseM, 'annulla')).json();
  assert.deepEqual([r.scena, r.capitolo], [2, 1]);
  assert.equal((await post(baseM, 'boh')).status, 400);
  // i tablet vedono il numero nuovo; nella cartella dei personaggi nulla è cambiato (PM, munizioni, riserve intatti)
  assert.deepEqual(await (await fetch(`${baseT}/api/momento`)).json(), { scena: 2, capitolo: 1, ultimo: r.ultimo });
  assert.deepEqual(fotoCartella(), prima);
});

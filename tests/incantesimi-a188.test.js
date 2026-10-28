// A.188 (Davide, 28/10/2026): il giocatore cambia da sé anche gli incantesimi conservati, ma quote, famiglie accessibili,
// livello massimo e requisiti valgono di nuovo; il Direttore può forzare con conferma; ogni modifica va nello storico con
// data, ora e provenienza; gli incantesimi a mano e quelli degli artefatti restano fuori dalle quote.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { contesto, resa, clic, dati } from './scheda-aiuti.js';
import { calcolaScheda } from '../src/calc.js';
import { erroriScelteSuccessive } from '../src/avanzamento.js';
import { provaSostituzione, rigaIncantesimi, sorgenteModifica, dataOra } from '../src/incantesimi-regole.js';
import { controllaIncantesimiDaTablet } from '../src/talenti-tablet.js';
import { preparaTab } from '../src/stampa.js';
import { tabFissi } from '../src/ui/tab.js';
import { allineaStorico, rigaStorico } from '../src/storico.js';

const FILE = 'Fratello-Anselmo-Viri_liv3_2026-10-02.json';
const anselmo = JSON.parse(readFileSync(new URL(`../esempi/${FILE}`, import.meta.url), 'utf8'));
const conTalento = () => ({
  ...anselmo,
  livelli: anselmo.livelli.map((v) => (v.livello === 3 ? { livello: 3, talentoLibero: { id: 'incrementare-incantesimi' }, incantesimi: ['Dardo Psichico', 'Terrore'] } : v)),
});
const pers = (o) => ({ versione: 2, creazione: o.scelte, livelli: o.livelli });
const massimo = () => calcolaScheda(pers(conTalento()), dati).incantesimi.livelloMassimo;
const catalogo = () => dati.incantesimi.incantesimi;
const troppoAlto = () => catalogo().find((i) => i.livello_base > massimo());
// un incantesimo che sostituisce Terrore restando nelle regole (cercato con la prova stessa)
const inRegola = () => catalogo().find((i) => i.nome !== 'Terrore' && i.nome !== 'Dardo Psichico' && i.livello_base <= massimo() && provaSostituzione(pers(conTalento()), 3, 'Terrore', i.nome, dati).ok) ?? null;

test('provaSostituzione: un incantesimo oltre il livello massimo non è ammesso, uno che rientra sì', () => {
  const p = pers(conTalento());
  const alto = troppoAlto();
  assert.ok(alto, 'nel catalogo c’è un incantesimo oltre il livello massimo di Anselmo');
  const no = provaSostituzione(p, 3, 'Terrore', alto.nome, dati);
  assert.equal(no.ok, false);
  assert.match(no.motivo, /oltre il livello massimo/);
  const buono = inRegola();
  if (buono) assert.equal(provaSostituzione(p, 3, 'Terrore', buono.nome, dati).ok, true, `${buono.nome} rientra`);
  // già posseduto o livello senza quell'incantesimo: duplicato, non una questione di regole
  assert.equal(provaSostituzione(p, 3, 'Terrore', 'Dardo Psichico', dati).duplicato, true);
  assert.equal(provaSostituzione(p, 2, 'Terrore', alto.nome, dati).duplicato, true);
});

test('una violazione già presente nel personaggio non ferma una sostituzione che non la peggiora', () => {
  // Anselmo con tre incantesimi oltre il livello massimo (come dopo la libertà del 27/10): scambiarne uno con uno
  // anch'esso troppo alto è peggio? No: il motivo è lo stesso testo solo se cambia il nome; qui si controlla il contrario,
  // cioè che sostituire un incantesimo regolare con uno regolare resti ammesso anche se altrove c'è un'eccedenza
  const alti = catalogo().filter((i) => i.livello_base > massimo()).slice(0, 2);
  const base = conTalento();
  const sporco = { ...base, livelli: base.livelli.map((v) => (v.livello === 3 ? { ...v, incantesimi: [alti[0].nome, 'Terrore'] } : v)) };
  const p = pers(sporco);
  assert.ok(erroriScelteSuccessive(p, dati).some((e) => e.tipo === 'violazione'), 'il personaggio è già fuori regola');
  const buono = inRegola();
  if (buono) assert.equal(provaSostituzione(p, 3, 'Terrore', buono.nome, dati).ok, true, 'cambiare l’altro, regolare, non è bloccato dall’eccedenza che c’era');
  assert.equal(provaSostituzione(p, 3, 'Terrore', alti[1].nome, dati).ok, false, 'aggiungere un secondo incantesimo troppo alto sì: è nuovo');
});

test('controllaIncantesimiDaTablet: il tablet non scrive un incantesimo fuori regola; il resto passa', () => {
  const disco = conTalento();
  const alto = troppoAlto();
  const con = (nome) => ({ ...disco, livelli: disco.livelli.map((v) => (v.livello === 3 ? { ...v, incantesimi: ['Dardo Psichico', nome] } : v)) });
  const no = controllaIncantesimiDaTablet(con(alto.nome), disco, dati);
  assert.equal(no.ok, false);
  assert.equal(no.stato, 403);
  assert.match(no.errore, /solo il Direttore/);
  const buono = inRegola();
  if (buono) assert.equal(controllaIncantesimiDaTablet(con(buono.nome), disco, dati).ok, true);
  assert.equal(controllaIncantesimiDaTablet(disco, disco, dati).ok, true, 'nessun cambiamento');
  assert.equal(controllaIncantesimiDaTablet(con(alto.nome), null, dati).ok, true, 'file nuovo: entra com’è');
});

test('lo storico: «Sostituito X con Y (tablet, 28/10 21:40)»', () => {
  const adesso = new Date(2026, 9, 28, 21, 40);
  assert.equal(dataOra(adesso), '28/10 21:40');
  assert.equal(rigaIncantesimi('Sostituito Colpo Elementale con Dardo Mistico', 'tablet', adesso), 'Sostituito Colpo Elementale con Dardo Mistico (tablet, 28/10 21:40)');
  assert.equal(sorgenteModifica({ server: true, daQuestoPc: false }), 'tablet');
  assert.equal(sorgenteModifica({ server: true, daQuestoPc: true }), 'PC');
  assert.equal(sorgenteModifica({ server: true, daQuestoPc: true, master: true }), 'Direttore');
  assert.equal(sorgenteModifica({ server: false }), 'app');
  const s = rigaStorico({}, rigaIncantesimi('Tolto Terrore', 'tablet', adesso), adesso);
  assert.equal(allineaStorico(s.storico)[0].testo, 'Tolto Terrore (tablet, 28/10 21:40)');
});

// --- la scheda: il pulsante di sostituzione per il giocatore e per il Direttore ---
function ctxSostituzione({ master = false } = {}) {
  const c = contesto(FILE, { attiva: 'poteri' });
  const livelli = conTalento().livelli;
  const tab = preparaTab({ creazione: c.scelte, livelli }, dati, { sessione: c.sessione });
  tab.tab = tabFissi(tab.tab);
  const alto = troppoAlto();
  c.azioni = new Proxy(c.azioni, { get: (t, n) => (n === 'provaSostituzioneIncantesimo' ? (liv, v, nuovo) => provaSostituzione({ versione: 2, creazione: c.scelte, livelli }, liv, v, nuovo, dati)
    : n === 'sostituisciIncantesimoLivello' ? (...a) => { c.chiamate.push([n, ...a]); return true; } : t[n]) });
  c.ui.incantesimoAMano = { cerca: '', id: alto.id, origine: 'a_mano', nota: '', aperto: true, errore: null, esito: null, sostituisce: { nome: 'Terrore', livello: 3 } };
  return { ...c, livelli, tab, master: master ? { motivoProssima() {} } : undefined, alto };
}

test('scheda: per il giocatore la sostituzione fuori regola è spenta e dice perché', () => {
  const c = ctxSostituzione();
  const r = resa(c);
  const s = r.radice.tutti().find((n) => n.tagName === 'DETAILS' && /incantesimi-a-mano/.test(n.className));
  const pulsante = s.tutti().find((n) => n.tagName === 'BUTTON' && /^(Sostituisci con|Forza la sostituzione con|Non ammessa:) /.test(n.textContent));
  assert.ok(pulsante, 'il pulsante c’è');
  assert.ok(pulsante.disabled || pulsante.getAttribute('disabled') !== null, 'spento per il giocatore');
  assert.match(s.textContent, /Non ammessa dalle regole: .*oltre il livello massimo/);
  assert.equal(c.chiamate.filter(([a]) => a === 'sostituisciIncantesimoLivello').length, 0);
});

test('scheda: per il Direttore la stessa sostituzione si può forzare', () => {
  const c = ctxSostituzione({ master: true });
  const r = resa(c);
  const s = r.radice.tutti().find((n) => n.tagName === 'DETAILS' && /incantesimi-a-mano/.test(n.className));
  const pulsante = s.tutti().find((n) => n.tagName === 'BUTTON' && /^Forza la sostituzione con /.test(n.textContent));
  assert.ok(pulsante, 'il pulsante dice che forza');
  assert.ok(!pulsante.disabled && pulsante.getAttribute('disabled') === null);
  assert.match(s.textContent, /Come Direttore puoi forzarla/);
});

test('c’è davvero un incantesimo che rientra nelle regole (i controlli condizionali non sono vuoti)', () => {
  assert.ok(inRegola(), 'inRegola() trovato');
});

// --- dal server vero ---
const radice = mkdtempSync(join(tmpdir(), 'mutant-a188-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
let srvMaster, baseMaster, srvTablet, baseTablet;
before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  const crea = (eMaster) => creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe, px: c.px, eMaster });
  srvMaster = crea(() => true); srvTablet = crea(() => false);
  await new Promise((ok) => srvMaster.listen(0, '127.0.0.1', ok));
  await new Promise((ok) => srvTablet.listen(0, '127.0.0.1', ok));
  baseMaster = `http://127.0.0.1:${srvMaster.address().port}`;
  baseTablet = `http://127.0.0.1:${srvTablet.address().port}`;
});
after(async () => {
  await new Promise((ok) => srvMaster.close(ok));
  await new Promise((ok) => srvTablet.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

test('dal server: il tablet non scrive una sostituzione fuori regola, il Direttore sì; una in regola passa', async () => {
  const file = 'Prova-A188_liv3_2026-10-28.json';
  const url = (b) => `${b}/api/personaggi/${encodeURIComponent(file)}`;
  const disco = conTalento();
  const con = (nome) => ({ ...disco, livelli: disco.livelli.map((v) => (v.livello === 3 ? { ...v, incantesimi: ['Dardo Psichico', nome] } : v)) });
  const scrivi = (b, o) => fetch(url(b), { method: 'PUT', headers: { 'X-Mutant-Da': 'giocatore' }, body: JSON.stringify(o) });
  const letto = () => JSON.parse(readFileSync(join(c.personaggi, file), 'utf8'));
  assert.equal((await fetch(url(baseMaster), { method: 'PUT', body: JSON.stringify(disco) })).status, 200);
  const alto = troppoAlto();
  const r = await scrivi(baseTablet, con(alto.nome));
  assert.equal(r.status, 403);
  assert.match((await r.json()).errore, /oltre il livello massimo.*solo il Direttore/);
  assert.deepEqual(letto().livelli.find((v) => v.livello === 3).incantesimi, ['Dardo Psichico', 'Terrore'], 'il file non è cambiato');
  const buono = inRegola();
  assert.equal((await scrivi(baseTablet, con(buono.nome))).status, 200);
  assert.deepEqual(letto().livelli.find((v) => v.livello === 3).incantesimi, ['Dardo Psichico', buono.nome]);
  // il Direttore (PC del server) forza
  assert.equal((await fetch(url(baseMaster), { method: 'PUT', body: JSON.stringify(con(alto.nome)) })).status, 200);
  assert.deepEqual(letto().livelli.find((v) => v.livello === 3).incantesimi, ['Dardo Psichico', alto.nome]);
  // e il tablet, con quel personaggio già fuori regola, può ancora togliere l'incantesimo troppo alto
  assert.equal((await scrivi(baseTablet, con(buono.nome))).status, 200);
});

// Lotto 165 (02/11/2026, richiesta di Davide dal tavolo): il Direttore sposta davvero i Punti Abilità già spesi in un
// livello (src/sposta-punti.js), dentro lo stesso livello; il totale non cambia da solo; i limiti delle regole sono avvisi
// che lui forza; il giocatore non lo fa (il server rifiuta, controllaPuntiDaTablet); le correzioni a parte restano.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test, before, after } from 'node:test';
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { puntiDaCompletare } from '../src/avanzamento.js';
import { serializza, deserializzaPersonaggio, normalizza } from '../src/character.js';
import {
  spostaInBozza, totaliBozza, avvisiSpostamento, applicaSpostamento, decisioniConferma, descriviSpostamento,
  statoPannello, eventiConPunti, puntiDelLivello, controllaPuntiDaTablet,
} from '../src/sposta-punti.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, tiro } from './personaggi.js';

const { dati } = await datiReali();
const QUARTO = { 'Tecnologia': 3, 'Medicina': 2, 'Sopravvivenza': 2 };
// Mishima Agente al 6° livello (7 punti per Grado): Grado II di Agente al 4° con 7 Punti Abilità
const pg = (extra = {}) => ({
  creazione: { ...MISHIMA_AGENTE, puntiAbilitaLiberi: { 'Percezione': 2, 'Tecnologia': 1, 'Cultura': 1, 'Raggirare': 3 }, ...extra },
  livelli: [
    { livello: 2, caratteristiche: { DES: 2 } },
    { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } },
    { livello: 4, grado: { classe: 'Agente' }, tiroPV: tiro(4), talentoClasse: 'Reazione Operativa', puntiAbilita: { ...QUARTO } },
    { livello: 5, talentoLibero: { id: 'prova-salvezza-migliorata', parametro: 'tempra' } },
    { livello: 6, caratteristiche: { INT: 1, COS: 1 } },
  ],
});
const va = (p, nome) => calcolaScheda(p, dati).abilita.find((a) => a.nome === nome).totale;
const somma = (o) => Object.values(o).reduce((s, v) => s + v, 0);
// due spostamenti: −2 Tecnologia, +2 Atletica nel 4° livello
const sposta2 = (p) => spostaInBozza(p, spostaInBozza(p, {}, 4, 'Tecnologia', -2), 4, 'Atletica', 2);

test('gli eventi con Punti Abilità: creazione e 4° livello, 7 punti ciascuno', () => {
  assert.deepEqual(eventiConPunti(pg(), dati).map((e) => [e.livello, e.previsti, e.totale]), [[1, 7, 7], [4, 7, 7]]);
});

test('togliere 2 punti da un’Abilità del 4° livello e metterli in un’altra: i VA cambiano subito', () => {
  const p = pg();
  const meta = spostaInBozza(p, {}, 4, 'Tecnologia', -2);
  // a metà: 2 punti da ricollocare, detto in chiaro
  assert.deepEqual(totaliBozza(p, meta), [{ livello: 4, prima: 7, ora: 5, differenza: -2 }]);
  assert.match(avvisiSpostamento(p, meta, dati).find((a) => a.tipo === 'sospesi').testo, /^2 punti da ricollocare nel 4° livello/);
  const b = sposta2(p);
  assert.deepEqual(totaliBozza(p, b), [{ livello: 4, prima: 7, ora: 7, differenza: 0 }]);
  assert.deepEqual(avvisiSpostamento(p, b, dati), []);
  // il pannello ricalcola i VA mentre si sposta
  const righe = Object.fromEntries(statoPannello(p, b, 4, dati).righe.map((r) => [r.nome, r]));
  assert.deepEqual([righe.Tecnologia.prima, righe.Tecnologia.ora, righe.Tecnologia.vaPrima, righe.Tecnologia.vaDopo], [3, 1, 11, 9]);
  assert.deepEqual([righe.Atletica.prima, righe.Atletica.ora, righe.Atletica.vaPrima, righe.Atletica.vaDopo], [0, 2, 7, 9]);
  const n = applicaSpostamento(p, b, dati, { quando: '2026-11-02T20:40:00.000Z' });
  assert.deepEqual(n.livelli[2].puntiAbilita, { 'Atletica': 2, 'Medicina': 2, 'Sopravvivenza': 2, 'Tecnologia': 1 });
  assert.deepEqual(n.livelli[2].puntiDirettore, { quando: '2026-11-02T20:40:00.000Z', spostati: { 'Atletica': 2, 'Tecnologia': -2 } });
  assert.equal(va(n, 'Tecnologia'), 9);
  assert.equal(va(n, 'Atletica'), 9);
  const s = calcolaScheda(n, dati);
  assert.deepEqual([s.errori, s.completamenti, s.eccessi], [[], [], []]);
  // gli altri eventi restano identici
  assert.deepEqual(n.creazione.puntiAbilitaLiberi, p.creazione.puntiAbilitaLiberi);
  assert.deepEqual(n.livelli.filter((_, i) => i !== 2), p.livelli.filter((_, i) => i !== 2));
});

test('il totale dei punti di un livello non cambia durante uno spostamento (si sposta solo quello che si toglie)', () => {
  // qualunque sequenza di «togli 1 da A, metti 1 in B» lascia il totale di ogni livello uguale
  const p = pg();
  const nomi = dati.abilita.abilita.map((a) => a.nome);
  let b = {};
  let seme = 7;
  const caso = (n) => { seme = (seme * 1103515245 + 12345) % 2147483648; return seme % n; };
  for (let i = 0; i < 60; i++) {
    const livello = caso(2) ? 4 : 1;
    const ora = { ...puntiDelLivello(p, livello), ...(b[livello] ?? {}) };
    const conPunti = Object.keys(b[livello] ?? puntiDelLivello(p, livello)).filter((a) => (b[livello] ?? ora)[a] > 0);
    const da = conPunti[caso(conPunti.length)];
    const a = nomi[caso(nomi.length)];
    b = spostaInBozza(p, spostaInBozza(p, b, livello, da, -1), livello, a, 1);
    for (const t of totaliBozza(p, b)) assert.equal(t.differenza, 0, `il totale del ${t.livello}° livello è cambiato durante lo spostamento`);
  }
  const n = applicaSpostamento(p, b, dati, decisioniConferma(p, b, avvisiSpostamento(p, b, dati)));
  assert.equal(somma(puntiDelLivello(n, 1)), 7);
  assert.equal(somma(puntiDelLivello(n, 4)), 7);
  // nessun punto in sospeso, nessun totale cambiato: nessuna decisione sui totali
  assert.deepEqual(decisioniConferma(p, b, avvisiSpostamento(p, b, dati)).totali, {});
});

test('chiudere con un punto in sospeso: lo dice; confermato, il livello resta da completare con «Assegna»', () => {
  const p = pg();
  const b = spostaInBozza(p, sposta2(p), 4, 'Medicina', -1);
  const avvisi = avvisiSpostamento(p, b, dati);
  assert.deepEqual(avvisi.map((a) => a.tipo), ['sospesi']);
  assert.match(avvisi[0].testo, /^1 punto da ricollocare nel 4° livello: il livello resterebbe con 6 punti su 7/);
  const d = decisioniConferma(p, b, avvisi);
  assert.deepEqual(d, { forzati: {}, totali: {} });
  const n = applicaSpostamento(p, b, dati, d);
  assert.deepEqual(puntiDaCompletare(n, dati).map((x) => [x.livello, x.mancanti]), [[4, 1]]);
  assert.equal(n.livelli[2].puntiDirettore.totale, undefined);
});

test('superare un massimo: avviso con il motivo; forzato con conferma, resta come eccezione del Direttore', () => {
  const p = pg();
  // 4 punti in Atletica nel 4°: VA 7, limite 9 → 2 punti non aumentano il VA
  let b = spostaInBozza(p, {}, 4, 'Medicina', -2);
  b = spostaInBozza(p, spostaInBozza(p, b, 4, 'Sopravvivenza', -2), 4, 'Atletica', 4);
  const avvisi = avvisiSpostamento(p, b, dati);
  assert.deepEqual(avvisi.map((a) => [a.tipo, a.abilita]), [['limite', 'Atletica']]);
  assert.match(avvisi[0].testo, /Atletica nel 4° livello: 2 punti non aumentano il VA personale, già al limite 9 \(.+\) \(§8\.3\)/);
  // nel pannello l'avviso sta sulla riga dell'Abilità
  assert.equal(statoPannello(p, b, 4, dati).righe.find((r) => r.nome === 'Atletica').avvisi.length, 1);
  const d = decisioniConferma(p, b, avvisi);
  assert.deepEqual(d.forzati, { 4: ['Atletica'] });
  const n = applicaSpostamento(p, b, dati, d);
  assert.deepEqual(n.livelli[2].puntiDirettore.forzati, ['Atletica']);
  const s = calcolaScheda(n, dati);
  // forzato: niente errori né punti da riassegnare; il VA non supera il limite delle regole
  assert.deepEqual([s.errori, s.completamenti, s.eccessi], [[], [], []]);
  assert.equal(va(n, 'Atletica'), 9);
  // senza la forzatura la scheda chiederebbe di riassegnarli
  const senza = applicaSpostamento(p, b, dati);
  assert.deepEqual(puntiDaCompletare(senza, dati).map((x) => [x.livello, x.inattivi]), [[4, { 'Atletica': 2 }]]);
});

test('i punti che passano a un altro livello: avviso e conferma; confermato, i due totali li decide il Direttore', () => {
  const p = pg();
  const b = spostaInBozza(p, spostaInBozza(p, {}, 4, 'Tecnologia', -2), 1, 'Oratoria', 2);
  const avvisi = avvisiSpostamento(p, b, dati);
  assert.equal(avvisi[0].tipo, 'migrazione');
  assert.match(avvisi[0].testo, /^2 punti passano dal 4° livello alla creazione: di regola i punti restano nel livello/);
  const d = decisioniConferma(p, b, avvisi);
  assert.deepEqual(d.totali, { 1: 9, 4: 5 });
  const n = applicaSpostamento(p, b, dati, d);
  const s = calcolaScheda(n, dati);
  // né «Assegna» né «Togli» li rimettono a posto da soli
  assert.deepEqual([s.errori, s.completamenti, s.eccessi], [[], [], []]);
  assert.equal(n.creazione.puntiDirettore.totale, 9);
  assert.equal(n.livelli[2].puntiDirettore.totale, 5);
  // riportati indietro, il blocco del Direttore si svuota da solo
  const indietro = spostaInBozza(n, spostaInBozza(n, {}, 1, 'Oratoria', -2), 4, 'Tecnologia', 2);
  const r = applicaSpostamento(n, indietro, dati, decisioniConferma(n, indietro, avvisiSpostamento(n, indietro, dati)));
  assert.equal(r.creazione.puntiDirettore, null);
  assert.equal(r.livelli[2].puntiDirettore, undefined);
});

test('il registro in italiano: «Spostati 2 punti da Tecnologia ad Atletica nel 4° livello (PC, 02/11 21:40)»', () => {
  const p = pg();
  const quando = new Date(2026, 10, 2, 21, 40).toISOString();
  assert.equal(descriviSpostamento(p, sposta2(p), { quando }), 'Spostati 2 punti da Tecnologia ad Atletica nel 4° livello (PC, 02/11 21:40)');
  const uno = spostaInBozza(p, spostaInBozza(p, {}, 1, 'Raggirare', -1), 1, 'Oratoria', 1);
  assert.equal(descriviSpostamento(p, uno, { quando }), 'Spostato 1 punto da Raggirare a Oratoria nella creazione (PC, 02/11 21:40)');
  let molti = spostaInBozza(p, spostaInBozza(p, {}, 4, 'Tecnologia', -2), 4, 'Medicina', -1);
  molti = spostaInBozza(p, molti, 4, 'Atletica', 3);
  assert.equal(descriviSpostamento(p, molti, { quando }), 'Spostati i punti nel 4° livello: tolti Medicina 1, Tecnologia 2; messi Atletica 3 (PC, 02/11 21:40)');
  assert.equal(descriviSpostamento(p, {}, { quando }), '');
});

test('una correzione a parte sulla stessa Abilità resta dov’è e si vede distinta dallo spostamento', () => {
  const corr = [{ id: 'cm-1', quando: '2026-10-20T10:00:00.000Z', chiave: 'abilita:Atletica', etichetta: 'Atletica', tipo: 'aggiungi', numero: 1, motivo: 'dono del patrono', stato: 'attiva' }];
  const p = pg({ correzioniMaster: corr });
  const b = sposta2(p);
  const r = statoPannello(p, b, 4, dati).righe.find((x) => x.nome === 'Atletica');
  assert.deepEqual(r.correzioni, [{ valore: 1, nota: 'dono del patrono' }]);
  assert.deepEqual([r.vaPrima, r.vaDopo], [8, 10]);
  const n = applicaSpostamento(p, b, dati);
  // la correzione non si tocca e non si converte
  assert.deepEqual(n.creazione.correzioniMaster, corr);
  const a = calcolaScheda(n, dati).abilita.find((x) => x.nome === 'Atletica');
  assert.deepEqual([a.liberi, a.calcolato, a.totale], [2, 9, 10]);
});

test('il blocco del Direttore si salva nel file e si rilegge; senza, il file resta com’era', () => {
  const p = pg();
  const b = spostaInBozza(p, spostaInBozza(p, {}, 1, 'Raggirare', -1), 1, 'Oratoria', 1);
  const n = applicaSpostamento(p, b, dati, { quando: '2026-11-02T20:40:00.000Z' });
  const testo = serializza(n.creazione, { livelli: n.livelli });
  const letto = deserializzaPersonaggio(testo);
  const scelte = normalizza(letto.creazione, dati).scelte;
  assert.deepEqual(scelte.puntiDirettore, { quando: '2026-11-02T20:40:00.000Z', spostati: { 'Oratoria': 1, 'Raggirare': -1 } });
  assert.equal(JSON.parse(serializza(p.creazione, { livelli: p.livelli })).scelte.puntiDirettore, undefined);
});

// --- server: il tablet non sposta i punti (PUT /api/personaggi/<file> → controllaPuntiDaTablet)
const file = (p) => ({ scelte: p.creazione, livelli: p.livelli });

test('dal tablet uno spostamento di punti già spesi si rifiuta (403)', () => {
  const p = pg();
  const r = controllaPuntiDaTablet(file(applicaSpostamento(p, sposta2(p), dati)), file(p), dati);
  // il blocco del Direttore non viene dal tablet: anche senza, i punti tolti da Tecnologia si rifiutano
  assert.equal(r.ok, false);
  assert.equal(r.stato, 403);
  const senzaBlocco = structuredClone(file(p));
  senzaBlocco.livelli[2].puntiAbilita = { 'Tecnologia': 1, 'Medicina': 2, 'Sopravvivenza': 2, 'Atletica': 2 };
  const r2 = controllaPuntiDaTablet(senzaBlocco, file(p), dati);
  assert.equal(r2.ok, false);
  assert.match(r2.errore, /lo fa il Direttore/);
  // nemmeno nella creazione
  const c = structuredClone(file(p));
  c.scelte.puntiAbilitaLiberi = { 'Percezione': 2, 'Tecnologia': 1, 'Cultura': 1, 'Raggirare': 2, 'Oratoria': 1 };
  assert.equal(controllaPuntiDaTablet(c, file(p), dati).ok, false);
});

test('dal tablet il blocco del Direttore non si cambia né si toglie', () => {
  const p = pg();
  const n = applicaSpostamento(p, sposta2(p), dati);
  const tolto = structuredClone(file(n));
  delete tolto.livelli[2].puntiDirettore;
  assert.equal(controllaPuntiDaTablet(tolto, file(n), dati).ok, false);
  // lo stesso file che c'è già passa
  assert.deepEqual(controllaPuntiDaTablet(file(n), file(n), dati), { ok: true });
});

test('dal tablet restano i modi del giocatore: «Assegna» dei punti mancanti o da riassegnare, «Togli» dell’eccesso, un livello nuovo', () => {
  const p = pg();
  // punti mancanti (il livello ne ha 5 su 7): aggiungerli si può
  const mancanti = structuredClone(file(p));
  mancanti.livelli[2].puntiAbilita = { 'Tecnologia': 3, 'Medicina': 2 };
  const assegna = structuredClone(mancanti);
  assegna.livelli[2].puntiAbilita = { 'Tecnologia': 3, 'Medicina': 2, 'Atletica': 2 };
  assert.deepEqual(controllaPuntiDaTablet(assegna, mancanti, dati), { ok: true });
  // eccesso (8 su 7): toglierlo si può
  const eccesso = structuredClone(file(p));
  eccesso.livelli[2].puntiAbilita = { ...QUARTO, 'Atletica': 1 };
  assert.deepEqual(controllaPuntiDaTablet(file(p), eccesso, dati), { ok: true });
  // punti che non aumentano più il VA (A.107): riassegnarli nello stesso livello si può
  const inattivi = structuredClone(file(p));
  inattivi.livelli[2].puntiAbilita = { 'Tecnologia': 3, 'Medicina': 2, 'Sopravvivenza': 2, 'Furtività': 1 };
  inattivi.livelli[2].puntiAbilita = { 'Tecnologia': 2, 'Medicina': 2, 'Sopravvivenza': 2, 'Furtività': 1 };
  const riassegnato = structuredClone(inattivi);
  riassegnato.livelli[2].puntiAbilita = { 'Tecnologia': 2, 'Medicina': 2, 'Sopravvivenza': 2, 'Atletica': 1 };
  assert.deepEqual(controllaPuntiDaTablet(riassegnato, inattivi, dati), { ok: true });
  // un livello nuovo con i suoi punti: non è uno spostamento
  const nuovo = structuredClone(file(p));
  nuovo.livelli.push({ livello: 7, talentoLibero: { id: 'riflessi-fulminei' } });
  assert.deepEqual(controllaPuntiDaTablet(nuovo, file(p), dati), { ok: true });
  // un file nuovo (nessuno su disco) passa
  assert.deepEqual(controllaPuntiDaTablet(file(p), null, dati), { ok: true });
});

// --- dal server vero (cartelle temporanee, porta a caso)
const radice = mkdtempSync(join(tmpdir(), 'mutant-sposta-'));
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

test('dal server: il tablet che sposta i punti di un livello si vede rifiutare (403), il Direttore no', async () => {
  const nome = 'Prova-Sposta_liv6_2026-11-02.json';
  const url = (b) => `${b}/api/personaggi/${encodeURIComponent(nome)}`;
  const scrivi = (b, p, extra = {}) => fetch(url(b), { method: 'PUT', headers: extra, body: serializza({ ...p.creazione, puntiEsperienza: 9000 }, { livelli: p.livelli }) });
  const letto = () => JSON.parse(readFileSync(join(c.personaggi, nome), 'utf8'));
  const tablet = { 'X-Mutant-Da': 'giocatore' };
  const p = pg();
  assert.equal((await scrivi(baseMaster, p)).status, 200);
  const spostato = applicaSpostamento(p, sposta2(p), dati);
  const r = await scrivi(baseTablet, spostato, tablet);
  assert.equal(r.status, 403);
  const j = await r.json();
  assert.equal(j.puntiAbilita, true);
  assert.deepEqual(letto().livelli[2].puntiAbilita, QUARTO, 'il file non cambia');
  // anche senza il blocco del Direttore (un tablet che sposta i punti «a mano»)
  const aMano = structuredClone(spostato);
  delete aMano.livelli[2].puntiDirettore;
  assert.equal((await scrivi(baseTablet, aMano, tablet)).status, 403);
  // il Direttore (PC del server) sì
  assert.equal((await scrivi(baseMaster, spostato)).status, 200);
  assert.deepEqual(letto().livelli[2].puntiAbilita, { 'Atletica': 2, 'Medicina': 2, 'Sopravvivenza': 2, 'Tecnologia': 1 });
  // e dopo, il tablet che rimanda lo stesso file (nessuno spostamento) passa; quello con i punti di prima no
  assert.equal((await scrivi(baseTablet, spostato, tablet)).status, 200);
  assert.equal((await scrivi(baseTablet, p, tablet)).status, 403);
});

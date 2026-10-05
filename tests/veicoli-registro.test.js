// Registro unico dei veicoli (A.91 e A.105, E&L del 05/10/2026): src/veicoli-registro.js e server.mjs → /api/veicoli.
// Record modificato da scheda e plancia senza perdite, conflitto di revisione, migrazione dello Scout di Pablo,
// movimento all'Iniziativa del conducente e cambio di conducente nello stesso Round.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { normalizzaVeicoli, colpisciVeicolo } from '../src/veicoli.js';
import {
  nuovoRecord, migraVeicoli, applicaPatch, validaRecord, vede, statoMovimento, muoviVeicolo, cambiaConducente, movimentoResiduo, riferimento,
} from '../src/veicoli-registro.js';
import { normalizza, serializza, deserializza } from '../src/character.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const pablo = { pg: 'pg-pablo', chiave: 'PABLO-ZAION', nome: 'PABLO ZAION' }; // come la scheda: maiuscole diverse dal file
const lia = { pg: 'pg-lia', chiave: 'lia', nome: 'Lia' };
// lo Scout come è salvato oggi nel file di Pablo (formato del lotto 3, NEC di prima)
const scoutDiPablo = () => normalizzaVeicoli([{ uid: 'veimuu14mqa0', profilo: 'asa-scout-mk4', nome: 'Scout', gruppo: true, conducente: false, andatura: 'controllata',
  pi: { corpo: 60, propulsione: 36, motore: 24 }, rinforzi: { copriruote: { montati: [3, 3, 3, 3], ricambi: [3, 3] } }, nec: { lx: 100000 } }], dati)[0];

const radice = mkdtempSync(join(tmpdir(), 'mutant-veicoli-'));
const veicoli = join(radice, 'veicoli');
let server;
let base;
before(async () => {
  server = creaServer({ cartella: join(radice, 'personaggi'), tavolo: join(radice, 'tavolo'), scontri: join(radice, 'scontri'), nemici: join(radice, 'nemici'), veicoli });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(radice, { recursive: true, force: true }); });

const put = (rec) => fetch(`${base}/api/veicoli/${rec.id}`, { method: 'PUT', body: JSON.stringify(rec), headers: { 'Content-Type': 'application/json' } });

test('migrazione dello Scout: record del registro con PI, energia, munizioni e andatura; nel file il riferimento', () => {
  const s = scoutDiPablo();
  const m = migraVeicoli([s], pablo, []);
  assert.equal(m.nuovi.length, 1);
  const rec = m.nuovi[0];
  assert.equal(validaRecord(rec), null);
  assert.equal(rec.id, 'veimuu14mqa0');
  assert.deepEqual(rec.proprietario, { tipo: 'gruppo' });
  assert.equal(rec.conducente, null);
  for (const k of ['pi', 'energia', 'munizioni', 'andatura', 'rinforzi']) assert.deepEqual(rec.mezzo[k], s[k], k);
  assert.equal('gruppo' in rec.mezzo || 'conducente' in rec.mezzo, false);
  assert.deepEqual(m.veicoli, [{ uid: 'veimuu14mqa0', rif: 'veimuu14mqa0', nome: 'Scout' }]);
  // il riferimento sopravvive al salvataggio del PG
  const { scelte } = normalizza({ ...copia(MISHIMA_AGENTE), veicoli: m.veicoli }, dati);
  const riletto = deserializza(serializza(scelte, {}));
  assert.deepEqual(normalizza(riletto.scelte ?? riletto, dati).scelte.veicoli, m.veicoli);
  // già migrato (seconda apertura o altro PC): solo il riferimento, nessun record nuovo
  const di2 = migraVeicoli([s], pablo, [rec]);
  assert.equal(di2.nuovi.length, 0);
  assert.equal(di2.veicoli[0].rif, rec.id);
  // lo stesso veicolo del gruppo in un altro file (uid diverso): avviso, nessuna unione
  const doppio = migraVeicoli([{ ...s, uid: 'veialtro01' }], lia, [rec]);
  assert.equal(doppio.nuovi.length, 0);
  assert.equal(doppio.avvisi.length, 1);
  assert.match(doppio.avvisi[0], /non lo unisco da solo/);
  assert.equal(doppio.veicoli[0].uid, 'veialtro01');
});

test('visibilità: proprietario, gruppo, conducente', () => {
  const mio = nuovoRecord(scoutDiPablo(), pablo, { gruppo: false });
  assert.equal(vede(mio, pablo), true);
  assert.equal(vede(mio, lia), false);
  assert.equal(vede(cambiaConducente(mio, lia), lia), true);
  assert.equal(vede(nuovoRecord(scoutDiPablo(), pablo, { gruppo: true }), lia), true);
});

test('server: creazione, revisione, conflitto 409 con il record attuale', async () => {
  const rec = nuovoRecord(scoutDiPablo(), pablo);
  const r1 = await put(rec);
  assert.equal(r1.status, 200);
  const salvato = await r1.json();
  assert.equal(salvato.revisione, 1);
  // la stessa revisione di partenza un'altra volta: conflitto
  const r2 = await put(rec);
  assert.equal(r2.status, 409);
  assert.equal((await r2.json()).attuale.revisione, 1);
  assert.equal((await put({ ...salvato, formato: 'altro' })).status, 400);
  assert.equal((await put({ ...salvato, id: 'veidiverso' })).status, 400);
  const lista = await (await fetch(`${base}/api/veicoli`)).json();
  assert.deepEqual(lista.map((x) => x.id), ['veimuu14mqa0']);
  assert.deepEqual(readdirSync(veicoli), ['veimuu14mqa0.json']);
});

test('record unico modificato da scheda e plancia senza perdite', async () => {
  const attuale = await (await fetch(`${base}/api/veicoli/veimuu14mqa0`)).json();
  // la scheda di Pablo cambia l'andatura, la plancia (partita dallo stesso record) applica un colpo
  const daScheda = { ...attuale, mezzo: { ...attuale.mezzo, andatura: 'veloce' } };
  const colpo = colpisciVeicolo(attuale.mezzo, { struttura: 'corpo' }, { danni: [20], natura: 'Naturale', ps: false }, dati);
  const daPlancia = { ...attuale, mezzo: { ...colpo.mezzo } };
  const r1 = await put(applicaPatch(attuale, attuale, daScheda).record);
  assert.equal(r1.status, 200);
  // la plancia scrive con la revisione vecchia: 409, poi riapplica le sue modifiche sul record nuovo
  const r2 = await put(applicaPatch(attuale, attuale, daPlancia).record);
  assert.equal(r2.status, 409);
  const { attuale: nuovo } = await r2.json();
  const p = applicaPatch(nuovo, attuale, daPlancia);
  assert.deepEqual(p.conflitti, []);
  const fine = await (await put(p.record)).json();
  assert.equal(fine.mezzo.andatura, 'veloce');
  assert.ok(fine.mezzo.pi.corpo < attuale.mezzo.pi.corpo);
  assert.equal(fine.revisione, 3);
  // lo stesso campo cambiato da due parti: resta quello del registro, segnalato
  const conflitto = applicaPatch(fine, attuale, { ...attuale, mezzo: { ...attuale.mezzo, andatura: 'massima' } });
  assert.deepEqual(conflitto.conflitti, ['mezzo.andatura']);
  assert.equal(conflitto.record.mezzo.andatura, 'veloce');
});

test('A.105: il veicolo si muove all’Iniziativa del conducente, una volta per Round, anche cambiando conducente', () => {
  const sc = { id: 'sc1', round: 2, partecipanti: [
    { id: 'pg:pablo-zaion', tipo: 'pg', chiave: 'pablo-zaion', nome: 'Pablo Zaion' },
    { id: 'pg:lia', tipo: 'pg', chiave: 'lia', nome: 'Lia' },
    { id: 'n1', tipo: 'nemico', nome: 'Predone' }] };
  const [pPablo, pLia, nemico] = sc.partecipanti;
  let rec = cambiaConducente(nuovoRecord(scoutDiPablo(), pablo), pablo);
  assert.equal(statoMovimento(rec, sc, nemico).puo, false);
  assert.match(statoMovimento(rec, sc, nemico).motivo, /Iniziativa di PABLO/);
  assert.throws(() => muoviVeicolo(rec, sc, pLia));
  rec = muoviVeicolo(rec, sc, pPablo);
  assert.deepEqual(rec.movimento, { scontro: 'sc1', round: 2, da: 'PABLO ZAION' });
  assert.equal(statoMovimento(rec, sc, pPablo).mosso, true);
  // cambio di conducente nello stesso Round: niente secondo movimento all'Iniziativa di Lia
  rec = cambiaConducente(rec, lia);
  const st = statoMovimento(rec, sc, pLia);
  assert.equal(st.puo, false);
  assert.match(st.motivo, /già mosso nel Round 2/);
  // Round successivo: si muove all'Iniziativa del nuovo conducente
  const sc3 = { ...sc, round: 3 };
  assert.equal(statoMovimento(rec, sc3, pPablo).puo, false);
  assert.equal(statoMovimento(rec, sc3, pLia).puo, true);
  // conducente incapace: a terra l'andatura scende di una fascia (§5.6)
  const residuo = movimentoResiduo({ ...rec, mezzo: { ...rec.mezzo, andatura: 'veloce' } }, dati);
  assert.equal(residuo.scesa, true);
  assert.notEqual(residuo.andatura.id, 'veloce');
});

test('il riferimento del registro non entra nella stampa né nel calcolo come mezzo', () => {
  const [r] = normalizzaVeicoli([riferimento(nuovoRecord(scoutDiPablo(), pablo))], dati);
  assert.deepEqual(r, { uid: 'veimuu14mqa0', rif: 'veimuu14mqa0', nome: 'Scout' });
});

test('stampa (seguito di A.91): il veicolo del registro si stampa dal record; senza record il foglio lo dice', async () => {
  const { preparaStampa } = await import('../src/stampa.js');
  const rec = { ...cambiaConducente(nuovoRecord(scoutDiPablo(), pablo), pablo), revisione: 4 };
  const creazione = { ...copia(MISHIMA_AGENTE), nome: 'Pablo Zaion', veicoli: [riferimento(rec)] };
  const foglio = (st) => st.fogli.find((f) => f.id === 'veicoli')?.dati.veicoli;
  // con il server: il record unico, con PI, conducente e revisione
  const [v] = foglio(preparaStampa({ creazione, livelli: [] }, dati, { registroVeicoli: { record: [rec], chi: pablo } }));
  assert.equal(v.registro.revisione, 4);
  assert.equal(v.registro.conducente, 'PABLO ZAION');
  assert.equal(v.conducente, true);
  assert.deepEqual(v.strutture.map((s) => s.pi), [60, 36, 24]);
  // server che non risponde, o stampa senza server: la pagina c'è e lo dice
  const [x] = foglio(preparaStampa({ creazione, livelli: [] }, dati, { registroVeicoli: { record: [], chi: pablo, errore: 'registro non leggibile' } }));
  assert.equal(x.nonRaggiungibile, true);
  assert.match(x.motivo, /non leggibile/);
  assert.match(foglio(preparaStampa({ creazione, livelli: [] }, dati))[0].motivo, /server di Mutant/);
  // copia locale senza server: come prima
  assert.equal(foglio(preparaStampa({ creazione: { ...creazione, veicoli: [scoutDiPablo()] }, livelli: [] }, dati))[0].registro, undefined);
});

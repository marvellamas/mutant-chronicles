// A.136 (risposta di Davide dell'08/10/2026, decisione 140): Prova facoltativa di Atletica in Corsa e Scatto in
// «Attacca!» (src/attacco.js, regole.json → attacco_distanza.movimento.prova_atletica) e movimento del Round letto
// dalla scena collegata allo scontro (src/mappa/annulla.js → movimentoDelRound, server.mjs → /api/movimento-round).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  calcolaAttaccoDistanza, calcolaAttaccoRavvicinato, penalitaMovimento, esitoAtletica, ESITI_ATLETICA,
  dichiarazioneDistanza, dichiarazioneRavvicinato,
} from '../src/attacco.js';
import { movimentoDelRound } from '../src/mappa/annulla.js';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const P = dati.regole.attacco_distanza.movimento.prova_atletica;

// la tabella della risposta di Davide: [esito, Corsa proprio/contro, Scatto proprio/contro]
const TABELLA = [
  [null, [-2, -2], [-6, -4]],
  ['magistrale', [0, -6], [-2, -8]],
  ['successo', [0, -4], [-4, -6]],
  ['fallimento', [-4, 0], [-8, -2]],
  ['maldestro', [-6, 0], [-10, 0]],
];

test('A.136: dati della Prova facoltativa (Atletica, 0 in Corsa e −2 in Scatto) e decisione', () => {
  assert.equal(P.abilita, 'Atletica');
  assert.deepEqual(P.modificatore, { corsa: 0, scatto: -2 });
  assert.match(P.decisione, /^A\.136/);
  assert.deepEqual(ESITI_ATLETICA, ['magistrale', 'successo', 'fallimento', 'maldestro']);
});

test('A.136: penalità senza Prova e per ogni esito, propria e per colpirlo, in Corsa e in Scatto', () => {
  for (const [esito, corsa, scatto] of TABELLA) {
    for (const [mov, [proprio, bersaglio]] of [['corsa', corsa], ['scatto', scatto]]) {
      const p = penalitaMovimento(mov, esito, dati);
      assert.deepEqual([p.proprio, p.bersaglio, p.esito], [proprio, bersaglio, esito], `${mov} ${esito ?? 'senza Prova'}`);
    }
  }
  // Passo e Fermo non hanno la Prova: l'esito non conta
  assert.deepEqual([penalitaMovimento('passo', 'magistrale', dati).proprio, penalitaMovimento('passo', 'magistrale', dati).esito], [0, null]);
});

test('A.136: esito dal d20 (dal vivo o dall’app) sul VA di Atletica con il modificatore della fascia', () => {
  assert.equal(esitoAtletica(12, 'corsa', 1, dati).esito, 'magistrale');
  assert.equal(esitoAtletica(12, 'corsa', 12, dati).esito, 'successo');
  assert.equal(esitoAtletica(12, 'corsa', 13, dati).esito, 'fallimento');
  assert.equal(esitoAtletica(12, 'corsa', 20, dati).esito, 'maldestro');
  // Scatto: −2 → VA 10, l'11 fallisce
  const s = esitoAtletica(12, 'scatto', 11, dati);
  assert.deepEqual([s.va, s.esito], [10, 'fallimento']);
  // VA 20 o più senza tiro: successo automatico, vale come Successo (non Magistrale)
  assert.equal(esitoAtletica(22, 'corsa', null, dati).esito, 'successo');
});

// arma e attaccante minimi, come in tests/attacco.test.js e tests/attacco-ravvicinato.test.js
const fucile = {
  uid: 'f', rif: 'armi_distanza:fucile-di-precisione', nome: 'Fucile', tipo: 'arma_distanza', abilita: 'Armi medie',
  va: 12, vaEffettivo: 12, scomposizione: [{ etichetta: 'VA Armi medie', valore: 12, fonte: 'regole' }],
  danno: { una_mano: '1d8+1', due_mani: null }, mani: 2, ac: 1, gittataQ: 1500, modalita: ['S'], mirino: null, accessori: [],
};
const tiratore = { scheda: { talentiLiberi: [], classi: [{ talenti: [] }], azioni: { principali: 1 } }, sessione: { munizioni: { f: { colpi: 30, riserve: 0 } } } };
const spada = {
  uid: 's', rif: 'armi:spada-leggera', nome: 'Spada leggera', tipo: 'arma_ravvicinata', abilita: 'Armi da mischia',
  va: 10, vaEffettivo: 10, scomposizione: [{ etichetta: 'VA Armi da mischia', valore: 10, fonte: 'regole' }],
  danno: { una_mano: '1d6+1', due_mani: null }, mani: 1, portataQ: 1, manovre: [],
};
const spadaccino = {
  scheda: { talentiLiberi: [], classi: [{ nome: 'Soldato', talenti: [] }], abilita: [], equipaggiamento: { armi: [spada] }, movimento: { passo: 6, corsa: 12, scatto: 18 }, azioni: { principali: 1, movimento: 1 } },
  sessione: { statiAttivi: [] },
};
const distanza = (d) => calcolaAttaccoDistanza(tiratore, fucile, { distanza: 5, ...d }, dati);
const mischia = (d) => calcolaAttaccoRavvicinato(spadaccino, spada, d, dati);

test('A.136 in «Attacca!» a distanza: senza Prova le penalità fisse, con la Prova quella dell’esito (proprio)', () => {
  const base = distanza({}).va_finale;
  for (const [esito, corsa, scatto] of TABELLA) {
    assert.equal(distanza({ movimento: 'corsa', atletica: esito }).va_finale, base + corsa[0], `Corsa ${esito ?? 'senza Prova'}`);
    assert.equal(distanza({ movimento: 'scatto', atletica: esito }).va_finale, base + scatto[0], `Scatto ${esito ?? 'senza Prova'}`);
  }
  const r = distanza({ movimento: 'scatto', atletica: 'successo' });
  assert.ok(r.provenienza.righe.some((x) => /Prova di Atletica: Successo/.test(x.fonte)));
  assert.ok(r.promemoria.some((x) => /chi ti attacca ha −6 VA fino alla tua Iniziativa successiva/.test(x)));
  // con il Movimento Evasivo valgono le sue penalità: l'esito non si applica
  assert.equal(distanza({ movimento: 'scatto', evasivo: true, atletica: 'magistrale' }).va_finale, base + dati.regole.attacco_distanza.movimento_evasivo.proprio.scatto);
});

test('A.136 a distanza: la Prova del bersaglio in Corsa o Scatto cambia la penalità per colpirlo', () => {
  const base = distanza({}).va_finale;
  for (const [esito, corsa, scatto] of TABELLA) {
    assert.equal(distanza({ bersaglio: { movimento: 'corsa', atletica: esito } }).va_finale, base + corsa[1], `bersaglio in Corsa ${esito ?? 'senza Prova'}`);
    assert.equal(distanza({ bersaglio: { movimento: 'scatto', atletica: esito } }).va_finale, base + scatto[1], `bersaglio in Scatto ${esito ?? 'senza Prova'}`);
  }
});

test('A.136 in mischia: dopo Corsa o Scatto la penalità personale (fissa o dell’esito); la Carica ha le sue', () => {
  const base = mischia({}).va_finale;
  for (const [esito, corsa, scatto] of TABELLA) {
    assert.equal(mischia({ movimento: 'corsa', atletica: esito }).va_finale, base + corsa[0], `Corsa ${esito ?? 'senza Prova'}`);
    assert.equal(mischia({ movimento: 'scatto', atletica: esito }).va_finale, base + scatto[0], `Scatto ${esito ?? 'senza Prova'}`);
  }
  assert.equal(mischia({ movimento: 'passo' }).va_finale, base);
  // Carica (3–6 Q): solo la sua fascia, niente penalità di Corsa in più
  assert.equal(mischia({ movimento: 'corsa', carica: true, percorsoQ: 5 }).va_finale, base + dati.regole.attacco_ravvicinato.carica.fasce[0].va);
});

test('A.136: l’esito resta nella dichiarazione solo se è uno dei quattro', () => {
  assert.equal(dichiarazioneDistanza({ atletica: 'boh' }).atletica, null);
  assert.equal(dichiarazioneDistanza({ bersaglio: { atletica: 'fallimento' } }).bersaglio.atletica, 'fallimento');
  assert.equal(dichiarazioneRavvicinato({ atletica: 'maldestro' }).atletica, 'maldestro');
});

// scena minima: il token del PG con i movimenti del Round
const scena = (movimenti) => ({
  id: 'prova', collegamento: { scontro: 's1', bozza: null },
  token: [{ id: 't1', rif: { tipo: 'partecipante', id: 'pg:lucas' }, q: [3, 3] }, { id: 't2', rif: { tipo: 'partecipante', id: 'n1' }, q: [9, 9] }],
  movimenti: movimenti.map((m, i) => ({ id: `m${i}`, token: 't1', scontro: 's1', round: 2, libero: false, ...m })),
});

test('A.136, dato dalla mappa: Passo diventato Corsa, Scatto, Passo soltanto, altri Round e movimenti liberi', () => {
  assert.deepEqual(movimentoDelRound(scena([{ costo: 2, fascia: 'passo' }, { costo: 10, fascia: 'corsa' }]), 'pg:lucas', 's1', 2), { fascia: 'corsa', daPasso: true, q: 12 });
  assert.deepEqual(movimentoDelRound(scena([{ costo: 16, fascia: 'scatto' }]), 'pg:lucas', 's1', 2), { fascia: 'scatto', daPasso: false, q: 16 });
  assert.deepEqual(movimentoDelRound(scena([{ costo: 4, fascia: 'passo' }]), 'pg:lucas', 's1', 2), { fascia: 'passo', daPasso: false, q: 4 });
  // un altro Round e i movimenti liberi del master non contano
  assert.equal(movimentoDelRound(scena([{ costo: 12, fascia: 'corsa', round: 1 }, { costo: 3, fascia: 'corsa', libero: true }]), 'pg:lucas', 's1', 2).fascia, null);
  // nessun movimento del nemico; un partecipante senza token: null
  assert.equal(movimentoDelRound(scena([]), 'n1', 's1', 2).fascia, null);
  assert.equal(movimentoDelRound(scena([]), 'pg:altro', 's1', 2), null);
});

// server: /api/movimento-round su cartelle temporanee e porta casuale
const radice = mkdtempSync(join(tmpdir(), 'mutant-a136-'));
let server;
let base;
before(async () => {
  for (const c of ['scene', 'scontri']) mkdirSync(join(radice, c), { recursive: true });
  writeFileSync(join(radice, 'scontri', 's1.json'), JSON.stringify({ id: 's1', stato: 'aperto', round: 2, revisione: 1, partecipanti: [] }));
  writeFileSync(join(radice, 'scene', 'prova.json'), JSON.stringify(scena([{ costo: 2, fascia: 'passo' }, { costo: 16, fascia: 'scatto' }])));
  server = creaServer({ cartella: join(radice, 'personaggi'), tavolo: join(radice, 'tavolo'), scontri: join(radice, 'scontri'), nemici: join(radice, 'nemici'), veicoli: join(radice, 'veicoli'), scene: join(radice, 'scene'), mappe: join(radice, 'mappe') });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

test('A.136, server: /api/movimento-round dice fascia, Passo diventato blocco, Q e Round; niente altro della scena', async () => {
  const j = await (await fetch(`${base}/api/movimento-round?scontro=s1&partecipante=pg%3Alucas`)).json();
  assert.deepEqual(j, { fascia: 'scatto', daPasso: true, q: 18, round: 2, scena: 'prova' });
  const n = await (await fetch(`${base}/api/movimento-round?scontro=s1&partecipante=n1`)).json();
  assert.equal(n.fascia, null);
  assert.equal((await fetch(`${base}/api/movimento-round?scontro=nessuno&partecipante=n1`)).status, 404);
  assert.equal((await fetch(`${base}/api/movimento-round?scontro=s1`)).status, 400);
});

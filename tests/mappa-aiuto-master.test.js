// A.122 (risposta di Davide dell'08/10/2026): l'Aiuto-master. Il Direttore lo assegna a un tablet collegato e lo revoca;
// uno alla volta; muove solo il PG del turno attivo, con gli stessi controlli del tablet del giocatore; vede la mappa
// dei giocatori; il server rifiuta ogni altra modifica; ogni suo movimento va nel registro; il ruolo si perde alla fine
// dello scontro. Cartelle temporanee e porta casuale.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { daBase64, inBase64, rettangolo } from '../src/mappa/celle.js';
import { nuovoScontro, aggiungiNemici, registraTiro, chiudi, diTurno, ordineIniziativa } from '../src/scontro.js';
import { serializza } from '../src/character.js';
import { rifiutoAiuto, assegnaAiuto, ruoloValido, ruoloDopoScontro, eAiuto, pgDaMuovere, INTESTAZIONE } from '../src/mappa/aiuto-master.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-aiuto-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
let server, base, scenaIniziale, scontroIniziale;
const SCENA = join(radice, 'scene', 'cripta.json');
const SCONTRO = join(radice, 'scontri', 'scontro-prova.json');
const leggiScena = () => JSON.parse(readFileSync(SCENA, 'utf8'));
const leggiScontro = () => JSON.parse(readFileSync(SCONTRO, 'utf8'));
const ripristina = () => { writeFileSync(SCENA, scenaIniziale); writeFileSync(SCONTRO, scontroIniziale); rmSync(join(radice, 'scontri', 'archivio'), { recursive: true, force: true }); };

// Akira di turno, poi Bea; due predoni (l'1 nascosto). Mappa lunga 30 Q, nebbia sulle colonne 27–29, un muro in [4, 0].
before(async () => {
  for (const d of Object.values(c)) mkdirSync(d, { recursive: true });
  for (const nome of ['Akira', 'Bea']) {
    const pg = structuredClone(MISHIMA_AGENTE);
    pg.nome = nome;
    writeFileSync(join(c.personaggi, `${nome}_liv1_2026-10-06.json`), serializza(pg));
  }
  const predone = JSON.parse(readFileSync(new URL('../esempi/nemici/predone-delle-lande.json', import.meta.url), 'utf8'));
  let s = nuovoScontro({ id: 'scontro-prova', nome: 'Prova', pg: [{ chiave: 'Akira', nome: 'Akira', iniziativa: 9, des: 7, int: 5 }, { chiave: 'Bea', nome: 'Bea', iniziativa: 5, des: 7, int: 5 }] });
  s = aggiungiNemici(s, predone, 2);
  s = registraTiro(s, 'pg:Akira', 'd10', { valore: 10, origine: 'manuale' }, dati);
  s = registraTiro(s, 'pg:Bea', 'd10', { valore: 5, origine: 'manuale' }, dati);
  s = registraTiro(s, 'nem:predone-delle-lande:1', 'd10', { valore: 1, origine: 'manuale' }, dati);
  s = registraTiro(s, 'nem:predone-delle-lande:2', 'd10', { valore: 1, origine: 'manuale' }, dati);
  scontroIniziale = JSON.stringify({ ...s, revisione: 1 });
  const scena = nuovaScena({ id: 'cripta', nome: 'Cripta', colonne: 30, righe: 6, nebbia: 'scoperta', dati });
  scena.nebbia.coperti = inBase64(rettangolo(daBase64(scena.nebbia.coperti), 30, 6, 27, 0, 29, 5, true));
  scena.muri = inBase64(rettangolo(daBase64(scena.muri), 30, 6, 4, 0, 4, 0, true));
  scena.collegamento = { scontro: 'scontro-prova', bozza: null };
  scena.token = [
    { id: 't-akira', rif: { tipo: 'partecipante', id: 'pg:Akira' }, q: [1, 1], ingombro: 1, nascosto: false },
    { id: 't-bea', rif: { tipo: 'partecipante', id: 'pg:Bea' }, q: [5, 4], ingombro: 1, nascosto: false },
    { id: 't-p1', rif: { tipo: 'partecipante', id: 'nem:predone-delle-lande:1' }, q: [3, 4], ingombro: 1, nascosto: true },
    { id: 't-p2', rif: { tipo: 'partecipante', id: 'nem:predone-delle-lande:2' }, q: [2, 2], ingombro: 1, nascosto: false },
  ];
  scenaIniziale = JSON.stringify({ ...scena, revisione: 1, aggiornato: '2026-10-08T20:00:00.000Z' });
  ripristina();
  server = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections?.();
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

const vista = async (pg) => (await fetch(`${base}/api/vista-giocatori?pg=${encodeURIComponent(pg)}`)).json();
const elenco = async () => (await fetch(`${base}/api/tablet`)).json();
const rendi = async (pg, scontro = 'scontro-prova') => { const r = await fetch(`${base}/api/tablet/aiuto-master`, { method: 'POST', body: JSON.stringify({ pg, nome: pg, scontro }) }); return { stato: r.status, ...(await r.json()) }; };
const revoca = () => fetch(`${base}/api/tablet/aiuto-master`, { method: 'DELETE' });
const gettone = async (pg) => (await vista(pg)).aiutoMaster?.gettone;
const muovi = async (corpo, g) => {
  const r = await fetch(`${base}/api/vista-giocatori/movimento`, { method: 'POST', headers: g ? { [INTESTAZIONE]: g } : {}, body: JSON.stringify({ scena: 'cripta', fascia: 1, ...corpo }) });
  return { stato: r.status, ...(await r.json()) };
};

test('assegna e revoca dal Direttore; il tablet lo vede, gli altri no; serve uno scontro aperto', async () => {
  try {
    assert.equal((await elenco()).aiutoMaster, null);
    const r = await rendi('Bea');
    assert.equal(r.stato, 200);
    assert.deepEqual([r.aiutoMaster.chiave, r.aiutoMaster.scontro, r.aiutoMaster.gettone], ['Bea', 'scontro-prova', undefined], 'il Direttore non riceve il gettone');
    assert.equal((await elenco()).aiutoMaster.chiave, 'Bea');
    const vb = await vista('Bea');
    assert.match(vb.aiutoMaster.gettone, /^[0-9a-f]{32}$/);
    assert.deepEqual([vb.aiutoMaster.turno.nome, vb.aiutoMaster.turno.permesso.puo], ['Akira', true], 'il PG del turno attivo, da muovere');
    assert.equal((await vista('Akira')).aiutoMaster, undefined, 'gli altri tablet non lo sono');
    assert.equal((await revoca()).status, 200);
    assert.equal((await elenco()).aiutoMaster, null);
    assert.equal((await vista('Bea')).aiutoMaster, undefined);
    assert.equal((await rendi('Bea', 'non-esiste')).stato, 409, 'senza scontro aperto non si assegna');
  } finally { await revoca(); ripristina(); }
});

test('uno alla volta: assegnarlo a un altro tablet lo toglie al precedente', async () => {
  try {
    await rendi('Bea');
    const vecchio = await gettone('Bea');
    await rendi('Akira');
    assert.equal((await elenco()).aiutoMaster.chiave, 'Akira');
    assert.equal((await vista('Bea')).aiutoMaster, undefined);
    const r = await muovi({ pg: 'Bea', aiuto: vecchio, a: [0, 4] }, vecchio);
    assert.equal(r.stato, 403);
    assert.match(r.errore, /Non sei Aiuto-master/);
  } finally { await revoca(); ripristina(); }
});

test('muove il PG del turno attivo con gli stessi controlli; il registro dice «mosso da Aiuto-master»', async () => {
  try {
    await rendi('Bea');
    const g = await gettone('Bea');
    const p = await muovi({ pg: 'Bea', aiuto: g, a: [0, 4], prova: true }, g);
    assert.deepEqual([p.stato, p.costo], [200, 3]);
    const r = await muovi({ pg: 'Bea', aiuto: g, a: [0, 4], bersaglio: 'Akira' }, g);
    assert.equal(r.stato, 200);
    const s = leggiScena();
    assert.deepEqual(s.token.find((t) => t.id === 't-akira').q, [0, 4], 'Akira si è mosso');
    assert.deepEqual(s.token.find((t) => t.id === 't-bea').q, [5, 4], 'Bea no');
    const riga = leggiScontro().registro.find((x) => x.aiutoMaster);
    assert.match(riga.testo, /^Mappa: Akira mosso da Aiuto-master \(tablet di Bea\): 3 Q \(Passo\)\.$/);
    assert.equal(riga.aiutoMaster.movimento, r.movimento);
    // il tablet del giocatore di turno continua a muovere il proprio PG
    const proprio = await muovi({ pg: 'Akira', a: [0, 5] });
    assert.equal(proprio.stato, 200);
  } finally { await revoca(); ripristina(); }
});

test('PG non di turno rifiutato; con un nemico di turno niente da muovere', async () => {
  try {
    await rendi('Bea');
    const g = await gettone('Bea');
    const r = await muovi({ pg: 'Bea', aiuto: g, a: [5, 3], bersaglio: 'Bea' }, g);
    assert.equal(r.stato, 403);
    assert.match(r.errore, /solo il PG del turno attivo \(Akira\)/);
    // turno di un predone
    const s = leggiScontro();
    const i = ordineIniziativa(s).ordinati.findIndex((x) => x.tipo !== 'pg');
    writeFileSync(SCONTRO, JSON.stringify({ ...s, turno: i }));
    assert.notEqual(diTurno(leggiScontro()).tipo, 'pg');
    const n = await muovi({ pg: 'Bea', aiuto: g, a: [0, 4] }, g);
    assert.equal(n.stato, 422);
    assert.match(n.errore, /Di turno non c’è un PG/);
    assert.equal((await vista('Bea')).aiutoMaster.turno, null);
    assert.deepEqual(leggiScena().token.find((t) => t.id === 't-akira').q, [1, 1]);
  } finally { await revoca(); ripristina(); }
});

test('oltre i limiti: nebbia, muro, quadretto occupato, oltre il movimento; nessuna scrittura', async () => {
  try {
    await rendi('Bea');
    const g = await gettone('Bea');
    const rev = leggiScena().revisione;
    assert.match((await muovi({ pg: 'Bea', aiuto: g, a: [28, 1] }, g)).errore, /nebbia/);
    assert.match((await muovi({ pg: 'Bea', aiuto: g, a: [4, 0] }, g)).errore, /fuori dalla tua area|non è raggiungibile/);
    assert.equal((await muovi({ pg: 'Bea', aiuto: g, a: [2, 2] }, g)).stato, 422, 'quadretto del predone');
    assert.equal(leggiScena().revisione, rev);
    // oltre il movimento del PG (Passo 6, Scatto 18 Q): rifiutato come dal tablet del giocatore
    assert.equal((await muovi({ pg: 'Bea', aiuto: g, a: [15, 1], fascia: 1 }, g)).stato, 422);
    assert.equal((await muovi({ pg: 'Bea', aiuto: g, a: [25, 1], fascia: 3 }, g)).stato, 422);
    assert.equal(leggiScena().revisione, rev);
  } finally { await revoca(); ripristina(); }
});

test('il server rifiuta ogni altra modifica dell’Aiuto-master: scheda, Iniziativa, scena, nemici, ruoli, salvataggi', async () => {
  try {
    await rendi('Bea');
    const g = await gettone('Bea');
    const prova = async (metodo, percorso, corpo = {}) => { const r = await fetch(`${base}${percorso}`, { method: metodo, headers: { [INTESTAZIONE]: g }, body: metodo === 'DELETE' ? undefined : JSON.stringify(corpo) }); return { stato: r.status, ...(await r.json()) }; };
    const scontro = leggiScontro();
    const casi = [
      ['PUT', '/api/scontri/scontro-prova', { ...scontro, turno: 1 }, /scontro \(Iniziativa/],
      ['PUT', '/api/scene/cripta', leggiScena(), /la scena/],
      ['PUT', '/api/personaggi/Akira_liv1_2026-10-06.json', {}, /schede/],
      ['PUT', '/api/nemici/predone', {}, /nemici/],
      ['POST', '/api/tablet/aiuto-master', { pg: 'Bea', scontro: 'scontro-prova' }, /ruoli/],
      ['DELETE', '/api/tablet/aiuto-master', null, /ruoli/],
      ['PUT', '/api/vista-giocatori/scelta', { scena: null }, /la scena/],
      ['POST', '/api/salva-sessione', {}, /Direttore/],
    ];
    for (const [metodo, percorso, corpo, attesa] of casi) {
      const r = await prova(metodo, percorso, corpo);
      assert.equal(r.stato, 403, percorso);
      assert.match(r.errore, /^L’Aiuto-master può soltanto muovere il PG del turno attivo/, percorso);
      assert.match(r.errore, attesa, percorso);
    }
    assert.equal(leggiScontro().revisione, scontro.revisione, 'Iniziativa e turno intatti');
    assert.equal((await elenco()).aiutoMaster.chiave, 'Bea', 'il ruolo resta');
    // le letture passano
    assert.equal((await fetch(`${base}/api/vista-giocatori?pg=Bea`, { headers: { [INTESTAZIONE]: g } })).status, 200);
  } finally { await revoca(); ripristina(); }
});

test('vista dell’Aiuto-master: quella dei giocatori, senza nascosti né note del Direttore', async () => {
  try {
    await rendi('Bea');
    const v = await vista('Bea');
    assert.deepEqual(v.scena.token.map((t) => t.id).sort(), ['t-akira', 't-bea', 't-p2'], 'il predone nascosto non arriva');
    assert.equal(v.aiutoMaster.turno.mini, undefined, 'niente mini-scheda del PG di turno');
    assert.ok(v.aiutoMaster.turno.area, 'area del PG di turno');
    const testo = JSON.stringify(v);
    for (const segreto of ['t-p1', 'predone-delle-lande:1', '"annulla"', '"movimenti"', 'note']) assert.ok(!testo.includes(segreto), segreto);
    // stessa scena della vista giocatori senza ruolo
    assert.deepEqual(v.scena, (await (await fetch(`${base}/api/vista-giocatori`)).json()).scena);
  } finally { await revoca(); ripristina(); }
});

test('il ruolo si perde alla fine dello scontro', async () => {
  try {
    await rendi('Bea');
    const g = await gettone('Bea');
    const r = await fetch(`${base}/api/scontri/scontro-prova`, { method: 'PUT', body: JSON.stringify(chiudi(leggiScontro())) });
    assert.equal(r.status, 200);
    assert.equal((await elenco()).aiutoMaster, null);
    // riaperto lo stesso scontro il ruolo non torna
    ripristina();
    assert.equal((await elenco()).aiutoMaster, null);
    assert.equal((await muovi({ pg: 'Bea', aiuto: g, a: [0, 4] }, g)).stato, 403);
  } finally { await revoca(); ripristina(); }
});

test('funzioni pure: filtro delle richieste, validità, PG da muovere', () => {
  assert.equal(rifiutoAiuto('GET', '/api/scontri/x'), null);
  assert.equal(rifiutoAiuto('POST', '/api/vista-giocatori/movimento'), null);
  assert.equal(rifiutoAiuto('POST', '/api/vista-giocatori/linea'), null);
  assert.equal(rifiutoAiuto('PUT', '/api/veicoli/v1').stato, 403);
  const ruolo = assegnaAiuto({ chiave: 'Bea', nome: 'Bea', scontro: 's1' }, 'g1');
  assert.ok(eAiuto(ruolo, 'Bea', 'g1'));
  assert.ok(!eAiuto(ruolo, 'Bea', 'altro'));
  assert.ok(!eAiuto(ruolo, 'Akira', 'g1'));
  assert.ok(ruoloValido(ruolo, { id: 's1', stato: 'aperto' }));
  assert.ok(!ruoloValido(ruolo, { id: 's2', stato: 'aperto' }));
  assert.equal(ruoloDopoScontro(ruolo, { id: 's1', stato: 'chiuso' }), null);
  assert.equal(ruoloDopoScontro(ruolo, { id: 's2', stato: 'chiuso' }), ruolo);
  assert.equal(pgDaMuovere(null, null).stato, 403);
});

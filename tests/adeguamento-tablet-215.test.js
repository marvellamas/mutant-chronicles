import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 215 — la «Conferma» dell'adeguamento dal lato TABLET (cioè da chi non è il PC del Direttore).
//
// Il difetto che questo test difende, trovato dalla prova generale: tutto era stato provato sul PC del Direttore, dove il server non
// applica le protezioni dei blocchi del master. Dal tablet di un giocatore ogni «Conferma» tornava 403 («I punti Abilità li ha sistemati
// il Direttore»), perché la conferma scrive `puntiDirettore.totale` e la riga del registro: le due cose che un tablet non può toccare.
// Alle nove di sera, con sette persone, sarebbe stato il primo tocco di tutti.
//
// Si prova la strada vera: cartella come quella di Davide, `applica`, server **non master**, PUT del file come lo manda l'app,
// poi si rilegge dal disco. E si provano i NO: la regola non si è allargata a chi prova qualcos'altro.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { controllaPuntiDaTablet } from '../src/sposta-punti.js';
import { statoAssegnazione, assegna, confermaAssegnazione, adeguamentoAperto, confermaAdeguamentoLegittima, MARCA } from '../src/adeguamento-abilita.js';
import { applica, personaggi, stato } from '../tools/adegua-abilita.mjs';
import { cartellaComeDavide } from './cartella-come-davide.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const json = { 'Content-Type': 'application/json' };

/** La bozza completa di un personaggio, come la metterebbe il giocatore: un punto alla volta dove si può. */
function bozzaCompleta(o) {
  let bozza = {};
  for (let k = 0; k < 400; k++) {
    const s = statoAssegnazione(o, bozza, dati);
    if (!s || s.rimasti <= 0) break;
    const a = s.abilita.find((x, i) => !x.motivoPiu && i >= (k % s.abilita.length)) ?? s.abilita.find((x) => !x.motivoPiu);
    if (!a) break;
    bozza = assegna(o, bozza, a.nome, 1, dati);
  }
  return bozza;
}

let serata, srv, base, c;
before(async () => {
  serata = cartellaComeDavide({ escludi: ['Fratello-Anselmo'] });
  const d = dati;
  const esito = await applica({ cartella: serata.cartella, salvataggi: serata.salvataggi, d });
  assert.equal(esito.fatto, true, esito.motivo);
  const radice = serata.base;
  c = Object.fromEntries(['tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(radice, k)]));
  for (const x of Object.values(c)) mkdirSync(x, { recursive: true });
  srv = creaServer({ cartella: serata.cartella, ...c, eMaster: () => false }); // **non** il PC del Direttore
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(async () => { await new Promise((ok) => srv.close(ok)); rmSync(serata.base, { recursive: true, force: true }); });

const vivi = () => personaggi(serata.cartella);
const put = (v, file) => fetch(`${base}/api/personaggi/${encodeURIComponent(v.file)}`, { method: 'PUT', headers: json, body: JSON.stringify(file) });

test('prima del fix era 403: la conferma legittima viola le regole del server per un tablet (il controllo prova qualcosa)', () => {
  const v = vivi()[0]; const o = v.json;
  const e = confermaAssegnazione(o, bozzaCompleta(o), dati);
  assert.equal(e.ok, true);
  const vecchia = controllaPuntiDaTablet(e.file, o, dati);
  assert.equal(vecchia.ok, false, 'senza l\'eccezione la regola dei punti del Direttore rifiuterebbe');
  assert.equal(confermaAdeguamentoLegittima(e.file, o, dati), true, 'e l\'eccezione la riconosce');
});

test('TABLET: la Conferma di tutti e sette, insieme, passa e sul disco ogni adeguamento è chiuso', async () => {
  const lavori = vivi().map((v) => ({ v, e: confermaAssegnazione(v.json, bozzaCompleta(v.json), dati) }));
  assert.equal(lavori.length, 7);
  for (const l of lavori) assert.equal(l.e.ok, true, `${l.v.nome}: ${l.e.motivo}`);
  // in parallelo, come sette tablet che premono insieme
  const risposte = await Promise.all(lavori.map((l) => put(l.v, l.e.file)));
  for (const [i, r] of risposte.entries()) assert.equal(r.status, 200, `${lavori[i].v.nome}: ${await r.text()}`);
  const righe = await stato({ cartella: serata.cartella, d: dati });
  for (const r of righe) assert.equal(r.stato, 'adeguato', `${r.nome}: ${r.testo} (la riga del registro non deve tornare «aperta»)`);
  // i punti stanno davvero sul disco: il monte, per ognuno
  for (const v of vivi()) assert.equal(adeguamentoAperto(v.json, dati), null, `${v.nome} ha ancora un adeguamento aperto`);
});

test('TABLET: una conferma che non è quella legittima non passa — punti che mancano, registro toccato, altro evento', async () => {
  // una cartella nuova: il primo test ha chiuso tutti gli adeguamenti
  const s2 = cartellaComeDavide({ escludi: ['Fratello-Anselmo'], quanti: 3 });
  try {
    assert.equal((await applica({ cartella: s2.cartella, salvataggi: s2.salvataggi, d: dati })).fatto, true);
    const r2 = s2.base;
    const c2 = Object.fromEntries(['tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(r2, k)]));
    for (const x of Object.values(c2)) mkdirSync(x, { recursive: true });
    const srv2 = creaServer({ cartella: s2.cartella, ...c2, eMaster: () => false });
    await new Promise((ok) => srv2.listen(0, '127.0.0.1', ok));
    const b2 = `http://127.0.0.1:${srv2.address().port}`;
    const invia = (v, file) => fetch(`${b2}/api/personaggi/${encodeURIComponent(v.file)}`, { method: 'PUT', headers: json, body: JSON.stringify(file) });
    try {
      const [a, b, d3] = personaggi(s2.cartella);
      // 1. punti che mancano ma la riga già «confermata»: il tablet si chiude l'adeguamento da solo
      const buono = confermaAssegnazione(a.json, bozzaCompleta(a.json), dati).file;
      const ap = adeguamentoAperto(a.json, dati);
      const meno = structuredClone(buono);
      const evento = ap.livello === 1 ? meno.scelte : meno.livelli[ap.livello - 2];
      const campo = ap.livello === 1 ? 'puntiAbilitaLiberi' : 'puntiAbilita';
      const chiave = Object.keys(evento[campo])[0];
      evento[campo][chiave] -= 1; if (!evento[campo][chiave]) delete evento[campo][chiave];
      assert.notDeepEqual(meno, buono, 'il caso di prova deve davvero togliere un punto');
      assert.equal(confermaAdeguamentoLegittima(meno, a.json, dati), false, 'un punto in meno non è la conferma legittima');
      assert.equal((await invia(a, meno)).status, 403);
      // 2. la conferma buona più una correzione scritta di nascosto nel registro del master
      const furbo = structuredClone(buono);
      furbo.correzioni_master = [...(furbo.correzioni_master ?? []), { id: 'x', quando: '2026-11-17T20:00:00Z', chiave: 'pv', etichetta: 'PV +50', tipo: 'numero', numero: 50, motivo: 'm', stato: 'attiva' }];
      assert.equal(confermaAdeguamentoLegittima(furbo, a.json, dati), false, 'una riga in più nel registro non passa');
      // 3. la conferma buona più i punti dell'evento precedente spostati
      const sposta = structuredClone(buono);
      if (ap.livello > 2) {
        const prec = sposta.livelli[ap.livello - 3];
        prec.puntiDirettore = { quando: '2026-11-17T20:00:00Z', motivo: 'io', totale: 99 };
        assert.equal(confermaAdeguamentoLegittima(sposta, a.json, dati), false, 'toccare puntiDirettore di un altro evento non passa');
        assert.equal((await invia(a, sposta)).status, 403);
      }
      // 4. un personaggio SENZA adeguamento aperto non ha conferme legittime
      const gia = personaggi(s2.cartella);
      assert.equal(confermaAdeguamentoLegittima(buono, { ...a.json, correzioni_master: [] }, dati), false, 'senza adeguamento aperto nulla è legittimo');
      assert.ok(gia.length === 3 && b && d3);
      // e la conferma buona passa ancora, dopo tutti questi no
      assert.equal((await invia(a, buono)).status, 200);
    } finally { await new Promise((ok) => srv2.close(ok)); }
  } finally { rmSync(s2.base, { recursive: true, force: true }); }
});

test('il registro del master dal tablet resta protetto: una riga aggiunta da un tablet non entra (il resto della protezione non si è allentato)', async () => {
  const s3 = cartellaComeDavide({ escludi: ['Fratello-Anselmo'], quanti: 1 });
  try {
    assert.equal((await applica({ cartella: s3.cartella, salvataggi: s3.salvataggi, d: dati })).fatto, true);
    const c3 = Object.fromEntries(['tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe', 'px'].map((k) => [k, join(s3.base, k)]));
    for (const x of Object.values(c3)) mkdirSync(x, { recursive: true });
    const srv3 = creaServer({ cartella: s3.cartella, ...c3, eMaster: () => false });
    await new Promise((ok) => srv3.listen(0, '127.0.0.1', ok));
    try {
      const [v] = personaggi(s3.cartella);
      const o = structuredClone(v.json);
      o.correzioni_master = [...o.correzioni_master, { id: 'furbo', quando: '2026-11-17T20:00:00Z', chiave: 'pv', etichetta: 'PV +50', tipo: 'numero', numero: 50, motivo: 'm', stato: 'attiva' }];
      const r = await fetch(`http://127.0.0.1:${srv3.address().port}/api/personaggi/${encodeURIComponent(v.file)}`, { method: 'PUT', headers: json, body: JSON.stringify(o) });
      assert.equal(r.status, 200);
      const disco = JSON.parse(readFileSync(join(s3.cartella, v.file), 'utf8'));
      assert.ok(!disco.correzioni_master.some((x) => x.id === 'furbo'), 'la riga scritta dal tablet è stata tolta dal server');
      assert.ok(disco.correzioni_master.some((x) => x[MARCA] === true), 'e la nota di prima c\'è ancora');
    } finally { await new Promise((ok) => srv3.close(ok)); }
  } finally { rmSync(s3.base, { recursive: true, force: true }); }
});

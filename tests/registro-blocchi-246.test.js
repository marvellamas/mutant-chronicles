import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 246 — IL CONTROLLO CHE IMPEDISCE AI BLOCCHI DI TORNARE.
//
// Lunedì 22/11 l'app ha fermato il tavolo per quaranta minuti. Il lotto 241 ha liberato l'avanzamento togliendo
// quattordici blocchi; il 246 ha fatto il censimento di tutta l'app e ha tolto quelli che giudicano una scelta del
// giocatore (gruppo A). Questo file è ciò che resta a guardia, e vale per i lotti futuri:
//
//   1. ogni modo di fermare qualcuno che si trova nel codice deve essere DICHIARATO in `docs/registro-blocchi.md`;
//   2. nessun blocco dichiarato può essere del gruppo A (quelli sono spariti, e il registro ricorda quali erano);
//   3. un blocco del gruppo A che torna nella stessa funzione fa fallire questo file, perché il suo id ricompare nel
//      censimento e nel registro è fra i «tolti», non fra i vivi;
//   4. il conto scritto in testa al registro deve tornare con quello che si trova: un invariante verde su zero voci ci
//      ha ingannato tre volte in due mesi (lotti 189, 192, 197).
//
// Chi aggiunge un controllo che ferma qualcuno NON deve cancellare la sua riga da qui: deve aggiungerla al registro,
// con il gruppo e il perché, e allora il tavolo saprà che cosa lo ferma e chi l'ha deciso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { censisci, leggiRegistro, MECCANISMI, RADICE } from '../tools/blocchi.mjs';

const trovati = censisci();
const registro = leggiRegistro();
const idTrovati = new Set(trovati.map((x) => x.id));
const idVivi = new Set(registro.vivi.map((x) => x.id));
const idTolti = new Set(registro.tolti.map((x) => x.id));
const dove = (id) => { const x = trovati.find((y) => y.id === id); return x ? `${x.file}:${x.riga} — ${x.codice.slice(0, 90)}` : '(non trovato)'; };

test('OGNI BLOCCO CHE SI TROVA NEL CODICE È DICHIARATO NEL REGISTRO', () => {
  const nuovi = trovati.filter((x) => !idVivi.has(x.id) && !idTolti.has(x.id));
  assert.deepEqual(nuovi.map((x) => `${x.id}  (${x.file}:${x.riga})`), [],
    'blocchi non dichiarati: aggiungi una riga in docs/registro-blocchi.md con il gruppo (B, C, D o E) e il perché.\n' +
    'Se è un blocco che giudica una scelta del giocatore (gruppo A) non si dichiara: si toglie, e diventa un avviso.');
});

test('NESSUN BLOCCO DEL GRUPPO A È TORNATO: quelli tolti dal 246 non si trovano più nel codice', () => {
  const tornati = [...idTolti].filter((id) => idTrovati.has(id));
  assert.deepEqual(tornati.map((id) => `${id}  (${dove(id)})`), [],
    'un blocco del gruppo A è tornato dove era stato tolto: deve restare un avviso con «Procedi comunque».');
});

test('IL REGISTRO NON HA RIGHE MORTE: ogni blocco dichiarato vivo si trova davvero nel codice', () => {
  const spariti = registro.vivi.filter((x) => !idTrovati.has(x.id)).map((x) => x.id);
  assert.deepEqual(spariti, [], 'righe del registro che non corrispondono più a niente: toglile, o correggi l’id');
});

test('IL CONTO IN TESTA AL REGISTRO TORNA (strato per strato e per gruppo)', () => {
  const testo = readFileSync(new URL('../docs/registro-blocchi.md', import.meta.url), 'utf8');
  const conta = (f) => trovati.filter(f).length;
  const atteso = {
    totale: trovati.length,
    pagina: conta((x) => x.strato === 'pagina'),
    motore: conta((x) => x.strato === 'motore'),
    server: conta((x) => x.strato === 'server'),
  };
  for (const [nome, n] of Object.entries(atteso)) {
    const m = new RegExp(`\\b${nome}[^0-9\\n]{0,40}\\*?\\*?(\\d+)`, 'i').exec(testo);
    assert.ok(m, `in testa al registro manca il conto di «${nome}»`);
    assert.equal(Number(m[1]), n, `il conto di «${nome}» nel registro dice ${m?.[1]}, il codice ne ha ${n}`);
  }
  // e i gruppi dichiarati sono quelli che il registro dice di avere. Il conto si legge dal TITOLO della sezione —
  // «## Gruppo C — … (41)» — e non dalla riga della tabella: lì la descrizione può contenere numeri (il lotto 247 ci
  // ha scritto una data) e il controllo si metterebbe a leggere quelli.
  for (const g of ['B', 'C', 'D', 'E']) {
    const n = registro.vivi.filter((x) => x.gruppo === g).length;
    const titolo = testo.split(String.fromCharCode(10)).find((r) => r.startsWith(`## Gruppo ${g} `));
    assert.ok(titolo, `manca il titolo della sezione del gruppo ${g} con il suo conto`);
    const dichiarato = Number(titolo.slice(titolo.lastIndexOf("(") + 1, titolo.lastIndexOf(")")));
    assert.equal(dichiarato, n, `il conto del gruppo ${g} nel titolo dice ${dichiarato}, le righe sono ${n}`);
  }
});

test('IL CENSIMENTO CERCA DAVVERO (se smette di trovare, questo file se ne accorge)', () => {
  // un controllo verde su zero voci non è un controllo: qui si pretende che ogni strato e ogni meccanismo trovino qualcosa
  for (const strato of ['pagina', 'motore', 'server']) {
    assert.ok(trovati.some((x) => x.strato === strato), `lo strato «${strato}» non trova più niente: il censimento è rotto`);
  }
  // i meccanismi che oggi trovano qualcosa devono continuare a trovarlo; due sono rari e lo dichiariamo qui invece di
  // pretenderli: «aria-disabled» e «setAttribute('disabled')» li usa un pulsante solo (l'«Annulla» del lotto 244, che si
  // aggiorna fuori dal disegno) e un controllo verde su zero voci non è un controllo
  const RARI = new Set(['aria-disabled', "setAttribute('disabled')"]);
  for (const [strato, lista] of Object.entries(MECCANISMI)) {
    for (const m of lista) {
      if (RARI.has(m.nome)) continue;
      assert.ok(trovati.some((x) => x.strato === strato && x.meccanismo === m.nome), `il meccanismo «${m.nome}» (${strato}) non trova più niente`);
    }
  }
  assert.ok(trovati.length > 100, `solo ${trovati.length} blocchi: il censimento non sta leggendo i file`);
});

test('IL REGISTRO DICE IL PRINCIPIO, PERCHÉ UNA REGOLA SENZA IL SUO PERCHÉ SI PERDE', () => {
  const testo = readFileSync(new URL('../docs/registro-blocchi.md', import.meta.url), 'utf8');
  assert.match(testo, /avvisa, non blocca|segnala.{0,20}non blocca/i);
  assert.match(testo, /22\/11|quaranta minuti/, 'la sera che ha fatto nascere la regola');
  for (const x of registro.vivi) assert.ok(x.riga.split('|').filter((c) => c.trim()).length >= 5, `riga incompleta nel registro: ${x.id}`);
});

import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 247 — LA GUARDIA DI OGNI LIBERAZIONE: un pulsante liberato deve fare qualcosa, o dirlo.
//
// Nel lotto 246, liberando «Avanti» senza Iniziative tirate, il primo clic lanciava un errore su un elenco vuoto, la
// pagina lo mangiava in silenzio e il Round restava a 1: un pulsante che sembra funzionare e non fa niente è peggio di
// uno spento. Questo file è la guardia che quel giorno non c'era, e vale per le liberazioni future:
//
//   1. il comando liberato, premuto nel caso che prima era vietato, fa davvero quello che promette;
//   2. l'avviso arriva a chi preme (e, dal tablet, passa anche dal server: senza, il giocatore vede un pulsante
//      normale e nessun motivo);
//   3. quello che è stato fatto resta scritto dove il Direttore lo legge;
//   4. un pulsante che resta spento perché non cambierebbe niente dice perché: non è mai muto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pulsanteMuovi } from '../src/round-scontro.js';
import { applicaSpostamento, controllaPuntiDaTablet, avvisiSpostamento } from '../src/sposta-punti.js';
import { permessoMovimento } from '../src/mappa/tablet.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const leggi = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('«Muovi il PG sulla mappa» fuori turno: il pulsante è acceso, dice di chi è il turno, e il clic fa qualcosa', () => {
  const fuori = pulsanteMuovi({ diTurno: false, turnoDi: 'Oshi' });
  assert.equal(fuori.attivo, true, 'non è più spento');
  assert.match(fuori.avviso, /Non è il tuo turno/);
  assert.match(fuori.avviso, /Oshi/, 'l’avviso dice il NOME di chi tocca, non «azione non consentita»');
  const dentro = pulsanteMuovi({ diTurno: true, turnoDi: 'Lucas' });
  assert.equal(dentro.avviso, null, 'al proprio turno nessun avviso');
  // il clic non è una finta: la scheda chiama l'azione, e passa dall'avviso che lascia la riga nello storico
  const tab = leggi('src/ui/tab.js');
  const bottone = /btn-muovi-mappa[\s\S]{0,700}?Muovi il PG sulla mappa/.exec(tab)[0];
  assert.doesNotMatch(bottone, /disabled/, 'niente «disabled»: fuori turno si apre lo stesso');
  assert.match(bottone, /conAvviso\(ctx\.azioni\.storico/, 'il clic lascia la riga nello storico, che il Direttore legge');
  assert.match(bottone, /motivo: p\.avviso/, 'e porta con sé il motivo visto sopra');
});

test('il server dice al tablet che il «no» del turno è una regola, e l’area si calcola lo stesso', () => {
  // senza questo il giocatore apre la mappa e non vede dove andrebbe: un pulsante che finge
  const t = leggi('src/mappa/tablet.js');
  assert.match(t, /if \(!p\.puo && !p\.regola\) return \{ permesso: p, area: null \};/, 'con un «no» che è regola l’area si calcola');
  const s = leggi('server.mjs');
  assert.match(s, /permesso\.regola \? \{ regola: true \}/, 'e il server lo passa al tablet');
  assert.match(s, /avvisi: p\.avvisi \?\? \[\]/, 'come gli avvisi del movimento (lotto 246)');
  assert.match(s, /avvisoNelRegistro\(/, 'un movimento con avviso lascia la sua riga nel registro dello scontro');
});

test('il confine resta: la pedina di un altro non si muove, e un veto del master non è una regola', () => {
  const scena = { griglia: { colonne: 10, righe: 10 }, token: [], nebbia: { coperti: '' }, tablet: { movimento: 'turno' } };
  const senzaPezzo = permessoMovimento({ scena, pezzi: [], chiavePg: 'Nessuno', dati });
  assert.equal(senzaPezzo.puo, false);
  assert.ok(!senzaPezzo.regola, 'un PG che non è nella scena non è una regola da superare: non c’è niente da muovere');
  const bloccato = permessoMovimento({
    scena: { ...scena, bloccaGiocatori: true, token: [{ id: 't', rif: { tipo: 'partecipante', id: 'pg:Io' }, q: [1, 1], ingombro: 1, nascosto: false }] },
    pezzi: [{ chiave: 'partecipante:pg:Io', rif: { tipo: 'partecipante', id: 'pg:Io' }, tipo: 'pg', pg: 'Io', lato: 'pg', movimento: { passo: 6, corsa: 12, scatto: 18 } }],
    chiavePg: 'Io', dati,
  });
  assert.equal(bloccato.puo, false);
  assert.ok(!bloccato.regola, '«il master ha bloccato i movimenti» è un veto suo, non una regola del gioco: resta un no');
});

test('«Sposta i punti» dal tablet: lo spostamento si salva davvero e l’avviso ha i numeri', () => {
  const p = {
    creazione: { corporazione: 'Mishima', addestramento: 'Avventuriero', classe: 'Agente', caratteristiche: { FOR: 6, COS: 6, DES: 7, INT: 5, SAG: 7, CAR: 5 }, puntiAbilitaLiberi: { 'Percezione': 2, 'Tecnologia': 1, 'Cultura': 1, 'Raggirare': 3 } },
    livelli: [],
  };
  const bozza = { 1: { 'Percezione': 1, 'Tecnologia': 1, 'Cultura': 1, 'Raggirare': 4 } };
  const n = applicaSpostamento(p, bozza, dati, { giocatore: true });
  assert.deepEqual(n.creazione.puntiAbilitaLiberi, bozza[1], 'i punti si sono spostati davvero: non è una finta');
  assert.equal(n.creazione.puntiDirettore ?? null, null, 'e il blocco del Direttore non è stato scritto');
  assert.equal(controllaPuntiDaTablet({ scelte: n.creazione, livelli: n.livelli }, { scelte: p.creazione, livelli: p.livelli }, dati).ok, true, 'il server lo accetta');
  // l'avviso, quando c'è, porta i numeri (lotto 241): mai «valore non valido»
  const oltre = avvisiSpostamento(p, { 1: { 'Percezione': 7 } }, dati);
  for (const a of oltre) assert.match(a.testo, /\d/, `l’avviso dice i numeri: «${a.testo}»`);
});

test('nessun pulsante muto: quello che resta spento perché non cambierebbe niente dice perché', () => {
  const ui = leggi('src/ui/sposta-punti.js');
  const conferma = /disabled: !modificato\(\)[\s\S]{0,400}?'Conferma'\)/.exec(ui)[0];
  assert.match(conferma, /title: modificato\(\)/, 'la Conferma spenta ha il suo motivo scritto');
  assert.match(conferma, /Nessuno spostamento da confermare/);
});

test('il pannello si apre anche dal dispositivo del giocatore, e il pulsante lo offre', () => {
  const ui = leggi('src/ui/sposta-punti.js');
  assert.match(ui, /ctx\.master\?\.spostaPunti \?\? ctx\.spostaPuntiGiocatore/, 'il pulsante c’è anche per il giocatore');
  const app = leggi('src/ui/app.js');
  assert.match(app, /spostaPuntiGiocatore: inMaster \? null : \{/, 'e la scheda gliene dà l’azione');
  assert.match(app, /applicaSpostamento\(prima, bozza, stato\.dati, \{ quando, giocatore: true \}\)/, 'che non tocca il blocco del Direttore');
  assert.match(app, /registraStorico\(etichetta\)/, 'e lascia la riga nello storico');
});

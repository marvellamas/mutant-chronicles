// «Apri Attacca! con questo bersaglio» dalla linea di tiro (13/10/2026, P4): un tocco dalla linea al pannello già
// pronto, con il bersaglio e la distanza. Niente di automatico in più: il resto lo sceglie il giocatore.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { presetDaLinea, vociDallaMappa, segniMappa } from '../src/dalla-mappa.js';
import { dichiarazioneDistanza } from '../src/attacco.js';
import { lineaPerTablet } from '../src/mappa/tablet.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { inBase64, rettangolo, daBase64 } from '../src/mappa/celle.js';

const { dati } = await datiReali();

test('linea verso un nemico: «Attacca!» con bersaglio e distanza già messi', () => {
  const p = presetDaLinea({ distanza: 8, copertura: 'media', protetto: false, interposta: true, luceMappa: 'penombra', bersaglioId: 'nem:predone:1', bersaglio: 'Predone 1' });
  // il bersaglio dello scontro è già scelto
  assert.equal(p.scelte.bersaglioScontro, 'nem:predone:1');
  assert.equal(p.bersaglio, 'Predone 1');
  // la distanza e il resto arrivano «dalla mappa», ognuno con la sua ✕
  const d = dichiarazioneDistanza(p.scelte);
  assert.equal(d.distanza, 8);
  assert.equal(d.bersaglio.copertura, 'media');
  assert.equal(d.bersaglio.interposta, true);
  assert.deepEqual(vociDallaMappa(p.scelte).map((v) => v.campo).sort(), ['copertura', 'distanza', 'interposta', 'luce']);
  assert.equal(segniMappa(p.scelte).distanza, 'distanza 8 Q');
});

test('con «Mappa semplice» accesa arriva solo la distanza, togliibile con ✕', () => {
  const p = presetDaLinea({ distanza: 12, copertura: 'media', interposta: true, luceMappa: 'penombra', semplice: true, bersaglioId: 'nem:predone:2' });
  assert.equal(p.semplice, true);
  const d = dichiarazioneDistanza(p.scelte);
  assert.equal(d.distanza, 12, 'la distanza è quella della linea');
  assert.equal(d.bersaglio.copertura, 'nessuna', 'Copertura a mano, come sempre con la mappa semplice');
  assert.equal(d.bersaglio.interposta, false);
  assert.equal(p.scelte.luceMappa, undefined);
  assert.deepEqual(vociDallaMappa(p.scelte), [{ campo: 'distanza', testo: 'distanza 12 Q' }], 'solo la distanza, con la sua ✕');
  assert.equal(p.scelte.bersaglioScontro, 'nem:predone:2');
});

test('senza bersaglio (linea verso un quadretto): nessun bersaglio scelto, la distanza sì', () => {
  const p = presetDaLinea({ distanza: 5 });
  assert.equal(p.bersaglioId, null);
  assert.equal('bersaglioScontro' in p.scelte, false);
  assert.equal(dichiarazioneDistanza(p.scelte).distanza, 5);
  // le scelte di prima non si perdono (modalità e Manovre restano)
  const conPrima = presetDaLinea({ distanza: 5 }, { modalita: 'RB', mirato: true });
  assert.deepEqual([conPrima.scelte.modalita, conPrima.scelte.mirato], ['RB', true]);
});

test('la linea del tablet dice chi è il bersaglio nello scontro (per aprire «Attacca!» su di lui)', () => {
  const scena = nuovaScena({ id: 'prova', nome: 'Prova', colonne: 12, righe: 8, nebbia: 'scoperta', dati });
  scena.token = [
    { id: 't-pg', rif: { tipo: 'partecipante', id: 'pg:AKIRA' }, q: [1, 1], ingombro: 1, nascosto: false },
    { id: 't-nem', rif: { tipo: 'partecipante', id: 'nem:predone:1' }, q: [6, 1], ingombro: 1, nascosto: false },
  ];
  const pezzi = [
    { chiave: 'partecipante:pg:AKIRA', rif: { tipo: 'partecipante', id: 'pg:AKIRA' }, tipo: 'pg', pg: 'AKIRA', nome: 'Akira', lato: 'pg' },
    { chiave: 'partecipante:nem:predone:1', rif: { tipo: 'partecipante', id: 'nem:predone:1' }, tipo: 'nemico', nome: 'Predone 1', lato: 'avversario' },
  ];
  const visibili = new Set(['t-pg', 't-nem']);
  const r = lineaPerTablet({ scena, pezzi, chiavePg: 'AKIRA', verso: { token: 't-nem' }, visibili, dati });
  assert.equal(r.ok, true);
  assert.equal(r.bersaglioId, 'nem:predone:1', 'l’id del partecipante, per «Contro un nemico dello scontro»');
  assert.equal(r.nome, 'Predone 1');
  assert.equal(r.distanza, 5);
  // verso un quadretto: nessun bersaglio
  const q = lineaPerTablet({ scena, pezzi, chiavePg: 'AKIRA', verso: { q: [4, 4] }, visibili, dati });
  assert.equal(q.ok, true);
  assert.equal(q.bersaglioId, null);
  // con «Mappa semplice» la linea dà solo la distanza
  const semplice = lineaPerTablet({ scena: { ...scena, semplice: true }, pezzi, chiavePg: 'AKIRA', verso: { token: 't-nem' }, visibili, dati });
  assert.equal(semplice.semplice, true);
  assert.equal(semplice.distanza, 5);
  assert.equal(semplice.bersaglioId, 'nem:predone:1');
  assert.equal(semplice.luce, null);
  // il preset che ne esce
  const p = presetDaLinea({ ...semplice, luceMappa: semplice.luce, bersaglio: semplice.nome });
  assert.deepEqual(vociDallaMappa(p.scelte), [{ campo: 'distanza', testo: 'distanza 5 Q' }]);
});

test('tablet: «Attacca questo bersaglio» solo al proprio turno, altrimenti spento con il motivo', () => {
  const g = readFileSync(new URL('../src/ui/mappa/giocatori.js', import.meta.url), 'utf8');
  // il pulsante c'è, sotto il risultato della linea
  assert.match(g, /'🎯 Attacca questo bersaglio'/);
  assert.match(g, /const puoAttaccare = !!st\.io\?\.permesso\?\.puo;/, 'stesso criterio di «Muovi il PG»');
  assert.match(g, /disabled: !puoAttaccare \|\| st\.linea\.copertura === 'totale'/);
  assert.match(g, /const motivoAttacco = st\.linea\?\.copertura === 'totale' \? 'Copertura Totale[^']*' : st\.io\?\.permesso\?\.motivo \?\? 'Non è il tuo turno\.'/);
  // apre la propria scheda con il preset in sessionStorage (come fa il master dalla mappa)
  assert.match(g, /function attaccaDallaLinea\(\)/);
  assert.match(g, /sessionStorage\.setItem\(CHIAVE_DALLA_MAPPA/);
  assert.match(g, /tornaAllaScheda\(\);/);
  assert.match(g, /bersaglioId: pre\.bersaglioId/);
});

test('master dalla mappa: «Attacca questo bersaglio» per i PG e, dai nemici, il tiro della plancia', () => {
  const p = readFileSync(new URL('../src/ui/mappa/pagina.js', import.meta.url), 'utf8');
  // niente più «Apri la scheda di X per Attacca!»: il pulsante porta già il bersaglio
  assert.doesNotMatch(p, /Apri la scheda di \$\{nomeDa\} per «Attacca!»/);
  assert.equal((p.match(/Attacca questo bersaglio/g) ?? []).length, 4, 'due casi (mappa semplice e completa), PG e nemico');
  // dal nemico: la plancia, con il bersaglio della linea per primo
  assert.match(p, /st\.planciaBarra\.attaccaContro\(idDaS, idAS, presetS\.scelte\)/);
  assert.match(p, /st\.planciaBarra\.attaccaContro\(idDa, idA, preset\)/);
  const t = readFileSync(new URL('../src/ui/tavolo.js', import.meta.url), 'utf8');
  assert.match(t, /bersagli\.sort\(\(a, b\) => \(b\.id === idContro\) - \(a\.id === idContro\)\);/, 'il bersaglio della linea è il primo');
  // con «Mappa semplice» il preset porta solo la distanza
  assert.match(p, /const presetS = presetDaLinea\(\{ distanza: r\.distanza, semplice: true, bersaglioId: idAS \?\? null, bersaglio: nomeA \}\)/);
});

test('la scheda, aperta dalla linea, trova bersaglio e distanza (e con mappa semplice solo la distanza)', () => {
  const a = readFileSync(new URL('../src/ui/attacco.js', import.meta.url), 'utf8');
  assert.match(a, /const v = p\.soloBersaglio \? \{ \.\.\.salvate, \.\.\.\(p\.bersaglioId \? \{ bersaglioScontro: p\.bersaglioId \} : \{\}\) \} : presetDaLinea\(p, salvate\)\.scelte;/);
  assert.match(a, /Mappa semplice: Copertura e luce a mano/);
});

test('il preset si legge senza consumarlo, e solo per il proprio PG entro 10 minuti', async () => {
  const memoria = new Map();
  globalThis.sessionStorage = { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, v), removeItem: (k) => memoria.delete(k) };
  const { presetInAttesa, CHIAVE_DALLA_MAPPA } = await import('../src/ui/attacco.js');
  memoria.set(CHIAVE_DALLA_MAPPA, JSON.stringify({ nome: 'Bea', distanza: 9, bersaglioId: 'nem:predone:2', quando: Date.now() }));
  assert.equal(presetInAttesa('bea ')?.distanza, 9, 'il nome si confronta senza spazi né maiuscole');
  assert.ok(memoria.has(CHIAVE_DALLA_MAPPA), 'leggerlo non lo consuma: lo consuma il pannello «Attacca!»');
  assert.equal(presetInAttesa('Akira'), null, 'il preset di un altro PG non vale');
  memoria.set(CHIAVE_DALLA_MAPPA, JSON.stringify({ nome: 'Bea', distanza: 9, quando: Date.now() - 11 * 60 * 1000 }));
  assert.equal(presetInAttesa('Bea'), null, 'dopo 10 minuti non vale più');
  delete globalThis.sessionStorage;
});

test('la scheda aperta dalla linea si mette sul Combattimento con «Attacca!» aperto (un tocco solo)', () => {
  const t = readFileSync(new URL('../src/ui/tab.js', import.meta.url), 'utf8');
  assert.match(t, /function apriDallaLineaDiTiro\(ctx\)/);
  assert.match(t, /apriDallaLineaDiTiro\(ctx\);/, 'chiamata all’inizio di renderTab');
  assert.match(t, /ctx\.ui\.lineaVista = p\.quando;/, 'una volta sola: niente giri a vuoto');
  assert.match(t, /const arma = \(\(p\.distanza \?\? 0\) > 1 \? armi\.find\(\(a\) => a\.gittataQ\) : null\) \?\? armi\[0\];/);
  assert.match(t, /ctx\.azioni\.vaiTab\('combattimento'\);/);
});

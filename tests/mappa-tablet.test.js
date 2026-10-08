// Fase 2, lotto 7: tablet dei giocatori. Permessi (solo il proprio PG, solo al proprio turno o «sempre», blocco del
// master), movimento rifatto dal server (illegale rifiutato), segreti (area e avvisi senza ciò che non si vede),
// Attacchi di Opportunità nel registro, Ctrl+Z del master, notifiche instradate al tablet giusto. Cartelle temporanee
// e porta casuale.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { datiReali } from './helpers.js';
import { nuovaScena } from '../src/mappa/scena.js';
import { daBase64, inBase64, rettangolo } from '../src/mappa/celle.js';
import { nuovoScontro, aggiungiNemici, registraTiro } from '../src/scontro.js';
import { serializza } from '../src/character.js';
import { annullaUltima } from '../src/mappa/annulla.js';
import { permessoMovimento, provaMovimento, impostazioniTablet } from '../src/mappa/tablet.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-tablet-'));
const c = Object.fromEntries(['personaggi', 'tavolo', 'scontri', 'nemici', 'veicoli', 'scene', 'mappe'].map((k) => [k, join(radice, k)]));
let server, base;
const SCENA = join(radice, 'scene', 'cripta.json');
const SCONTRO = join(radice, 'scontri', 'scontro-prova.json');
const leggiScena = () => JSON.parse(readFileSync(SCENA, 'utf8'));
const scriviScena = (f) => { const s = leggiScena(); writeFileSync(SCENA, JSON.stringify(f(s))); };

// due PG (Akira di turno, Bea dopo), due predoni: il 2 visibile accanto ad Akira, l'1 nascosto. Nebbia sulle colonne 7–9,
// un muro in [4, 0].
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
  writeFileSync(SCONTRO, JSON.stringify({ ...s, revisione: 1 }));
  const scena = nuovaScena({ id: 'cripta', nome: 'Cripta', colonne: 10, righe: 6, nebbia: 'scoperta', dati });
  scena.nebbia.coperti = inBase64(rettangolo(daBase64(scena.nebbia.coperti), 10, 6, 7, 0, 9, 5, true));
  scena.muri = inBase64(rettangolo(daBase64(scena.muri), 10, 6, 4, 0, 4, 0, true));
  scena.collegamento = { scontro: 'scontro-prova', bozza: null };
  scena.token = [
    { id: 't-akira', rif: { tipo: 'partecipante', id: 'pg:Akira' }, q: [1, 1], ingombro: 1, nascosto: false },
    { id: 't-bea', rif: { tipo: 'partecipante', id: 'pg:Bea' }, q: [5, 4], ingombro: 1, nascosto: false },
    { id: 't-p1', rif: { tipo: 'partecipante', id: 'nem:predone-delle-lande:1' }, q: [3, 4], ingombro: 1, nascosto: true },
    { id: 't-p2', rif: { tipo: 'partecipante', id: 'nem:predone-delle-lande:2' }, q: [2, 2], ingombro: 1, nascosto: false },
  ];
  writeFileSync(SCENA, JSON.stringify({ ...scena, revisione: 1, aggiornato: '2026-10-08T20:00:00.000Z' }));
  server = creaServer({ cartella: c.personaggi, tavolo: c.tavolo, scontri: c.scontri, nemici: c.nemici, veicoli: c.veicoli, scene: c.scene, mappe: c.mappe });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections?.();
  await new Promise((ok) => server.close(ok));
  rmSync(radice, { recursive: true, force: true });
});

const vista = async (pg) => (await fetch(`${base}/api/vista-giocatori${pg ? `?pg=${encodeURIComponent(pg)}` : ''}`)).json();
const muovi = async (corpo) => { const r = await fetch(`${base}/api/vista-giocatori/movimento`, { method: 'POST', body: JSON.stringify({ scena: 'cripta', fascia: 1, ...corpo }) }); return { stato: r.status, ...(await r.json()) }; };

test('«Sono…»: i PG della scena e il blocco del proprio PG (mini-scheda, permesso, area), senza segreti', async () => {
  const v = await vista('Akira');
  assert.deepEqual(v.pgs.map((p) => p.chiave), ['Akira', 'Bea']);
  assert.equal(v.io.nome, 'Akira');
  assert.equal(v.io.token, 't-akira');
  assert.equal(v.io.permesso.puo, true);
  assert.ok(v.io.mini.pv.massimo > 0 && v.io.mini.pm.massimo > 0, 'PV e PM del proprio PG');
  assert.equal(v.io.area.maschere.length, 3);
  assert.equal(v.io.impostazioni.movimento, 'turno');
  // nessun Q sotto la nebbia nell'area
  const C = 10;
  const maschere = v.io.area.maschere.map(daBase64);
  const area = maschere[0].map((b, i) => b | maschere[1][i] | maschere[2][i]);
  for (let i = 0; i < 60; i++) if (i % C >= 7) assert.equal(area[i >> 3] & (1 << (i & 7)), 0, `Q ${i} sotto la nebbia`);
  // il predone nascosto non c'è, nemmeno come buco nell'area: [3, 4] è nell'area mostrata
  const i34 = 4 * C + 3;
  assert.ok(area[i34 >> 3] & (1 << (i34 & 7)), 'il Q del nascosto non fa buco');
  assert.ok(!JSON.stringify(v).includes('predone-delle-lande:1'));
  // senza ?pg nessun blocco io
  assert.equal((await vista()).io, undefined);
});

test('permessi: solo il proprio PG, solo al proprio turno (Bea aspetta), e il server rifiuta', async () => {
  const v = await vista('Bea');
  assert.equal(v.io.permesso.puo, false);
  assert.match(v.io.permesso.motivo, /Non è il tuo turno/);
  const r = await muovi({ pg: 'Bea', a: [5, 3] });
  assert.equal(r.stato, 422);
  assert.match(r.errore, /Non è il tuo turno/);
  assert.deepEqual(leggiScena().token.find((t) => t.id === 't-bea').q, [5, 4], 'Bea non si è mossa');
  // un PG che non c'è
  const x = await muovi({ pg: 'Nessuno', a: [5, 3] });
  assert.equal(x.stato, 422);
  assert.match(x.errore, /non è in questa scena/);
});

test('movimento illegale rifiutato dal server: troppo lontano, nella nebbia, in un muro, fascia sbagliata', async () => {
  const rev = leggiScena().revisione;
  assert.match((await muovi({ pg: 'Akira', a: [8, 1] })).errore, /nebbia/);
  assert.match((await muovi({ pg: 'Akira', a: [4, 0] })).errore, /fuori dalla tua area|non è raggiungibile/);
  assert.match((await muovi({ pg: 'Akira', a: [99, 1] })).errore, /nebbia|non valido/);
  assert.match((await muovi({ pg: 'Akira', a: [1, 1] })).errore, /già lì/);
  assert.match((await muovi({ pg: 'Akira', a: 'qui' })).errore, /non valido/);
  // oltre il Passo ma entro la Corsa: serve la Corsa
  const { dati: d } = await datiReali();
  const passo = (await vista('Akira')).io.mini.movimento.passo;
  if (passo < 6) assert.match((await muovi({ pg: 'Akira', a: [6, 5], fascia: 1 })).errore, /richiede Corsa|fuori/);
  assert.equal(leggiScena().revisione, rev, 'nessuna scrittura');
  assert.ok(d);
});

test('prova e movimento legale: percorso e costo, poi scena scritta con la voce per Ctrl+Z; ZoC nel registro', async () => {
  const p = await muovi({ pg: 'Akira', a: [0, 4], prova: true });
  assert.equal(p.stato, 200);
  assert.equal(p.costo, 3);
  assert.equal(p.fascia, 'passo');
  assert.deepEqual(p.opportunita, [{ nome: 'Predone delle Lande 2' }], 'esce dalla ZoC del predone visibile');
  assert.equal(leggiScena().token.find((t) => t.id === 't-akira').q.join(), '1,1', 'la prova non scrive');
  const rev = leggiScena().revisione;
  const r = await muovi({ pg: 'Akira', a: [0, 4] });
  assert.equal(r.stato, 200);
  const s = leggiScena();
  assert.equal(s.revisione, rev + 1);
  assert.deepEqual(s.token.find((t) => t.id === 't-akira').q, [0, 4]);
  const mov = s.movimenti.at(-1);
  assert.equal(mov.tablet, 'Akira');
  assert.equal(mov.costo, 3);
  assert.equal(mov.scontro, 'scontro-prova');
  assert.equal(s.annulla.at(-1).tipo, 'movimento');
  // l'Attacco di Opportunità nel registro dello scontro, con l'id del movimento (il master lo ritira annullando)
  const sc = JSON.parse(readFileSync(SCONTRO, 'utf8'));
  const riga = sc.registro.find((x) => x.opportunita);
  assert.equal(riga.opportunita.da, 'nem:predone-delle-lande:2');
  assert.equal(riga.opportunita.movimento, mov.id);
  // Ctrl+Z del master: il token torna dov'era
  const u = annullaUltima(s);
  assert.equal(u.testo, 'movimento');
  assert.deepEqual(u.scena.token.find((t) => t.id === 't-akira').q, [1, 1]);
  // il master vede che la scena è cambiata
  assert.deepEqual(await (await fetch(`${base}/api/scene/cripta?revisione=${s.revisione}`)).json(), { invariata: true, revisione: s.revisione });
  assert.equal((await (await fetch(`${base}/api/scene/cripta?revisione=${rev}`)).json()).revisione, s.revisione);
  // il Passo restante si divide (A.129): ancora un passo legale, poi oltre il Passo no
  const v = await vista('Akira');
  assert.equal(v.io.area.usato, 3);
});

test('blocco del master: i tablet vedono ma non muovono, e lo sanno', async () => {
  scriviScena((s) => ({ ...s, bloccaGiocatori: true }));
  const v = await vista('Akira');
  assert.equal(v.io.permesso.puo, false);
  assert.equal(v.io.impostazioni.bloccato, true);
  assert.match(v.io.permesso.motivo, /bloccato/);
  const r = await muovi({ pg: 'Akira', a: [0, 5] });
  assert.equal(r.stato, 422);
  assert.match(r.errore, /bloccato/);
  scriviScena((s) => { const { bloccaGiocatori, ...resto } = s; return resto; });
});

test('«sempre» (scelta del master): anche fuori turno; un ostacolo che non si vede si scopre solo urtandolo', async () => {
  scriviScena((s) => ({ ...s, tablet: { movimento: 'sempre' } }));
  assert.equal((await vista('Bea')).io.permesso.puo, true);
  // [3, 4] sembra libero a Bea, ma c'è il predone nascosto
  const r = await muovi({ pg: 'Bea', a: [3, 4] });
  assert.equal(r.stato, 422);
  assert.match(r.errore, /qualcosa che non vedi/);
  assert.ok(!JSON.stringify(r).includes('redone'), 'nessun nome del nascosto');
  const ok = await muovi({ pg: 'Bea', a: [5, 3] });
  assert.equal(ok.stato, 200);
  scriviScena((s) => { const { tablet, ...resto } = s; return resto; });
});

test('funzioni pure: permesso, impostazioni, prova senza scontro', () => {
  const s = leggiScena();
  const pezzi = [{ chiave: 'partecipante:pg:Akira', rif: { tipo: 'partecipante', id: 'pg:Akira' }, tipo: 'pg', pg: 'Akira', lato: 'pg', movimento: { passo: 6, corsa: 12, scatto: 18 } }];
  // senza scontro, al turno: non si muove
  assert.match(permessoMovimento({ scena: s, pezzi, scontro: null, chiavePg: 'Akira', dati }).motivo, /Nessuno scontro/);
  assert.deepEqual(impostazioniTablet({}, dati), { movimento: 'turno', avvisoTurno: false, bloccato: false });
  const sempre = { ...s, tablet: { movimento: 'sempre' } };
  const p = provaMovimento({ scena: sempre, pezzi, scontro: null, chiavePg: 'Akira', a: [1, 5], dati });
  assert.equal(p.ok, true);
  // fascia sbagliata: Akira è in [0, 4]; con un Passo di 2 Q, 4 Q chiedono la Corsa; con la Corsa scelta va
  const lento = [{ ...pezzi[0], movimento: { passo: 2, corsa: 4, scatto: 6 } }];
  assert.match(provaMovimento({ scena: sempre, pezzi: lento, scontro: null, chiavePg: 'Akira', a: [0, 0], fascia: 1, dati }).errore, /richiede Corsa/);
  const corsa = provaMovimento({ scena: sempre, pezzi: lento, scontro: null, chiavePg: 'Akira', a: [0, 0], fascia: 2, dati });
  assert.equal(corsa.fascia, 'corsa');
  assert.equal(corsa.blocco, true, 'la Corsa è un blocco unico (A.129)');
  // a bordo di un veicolo: lo muove il conducente
  const bordo = { ...sempre, token: sempre.token.filter((t) => t.id !== 't-akira').concat([{ id: 'v1', rif: { tipo: 'veicolo', id: 'v1' }, q: [5, 0], ingombro: [2, 1], nascosto: false, passeggeri: [{ rif: { tipo: 'partecipante', id: 'pg:Akira' }, ruolo: 'passeggero' }] }]) };
  assert.match(permessoMovimento({ scena: bordo, pezzi, scontro: null, chiavePg: 'Akira', dati }).motivo, /a bordo/);
});

/** Un flusso di eventi aperto come un tablet: raccoglie il testo finché non lo si chiude. */
function flusso(pg) {
  const ctl = new AbortController();
  const f = { testo: '', chiudi: () => ctl.abort() };
  f.pronto = fetch(`${base}/api/vista-giocatori/diretta?pg=${encodeURIComponent(pg)}`, { signal: ctl.signal }).then(async (r) => {
    const lettore = r.body.getReader();
    const dec = new TextDecoder();
    f.letto = (async () => { try { for (;;) { const { value, done } = await lettore.read(); if (done) break; f.testo += dec.decode(value); } } catch { /* chiuso */ } })();
  });
  return f;
}
const aspetta = (ms) => new Promise((ok) => setTimeout(ok, ms));

test('notifiche: «Chiedi di muovere» arriva solo al tablet di quel PG; il master vede chi è collegato', async () => {
  const a = flusso('Akira'), b = flusso('Bea');
  await Promise.all([a.pronto, b.pronto]);
  await aspetta(100);
  const collegati = (await (await fetch(`${base}/api/tablet`)).json()).collegati;
  assert.deepEqual([...collegati].sort(), ['Akira', 'Bea']);
  const r = await (await fetch(`${base}/api/tablet/avviso`, { method: 'POST', body: JSON.stringify({ pg: 'Akira', nome: 'Akira', tipo: 'muovi', scontro: 'scontro-prova' }) })).json();
  assert.equal(r.consegnati, 1);
  await aspetta(150);
  assert.match(a.testo, /event: avviso\ndata: \{"tipo":"muovi","testo":"Il master ti chiede di muovere Akira","nome":"Akira","scontro":"scontro-prova"/);
  assert.ok(!b.testo.includes('event: avviso'), 'Bea non riceve l’avviso di Akira');
  // un PG senza tablet: nessuno lo riceve
  assert.equal((await (await fetch(`${base}/api/tablet/avviso`, { method: 'POST', body: JSON.stringify({ pg: 'Carlo' }) })).json()).consegnati, 0);
  a.chiudi(); b.chiudi();
  await aspetta(150);
  // chiuso il flusso, resta «collegato» solo chi ha letto la vista da poco (Akira e Bea l'hanno letta nei test di prima)
  assert.equal((await (await fetch(`${base}/api/tablet/avviso`, { method: 'POST', body: JSON.stringify({ pg: 'Akira' }) })).json()).consegnati, 0);
});

test('validatore: data/mappa.json → tablet e scena.tablet', async () => {
  const { validaDati } = await import('../src/validate.js');
  const { validaScena } = await import('../src/mappa/scena.js');
  const d = structuredClone(dati);
  d.mappa.tablet.movimento_predefinito = 'mai';
  d.mappa.tablet.vibrazione_ms = [5000];
  const errori = validaDati(d).filter((e) => e.file === 'mappa.json').map((e) => e.chiave);
  assert.ok(errori.includes('tablet.movimento_predefinito') && errori.includes('tablet.vibrazione_ms'));
  const s = leggiScena();
  assert.equal(validaScena({ ...s, tablet: { movimento: 'sempre', avvisoTurno: true } }, dati), null);
  assert.match(validaScena({ ...s, tablet: { movimento: 'mai' } }, dati), /tablet\.movimento/);
  assert.match(validaScena({ ...s, tablet: { avvisoTurno: 'sì' } }, dati), /tablet\.avvisoTurno/);
});

test('scritture contemporanee: il salvataggio del master si fonde con il movimento dal tablet, nessuna perdita', async () => {
  scriviScena((s) => ({ ...s, tablet: { movimento: 'sempre' } }));
  try {
    // il master legge la scena, poi cambia il nome e sposta il predone visibile; intanto Bea si muove dal tablet
    const master = await (await fetch(`${base}/api/scene/cripta`)).json();
    const daSalvare = { ...master, nome: 'Cripta del master', token: master.token.map((t) => (t.id === 't-p2' ? { ...t, q: [2, 3] } : t)) };
    const bea = await muovi({ pg: 'Bea', a: [6, 3] });
    assert.equal(bea.stato, 200);
    const r = await fetch(`${base}/api/scene/cripta`, { method: 'PUT', body: JSON.stringify(daSalvare) });
    assert.equal(r.status, 200, 'niente 409: in mezzo c’è solo un movimento dal tablet');
    const fusa = await r.json();
    assert.deepEqual(fusa.fusi, [bea.movimento]);
    const s = leggiScena();
    assert.equal(s.nome, 'Cripta del master', 'la modifica del master resta');
    assert.deepEqual(s.token.find((t) => t.id === 't-p2').q, [2, 3]);
    assert.deepEqual(s.token.find((t) => t.id === 't-bea').q, [6, 3], 'il movimento di Bea resta');
    assert.ok(s.movimenti.some((m) => m.id === bea.movimento && m.tablet === 'Bea'), 'con i Q usati');
    assert.ok(s.annulla.some((v) => v.movimento === bea.movimento), 'e la voce per Ctrl+Z');
    assert.ok(!('fusi' in s), 'il campo della risposta non finisce nel file');

    // insieme davvero: il PUT del master e il POST del tablet partono nello stesso istante
    const m2 = await (await fetch(`${base}/api/scene/cripta`)).json();
    const [put, post] = await Promise.all([
      fetch(`${base}/api/scene/cripta`, { method: 'PUT', body: JSON.stringify({ ...m2, nome: 'Cripta 2' }) }),
      muovi({ pg: 'Bea', a: [6, 4] }),
    ]);
    assert.equal(put.status, 200);
    assert.equal(post.stato, 200);
    const s2 = leggiScena();
    assert.equal(s2.nome, 'Cripta 2');
    assert.deepEqual(s2.token.find((t) => t.id === 't-bea').q, [6, 4]);

    // una modifica d'altra origine (un'altra finestra del master) resta un conflitto: 409 come prima
    const vecchia = await (await fetch(`${base}/api/scene/cripta`)).json();
    assert.equal((await fetch(`${base}/api/scene/cripta`, { method: 'PUT', body: JSON.stringify({ ...vecchia, nome: 'Altra finestra' }) })).status, 200);
    assert.equal((await fetch(`${base}/api/scene/cripta`, { method: 'PUT', body: JSON.stringify({ ...vecchia, nome: 'Persa?' }) })).status, 409);
  } finally {
    scriviScena((s) => { const { tablet, ...resto } = s; return resto; });
  }
});

test('fondiMovimentiTablet: solo posizione, movimento e voce di quel token; niente doppioni', async () => {
  const { fondiMovimentiTablet } = await import('../src/mappa/tablet.js');
  const locale = { token: [{ id: 'a', q: [0, 0] }, { id: 'b', q: [5, 5] }], movimenti: [], annulla: [{ tipo: 'nebbia', tratti: [] }], nome: 'M' };
  const server = { token: [{ id: 'a', q: [2, 0] }, { id: 'b', q: [9, 9] }], movimenti: [{ id: 'm1', token: 'a', a: [2, 0], tablet: 'X' }], annulla: [{ tipo: 'movimento', movimento: 'm1', token: 'a' }], nome: 'S' };
  const f = fondiMovimentiTablet(locale, server, ['m1'], dati);
  assert.deepEqual(f.token, [{ id: 'a', q: [2, 0] }, { id: 'b', q: [5, 5] }]);
  assert.equal(f.nome, 'M');
  assert.equal(f.annulla.length, 2);
  assert.equal(fondiMovimentiTablet(f, server, ['m1'], dati), f, 'già fuso: niente da fare');
  assert.equal(fondiMovimentiTablet({ ...locale, token: [locale.token[1]] }, server, ['m1'], dati).movimenti.length, 0, 'token tolto dal master');
});

test('scheda del PG: «Muovi il PG sulla mappa» solo al proprio turno, con chi è di turno; indirizzo della vista tablet', async () => {
  const { collegamentoScontro, pulsanteMuovi, urlMuovi } = await import('../src/round-scontro.js');
  const sc = JSON.parse(readFileSync(SCONTRO, 'utf8'));
  // di turno Akira (primo nell'ordine): attivo per lui, spento per Bea con «tocca a Akira»
  const akira = collegamentoScontro({ ...sc, turno: 0 }, 'Akira');
  const bea = collegamentoScontro({ ...sc, turno: 0 }, 'Bea');
  assert.deepEqual(pulsanteMuovi(akira), { attivo: true, testo: 'È il tuo turno' });
  assert.deepEqual(pulsanteMuovi(bea), { attivo: false, testo: 'Non è il tuo turno · tocca a Akira' });
  assert.equal(pulsanteMuovi(collegamentoScontro({ ...sc, turno: 1 }, 'Bea')).attivo, true);
  // fuori dallo scontro (o scontro chiuso): nessun riquadro
  assert.equal(pulsanteMuovi(collegamentoScontro({ ...sc, stato: 'chiuso' }, 'Akira')), null);
  assert.equal(pulsanteMuovi(collegamentoScontro(sc, 'Carlo')), null);
  assert.equal(urlMuovi('Pablo Zaion', 'scontro-1', 'abc'), '#/mappa/giocatori?pg=Pablo+Zaion&scontro=scontro-1&scheda=abc');
  // la vista con ?scontro= dice se lo scontro è ancora aperto (alla fine il tablet torna alla scheda)
  const v = await (await fetch(`${base}/api/vista-giocatori?pg=Akira&scontro=scontro-prova`)).json();
  assert.equal(v.scontroAperto, true);
  assert.equal(v.scena.id, 'cripta');
  assert.equal((await (await fetch(`${base}/api/vista-giocatori?pg=Akira&scontro=finito`)).json()).scontroAperto, false);
});

/** Flusso della scheda del PG sul tablet (08/10): solo gli avvisi. */
function flussoScheda(pg) {
  const ctl = new AbortController();
  const f = { testo: '', chiudi: () => ctl.abort() };
  f.pronto = fetch(`${base}/api/tablet/eventi?pg=${encodeURIComponent(pg)}`, { signal: ctl.signal }).then(async (r) => {
    const lettore = r.body.getReader();
    const dec = new TextDecoder();
    (async () => { try { for (;;) { const { value, done } = await lettore.read(); if (done) break; f.testo += dec.decode(value); } } catch { /* chiuso */ } })();
  });
  return f;
}

test('«Chiedi di muovere» arriva anche alla scheda del PG aperta sul tablet, solo a quel PG; la scheda conta come collegata', async () => {
  const sa = flussoScheda('Akira'), sb = flussoScheda('Bea');
  await Promise.all([sa.pronto, sb.pronto]);
  await aspetta(100);
  assert.ok((await (await fetch(`${base}/api/tablet`)).json()).collegati.includes('Bea'));
  const r = await (await fetch(`${base}/api/tablet/avviso`, { method: 'POST', body: JSON.stringify({ pg: 'Bea', nome: 'Bea', tipo: 'muovi', scontro: 'scontro-prova' }) })).json();
  assert.ok(r.consegnati >= 1);
  await aspetta(150);
  assert.match(sb.testo, /"testo":"Il master ti chiede di muovere Bea"/);
  assert.ok(!sa.testo.includes('event: avviso'));
  assert.ok(!sb.testo.includes('event: diretta'), 'la scheda non riceve la diretta della mappa');
  sa.chiudi(); sb.chiudi();
});

test('«Tocca a te» dal server: salvando lo scontro, al PG che diventa di turno, solo con l’avviso acceso nella scena', async () => {
  const sb = flussoScheda('Bea');
  await sb.pronto;
  await aspetta(100);
  const passa = async (turno) => {
    const s = JSON.parse(readFileSync(SCONTRO, 'utf8'));
    const r = await fetch(`${base}/api/scontri/scontro-prova`, { method: 'PUT', body: JSON.stringify({ ...s, turno }) });
    assert.equal(r.status, 200);
    await aspetta(200);
  };
  try {
    await passa(0);
    await passa(1); // tocca a Bea, ma l'avviso è spento
    assert.ok(!sb.testo.includes('event: avviso'), 'spento: nessun avviso');
    await passa(0);
    scriviScena((s) => ({ ...s, tablet: { avvisoTurno: true } }));
    await passa(1);
    assert.match(sb.testo, /"tipo":"turno","testo":"Tocca a te, Bea!"/);
  } finally {
    scriviScena((s) => { const { tablet, ...resto } = s; return resto; });
    await passa(0);
    sb.chiudi();
  }
});

test('«Fine scontro» (stesso effetto della plancia): lo scontro va in archivio, il tablet aperto dalla scheda lo sa e torna alla scheda', async () => {
  const { chiudi } = await import('../src/scontro.js');
  const prima = JSON.parse(readFileSync(SCONTRO, 'utf8'));
  try {
    assert.equal((await (await fetch(`${base}/api/vista-giocatori?pg=Akira&scontro=scontro-prova`)).json()).scontroAperto, true);
    const r = await fetch(`${base}/api/scontri/scontro-prova`, { method: 'PUT', body: JSON.stringify(chiudi(prima)) });
    assert.equal(r.status, 200);
    assert.ok(readFileSync(join(radice, 'scontri', 'archivio', 'scontro-prova.json'), 'utf8').includes('"chiuso"'));
    const v = await (await fetch(`${base}/api/vista-giocatori?pg=Akira&scontro=scontro-prova`)).json();
    assert.equal(v.scontroAperto, false, 'il tablet torna alla scheda');
    // e il movimento non si può più fare
    assert.equal((await muovi({ pg: 'Akira', a: [1, 2], scontro: 'scontro-prova' })).stato >= 400, true);
  } finally {
    writeFileSync(SCONTRO, JSON.stringify(prima));
    rmSync(join(radice, 'scontri', 'archivio'), { recursive: true, force: true });
  }
});

test('linea di tiro dal tablet: solo quello che il giocatore vede, anche fuori turno, senza scrivere nulla', async () => {
  const { lineaPerTablet } = await import('../src/mappa/tablet.js');
  const s = leggiScena();
  // Bea (fuori turno) verso il predone visibile, con il predone nascosto esattamente in mezzo
  const scena = { ...s, token: s.token.map((t) => (t.id === 't-bea' ? { ...t, q: [1, 4] } : t.id === 't-p1' ? { ...t, q: [3, 4] } : t.id === 't-p2' ? { ...t, q: [5, 4] } : t)) };
  const pezzi = [
    { chiave: 'partecipante:pg:Bea', rif: { tipo: 'partecipante', id: 'pg:Bea' }, tipo: 'pg', pg: 'Bea', lato: 'pg', nome: 'Bea' },
    { chiave: 'partecipante:nem:predone-delle-lande:1', lato: 'avversario', nome: 'Predone 1' },
    { chiave: 'partecipante:nem:predone-delle-lande:2', lato: 'avversario', nome: 'Predone 2' },
  ];
  const tutti = new Set(scena.token.map((t) => t.id));
  const visibili = new Set([...tutti].filter((id) => id !== 't-p1'));
  const master = lineaPerTablet({ scena, pezzi, chiavePg: 'Bea', verso: { token: 't-p2' }, visibili: tutti, dati });
  assert.equal(master.protetto, true, 'con tutti i token il nascosto in mezzo protegge');
  const r = lineaPerTablet({ scena, pezzi, chiavePg: 'Bea', verso: { token: 't-p2' }, visibili, dati });
  assert.equal(r.ok, true);
  assert.equal(r.distanza, 4);
  assert.equal(r.protetto, false, 'il nascosto non conta per il giocatore');
  assert.equal(r.nome, 'Predone 2');
  assert.ok(!JSON.stringify(r).includes('p1') && !JSON.stringify(r).includes('Predone 1'));
  // bersagli che non vede: rifiutati
  assert.match(lineaPerTablet({ scena, pezzi, chiavePg: 'Bea', verso: { token: 't-p1' }, visibili, dati }).errore, /non lo vedi/);
  assert.match(lineaPerTablet({ scena, pezzi, chiavePg: 'Bea', verso: { q: [8, 1] }, visibili, dati }).errore, /nebbia/);
  assert.equal(lineaPerTablet({ scena, pezzi, chiavePg: 'Bea', verso: { q: [5, 2] }, visibili, dati }).ok, true, 'verso un quadretto visibile');
  // dal server: fuori turno va, e non scrive la scena
  const rev = leggiScena().revisione;
  const sr = await (await fetch(`${base}/api/vista-giocatori/linea`, { method: 'POST', body: JSON.stringify({ scena: 'cripta', pg: 'Bea', q: [5, 1] }) })).json();
  assert.equal(sr.ok, true);
  assert.ok(Number.isInteger(sr.distanza) && typeof sr.testo === 'string');
  assert.equal(leggiScena().revisione, rev, 'nessuna scrittura');
  const nascosto = await fetch(`${base}/api/vista-giocatori/linea`, { method: 'POST', body: JSON.stringify({ scena: 'cripta', pg: 'Bea', token: 't-p1' }) });
  assert.equal(nascosto.status, 422);
});

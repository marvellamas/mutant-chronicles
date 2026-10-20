// Chi tiene l'originale (20/10/2026): i personaggi veri stanno sul PC del Direttore; ogni altra installazione è una
// copia di lavoro e deve dirlo. Più il rapporto della pulizia che guarda DENTRO i file, non solo le date.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, readdirSync, existsSync, utimesSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { NOME_MARCATORE, TESTO_COPIA, statoInstallazione, fasciaDaMostrare, avvisoSovrascrittura } from '../src/copia-di-lavoro.js';
import { segniDi, rigaSegni, proponiOriginale, ultimaDataCalendario } from '../src/confronto-personaggi.js';
import { CARTELLA_STORICO } from '../src/storico-personaggi.js';
import { rapporto, testoRapporto, sposta } from '../tools/pulizia-personaggi.mjs';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { installaDomFinto, togliDomFinto } from './dom-finto.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const radice = mkdtempSync(join(tmpdir(), 'mutant-copia-'));
const cartella = join(radice, 'personaggi');
let server;
let base;
before(async () => {
  mkdirSync(cartella, { recursive: true });
  server = creaServer({ radice, cartella });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(radice, { recursive: true, force: true }); });

const esempio = readFileSync(new URL('../esempi/Nadia-Ferro_liv4_2026-10-02.json', import.meta.url), 'utf8');
function personaggio({ nome = 'Nadia', pg = 'pg-aaaa1111bbbb2222cccc3333', livelli = null, px = null, sessione = {}, calendario = null } = {}) {
  const p = deserializzaPersonaggio(esempio);
  const { scelte } = normalizza({ ...p.creazione, nome, ...(px === null ? {} : { puntiEsperienza: px }) }, dati);
  return serializza(scelte, { livelli: livelli ?? p.livelli, sessione: { ...p.sessione, ...sessione }, calendario, pg });
}
const ping = async () => (await fetch(`${base}/api/ping`, { cache: 'no-store' })).json();
const marca = (dove, testo) => writeFileSync(join(dove, NOME_MARCATORE), testo);
const smarca = (dove) => { try { unlinkSync(join(dove, NOME_MARCATORE)); } catch { /* non c'era */ } };

// ---------------------------------------------------------------------------
// A. l'app dice su quale installazione sta girando

test('senza marcatore il server non dice niente: sul PC del Direttore nessun rumore', async () => {
  smarca(radice);
  const p = await ping();
  assert.equal(p.copiaDiLavoro, undefined);
  assert.equal(p.notaCopia, undefined);
  assert.equal(fasciaDaMostrare(null), null);
  assert.equal(fasciaDaMostrare({ copiaDiLavoro: false }), null);
  assert.deepEqual(statoInstallazione(null), { copiaDiLavoro: false, nota: '' });
});

test('basta mettere il file COPIA-DI-LAVORO.txt: il server lo dice, con la nota, senza riavviarlo', async () => {
  marca(radice, 'Il portatile di Marcello\nriga che non si legge\n');
  const p = await ping();
  assert.equal(p.copiaDiLavoro, true);
  assert.equal(p.notaCopia, 'Il portatile di Marcello', 'la prima riga è la nota');
  // vale anche dentro personaggi/ (così viaggia nei salvataggi)
  smarca(radice);
  assert.equal((await ping()).copiaDiLavoro, undefined, 'tolto il file, l’avviso sparisce');
  marca(cartella, 'copia nella cartella dei personaggi');
  assert.equal((await ping()).copiaDiLavoro, true);
  assert.equal((await ping()).notaCopia, 'copia nella cartella dei personaggi');
  smarca(cartella);
  // un file vuoto marca lo stesso (nota vuota): il file c'è, tanto basta
  marca(radice, '');
  assert.equal((await ping()).copiaDiLavoro, true);
  assert.equal((await ping()).notaCopia, '');
  smarca(radice);
});

test('la riga compare in cima al documento, una volta sola, e si legge da un metro', async () => {
  const doc = installaDomFinto();
  try {
    const { montaFasciaCopia } = await import('../src/ui/copia-di-lavoro.js');
    assert.equal(montaFasciaCopia(null), null, 'senza marcatore non si monta niente');
    assert.equal(doc.body.children.length, 0);
    const el = montaFasciaCopia({ copiaDiLavoro: true, nota: 'il portatile di Marcello' }, { documento: doc });
    assert.ok(el);
    assert.equal(el.id, 'fascia-copia-di-lavoro');
    assert.match(el.textContent, /Copia di lavoro — i personaggi veri sono sul PC del Direttore/);
    assert.match(el.textContent, /il portatile di Marcello/);
    assert.equal(doc.body.children[0], el, 'sta in cima al documento, prima di tutto il resto');
    // una volta sola: un secondo montaggio restituisce la stessa riga
    assert.equal(montaFasciaCopia({ copiaDiLavoro: true, nota: 'x' }, { documento: doc }), el);
    assert.equal(doc.body.children.filter((c) => c.id === 'fascia-copia-di-lavoro').length, 1);
  } finally { togliDomFinto(); }
});

test('la riga sta fuori dalla radice dell’app: vale per scheda, Tavolo, plancia, mappa e tablet dei giocatori', () => {
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  // montata una volta all'avvio, non dentro una pagina: tutte le pagine passano da qui (è una sola applicazione)
  assert.match(app, /if \(stato\.cartella\) montaFasciaCopia\(await leggiStatoInstallazione\(\)\);/);
  const ui = readFileSync(new URL('../src/ui/copia-di-lavoro.js', import.meta.url), 'utf8');
  assert.match(ui, /documento\.body\.prepend\(el\)/, 'in cima al body, non dentro #app che si svuota a ogni pagina');
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  const regola = /\.fascia-copia-di-lavoro \{([^}]*)\}/.exec(css)[1];
  assert.match(regola, /position: sticky/);
  assert.match(regola, /font-size: 1\.05rem/);
  assert.match(regola, /background: var\(--attenzione\)/);
  assert.match(css, /@media print \{ \.fascia-copia-di-lavoro \{ display: none; \} \}/);
});

test('prima di sovrascrivere: si dice da dove arrivano i dati e che cosa sostituiscono; da copia a originale serve una conferma scritta', () => {
  const normale = avvisoSovrascrittura({ origine: 'sconosciuta', destinazione: 'copia', che: 'le cartelle di gioco', daDove: 'sessione_2026-10-20.zip' });
  assert.equal(normale.livello, 'avviso');
  assert.equal(normale.confermaScritta, null);
  assert.match(normale.righe.join(' '), /sessione_2026-10-20\.zip/);
  assert.match(normale.righe.join(' '), /le cartelle di gioco/);
  assert.match(normale.righe.join(' '), /questa è una copia di lavoro/);
  // il caso pericoloso: dati di una copia di lavoro verso il PC del Direttore
  const forte = avvisoSovrascrittura({ origine: 'copia', destinazione: 'originale', che: 'i personaggi', daDove: 'sessione di Marcello' });
  assert.equal(forte.livello, 'forte');
  assert.equal(forte.confermaScritta, 'SOVRASCRIVI');
  assert.match(forte.titolo, /personaggi veri/);
  assert.match(forte.righe.join(' '), /una copia di lavoro/);
  assert.match(forte.righe.join(' '), /andrebbero perse/);
  // dal PC del Direttore a una copia di lavoro: avviso normale, nessuna conferma scritta
  assert.equal(avvisoSovrascrittura({ origine: 'originale', destinazione: 'copia' }).confermaScritta, null);
});

test('il ripristino legge il marcatore dentro lo zip e lo chiede alla console', () => {
  const rip = readFileSync(new URL('../tools/ripristina.mjs', import.meta.url), 'utf8');
  assert.match(rip, /const marcatore = \(perCartella\.personaggi \?\? \[\]\)\.find\(\(x\) => x\.rel === NOME_MARCATORE\);/);
  assert.match(rip, /origine: da\.copiaDiLavoro \? 'copia' : 'sconosciuta'/);
  const con = readFileSync(new URL('../tools/console.mjs', import.meta.url), 'utf8');
  assert.match(con, /avvisoSovrascrittura\(\{/);
  assert.match(con, /destinazione: qui\.copiaDiLavoro \? 'copia' : 'originale'/);
  assert.match(con, /if \(scritto !== av\.confermaScritta\) \{ console\.log\(' Annullato: non ho toccato nulla\.'\); return; \}/);
});

// ---------------------------------------------------------------------------
// C. il rapporto guarda dentro i file

test('i segni dentro un file: livello, PX, PV, PM, oggetti, crediti, calendario, condizioni', () => {
  const o = JSON.parse(personaggio({ px: 1900, sessione: { pvAttuali: 8, pmAttuali: 26, crediti: 150, ferite: 2, affaticamento: 1, statiAttivi: ['accecato'] } }));
  const g = segniDi(o, { file: 'Nadia_liv4_2026-10-02.json', mtime: 1000 });
  assert.equal(g.livello, 4);
  assert.equal(g.px, 1900);
  assert.equal(g.pv, 8);
  assert.equal(g.pm, 26);
  assert.ok(g.oggetti > 0);
  assert.equal(g.crediti, 150);
  assert.deepEqual([g.ferite, g.affaticamento, g.stati], [2, 1, ['accecato']]);
  const riga = rigaSegni(g, { quando: () => '20/10/26, 09:24' });
  for (const pezzo of ['livello 4', '1900 PX', 'PV 8', 'PM 26', 'oggetti', '150 cr', 'Ferite 2', 'Affaticamento 1', 'Stati: accecato', '20/10/26, 09:24', 'Nadia_liv4_2026-10-02.json']) {
    assert.ok(riga.includes(pezzo), pezzo);
  }
  // il calendario di gioco: la data più avanti fra «oggi» e le note
  assert.equal(ultimaDataCalendario(null), null);
  assert.equal(ultimaDataCalendario({ calendario: { oggi: { data: '0506-03-14' }, note: [{ data: '0506-03-31' }, { data: '0506-02-01' }] } }), '0506-03-31');
  assert.equal(ultimaDataCalendario({ calendario: { oggi: { data: '0506-04-02' }, note: [] } }), '0506-04-02');
  assert.match(rigaSegni(segniDi({ calendario: { oggi: { data: '0506-03-31' }, note: [] } }, { file: 'x', mtime: 0 }), { quando: () => '' }), /calendario al 0506-03-31/);
});

test('la proposta guarda i segni, non la data: con la stessa data vince chi è più avanti', () => {
  const g = (file, extra) => ({ file, mtime: 1000, livello: 6, px: 1900, pv: 10, pm: 5, oggetti: 20, crediti: 0, calendario: null, ferite: 0, affaticamento: 0, stati: [], versioneSalvataggio: null, ...extra });
  // stessa data del file, uno ha il calendario più avanti
  const p1 = proponiOriginale([g('vecchio.json', { calendario: '0506-03-14' }), g('nuovo.json', { calendario: '0506-03-31' })]);
  assert.equal(p1.proposto.file, 'nuovo.json');
  assert.match(p1.motivo, /calendario più avanti/);
  assert.equal(p1.dubbio, null);
  // stessa data, uno ha più PX
  const p2 = proponiOriginale([g('a.json', { px: 1900 }), g('b.json', { px: 2400 })]);
  assert.equal(p2.proposto.file, 'b.json');
  assert.match(p2.motivo, /più PX/);
  // il livello conta più di tutto
  const p3 = proponiOriginale([g('a.json', { livello: 7, px: 100 }), g('b.json', { livello: 6, px: 9999 })]);
  assert.equal(p3.proposto.file, 'a.json');
  // un file solo
  assert.match(proponiOriginale([g('solo.json')]).motivo, /unico file/);
  assert.equal(proponiOriginale([]).proposto, null);
});

test('caso dubbio: segni in disaccordo, o valori e data identici — non si sceglie, lo guarda il Direttore', () => {
  const g = (file, extra) => ({ file, mtime: 1000, livello: 6, px: 1900, pv: 10, pm: 5, oggetti: 20, crediti: 0, calendario: null, ferite: 0, affaticamento: 0, stati: [], versioneSalvataggio: null, ...extra });
  // uno ha più PX, l'altro il calendario più avanti: non si sceglie
  const d = proponiOriginale([g('px.json', { px: 2400, calendario: '0506-03-01' }), g('cal.json', { px: 1900, calendario: '0506-03-31' })]);
  assert.equal(d.proposto, null);
  assert.ok(d.dubbio);
  assert.match(d.dubbio, /calendario più avanti in cal\.json/);
  assert.match(d.dubbio, /più PX in px\.json/);
  assert.match(d.dubbio, /scegli tu/);
  // stessi valori e stessa data: non si distinguono, ma qualcosa si propone (e lo si dichiara)
  const u = proponiOriginale([g('a.json'), g('b.json')]);
  assert.ok(u.dubbio);
  assert.match(u.dubbio, /stessi valori e la stessa data/);
  // stessi valori ma date diverse: si propone il più recente, senza dubbio
  const t = proponiOriginale([g('vecchio.json', { mtime: 1000 }), g('nuovo.json', { mtime: 5000 })]);
  assert.equal(t.proposto.file, 'nuovo.json');
  assert.equal(t.dubbio, null);
  assert.match(t.motivo, /resta la data del file/);
});

test('il rapporto: una riga per file con i segni dentro, la proposta motivata e i casi dubbi dichiarati', async () => {
  const prova = mkdtempSync(join(tmpdir(), 'mutant-rapporto-'));
  const PG = 'pg-dddd4444eeee5555ffff6666';
  const DUB = 'pg-7777aaaa8888bbbb9999cccc';
  // Lucas: due file, il secondo ha il calendario più avanti (ma la stessa data di modifica)
  writeFileSync(join(prova, 'Lucas_liv6_2026-10-04.json'), personaggio({ nome: 'Lucas', pg: PG, px: 1900, calendario: { attivo: true, inizio: '0506-03-01', oggi: { data: '0506-03-14', fascia: 'mattina' }, note: [] } }));
  writeFileSync(join(prova, 'Lucas_liv6_2026-10-20.json'), personaggio({ nome: 'Lucas', pg: PG, px: 1900, calendario: { attivo: true, inizio: '0506-03-01', oggi: { data: '0506-03-31', fascia: 'sera' }, note: [] } }));
  // un dubbio vero: uno ha più PX, l'altro il calendario più avanti
  writeFileSync(join(prova, 'Dubbio_liv6_2026-10-04.json'), personaggio({ nome: 'Dubbio', pg: DUB, px: 2400, calendario: { attivo: true, inizio: '0506-03-01', oggi: { data: '0506-03-01', fascia: 'mattina' }, note: [] } }));
  writeFileSync(join(prova, 'Dubbio_liv6_2026-10-20.json'), personaggio({ nome: 'Dubbio', pg: DUB, px: 1900, calendario: { attivo: true, inizio: '0506-03-01', oggi: { data: '0506-04-10', fascia: 'sera' }, note: [] } }));
  const d = new Date('2026-10-20T09:24:00Z');
  for (const f of readdirSync(prova)) utimesSync(join(prova, f), d, d);

  const r = await rapporto(prova);
  assert.equal(r.totale, 4);
  assert.equal(r.dopo, 2);
  const lucas = r.personaggi.find((p) => p.id === PG);
  assert.equal(lucas.proposto.file, 'Lucas_liv6_2026-10-20.json', 'il calendario più avanti, non la data del file');
  assert.equal(lucas.dubbio, null);
  const dubbio = r.personaggi.find((p) => p.id === DUB);
  assert.equal(dubbio.proposto, null);
  assert.ok(dubbio.dubbio);
  assert.equal(r.dubbi.length, 1);

  const testo = testoRapporto(r);
  assert.match(testo, /calendario al 0506-03-31/);
  assert.match(testo, /Propongo Lucas_liv6_2026-10-20\.json, perché ha il calendario più avanti/);
  assert.match(testo, /⚠ CASO DUBBIO/);
  assert.match(testo, /questo lo guarda il Direttore/);
  assert.match(testo, /Niente è stato toccato/);

  // --sposta: il dubbio non si tocca, e prima di muovere c'è la copia in storico
  const fatti = await sposta(prova, r);
  assert.equal(fatti.length, 1, 'solo il file vecchio di Lucas');
  assert.ok(existsSync(join(prova, 'Dubbio_liv6_2026-10-04.json')), 'il caso dubbio resta dov’è');
  assert.ok(existsSync(join(prova, 'Dubbio_liv6_2026-10-20.json')));
  assert.ok(!existsSync(join(prova, 'Lucas_liv6_2026-10-04.json')));
  assert.equal(readdirSync(join(prova, CARTELLA_STORICO, PG)).length, 1);
  // niente è cancellato: il file spostato si rilegge dallo storico
  const copia = JSON.parse(readFileSync(join(prova, CARTELLA_STORICO, PG, readdirSync(join(prova, CARTELLA_STORICO, PG))[0]), 'utf8'));
  assert.equal(copia.scelte.nome, 'Lucas');
  rmSync(prova, { recursive: true, force: true });
});

test('senza --sposta non si muove niente, e lo strumento lo dice', async () => {
  const prova = mkdtempSync(join(tmpdir(), 'mutant-fermo-'));
  writeFileSync(join(prova, 'Fermo_liv4_2026-10-01.json'), personaggio({ nome: 'Fermo', pg: 'pg-eeee1111ffff2222aaaa3333' }));
  writeFileSync(join(prova, 'Fermo_liv4_2026-10-02.json'), personaggio({ nome: 'Fermo', pg: 'pg-eeee1111ffff2222aaaa3333' }));
  const prima = readdirSync(prova).sort();
  const r = await rapporto(prova);
  assert.match(testoRapporto(r), /Per spostare davvero: node tools\/pulizia-personaggi\.mjs --sposta/);
  assert.deepEqual(readdirSync(prova).sort(), prima, 'il rapporto non tocca niente');
  assert.ok(!existsSync(join(prova, CARTELLA_STORICO)));
  rmSync(prova, { recursive: true, force: true });
});

test('il .bat per il Direttore: stampa il rapporto, lo scrive in un file e chiede SI solo alla fine', () => {
  const bat = readFileSync(new URL('../distribuzione/4_controlla_personaggi.bat', import.meta.url), 'utf8');
  // prima il rapporto (senza --sposta), poi la domanda, e solo dopo lo spostamento
  const iRapporto = bat.indexOf('node tools\\pulizia-personaggi.mjs --su');
  const iDomanda = bat.indexOf('set /p "RISPOSTA=');
  const iSposta = bat.indexOf('--sposta');
  assert.ok(iRapporto > 0 && iDomanda > iRapporto && iSposta > iDomanda, 'rapporto, poi domanda, poi spostamento');
  assert.match(bat, /if \/i not "%RISPOSTA%"=="SI"/, 'si muove solo scrivendo SI');
  assert.match(bat, /non ho toccato niente/);
  assert.match(bat, /chiudi pure questa finestra: non e' stato/, 'chiudendo la finestra non succede niente');
  assert.match(bat, /rapporto-personaggi\.txt/, 'il rapporto finisce anche in un file di testo');
  assert.match(bat, /pause/);
  // viene aggiornato insieme agli altri file del pacchetto
  const avv = readFileSync(new URL('../tools/aggiorna-avviatori.mjs', import.meta.url), 'utf8');
  assert.match(avv, /'4_controlla_personaggi\.bat'/);
});

test('il marcatore non finisce in git: su un’altra installazione sarebbe un avviso falso', () => {
  const ignora = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.match(ignora, /^COPIA-DI-LAVORO\.txt$/m);
  assert.match(ignora, /^personaggi\/COPIA-DI-LAVORO\.txt$/m);
  assert.equal(TESTO_COPIA, 'Copia di lavoro — i personaggi veri sono sul PC del Direttore');
});

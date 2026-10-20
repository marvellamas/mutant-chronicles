// «Un originale solo» (20/10/2026, prima parte della pipeline dei salvataggi): un file per personaggio con un'identità
// stabile, la lista letta dal disco, la scrittura a ogni modifica e le versioni vecchie in `personaggi/storico/`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync, existsSync, mkdirSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaServer } from '../server.mjs';
import { ultimiPerPg, NOME_FILE } from '../src/cartella.js';
import { conMetadati, versioneDi, serveCopia, copieDaTogliere, idPersonaggio, CARTELLA_STORICO, MINUTI_FRA_COPIE } from '../src/storico-personaggi.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { rapporto, testoRapporto, sposta } from '../tools/pulizia-personaggi.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const cartella = mkdtempSync(join(tmpdir(), 'mutant-pipeline-'));
let server;
let base;
before(async () => {
  server = creaServer({ cartella, scontri: join(cartella, '..', 'scontri-prova'), nemici: join(cartella, '..', 'nemici-prova'), veicoli: join(cartella, '..', 'veicoli-prova') });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(cartella, { recursive: true, force: true }); });

const PG = 'pg-1111111111111111aaaa1111';
const ALTRO = 'pg-2222222222222222bbbb2222';
const esempio = readFileSync(new URL('../esempi/Nadia-Ferro_liv4_2026-10-02.json', import.meta.url), 'utf8');

/** Il testo dell'export di un personaggio con questo nome e questo identificativo. */
function testo(nome, pg, extra = {}) {
  const p = deserializzaPersonaggio(esempio);
  const { scelte } = normalizza({ ...p.creazione, nome }, dati);
  const t = serializza(scelte, { livelli: p.livelli, sessione: { ...p.sessione, ...extra }, pg });
  return t;
}
const scrivi = (file, corpo, intestazioni = {}) => fetch(`${base}/api/personaggi/${encodeURIComponent(file)}`, { method: 'PUT', body: corpo, headers: { 'Content-Type': 'application/json', ...intestazioni } });
const elenco = async () => (await fetch(`${base}/api/personaggi`, { cache: 'no-store' })).json();
const suDisco = (file) => JSON.parse(readFileSync(join(cartella, file), 'utf8'));
const fileDi = () => readdirSync(cartella).filter((x) => NOME_FILE.test(x)).sort();
const storicoDi = (id) => (existsSync(join(cartella, CARTELLA_STORICO, id)) ? readdirSync(join(cartella, CARTELLA_STORICO, id)) : []);

// ---------------------------------------------------------------------------
test('identità stabile: l’id non cambia quando il personaggio cambia nome', async () => {
  await scrivi('Nadia_liv4_2026-10-02.json', testo('Nadia', PG));
  await scrivi('Nadia-la-Rossa_liv4_2026-10-02.json', testo('Nadia la Rossa', PG));
  const lista = await elenco();
  const suoi = lista.filter((x) => x.pg === PG);
  assert.equal(suoi.length, 2, 'due file, lo stesso personaggio');
  assert.deepEqual([...new Set(suoi.map((x) => x.pg))], [PG], 'un identificativo solo, qualunque sia il nome');
  // l'identificativo si ricava dal contenuto, con il nome del file come ripiego per i file di prima
  assert.equal(idPersonaggio({ pg: PG }, 'Qualunque'), PG);
  assert.equal(idPersonaggio({}, 'Rhea Valdis'), 'nome-Rhea-Valdis');
  assert.equal(idPersonaggio({}, ''), null);
});

test('un personaggio una volta sola: più file dello stesso PG danno una voce sola, la più recente', async () => {
  const lista = await elenco();
  assert.ok(lista.length >= 2);
  const uno = ultimiPerPg(lista);
  assert.equal(uno.filter((x) => x.pg === PG).length, 1, 'un solo Nadia');
  assert.equal(uno.find((x) => x.pg === PG).file, 'Nadia-la-Rossa_liv4_2026-10-02.json', 'il più recente');
  // un altro personaggio è una voce a sé
  await scrivi('Rhea_liv4_2026-10-02.json', testo('Rhea', ALTRO));
  const due = ultimiPerPg(await elenco());
  assert.equal(due.length, 2);
  assert.deepEqual([...new Set(due.map((x) => x.pg))].sort(), [PG, ALTRO].sort());
  // i file di prima, senza identificativo, si raggruppano per nome come facevano
  const senzaPg = [{ file: 'Dex_liv1_2026-10-01.json', mtime: 10, pg: null }, { file: 'DEX_liv1_2026-10-02.json', mtime: 20, pg: null }];
  assert.deepEqual(ultimiPerPg(senzaPg).map((x) => x.file), ['DEX_liv1_2026-10-02.json']);
  assert.deepEqual(ultimiPerPg([]), []);
});

test('la lista viene dal disco: un file messo a mano nella cartella compare senza che nessuno l’abbia aperto', async () => {
  const prima = (await elenco()).length;
  writeFileSync(join(cartella, 'Torvald_liv6_2026-10-02.json'), testo('Torvald', 'pg-3333333333333333cccc3333'));
  const dopo = await elenco();
  assert.equal(dopo.length, prima + 1, 'la cartella si rilegge a ogni richiesta');
  assert.ok(dopo.some((x) => x.file === 'Torvald_liv6_2026-10-02.json'));
  // e sparisce se il file non c'è più
  rmSync(join(cartella, 'Torvald_liv6_2026-10-02.json'));
  assert.equal((await elenco()).length, prima);
});

test('versione del salvataggio: parte da 1, sale di 1 a ogni scrittura, e dice quando e da chi', async () => {
  const file = 'Conta_liv4_2026-10-02.json';
  await scrivi(file, testo('Conta', 'pg-4444444444444444dddd4444'));
  assert.equal(suDisco(file).versione_salvataggio, 1);
  assert.equal(suDisco(file).aggiornato_da, 'master', 'da 127.0.0.1 è il PC del master');
  assert.match(suDisco(file).aggiornato_il, /^\d{4}-\d\d-\d\dT/);
  await scrivi(file, testo('Conta', 'pg-4444444444444444dddd4444'));
  assert.equal(suDisco(file).versione_salvataggio, 2);
  await scrivi(file, testo('Conta', 'pg-4444444444444444dddd4444'), { 'X-Mutant-Da': 'px' });
  assert.equal(suDisco(file).versione_salvataggio, 3);
  assert.equal(suDisco(file).aggiornato_da, 'px');
  await scrivi(file, testo('Conta', 'pg-4444444444444444dddd4444'), { 'X-Mutant-Da': 'giocatore' });
  assert.equal(suDisco(file).aggiornato_da, 'giocatore');
  // il resto del file non cambia: scelte, livelli, sessione e formato restano quelli dell'export
  const o = suDisco(file);
  assert.equal(o.formato, 'mutant-personaggio');
  assert.equal(o.scelte.nome, 'Conta');
  assert.ok(o.livelli.length >= 1);
});

test('migrazione silenziosa: un file di prima, senza versione né identificativo, si apre e riparte da 1', async () => {
  const file = 'Vecchio_liv4_2026-10-02.json';
  const senza = JSON.parse(testo('Vecchio', 'pg-5555555555555555eeee5555'));
  delete senza.pg;
  writeFileSync(join(cartella, file), JSON.stringify(senza, null, 2));
  // si legge senza errori
  const letto = await (await fetch(`${base}/api/personaggi/${encodeURIComponent(file)}`)).text();
  const p = deserializzaPersonaggio(letto);
  assert.equal(p.creazione.nome, 'Vecchio');
  assert.equal(versioneDi(JSON.parse(letto)), 1, 'senza contatore vale 1');
  // e compare nell'elenco, con pg null
  assert.equal((await elenco()).find((x) => x.file === file).pg, null);
  // la prima riscrittura gli dà la versione 2 e la copia di prima finisce in storico sotto l'id di ripiego
  await scrivi(file, testo('Vecchio', 'pg-5555555555555555eeee5555'));
  assert.equal(suDisco(file).versione_salvataggio, 2);
  assert.equal(storicoDi('nome-Vecchio').length, 1);
});

test('storico: la copia di prima si conserva, una ogni dieci minuti, e nessun elenco la mostra', async () => {
  const file = 'Storia_liv4_2026-10-02.json';
  const pg = 'pg-6666666666666666ffff6666';
  await scrivi(file, testo('Storia', pg, { pvAttuali: 20 }));
  assert.deepEqual(storicoDi(pg), [], 'il primo salvataggio non ha niente da conservare');
  await scrivi(file, testo('Storia', pg, { pvAttuali: 15 }));
  const copie = storicoDi(pg);
  assert.equal(copie.length, 1);
  assert.match(copie[0], /^\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.json$/);
  // la copia è il file di PRIMA (20 PV), non quello nuovo
  assert.equal(JSON.parse(readFileSync(join(cartella, CARTELLA_STORICO, pg, copie[0]), 'utf8')).sessione.pvAttuali, 20);
  assert.equal(suDisco(file).sessione.pvAttuali, 15);
  // altre scritture ravvicinate non fanno altre copie (col salvataggio a ogni tocco sarebbero migliaia)
  for (let i = 0; i < 5; i++) await scrivi(file, testo('Storia', pg, { pvAttuali: 10 - i }));
  assert.equal(storicoDi(pg).length, 1);
  assert.equal(suDisco(file).versione_salvataggio, 7, 'il contatore però sale sempre');
  // nessun elenco mostra lo storico: né l'API dei personaggi, né il filtro dei nomi dei file
  const lista = await elenco();
  assert.ok(!lista.some((x) => x.file === CARTELLA_STORICO || x.file.includes(CARTELLA_STORICO)));
  assert.ok(!NOME_FILE.test(CARTELLA_STORICO));
  assert.ok(!NOME_FILE.test(`${CARTELLA_STORICO}/${pg}/2026-10-20T10-00-00.json`));
  assert.ok(!ultimiPerPg(lista).some((x) => x.file.includes(CARTELLA_STORICO)));
});

test('storico: le regole (quando copiare, quante copie tenere) sono funzioni pure', () => {
  const quando = new Date('2026-10-20T12:00:00Z');
  assert.equal(serveCopia(null, { quando }), false, 'niente da conservare');
  assert.equal(serveCopia({ pg: 'x' }, { ultime: [], quando }), true, 'nessuna copia: la prima si fa');
  assert.equal(serveCopia({ pg: 'x' }, { ultime: ['2026-10-20T11-59-00.json'], quando }), false, 'un minuto fa: no');
  assert.equal(serveCopia({ pg: 'x' }, { ultime: ['2026-10-20T11-30-00.json'], quando }), true, 'mezz’ora fa: sì');
  assert.equal(serveCopia({ pg: 'x' }, { ultime: ['rovinato.json'], quando }), true, 'nomi strani: nel dubbio si copia');
  assert.ok(MINUTI_FRA_COPIE >= 1);
  const nomi = Array.from({ length: 45 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}T10-00-00.json`);
  assert.equal(copieDaTogliere(nomi).length, 5, 'si tengono le ultime quaranta');
  assert.deepEqual(copieDaTogliere(nomi).slice(0, 2), ['2026-10-01T10-00-00.json', '2026-10-02T10-00-00.json'], 'si tolgono le più vecchie');
  assert.deepEqual(copieDaTogliere(['a.json', 'b.json'], 1), [], 'i nomi che non sono copie non si toccano');
  // conMetadati non tocca nient'altro
  const nuovo = { formato: 'mutant-personaggio', scelte: { nome: 'x' }, pg: 'pg-1' };
  const con = conMetadati(nuovo, { versione_salvataggio: 7 }, { chi: 'giocatore', quando });
  assert.deepEqual({ ...con, versione_salvataggio: undefined, aggiornato_il: undefined, aggiornato_da: undefined }, { ...nuovo, versione_salvataggio: undefined, aggiornato_il: undefined, aggiornato_da: undefined });
  assert.equal(con.versione_salvataggio, 8);
  assert.equal(conMetadati(nuovo, null, { chi: 'boh' }).aggiornato_da, 'giocatore', 'un autore sconosciuto vale giocatore');
});

test('si salva a ogni modifica: l’attesa è breve e la pagina che si chiude scrive subito', () => {
  const attesa = dati.regole.interfaccia.salvataggio.attesa_ms;
  assert.ok(Number.isInteger(attesa) && attesa <= 2000, `attesa ${attesa} ms`);
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  // l'attesa viene dai dati, non da un numero nel codice
  assert.match(app, /const attesa = subito \? 0 : stato\.dati\?\.regole\?\.interfaccia\?\.salvataggio\?\.attesa_ms/);
  assert.doesNotMatch(app, /scriviInCartella\(id, \{ revisione: id === stato\.id \}\); \}, 1500\)/);
  // ogni modifica di sessione e di scelte passa da persisti(), che programma la scrittura nella cartella
  assert.match(app, /function persisti\(\)[\s\S]{0,400}if \(stato\.cartella\) programmaCartella\(stato\.id\);/);
  // chiudendo o nascondendo la pagina si scrive subito
  assert.match(app, /addEventListener\('visibilitychange'[\s\S]{0,120}salvaSubitoSeInAttesa\(\)/);
  assert.match(app, /addEventListener\('pagehide', salvaSubitoSeInAttesa\)/);
});

test('fuori dalla sessione i personaggi non si toccano: preparare nemici e scontri non scrive nessun file di PG', async () => {
  const prima = fileDi().map((f) => [f, suDisco(f).versione_salvataggio ?? null]);
  const nemico = { id: 'nem-prova', nome: 'Nemico di prova', pv: 10, difese: 8, ar: 0, movimento: 6, iniziativa: 1, attacchi: [], fonte: 'prova' };
  const rn = await fetch(`${base}/api/nemici/nem-prova`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nemico) });
  assert.ok([200, 201, 400].includes(rn.status), `nemici: ${rn.status}`);
  const rs = await fetch(`${base}/api/scontri`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Scontro di prova', stato: 'bozza', partecipanti: [] }) });
  assert.ok([200, 201, 400].includes(rs.status), `scontri: ${rs.status}`);
  await elenco();
  assert.deepEqual(fileDi().map((f) => [f, suDisco(f).versione_salvataggio ?? null]), prima, 'nessun file di personaggio riscritto');
});

test('la pulizia: il rapporto dice quale file è l’originale e quali andrebbero in storico, senza toccare niente', async () => {
  const prova = mkdtempSync(join(tmpdir(), 'mutant-pulizia-'));
  const pg = 'pg-7777777777777777aaaa7777';
  mkdirSync(join(prova), { recursive: true });
  writeFileSync(join(prova, 'Aiko_liv5_2026-10-01.json'), testo('Aiko', pg));
  writeFileSync(join(prova, 'Aiko_liv5_2026-10-13.json'), testo('Aiko', pg));
  writeFileSync(join(prova, 'Altro_liv5_2026-10-02.json'), testo('Altro', ALTRO));
  writeFileSync(join(prova, 'note.txt'), 'non è un personaggio');
  // date di modifica diverse: l'originale è il file modificato più di recente
  const quando = (f, g) => utimesSync(join(prova, f), new Date(`2026-10-${g}T10:00:00Z`), new Date(`2026-10-${g}T10:00:00Z`));
  quando('Aiko_liv5_2026-10-01.json', '01');
  quando('Aiko_liv5_2026-10-13.json', '13');
  quando('Altro_liv5_2026-10-02.json', '02');
  const r = await rapporto(prova);
  assert.equal(r.totale, 3);
  assert.equal(r.dopo, 2, 'due personaggi: due file dopo la pulizia');
  const aiko = r.personaggi.find((p) => p.id === pg);
  assert.equal(aiko.file.length, 2);
  assert.equal(aiko.originale.file, 'Aiko_liv5_2026-10-13.json', 'il più recente è l’originale proposto');
  assert.deepEqual(aiko.altri.map((x) => x.file), ['Aiko_liv5_2026-10-01.json']);
  const testoR = testoRapporto(r);
  assert.match(testoR, /originale proposto: Aiko_liv5_2026-10-13\.json/);
  assert.match(testoR, /Niente è stato toccato/);
  // il rapporto non sposta niente
  assert.equal(readdirSync(prova).filter((x) => x.endsWith('.json')).length, 3);
  // il secondo comando sposta: in cartella resta un file per personaggio, niente è cancellato
  const fatti = await sposta(prova, r);
  assert.equal(fatti.length, 1);
  assert.deepEqual(readdirSync(prova).filter((x) => x.endsWith('.json')).sort(), ['Aiko_liv5_2026-10-13.json', 'Altro_liv5_2026-10-02.json']);
  assert.equal(readdirSync(join(prova, CARTELLA_STORICO, pg)).length, 1);
  assert.ok(readdirSync(prova).includes('note.txt'), 'ciò che non è un personaggio non si tocca');
  rmSync(prova, { recursive: true, force: true });
});

test('elenco dei personaggi: «Apri» e «Modifica master» su ogni riga (solo sul PC del master, con la cartella)', () => {
  const app = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8');
  assert.match(app, /function pulsanteModificaMaster\(remoto\) \{\s*if \(!stato\.cartella \|\| !stato\.master \|\| !remoto\) return null;/);
  assert.match(app, /apriDaCartella\(remoto, \{ master: true \}\)/);
  // in tutte e due le righe dell'elenco: il personaggio del browser e quello solo in cartella
  assert.match(app, /onclick: \(\) => vai\(p\.passo === PASSO_SCHEDA[^\n]*\}, 'Apri'\),\s*\n\s*pulsanteModificaMaster\(remoto\),/);
  assert.match(app, /onclick: apri \}, 'Apri'\),\s*\n\s*pulsanteModificaMaster\(r\)\)\);/);
  assert.match(app, /rigaPersonaggio\(r\.voce, r\.origine, r\.remoto\)/);
});

test('il menu dei PX elenca un personaggio una volta sola, non tutti i file', () => {
  const tav = readFileSync(new URL('../src/ui/tavolo.js', import.meta.url), 'utf8');
  assert.match(tav, /schede: ultimiPerPg\(stato\.elenco\)/);
  assert.doesNotMatch(tav, /schede: stato\.elenco/);
  // con i file veri di quattro giorni diversi il menu avrebbe una voce sola per PG
  const finti = ['LUCAS_liv6_2026-10-04.json', 'LUCAS_liv6_2026-10-13.json', 'LUCAS_liv6_2026-10-20.json'].map((file, i) => ({ file, mtime: i, pg: 'pg-lucas', nome: 'LUCAS', livello: 6 }));
  assert.deepEqual(ultimiPerPg(finti).map((x) => x.file), ['LUCAS_liv6_2026-10-20.json']);
});

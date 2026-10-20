// Parte B del 20/10/2026: incantesimi liberi aggiunti e tolti a mano (src/incantesimi-a-mano.js): origine e data, fuori
// dalle quote e dai liberi dell'avanzamento, sopravvivono ai livelli, avviso (non blocco) sul livello troppo alto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, clic, dati } from './scheda-aiuti.js';
import {
  normalizzaIncantesimiAMano, aggiungiIncantesimoAMano, togliIncantesimoAMano, avvisoLivelloAMano, risolviIncantesimiAMano, rigaRegistro, nomeOrigine, dataLeggibile,
} from '../src/incantesimi-a-mano.js';
import { statoIncantesimi } from '../src/incantesimi.js';
import { deserializzaPersonaggio, serializza, normalizza, applicaModifica, nuoveScelte } from '../src/character.js';
import { preparaTab } from '../src/stampa.js';
import { validaDati } from '../src/validate.js';

const ESEMPIO = 'Fratello-Anselmo-Viri_liv3_2026-10-02.json';
const carica = () => deserializzaPersonaggio(readFileSync(new URL(`../esempi/${ESEMPIO}`, import.meta.url), 'utf8'));
const nome = (n) => dati.incantesimi.incantesimi.find((i) => i.livello_base === n)?.nome;

test('dati: le due origini ci sono e il validatore le controlla', () => {
  assert.deepEqual(validaDati(dati), []);
  assert.deepEqual(dati.regole.incantesimi_a_mano.origini.map((o) => o.id), ['a_mano', 'direttore']);
  const rotti = structuredClone(dati);
  rotti.regole.incantesimi_a_mano.origini.pop();
  assert.ok(validaDati(rotti).some((e) => /incantesimi_a_mano/.test(e.chiave)));
});

test('aggiungere: per nome del catalogo, con origine e data; due volte lo stesso o un nome sbagliato non si aggiunge', () => {
  const l = aggiungiIncantesimoAMano([], 'Cura Ferite', { origine: 'direttore', quando: '2026-10-20', nota: 'dal maestro' }, dati);
  assert.deepEqual(l, [{ nome: 'Cura Ferite', origine: 'direttore', quando: '2026-10-20', nota: 'dal maestro' }]);
  assert.equal(aggiungiIncantesimoAMano(l, 'Cura Ferite', { origine: 'a_mano' }, dati), null, 'già presente');
  assert.equal(aggiungiIncantesimoAMano(l, 'Incantesimo Inventato', { origine: 'a_mano' }, dati), null, 'non è nel catalogo');
  const due = aggiungiIncantesimoAMano(l, 'Scudo', { origine: 'a_mano', quando: '2026-10-21' }, dati);
  assert.deepEqual(due.map((x) => [x.nome, x.origine]), [['Cura Ferite', 'direttore'], ['Scudo', 'a_mano']]);
  // origine sconosciuta → aggiunto a mano; data mancante → oggi
  const [x] = aggiungiIncantesimoAMano([], 'Scudo', { origine: '???' }, dati);
  assert.equal(x.origine, 'a_mano');
  assert.match(x.quando, /^\d{4}-\d{2}-\d{2}$/);
});

test('togliere: l’incantesimo esce, gli altri restano; uno che non c’è non cambia nulla', () => {
  const l = aggiungiIncantesimoAMano(aggiungiIncantesimoAMano([], 'Cura Ferite', { origine: 'a_mano' }, dati), 'Scudo', { origine: 'a_mano' }, dati);
  assert.deepEqual(togliIncantesimoAMano(l, 'Scudo').map((x) => x.nome), ['Cura Ferite']);
  assert.equal(togliIncantesimoAMano(l, 'Altro'), null);
  assert.deepEqual(togliIncantesimoAMano(togliIncantesimoAMano(l, 'Scudo'), 'Cura Ferite'), []);
});

test('caricamento: righe sbagliate scartate, nomi non più nel catalogo tolti con un avviso, doppioni uniti', () => {
  const avvisi = [];
  const l = normalizzaIncantesimiAMano([
    { nome: 'Cura Ferite', origine: 'direttore', quando: '2026-10-19' }, { nome: 'Cura Ferite', origine: 'a_mano' }, { nome: 'Sparito Per Sempre' }, null, 'x', { quando: '2026-10-19' },
  ], dati, avvisi);
  assert.deepEqual(l, [{ nome: 'Cura Ferite', origine: 'direttore', quando: '2026-10-19' }]);
  assert.equal(avvisi.length, 1);
  assert.match(avvisi[0], /Sparito Per Sempre/);
  assert.deepEqual(normalizzaIncantesimiAMano('boh', dati), []);
});

test('file: la lista si scrive solo se non vuota e torna uguale; i file di prima restano identici', () => {
  const p = carica();
  const senza = serializza(p.creazione, { livelli: p.livelli, sessione: p.sessione });
  assert.doesNotMatch(senza, /incantesimiAMano/);
  const con = serializza({ ...p.creazione, incantesimiAMano: [{ nome: 'Scudo', origine: 'direttore', quando: '2026-10-20' }] }, { livelli: p.livelli, sessione: p.sessione });
  assert.match(con, /"incantesimiAMano"/);
  const letto = deserializzaPersonaggio(con);
  assert.deepEqual(normalizza(letto.creazione, dati).scelte.incantesimiAMano, [{ nome: 'Scudo', origine: 'direttore', quando: '2026-10-20' }]);
  assert.deepEqual(nuoveScelte().incantesimiAMano, []);
});

test('non sfalsano i conti: né quote di Classe né liberi dell’avanzamento, né «conosciuti», e restano dopo ogni livello', () => {
  const p = carica();
  const prima = statoIncantesimi(p.creazione, dati);
  const extra = [nome(1), nome(3), nome(6), nome(9)].filter(Boolean).map((n, i) => ({ nome: n, origine: i % 2 ? 'direttore' : 'a_mano', quando: '2026-10-20' }));
  assert.ok(extra.length >= 3);
  const creazione = applicaModifica(p.creazione, { incantesimiAMano: extra }, dati).scelte;
  assert.equal(creazione.incantesimiAMano.length, extra.length, 'la normalizzazione non li toglie per le quote superate');
  assert.deepEqual(creazione.incantesimi, p.creazione.incantesimi, 'gli incantesimi scelti restano com’erano');
  const dopo = statoIncantesimi(creazione, dati);
  assert.deepEqual([dopo.scelti, dopo.liberiUsati, dopo.totale, dopo.completo, dopo.eccesso], [prima.scelti, prima.liberiUsati, prima.totale, prima.completo, prima.eccesso]);
  // dopo ogni livello: i conosciuti e le quote sono quelli normali, gli aggiunti a mano ci sono ancora tutti
  for (let k = 0; k <= p.livelli.length; k++) {
    const riposo = preparaTab({ creazione: p.creazione, livelli: p.livelli.slice(0, k) }, dati).scheda.incantesimi;
    const con = preparaTab({ creazione, livelli: p.livelli.slice(0, k) }, dati).scheda.incantesimi;
    assert.deepEqual(con.conosciuti.map((i) => i.nome), riposo.conosciuti.map((i) => i.nome), `livello ${k + 1}: conosciuti invariati`);
    assert.deepEqual(con.quote, riposo.quote, `livello ${k + 1}: quote invariate`);
    assert.deepEqual(con.aMano.map((i) => i.nome), extra.map((x) => x.nome), `livello ${k + 1}: aggiunti a mano ancora tutti`);
  }
});

test('avviso, senza blocco, se il livello è oltre quello che il personaggio potrebbe conoscere', () => {
  const alto = dati.incantesimi.incantesimi.find((i) => i.livello_base >= 9);
  const basso = dati.incantesimi.incantesimi.find((i) => i.livello_base === 1);
  assert.match(avvisoLivelloAMano(alto, { livelloMassimo: 3, accesso: true }), new RegExp(`Livello base ${alto.livello_base}: oltre il livello massimo.*\\(3,`));
  assert.match(avvisoLivelloAMano(alto, { livelloMassimo: 0, accesso: false }), /non ha accesso alla magia/);
  assert.equal(avvisoLivelloAMano(basso, { livelloMassimo: 3, accesso: true }), null);
  // aggiungere un incantesimo troppo alto funziona lo stesso: l'avviso è nella scheda
  const p = carica();
  const creazione = applicaModifica(p.creazione, { incantesimiAMano: [{ nome: alto.nome, origine: 'direttore', quando: '2026-10-20' }] }, dati).scelte;
  const s = preparaTab({ creazione, livelli: p.livelli }, dati).scheda.incantesimi;
  assert.equal(s.aMano[0].nome, alto.nome);
  assert.match(s.aMano[0].avviso, /oltre il livello massimo/);
  const r = risolviIncantesimiAMano(creazione.incantesimiAMano, { livelloMassimo: 99, accesso: true }, dati);
  assert.equal(r[0].avviso, null);
});

test('registro: la riga dice cosa è successo, da dove viene e la data', () => {
  const x = { nome: 'Scudo', origine: 'direttore', quando: '2026-10-20', nota: 'dal maestro' };
  assert.equal(nomeOrigine('direttore', dati), 'Concesso dal Direttore');
  assert.equal(dataLeggibile('2026-10-20'), '20 ottobre 2026');
  assert.equal(rigaRegistro('aggiunto', x, dati), 'Incantesimo Scudo: Concesso dal Direttore il 20 ottobre 2026 (dal maestro).');
  assert.match(rigaRegistro('tolto', x, dati), /^Incantesimo Scudo: tolto \(era concesso dal direttore il 20 ottobre 2026\)\.$/);
});

function ctxPoteri(opzioni = {}, scelte = (s) => s) {
  return contesto(ESEMPIO, { attiva: 'poteri', scelte, ...opzioni });
}
const sezioneDi = (r) => r.radice.tutti().find((n) => n.tagName === 'DETAILS' && n.className?.includes('incantesimi-a-mano'));

test('Poteri: la sezione c’è, con il modulo per aggiungere; origine proposta «Aggiunto a mano», «Concesso dal Direttore» dal PC del Direttore', () => {
  const c = ctxPoteri();
  const s = sezioneDi(resa(c));
  assert.ok(s, 'sezione «Incantesimi aggiunti a mano»');
  assert.match(s.textContent, /Incantesimi aggiunti a mano/);
  assert.ok(s.tutti().some((n) => n.tagName === 'INPUT' && n.getAttribute('list') === 'elenco-incantesimi-a-mano'));
  const scelta = s.tutti().filter((n) => n.tagName === 'BUTTON' && /scelta-btn/.test(n.className));
  assert.deepEqual(scelta.map((b) => b.textContent), ['Aggiunto a mano', 'Concesso dal Direttore']);
  assert.match(scelta[0].className, /scelta(?!-)/);
  assert.equal(c.ui.incantesimoAMano.origine, 'a_mano');
  const cm = ctxPoteri({}, (x) => x);
  cm.master = true;
  cm.ui = {};
  resa(cm);
  assert.equal(cm.ui.incantesimoAMano.origine, 'direttore');
});

test('Poteri: scritto il nome, «Aggiungi» chiama l’azione con la lista e la riga del registro; livello alto = «Aggiungi comunque»', async () => {
  const c = ctxPoteri();
  resa(c);
  const alto = dati.incantesimi.incantesimi.find((i) => i.livello_base >= 9);
  c.ui.incantesimoAMano.nome = alto.nome;
  c.ui.incantesimoAMano.origine = 'direttore';
  c.ui.incantesimoAMano.nota = 'prova';
  const s = sezioneDi(resa(c));
  assert.match(s.textContent, /Avviso: Livello base \d+: oltre il livello massimo/);
  const bottone = s.tutti().find((n) => n.tagName === 'BUTTON' && /^Aggiungi/.test(n.textContent));
  assert.equal(bottone.textContent, 'Aggiungi comunque', 'avvisa, non blocca');
  clic(bottone);
  const [nomeAzione, lista, riga] = c.chiamate.at(-1);
  assert.equal(nomeAzione, 'incantesimiAMano');
  assert.deepEqual(lista.map((x) => [x.nome, x.origine, x.nota]), [[alto.nome, 'direttore', 'prova']]);
  assert.match(lista[0].quando, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(riga, new RegExp(`^Incantesimo ${alto.nome}: Concesso dal Direttore il .* \\(prova\\)\\.$`));
  // nome sbagliato: nessuna azione e un messaggio
  const n = c.chiamate.length;
  c.ui.incantesimoAMano.nome = 'Non Esiste';
  clic(sezioneDi(resa(c)).tutti().find((x) => x.tagName === 'BUTTON' && /^Aggiungi/.test(x.textContent)));
  assert.equal(c.chiamate.filter(([a]) => a === 'incantesimiAMano').length, 1);
  assert.match(sezioneDi(resa(c)).textContent, /non è nel catalogo degli incantesimi/);
  assert.ok(c.chiamate.length >= n);
});

test('Poteri: gli aggiunti a mano compaiono con origine e data, il nome apre la stessa scheda, «Lancia!» il pannello e «Togli» c’è', () => {
  const extra = [{ nome: 'Cura Ferite', origine: 'direttore', quando: '2026-10-19', nota: 'dal maestro' }, { nome: 'Scudo', origine: 'a_mano', quando: '2026-10-20' }];
  const c = ctxPoteri({}, (s) => { s.incantesimiAMano = extra; return s; });
  const s = sezioneDi(resa(c));
  assert.ok(s.open, 'con incantesimi dentro la sezione è aperta');
  const schede = s.tutti().filter((n) => n.className?.includes('incantesimo-a-mano'));
  assert.equal(schede.length, 2);
  for (const pezzo of ['Concesso dal Direttore', 'il 19 ottobre 2026', 'dal maestro', 'fuori dalle quote di Classe']) assert.ok(schede[0].textContent.includes(pezzo), pezzo);
  for (const pezzo of ['Aggiunto a mano', 'il 20 ottobre 2026']) assert.ok(schede[1].textContent.includes(pezzo), pezzo);
  const infoBtn = schede[0].tutti().find((n) => n.className === 'voce-info');
  assert.deepEqual([infoBtn.dataset.infoTipo, infoBtn.dataset.infoId], ['incantesimo', 'Cura Ferite']);
  assert.ok(schede[0].tutti().some((n) => n.tagName === 'BUTTON' && n.textContent === 'Togli'));
  clic(schede[1].tutti().find((n) => n.tagName === 'BUTTON' && n.textContent === 'Lancia!'));
  assert.deepEqual([c.ui.lancio.nome, c.ui.lancio.da], ['Scudo', undefined]);
  // non finiscono fra gli incantesimi conosciuti: il contatore «conosciuti / quota» è quello di prima
  const riposo = ctxPoteri();
  assert.equal(c.tab.scheda.incantesimi.conosciuti.length, riposo.tab.scheda.incantesimi.conosciuti.length);
});

test('per un personaggio senza magia: niente «Nessun potere» se ha incantesimi aggiunti a mano, e il modulo c’è lo stesso', () => {
  const senza = contesto('Torvald-Krane_liv6_2026-10-02.json', { attiva: 'poteri' });
  const r0 = resa(senza);
  assert.match(r0.testo(), /Nessun potere/);
  assert.ok(sezioneDi(r0), 'il modulo per aggiungere c’è anche senza magia');
  assert.ok(!sezioneDi(r0).open, 'chiusa se vuota');
  const con = contesto('Torvald-Krane_liv6_2026-10-02.json', { attiva: 'poteri', scelte: (s) => { s.incantesimiAMano = [{ nome: 'Cura Ferite', origine: 'direttore', quando: '2026-10-20' }]; return s; } });
  const r1 = resa(con);
  assert.doesNotMatch(r1.testo(), /Nessun potere/);
  assert.match(r1.testo(), /il personaggio non ha accesso alla magia/, 'avviso di livello senza blocco');
});

test('modifica del master: il registro descrive «incantesimi aggiunti a mano» fra le scelte cambiate', async () => {
  const { descriviScelte } = await import('../src/correzioni-master.js');
  const p = carica();
  const prima = { creazione: p.creazione, livelli: p.livelli };
  const dopo = { creazione: { ...p.creazione, incantesimiAMano: [{ nome: 'Scudo', origine: 'direttore', quando: '2026-10-20' }] }, livelli: p.livelli };
  assert.equal(descriviScelte(prima, dopo), 'Creazione: incantesimi aggiunti a mano');
});

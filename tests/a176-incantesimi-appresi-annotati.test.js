// A.176 (risposta di Davide del 23/10/2026): un incantesimo aggiunto a mano è APPRESO (conta come conosciuto a ogni effetto,
// fermi restando gli altri requisiti) oppure SOLO ANNOTATO (non è appreso, non concede accesso alla magia, Abilità o PM, e
// non si lancia). Le righe salvate prima della distinzione restano «da classificare», com'erano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, clic, dati } from './scheda-aiuti.js';
import {
  tipoDi, contaComeConosciuto, nomiConosciuti, statoLancioAMano, etichettaTipo, normalizzaIncantesimiAMano, aggiungiIncantesimoAMano,
  classificaIncantesimoAMano, risolviIncantesimiAMano, rigaRegistro,
} from '../src/incantesimi-a-mano.js';
import { pianoCreazione, versioniCreabili } from '../src/consumabili-mistici.js';
import { deserializzaPersonaggio, serializza } from '../src/character.js';
import { validaDati } from '../src/validate.js';

const TAUMATURGO = 'Fratello-Anselmo-Viri_liv3_2026-10-02.json';
const SENZA_MAGIA = 'Torvald-Krane_liv6_2026-10-02.json';
const sezioneDi = (r) => r.radice.tutti().find((n) => n.tagName === 'DETAILS' && n.className?.includes('incantesimi-a-mano'));
const schedeAMano = (r) => r.radice.tutti().filter((n) => n.className?.includes('incantesimo-a-mano'));
const pulsante = (nodo, testo) => nodo.tutti().find((n) => n.tagName === 'BUTTON' && n.textContent === testo);
const lista = (...x) => x.map(([nome, tipo, extra = {}]) => ({ nome, origine: 'direttore', quando: '2026-10-23', ...(tipo ? { tipo } : {}), ...extra }));
const ctxCon = (aMano, opzioni = {}) => contesto(TAUMATURGO, { attiva: 'poteri', scelte: (s) => { s.incantesimiAMano = aMano; return s; }, ...opzioni });

test('dati: tipi, frasi e lunghezza della concessione ci sono e il validatore le controlla', () => {
  assert.deepEqual(validaDati(dati), []);
  const iam = dati.regole.incantesimi_a_mano;
  assert.deepEqual(iam.tipi.map((t) => t.id), ['appreso', 'annotato']);
  assert.ok(iam.da_classificare.frase && iam.concessione_max >= 50);
  const rotti = structuredClone(dati);
  rotti.regole.incantesimi_a_mano.tipi.pop();
  assert.ok(validaDati(rotti).some((e) => /incantesimi_a_mano\.tipi/.test(e.chiave)));
});

test('il tipo: appreso e annotato si salvano; senza tipo (o un tipo sconosciuto) resta «da classificare», senza deciderlo', () => {
  const l = normalizzaIncantesimiAMano([
    { nome: 'Scudo', origine: 'direttore', quando: '2026-10-20', tipo: 'appreso' },
    { nome: 'Cura Ferite', origine: 'a_mano', quando: '2026-10-20', tipo: 'annotato', concessione: '  2 PM, Artefatti VA, una volta al giorno  ' },
    { nome: 'Scudo Spirituale', origine: 'a_mano', quando: '2026-10-20' },
    { nome: 'Cura Malattie', origine: 'a_mano', quando: '2026-10-20', tipo: 'inventato' },
  ], dati);
  assert.deepEqual(l.map((x) => tipoDi(x)), ['appreso', 'annotato', 'da_classificare', 'da_classificare']);
  assert.equal(l[1].concessione, '2 PM, Artefatti VA, una volta al giorno');
  assert.ok(!('tipo' in l[2]) && !('tipo' in l[3]), 'il file non riceve un tipo che nessuno ha scelto');
  assert.deepEqual([contaComeConosciuto(l[0]), contaComeConosciuto(l[1]), contaComeConosciuto(l[2])], [true, false, false]);
  // aggiungere dal modulo: il tipo scelto viene scritto
  const a = aggiungiIncantesimoAMano([], 'scudo', { origine: 'direttore', tipo: 'annotato', quando: '2026-10-23' }, dati);
  assert.equal(a[0].tipo, 'annotato');
  // la concessione ha un tetto di lunghezza
  const lunga = normalizzaIncantesimiAMano([{ nome: 'Scudo', tipo: 'appreso', concessione: 'x'.repeat(900) }], dati);
  assert.equal(lunga[0].concessione.length, dati.regole.incantesimi_a_mano.concessione_max);
});

test('si lancia? annotato no; appreso con le regole dell’accesso (senza accesso resta annotato e non lanciabile); la concessione lo rende lanciabile; da classificare com’era', () => {
  assert.equal(statoLancioAMano({ tipo: 'annotato' }, { accesso: true }).lanciabile, false);
  assert.match(statoLancioAMano({ tipo: 'annotato' }, { accesso: true }).motivo, /solo annotato.*non concede accesso alla magia, Abilità o PM/);
  assert.equal(statoLancioAMano({ tipo: 'appreso' }, { accesso: true }).lanciabile, true);
  const senza = statoLancioAMano({ tipo: 'appreso' }, { accesso: false });
  assert.equal(senza.lanciabile, false);
  assert.match(senza.motivo, /non ha accesso alla magia.*resta annotato e non lanciabile/);
  const conc = statoLancioAMano({ tipo: 'annotato', concessione: '3 PM, con Artefatti, una volta per Scena' }, { accesso: false });
  assert.deepEqual([conc.lanciabile, conc.concessione], [true, '3 PM, con Artefatti, una volta per Scena']);
  assert.equal(statoLancioAMano({}, { accesso: false }).lanciabile, true, 'da classificare: resta com’era');
});

test('«conosce questo incantesimo?» risponde giusto: appreso sì, annotato e da classificare no', () => {
  const inc = { conosciuti: [{ nome: 'Arma Mistica' }], aMano: [{ nome: 'Scudo', tipo: 'appreso' }, { nome: 'Cura Ferite', tipo: 'annotato' }, { nome: 'Individuare', tipo: 'da_classificare' }] };
  assert.deepEqual([...nomiConosciuti(inc)].sort(), ['Arma Mistica', 'Scudo']);
  assert.deepEqual([...nomiConosciuti({})], []);
});

test('creazione di Consumabili (Magia §24.1): l’appreso conta come conosciuto, l’annotato no; il livello massimo e l’Officiante restano requisiti', () => {
  const scheda = (aMano) => ({
    abilita: [{ nome: 'Artefatti', effettivo: 14 }, { nome: 'Tecnologia', effettivo: 12 }, { nome: 'Rituali', effettivo: 11 }],
    talentiLiberi: [{ id: 'ritualista-minore' }],
    incantesimi: { conosciuti: [{ nome: 'Arma Mistica' }], aMano, livelloMassimo: 8 },
  });
  const piano = (aMano, nome = 'Scudo', livello = 3) => pianoCreazione({ incantesimo: nome, livello, progetto: { disponibile: true } }, { scheda: scheda(aMano) }, dati);
  const dice = (p) => p.irregolari.some((x) => /non conosci Scudo/.test(x));
  assert.equal(dice(piano([])), true, 'né conosciuto né aggiunto: non lo conosce');
  assert.equal(dice(piano([{ nome: 'Scudo', tipo: 'appreso' }])), false, 'appreso: conta come conosciuto');
  assert.equal(dice(piano([{ nome: 'Scudo', tipo: 'annotato', etichetta: 'Solo annotato' }])), true, 'annotato: non è appreso');
  assert.match(piano([{ nome: 'Scudo', tipo: 'annotato', etichetta: 'Solo annotato' }]).irregolari.join(' '), /solo annotato: non conta come appreso, A\.176/);
  assert.equal(dice(piano([{ nome: 'Scudo', tipo: 'da_classificare' }])), true, 'da classificare: non decide');
  // «conoscerlo, da solo, non basta»: oltre il livello massimo l'appreso resta irregolare
  const alto = dati.incantesimi.incantesimi.find((i) => i.nome === 'Scudo').versioni.map((r) => Number(String(r['Livello e PM'] ?? r.Livello ?? '').match(/\d+/)?.[0])).find((l) => l > 8);
  if (alto) assert.equal(piano([{ nome: 'Scudo', tipo: 'appreso' }], 'Scudo', alto).irregolari.some((x) => /non conosci Scudo/.test(x)), true);
  // l'elenco delle versioni creabili: l'appreso c'è, l'annotato no
  const elenco = (aMano) => versioniCreabili(scheda(aMano), dati).map((x) => x.incantesimo);
  assert.ok(elenco([{ nome: 'Scudo', tipo: 'appreso' }]).includes('Scudo'));
  assert.ok(!elenco([{ nome: 'Scudo', tipo: 'annotato' }]).includes('Scudo'));
  assert.ok(!elenco([{ nome: 'Scudo' }]).includes('Scudo'));
});

test('risolvi: etichetta, frase, concessione e se si lancia stanno nella scheda; il Direttore classifica con il registro', () => {
  const l = lista(['Scudo', 'appreso'], ['Cura Ferite', 'annotato'], ['Individuare', null]);
  const r = risolviIncantesimiAMano(l, { livelloMassimo: 8, accesso: true }, dati);
  assert.deepEqual(r.map((x) => [x.tipo, x.segno, x.lancio.lanciabile]), [['appreso', '(Appreso)', true], ['annotato', '(Annotato)', false], ['da_classificare', '(Aggiunto)', true]]);
  assert.equal(r[0].etichetta, 'Appreso a mano');
  assert.match(r[1].frase, /Non è appreso/);
  const c = classificaIncantesimoAMano(l, 'Individuare', 'appreso', {}, dati);
  assert.equal(tipoDi(c.find((x) => x.nome === 'Individuare')), 'appreso');
  assert.equal(tipoDi(c.find((x) => x.nome === 'Cura Ferite')), 'annotato', 'gli altri non cambiano');
  assert.equal(classificaIncantesimoAMano(l, 'Individuare', 'boh', {}, dati), null);
  assert.equal(classificaIncantesimoAMano(l, 'Non Esiste', 'appreso', {}, dati), null);
  const conc = classificaIncantesimoAMano(l, 'Cura Ferite', 'annotato', { concessione: '1 PM, Rituali' }, dati);
  assert.equal(conc.find((x) => x.nome === 'Cura Ferite').concessione, '1 PM, Rituali');
  const tolta = classificaIncantesimoAMano(conc, 'Cura Ferite', 'annotato', { concessione: '' }, dati);
  assert.ok(!('concessione' in tolta.find((x) => x.nome === 'Cura Ferite')));
  assert.match(rigaRegistro('classificato', c.find((x) => x.nome === 'Individuare'), dati), /^Incantesimo Individuare: classificato come appreso a mano\.$/);
  assert.match(rigaRegistro('classificato', conc.find((x) => x.nome === 'Cura Ferite'), dati), /solo annotato \(concessione speciale: 1 PM, Rituali\)/);
});

test('file: tipo e concessione sopravvivono al salvataggio; un file di prima resta «da classificare» senza tipo inventato', () => {
  const p = deserializzaPersonaggio(readFileSync(new URL(`../esempi/${TAUMATURGO}`, import.meta.url), 'utf8'));
  const scelte = { ...p.creazione, incantesimiAMano: lista(['Scudo', 'appreso'], ['Cura Ferite', 'annotato', { concessione: '1 PM, Rituali' }], ['Individuare', null]) };
  const giro = deserializzaPersonaggio(serializza(scelte, { livelli: p.livelli, sessione: p.sessione }));
  assert.deepEqual(giro.creazione.incantesimiAMano.map((x) => [x.nome, x.tipo ?? null, x.concessione ?? null]),
    [['Scudo', 'appreso', null], ['Cura Ferite', 'annotato', '1 PM, Rituali'], ['Individuare', null, null]]);
});

test('Taumaturgo: un appreso e un annotato nell’elenco, con la loro etichetta; l’annotato non si lancia e lo dice, l’appreso sì', () => {
  const c = ctxCon(lista(['Scudo', 'appreso'], ['Cura Ferite', 'annotato']));
  const r = resa(c);
  const schede = schedeAMano(r);
  assert.equal(schede.length, 2);
  const scudo = schede.find((s) => s.textContent.includes('Scudo'));
  const cura = schede.find((s) => s.textContent.includes('Cura Ferite'));
  const etichetta = (s) => s.tutti().find((n) => n.className.startsWith('etichetta-origine')).textContent.trim();
  assert.equal(etichetta(scudo), '(Appreso)');
  assert.equal(etichetta(cura), '(Annotato)');
  assert.match(cura.textContent, /Solo annotato/);
  assert.match(cura.textContent, /Non si lancia: È solo annotato/);
  const lancia = (s) => pulsante(s, 'Lancia!');
  assert.ok(!lancia(scudo).disabled);
  assert.ok(lancia(cura).disabled, 'annotato: pulsante spento');
  assert.match(lancia(cura).getAttribute('title'), /solo annotato.*non concede accesso alla magia/);
  // nel browser il pulsante spento non reagisce; anche se il pannello venisse aperto da un'altra strada, dice che non si lancia e non offre i passi
  clic(lancia(cura));
  const pannello = resa(c).testo();
  assert.match(pannello, /Non si può lanciare: È solo annotato/);
  assert.doesNotMatch(pannello, /Passi del lancio/);
  c.ui.lancio = null;
  clic(lancia(scudo));
  assert.equal(c.ui.lancio.nome, 'Scudo');
});

test('personaggio SENZA accesso alla magia: un annotato (e anche un appreso) non è lanciabile e dice perché', () => {
  const con = (aMano) => contesto(SENZA_MAGIA, { attiva: 'poteri', scelte: (s) => { s.incantesimiAMano = aMano; return s; } });
  for (const tipo of ['annotato', 'appreso']) {
    const c = con(lista(['Cura Ferite', tipo]));
    const r = resa(c);
    const [s] = schedeAMano(r);
    assert.ok(s, `${tipo}: la scheda c’è`);
    const b = pulsante(s, 'Lancia!');
    assert.ok(b.disabled, `${tipo}: pulsante spento`);
    assert.match(s.textContent, /Non si lancia:/);
    assert.match(b.getAttribute('title'), tipo === 'annotato' ? /solo annotato/ : /non ha accesso alla magia/);
    assert.doesNotMatch(r.testo(), /Nessun potere/, 'resta annotato, visibile');
  }
});

test('«da classificare»: restano com’erano, con il segno e un avviso; i giocatori non hanno i pulsanti del Direttore, il Direttore sì', () => {
  const vecchi = lista(['Scudo', null], ['Cura Ferite', null]);
  const giocatore = ctxCon(vecchi);
  const rg = resa(giocatore);
  assert.match(sezioneDi(rg).textContent, /2 da classificare/);
  assert.match(sezioneDi(rg).textContent, /lo dice il Direttore/);
  for (const s of schedeAMano(rg)) {
    assert.ok(!pulsante(s, 'Lancia!').disabled, 'resta com’era: si lancia con le regole normali');
    assert.ok(!pulsante(s, 'Segna come appreso'), 'il giocatore non classifica');
  }
  const master = ctxCon(vecchi);
  master.master = true;
  master.ui = {};
  const rm = resa(master);
  assert.match(sezioneDi(rm).textContent, /scegli per ciascuno/);
  const scudo = schedeAMano(rm).find((s) => s.textContent.includes('Scudo'));
  clic(pulsante(scudo, 'Segna come appreso'));
  const [, nuova, riga] = master.chiamate.filter(([a]) => a === 'incantesimiAMano').at(-1);
  assert.deepEqual(nuova.map((x) => [x.nome, x.tipo ?? null]), [['Scudo', 'appreso'], ['Cura Ferite', null]], 'solo quello scelto cambia');
  assert.match(riga, /classificato come appreso a mano/);
});

test('aggiungere: l’app chiede appreso o annotato; senza scelta non aggiunge; con la scelta scrive il tipo', () => {
  const c = contesto(TAUMATURGO, { attiva: 'poteri' });
  resa(c);
  const u = c.ui.incantesimoAMano;
  assert.equal(u.tipo, null, 'nessun valore di partenza');
  const cerca = (s) => s.tutti().find((n) => n.tagName === 'INPUT' && n.getAttribute('type') === 'search');
  let s = sezioneDi(resa(c));
  (cerca(s).ascolti.input ?? []).forEach((f) => f({ target: { value: 'Scudo' } }));
  clic(s.tutti().find((n) => n.tagName === 'BUTTON' && n.getAttribute('data-id') === 'scudo'));
  s = sezioneDi(resa(c));
  const aggiungi = () => clic(sezioneDi(resa(c)).tutti().find((n) => n.tagName === 'BUTTON' && /^Aggiungi/.test(n.textContent) && /primario/.test(n.className)));
  aggiungi();
  assert.equal(c.chiamate.filter(([a]) => a === 'incantesimiAMano').length, 0, 'senza tipo non si aggiunge');
  assert.match(sezioneDi(resa(c)).textContent, /Dì se l’incantesimo è appreso o solo annotato/);
  clic(pulsante(sezioneDi(resa(c)), 'Solo annotato'));
  assert.equal(c.ui.incantesimoAMano.tipo, 'annotato');
  assert.match(sezioneDi(resa(c)).textContent, /Non è appreso: una pergamena trovata/);
  aggiungi();
  const [, l, riga] = c.chiamate.filter(([a]) => a === 'incantesimiAMano').at(-1);
  assert.deepEqual(l.map((x) => [x.nome, x.tipo]), [['Scudo', 'annotato']]);
  assert.match(riga, /solo annotato/);
  assert.equal(c.ui.incantesimoAMano.tipo, null, 'per il prossimo incantesimo l’app chiede di nuovo');
});

test('stampa: il foglio Poteri mette «(Appreso)» o «(Annotato)» accanto al nome', async () => {
  const { righeElencoIncantesimi, preparaTab } = await import('../src/stampa.js');
  const { applicaModifica } = await import('../src/character.js');
  const p = deserializzaPersonaggio(readFileSync(new URL(`../esempi/${TAUMATURGO}`, import.meta.url), 'utf8'));
  const creazione = applicaModifica(p.creazione, { incantesimiAMano: lista(['Scudo', 'appreso'], ['Cura Ferite', 'annotato']) }, dati).scelte;
  const d = preparaTab({ creazione, livelli: p.livelli }, dati).tab.find((t) => t.id === 'poteri').dati;
  const nomi = righeElencoIncantesimi(d.macrofamiglie).filter((r) => r.tipo === 'incantesimo').map((r) => r.nome);
  assert.ok(nomi.includes('Scudo (Appreso)'), nomi.join(', '));
  assert.ok(nomi.includes('Cura Ferite (Annotato)'));
});

test('PG → nemico: l’appreso (con accesso) è fra gli incantesimi, l’annotato no', async () => {
  const { nemicoDaPg } = await import('../src/nemico-da-pg.js');
  const p = deserializzaPersonaggio(readFileSync(new URL(`../esempi/${TAUMATURGO}`, import.meta.url), 'utf8'));
  const scelte = { ...p.creazione, incantesimiAMano: lista(['Scudo', 'appreso'], ['Cura Ferite', 'annotato']) };
  const n = nemicoDaPg(serializza(scelte, { livelli: p.livelli, sessione: p.sessione }), dati);
  const nomi = (n.nemico?.incantesimi ?? []).map((i) => i.nome);
  assert.ok(nomi.includes('Scudo'), nomi.join(', '));
  assert.ok(!nomi.includes('Cura Ferite'));
});

import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 183 (08/11/2026): le ultime due risposte di Davide — A.259 (uso dei Capolavori) e A.258 (gli Eretici e il
// vecchio catalogo dei nemici sono provvisori). Fra queste prove, due che devono fallire se si torna indietro:
//   - l'uso di un Capolavoro che torna disponibile passando l'oggetto a un altro PG (A.259: il contatore è
//     dell'oggetto, non del personaggio);
//   - il tiro ripetuto che tiene il risultato migliore invece del secondo (A.259: vale il secondo, anche peggiore).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { caricaDati } from '../src/rules.js';
import {
  eCapolavoro, giaUsato, statoCapolavori, capolavoriDisponibili, puoUsare, usaCapolavoro,
  esitoRipetizione, rinnovaCapolavori, daRinnovare, quandoTorna, testoAlTavolo, regoleCapolavoro,
} from '../src/capolavori.js';
import { normalizza } from '../src/character.js';
import { censimento, eProvvisoria, segnoProvvisoria, fonteCanonica, famigliaFonte, notaEretici } from '../src/provvisorie.js';
import { scelteCreatura, profiloNemico, fileUmano } from '../src/crea-nemico.js';
import { vociConUso } from '../src/usi-talenti.js';

const { dati } = await caricaDati((n) => readFile(new URL(`../data/${n}.json`, import.meta.url), 'utf8'));

const voce = (uid, extra = {}) => ({ uid, rif: 'armature:giaccone-rinforzato', stato: 'trasportato', quantita: 1, note: '', ...extra });
const conCapolavori = () => [
  voce('cap-1', { capolavoro: { artigiano: true } }),
  voce('cap-2', { capolavoro: { artigiano: true } }),
  voce('normale'),
];

// ───────────────────────────── A. A.259: i Capolavori ─────────────────────────────

test('A.259: la regola sta nei dati, e il Talento dichiara il «per» che guarda l’oggetto', () => {
  const R = regoleCapolavoro(dati);
  assert.ok(R, 'regole.json → capolavoro');
  assert.equal(R.frequenza, 'sessione');
  assert.equal(R.per_oggetto, true);
  assert.equal(R.quantita, 1);
  assert.equal(R.uno_per_prova, true);
  assert.equal(R.ripetizioni_per_prova, 1);
  assert.equal(R.tiene_il_secondo, true);
  // nel catalogo: usi con «per: capolavoro», come Hacker ha «per: sistema» (lotto 175)
  const t = dati.classi.classi.flatMap((c) => [...c.talenti_fissi, ...c.talenti_a_scelta]).find((x) => x.nome === 'Capolavoro');
  assert.deepEqual(t.usi, { frequenza: 'sessione', quantita: 1, per: 'capolavoro' });
  // quello che l'app non giudica resta scritto, non deciso
  assert.equal(R.al_tavolo.non_giudica.length, 3);
  assert.match(testoAlTavolo(dati), /tavolo/);
  assert.match(quandoTorna(dati), /sessione/i);
});

test('A.259: ogni Capolavoro ha il suo uso — due Capolavori, due usi distinti', () => {
  let eq = conCapolavori();
  assert.deepEqual(statoCapolavori(eq).map((x) => x.uid), ['cap-1', 'cap-2'], 'solo gli oggetti con «capolavoro»');
  assert.equal(capolavoriDisponibili(eq).length, 2);
  // usato il primo, il secondo resta disponibile: non è un uso unico del personaggio
  const r = usaCapolavoro(eq, 'cap-1', dati, { quando: '2026-11-08T12:00:00Z', prova: {} });
  assert.ok(!r.errore, r.errore);
  eq = r.equipaggiamento;
  assert.equal(giaUsato(eq.find((v) => v.uid === 'cap-1')), true);
  assert.equal(giaUsato(eq.find((v) => v.uid === 'cap-2')), false);
  assert.deepEqual(capolavoriDisponibili(eq).map((x) => x.uid), ['cap-2']);
  // lo stesso Capolavoro non si riusa in questa sessione
  const di_nuovo = usaCapolavoro(eq, 'cap-1', dati, { prova: {} });
  assert.ok(di_nuovo.errore);
  assert.match(di_nuovo.errore, /sessione/);
  // il secondo invece sì, in un'altra prova
  assert.ok(!usaCapolavoro(eq, 'cap-2', dati, { prova: {} }).errore);
});

test('A.259: nella stessa prova un solo Capolavoro e una sola ripetizione', () => {
  const eq = conCapolavori();
  const r = usaCapolavoro(eq, 'cap-1', dati, { prova: {} });
  assert.equal(r.prova.capolavoro, 'cap-1');
  assert.equal(r.prova.ripetizioni, 1);
  // un secondo Capolavoro nella stessa prova: no
  const secondo = puoUsare(r.equipaggiamento.find((v) => v.uid === 'cap-2'), r.prova, dati);
  assert.equal(secondo.si, false);
  assert.match(secondo.motivo, /un solo|uno solo/i);
  assert.ok(usaCapolavoro(r.equipaggiamento, 'cap-2', dati, { prova: r.prova }).errore);
  // e nemmeno una seconda ripetizione, pure con un Capolavoro mai usato
  const terzo = puoUsare(r.equipaggiamento.find((v) => v.uid === 'cap-2'), { ripetizioni: 1 }, dati);
  assert.equal(terzo.si, false);
  assert.match(terzo.motivo, /ripetut/i);
  // in una prova nuova il secondo Capolavoro si usa
  assert.equal(puoUsare(r.equipaggiamento.find((v) => v.uid === 'cap-2'), {}, dati).si, true);
});

test('A.259: il tiro ripetuto tiene il SECONDO risultato, anche se è peggiore', () => {
  // la prova che deve fallire se si tiene il migliore invece del secondo
  const peggio = esitoRipetizione({ naturale: 18 }, { naturale: 3 }, dati);
  assert.equal(peggio.vale, 'secondo');
  assert.equal(peggio.secondo.naturale, 3, 'vale il secondo: 3, non il 18');
  assert.equal(peggio.peggiore, true);
  assert.match(peggio.testo, /anche se è peggiore/);
  // e anche quando il secondo è migliore, vale sempre il secondo
  const meglio = esitoRipetizione({ naturale: 4 }, { naturale: 19 }, dati);
  assert.equal(meglio.vale, 'secondo');
  assert.equal(meglio.secondo.naturale, 19);
  assert.equal(meglio.peggiore, false);
  // nessun confronto nasconde il primo: resta da mostrare
  assert.equal(peggio.primo.naturale, 18);
});

test('A.259: trasferito a un compagno, il Capolavoro resta già usato', () => {
  // Il contatore è dell'OGGETTO: il segno viaggia con la voce.
  const r = usaCapolavoro(conCapolavori(), 'cap-1', dati, { quando: '2026-11-08T12:00:00Z', prova: {} });
  const usata = r.equipaggiamento.find((v) => v.uid === 'cap-1');
  // il compagno riceve la stessa voce nel suo inventario
  const altroPg = [voce('suo-elmetto'), usata];
  const suo = statoCapolavori(altroPg).find((x) => x.uid === 'cap-1');
  // la prova che deve fallire se l'uso torna disponibile passando l'oggetto a un altro PG
  assert.equal(suo.usato, true, 'l’uso è dell’oggetto, non di chi lo porta (A.259)');
  assert.equal(suo.disponibile, false);
  assert.equal(puoUsare(usata, {}, dati).si, false);
  assert.equal(capolavoriDisponibili(altroPg).length, 0);
  // e il segno sopravvive alla normalizzazione del file (senza questo si perderebbe a ogni salvataggio)
  const n = normalizza({ nome: 'Compagno', equipaggiamento: altroPg }, dati);
  const dopo = n.scelte.equipaggiamento.find((v) => v.uid === 'cap-1');
  assert.ok(eCapolavoro(dopo), 'resta un Capolavoro');
  assert.equal(giaUsato(dopo), true, 'resta usato dopo la normalizzazione');
  assert.equal(dopo.capolavoro.usato.quando, '2026-11-08T12:00:00Z');
});

test('A.259: «Nuova sessione» rinnova gli usi dei Capolavori', () => {
  let eq = conCapolavori();
  eq = usaCapolavoro(eq, 'cap-1', dati, { prova: {} }).equipaggiamento;
  eq = usaCapolavoro(eq, 'cap-2', dati, { prova: {} }).equipaggiamento;
  assert.equal(daRinnovare(eq), 2);
  const dopo = rinnovaCapolavori(eq);
  assert.equal(daRinnovare(dopo), 0);
  assert.deepEqual(capolavoriDisponibili(dopo).map((x) => x.uid), ['cap-1', 'cap-2']);
  // la voce resta un Capolavoro: si rinnova l'uso, non si cancella l'oggetto
  assert.equal(eCapolavoro(dopo.find((v) => v.uid === 'cap-1')), true);
  // senza usi da rinnovare non cambia niente
  assert.equal(rinnovaCapolavori(dopo), dopo);
});

test('A.259: l’armatura Capolavoro del Corazzaio (A.61) non si confonde con l’uso', () => {
  // una voce con la Contromisura scelta è un Capolavoro a tutti gli effetti, e ha il suo uso
  const eq = [voce('arm', { capolavoro: { contromisura: 'Termico' } })];
  assert.equal(eCapolavoro(eq[0]), true);
  const r = usaCapolavoro(eq, 'arm', dati, { prova: {} });
  assert.ok(!r.errore, r.errore);
  // la Contromisura resta dov'era: l'uso non la tocca
  assert.equal(r.equipaggiamento[0].capolavoro.contromisura, 'Termico');
  assert.equal(giaUsato(r.equipaggiamento[0]), true);
  const n = normalizza({ nome: 'X', equipaggiamento: r.equipaggiamento }, dati);
  assert.equal(n.scelte.equipaggiamento[0].capolavoro.contromisura, 'Termico');
  assert.equal(giaUsato(n.scelte.equipaggiamento[0]), true);
});

test('A.259: il Capolavoro non è più fra i «Da applicare al tavolo» della A.233', async () => {
  const { AL_TAVOLO } = await import('../tools/lotti/lotto_175_frequenze.mjs');
  assert.equal(AL_TAVOLO.Capolavoro, undefined, 'il limite adesso è un numero e l’app lo conta');
  // e il Talento compare fra le voci con un uso del personaggio che lo possiede
  const t = dati.classi.classi.flatMap((c) => [...c.talenti_fissi, ...c.talenti_a_scelta]).find((x) => x.nome === 'Capolavoro');
  const voci = vociConUso({ talenti: [t] });
  const v = voci.find((x) => x.nome === 'Capolavoro');
  assert.ok(v, 'il Talento ha un uso');
  assert.equal(v.frequenza, 'sessione');
  assert.equal(v.per, 'capolavoro', 'il «per» guarda l’oggetto');
});

// ───────────────────────────── B. A.258: le creature provvisorie ─────────────────────────────

test('A.258: i tre gradi dell’Eretico corrotto sono quelli confermati — non cambia niente', async () => {
  const umani = {};
  for (const g of ['minore', 'semplice', 'medio']) {
    const f = fileUmano('eretico', g);
    umani[f] = JSON.parse(await readFile(new URL(`../esempi/nemici/umani/${f}.json`, import.meta.url), 'utf8'));
  }
  const capacita = (scelte) => (profiloNemico(scelte, dati, { umani }).nemico.capacita ?? []).map((x) => x.nome ?? x);
  // Minore: modulo Corrotto «Toccato»
  const minore = scelteCreatura('eretico-corrotto', 'minore', {}, dati);
  assert.equal(minore.corrotto?.livello, 'toccato');
  assert.ok(capacita(minore).includes('Sussurro continuo'));
  // Semplice e Medio: nessun Dono automatico (A.117)
  for (const g of ['semplice', 'medio']) {
    const s = scelteCreatura('eretico-corrotto', g, {}, dati);
    assert.equal(s.corrotto, null, `${g}: nessun modulo Corrotto`);
    const cap = capacita(s);
    for (const dono of ['Sussurro continuo', 'Sguardo del vuoto', 'Presenza terrificante', 'Esposizione alla Corruzione']) {
      assert.ok(!cap.includes(dono), `${g}: niente «${dono}»`);
    }
    assert.equal(profiloNemico(s, dati, { umani }).nemico.ar.magica, 0, `${g}: nessuna AR magica`);
  }
  // Boss: «Consacrato»
  const boss = scelteCreatura('eretico-corrotto', 'medio', { boss: true }, dati);
  assert.equal(boss.corrotto?.livello, 'consacrato');
  const capBoss = capacita(boss);
  for (const dono of ['Sguardo del vuoto', 'Presenza terrificante']) assert.ok(capBoss.includes(dono), `Boss: «${dono}»`);
  assert.equal(profiloNemico(boss, dati, { umani }).nemico.ar.magica, 2);
});

test('A.258: una creatura è provvisoria quando non viene da un manuale, e si vede dalla sua fonte', () => {
  const P = dati.formato_nemici.provvisorie;
  assert.ok(P, 'formato_nemici.json → provvisorie');
  assert.deepEqual(P.fonti_canoniche, ['dal Manuale dei Mostri']);
  assert.deepEqual(P.dove, ['bestiario', 'pagina online', 'crea nemico', 'mini-scheda']);
  const manuale = { nome: 'Aboleth', fonte: 'dal Manuale dei Mostri v0.46 (Word del 27/10/2026), cap. 8 «Catalogo delle creature»' };
  const marcello = { nome: 'Eretico Veterano', fonte: 'costruito come PG (Freelance, Incursore 2, 5° livello)' };
  assert.equal(fonteCanonica(manuale.fonte, dati), true);
  assert.equal(eProvvisoria(manuale, dati), false);
  assert.equal(segnoProvvisoria(manuale, dati), null, 'niente segno sulle canoniche');
  assert.equal(eProvvisoria(marcello, dati), true);
  const segno = segnoProvvisoria(marcello, dati);
  assert.equal(segno.sigla, 'provvisoria');
  assert.match(segno.titolo, /A\.258/);
  // senza fonte: non viene da un manuale
  assert.equal(eProvvisoria({ nome: 'Senza fonte' }, dati), true);
  // la nota sugli Eretici c'è
  assert.match(notaEretici(dati), /Oscura Simmetria/);
});

test('A.258: il censimento — quali creature vengono dai manuali e quali erano state inserite prima', async () => {
  const creature = [];
  for (const d of ['esempi/nemici', 'esempi/nemici/umani', 'esempi/nemici/mostri']) {
    for (const f of await readdir(new URL(`../${d}/`, import.meta.url))) {
      if (!f.endsWith('.json')) continue;
      const j = JSON.parse(await readFile(new URL(`../${d}/${f}`, import.meta.url), 'utf8'));
      creature.push({ id: j.id ?? f, nome: j.nome, fonte: j.fonte });
    }
  }
  const c = censimento(creature, dati);
  assert.equal(c.totale, creature.length);
  assert.ok(c.canoniche.length > 300, `canoniche: ${c.canoniche.length}`);
  assert.ok(c.provvisorie.length > 0 && c.provvisorie.length < 50, `provvisorie: ${c.provvisorie.length}`);
  // le provvisorie sono gli umani costruiti come PG e i due esempi del Tavolo
  for (const p of c.provvisorie) assert.match(p.fonte, /costruito come PG|esempio del Tavolo del Master/);
  // le canoniche vengono tutte dal Manuale dei Mostri
  for (const p of c.canoniche) assert.match(p.fonte, /^dal Manuale dei Mostri/);
  // il censimento raggruppa per famiglia: le tre varianti di un umano fanno una riga sola
  assert.equal(famigliaFonte('costruito come PG (Capitol, Soldato 1, 2° livello)'), 'costruito come PG (Capitol, Soldato N, N° livello)');
  const righe = c.perFonte.filter((r) => r.tipo === 'provvisoria');
  assert.ok(righe.some((r) => r.quante === 3), 'le tre varianti di un tipo umano in una riga');
  assert.equal(righe[0].tipo, 'provvisoria', 'le provvisorie prima, sono quelle che interessano');
  // il Bestiario proposto è provvisorio per intero
  for (const cr of Object.values(dati.bestiario.creature)) assert.equal(eProvvisoria(cr, dati), true, `${cr.nome}`);
});

test('A.258: niente si cancella e niente si disattiva — le creature restano utilizzabili', async () => {
  // il profilo di un Eretico provvisorio si costruisce come prima
  const umani = {};
  for (const g of ['minore', 'semplice', 'medio']) {
    const f = fileUmano('eretico', g);
    umani[f] = JSON.parse(await readFile(new URL(`../esempi/nemici/umani/${f}.json`, import.meta.url), 'utf8'));
  }
  const r = profiloNemico(scelteCreatura('eretico-corrotto', 'minore', {}, dati), dati, { umani });
  assert.ok(r.nemico.pv > 0 && r.nemico.attacchi.length > 0, 'il nemico si usa al tavolo');
  assert.deepEqual(r.errori, []);
  // ed è segnato come provvisorio, ma resta nel bestiario
  assert.ok(segnoProvvisoria(r.nemico, dati), 'il segno c’è');
  assert.ok(Object.values(dati.bestiario.creature).some((c) => c.id === 'eretico-corrotto'), 'la creatura è ancora nel Bestiario');
});

test('A.258: la pagina online porta il segno delle provvisorie', async () => {
  const { aperta } = await import('../tools/bestiario_pagina.mjs');
  const html = await readFile(new URL('../docs/bestiario/bestiario-online.html', import.meta.url), 'utf8');
  const t = aperta(html);
  const quante = (t.match(/bandiera provvisoria/g) ?? []).length;
  assert.ok(quante > 50, `bandiere «provvisoria» nella pagina: ${quante}`);
  assert.match(t, /Creatura provvisoria: non è canonica del bestiario e verrà sostituita/);
  // e le creature del manuale non ce l'hanno: la bandiera non è su tutte
  assert.ok(quante < (t.match(/<article class="scheda"/g) ?? []).length, 'non tutte le schede sono provvisorie');
});

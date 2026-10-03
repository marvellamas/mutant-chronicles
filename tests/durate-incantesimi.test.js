// Durate degli incantesimi lanciati (src/durate-incantesimi.js; dati in incantesimi.json → meccanica.durata, dal
// tools/durate_incantesimi.mjs; scadenza in regole.json → durate_round). Come le Tecniche: contatore della scheda o
// Round dello scontro (src/round-scontro.js); le durate a tempo sono promemoria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { durataLancio, opzioniDurata, registraIncantesimo, terminaIncantesimo, arIncantesimo, incantesimiInCorso, concentrazioniInterrotte, leggiDurata } from '../src/durate-incantesimi.js';
import { alRound, statiScaduti, collegamentoScontro, tecnicheScadute, durateCarta, testoDurata, terminaDurate } from '../src/round-scontro.js';
import { nuovoRound } from '../src/tecniche.js';
import { nuovoScontro, aggiungiNemici, registraTiro, registraLancioNemico, avanti } from '../src/scontro.js';
import { regoleAnticipazione } from '../src/lancio.js';
import { calcolaScheda } from '../src/calc.js';
import { sessioneDaFile } from '../src/tavolo.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { massimiSessione, inizializzaSessione, allineaSessione, nuovaSessione } from '../src/sessione.js';

const { dati } = await datiReali();
const I = (nome) => dati.incantesimi.incantesimi.find((x) => x.nome === nome);
const T0 = new Date(2026, 9, 3, 21, 0, 0);
const sessione = (extra = {}) => ({ pmAttuali: 20, round: 1, ultimaTecnica: null, tecnicheAttive: [], statiAttivi: [], chroma: {}, ...extra });

test('dati: ogni incantesimo ha la sua durata; tipi e valori riconosciuti', () => {
  const tipi = {};
  for (const i of dati.incantesimi.incantesimi) tipi[i.meccanica.durata.tipo] = (tipi[i.meccanica.durata.tipo] ?? 0) + 1;
  assert.deepEqual(tipi, { istantanea: 15, durata: 67, procedura: 7, condizione: 1 });
  assert.deepEqual(leggiDurata('5 RND'), { round: 5, testo: '5 RND' });
  assert.deepEqual(leggiDurata('10 minuti'), { tempo: '10 minuti', testo: '10 minuti' });
  assert.equal(leggiDurata('—'), null);
  // Marchio Psichico: le durate della seconda tabella del manuale, per modalità
  const m = I('Marchio Psichico');
  assert.deepEqual(opzioniDurata(m).modalita.map((x) => x.id), ['inseguimento', 'combattimento']);
  assert.deepEqual([durataLancio(m, 6, { modalita: 'combattimento' }).round, durataLancio(m, 6, { modalita: 'inseguimento' }).testo], [5, '1 ora']);
  // Scudo: con Concentrazione il doppio della durata fissa; Individuare: da chiarire con Davide
  assert.deepEqual([durataLancio(I('Scudo'), 1).round, durataLancio(I('Scudo'), 1, { concentrazione: true }).round], [5, 10]);
  assert.match(opzioniDurata(I('Individuare')).todo, /durata massima a Concentrazione/);
  assert.equal(durataLancio(I('Colpo Elementale'), 1).tipo, 'istantanea');
});

test('incantesimo da 3 Round lanciato al Round 2: scade al Round giusto, con la scheda e in uno scontro', () => {
  const catene = I('Catene di Forza');
  const d = durataLancio(catene, 3);
  assert.deepEqual([d.tipo, d.round], ['round', 3]);
  const s = registraIncantesimo(sessione({ round: 2 }), { nome: catene.nome, livello: 3, durata: d, bersagli: [{ id: 'nem:eretico:1', nome: 'Eretico 1' }] }, dati);
  const x = s.incantesimiAttivi[0];
  assert.deepEqual([x.dal, x.al, x.bersagli[0].nome], [2, 5, 'Eretico 1']);
  // contatore della scheda: Round 3, 4, 5 in corso; al Round 6 scaduto, con l'avviso
  let t = s;
  for (const r of [3, 4, 5]) { t = nuovoRound(t); assert.equal(incantesimiInCorso(t).length, 1, `Round ${r}`); }
  assert.deepEqual(tecnicheScadute(t, 5, 6, dati), ['Catene di Forza']);
  assert.deepEqual(nuovoRound(t).incantesimiAttivi, []);
  // scontro: la scheda vede la sessione al Round dello scontro, stesso risultato
  assert.deepEqual(durateCarta(alRound(s, 4), { round: 4 }, dati).map(testoDurata), ['Catene di Forza · 2 Round']);
  assert.deepEqual(alRound(s, 6).incantesimiAttivi, []);
});

test('durata in minuti: promemoria senza contatore, con l’ora del calendario; resta finché non si termina', () => {
  const inc = I('Mimetismo');
  const d = durataLancio(inc, inc.versioni[1] ? Number(inc.versioni[1].Livello ?? inc.versioni[1]['Livello e PM']) : 1, { concentrazione: true });
  assert.equal(d.tipo, 'tempo');
  const s = registraIncantesimo(sessione({ round: 3 }), { nome: inc.nome, livello: 3, durata: d, bersagli: [{ nome: 'sé', se: true }], quando: 'gio 3 ott 2026, sera' }, dati);
  assert.deepEqual([s.incantesimiAttivi[0].al, s.incantesimiAttivi[0].quando, s.incantesimiAttivi[0].concentrazione], [null, 'gio 3 ott 2026, sera', true]);
  let t = s;
  for (let i = 0; i < 30; i++) t = nuovoRound(t);
  assert.equal(incantesimiInCorso(t).length, 1);
  assert.deepEqual(durateCarta(t, null, dati).map(testoDurata), [`Mimetismo · ${d.testo}`]);
  // un altro incantesimo a Concentrazione termina il primo (Magia, «Durata e Concentrazione»)
  const vista = I('Vista Superiore');
  const u = registraIncantesimo(t, { nome: vista.nome, livello: 3, durata: durataLancio(vista, 3, { concentrazione: true }), bersagli: [] }, dati);
  assert.deepEqual(concentrazioniInterrotte(t, u), ['Mimetismo']);
});

test('Talento che allunga la durata: Anticipazione della durata (con Incantesimi Estesi senza raddoppio dei PM)', () => {
  // Evoca Elementale, livello 6: Durata 10 RND → 20 RND (gradino successivo della scala, sez. 12.3)
  const inc = I('Evoca Elementale');
  const aspetto = inc.meccanica.anticipazione.aspetti.find((a) => a.nome === 'Durata');
  const versione = { livello: 6, pm: 6, riga: inc.versioni[0] };
  const estesi = (k) => (k === 'anticipazione_senza_raddoppio' ? [{ nome: 'Incantesimi Estesi', e: { anticipazione_senza_raddoppio: 'durata' } }] : []);
  const a = regoleAnticipazione(inc.meccanica, aspetto, versione, estesi, dati);
  assert.match(a.regole.map((r) => r.testo).join(' '), /Incantesimi Estesi/);
  assert.deepEqual([durataLancio(inc, 6).round, durataLancio(inc, 6).anticipata], [10, false]);
  const d = durataLancio(inc, 6, { anticipazione: a.valore });
  assert.deepEqual([d.round, d.anticipata], [20, true]);
  const s = registraIncantesimo(sessione({ round: 2 }), { nome: inc.nome, livello: 6, durata: d, bersagli: [] }, dati);
  assert.equal(s.incantesimiAttivi[0].al, 22);
});

test('«Termina» a mano e «Termina le durate» della plancia; «Nuova sessione» li chiude', () => {
  const d = durataLancio(I('Scudo'), 1);
  const s = registraIncantesimo(sessione({ round: 2 }), { nome: 'Scudo', livello: 1, durata: d, bersagli: [] }, dati);
  assert.deepEqual(terminaIncantesimo(s, s.incantesimiAttivi[0].uid).incantesimiAttivi, []);
  assert.deepEqual(terminaDurate(s).incantesimiAttivi, []);
  // nel file del PG (plancia): la lista vuota sostituisce quella del file, poi allineaSessione la toglie
  const file = JSON.parse(readFileSync(new URL('../esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json', import.meta.url), 'utf8'));
  file.sessione = { ...file.sessione, round: 2, incantesimiAttivi: s.incantesimiAttivi };
  const { testo } = sessioneDaFile(JSON.stringify(file), terminaDurate, dati);
  assert.equal(JSON.parse(testo).sessione.incantesimiAttivi, undefined);
});

// Fratello Anselmo Viri (esempi/): conosce Armatura di Forza
const anselmo = (() => {
  const p = deserializzaPersonaggio(readFileSync(new URL('../esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json', import.meta.url), 'utf8'));
  return { creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli ?? [], sessione: p.sessione };
})();

test('Armatura di Forza su di sé: +AR magica finché dura, con la provenienza; alla scadenza l’AR torna com’era', () => {
  const sc = calcolaScheda(anselmo, dati);
  const m = massimiSessione(sc, anselmo.creazione, dati);
  const s0 = allineaSessione(anselmo.sessione ?? inizializzaSessione(m), m);
  const ar = (sessione) => calcolaScheda({ ...anselmo, sessione }, dati).equipaggiamento.arEffettiva;
  const prima = ar(s0);
  const af = I('Armatura di Forza');
  const bonus = arIncantesimo(af, 1, dati);
  assert.deepEqual(bonus, { totale: 2, magica: 2, gruppo: 'pelle_o_forza' });
  const s = allineaSessione(registraIncantesimo({ ...s0, round: 2 }, { nome: af.nome, livello: 1, durata: durataLancio(af, 1), bersagli: [{ nome: 'sé', se: true }], ar: bonus }, dati), m);
  assert.deepEqual([ar(s).totale, ar(s).magica], [prima.totale + 2, prima.magica + 2]);
  assert.ok(ar(s).valori[0].provenienza.righe.some((r) => r.fonte === 'Armatura di Forza' && /fino alla fine del Round 7/.test(r.nota)));
  // Round 7: ancora; Round 8: scaduta (5 RND dal Round 2)
  assert.equal(ar(alRound(s, 7)).totale, prima.totale + 2);
  assert.deepEqual([ar(alRound(s, 8)).totale, ar(alRound(s, 8)).magica], [prima.totale, prima.magica]);
  // su un altro bersaglio non cambia l'AR di chi lancia
  const altro = registraIncantesimo(s0, { nome: af.nome, livello: 1, durata: durataLancio(af, 1), bersagli: [{ id: 'pg:Lucas', nome: 'Lucas' }] }, dati);
  assert.equal(ar(allineaSessione(altro, m)).totale, prima.totale);
  // «Nuova sessione» chiude anche gli incantesimi
  assert.equal(nuovaSessione(s, m).incantesimiAttivi, undefined);
});

test('collaudo: a riposo e senza incantesimi lanciati le sessioni dei PG d’esempio non cambiano', () => {
  for (const f of ['Aiko-Tenzan_liv5_2026-10-02.json', 'Fratello-Anselmo-Viri_liv3_2026-10-02.json', 'Nadia-Ferro_liv4_2026-10-02.json', 'Rhea-Valdis_liv5_2026-10-02.json', 'Torvald-Krane_liv6_2026-10-02.json']) {
    const p = deserializzaPersonaggio(readFileSync(new URL(`../esempi/${f}`, import.meta.url), 'utf8'));
    const pg = { creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli ?? [] };
    const sc = calcolaScheda(pg, dati);
    const m = massimiSessione(sc, pg.creazione, dati);
    const s = allineaSessione(p.sessione, m);
    assert.equal('incantesimiAttivi' in s, false, f);
    assert.deepEqual(calcolaScheda({ ...pg, sessione: s }, dati).equipaggiamento.arEffettiva, calcolaScheda({ ...pg, sessione: alRound(s, 9) }, dati).equipaggiamento.arEffettiva, f);
  }
});

test('incantesimo di un nemico su un PG: registrato nello scontro, visibile al PG, scade alla fine del Round R + N', () => {
  const legionario = JSON.parse(readFileSync(new URL('./nemici/legionario-non-morto.json', import.meta.url), 'utf8'));
  let s = nuovoScontro({ id: 'sc', pg: [{ chiave: 'Lucas', nome: 'Lucas', iniziativa: 3, des: 7, int: 5 }], adesso: T0 });
  s = aggiungiNemici(s, { ...legionario, pm: 10 }, 1, {}, T0);
  const nem = 'nem:legionario-non-morto:1';
  s = registraTiro(registraTiro(s, 'pg:Lucas', 'd10', { valore: 9, origine: 'manuale' }, dati, T0), nem, 'd10', { valore: 1, origine: 'manuale' }, dati, T0);
  s = avanti(avanti(s, T0), T0); // Round 2
  const catene = I('Catene di Forza');
  s = registraLancioNemico(s, { id: nem, incantesimo: catene.nome, livello: 3, pm: 3, durata: { durata: durataLancio(catene, 3), bersagli: [{ id: 'pg:Lucas', nome: 'Lucas' }] } }, T0, dati);
  assert.deepEqual(s.effetti.map((e) => [e.nome, e.dal, e.al, e.daNome]), [['Catene di Forza', 2, 5, 'Legionario Non Morto 1']]);
  assert.match(s.registro.at(-1).testo, /dura fino alla fine del Round 5, su Lucas/);
  let coll = collegamentoScontro(s, 'Lucas');
  assert.deepEqual(durateCarta(sessione({ round: 2 }), coll, dati).map(testoDurata), ['Catene di Forza (da Legionario Non Morto 1) · 4 Round']);
  for (let r = 3; r <= 5; r++) { s = avanti(avanti(s, T0), T0); assert.equal(collegamentoScontro(s, 'Lucas').effetti.length, 1, `Round ${r}`); }
  const al5 = collegamentoScontro(s, 'Lucas');
  s = avanti(avanti(s, T0), T0); // Round 6
  coll = collegamentoScontro(s, 'Lucas');
  // avviso nella scheda del PG collegato (src/ui/app.js → aggiornaRoundScontro)
  assert.deepEqual(statiScaduti(al5, coll), ['Catene di Forza (da Legionario Non Morto 1)']);
  assert.deepEqual([s.round, coll.effetti, s.effetti], [6, [], []]);
  assert.ok(s.registro.some((r) => r.testo === 'Catene di Forza di Legionario Non Morto 1 è finito.'));
});

test('validatore: una durata senza colonna o con un valore non riconosciuto si segnala con file e chiave', async () => {
  const { validaDati } = await import('../src/validate.js');
  const copia = structuredClone(dati);
  const scudo = copia.incantesimi.incantesimi.find((x) => x.nome === 'Scudo');
  scudo.versioni[0]['Durata fissa'] = 'un po’';
  delete copia.incantesimi.incantesimi.find((x) => x.nome === 'Comando').meccanica.durata;
  const errori = validaDati(copia).filter((e) => e.file === 'incantesimi.json');
  assert.ok(errori.some((e) => /Scudo/.test(e.chiave) && /valore non riconosciuto/.test(e.problema)), JSON.stringify(errori));
  assert.ok(errori.some((e) => /Comando/.test(e.chiave)));
});

test('plancia: la carta del PG in uno scontro mostra l’AR al Round dello scontro (Armatura di Forza finita, AR com’era)', async () => {
  const { vistaPlancia } = await import('../src/tavolo.js');
  const file = JSON.parse(readFileSync(new URL('../esempi/Fratello-Anselmo-Viri_liv3_2026-10-02.json', import.meta.url), 'utf8'));
  const af = I('Armatura di Forza');
  const s = registraIncantesimo({ ...file.sessione, round: 2 }, { nome: af.nome, livello: 1, durata: durataLancio(af, 1), bersagli: [{ nome: 'sé', se: true }], ar: arIncantesimo(af, 1, dati) }, dati);
  const testo = JSON.stringify({ ...file, sessione: s });
  const ar = (round) => vistaPlancia(testo, dati, 'Fratello-Anselmo-Viri_liv3_2026-10-02.json', round).ar.totale;
  assert.deepEqual([ar(null) - ar(8), ar(7) - ar(8)], [2, 2]);
});

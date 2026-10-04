// Rinforzi come sottocategoria delle armature (richiesta di Davide del 02/10; Armamenti §7.11.2,
// §7.23; regole.json → rinforzi, per-davide A.80).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { catalogo, risolvi, rinforzoCompatibile, TIPI } from '../src/equipaggiamento.js';
import { normalizza, serializza, deserializzaPersonaggio } from '../src/character.js';
import { SEZIONI_INVENTARIO, sezioneInventario } from '../src/palette.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const scheda = (equip, d = dati) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: equip }, livelli: [] }, d);
const ar = (s) => s.equipaggiamento.ar;
const CIVILE = 'armature:armatura-civile-leggera'; // AR 1, ammette Rinforzi Leggeri e Pesanti (§7.11.2)
const SOPRABITO = 'rinforzi:soprabito-balistico'; // Leggero, indossabile da solo
const PIASTRE = 'rinforzi:kit-di-piastre-supplementari-leggere'; // Leggero, solo montato

test('dati: 32 rinforzi di tipo «rinforzo»; indossabili da soli i 14 soprabiti e mantelli, il Tabardo e la Sottogiacca IES (A.80)', () => {
  const r = catalogo(dati).oggetti.filter((o) => o.rinforzo);
  assert.equal(r.length, 32);
  assert.ok(r.every((o) => o.tipo === 'rinforzo'));
  assert.ok(TIPI.includes('rinforzo'));
  const soli = r.filter((o) => o.indossabile_da_solo).map((o) => o.nome);
  assert.equal(soli.length, 16);
  assert.equal(soli.filter((n) => /^(Soprabito|Mantello)/.test(n)).length, 14);
  assert.ok(soli.includes('Tabardo consacrato') && soli.includes('Sottogiacca protettiva IES'));
  // E&L A.80: profilo autonomo approvato, nessun TODO
  assert.deepEqual(dati.regole.rinforzi.da_solo.profilo, { nome: 'Rinforzo Leggero', ar: 1, magica: 0, categoria: 'Leggera', for_richiesta: 3,
    penalita: { attacchi_ravvicinati: 0, attacchi_distanza: 0, agilita: 0, movimento_q: 0, lancio_potere: -1 } });
  assert.equal(dati.regole.rinforzi['TODO(Davide)'], undefined);
});

test('montato su un’armatura compatibile: AR dell’armatura più il kit (§7.23.5: civile leggera + soprabito = AR 2)', () => {
  const s = scheda([voce('a', CIVILE, 'indossata'), voce('r', SOPRABITO, 'in_uso', { montato_su: 'a' })]);
  assert.equal(ar(s).totale, 2);
  assert.ok(ar(s).valori[0].provenienza.righe.some((x) => x.fonte === 'Soprabito balistico' && x.valore === 1));
  const cat = catalogo(dati);
  assert.equal(rinforzoCompatibile(risolvi(voce('r', SOPRABITO, 'zaino'), cat), risolvi(voce('a', CIVILE, 'indossata'), cat)), true);
  // la Pesante commerciale non ammette rinforzi (§7.11.2)
  assert.equal(rinforzoCompatibile(risolvi(voce('r', SOPRABITO, 'zaino'), cat), risolvi(voce('p', 'armature:armatura-civile-pesante', 'indossata'), cat)), false);
});

test('indossato da solo (A.80): profilo autonomo AR 1, FOR 3, −1 al lancio con Potere, proprietà del capo; con un’armatura non conta', () => {
  const s = scheda([voce('r', SOPRABITO, 'indossata')]);
  assert.equal(ar(s).totale, 1);
  const riga = ar(s).valori[0].provenienza.righe.find((x) => /Soprabito balistico/.test(x.fonte));
  assert.deepEqual([riga.valore, /A.80/.test(riga.nota)], [1, true]);
  const p = s.equipaggiamento.protezioni.find((x) => x.daSolo);
  assert.deepEqual([p.categoria, p.forRichiesta, p.penalita.lancio_potere], ['Leggera', 3, -1]);
  // FOR insufficiente: la penalità ordinaria (MISHIMA_AGENTE ha FOR 6: nessuna)
  assert.equal(p.forMancante, 0);
  // proprietà del capo anche da solo: Feldmantel, Ignifuga 2
  const f = scheda([voce('f', 'rinforzi:soprabito-feldmantel', 'indossata')]);
  assert.ok(f.equipaggiamento.effettiOggetti.some((e) => e.proprieta === 'Ignifuga 2'));
  // Tabardo consacrato: AR 1 ordinaria (Protezione occulta resta un bonus alle PS, non AR magica)
  const t = scheda([voce('t', 'rinforzi:tabardo-consacrato', 'indossata')]);
  assert.deepEqual([ar(t).totale, ar(t).magica], [1, 0]);
  // un solo capo conta: due soprabiti non si sommano
  assert.equal(ar(scheda([voce('r', SOPRABITO, 'indossata'), voce('m', 'rinforzi:mantello-balistico', 'indossata')])).totale, 1);
  // le piastre non si indossano da sole: lo stato «indossata» non è ammesso e non conta
  const pi = risolvi(voce('p', PIASTRE, 'indossata'), catalogo(dati));
  assert.deepEqual([pi.stati, pi.attivo], [['in_uso', 'zaino'], false]);
  // indossato da solo mentre si porta un'armatura: non conta, va montato (§7.11.2), con l'avviso
  const conArmatura = scheda([voce('a', CIVILE, 'indossata'), voce('r', SOPRABITO, 'indossata')]);
  assert.equal(ar(conArmatura).totale, 1);
  assert.ok(conArmatura.equipaggiamento.avvisi.some((x) => /indossato da solo, ma c’è un’armatura indossata/.test(x)));
});

test('armatura tolta (A.80): il rinforzo strutturale resta montato e non dà nulla; il capo autonomo usa il suo profilo', () => {
  const s = scheda([voce('a', CIVILE, 'zaino'), voce('r', SOPRABITO, 'in_uso', { montato_su: 'a' })]);
  assert.equal(ar(s).totale, 1);
  assert.equal(dati.regole.rinforzi.armatura_tolta, 'resta_montato');
  assert.ok(s.equipaggiamento.avvisi.some((x) => /Soprabito balistico era montato su Armatura civile leggera, che non è indossata: lo porti da solo/.test(x)), s.equipaggiamento.avvisi.join(' | '));
  const k = scheda([voce('a', CIVILE, 'zaino'), voce('k', PIASTRE, 'in_uso', { montato_su: 'a' })]);
  assert.equal(ar(k).totale, 0);
  assert.ok(k.equipaggiamento.avvisi.some((x) => /è montato su Armatura civile leggera, che non è indossata: nessun effetto/.test(x)));
});

test('migrazione: un salvataggio con il rinforzo che era un accessorio montato resta montato sulla stessa armatura', () => {
  // file esportato prima del cambio: la voce non dice il tipo (viene dal catalogo), stato «in_uso» e montato_su
  const vecchio = { ...MISHIMA_AGENTE, equipaggiamento: [voce('a', CIVILE, 'indossata'), voce('r', 'rinforzi:rinforzo-pesante', 'in_uso', { montato_su: 'a' })] };
  const p = deserializzaPersonaggio(serializza(vecchio, [], dati));
  const { scelte } = normalizza(p.creazione, dati);
  const r = scelte.equipaggiamento.find((v) => v.uid === 'r');
  assert.deepEqual([r.stato, r.montato_su], ['in_uso', 'a']);
  const s = calcolaScheda({ creazione: scelte, livelli: [] }, dati);
  // civile leggera + kit pesante: AR 3, penalità della Media (§7.11.2)
  assert.equal(s.equipaggiamento.ar.totale, 3);
  assert.equal(s.equipaggiamento.protezioni[0].categoria, 'Media');
});

test('Inventario: i Rinforzi sono una sottosezione delle Armature, con il loro colore', () => {
  const rinf = SEZIONI_INVENTARIO.find((x) => x.id === 'rinforzi');
  const prot = SEZIONI_INVENTARIO.find((x) => x.id === 'protezioni');
  assert.deepEqual([rinf.sottosezioneDi, rinf.colore], ['protezioni', prot.colore]);
  assert.equal(sezioneInventario(risolvi(voce('r', SOPRABITO, 'zaino'), catalogo(dati))).id, 'rinforzi');
  assert.equal(SEZIONI_INVENTARIO.indexOf(rinf), SEZIONI_INVENTARIO.indexOf(prot) + 1);
});

test('A.80: un capo «in uso» senza armatura su cui è montato (salvataggi vecchi) vale da solo, con l’avviso', () => {
  const s = scheda([voce('a', CIVILE, 'zaino'), voce('r', SOPRABITO, 'in_uso')]);
  assert.equal(ar(s).totale, 1);
  assert.ok(s.equipaggiamento.avvisi.some((x) => /Soprabito balistico è in uso senza un’armatura su cui montarlo: lo porti da solo/.test(x)));
  // con l'armatura indossata ma senza «Montata su:» non conta (va montato)
  assert.equal(ar(scheda([voce('a', CIVILE, 'indossata'), voce('r', SOPRABITO, 'in_uso')])).totale, 1);
});

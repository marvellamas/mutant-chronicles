// Rinforzi come sottocategoria delle armature (richiesta di Davide del 02/10; Armamenti §7.11.2,
// §7.23; regole.json → rinforzi, per-davide A.79).
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

test('dati: 32 rinforzi di tipo «rinforzo»; soprabiti e mantelli indossabili da soli; regola in regole.json', () => {
  const r = catalogo(dati).oggetti.filter((o) => o.rinforzo);
  assert.equal(r.length, 32);
  assert.ok(r.every((o) => o.tipo === 'rinforzo'));
  assert.ok(TIPI.includes('rinforzo'));
  assert.deepEqual(r.filter((o) => o.indossabile_da_solo).every((o) => /^(Soprabito|Mantello)/.test(o.nome)), true);
  assert.equal(r.filter((o) => o.indossabile_da_solo).length, 14);
  // §7.23.4: «non costituiscono un profilo autonomo di armatura»; il resto con Davide (A.79)
  assert.equal(dati.regole.rinforzi.da_solo.ar, 'nessuna');
  assert.match(dati.regole.rinforzi['TODO(Davide)'], /A\.79/);
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

test('indossato da solo: con la regola del manuale nessuna AR (riga a 0 nella provenienza); con «propria» l’AR del kit', () => {
  const s = scheda([voce('r', SOPRABITO, 'indossata')]);
  assert.equal(ar(s).totale, 0);
  const riga = ar(s).valori[0].provenienza.righe.find((x) => x.fonte === 'Soprabito balistico');
  assert.deepEqual([riga.valore, /§7\.23\.4/.test(riga.nota)], [0, true]);
  // se Davide decide che da solo vale la sua AR (regole.json → rinforzi.da_solo.ar «propria»)
  const d2 = copia(dati);
  d2.regole.rinforzi.da_solo.ar = 'propria';
  assert.equal(ar(scheda([voce('r', SOPRABITO, 'indossata')], d2)).totale, 1);
  // le piastre non si indossano da sole: lo stato «indossata» non è ammesso e non conta
  const p = risolvi(voce('p', PIASTRE, 'indossata'), catalogo(dati));
  assert.deepEqual([p.stati, p.attivo], [['in_uso', 'zaino'], false]);
  // indossato da solo mentre si porta un'armatura: non conta, va montato (§7.11.2), con l'avviso
  const conArmatura = scheda([voce('a', CIVILE, 'indossata'), voce('r', SOPRABITO, 'indossata')]);
  assert.equal(ar(conArmatura).totale, 1);
  assert.ok(conArmatura.equipaggiamento.avvisi.some((x) => /indossato da solo, ma c’è un’armatura indossata/.test(x)));
});

test('armatura tolta: il rinforzo resta montato su di lei, non dà AR e l’app lo dice', () => {
  const s = scheda([voce('a', CIVILE, 'zaino'), voce('r', SOPRABITO, 'in_uso', { montato_su: 'a' })]);
  assert.equal(ar(s).totale, 0);
  assert.equal(dati.regole.rinforzi.armatura_tolta, 'resta_montato');
  assert.ok(s.equipaggiamento.avvisi.some((x) => /Soprabito balistico è montato su Armatura civile leggera, che non è indossata/.test(x)), s.equipaggiamento.avvisi.join(' | '));
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

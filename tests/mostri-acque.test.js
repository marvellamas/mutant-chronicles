// Blocco «Creature delle acque e popoli sommersi» (cap. 8 del Manuale dei Mostri v0.23): dieci profili validi,
// nuoto nelle capacità, pesci senza moto a terra, lance a una/due mani/scagliate, Rete e Stringere come
// capacità, tossina del Chuul con tre dosi al giorno, Kuo-toa AR 3, GS/PX informativo, Spazio quadrato.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { validaNemico } from '../src/validate.js';

const { dati } = await datiReali();
const dir = new URL('../esempi/nemici/mostri/', import.meta.url);
const leggi = (id) => JSON.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'));

const ACQUE = ['granchio-gigante', 'polpo-gigante', 'squalo-delle-scogliere', 'squalo-cacciatore', 'squalo-gigante',
  'marinide', 'merrow', 'sahuagin', 'kuo-toa', 'chuul'];

test('i dieci profili ci sono, sono validi e vengono dal cap. 8', () => {
  for (const id of ACQUE) {
    const n = leggi(id);
    assert.deepEqual(validaNemico(n, dati, id), [], `${id} valido`);
    assert.match(n.fonte, /dal Manuale dei Mostri v0\.\d+/);
    // lotto 205: la 0.69 descrive il nuoto nelle «Sensi e corpo» o nelle pagine del blocco invece che in una
    // capacità che si chiama «Nuoto». Quello che deve restare vero è che la creatura nuoti, non come si chiama la riga.
    assert.match(JSON.stringify(n), /nuot/i, `${id}: il nuoto deve restare scritto da qualche parte`);
  }
});

test('gli squali non hanno moto a terra (passo 0, Corsa e Scatto non consentiti) e Spazio 1×1 / 2×2 / 3×3', () => {
  for (const [id, spazio] of [['squalo-delle-scogliere', '1 Q'], ['squalo-cacciatore', '2 × 2 Q'], ['squalo-gigante', '3 × 3 Q']]) {
    const n = leggi(id);
    assert.deepEqual(n.movimento, { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito' }, id);
    assert.equal(n.spazio, spazio, id);
  }
  // lotto 205: la 0.69 riscrive il testo e il nome della capacità; si controlla l’informazione, non la frase.
  assert.match(JSON.stringify(leggi('squalo-gigante')), /10 \/ 20 \/ 30/);
});

test('Frenesia del sangue: VA 14 (cacciatore) e 16 (gigante); Tattiche di branco 12 solo per lo squalo delle scogliere', () => {
  // lotto 205: la 0.69 scrive «Il VA diventa 14» dove la 0.46 scriveva «VA 14». Si controlla il numero, non la frase.
  assert.match(leggi('squalo-cacciatore').capacita.find((c) => c.nome === 'Frenesia del sangue').effetto, /\b14\b/);
  assert.match(leggi('squalo-gigante').capacita.find((c) => c.nome === 'Frenesia del sangue').effetto, /\b16\b/);
  assert.match(leggi('squalo-delle-scogliere').capacita.find((c) => c.nome === 'Tattiche di branco').effetto, /\b(12|\+2)\b/);
  assert.ok(!leggi('squalo-gigante').capacita.some((c) => c.nome === 'Tattiche di branco'));
});

test('lance: una mano, due mani e scagliata (distanza, 4 Q; 2 Q in acqua nella nota) per Marinide, Sahuagin e Kuo-toa', () => {
  for (const id of ['marinide', 'sahuagin', 'kuo-toa']) {
    const att = leggi(id).attacchi;
    assert.ok(att.some((a) => a.nome === 'Lancia a una mano') && att.some((a) => a.nome === 'Lancia a due mani'), id);
    const sc = att.find((a) => a.nome === 'Lancia scagliata');
    assert.deepEqual([sc.tipo, sc.gittata_q, sc.modalita], ['distanza', 4, ['S']], id);
    assert.match(sc.note, /2 Q in acqua/);
  }
  assert.equal(leggi('marinide').attacchi.find((a) => a.nome === 'Lancia a due mani').danno, '1d6+3');
  assert.equal(leggi('sahuagin').attacchi.find((a) => a.nome === 'Lancia a due mani').danno, '1d6+4');
  assert.ok(leggi('marinide').abilita.some((a) => a.nome === 'Oratoria' && a.va === 10), 'Diplomazia → Oratoria');
});

test('Stringere, Rete, Inchiostro, Tentacoli velenosi, Comando degli squali → capacità con PM e usi dai dati', () => {
  const cap = (id, n) => leggi(id).capacita.find((c) => c.nome === n);
  // lotto 205: la 0.69 riscrive il testo e il nome della capacità; si controlla l’informazione, non la frase.
  assert.match(JSON.stringify(leggi('granchio-gigante')), /Stringere/);
  assert.match(JSON.stringify(leggi('polpo-gigante')), /Avvolgere/);
  assert.deepEqual(cap('polpo-gigante', 'Nube di inchiostro').usi, { quanti: 1, per: 'giorno' });
  assert.equal(cap('sahuagin', 'Comando degli squali').risorsa, '2 PM');
  assert.ok(cap('kuo-toa', 'Rete') && cap('kuo-toa', 'Scudo adesivo'));
  assert.ok(!leggi('kuo-toa').attacchi.some((a) => a.nome === 'Rete'), 'la Rete non infligge danno: capacità');
  const tossina = cap('chuul', 'Tentacoli velenosi (tossina paralizzante)');
  assert.deepEqual(tossina.usi, { quanti: 3, per: 'giorno' });
  assert.match(tossina.effetto, /Tempra −2/);
  assert.deepEqual(leggi('chuul').attacchi.map((a) => a.nome), ['Chela']);
  assert.deepEqual(leggi('chuul').immunita, ['avvelenato']);
});

test('Merrow: arpione in mischia e scagliato (4 Q); aggancio, trazione e liberazione nelle capacità', () => {
  const m = leggi('merrow');
  assert.deepEqual(m.attacchi.map((a) => a.nome), ['Morso', 'Artigli', 'Arpione in mischia', 'Arpione scagliato']);
  assert.equal(m.attacchi.find((a) => a.nome === 'Arpione scagliato').gittata_q, 4);
  for (const n of ['Aggancio dell’arpione', 'Tirare', 'Liberarsi dall’arpione']) assert.ok(m.capacita.some((c) => c.nome === n), n);
  assert.match(m.capacita.find((c) => c.nome === 'Tirare').effetto, /360 kg/);
});

test('Kuo-toa: AR 3 con lo Scudo (1 senza, nella nota); GS/PX informativo', () => {
  assert.equal(leggi('kuo-toa').ar.totale, 3);
  assert.match(leggi('kuo-toa').note, /senza Scudo 1/);
  assert.deepEqual(leggi('marinide').gs_px, { gs: 'Principiante', px: 11, per_pg: 4 });
  assert.deepEqual(leggi('merrow').gs_px, { gs: 'Esperto', px: 33, per_pg: 4 });
  assert.deepEqual(leggi('sahuagin').gs_px, { gs: 'Inesperto', px: 22, per_pg: 4 });
});

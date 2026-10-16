// A.162 (risposta di Davide approvata il 16/10/2026): proprietà esplicita «Indistruttibile» e tre stati
// dell'Integrità. Un PI assente non significa indistruttibile e non significa rotto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali, copia } from './helpers.js';
import { catalogo, normalizzaEquipaggiamento } from '../src/equipaggiamento.js';
import { integritaOggetto, oggettiConPi, oggettiIndistruttibili, oggettiIntegritaDaDefinire } from '../src/protezione.js';
import { calcolaScheda } from '../src/calc.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, extra = {}) => ({ uid, rif, stato: 'zaino', quantita: 1, ...extra });

test('A.162: i tre stati stanno nei dati, con il predefinito «ordinaria»', () => {
  const S = dati.regole.integrita.stati;
  assert.equal(S.predefinito, 'ordinaria');
  assert.deepEqual(S.elenco.map((x) => x.id), ['ordinaria', 'indistruttibile', 'da_definire']);
  const per = (id) => S.elenco.find((x) => x.id === id);
  assert.equal(per('ordinaria').pi, true, 'l’ordinaria traccia i PI');
  assert.equal(per('indistruttibile').pi, false);
  assert.match(per('indistruttibile').testo, /non provoca perdita di PI/);
  assert.equal(per('da_definire').pi, false);
  assert.equal(per('da_definire').avviso, true, 'si segnala');
  assert.match(per('da_definire').testo, /Non vale come indistruttibile e non vale come oggetto rotto/);
  assert.match(S._nota_estensione, /non si estende/i);
});

test('A.162: lo stato si legge dal campo, non dedotto dal PI mancante', () => {
  assert.equal(integritaOggetto({ def: {} }, dati).id, 'ordinaria');
  assert.equal(integritaOggetto({ def: { pi: null } }, dati).id, 'ordinaria', 'senza PI non diventa indistruttibile');
  assert.equal(integritaOggetto({ def: { integrita: 'indistruttibile' } }, dati).id, 'indistruttibile');
  assert.equal(integritaOggetto({ def: { integrita: 'da_definire' } }, dati).id, 'da_definire');
  assert.equal(integritaOggetto({ voce: { personalizzato: { integrita: 'indistruttibile' } } }, dati).id, 'indistruttibile', 'anche un oggetto scritto a mano');
  assert.equal(integritaOggetto({ def: { integrita: 'boh' } }, dati).id, 'ordinaria', 'un valore sconosciuto non inventa nulla');
});

test('A.162: lo Scrigno del Primo Giuramento è Indistruttibile, con la sua regola', () => {
  const s = catalogo(dati).perRif.get('artefatti:scrigno-del-primo-giuramento');
  assert.ok(s, 'lo Scrigno è nel catalogo');
  assert.equal(s.integrita, 'indistruttibile');
  assert.match(s._nota_integrita, /non consente di forzarne l’apertura/);
  assert.match(s._nota_integrita, /non si estende ai Sigilli/);
  assert.equal(s.pi, undefined, 'niente PI da tracciare');
  // e la proprietà non è scappata su altri Artefatti
  const altri = catalogo(dati).oggetti.filter((o) => o.integrita === 'indistruttibile').map((o) => o.id);
  assert.deepEqual(altri, ['scrigno-del-primo-giuramento']);
});

test('A.162: un Indistruttibile non entra fra gli oggetti con PI e si vede nella scheda', () => {
  const equip = [voce('e1', 'artefatti:scrigno-del-primo-giuramento'), voce('e2', 'armi:coltello', { stato: 'impugnata' })];
  const scheda = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: equip }, livelli: [] }, dati);
  const eq = scheda.equipaggiamento;
  assert.equal(eq.integrita.some((x) => x.uid === 'e1'), false, 'lo Scrigno non ha PI da tracciare');
  assert.ok(eq.integrita.some((x) => x.uid === 'e2'), 'il coltello sì');
  assert.deepEqual(eq.indistruttibili.map((x) => x.uid), ['e1']);
  assert.match(eq.indistruttibili[0].stato.etichetta, /Indistruttibile/);
  assert.match(eq.indistruttibili[0].nota, /forzarne l’apertura/);
  assert.deepEqual(eq.integritaDaDefinire, []);
});

test('A.162: «Integrità da definire» si segnala, senza essere né indistruttibile né rotto', () => {
  const d = copia(dati);
  // un oggetto del catalogo con il dato mancante dichiarato
  const coltello = d.equipaggiamento.file.armi.oggetti.find((o) => o.id === 'coltello');
  coltello.integrita = 'da_definire';
  const equip = [voce('e1', 'armi:coltello')];
  const oggetti = normalizzaEquipaggiamento(equip);
  const eq = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: equip }, livelli: [] }, d).equipaggiamento;
  assert.deepEqual(eq.integritaDaDefinire.map((x) => x.uid), ['e1']);
  assert.equal(eq.integrita.some((x) => x.uid === 'e1'), false, 'non si tracciano PI di un dato mancante');
  assert.deepEqual(eq.indistruttibili, [], 'e non diventa indistruttibile');
  assert.equal(oggetti.length, 1);
});

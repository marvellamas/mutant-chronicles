// A.163 (precisazione di Davide del 16/10/2026): i Contenitori del Silenzio schermano qualsiasi contenuto.
// L'indicazione «Schermatura attiva / inattiva» dipende solo da tre condizioni — contenuto interamente
// riposto, contenitore chiuso, schermatura integra — e non da che cosa c'è dentro. Nessun calcolo
// automatico della Corruzione.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { catalogo } from '../src/equipaggiamento.js';
import { calcolaScheda } from '../src/calc.js';
import { MISHIMA_AGENTE } from './personaggi.js';
import { massimiSessione, inizializzaSessione, allineaSessione, commutaContenitoreSessione } from '../src/sessione.js';
import { schermaQualcosa, statoContenitore, statoSchermatura, contenitoriSchermanti, commutaContenitore } from '../src/schermatura.js';
import { normalizzaEquipaggiamento, risolvi } from '../src/equipaggiamento.js';

const { dati } = await datiReali();
const r = (rif) => catalogo(dati).perRif.get(rif);
const CONTENITORI = ['custodia-del-silenzio', 'zaino-del-silenzio', 'cofanetto-del-silenzio'];

test('A.163: i tre Contenitori del Silenzio sono nel catalogo e schermano', () => {
  for (const id of CONTENITORI) {
    const c = r(`dotazioni_personali:${id}`);
    assert.ok(c, id);
    assert.equal(c.schermatura.corruzione, 1);
    assert.equal(c.schermatura.snt, 0);
    assert.ok(schermaQualcosa(c));
    // §10.13: Qualità, PI, PS Integrità, costo e REP restano da definire → A.162, terzo stato
    assert.equal(c.integrita, 'da_definire');
    assert.equal(c.costo, null);
  }
  const S = dati.regole.schermatura;
  assert.deepEqual(S.condizioni.map((x) => x.id), ['riposto', 'chiuso', 'integra']);
  assert.equal(S.qualsiasi_contenuto, true);
  assert.match(S.non_elimina, /non elimina la Corruzione/);
  assert.match(S.nessun_calcolo, /non calcola la Corruzione/);
});

test('A.163: la schermatura è attiva solo con tutte e tre le condizioni', () => {
  const s = (stato, opz) => statoSchermatura(stato, opz, dati);
  assert.equal(s({}, {}).attiva, false);
  assert.equal(s({ chiuso: true }, {}).attiva, false, 'chiuso ma contenuto non riposto');
  assert.equal(s({ riposto: true }, {}).attiva, false, 'riposto ma aperto');
  assert.equal(s({ chiuso: true, riposto: true }, {}).attiva, true);
  assert.equal(s({ chiuso: true, riposto: true }, { rotto: true }).attiva, false, 'schermatura compromessa');
  // i motivi dicono che cosa manca
  assert.deepEqual(s({}, {}).motivi, ['il contenuto non è interamente riposto', 'il contenitore è aperto']);
  assert.deepEqual(s({ chiuso: true, riposto: true }, { rotto: true }).motivi, ['la schermatura è compromessa (contenitore rotto)']);
  assert.equal(s({ chiuso: true, riposto: true }, {}).etichetta, 'Schermatura attiva');
  assert.equal(s({}, {}).etichetta, 'Schermatura inattiva');
  assert.match(s({}, {}).nota, /non elimina la Corruzione/);
});

test('A.163: qualsiasi contenuto, nessun elenco di oggetti ammessi', () => {
  // nel catalogo non c'è nessun elenco di oggetti schermabili
  for (const id of CONTENITORI) {
    const c = r(`dotazioni_personali:${id}`);
    assert.equal(c.schermatura.oggetti, undefined, `${id}: nessun elenco`);
    assert.equal(c.schermatura.contenuto_previsto, undefined);
  }
  // e lo stato non dipende dall'oggetto contenuto: la funzione non lo riceve nemmeno
  // lo stato non guarda il contenuto: cambiando oggetto dentro il risultato non cambia
  const a1 = statoSchermatura({ chiuso: true, riposto: true }, {}, dati);
  const a2 = statoSchermatura({ chiuso: true, riposto: true }, { rotto: false }, dati);
  assert.deepEqual(a1.condizioni, a2.condizioni);
  assert.equal(a1.attiva, true);
  // la nota dice che gli oggetti di Park sono esempi
  assert.match(dati.regole.schermatura._qualsiasi_contenuto, /esempi d’uso, non un elenco/);
});

test('A.163: «chiuso» e «contenuto riposto» si cambiano con un tocco e restano nella sessione', () => {
  const equip = [{ uid: 'c1', rif: 'dotazioni_personali:custodia-del-silenzio', stato: 'zaino', quantita: 1 }];
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: equip };
  const scheda = calcolaScheda({ creazione, livelli: [] }, dati);
  const m = massimiSessione(scheda, creazione, dati);
  let s = allineaSessione(inizializzaSessione(m), m);
  assert.equal(s.contenitori, undefined, 'la chiave c’è solo quando serve');
  assert.deepEqual(statoContenitore(s, 'c1'), { chiuso: false, riposto: false });
  s = commutaContenitoreSessione(s, 'c1', 'chiuso', m);
  assert.deepEqual(s.contenitori, { c1: { chiuso: true } });
  s = commutaContenitoreSessione(s, 'c1', 'riposto', m);
  assert.deepEqual(statoContenitore(s, 'c1'), { chiuso: true, riposto: true });
  assert.equal(statoSchermatura(statoContenitore(s, 'c1'), {}, dati).attiva, true);
  // spegnendo tutto la chiave sparisce
  s = commutaContenitoreSessione(commutaContenitoreSessione(s, 'c1', 'chiuso', m), 'c1', 'riposto', m);
  assert.equal(s.contenitori, undefined);
  // uno uid che non è più nell'inventario non resta nella sessione
  const sporca = allineaSessione({ ...inizializzaSessione(m), contenitori: { ignoto: { chiuso: true } } }, m);
  assert.equal(sporca.contenitori, undefined);
  // la funzione pura non tocca la mappa di partenza
  const base = { c1: { chiuso: true } };
  assert.deepEqual(commutaContenitore(base, 'c1', 'riposto'), { c1: { chiuso: true, riposto: true } });
  assert.deepEqual(base, { c1: { chiuso: true } });
});

test('A.163: i contenitori del personaggio si trovano dagli oggetti, qualunque cosa contengano', () => {
  const equip = [
    { uid: 'c1', rif: 'dotazioni_personali:custodia-del-silenzio', stato: 'zaino', quantita: 1 },
    { uid: 'c2', rif: 'dotazioni_personali:zaino-del-silenzio', stato: 'zaino', quantita: 1 },
    { uid: 'x1', rif: 'armi:coltello', stato: 'zaino', quantita: 1 },
  ];
  const oggetti = normalizzaEquipaggiamento(equip).map((v) => risolvi(v, catalogo(dati)));
  const trovati = contenitoriSchermanti(oggetti);
  assert.deepEqual(trovati.map((x) => x.uid), ['c1', 'c2']);
  assert.equal(trovati[0].schermatura.corruzione, 1);
});

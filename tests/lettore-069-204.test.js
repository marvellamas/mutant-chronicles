import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 204 (16/11/2026), parte E — **i casi della prova nel browser, in automatico.**
//
// Nel 203 la prova sulla plancia ha trovato quattro difetti che i test non vedevano, e non è stato un caso: stanno
// fra il motore e quello che si vede. Qui restano scritti i casi che quella prova ha coperto, perché la prossima
// volta li tenga il test e la prova nel browser possa cercare altro.
//
// **Il caso che non deve tornare mai rosso:** una scheda che il lettore non leggeva affatto sulla 0.69 (il
// Vampiro: la sua riga «Armatura e Difese» mandava fuori AR e Difese, e senza quelle la scheda non si scriveva)
// adesso ha attacchi e Abilità completi, e ogni suo campo dichiara da dove viene.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { campiPresenti, provenienza, schedaMista, rigaProvenienza } from '../src/provenienza-bestiario.js';
import { modiDiMovimento } from '../tools/importa-mostri.mjs';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const leggi = (id) => JSON.parse(readFileSync(join(RADICE, 'esempi', 'nemici', 'mostri', `${id}.json`), 'utf8'));
const ED = 'Mostri 0.69';

test('una delle schede che il lettore non leggeva: attacchi e Abilità completi, e la provenienza di ogni campo', () => {
  const v = leggi('vampiro');
  // nel lotto 203 questa scheda non esisteva: restava fuori perché «Armatura e Difese» non era un’etichetta nota
  assert.equal(v.pv, 156);
  assert.deepEqual(v.ar, { totale: 4, magica: 1 }, 'AR e componente magica dalla riga «Armatura e Difese»');
  assert.equal(v.difese, 15);
  assert.equal(v.attacchi.length, 2, 'Colpo disarmato e Morso, letti come attacchi e non messi fra le capacità');
  const colpo = v.attacchi.find((a) => /Colpo disarmato/.test(a.nome));
  assert.deepEqual(
    { va: colpo.va, danno: colpo.danno, natura: colpo.natura, portata_q: colpo.portata_q, ac: colpo.ac },
    { va: 16, danno: '2d6+3', natura: 'Naturale', portata_q: 1, ac: 1 },
    'il danno con la virgola («2d6+3 Naturale; AC 1») e la portata «Contatto» si leggono',
  );
  assert.ok(v.abilita.length >= 6, 'le Abilità ci sono tutte');
  // ogni campo presente dichiara da dove viene
  const p = provenienza(v);
  for (const k of campiPresenti(v)) assert.ok(p[k], `${k}: senza provenienza`);
});

test('l’AC non compare due volte: è il campo dell’attacco, non una sua proprietà', () => {
  // trovato nel browser: la 0.69 scrive l’AC dentro la cella del danno e la plancia leggeva «AC 1 · AC 1»
  for (const id of ['vampiro', 'lorath']) {
    for (const a of leggi(id).attacchi ?? []) {
      const doppia = (a.proprieta ?? []).filter((x) => /^AC\s*\d+$/i.test(x));
      assert.deepEqual(doppia, [], `${id} / ${a.nome}: l’AC è anche fra le proprietà, e la plancia la scrive due volte`);
      assert.ok(a.ac !== undefined, `${id} / ${a.nome}: l’AC deve esserci, nel suo campo`);
    }
  }
});

test('una scheda mista lo dice, una tutta alla 0.69 no — i due casi visti nella plancia', () => {
  const lorath = leggi('lorath');
  const vampiro = leggi('vampiro');
  assert.ok(schedaMista(lorath, ED), 'il Lorath tiene gli attacchi della 0.47');
  assert.equal(provenienza(lorath).attacchi, 'Mostri 0.47');
  assert.equal(provenienza(lorath).pv, ED, 'ma i PV sono della 0.69');
  const riga = rigaProvenienza(lorath, ED);
  assert.match(riga, /Attacchi da Mostri 0\.47/);
  assert.ok(!/viene da/.test(riga), 'l’italiano della riga non dipende dal numero dei campi');
  assert.equal(schedaMista(vampiro, ED), false);
  assert.equal(rigaProvenienza(vampiro, ED), null, 'niente riga dove non c’è niente da dire');
});

test('i modi di movimento: una regola, non un elenco di etichette', () => {
  // «Terra, scavo e volo», «Terra e arrampicata con appigli», «Terra e volo levitante»: la terra c’è, e si legge
  for (const e of ['Terra, scavo e volo', 'Terra e arrampicata con appigli', 'Terra e volo levitante', 'Terra e nuoto nativo']) {
    assert.ok(modiDiMovimento(e).includes('terra'), `«${e}»: la terra deve risultare fra i modi`);
  }
  assert.deepEqual(modiDiMovimento('Terra, scavo e volo'), ['terra', 'scavo', 'volo']);
  assert.ok(!modiDiMovimento('Solo nuoto').includes('terra'), 'chi solo nuota non cammina');
  assert.ok(!modiDiMovimento('Volo levitante').includes('terra'));
});

test('le creature a due forme: letta quella di base, e l’altra dichiarata (A.273)', () => {
  // i licantropi danno due andature e due ingombri; il formato ne tiene uno
  const lupo = leggi('lupo-mannaro');
  assert.deepEqual(lupo.movimento, { passo: 6, corsa: 12, scatto: 18 }, 'la forma umanoide, la prima scritta');
  // e l’andatura dell’altra forma **non si perde**: resta scritta fra le capacità, dove il Direttore la legge
  const testo = JSON.stringify(lupo.capacita ?? []);
  assert.match(testo, /lupo: 8 \/ 16 \/ 24 Q/, 'l’andatura della forma animale resta nelle capacità');
  assert.match(testo, /1 × 2 Q/, 'e il suo ingombro');
  // l’ingombro della scheda resta dichiaratamente non letto: due misure, e il formato ne tiene una (A.273)
  assert.equal(lupo.spazio, undefined, 'meglio nessun ingombro che quello sbagliato per la forma in cui si presenta');
});

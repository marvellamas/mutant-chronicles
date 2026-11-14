// Lotto 195 (14/11/2026): i prezzi si leggono dal manuale, l'Anello (A.263) e la CyberArma (A.265).
//
// I due controlli che devono restare verdi sempre, e sono i primi due di questo file:
//   1. **nessun prezzo di catalogo è ricalcolato**: ogni cifra dei dati è quella scritta nella tabella del
//      manuale, letta dal testo in docs/manuali-txt/. Se qualcuno, un domani, facesse scrivere i prezzi dalla
//      formula, due voci cambierebbero subito (la Pietra della Vigilanza e i Guanti, dove il manuale scrive una
//      cifra che la formula non ritrova) e questo test diventerebbe rosso.
//   2. **nessuna catena Grado → potenza → rarità → SnT è in disaccordo** senza un'eccezione dichiarata con il
//      motivo. È il controllo che mancava: fino al 13/11 l'Anello stava nei dati come «Grado III, Molto Rara,
//      SnT 3» e la CyberArma come «Comune, SnT 2», e nessuno se ne accorgeva perché `snt_per_impiego` saltava il
//      confronto.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogo } from '../src/equipaggiamento.js';
import { prezzoArtefatto, prezzoDiVendita, verificaFormula, raritaArtefatto } from '../src/prezzi-artefatti.js';
import { sntCyberArma, sntProgetto } from '../src/cyberarma.js';
import { prezziDalManuale, pergameneDalManuale, consumabiliDalManuale, PREZZI_A_TESTO } from '../tools/lotti/lotto_195_prezzi.mjs';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const art = dati.equipaggiamento.file.artefatti;
const voce = (id) => cat.perRif.get(`artefatti:${id}`);
const blocco = (rif) => art.artefatti_catalogo.find((a) => a.rif === rif);

// --- 1. i prezzi vengono dal manuale, non dalla formula ---------------------------------------------------------

test('A.261: ogni prezzo di catalogo è la cifra scritta nella tabella del manuale (non ricalcolata)', () => {
  const riserve = prezziDalManuale();
  const pergamene = pergameneDalManuale();
  assert.ok(riserve.size >= 60, `le tabelle del §10 danno ${riserve.size} voci: il testo non si legge più`);
  assert.equal(pergamene.size, 6);
  let controllate = 0;
  for (const [id, m] of [...riserve, ...pergamene, ...Object.entries(PREZZI_A_TESTO)]) {
    const v = voce(id);
    if (!v) continue;
    controllate++;
    assert.equal(v.costo, m.costo, `${id}: il prezzo dei dati deve essere quello scritto nel manuale`);
    if (Number.isFinite(m.creazione_cr)) assert.equal(v.creazione_cr, m.creazione_cr, `${id}: costo di creazione`);
    if (m.reperibilita) assert.equal(v.reperibilita, m.reperibilita, `${id}: REP`);
  }
  assert.ok(controllate >= 69, `controllate ${controllate} voci: ne aspettavo almeno 69 (23 Batterie, 19 Matrice, 23 Schegge, 6 pergamene, 3 a testo)`);
  // e la tabella dei Consumabili del §27.2, che fino alla Magia 1.11 aveva una regola di prezzo sua («× 2»)
  for (const g of consumabiliDalManuale()) {
    const riga = art.consumabili.gradi.find((x) => x.grado === g.grado);
    assert.deepEqual([riga.reagenti, riga.creazione, riga.vendita, riga.reperibilita], [g.reagenti, g.creazione, g.vendita, g.reperibilita], `Grado ${g.grado}`);
  }
  assert.equal(art.consumabili.vendita_moltiplicatore, undefined, 'il «× 2» della 1.11 non c’è più (A.261)');
});

test('A.261: dove la cifra scritta non torna con la formula, resta la cifra scritta e l’app lo dice', () => {
  // Le due voci del catalogo in cui il conto del §24.3 non ritrova il prezzo del manuale. Sono ambiguità
  // dichiarate, non errori: se qualcuno le «correggesse» col calcolo, questo test lo direbbe.
  const ambigue = [['pietra-della-vigilanza', 4000, 12600], ['guanti-da-combattimento-mistico', 3000, 13800]];
  for (const [id, scritto, calcolato] of ambigue) {
    const v = voce(id);
    assert.equal(v.costo, scritto, `${id}: resta il prezzo scritto nel manuale`);
    const p = prezzoArtefatto(v, dati);
    assert.equal(p.cr, scritto, `${id}: è quello che l’app usa`);
    assert.equal(p.verifica.torna, false, `${id}: la formula non lo ritrova`);
    assert.equal(p.verifica.calcolato, calcolato, `${id}: e la scheda dice quanto darebbe`);
  }
  // tutte le altre tornano: il conto conferma la cifra scritta
  const nonTornano = cat.oggetti.filter((o) => { const r = verificaFormula(o, dati); return r && !r.torna; }).map((o) => o.id);
  assert.deepEqual(nonTornano.sort(), ambigue.map(([id]) => id).sort(), 'le voci in cui la formula non torna sono esattamente quelle dichiarate');
});

test('A.261 e A.262: l’«Epica» ha il suo coefficiente, e i quattro Artefatti di Grado V hanno un prezzo', () => {
  assert.equal(dati.regole.prezzi_artefatti.coefficienti.Epica, 4);
  assert.deepEqual(Object.keys(dati.regole.prezzi_artefatti.coefficienti), ['Comune', 'Non Comune', 'Rara', 'Molto Rara', 'Epica', 'Leggendaria']);
  const epica = cat.oggetti.filter((o) => o.artefatto?.potenza === 'Epica');
  assert.ok(epica.length >= 4);
  for (const o of epica) {
    const p = prezzoArtefatto(o, dati);
    assert.equal(p.coefficiente, 4, o.id);
    assert.equal(p.motivo, null, `${o.id}: niente più «la A.256 non dà il coefficiente dell’Epica»`);
    assert.ok(Number.isFinite(p.cr), o.id);
  }
  assert.equal(prezzoDiVendita(1000, 'Epica', dati).cr, 12000, '1.000 × 3 × 4 = 12.000 cr');
});

// --- 2. la catena Grado → potenza → rarità → SnT ----------------------------------------------------------------

test('la catena Grado → potenza → SnT si accorda per ogni Artefatto, o l’eccezione è dichiarata col motivo', () => {
  const { gradi, potenze, solo_passive: soloPassive } = art.sintonizzazione;
  assert.deepEqual(gradi, { I: 'Comune', II: 'Non Comune', III: 'Rara', IV: 'Molto Rara', V: 'Epica', VI: 'Leggendaria' });
  const blocchi = [
    ...cat.oggetti.filter((o) => o.artefatto?.potenza).map((o) => [o.id, o.artefatto]),
    ...art.artefatti_catalogo.filter((a) => a.potenza).map((a) => [a.rif, a]),
  ];
  assert.ok(blocchi.length >= 50, `trovati ${blocchi.length} Artefatti con una potenza: ne aspettavo almeno 50`);
  const eccezioni = [];
  for (const [id, a] of blocchi) {
    if (a.snt_eccezione) {
      // un'eccezione senza la regola che la decide e il motivo è un dato dimenticato, non una scelta
      assert.ok(a.snt_eccezione.regola && a.snt_eccezione.motivo, `${id}: eccezione senza regola o senza motivo`);
      assert.ok(a.snt_eccezione.motivo.length > 40, `${id}: il motivo deve dire perché, non una parola`);
      eccezioni.push(id);
      continue;
    }
    if (a.grado) assert.equal(a.potenza, gradi[a.grado], `${id}: Grado ${a.grado} vuole potenza ${gradi[a.grado]}`);
    const attesa = a.proprieta_attive === false ? soloPassive.snt : potenze[a.potenza];
    assert.equal(a.sintonizzazione, attesa, `${id}: potenza ${a.potenza} vuole SnT ${attesa}`);
  }
  // oggi l'unica eccezione dichiarata è l'Hachimaki (Magia §28.1): l'Anello non ne ha più bisogno (A.263)
  assert.deepEqual(eccezioni, ['hachimaki-della-disciplina-interiore']);
  // e ogni potenza nominata dai Gradi ha un coefficiente di prezzo: senza, un Artefatto resterebbe senza prezzo
  for (const p of Object.values(gradi)) assert.ok(Number.isFinite(dati.regole.prezzi_artefatti.coefficienti[p]), p);
});

// --- A.263: l'Anello ---------------------------------------------------------------------------------------------

test('A.263: l’Anello è Grado IV, Molto Rara, SnT 4, e l’eccezione del lotto 181 non c’è più', () => {
  const v = voce('anello-di-rigenerazione-9');
  assert.deepEqual([v.artefatto.grado, v.artefatto.potenza, v.artefatto.sintonizzazione], ['IV', 'Molto Rara', 4]);
  assert.equal(v.artefatto.snt_eccezione, undefined);
  assert.equal(v['TODO(Davide)'], undefined);
  // il prezzo resta quello della A.256: 1.500 × 3 × 3 = 13.500 cr, e l'ipotesi dei reagenti del Grado IV è scritta
  assert.equal(prezzoArtefatto(v, dati).vendita, 13500);
  assert.match(v._nota_prezzo, /Ipotesi dichiarata/);
  assert.match(v._nota_prezzo, /22\.500/, 'il conto che darebbero i reagenti del Grado IV è scritto, non applicato');
  // la capacità di Sintonizzazione che occupa viene dal campo, non da un numero scritto altrove
  assert.equal(v.artefatto.sintonizzazione, 4);
  // nessun personaggio d'esempio lo ha: è una configurazione del catalogo
  assert.equal(v.catalogo, 'Artefatti di campagna');
});

// --- A.265: la CyberArma -----------------------------------------------------------------------------------------

test('A.265: potenza Rara, Grado III, SnT base 3, con le riduzioni 2 / 1 / 0', () => {
  for (const rif of ['armi:cyberarma', 'armi:cyberarma-batteria-verde', 'armi:cyberarma-nec']) {
    const b = blocco(rif);
    assert.deepEqual([b.potenza, b.grado, b.sintonizzazione], ['Rara', 'III', 3], rif);
    assert.deepEqual(b.sintonizzazione_per_classe, { Tecnomante: 2, Custode: 1 }, rif);
    assert.deepEqual([b.sintonizzazione_costruttore.classe, b.sintonizzazione_costruttore.snt], ['Custode', 0], rif);
    assert.ok(b.sintonizzazione_costruttore.condizione.length > 20, `${rif}: la condizione dello 0 va scritta`);
  }
  // quattro impieghi, un numero ciascuno, e la scala sempre accanto
  assert.equal(sntCyberArma('armi:cyberarma', dati, { classe: 'Tecnomante' }).snt, 2);
  assert.equal(sntCyberArma('armi:cyberarma', dati, { classe: 'Custode' }).snt, 1);
  assert.equal(sntCyberArma('armi:cyberarma', dati, { classe: 'Custode', costruttore: true }).snt, 0);
  assert.equal(sntCyberArma('armi:cyberarma', dati, { classe: 'Assaltatore' }).snt, 3);
  // il costruttore conta solo se è un Custode: un Tecnomante non costruisce originali (§7.25)
  assert.equal(sntCyberArma('armi:cyberarma', dati, { classe: 'Tecnomante', costruttore: true }).snt, 2);
});

test('A.265: nel progetto si legge quale SnT si applica, non si indovina', () => {
  const m = cat.perRif.get('armi:cyberarma').progetti.find((p) => p.id === 'paradise-dimitri');
  const s = sntProgetto({ ...m, rif: 'armi:cyberarma' }, dati);
  assert.equal(s.snt, 2, 'il progetto di Paradise è del Tecnomante');
  assert.match(s.testo, /^SnT 2 — impiego del Tecnomante/);
  // e la scala intera è accanto, con i quattro numeri: 0 del costruttore compreso
  assert.deepEqual(s.scala.map((x) => x.snt), [0, 1, 2, 3]);
  assert.match(s.testo, /Custode costruttore 0/);
  assert.match(s.testo, /base 3/);
});

test('A.265: il valore indicativo dell’originale è quello scritto nel manuale, e resta un pezzo unico', () => {
  const o = cat.perRif.get('armi:cyberarma');
  assert.deepEqual([o.costo, o.creazione_cr, o.unico], [7500, 1250, true]);
  assert.equal(prezzoDiVendita(1250, 'Rara', dati).cr, 7500, '1.250 × 3 × 2: la formula conferma la cifra scritta');
  assert.equal(raritaArtefatto(o, dati), 'Unico o reliquia', 'un pezzo unico non ha prezzo di listino');
  assert.equal(prezzoArtefatto(o, dati).vendita, null);
  assert.equal(prezzoArtefatto(o, dati).cr, 7500, 'ma il valore indicativo si legge');
  // le tariffe delle modifiche e i quattro totali sono quelli del §7.25
  const m = o.modifiche;
  assert.deepEqual([m.predisposizione_batteria.cr, m.riserva_cm_5.cr, m.riserva_cm_10.cr, m.conversione_nec.cr, m.modulatore_neurale.cr], [1000, 2000, 4000, 2000, 1500]);
  assert.match(m.totali, /con NeC Rosso 10 9\.900 cr/);
});

// --- A.266 e la frase della Matrice -----------------------------------------------------------------------------

test('A.266: la nota dei NEC del §2.16.1 conta le cariche, e il TODO non c’è più', () => {
  const c = dati.dotazioni.comune;
  assert.equal(c['TODO(Davide)'], undefined, 'la A.266 ha risposta (Giocatore 0.63)');
  const nota = c.note.find((n) => n.includes('UER, UEB e UEV'));
  assert.match(nota, /Una carica CEC contiene 10 UE/);
  assert.match(nota, /tampone da 100 cariche NEC/);
  assert.ok(!nota.includes('1 UE dello stesso colore ripristina dieci cariche personali'), 'la frase in UE della 0.54 non c’è più');
  // ed è esattamente il modello che l'app ha dal lotto 146
  assert.equal(dati.regole.nec.trasformatori.tampone_cariche ?? dati.regole.nec.trasformatori.tampone?.cariche ?? 100, 100);
});

test('la frase dei Cristalli Matrice è quella della Magia 1.17', () => {
  const f = dati.regole.chroma.cristalli_matrice.frasi;
  assert.ok(f.some((x) => x.includes('resta possibile beneficiare della loro influenza o usare frammenti ricevuti in gioco')));
  assert.ok(!f.some((x) => x.includes('non sono attualmente accessibili')), 'la frase della 1.11 non c’è più');
});

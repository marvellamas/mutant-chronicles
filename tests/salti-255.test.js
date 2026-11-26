import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 255, parte B — **i Salti ordinari a fasce di Atletica** (regola approvata da Davide il 24/11/2026 nell'E&L,
// recepita nel Giocatore 0.69 §5.2.8 con tabella nativa e nel Direttore 0.53 §9.10).
//
// Il metro è **l'esempio del manuale**, e questo file lo rifà per intero: con Atletica 18, da fermo si scavalcano
// 2 Q vuoti o si supera 1,5 m; con rincorsa 4 Q vuoti o 3 m; e **il lungo massimo con rincorsa richiede 7 Q di
// movimento, 2 di rincorsa e 5 dallo stacco all'arrivo**. Quei 7 Q sono il controllo che tiene chiuso il chiarimento
// esplicito di Davide — «saltare 1 Q» è scavalcare un Q vuoto e atterrare nel successivo — perché con il conto
// sbagliato verrebbero 6.
//
// Le altre due cose da non sbagliare, provate qui: i modificatori alla Prova **non** cambiano la fascia (si legge sul
// VA personale), e l'app **mostra** i quattro valori senza applicarli: nessuna Prova, nessun tiro, niente sulla mappa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dati, contesto, resa, TAB } from './scheda-aiuti.js';
import { fasciaSalto, movimentoDelSalto, vistaSalti, testoAltezza, testoLungo } from '../src/salti.js';
import { fasceDalManuale, sezioneSalti } from '../tools/lotti/lotto_255_salti.mjs';
import { testoManuale } from '../tools/manuali.mjs';

test('parte B: l’esempio del manuale con Atletica 18 torna, compresi i 7 Q di Movimento', () => {
  const s = vistaSalti(18, dati.regole, { passo: 6, corsa: 12, scatto: 18 });
  assert.equal(s.fascia, '16–25');
  assert.equal(s.lungoFermo, '2 Q vuoti');
  assert.equal(s.lungoRincorsa, '4 Q vuoti');
  assert.equal(s.altoFermo, '1,5 m');
  assert.equal(s.altoRincorsa, '3 m');
  // «il salto in lungo massimo con rincorsa richiede 7 Q di movimento: 2 di rincorsa e 5 dallo stacco all’arrivo»
  assert.equal(s.qRincorsa, 7, 'i 7 Q dell’esempio: 2 di rincorsa + 4 Q vuoti scavalcati + 1 Q di atterraggio');
  assert.equal(s.qFermo, 3, 'da fermo: 2 Q vuoti + 1 Q di atterraggio');
  // e il manuale lo dice: «Il Passo base di 6 Q non basta»
  assert.ok(s.qRincorsa > dati.regole.movimento.passo, 'il Passo base di 6 Q non basta');
  assert.equal(s.bastaIlMovimento.fermo, true);
  assert.equal(s.bastaIlMovimento.rincorsa, true, 'con la Corsa o lo Scatto i 7 Q ci sono');
});

test('parte B: le sei fasce dei dati sono quelle della tabella del manuale', () => {
  const dal = fasceDalManuale(sezioneSalti(testoManuale('giocatore')));
  assert.equal(dal.length, 6);
  assert.deepEqual(dati.regole.salti.fasce, dal, 'i dati sono la tabella del manuale, non una formula applicata da noi');
  // e la formula delle fasce ulteriori è dichiarata, non dedotta
  const o = dati.regole.salti.oltre_la_tabella;
  assert.deepEqual([o.ogni_punti, o.lungo_q, o.alto_cm], [10, 1, 50]);
  const oltre = fasciaSalto(56, dati.regole);
  assert.deepEqual([oltre.da, oltre.a, oltre.lungoFermoQ, oltre.altoFermoCm], [56, 65, 6, 350]);
  assert.deepEqual([oltre.lungoRincorsaQ, oltre.altoRincorsaCm], [12, 700], 'con rincorsa restano doppi');
});

test('parte B: nella fascia 1–5 non ci sono Q vuoti da raddoppiare', () => {
  const f = fasciaSalto(3, dati.regole);
  assert.deepEqual([f.lungoFermoQ, f.lungoRincorsaQ], [0, 0], 'il lungo resta al Q adiacente');
  assert.equal(testoLungo(f.lungoFermoQ, dati.regole), 'Q adiacente');
  assert.deepEqual([f.altoFermoCm, f.altoRincorsaCm], [50, 100], 'l’altezza raddoppia comunque');
  // e il Q adiacente costa un Q di Movimento: ci si entra, non si scavalca niente
  assert.equal(movimentoDelSalto(f, { regole: dati.regole }), 1);
});

test('parte B: i modificatori alla Prova non cambiano la fascia', () => {
  // Torvald porta la Corazza Ussara, che gli dà −1 ad Atletica: il VA effettivo è 10, il personale 11. La fascia si
  // legge sull'11 — «bonus e penalità alla Prova non cambiano la fascia della tabella» (§5.2.8).
  // con Ferite Grave la penalità alla Prova è grossa e porta il VA effettivo in un'altra fascia: è il caso che
  // distingue le due letture (con la Corazza Ussara da sola, −1, Torvald resterebbe nella stessa fascia).
  const c = contesto('Torvald-Krane_liv6_2026-10-02.json', { attiva: 'combattimento', cambia: (s) => { s.ferite = 5; } });
  const ab = c.tab.scheda.abilita.find((a) => a.nome === 'Atletica');
  assert.ok(ab.effettivo < ab.totale, 'il caso serve: la penalità alla Prova c’è');
  const testo = resa(c).testo();
  const atteso = vistaSalti(ab.totale, dati.regole).fascia;
  const conPenalita = vistaSalti(ab.effettivo, dati.regole).fascia;
  assert.notEqual(atteso, conPenalita, 'il caso serve: le due letture danno fasce diverse');
  assert.match(testo, new RegExp(`fascia ${atteso}`), `la scheda mostra la fascia del VA personale (${atteso}), non quella del VA effettivo (${conPenalita})`);
});

test('parte B: i quattro valori si vedono nelle regole di movimento, e in nessun riquadro nuovo', () => {
  const c = contesto('Torvald-Krane_liv6_2026-10-02.json', { attiva: 'combattimento' });
  const r = resa(c);
  const testo = r.testo();
  assert.match(testo, /Salti/, 'la riga dei Salti c’è');
  assert.match(testo, /lungo .*con rincorsa .*alto .*con rincorsa/, 'i quattro valori, in una riga');
  assert.match(testo, /Movimento richiesto: \d+ Q da fermo, \d+ Q con rincorsa/);
  // sta dentro il riquadro del Movimento che c'era già: nessun riquadro in più (lo spazio non si rimette dentro)
  const riquadri = [...r.classe('riquadro-valore')];
  const mov = riquadri.find((x) => /Movimento/.test(x.textContent) && /Passo · Corsa · Scatto/.test(x.textContent));
  assert.ok(mov, 'il riquadro del Movimento si trova');
  assert.match(mov.textContent, /Salti/, 'i Salti stanno dentro quel riquadro');
  const senza = resa(contesto('Torvald-Krane_liv6_2026-10-02.json', { attiva: 'identita' }));
  assert.equal([...senza.classe('riquadro-valore')].filter((x) => /Salti/.test(x.textContent)).length, 0, 'solo nel Combattimento');
});

test('parte B: l’app mostra e non applica — nessuna Prova, nessun tiro, niente sulla mappa', () => {
  const src = readFileSync(new URL('../src/salti.js', import.meta.url), 'utf8');
  for (const vietato of [/\bprova\(/i, /\btira\(/i, /Math\.random/, /\bd20\b/]) {
    assert.doesNotMatch(src, vietato, `src/salti.js non deve tirare né risolvere Prove: ${vietato}`);
  }
  // e la regola resta scritta: il Direttore decide quando serve una Prova
  assert.match(dati.regole.salti.al_tavolo, /Direttore/);
  // niente nella mappa parla di salti: non si applica da sé su una pedina
  const mappa = readFileSync(new URL('../src/mappa/area.js', import.meta.url), 'utf8');
  assert.doesNotMatch(mappa, /salti|salto/i, 'il salto non si applica da sé sull’area di movimento (dichiarato fuori)');
});

test('parte B: senza Atletica non si inventa una fascia', () => {
  assert.equal(fasciaSalto(0, dati.regole), null);
  assert.equal(fasciaSalto(null, dati.regole), null);
  assert.equal(vistaSalti(undefined, dati.regole), null);
  assert.equal(testoAltezza(null), null);
});

test('parte B: le otto tab di tre personaggi non mostrano segnaposto per i salti', () => {
  for (const file of ['Torvald-Krane_liv6_2026-10-02.json', 'Fratello-Anselmo-Viri_liv3_2026-10-02.json', 'Aiko-Tenzan_liv5_2026-10-02.json']) {
    for (const attiva of TAB) {
      const testo = resa(contesto(file, { attiva })).testo();
      assert.doesNotMatch(testo, /fascia undefined|fascia null|NaN Q|undefined Q/, `${file} · ${attiva}`);
    }
  }
});

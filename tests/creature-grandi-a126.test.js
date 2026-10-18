// Creature grandi e capacità dei nemici: A.126 (campo Spazio), A.133 (portata attorno all'ingombro),
// A.126–A.138 (origine dei coni) e A.115 (capacità con parametri e usi). Risposte approvate il 15/10/2026.
// Nessuna regressione: i nemici senza i campi nuovi restano come oggi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datiReali } from './helpers.js';
import { ingombroDaTaglia, spazioDi, celleToken, liberoPer } from '../src/mappa/token.js';
import { pezziDellaScena } from '../src/mappa/partecipanti.js';
import { distanzaIngombri, inPortata, celleZoc, portataDi, attacchiDiOpportunita } from '../src/mappa/zoc.js';
import { perimetroToken, origineConoCreatura, qCoperto, celleTemplate, nuovoTemplate } from '../src/mappa/template.js';
import { vistaCapacita, capacitaDi, segnaUso, azzeraPerRound, testoUsi, testoAzioni } from '../src/capacita-nemico.js';
import { mappaSemplice } from '../src/mappa/semplice.js';
import { profiloNemico } from '../src/crea-nemico.js';

const { dati } = await datiReali();
const RT = dati.mappa.template;
const tok = (q, ingombro) => ({ id: `t${q.join('')}`, rif: { tipo: 'partecipante', id: 'x' }, q, ingombro, nascosto: false });

// --- A.126: campo Spazio ---------------------------------------------------------------------------

test('A.126: il lato della pedina viene dal campo «spazio» del profilo, non dalla Taglia', () => {
  const campo = dati.formato_nemici.campi.spazio;
  assert.equal(campo.tipo, 'testo');
  assert.ok(new RegExp(campo.modello).test('2 × 3 Q') && new RegExp(campo.modello).test('3 × 10 Q') && new RegExp(campo.modello).test('1 Q') && !new RegExp(campo.modello).test('2 Q'));
  assert.equal(campo.obbligatorio, false);
  assert.equal(dati.mappa.token.creatura_ingombro_max, 12);
  assert.equal(ingombroDaTaglia({ spazio: '3 × 3 Q' }, dati), 3);
  assert.equal(ingombroDaTaglia({ spazio: '2 × 2 Q' }, dati), 2);
  assert.equal(ingombroDaTaglia({ spazio: '1 Q', taglia: 'grande' }, dati), 1, 'vale il profilo, non la Taglia');
  assert.equal(spazioDi({ spazio: '2 × 2 Q' }), '2 × 2 Q');
  assert.equal(spazioDi({ taglia: 'grande' }), null);
});

test('A.126: nessuna regressione per i nemici senza il campo', () => {
  assert.equal(ingombroDaTaglia({ taglia: 'grande' }, dati), 2, 'resta il lato della Taglia');
  assert.equal(ingombroDaTaglia({ taglia: 'normale' }, dati), 1);
  assert.equal(ingombroDaTaglia({}, dati), 1);
  assert.equal(ingombroDaTaglia(null, dati), 1);
  assert.equal(ingombroDaTaglia('grande', dati), 2, 'la vecchia chiamata con la sola Taglia funziona ancora');
});

test('A.126: il pezzo dello scontro prende l’ingombro dal profilo', () => {
  const nemico = (id, scheda) => ({ id, tipo: 'nemico', nome: id, lato: 'avversario', pv: { attuali: 10, massimo: 10 }, stati: [], scheda });
  const scontro = { id: 's1', round: 1, turno: 0, partecipanti: [
    nemico('n1', { nome: 'Colosso', spazio: '3 × 3 Q', attacchi: [] }),
    nemico('n2', { nome: 'Bestia', taglia: 'grande', attacchi: [] }),
    nemico('n3', { nome: 'Sgherro', attacchi: [] }),
  ] };
  const pezzi = pezziDellaScena({ scontro }, dati);
  const ing = (id) => pezzi.find((p) => p.chiave === `partecipante:${id}`)?.ingombro;
  assert.equal(ing('n1'), 3, 'dal campo spazio');
  assert.equal(ing('n2'), 2, 'dalla Taglia, come prima');
  assert.equal(ing('n3'), 1);
});

test('A.126: una pedina 2 × 2 e una 3 × 3 occupano i Q giusti e non passano dove non ci stanno', () => {
  const grande = tok([2, 2], 2);
  assert.deepEqual(celleToken(grande).sort(), [[2, 2], [2, 3], [3, 2], [3, 3]].sort());
  const enorme = tok([0, 0], 3);
  assert.equal(celleToken(enorme).length, 9);
  // il passaggio si verifica sull'ingombro: un corridoio di 1 Q non lascia passare una pedina 2 × 2
  const muro = (x, y) => y === 5 && x !== 4; // corridoio aperto solo in (4, 5)
  const opzioni = { token: [], tranne: null, muro, colonne: 10, righe: 10 };
  assert.equal(liberoPer([4, 5], 1, opzioni), true, 'la pedina 1 × 1 passa dal corridoio');
  assert.equal(liberoPer([4, 5], 2, opzioni), false, 'la 2 × 2 no');
  assert.equal(liberoPer([3, 5], 3, opzioni), false, 'nemmeno la 3 × 3');
});

// --- A.133: portata attorno all'ingombro -----------------------------------------------------------

test('A.133: la portata si misura attorno all’ingombro, e 2 × 2 non dà portata 2', () => {
  // creatura 3 × 3 in (0,0)-(2,2) con portata 1 Q: raggiunge chi le sta attorno, non chi è a 2 Q dal bordo
  const grande = tok([0, 0], 3);
  const vicino = tok([3, 1], 1);
  const lontano = tok([4, 1], 1);
  assert.equal(distanzaIngombri(grande.q, grande.ingombro, vicino.q, vicino.ingombro), 1, 'dal bordo, non dal centro');
  assert.equal(distanzaIngombri(grande.q, grande.ingombro, lontano.q, lontano.ingombro), 2);
  const a = { token: grande, portata: 1, dz: 0 };
  assert.equal(inPortata(vicino.q, vicino.ingombro, a), true);
  assert.equal(inPortata(lontano.q, lontano.ingombro, a), false, 'l’ingombro non allunga la portata');
  // la portata viene dal profilo del singolo attacco, non dalla Taglia
  const profilo = (portata) => ({ scheda: { attacchi: [{ tipo: 'ravvicinato', portata_q: portata }] } });
  assert.equal(portataDi(profilo(1), dati), 1);
  assert.equal(portataDi(profilo(3), dati), 3);
  assert.equal(portataDi({ scheda: { attacchi: [] } }, dati), dati.mappa.zoc.portata_predefinita);
});

test('A.133: la ZoC di una creatura grande è la fascia attorno all’ingombro', () => {
  const grande = tok([1, 1], 2); // (1,1)-(2,2)
  const scena = { griglia: { colonne: 8, righe: 8 } };
  const m = celleZoc(scena, [{ token: grande, portata: 1, dz: 0 }]);
  const dentro = (x, y) => m[y * 8 + x] === 1;
  assert.equal(dentro(0, 0), true, 'angolo esterno adiacente');
  assert.equal(dentro(3, 3), true);
  assert.equal(dentro(1, 1), false, 'i Q della creatura non sono nella fascia');
  assert.equal(dentro(4, 1), false, 'a 2 Q dal bordo no');
  // uscendo dalla fascia si provoca l'Attacco di Opportunità, con la portata del profilo
  const percorso = [[3, 1], [4, 1]];
  assert.equal(attacchiDiOpportunita(percorso, 1, [{ token: grande, portata: 1, dz: 0 }]).length, 1);
  assert.equal(attacchiDiOpportunita([[3, 1], [3, 2]], 1, [{ token: grande, portata: 1, dz: 0 }]).length, 0, 'spostarsi dentro la fascia no');
});

test('A.133: con «Mappa semplice» accesa la mappa non calcola nulla', () => {
  assert.equal(mappaSemplice({ semplice: true }), true);
  assert.equal(mappaSemplice({ semplice: false }), false);
  assert.equal(mappaSemplice({}), false, 'le scene di prima restano come sono');
  assert.match(dati.mappa.zoc._nota_portata_creature, /Mappa semplice/);
});

// --- A.126–A.138: origine dei coni -----------------------------------------------------------------

test('A.126–A.138: il cono di una creatura grande parte da un quadretto periferico del lato dell’emissione', () => {
  const CC = dati.mappa.template.cono_creature;
  assert.equal(CC.origine, 'perimetro');
  assert.equal(CC.esclude_ingombro, true);
  const enorme = tok([2, 2], 3); // (2,2)-(4,4)
  // tutti i Q del 3 × 3 tranne quello centrale sono perimetro
  const peri = perimetroToken(enorme);
  assert.equal(peri.length, 8);
  assert.equal(peri.some(([x, y]) => x === 3 && y === 3), false, 'il quadretto interno non è periferico');
  // soffio verso l'alto: parte dalla fila settentrionale
  const su = origineConoCreatura(enorme, [3.5, -5]);
  assert.equal(su[1], 2, 'fila nord');
  // verso destra: colonna orientale
  assert.equal(origineConoCreatura(enorme, [20, 3.5])[0], 4);
  // il master sposta l'origine muovendo il puntatore lungo il lato: verso nord-ovest prende l'angolo
  assert.deepEqual(origineConoCreatura(enorme, [-5, -5]), [2, 2]);
  // creatura 1 × 1: nulla cambia, parte dal suo quadretto
  assert.deepEqual(origineConoCreatura(tok([6, 6], 1), [20, 6]), [6, 6]);
});

test('A.126–A.138: i quadretti della creatura sono esclusi dal suo cono', () => {
  const enorme = tok([2, 2], 3);
  const escludi = celleToken(enorme);
  const base = { id: 'c1', forma: 'cono', origine: [3, 2], direzione: 270, misure: { lunghezza: 6, larghezza: 4 }, colore: 'rosso' };
  const senza = celleTemplate(base, { colonne: 12, righe: 12 }, RT);
  const con = celleTemplate({ ...base, escludi }, { colonne: 12, righe: 12 }, RT);
  const coperto = (m, x, y) => m[y * 12 + x] === 1;
  // un cono verso l'alto non tocca comunque il corpo, ma l'esclusione vale comunque per ogni Q occupato
  for (const [x, y] of escludi) assert.equal(coperto(con, x, y), false, `${x},${y} escluso`);
  assert.equal(qCoperto({ ...base, escludi }, 3, 3, RT), false);
  assert.ok(senza.length === con.length);
  // nuovoTemplate conserva l'esclusione solo quando c'è
  assert.deepEqual(nuovoTemplate({ ...base, escludi }).escludi.length, 9);
  assert.equal(nuovoTemplate({ ...base }).escludi, undefined);
});

// --- A.115: capacità dei nemici --------------------------------------------------------------------

test('A.115: si mostrano i parametri che il profilo dà, e nient’altro', () => {
  const campi = dati.formato_nemici.campi.capacita.voce.campi;
  for (const k of ['nome', 'effetto', 'costo', 'limiti', 'passiva', 'prova', 'azioni', 'risorsa', 'usi']) assert.ok(k in campi, k);
  // una capacità con il solo testo resta solo testo: nessun costo o Prova per analogia
  const sola = vistaCapacita({ nome: 'Non sente dolore', effetto: 'Le penalità delle Ferite Superficiale e Importante non si applicano.' });
  assert.deepEqual(sola.parametri, []);
  assert.equal(sola.azioni, null);
  assert.equal(sola.prova, null);
  assert.equal(sola.usi, null);
  assert.equal(sola.passiva, false, 'passiva solo se dichiarata');
  // una capacità completa porta tutti i suoi parametri
  const piena = vistaCapacita({
    nome: 'Urlo', effetto: 'Ogni personaggio entro 9 Q…', prova: 'PS di Volontà', risorsa: '2 PM',
    azioni: { principali: 1 }, usi: { quanti: 1, per: 'Scena' }, limiti: 'decide il Direttore',
  });
  assert.equal(testoAzioni({ principali: 1 }), '1 AzP');
  assert.equal(testoAzioni({ principali: 1, movimento: 1, testo: 'come reazione' }), '1 AzP · 1 AzM · come reazione');
  assert.equal(testoUsi({ quanti: 2, per: 'scontro', nota: 'per attaccante' }), '2 per scontro (per attaccante)');
  assert.deepEqual(piena.parametri.map((x) => x.etichetta), ['Azioni', 'Prova', 'Risorsa', 'Usi', 'Limiti']);
  assert.equal(piena.rimasti, 1);
  assert.equal(piena.esauriti, false);
});

test('A.115: il contatore degli usi scala, avvisa a 0 e non blocca', () => {
  const scheda = { capacita: [
    { nome: 'Urlo', effetto: '…', usi: { quanti: 1, per: 'Scena' } },
    { nome: 'Morso rapido', effetto: '…', usi: { quanti: 2, per: 'Round' } },
    { nome: 'Corazza', effetto: '…', passiva: true },
  ] };
  let usi = {};
  usi = segnaUso(usi, 'Urlo', 1);
  assert.deepEqual(usi, { Urlo: 1 });
  const [urlo] = capacitaDi(scheda, usi);
  assert.equal(urlo.rimasti, 0);
  assert.equal(urlo.esauriti, true);
  // oltre il limite non si blocca: il contatore continua
  usi = segnaUso(usi, 'Urlo', 1);
  assert.equal(usi.Urlo, 2);
  assert.equal(capacitaDi(scheda, usi)[0].rimasti, 0);
  // «Annulla» torna indietro e a 0 la chiave sparisce
  usi = segnaUso(segnaUso(usi, 'Urlo', -1), 'Urlo', -1);
  assert.deepEqual(usi, {});
  const vuoto = {};
  assert.equal(segnaUso(vuoto, 'Urlo', -1), vuoto, 'sotto zero non va: la mappa resta quella');
  // i limiti «per Round» si azzerano con il Round, gli altri no
  const pieni = { Urlo: 1, 'Morso rapido': 2 };
  assert.deepEqual(azzeraPerRound(scheda, pieni), { Urlo: 1 });
  assert.equal(azzeraPerRound({ capacita: [] }, pieni), pieni, 'senza limiti per Round non cambia niente');
  // la passiva non richiede Azioni perché il profilo lo dichiara
  assert.equal(capacitaDi(scheda, {})[2].passiva, true);
  assert.deepEqual(capacitaDi(scheda, {})[2].parametri.map((x) => x.etichetta), ['Passiva']);
});

test('A.126: «Crea nemico» scrive lo spazio nel profilo, non fra le capacità', () => {
  const gigante = profiloNemico({ base: 'gigante', grado: 'potente', mutazioni: [] }, dati).nemico;
  assert.equal(gigante.spazio, '3 × 3 Q');
  assert.equal(gigante.capacita.some((c) => c.nome === 'Spazio'), false);
  assert.equal(ingombroDaTaglia(gigante, dati), 3);
});

// --- A.167 (18/10): spazio rettangolare e ripiego del quadrato ammesso più grande ---------------------------------

test('A.167: parseSpazio legge «1 Q» e «larghezza × lunghezza Q»; altro è null', async () => {
  const { parseSpazio } = await import('../src/mappa/token.js');
  assert.deepEqual(parseSpazio('1 Q'), [1, 1]);
  assert.deepEqual(parseSpazio('2 × 3 Q'), [2, 3]);
  assert.deepEqual(parseSpazio('3 × 10 Q'), [3, 10]);
  assert.equal(parseSpazio('2 Q'), null);
  assert.equal(parseSpazio('3x3'), null);
  assert.equal(parseSpazio(undefined), null);
});

test('A.167, ripiego: il quadrato ammesso più grande che non supera l’ingombro dichiarato (mai 1 × 1 per un mostro enorme)', () => {
  const lato = (spazio) => ingombroDaTaglia({ spazio }, dati);
  assert.equal(lato('6 × 6 Q'), 3, 'Roc');
  assert.equal(lato('4 × 4 Q'), 3, 'Drago tartaruga');
  assert.equal(lato('3 × 10 Q'), 3, 'Madre');
  assert.equal(lato('3 × 5 Q'), 3, 'Incubatrice');
  assert.equal(lato('2 × 3 Q'), 2, 'Regina Comandante');
  assert.equal(lato('3 × 2 Q'), 2, 'Coccodrillo gigante');
  assert.equal(lato('2 × 1 Q'), 1, 'Worg');
  assert.equal(lato('1 × 2 Q'), 1, 'Corazzato');
});

test('A.167: il campo spazio dei nemici ammette i rettangoli e il validatore ne controlla il massimo', async () => {
  const { validaNemico } = await import('../src/validate.js');
  const { readFileSync } = await import('node:fs');
  const base = JSON.parse(readFileSync(new URL('../esempi/nemici/mostri/roc.json', import.meta.url), 'utf8'));
  assert.deepEqual(validaNemico({ ...base, spazio: '3 × 10 Q' }, dati, 'x'), []);
  assert.equal(validaNemico({ ...base, spazio: '2 Q' }, dati, 'x').length, 1);
  assert.match(validaNemico({ ...base, spazio: '13 × 2 Q' }, dati, 'x')[0].problema, /al massimo 12 Q per lato/);
});

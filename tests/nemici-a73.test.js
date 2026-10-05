// Lotto 8 (docs/diff-manuali-2026-10-02-sera.md): i nemici del Tavolo del Master secondo le risposte di Davide
// ad A.73 (E&L del 02/10, decisioni 5–9): Ferite e Menomazioni come i PG, «Lancia!» con i PM del nemico,
// movimento «non consentito», parità d'Iniziativa con una Caratteristica mancante, A.78 negli attacchi.
import { test } from 'node:test';
import { aggiungiDanno } from '../src/equipaggiamento.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nuovoScontro, aggiungiNemici, registraColpo, annullaUltimoColpo, registraTiro, ordineIniziativa, registraLancioNemico, variaPmNemico, validaScontro } from '../src/scontro.js';
import { applicaColpo, testoColpo } from '../src/danno.js';
import { calcolaLancioNemico, statoIncantesimoNemico, propostaLancio } from '../src/nemico-lancio.js';
import { movimentoNemico, testoMovimento } from '../src/nemici.js';
import { esitoAttacco } from '../src/ui/attacco-nemico.js';
import { validaNemico } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';

const { dati } = await datiReali();
const T0 = new Date(2026, 9, 2, 21, 0, 0);
const vivo = (valore) => ({ valore, origine: 'manuale' });
const legionario = JSON.parse(readFileSync(new URL('./nemici/legionario-non-morto.json', import.meta.url), 'utf8'));
const conNemico = (n, quante = 1) => aggiungiNemici(nuovoScontro({ id: 'a73', adesso: T0, pg: [] }), n, quante, {}, T0);
const nemico = (s, i = 0) => s.partecipanti.filter((p) => p.tipo === 'nemico')[i];

test('A.73, decisione 7: il nemico entra con Ferite 0 e nessuna Menomazione; i PM se il tipo ne ha', () => {
  const p = nemico(conNemico({ ...legionario, pm: 6 }));
  assert.deepEqual([p.ferite, p.menomazioni, p.pm], [0, [], { attuali: 6, massimo: 6 }]);
  assert.equal(nemico(conNemico(legionario)).pm, undefined);
});

test('A.73, decisione 7: Ferita e Menomazione su un nemico come per i PG (§5.14), registrate e annullabili', () => {
  let s = conNemico(legionario);
  const p = nemico(s);
  const colpo = { danni: [30, 14], natura: 'Naturale', tipo: 'ravvicinato', tempra: [null, 'fallimento'] };
  // 30 − AR porta a 0 PV (l'eccesso non fa Ferite); 14 − AR a 0 PV: PS di Tempra fallita → Ferite per fascia
  const r = applicaColpo({ nome: p.nome, pv: p.pv, ferite: p.ferite, ar: p.scheda.ar }, colpo, dati);
  const finale = 14 - p.scheda.ar.totale;
  assert.equal(r.pv.dopo, 0);
  assert.equal(r.applicazioni[1].tempra.richiesta, true);
  const attese = dati.regole.danno_applicato.nuove_ferite.fasce.find((f) => f.fino_a === null || finale <= f.fino_a).fallimento;
  assert.equal(r.ferite.dopo, attese);
  assert.ok(attese >= 3, 'la prova deve arrivare almeno a Profonda');
  assert.equal(r.menomazioni[0].stato, 'Profonda');
  assert.ok(r.promemoria.some((x) => /PS di Tempra per la Menomazione/.test(x)));
  // nessun Affaticamento nel risultato né nel partecipante
  assert.equal(dati.formato_nemici.tavolo.affaticamento, false);
  const prima = { pv: p.pv.attuali, ferite: 0, menomazioni: [], stati: p.stati };
  const dopo = { pv: r.pv.dopo, ferite: r.ferite.dopo, menomazioni: r.menomazioni, stati: p.stati };
  s = registraColpo(s, { bersaglio: p.id, nome: p.nome, tipo: 'nemico', testo: testoColpo(p.nome, colpo, r), prima, dopo }, T0);
  assert.deepEqual([nemico(s).pv.attuali, nemico(s).ferite, nemico(s).menomazioni.map((m) => m.stato)], [0, attese, r.menomazioni.map((m) => m.stato)]);
  assert.match(s.registro.at(-1).testo, /Ferite 0 → \d/);
  assert.equal(validaScontro(s), null);
  const { scontro } = annullaUltimoColpo(s, T0);
  assert.deepEqual([nemico(scontro).pv.attuali, nemico(scontro).ferite, nemico(scontro).menomazioni], [p.pv.attuali, 0, []]);
});

const inquisitore = (pm = 12) => ({
  ...copia(legionario), id: 'inquisitore-prova', nome: 'Inquisitore di prova', pm,
  incantesimi: [{ nome: 'Dardo Psichico', livello: 8, va: 14, costo_pm: 8, regime: 'taumaturgo', bonus_danno_magico: 2 }, { nome: 'Dardo Psichico', note: 'senza versione' }],
});

test('A.73, decisione 8: «Lancia!» di un nemico con dati completi; PM scalati nello scontro', () => {
  const n = inquisitore();
  assert.deepEqual(validaNemico(n, dati), []);
  let s = conNemico(n);
  const p = nemico(s);
  const x = calcolaLancioNemico(p, 0, {}, dati);
  const r = x.risultato;
  // livello 8: penalità −2 della sez. 1 già nel VA del nemico; il totale resta il suo VA
  assert.deepEqual([r.pm_costo, r.prova_richiesta, r.va_potere_finale, r.impossibile], [8, true, 14, null]);
  assert.equal(r.danno.voci[0].base, x.inc.versioni[0]['Danno psichico']);
  // A.85: il bonus di SAG dichiarato si aggiunge una volta
  assert.equal(r.danno.voci[0].testo, aggiungiDanno(r.danno.voci[0].base, 2));
  // le condizioni del pannello valgono come per i PG: Ingaggio −2 (sez. 2)
  assert.equal(calcolaLancioNemico(p, 0, { ingaggio: true }, dati).risultato.va_potere_finale, 14 + dati.regole.lancio.ingaggio.va);
  // Anticipazione: costo doppio, oltre i PM del nemico → non lanciabile
  const asp = x.inc.meccanica?.anticipazione?.aspetti?.length ? 0 : null;
  if (asp !== null) assert.match(calcolaLancioNemico(p, 0, { anticipazione: 0 }, dati).risultato.impossibile.motivo, /PM personali insufficienti/);
  s = registraLancioNemico(s, { id: p.id, incantesimo: 'Dardo Psichico', livello: 8, pm: r.pm_costo, testo: 'Prova di Potere VA 14' }, T0);
  assert.equal(nemico(s).pm.attuali, 4);
  assert.match(s.registro.at(-1).testo, /lancia Dardo Psichico \(livello 8\): PM 12 → 4; Prova di Potere VA 14/);
  assert.throws(() => registraLancioNemico(s, { id: p.id, incantesimo: 'Dardo Psichico', livello: 8, pm: 8 }, T0), /4 PM, ne servono 8/);
  s = variaPmNemico(s, p.id, 10, T0);
  assert.equal(nemico(s).pm.attuali, 12);
  // incompleta: solo promemoria
  assert.equal(calcolaLancioNemico(p, 1, {}, dati), null);
  assert.match(statoIncantesimoNemico(n.incantesimi[1], dati).motivo, /mancano livello, va, costo_pm, regime/);
  assert.match(statoIncantesimoNemico({ nome: 'Dardo Psichico', livello: 40, va: 10, costo_pm: 1, regime: 'taumaturgo' }, dati).motivo, /versione di livello 40/);
  assert.match(statoIncantesimoNemico({ nome: 'Palla di Sabbia', livello: 1, va: 10, costo_pm: 1, regime: 'taumaturgo' }, dati).motivo, /non è fra le schede/);
});

test('A.84: altro utilizzatore al livello 8 — VA del nemico invariato, colonna «altri» (non più quella del Taumaturgo)', () => {
  const n = { ...inquisitore(), incantesimi: [{ nome: 'Dardo Psichico', livello: 8, va: 14, costo_pm: 8, regime: 'altro_utilizzatore', bonus_danno_magico: 'incluso' }] };
  const x = calcolaLancioNemico(nemico(conNemico(n)), 0, {}, dati);
  assert.deepEqual([x.risultato.va_potere_finale, x.risultato.prova_richiesta], [14, true]);
  assert.ok(x.chi.scheda.abilita[0].scomposizione.some((v) => v.valore === 4 && /altri utilizzatori/.test(v.etichetta)));
  assert.equal(x.risultato.danno.voci[0].testo, x.risultato.danno.voci[0].base, '«incluso»: niente da aggiungere');
});

test('A.73, decisione 9: movimento mancante dal Passo, «non consentito» senza calcolo', () => {
  assert.deepEqual(movimentoNemico({ movimento: { passo: 5 } }, dati), { passo: 5, corsa: 10, scatto: 15, calcolati: ['corsa', 'scatto'] });
  const n = { movimento: { passo: 4, corsa: 'non_consentito', scatto: 'non_consentito' } };
  assert.deepEqual(movimentoNemico(n, dati), { passo: 4, corsa: null, scatto: null, calcolati: [] });
  assert.equal(testoMovimento(n, dati), 'Passo 4 Q · Corsa non consentita · Scatto non consentito');
  assert.equal(testoMovimento({ movimento: { passo: 6, corsa: 9 } }, dati), 'Passo 6 Q · Corsa 9 Q · Scatto 18 Q* (* dal Passo)');
});

test('A.73, decisione 6: parità d’Iniziativa con una Caratteristica mancante → spareggio con 1d10, senza saltare a INT', () => {
  const a = { ...copia(legionario), id: 'a', nome: 'A', caratteristiche: { DES: 7, INT: 3 } };
  const b = { ...copia(legionario), id: 'b', nome: 'B', caratteristiche: { INT: 6 } };
  let s = aggiungiNemici(conNemico(a), b, 1, {}, T0);
  s = registraTiro(registraTiro(s, 'nem:a:1', 'd10', vivo(5), dati, T0), 'nem:b:1', 'd10', vivo(5), dati, T0);
  // B non ha DES: niente confronto su INT (che darebbe B prima), si va allo spareggio
  assert.equal(ordineIniziativa(s).spareggi.length, 1);
  s = registraTiro(registraTiro(s, 'nem:a:1', 'spareggio', vivo(3), dati, T0), 'nem:b:1', 'spareggio', vivo(3), dati, T0);
  assert.equal(ordineIniziativa(s).spareggi.length, 1); // ancora pari: si ritira
  s = registraTiro(s, 'nem:a:1', 'spareggio', vivo(8), dati, T0);
  assert.deepEqual([ordineIniziativa(s).spareggi, ordineIniziativa(s).ordinati.map((p) => p.nome)], [[], ['A 1', 'B 1']]);
  // con DES note e diverse decide la DES, anche se INT manca
  const c = { ...copia(legionario), id: 'c', nome: 'C', caratteristiche: { DES: 9 } };
  let t = aggiungiNemici(conNemico(a), c, 1, {}, T0);
  t = registraTiro(registraTiro(t, 'nem:a:1', 'd10', vivo(5), dati, T0), 'nem:c:1', 'd10', vivo(5), dati, T0);
  assert.deepEqual([ordineIniziativa(t).spareggi, ordineIniziativa(t).ordinati.map((p) => p.nome)], [[], ['C 1', 'A 1']]);
});

test('A.78 negli attacchi dei nemici: con VA finale 20 o più si tira comunque', () => {
  const tiri = [{ etichetta: 'Tiro per colpire', va: 22 }];
  assert.equal(esitoAttacco(tiri, [null], dati).esito, 'da_tirare');
  assert.equal(esitoAttacco(tiri, [20], dati).esito, 'maldestro');
  assert.equal(esitoAttacco(tiri, [2], dati).esito, 'magistrale'); // 2 naturale con VA ≥ 21 (§1.6)
  assert.equal(esitoAttacco(tiri, [15], dati).esito, 'successo');
});

test('esempi aggiornati ad A.73: sei Caratteristiche, campi nuovi, incantesimo completo e promemoria, Scatto non consentito', () => {
  const leggi = (f) => JSON.parse(readFileSync(new URL(`../esempi/nemici/${f}`, import.meta.url), 'utf8'));
  for (const f of ['legionario-oscuro.json', 'predone-delle-lande.json']) {
    const n = leggi(f);
    assert.deepEqual(validaNemico(n, dati), [], f);
    assert.equal(Object.keys(n.caratteristiche).length, 6, f);
    assert.ok(n.azioni && n.abilita?.length && n.capacita?.length, f);
  }
  const leg0 = leggi('legionario-oscuro.json');
  // A.84: una creatura capace di magia non è automaticamente un Taumaturgo: senza regime la voce è incompleta
  assert.deepEqual(leg0.incantesimi.map((i) => statoIncantesimoNemico(i, dati).completo), [false, false]);
  assert.match(statoIncantesimoNemico(leg0.incantesimi[0], dati).motivo, /regime/);
  const leg = { ...leg0, incantesimi: [{ ...leg0.incantesimi[0], regime: 'altro_utilizzatore' }, leg0.incantesimi[1]] };
  assert.equal(testoMovimento(leg, dati), 'Passo 6 Q · Corsa 10 Q · Scatto non consentito');
  const p = nemico(conNemico(leg));
  const r = calcolaLancioNemico(p, 0, {}, dati).risultato;
  // altro utilizzatore autorizzato (A.84): Prova sempre, colonna «altri» (livello 3: 0); bonus di SAG non dichiarato (A.85)
  assert.deepEqual([r.pm_costo, r.prova_richiesta, r.impossibile, r.va_potere_finale], [3, true, null, leg.incantesimi[0].va]);
  assert.ok(r.promemoria.some((x) => /bonus non vale 0 \(A\.85\)/.test(x)));
  // la capacità specifica segue il profilo: promemoria
  assert.match(statoIncantesimoNemico({ ...leg.incantesimi[0], regime: 'capacita_specifica' }, dati).motivo, /capacità specifica/);
  // dopo il lancio, «Colpito» precompilata con il danno della versione (senza bonus di Caratteristica)
  const x = calcolaLancioNemico(p, 0, {}, dati);
  assert.deepEqual(propostaLancio(x.inc, x.risultato, dati), { formula: '1d4+2', moltiplicatore: 1, moltiplicatorePrimo: 1, tipo: 'distanza', ac: 1, proprieta: [] });
});

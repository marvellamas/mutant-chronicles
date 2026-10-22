// Tecniche Interiori al tavolo, «Attiva» (Giocatore §8.9.1; src/tecniche.js, src/sessione.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import { statoAttivazione, attivaTecnica, nuovoRound, terminaTecnica, inScadenza, tecnicaDi, costoTecnica, haRisorseInteriori } from '../src/tecniche.js';
import { massimiSessione, inizializzaSessione, attivaTecnicaSessione, nuovoRoundSessione, terminaTecnicaSessione, nuovaSessione, modificaSessione } from '../src/sessione.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();
const T = (id) => tecnicaDi(id, dati);
// scheda minima: Tecniche apprese e PM massimi (il motore non chiede altro)
const scheda = (ids, { pm = 20, umanita = null } = {}) => ({ tecniche: ids.map((id) => ({ id })), tecnicheAmmesse: ids.length, pm, umanita });
const sessione = (extra = {}) => ({ pmAttuali: 20, round: 1, ultimaTecnica: null, tecnicheAttive: [], statiAttivi: [], chroma: {}, ...extra });

test('dati: 28 Tecniche con costo in PM e tipo di durata; Imposizione con la tabella dei costi', () => {
  const t = dati.tecniche_interiori.tecniche;
  assert.equal(t.length, 28);
  assert.ok(t.every((x) => Number.isInteger(x.costo_pm) || Array.isArray(x.opzioni_costo)));
  // 0.49: la tabella di Imposizione passa da 1/2/4/10 a 1/2/2/4 PM
  assert.deepEqual(T('imposizione-della-mano-curativa').opzioni_costo.map((o) => o.pm), [1, 2, 2, 4]);
  assert.equal(costoTecnica(T('imposizione-della-mano-curativa'), 2), 2);
  // 0.49: Aura di Resistenza passa da 3 a 5 Round
  assert.deepEqual([T('aura-di-resistenza').durata_tipo, T('aura-di-resistenza').durata_round], ['round', 5]);
  assert.deepEqual([T('colpo-interiore').durata_tipo, T('colpo-interiore').durata_round], ['round', 0]);
  assert.equal(T('vista-felina').durata_tipo, 'tempo');
  assert.equal(T('salto-della-tigre').durata_tipo, 'istantanea');
  // testi 0.49 (§8.9.2, §8.9.3)
  assert.match(T('pelle-di-rinoceronte').testo, /\+1 AR non magica/);
  assert.match(T('aura-di-resistenza').testo, /Corazza Potenziata/);
  assert.equal(dati.tecniche_interiori.versione_manuale, 'Giocatore 0.49');
});

test('§8.9.1: si pagano solo PM personali; con PM insufficienti la Tecnica non si attiva, le batterie non contano', () => {
  const sc = scheda(['aura-di-resistenza']);
  // il costo viene dai dati: la prova è sul meccanismo (solo PM personali), non sul numero del manuale
  const costo = T('aura-di-resistenza').costo_pm;
  // un PM meno del costo, e una batteria piena: non si attiva lo stesso
  const s = sessione({ pmAttuali: costo - 1, chroma: { b1: { pmAttuali: 5 } } });
  const st = statoAttivazione(sc, s, T('aura-di-resistenza'), dati);
  assert.equal(st.possibile, false);
  assert.match(st.motivo, new RegExp(`PM personali insufficienti: servono ${costo}, ne hai ${costo - 1}`));
  assert.equal(attivaTecnica(sc, s, T('aura-di-resistenza'), dati), null);
  // con 10 PM: scala il costo dai personali, la batteria resta com'era
  const dopo = attivaTecnica(sc, sessione({ pmAttuali: 10, chroma: { b1: { pmAttuali: 5 } } }), T('aura-di-resistenza'), dati);
  assert.equal(dopo.pmAttuali, 10 - costo);
  assert.deepEqual(dopo.chroma, { b1: { pmAttuali: 5 } });
  // nessuna Prova di Potere, salvo Silenzio Mentale (promemoria)
  assert.match(st.potere, /Nessuna Prova di Potere/);
  assert.match(statoAttivazione(sc, s, T('aura-di-resistenza'), dati, { silenzioMentale: true }).potere, /Silenzio Mentale/);
});

test('§8.9.1: una sola attivazione per Round; «Nuovo Round» la sblocca', () => {
  const sc = scheda(['aura-di-resistenza', 'salto-della-tigre']);
  const s1 = attivaTecnica(sc, sessione(), T('salto-della-tigre'), dati);
  assert.deepEqual(s1.ultimaTecnica, { id: 'salto-della-tigre', round: 1 });
  // istantanea: resta in corso fino alla fine del Round (la finestra del colpo o della reazione) e conta per il limite
  assert.deepEqual(s1.tecnicheAttive, [{ id: 'salto-della-tigre', dal: 1, al: 1 }]);
  assert.deepEqual(nuovoRound(s1).tecnicheAttive, []);
  const bloccata = statoAttivazione(sc, s1, T('aura-di-resistenza'), dati);
  assert.equal(bloccata.possibile, false);
  assert.match(bloccata.motivo, /già attivata una Tecnica in questo Round \(Salto della Tigre\)/);
  const r2 = nuovoRound(s1);
  assert.equal(r2.round, 2);
  assert.equal(statoAttivazione(sc, r2, T('aura-di-resistenza'), dati).possibile, true);
});

test('§8.9.1: durata R + N (attivata al Round 2 termina alla fine del Round 2 + N); le durate a tempo si terminano a mano', () => {
  const sc = scheda(['aura-di-resistenza', 'vista-felina']);
  // N viene dai dati: la prova è sulla scadenza R + N, non sul numero di Round del manuale
  const n = T('aura-di-resistenza').durata_round;
  const fine = 2 + n;
  let s = attivaTecnica(sc, sessione({ round: 2 }), T('aura-di-resistenza'), dati);
  assert.deepEqual(s.tecnicheAttive, [{ id: 'aura-di-resistenza', dal: 2, al: fine }]);
  for (let r = 3; r <= fine; r++) { s = nuovoRound(s); assert.equal(s.round, r); assert.equal(s.tecnicheAttive.length, 1, `Round ${r}`); }
  assert.deepEqual(inScadenza(s).map((x) => x.id), ['aura-di-resistenza']);
  s = nuovoRound(s); // Round fine + 1: scaduta
  assert.deepEqual(s.tecnicheAttive, []);
  // Vista Felina, 1 ora: attiva finché non la si termina
  s = attivaTecnica(sc, s, T('vista-felina'), dati);
  assert.deepEqual(s.tecnicheAttive, [{ id: 'vista-felina', dal: fine + 1, al: null }]);
  for (let i = 0; i < 20; i++) s = nuovoRound(s);
  assert.equal(s.tecnicheAttive.length, 1);
  assert.deepEqual(terminaTecnica(s, 'vista-felina').tecnicheAttive, []);
});

test('§8.9.1: la riserva a 0 PM dopo l’azione dà Svenuto, con conferma esplicita', () => {
  const sc = scheda(['aura-di-resistenza']);
  // esattamente i PM del costo: dopo l'attivazione la riserva resta a 0 (il costo viene dai dati)
  const costo = T('aura-di-resistenza').costo_pm;
  const st = statoAttivazione(sc, sessione({ pmAttuali: costo }), T('aura-di-resistenza'), dati);
  assert.deepEqual([st.possibile, st.conferma, st.svenimento], [true, true, true]);
  assert.match(st.avvisi[0], /Svenuto/);
  const dopo = attivaTecnica(sc, sessione({ pmAttuali: costo }), T('aura-di-resistenza'), dati);
  assert.equal(dopo.pmAttuali, 0);
  assert.ok(dopo.statiAttivi.includes(dati.tecniche_interiori.attivazione.stato_a_zero_pm));
  // con PM che avanzano nessuna conferma
  assert.equal(statoAttivazione(sc, sessione({ pmAttuali: costo + 1 }), T('aura-di-resistenza'), dati).conferma, false);
});

test('§8.9.1, §5.21: a Umanità 0 le Tecniche non si attivano; senza Risorse Interiori nessuna Tecnica', () => {
  const st = statoAttivazione(scheda(['aura-di-resistenza'], { umanita: { valore: 0, risorseInteriori: false } }), sessione(), T('aura-di-resistenza'), dati);
  assert.equal(st.possibile, false);
  assert.match(st.motivo, /Umanità 0/);
  assert.equal(statoAttivazione(scheda([]), sessione(), T('aura-di-resistenza'), dati).motivo, 'Tecnica non appresa');
  assert.equal(haRisorseInteriori(scheda([])), false);
});

// personaggio reale: c (Tecnico 5°, Risorse Interiori al 3° livello: Vista Felina, Pelle Camaleontica, Passo della Mangusta)
const c = (() => {
  const p = deserializzaPersonaggio(readFileSync(new URL('collaudo/c_freelance_tecnico_l5.json', import.meta.url), 'utf8'));
  return { creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli };
})();

test('sessione: «Attiva», «Nuovo Round», «Termina» e «Nuova sessione» con un personaggio vero; «Annulla» ritrova la sessione di prima', () => {
  const sc = calcolaScheda(c, dati);
  assert.ok(haRisorseInteriori(sc));
  const m = massimiSessione(sc, c.creazione, dati);
  const s0 = inizializzaSessione(m);
  const s1 = attivaTecnicaSessione(s0, sc, 'vista-felina', dati, {}, m);
  assert.equal(s1.pmAttuali, s0.pmAttuali - 2);
  // la sessione di prima non cambia: «Annulla» (precedenteTavolo) la ripristina com'era
  assert.equal(s0.pmAttuali, m.pm);
  assert.deepEqual(s0.tecnicheAttive, []);
  assert.equal(attivaTecnicaSessione(s1, sc, 'passo-della-mangusta', dati, {}, m), null);
  const s2 = nuovoRoundSessione(s1, m);
  assert.equal(s2.round, 2);
  assert.ok(attivaTecnicaSessione(s2, sc, 'passo-della-mangusta', dati, {}, m));
  assert.deepEqual(terminaTecnicaSessione(s2, 'vista-felina', m).tecnicheAttive, []);
  // una Tecnica non appresa non entra fra le attive; «Nuova sessione» riparte dal Round 1
  assert.deepEqual(modificaSessione(s2, { tecnicheAttive: [{ id: 'aura-di-resistenza', dal: 1, al: 4 }] }, m).tecnicheAttive, []);
  const n = nuovaSessione(s2, m);
  assert.deepEqual([n.round, n.ultimaTecnica, n.tecnicheAttive], [1, null, []]);
});

test('A.48: Aura di Resistenza attiva dà l’AR magica della scheda finché dura; scaduta, l’AR torna com’era', () => {
  // c con Aura di Resistenza al posto di Pelle Camaleontica (3° livello)
  const conAura = { ...c, livelli: c.livelli.map((l) => (l.tecniche ? { ...l, tecniche: l.tecniche.map((x) => (x === 'pelle-camaleontica' ? 'aura-di-resistenza' : x)) } : l)) };
  const sc = calcolaScheda(conAura, dati);
  const m = massimiSessione(sc, conAura.creazione, dati);
  const ar = (sessione) => calcolaScheda({ ...conAura, sessione }, dati).equipaggiamento.arEffettiva;
  // quanto vale e quanto dura vengono dai dati (0.49: +2 AR magica per 5 Round, era +1 per 3)
  const bonus = dati.regole.ar.tecniche.find((t) => t.tecnica === 'aura-di-resistenza');
  const n = tecnicaDi('aura-di-resistenza', dati).durata_round;
  const s0 = inizializzaSessione(m);
  const prima = ar(s0);
  let s = attivaTecnicaSessione(s0, sc, 'aura-di-resistenza', dati, {}, m);
  assert.deepEqual([ar(s).totale, ar(s).magica], [prima.totale + bonus.totale, prima.magica + bonus.magica]);
  assert.ok(ar(s).valori[0].provenienza.righe.some((r) => r.fonte === 'Aura di Resistenza'));
  // attivata al Round 1: vale fino alla fine del Round 1 + N
  for (let i = 0; i < n; i++) s = nuovoRoundSessione(s, m);
  assert.equal(ar(s).totale, prima.totale + bonus.totale);
  s = nuovoRoundSessione(s, m); // Round 1 + N + 1: scaduta
  assert.deepEqual([ar(s).totale, ar(s).magica], [prima.totale, prima.magica]);
});

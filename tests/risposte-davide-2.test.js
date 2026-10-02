// Risposte di Davide del 28/09/2026, seconda serie (Doc «per-davide.md», sezione 7): A.52, A.51,
// A.43–A.50, A.13.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { catalogo, separaEsemplare } from '../src/equipaggiamento.js';
import { massimiSessione, inizializzaSessione, variaIntegrita, impostaCondizioneArma, riparaOggetto } from '../src/sessione.js';
import { regoleRiparazione, esitoRiparazione, vaRiparazione, riparabile } from '../src/riparazione.js';
import { calcolaAR } from '../src/protezione.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE, LIVELLI_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
/** Scheda al tavolo con i PI indicati portati a 0 ({ uid: true }). */
const alTavolo = (equipaggiamento, aZero = {}, livelli = []) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento };
  const aRiposo = calcolaScheda({ creazione, livelli }, dati);
  const m = massimiSessione(aRiposo, creazione, dati);
  let s = inizializzaSessione(m);
  for (const uid of Object.keys(aZero)) s = variaIntegrita(s, uid, -999, m);
  return { aRiposo, tavolo: calcolaScheda({ creazione, livelli, sessione: s }, dati), sessione: s, m };
};

// --- A.13 -----------------------------------------------------------------------------------

test('A.13: Rainy Dayer, Specializzazione Carabine sul tiro; la copertura aperta non prende il +1', () => {
  const r = catalogo(dati).perRif.get('corredi_dispositivi:rainy-dayer');
  assert.deepEqual([r.specializzazione, r.abilita, r.mani, r.gittata_q], ['specializzazione-carabine', 'Armi medie', 2, 30]);
  const equip = [voce('r', 'corredi_dispositivi:rainy-dayer', 'impugnata')];
  const senza = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: equip }, livelli: [LIVELLI_AGENTE[0]] }, dati);
  const con = calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: equip }, livelli: [LIVELLI_AGENTE[0], { livello: 3, talentoLibero: { id: 'specializzazione-carabine' } }] }, dati);
  const a = (s) => s.equipaggiamento.armi.find((x) => x.uid === 'r');
  assert.equal(a(con).va - a(senza).va, 1);
  assert.equal(a(con).bonusDanno, 1);
  assert.deepEqual(r.scudo_integrato.ar, { totale: 1, magica: 0 }); // invariata
  // nessuna arma del catalogo resta senza Specializzazione
  const senzaSpec = catalogo(dati).oggetti.filter((o) => (o.tipo === 'arma_ravvicinata' || o.tipo === 'arma_distanza') && !o.specializzazione).map((o) => o.nome);
  assert.deepEqual(senzaSpec, []);
});

// --- A.44, A.45 -----------------------------------------------------------------------------

test('A.44: armatura Rotta indossata, niente AR ma le penalità restano; scudo Rotto segnato come arma Rotta', () => {
  const { aRiposo, tavolo } = alTavolo([voce('a', 'armature:armatura-civile-media', 'indossata'), voce('s', 'scudi:scudo-punisher', 'imbracciato')], { a: true, s: true });
  assert.equal(tavolo.equipaggiamento.arEffettiva.totale, 0);
  // le penalità dell'armatura indossata restano (§7.11.1)
  assert.equal(tavolo.equipaggiamento.equipAbilita.Atletica, aRiposo.equipaggiamento.equipAbilita.Atletica);
  assert.ok(aRiposo.equipaggiamento.equipAbilita.Atletica < 0);
  assert.equal(tavolo.equipaggiamento.armi.find((w) => w.uid === 's:attacco').rotta, true);
});

test('A.45: civile leggera + rinforzo pesante: 3/5/Media → rinforzo a 0 PI 1/5/Media → rinforzo tolto 1/3/Leggera', () => {
  const arm = voce('a', 'armature:armatura-civile-leggera', 'indossata');
  const kit = voce('k', 'rinforzi:rinforzo-pesante', 'in_uso', { montato_su: 'a' });
  const integro = alTavolo([arm, kit]);
  const p1 = integro.tavolo.equipaggiamento.protezioni[0];
  assert.deepEqual([integro.tavolo.equipaggiamento.arEffettiva.totale, p1.forRichiesta, p1.categoria], [3, 5, 'Media']);
  const rotto = alTavolo([arm, kit], { k: true });
  const p2 = rotto.tavolo.equipaggiamento.protezioni[0];
  assert.deepEqual([rotto.tavolo.equipaggiamento.arEffettiva.totale, p2.forRichiesta, p2.categoria], [1, 5, 'Media']);
  const tolto = alTavolo([arm, { ...kit, stato: 'zaino', montato_su: undefined }]);
  const p3 = tolto.tavolo.equipaggiamento.protezioni[0];
  assert.deepEqual([tolto.tavolo.equipaggiamento.arEffettiva.totale, p3.forRichiesta, p3.categoria], [1, 3, 'Leggera']);
});

// --- A.48 -----------------------------------------------------------------------------------

test('A.48: Corazza Potenziata solo con protezione Artefatto (Guardie Sacre sì, Sacri Guerrieri no); Aura e Pelle di Rinoceronte si sommano', () => {
  const prot = (rif) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: [voce('s', rif, 'imbracciato')] }, livelli: [] }, dati).equipaggiamento.protezioni[0];
  assert.equal(prot('scudi:scudo-delle-guardie-sacre').artefatto, true);
  assert.equal(prot('scudi:scudo-dei-sacri-guerrieri').artefatto, false);
  // l'esempio di Davide: tutte e tre attive → +3 contro il ravvicinato, +2 contro gli altri, +2 magica
  const eq = { protezioni: [{ uid: 's', nome: 'Scudo delle Guardie Sacre', tipo: 'scudo', ar: { totale: 2, magica: 0 }, artefatto: true }], effettiOggetti: [] };
  const accesi = new Set(['tecnica:aura-di-resistenza', 'tecnica:pelle-di-rinoceronte']);
  const ar = calcolaAR(eq, dati, { talenti: ['Corazza Potenziata'], accesi, tecniche: ['aura-di-resistenza', 'pelle-di-rinoceronte'] });
  assert.deepEqual([ar.totale - 2, ar.magica], [2, 2]);
  assert.deepEqual(ar.contro.map((c) => [c.contro, c.totale - 2]), [['ravvicinato', 3]]);
  // una Tecnica non posseduta non conta, anche se accesa
  assert.equal(calcolaAR(eq, dati, { accesi, tecniche: [] }).totale, 2);
});

test('A.48: la Tecnica posseduta si accende con «Attiva» (§8.9.1), non con un interruttore', () => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [] };
  const scheda = { ...calcolaScheda({ creazione, livelli: [] }, dati), tecniche: [{ id: 'aura-di-resistenza' }] };
  const m = massimiSessione(scheda, creazione, dati);
  // niente più chiavi «tecnica:<id>» fra le condizioni degli oggetti: la sessione le scarta
  assert.ok(!m.oggettiSituazionali.some((x) => x.startsWith('tecnica:')));
  assert.deepEqual(m.tecniche, ['aura-di-resistenza']);
});

// --- A.49 -----------------------------------------------------------------------------------

test('A.49: condizioni delle armi al tavolo distinte dai PI; Inutilizzabile blocca, riparata −3 VA', () => {
  const equip = [voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata')];
  const { aRiposo, sessione, m } = alTavolo(equip);
  const conCondizione = (id) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: equip }, livelli: [], sessione: impostaCondizioneArma(sessione, 'p', id, m) }, dati);
  const base = aRiposo.equipaggiamento.armi[0].va;
  const inut = conCondizione('inutilizzabile').equipaggiamento.armi[0];
  assert.equal(inut.condizioneArma.utilizzabile, false);
  const rip = conCondizione('riparata-sul-campo').equipaggiamento.armi[0];
  assert.equal(rip.vaEffettivo, base - 3);
  assert.equal(conCondizione('riparata-da-rotta').equipaggiamento.armi[0].vaEffettivo, base - 5);
  // la condizione non tocca i PI (A.49)
  assert.equal(impostaCondizioneArma(sessione, 'p', 'rotta', m).integrita.p, m.integrita.p);
  // «integra» toglie la condizione
  assert.deepEqual(impostaCondizioneArma(impostaCondizioneArma(sessione, 'p', 'rotta', m), 'p', 'integra', m).condizioniArmi, {});
});

// --- A.46 -----------------------------------------------------------------------------------

test('A.46: esiti della riparazione, materiali al 5% per PI recuperato, mai oltre il massimo, Maldestro fino a 0', () => {
  const r = regoleRiparazione(dati);
  const arm = { piAttuali: 2, piMax: 8, costo: 2000 };
  assert.deepEqual(esitoRiparazione(arm, 'successo', r), { piNuovi: 3, recuperati: 1, costoMateriali: 100 }); // l'esempio di Davide
  assert.deepEqual(esitoRiparazione(arm, 'magistrale', r), { piNuovi: 4, recuperati: 2, costoMateriali: 200 });
  assert.deepEqual(esitoRiparazione(arm, 'fallimento', r), { piNuovi: 2, recuperati: 0, costoMateriali: 0 });
  assert.deepEqual(esitoRiparazione({ ...arm, piAttuali: 0 }, 'maldestro', r), { piNuovi: 0, recuperati: 0, costoMateriali: 0 });
  assert.deepEqual(esitoRiparazione({ ...arm, piAttuali: 7 }, 'magistrale', r), { piNuovi: 8, recuperati: 1, costoMateriali: 100 });
  assert.equal(esitoRiparazione({ piAttuali: 1, piMax: 4, costo: null }, 'successo', r).costoMateriali, null);
  // Distrutta esclusa, tipi ammessi
  assert.equal(riparabile({ tipo: 'arma_distanza' }, 'distrutta', r).si, false);
  assert.equal(riparabile({ tipo: 'armatura' }, null, r).si, true);
  assert.equal(riparabile({ tipo: 'sanitario' }, null, r).si, false);
});

test('A.46: la riparazione aggiorna i PI e toglie i materiali dai crediti; VA di Tecnologia con strumenti improvvisati −2', () => {
  const { tavolo, sessione, m } = alTavolo([voce('a', 'armature:armatura-civile-media', 'indossata')], { a: true });
  const r = regoleRiparazione(dati);
  const s = riparaOggetto({ ...sessione, crediti: 1000 }, 'a', 1, 50, m);
  assert.deepEqual([s.integrita.a, s.crediti], [1, 950]);
  const va = vaRiparazione(tavolo, true, r);
  assert.equal(va.totale, va.base - 2);
});

// --- A.47 -----------------------------------------------------------------------------------

test('A.47: sanitari con PI tracciati; esemplari raggruppati finché integri, «Danneggia uno» li separa; PI del Direttore', () => {
  const kit = (uid, q = 1, extra = {}) => ({ uid, rif: 'sanitario:kit-di-pronto-soccorso-standard', stato: null, quantita: q, note: '', ...extra });
  // un kit Standard da solo: 4 PI tracciati (prima il sanitario era escluso)
  let { m } = alTavolo([kit('k')]);
  assert.equal(m.integrita.k, 4);
  // tre kit: gruppo integro, nessun PI in sessione, una riga «×3»
  const tre = alTavolo([kit('g', 3)]);
  assert.equal(tre.m.integrita.g, undefined);
  assert.deepEqual(tre.aRiposo.equipaggiamento.integrita.map((x) => [x.uid, x.gruppo, x.piMax]), [['g', 3, 4]]);
  // «Danneggia uno»: il gruppo scende a 2, l'esemplare separato ha una riga propria con i suoi PI
  const { voci, uid } = separaEsemplare([kit('g', 3)], 'g');
  assert.deepEqual(voci.map((v) => [v.uid, v.quantita]), [['g', 2], ['g-2', 1]]);
  ({ m } = alTavolo(voci));
  assert.equal(m.integrita[uid], 4);
  // oggetto senza PI a catalogo: nessun valore finché il Direttore non lo fissa
  const improvvisato = { uid: 'i', rif: 'sanitario:kit-di-pronto-soccorso-improvvisato', stato: null, quantita: 1, note: '' };
  const senza = alTavolo([improvvisato]);
  assert.equal(senza.m.integrita.i, undefined);
  assert.deepEqual(senza.aRiposo.equipaggiamento.senzaPi.map((x) => [x.uid, x.piDirettore]), [['i', null]]);
  const con = alTavolo([{ ...improvvisato, pi_direttore: 3 }]);
  assert.equal(con.m.integrita.i, 3);
});

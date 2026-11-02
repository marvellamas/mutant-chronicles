// Lotto 164 (02/11/2026): A.230, risposta di Davide del 02/11/2026. «La procedura di A.229 vale anche per le altre
// Specializzazioni rimosse dagli elenchi di Classe, comprese Armi Inastate dell'Incursore e Archi e Balestre
// dell'Invocatore»: restano operative con un avviso fino alla decisione del Direttore, che ha «Tienila come eccezione» e
// «Sostituiscila gratis», conservando l'acquisizione spesa; copia della scheda prima e decisione nello storico (registro
// del master, come per la A.229).
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { postiTalenti, eccezioneSpecializzazione, applicaSceltaTalento, regolaVoceTolta } from '../src/avanzamento.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { calcolaScheda } from '../src/calc.js';
import { controllaTalentiDaTablet } from '../src/talenti-tablet.js';
import { preparaStampa } from '../src/stampa.js';

const { dati } = await datiReali();
const INASTATE = 'specializzazione-armi-inastate';
const ARCHI = 'specializzazione-archi-e-balestre';
const leggi = (f) => deserializzaPersonaggio(readFileSync(new URL(`./fixtures/talenti-vecchi/${f}`, import.meta.url), 'utf8'));
const pulisci = (p, spec1) => ({
  creazione: { ...normalizza(p.creazione, dati).scelte, regimeTalenti: 2, specializzazioneIniziale: spec1 },
  livelli: p.livelli.map((v) => { const x = { ...v }; delete x.talentoLibero; delete x.maestria; delete x.specializzazione; return x; }),
});
/** Duncan (Incursore al 4° livello) con la Specializzazione del 4° livello data. */
function duncan(spec4) {
  const p = pulisci(leggi('DUNCAN-MCDUFF_liv6_2026-10-07.json'), { id: 'specializzazione-spade' });
  if (spec4) p.livelli[2].specializzazione = spec4;
  return p;
}
/** Lucas (Invocatore) con la Specializzazione iniziale data. */
const lucas = (spec1) => pulisci(leggi('LUCAS_liv6_2026-10-20.json'), spec1);
const posto = (p, livello) => postiTalenti(p, dati, { opzioni: false }).posti.find((x) => x.categoria === 'specializzazione' && x.livello === livello);
const file = (p) => JSON.parse(serializza(p.creazione, { livelli: p.livelli }));
const CASI = [
  { nome: 'Armi Inastate dell’Incursore', id: INASTATE, classe: 'Incursore', livello: 4, pg: (s) => duncan(s), sostituta: 'specializzazione-carabine' },
  { nome: 'Archi e Balestre dell’Invocatore', id: ARCHI, classe: 'Invocatore', livello: 1, pg: (s) => lucas(s), sostituta: 'specializzazione-elementi' },
];

for (const c of CASI) {
  test(`A.230, ${c.nome}: resta operativa, con l’avviso che decide il Direttore`, () => {
    assert.equal(regolaVoceTolta(c.id, c.classe, dati), 'A.230');
    const p = c.pg({ id: c.id });
    const x = posto(p, c.livello);
    assert.equal(x.valida, true);
    const avviso = x.problemi.find((e) => e.tipo === 'tolta');
    assert.equal(avviso.regola, 'A.230');
    assert.match(avviso.problema, /resta, con i suoi effetti, finché il Direttore non decide se tenerla come eccezione o sostituirla gratis.*\(A\.230\)/);
    const sp = calcolaScheda(p, dati).specializzazioni.find((y) => y.id === c.id);
    assert.deepEqual([sp.tolta, sp.regolaTolta], [true, 'A.230']);
  });

  test(`A.230, ${c.nome}: «Tienila come eccezione» del Direttore, con il motivo, salvata e annullabile`, () => {
    const p = eccezioneSpecializzazione(c.pg({ id: c.id }), { categoria: 'specializzazione', livello: c.livello }, { quando: '2026-11-02T18:00:00.000Z', motivo: 'scelta prima del 0.54' });
    const x = posto(p, c.livello);
    assert.ok(!x.problemi.some((e) => e.tipo === 'tolta'));
    const ecc = x.problemi.find((e) => e.tipo === 'eccezione');
    assert.equal(ecc.regola, 'A.230');
    assert.match(ecc.problema, /il Direttore la tiene come eccezione \(A\.230\)/);
    const sp = calcolaScheda(p, dati).specializzazioni.find((y) => y.id === c.id);
    assert.equal(sp.tolta, undefined);
    assert.deepEqual([sp.eccezione.regola, sp.eccezione.motivo], ['A.230', 'scelta prima del 0.54']);
    // la stampa dice quale risposta
    assert.match(JSON.stringify(preparaStampa(p, dati).fogli), /"eccezione":"A\.230"/);
    // il file la conserva; tolta l'eccezione torna da decidere
    const riletto = deserializzaPersonaggio(serializza(p.creazione, { livelli: p.livelli }));
    const scelta = c.livello === 1 ? normalizza(riletto.creazione, dati).scelte.specializzazioneIniziale : riletto.livelli[c.livello - 2].specializzazione;
    assert.equal(scelta.eccezione.motivo, 'scelta prima del 0.54');
    const di = eccezioneSpecializzazione(p, { categoria: 'specializzazione', livello: c.livello }, { togli: true });
    assert.equal(posto(di, c.livello).problemi.find((e) => e.tipo === 'tolta').regola, 'A.230');
  });

  test(`A.230, ${c.nome}: «Sostituiscila gratis» tiene il posto e l’acquisizione`, () => {
    const p = c.pg({ id: c.id });
    const nuovo = applicaSceltaTalento(p, { categoria: 'specializzazione', livello: c.livello }, { id: c.sostituta });
    const x = posto(nuovo, c.livello);
    assert.equal(x.scelta.id, c.sostituta, 'il posto non si perde');
    assert.deepEqual([x.valida, x.problemi.filter((e) => e.tipo !== 'incompleto')], [true, []]);
    assert.equal(postiTalenti(nuovo, dati, { opzioni: false }).posti.length, postiTalenti(p, dati, { opzioni: false }).posti.length, 'nessun posto in più o in meno');
  });

  test(`A.230, ${c.nome}: dal tablet né la sostituzione né l’eccezione`, () => {
    const disco = c.pg({ id: c.id });
    assert.deepEqual(controllaTalentiDaTablet(file(disco), file(disco), dati), { ok: true });
    const sostituita = controllaTalentiDaTablet(file(c.pg({ id: c.sostituta })), file(disco), dati);
    assert.deepEqual([sostituita.ok, sostituita.stato], [false, 403]);
    assert.match(sostituita.errore, /A\.230.*La decisione è del Direttore/);
    const conEccezione = eccezioneSpecializzazione(disco, { categoria: 'specializzazione', livello: c.livello });
    const r = controllaTalentiDaTablet(file(conEccezione), file(disco), dati);
    assert.deepEqual([r.ok, r.stato], [false, 403]);
  });
}

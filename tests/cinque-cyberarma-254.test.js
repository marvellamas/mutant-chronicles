import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 254, rif. 05 del collaudo di Davide del 25/11/2026 — «Mantenere i cinque colori come profili base;
// trattare CyberArma come famiglia e Batteria Verde/NeC come opzioni dello stesso esemplare, conservando la
// compatibilità con le vecchie schede». È la A.309 del 24/11, più stretta: «Nessuna voce aggiuntiva per
// originale, CM, NeC o SIN».
//
// I tre controlli che devono restare verdi sempre:
//   1. nel catalogo le CyberArma offerte sono **cinque**;
//   2. convertire **non crea un secondo esemplare** e **non cancella lo storico**;
//   3. una scheda già scritta che cita l'originale continua a leggersi (è l'arma di Dimitri).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dati } from './scheda-aiuti.js';
import { opzioniCascata, cercaNelCatalogo, catalogo, normalizzaEquipaggiamento } from '../src/equipaggiamento.js';
import { opzioniEsemplare, applicaAlimentazioneEsemplare, capacitaConversione, alimentazioneDellaVoce, rigaAlimentazione, eCyberArma } from '../src/cyberarma.js';
import { sceltaLibera, motivoFormaFissa } from '../src/manifestazione.js';

const indice = JSON.parse(readFileSync(new URL('../data/equipaggiamento/index.json', import.meta.url), 'utf8'));
const dimitri = () => ({ uid: 'emwqzcjim4d0k', rif: 'armi:cyberarma', stato: 'impugnata', quantita: 1, note: '', sintonizzato: true });

test('rif. 05: nel catalogo le CyberArma offerte sono cinque, i cinque colori', () => {
  const offerte = opzioniCascata(dati, { tipo: 'arma_ravvicinata', catalogo: 'Artefatti di campagna', famiglia: 'Spade' }).profili.filter((o) => eCyberArma(o));
  assert.equal(offerte.length, 5, `offerte ${offerte.length}: ${offerte.map((o) => o.id).join(', ')}`);
  assert.deepEqual(offerte.map((o) => o.id).sort(), ['cyberarma-bianca', 'cyberarma-blu', 'cyberarma-rossa', 'cyberarma-verde', 'cyberarma-viola']);
  assert.equal(cercaNelCatalogo(dati, 'cyberarma').length, 5, 'anche la ricerca ne propone cinque');
  assert.equal(indice.catalogo_armi.cyberarma_offerte, 5, 'il conto è dichiarato nei dati');
  assert.equal(indice.catalogo_armi.cyberarma_non_elencate, 3);
});

test('rif. 05: «CyberArma» è la famiglia, e nessuna delle voci è acquistabile', () => {
  const tutte = catalogo(dati).oggetti.filter((o) => eCyberArma(o));
  assert.equal(tutte.length, 8, 'le otto voci restano nei dati: tre sono il profilo dell’originale e delle conversioni');
  for (const o of tutte) assert.equal(o.non_in_vendita, true, `${o.id}: non si compra`);
  for (const o of tutte) assert.ok(o.famiglia_cyberarma, `${o.id}: dichiara la famiglia «CyberArma»`);
  for (const id of ['cyberarma', 'cyberarma-batteria-verde', 'cyberarma-nec']) {
    const o = tutte.find((x) => x.id === id);
    assert.equal(o.non_elencata, true, `${id}: non si offre`);
    assert.ok(typeof o._nota_non_elencata === 'string' && o._nota_non_elencata.length > 40, `${id}: il motivo è scritto nel dato`);
    assert.ok(catalogo(dati).perRif.get(o.rif), `${id}: resta risolvibile per una scheda già scritta`);
  }
});

test('rif. 05: convertire è un’opzione dell’esemplare — non nasce una seconda arma e lo storico resta', () => {
  const voce = { ...dimitri(), esemplare: { nome: 'CyberArma Dimitri', focalizzatore: 'Verde', storico: [{ cosa: 'consegna', quando: '2026-11-02' }] } };
  const e = applicaAlimentazioneEsemplare(voce, 'riserva_cm', dati, { quando: '2026-11-26T10:00:00Z', da: 'Modifica master' });
  assert.equal(e.errore, undefined);
  assert.equal(e.voce.uid, voce.uid, 'lo uid non cambia: è lo stesso record');
  assert.equal(e.voce.rif, voce.rif, 'il rif non cambia: la conversione non è un altro articolo del catalogo (A.309)');
  assert.equal(e.voce.esemplare.nome, 'CyberArma Dimitri', 'il nome resta');
  assert.equal(e.voce.esemplare.focalizzatore, 'Verde', 'il cristallo resta');
  assert.equal(e.voce.esemplare.storico.length, 2, 'lo storico non si cancella: si allunga di una riga');
  assert.equal(e.voce.esemplare.storico[0].cosa, 'consegna', 'la riga di prima è intatta');
  assert.equal(e.riga.dopo, 'Riserva interna di CM');
  assert.equal(alimentazioneDellaVoce(e.voce, dati).conversione, 'riserva_cm');
  assert.equal(alimentazioneDellaVoce(e.voce, dati).pmPersonali, false, 'A.309: si perdono i PM personali');
  assert.equal(alimentazioneDellaVoce(e.voce, dati).proprietaCustode, false, 'A.309: e le proprietà da Custode');
  // tornare ai PM personali toglie la dichiarazione e non tocca il resto
  const t = applicaAlimentazioneEsemplare(e.voce, 'pm_personali', dati, { quando: '2026-11-26T11:00:00Z', da: 'Modifica master' });
  assert.equal(t.voce.esemplare.alimentazione, undefined);
  assert.equal(t.voce.esemplare.storico.length, 3);
  assert.equal(t.voce.uid, voce.uid);
});

test('rif. 05: ogni opzione dice che cosa si perde, prima di essere scelta', () => {
  const op = opzioniEsemplare(dimitri(), dati);
  assert.equal(op.length, 3, 'PM personali più le due conversioni; cristallo e SIN non sono alimentazioni');
  assert.equal(op.filter((o) => o.attiva).length, 1, 'una sola attiva');
  assert.equal(op.find((o) => o.id === 'pm_personali').attiva, true, 'un esemplare nasce a PM personali');
  for (const o of op.filter((x) => x.conversione)) {
    assert.ok(o.perde.length >= 2, `${o.id}: dice che cosa si perde`);
    assert.match(o.perde.join(' '), /PM personali/);
    assert.match(o.perde.join(' '), /Custode/);
    assert.ok(o.consumo?.round, `${o.id}: il consumo è in Round (A.260)`);
  }
  assert.equal(applicaAlimentazioneEsemplare(dimitri(), 'pm_personali', dati).errore !== undefined, true, 'scegliere quella già attiva lo dice invece di riscrivere');
  assert.match(applicaAlimentazioneEsemplare({ rif: 'armi:spada-lunga' }, 'nec', dati).errore, /Non è una CyberArma/);
});

test('A.314 non si risolve: la capacità è quella dei dati e la riga dice che aspetta', () => {
  // nel rapporto Davide scrive «CM verde da 10 o NeC rosso da 5»; i dati hanno 5 CM (lotto 171) e 10 cariche
  // di NeC (A.237), cioè i numeri scambiati, e sono due sue decisioni precedenti.
  assert.deepEqual(capacitaConversione('riserva_cm', dati), { n: 5, unita: 'CM', rif: 'armi:cyberarma-batteria-verde', attesa: 'A.314' });
  assert.deepEqual(capacitaConversione('nec', dati), { n: 10, unita: 'cariche', rif: 'armi:cyberarma-nec', attesa: 'A.314' });
  const convertita = applicaAlimentazioneEsemplare(dimitri(), 'riserva_cm', dati).voce;
  assert.match(rigaAlimentazione(convertita, dati).testo, /capacità 5 CM \(in attesa della A\.314\)/);
});

test('rif. 05: la forma libera è una proprietà da Custode, e il limite non impedisce di attivare la lama', () => {
  const def = catalogo(dati).perRif.get('armi:cyberarma');
  assert.equal(sceltaLibera(def, ['Custode']), true, 'un Custode scegle la forma finché l’arma conserva le sue proprietà');
  assert.equal(sceltaLibera(def, ['Custode'], { proprietaCustode: false }), false, 'convertita, no (A.251, A.309)');
  assert.equal(sceltaLibera(def, ['Tecnomante']), false);
  assert.match(motivoFormaFissa(def, ['Custode'], { proprietaCustode: false }), /convertita/i);
  assert.match(motivoFormaFissa(def, ['Custode'], { proprietaCustode: false }), /si attiva comunque/i);
  assert.equal(motivoFormaFissa(def, ['Custode']), null, 'dove la scelta è libera non c’è motivo da scrivere');
  // il limite riguarda chi cambia la forma: l'attivazione della lama non lo guarda
  const sorgente = readFileSync(new URL('../src/sessione.js', import.meta.url), 'utf8');
  const fn = /export function attivaArmaSessione[\s\S]*?\n}/.exec(sorgente)?.[0] ?? '';
  assert.ok(fn.length > 50, 'attivaArmaSessione si legge');
  assert.doesNotMatch(fn, /sceltaLibera|proprietaCustode|manifestazione/, 'l’attivazione della lama non guarda la forma né le proprietà da Custode');
});

test('compatibilità: l’arma di Dimitri si legge ancora, col suo profilo e i suoi PI', () => {
  const def = catalogo(dati).perRif.get('armi:cyberarma');
  assert.ok(def, 'la voce che la sua scheda cita esiste');
  assert.equal(def.pi, 4, 'i PI del profilo restano 4: l’Integrità 4/4 che Davide ha letto');
  assert.equal(alimentazioneDellaVoce(dimitri(), dati).pmPersonali, true, 'resta a PM personali: la A.271 l’ha chiusa Davide al tavolo');
  assert.equal(opzioniEsemplare(dimitri(), dati).find((o) => o.attiva).id, 'pm_personali');
});

test('rif. 05: la conversione sopravvive al salvataggio (il guasto che la prova nel browser ha visto)', () => {
  // La finestrella confermava, il diario registrava la riga, e riaprendo la scheda l'arma era di nuovo a PM personali:
  // `normalizzaEquipaggiamento` teneva dell'`esemplare` i soli campi di testo, e l'alimentazione è un oggetto. È la
  // stessa cosa che l'A.259 dice per il Capolavoro — un segno che si perde a ogni normalizzazione — e un comando che
  // dice di aver cambiato qualcosa senza cambiarla è un pulsante che finge (lotto 244).
  const voce = { uid: 'u1', rif: 'armi:cyberarma', stato: 'impugnata', quantita: 1, note: '',
    esemplare: { nome: 'CyberArma Dimitri', storico: [{ quando: '2026-11-26', cosa: 'nascita' }] } };
  for (const id of ['riserva_cm', 'nec']) {
    const r = applicaAlimentazioneEsemplare(voce, id, dati, { quando: '26/11 16:00', da: 'Modifica master', motivo: 'prova' });
    assert.equal(r.errore, undefined, `${id}: ${r.errore ?? ''}`);
    const salvata = normalizzaEquipaggiamento([r.voce])[0];
    assert.equal(salvata.esemplare?.alimentazione?.id, id, `${id}: l’alimentazione non sopravvive al salvataggio`);
    assert.equal(salvata.esemplare.alimentazione.conversione, true);
    assert.equal(salvata.esemplare.alimentazione.pm_personali, false);
    // e quello che l'esemplare è non cambia: niente seconda voce, stesso uid, stesso rif, nome e storico interi
    assert.equal(salvata.uid, 'u1');
    assert.equal(salvata.rif, 'armi:cyberarma');
    assert.equal(salvata.esemplare.nome, 'CyberArma Dimitri');
    assert.equal(salvata.esemplare.storico.length, 2, 'lo storico si allunga di una riga e non si azzera');
    const ultima = salvata.esemplare.storico.at(-1);
    assert.equal(ultima.cosa, 'cambio dell’alimentazione');
    assert.equal(ultima.prima, 'PM personali', 'la riga dice da che cosa veniva');
    assert.match(ultima.dopo, /CM|NeC/, 'e a che cosa è passata');
    // riletta, la riga dell'arma dice la fonte nuova: è quello che si vede sulla carta dell'arma impugnata
    assert.match(rigaAlimentazione(salvata, dati, {}).testo, /Riserva interna di CM|Conversione a NeC/);
    assert.match(rigaAlimentazione(salvata, dati, {}).testo, /in attesa della A\.314/, 'la capacità aspetta la A.314');
  }
});

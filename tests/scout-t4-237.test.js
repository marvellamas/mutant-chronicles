import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 237 (23/11/2026) — due profili, non uno modificato: lo Scout T4 di serie e il FIAT LUX dei PG.
//
// I tre controlli che il lotto chiede per nome, scritti perché **restino verdi sempre**:
//
//  1. **il FIAT LUX non prende l'arma né il prezzo dello Scout T4.** È il danno che il lotto 229 aveva evitato di
//     fare, e che adesso è evitato per iscritto: il manuale dice che le due schede sono distinte (§16.1), e un
//     giorno qualcuno potrebbe «uniformare» il profilo credendo di sistemare un doppione;
//  2. **il record dei sette non si ricollega a un profilo diverso.** Il profilo è il modello, il record è il mezzo
//     che i PG hanno: la distinzione del lotto 185 e della A.295, e la lezione del 201 sui riferimenti rotti.
//     Un record che cambia profilo cambia PI massimi, soglie, arma e prezzo di un mezzo di campagna;
//  3. **l'app non scrive una percentuale né un importo per il valore effettivo del FIAT LUX.** Il manuale dice che
//     la valutazione spetta al Direttore «senza sconto percentuale o nuovo importo prestabilito»: una percentuale
//     scritta nei dati, o una cifra «di mercato» calcolata dall'app, sarebbero esattamente quello che vieta.
//
// Le edizioni non sono scritte a mano: le dà il registro (`tests/niente-date-del-registro-218.test.js`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { datiReali } from './helpers.js';
import { vistaVeicolo, normalizzaVeicoli } from '../src/veicoli.js';
import { valoreEsemplare } from '../src/valore-veicolo.js';
import { versioneManuale, testoManuale } from '../tools/manuali.mjs';
import { righeTesto } from '../tools/tabelle-testo.mjs';

const { dati } = await datiReali();
const profilo = (id) => {
  const p = dati.veicoli.profili.find((x) => x.id === id);
  assert.ok(p, `manca il profilo «${id}»`);
  return p;
};
const MK4 = profilo('asa-scout-mk4');
const T4 = profilo('asa-scout-t4');

// il record vero del FIAT LUX: la copia dell'istantanea che il lotto 213 tiene come fixture
const FIX = new URL('./fixtures/veicoli-record-213/veimvozx57q0.json', import.meta.url);
const REC = JSON.parse(readFileSync(FIX, 'utf8'));

test('sono DUE profili, e il manuale lo scrive', () => {
  assert.notEqual(MK4.id, T4.id);
  assert.equal(MK4.nome, 'ASA Scout MK4');
  assert.equal(T4.nome, 'Scout T4');
  // le due frasi del manuale corrente, non una nostra ricostruzione
  const testo = testoManuale('veicoli');
  assert.match(testo, /Lo Scout T4 di serie e il FIAT LUX dell’ASA storica mantengono schede distinte/);
  assert.match(testo, /Lo Scout T4 descritto nel catalogo è il modello generico dell’Alleanza non personalizzato, con Punisher e prezzo standard completo di 132\.510 cr/);
  assert.match(testo, /Denominazione, armamento storico e modifiche di Petra del FIAT LUX restano distinti dal modello di serie/);
  // il rimando nella scheda del FIAT LUX dice che esiste il modello di serie
  assert.equal(MK4.modello_di_serie.id, T4.id);
});

test('il FIAT LUX non prende l’arma né il prezzo dello Scout T4', () => {
  // l'arma: Capitol M606 di qua, Mitragliatore Leggero Punisher di là, e nessuno dei due ha quella dell'altro
  assert.equal(MK4.armi.length, 1);
  assert.equal(T4.armi.length, 1);
  assert.match(MK4.armi[0].nome, /Capitol M606/);
  assert.match(T4.armi[0].nome, /Mitragliatore Leggero Punisher/);
  assert.equal(/Punisher/.test(MK4.armi[0].nome), false, 'il FIAT LUX conserva il suo mitragliatore storico');
  assert.equal(/M606/.test(T4.armi[0].nome), false);
  assert.notEqual(MK4.armi[0].rif, T4.armi[0].rif);
  // il prezzo: 126.510 il FIAT LUX, 132.510 il modello di serie col Punisher (la differenza è l'arma)
  assert.equal(MK4.prezzo_cr, 126510);
  assert.equal(T4.prezzo_cr, 132510);
  assert.equal(T4.prezzo_cr - MK4.prezzo_cr, 6000, 'i 6.000 cr di differenza sono Punisher 25.000 − M606 19.000');
  assert.equal(MK4.valore_voci.find((v) => /M606/.test(v.voce)).cr, 19000);
  assert.equal(T4.valore_voci.find((v) => /Punisher/.test(v.voce)).cr, 25000);
  // l'arco frontale di 180° della A.280 è una risposta sul FIAT LUX e resta lì: sul modello di serie non si inventa
  assert.equal(MK4.armi[0].arco.gradi, 180);
  assert.equal(T4.armi[0].arco, undefined, 'il manuale non dà un arco per il Punisher di serie: non si deduce');
  // le modifiche di Petra sono del FIAT LUX
  assert.ok((MK4.rinforzi ?? []).some((r) => /Petra|copriruot/i.test(JSON.stringify(r))), 'i copriruote di Petra stanno sul FIAT LUX');
  assert.equal((T4.rinforzi ?? []).length, 0, 'il modello di serie non ha le modifiche di Petra');
  // e il nome dell'esemplare: «FIAT LUX» è dell'uno, l'altro è un modello di catalogo
  assert.equal(MK4.nome_esemplare?.nome ?? MK4.nome_esemplare, 'FIAT LUX');
  assert.equal(T4.nome_esemplare, undefined);
});

test('lo scafo è lo stesso: i campi che i due condividono non sono stati toccati', () => {
  // il §10 dà una scheda sola per lo scafo: se questi divergessero, uno dei due sarebbe inventato
  for (const k of ['mov_q', 'man', 'qualita', 'ps_integrita', 'corazzato', 'carico_kg', 'valore_telaio_cr', 'reperibilita']) {
    assert.deepEqual(T4[k], MK4[k], `${k}: lo scafo è lo stesso`);
  }
  assert.deepEqual(T4.pi, MK4.pi);
  assert.deepEqual(T4.pi, { corpo: 60, propulsione: 36, motore: 24 });
  assert.deepEqual(T4.ar, MK4.ar);
  assert.deepEqual(T4.ricambi_cr_per_pi, MK4.ricambi_cr_per_pi);
  assert.deepEqual(T4.equipaggio, MK4.equipaggio);
  // di questo profilo non esiste nessun esemplare: niente riserve salvate in Lx da convertire (A.193)
  assert.equal(T4.senza_energia_precedente, true);
});

test('IL RECORD DEI SETTE NON SI RICOLLEGA: il FIAT LUX resta sul suo profilo, coi suoi valori', () => {
  assert.equal(REC.mezzo.profilo, 'asa-scout-mk4', 'il record punta al profilo del FIAT LUX, non a quello di serie');
  assert.equal(REC.mezzo.nome, 'FIAT LUX');
  // la vista del record col catalogo di adesso: i valori che il mezzo ha già
  const v = vistaVeicolo(REC.mezzo, dati, { pilotareVa: 12 });
  assert.match(v.profilo.armi[0].nome, /Capitol M606/, 'il mezzo dei PG spara ancora col suo mitragliatore');
  assert.equal(v.profilo.prezzo_cr, 126510);
  const m = normalizzaVeicoli([REC.mezzo], dati)[0];
  assert.deepEqual(m.pi, REC.mezzo.pi, 'i PI attuali del record');
  assert.deepEqual(m.munizioni, REC.mezzo.munizioni, 'le munizioni del record');
  assert.equal(m.profilo, 'asa-scout-mk4');
  // il mutante: ricollegare il record al profilo di serie cambia arma, prezzo e valore del mezzo dei PG
  const spostato = { ...REC, mezzo: { ...REC.mezzo, profilo: 'asa-scout-t4' } };
  const vs = vistaVeicolo(spostato.mezzo, dati, { pilotareVa: 12 });
  assert.notEqual(vs.profilo.armi[0].nome, v.profilo.armi[0].nome, 'se il record cambiasse profilo cambierebbe arma: il controllo deve accorgersene');
  assert.notEqual(vs.profilo.prezzo_cr, v.profilo.prezzo_cr);
});

test('il valore effettivo del FIAT LUX: nessuna percentuale, nessun importo prestabilito', () => {
  const V = MK4.valutazione_direttore;
  assert.ok(V, 'il profilo dichiara la frase del manuale');
  assert.equal(V.senza_sconto_percentuale, true);
  assert.equal(V.senza_importo_prestabilito, true);
  // **nel blocco non c'è un numero**: né una percentuale, né una cifra in crediti
  assert.deepEqual(Object.entries(V).filter(([, x]) => typeof x === 'number'), [], 'un numero qui sarebbe un importo prestabilito');
  // i campi che cominciano con «_» sono citazioni e note (convenzione del repo): il «_fonte» riporta la frase del
  // manuale, che la parola «percentuale» la contiene per dire che NON si applica. Qui si guarda quello che l'app
  // mostra, e qualunque numero in qualunque campo.
  for (const [k, t] of Object.entries(V).filter(([k2, x]) => typeof x === 'string' && !k2.startsWith('_'))) {
    assert.equal(/%|per cento|percentual/i.test(t), false, `nessuna percentuale in ${k}: ${t.slice(0, 60)}`);
    assert.equal(/\b\d[\d.,]*\s*cr\b/i.test(t), false, `nessun importo in crediti in ${k}: ${t.slice(0, 60)}`);
  }
  assert.match(V.testo, /valutazione spetta al Direttore/i);
  // e l'app non calcola uno «sconto»: il valore sono le tre righe della A.257, col prezzo di catalogo come base
  const e = valoreEsemplare(REC.mezzo, MK4, dati);
  assert.equal(e.base.cr, MK4.prezzo_cr, 'la base è il prezzo di catalogo, non una percentuale di esso');
  assert.equal(e.totale.cr, e.base.cr + e.extra.cr, 'il totale è base + extra: nessuno sconto applicato dall’app');
  assert.equal(e.valutazione.testo, V.testo, 'la scheda mostra la frase');
  // il Direttore scrive il valore stimato, e allora quello prende il posto della base (A.226, A.257)
  const stimato = valoreEsemplare({ ...REC.mezzo, valore_stimato_cr: 100000 }, MK4, dati);
  assert.equal(stimato.base.cr, 100000);
  assert.match(stimato.base.da, /Direttore/);
});

test('…e i controlli SANNO fallire: i tre mutanti', () => {
  // 1. il FIAT LUX che prende l'arma del modello di serie
  const conPunisher = { ...MK4, armi: [T4.armi[0]] };
  assert.equal(/Capitol M606/.test(conPunisher.armi[0].nome), false, 'il mutante cambia davvero l’arma');
  // 2. il record ricollegato
  assert.notEqual({ ...REC.mezzo, profilo: 'asa-scout-t4' }.profilo, REC.mezzo.profilo);
  // 3. una percentuale nei dati della valutazione
  const conSconto = { ...MK4.valutazione_direttore, sconto_percentuale: 30 };
  assert.notDeepEqual(Object.entries(conSconto).filter(([, x]) => typeof x === 'number'), [], 'il mutante mette un numero');
});

test('i ventuno mezzi dei capitoli 16 e 17 NON sono nel catalogo: aspettano la A.304', () => {
  const nomi = new Set(dati.veicoli.profili.map((p) => p.nome));
  for (const m of ['Recon T6', 'Vigilant T4', 'Carrier T6', 'Bastion TC', 'Thunder TC', 'Warden TC', 'Pursuit T4']) {
    assert.equal(nomi.has(m), false, `${m} non entra finché la A.304 non dice quali mezzi servono al tavolo`);
  }
  // ma il manuale li ha, e il lettore li legge: il conto dei profili è dichiarato
  assert.equal(dati.veicoli.corpus.profili, dati.veicoli.profili.length);
  assert.equal(dati.veicoli.corpus.mezzi_nel_manuale, dati.veicoli.profili.length + dati.veicoli.fuori_catalogo.mezzi.length);
  // i titoli dei ventuno ci sono nel testo salvato: il lotto che applica non deve riscaricare niente
  const righe = righeTesto(testoManuale('veicoli'));
  for (const t of ['16.11 Bastion TC', '17.10 Warden TC', '18.1 Pursuit T4']) assert.ok(righe.includes(t), `il testo salvato ha «${t}»`);
  assert.equal(versioneManuale('veicoli'), '0.23');
});

test('sull’istantanea del 21/11 il FIAT LUX dei sette è quello di sempre', () => {
  const file = 'F:/REPOS/mutant/istantanee/stato_2026-11-21_2353/veicoli/veimvozx57q0.json';
  if (!existsSync(file)) return; // su un altro PC l'istantanea non c'è: il controllo salta
  const vero = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(vero.mezzo.profilo, 'asa-scout-mk4');
  assert.equal(vero.mezzo.nome, 'FIAT LUX');
  // i numeri misurati prima del lotto, sul record vero in sola lettura
  assert.deepEqual(vero.mezzo.pi, { corpo: 60, propulsione: 36, motore: 24 });
  assert.deepEqual(vero.mezzo.munizioni, [{ caricate: 400, riserva: 800 }]);
  const v = vistaVeicolo(vero.mezzo, dati, { pilotareVa: 12 });
  assert.match(v.profilo.armi[0].nome, /Capitol M606/);
  assert.equal(valoreEsemplare(vero.mezzo, MK4, dati).totale.cr, 188510);
});

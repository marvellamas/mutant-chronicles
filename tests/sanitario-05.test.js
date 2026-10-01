// Equipaggiamento 0.5, cap. 6 ampliato (lotto 4): naniti medici (§6.7), postazioni medicochirurgiche (§6.8),
// campo «cura» con i numeri delle cure, letti con il Giocatore 0.45 (§5.16.2, §5.16.6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda } from '../src/calc.js';
import { normalizza } from '../src/character.js';
import { catalogo, riserveNec, testoCura, testoProvaPostazione } from '../src/equipaggiamento.js';
import { testoTooltip } from '../src/descrizioni.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const r = (id) => cat.perRif.get(`sanitario:${id}`);
const voce = (uid, rif, stato = null) => ({ uid, rif, stato, quantita: 1, note: '' });

test('cure con i numeri: cartucce, Spray, naniti (§6.2, §6.4, §6.7; Giocatore §5.16.2)', () => {
  assert.deepEqual(r('cartuccia-emostatica').cura, { sanguinamento: 'sospende', round: 5, fonte: '§6.2' });
  assert.deepEqual(r('cartuccia-curativa').cura, { pv: '1d6', senza_sanguinamento: true, fonte: '§6.2' });
  assert.equal(r('spray-rimarginante').cura.pv, '1d3');
  assert.equal(testoCura(r('spray-rimarginante').cura), 'Recupera 1d3 PV fino al massimo, solo senza Sanguinamento attivo (anche durante una sospensione); 1 AzP, senza Prova (Equipaggiamento §6.4).');
  // naniti: uno stato, 10–50 minuti secondo lo stato alla somministrazione, una dose ogni 24 ore, fuori dal tentativo settimanale
  const n = r('naniti-medici');
  assert.deepEqual([n.costo, n.reperibilita, n.cura.ferita_stati, n.cura.intervallo_ore, n.cura.tentativo_settimanale], [5000, 'MR', 1, 24, false]);
  assert.deepEqual(n.cura.durate.map((x) => [x.stato, x.minuti, x.esito]), [['Superficiale', 10, 'Guarita'], ['Importante', 20, 'Superficiale'], ['Profonda', 30, 'Importante'], ['Seria', 40, 'Profonda'], ['Grave', 50, 'Seria']]);
  assert.match(testoTooltip('oggetto', 'sanitario:naniti-medici', dati), /riduce la Ferita di uno stato in 10′ da Superficiale.*una dose ogni 24 ore; non consuma il tentativo ogni sette giorni/i);
});

test('postazioni medicochirurgiche: quattro modelli fissi e mobili, Prova, riserve e procedure (§6.8)', () => {
  const p = (m, mob) => r(`postazione-${m}-${mob ? 'mobile' : 'fissa'}`);
  assert.deepEqual(['semiautomatica', 'automatica-standard', 'automatica-professionale', 'automatica-specializzata'].map((m) => [p(m).costo, p(m, true).costo, p(m).peso, p(m).pi]),
    [[60000, 75000, 250, 16], [100000, 125000, 300, 16], [180000, 225000, 350, 20], [300000, 375000, 400, 24]]);
  // la mobile costa il 25% in più
  for (const m of ['semiautomatica', 'automatica-standard', 'automatica-professionale', 'automatica-specializzata']) assert.equal(p(m, true).costo, p(m).costo * 1.25);
  assert.equal(testoProvaPostazione(p('semiautomatica').postazione), 'Medicina dell’operatore +3 strumenti');
  assert.equal(testoProvaPostazione(p('automatica-specializzata').postazione), 'IA con VA 18 (oppure, a scelta, Medicina dell’operatore +3)');
  assert.deepEqual(p('automatica-professionale').postazione.alloggiamenti, { chirurgiche: 5, farmacologiche: 20, nutritive: 20 });
  // degenza come ricovero ospedaliero (Giocatore §5.16.2: 1 stato ogni 3 giorni), tentativo settimanale condiviso (§5.16.6)
  assert.deepEqual([p('semiautomatica').cura.degenza_giorni_per_stato, p('semiautomatica').cura.tentativo_settimanale], [3, true]);
  assert.deepEqual(p('semiautomatica').cura.procedure.slice(0, 2).map((x) => [x.tempo, x.effetto]), [['10 minuti', 'Riduce la Ferita di uno stato.'], ['1 ora', 'Riduce la Ferita di due stati.']]);
  // usi contati al tavolo: 10 operazioni dal Modulo Rosso, giorni di degenza o stasi dai Verdi; 5 cartucce chirurgiche
  const riserve = riserveNec([voce('pp', 'sanitario:postazione-automatica-professionale-fissa')], dati);
  assert.deepEqual(riserve.map((x) => [x.chiave, x.massimo, x.unita]), [['pp', 10, 'operazioni'], ['pp#a1', 20, 'giorni di degenza o stasi']]);
  assert.equal(riserve[1].provenienza.righe[0].fonte, '2 × Modulo Verde');
  assert.deepEqual([p('semiautomatica').applicazioni, p('semiautomatica').nome_applicazioni], [5, 'cartucce chirurgiche']);
  assert.deepEqual([r('cartuccia-chirurgica').costo, r('ricarica-nutritiva-sanitaria').costo, r('ricarica-nutritiva-sanitaria').peso], [500, 50, 2.5]);
});

test('bonus degli strumenti di chirurgia: uno solo per Prova (§6.5, §6.8.1)', () => {
  const scheda = (voci) => calcolaScheda({ creazione: normalizza({ ...MISHIMA_AGENTE, equipaggiamento: voci }, dati).scelte, livelli: [] }, dati);
  const usi = (s) => s.equipaggiamento.effettiOggetti.filter((e) => e.beneficio === 'strumenti_chirurgia').map((e) => [e.oggetto, e.valore]);
  const s = scheda([voce('k', 'sanitario:kit-chirurgico-da-campo', 'in_uso'), voce('p', 'sanitario:postazione-semiautomatica-fissa', 'in_uso')]);
  assert.deepEqual(usi(s), [['Postazione medicochirurgica Semiautomatica fissa', 3]]);
});

test('validatore: cura, postazione e alimentazione con più NEC danno errori leggibili', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const o = (d, id) => d.equipaggiamento.file.sanitario.oggetti.find((x) => x.id === id);
  assert.match(e((d) => { o(d, 'cartuccia-curativa').cura.pv = 'tanti'; }), /cura\.pv: dado dei PV recuperati/);
  assert.match(e((d) => { delete o(d, 'cartuccia-emostatica').cura.round; }), /cura\.round: la sospensione dura/);
  assert.match(e((d) => { o(d, 'postazione-semiautomatica-fissa').postazione.prova = { tipo: 'ia' }; }), /postazione: serve \{ modello/);
  assert.match(e((d) => { o(d, 'postazione-semiautomatica-fissa').alimentazione[1].usi = 99; }), /alimentazione\[1\]: 99 giorni di degenza o stasi da 1000 Lx superano la carica/);
});

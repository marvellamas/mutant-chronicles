// Lotto 5 della ricognizione del 02/10 sera: risposte di Davide sull'equipaggiamento (E&L del 02/10/2026;
// tools/lotti/lotto_risposte_equip_0210.mjs). Voci doppie unite con la migrazione dei salvataggi.
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizza } from '../src/character.js';
import { catalogo, risolvi, riserveNec } from '../src/equipaggiamento.js';
import { modoRicarica, infoRicarica } from '../src/ricarica.js';
import { vociDotazione, dotazioneVuota, opzioniEffettive, sottoScelteRichieste } from '../src/dotazioni.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const cat = catalogo(dati);
const r = (rif) => cat.perRif.get(rif);
const voce = (uid, rif, stato = null, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const nessunTodo = (rif, a) => assert.ok(!/A\.6[2-8]|A\.71/.test(r(rif)['TODO(Davide)'] ?? ''), `${rif}: TODO ${a}`);

test('A.62 Ryūjin: natura Naturale, la proprietà Plasma all’attivazione', () => {
  const k = r('armi_corporative:katana-ryujin');
  assert.deepEqual([k.attivazione.natura, k.attivazione.anche, k.attivazione.danno_extra], ['Naturale', 'la proprietà Plasma', '1d6']);
  nessunTodo('armi_corporative:katana-ryujin', 'A.62');
});

test('A.63 esoscheletri, aggiornata dal lotto 153 (Armamenti 0.74 §7.20.5, Equipaggiamento 0.30 §5.4.8): NEC Rosso 10 o CEC Rossa in cariche, 10 o 5 ore', () => {
  const cariche = {
    'armature_corporative:juggernaut-xo-102-steel-strider': ['nec:cec-rosso', 'un’ora'], 'armature_corporative:vulkan': ['nec:cec-rosso', 'un’ora'],
    'corredi_dispositivi:ape-capitol': ['nec:cec-rosso', 'mezz’ora'], 'unita_robotiche:cuirassier-attila': ['nec:cec-rosso', 'un’ora'],
    'armature_corporative:mk-iv-felis-pattern-dei-golden-lions': ['nec:nec-rosso-10', 'un’ora'], 'armature_corporative:powersuit': ['nec:nec-rosso-10', 'un’ora'],
    'corredi_dispositivi:iron-mastiff': ['nec:nec-rosso-10', 'un’ora'],
    'armature_corporative:shoa-ace-custom': ['nec:nec-rosso-10', 'mezz’ora'], 'armature_corporative:demonhunter': ['nec:nec-rosso-10', 'mezz’ora'],
  };
  for (const [rif, [nec, durata]] of Object.entries(cariche)) {
    const a = r(rif).alimentazione;
    assert.deepEqual([a.nec, a.usi, a.autonomia_ore], [nec, 10, undefined], rif);
    assert.ok(a.unita_usi.includes(durata), rif);
    assert.match(a.descrizione, durata === 'un’ora' ? /dieci ore massime/ : /cinque ore massime/, rif);
    nessunTodo(rif, 'A.63');
  }
  // le ore salvate prima (8 o 6) si convertono con la frazione (A.193): metà delle 8 ore → 5 cariche su 10
  const [v] = riserveNec([voce('v', 'armature_corporative:vulkan', 'indossata')], dati);
  assert.deepEqual([v.unita, v.massimo, v.chiave, v.precedenti], ['cariche (impieghi fino a un’ora)', 10, 'v#c', { v: 8 }]);
});

test('A.63 di prima (fino al lotto 152): NEC Rosso di formato dedicato in ore — ora sostituito, nessuna voce lo usa più', () => {
  const ore = { 'armature_corporative:juggernaut-xo-102-steel-strider': 8, 'armature_corporative:vulkan': 8, 'corredi_dispositivi:ape-capitol': 6, 'armature_corporative:mk-iv-felis-pattern-dei-golden-lions': 8, 'armature_corporative:powersuit': 8, 'armature_corporative:shoa-ace-custom': 6, 'armature_corporative:demonhunter': 6 };
  for (const [rif, h] of Object.entries(ore)) {
    assert.notEqual(r(rif).alimentazione.autonomia_ore, h, rif);
    assert.doesNotMatch(r(rif).alimentazione.descrizione, /formato dedicato/, rif);
  }
});

test('A.64 moduli IAS (Armamenti 0.74 §7.15.4, lotto 153): pacco da due NEC Blu 10, 20 cariche, 300 g, ricambio 800 cr, 10 cr per carica', () => {
  for (const id of ['ias3100-generatore-blink', 'ias3200-imbracatura-antigravita', 'ias3300-mirrorshard', 'ias3400-disturbatore-metafisico', 'smorzatore-acustico-silent']) {
    const a = r(`corredi_dispositivi:${id}`).alimentazione;
    assert.deepEqual([a.usi, a.lx_per_uso, a.da_definire, a.nec], [20, undefined, undefined, 'nec:pacco-20-blu'], id);
    assert.match(a.descrizione, /20 cariche, un solo contatore, 300 g; ricambio carico 800 cr/);
    assert.match(a.descrizione, /10 cr per carica, 200 cr da vuoto/);
    nessunTodo(`corredi_dispositivi:${id}`, 'A.64');
  }
  assert.match(r('corredi_dispositivi:ias3100-generatore-blink').alimentazione.unita_usi, /Power Blink 2/);
});

test('A.65 dotazione: Corredo agricolo Allevamento (2 kg, 200 cr) e strumento musicale acustico o elettronico a scelta', () => {
  const all = r('strumenti_professionali:corredo-agricolo-standard-allevamento');
  assert.deepEqual([all.peso, all.costo, all.reperibilita], [2, 200, 'CO']);
  // la voce di dotazione legge la scheda della sotto-scelta, anche per i personaggi già salvati
  const vecchia = { uid: 'd', rif: null, personalizzato: { nome: 'Corredo agricolo (Standard) (Allevamento)', tipo: 'altro' }, stato: null, quantita: 1, note: '', dotazione_iniziale: true, dotazione_id: 'corredo-agricolo' };
  assert.equal(risolvi(vecchia, cat).def?.id, 'corredo-agricolo-standard-allevamento');
  assert.equal(risolvi({ ...vecchia, personalizzato: { nome: 'Corredo agricolo (Standard) (Coltivazione)', tipo: 'altro' } }, cat).def?.id, 'attrezzi-agricoli-di-base');
  const mus = { ...vecchia, personalizzato: { nome: 'Strumento musicale portatile (Standard) (Elettronico)', tipo: 'altro' }, dotazione_id: 'strumento-musicale-portatile' };
  assert.deepEqual([risolvi(mus, cat).def?.costo, risolvi(mus, cat).def?.peso], [800, 3]);
  assert.deepEqual(dati.dotazioni.sotto_scelte.strumento_musicale.valori, ['Acustico', 'Elettronico']);
  assert.ok(!dati.dotazioni.oggetti_dotazione['corredo-agricolo']['TODO(Davide)'] && !dati.dotazioni.oggetti_dotazione['strumento-musicale-portatile']['TODO(Davide)']);
  // il wizard chiede la scelta per il Menestrello o chi riceve lo strumento: sotto-scelta richiesta
  const classe = dati.dotazioni.classi && Object.entries(dati.dotazioni.classi).find(([, c]) => JSON.stringify(c).includes('strumento-musicale-portatile'))?.[0];
  if (classe) {
    const d = dotazioneVuota();
    for (const { gruppo } of opzioniEffettive(d, classe, dati)) {
      const i = gruppo.opzioni.findIndex((o) => JSON.stringify(o).includes('strumento-musicale-portatile'));
      d.opzioni[gruppo.id] = gruppo.opzioni[Math.max(0, i)].id;
    }
    assert.ok(sottoScelteRichieste(d, classe, dati).some((s) => s.oggetto === 'strumento-musicale-portatile'));
    d.sotto['strumento-musicale-portatile'] = 'Acustico';
    const v = vociDotazione(d, classe, null, dati).find((x) => x.dotazione_id === 'strumento-musicale-portatile');
    assert.equal(risolvi(v, cat).def?.costo, 400);
  }
});

test('A.66 Corredo da cucina: 30 minuti, NEC Rosso, 10 preparazioni (dall’Equipaggiamento 0.13 senza Lx)', () => {
  const c = r('esplorazione:corredo-da-cucina-da-campo');
  assert.deepEqual([c.alimentazione.nec, c.alimentazione.usi, c.alimentazione.unita_usi, c.alimentazione.lx_per_uso], ['nec:nec-rosso-10', 10, 'cariche (preparazioni)', undefined]);
  assert.match(c.decisione, /30 minuti/);
  nessunTodo('esplorazione:corredo-da-cucina-da-campo', 'A.66');
});

test('A.67 (0.68): il pacco del Gehemmapuker è un pacco Rosso da 50 cariche; migrazione del vecchio Modulo Blu; niente travaso fra NEC senza trasformatore', () => {
  assert.equal(r('munizioni:pacco-nec-gehemmapuker').cella.capacita, 50);
  const g = r('armi_distanza_corporative:gehemmapuker');
  assert.equal(modoRicarica(g, dati, cat).modo, 'cella');
  const info = infoRicarica([voce('g', 'armi_distanza_corporative:gehemmapuker', 'impugnata'), voce('m', 'munizioni:pacco-nec-gehemmapuker')], dati);
  assert.deepEqual(info.g.scorte.map((s) => s.uid), ['m']);
  // un salvataggio con il vecchio Modulo Blu riceve il pacco del Gehemmapuker (index.json → rif_sostituiti)
  const s = normalizza({ ...MISHIMA_AGENTE, equipaggiamento: [voce('p', 'nec:modulo-blu', null, { quantita: 2 })] }, dati).scelte;
  assert.deepEqual([s.equipaggiamento[0].rif, s.equipaggiamento[0].quantita], ['munizioni:pacco-nec-gehemmapuker', 2]);
  assert.equal(dati.regole.nec.travaso.ammesso, false);
});

test('A.68 Interfaccia neurale standard: 3.500 cr + 2.000 di installazione, 2 UMN, acquistabile', () => {
  const i = r('impianti:interfaccia-neurale');
  assert.deepEqual([i.costo, i.installazione_costo, i.umn], [3500, 2000, 2]);
  assert.deepEqual([r('impianti:interfaccia-neurale-cybertronic').costo, r('impianti:interfaccia-neurale-cybertronic').umn], [5000, 1]);
  nessunTodo('impianti:interfaccia-neurale', 'A.68');
});

test('A.71 Cartuccia chirurgica: una voce sola; i vecchi set diventano cartucce (la confezione da cinque, cinque)', () => {
  const c = r('sanitario:cartuccia-chirurgica');
  assert.deepEqual([c.nome, c.costo, c.confezione], ['Cartuccia chirurgica — set sterile monouso', 500, { quantita: 5, costo: 2500 }]);
  assert.equal(r('sanitario:set-chirurgico-di-ricambio'), undefined);
  const s = normalizza({ ...MISHIMA_AGENTE, equipaggiamento: [voce('a', 'sanitario:set-chirurgico-di-ricambio', null, { quantita: 2 }), voce('b', 'sanitario:confezione-da-cinque-set-chirurgici')] }, dati).scelte;
  assert.deepEqual(s.equipaggiamento.map((v) => [v.rif, v.quantita]), [['sanitario:cartuccia-chirurgica', 2], ['sanitario:cartuccia-chirurgica', 5]]);
  nessunTodo('sanitario:cartuccia-chirurgica', 'A.71');
});

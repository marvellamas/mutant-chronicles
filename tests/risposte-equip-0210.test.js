// Lotto 5 della ricognizione del 02/10 sera: risposte di Davide sull'equipaggiamento (E&L del 02/10/2026;
// tools/lotti/lotto_risposte_equip_0210.mjs). Voci doppie unite con la migrazione dei salvataggi.
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

test('A.63 esoscheletri: NEC Rosso di formato dedicato in ore, al tavolo come riserva in ore', () => {
  const ore = { 'armature_corporative:juggernaut-xo-102-steel-strider': 8, 'armature_corporative:vulkan': 8, 'corredi_dispositivi:ape-capitol': 6, 'armature_corporative:mk-iv-felis-pattern-dei-golden-lions': 8, 'armature_corporative:powersuit': 8, 'armature_corporative:shoa-ace-custom': 6, 'armature_corporative:demonhunter': 6 };
  for (const [rif, h] of Object.entries(ore)) {
    assert.deepEqual([r(rif).alimentazione.nec, r(rif).alimentazione.autonomia_ore], [null, h], rif);
    assert.match(r(rif).alimentazione.descrizione, /^NEC Rosso di formato dedicato/);
    nessunTodo(rif, 'A.63');
  }
  const [x] = riserveNec([voce('v', 'armature_corporative:vulkan', 'indossata')], dati);
  assert.deepEqual([x.unita, x.massimo], ['ore', 8]);
});

test('A.64 moduli IAS: NEC Blu IAS da 1.000 Lx, 20 cariche da 50 Lx (Power Blink 2)', () => {
  for (const id of ['ias3100-generatore-blink', 'ias3200-imbracatura-antigravita', 'ias3300-mirrorshard', 'ias3400-disturbatore-metafisico', 'smorzatore-acustico-silent']) {
    const a = r(`corredi_dispositivi:${id}`).alimentazione;
    assert.deepEqual([a.usi, a.lx_per_uso, a.usi * a.lx_per_uso], [20, 50, 1000], id);
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

test('A.66 Corredo da cucina: 30 minuti, NEC Rosso, 10 preparazioni da 50 Lx', () => {
  const c = r('esplorazione:corredo-da-cucina-da-campo');
  assert.deepEqual([c.alimentazione.nec, c.alimentazione.usi, c.alimentazione.lx_per_uso], ['nec:rosso-standard', 10, 50]);
  assert.match(c.decisione, /30 minuti/);
  nessunTodo('esplorazione:corredo-da-cucina-da-campo', 'A.66');
});

test('A.67 Modulo Blu: una voce sola anche per il Gehemmapuker; migrazione del vecchio pacco; niente travaso fra NEC', () => {
  assert.equal(r('munizioni:pacco-nec-gehemmapuker'), undefined);
  const g = r('armi_distanza_corporative:gehemmapuker');
  assert.equal(modoRicarica(g, dati, cat).modo, 'cella');
  const info = infoRicarica([voce('g', 'armi_distanza_corporative:gehemmapuker', 'impugnata'), voce('m', 'nec:modulo-blu')], dati);
  assert.deepEqual(info.g.scorte.map((s) => s.uid), ['m']);
  // un salvataggio con il vecchio pacco riceve il Modulo Blu
  const s = normalizza({ ...MISHIMA_AGENTE, equipaggiamento: [voce('p', 'munizioni:pacco-nec-gehemmapuker', null, { quantita: 2 })] }, dati).scelte;
  assert.deepEqual([s.equipaggiamento[0].rif, s.equipaggiamento[0].quantita], ['nec:modulo-blu', 2]);
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

// Risposte di Davide ai 19 quesiti dell'app (Doc E&L, sezione «Risposte ai 19 quesiti dell'app»,
// 29/09/2026). La numerazione dei test segue quella delle risposte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, bonusDannoCaratteristica, caratteristicaDanno } from '../src/calc.js';
import { profiloSenzArmi, calcolaAttaccoRavvicinato, vincoliRavvicinato, moltiplicatoreMagistrale } from '../src/attacco.js';
import { inizializzaSessione, massimiSessione, ricaricaArma, variaMunizioni, allineaSessione, modificaSessione } from '../src/sessione.js';
import { calcolaLancio } from '../src/lancio.js';
import { soglieCarico } from '../src/carico.js';
import { vociDotazione, modelloAssegnato } from '../src/dotazioni.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const scheda = (equipaggiamento = [], livelli = [], extra = {}) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, ...extra, equipaggiamento }, livelli }, dati);

// --- 12. Bonus di Caratteristica al danno; danno senz'armi -------------------------------------

test('E&L 12: tabella del bonus di Caratteristica al danno con il tetto di livello (§5.13)', () => {
  const b = (valore, livello) => bonusDannoCaratteristica(valore, livello, dati.regole);
  assert.deepEqual([1, 5, 6, 7, 8, 9, 10].map((v) => b(v, 20)), [0, 0, 1, 1, 2, 2, 3]);
  // tetto: +1 ai livelli 1–7, +2 agli 8–14, +3 dal 15°
  assert.deepEqual([b(10, 1), b(10, 7), b(10, 8), b(10, 14), b(10, 15)], [1, 1, 2, 2, 3]);
  assert.equal(b(8, 3), 1); // FOR 8 al 3° livello: +1, non +2
  assert.equal(b(3, 20), 0); // mai sotto 0
  // Caratteristica: quella dell'Abilità dell'arma; Armi pesanti usa INT
  assert.deepEqual(['Armi da guerra', 'Armi da mischia', 'Corpo a corpo', 'Armi leggere', 'Armi medie', 'Armi pesanti', 'Armi da lancio'].map((a) => caratteristicaDanno(a, dati)),
    ['FOR', 'DES', 'FOR', 'DES', 'INT', 'INT', 'DES']);
});

test('E&L 12: FOR 8 al 3° livello dà +1 al danno di un’arma da guerra, non +2', () => {
  const livelli = [{ livello: 2, caratteristiche: { FOR: 2 } }, { livello: 3, talentoLibero: { id: 'iniziativa-migliorata' } }];
  const s = scheda([voce('s', 'armi:spada-lunga', 'impugnata')], livelli);
  assert.deepEqual([s.livello, s.caratteristiche.FOR.valore], [3, 8]);
  const spada = s.equipaggiamento.armi[0];
  assert.equal(spada.abilita, 'Armi da guerra');
  assert.deepEqual(spada.bonusCaratteristica, { sigla: 'FOR', valore: 8, bonus: 1, esclusoDa: null });
  // senz'armi: 1d4 + FOR, stesso tetto
  const nudo = profiloSenzArmi(s, dati);
  assert.deepEqual([nudo.danno.una_mano, nudo.bonusCaratteristica.bonus], ['1d4+1', 1]);
});

test('E&L 12: Danno calibrato (SA30, SA50F) esclude il bonus di Caratteristica e quello della Specializzazione', () => {
  const s = scheda([voce('d', 'armi_distanza_corporative:sa30-a-dardi', 'impugnata'), voce('f', 'armi_distanza_corporative:sa50f-a-dardi', 'impugnata')]);
  for (const a of s.equipaggiamento.armi) {
    assert.deepEqual([a.bonusCaratteristica.bonus, a.bonusCaratteristica.esclusoDa], [0, 'Danno calibrato'], a.nome);
  }
  assert.equal(dati.equipaggiamento.file.armi_distanza_corporative.oggetti.find((o) => o.id === 'sa50f-a-dardi').specializzazione_danno, false);
});

test('E&L 12: nessun TODO sul danno senz’armi; il dado di base è 1d4', () => {
  const S = dati.regole.attacco_ravvicinato.senz_armi;
  assert.equal(S.danno, '1d4');
  assert.equal(S['TODO(Davide)'], undefined);
});

// --- 6–11, 13, 14. Corpo a corpo -----------------------------------------------------------------

const conSpada = () => scheda([voce('s', 'armi:spada-lunga', 'impugnata')]);
const attacca = (s, arma, d = {}) => calcolaAttaccoRavvicinato({ scheda: s, sessione: {} }, arma, d, dati);
const vaDi = (s, nome) => s.abilita.find((a) => a.nome === nome);

test('E&L 7–8: Sbilanciare e Disarmare usano l’Abilità del mezzo dichiarato; l’opposizione la sceglie il bersaglio (A.28, A.41)', () => {
  const s = conSpada();
  const spada = s.equipaggiamento.armi[0];
  for (const manovra of ['sbilanciare', 'disarmare']) {
    const r = attacca(s, spada, { manovra });
    // con l'arma: la sua Abilità, anche se Corpo a corpo fosse maggiore; −4 all'attaccante
    assert.equal(r.scomposizione[0].etichetta, `VA ${spada.abilita}`, manovra);
    assert.equal(r.va_finale, (spada.vaEffettivo ?? spada.va) - 4, manovra);
    // senza scelta dell'opposizione: avviso; con la scelta, la Prova la nomina
    assert.ok(r.avvisi.some((x) => /sceglie prima del tiro/.test(x)), manovra);
    const contro = dati.regole.attacco_ravvicinato.manovre[manovra].prova.contro[1];
    const scelto = attacca(s, spada, { manovra, opposizione: contro });
    assert.equal(scelto.prova.opposizione, contro);
    assert.ok(!scelto.avvisi.some((x) => /sceglie prima del tiro/.test(x)));
  }
  // senz'armi: Corpo a corpo
  const nudo = profiloSenzArmi(s, dati);
  assert.equal(attacca(s, nudo, { manovra: 'sbilanciare', opposizione: 'Atletica' }).va_finale, vaDi(s, 'Corpo a corpo').totale - 4);
  // Immobilizzare resta sempre Corpo a corpo
  assert.equal(attacca(s, spada, { manovra: 'immobilizzare' }).scomposizione[0].etichetta, 'VA Corpo a corpo');
});

test('E&L 6: Spazzata anche senz’armi con Corpo a corpo, −4 contro due e −6 contro tre (A.27, A.42)', () => {
  const s = conSpada();
  const nudo = profiloSenzArmi(s, dati);
  assert.equal(vincoliRavvicinato({ scheda: s, sessione: {} }, nudo, { manovra: 'spazzata' }, dati).manovre.spazzata.motivo, null);
  const base = attacca(s, nudo).va_finale;
  assert.deepEqual([attacca(s, nudo, { manovra: 'spazzata', bersagli: 2 }).va_finale, attacca(s, nudo, { manovra: 'spazzata', bersagli: 3 }).va_finale], [base - 4, base - 6]);
  assert.ok(attacca(s, nudo, { manovra: 'spazzata' }).promemoria.some((x) => /adiacenti fra loro/.test(x)));
});

test('E&L 9: Incalzare è una Prova per colpire a −4 contro le Difese, spinta 2 Q, nessun danno (A.24)', () => {
  const s = conSpada();
  const spada = s.equipaggiamento.armi[0];
  const r = attacca(s, spada, { manovra: 'incalzare' });
  assert.deepEqual([r.prova.tipo, r.danno, r.va_finale], ['per_colpire', null, (spada.vaEffettivo ?? spada.va) - 4]);
  assert.ok(r.effetti.some((x) => /2 Q/.test(x)));
});

test('E&L 10: mano non dominante −4, niente con Combattere con due armi (A.23)', () => {
  const s = conSpada();
  const spada = s.equipaggiamento.armi[0];
  assert.equal(attacca(s, spada, { manoNonDominante: true }).va_finale, attacca(s, spada).va_finale - 4);
});

test('E&L 11: Magistrale ×2 → ×3, ×3 resta ×3; la regola dei bonus nel risultato (A.29)', () => {
  assert.deepEqual([1, 2, 3].map((m) => moltiplicatoreMagistrale(m, dati)), [2, 3, 3]);
  const s = conSpada();
  const r = attacca(s, s.equipaggiamento.armi[0], { manovra: 'affondo' });
  assert.ok(r.promemoria.includes(dati.regole.attacco_ravvicinato.magistrale.promemoria));
  assert.equal(dati.regole.attacco_ravvicinato.magistrale['TODO(Davide)'], undefined);
});

test('E&L 13: Copertura nel ravvicinato: −2 / −4, Migliorata −4 / −6, Totale impedisce l’attacco (A.25)', () => {
  const s = conSpada();
  const spada = s.equipaggiamento.armi[0];
  const base = attacca(s, spada).va_finale;
  const con = (copertura, coperturaMigliorata = false) => attacca(s, spada, { bersaglio: { copertura, coperturaMigliorata } });
  assert.deepEqual([con('leggera').va_finale, con('media').va_finale, con('leggera', true).va_finale, con('media', true).va_finale], [base - 2, base - 4, base - 4, base - 6]);
  assert.match(con('totale').impossibile.motivo, /Copertura Totale/);
});

test('E&L 14: Superiorità numerica: 1–2 → 0, 3–5 → +1, 6–7 → +2, 8+ → +3 (A.26)', () => {
  const s = conSpada();
  const spada = s.equipaggiamento.armi[0];
  const base = attacca(s, spada).va_finale;
  assert.deepEqual([2, 3, 5, 6, 7, 8, 12].map((n) => attacca(s, spada, { attaccanti: n }).va_finale - base), [0, 1, 1, 2, 2, 3, 3]);
});

// --- 3–5. Prove fisiche e carico ----------------------------------------------------------------

const sessione = (modifica = {}) => ({ ...inizializzaSessione({ pv: 16, pm: 9, puntiEroe: 10, ferite: 6, caricatori: {} }), ...modifica });
const pers = (nome, peso, quantita = 1) => ({ uid: nome, rif: null, personalizzato: { nome, tipo: 'altro', peso }, stato: null, quantita, note: '' });
const alTavolo = (equip, s) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: equip }, livelli: [], sessione: s }, dati);

test('E&L 3: le penalità alle azioni fisiche (Immobilizzato) non toccano Potere né le Prove Salvezza (A.16)', () => {
  assert.equal(dati.regole.categorie_prove['TODO(Davide)'], undefined);
  const riposo = alTavolo([], sessione());
  const imm = alTavolo([], sessione({ statiAttivi: ['immobilizzato'] }));
  const fisiche = dati.regole.categorie_prove.fisiche;
  assert.ok(!fisiche.includes('Potere'));
  for (const nome of ['Atletica', 'Difese', 'Corpo a corpo']) assert.equal(vaDi(imm, nome).effettivo, vaDi(riposo, nome).effettivo - 4, nome);
  assert.equal(vaDi(imm, 'Potere').effettivo, vaDi(riposo, 'Potere').effettivo);
  for (const [k, v] of Object.entries(imm.salvezze)) assert.equal(v.effettivo, riposo.salvezze[k].effettivo, k);
});

test('E&L 4: un peso mancante è «da definire»: totale parziale, livello «almeno» (A.30)', () => {
  const s = alTavolo([pers('Tenda', 12.5), voce('k', 'armi:coltello', 'pronta')], sessione());
  assert.deepEqual([s.carico.parziale, s.carico.senzaPeso, s.carico.peso], [true, ['Coltello'], 12.5]);
  assert.equal(alTavolo([pers('Tenda', 12.5)], sessione()).carico.parziale, false);
});

test('E&L 5: oltre FOR × 20 kg Movimento 0 Q e −2 alle Prove fisiche, niente alle Salvezze; Forza da Lavoro ×40 e ×80 (A.31)', () => {
  const riposo = alTavolo([], sessione());
  const oltre = alTavolo([pers('Casse', 125)], sessione()); // FOR 6: massimo 120 kg
  assert.equal(oltre.carico.livello.id, 'oltre_il_massimo');
  assert.equal(oltre.carico.passo, 0);
  assert.deepEqual([oltre.tavolo.movimento.passo.effettivo, oltre.tavolo.movimento.corsa.effettivo, oltre.tavolo.movimento.scatto.effettivo], [0, null, null]);
  assert.equal(vaDi(oltre, 'Atletica').effettivo, vaDi(riposo, 'Atletica').effettivo - 2);
  for (const [k, v] of Object.entries(oltre.salvezze)) assert.equal(v.effettivo, riposo.salvezze[k].effettivo, k);
  const f = soglieCarico({ caratteristiche: { FOR: { valore: 5 } }, classi: [{ talenti: [{ nome: 'Forza da Lavoro' }] }] }, dati);
  assert.deepEqual([f.massimo, f.spinta], [200, 400]); // FOR × 40, FOR × 80
  assert.equal(dati.regole.carico['TODO(Davide)'], undefined);
});

// --- 15–16. Equipaggiamento iniziale ----------------------------------------------------------------

test('E&L 16: pistole corporative di base; Revolver commerciale senza nota; munizioni con la capacità del modello (A.33)', () => {
  const attesi = { Bauhaus: 'HG10', Capitol: 'Bolter 10', Cybertronic: 'P500', Fratellanza: 'Nemesis 100', Imperiali: 'Belliger', Mishima: 'Ronin 25AP' };
  for (const [corp, nome] of Object.entries(attesi)) {
    const m = modelloAssegnato('armi_distanza:pistola-semiautomatica', corp, dati);
    assert.equal(m.corporativo, true, corp);
    assert.equal(dati.equipaggiamento.file.armi_distanza_corporative.oggetti.find((o) => `armi_distanza_corporative:${o.id}` === m.rif).nome, nome, corp);
    assert.deepEqual(modelloAssegnato('armi_distanza:revolver', corp, dati), { rif: 'armi_distanza:revolver', corporativo: false, nota: null }, corp);
  }
  // Freelance: commerciale
  assert.equal(modelloAssegnato('armi_distanza:pistola-semiautomatica', 'Freelance', dati).rif, 'armi_distanza:pistola-semiautomatica');
  // Agente Mishima: Ronin 25 AP (capacità 10), 45 colpi ripartiti
  const voci = vociDotazione({ opzioni: { arma_da_fuoco: 'armi_distanza:pistola-semiautomatica', arma_da_mischia: 'armi:coltello' } }, 'Agente', 'Mishima', dati);
  assert.ok(voci.some((v) => v.rif === 'armi_distanza_corporative:ronin-25ap'));
  const mun = voci.find((v) => v.uid === 'dot-arma_da_fuoco-munizioni');
  assert.equal(mun.quantita, 45);
  assert.match(mun.note, /da 10/);
  assert.equal(dati.dotazioni.corporativi['TODO(Davide)'], undefined);
});

test('E&L 15: Binocolo e Registratore audiovisivo con peso e prezzo; gli altri «da definire», non cedibili (A.34)', () => {
  const reg = dati.dotazioni.oggetti_dotazione;
  assert.deepEqual([reg.binocolo.peso, reg.binocolo.costo, reg['registratore-audiovisivo'].peso, reg['registratore-audiovisivo'].costo], [0.8, 500, 0.2, 200]);
  assert.equal(dati.dotazioni['TODO(Davide)'], undefined);
  // un oggetto con peso entra nel carico; uno senza resta «da definire»
  const voci = vociDotazione({}, 'Agente', 'Mishima', dati);
  const bin = voci.find((v) => v.dotazione_id === 'binocolo');
  if (bin) assert.equal(bin.personalizzato.peso, 0.8);
  const senza = voci.find((v) => v.dotazione_id && !reg[v.dotazione_id].peso);
  assert.ok(senza && senza.personalizzato.peso === undefined);
});

// --- 19. Ricarica ------------------------------------------------------------------------------------

const preparaRicarica = (voci, livelli = []) => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: voci };
  const m = massimiSessione(calcolaScheda({ creazione, livelli }, dati), creazione, dati);
  return { m, s: inizializzaSessione(m) };
};

test('E&L 19: fucile a pompa, 1 cartuccia per operazione; 3 con Ricarica Migliorata; revolver a tamburo pieno (A.37)', () => {
  const equip = [voce('f', 'armi_distanza:fucile-a-pompa', 'impugnata'), { ...voce('c', 'munizioni:cartucce-a-pallini', null), quantita: 20 }];
  let { m, s } = preparaRicarica(equip);
  const cap = m.caricatori.f;
  assert.deepEqual([m.ricarica.f.modo, m.ricarica.f.singolo, m.ricarica.f.perOperazione], ['inserimento', true, 1]);
  s = variaMunizioni(s, 'f', 'colpi', -cap, m);
  s = ricaricaArma(s, 'f', m);
  assert.equal(s.munizioni.f.colpi, 1);
  // con Ricarica Migliorata: fino a 3 per operazione, senza superare la capacità
  const livelli = [{ livello: 2, caratteristiche: { DES: 2 } }, { livello: 3, talentoLibero: { id: 'ricarica-migliorata' } }];
  ({ m, s } = preparaRicarica(equip, livelli));
  assert.equal(m.ricarica.f.perOperazione, 3);
  s = variaMunizioni(s, 'f', 'colpi', -cap, m);
  s = ricaricaArma(s, 'f', m);
  assert.equal(s.munizioni.f.colpi, 3);
  s = variaMunizioni(s, 'f', 'colpi', cap, m); // pieno meno niente: capacità
  s = variaMunizioni(s, 'f', 'colpi', -1, m);
  s = ricaricaArma(s, 'f', m);
  assert.equal(s.munizioni.f.colpi, cap); // una sola munizione mancante
  // revolver: una operazione riempie il tamburo
  ({ m, s } = preparaRicarica([voce('r', 'armi_distanza:revolver', 'impugnata'), { ...voce('p', 'munizioni:proiettili-da-pistola', null), quantita: 12 }]));
  assert.equal(m.ricarica.r.modo, 'tamburo');
  s = variaMunizioni(s, 'r', 'colpi', -6, m);
  s = ricaricaArma(s, 'r', m);
  assert.equal(s.munizioni.r.colpi, 6);
  assert.equal(dati.equipaggiamento.file.munizioni.ricarica.inserimento_singolo['TODO(Davide)'], undefined);
});

// --- 1, 2, 17, 18. Magia ---------------------------------------------------------------------------

const incantesimo = (nome) => dati.incantesimi.incantesimi.find((i) => i.nome === nome);
const mago = ({ scala = 'taumaturgo', liberi = [], SAG = 7, livello = 1, max = 9 } = {}) => ({
  scheda: {
    livello, caratteristiche: { SAG: { valore: SAG } },
    abilita: [{ nome: 'Potere', effettivo: 10, scomposizione: [{ etichetta: 'Valore da regole', valore: 10, fonte: 'regole' }] }],
    incantesimi: { livelloMassimo: max, scalaPotere: scala }, magia: {}, equipaggiamento: { contenitori: [] },
    talentiLiberi: liberi.map((id) => ({ id })), classi: [{ talenti: [] }],
  },
  sessione: { pmAttuali: 40, chroma: {} },
});
const potereLivello = (r) => r.scomposizione.filter((x) => x.fonte === 'livello').reduce((s, x) => s + x.valore, 0);

test('E&L 1: Anticipazione senza Addestramento: colonna «altri» con −2 in più; la Migliorata toglie solo il −2, la Prova resta (A.39.1)', () => {
  const altri = (versione, liberi = []) => calcolaLancio(mago({ scala: 'altri_utilizzatori', liberi }), incantesimo('Colpo Elementale'), { versione, anticipazione: 0 }, dati);
  // 1–3 → −2, 4–6 → −4, 7–9 → −6
  assert.deepEqual([1, 5, 8].map((v) => potereLivello(altri(v))), [-2, -4, -6]);
  const mig = altri(5, ['anticipazione-migliorata']);
  assert.equal(potereLivello(mig), -2); // resta la colonna ordinaria
  assert.equal(mig.prova_richiesta, true);
  assert.equal(dati.regole.lancio.anticipazione['TODO(Davide)'], undefined);
});

test('E&L 17: Colpo Elementale colpisce automaticamente; PS solo per gli effetti secondari, per elemento (A.39.2)', () => {
  const r = calcolaLancio(mago(), incantesimo('Colpo Elementale'), { versione: 1 }, dati);
  assert.ok(r.promemoria[0].startsWith('Colpisce automaticamente'));
  assert.match(r.salvezza_bersaglio.testo, /Fuoco e Aria Riflessi, Gelo e Fulmine Tempra, Acqua e Terra nessuna/);
  assert.deepEqual(incantesimo('Colpo Elementale').meccanica.salvezza.per_elemento, { Fuoco: 'Riflessi', Aria: 'Riflessi', Gelo: 'Tempra', Fulmine: 'Tempra', Acqua: null, Terra: null });
  // Magia sez. 7: il danno della versione con il bonus di SAG (SAG 7, 1° livello: +1)
  assert.deepEqual(r.danno.voci.map((x) => [x.colonna, x.testo]), [['Danno per colpo', '1d6+1']]);
});

test('E&L 18: Rigenerazione solo Rituale: «procedura rituale non ancora definita», nessun calcolo (A.39.3)', () => {
  const r = calcolaLancio(mago({ max: 18 }), incantesimo('Rigenerazione'), {}, dati);
  assert.equal(r.rituale_non_definito, true);
  assert.match(r.impossibile.motivo, /Procedura rituale non ancora definita/);
});

test('E&L 2: contenitore acquistato pieno; trovato con i PM impostati nella voce (A.19)', () => {
  const batteria = (extra = {}) => ({ uid: 'b', rif: 'artefatti:batteria-da-5-pm-chroma-rosso', stato: 'trasportato', quantita: 1, note: '', ...extra });
  const m = (v) => { const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [v] }; return massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati); };
  const acquistato = m(batteria());
  assert.equal(inizializzaSessione(acquistato).chroma.b.pmAttuali, acquistato.contenitori.b);
  const trovato = m(batteria({ pm_iniziali: 2 }));
  assert.equal(inizializzaSessione(trovato).chroma.b.pmAttuali, 2);
  // aggiunto «pieno» e poi segnato come trovato: la sessione segue il valore della voce
  const s = inizializzaSessione(acquistato);
  assert.equal(allineaSessione(s, trovato).chroma.b.pmAttuali, 2);
  // spendere PM non fa ripartire il valore
  const speso = modificaSessione(allineaSessione(s, trovato), { chroma: { b: { pmAttuali: 1, iniziale: 2 } } }, trovato);
  assert.equal(allineaSessione(speso, trovato).chroma.b.pmAttuali, 1);
  assert.equal(dati.regole.chroma['TODO(Davide)'], undefined);
});

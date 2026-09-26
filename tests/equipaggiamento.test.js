import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import { normalizza, serializza, deserializzaPersonaggio } from '../src/character.js';
import {
  normalizzaEquipaggiamento, calcolaEquipaggiamento, catalogo, aggiungiDanno, opzioniCascata, cercaNelCatalogo, statoIniziale,
} from '../src/equipaggiamento.js';
import { preparaStampa } from '../src/stampa.js';
import { testoTooltip } from '../src/descrizioni.js';
import { massimiSessione, inizializzaSessione, allineaSessione, variaMunizioni, ricaricaArma } from '../src/sessione.js';
import { validaDati, trovaTodo } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE, ARCANISTA } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const scheda = (creazione, equipaggiamento, livelli = []) => calcolaScheda({ creazione: { ...creazione, equipaggiamento }, livelli }, dati);

test('catalogo: caricato dall’indice, un lotto = un file e una riga; riferimenti "file:id"', () => {
  assert.deepEqual(dati.equipaggiamento.indice.file.map((f) => f.id), ['armi', 'armi_corporative', 'armi_distanza', 'armi_distanza_corporative', 'accessori_armi', 'munizioni', 'sanitario', 'artefatti', 'unita_robotiche', 'armature', 'armature_corporative', 'rinforzi', 'scudi', 'corredi_dispositivi']);
  const cat = catalogo(dati);
  assert.equal(cat.oggetti.filter((o) => o.tipo === 'arma_ravvicinata' && o.catalogo === 'Commerciale').length, 28); // §7.1.1: 28 profili
  assert.equal(cat.oggetti.filter((o) => o.tipo === 'armatura' && o.catalogo === 'Commerciale').length, 3); // §7.11.3
  const lancia = cat.perRif.get('armi:lancia');
  assert.deepEqual(lancia.danno, { una_mano: '1d6+1', due_mani: '1d6+3' });
  assert.equal(lancia.mani, '1/2');
  assert.equal(lancia.portata_q, 2); // §7.1.2
  assert.equal(cat.perRif.get('armi:tirapugni-concussivo').costo, 1200);
  assert.equal(cat.perRif.get('armature:armatura-civile-pesante').costo, 7000);
  assert.deepEqual(cat.perRif.get('armi:tonfa').proprieta[0].effetto, { parata_va: 2 });
});

test('cascata e ricerca: solo ciò che esiste; i nomi alternativi portano al profilo', () => {
  const o = opzioniCascata(dati, { tipo: 'arma_ravvicinata', catalogo: 'Commerciale', famiglia: 'Spade' });
  assert.deepEqual(o.tipi, ['arma_ravvicinata', 'arma_distanza', 'scudo', 'armatura', 'accessorio', 'munizioni', 'sanitario', 'artefatto', 'altro']);
  assert.deepEqual(o.cataloghi, ['Commerciale', 'Bauhaus', 'Capitol', 'Cybertronic', 'Fratellanza', 'Imperial', 'Mishima', 'Alleanza']);
  assert.ok(o.famiglie.includes('Armi da pugno'));
  assert.deepEqual(o.profili.map((p) => p.nome), ['Spada leggera', 'Stocco', 'Spada lunga', 'Spada bastarda', 'Spadone']);
  assert.deepEqual(cercaNelCatalogo(dati, 'alabarda').map((x) => x.rif), ['armi:arma-inastata-pesante']);
  assert.deepEqual(cercaNelCatalogo(dati, 'sciabola').map((x) => x.rif), ['armi:spada-leggera', 'armi_corporative:sciabola-da-duello']);
  assert.deepEqual(cercaNelCatalogo(dati, 'x'), []); // almeno due caratteri
});

test('migrazione: il vecchio campo di testo diventa un oggetto personalizzato «altro» con il testo nelle note', () => {
  const { scelte, avvisi } = normalizza({ ...MISHIMA_AGENTE, equipaggiamento: 'Pistola\nCorda da 10 m' }, dati);
  assert.deepEqual(avvisi, []);
  assert.equal(scelte.equipaggiamento.length, 1);
  const [v] = scelte.equipaggiamento;
  assert.equal(v.rif, null);
  assert.equal(v.personalizzato.tipo, 'altro');
  assert.equal(v.note, 'Pistola\nCorda da 10 m');
  assert.equal(v.stato, null);
  assert.deepEqual(normalizza({ ...MISHIMA_AGENTE, equipaggiamento: '   ' }, dati).scelte.equipaggiamento, []);
  // nella stampa le righe del vecchio testo tornano voci separate dell'elenco
  const st = preparaStampa(scelte, dati);
  assert.deepEqual(st.fogli.find((f) => f.id === 'combattimento').dati.equipaggiamento, ['Pistola', 'Corda da 10 m']);
  // e il file esportato contiene l'elenco
  const letto = deserializzaPersonaggio(serializza(scelte));
  assert.deepEqual(normalizza(letto.creazione, dati).scelte.equipaggiamento, scelte.equipaggiamento);
});

test('VA per colpire = VA dell’Abilità dell’arma; FOR insufficiente toglie la differenza (§7.1.6)', () => {
  // Agente: FOR 6; Spada lunga FOR 4 → nessuna penalità
  const s = scheda(MISHIMA_AGENTE, [voce('a', 'armi:spada-lunga', 'impugnata')]);
  const guerra = s.abilita.find((a) => a.nome === 'Armi da guerra').totale;
  const [arma] = s.equipaggiamento.armi;
  assert.equal(arma.va, guerra);
  assert.deepEqual(arma.danno, { una_mano: '1d8+1', due_mani: null });
  assert.equal(arma.portataQ, 1);
  // Arcanista: FOR 5; Spadone FOR 6 → −1; Ascia bipenne FOR 7 → −2
  const a = scheda(ARCANISTA, [voce('a', 'armi:spadone', 'impugnata'), voce('b', 'armi:ascia-bipenne', 'impugnata')]);
  const guerraA = a.abilita.find((x) => x.nome === 'Armi da guerra').totale;
  assert.equal(a.caratteristiche.FOR.valore, 5);
  assert.equal(a.equipaggiamento.armi[0].va, guerraA - 1);
  assert.equal(a.equipaggiamento.armi[1].va, guerraA - 2);
  assert.ok(a.equipaggiamento.armi[1].componenti.some((c) => c.valore === -2 && /§7\.1\.6/.test(c.nome)));
  // Parata con l'arma: Difese − penalità FOR; il Tonfa aggiunge Difensiva +2
  const difese = a.abilita.find((x) => x.nome === 'Difese').vaEquip;
  assert.equal(a.equipaggiamento.armi[0].parata.va, difese - 1);
  const t = scheda(ARCANISTA, [voce('t', 'armi:tonfa', 'impugnata')]);
  assert.equal(t.equipaggiamento.armi[0].parata.va, difese + 2); // Tonfa FOR 3 ≤ 5
});

test('Specializzazione nella famiglia dell’arma (§8.8.1): +1 VA e +1 al danno', () => {
  const livelli = [
    { livello: 2, caratteristiche: { DES: 2 } },
    { livello: 3, talentoLibero: { id: 'specializzazione-spade' } },
  ];
  assert.deepEqual(validaLivello({ creazione: MISHIMA_AGENTE, livelli: livelli.slice(0, 1) }, livelli[1], dati), []);
  const con = scheda(MISHIMA_AGENTE, [voce('a', 'armi:spada-bastarda', 'impugnata')], livelli);
  const senza = scheda(MISHIMA_AGENTE, [voce('a', 'armi:spada-bastarda', 'impugnata')], livelli.slice(0, 1));
  assert.equal(con.equipaggiamento.armi[0].va, senza.equipaggiamento.armi[0].va + 1);
  assert.deepEqual(con.equipaggiamento.armi[0].danno, { una_mano: '1d8+2', due_mani: '2d6+1' });
  assert.deepEqual(senza.equipaggiamento.armi[0].danno, { una_mano: '1d8+1', due_mani: '2d6' });
  // la Specializzazione in Spade non vale per un Martello
  const martello = scheda(MISHIMA_AGENTE, [voce('m', 'armi:martello', 'impugnata')], livelli);
  assert.equal(martello.equipaggiamento.armi[0].bonusDanno, 0);
});

test('armatura indossata: AR e penalità di categoria sulle Abilità interessate (componente Equip) e sugli attacchi', () => {
  const s = scheda(MISHIMA_AGENTE, [voce('b', 'armature:armatura-civile-media', 'indossata'), voce('a', 'armi:spada-lunga', 'impugnata')]);
  const [p] = s.equipaggiamento.protezioni;
  assert.deepEqual(p.ar, { totale: 3, magica: 0 });
  assert.equal(p.penalita.agilita, -1); // §7.11.1, Media
  const atl = s.abilita.find((a) => a.nome === 'Atletica');
  const furt = s.abilita.find((a) => a.nome === 'Furtività');
  assert.equal(atl.equip, -1);
  assert.equal(atl.vaEquip, atl.totale - 1);
  assert.equal(furt.vaEquip, 9 - 1); // Furtività VA 9 dell'esempio del manuale, −1 di Agilità
  assert.equal(s.abilita.find((a) => a.nome === 'Difese').equip, 0); // Agilità non riguarda la Parata
  assert.equal(s.equipaggiamento.armi[0].va, s.abilita.find((a) => a.nome === 'Armi da guerra').totale - 1);
  assert.equal(s.equipaggiamento.movimentoQ, -1);
  assert.equal(s.equipaggiamento.lancioPotere, -3);
  // FOR insufficiente per l'armatura: −1 per punto ad attacchi, Difese e Prove fisiche ostacolate
  const a = scheda(ARCANISTA, [voce('b', 'armature:armatura-civile-pesante', 'indossata')]); // FOR 7, Arcanista FOR 5
  assert.equal(a.equipaggiamento.protezioni[0].forMancante, 2);
  assert.equal(a.abilita.find((x) => x.nome === 'Difese').equip, -2);
  assert.equal(a.abilita.find((x) => x.nome === 'Atletica').equip, -2 - 2);
  // la creazione non cambia: `totale` resta quello delle regole (Furtività 9 del manuale)
  assert.equal(furt.totale, 9);
});

test('solo gli oggetti attivi contano', () => {
  const zaino = scheda(MISHIMA_AGENTE, [
    voce('a', 'armi:spada-lunga', 'pronta'),
    voce('b', 'armature:armatura-civile-pesante', 'zaino'),
  ]);
  assert.deepEqual(zaino.equipaggiamento.armi, []);
  assert.deepEqual(zaino.equipaggiamento.protezioni, []);
  assert.ok(zaino.abilita.every((a) => a.equip === 0 && a.vaEquip === a.totale));
  assert.equal(zaino.equipaggiamento.zaino.length, 2);
  // stampa: righe della tabella Armi vuote, gli oggetti nell'elenco compatto
  const st = preparaStampa({ ...MISHIMA_AGENTE, equipaggiamento: [voce('a', 'armi:spada-lunga', 'pronta')] }, dati);
  const f3 = st.fogli.find((f) => f.id === 'combattimento').dati;
  assert.deepEqual(f3.armi.righe, []);
  assert.deepEqual(f3.equipaggiamento, ['Spada lunga (addosso)']);
  // attiva: una riga compilata e le righe vuote per la penna
  const st2 = preparaStampa({ ...MISHIMA_AGENTE, equipaggiamento: [voce('a', 'armi:spada-lunga', 'impugnata')] }, dati);
  const f3b = st2.fogli.find((f) => f.id === 'combattimento').dati;
  assert.equal(f3b.armi.righe.length, 1);
  assert.equal(f3b.armi.righe[0][0], 'Spada lunga');
  assert.ok(f3b.armi.righeVuote >= 2);
});

test('oggetto non più in catalogo: resta in lista, senza effetti, e non rompe il personaggio', () => {
  const eq = [voce('x', 'armi:spada-di-prova-rimossa', 'impugnata', { note: 'regalo' })];
  const { scelte, avvisi } = normalizza({ ...MISHIMA_AGENTE, equipaggiamento: eq }, dati);
  assert.deepEqual(avvisi, []);
  assert.deepEqual(scelte.equipaggiamento, eq); // resta com'è
  const s = calcolaScheda({ creazione: scelte, livelli: [] }, dati);
  assert.equal(s.completa, true);
  assert.deepEqual(s.equipaggiamento.armi, []);
  assert.equal(s.equipaggiamento.oggetti[0].fuoriCatalogo, true);
  assert.ok(s.equipaggiamento.avvisi.some((a) => /non è più nel catalogo/.test(a)));
  // nella stampa compare nell'elenco con la nota
  const f3 = preparaStampa(scelte, dati).fogli.find((f) => f.id === 'combattimento').dati;
  assert.deepEqual(f3.equipaggiamento, ['armi:spada-di-prova-rimossa (non più in catalogo) — regalo']);
});

test('avvisi di coerenza (non blocchi): due armature, arma a due mani e scudo, accessorio su arma non impugnata', () => {
  const s = scheda(MISHIMA_AGENTE, [
    voce('b1', 'armature:armatura-civile-leggera', 'indossata'),
    voce('b2', 'armature:armatura-civile-media', 'indossata'),
    voce('w', 'armi:spadone', 'impugnata'),
    voce('s', null, 'imbracciato', { personalizzato: { nome: 'Scudo tondo', tipo: 'scudo', ar: 1 } }),
    voce('m', null, 'in_uso', { personalizzato: { nome: 'Lama di ricambio', tipo: 'accessorio' }, montato_su: 'k' }),
    voce('k', 'armi:coltello', 'pronta'),
  ]);
  const a = s.equipaggiamento.avvisi.join('\n');
  assert.match(a, /Due o più armature indossate/);
  assert.match(a, /Spadone è un’arma a due mani, ma c’è uno scudo imbracciato/);
  assert.match(a, /Lama di ricambio è montato su Coltello, che non è impugnata/);
  assert.match(a, /Mani impegnate: 3/);
  // sono avvisi: la scheda resta calcolata
  assert.equal(s.equipaggiamento.armi.length, 1);
  assert.equal(s.equipaggiamento.protezioni.length, 3);
  // senza incoerenze nessun avviso
  assert.deepEqual(scheda(MISHIMA_AGENTE, [voce('w', 'armi:spada-lunga', 'impugnata')]).equipaggiamento.avvisi, []);
});

test('oggetti personalizzati: stato per tipo, arma con Abilità → VA, stati non ammessi rimessi nello zaino', () => {
  const s = scheda(MISHIMA_AGENTE, [voce('p', null, 'impugnata', { personalizzato: { nome: 'Coltello da cucina', tipo: 'arma_ravvicinata', abilita: 'Armi da mischia', danno: '1d4' } })]);
  assert.equal(s.equipaggiamento.armi[0].va, s.abilita.find((a) => a.nome === 'Armi da mischia').totale);
  const { scelte, avvisi } = normalizza({ ...MISHIMA_AGENTE, equipaggiamento: [voce('a', 'armature:armatura-civile-media', 'impugnata'), voce('b', null, 'indossata', { personalizzato: { nome: 'Corda', tipo: 'altro' } })] }, dati);
  assert.equal(scelte.equipaggiamento[0].stato, 'zaino');
  assert.equal(scelte.equipaggiamento[1].stato, null);
  assert.equal(avvisi.length, 2);
  assert.equal(statoIniziale('armatura', [], dati), 'indossata');
  assert.equal(statoIniziale('armatura', scelte.equipaggiamento.map((v) => ({ ...v, stato: 'indossata' })), dati), 'zaino');
  assert.equal(statoIniziale('munizioni'), null);
  assert.deepEqual(normalizzaEquipaggiamento([{ uid: 'a' }, { uid: 'a' }, 'rotto']).map((v) => v.uid), ['a', 'e2']);
});

test('aggiungiDanno e tooltip degli oggetti', () => {
  assert.equal(aggiungiDanno('1d6+1', 1), '1d6+2');
  assert.equal(aggiungiDanno('1d6', 1), '1d6+1');
  assert.equal(aggiungiDanno('1d6-1', 1), '1d6');
  assert.equal(aggiungiDanno('2', 1), '3');
  assert.equal(aggiungiDanno(null, 1), null);
  const t = testoTooltip('oggetto', 'armi:tonfa', dati);
  assert.match(t, /Tonfa/);
  assert.match(t, /Difensiva \+2/);
  assert.match(t, /Costo: 90/);
  assert.equal(testoTooltip('oggetto', 'armi:inesistente', dati), '');
});

test('validatore del catalogo: Abilità, FOR 1–10, id ripetuti, tipo, numeri', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.file} ${x.chiave}: ${x.problema}`).join('\n'); };
  const armi = (d) => d.equipaggiamento.file.armi.oggetti;
  assert.match(e((d) => { armi(d)[0].abilita = 'Scherma'; }), /armi\.json oggetti\[0\] \(coltello\)\.abilita: Abilità "Scherma" inesistente/);
  assert.match(e((d) => { armi(d)[0].for_richiesta = 11; }), /for_richiesta: deve essere un intero da 1 a 10/);
  assert.match(e((d) => { armi(d)[1].id = 'coltello'; }), /id "coltello" ripetuto/);
  assert.match(e((d) => { armi(d)[0].tipo = 'bazooka'; }), /tipo "bazooka" non ammesso/);
  assert.match(e((d) => { armi(d)[0].costo = '80'; }), /costo: deve essere un numero/);
  assert.match(e((d) => { armi(d)[0].danno.una_mano = 'tanto'; }), /non è una formula di dadi/);
  assert.match(e((d) => { armi(d)[0].specializzazione = 'specializzazione-boh'; }), /Specializzazione "specializzazione-boh" inesistente/);
  assert.match(e((d) => { d.equipaggiamento.file.armature.oggetti[0].categoria = 'Leggerissima'; }), /categoria "Leggerissima" senza penalità/);
  assert.match(e((d) => { d.equipaggiamento.indice.file.push({ id: 'armi', file: 'armi.json' }); }), /id "armi" ripetuto/);
  assert.equal(e(() => {}), '');
});

// --- Lotto 2: armi a distanza commerciali (§7.7) -----------------------------------------

test('lotto 2: 22 armi a distanza commerciali in 8 gruppi, con i valori del §7.7', () => {
  const armi = catalogo(dati).oggetti.filter((o) => o.file === 'armi_distanza');
  assert.equal(armi.length, 22);
  assert.deepEqual([...new Set(armi.map((o) => o.famiglia))], ['Pistole', 'Fucili', 'Armi pesanti', 'Lanciatori', 'Armi da lancio', 'Archi e balestre', 'Armi speciali', 'Granate']);
  const fa = catalogo(dati).perRif.get('armi_distanza:fucile-d-assalto');
  assert.equal(fa.abilita, 'Armi medie');
  assert.equal(fa.gittata_q, 160);
  assert.deepEqual(fa.munizioni, { capacita: 30, ricarica: null, consumo: null, riferimento: null });
  assert.deepEqual(fa.modalita, ['S', 'RB', 'RM', 'RL', 'TR', 'FS']);
  assert.equal(fa.costo, 4000);
  const lg = catalogo(dati).perRif.get('armi_distanza:lanciagranate');
  assert.equal(lg.danno, null);
  assert.equal(lg.danno_da_munizione, true);
  assert.equal(lg.ac, 'munizione');
  assert.equal(lg.munizioni.riferimento, 'Granata standard a frammentazione');
  const arco = catalogo(dati).perRif.get('armi_distanza:arco-da-guerra');
  assert.equal(arco.munizioni.capacita, null); // CC «—»
  assert.equal(arco.inc, null);
  assert.equal(catalogo(dati).perRif.get('armi_distanza:pugnale').stesso_oggetto, 'armi:pugnale');
  assert.equal(catalogo(dati).perRif.get('armi_distanza:mitragliatore-pesante').mov, -2);
});

test('arma a distanza impugnata: VA per colpire, gittata (anche FOR × 3), MOV, stampa con la capacità', () => {
  const s = scheda(MISHIMA_AGENTE, [
    voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata'),
    voce('g', 'armi_distanza:granata-a-frammentazione', 'impugnata'),
  ]);
  const [pistola, granata] = s.equipaggiamento.armi;
  assert.equal(pistola.va, s.abilita.find((a) => a.nome === 'Armi leggere').totale); // FOR 3 ≤ 6, VA della scheda 0
  assert.equal(pistola.gittataQ, 30);
  assert.equal(pistola.munizioni.capacita, 15);
  assert.equal(pistola.inc, 6);
  assert.equal(pistola.parata, null); // la Parata si calcola solo per le armi ravvicinate
  assert.equal(granata.gittataQ, 6 * 3); // FOR 6 × 3
  assert.equal(granata.gittataFormula, 'FOR 6 × 3');
  assert.equal(granata.ac, '1d3');
  // FOR insufficiente e MOV dell'arma impugnata
  const m = scheda(MISHIMA_AGENTE, [voce('m', 'armi_distanza:mitragliatore-pesante', 'impugnata')]);
  assert.equal(m.equipaggiamento.armi[0].va, m.abilita.find((a) => a.nome === 'Armi pesanti').totale - 1); // FOR 7, Agente 6
  assert.equal(m.equipaggiamento.movimentoQ, -2);
  // stampa: gittata e capacità nella riga dell'arma
  const f3 = preparaStampa({ ...MISHIMA_AGENTE, equipaggiamento: [voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata')] }, dati)
    .fogli.find((f) => f.id === 'combattimento').dati;
  assert.deepEqual(f3.armi.righe[0].slice(0, 6), ['Pistola semiautomatica', 'Armi leggere', String(pistola.va), '1d6', '30 Q', 'CC 15']);
  assert.match(f3.armi.righe[0][6], /INC 6; S TR/);
});

test('Specializzazione Pistole sulla pistola; il danno «dalla munizione» resta senza bonus', () => {
  const livelli = [{ livello: 2, caratteristiche: { DES: 2 } }, { livello: 3, talentoLibero: { id: 'specializzazione-pistole' } }];
  const s = scheda(MISHIMA_AGENTE, [voce('p', 'armi_distanza:revolver', 'impugnata'), voce('l', 'armi_distanza:lanciagranate', 'impugnata')], livelli);
  const base = s.abilita.find((a) => a.nome === 'Armi leggere').totale;
  assert.equal(s.equipaggiamento.armi[0].va, base + 1);
  assert.deepEqual(s.equipaggiamento.armi[0].danno, { una_mano: '1d6+2', due_mani: null });
  assert.equal(s.equipaggiamento.armi[1].dannoDaMunizione, true);
  assert.equal(s.equipaggiamento.armi[1].danno, null);
});

test('munizioni in sessione: il contatore parte dalla capacità, «Ricarica» lo riporta al massimo, riserve libere', () => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce('p', 'armi_distanza:pistola-semiautomatica', 'impugnata'), voce('a', 'armi_distanza:arco-da-guerra', 'zaino')] };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  assert.deepEqual(m.caricatori, { p: 15, a: null });
  let s = inizializzaSessione(m);
  assert.deepEqual(s.munizioni, { p: { colpi: 15, riserve: 0 }, a: { colpi: 0, riserve: 0 } });
  s = variaMunizioni(s, 'p', 'colpi', -4, m);
  assert.equal(s.munizioni.p.colpi, 11);
  s = variaMunizioni(s, 'p', 'colpi', +10, m);
  assert.equal(s.munizioni.p.colpi, 15); // mai oltre la capacità
  s = variaMunizioni(s, 'p', 'riserve', +3, m);
  s = variaMunizioni(s, 'p', 'colpi', -15, m);
  s = ricaricaArma(s, 'p', m);
  assert.deepEqual(s.munizioni.p, { colpi: 15, riserve: 3 }); // la ricarica non scala le riserve
  s = variaMunizioni(s, 'a', 'colpi', +20, m); // arco: nessun caricatore, contatore libero
  assert.equal(s.munizioni.a.colpi, 20);
  assert.equal(ricaricaArma(s, 'a', m).munizioni.a.colpi, 20);
  // un'arma tolta dalla lista sparisce dalle munizioni; una aggiunta parte piena
  const m2 = { ...m, caricatori: { g: 1 } };
  assert.deepEqual(allineaSessione(s, m2).munizioni, { g: { colpi: 1, riserve: 0 } });
});

test('validatore delle armi a distanza: modalità, capacità, AC, danno dalla munizione, stesso oggetto', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const dist = (d) => d.equipaggiamento.file.armi_distanza.oggetti;
  assert.match(e((d) => { dist(d)[0].modalita = ['S', 'ZZ']; }), /modalità "ZZ" non nella legenda/);
  assert.match(e((d) => { dist(d)[0].munizioni.capacita = 0; }), /capacita: intero ≥ 1 oppure null/);
  assert.match(e((d) => { dist(d)[0].ac = 'tanti'; }), /applicazioni di danno/);
  assert.match(e((d) => { dist(d).find((o) => o.id === 'lanciagranate').danno = { una_mano: null, due_mani: '1d6' }; }), /il danno deve essere null/);
  assert.match(e((d) => { dist(d).find((o) => o.id === 'pugnale').stesso_oggetto = 'armi:pugnalone'; }), /"armi:pugnalone" non è un oggetto del catalogo/);
  assert.match(e((d) => { dist(d)[0].gittata_q = null; }), /senza gittata/);
  assert.match(e((d) => { dist(d)[0].mov = 1; }), /penalità MOV: intero ≤ 0/);
});

// --- Lotto 3: scudi (§7.4) ---------------------------------------------------------------

test('lotto 3: 26 scudi del §7.4.2 con i modificatori alle Parate del §7.4.11', () => {
  const scudi = catalogo(dati).oggetti.filter((o) => o.tipo === 'scudo');
  assert.equal(scudi.length, 26); // §7.4.2: «Il catalogo comprende 26 scudi»
  assert.deepEqual([...new Set(scudi.map((o) => o.catalogo))], ['Commerciale', 'Bauhaus', 'Alleanza', 'Capitol', 'Cybertronic', 'Imperial', 'Mishima', 'Fratellanza']);
  const pun = catalogo(dati).perRif.get('scudi:scudo-punisher');
  assert.deepEqual(pun.ar, { totale: 2, magica: 0 });
  assert.deepEqual(pun.parata, { ravvicinata: 1, distanza: -3 });
  assert.equal(pun.attacco.danno, '1d6+1');
  assert.equal(pun.costo, 6000);
  const enorme = catalogo(dati).perRif.get('scudi:scudo-enorme');
  assert.equal(enorme.mov, -1);
  assert.equal(enorme.for_richiesta, 7);
  const sic = catalogo(dati).perRif.get('scudi:scudo-della-sicurezza');
  assert.deepEqual(sic.parata, { ravvicinata: 0, distanza: -4 }); // senza SIN
  assert.deepEqual(sic.profili_alternativi[0].parata, { ravvicinata: 1, distanza: -3 }); // con SIN 1
  const gs = catalogo(dati).perRif.get('scudi:scudo-delle-guardie-sacre');
  assert.deepEqual(gs.profili_alternativi[0].ar, { totale: 4, magica: 2 });
  assert.equal(gs.costo, 18000);
  // ogni scudo corporativo ha la sua scheda in prosa nelle note
  assert.ok(scudi.filter((o) => o.catalogo !== 'Commerciale').every((o) => o.note_manuale.startsWith('Scudo') || o.note_manuale.startsWith('Modello')));
});

test('scudo imbracciato: AR, Parata già calcolata con Difese e modificatori, attacco del Punisher, MOV', () => {
  const s = scheda(MISHIMA_AGENTE, [
    voce('s', 'scudi:scudo-punisher', 'imbracciato'),
    voce('w', 'armi:spada-leggera', 'impugnata'),
  ]);
  const difese = s.abilita.find((a) => a.nome === 'Difese').vaEquip;
  const [p] = s.equipaggiamento.protezioni;
  assert.deepEqual(p.ar, { totale: 2, magica: 0 });
  assert.equal(p.parata.ravvicinata, difese + 1);
  assert.equal(p.parata.distanza, difese - 3);
  // la Parata con la spada: a distanza −8 VA (Giocatore §5.9)
  const spada = s.equipaggiamento.armi.find((a) => a.nome === 'Spada leggera');
  assert.equal(spada.parata.distanza, spada.parata.va - 8);
  // l'attacco con lo Scudo Punisher (§7.4.1) compare fra le armi
  const att = s.equipaggiamento.armi.find((a) => a.nome.startsWith('Scudo Punisher (attacco'));
  assert.equal(att.va, s.abilita.find((a) => a.nome === 'Armi da guerra').totale);
  assert.deepEqual(att.danno, { una_mano: '1d6+1', due_mani: null });
  assert.equal(att.portataQ, 1);
  assert.deepEqual(s.equipaggiamento.avvisi, []);
  // Scudo enorme con FOR insufficiente: penalità solo a Parate e attacchi con lo Scudo (§7.1.6), MOV −1 Q
  const a = scheda(ARCANISTA, [voce('e', 'scudi:scudo-enorme', 'imbracciato')]); // FOR 7, Arcanista 5
  const pe = a.equipaggiamento.protezioni[0];
  const difA = a.abilita.find((x) => x.nome === 'Difese');
  assert.equal(pe.forMancante, 2);
  assert.equal(pe.parata.ravvicinata, difA.vaEquip - 2);
  assert.equal(difA.equip, 0); // non è un'armatura: Difese e Agilità non cambiano
  assert.ok(a.abilita.every((x) => x.equip === 0));
  assert.equal(a.equipaggiamento.movimentoQ, -1);
  // SIN: il profilo alternativo è già calcolato
  const c = scheda(MISHIMA_AGENTE, [voce('c', 'scudi:scudo-d-assalto-chasseur', 'imbracciato')]);
  const alt = c.equipaggiamento.protezioni[0].alternative[0];
  assert.match(alt.condizione, /SIN collegato/);
  assert.equal(alt.parata.ravvicinata, difese + 2);
  assert.equal(alt.parata.distanza, difese - 2);
});

test('scudi: due imbracciati non si sommano (avviso); stampa della riga Protezioni', () => {
  const s = scheda(MISHIMA_AGENTE, [voce('a', 'scudi:scudo-piccolo', 'imbracciato'), voce('b', 'scudi:scudo-medio', 'imbracciato')]);
  assert.ok(s.equipaggiamento.avvisi.some((x) => /non sommano la protezione/.test(x)));
  const f3 = preparaStampa({ ...MISHIMA_AGENTE, equipaggiamento: [voce('p', 'scudi:scudo-pesante-reaver', 'imbracciato')] }, dati)
    .fogli.find((f) => f.id === 'combattimento').dati;
  const [riga] = f3.protezioni.righe;
  assert.deepEqual(riga.slice(0, 3), ['Scudo pesante Reaver', '3', 'Enorme']);
  // Agente: Difese 5, FOR 6 su 7 richiesta → −1 alle Parate con lo Scudo (§7.1.6)
  assert.equal(riga[3], 'Parata 4 ravv. / 0 dist.; con SIN collegato (Innesto di Interfaccia Neurale attivo): Parata 5/1; MOV −1 Q; FOR 7 (−1)');
});

test('validatore degli scudi: Parata, profili alternativi, attacco', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const sc = (d) => d.equipaggiamento.file.scudi.oggetti;
  assert.match(e((d) => { sc(d)[0].parata = { ravvicinata: 0 }; }), /parata: serve \{ ravvicinata, distanza \}/);
  assert.match(e((d) => { sc(d).find((o) => o.id === 'scudo-della-sicurezza').profili_alternativi[0].condizione = ''; }), /condizione: testo mancante/);
  assert.match(e((d) => { sc(d).find((o) => o.id === 'scudo-punisher').attacco.abilita = 'Scudi'; }), /attacco\.abilita: Abilità "Scudi" inesistente/);
  assert.match(e((d) => { sc(d)[2].mov = 2; }), /penalità MOV/);
  assert.match(e((d) => { delete d.regole.difese; }), /difese\.parata_distanza_arma/);
});

// --- Lotto 4: armi ravvicinate corporative (§7.1.9) --------------------------------------

test('lotto 4: 39 armi ravvicinate corporative in 7 cataloghi; lo Scudo delle Guardie Sacre resta negli scudi', () => {
  const armi = catalogo(dati).oggetti.filter((o) => o.file === 'armi_corporative');
  assert.equal(armi.length, 39); // §7.1.9: «39 armi ravvicinate e uno Scudo corporativo»
  assert.deepEqual([...new Set(armi.map((o) => o.catalogo))], ['Bauhaus', 'Capitol', 'Cybertronic', 'Fratellanza', 'Imperial', 'Mishima', 'Alleanza']);
  assert.ok(!armi.some((o) => o.nome === 'Scudo delle Guardie Sacre'));
  const r = (id) => catalogo(dati).perRif.get(`armi_corporative:${id}`);
  assert.deepEqual(r('spada-violator').danno, { una_mano: '1d8+1', due_mani: '2d6' });
  assert.equal(r('spada-violator').specializzazione, 'specializzazione-spade');
  assert.equal(r('manganello-elettrificato').famiglia, 'Mazze e bastoni'); // «Manganello» è nome alternativo del Randello
  assert.equal(r('katana').famiglia, 'Da classificare'); // famiglia non dichiarata: TODO(Davide)
  assert.equal(r('katana').specializzazione, null);
  assert.deepEqual(r('kriss').proprieta[0].effetto, { va: 1 }); // Precisa 1
  assert.deepEqual(r('tonfa-stella-cadente').proprieta[0].effetto, { parata_va: 2 });
  assert.deepEqual(r('spada-punisher').munizioni.capacita, 5);
  assert.equal(r('spada-punisher').munizioni.unita, 'cariche');
  assert.deepEqual(r('bordone-templare').attivazione, { testo: '+1d6 Magico; 5 PM; Sintonizzazione 2', danno_extra: '1d6', natura: 'Magico', sintonizzazione: 2 });
  assert.equal(r('bordone-templare').munizioni.unita, 'PM');
  assert.equal(r('spada-deathdealer').natura_danno, 'Magico');
  assert.deepEqual(r('elettrosega-csb600').manovre, ['generali']);
  assert.equal(r('lama-mushashi').note_manuale, 'Lama Mushashi. Proprietà: Precisa 2; Danno Magico. Manovre compatibili: Affondo, Spazzata. Il raccordo con il KI sarà integrato successivamente.');
  // le domande sulle famiglie mancanti compaiono fra i TODO della home
  assert.ok(trovaTodo(dati).some((t) => /Katana/.test(t.testo)));
});

test('arma corporativa impugnata: Precisa nel VA per colpire, Difensiva nella Parata, cariche in sessione', () => {
  const s = scheda(MISHIMA_AGENTE, [voce('k', 'armi_corporative:kriss', 'impugnata'), voce('t', 'armi_corporative:tonfa-stella-cadente', 'impugnata')]);
  const [kriss, tonfa] = s.equipaggiamento.armi;
  const mischia = s.abilita.find((a) => a.nome === 'Armi da mischia').totale;
  assert.equal(kriss.va, mischia + 1); // Precisa 1, FOR 3 ≤ 6
  assert.ok(kriss.componenti.some((c) => c.nome === 'Precisa 1' && c.valore === 1));
  const difese = s.abilita.find((a) => a.nome === 'Difese').vaEquip;
  assert.equal(tonfa.parata.va, difese + 2); // Difensiva +2, FOR 4 ≤ 6
  assert.equal(tonfa.attivazione.natura, 'Elettricità');
  assert.deepEqual(tonfa.manovre, ['Affondo', 'Spazzata', 'Stordire']);
  // la Spada Punisher ha cinque cariche a cella: contatore in sessione, «Ricarica» sostituisce la cella
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce('p', 'armi_corporative:spada-punisher', 'impugnata')] };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  assert.deepEqual(m.caricatori, { p: 5 });
  let ses = variaMunizioni(inizializzaSessione(m), 'p', 'colpi', -2, m);
  assert.equal(ses.munizioni.p.colpi, 3);
  ses = ricaricaArma(ses, 'p', m);
  assert.equal(ses.munizioni.p.colpi, 5);
  // stampa: cariche e attivazione nella riga dell'arma
  const f3 = preparaStampa(creazione, dati).fogli.find((f) => f.id === 'combattimento').dati;
  assert.equal(f3.armi.righe[0][5], '5 cariche');
  assert.match(f3.armi.righe[0][6], /att\. \+2d4 Plasma/);
  assert.match(f3.armi.righe[0][6], /Precisa 1/);
});

test('Scudo delle Guardie Sacre: attacco senza lama dal §7.1.9, danno con la lama in TODO(Davide)', () => {
  const gs = catalogo(dati).perRif.get('scudi:scudo-delle-guardie-sacre');
  assert.equal(gs.attacco.danno, '1d6+1');
  assert.match(gs.attacco.note, /1d6\+1\+1d4.*§7\.1\.9.*1d6\+1d4.*§7\.4\.10/);
  assert.ok(trovaTodo(dati).some((t) => /Guardie Sacre, danno con la lama/.test(t.testo)));
});

test('validatore delle armi corporative: effetti, attivazione, unità delle cariche, Manovre', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const ac = (d) => d.equipaggiamento.file.armi_corporative.oggetti;
  assert.match(e((d) => { ac(d)[0].proprieta[0].effetto = { boh: 1 }; }), /effetto sconosciuto/);
  assert.match(e((d) => { ac(d).find((o) => o.id === 'spada-punisher').attivazione.danno_extra = 'tanto'; }), /danno_extra: "tanto" non è una formula/);
  assert.match(e((d) => { ac(d).find((o) => o.id === 'spada-punisher').munizioni.unita = 'litri'; }), /colpi, cariche o PM/);
  assert.match(e((d) => { ac(d)[0].manovre = []; }), /elenco delle Manovre compatibili/);
  assert.match(e((d) => { ac(d).find((o) => o.id === 'spada-deathdealer').natura_danno = 'Sacro'; }), /Naturale, Magico o Etereo/);
});

// --- Lotto 5: armi a distanza corporative (§7.8) ------------------------------------------

test('lotto 5: 81 armi a distanza corporative e 19 moduli integrati in 7 cataloghi, con i valori del §7.8', () => {
  const tutte = catalogo(dati).oggetti.filter((o) => o.file === 'armi_distanza_corporative');
  assert.equal(tutte.length, 100);
  assert.equal(tutte.filter((o) => o.modulo_di).length, 19);
  assert.deepEqual([...new Set(tutte.map((o) => o.catalogo))], ['Alleanza', 'Bauhaus', 'Capitol', 'Cybertronic', 'Fratellanza', 'Imperial', 'Mishima']);
  const r = (id) => catalogo(dati).perRif.get(`armi_distanza_corporative:${id}`);
  assert.equal(r('mefisto').gittata_q, 1700); // «1.700» con il separatore delle migliaia
  assert.equal(r('charger').munizioni.capacita, 1000);
  assert.equal(r('charger').costo, 55000);
  assert.equal(r('charger').mov, -3);
  assert.deepEqual(r('eliminator').proprieta.map((p) => p.nome), ['Purificatrice 1', 'Silenziatore incorporato']);
  assert.equal(r('hg10').specializzazione, 'specializzazione-pistole'); // «Pistole corporative di base»
  assert.equal(r('hellblazer').specializzazione, 'specializzazione-armi-al-plasma');
  assert.equal(r('m50').specializzazione, null); // non dichiarata: TODO(Davide)
  // modulo integrato: PI, reperibilità e costo sono quelli dell'arma principale
  const lg = r('lanciagranate-mp105gw');
  assert.equal(lg.modulo_di, 'armi_distanza_corporative:mp105gw');
  assert.equal(lg.costo, null);
  assert.equal(lg.munizioni.riferimento, 'Granata standard a frammentazione');
  assert.equal(r('lanciarazzi-southpaw').munizioni.riferimento, 'Razzo a carica maggiorata'); // «Compatibilità dei nuovi cataloghi»
  const mr = dati.equipaggiamento.file.armi_distanza_corporative.munizioni_riferimento;
  assert.equal(mr.length, 6);
  assert.deepEqual(mr[0], { nome: 'Granata standard a frammentazione', danno: '1d6+1', ac: '1d3', rs_q: 1, proprieta: ['Sbilanciante', 'Sbalzante 1'] });
  // i moduli non si scelgono da soli
  assert.ok(!opzioniCascata(dati, { tipo: 'arma_distanza', catalogo: 'Bauhaus', famiglia: 'Lanciagranate integrato' }).profili.length);
  assert.ok(!opzioniCascata(dati, { tipo: 'arma_distanza', catalogo: 'Bauhaus' }).famiglie.includes('Lanciagranate integrato'));
  assert.deepEqual(cercaNelCatalogo(dati, 'mp105gw').map((x) => x.rif), ['armi_distanza_corporative:mp105gw']);
  assert.ok(trovaTodo(dati).some((t) => /Panzerknacker/.test(t.testo)));
});

test('arma con modulo integrato impugnata: due profili, alimentazioni separate, danno della munizione di riferimento', () => {
  const s = scheda(MISHIMA_AGENTE, [voce('g', 'armi_distanza_corporative:mp105gw', 'impugnata')]);
  const [arma, modulo] = s.equipaggiamento.armi;
  const medie = s.abilita.find((a) => a.nome === 'Armi medie').totale;
  assert.equal(arma.nome, 'MP105GW');
  assert.equal(modulo.nome, 'Lanciagranate MP105GW');
  assert.equal(modulo.uid, 'g:lanciagranate-mp105gw');
  assert.equal(modulo.moduloDi, 'MP105GW');
  assert.equal(modulo.va, medie - Math.max(0, 4 - 6)); // FOR 4 richiesta, Mishima FOR 6
  assert.equal(modulo.dannoDaMunizione, true);
  assert.equal(modulo.munizioneRiferimento.danno, '1d6+1');
  assert.equal(modulo.gittataQ, 30);
  // un solo MOV e due mani contate una volta
  assert.equal(s.equipaggiamento.avvisi.length, 0);
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce('g', 'armi_distanza_corporative:mp105gw', 'impugnata')] };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  assert.deepEqual(m.caricatori, { g: 40, 'g:lanciagranate-mp105gw': 1 });
  let ses = variaMunizioni(inizializzaSessione(m), 'g:lanciagranate-mp105gw', 'colpi', -1, m);
  assert.equal(ses.munizioni['g:lanciagranate-mp105gw'].colpi, 0);
  assert.equal(ses.munizioni.g.colpi, 40);
  ses = ricaricaArma(ses, 'g:lanciagranate-mp105gw', m);
  assert.equal(ses.munizioni['g:lanciagranate-mp105gw'].colpi, 1);
  // stampa: riga del modulo con il danno della munizione, AC e RS
  const f3 = preparaStampa(creazione, dati).fogli.find((f) => f.id === 'combattimento').dati;
  const riga = f3.armi.righe.find((x) => x[0] === 'Lanciagranate MP105GW');
  assert.equal(riga[3], '1d6+1 (mun.)');
  assert.match(riga[6], /modulo di MP105GW; AC 1d3; RS 1 Q/);
  // tooltip dell'arma principale: elenca il modulo
  const t = testoTooltip('oggetto', 'armi_distanza_corporative:mp105gw', dati);
  assert.match(t, /Modulo integrato: Lanciagranate MP105GW: Armi medie, gittata 30 Q, CC 1/);
  assert.match(testoTooltip('oggetto', 'armi_distanza_corporative:lanciagranate-mp105gw', dati), /Costo: compreso nell’arma/);
});

test('validatore dei moduli integrati e delle munizioni di riferimento', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const f = (d) => d.equipaggiamento.file.armi_distanza_corporative;
  const o = (d, id) => f(d).oggetti.find((x) => x.id === id);
  assert.match(e((d) => { o(d, 'lanciagranate-mp105gw').costo = 100; }), /costo: un modulo integrato/);
  assert.match(e((d) => { o(d, 'lanciagranate-mp105gw').modulo_di = 'armi_distanza_corporative:boh'; }), /modulo_di: "armi_distanza_corporative:boh" non è un oggetto/);
  assert.match(e((d) => { o(d, 'lanciagranate-mp105gw').modulo_di = 'armi_distanza_corporative:lanciagranate-ar3000'; }), /non è un'arma principale/);
  assert.match(e((d) => { o(d, 'arg17').munizioni.riferimento = 'Razzo fantasma'; }), /"Razzo fantasma" non è fra le munizioni_riferimento/);
  assert.match(e((d) => { f(d).munizioni_riferimento[0].danno = 'tanto'; }), /munizioni_riferimento\[0\] \(Granata standard a frammentazione\)\.danno/);
});

// --- Lotto 6: armature corporative (§7.11.5–7.17.5) ---------------------------------------

test('lotto 6: 83 armature corporative in 7 cataloghi, penalità effettive e rinforzi dal manuale', () => {
  const tutte = catalogo(dati).oggetti.filter((o) => o.file === 'armature_corporative');
  assert.equal(tutte.length, 83);
  assert.deepEqual([...new Set(tutte.map((o) => o.catalogo))], ['Bauhaus', 'Alleanza', 'Capitol', 'Imperial', 'Cybertronic', 'Mishima', 'Fratellanza']);
  const r = (id) => catalogo(dati).perRif.get(`armature_corporative:${id}`);
  // §7.11.5: Blitzer, Media con Articolazione d'assalto e Assetto da incursione
  assert.deepEqual(r('armatura-d-assalto-blitzer').penalita, { attacchi_distanza: -1, attacchi_ravvicinati: 0, agilita: -1, movimento_q: 0, lancio_potere: -3 });
  assert.equal(r('armatura-d-assalto-blitzer').costo, 9500);
  // §7.17.4: Custode dell'Arte, Assetto mistico 5 annulla il −5 al lancio
  assert.equal(r('corazza-del-custode-dell-arte').penalita.lancio_potere, 0);
  assert.deepEqual(r('corazza-delle-furie').ar, { totale: 7, magica: 2 });
  // §7.14.1–7.14.2: la Felis ha FOR 5 accesa, 7 senza alimentazione
  const felis = r('mk-iv-felis-pattern-dei-golden-lions');
  assert.equal(felis.for_richiesta, 5);
  assert.deepEqual(felis.profili_alternativi[0], { condizione: 'senza alimentazione', for_richiesta: 7, penalita: { attacchi_ravvicinati: -2, attacchi_distanza: -2, agilita: -2, movimento_q: -2, lancio_potere: -5 } });
  // §7.13.3: rinforzi dalla tabella Capitol
  assert.deepEqual(r('armatura-freedom-brigades').rinforzi_ammessi, ['Leggero', 'Pesante']);
  assert.deepEqual(r('corazza-tortoise-mk-ii').rinforzi_ammessi, []);
  assert.deepEqual(r('corazza-tortoise-mk-i').rinforzi_ammessi, ['Leggero']);
  assert.deepEqual(r('armatura-d-assalto-headhunter').nomi_alternativi, ['Warhound']);
  assert.deepEqual(cercaNelCatalogo(dati, 'warhound').map((x) => x.rif), ['armature_corporative:armatura-d-assalto-headhunter']);
  // esoscheletri Bauhaus (§7.11.6): FOR del pilota, MOV della tabella, −5 al lancio
  assert.deepEqual(r('vulkan').penalita, { attacchi_distanza: 0, attacchi_ravvicinati: 0, agilita: 0, movimento_q: -2, lancio_potere: -5 });
  assert.equal(r('vulkan').supporti, '2 armi pesanti');
  assert.ok(r('corazza-dei-dragoni-wolfheads').proprieta.every((p) => p.nome !== 'Articolazione d’assalto')); // «senza Articolazione d’assalto»
});

test('armatura corporativa indossata: penalità proprie del modello, FOR insufficiente, profilo spento in stampa', () => {
  // Mishima Agente, FOR 6: Blitzer (FOR 5) senza penalità FOR
  let s = scheda(MISHIMA_AGENTE, [voce('b', 'armature_corporative:armatura-d-assalto-blitzer', 'indossata')]);
  assert.equal(s.equipaggiamento.equipAbilita.Furtività, -1); // Agilità della Media
  assert.equal(s.equipaggiamento.movimentoQ, 0); // Assetto da incursione
  assert.equal(s.equipaggiamento.lancioPotere, -3);
  // Corazza delle Furie, FOR 7: un punto mancante su Agilità e Difese
  s = scheda(MISHIMA_AGENTE, [voce('f', 'armature_corporative:corazza-delle-furie', 'indossata')]);
  assert.equal(s.equipaggiamento.equipAbilita.Furtività, -3);
  assert.equal(s.equipaggiamento.equipAbilita.Difese, -1);
  assert.equal(s.equipaggiamento.lancioPotere, -3); // Assetto mistico 2
  assert.deepEqual(s.equipaggiamento.protezioni[0].ar, { totale: 7, magica: 2 });
  // Felis: il profilo senza alimentazione è un promemoria nella scheda e nella stampa
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce('m', 'armature_corporative:mk-iv-felis-pattern-dei-golden-lions', 'indossata')] };
  s = calcolaScheda({ creazione, livelli: [] }, dati);
  assert.equal(s.equipaggiamento.protezioni[0].alternative[0].forRichiesta, 7);
  const f3 = preparaStampa(creazione, dati).fogli.find((f) => f.id === 'combattimento').dati;
  assert.match(f3.protezioni.righe[0][3], /senza alimentazione: .*MOV −2 Q.*FOR 7/);
  const t = testoTooltip('oggetto', 'armature_corporative:mk-iv-felis-pattern-dei-golden-lions', dati);
  assert.match(t, /Penalità effettive: attacchi −1 ravv\. \/ −2 dist\., Agilità −2, MOV −1 Q, lancio con Potere −5/);
  assert.match(t, /Rinforzi ammessi: nessuno/);
});

test('validatore delle armature corporative: rinforzi, profili alternativi, penalità', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const o = (d, id) => d.equipaggiamento.file.armature_corporative.oggetti.find((x) => x.id === id);
  assert.match(e((d) => { o(d, 'corazza-tortoise-mk-i').rinforzi_ammessi = ['Titanio']; }), /rinforzi_ammessi: elenco di kit/);
  assert.match(e((d) => { o(d, 'powersuit').profili_alternativi[0].for_richiesta = 12; }), /profili_alternativi\[0\]\.for_richiesta: intero da 1 a 10/);
  assert.match(e((d) => { o(d, 'powersuit').profili_alternativi[0] = { condizione: 'spento' }; }), /un profilo alternativo cambia FOR, penalità o AR/);
  assert.match(e((d) => { o(d, 'armatura-d-assalto-blitzer').penalita.movimento_q = 1; }), /penalita\.movimento_q: deve essere un intero ≤ 0/);
});

// --- Lotto 7: corredi e dispositivi corporativi (§7.12–7.17) --------------------------------

test('lotto 7: corredi, dispositivi, APE, Iron Mastiff, armi e granate Imperial, SIN Cybertronic', () => {
  const tutti = catalogo(dati).oggetti.filter((o) => o.file === 'corredi_dispositivi');
  assert.equal(tutti.length, 60);
  assert.equal(tutti.filter((o) => o.famiglia === 'Corredi professionali').length, 39); // 4 Alleanza, 9 Capitol, 8 Imperial, 8 Mishima, 9 Fratellanza, Dr. Diana
  assert.equal(tutti.filter((o) => o.tipo === 'sanitario').length, 5); // Kit trauma = Kit di pronto soccorso Professionale (§7.19)
  const r = (id) => catalogo(dati).perRif.get(`corredi_dispositivi:${id}`);
  assert.equal(r('kit-trauma-mishima').applicazioni, 5);
  assert.equal(r('corredo-di-sopravvivenza-ambientale-imperial').costo, 1500);
  assert.equal(r('investigazione-fratellanza').qualita, 'Non comune'); // dalla frase «Tutti hanno Qualità Non comune e PS Integrità 12»
  assert.equal(r('propulsore-d-assalto-banshee').tabelle[0].righe.length, 6); // «Voce | Regola»
  // §7.13.6: APE, MOV 0, Furtività −2, lancio −5
  assert.deepEqual(r('ape-capitol').penalita, { attacchi_distanza: 0, attacchi_ravvicinati: 0, agilita: 0, movimento_q: 0, lancio_potere: -5, abilita: { Furtività: -2 } });
  assert.equal(r('howler').mani, 0);
  assert.deepEqual(r('rainy-dayer').scudo_integrato.parata, { ravvicinata: 0, distanza: -4 });
  assert.equal(r('granata-fumogena').nessun_danno, true);
  assert.ok(!tutti.some((o) => /frammentazione/i.test(o.nome))); // è la granata commerciale del §7.7
  assert.deepEqual(r('ias3200-imbracatura-antigravita').compatibile_con, ['armature_corporative:ia3000-shock-trooper', 'armature_corporative:ia3000-silent']);
  const sin = dati.equipaggiamento.file.corredi_dispositivi.sin_armi;
  assert.equal(sin.length, 15);
  assert.deepEqual(sin.find((x) => x.rif === 'armi_distanza_corporative:sr3500'), { rif: 'armi_distanza_corporative:sr3500', valore: 2, prova: 'Per colpire' });
  assert.ok(trovaTodo(dati).some((t) => /Rainy Dayer/.test(t.testo)));
});

test('SIN: con l’Interfaccia Neurale in uso le armi Cybertronic hanno +SIN al VA per colpire (§7.15.1)', () => {
  const arma = voce('c', 'armi_distanza_corporative:caw2000', 'impugnata');
  const senza = scheda(MISHIMA_AGENTE, [arma]).equipaggiamento.armi;
  const con = scheda(MISHIMA_AGENTE, [arma, voce('i', 'corredi_dispositivi:interfaccia-neurale-cybertronic', 'in_uso')]).equipaggiamento.armi;
  assert.equal(con[0].va, senza[0].va + 1);
  assert.ok(con[0].componenti.some((c) => /^SIN 1/.test(c.nome)));
  assert.equal(con[1].nome, 'Lanciagranate CAW2000'); // anche il modulo: «Per colpire con il modulo»
  assert.equal(con[1].va, senza[1].va + 1);
  // interfaccia nello zaino: nessun bonus
  const zaino = scheda(MISHIMA_AGENTE, [arma, voce('i', 'corredi_dispositivi:interfaccia-neurale-cybertronic', 'zaino')]).equipaggiamento.armi;
  assert.equal(zaino[0].va, senza[0].va);
  assert.match(testoTooltip('oggetto', 'armi_distanza_corporative:sr3500', dati), /SIN 2: \+2 VA \(per colpire\)/);
});

test('Rainy Dayer aperta come Scudo, Howler al polso, APE indossato', () => {
  let s = scheda(MISHIMA_AGENTE, [voce('r', 'corredi_dispositivi:rainy-dayer', 'impugnata'), voce('h', 'corredi_dispositivi:howler', 'impugnata')]);
  const scudo = s.equipaggiamento.protezioni.find((p) => p.uid === 'r:scudo');
  const difese = s.abilita.find((a) => a.nome === 'Difese').vaEquip;
  assert.deepEqual(scudo.ar, { totale: 1, magica: 0 });
  assert.deepEqual([scudo.parata.ravvicinata, scudo.parata.distanza], [difese, difese - 4]); // FOR 4 ≤ 6
  assert.ok(!s.equipaggiamento.avvisi.some((a) => /Mani impegnate/.test(a))); // Howler da polso: 0 mani
  assert.equal(s.equipaggiamento.armi.find((a) => a.nome === 'Howler').munizioneRiferimento.danno, '1d6+1');
  s = scheda(MISHIMA_AGENTE, [voce('a', 'corredi_dispositivi:ape-capitol', 'indossata')]);
  assert.equal(s.equipaggiamento.equipAbilita.Furtività, -2);
  assert.equal(s.equipaggiamento.movimentoQ, 0);
  assert.equal(s.equipaggiamento.lancioPotere, -5);
  const t = testoTooltip('oggetto', 'corredi_dispositivi:propulsore-d-assalto-banshee', dati);
  assert.match(t, /Regole di volo: Attivazione: Compresa nell’AzM/);
});

test('validatore di corredi e dispositivi: SIN, compatibilità, tabelle, scudo integrato, penalità per Abilità', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const f = (d) => d.equipaggiamento.file.corredi_dispositivi;
  const o = (d, id) => f(d).oggetti.find((x) => x.id === id);
  assert.match(e((d) => { f(d).sin_armi[0].rif = 'corredi_dispositivi:kit-trauma-mishima'; }), /sin_armi\[0\]\.rif: .* non è un'arma/);
  assert.match(e((d) => { f(d).sin_armi[0].valore = 3; }), /SIN 1 o SIN 2/);
  assert.match(e((d) => { o(d, 'ias3300-mirrorshard').compatibile_con = ['armi:lancia']; }), /non è un'armatura/);
  assert.match(e((d) => { o(d, 'propulsore-d-assalto-banshee').tabelle[0].righe[0] = ['solo una cella']; }), /servono 2 celle/);
  assert.match(e((d) => { o(d, 'rainy-dayer').scudo_integrato.parata = { ravvicinata: 0 }; }), /scudo_integrato\.parata/);
  assert.match(e((d) => { o(d, 'ape-capitol').penalita.abilita = { Nuoto: -2 }; }), /Abilità "Nuoto" inesistente/);
  assert.match(e((d) => { o(d, 'granata-fumogena').danno = { una_mano: '1d6', due_mani: null }; }), /nessun_danno/);
});

// --- Lotto 8: accessori delle armi (§7.3) -------------------------------------------------

test('lotto 8: 15 accessori delle armi dal §7.3, con le versioni rinforzate dei silenziatori', () => {
  const tutti = catalogo(dati).oggetti.filter((o) => o.file === 'accessori_armi');
  assert.equal(tutti.length, 15);
  const r = (id) => catalogo(dati).perRif.get(`accessori_armi:${id}`);
  assert.deepEqual(r('mirino-ottico').mirino, { riduzione: 4, distanza_max_q: 500, azp_minime: 2, testo: 'Fino a 500 Q; almeno 2 Azioni Principali complessive.' });
  assert.equal(r('mirino-di-precisione').mirino.distanza_max_q, null); // «Entro la gittata massima dell’arma»
  assert.deepEqual(r('silenziatore').effetto_arma, { va: -2, danno: -1 });
  // §7.3.1: «stessi modificatori, costo doppio»; «i rinforzati hanno PI 4»
  assert.equal(r('silenziatore-rinforzato').costo, 4000);
  assert.equal(r('silenziatore-rinforzato').pi, 4);
  assert.deepEqual(r('bipiede').bonus_condizionato, { va: 1, condizione: 'finché il personaggio mantiene posizione e appoggio' });
  assert.deepEqual(r('modulo-di-visione-termica').si_monta_su, ['mirino']);
  assert.equal(r('batteria-di-servizio').costo, 10);
});

test('accessori montati su un’arma impugnata: silenziatore nel VA e nel danno, mirino, modulo sul mirino, bipiede', () => {
  const arma = voce('f', 'armi_distanza:fucile-d-assalto', 'impugnata');
  const acc = (uid, id, su, stato = 'in_uso') => voce(uid, `accessori_armi:${id}`, stato, { montato_su: su });
  const base = scheda(MISHIMA_AGENTE, [arma]).equipaggiamento.armi[0];
  const s = scheda(MISHIMA_AGENTE, [arma, acc('s', 'silenziatore', 'f'), acc('m', 'mirino-ottico', 'f'), acc('n', 'modulo-di-visione-notturna', 'm'), acc('b', 'bipiede', 'f')]).equipaggiamento;
  const f = s.armi[0];
  assert.equal(f.va, base.va - 2);
  assert.ok(f.componenti.some((c) => c.nome === 'Silenziatore (§7.3.1)' && c.valore === -2));
  assert.equal(f.danno.due_mani, aggiungiDanno(base.danno.due_mani, -1));
  assert.equal(f.mirino.riduzione, 4);
  assert.deepEqual(f.accessori.map((x) => x.nome), ['Silenziatore', 'Mirino Ottico', 'Bipiede', 'Modulo di visione notturna']);
  assert.deepEqual(f.condizionali, [{ nome: 'Bipiede', va: 1, vaTotale: f.va + 1, condizione: 'finché il personaggio mantiene posizione e appoggio' }]);
  assert.deepEqual(s.avvisi, []);
  // un solo dispositivo di riduzione del rumore; il modulo di visione non si monta sull'arma
  const t = scheda(MISHIMA_AGENTE, [arma, acc('s', 'silenziatore', 'f'), acc('a', 'attenuatore', 'f'), acc('n', 'modulo-di-visione-notturna', 'f')]).equipaggiamento;
  assert.equal(t.armi[0].va, base.va - 2);
  assert.ok(t.avvisi.some((x) => /c’è già Silenziatore: Attenuatore non ha effetto/.test(x)));
  assert.ok(t.avvisi.some((x) => /Modulo di visione notturna non si monta su Fucile d’assalto/.test(x)));
  // arma nello zaino: il mirino non ha effetto
  const z = scheda(MISHIMA_AGENTE, [voce('f', 'armi_distanza:fucile-d-assalto', 'zaino'), acc('m', 'mirino-ottico', 'f')]).equipaggiamento;
  assert.ok(z.avvisi.some((x) => /Mirino Ottico è montato su Fucile d’assalto, che non è impugnata/.test(x)));
  // stampa: accessori, mirino e bipiede nelle note dell'arma
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [arma, acc('m', 'mirino-ottico', 'f'), acc('b', 'bipiede', 'f')] };
  const riga = preparaStampa(creazione, dati).fogli.find((x) => x.id === 'combattimento').dati.armi.righe[0];
  assert.match(riga[6], /Mirino Ottico; Bipiede; mirino −4 dist\.; Bipiede: VA \d+/);
});

test('validatore degli accessori: si monta su, mirino, effetti', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const o = (d, id) => d.equipaggiamento.file.accessori_armi.oggetti.find((x) => x.id === id);
  assert.match(e((d) => { o(d, 'bipiede').si_monta_su = ['zaino']; }), /si_monta_su: elenco fra/);
  assert.match(e((d) => { o(d, 'mirino-reflex').mirino.riduzione = 0; }), /mirino: serve/);
  assert.match(e((d) => { o(d, 'silenziatore').effetto_arma = { va: 'tanto' }; }), /effetto_arma: serve/);
  assert.match(e((d) => { o(d, 'treppiede').bonus_condizionato = { va: 2 }; }), /bonus_condizionato: serve/);
});

// --- Lotto 9: kit di rinforzo (§7.11.2) ---------------------------------------------------

const rinforzata = (armatura, kit, extra = []) => {
  const s = scheda(MISHIMA_AGENTE, [voce('a', armatura, 'indossata'), voce('k', `rinforzi:${kit}`, 'in_uso', { montato_su: 'a' }), ...extra]);
  return { p: s.equipaggiamento.protezioni[0], eq: s.equipaggiamento };
};

test('lotto 9: rinforzi commerciali e soprabiti; la tabella del §7.11.2 è il test del calcolo', () => {
  const tutti = catalogo(dati).oggetti.filter((o) => o.file === 'rinforzi');
  assert.deepEqual(tutti.map((o) => o.nome), ['Rinforzo Leggero', 'Rinforzo Pesante', 'Soprabito blu di ordinanza', 'Soprabito ASA']);
  // «Configurazione commerciale | AR finale | FOR finale | Penalità» (p. 62)
  for (const [armatura, kit, ar, forR, cat] of [
    ['armature:armatura-civile-leggera', 'rinforzo-leggero', 2, 4, 'Leggera'],
    ['armature:armatura-civile-leggera', 'rinforzo-pesante', 3, 5, 'Media'],
    ['armature:armatura-civile-media', 'rinforzo-leggero', 4, 6, 'Media'],
  ]) {
    const { p } = rinforzata(armatura, kit);
    assert.deepEqual([p.ar.totale, p.forRichiesta, p.categoria], [ar, forR, cat], `${armatura} + ${kit}`);
  }
  // la Leggera diventata Media usa le penalità della Media
  const { eq } = rinforzata('armature:armatura-civile-leggera', 'rinforzo-pesante');
  assert.equal(eq.movimentoQ, -1);
  assert.equal(eq.equipAbilita.Furtività, -1);
});

test('rinforzi sulle armature corporative: proprietà native con le penalità della Media, soprabiti, kit non ammessi', () => {
  // §7.17.5: «Mortificator rinforzato: −1 VA ad attacchi e Agilità, −1 MOV e −2 VA al lancio dopo Assetto mistico 1»
  let { p } = rinforzata('armature_corporative:tuta-del-mortificator', 'rinforzo-leggero');
  assert.deepEqual(p.ar, { totale: 4, magica: 1 });
  assert.equal(p.forRichiesta, 5);
  assert.equal(p.categoria, 'Media');
  assert.deepEqual(p.penalita, { attacchi_distanza: -1, attacchi_ravvicinati: -1, agilita: -1, movimento_q: -1, lancio_potere: -2 });
  // §7.11.7: «Con la Divisa operativa: AR 4, FOR 5, penalità Media»
  ({ p } = rinforzata('armature_corporative:divisa-operativa-asa', 'soprabito-asa'));
  assert.deepEqual([p.ar.totale, p.forRichiesta, p.categoria, p.rinforzo.nome], [4, 5, 'Media', 'Soprabito ASA']);
  // Mercurio (Media) resta Media e conserva Assetto da incursione e Articolazione da ricognizione
  ({ p } = rinforzata('armature_corporative:armatura-mercurio', 'rinforzo-leggero'));
  assert.deepEqual([p.ar.totale, p.forRichiesta, p.categoria, p.penalita.movimento_q, p.penalita.agilita], [5, 6, 'Media', 0, 0]);
  // kit non ammessi: nessun effetto e un avviso
  let r = rinforzata('armature_corporative:armatura-d-ordinanza-bleu', 'soprabito-asa');
  assert.equal(r.p.ar.totale, 2);
  assert.ok(r.eq.avvisi.some((a) => /Soprabito ASA non è ammesso su Armatura d’ordinanza BLEU/.test(a)));
  r = rinforzata('armature:armatura-civile-media', 'rinforzo-pesante');
  assert.equal(r.p.ar.totale, 3);
  assert.ok(r.eq.avvisi.some((a) => /Rinforzo Pesante non è ammesso/.test(a)));
  // due kit: vale il primo
  r = rinforzata('armature:armatura-civile-leggera', 'rinforzo-leggero', [voce('k2', 'rinforzi:rinforzo-pesante', 'in_uso', { montato_su: 'a' })]);
  assert.equal(r.p.ar.totale, 2);
  assert.ok(r.eq.avvisi.some((a) => /più kit di rinforzo: vale soltanto Rinforzo Leggero/.test(a)));
  // stampa
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce('a', 'armature:armatura-civile-leggera', 'indossata'), voce('k', 'rinforzi:rinforzo-pesante', 'in_uso', { montato_su: 'a' })] };
  const riga = preparaStampa(creazione, dati).fogli.find((x) => x.id === 'combattimento').dati.protezioni.righe[0];
  assert.deepEqual(riga.slice(0, 3), ['Armatura civile leggera + Rinforzo Pesante', '3', 'Media']);
});

test('validatore dei rinforzi e degli effetti sulle penalità', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  assert.match(e((d) => { d.equipaggiamento.file.rinforzi.oggetti[0].rinforzo.kit = 'Medio'; }), /rinforzo: serve/);
  assert.match(e((d) => { d.equipaggiamento.file.armature_corporative.oggetti.find((o) => o.id === 'armatura-d-assalto-blitzer').proprieta.find((p) => p.effetto).effetto.penalita = { annulla: ['volo'] }; }), /effetto\.penalita: serve/);
});

// --- Lotto 10: munizioni e alimentazioni (§7.20) -------------------------------------------

test('lotto 10: munizioni, celle, combustibile e compatibilità balistiche del §7.20', () => {
  const tutti = catalogo(dati).oggetti.filter((o) => o.file === 'munizioni');
  assert.equal(tutti.length, 49);
  const r = (id) => catalogo(dati).perRif.get(`munizioni:${id}`);
  assert.deepEqual(r('proiettili-da-fucile').munizione, { famiglia: 'fucile', confezione: { quantita: 50, costo: 150 } });
  // §7.20.7: prezzo speciale = ordinario × moltiplicatore; confezione da dieci
  assert.equal(r('proiettili-pesanti-perforante-2').costo, 48);
  assert.deepEqual(r('proiettili-pesanti-perforante-2').munizione.confezione, { quantita: 10, costo: 480 });
  assert.ok(!tutti.some((o) => /pallini, perforante/.test(o.nome))); // «per i fucili a pallini … non Perforante»
  assert.deepEqual(r('granata-a-frammentazione-pesante').compatibile_con, ['armi_distanza_corporative:lanciagranate-deathlock-drum']);
  assert.deepEqual(r('razzo-standard').compatibile_con, ['armi_distanza:lanciarazzi', 'armi_distanza_corporative:lanciarazzi-deuce', 'armi_distanza_corporative:lanciarazzi-daimyo']);
  const cella = r('cella-ravvicinata-comune');
  assert.equal(cella.compatibile_con.length, 17);
  assert.ok(cella.compatibile_con.includes('armi:tirapugni-concussivo'));
  assert.deepEqual(r('serbatoio-vuoto-gehemmapuker').cella, { capacita: 50, unita: 'getti', ricarica_costo: 500 });
  // granate standard, Fumogena ed Elettroshock sono già nel catalogo: niente doppioni
  assert.ok(!tutti.some((o) => /fumogena|elettroshock|frammentazione standard/i.test(o.nome)));
  const tab = dati.equipaggiamento.file.munizioni.munizioni_armi;
  assert.equal(tab.length, 71);
  const fam = (rif) => tab.find((x) => x.rif === rif)?.famiglia;
  assert.equal(fam('armi_distanza_corporative:mg40'), 'fucile'); // «La loro funzione di mitragliatrice leggera non li sposta nei pesanti»
  assert.equal(fam('corredi_dispositivi:rainy-dayer'), 'pistola');
  assert.equal(fam('armi_distanza_corporative:nimrod-autocannon'), 'nimrod');
  assert.equal(fam('armi_distanza_corporative:ronin-45ap'), 'pistola'); // «Ronin 45 AP» nel §7.20.9
});

test('Tirapugni concussivo: 5 cariche della cella ravvicinata comune (§7.1.1, §7.20.5), contatore in sessione', () => {
  const t = catalogo(dati).perRif.get('armi:tirapugni-concussivo');
  assert.equal(t.munizioni.capacita, 5);
  assert.equal(t.attivazione.danno_extra, '1d6');
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [voce('t', 'armi:tirapugni-concussivo', 'impugnata')] };
  assert.deepEqual(massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati).caricatori, { t: 5 });
});

test('scorte di munizioni nella scheda dell’arma: stessa famiglia o compatibilità espressa', () => {
  const s = scheda(MISHIMA_AGENTE, [
    voce('m', 'armi_distanza_corporative:mg40', 'impugnata'),
    voce('d', 'armi_distanza_corporative:lanciarazzi-deuce', 'pronta'),
    { ...voce('f', 'munizioni:proiettili-da-fucile', null), quantita: 60 },
    { ...voce('p', 'munizioni:proiettili-da-fucile-perforante-1', null), quantita: 10 },
    { ...voce('h', 'munizioni:proiettili-pesanti', null), quantita: 20 },
    { ...voce('r', 'munizioni:razzo-standard', null), quantita: 2 },
  ]).equipaggiamento;
  const mg = s.armi[0];
  assert.equal(mg.famigliaMunizioni, 'fucile');
  assert.deepEqual(mg.scorte, [{ uid: 'f', nome: 'Proiettili da fucile', quantita: 60 }, { uid: 'p', nome: 'Proiettili da fucile, perforante 1', quantita: 10 }]);
  const deuce = scheda(MISHIMA_AGENTE, [voce('d', 'armi_distanza_corporative:lanciarazzi-deuce', 'impugnata'), { ...voce('r', 'munizioni:razzo-standard', null), quantita: 2 }]).equipaggiamento.armi[0];
  assert.deepEqual(deuce.scorte, [{ uid: 'r', nome: 'Razzo standard', quantita: 2 }]);
  assert.match(testoTooltip('oggetto', 'munizioni:razzo-ssw5500', dati), /Carico: danno 1d10\+1, AC 1d3, RS 4 Q; Sbilanciante, Sbalzante 2/);
  assert.match(testoTooltip('oggetto', 'armi_distanza_corporative:m50', dati), /Munizioni: proiettili da fucile \(§7\.20\.9\)/);
});

test('validatore delle munizioni: famiglia, esplosivo, cella, compatibilità, tabella del §7.20.9', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const f = (d) => d.equipaggiamento.file.munizioni;
  const o = (d, id) => f(d).oggetti.find((x) => x.id === id);
  assert.match(e((d) => { o(d, 'frecce').munizione.famiglia = 'sassi'; }), /munizione\.famiglia: famiglia fra/);
  assert.match(e((d) => { o(d, 'razzo-standard').esplosivo.danno = 'tanto'; }), /esplosivo: serve/);
  assert.match(e((d) => { o(d, 'cella-hellblazer').cella.unita = 'litri'; }), /cella: serve/);
  assert.match(e((d) => { o(d, 'cella-hellblazer').compatibile_con = ['armature:armatura-civile-leggera']; }), /non è un'arma/);
  assert.match(e((d) => { f(d).munizioni_armi[0].rif = 'munizioni:frecce'; }), /munizioni_armi\[0\]\.rif: .* non è un'arma/);
});

// --- Lotto 11: equipaggiamento sanitario (§7.19) -------------------------------------------

test('lotto 11: kit, cartucce, UMC, dispositivi, diagnostica e chirurgia del §7.19', () => {
  const tutti = catalogo(dati).oggetti.filter((o) => o.file === 'sanitario');
  assert.equal(tutti.length, 16);
  const r = (id) => catalogo(dati).perRif.get(`sanitario:${id}`);
  // tabella degli esiti ricostruita per colonna più vicina (p. 109)
  assert.deepEqual(r('kit-di-pronto-soccorso-improvvisato').esiti, { successo: 'Sospende il Sanguinamento per 10 Round', magistrale: 'Arresta il Sanguinamento' });
  assert.deepEqual(r('kit-di-pronto-soccorso-professionale').esiti.magistrale, 'Arresta il Sanguinamento e recupera il doppio del risultato di 1d4 PV');
  assert.deepEqual(r('kit-di-pronto-soccorso-professionale').strumenti, { va: 2, prova: 'Medicina (pronto soccorso)' });
  assert.equal(r('kit-di-pronto-soccorso-improvvisato').costo, null); // «senza un prezzo o un profilo strutturale fisso»
  assert.deepEqual(r('kit-di-pronto-soccorso-standard').ricarica, { applicazioni: 5, costo: 150 });
  assert.equal(r('cartuccia-curativa').effetto, 'Recupera 1d6 PV, fino ai PV massimi');
  assert.deepEqual([r('umc-automatica').capacita_cartucce, r('umc-automatica').costo, r('umc-automatica').si_monta_su], [10, 18000, ['armatura']]);
  assert.equal(r('spray-rimarginante').nome_applicazioni, 'dosi');
  assert.equal(r('postazione-medica-da-campo').strumenti.va, 3);
});

test('modalità tavolo: applicazioni di kit e Spray con il contatore; una sola UMC in uso', () => {
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [
    { ...voce('k', 'sanitario:kit-di-pronto-soccorso-standard', null), quantita: 2 },
    voce('s', 'sanitario:spray-rimarginante', null),
    voce('t', 'corredi_dispositivi:kit-trauma-capitol', null),
  ] };
  const m = massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati);
  assert.deepEqual(m.caricatori, { k: 10, s: 5, t: 5 }); // applicazioni × quantità
  let ses = variaMunizioni(inizializzaSessione(m), 'k', 'colpi', -1, m);
  assert.equal(ses.munizioni.k.colpi, 9);
  ses = ricaricaArma(ses, 'k', m);
  assert.equal(ses.munizioni.k.colpi, 10);
  // due UMC in uso sulla stessa armatura: avviso
  const eq = scheda(MISHIMA_AGENTE, [
    voce('a', 'armature:armatura-civile-media', 'indossata'),
    voce('u1', 'sanitario:umc-attiva', 'in_uso', { montato_su: 'a' }),
    voce('u2', 'sanitario:umc-passiva', 'in_uso', { montato_su: 'a' }),
  ]).equipaggiamento;
  assert.ok(eq.avvisi.some((x) => /UMC Passiva: ne vale una sola per personaggio, già in uso UMC Attiva/.test(x)));
  assert.equal(eq.protezioni[0].ar.totale, 3); // la UMC non modifica AR (§7.19.3)
  const t = testoTooltip('oggetto', 'sanitario:kit-di-pronto-soccorso-professionale', dati);
  assert.match(t, /Strumenti: \+2 VA a Medicina \(pronto soccorso\)/);
  assert.match(t, /Magistrale: Arresta il Sanguinamento e recupera il doppio/);
});

test('validatore del sanitario', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const o = (d, id) => d.equipaggiamento.file.sanitario.oggetti.find((x) => x.id === id);
  assert.match(e((d) => { o(d, 'spray-rimarginante').nome_applicazioni = 'litri'; }), /applicazioni, dosi o set/);
  assert.match(e((d) => { o(d, 'kit-chirurgico-da-campo').strumenti = { va: 2 }; }), /strumenti: serve/);
  assert.match(e((d) => { o(d, 'kit-di-pronto-soccorso-standard').esiti = { successo: 'x' }; }), /esiti: serve/);
  assert.match(e((d) => { o(d, 'umc-passiva').capacita_cartucce = 0; }), /capacita_cartucce: intero/);
});

// --- Lotto 12: artefatti e sintonizzazione (§7.5, §7.10) -----------------------------------

test('lotto 12: regole di sintonizzazione, profili con riserva mistica, batterie', () => {
  const f = dati.equipaggiamento.file.artefatti;
  assert.deepEqual(f.sintonizzazione.capacita_per_gradi, [4, 5, 6, 7, 8, 9]);
  assert.deepEqual(f.sintonizzazione.talento, { nome: 'Architetto TecnoMistico', bonus: 2 });
  assert.equal(f.sintonizzazione.potenze.Leggendaria, 6);
  assert.equal(f.artefatti_catalogo.length, 6);
  assert.deepEqual(f.artefatti_catalogo.find((a) => a.rif === 'scudi:scudo-delle-guardie-sacre'), { rif: 'scudi:scudo-delle-guardie-sacre', tipologia: 'Protezioni', potenza: 'Rara', sintonizzazione: 3, riserva: { pm: 5, chroma: 'Rosso' } });
  const b = catalogo(dati).perRif.get('artefatti:batteria-da-5-pm-chroma-bianco');
  assert.deepEqual(b.artefatto, { tipologia: 'Batterie e contenitori', potenza: 'Non Comune', sintonizzazione: 2, riserva: { pm: 5, chroma: 'Bianco' } });
  assert.equal(b.costo, null);
  assert.ok(trovaTodo(dati).some((t) => /Batterie da 5 PM/.test(t.testo)));
});

test('sintonizzazione: capacità per Gradi e Talento, somma dei costi, avviso oltre il limite, riserve di PM', () => {
  const art = (uid, rif, extra = {}) => voce(uid, rif, null, { sintonizzato: true, ...extra });
  // Agente al 1° Grado: capacità 4 (§7.10)
  let eq = scheda(MISHIMA_AGENTE, [art('v', 'armi_corporative:spada-vindicator', { stato: 'pronta' }), art('b', 'artefatti:batteria-da-5-pm-chroma-bianco')]).equipaggiamento;
  assert.deepEqual([eq.sintonizzazione.capacita, eq.sintonizzazione.usata, eq.sintonizzazione.gradi], [4, 4, 1]);
  assert.ok(!eq.avvisi.some((a) => /Sintonizzazioni oltre/.test(a)));
  eq = scheda(MISHIMA_AGENTE, [art('v', 'armi_corporative:spada-vindicator', { stato: 'pronta' }), art('s', 'scudi:scudo-delle-guardie-sacre', { stato: 'pronta' })]).equipaggiamento;
  assert.equal(eq.sintonizzazione.usata, 5);
  assert.ok(eq.avvisi.some((a) => /Sintonizzazioni oltre la capacità: 5 su 4/.test(a)));
  // un Artefatto non sintonizzato non occupa capacità
  eq = scheda(MISHIMA_AGENTE, [voce('b', 'artefatti:batteria-da-5-pm-chroma-rosso', null)]).equipaggiamento;
  assert.deepEqual([eq.sintonizzazione.usata, eq.sintonizzazione.artefatti[0].sintonizzato], [0, false]);
  // Architetto TecnoMistico e 3 Gradi complessivi: 6 + 2 = 8
  const s = scheda(MISHIMA_AGENTE, []);
  const base = { caratteristiche: s.caratteristiche, abilita: s.abilita, specializzazioni: [], gradiComplessivi: 3, talenti: ['Architetto TecnoMistico'] };
  assert.equal(calcolaEquipaggiamento(base, [art('b', 'artefatti:batteria-da-5-pm-chroma-verde')], dati).sintonizzazione.capacita, 8);
  // la scelta «sintonizzato» si conserva; riserve di PM in modalità tavolo (non per le armi, che hanno già il contatore)
  assert.equal(normalizzaEquipaggiamento([art('b', 'artefatti:batteria-da-5-pm-chroma-verde')])[0].sintonizzato, true);
  const creazione = { ...MISHIMA_AGENTE, equipaggiamento: [art('b', 'artefatti:batteria-da-5-pm-chroma-verde'), art('s', 'scudi:scudo-delle-guardie-sacre', { stato: 'pronta' }), art('v', 'armi_corporative:spada-vindicator', { stato: 'pronta' })] };
  assert.deepEqual(massimiSessione(calcolaScheda({ creazione, livelli: [] }, dati), creazione, dati).caricatori, { b: 5, s: 5, v: 5 });
  assert.match(testoTooltip('oggetto', 'armi_corporative:spada-deliverer', dati), /Artefatto: Armi; potenza Non Comune, costo di sintonizzazione 2; riserva di 5 PM \(Chroma Rosso\)/);
});

test('validatore degli Artefatti: costo = potenza, riferimenti, regole', () => {
  const e = (modifica) => { const d = copia(dati); modifica(d); return validaDati(d).map((x) => `${x.chiave}: ${x.problema}`).join('\n'); };
  const f = (d) => d.equipaggiamento.file.artefatti;
  assert.match(e((d) => { f(d).oggetti[0].artefatto.sintonizzazione = 3; }), /potenza Comune: il costo di sintonizzazione è 1/);
  assert.match(e((d) => { f(d).artefatti_catalogo[0].rif = 'armi:inesistente'; }), /artefatti_catalogo\[0\]\.rif: .* non è un oggetto/);
  assert.match(e((d) => { f(d).sintonizzazione.capacita_per_gradi = [4, 5]; }), /sei interi/);
});

// --- Lotto 13: Manovre compatibili dei profili commerciali (§7.1.7) ------------------------

test('lotto 13: Manovre compatibili su tutti i 28 profili commerciali (§7.1.7)', () => {
  const commerciali = catalogo(dati).oggetti.filter((o) => o.file === 'armi');
  assert.equal(commerciali.length, 28);
  assert.ok(commerciali.every((o) => o.manovre?.length));
  const r = (id) => catalogo(dati).perRif.get(`armi:${id}`).manovre;
  assert.deepEqual(r('spada-lunga'), ['Affondo', 'Spazzata']);
  assert.deepEqual(r('martello-a-due-mani'), ['Spazzata', 'Stordire']);
  assert.deepEqual(r('frusta'), ['generali']); // «—»: restano le Manovre generali
  assert.deepEqual(r('tirapugni-concussivo'), ['Stordire']);
  const arma = scheda(MISHIMA_AGENTE, [voce('l', 'armi:lancia', 'impugnata')]).equipaggiamento.armi[0];
  assert.deepEqual(arma.manovre, ['Affondo']);
});

// --- Lotto 14: unità robotiche (§7.18) -----------------------------------------------------

test('lotto 14: Cuirassier Attila e Generatore RF366, con i VA del robot in tabella', () => {
  const r = (id) => catalogo(dati).perRif.get(`unita_robotiche:${id}`);
  const attila = r('cuirassier-attila');
  assert.deepEqual([attila.tipo, attila.costo, attila.pi, attila.reperibilita], ['altro', 75000, 16, 'MR']);
  assert.deepEqual(attila.tabelle[0].righe, [['6', '0', '8', '30']]);
  assert.deepEqual(attila.tabelle[1].righe.at(-1), ['Furtività', '4']);
  assert.deepEqual(attila.tabelle[2].righe.map((x) => x[2]), ['85.500', '107.500', '135.000']);
  assert.equal(r('generatore-di-risonanza-rf366').costo, 12000);
  assert.deepEqual(cercaNelCatalogo(dati, 'attila').map((x) => x.rif), ['unita_robotiche:cuirassier-attila']);
  assert.match(testoTooltip('oggetto', 'unita_robotiche:cuirassier-attila', dati), /VA del robot: Armi leggere \/ medie \/ pesanti: 10/);
});

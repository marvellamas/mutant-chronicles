import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcolaScheda, validaLivello } from '../src/calc.js';
import { normalizza, serializza, deserializzaPersonaggio } from '../src/character.js';
import {
  normalizzaEquipaggiamento, calcolaEquipaggiamento, catalogo, aggiungiDanno, opzioniCascata, cercaNelCatalogo, statoIniziale,
} from '../src/equipaggiamento.js';
import { preparaStampa } from '../src/stampa.js';
import { testoTooltip } from '../src/descrizioni.js';
import { validaDati } from '../src/validate.js';
import { datiReali, copia } from './helpers.js';
import { MISHIMA_AGENTE, ARCANISTA } from './personaggi.js';

const { dati } = await datiReali();
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const scheda = (creazione, equipaggiamento, livelli = []) => calcolaScheda({ creazione: { ...creazione, equipaggiamento }, livelli }, dati);

test('catalogo: caricato dall’indice, un lotto = un file e una riga; riferimenti "file:id"', () => {
  assert.deepEqual(dati.equipaggiamento.indice.file.map((f) => f.id), ['armi', 'armature']);
  const cat = catalogo(dati);
  assert.equal(cat.oggetti.filter((o) => o.tipo === 'arma_ravvicinata').length, 28); // §7.1.1: 28 profili
  assert.equal(cat.oggetti.filter((o) => o.tipo === 'armatura').length, 3); // §7.11.3
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
  assert.deepEqual(o.tipi, ['arma_ravvicinata', 'armatura']);
  assert.deepEqual(o.cataloghi, ['Commerciale']);
  assert.ok(o.famiglie.includes('Armi da pugno'));
  assert.deepEqual(o.profili.map((p) => p.nome), ['Spada leggera', 'Stocco', 'Spada lunga', 'Spada bastarda', 'Spadone']);
  assert.deepEqual(cercaNelCatalogo(dati, 'alabarda').map((x) => x.rif), ['armi:arma-inastata-pesante']);
  assert.deepEqual(cercaNelCatalogo(dati, 'sciabola').map((x) => x.rif), ['armi:spada-leggera']);
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

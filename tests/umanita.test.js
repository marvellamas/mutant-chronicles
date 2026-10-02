// Umanità (Giocatore §5.21) e impianti cibernetici (Equipaggiamento 0.5, cap. 7): registro delle
// installazioni, fasce, effetti su PM, sintonizzazione e PS di Magia contro la Corruzione, effetti degli
// impianti con la loro provenienza, migrazione dei file. Ipotesi in docs/ricognizione-cibernetica.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcolaScheda } from '../src/calc.js';
import { calcolaEquipaggiamento } from '../src/equipaggiamento.js';
import { normalizza, serializza, deserializzaPersonaggio, VERSIONE_FORMATO } from '../src/character.js';
import { umanita, fasciaUmanita, annullaPerdita, aggiungiRecupero } from '../src/umanita.js';
import { calcolaCarico } from '../src/carico.js';
import { applicaCondizioni } from '../src/condizioni.js';
import { inizializzaSessione, massimiSessione } from '../src/sessione.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const leggi = (f) => deserializzaPersonaggio(readFileSync(new URL(`collaudo/${f}`, import.meta.url), 'utf8'));
const B = leggi('b_fratellanza_arcanista_l12.json');
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
/** Creazione di b con le voci aggiunte, passata per normalizza come al caricamento o a una modifica. */
const conVoci = (voci, base = B.creazione) => normalizza({ ...base, equipaggiamento: [...base.equipaggiamento, ...voci] }, dati).scelte;
const schedaB = (c) => calcolaScheda({ creazione: c, livelli: B.livelli }, dati);
const riposoB = schedaB(normalizza(B.creazione, dati).scelte);

test('regole: fasce del §5.21 senza buchi, da 0 a 20', () => {
  assert.deepEqual([20, 19, 18, 15, 12, 9, 6, 3, 0].map((v) => fasciaUmanita(v, dati).condizione),
    ['Umano', 'Umano', 'Potenziato', 'Potenziato', 'Cyborg', 'Cyborg', 'Transumano', 'Transumano', 'Macchina']);
  assert.deepEqual(fasciaUmanita(4, dati), { min: 4, max: 6, condizione: 'Transumano', pm_massimi: -8, ps_magia_corruzione: -5, sintonizzazione: -6 });
});

test('un impianto installato riduce l’Umanità, con la provenienza; toglierlo non la restituisce (§7.1)', () => {
  const c = conVoci([voce('br', 'impianti:braccio-potenziato', 'installato')]);
  assert.deepEqual(c.umanita, { perdite: [{ uid: 'br', rif: 'impianti:braccio-potenziato', nome: 'Braccio potenziato', umn: 6 }], recuperi: [] });
  let u = umanita(c, dati);
  assert.deepEqual([u.valore, u.condizione, u.perduta], [14, 'Potenziato', 6]);
  assert.deepEqual(u.provenienza.righe.map((r) => [r.fonte, r.valore]), [['Partenza', 20], ['Braccio potenziato', -6]]);
  assert.match(u.provenienza.righe[1].nota, /installato/);
  // tolto (nello zaino): la perdita resta, una sola volta; reinstallato: non si conta di nuovo
  const tolto = normalizza({ ...c, equipaggiamento: c.equipaggiamento.map((v) => (v.uid === 'br' ? { ...v, stato: 'zaino' } : v)) }, dati).scelte;
  u = umanita(tolto, dati);
  assert.equal(u.valore, 14);
  assert.match(u.provenienza.righe[1].nota, /la perdita resta/);
  const di_nuovo = normalizza({ ...tolto, equipaggiamento: tolto.equipaggiamento.map((v) => (v.uid === 'br' ? { ...v, stato: 'installato' } : v)) }, dati).scelte;
  assert.equal(umanita(di_nuovo, dati).valore, 14);
  // fuori dall'inventario: resta; registrata per errore: si annulla
  const via = normalizza({ ...c, equipaggiamento: c.equipaggiamento.filter((v) => v.uid !== 'br') }, dati).scelte;
  assert.equal(umanita(via, dati).valore, 14);
  assert.equal(annullaPerdita(via.umanita, 'br'), null);
  // CYBERTRONIC: metà UMN; nello zaino (comprato, non installato): nessuna perdita
  assert.equal(umanita(conVoci([voce('bc', 'impianti:braccio-potenziato-cybertronic', 'installato')]), dati).valore, 17);
  assert.equal(conVoci([voce('bz', 'impianti:braccio-potenziato', 'zaino')]).umanita, null);
  // recupero concesso dal Direttore (A.70): sale, fino a 20
  const rec = { ...c, umanita: aggiungiRecupero(c.umanita, 10, 'procedura') };
  u = umanita(rec, dati);
  assert.equal(u.valore, 20);
  assert.deepEqual(u.provenienza.righe.at(-1), { fonte: 'massimo 20', valore: -4, nota: 'Giocatore §5.21' });
});

test('fasce del §5.21: sintonizzazione, PM Massimi e PS di Magia contro la Corruzione', () => {
  assert.deepEqual([riposoB.pm, riposoB.equipaggiamento.sintonizzazione.capacita, riposoB.umanita.valore], [41, 11, 20]);
  // UMN 14 (Potenziato): PM −1, sintonizzazione −1, PS Magia contro la Corruzione −2
  let s = schedaB(conVoci([voce('br', 'impianti:braccio-potenziato', 'installato')]));
  assert.deepEqual([s.umanita.valore, s.pm, s.pmUmanita, s.equipaggiamento.sintonizzazione.capacita], [14, 40, -1, 10]);
  assert.deepEqual(s.equipaggiamento.sintonizzazione.provenienza.righe.map((r) => [r.fonte, r.valore]), [['4 Gradi complessivi', 11], ['Umanità 14 (Potenziato)', -1]]);
  const ps = s.equipaggiamento.effettiOggetti.find((e) => e.umanita);
  assert.deepEqual([ps.salvezza, ps.valore, ps.uso, ps.oggetto], ['magia', -2, 'contro la Corruzione', 'Umanità 14 (Potenziato)']);
  // la Salvezza di Magia ordinaria non cambia
  assert.equal(s.salvezze.magia.totale, riposoB.salvezze.magia.totale);
  // UMN 4 (Transumano): sintonizzazione 11 − 6 = 5, sopra le sintonie in corso (4): nessun avviso
  s = schedaB(conVoci([voce('br', 'impianti:braccio-potenziato', 'installato'), voce('ga', 'impianti:gambe-potenziate-in-coppia', 'installato')]));
  assert.deepEqual([s.umanita.valore, s.equipaggiamento.sintonizzazione.capacita, s.pm], [4, 5, 33]);
  assert.ok(!s.equipaggiamento.avvisi.some((a) => /Sintonizzazioni oltre la capacità/.test(a)));
  // UMN 0 (Macchina): sintonizzazione 11 − 10 = 1, PM −20, niente Risorse Interiori
  s = schedaB(conVoci([voce('g1', 'impianti:gambe-potenziate-in-coppia', 'installato'), voce('g2', 'impianti:gambe-potenziate-in-coppia', 'installato')]));
  assert.deepEqual([s.umanita.valore, s.umanita.condizione, s.equipaggiamento.sintonizzazione.capacita, s.pm, s.umanita.risorseInteriori], [0, 'Macchina', 1, 21, false]);
  assert.ok(s.annotazioni.some((a) => /non può utilizzare Risorse Interiori/.test(a)));
});

test('PM Massimi: la fascia non li porta sotto 1 (§5.21)', async () => {
  const { pmConUmanita } = await import('../src/umanita.js');
  assert.deepEqual(pmConUmanita(9, { modificatori: { pm: -20 }, pmMinimo: 1 }), { pm: 1, riduzione: -8 });
  assert.deepEqual(pmConUmanita(0, { modificatori: { pm: -2 }, pmMinimo: 1 }), { pm: 0, riduzione: 0 });
  assert.deepEqual(pmConUmanita(null, { modificatori: { pm: -2 }, pmMinimo: 1 }), { pm: null, riduzione: 0 });
});

test('effetti degli impianti sulle Abilità e sugli altri valori, con i benefici equivalenti che non si sommano', () => {
  const agente = (voci) => calcolaScheda({ creazione: normalizza({ ...MISHIMA_AGENTE, equipaggiamento: voci }, dati).scelte, livelli: [] }, dati);
  const base = agente([]);
  const difese = (s) => s.abilita.find((a) => a.nome === 'Difese');
  // Coordinatore difensivo: +1 Difese generale, con la riga dell'impianto
  let s = agente([voce('cd', 'impianti:coordinatore-difensivo', 'installato')]);
  assert.equal(difese(s).vaEquip, difese(base).vaEquip + 1);
  assert.ok(difese(s).componentiEquip.some((c) => c.etichetta === 'Coordinatore difensivo' && c.valore === 1));
  // con un elmetto con Assistenza difensiva: +1, non +2 (§7.1, «Cumulo»)
  s = agente([voce('cd', 'impianti:coordinatore-difensivo', 'installato'), voce('el', 'elmetti:elmetto-wacht', 'indossata')]);
  const soloElmetto = agente([voce('el', 'elmetti:elmetto-wacht', 'indossata')]);
  assert.equal(difese(s).vaEquip, difese(soloElmetto).vaEquip);
  assert.equal(s.equipaggiamento.effettiOggetti.filter((e) => e.beneficio === 'assistenza_difensiva').length, 1);
  // nello zaino: nessun effetto
  s = agente([voce('cd', 'impianti:coordinatore-difensivo', 'zaino')]);
  assert.equal(difese(s).vaEquip, difese(base).vaEquip);
  // Acceleratore dei riflessi: +1 Iniziativa; Rinforzo sottocutaneo: +1 AR anche senza armatura
  s = agente([voce('ac', 'impianti:acceleratore-dei-riflessi', 'installato'), voce('rs', 'impianti:rinforzo-sottocutaneo', 'installato')]);
  assert.deepEqual(s.equipaggiamento.iniziativa, [{ etichetta: 'Acceleratore dei riflessi', valore: 1 }]);
  assert.equal(s.equipaggiamento.ar.totale, base.equipaggiamento.ar.totale + 1);
  // Gambe potenziate: +1 Q al Movimento al tavolo, con la riga dell'impianto
  s = agente([voce('ga', 'impianti:gambe-potenziate-in-coppia', 'installato')]);
  const t = applicaCondizioni(s, inizializzaSessione(massimiSessione(s, MISHIMA_AGENTE, dati)), dati);
  assert.equal(t.tavolo.movimento.passo.effettivo, base.movimento.passo + 1);
  assert.ok(t.tavolo.movimento.passo.provenienza.righe.some((r) => r.fonte === 'Gambe potenziate in coppia' && r.valore === 1));
  // Potenziamento visivo: +2 Percezione situazionale (interruttore al tavolo)
  s = agente([voce('pv', 'impianti:potenziamento-visivo', 'installato')]);
  assert.ok(s.equipaggiamento.effettiOggetti.some((e) => e.abilita === 'Percezione' && e.valore === 2 && e.ambito === 'situazionale'));
});

test('chip del Processore: contano solo con il Processore installato, uno alla volta (§7.10)', () => {
  const agente = (voci) => calcolaScheda({ creazione: normalizza({ ...MISHIMA_AGENTE, equipaggiamento: voci }, dati).scelte, livelli: [] }, dati);
  const chip = voce('ch', 'impianti:chip-competenza-avanzata-medicina', 'in_uso');
  let s = agente([chip]);
  assert.equal(s.equipaggiamento.effettiOggetti.filter((e) => e.uid === 'ch').length, 0);
  assert.ok(s.equipaggiamento.avvisi.some((a) => /senza un Processore neurale di Abilità installato/.test(a)));
  s = agente([chip, voce('pr', 'impianti:processore-neurale-di-abilita', 'installato')]);
  assert.deepEqual(s.equipaggiamento.effettiOggetti.filter((e) => e.uid === 'ch').map((e) => [e.abilita, e.valore, e.ambito]), [['Medicina', 4, 'situazionale']]);
  assert.equal(s.umanita.valore, 16);
  s = agente([chip, voce('c2', 'impianti:chip-assistenza-scienza', 'in_uso'), voce('pr', 'impianti:processore-neurale-di-abilita', 'installato')]);
  assert.ok(s.equipaggiamento.avvisi.some((a) => /Il Processore ne attiva uno alla volta/.test(a)));
});

test('Integrità: gli impianti hanno PI tracciati (Equipaggiamento §7.2); le gambe in coppia una riga da 10 (H6)', () => {
  const c = normalizza({ ...MISHIMA_AGENTE, equipaggiamento: [voce('br', 'impianti:braccio-potenziato', 'installato'), voce('ga', 'impianti:gambe-potenziate-in-coppia', 'installato')] }, dati).scelte;
  const s = calcolaScheda({ creazione: c, livelli: [] }, dati);
  assert.deepEqual(massimiSessione(s, c, dati).integrita, { br: 8, ga: 10 });
});

test('carico: l’impianto installato non pesa; lo stesso impianto nello zaino resta da pesare', () => {
  const agente = (voci) => calcolaScheda({ creazione: normalizza({ ...MISHIMA_AGENTE, equipaggiamento: voci }, dati).scelte, livelli: [] }, dati);
  const s1 = agente([voce('br', 'impianti:braccio-sostitutivo', 'installato')]);
  assert.deepEqual(calcolaCarico(s1, null, dati).senzaPeso, []);
  const s2 = agente([voce('br', 'impianti:braccio-sostitutivo', 'zaino')]);
  assert.deepEqual(calcolaCarico(s2, null, dati).senzaPeso, ['Braccio sostitutivo']);
});

test(`formato ${VERSIONE_FORMATO}: Umanità nel file; l’Interfaccia neurale «in uso» di prima diventa l’impianto installato`, () => {
  assert.equal(VERSIONE_FORMATO, 8);
  // file del formato 7 con l'Interfaccia degli Armamenti in uso
  const vecchio = JSON.parse(readFileSync(new URL('collaudo/c_freelance_tecnico_l5.json', import.meta.url), 'utf8'));
  vecchio.versione = 7;
  vecchio.scelte.equipaggiamento.push(voce('sin', 'corredi_dispositivi:interfaccia-neurale-cybertronic', 'in_uso'));
  const p = deserializzaPersonaggio(JSON.stringify(vecchio));
  const { scelte, avvisi } = normalizza(p.creazione, dati);
  assert.deepEqual(avvisi, []);
  assert.deepEqual(scelte.equipaggiamento.at(-1), voce('sin', 'impianti:interfaccia-neurale-cybertronic', 'installato'));
  assert.deepEqual(scelte.umanita.perdite, [{ uid: 'sin', rif: 'impianti:interfaccia-neurale-cybertronic', nome: 'Interfaccia neurale CYBERTRONIC', umn: 1 }]);
  assert.equal(umanita(scelte, dati).valore, 19);
  const testo = serializza(scelte, { livelli: p.livelli, sessione: p.sessione });
  const file = JSON.parse(testo);
  assert.equal(file.versione, 8);
  assert.deepEqual(file.scelte.umanita, scelte.umanita);
  // riletto: stessa Umanità, nessuna perdita doppia
  const riletto = normalizza(deserializzaPersonaggio(testo).creazione, dati).scelte;
  assert.deepEqual(riletto.umanita, scelte.umanita);
});

test('SS: foglio Cibernetica solo con impianti installati o Umanità ridotta, dopo Artefatti', async () => {
  const { preparaStampa } = await import('../src/stampa.js');
  // senza impianti: nessun foglio (c, b, Lucas)
  for (const f of ['c_freelance_tecnico_l5.json', 'b_fratellanza_arcanista_l12.json', 'Lucas_liv6_2026-09-28 (2).json']) {
    const p = leggi(f);
    assert.ok(!preparaStampa({ creazione: normalizza(p.creazione, dati).scelte, livelli: p.livelli }, dati).fogli.some((x) => x.id === 'cibernetica'), f);
  }
  // personaggio di prova del collaudo PDF (docs/esempi-stampa): UMN 2, Transumano
  const d = deserializzaPersonaggio(readFileSync(new URL('../docs/esempi-stampa/d_freelance_cibernetica_l5.json', import.meta.url), 'utf8'));
  const st = preparaStampa({ creazione: normalizza(d.creazione, dati).scelte, livelli: d.livelli }, dati);
  // d è una copia di c con Risorse Interiori: il foglio Poteri (Tecniche) viene prima di Cibernetica
  assert.deepEqual(st.fogli.map((f) => [f.id, f.numero]).slice(-3), [['inventario', 4], ['poteri', 5], ['cibernetica', 6]]);
  const cib = st.fogli.find((f) => f.id === 'cibernetica').dati;
  assert.deepEqual([cib.umanita.valore, cib.umanita.perduta, cib.umanita.condizione, cib.foglioInventario], [2, 18, 'Transumano', 4]);
  assert.deepEqual(cib.umanita.fasce.filter((f) => f.attuale).map((f) => [f.umn, f.perduti]), [['3–1', '17–19']]);
  assert.equal(cib.gruppi.flatMap((g) => g.schede).length, 6);
  assert.deepEqual(cib.gruppi.find((g) => g.famiglia === 'Processore neurale di Abilità').schede[0].chip, [
    { nome: 'Chip Competenza avanzata: Tecnologia', inserito: true }, { nome: 'Chip Assistenza: Percezione', inserito: false }]);
  assert.deepEqual(cib.perdite.at(-1), { nome: 'Gamba sostitutiva', umn: 2, stato: 'tolto' });
  // Umanità ridotta senza impianti installati (tutti tolti): il foglio c'è ancora
  const tolti = normalizza({ ...d.creazione, equipaggiamento: d.creazione.equipaggiamento.map((v) => (v.stato === 'installato' ? { ...v, stato: 'zaino' } : v)) }, dati).scelte;
  const st2 = preparaStampa({ creazione: tolti, livelli: d.livelli }, dati);
  assert.deepEqual(st2.fogli.find((f) => f.id === 'cibernetica').dati.gruppi, []);
});

test('personaggi senza impianti: c, b e Lucas invariati, nessun campo Umanità nel file', () => {
  for (const f of ['c_freelance_tecnico_l5.json', 'b_fratellanza_arcanista_l12.json', 'Lucas_liv6_2026-09-28 (2).json']) {
    const p = leggi(f);
    const { scelte } = normalizza(p.creazione, dati);
    assert.equal(scelte.umanita, null, f);
    assert.ok(!('umanita' in JSON.parse(serializza(scelte, { livelli: p.livelli })).scelte), f);
    const s = calcolaScheda({ creazione: scelte, livelli: p.livelli }, dati);
    assert.deepEqual([s.umanita.valore, s.umanita.condizione, s.pmUmanita], [20, 'Umano', 0], f);
    assert.ok(!s.equipaggiamento.effettiOggetti.some((e) => e.umanita), f);
    assert.equal(s.equipaggiamento.sintonizzazione?.umanita ?? 0, 0, f);
  }
});

test('§5.21, esempio del Doc del 02/10: UMN 8 al I Grado porta la capacità da 8 a 4 (Architetto da 10 a 6); al VI Grado un Tecnomante con UMN 0 conserva 5', () => {
  const s = calcolaScheda({ creazione: MISHIMA_AGENTE, livelli: [] }, dati);
  // la fascia di Umanità come la costruisce src/umanita.js (modificatori della fascia, minimo 0)
  const conUmn = (valore) => ({ valore, condizione: fasciaUmanita(valore, dati).condizione, modificatori: { sintonizzazione: fasciaUmanita(valore, dati).sintonizzazione }, sintonizzazioneMinimo: dati.regole.umanita.sintonizzazione_minimo ?? 0 });
  const art = [voce('b', 'artefatti:batteria-da-5-pm-chroma-verde', null, { sintonizzato: true })];
  const cap = (gradiComplessivi, talenti, valore) => calcolaEquipaggiamento({ caratteristiche: s.caratteristiche, abilita: s.abilita, specializzazioni: [], gradiComplessivi, talenti, umanita: conUmn(valore) }, art, dati).sintonizzazione.capacita;
  assert.deepEqual([cap(1, [], 8), cap(1, ['Architetto TecnoMistico'], 8), cap(6, ['Architetto TecnoMistico'], 0)], [4, 6, 5]);
  // fino a un minimo di 0: I Grado, UMN 0 (8 − 10)
  assert.equal(cap(1, [], 0), 0);
  // l'esempio del manuale è nei dati (tools/lotti/lotto_sintonizzazione_0210.mjs)
  const art2 = JSON.parse(readFileSync(new URL('../data/equipaggiamento/artefatti.json', import.meta.url), 'utf8'));
  assert.match(art2.sintonizzazione.esempio_umanita, /da 8 a 4.*da 10 a 6.*13 \+ 2 − 10/);
});

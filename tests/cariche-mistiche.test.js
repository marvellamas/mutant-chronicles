// Lotto 171 (04/11/2026): la revisione «Cariche Mistiche» approvata da Davide il 02/11/2026 e le risposte A.232, A.234,
// A.236, A.237. «Le riserve dedicate ai soli effetti di armi e oggetti si chiamano Cariche Mistiche (CM), con contatore
// CM attuali/CM massime: non alimentano Incantesimi e non sono prelevabili come PM personali. Il nome non cambia le
// cariche tecnologiche NEC, CEC, MEC o BEC.»
import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contesto, resa, dati } from './scheda-aiuti.js';
import { calcolaScheda } from '../src/calc.js';
import { deserializzaPersonaggio, normalizza } from '../src/character.js';
import {
  massimiSessione, inizializzaSessione, allineaSessione, attivaArtefatto, usaArtefatto, attivaArmaSessione, modificaSessione,
} from '../src/sessione.js';
import { contenitori, normalizzaEquipaggiamento } from '../src/equipaggiamento.js';
import { contenitoriLancio } from '../src/lancio.js';
import { pianoMedita, applicaMedita } from '../src/medita.js';
import { pmPerGruppo, numeroRiserva } from '../src/cariche-mistiche.js';
import { profiloSenzArmi } from '../src/attacco.js';
import { pianoGetto } from '../src/getti-artefatto.js';
import { usoPerClasse, testoAttivazione, classiDi } from '../src/attivazione-arma.js';
import { validaDati } from '../src/validate.js';

const RIF_G = 'artefatti:guanti-da-combattimento-mistico';
const FILE_LUCAS = new URL('./fixtures/talenti-vecchi/LUCAS_liv6_2026-10-20.json', import.meta.url);
const FILE_DIMITRI = new URL('./fixtures/talenti-vecchi/Dimitri-Orlav_liv6_2026-10-04.json', import.meta.url);
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', sintonizzato: true, ...extra });
const G = dati.equipaggiamento.file.artefatti.oggetti.find((o) => o.id === 'guanti-da-combattimento-mistico');

/** Un PG da un file di prova, con l'equipaggiamento e la sessione cambiati a piacere. */
function pg(file, { equip = (e) => e, sessione = (s) => s } = {}) {
  const p = deserializzaPersonaggio(readFileSync(file, 'utf8'));
  const creazione = normalizza(p.creazione, dati).scelte;
  creazione.equipaggiamento = equip(creazione.equipaggiamento ?? []);
  const base = { creazione, livelli: p.livelli };
  const m = massimiSessione(calcolaScheda(base, dati), creazione, dati);
  const s = allineaSessione(sessione(p.sessione ?? inizializzaSessione(m)), m);
  return { ...base, sessione: s, m, scheda: calcolaScheda({ ...base, sessione: s }, dati) };
}
const uidDi = (x, rif) => x.creazione.equipaggiamento.find((v) => v.rif === rif)?.uid;

test('dati: quali riserve passano alle CM, quali restano in PM; il validatore lo controlla', () => {
  assert.deepEqual(validaDati(dati), []);
  const CM = dati.regole.chroma.cariche_mistiche;
  assert.deepEqual([CM.sigla, CM.ricarica.fattore, CM.ricarica.gruppo_cm], ['CM', 2, 1]);
  const art = dati.equipaggiamento.file.artefatti;
  const tutti = [
    ...art.oggetti.filter((o) => o.artefatto?.contenitore).map((o) => [`artefatti:${o.id}`, o.artefatto.contenitore]),
    ...art.artefatti_catalogo.filter((a) => a.contenitore).map((a) => [a.rif, a.contenitore]),
  ];
  const inCm = Object.fromEntries(tutti.filter(([, c]) => Number.isInteger(c.capacita_cm)).map(([r, c]) => [r, [c.capacita_cm, c.energia, c.precedente?.capacita_pm]]));
  assert.deepEqual(inCm, {
    'artefatti:guanti-da-combattimento-mistico': [6, 'Rosso', 10],
    'armi_corporative:bordone-templare': [5, 'Rosso', 5], 'armi_corporative:spada-vindicator': [5, 'Rosso', 5],
    'armi_corporative:spada-deliverer': [5, 'Rosso', 5], 'armi_corporative:lancia-castigator': [5, 'Rosso', 5],
    'armi_corporative:lama-demontooth': [5, 'Rosso', 5], 'scudi:scudo-delle-guardie-sacre': [5, 'Rosso', 5],
    'armi:cyberarma-batteria-verde': [5, 'Verde', 10],
    // lotto 173: l'Anello con Rigenerazione 9 nasce in CM (configurazione del 02/11/2026), senza una capacità di prima
    'artefatti:anello-di-rigenerazione-9': [5, 'Verde', undefined],
  });
  // le Batterie Mistiche (anche la Pietra della Vigilanza, Batteria Universale), le Matrice e le Schegge restano in PM
  const pietra = art.oggetti.find((o) => o.id === 'pietra-della-vigilanza').artefatto.contenitore;
  assert.deepEqual([pietra.capacita_pm, pietra.capacita_cm], [10, undefined]);
  assert.ok(tutti.filter(([r]) => !inCm[r]).every(([, c]) => Number.isInteger(c.capacita_pm) && c.capacita_cm === undefined));
  // un contenitore con tutte e due le unità, o CM non dedicate all'oggetto, è un errore con file e chiave
  const rotti = structuredClone(dati);
  rotti.equipaggiamento.file.artefatti.oggetti.find((o) => o.id === 'guanti-da-combattimento-mistico').artefatto.contenitore.capacita_pm = 10;
  rotti.equipaggiamento.file.artefatti.artefatti_catalogo.find((a) => a.rif === 'armi:cyberarma-batteria-verde').contenitore.riserva = 'batteria';
  const e = validaDati(rotti).map((x) => `${x.chiave}: ${x.problema}`).join('\n');
  assert.match(e, /contenitore: serve capacita_pm \(Batteria, in PM\) oppure capacita_cm/);
  assert.match(e, /le Cariche Mistiche sono riserve integrate, a Cariche ed Esclusive/);
});

test('i Guanti con le CM: usati fino a scaricarli (Pugno 1, Getto 3, Doppio 6) e ricaricati: 6 PM per CM a 3:1', () => {
  const lu = pg(FILE_LUCAS);
  const uid = uidDi(lu, RIF_G);
  assert.deepEqual([lu.sessione.chroma[uid].pmAttuali, lu.sessione.chroma[uid].unita], [6, 'CM'], 'i 10 PM su 10 di prima sono 6 CM su 6');
  // un Getto (3), due Pugni (1 + 1): resta 1 CM; il Doppio getto non basta più (avviso, non blocco)
  let s = usaArtefatto(lu.sessione, uid, 3, lu.m);
  s = attivaArtefatto(s, uid, 1, lu.m);
  s = attivaArtefatto(s, uid, 1, lu.m);
  assert.equal(s.chroma[uid].pmAttuali, 1);
  assert.equal(s.pmAttuali, lu.sessione.pmAttuali, 'i PM personali non si toccano');
  const doppio = G.getti_artefatto.find((g) => g.id === 'doppio-getto');
  assert.ok(pianoGetto(doppio, lu.scheda, { pm: 1, sintonizzato: true, indossato: true }).motivi.some((m) => /la riserva ha 1 CM, ne servono 6/.test(m)));
  s = attivaArtefatto(s, uid, 1, lu.m);
  assert.equal(s.chroma[uid].pmAttuali, 0, 'scarichi');
  // ricarica: «Ricarica e medita», ogni CM costa rapporto × 2 PM personali (revisione, Armamenti 0.74)
  const c = lu.scheda.equipaggiamento.contenitori.find((x) => x.uid === uid);
  assert.equal(pmPerGruppo(c, 3, dati), 6);
  assert.equal(pmPerGruppo(lu.scheda.equipaggiamento.contenitori.find((x) => x.unita === 'PM'), 3, dati), 3, 'il ×2 non vale per le Batterie in PM');
  const conPm = modificaSessione(s, { pmAttuali: 20 }, lu.m);
  const scheda = calcolaScheda({ creazione: lu.creazione, livelli: lu.livelli, sessione: conPm }, dati);
  const piano = pianoMedita({ scheda, sessione: conPm, massimi: lu.m }, { modo: 'breve', ore: 0, destinazione: uid, gruppi: 2, esito: 'successo' }, dati);
  const rapporto = piano.conversione.rapporto;
  assert.deepEqual([piano.conversione.unita, piano.conversione.pmPerGruppo, piano.conversione.spesa, piano.finale.cristallo], ['CM', rapporto * 2, 2 * rapporto * 2, 2]);
  const dopo = applicaMedita(conPm, piano, lu.m);
  assert.deepEqual([dopo.chroma[uid].pmAttuali, dopo.pmAttuali], [2, 20 - 2 * rapporto * 2]);
  // si ripristina solo quanto manca: da vuota, a 3:1, 6 CM costano 36 PM
  assert.equal(6 * pmPerGruppo(c, 3, dati), 36);
});

test('la batteria della CyberArma: 5 CM esclusive, 1 CM per 10 Round, l’alternativa dei PM personali (A.236)', () => {
  const vb = voce('cb', 'armi:cyberarma-batteria-verde', 'impugnata');
  const di = pg(FILE_DIMITRI, { equip: (e) => [...e, vb] });
  const c = di.scheda.equipaggiamento.contenitori.find((x) => x.uid === 'cb');
  assert.deepEqual([c.unita, c.capacita, c.energia, c.riserva, c.alimentazione, c.fontePg], ['CM', 5, 'Verde', 'cariche', 'esclusiva', false]);
  // non paga Incantesimi (A.236): non è fra le fonti di «Lancia!»
  const inc = dati.incantesimi.incantesimi.find((i) => i.macrofamiglia === 'Spirituale');
  assert.ok(!contenitoriLancio({ scheda: di.scheda, sessione: di.sessione }, inc).some((x) => x.uid === 'cb'));
  // cinque attivazioni complete, poi la riserva è vuota; i PM personali restano
  const uso = usoPerClasse(dati.equipaggiamento.file.armi.oggetti.find((o) => o.id === 'cyberarma-batteria-verde'), classiDi(di.scheda));
  assert.deepEqual([uso.classe, uso.cm, uso.pm, uso.round], ['Tecnomante', 1, 2, 10]);
  let s = { ...di.sessione, round: 1 };
  for (let i = 0; i < 5; i++) { s = attivaArmaSessione({ ...s, attivazioniArmi: {} }, 'cb', uso, di.m); assert.ok(s, `attivazione ${i + 1}`); }
  assert.deepEqual([s.chroma.cb.pmAttuali, s.pmAttuali], [0, di.sessione.pmAttuali]);
  assert.equal(attivaArmaSessione({ ...s, attivazioniArmi: {} }, 'cb', uso, di.m), null, 'la sesta non c’è: avviso e «Procedi comunque»');
  // l'alternativa: 2 PM personali, la riserva non si tocca
  const conPm = attivaArmaSessione({ ...s, attivazioniArmi: {} }, 'cb', { ...uso, conPm: true }, di.m);
  assert.deepEqual([conPm.pmAttuali, conPm.chroma.cb.pmAttuali], [di.sessione.pmAttuali - 2, 0]);
  const t = testoAttivazione({ uso_per_classe: uso ? dati.equipaggiamento.file.armi.oggetti.find((o) => o.id === 'cyberarma-batteria-verde').uso_per_classe : null }, di.scheda, di.sessione, 'cb');
  assert.deepEqual([t.costo, t.alternativaPm], ['1 CM', 2]);
  // la CyberArma che Dimitri ha (l'originale, senza batteria) non riceve una riserva: «non aggiungere una riserva dove non era installata»
  const orig = pg(FILE_DIMITRI, { equip: (e) => [...e, voce('co', 'armi:cyberarma', 'impugnata')] });
  assert.equal(orig.sessione.chroma.co, undefined);
  assert.equal(orig.scheda.equipaggiamento.contenitori.find((x) => x.uid === 'co'), undefined);
});

test('PM, cariche NEC e CM insieme: tre riserve distinte, che non si sommano e non si spendono l’una per l’altra', () => {
  const lu = pg(FILE_LUCAS, { equip: (e) => [...e, voce('n', 'nec:nec-rosso-10', 'trasportato'), voce('cn', 'armi:cyberarma-nec', 'trasportato')] });
  const uid = uidDi(lu, RIF_G);
  const senzaGuanti = pg(FILE_LUCAS, { equip: (e) => e.filter((v) => v.rif !== RIF_G) });
  // i PM massimi del personaggio non contano le CM dei Guanti
  assert.equal(lu.m.pm, senzaGuanti.m.pm);
  assert.equal(lu.scheda.pm, senzaGuanti.scheda.pm);
  // le CM non sono nei contatori dei NEC, e i NEC non sono contenitori di Chroma
  assert.ok(!Object.keys(lu.m.nec).some((k) => k.startsWith(uid)));
  assert.ok(!lu.scheda.equipaggiamento.contenitori.some((c) => c.uid === 'n' || c.uid === 'cn'));
  assert.ok(Object.keys(lu.m.nec).some((k) => k.startsWith('n')), 'il NEC Rosso ha il suo contatore in cariche');
  // nessuna fonte di «Lancia!» in CM; spendere CM non tocca PM né NEC
  for (const inc of dati.incantesimi.incantesimi) assert.ok(!contenitoriLancio({ scheda: lu.scheda, sessione: lu.sessione }, inc).some((x) => x.uid === uid), inc.nome);
  const s = attivaArtefatto(lu.sessione, uid, 1, lu.m);
  assert.deepEqual([s.pmAttuali, JSON.stringify(s.nec)], [lu.sessione.pmAttuali, JSON.stringify(lu.sessione.nec)]);
  // la scheda le legge distinte: «Artefatti con PM» e «Cariche Mistiche (CM) degli oggetti», con l'unità accanto al numero
  const ctx = contesto('Aiko-Tenzan_liv5_2026-10-02.json', { attiva: 'artefatti', scelte: (c) => ({ ...c, equipaggiamento: [...c.equipaggiamento, voce('g', RIF_G, 'indossata'), voce('b', 'artefatti:batteria-da-10-pm-chroma-rosso', 'trasportato'), voce('n', 'nec:nec-rosso-10', 'trasportato')] }) });
  const t = resa(ctx).testo();
  assert.match(t, /Artefatti con PM/);
  assert.match(t, /Cariche Mistiche \(CM\) degli oggetti/);
  assert.match(t, /6 \/ 6 CM/);
  assert.match(t, /10 \/ 10(?! CM)/);
});

test('A.193 e A.252: una riserva salvata prima si converte una volta sola e sale all’intero superiore; senza la capacità di prima resta «da convertire»', () => {
  const lu = pg(FILE_LUCAS);
  const uid = uidDi(lu, RIF_G);
  // 7 PM su 10 → 4,2 CM su 6 → 5 CM (A.252: intero superiore, una volta sola); il valore di prima resta nel file
  const s = allineaSessione({ ...lu.sessione, chroma: { ...lu.sessione.chroma, [uid]: { pmAttuali: 7 } } }, lu.m);
  assert.deepEqual(s.chroma[uid], { pmAttuali: 5, unita: 'CM', prima: { pmAttuali: 7, capacita: 10, unita: 'PM', cm_esatte: 4.2 } });
  assert.equal(numeroRiserva(s.chroma[uid].pmAttuali), '5');
  // alla seconda apertura non si riconverte e non sale di nuovo
  assert.deepEqual(allineaSessione(s, lu.m).chroma[uid], s.chroma[uid]);
  // 1 PM su 10 → 0,6 CM → 1 CM
  assert.equal(allineaSessione({ ...lu.sessione, chroma: { [uid]: { pmAttuali: 1 } } }, lu.m).chroma[uid].pmAttuali, 1);
  // senza la capacità di prima la corrispondenza non è certa: «da convertire», a 0, con il valore di prima conservato
  const senza = structuredClone(lu.m);
  senza.contenitoriCm[uid].precedente = null;
  const d = allineaSessione({ ...lu.sessione, chroma: { [uid]: { pmAttuali: 7 } } }, senza);
  assert.deepEqual(d.chroma[uid], { pmAttuali: 0, unita: 'CM', daConvertire: true, prima: { pmAttuali: 7, unita: 'PM' } });
  // un contenitore nuovo parte pieno, in CM
  assert.deepEqual(allineaSessione({ ...lu.sessione, chroma: {} }, lu.m).chroma[uid], { pmAttuali: 6, unita: 'CM' });
});

test('A.232: ai pugni con i Guanti, Combattimento Senz’Armi oppure Armi da Pugno: un solo +1 VA e +1 danno, mai due', () => {
  const lu = pg(FILE_LUCAS);
  const spec = (id) => dati.specializzazioni.specializzazioni.find((x) => x.id === id);
  const SA = spec('specializzazione-combattimento-senz-armi');
  const AP = spec('specializzazione-armi-da-pugno');
  const con = (scheda, lista) => profiloSenzArmi({ ...scheda, specializzazioni: lista }, dati);
  const base = con(lu.scheda, []);
  const n = (x) => Number(String(x.danno?.una_mano ?? x.danno).match(/[+](\d+)$/)?.[1] ?? 0);
  for (const [lista, nome] of [[[SA], 'solo Senz’Armi'], [[AP], 'solo Armi da Pugno'], [[SA, AP], 'tutte e due'], [[AP, SA], 'tutte e due, ordine inverso']]) {
    const p = con(lu.scheda, lista);
    assert.equal(p.vaEffettivo - base.vaEffettivo, 1, `${nome}: +1 VA`);
    assert.equal(n(p) - n(base), 1, `${nome}: +1 danno`);
  }
  // senza Guanti, Armi da Pugno non vale per i pugni; Combattimento Senz’Armi sì
  const nudo = pg(FILE_LUCAS, { equip: (e) => e.filter((v) => v.rif !== RIF_G) });
  const b0 = con(nudo.scheda, []);
  assert.equal(con(nudo.scheda, [AP]).vaEffettivo - b0.vaEffettivo, 0);
  assert.equal(con(nudo.scheda, [SA]).vaEffettivo - b0.vaEffettivo, 1);
  // non migliorano i getti
  const getto = G.getti_artefatto.find((g) => g.id === 'getto-di-fuoco');
  assert.equal(pianoGetto(getto, { ...lu.scheda, specializzazioni: [SA, AP] }, { pm: 6, sintonizzato: true, indossato: true }).danni[0], getto.danno);
  // il commento provvisorio non c'è più nel codice
  assert.doesNotMatch(readFileSync(new URL('../src/attacco.js', import.meta.url), 'utf8'), /A\.232 aperta/);
});

test('A.234: la Prova del Doppio getto è Potere −2, senza i benefici del lancio (Specializzazione Elementi)', () => {
  const lu = pg(FILE_LUCAS);
  const doppio = G.getti_artefatto.find((g) => g.id === 'doppio-getto');
  const potere = lu.scheda.abilita.find((a) => a.nome === 'Potere');
  const elementi = dati.specializzazioni.specializzazioni.find((x) => /Elementi/.test(x.nome));
  assert.ok(elementi, 'la Specializzazione Elementi è a catalogo');
  const p = pianoGetto(doppio, { ...lu.scheda, specializzazioni: [...(lu.scheda.specializzazioni ?? []), elementi] }, { pm: 6, sintonizzato: true, indossato: true });
  assert.equal(p.prova.va, (potere.effettivo ?? potere.totale) - 2);
  assert.deepEqual(p.costo, { n: 6, unita: 'CM' }, 'il costo non si riduce');
  assert.equal(doppio.cm_anche_se_fallisce, true);
});

test('A.237: la CyberArma convertita consuma una carica del NEC collegato per attivazione; la carica residua resta', () => {
  const vn = voce('cn', 'armi:cyberarma-nec', 'impugnata');
  const di = pg(FILE_DIMITRI, { equip: (e) => [...e, vn] });
  const chiave = Object.keys(di.m.nec).find((k) => k === 'cn' || k.startsWith('cn#'));
  assert.ok(chiave, 'il NEC Rosso da 10 cariche ha il suo contatore');
  assert.equal(di.m.nec[chiave], 10);
  const uso = usoPerClasse(dati.equipaggiamento.file.armi.oggetti.find((o) => o.id === 'cyberarma-nec'), classiDi(di.scheda));
  const s1 = attivaArmaSessione({ ...di.sessione, round: 1 }, 'cn', uso, di.m);
  assert.deepEqual([s1.nec[chiave], s1.pmAttuali], [9, di.sessione.pmAttuali]);
  assert.equal(s1.chroma.cn, undefined, 'nessuna CM: le cariche tecnologiche non sono energia mistica');
  // la carica residua si conserva da una sessione all'altra
  assert.equal(allineaSessione(s1, di.m).nec[chiave], 9);
  // a 0 cariche non si attiva (avviso), con «Procedi comunque» resta a 0
  const vuoto = modificaSessione(s1, { nec: { ...s1.nec, [chiave]: 0 } }, di.m);
  assert.equal(attivaArmaSessione({ ...vuoto, attivazioniArmi: {} }, 'cn', uso, di.m), null);
  assert.equal(attivaArmaSessione({ ...vuoto, attivazioniArmi: {} }, 'cn', uso, di.m, { forza: true }).nec[chiave], 0);
});

test('le CM non finiscono mai sommate ai PM: nessuna somma di PM le conta, in nessun punto del codice', () => {
  const lu = pg(FILE_LUCAS);
  const uid = uidDi(lu, RIF_G);
  // tutte le riserve del personaggio: i PM spendibili per «Lancia!» sono PM personali + fonti in PM; le CM restano fuori
  const inc = dati.incantesimi.incantesimi[0];
  const fonti = contenitoriLancio({ scheda: lu.scheda, sessione: lu.sessione }, inc);
  assert.ok(fonti.every((x) => lu.scheda.equipaggiamento.contenitori.find((c) => c.uid === x.uid)?.unita === 'PM'));
  // svuotare o riempire le CM non cambia i PM personali, né i massimi
  const vuota = usaArtefatto(lu.sessione, uid, 6, lu.m);
  assert.deepEqual([vuota.pmAttuali, massimiSessione(calcolaScheda({ creazione: lu.creazione, livelli: lu.livelli, sessione: vuota }, dati), lu.creazione, dati).pm], [lu.sessione.pmAttuali, lu.m.pm]);
  // le CM di un contenitore dedicato non sono mai «fontePg», anche se il dato lo dicesse per sbaglio
  const rotti = structuredClone(dati);
  rotti.regole.chroma.riserve.tipi.cariche.fonte_per_pg = true;
  const c = contenitori(normalizzaEquipaggiamento(lu.creazione.equipaggiamento), rotti).find((x) => x.uid === uid);
  assert.equal(c.unita, 'CM');
  assert.ok(!contenitoriLancio({ scheda: { equipaggiamento: { contenitori: [c] } }, sessione: lu.sessione }, inc).length);
});

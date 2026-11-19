import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 218, parte B: le sette risposte di Davide del 17/11/2026 (A.273–A.279), applicate.
//
//   A.273 creature a due forme      → configurazioni con ingombro e movimento
//   A.274 attacchi senza Natura     → Naturale solo se fisico e inequivocabile
//   A.275 Taglia e ingombro         → la Taglia non si deduce dall'ingombro
//   A.276 più componenti di danno   → un tiro per colpire, ogni componente per sé
//   A.277 regole comuni nei blocchi → correzione al manuale: niente da applicare nell'app
//   A.278 sei armi                  → quattro rinominate in luogo, due archiviate
//   A.279 profili assenti           → Colt Trooper, Colt Frontier, Modulo al plasma Banshee
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { preparaDanno, leggiComponente, CONFIGURAZIONI_A273 } from '../tools/importa-mostri.mjs';
import { propostaColpo } from '../src/nemico-attacco.js';
import { configurazioneAttuale, cambiaConfigurazione } from '../src/scontro.js';
import { conMovimentoDellaForma } from '../src/mappa/partecipanti.js';
import { catalogo, cercaNelCatalogo, opzioniCascata } from '../src/equipaggiamento.js';
import { calcolaScheda } from '../src/calc.js';
import { calcolaEquipaggiamento } from '../src/equipaggiamento.js';
import { validaDati, validaNemico } from '../src/validate.js';
import { datiReali } from './helpers.js';
import { MISHIMA_AGENTE } from './personaggi.js';

const { dati } = await datiReali();
const DIR = new URL('../esempi/nemici/mostri/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const schede = Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), JSON.parse(readFileSync(join(DIR, f), 'utf8'))]));

// ——— A.274 ——————————————————————————————————————————————————————————————————————————————

test('A.274: Naturale solo per gli attacchi fisici inequivocabili; il resto non si indovina', () => {
  // morso, artigli, pugno, coda, corna, armi e proiettili comuni
  for (const nome of ['Morso', 'Artiglio', 'Pugno', 'Coda', 'Corna', 'Ascia bipenne', 'Maglio a due mani', 'Giavellotto scagliato', 'Pugnale a mano']) {
    assert.equal(preparaDanno('1d6+2', nome).dannoT, '1d6+2 Naturale', nome);
  }
  // soffi, raggi, poteri, attacchi psichici o mistici: la Natura la deve dichiarare il manuale
  for (const nome of ['Soffio acido', 'Raggio oculare', 'Impatto psichico', 'Onda mentale', 'Sguardo corruttore']) {
    assert.equal(preparaDanno('2d6+3', nome).dannoT, '2d6+3', `${nome}: resta com'è, segnalato`);
  }
  // una Natura già scritta non si tocca
  assert.equal(preparaDanno('1d6+2 Magico, Fuoco', 'Morso').dannoT, '1d6+2 Magico, Fuoco');
});

// ——— A.276 ——————————————————————————————————————————————————————————————————————————————

test('A.276: due danni in sequenza sono due componenti, ciascuna con la propria Natura', () => {
  const r = preparaDanno('AC 2: 1d8+7 Magico, Taglio, poi 3d6 Magico, Fulmine', 'Spada elettrica');
  assert.equal(r.dannoT, '1d8+7 Magico, Taglio');
  assert.deepEqual(r.seguenti, [{ danno: '3d6', natura: 'Magico', proprieta: ['Fulmine'] }]);
  assert.equal(r.acDichiarata, 2);
  // Natura diversa fra le due: la Naturale e la Magica non si fondono
  const c = preparaDanno('AC 2: 1d6+3 Naturale, Perforazione, poi 1d6 Magico, Fuoco', 'Lancia una mano');
  assert.equal(c.seguenti[0].natura, 'Magico');
  assert.equal(leggiComponente('1d4 Naturale da acido').proprieta[0], 'Acido');
});

test('A.276: «componente unica» o conversione dell’intero danno alla stessa Natura → una sola mitigazione', () => {
  const r = preparaDanno('1d10+3 Perforazione + 1d4 Fuoco; tutto Naturale', 'Morso ardente');
  assert.equal(r.seguenti, null, 'una componente sola');
  assert.equal(r.dannoT, '1d10+1d4+3 Naturale, Perforazione, Fuoco');
  assert.equal(preparaDanno('1d6+5 Perforazione e 1d4 Fuoco; Naturali', 'Lancia').dannoT, '1d6+1d4+5 Naturale, Perforazione, Fuoco');
});

test('A.276: i 19 attacchi a due fasi del Bestiario sono attacchi, con le loro componenti', () => {
  const conSeguenti = Object.values(schede).flatMap((s) => (s.attacchi ?? []).filter((a) => a.seguenti?.length).map((a) => [s.id, a]));
  const nuovi = conSeguenti.filter(([id]) => id !== 'mimic');
  assert.equal(nuovi.length, 18, 'balor 2, cambion 2, deva 1, diavolo del ghiaccio 3, della fossa 1, spinato 1, flumph 1, incubo 1, planetar 1, slaad 3, solar 2');
  assert.equal(conSeguenti.length, 19, 'più il Morso del Mimic, che era già un attacco');
  // l'attacco da sola non è più fra le capacità come «VA … Danno: AC 2: … poi …»
  const rimasti = Object.values(schede).flatMap((s) => (s.capacita ?? []).filter((c) => /Danno: AC \d: .+, poi /.test(c.effetto ?? '')));
  assert.deepEqual(rimasti.map((c) => c.nome).sort(), ['Esplosione radiante'], 'resta soltanto l’area senza tiro per colpire (VA —)');
  // la Freccia abbattente del Solar è un attacco a distanza (100 Q), non una mischia con portata 100 Q
  const freccia = schede.solar.attacchi.find((a) => a.nome === 'Freccia abbattente');
  assert.equal(freccia.tipo, 'distanza');
  assert.equal(freccia.gittata_q, 100);
  assert.equal(freccia.portata_q, undefined);
  for (const [id, a] of conSeguenti) assert.equal(a.ac, 2, `${id}: ${a.nome}: l'AC dichiarata è il numero delle componenti`);
});

test('A.276: «Colpito» riceve una componente alla volta, e il Magistrale vale per la prima', () => {
  const att = { nome: 'Spada elettrica', tipo: 'ravvicinato', va: 19, danno: '1d8+7', natura: 'Magico', ac: 2, proprieta: ['Taglio'], seguenti: [{ danno: '3d6', natura: 'Magico', proprieta: ['Fulmine'] }] };
  const p = propostaColpo(att, { danno: { formula: '1d8+7', moltiplicatore: 1 }, applicazioni: 2 }, { magistrale: true });
  assert.equal(p.ac, 1, 'ogni componente è una sola applicazione');
  assert.equal(p.magistrale, true);
  assert.deepEqual(p.componente, { indice: 0, totale: 2 });
  assert.equal(p.seguenti.length, 1);
  assert.equal(p.seguenti[0].formula, '3d6');
  assert.equal(p.seguenti[0].natura, 'Magico');
  assert.deepEqual(p.seguenti[0].proprieta, ['Fulmine']);
  assert.equal(p.seguenti[0].magistrale, false, 'il raddoppio non si ripete sulla seconda componente');
  assert.deepEqual(p.seguenti[0].componente, { indice: 1, totale: 2 });
  // un attacco senza componenti seguenti non cambia: la stessa proposta di prima
  const q = propostaColpo({ nome: 'Morso', tipo: 'ravvicinato', va: 12, danno: '1d8+2', natura: 'Naturale', ac: 1 }, { danno: { formula: '1d8+2', moltiplicatore: 1 }, applicazioni: 1 });
  assert.equal(q.seguenti, undefined);
  assert.equal(q.componente, undefined);
  assert.equal(q.ac, 1);
});

test('i nemici con componenti passano validaNemico, e un seguente senza Natura no', () => {
  for (const id of ['balor', 'mimic', 'slaad-della-morte']) assert.deepEqual(validaNemico(schede[id], dati, id), [], id);
  const rotto = structuredClone(schede.balor);
  delete rotto.attacchi[0].seguenti[0].natura;
  assert.ok(validaNemico(rotto, dati, 'balor').length > 0);
});

// ——— A.275 ——————————————————————————————————————————————————————————————————————————————

test('A.275: nessuna Taglia dedotta dall’ingombro; Spazio e Taglia sono dati distinti', () => {
  assert.equal(Object.values(schede).filter((s) => s.taglia !== undefined).length, 0, 'le 93 Taglie ricavate per deduzione sono tolte: il manuale non ne conferma nessuna');
  const grandi = Object.values(schede).filter((s) => /^([2-9]|1\d|20) × /.test(s.spazio ?? ''));
  assert.ok(grandi.length >= 90, `creature con Spazio da 2 × N in su: ${grandi.length}`);
  assert.ok(grandi.every((s) => s.taglia === undefined), 'lo Spazio resta, la Taglia non si deduce');
  assert.equal(schede['drago-rosso-antico'].spazio, '10 × 16 Q');
});

test('A.275: la descrizione del campo Taglia dice che cosa succede se manca', () => {
  assert.match(dati.formato_nemici.campi.taglia.descrizione, /Taglia non specificata/);
  assert.match(dati.formato_nemici.campi.taglia.descrizione, /non si deduce/);
});

// ——— A.273 ——————————————————————————————————————————————————————————————————————————————

test('A.273: licantropi e Ammantato sono una creatura sola con più configurazioni', () => {
  assert.deepEqual(Object.keys(CONFIGURAZIONI_A273).sort(), ['ammantato', 'cinghiale-mannaro', 'lupo-mannaro', 'orso-mannaro', 'ratto-mannaro', 'tigre-mannara']);
  for (const id of Object.keys(CONFIGURAZIONI_A273)) {
    assert.equal(schede[id].configurazioni.length, CONFIGURAZIONI_A273[id].length, id);
    assert.ok(schede[id].spazio, `${id}: lo Spazio di base c'è, altrimenti la forma attuale non si riconosce`);
    assert.deepEqual(validaNemico(schede[id], dati, id), [], id);
  }
  const lupo = schede['lupo-mannaro'];
  // lotto 227 (A.288): sono n forme, non due — le tre del manuale (umanoide, ibrida, animale), con i valori che il manuale scrive
  assert.deepEqual(lupo.configurazioni.map((c) => [c.id, c.spazio]), [['umanoide', '1 Q'], ['ibrida', '1 Q'], ['lupo', '1 × 2 Q']]);
  assert.deepEqual(lupo.configurazioni[2].movimento, { passo: 8, corsa: 16, scatto: 24 });
  assert.deepEqual(schede.ammantato.configurazioni.map((c) => c.spazio), ['2 × 2 Q', '1 Q']);
});

test('A.273: il cambio di forma cambia ingombro e movimento e lascia identità, PV, Stati e Azioni', () => {
  const lupo = schede['lupo-mannaro'];
  const p = { id: 'n1', tipo: 'nemico', nome: 'Lupo mannaro 1', scheda: lupo, pv: { attuali: 40, massimo: 63 }, stati: ['sanguinante'], ferite: 1, iniziativa: 9 };
  assert.equal(configurazioneAttuale(p).id, 'umanoide');
  assert.equal(conMovimentoDellaForma(p).movimento.passo, 6, 'umanoide: il movimento del profilo');
  const s = { round: 1, registro: [], partecipanti: [p] };
  const dopo = cambiaConfigurazione(s, 'n1', 'lupo', new Date('2026-11-18T08:00:00.000Z'));
  const q = dopo.partecipanti[0];
  assert.equal(configurazioneAttuale(q).spazio, '1 × 2 Q');
  assert.equal(conMovimentoDellaForma(q).movimento.passo, 8);
  assert.equal(conMovimentoDellaForma(q).movimento.scatto, 24);
  assert.deepEqual([q.pv, q.stati, q.ferite, q.iniziativa, q.nome], [p.pv, p.stati, p.ferite, p.iniziativa, p.nome], 'identità, PV attuali, condizioni e Iniziativa restano');
  // il movimento del profilo non è stato riscritto
  assert.equal(q.scheda.movimento.passo, 6);
});

// ——— A.278 ——————————————————————————————————————————————————————————————————————————————

const cat = catalogo(dati);
const voce = (id) => cat.perRif.get(`armi_distanza_corporative:${id}`);

test('A.278: quattro voci rinominate in luogo, con l’identificativo di prima e i valori della 0.86', () => {
  assert.equal(voce('enforcer').nome, 'Colt Enforcer');
  assert.equal(voce('jemson-45').nome, 'Colt Jemson 45', 'grafia canonica con la E');
  assert.equal(voce('ironfist-15').nome, 'Bolter 15 Ironfist');
  assert.equal(voce('lanciagranate-ironfist-15').nome, 'Lanciagranate Ironfist');
  assert.equal(voce('lanciagranate-ironfist-15').modulo_di, 'armi_distanza_corporative:ironfist-15', 'modulo integrato della Bolter 15 Ironfist');
  // valori del manuale 0.86 (tabella dei Revolver Colt e delle Bolter)
  assert.deepEqual([voce('enforcer').danno.una_mano, voce('enforcer').gittata_q, voce('enforcer').munizioni.capacita], ['1d6', 10, 4]);
  assert.deepEqual([voce('ironfist-15').gittata_q, voce('ironfist-15').munizioni.capacita], [20, 20]);
  assert.ok(![...cat.oggetti].some((o) => /Jamson/.test(o.nome)), 'nessuna voce con la grafia da correggere nel manuale');
});

test('A.278: Bolter 09 e Lanciagranate Bolter 20 sono archiviati: fuori dal catalogo acquistabile, non cancellati', () => {
  for (const id of ['bolter-09', 'lanciagranate-bolter-20']) {
    const v = voce(id);
    assert.ok(v, `${id}: non è stato cancellato fisicamente`);
    assert.equal(v.archiviata.da, 'A.278');
    assert.ok(v.archiviata.motivo.length > 20);
    assert.ok(!cercaNelCatalogo(dati, v.nome).some((o) => o.id === id), `${id}: non si trova più fra gli acquistabili`);
  }
  const profili = opzioniCascata(dati, { tipo: 'arma_distanza', catalogo: 'Bauhaus', famiglia: 'Pistole' }).profili ?? [];
  assert.ok(!profili.some((o) => o.id === 'bolter-09'));
  // un personaggio che ce l'ha continua a vederla (il rimando per rif non si rompe)
  assert.ok(cat.perRif.get('armi_distanza_corporative:bolter-09'));
  assert.equal(voce('bolter-20').modulo_di, undefined);
  assert.ok(!cat.oggetti.some((o) => !o.archiviata && o.modulo_di === 'armi_distanza_corporative:bolter-20'), 'la Bolter 20 corrente non ha un lanciagranate integrato');
});

// ——— A.279 ——————————————————————————————————————————————————————————————————————————————

test('A.279: Colt Trooper e Colt Frontier sono armi leggere Capitol acquistabili, con i valori del manuale', () => {
  for (const [id, nome, danno, gittata, forza, costo] of [['colt-trooper', 'Colt Trooper', '1d6', 15, 2, 1000], ['colt-frontier', 'Colt Frontier', '1d6+1', 20, 3, 1500]]) {
    const v = voce(id);
    assert.equal(v.nome, nome);
    assert.equal(v.catalogo, 'Capitol');
    assert.equal(v.abilita, 'Armi leggere');
    assert.deepEqual([v.danno.una_mano, v.gittata_q, v.for_richiesta, v.costo, v.munizioni.capacita], [danno, gittata, forza, costo, 6]);
    assert.ok(cercaNelCatalogo(dati, nome).some((o) => o.id === id), 'si trova fra gli acquistabili');
  }
});

test('A.279: il Modulo al plasma Banshee è un modulo, non un’arma autonoma: si impiega solo montato su un Banshee compatibile', () => {
  const m = voce('modulo-al-plasma-banshee');
  assert.equal(m.montabile_su[0], 'corredi_dispositivi:propulsore-d-assalto-banshee');
  assert.ok(cat.perRif.get(m.montabile_su[0]), 'l’oggetto su cui si monta esiste nel catalogo');
  assert.equal(m.costo, null, 'prezzo e reperibilità seguono il manuale: non in vendita');
  assert.equal(m.non_in_vendita, true);
  assert.deepEqual(m.modalita, ['S']);
  assert.equal(m.munizioni.capacita, 10);
  // senza un Banshee nell'inventario la scheda lo dice (avvisa, non blocca)
  const conBanshee = (voci) => calcolaScheda({ creazione: { ...MISHIMA_AGENTE, equipaggiamento: voci }, livelli: [] }, dati).equipaggiamento;
  const modulo = { uid: 'm', rif: 'armi_distanza_corporative:modulo-al-plasma-banshee', stato: 'impugnata', quantita: 1, note: '' };
  const senza = conBanshee([modulo]);
  assert.ok(senza.avvisi.some((a) => /Modulo al plasma Banshee.*Banshee compatibile.*A\.279/.test(a)), 'avviso senza l’ospite');
  const con = conBanshee([modulo, { uid: 'p', rif: 'corredi_dispositivi:propulsore-d-assalto-banshee', stato: 'in_uso', quantita: 1, note: '' }]);
  assert.ok(!con.avvisi.some((a) => /Banshee compatibile/.test(a)), 'nessun avviso con il Propulsore');
});

test('i dati reali passano il validatore dopo le sette risposte', () => {
  assert.deepEqual(validaDati(dati), []);
});

import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 203 (15/11/2026), parte D: le creature senza Ferite al tavolo (Mostri 0.69 §4.2, §4.2.1).
//
// **Il controllo che deve restare verde sempre: il confine col Morente.** Il Morente del lotto 193 vale per i
// personaggi e per chi ha il tracciato delle Ferite. Una creatura del Bestiario a 0 PV **non entra in Morente e
// non ha contatore**: se la plancia gliene aprisse uno, al tavolo qualcuno le conterebbe i Round di sopravvivenza
// e aspetterebbe una stabilizzazione che non esiste.
//
// E il secondo: **il +30% non tocca danni e cure.** Sta nei PV massimi stampati e in nient'altro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sistemaSalute, usaFerite, senzaFerite, puoEntrareInMorente, statoAZeroPv, rigaSistemaSalute,
  feritaDiretta, curaFerita, tornaAttiva, pezziGrassetto, testoSemplice,
} from '../src/senza-ferite.js';
import { morenteDopoColpo } from '../src/scontro.js';
import { gradoMorente } from '../src/morente.js';
import { datiReali } from './helpers.js';

const { dati } = await datiReali();

const CREATURA = { nome: 'Lorath', pv: 52, _bestiario: { sistema_salute: 'solo_PV', edizione: 'Mostri 0.69' } };
const PNG = { nome: 'Agente I Grado', pv: 16, _bestiario: { sistema_salute: 'PV_e_Ferite' } };
const VECCHIO = { nome: 'un nemico salvato prima del lotto 197', pv: 30 }; // senza il campo

test('quale sistema usa un profilo, e il vecchio prende il predefinito senza cambiare da sé', () => {
  assert.equal(sistemaSalute(CREATURA, dati), 'solo_PV');
  assert.equal(sistemaSalute(PNG, dati), 'PV_e_Ferite');
  assert.equal(sistemaSalute(VECCHIO, dati), dati.formato_nemici.sistema_salute.predefinito);
  assert.equal(senzaFerite(CREATURA, dati), true);
  assert.equal(usaFerite(PNG, dati), true);
  // un valore che non esiste nei dati non si inventa: si ripiega sul predefinito
  assert.equal(sistemaSalute({ _bestiario: { sistema_salute: 'inventato' } }, dati), dati.formato_nemici.sistema_salute.predefinito);
});

// --- il confine col Morente -------------------------------------------------------------------------------

test('IL CONFINE: una creatura senza Ferite non entra in Morente, nemmeno oltre Grave', () => {
  assert.equal(puoEntrareInMorente(CREATURA, dati), false);
  assert.equal(puoEntrareInMorente(PNG, dati), true);
  // e lo scontro non le apre un contatore, qualunque numero di Ferite gli si passi
  const grado = gradoMorente(dati);
  const s = { round: 3, turno: 0, partecipanti: [] };
  const p = { id: 'nem:lorath:1', tipo: 'nemico', nome: 'Lorath', scheda: CREATURA };
  assert.equal(morenteDopoColpo(s, p, grado - 1, grado + 2, dati), undefined, 'ha aperto un contatore a una creatura senza Ferite');
  // un profilo che usa le Ferite invece sì (A.164, comportamento di sempre)
  const q = { id: 'nem:umano:1', tipo: 'nemico', nome: 'Mercenario', scheda: { ...PNG, caratteristiche: { COS: 6 } } };
  const mo = morenteDopoColpo(s, q, grado - 1, grado, dati);
  assert.ok(mo, 'un nemico con le Ferite deve ancora entrare in Morente');
});

test('a 0 PV la mini-scheda lo dice, invece di mostrare un contatore che non c’è', () => {
  const z = statoAZeroPv(CREATURA, dati);
  assert.ok(z, 'per una creatura senza Ferite ci deve essere qualcosa da leggere');
  assert.equal(z.contatore, false);
  assert.equal(z.fuoriCombattimento, true);
  assert.match(z.testo, /fuori combattimento/i);
  assert.match(z.testo, /Morente/, 'il nome va detto: è la domanda che il tavolo si farà');
  // per un profilo con le Ferite non si dice niente di tutto questo: ha il suo Morente
  assert.equal(statoAZeroPv(PNG, dati), null);
});

test('la riga si legge anche sopra 0 PV: detta prima, la domanda al tavolo non nasce', () => {
  const r = rigaSistemaSalute(CREATURA, dati);
  assert.ok(r);
  assert.match(r, /contatore di Morente/);
  assert.match(r, /Ferite/);
  assert.equal(rigaSistemaSalute(PNG, dati), null, 'chi ha le Ferite non ha niente di speciale da dire');
});

// --- le due conversioni ----------------------------------------------------------------------------------

test('§4.2.1: una Ferita diretta toglie 5 PV, ignorando l’AR; il danno non va sotto 0', () => {
  const e = feritaDiretta(CREATURA, dati, 52, 1);
  assert.equal(e.pv, 47);
  assert.equal(e.perdita, 5);
  assert.equal(e.ignoraAr, true);
  assert.match(e.testo, /−5 PV/);
  // due stati insieme
  assert.equal(feritaDiretta(CREATURA, dati, 52, 2).pv, 42);
  // non sotto 0 (§4.2)
  assert.equal(feritaDiretta(CREATURA, dati, 3, 1).pv, 0);
  assert.equal(feritaDiretta(CREATURA, dati, 3, 1).perdita, 3, 'si perde quello che c’era, non cinque');
  // su un profilo con le Ferite la conversione non si applica
  assert.equal(feritaDiretta(PNG, dati, 16, 1), null);
});

test('§4.2.1: uno stato curato ridà 5 PV, e si somma alla cura dei PV dello stesso effetto', () => {
  const e = curaFerita(CREATURA, dati, 20, 52, 2);
  assert.equal(e.pv, 30, 'due stati curati = 10 PV');
  assert.equal(e.convertito, 10);
  assert.equal(e.contaComeCuraFerite, true);
  // somma col recupero ordinario
  assert.equal(curaFerita(CREATURA, dati, 20, 52, 1, { pvCurati: 7 }).pv, 32);
  // non oltre il massimo
  assert.equal(curaFerita(CREATURA, dati, 50, 52, 2).pv, 52);
  // zero stati: non conta come cura di Ferite riuscita
  assert.equal(curaFerita(CREATURA, dati, 20, 52, 0).contaComeCuraFerite, false);
  assert.equal(curaFerita(PNG, dati, 10, 16, 1), null);
});

test('IL +30% NON tocca danni e cure: lo dicono i dati e si vede nei numeri', () => {
  const senzaAumento = dati.formato_nemici.sistema_salute.senza_ferite.senza_aumento.voci.join(' ');
  assert.match(senzaAumento, /cure/);
  assert.match(senzaAumento, /danni/);
  assert.match(senzaAumento, /rigenerazione/);
  // 5 PV sono 5, non 6,5 né 7
  assert.equal(feritaDiretta(CREATURA, dati, 52, 1).perdita, 5);
  assert.equal(curaFerita(CREATURA, dati, 20, 52, 1).convertito, 5);
});

test('§4.2: sopra 0 torna attiva al proprio turno successivo, e la conversione non resuscita', () => {
  const t = tornaAttiva(CREATURA, dati, 0, 10);
  assert.equal(t.attiva, false);
  assert.equal(t.alProssimoTurno, true);
  assert.match(t.testo, /turno/);
  // chi non era a 0 non ha niente da aspettare
  assert.equal(tornaAttiva(CREATURA, dati, 30, 20).attiva, true);
  assert.equal(tornaAttiva(PNG, dati, 0, 5), null);
});

test('i dati dichiarano il comportamento, e non c’è più un «da_fare» che faccia sembrare che manchi', () => {
  const SS = dati.formato_nemici.sistema_salute;
  assert.equal(SS.da_fare, undefined, 'il comportamento è dichiarato: «da_fare» non deve restare');
  assert.ok(SS.senza_ferite, 'il blocco del comportamento');
  assert.equal(SS.senza_ferite.a_zero_pv.contatore_morente, false);
  assert.match(SS.senza_ferite.paragrafo, /4\.2/);
  assert.equal(SS.versione_manuale, 'Mostri 0.69');
});

// Trovato nel browser a 820 px (prova E del lotto 203): la mini-scheda scriveva «**non ha il contatore di
// Morente**» con gli asterischi in chiaro. L'enfasi è un dato della regola e resta nei dati; a renderla è la pagina.
test('l’enfasi dei testi delle regole non arriva sullo schermo come asterischi', () => {
  const d = dati;
  const riga = rigaSistemaSalute({ _bestiario: { sistema_salute: 'solo_PV' } }, d);
  assert.ok(/\*\*/.test(riga), 'il testo nei dati porta l’enfasi del manuale: se sparisce, questo controllo non prova più niente');
  const pezzi = pezziGrassetto(riga);
  assert.ok(pezzi.some((p) => p.forte), 'l’enfasi deve diventare un pezzo in grassetto');
  assert.equal(pezzi.map((p) => p.t).join(''), riga.replace(/\*\*/g, ''), 'il testo mostrato è quello intero, senza i marcatori');
  for (const p of pezzi) assert.ok(!/\*/.test(p.t), `pezzo con un asterisco residuo: «${p.t}»`);
  // e lo stesso per il testo di 0 PV, che è l'altro che la mini-scheda scrive
  const zero = statoAZeroPv({ _bestiario: { sistema_salute: 'solo_PV' } }, d);
  for (const p of pezziGrassetto(zero.testo)) assert.ok(!/\*/.test(p.t), `0 PV: asterisco residuo in «${p.t}»`);
  assert.ok(pezziGrassetto(zero.testo).some((p) => p.forte && /contatore di Morente/i.test(p.t)));
});

// Trovato nel browser (prova E): il pannello «Colpito» di una creatura senza tracciato scriveva «Ferite 0», e il
// colpo registrato le avrebbe dato Ferite e Menomazioni come a un PG. La regola vale **dove il colpo si registra**.
test('un colpo su una creatura senza Ferite non le dà né Ferite né Menomazioni', async () => {
  const { colpoSuNemico } = await import('../src/colpo-nemico.js');
  const scheda = { sistema_salute: 'solo_PV', _bestiario: { sistema_salute: 'solo_PV', edizione: 'Mostri 0.69' } };
  const base = (sch) => ({
    id: 'sc', round: 1, stato: 'aperto', registro: [],
    partecipanti: [{ id: 'n1', nome: 'Viverna della Sabbia 1', tipo: 'nemico', pv: { attuali: 73, massimo: 73 }, ferite: 0, stati: [], scheda: sch }],
  });
  const { applicaColpo } = await import('../src/danno.js');
  const colpo = { danni: [33], difesa: 'nessuna' };
  // il risultato è quello vero del motore del danno, calcolato **con** il tracciato: così il guardiano si prova
  // contro il caso peggiore, cioè un pannello che propone Ferite e Menomazioni a chi non le ha
  const vero = applicaColpo({ nome: 'x', pv: { attuali: 73, massimo: 73 }, ferite: 0, ar: { totale: 0 } }, colpo, dati);
  // le Ferite di un colpo nascono dalle PS di Tempra spuntate nel pannello: qui si simula il pannello che ne
  // propone due con la Menomazione, che è esattamente ciò da cui la creatura senza tracciato va difesa
  const ris = { ...vero, ferite: { prima: 0, dopo: 2, nome: 'Grave' }, menomazioni: [{ stato: 'Grave', testo: 'una Menomazione' }] };
  const visto = { id: 'n1', nome: 'Viverna della Sabbia 1', pv: { attuali: 73 }, ferite: 0 };

  const senza = colpoSuNemico(base({ ...scheda }), visto, ris, colpo, [], [], dati).partecipanti[0];
  assert.equal(senza.pv.attuali, 40, 'i PV scendono come per chiunque: il danno è danno');
  assert.equal(senza.ferite ?? 0, 0, 'nessuna Ferita: non ha il tracciato (§4.2)');
  assert.deepEqual(senza.menomazioni ?? [], [], 'nessuna Menomazione automatica (§4.2)');
  assert.equal(senza.morente ?? null, null, 'e nessun contatore di Morente');

  // e il controllo che questo test non sia verde per caso: con il tracciato, le stesse Ferite arrivano
  const con = colpoSuNemico(base({ _bestiario: { sistema_salute: 'PV_e_Ferite' } }), visto, ris, colpo, [], [], dati).partecipanti[0];
  assert.equal(con.ferite, 2, 'una creatura col tracciato prende le Ferite del colpo');
  assert.equal((con.menomazioni ?? []).length, 1);
});


// Prova E: la Ferita diretta e la cura devono essere due tocchi nella plancia, non un −5 e un +5 a memoria.
test('Ferita diretta e Ferita curata su una creatura senza tracciato: −5 e +5 PV, con il motivo nel registro', async () => {
  const { feritaDirettaNemico, curaFeritaNemico } = await import('../src/scontro.js');
  const sch = { _bestiario: { sistema_salute: 'solo_PV', edizione: 'Mostri 0.69' } };
  const base = (pv, sc = sch) => ({ id: 'sc', round: 2, stato: 'aperto', registro: [],
    partecipanti: [{ id: 'n1', nome: 'Viverna della Sabbia 1', tipo: 'nemico', pv: { attuali: pv, massimo: 73 }, ferite: 0, stati: [], scheda: sc }] });

  const ferito = feritaDirettaNemico(base(56), 'n1', 1, dati, new Date());
  assert.equal(ferito.partecipanti[0].pv.attuali, 51, 'una Ferita diretta vale −5 PV (§4.2.1)');
  assert.equal(ferito.partecipanti[0].ferite ?? 0, 0, 'e non le lascia una Ferita da tracciare');
  assert.match(ferito.registro.at(-1).testo, /ignorando l’AR/, 'il registro dice perché, non solo «−5»');

  const curato = curaFeritaNemico(base(51), 'n1', 1, dati, new Date());
  assert.equal(curato.partecipanti[0].pv.attuali, 56, 'uno stato curato vale +5 PV');
  assert.match(curato.registro.at(-1).testo, /§4.2.1/);

  // il massimo non si supera, e a 0 PV la Ferita diretta non porta sotto zero
  assert.equal(curaFeritaNemico(base(71), 'n1', 1, dati, new Date()).partecipanti[0].pv.attuali, 73);
  assert.equal(feritaDirettaNemico(base(3), 'n1', 1, dati, new Date()).partecipanti[0].pv.attuali, 0);

  // da 0 PV la cura riporta sopra zero ma **non** rimette in gioco subito (§4.2)
  const rialzata = curaFeritaNemico(base(0), 'n1', 1, dati, new Date());
  assert.equal(rialzata.partecipanti[0].pv.attuali, 5);
  assert.match(rialzata.registro.at(-1).testo, /turno successivo/i, 'torna attiva al proprio turno successivo, e il registro lo dice');

  // e su una creatura **col** tracciato le due scorciatoie non si usano: si passa da «Colpito»
  const conTracciato = base(56, { _bestiario: { sistema_salute: 'PV_e_Ferite' } });
  assert.throws(() => feritaDirettaNemico(conTracciato, 'n1', 1, dati, new Date()), /tracciato delle Ferite/);
  assert.throws(() => curaFeritaNemico(conTracciato, 'n1', 1, dati, new Date()), /tracciato delle Ferite/);
});


// Trovato nel browser leggendo il registro: «1 Ferita dirette», «1 stato di Ferita curati», e gli asterischi
// dell'enfasi finiti in una riga di registro, che è testo e basta.
test('le righe del registro sono scritte in italiano e senza marcatori', async () => {
  const { feritaDirettaNemico, curaFeritaNemico } = await import('../src/scontro.js');
  const sch = { _bestiario: { sistema_salute: 'solo_PV' } };
  const base = (pv) => ({ id: 'sc', round: 1, stato: 'aperto', registro: [],
    partecipanti: [{ id: 'n1', nome: 'Viverna', tipo: 'nemico', pv: { attuali: pv, massimo: 73 }, ferite: 0, stati: [], scheda: sch }] });
  const righe = [
    feritaDirettaNemico(base(56), 'n1', 1, dati, new Date()).registro.at(-1).testo,
    curaFeritaNemico(base(0), 'n1', 1, dati, new Date()).registro.at(-1).testo,
    feritaDirettaNemico(base(56), 'n1', 2, dati, new Date()).registro.at(-1).testo,
  ];
  for (const r of righe) assert.ok(!r.includes('*'), `marcatore nel registro: «${r}»`);
  assert.match(righe[0], /1 Ferita diretta /);
  assert.match(righe[1], /1 stato di Ferita curato /);
  assert.match(righe[2], /2 Ferite dirette /, 'al plurale resta il plurale');
  assert.equal(testoSemplice('a **b** c'), 'a b c');
});

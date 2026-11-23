import '../tools/guardia-subito.mjs'; // la guardia sulle cartelle vere, comunque si lanci il test
// Lotto 238 (23/11/2026) — il trasporto a bordo di una nave e il recupero dello scudo.
//
// I quattro controlli che il lotto chiede per nome, e che devono restare verdi sempre:
//
//  1. **lo scudo non si ricarica senza uno scontro aperto.** Un Round esiste solo dentro un combattimento, e il
//     §16 lega il recupero ai Round: senza la guardia un tocco distratto fra due scontri rimetteva ScE che il
//     manuale non dà. Se il Direttore vuole il recupero fra due scontri, lo scrive lui;
//  2. **non supera il massimo dichiarato dal profilo** (`sce_max`): il profilo dice quanto recupera e quanto può
//     avere, il record quanto ha adesso;
//  3. **una misura che manca non si ricava** dalla massa, dai posti o dalla taglia (A.296): l'esito è «non si
//     sa», mai «ci sta» e mai «non ci sta»;
//  4. **l'app non blocca un carico, lo segnala** (CLAUDE.md): nessuna funzione di questo modulo impedisce
//     niente, e l'esito «non ci sta» è una frase che dice quale misura sfora.
//
// Le edizioni non sono scritte a mano: le dà il registro (`tests/niente-date-del-registro-218.test.js`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datiReali } from './helpers.js';
import {
  ciSta, vanoDiCarico, ingombroTrasporto, altezzaDiTrasporto, massaAPienoCarico,
  piazzola, quadroTrasporto, naviConStiva, datiDaMostrare, regoleTrasporto,
} from '../src/trasporto-veicolo.js';
import { recuperaScudo, puoRecuperare, statoScudo, scontroAperto, haRecupero } from '../src/scudo-veicolo.js';
import { normalizzaNeverlost } from '../src/neverlost.js';
import { testoManuale, versioneManuale } from '../tools/manuali.mjs';

const { dati } = await datiReali();
const prof = (id) => {
  const p = dati.veicoli.profili.find((x) => x.id === id);
  assert.ok(p, `manca il profilo «${id}»`);
  return p;
};
const NEV = prof('neverlost');
const SCOUT = prof('asa-scout-mk4');
// il Bastion TC non è nel catalogo (A.304): qui è un profilo di prova coi numeri che il manuale scrive, e serve
// solo a far vedere gli sfori. Il test più sotto verifica che quei numeri siano davvero quelli del manuale.
const BASTION = {
  id: 'bastion-tc-di-prova', nome: 'Bastion TC',
  altezza: { scafo_m: 3.3, massima_m: 4.5 },
  ingombro_trasporto: { lunghezza_m: 12, larghezza_m: 6, altezza_m: 4.5 },
  massa_kg: 65000, carico_kg: 15000,
};

// ─── il vano di carico ────────────────────────────────────────────────────────────────────────────────────────

test('il vano di carico della Neverlost è quello del manuale, e non ne esiste un secondo', () => {
  const v = vanoDiCarico(NEV);
  assert.ok(v, 'la Neverlost ha una stiva');
  assert.equal(v.larghezza_m, 4.5);
  assert.equal(v.altezza_m, 3.5);
  assert.equal(v.portata_kg, 10000);
  assert.equal(v.quante, 2);
  // le parole del manuale, non una nostra ricostruzione
  assert.match(testoManuale('veicoli'), /Ogni stiva laterale ha un portellone anteriore con un’apertura utile di 4,5 m di larghezza \(3 Q Base\) e 3,5 m di altezza/);
  assert.match(testoManuale('veicoli'), /Ogni rampa è larga 4,5 m e ha una portata di 10 t/);
  // **un solo campo per la stessa cosa**: la stiva è un'apertura e una portata, `volume_utile_m3` è il volume del
  // vano merci del furgone (lotto 209). Due unità, due significati: non si confondono e non si duplicano.
  assert.equal(NEV.volume_utile_m3, undefined, 'la stiva non è un volume: non si scrive come volume_utile_m3');
  assert.equal(prof('furgone-civile').volume_utile_m3, 10);
  assert.equal(vanoDiCarico(prof('furgone-civile')), null, 'il furgone non ha una stiva per altri mezzi');
  assert.equal(naviConStiva(dati).map((p) => p.id).join(','), 'neverlost', 'una sola nave con una stiva, oggi');
});

// ─── «ci sta?» ────────────────────────────────────────────────────────────────────────────────────────────────

test('CI STA: il FIAT LUX entra nella stiva, e la frase dice i numeri', () => {
  const r = ciSta(SCOUT, NEV, dati);
  assert.equal(r.esito, 'ci sta');
  assert.deepEqual(r.sfori, []);
  assert.deepEqual(r.mancanti, []);
  assert.equal(r.misure.larghezza_m, 2.6);
  assert.equal(r.misure.altezza_m, 2.7);
  assert.equal(r.massa.kg, 6000, '4.500 a vuoto + 1.500 di carico utile: la somma la scrive il manuale');
  assert.match(r.frase, /Ci sta/);
  assert.match(r.frase, /2,6 m/, 'i numeri si scrivono come si leggono in italiano');
  assert.match(r.frase, /4,5 × 3,5 m/);
});

test('NON CI STA: dice QUALE misura sfora, con il suo limite', () => {
  const r = ciSta(BASTION, NEV, dati);
  assert.equal(r.esito, 'non ci sta');
  assert.equal(r.sfori.length, 3, 'larghezza, altezza e massa: tutte e tre');
  assert.deepEqual(r.sfori.map((s) => s.misura), ['larghezza', 'altezza', 'massa a pieno carico']);
  // il punto del lotto: non «non ci sta», ma «l'altezza è 4,5 m, il vano è 3,5 m»
  assert.match(r.frase, /larghezza 6 m, l’apertura del portellone è 4,5 m/);
  assert.match(r.frase, /altezza 4,5 m, l’apertura del portellone è 3,5 m/);
  assert.match(r.frase, /massa a pieno carico 80\.000 kg, la portata della rampa è 10\.000 kg/);
  for (const s of r.sfori) assert.ok(s.valore > s.limite, `${s.misura}: ${s.valore} > ${s.limite}`);
  // e i numeri del Bastion sono quelli del manuale, non inventati per il test
  const t = testoManuale('veicoli');
  assert.match(t, /3,3 m allo scafo; 4,5 m alla postazione più alta/);
  assert.match(t, /12 × 6 × 4,5 m/);
  assert.match(t, /80\.000 kg/);
});

test('L’APP SEGNALA, NON BLOCCA: nessun esito impedisce un carico', () => {
  const r = ciSta(BASTION, NEV, dati);
  // l'esito è un referto: una frase e un elenco. Non c'è niente da «forzare» perché niente è vietato.
  assert.deepEqual(Object.keys(r).sort(), ['esito', 'frase', 'mancanti', 'massa', 'misure', 'sfori', 'vano'].sort());
  assert.match(r.frase, /È un avviso, non un divieto: decide il Direttore/);
  assert.equal(regoleTrasporto(dati).segnala, 'È un avviso, non un divieto: decide il Direttore.');
  // **nel modulo non esiste una funzione che blocchi**: nessun `throw`, nessun booleano che vieti
  const codice = readFileSync(new URL('../src/trasporto-veicolo.js', import.meta.url), 'utf8');
  assert.equal(/\bthrow\b/.test(codice), false, 'il trasporto non lancia: avvisa');
  // si guarda il CODICE, non i commenti: il cappello del modulo la parola «blocca» la contiene per dire che non
  // blocca. Si toglie sia un commento di riga sia uno di blocco, e poi si cerca.
  const soloCodice = codice.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const vietato of [/vietato/i, /\bblocca\b/i, /impedisce/i, /\bvieta\b/i]) {
    assert.equal(vietato.test(soloCodice), false, `niente divieti nel codice: ${vietato}`);
  }
});

test('UNA MISURA CHE MANCA NON SI RICAVA da massa, posti o taglia', () => {
  // il furgone ha massa, carico, posti e un volume, ma il manuale non gli dà un'altezza
  const f = prof('furgone-civile');
  assert.equal(altezzaDiTrasporto(f), null, 'nessuna altezza dichiarata');
  const r = ciSta(f, NEV, dati);
  assert.equal(r.esito, 'non si sa', 'mai «ci sta» e mai «non ci sta» con una misura che manca');
  // larghezza E altezza: la scheda del furgone non parla di trasporto (nessun ingombro di trasporto, nessuna
  // altezza), quindi le sue dimensioni generali non valgono come ingombro di trasporto. Mancano tutte e due, e
  // l’app lo dice: è la prova nel browser che ce lo ha insegnato, con la Neverlost e i suoi «51 × 30 × non dato».
  assert.deepEqual(r.mancanti, ['larghezza', 'altezza']);
  assert.match(r.frase, /non si ricava da massa, posti o taglia/);
  // ha tutto il resto, e nessuno di quei dati è stato usato per inventare l'altezza
  assert.equal(f.massa_kg, 2500);
  assert.equal(f.equipaggio.posti, 3);
  assert.equal(f.volume_utile_m3, 10);
  assert.equal(ingombroTrasporto(f).altezza_m, null);
  assert.equal(ingombroTrasporto(f).larghezza_m, null, 'le dimensioni generali non sono un ingombro di trasporto');
  // e una massa che manca resta mancante: non si stima dal volume né dai posti
  const senzaMassa = { ...SCOUT, massa_kg: undefined };
  assert.equal(massaAPienoCarico(senzaMassa).kg, null);
  assert.deepEqual(massaAPienoCarico(senzaMassa).mancanti, ['massa a vuoto']);
  assert.equal(ciSta(senzaMassa, NEV, dati).esito, 'non si sa');
});

test('LE DUE ALTEZZE: quale conta lo dichiara il manuale, non noi', () => {
  const a = altezzaDiTrasporto(BASTION);
  assert.equal(a.scafo, 3.3);
  assert.equal(a.massima, 4.5);
  assert.equal(a.m, 4.5, 'per il trasporto conta la più alta, perché l’ingombro di trasporto della scheda la ripete');
  assert.equal(a.dichiarata, true);
  assert.match(a.da, /ingombro di trasporto/);
  // **se il manuale non lo dicesse, l'app non sceglierebbe la più comoda**
  const senzaIngombro = { altezza: { scafo_m: 3.3, massima_m: 4.5 } };
  const b = altezzaDiTrasporto(senzaIngombro);
  assert.equal(b.m, null, 'due altezze e nessuna dichiarazione: non si sceglie');
  assert.equal(b.dichiarata, false);
  assert.deepEqual([b.scafo, b.massima], [3.3, 4.5], 'ma si tengono entrambe');
  // lo Scout ne ha una sola, quella dell'assetto di trasporto
  const s = altezzaDiTrasporto(SCOUT);
  assert.equal(s.m, 2.7);
  assert.equal(s.dichiarata, true);
  assert.match(testoManuale('veicoli'), /Il FIAT LUX è alto 2,7 m in assetto di trasporto/);
});

test('la piazzola di parcheggio è un dato come l’ingombro, e dove manca manca', () => {
  assert.equal(piazzola(SCOUT), null, 'la scheda dello Scout non dà una piazzola: non si inventa');
  const conPiazzola = { ...SCOUT, piazzola: { lunghezza_m: 15, larghezza_m: 9, nota: 'corridoi comuni esclusi' } };
  assert.deepEqual(piazzola(conPiazzola), { lunghezza_m: 15, larghezza_m: 9, nota: 'corridoi comuni esclusi' });
  // la nota del manuale sulle piazzole è dichiarata nelle regole
  assert.match(regoleTrasporto(dati).testo, /Le piazzole consigliate escludono i corridoi comuni/);
});

// ─── il recupero dello scudo ──────────────────────────────────────────────────────────────────────────────────

test('LO SCUDO NON SI RICARICA SENZA UNO SCONTRO APERTO', () => {
  assert.equal(haRecupero(NEV), true);
  // il recupero era già nel profilo dal lotto 158: questo lotto aggiunge la guardia, non il dato
  assert.deepEqual(NEV.scudo.recupero.round_senza_colpi, 3);
  assert.deepEqual(NEV.scudo.recupero.sce_per_round, 20);
  const acceso = conScudo({ attivo: true, sce: 100, round_senza_colpi: 2 });
  // niente scontro → il mezzo torna IDENTICO, col motivo fra gli avvisi
  for (const niente of [null, undefined, {}, { round: 0 }, { round: 3, stato: 'chiuso' }, { round: 3, stato: 'archiviato' }]) {
    const r = recuperaScudo(acceso, NEV, niente);
    assert.equal(r.recuperato, 0, `con ${JSON.stringify(niente)} non si recupera`);
    assert.deepEqual(r.mezzo, acceso, 'il record non si tocca');
    assert.equal(r.avvisi.length, 1);
    assert.match(r.avvisi[0], /scontro aperto|Round/);
  }
  // con lo scontro aperto sì
  const r = recuperaScudo(acceso, NEV, { id: 'sc1', round: 3 });
  assert.equal(r.recuperato, 20);
  assert.equal(normalizzaNeverlost(r.mezzo, NEV).scudo.sce, 120);
  assert.equal(scontroAperto({ round: 1 }), true);
  assert.equal(scontroAperto({ round: 1, stato: 'chiuso' }), false);
});

test('LO SCUDO NON SUPERA IL MASSIMO del profilo', () => {
  const max = NEV.scudo.sce_max;
  assert.equal(max, 200);
  // a 190 recupera 10, non 20
  const quasi = conScudo({ attivo: true, sce: max - 10, round_senza_colpi: 5 });
  const r = recuperaScudo(quasi, NEV, { id: 'sc1', round: 5 });
  assert.equal(r.recuperato, 10);
  assert.equal(normalizzaNeverlost(r.mezzo, NEV).scudo.sce, max);
  // al massimo non recupera niente, e non va oltre nemmeno dopo dieci Round
  let pieno = conScudo({ attivo: true, sce: max, round_senza_colpi: 5 });
  for (let i = 0; i < 10; i++) pieno = recuperaScudo(pieno, NEV, { id: 'sc1', round: 6 + i }).mezzo;
  assert.equal(normalizzaNeverlost(pieno, NEV).scudo.sce, max, 'mai oltre il massimo dichiarato dal profilo');
});

test('lo scudo spento o con gli ScE da registrare non recupera, e lo dice', () => {
  const sc = { id: 'sc1', round: 5 };
  const spento = recuperaScudo(conScudo({ attivo: false, sce: 100, round_senza_colpi: 5 }), NEV, sc);
  assert.equal(spento.recuperato, 0);
  assert.match(spento.avvisi[0], /spento/);
  const daRegistrare = recuperaScudo(conScudo({ attivo: true, sce: null, round_senza_colpi: 5 }), NEV, sc);
  assert.equal(daRegistrare.recuperato, 0);
  assert.match(daRegistrare.avvisi[0], /registrare/);
  // il quadro per la scheda dice quanto recupera e se adesso può
  const st = statoScudo(conScudo({ attivo: true, sce: 100, round_senza_colpi: 0 }), NEV, sc);
  assert.equal(st.massimo, 200);
  assert.deepEqual(st.recupero, { dalRound: 3, scePerRound: 20 });
  assert.equal(st.puo, true);
  assert.equal(statoScudo(conScudo({ attivo: true, sce: 100 }), NEV, null).puo, false);
  assert.equal(statoScudo({}, prof('furgone-civile'), sc), null, 'un mezzo senza scudo non ha un quadro dello scudo');
  // la regola generale del §16 è dichiarata accanto ai numeri
  assert.match(NEV.scudo.recupero._regola, /Dopo tre rnd consecutivi senza essere colpito/);
  assert.match(testoManuale('veicoli'), /Dopo tre rnd consecutivi senza essere colpito, lo scudo recupera gli ScE indicati nella propria scheda, fino al massimo/);
});

// ─── i quattro da mostrare, e il conto ────────────────────────────────────────────────────────────────────────

test('i quattro dati da mostrare si LEGGONO e non calcolano niente', () => {
  const el = regoleTrasporto(dati).da_mostrare;
  assert.equal(el.length, 4);
  assert.deepEqual(el.map((d) => d.campo), ['bagagliaio_litri', 'vano_sicurezza_litri', 'bagagliaio_libero_litri', 'passaggio_libero']);
  // oggi nessun profilo del catalogo li ha: sono dei mezzi che aspettano la A.304
  for (const p of dati.veicoli.profili) assert.deepEqual(datiDaMostrare(p, dati), [], `${p.id}: nessun dato da mostrare, e va bene`);
  // e quando ci saranno, si leggono senza entrare in nessun confronto
  const pursuit = { ingombro_trasporto: { lunghezza_m: 5.4, larghezza_m: 2.1, altezza_m: 2.1 }, altezza: { m: 2.1 }, massa_kg: 3000, carico_kg: 1000, bagagliaio_litri: 600, vano_sicurezza_litri: 300 };
  assert.deepEqual(datiDaMostrare(pursuit, dati).map((d) => `${d.nome}: ${d.valore} ${d.unita}`), ['Bagagliaio complessivo: 600 litri', 'Vano di sicurezza: 300 litri']);
  // non entrano in `ciSta`: il confronto guarda larghezza, altezza e massa, e nient'altro
  assert.deepEqual(regoleTrasporto(dati).confronti.map((c) => c.misura), ['larghezza', 'altezza', 'massa a pieno carico']);
  assert.equal(ciSta(pursuit, NEV, dati).esito, 'ci sta');
});

test('la lunghezza col cannone in avanti resta FUORI, col motivo e con a che cosa servirebbe', () => {
  const f = regoleTrasporto(dati).fuori_dal_modello;
  assert.equal(f.length, 1);
  assert.match(f[0].campo, /lunghezza con cannone/);
  assert.match(f[0].perche, /orientamento|torretta/i);
  assert.ok(f[0].a_che_cosa_servirebbe.length > 40, 'a che cosa servirebbe, in una riga');
  assert.match(f[0].a_che_cosa_servirebbe, /varco|portellone|galleria/i);
  // e non c'è nessun campo che la modelli: niente orientamento della torretta nei dati
  const tutto = JSON.stringify(dati.veicoli);
  assert.equal(/orientamento_torretta|torretta_gradi/.test(tutto), false);
});

test('i tre campi «non nuovi» combaciano per unità e per significato', () => {
  // 1. massa a pieno carico = massa a vuoto + carico utile, nella stessa unità (kg). La somma la scrive il manuale.
  for (const id of ['autovettura-civile', 'furgone-civile', 'motocicletta-civile', 'asa-scout-mk4', 'asa-scout-t4']) {
    const p = prof(id);
    const m = massaAPienoCarico(p);
    if (m.kg === null) { assert.ok(m.mancanti.length, `${id}: se manca, lo dice`); continue; }
    assert.equal(m.kg, p.massa_kg + p.carico_kg, `${id}: la somma`);
  }
  assert.equal(massaAPienoCarico(SCOUT).kg, 6000);
  assert.match(testoManuale('veicoli'), /A pieno carico il veicolo pesa|pesa 4,5 t a vuoto/);
  // 2. vano materiali (m³) = volume_utile_m3: stessa unità, stesso significato (volume utile di un vano di carico)
  assert.equal(typeof prof('furgone-civile').volume_utile_m3, 'number');
  assert.match(testoManuale('veicoli'), /Volume utile del vano merci/);
  // 3. capacità dello scudo = scudo.sce_max: stessa unità (ScE), stesso significato
  assert.equal(NEV.scudo.sce_max, 200);
  assert.match(testoManuale('veicoli'), /200 ScE|Capacità/);
});

test('il quadro del trasporto, e l’edizione che lo dà', () => {
  const q = quadroTrasporto(SCOUT, dati);
  assert.ok(q);
  assert.equal(q.navi.length, 1);
  assert.equal(q.navi[0].id, 'neverlost');
  assert.equal(q.navi[0].esito.esito, 'ci sta');
  // la Neverlost non si confronta con sé stessa
  assert.deepEqual(quadroTrasporto(NEV, dati)?.navi ?? [], []);
  // un mezzo di cui il manuale non dà nessuna misura di trasporto non ha un riquadro da mostrare
  assert.equal(quadroTrasporto({ id: 'x' }, dati), null);
  // l'edizione la dà il registro
  assert.equal(versioneManuale('veicoli'), '0.23');
  assert.match(regoleTrasporto(dati).versione_manuale, /Veicoli 0\.23/);
});

/** Un record della Neverlost col suo scudo: le risorse stanno nel record, non nel profilo. */
function conScudo(scudo) {
  return { uid: 'nev-prova', profilo: 'neverlost', nome: 'Neverlost', scudo: { ore_pagate: 1, ampliato: false, ...scudo } };
}

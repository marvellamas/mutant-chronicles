// Lotto 2 dell'aggiornamento del 01/10/2026: Manuale dell'Equipaggiamento 0.5, capitolo 5 (Google Doc del
// 01/10/2026, 08:32 UTC; testo in docs/manuali-txt/equipaggiamento.md). Convenzioni in
// docs/equipaggiamento-lotti.md, effetti in docs/effetti-oggetti.md.
//   node tools/lotti/lotto_equipaggiamento_05.mjs --parte nec|strumenti|alimentazione            prova a vuoto
//   node tools/lotti/lotto_equipaggiamento_05.mjs --parte nec|strumenti|alimentazione --scrivi   scrive (idempotente)
//
// - nec: catalogo dei Nuclei Energetici Cromatici (§5.4.4, §5.4.6) in data/equipaggiamento/nec.json e regole
//   in data/regole.json → nec (§5.4.1–5.4.6); il caricatore portatile è il «Caricatore da campo» degli
//   Armamenti (munizioni.json), che riceve il nome alternativo e il trasferimento;
// - strumenti: §§5.1–5.3 e 5.5–5.8 in data/equipaggiamento/strumenti_professionali.json, con gli effetti
//   numerici nello schema degli effetti e le voci di dotazione collegate (A.34); Corredo di manutenzione
//   da campo e Valigetta investigativa ASA restano le schede degli Armamenti (§7.13.7, §7.12);
// - alimentazione: campo «alimentazione» (NEC, consumo, autonomia o usi) degli oggetti fuori dai cap. 2–4
//   che il §5.4.7 quantifica (accessori delle armi, scanner, elmetto ASA Recon, Cuirassier, corredi degli
//   Armamenti, postazione medica). I cap. 2–4 li scrive tools/lotti/lotto_equipaggiamento_03.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { normalizza, testoManuali } from '../verifica_frasi.mjs';

const RADICE = new URL('../../', import.meta.url);
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const parte = arg('--parte');
const scrivi = process.argv.includes('--scrivi');
const VERSIONE = 'Equipaggiamento 0.5';
const DOC = testoManuali();
const frase = (t) => { if (!DOC.includes(normalizza(t))) throw new Error(`frase non trovata nel Doc: ${t}`); return t; };
const frasi = (...t) => t.map(frase).join(' ');
const leggi = (p) => JSON.parse(readFileSync(new URL(p, RADICE), 'utf8'));
const salva = (p, j) => { if (scrivi) writeFileSync(new URL(p, RADICE), `${JSON.stringify(j, null, 2)}\n`); };

/** Voce del catalogo Commerciale (stessi campi dei lotti del cap. 2–4). */
function voce(x, tipo = 'altro') {
  const o = {
    id: x.id, nome: x.nome, tipo, catalogo: 'Commerciale', famiglia: x.famiglia, nomi_alternativi: x.alt ?? [],
    note_manuale: x.note, paragrafo: x.par, versione_manuale: VERSIONE,
  };
  if (x.peso !== undefined) o.peso = x.peso;
  if (x.pi !== undefined) o.pi = x.pi;
  if (x.qualita !== undefined) o.qualita = x.qualita;
  if (x.ps !== undefined) o.ps_int = x.ps;
  if (x.rep !== undefined) o.reperibilita = x.rep;
  if (x.costo !== undefined) o.costo = x.costo;
  Object.assign(o, x.extra ?? {});
  o.proprieta = [];
  if (x.breve) o.effetto_breve = x.breve;
  if (x.effetti?.length) o.effetti = x.effetti.map((e) => ({ ...e, condizione: frase(e.condizione), fonte: `Equipaggiamento ${x.par}` }));
  return o;
}
const va = (abilita, valore, ambito, uso, condizione) => ({ abilita, valore, ambito, ...(uso ? { uso } : {}), condizione });

// alimentazione NEC (§5.4.7): «ore oppure cariche» (§5.4.2), con il NEC del catalogo o una descrizione
export const alim = (nec, consumo, autonomia, extra = {}) => ({ nec, consumo_lxh: consumo, autonomia_ore: autonomia, paragrafo: '§5.4.7', ...extra });
const VC = 'nec:verde-compatto';
const VS = 'nec:verde-standard';
const RS = 'nec:rosso-standard';
const MR = 'nec:modulo-rosso';

// ---------------------------------------------------------------------------------------------------
// NEC (§5.4)
function parteNec() {
  const nota = frasi(
    'I Nuclei Energetici Cromatici, abbreviati NEC, sono la principale fonte energetica dell’ambientazione. Esistono tre tipi: Rosso, Blu e Verde. Il colore identifica il comportamento energetico, non la Qualità costruttiva.',
    'I NEC sono riutilizzabili. Celle e pacchi del catalogo si ricaricano normalmente in un’ora con caricatore e fonte adeguati. Mezza riserva richiede 30 minuti; una carica della Blu ravvicinata richiede 12 minuti.',
    'La tariffa ordinaria è 0,01 cr per Lx ripristinato.',
  );
  const IMPIEGO = {
    Rosso: frase('Capacità ed erogazione medie; alimentazione ordinaria.'),
    Blu: frase('Capacità bassa ed erogazione alta; richieste intense e brevi.'),
    Verde: frase('Capacità alta ed erogazione bassa; lunga autonomia.'),
  };
  const cella = (id, nome, colore, formato, celle, lx, erog, peso, rep, costo, ricarica, alt = [], piu = '') => voce({
    id, nome, alt, famiglia: formato === 'compatto' || formato === 'standard' ? 'Celle' : 'Moduli e banchi', par: formato === 'compatto' || formato === 'standard' ? '§5.4.4' : '§5.4.4',
    note: `${IMPIEGO[colore]} Capacità ${lx.toLocaleString('it-IT')} Lx, erogazione continua fino a ${erog.toLocaleString('it-IT')} Lx/h; ricarica completa ${ricarica.toLocaleString('it-IT')} cr. ${nota}${piu}`,
    peso, rep, costo,
    extra: { nec: { colore, formato, celle, capacita_lx: lx, erogazione_lxh: erog }, ricarica_costo: ricarica },
  });
  const sostituzione = ` ${frase('Sostituire una cella o un Modulo accessibile con ricambio pronto e attacco rapido compatibile richiede 1 AzP.')}`;
  const pacco = ` ${frase('Un Modulo commerciale contiene dieci celle standard dello stesso tipo: costa quanto le celle più 100 cr per involucro e collegamenti e pesa 2 kg complessivi.')}`;
  const banco = ` ${frase('Un Banco contiene dieci Moduli, pesa 20 kg e ha prezzo e valori energetici dieci volte superiori a quelli del Modulo.')} ${frase('Installare o spostare un Banco richiede un minuto fuori dal combattimento; gli impianti specialistici mantengono i propri tempi.')}`;
  const oggetti = [
    cella('verde-compatto', 'NEC Verde compatto', 'Verde', 'compatto', 1, 100, 5, 0.015, 'CO', 10, 1, ['Cella Verde compatta'],
      ` ${frase('Il Verde compatto contiene 100 Lx, eroga fino a 5 Lx/h, pesa 15 g e occupa circa 0,0055 L. È una taglia dello stesso tipo Verde.')}${sostituzione}`),
    cella('rosso-standard', 'NEC Rosso standard', 'Rosso', 'standard', 1, 500, 100, 0.15, 'CO', 50, 5, ['Cella Rossa standard', 'Cartuccia di combustibile'], sostituzione),
    cella('blu-standard', 'NEC Blu standard', 'Blu', 'standard', 1, 250, 200, 0.15, 'NC', 200, 2.5, ['Cella Blu standard'],
      ` ${frase('Gli impieghi a impulsi consumano Lx per attivazione. Il Blu standard, in un dispositivo predisposto, può erogare impulsi immediati da 50 Lx: la riserva di 250 Lx permette cinque attivazioni.')} ${frase('Le celle d’arma dedicate e i pacchi per lanciafiamme sono nel Manuale degli Armamenti, §§7.20.5–7.20.6.')}${sostituzione}`),
    cella('verde-standard', 'NEC Verde standard', 'Verde', 'standard', 1, 1000, 50, 0.15, 'CO', 100, 10, ['Cella Verde standard'], sostituzione),
    cella('modulo-rosso', 'Modulo Rosso', 'Rosso', 'modulo', 10, 5000, 1000, 2, 'NC', 600, 50, ['Modulo Rosso esterno'], `${pacco}${sostituzione}`),
    cella('modulo-blu', 'Modulo Blu', 'Blu', 'modulo', 10, 2500, 2000, 2, 'NC', 2100, 25, [], `${pacco}${sostituzione}`),
    cella('modulo-verde', 'Modulo Verde', 'Verde', 'modulo', 10, 10000, 500, 2, 'NC', 1100, 100, [], `${pacco}${sostituzione}`),
    cella('banco-rosso', 'Banco Rosso', 'Rosso', 'banco', 100, 50000, 10000, 20, 'RA', 6000, 500, [], banco),
    cella('banco-blu', 'Banco Blu', 'Blu', 'banco', 100, 25000, 20000, 20, 'RA', 21000, 250, [], banco),
    cella('banco-verde', 'Banco Verde', 'Verde', 'banco', 100, 100000, 5000, 20, 'RA', 11000, 1000, [], banco),
    voce({ id: 'contenitore-vuoto-per-modulo', nome: 'Contenitore vuoto per Modulo', famiglia: 'Moduli e banchi', par: '§5.4.4', costo: 100,
      note: frase('Un contenitore riutilizzabile vuoto costa 100 cr per Modulo o 1.000 cr per Banco con i dieci alloggiamenti. Le singole celle possono essere sostituite senza ricomprare il contenitore.') }),
    voce({ id: 'contenitore-vuoto-per-banco', nome: 'Contenitore vuoto per Banco', famiglia: 'Moduli e banchi', par: '§5.4.4', costo: 1000,
      note: frase('Un contenitore riutilizzabile vuoto costa 100 cr per Modulo o 1.000 cr per Banco con i dieci alloggiamenti. Le singole celle possono essere sostituite senza ricomprare il contenitore.') }),
    voce({ id: 'stazione-per-moduli', nome: 'Stazione per moduli', famiglia: 'Caricatori', par: '§5.4.6', peso: 3, rep: 'NC', costo: 2000,
      note: `Un modulo o fino a dieci celle standard; trasferimento massimo 10.000 Lx/h totali. ${frase('I caricatori non contengono una riserva: richiedono rete o banchi compatibili.')} ${frase('Il pacco Gehemmapuker da 2.500 Lx richiede un’ora con stazione per Moduli oppure due ore e mezza con caricatore portatile a piena potenza.')}`,
      extra: { caricatore: { formato: 'Un modulo o fino a dieci celle standard', trasferimento_lxh: 10000 } } }),
    voce({ id: 'stazione-per-banchi', nome: 'Stazione per banchi', famiglia: 'Caricatori', par: '§5.4.6', peso: 15, rep: 'RA', costo: 8000,
      note: `Un banco o fino a dieci moduli; trasferimento massimo 100.000 Lx/h totali. ${frase('I caricatori non contengono una riserva: richiedono rete o banchi compatibili.')}`,
      extra: { caricatore: { formato: 'Un banco o fino a dieci moduli', trasferimento_lxh: 100000 } } }),
  ];
  const d = {
    versione_manuale: VERSIONE,
    fonte: 'Manuale dell’Equipaggiamento 0.5, §5.4 Nuclei Energetici Cromatici (Google Doc del 01/10/2026)',
    _nota: 'Generato da tools/lotti/lotto_equipaggiamento_05.mjs --parte nec. «nec»: colore, formato (compatto, standard, modulo, banco), celle, capacità in Lx ed erogazione continua massima in Lx/h (§5.4.1, §5.4.4); «ricarica_costo»: ricarica completa a 0,01 cr/Lx (§5.4.6). Le celle d’arma dedicate e i pacchi dei lanciafiamme restano in munizioni.json (Armamenti §§7.20.5–7.20.6); il caricatore portatile è il «Caricatore da campo» di munizioni.json. Al tavolo la riserva in Lx si segna come i PM dei contenitori (src/equipaggiamento.js → riserveNec).',
    oggetti,
  };
  salva('data/equipaggiamento/nec.json', d);
  // caricatore portatile = Caricatore da campo degli Armamenti (stessi prezzo, peso e Integrità)
  const mun = leggi('data/equipaggiamento/munizioni.json');
  const campo = mun.oggetti.find((o) => o.id === 'caricatore-da-campo');
  campo.nomi_alternativi = [...new Set([...(campo.nomi_alternativi ?? []), 'Caricatore portatile'])];
  campo.caricatore = { formato: 'Una cella compatta, standard o ravvicinata', trasferimento_lxh: 1000 };
  // A.67: «il Gehemmapuker usa un Modulo Blu» (Armamenti §7.20.6) con gli stessi valori del Modulo Blu del §5.4.4
  mun.oggetti.find((o) => o.id === 'pacco-nec-gehemmapuker')['TODO(Davide)'] = 'A.67: il Gehemmapuker «usa un Modulo Blu» (Armamenti §7.20.6), con 2.500 Lx e 2.100 cr come il Modulo Blu del catalogo NEC (Equipaggiamento §5.4.4). È lo stesso Modulo (intercambiabile) o un formato d’arma dedicato (§5.4.5: «formato d’arma e Modulo non sono automaticamente intercambiabili»)? Nel frattempo due voci con gli stessi valori: questa, per la ricarica al tavolo, e nec:modulo-blu.';
  salva('data/equipaggiamento/munizioni.json', mun);
  // indice
  const indice = leggi('data/equipaggiamento/index.json');
  const voceIndice = { id: 'nec', file: 'nec.json', descrizione: 'Nuclei Energetici Cromatici: celle, moduli, banchi e stazioni di ricarica (Equipaggiamento 0.5, §5.4)' };
  indice.file = indice.file.filter((f) => f.id !== 'nec');
  indice.file.splice(indice.file.findIndex((f) => f.id === 'munizioni') + 1, 0, voceIndice);
  salva('data/equipaggiamento/index.json', indice);
  // regole del §5.4 (dati, non codice)
  const regole = leggi('data/regole.json');
  const nec = {
    paragrafo: 'Equipaggiamento §5.4',
    unita: 'Lx',
    tariffa_cr_per_lx: 0.01,
    ricarica: { ore: 1, mezza_riserva_minuti: 30, carica_blu_ravvicinata_minuti: 12 },
    sostituzione: { cella_o_modulo_azp: 1, banco_minuti: 1 },
    impulso_blu_lx: 50,
    colori: {
      Rosso: { capacita_lx: 500, erogazione_lxh: 100, impiego: IMPIEGO.Rosso },
      Blu: { capacita_lx: 250, erogazione_lxh: 200, impiego: IMPIEGO.Blu },
      Verde: { capacita_lx: 1000, erogazione_lxh: 50, impiego: IMPIEGO.Verde },
    },
    formati: { cella: 1, modulo: 10, banco: 100, matrice: 10000 },
    // passi dei pulsanti al tavolo: una scelta dell'app, non una regola (docs/equipaggiamento-lotti.md)
    passi_tavolo: { ore: [1, 5], usi: [1], lx: [10, 100], lx_grandi: [100, 1000] },
    frasi: [
      'Per il funzionamento continuo valgono due regole: l’erogazione disponibile deve essere almeno pari al consumo e l’autonomia in ore è la carica residua divisa per il consumo.',
      'La scheda riporta ore oppure cariche: non occorre annotare entrambe queste misure e i Lx. Le ore sono effettive, anche non consecutive; non si contano per Round.',
      'I NEC sono riutilizzabili. Celle e pacchi del catalogo si ricaricano normalmente in un’ora con caricatore e fonte adeguati. Mezza riserva richiede 30 minuti; una carica della Blu ravvicinata richiede 12 minuti.',
      'La tariffa ordinaria è 0,01 cr per Lx ripristinato.',
      'Gli apparecchi già venduti con batteria comprendono il NEC della loro scheda: il prezzo del ricambio non si aggiunge nuovamente al costo dell’oggetto.',
      'I NEC descritti qui alimentano tecnologia in Lx e non richiedono Sintonizzazione.',
    ].map(frase),
    _nota: 'Equipaggiamento 0.5, §5.4 (01/10/2026). Catalogo in data/equipaggiamento/nec.json; alimentazione degli oggetti nel campo «alimentazione» delle schede: NEC del catalogo (o descrizione per i NEC dedicati), consumo in Lx/h e autonomia in ore, oppure Lx per uso e numero di usi (§5.4.2: «ore oppure cariche»); «esterna»: l’oggetto non comprende il NEC (postazioni, laboratorio). Al tavolo si segna la riserva in ore o usi per gli apparecchi, in Lx per celle e pacchi; «Nuova sessione» non ricarica (serve caricatore e fonte, §5.4.6).',
  };
  // regole.json è scritto a mano con righe compatte: il blocco si inserisce come testo dopo «chroma»,
  // senza riformattare il resto (sostituisce quello di un passaggio precedente)
  if (!regole.chroma) throw new Error('regole.json senza «chroma»');
  const pr = new URL('data/regole.json', RADICE);
  let testo = readFileSync(pr, 'utf8');
  const eol = testo.includes('\r\n') ? '\r\n' : '\n';
  testo = testo.replace(/\r\n/g, '\n').replace(/\n {2}"nec": \{\n[\s\S]*?\n {2}\},(?=\n)/, '');
  const blocco = `  "nec": ${JSON.stringify(nec, null, 2).replace(/\n/g, '\n  ')},`;
  const fineChroma = testo.indexOf('\n  },\n', testo.indexOf('\n  "chroma": {')) + '\n  },'.length;
  testo = `${testo.slice(0, fineChroma)}\n${blocco}${testo.slice(fineChroma)}`;
  JSON.parse(testo);
  if (scrivi) writeFileSync(pr, testo.replace(/\n/g, eol));
  console.log(`NEC: ${oggetti.length} voci in nec.json; caricatore portatile = munizioni:caricatore-da-campo; regole.json → nec`);
}

// ---------------------------------------------------------------------------------------------------
// Strumenti professionali (§§5.1–5.3, 5.5–5.8)
function parteStrumenti() {
  const c = (x) => voce(x);
  const T = 'Strumenti tecnici e artigianali';
  const S = 'Strumenti scientifici e investigativi';
  const A = 'Attrezzature agricole e per l’allevamento';
  const I = 'Accesso e ispezione';
  const M = 'Camuffamento e occultamento';
  const E = 'Elettronica e informatica';
  const R = 'Strumenti culturali, artistici e rituali';
  const unSolo = frase('Si applica un solo modificatore degli strumenti: usare un corredo da +2 presso una postazione pertinente da +3 concede complessivamente +3.');
  const unSoloScienza = frase('Si applica un solo modificatore degli strumenti alla Prova pertinente: corredo da +2 e laboratorio da +3 concedono complessivamente +3.');
  const nec52 = frase('Il corredo portatile e la valigetta comprendono ciascuno un NEC Verde standard carico, cavo e alimentatore: 1.000 Lx, 25 Lx/h e 40 ore di uso.');
  const nec58 = frase('Il terminale di ciascun Corredo di ricerca o amministrativo, il Terminale per produzione multimediale e lo Strumento musicale elettronico utilizzano ciascuno un NEC Verde compatto da 100 Lx: consumo 2 Lx/h e autonomia 50 ore effettive, anche non consecutive.');
  const std58 = frase('Le versioni Standard hanno modificatore degli strumenti 0 al VA: rendono possibili le attività indicate, con le normali Abilità e Prove pertinenti.');
  const scasso = frasi('Entrambi i corredi da scasso comprendono grimaldelli, utensili di precisione, sonde meccaniche, interfaccia elettronica, cavi e adattatori. Si usa Furtività per serrature meccaniche e Tecnologia per quelle elettroniche. Un tentativo ordinario richiede un minuto, due mani e accesso alla serratura; per lavori complessi il Direttore stabilisce prima un tempo maggiore.',
    'Ogni corredo da scasso comprende un NEC Verde standard carico, cavo e alimentatore: 1.000 Lx, consumo complessivo 25 Lx/h, autonomia 40 ore effettive. Gli utensili manuali restano utilizzabili senza energia.');
  const camuffa = frase('Preparare un travestimento richiede dieci minuti e due mani, su sé stessi o su una persona collaborativa. Non occorre una Prova aggiuntiva per la sola preparazione: si usa Raggirare quando il travestimento viene valutato.');
  const mimetico = frase('Telo e rete devono essere adatti all’ambiente; non schermano la visione termica, non concedono AR e non nascondono automaticamente rumori, luci o tracce. Si applica un solo bonus degli strumenti, fino a +2. Nessuno di questi oggetti richiede NEC.');
  const corredoElettr = frasi('Ogni corredo comprende già un terminale tecnico, programmi di diagnostica e configurazione, multimetro, sonde, utensili di precisione, cavi e adattatori per collegamenti fisici entro 2 Q. Non occorre comprare anche il palmare.',
    'Ogni corredo usa un solo Verde standard da 1.000 Lx, alloggiato nel terminale, per tutti i componenti della configurazione: 25 Lx/h e 40 ore.');
  const oggetti = [
    // §5.1
    c({ id: 'cassetta-degli-attrezzi', nome: 'Cassetta degli attrezzi', famiglia: T, par: '§5.1', peso: 3, rep: 'CO', costo: 300,
      note: frasi('Strumenti Standard: consente smontaggio, montaggio, regolazioni e riparazioni meccaniche semplici, senza modificare il VA.', 'La cassetta degli attrezzi comprende chiavi, cacciaviti, pinze, martello, lime e strumenti di misura meccanici. Permette i lavori compatibili con questi utensili; non sostituisce apparecchi diagnostici elettronici o macchinari da officina.') }),
    c({ id: 'corredo-artigianale-professionale', nome: 'Corredo artigianale professionale', famiglia: T, par: '§5.1', peso: 4, rep: 'NC', costo: 1200,
      note: `${frasi('+2 VA a Tecnologia per lavorare e riparare prodotti del mestiere scelto all’acquisto.', 'Il corredo artigianale professionale è dedicato a un mestiere, per esempio sartoria, pelletteria, falegnameria o lavorazione manuale dei metalli. Comprende gli utensili portatili e gli strumenti di misura pertinenti. Il +2 vale soltanto per quel mestiere. Materiali da lavorare, ricambi, forge e macchinari pesanti sono separati.')} ${unSolo}`,
      breve: '+2 VA a Tecnologia per lavorare e riparare prodotti del mestiere scelto all’acquisto.',
      effetti: [va('Tecnologia', 2, 'uso_specifico', 'lavori del mestiere', '+2 VA a Tecnologia per lavorare e riparare prodotti del mestiere scelto all’acquisto.')] }),
    c({ id: 'postazione-di-lavoro-specializzata', nome: 'Postazione di lavoro specializzata', famiglia: T, par: '§5.1', peso: 40, rep: 'RA', costo: 6000,
      note: `${frasi('+3 VA a Tecnologia per una specifica attività scelta all’acquisto, eseguibile con l’attrezzatura installata.', 'La postazione di lavoro specializzata comprende banco, fissaggi, strumenti di misura e utensili per un’attività precisa, per esempio riparazione di armi, riparazione di circuiti elettronici o confezione di abiti. Il +3 vale esclusivamente per l’attività scelta. Richiede una superficie stabile, uno spazio di 2 × 2 Q e alimentazione esterna. Montarla o smontarla richiede 10 minuti a una persona, senza Prova in condizioni ordinarie. Consuma 1.000 Lx/h: una rete adeguata o un Modulo Rosso esterno da 5.000 Lx la alimentano; il Modulo offre cinque ore e si acquista separatamente. Non sostituisce impianti industriali.')} ${unSolo}`,
      breve: '+3 VA a Tecnologia per la specifica attività scelta all’acquisto.',
      effetti: [va('Tecnologia', 3, 'uso_specifico', 'attività scelta', '+3 VA a Tecnologia per una specifica attività scelta all’acquisto, eseguibile con l’attrezzatura installata.')],
      extra: { alimentazione: alim(MR, 1000, 5, { esterna: true }) } }),
    // §5.2
    c({ id: 'kit-di-campionamento', nome: 'Kit di campionamento', famiglia: S, par: '§5.2', peso: 1, rep: 'CO', costo: 200,
      note: frasi('Permette di prelevare, separare, etichettare e trasportare piccoli campioni con contenitori adatti. Strumenti Standard: nessun modificatore al VA.', 'Comprende pinzette, spatole, guanti, provette, buste, etichette e contenitori richiudibili. Un prelievo semplice da materiale accessibile richiede 1 minuto, senza Prova in condizioni ordinarie.', 'Il kit di campionamento non richiede alimentazione.') }),
    c({ id: 'corredo-di-analisi-da-campo', nome: 'Corredo di analisi da campo', famiglia: S, par: '§5.2', peso: 3, rep: 'NC', costo: 1500,
      note: `${frasi('+2 VA a Scienza per analisi preliminari nel campo scelto all’acquisto.', 'Si sceglie un campo, per esempio chimica, biologia o geologia. Il corredo comprende piccoli strumenti di misura, ottiche e test pertinenti, oltre al necessario per i normali prelievi.', 'Un’analisi preliminare richiede normalmente 10 minuti.')} ${nec52} ${unSoloScienza}`,
      breve: '+2 VA a Scienza per analisi preliminari nel campo scelto all’acquisto.',
      effetti: [va('Scienza', 2, 'uso_specifico', 'analisi', '+2 VA a Scienza per analisi preliminari nel campo scelto all’acquisto.')],
      extra: { alimentazione: alim(VS, 25, 40) } }),
    c({ id: 'laboratorio-da-campo-specializzato', nome: 'Laboratorio da campo specializzato', famiglia: S, par: '§5.2', peso: 60, rep: 'RA', costo: 12000,
      note: `${frasi('+3 VA a Scienza per analisi nel campo scelto; permette anche esami che richiedono una postazione attrezzata, se compatibili con i suoi strumenti.', 'Richiede una superficie stabile, uno spazio di 2 × 2 Q e alimentazione esterna. Una persona lo prepara o lo smonta in 30 minuti, senza Prova in condizioni ordinarie. Consuma 1.000 Lx/h: un Modulo Rosso esterno da 5.000 Lx offre cinque ore di uso e si acquista separatamente.', 'Un’analisi ordinaria di laboratorio richiede normalmente 1 ora; analisi complesse possono richiedere più tempo. Il +3 vale nel campo scelto.')} ${unSoloScienza}`,
      breve: '+3 VA a Scienza per analisi nel campo scelto.',
      effetti: [va('Scienza', 3, 'uso_specifico', 'analisi', '+3 VA a Scienza per analisi nel campo scelto; permette anche esami che richiedono una postazione attrezzata, se compatibili con i suoi strumenti.')],
      extra: { alimentazione: alim(MR, 1000, 5, { esterna: true }) } }),
    // §5.3
    c({ id: 'attrezzi-agricoli-di-base', nome: 'Attrezzi agricoli di base', famiglia: A, par: '§5.3', peso: 5, rep: 'CO', costo: 200,
      note: frasi('Permettono di preparare piccoli appezzamenti, seminare, potare e raccogliere. Strumenti Standard: nessun modificatore al VA.', 'Comprendono vanga, zappa, cesoie, piccolo rastrello e contenitore da raccolta. Sono sufficienti per lavori manuali su orti, aiuole e piccoli appezzamenti.') }),
    c({ id: 'corredo-del-coltivatore', nome: 'Corredo del coltivatore', famiglia: A, par: '§5.3', peso: 6, rep: 'NC', costo: 1000,
      note: frasi('+2 VA a Sopravvivenza per coltivare, trattare e raccogliere prodotti agricoli; +2 VA a Scienza per controlli semplici su terreno e colture eseguibili con gli strumenti compresi.', 'Il prezzo e il peso comprendono tutti i componenti: non occorre acquistare anche gli attrezzi di base. Gli strumenti sono manuali e non richiedono batterie.', 'Il bonus a Scienza vale soltanto per i controlli alla portata della dotazione.'),
      breve: '+2 VA a Sopravvivenza per coltivare; +2 VA a Scienza per controlli su terreno e colture.',
      effetti: [
        va('Sopravvivenza', 2, 'uso_specifico', 'coltivazione', '+2 VA a Sopravvivenza per coltivare, trattare e raccogliere prodotti agricoli; +2 VA a Scienza per controlli semplici su terreno e colture eseguibili con gli strumenti compresi.'),
        va('Scienza', 2, 'uso_specifico', 'controlli su terreno e colture', '+2 VA a Sopravvivenza per coltivare, trattare e raccogliere prodotti agricoli; +2 VA a Scienza per controlli semplici su terreno e colture eseguibili con gli strumenti compresi.'),
      ] }),
    c({ id: 'corredo-dell-allevatore', nome: 'Corredo dell’allevatore', famiglia: A, par: '§5.3', peso: 3, rep: 'NC', costo: 800,
      note: frasi('+2 VA a Sopravvivenza per accudire, alimentare e condurre animali domestici quando vengono impiegati gli strumenti del corredo.', 'Il bonus non si applica a cavalcare, combattere dalla sella o addomesticare automaticamente una creatura selvatica. Selle, finimenti da traino, gabbie e recinti sono separati.'),
      breve: '+2 VA a Sopravvivenza per accudire, alimentare e condurre animali domestici.',
      effetti: [va('Sopravvivenza', 2, 'uso_specifico', 'animali domestici', '+2 VA a Sopravvivenza per accudire, alimentare e condurre animali domestici quando vengono impiegati gli strumenti del corredo.')] }),
    // §5.5
    c({ id: 'piede-di-porco', nome: 'Piede di porco', famiglia: I, par: '§5.5', peso: 1.5, rep: 'CO', costo: 100, qualita: 'Comune', ps: 10, pi: 6,
      note: frasi('+2 alle Prove di Forza per fare leva, con un punto di appoggio adatto.', 'Il piede di porco richiede due mani e 1 AzP per un tentativo ordinario. Il bonus riguarda soltanto una Prova di Forza in cui si usa concretamente la leva; non concede un bonus generico agli attacchi.'),
      breve: '+2 alle Prove di Forza per fare leva.',
      effetti: [{ tipo: 'caratteristica', caratteristiche: ['FOR'], valore: 2, ambito: 'uso_specifico', uso: 'fare leva', condizione: '+2 alle Prove di Forza per fare leva, con un punto di appoggio adatto.' }] }),
    c({ id: 'corredo-da-scasso-standard', nome: 'Corredo da scasso Standard', famiglia: I, par: '§5.5', peso: 2, rep: 'NC', costo: 800, qualita: 'Comune', ps: 10, pi: 4,
      note: `${frase('Consente interventi su serrature meccaniche ed elettroniche compatibili; strumenti 0.')} ${scasso}`,
      extra: { alimentazione: alim(VS, 25, 40) } }),
    c({ id: 'corredo-da-scasso-professionale', nome: 'Corredo da scasso Professionale', famiglia: I, par: '§5.5', peso: 2, rep: 'RA', costo: 2400, qualita: 'Non comune', ps: 12, pi: 4,
      note: `${frase('Come lo Standard, con +2 alla Prova pertinente.')} ${scasso}`,
      breve: '+2 alla Prova di scasso: Furtività per le serrature meccaniche, Tecnologia per quelle elettroniche.',
      effetti: [
        va('Furtività', 2, 'uso_specifico', 'serrature meccaniche', 'Come lo Standard, con +2 alla Prova pertinente.'),
        va('Tecnologia', 2, 'uso_specifico', 'serrature e allarmi', 'Come lo Standard, con +2 alla Prova pertinente.'),
      ],
      extra: { alimentazione: alim(VS, 25, 40) } }),
    c({ id: 'sonda-ottica-flessibile', nome: 'Sonda ottica flessibile', famiglia: I, par: '§5.5', peso: 0.5, rep: 'NC', costo: 800, qualita: 'Non comune', ps: 12, pi: 2,
      note: frasi('Telecamera, luce e schermo; cavo da 2 Q, illuminazione fino a 1 Q davanti alla sonda.', 'Inserire e usare la sonda attraverso un’apertura accessibile richiede 1 AzP e due mani. L’osservazione usa le normali regole di Percezione, senza bonus; la sonda non offre visione termica. Un Verde compatto da 100 Lx alimenta l’intero dispositivo a 2 Lx/h per 50 ore; NEC carico, cavo e alimentatore compresi.'),
      extra: { alimentazione: alim(VC, 2, 50) } }),
    // §5.6
    c({ id: 'corredo-da-camuffamento-standard', nome: 'Corredo da camuffamento Standard', famiglia: M, par: '§5.6', peso: 2, rep: 'CO', costo: 300, qualita: 'Comune', ps: 10, pi: 4,
      note: `${frase('Trucchi, parrucche, barbe finte e piccoli accessori; modificatore degli strumenti 0.')} ${camuffa}` }),
    c({ id: 'corredo-da-camuffamento-professionale', nome: 'Corredo da camuffamento Professionale', famiglia: M, par: '§5.6', peso: 2, rep: 'NC', costo: 1200, qualita: 'Non comune', ps: 12, pi: 4,
      note: `${frase('+2 a Raggirare quando l’aspetto realizzato contribuisce al travestimento.')} ${camuffa} ${frase('Il bonus Professionale non migliora automaticamente voce, menzogne estranee all’aspetto o conoscenza di parole d’ordine.')}`,
      breve: '+2 a Raggirare quando l’aspetto realizzato contribuisce al travestimento.',
      effetti: [va('Raggirare', 2, 'uso_specifico', 'travestimento', '+2 a Raggirare quando l’aspetto realizzato contribuisce al travestimento.')] }),
    c({ id: 'telo-mimetico-personale', nome: 'Telo mimetico personale', famiglia: M, par: '§5.6', peso: 1, rep: 'NC', costo: 250, qualita: 'Comune', ps: 10, pi: 2,
      note: `${frase('+2 a Furtività per nascondersi rimanendo immobili, con colori e trama adatti al terreno.')} ${frase('Sistemare il telo richiede 1 AzP; il bonus vale finché il personaggio rimane immobile.')} ${mimetico}`,
      breve: '+2 a Furtività per nascondersi rimanendo immobili.',
      effetti: [{ ...va('Furtività', 2, 'situazionale', null, '+2 a Furtività per nascondersi rimanendo immobili, con colori e trama adatti al terreno.'), beneficio: 'mimetismo_strumenti' }] }),
    c({ id: 'rete-mimetica-da-campo', nome: 'Rete mimetica da campo', famiglia: M, par: '§5.6', peso: 4, rep: 'NC', costo: 600, qualita: 'Comune', ps: 10, pi: 4,
      note: `${frase('+2 a Furtività per occultare una postazione, materiali o un veicolo fermo interamente coperto; copre 4 × 4 Q.')} ${frase('Montare la rete richiede cinque minuti a una persona, con i fissaggi compresi.')} ${mimetico}`,
      breve: '+2 a Furtività per occultare una postazione, materiali o un veicolo fermo.',
      effetti: [va('Furtività', 2, 'uso_specifico', 'occultare postazioni e veicoli', '+2 a Furtività per occultare una postazione, materiali o un veicolo fermo interamente coperto; copre 4 × 4 Q.')] }),
    // §5.7
    c({ id: 'terminale-palmare', nome: 'Terminale palmare', famiglia: E, par: '§5.7', peso: 0.3, rep: 'CO', costo: 400, qualita: 'Comune', ps: 10, pi: 2,
      note: frasi('Consulta mappe, documenti e registrazioni; scambia dati con sistemi compatibili. Modificatore strumenti 0.', 'Il palmare richiede una mano e 1 AzP per richiamare un’informazione nota, mostrarla o avviare un trasferimento. I dati devono essere disponibili e il collegamento utilizzabile; non comprende utensili per intervenire sui circuiti.', 'Il palmare comprende un NEC Verde compatto da 100 Lx: 2 Lx/h, 50 ore.'),
      extra: { alimentazione: alim(VC, 2, 50) } }),
    c({ id: 'corredo-elettronico-e-informatico-standard', nome: 'Corredo elettronico e informatico Standard', famiglia: E, par: '§5.7', peso: 2.5, rep: 'NC', costo: 1000, qualita: 'Comune', ps: 10, pi: 4,
      note: `${frase('Diagnostica, programmazione, configurazione e piccoli interventi elettronici compatibili; strumenti 0.')} ${corredoElettr}`,
      extra: { alimentazione: alim(VS, 25, 40) } }),
    c({ id: 'corredo-elettronico-e-informatico-professionale', nome: 'Corredo elettronico e informatico Professionale', famiglia: E, par: '§5.7', peso: 2.5, rep: 'RA', costo: 3000, qualita: 'Non comune', ps: 12, pi: 4,
      note: `${frase('Come lo Standard; +2 a Tecnologia per lavori adeguati all’attrezzatura.')} ${corredoElettr} ${frase('Il +2 Professionale si applica soltanto a Tecnologia pertinente e non si somma al bonus di un corredo da scasso sulla stessa Prova.')}`,
      breve: '+2 a Tecnologia per lavori adeguati all’attrezzatura.',
      effetti: [va('Tecnologia', 2, 'uso_specifico', 'lavori elettronici', 'Come lo Standard; +2 a Tecnologia per lavori adeguati all’attrezzatura.')],
      extra: { alimentazione: alim(VS, 25, 40) } }),
    // §5.8
    ...[
      ['corredo-di-ricerca-documentale-standard', 'Corredo di ricerca documentale Standard', 1.5, 600, 'CO', 4, 'Terminale, riferimenti ordinari su un ambito scelto, taccuino e strumenti di scrittura. Permette consultazione e confronto delle fonti disponibili.', alim(VC, 2, 50)],
      ['corredo-amministrativo-standard', 'Corredo amministrativo Standard', 1, 500, 'CO', 4, 'Terminale con programmi di scrittura, contabilità e gestione dati; cartella e cancelleria. Permette di elaborare documenti, bilanci e registri.', alim(VC, 2, 50)],
      ['strumento-musicale-portatile-acustico', 'Strumento musicale portatile acustico', 2, 400, 'CO', 4, 'Uno strumento a scelta, con custodia e accessori necessari alla sua esecuzione.', null],
      ['strumento-musicale-portatile-elettronico', 'Strumento musicale portatile elettronico', 3, 800, 'NC', 4, 'Uno strumento con riproduzione sonora integrata, custodia e accessori.', alim(VC, 2, 50)],
      ['corredo-scenico-standard', 'Corredo scenico Standard', 2, 300, 'CO', 4, 'Costume, trucco e piccoli oggetti di scena per una forma di spettacolo scelta.', null],
      ['terminale-per-produzione-multimediale', 'Terminale per produzione multimediale', 0.5, 800, 'NC', 4, 'Dispositivo con programmi per scrittura, composizione e montaggio audio e video. Le riprese richiedono il registratore separato.', alim(VC, 2, 50)],
      ['corredo-rituale-standard', 'Corredo rituale Standard', 2, 300, 'CO', 4, 'Testo di riferimento, telo, ciotola, piccolo braciere, gessetti, incenso e strumenti di scrittura. Fornisce gli utensili ordinari per i Rituali pertinenti.', null],
      ['materiale-della-tradizione', 'Materiale della tradizione', 0.5, 100, 'CO', 2, 'Testo dottrinale e simbolo ordinario della propria tradizione. Non hanno proprietà magiche.', null],
      ['focus-personale-semplice', 'Focus personale semplice', 0.1, 50, 'CO', 2, 'Un piccolo oggetto, come un medaglione o una bacchetta, utilizzabile come Focus dopo la normale Sintonizzazione. Non aggiunge bonus o PM.', null],
    ].map(([id, nome, peso, costo, rep, pi, funzione, a]) => c({
      id, nome, famiglia: R, par: '§5.8', peso, rep, costo, qualita: 'Comune', ps: 10, pi,
      note: [frase(funzione), std58,
        id === 'corredo-rituale-standard' ? frase('Il Corredo rituale richiede comunque i materiali specifici indicati dal singolo Rituale.') : null,
        id === 'focus-personale-semplice' ? frase('Il Focus semplice segue le regole magiche del Manuale della Magia: quello assegnato alla creazione è già sintonizzato; un ricambio richiede la normale Sintonizzazione. Non è una riserva energetica e non contiene PM.') : null,
        id === 'corredo-scenico-standard' ? frase('Il Corredo scenico fornisce materiali per lo spettacolo scelto, senza concedere automaticamente i benefici del Corredo da camuffamento.') : null,
        a ? nec58 : null].filter(Boolean).join(' '),
      extra: a ? { alimentazione: a } : {},
    })),
  ];
  const d = {
    versione_manuale: VERSIONE,
    fonte: 'Manuale dell’Equipaggiamento 0.5, cap. 5 Strumenti professionali, §§5.1–5.3 e 5.5–5.8 (Google Doc del 01/10/2026)',
    _nota: 'Generato da tools/lotti/lotto_equipaggiamento_05.mjs --parte strumenti (docs/equipaggiamento-lotti.md). Solo i campi che la scheda dà: un dato mancante è assente, mai 0 (§1.11). Gli effetti numerici seguono docs/effetti-oggetti.md (uso specifico: il valore compare accanto all’Abilità); «Si applica un solo modificatore degli strumenti» (§5.1, §5.2). Corredo di manutenzione da campo e Valigetta investigativa ASA restano le schede degli Armamenti (corredi_dispositivi.json). NEC e consumi nel campo «alimentazione» (§5.4.7).',
    oggetti,
  };
  salva('data/equipaggiamento/strumenti_professionali.json', d);
  const indice = leggi('data/equipaggiamento/index.json');
  indice.file = indice.file.filter((f) => f.id !== 'strumenti_professionali');
  indice.file.splice(indice.file.findIndex((f) => f.id === 'comunicazione') + 1, 0,
    { id: 'strumenti_professionali', file: 'strumenti_professionali.json', descrizione: 'Strumenti professionali: tecnici, scientifici, agricoli, accesso, camuffamento, elettronica, culturali e rituali (Equipaggiamento 0.5, cap. 5)' });
  salva('data/equipaggiamento/index.json', indice);

  // voci di dotazione (A.34) che trovano la scheda nel capitolo 5: peso, prezzo, Qualità, PI ed effetti dalla scheda
  const DOT = {
    'corredo-da-scasso': 'strumenti_professionali:corredo-da-scasso-standard',
    'corredo-da-camuffamento': 'strumenti_professionali:corredo-da-camuffamento-standard',
    'corredo-artigianale-professionale': 'strumenti_professionali:corredo-artigianale-professionale',
    'cassetta-attrezzi': 'strumenti_professionali:cassetta-degli-attrezzi',
    'corredo-elettronico-informatico': 'strumenti_professionali:corredo-elettronico-e-informatico-standard',
    'corredo-ricerca-documentale': 'strumenti_professionali:corredo-di-ricerca-documentale-standard',
    'corredo-analisi-campo': 'strumenti_professionali:corredo-di-analisi-da-campo',
    'corredo-amministrativo': 'strumenti_professionali:corredo-amministrativo-standard',
    'corredo-scenico': 'strumenti_professionali:corredo-scenico-standard',
    'terminale-produzione-multimediale': 'strumenti_professionali:terminale-per-produzione-multimediale',
    'testo-dottrinale-e-simbolo': 'strumenti_professionali:materiale-della-tradizione',
    'focus-personale': 'strumenti_professionali:focus-personale-semplice',
    'corredo-rituale': 'strumenti_professionali:corredo-rituale-standard',
  };
  const dot = leggi('data/dotazioni.json');
  const perId = new Map(oggetti.map((o) => [`strumenti_professionali:${o.id}`, o]));
  const breve = (e) => (e ?? []).map((x) => `${x.abilita ?? x.tipo} ${x.valore > 0 ? '+' : ''}${x.valore} ${x.ambito}${x.uso ? ` (${x.uso})` : ''}`).join('; ') || 'nessuno';
  for (const [id, rif] of Object.entries(DOT)) {
    const o = dot.oggetti_dotazione[id];
    if (!o) throw new Error(`oggetto di dotazione inesistente: ${id}`);
    const scheda = perId.get(rif);
    if (o.effetti && breve(o.effetti) !== breve(scheda.effetti)) console.log(`  ! ${id}: §2.16 «${breve(o.effetti)}» → scheda «${breve(scheda.effetti)}» (vale la scheda)`);
    for (const k of ['peso', 'costo', 'paragrafo', 'effetti']) delete o[k];
    dot.oggetti_dotazione[id] = { nome: o.nome, rif, ...Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'nome' && k !== 'rif')) };
  }
  // A.65: due voci con più schede possibili restano senza collegamento
  for (const id of ['corredo-agricolo', 'strumento-musicale-portatile']) {
    dot.oggetti_dotazione[id]['TODO(Davide)'] = id === 'corredo-agricolo'
      ? 'A.65: il Corredo agricolo Standard si sceglie fra coltivazione e allevamento (§2.16.23); il §5.3 ha gli Attrezzi agricoli di base (Standard, coltivazione) ma per l’allevamento solo il Corredo dell’allevatore (+2, 800). Quale scheda per la versione «allevamento»? Nel frattempo la voce resta senza scheda (peso e prezzo da definire).'
      : 'A.65: lo Strumento musicale portatile Standard della dotazione è acustico o elettronico (§5.8: due schede, 400 e 800)? Nel frattempo la voce resta senza scheda (peso e prezzo da definire).';
  }
  dot._nota_oggetti_dotazione = 'Voci della dotazione del §2.16 senza modello di armamento. Con «rif» hanno una scheda di catalogo (Manuale dell’Equipaggiamento 0.3–0.5, cap. 2–6, tools/lotti/lotto_equipaggiamento_03.mjs; cap. 5, tools/lotti/lotto_equipaggiamento_05.mjs; Corredo di manutenzione da campo: Armamenti §7.13.7): nome della dotazione, peso, prezzo, Qualità, PI ed effetti dalla scheda, anche per i personaggi già salvati (risolvi() tramite dotazione_id). Senza «rif» restano «da definire» (A.34: peso assente non è 0 kg, prezzo assente non dà credito di scambio). Nessun oggetto della dotazione che non sia un armamento assegnato si cede nello scambio iniziale (§2.16.29).';
  salva('data/dotazioni.json', dot);
  console.log(`Strumenti: ${oggetti.length} voci (${oggetti.filter((o) => o.effetti).length} con effetti); ${Object.keys(DOT).length} voci di dotazione collegate`);
}

// ---------------------------------------------------------------------------------------------------
// Alimentazione degli oggetti fuori dai cap. 2–4 (§5.4.7–5.4.9)
function parteAlimentazione() {
  const A = {
    'accessori_armi:torcia-tattica': alim(VC, 2, 50),
    'accessori_armi:modulo-di-visione-notturna': alim(VS, 10, 100),
    'accessori_armi:modulo-di-visione-termica': alim(VS, 10, 100),
    'sanitario:scanner-diagnostico-portatile': alim(VS, 25, 40),
    'sanitario:scanner-diagnostico-cybertronic': alim(VS, 25, 40),
    'sanitario:postazione-medica-da-campo': alim(MR, 1000, 5, { esterna: true }),
    'elmetti:elmetto-asa-recon': alim(VS, 25, 40, { paragrafo: '§5.4.8' }),
    'corredi_dispositivi:corredo-di-manutenzione-da-campo': alim(VS, 25, 40, { paragrafo: '§5.1' }),
    'corredi_dispositivi:valigetta-investigativa-asa': alim(VS, 25, 40, { paragrafo: '§5.2' }),
    // «La versione Capitol segue lo stesso profilo» (§5.2)
    'corredi_dispositivi:valigetta-investigativa-capitol': alim(VS, 25, 40, { paragrafo: '§5.2' }),
    // NEC Rosso dedicato del robot (Armamenti §7.18): 8 ore, non a catalogo
    'unita_robotiche:cuirassier-attila': { nec: null, descrizione: 'NEC Rosso dedicato', autonomia_ore: 8, paragrafo: 'Armamenti §7.18' },
  };
  const perFile = {};
  for (const [rif, a] of Object.entries(A)) { const [f, id] = rif.split(':'); (perFile[f] ??= {})[id] = a; }
  for (const [f, voci] of Object.entries(perFile)) {
    const p = `data/equipaggiamento/${f}.json`;
    const j = leggi(p);
    for (const [id, a] of Object.entries(voci)) {
      const o = j.oggetti.find((x) => x.id === id);
      if (!o) throw new Error(`${f}:${id} mancante`);
      o.alimentazione = a;
    }
    salva(p, j);
  }
  console.log(`Alimentazione: ${Object.keys(A).length} schede fuori dai cap. 2–4`);
}

const PARTI = { nec: parteNec, strumenti: parteStrumenti, alimentazione: parteAlimentazione };
if (!PARTI[parte]) { console.error('uso: --parte nec|strumenti|alimentazione [--scrivi]'); process.exit(1); }
PARTI[parte]();
console.log(scrivi ? 'scritto' : 'prova a vuoto: --scrivi per scrivere');

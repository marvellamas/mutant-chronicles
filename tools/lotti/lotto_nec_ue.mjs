// Lotto 1 dei manuali del 27–28/10/2026 (docs/diff-manuali-2026-10-28.md): i NEC in Unità Energetiche e
// l'elettronica ordinaria senza conteggi (Equipaggiamento 0.13, §5.4; Armamenti 0.65; Giocatore 0.50).
//
// Che cosa scrive:
//  - nec.json: i formati del §5.4.4 in UE (Moduli 10, Banchi 100); i ricambi Verdi dell'elettronica ordinaria senza
//    capacità (non si contano); il Rosso standard degli utensili con la capacità «da definire»;
//  - il campo «alimentazione» delle voci: «ordinaria: true» (nessun contatore), oppure ore, preparazioni, operazioni o
//    giorni come dice la scheda, senza Lx;
//  - le frasi con i Lx nelle note delle voci e nelle dotazioni (§2.16 del Giocatore): sostituite con le frasi dei
//    manuali nuovi, prese dal testo salvato in docs/manuali-txt/ (niente scritto a mano);
//  - regole.json → nec: unità, sigle, tariffa, formati, frasi del §5.4.
// Non tocca il lotto 2 (celle d'arma, pacchi, caricatori e trasformatori, IAS: A.189–A.191): quelle voci restano in
// Lx e sono elencate in regole.json → nec.lotto_2. Non tocca i veicoli (lotto 5).
//
//   node tools/lotti/lotto_nec_ue.mjs            prova a vuoto: dice che cosa cambierebbe
//   node tools/lotti/lotto_nec_ue.mjs --scrivi   scrive
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { bloccaRiscrittura } from './superato.mjs';

// 30/10/2026 (lotto 146): lotto storico. Equipaggiamento 0.22 ha riscritto il modello (NEC, CEC, MEC e BEC in cariche): un rilancio
// con --scrivi riporterebbe i dati ai Moduli e ai Banchi in UE. Il lotto in vigore è tools/lotti/lotto_nec_cariche.mjs.
bloccaRiscrittura('lotto_nec_ue.mjs');

const R = fileURLToPath(new URL('../../', import.meta.url));
const SCRIVI = process.argv.includes('--scrivi');
const EQ = `${R}data/equipaggiamento/`;
const leggi = (p) => JSON.parse(readFileSync(p, 'utf8'));
const scriviJson = (p, x) => { if (SCRIVI) writeFileSync(p, `${JSON.stringify(x, null, 2)}\n`); };
const VERSIONE = 'Equipaggiamento 0.13';

// --- testi dei manuali nuovi -------------------------------------------------------------------------------------
const pulisci = (s) => s.replace(/\*\*/g, '').replace(/\\([+.\-*#_()[\]!>|~=&])/g, '$1').replace(/\s+/g, ' ').trim();
const manuale = Object.fromEntries(['equipaggiamento', 'armamenti', 'giocatore'].map((m) => [m, readFileSync(`${R}docs/manuali-txt/${m}.md`, 'utf8').split('\n').map(pulisci)]));
// frasi del manuale: si divide al punto; nelle note anche al punto e virgola (pezzi più piccoli da togliere)
const frasiDi = (riga) => riga.split(/(?<=\.)\s+(?=[A-ZÀ-Ý«(0-9])/);
const pezziDi = (nota) => nota.split(/(?<=[.;])\s+(?=[A-ZÀ-Ý«(0-9a-zà-ý])/);
/**
 * La frase del manuale che contiene `frase`, nella riga che contiene `riga` (se data): errore se non c'è o se è
 * ambigua. Così ogni testo che il lotto scrive è copiato dal manuale.
 */
function dal(m, frase, riga = null) {
  const righe = manuale[m].filter((x) => (riga ? x.includes(riga) : true) && x.includes(frase));
  const trovate = [...new Set(righe.flatMap((x) => frasiDi(x).filter((f) => f.includes(frase))))];
  if (trovate.length !== 1) throw new Error(`${m}: «${frase}»${riga ? ` (riga «${riga}»)` : ''} trovata ${trovate.length} volte`);
  return trovate[0];
}

// --- classificazione delle voci con «alimentazione» -------------------------------------------------------------
// ordinaria: elettronica personale ordinaria, §5.4.3 (nessun contatore); ore/usi: contatore della scheda.
const ORDINARIA = { paragrafo: '§5.4.3' };
const VOCI = {
  'accessori_armi:torcia-tattica': { ordinaria: true, frasi: [['armamenti', 'Gli accessori elettronici ordinari usano NEC Verdi']] },
  'accessori_armi:modulo-di-visione-notturna': { ordinaria: true, frasi: [['armamenti', 'Gli accessori elettronici ordinari usano NEC Verdi']] },
  'accessori_armi:modulo-di-visione-termica': { ordinaria: true, frasi: [['armamenti', 'Gli accessori elettronici ordinari usano NEC Verdi']] },
  'comunicazione:comunicatore-personale': { ordinaria: true, frasi: [['equipaggiamento', 'I comunicatori personali e da squadra e la stazione radio portatile ordinaria usano NEC Verdi']] },
  'comunicazione:comunicatore-da-squadra': { ordinaria: true, frasi: [['equipaggiamento', 'I comunicatori personali e da squadra e la stazione radio portatile ordinaria usano NEC Verdi']] },
  'comunicazione:stazione-radio-portatile': { ordinaria: true, frasi: [['equipaggiamento', 'I comunicatori personali e da squadra e la stazione radio portatile ordinaria usano NEC Verdi']] },
  'comunicazione:visore-notturno': { ordinaria: true, frasi: [['equipaggiamento', 'Ogni visore comprende NEC Verde standard carico']] },
  'comunicazione:visore-termico': { ordinaria: true, frasi: [['equipaggiamento', 'Ogni visore comprende NEC Verde standard carico']] },
  'comunicazione:registratore-audiovisivo': { ordinaria: true, frasi: [['equipaggiamento', 'L’elettronica ordinaria non richiede conteggi energetici (§5.4.3); sostituzione del ricambio accessibile in 1 AzP', 'Registratore e Rilevatore ambientale usano un Verde compatto']] },
  'comunicazione:kit-di-videosorveglianza': { ordinaria: true, frasi: [['equipaggiamento', 'La videosorveglianza usa una cella per componente'], ['equipaggiamento', 'L’elettronica ordinaria non richiede conteggi energetici (§5.4.3); sostituzione del ricambio accessibile in 1 AzP', 'Registratore e Rilevatore ambientale usano un Verde compatto']] },
  'comunicazione:kit-di-allarme-perimetrale': { ordinaria: true, frasi: [['equipaggiamento', 'La videosorveglianza usa una cella per componente'], ['equipaggiamento', 'L’elettronica ordinaria non richiede conteggi energetici (§5.4.3); sostituzione del ricambio accessibile in 1 AzP', 'Registratore e Rilevatore ambientale usano un Verde compatto']] },
  'comunicazione:rilevatore-ambientale': { ordinaria: true, frasi: [['equipaggiamento', 'Registratore e Rilevatore ambientale usano un Verde compatto'], ['equipaggiamento', 'L’elettronica ordinaria non richiede conteggi energetici (§5.4.3); sostituzione del ricambio accessibile in 1 AzP', 'Registratore e Rilevatore ambientale usano un Verde compatto']] },
  'comunicazione:rilevatore-di-sorveglianza': { ordinaria: true, frasi: [['equipaggiamento', 'l’uso ordinario non richiede un contatore energetico (§5.4.3)', 'Ricambio carico 100 cr; sostituzione 1 AzP']] },
  'corredi_dispositivi:valigetta-investigativa-asa': { ordinaria: true, frasi: [['equipaggiamento', 'Il corredo portatile e la valigetta comprendono ciascuno'], ['equipaggiamento', 'L’elettronica diagnostica ordinaria non richiede un registro energetico']] },
  'corredi_dispositivi:valigetta-investigativa-capitol': { ordinaria: true, frasi: [['equipaggiamento', 'Il corredo portatile e la valigetta comprendono ciascuno'], ['equipaggiamento', 'L’elettronica diagnostica ordinaria non richiede un registro energetico']] },
  'corredi_dispositivi:corredo-di-manutenzione-da-campo': { ordinaria: true, frasi: [['equipaggiamento', 'La diagnostica ordinaria usa un NEC Verde standard senza conteggio energetico']] },
  'dotazioni_personali:torcia-elettrica': { ordinaria: true, frasi: [['equipaggiamento', 'Torcia, Lampada frontale e Lanterna usano NEC Verdi']] },
  'dotazioni_personali:lampada-frontale': { ordinaria: true, frasi: [['equipaggiamento', 'Torcia, Lampada frontale e Lanterna usano NEC Verdi']] },
  'dotazioni_personali:lanterna-elettrica': { ordinaria: true, frasi: [['equipaggiamento', 'Torcia, Lampada frontale e Lanterna usano NEC Verdi']] },
  'elmetti:elmetto-asa-recon': { ordinaria: true, frasi: [['equipaggiamento', 'L’ASA Recon non richiede più ore di batteria']] },
  'esplorazione:navigatore-inerziale': { ordinaria: true, frasi: [['equipaggiamento', 'Rientra nell’elettronica ordinaria senza conteggio energetico (§5.4.3)', 'Peso 0,3 kg; costo 600 cr']] },
  'sanitario:scanner-diagnostico-portatile': { ordinaria: true, frasi: [['equipaggiamento', 'I due scanner diagnostici usano un Verde standard senza conteggio energetico ordinario']] },
  'sanitario:scanner-diagnostico-cybertronic': { ordinaria: true, frasi: [['equipaggiamento', 'I due scanner diagnostici usano un Verde standard senza conteggio energetico ordinario']] },
  'strumenti_professionali:corredo-di-analisi-da-campo': { ordinaria: true, frasi: [['equipaggiamento', 'Il corredo portatile e la valigetta comprendono ciascuno'], ['equipaggiamento', 'L’elettronica diagnostica ordinaria non richiede un registro energetico']] },
  'strumenti_professionali:corredo-da-scasso-standard': { ordinaria: true, frasi: [['equipaggiamento', 'Ogni corredo da scasso comprende un NEC Verde standard'], ['equipaggiamento', 'L’interfaccia elettronica ordinaria non richiede un contatore energetico']] },
  'strumenti_professionali:corredo-da-scasso-professionale': { ordinaria: true, frasi: [['equipaggiamento', 'Ogni corredo da scasso comprende un NEC Verde standard'], ['equipaggiamento', 'L’interfaccia elettronica ordinaria non richiede un contatore energetico']] },
  'strumenti_professionali:sonda-ottica-flessibile': { ordinaria: true, frasi: [['equipaggiamento', 'L’intero dispositivo usa un Verde compatto, senza conteggio energetico ordinario']] },
  'strumenti_professionali:terminale-palmare': { ordinaria: true, frasi: [['equipaggiamento', 'Il palmare comprende un NEC Verde compatto'], ['equipaggiamento', 'L’elettronica ordinaria non richiede un conteggio di autonomia']] },
  'strumenti_professionali:corredo-elettronico-e-informatico-standard': { ordinaria: true, frasi: [['equipaggiamento', 'Il palmare comprende un NEC Verde compatto'], ['equipaggiamento', 'L’elettronica ordinaria non richiede un conteggio di autonomia']] },
  'strumenti_professionali:corredo-elettronico-e-informatico-professionale': { ordinaria: true, frasi: [['equipaggiamento', 'Il palmare comprende un NEC Verde compatto'], ['equipaggiamento', 'L’elettronica ordinaria non richiede un conteggio di autonomia']] },
  'strumenti_professionali:corredo-di-ricerca-documentale-standard': { ordinaria: true, frasi: [['equipaggiamento', 'Rientrano nell’elettronica ordinaria senza conteggio energetico (§5.4.3)', 'Il terminale di ciascun Corredo di ricerca']] },
  'strumenti_professionali:corredo-amministrativo-standard': { ordinaria: true, frasi: [['equipaggiamento', 'Rientrano nell’elettronica ordinaria senza conteggio energetico (§5.4.3)', 'Il terminale di ciascun Corredo di ricerca']] },
  'strumenti_professionali:strumento-musicale-portatile-elettronico': { ordinaria: true, frasi: [['equipaggiamento', 'Rientrano nell’elettronica ordinaria senza conteggio energetico (§5.4.3)', 'Il terminale di ciascun Corredo di ricerca']] },
  'strumenti_professionali:terminale-per-produzione-multimediale': { ordinaria: true, frasi: [['equipaggiamento', 'Rientrano nell’elettronica ordinaria senza conteggio energetico (§5.4.3)', 'Il terminale di ciascun Corredo di ricerca']] },
  'strumenti_professionali:analizzatore-alimentare-portatile': { ordinaria: true, frasi: [['equipaggiamento', 'elettronica ordinaria senza contatore energetico (§5.4.3)', 'Peso completo 1 kg; costo 1.200 cr']] },
  // contano ancora, con il contatore della scheda (§5.4.8)
  'esplorazione:corredo-da-cucina-da-campo': { usi: 10, unita_usi: 'preparazioni', paragrafo: '§3.2', frasi: [['equipaggiamento', 'Il fornello dispone di dieci preparazioni ordinarie'], ['equipaggiamento', 'Si segnano soltanto le preparazioni rimaste']] },
  'esplorazione:verricello-portatile-chroma': { ore: 5, frasi: [['equipaggiamento', 'La riserva offre cinque ore effettive di movimento']] },
  'esplorazione:tuta-extraveicolare': { ore: 40, frasi: [['equipaggiamento', 'Il NEC Verde dedicato offre 40 ore di funzionamento complessivo']] },
  'esplorazione:riparo-pressurizzato': { ore: 20, frasi: [['equipaggiamento', 'Il NEC Verde dedicato alimenta il riparo per 20 ore']] },
  'strumenti_professionali:utensile-laser-da-taglio-e-saldatura': { ore: 5, frasi: [['equipaggiamento', '5 ore effettive di lavoro anche non consecutive, registrate come unico contatore energetico']] },
  // alimentazione esterna: un Modulo Rosso da 10 UER, cinque ore, 2 UER per ora (§5.4.8)
  'sanitario:postazione-medica-da-campo': { esterna: true, ore: 5, ue_per_ora: 2, frasi: [['equipaggiamento', 'cinque ore di lavoro con un Modulo da 10 UER'], ['equipaggiamento', 'Si annota l’autonomia; 2 UER ripristinano un’ora', 'cinque ore di lavoro con un Modulo da 10 UER']] },
  'strumenti_professionali:postazione-di-lavoro-specializzata': { esterna: true, ore: 5, ue_per_ora: 2, frasi: [['equipaggiamento', 'Una rete adeguata o un Modulo Rosso esterno da 10 UER la alimentano'], ['equipaggiamento', 'Si annota l’autonomia; 2 UER ripristinano un’ora', 'Una rete adeguata o un Modulo Rosso esterno']] },
  'strumenti_professionali:laboratorio-da-campo-specializzato': { esterna: true, ore: 5, ue_per_ora: 2, frasi: [['equipaggiamento', 'Un Modulo Rosso esterno da 10 UER offre cinque ore di lavoro'], ['equipaggiamento', 'Si annota l’autonomia; 2 UER ripristinano un’ora', 'Un Modulo Rosso esterno da 10 UER offre cinque ore di lavoro']] },
};
// le postazioni medicochirurgiche (§6.8): operazioni Rosse e giorni Verdi, senza Lx
const POSTAZIONI = ['semiautomatica-fissa', 'semiautomatica-mobile', 'automatica-standard-fissa', 'automatica-standard-mobile', 'automatica-professionale-fissa', 'automatica-professionale-mobile', 'automatica-specializzata-fissa', 'automatica-specializzata-mobile'].map((x) => `sanitario:postazione-${x}`);
// lotto 2 (A.189–A.191): celle d'arma, pacchi, caricatori, IAS; restano in Lx finché non risponde Davide
const LOTTO_2 = {
  nec: ['blu-standard', 'modulo-blu', 'stazione-per-moduli', 'stazione-per-banchi'],
  voci: ['corredi_dispositivi:ias3100-generatore-blink', 'corredi_dispositivi:ias3200-imbracatura-antigravita', 'corredi_dispositivi:ias3300-mirrorshard', 'corredi_dispositivi:ias3400-disturbatore-metafisico', 'corredi_dispositivi:smorzatore-acustico-silent', 'armi_corporative:katana-ryujin', 'armi_corporative:csa-404'],
  file: ['munizioni'],
};

// note con i Lx fuori dall'«alimentazione»: artefatti (batterie), rinforzi (CS-R20)
const NOTE = {
  'artefatti:batteria-da-5-pm-chroma-rosso': [['armamenti', 'Le celle tecnologiche NEC usano cariche e UE']],
  'artefatti:batteria-da-5-pm-chroma-blu': [['armamenti', 'Le celle tecnologiche NEC usano cariche e UE']],
  'artefatti:batteria-da-5-pm-chroma-verde': [['armamenti', 'Le celle tecnologiche NEC usano cariche e UE']],
  'artefatti:batteria-da-5-pm-chroma-bianco': [['armamenti', 'Le celle tecnologiche NEC usano cariche e UE']],
  'rinforzi:piastre-reattive-cs-r20': [['armamenti', 'Il CS-R20 usa un NEC Verde standard dedicato'], ['armamenti', 'Questa funzione ordinaria non richiede un conteggio energetico']],
};

const conLx = (s) => /\bLx\b|Lx\/h|cr\/Lx/.test(s);
// frasi che il manuale vecchio (Giocatore 0.49, Armamenti 0.64, Equipaggiamento 0.8: commit 76290cc) aveva e il nuovo
// non ha più: un pezzo di nota che sta solo lì è superato e si toglie, anche senza Lx («Le ore sono effettive…»)
const vecchi = ['equipaggiamento', 'armamenti', 'giocatore'].map((m) => execFileSync('git', ['-C', R, 'show', `76290cc:docs/manuali-txt/${m}.md`], { encoding: 'utf8', maxBuffer: 1e8 }).split('\n').map(pulisci).join(' '));
const nuovi = Object.values(manuale).map((x) => x.join(' '));
const superato = (pezzo) => {
  const t = pulisci(pezzo).replace(/[;.]$/, '');
  return t.length >= 15 && vecchi.some((v) => v.includes(t)) && !nuovi.some((x) => x.includes(t));
};
/** La nota senza le frasi con i Lx e senza quelle superate, più le frasi nuove del manuale (una volta sola). */
function notaNuova(nota, frasi) {
  const pezzi = pezziDi(nota ?? '');
  const via = pezzi.map((f) => conLx(f) || superato(f));
  // un pezzo rimasto che finiva con «;» subito prima di un pezzo tolto: ora chiude la frase
  const tenute = pezzi.map((f, i) => (!via[i] && f.endsWith(';') && via[i + 1] ? `${f.slice(0, -1)}.` : f)).filter((f, i) => !via[i]);
  const aggiunte = frasi.map(([m, frase, riga]) => dal(m, frase, riga)).filter((f, i, a) => a.indexOf(f) === i && !tenute.join(' ').includes(f));
  return [...tenute, ...aggiunte].join(' ').trim();
}

const rapporto = { ue: [], senza: [], ore_usi: [], esterna: [], da_definire: [], note: [] };
const file = {};
const prendi = (f) => (file[f] ??= leggi(`${EQ}${f}.json`));

// --- voci con alimentazione -------------------------------------------------------------------------------------
for (const [chiave, c] of Object.entries(VOCI)) {
  const [f, id] = chiave.split(':');
  const o = prendi(f).oggetti.find((x) => x.id === id);
  if (!o) throw new Error(`${chiave} non c'è`);
  const vecchia = o.alimentazione;
  const nec = vecchia.nec;
  if (c.ordinaria) {
    o.alimentazione = { nec, ordinaria: true, paragrafo: ORDINARIA.paragrafo };
    rapporto.senza.push(chiave);
  } else if (c.esterna) {
    o.alimentazione = { nec, autonomia_ore: c.ore, ue_per_ora: c.ue_per_ora, esterna: true, paragrafo: '§5.4.8' };
    rapporto.esterna.push(chiave);
  } else if (c.usi) {
    o.alimentazione = { nec, usi: c.usi, unita_usi: c.unita_usi, paragrafo: c.paragrafo ?? vecchia.paragrafo };
    rapporto.ore_usi.push(chiave);
  } else {
    o.alimentazione = { nec, autonomia_ore: c.ore, paragrafo: '§5.4.8' };
    rapporto.ore_usi.push(chiave);
  }
  o.note_manuale = notaNuova(o.note_manuale, c.frasi);
  if (o.decisione && conLx(o.decisione)) o.decisione = o.decisione.replace('50 Lx a preparazione (10 con un NEC Rosso standard pieno)', 'dieci preparazioni con il NEC Rosso dedicato (Equipaggiamento 0.13, §3.2)');
  // l'edizione del manuale da cui viene la voce: Armamenti 0.65 o Equipaggiamento 0.13
  o.versione_manuale = String(o.versione_manuale).startsWith('Armamenti') ? 'Armamenti 0.65' : VERSIONE;
}
for (const chiave of POSTAZIONI) {
  const [f, id] = chiave.split(':');
  const o = prendi(f).oggetti.find((x) => x.id === id);
  o.alimentazione = o.alimentazione.map(({ lx_per_uso, ...a }) => a);
  rapporto.ore_usi.push(chiave);
}

// --- note con i Lx -------------------------------------------------------------------------------------------------
for (const [chiave, frasi] of Object.entries(NOTE)) {
  const [f, id] = chiave.split(':');
  const o = prendi(f).oggetti.find((x) => x.id === id);
  o.note_manuale = notaNuova(o.note_manuale, frasi);
  rapporto.note.push(chiave);
}

// --- nec.json (§5.4.4) ----------------------------------------------------------------------------------------------
const formati = dal('equipaggiamento', 'Il Modulo commerciale costa 500 cr vuoto e 600 cr carico');
const unColore = dal('equipaggiamento', 'Ogni Modulo o Banco contiene un solo colore');
const sfusa = dal('equipaggiamento', 'L’energia sfusa costa 10 cr per UE');
const ordinarie = dal('equipaggiamento', 'Le celle per elettronica ordinaria non sono ricambi universali');
const NEC = {
  'verde-compatto': { nec: { colore: 'Verde', formato: 'compatto', uso: 'elettronica_ordinaria' }, costo: 10, peso: 0.015, reperibilita: 'CO', nota: `Verde compatto per elettronica ordinaria: 15 g, CO, 10 cr carico (§5.4.4). ${dal('equipaggiamento', 'Torce, comunicatori personali, mirini, visori, sensori')} ${ordinarie}` },
  'verde-standard': { nec: { colore: 'Verde', formato: 'standard', uso: 'elettronica_ordinaria' }, costo: 100, peso: 0.15, reperibilita: 'CO', nota: `Verde standard per elettronica ordinaria: 150 g, CO, 100 cr carico (§5.4.4). ${dal('equipaggiamento', 'Torce, comunicatori personali, mirini, visori, sensori')} ${ordinarie}` },
  'rosso-standard': { nec: { colore: 'Rosso', formato: 'standard', uso: 'utensili', capacita_ue: null }, costo: 50, peso: 0.15, reperibilita: 'CO', nota: `Rosso standard per utensili del catalogo: 150 g, CO, 50 cr carico (§5.4.4). Si conta l’autonomia dell’utensile che lo monta (§5.4.8); la capacità in UE del ricambio non è indicata: da definire.` },
  'modulo-rosso': { nec: { colore: 'Rosso', formato: 'modulo', capacita_ue: 10 }, costo: 600, peso: 2, reperibilita: 'NC', ricarica: 100 },
  'modulo-verde': { nec: { colore: 'Verde', formato: 'modulo', capacita_ue: 10 }, costo: 600, peso: 2, reperibilita: 'NC', ricarica: 100 },
  'banco-rosso': { nec: { colore: 'Rosso', formato: 'banco', capacita_ue: 100 }, costo: 6000, peso: 20, reperibilita: 'RA', ricarica: 1000 },
  'banco-blu': { nec: { colore: 'Blu', formato: 'banco', capacita_ue: 100 }, costo: 6000, peso: 20, reperibilita: 'RA', ricarica: 1000 },
  'banco-verde': { nec: { colore: 'Verde', formato: 'banco', capacita_ue: 100 }, costo: 6000, peso: 20, reperibilita: 'RA', ricarica: 1000 },
  'contenitore-vuoto-per-modulo': { costo: 500, nota: `Modulo commerciale vuoto (§5.4.4). ${formati}` },
  'contenitore-vuoto-per-banco': { costo: 5000, nota: `Banco commerciale vuoto (§5.4.4). ${dal('equipaggiamento', 'Il Banco commerciale costa 5.000 cr vuoto e 6.000 cr carico')}` },
};
const necJson = prendi('nec');
necJson._nota = 'Formati del §5.4.4 dell’Equipaggiamento 0.13 (tools/lotti/lotto_nec_ue.mjs, 28/10/2026). «nec»: colore, formato (compatto, standard, modulo, banco) e capacita_ue (Modulo 10, Banco 100; null = da definire), oppure uso «elettronica_ordinaria» (ricambio senza conteggio, §5.4.3); «ricarica_costo»: ricarica completa a 10 cr per UE. Restano in Lx, con lo schema di prima, le voci del lotto 2 (regole.json → nec.lotto_2: celle d’arma, Modulo Blu del Gehemmapuker, stazioni di ricarica), fino alle risposte A.189–A.191. Al tavolo si segnano le UE di Moduli e Banchi (src/equipaggiamento.js → riserveNec).';
for (const [id, c] of Object.entries(NEC)) {
  const o = necJson.oggetti.find((x) => x.id === id);
  if (!o) throw new Error(`nec:${id} non c'è`);
  if (c.nec) o.nec = c.nec;
  for (const k of ['costo', 'peso', 'reperibilita']) if (c[k] !== undefined) o[k] = c[k];
  if (c.ricarica !== undefined) o.ricarica_costo = c.ricarica; else delete o.ricarica_costo;
  const sigla = { Rosso: 'UER', Blu: 'UEB', Verde: 'UEV' }[c.nec?.colore];
  o.note_manuale = c.nota ?? `${c.nec.formato === 'modulo' ? 'Modulo energetico' : 'Banco energetico'}: ${c.nec.capacita_ue} ${sigla} (§5.4.4). ${c.nec.formato === 'modulo' ? formati : dal('equipaggiamento', 'Il Banco commerciale costa 5.000 cr vuoto e 6.000 cr carico')} ${unColore} ${sfusa}`;
  o.paragrafo = '§5.4.4';
  o.versione_manuale = VERSIONE;
  if (c.nec?.capacita_ue === null) rapporto.da_definire.push(`nec:${id} (capacità in UE)`);
  else if (c.nec?.capacita_ue) rapporto.ue.push(`nec:${id}`);
  else if (c.nec?.uso === 'elettronica_ordinaria') rapporto.senza.push(`nec:${id}`);
}

// --- regole.json → nec ----------------------------------------------------------------------------------------------
const regole = leggi(`${R}data/regole.json`);
// rilanciabile: dopo la prima scrittura le regole di prima (tariffa in Lx, ricarica, impulso) stanno in nec.lotto_2
const n = regole.nec.unita === 'UE' ? { ...regole.nec, ...regole.nec.lotto_2 } : regole.nec;
const impieghi = (sigla) => manuale.equipaggiamento.find((x) => x.startsWith(`| ${sigla} ·`))?.split('|')[2].trim();
regole.nec = {
  travaso: n.travaso,
  paragrafo: 'Equipaggiamento §5.4',
  unita: 'UE',
  colori: Object.fromEntries([['Rosso', 'UER'], ['Blu', 'UEB'], ['Verde', 'UEV']].map(([c, s]) => [c, { sigla: s, impieghi: impieghi(s) }])),
  cariche_per_ue: 10,
  tariffa_cr_per_ue: 10,
  formati_ue: { modulo: 10, banco: 100 },
  elettronica_ordinaria: {
    paragrafo: '§5.4.3',
    testo: dal('equipaggiamento', 'Torce, comunicatori personali, mirini, visori, sensori'),
    in_scheda: 'NEC compreso · elettronica ordinaria, senza conteggio (§5.4.3)',
  },
  da_convertire: {
    domanda: 'A.193',
    testo: 'riserva da convertire (A.193)',
    spiegazione: 'La riserva salvata è in Lx; il manuale ora la conta in UE e l’equivalenza non è definita. Il valore resta nel file e si converte dopo la risposta di Davide (A.193).',
  },
  sostituzione: n.sostituzione,
  passi_tavolo: { ...n.passi_tavolo, ue: [1, 10] },
  // lotto 2 (A.189–A.191): celle d'arma, pacchi, caricatori e IAS restano in Lx con le regole di prima
  lotto_2: {
    _nota: 'Celle d’arma, pacchi, caricatori, trasformatori e IAS: Armamenti 0.65 §7.20.5–7.20.6, lotto 2 (docs/diff-manuali-2026-10-28.md), dopo le A.189–A.191. Fino ad allora queste voci restano in Lx con le regole qui sotto.',
    nec: LOTTO_2.nec,
    voci: LOTTO_2.voci,
    file: LOTTO_2.file,
    tariffa_cr_per_lx: n.tariffa_cr_per_lx,
    ricarica: n.ricarica,
    impulso_blu_lx: n.impulso_blu_lx,
  },
  frasi: [
    dal('equipaggiamento', 'Le riserve si esprimono in Unità Energetiche Rosse, Blu o Verdi'),
    dal('equipaggiamento', '1 UE del colore appropriato permette di ripristinare 10 cariche personali'),
    dal('equipaggiamento', 'Torce, comunicatori personali, mirini, visori, sensori'),
    dal('equipaggiamento', 'Gli apparecchi venduti con batteria comprendono il NEC carico dichiarato'),
    sfusa,
    dal('equipaggiamento', 'I NEC tecnologici non richiedono Sintonizzazione'),
  ],
  _nota: 'Equipaggiamento 0.13, §5.4 (28/10/2026): riserve in Unità Energetiche per colore (UER, UEB, UEV); Modulo 10 UE, Banco 100 UE; l’elettronica personale ordinaria non si conta («alimentazione.ordinaria»). Al tavolo si segnano le ore o gli usi dei dispositivi che li hanno (verricello, utensile, tuta, riparo, fornello, postazioni medicochirurgiche) e le UE di Moduli e Banchi; le riserve salvate in Lx di un oggetto ora in UE restano nel file come «da convertire» (A.193). Catalogo in data/equipaggiamento/nec.json.',
};
if (SCRIVI) writeFileSync(`${R}data/regole.json`, `${JSON.stringify(regole, null, 2)}\n`);

// --- dotazioni.json: le righe del §2.16 del Giocatore 0.49 → 0.50 --------------------------------------------------
const giocatore049 = execFileSync('git', ['-C', R, 'show', '76290cc:docs/manuali-txt/giocatore.md'], { encoding: 'utf8', maxBuffer: 1e8 }).split('\n');
const giocatore050 = readFileSync(`${R}docs/manuali-txt/giocatore.md`, 'utf8').split('\n');
if (giocatore049.length !== giocatore050.length) throw new Error('il Giocatore 0.50 non ha più le stesse righe della 0.49: l’abbinamento riga per riga non vale');
const coppie = new Map();
// tutte le righe cambiate del Giocatore (0.49 → 0.50 riscrive solo le frasi sui NEC): una riga delle dotazioni copiata
// dalla 0.49 diventa la riga della 0.50
giocatore049.forEach((x, i) => { if (x !== giocatore050[i]) coppie.set(pulisci(x), pulisci(giocatore050[i])); });
const dotazioni = leggi(`${R}data/dotazioni.json`);
let righeDotazioni = 0;
const sostituisci = (v) => {
  if (typeof v === 'string') {
    const nuova = coppie.get(pulisci(v));
    if (nuova === undefined && !conLx(v)) return v;
    if (nuova === undefined) throw new Error(`dotazioni.json: riga con i Lx senza corrispondente nel Giocatore 0.50: «${v.slice(0, 80)}…»`);
    righeDotazioni++;
    return nuova;
  }
  if (Array.isArray(v)) return v.map(sostituisci);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sostituisci(x)]));
  return v;
};
const dotazioniNuove = sostituisci(dotazioni);
if (SCRIVI) writeFileSync(`${R}data/dotazioni.json`, `${JSON.stringify(dotazioniNuove, null, 2)}\n`);

for (const [f, x] of Object.entries(file)) scriviJson(`${EQ}${f}.json`, x);

console.log(`Senza conteggio (elettronica ordinaria): ${rapporto.senza.length}`);
console.log(`Contano ancora in ore, preparazioni, operazioni o giorni: ${rapporto.ore_usi.length}`);
console.log(`Alimentazione esterna (Modulo Rosso da 10 UER, 5 ore, 2 UER per ora): ${rapporto.esterna.length}`);
console.log(`Riserve in UE (Moduli e Banchi): ${rapporto.ue.length} — ${rapporto.ue.join(', ')}`);
console.log(`Da definire: ${rapporto.da_definire.length} — ${rapporto.da_definire.join(', ')}`);
console.log(`Note aggiornate senza alimentazione: ${rapporto.note.length}; righe delle dotazioni: ${righeDotazioni}`);
console.log(`Lotto 2 (restano in Lx): ${LOTTO_2.nec.length} voci di nec.json, ${LOTTO_2.voci.length} voci, file ${LOTTO_2.file.join(', ')}`);
console.log(SCRIVI ? 'Scritto.' : 'Prova a vuoto: niente scritto (--scrivi per scrivere).');

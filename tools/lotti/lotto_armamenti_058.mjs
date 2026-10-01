// Lotto 1 dell'aggiornamento del 01/10/2026: Manuale degli Armamenti 0.58 (Google Doc del 01/10, 10:17 UTC).
// Diff in docs/diff-manuali-2026-10-01.md; testo in docs/manuali-txt/armamenti.md.
//   node tools/lotti/lotto_armamenti_058.mjs            prova a vuoto
//   node tools/lotti/lotto_armamenti_058.mjs --scrivi   scrive i JSON (idempotente)
// Contenuto:
// - Katana Ryūjin (§7.1.9, Mishima): profilo della Katana con attivazione +1d6 Plasma a cella, come la
//   Lancia Duskdealer; compatibile con la cella ravvicinata comune (§7.20.5);
// - celle energetiche (§7.20.5): NEC Blu con riserva in Lx, nuovi prezzi della cella carica e della
//   ricarica (0,01 cr/Lx), testo riscritto dal manuale;
// - lanciafiamme (§7.20.6): niente più combustibile liquido; i serbatoi diventano pacchi NEC Blu carichi
//   (getti, Lx, prezzo, ricarica). Gli id cambiano («vuoto» non vale più: src/ricarica.js → eVuoto);
//   la voce «Combustibile per lanciafiamme» esce dal catalogo (le voci salvate restano, senza effetti);
// - caricatore da campo: testo del §7.20.5.
// Le frasi singole cambiate negli altri oggetti (accessori, sanitario, IAS, robot, rinforzo CS-R20…) sono
// state aggiornate con tools/lotti/aggiorna_frasi.mjs; il catalogo dei NEC arriva con l'Equipaggiamento 0.5.
import { readFileSync, writeFileSync } from 'node:fs';
import { normalizza, testoManuali } from '../verifica_frasi.mjs';

const RADICE = new URL('../../', import.meta.url);
const scrivi = process.argv.includes('--scrivi');
const VERSIONE = 'Armamenti 0.58';
const DOC = testoManuali();
const frase = (t) => { if (!DOC.includes(normalizza(t))) throw new Error(`frase non trovata nel Doc: ${t.slice(0, 100)}`); return t; };
const leggi = (f) => JSON.parse(readFileSync(new URL(`data/equipaggiamento/${f}.json`, RADICE), 'utf8'));
const salva = (f, j) => { if (scrivi) writeFileSync(new URL(`data/equipaggiamento/${f}.json`, RADICE), JSON.stringify(j, null, 2) + '\n'); };

// --- Katana Ryūjin -------------------------------------------------------------------------------
const armi = leggi('armi_corporative');
const katana = armi.oggetti.find((o) => o.id === 'katana');
const dusk = armi.oggetti.find((o) => o.id === 'lancia-duskdealer');
const ryujin = {
  ...structuredClone(katana),
  id: 'katana-ryujin', nome: 'Katana Ryūjin',
  note_manuale: [
    frase('Katana Ryūjin. Lama al plasma. Proprietà: Precisa 1. Attivazione: +1d6 Plasma; 5 cariche a cella. Manovre compatibili: Affondo, Spazzata.'),
    frase('La Ryūjin conserva una lama metallica: a cella scarica usa il profilo ordinario della Katana. L’attivazione avvolge il filo con un impulso di plasma e porta il danno a 1d8+1+1d6, risolto come un unico colpo Naturale. Il prezzo comprende una cella ravvicinata comune NEC Blu da 250 Lx, carica: 5 attivazioni da 50 Lx. Dichiarazione, consumo e PS Riflessi seguono il §7.1.4; l’effetto Plasma segue il §7.5.1. Ricambio carico 200 cr; ricarica completa 2,5 cr in un’ora; sostituzione 1 AzP (§7.20.5).'),
  ].join(' '),
  versione_manuale: VERSIONE,
  // §7.1.9, tabella dei dati economici: Non comune, PS INT 12, REP RA, 4.000
  reperibilita: 'RA', costo: 4000,
  attivazione: structuredClone(dusk.attivazione),
  munizioni: structuredClone(dusk.munizioni),
};
const iK = armi.oggetti.findIndex((o) => o.id === 'katana');
armi.oggetti = armi.oggetti.filter((o) => o.id !== 'katana-ryujin');
armi.oggetti.splice(iK + 1, 0, ryujin);
salva('armi_corporative', armi);

// --- celle e pacchi (§7.20.5–7.20.6) --------------------------------------------------------------
const mun = leggi('munizioni');
const NOTA_CELLE = [
  frase('Le celle tecnologiche delle armi sono NEC Blu riutilizzabili e venduti carichi. L’energia si misura in Lx; il giocatore annota le cariche o i colpi. La ricarica costa 0,01 cr/Lx. Il produttore della cella non modifica danni, INC, SIN o proprietà dell’arma.'),
  frase('La ravvicinata comune usa una Blu standard da 250 Lx: cinque impulsi immediati da 50 Lx. Le quattro armi a distanza consumano 25 Lx per colpo e usano formati dedicati con una, due o tre celle secondo la riserva. Hellblazer e Intruder non sono intercambiabili. La cadenza resta quella dell’arma; un NEC più grande non aumenta i danni.'),
  frase('Per le armi ravvicinate si dichiara l’attivazione prima dell’attacco e si applica la PS Riflessi per risparmiare la carica in caso di Prova per colpire fallita (§7.1.4). Un attacco riuscito ma poi evitato o assorbito consuma la carica. Ogni attivazione ordinaria consuma una carica; a zero cariche resta il profilo non attivato dell’arma.'),
  frase('Per le armi a energia a distanza ogni colpo sparato consuma una carica anche se manca il bersaglio. AC non moltiplica il consumo e non è prevista la PS per risparmiare il colpo. A zero cariche l’arma non può sparare.'),
  frase('Sostituire una cella compatibile già pronta richiede 1 AzP, senza Prova, disponendo delle mani necessarie. Ricaricare da vuota una delle celle in tabella richiede un’ora, un caricatore adatto e una fonte di energia adeguata. In condizioni ordinarie non occorre una Prova.'),
  frase('Tempo e costo della ricarica parziale sono proporzionali all’energia ripristinata. Si possono usare soltanto le cariche complete disponibili. La cella ravvicinata ripristina una carica ogni 12 minuti, al costo di 0,5 cr. Un attacco ordinario senza elettrificazione non consuma la carica.'),
].join(' ');
// tabella del §7.20.5: Capacità, Riserva Lx, Carica cr, Ricarica cr
const CELLE = {
  'cella-ravvicinata-comune': [250, 200, 2.5],
  'cella-del-fucile-al-plasma-commerciale': [500, 400, 5],
  'cella-hellblazer': [750, 600, 7.5],
  'cella-kep-808': [250, 200, 2.5],
  'cella-intruder': [750, 600, 7.5],
};
for (const [id, [lx, costo, ricarica]] of Object.entries(CELLE)) {
  const o = mun.oggetti.find((x) => x.id === id);
  if (!o) throw new Error(`cella mancante: ${id}`);
  Object.assign(o, { note_manuale: NOTA_CELLE, versione_manuale: VERSIONE, costo, cella: { ...o.cella, ricarica_costo: ricarica, riserva_lx: lx } });
}
const ravv = mun.oggetti.find((x) => x.id === 'cella-ravvicinata-comune');
if (!ravv.compatibile_con.includes('armi_corporative:katana-ryujin')) {
  const i = ravv.compatibile_con.indexOf('armi_corporative:lancia-duskdealer');
  ravv.compatibile_con.splice(i >= 0 ? i : ravv.compatibile_con.length, 0, 'armi_corporative:katana-ryujin');
}
const campo = mun.oggetti.find((x) => x.id === 'caricatore-da-campo');
Object.assign(campo, {
  note_manuale: [
    frase('Costa 500 cr, pesa 0,5 kg, REP NC, PI 4, Qualità Comune e PS Integrità 10. Ricarica una cella alla volta, fino a 1.000 Lx/h, e comprende i connettori per le celle della tabella. Richiede una fonte esterna e non contiene una riserva. Ricarica i NEC tecnologici; non ricarica riserve mistiche in PM.'),
    frase('Le riserve mistiche mantengono il §7.5.1 e il Manuale della Magia. Robot, esoscheletri, propulsori e moduli specialistici conservano formati, autonomie e tempi delle proprie schede: non adottano automaticamente le celle comuni. Capacità o consumi in Lx non ancora dichiarati restano da dimensionare per il modello.'),
    frase('Le celle di trazione sono NEC Rossi riutilizzabili, ricaricabili e sostituibili. Formati, capacità e autonomie dei mezzi seguono le rispettive schede; non si trasferiscono automaticamente i tempi delle celle portatili. Regole comuni e catalogo NEC: Manuale dell’Equipaggiamento, §5.4.'),
  ].join(' '),
  versione_manuale: VERSIONE, peso: 0.5,
});

const NOTA_PACCHI = [
  frase('I lanciafiamme sono emettitori termici alimentati da NEC Blu: non impiegano combustibile liquido. Un getto consuma 50 Lx. Ogni pacco ha un formato compatibile con il modello; l’alloggiamento fisso è compreso nell’arma, mentre il pacco carico si acquista separatamente.'),
  frase('Ogni attacco consuma un getto anche se manca il bersaglio. AC 1d3 non moltiplica il consumo. Restano danno, proprietà Fuoco, gittata, INC e modalità del modello. I pacchi da 250, 500 e 750 Lx contengono una, due e tre celle Blu; il Gehemmapuker usa un Modulo Blu.'),
  frase('Sostituire un pacco compatibile pronto richiede 1 AzP, entrambe le mani e nessuna Prova. I pacchi fino a 750 Lx si ricaricano in un’ora con caricatore portatile e fonte adeguati. Il Gehemmapuker richiede un’ora con stazione per Moduli o due ore e mezza con caricatore portatile a piena potenza. Ricariche parziali proporzionali; prezzi e stazioni nel Manuale dell’Equipaggiamento, §5.4.'),
].join(' ');
// tabella del §7.20.6: Getti, Riserva Lx, Pacco carico cr, Ricarica cr
const PACCHI = {
  'serbatoio-vuoto-nemesis-214': ['pacco-nec-nemesis-214', 'Pacco NEC Blu Nemesis 214', 'Serbatoio Nemesis 214', 5, 250, 200, 2.5],
  'serbatoio-vuoto-del-lanciafiamme-commerciale': ['pacco-nec-lanciafiamme-commerciale', 'Pacco NEC Blu del lanciafiamme commerciale', 'Serbatoio del lanciafiamme commerciale', 10, 500, 400, 5],
  'serbatoio-vuoto-eruptor': ['pacco-nec-eruptor', 'Pacco NEC Blu Eruptor', 'Serbatoio Eruptor', 10, 500, 400, 5],
  'serbatoio-vuoto-purifier': ['pacco-nec-purifier', 'Pacco NEC Blu Purifier', 'Serbatoio Purifier', 15, 750, 600, 7.5],
  'serbatoio-vuoto-gehemmapuker': ['pacco-nec-gehemmapuker', 'Modulo Blu Gehemmapuker', 'Serbatoio Gehemmapuker', 50, 2500, 2100, 25],
};
for (const [vecchio, [id, nome, alt, getti, lx, costo, ricarica]] of Object.entries(PACCHI)) {
  const o = mun.oggetti.find((x) => x.id === vecchio || x.id === id);
  if (!o) throw new Error(`serbatoio mancante: ${vecchio}`);
  Object.assign(o, {
    id, nome, nomi_alternativi: [alt], famiglia: 'Celle energetiche', note_manuale: NOTA_PACCHI, versione_manuale: VERSIONE,
    costo, cella: { capacita: getti, unita: 'getti', ricarica_costo: ricarica, riserva_lx: lx },
  });
}
mun.oggetti = mun.oggetti.filter((o) => o.id !== 'combustibile-per-lanciafiamme');
mun.ricarica._nota = mun.ricarica._nota.replace('(razzi, dardi chimici, combustibile)', '(razzi, dardi chimici)')
  .replace('«cella» (armi con celle compatibili: una cella piena sostituisce quella esaurita)', '«cella» (armi con celle compatibili, compresi i pacchi NEC dei lanciafiamme del §7.20.6: una cella piena sostituisce quella esaurita)');
salva('munizioni', mun);

const indice = JSON.parse(readFileSync(new URL('data/equipaggiamento/index.json', RADICE), 'utf8'));
for (const f of indice.file) if (f.id === 'munizioni') f.descrizione = f.descrizione.replace('celle, combustibile', 'celle e pacchi NEC dei lanciafiamme');
if (scrivi) writeFileSync(new URL('data/equipaggiamento/index.json', RADICE), JSON.stringify(indice, null, 2) + '\n');

// --- NEC degli accessori (§7.3.4) -------------------------------------------------------------------
const acc = leggi('accessori_armi');
const VECCHIE_734 = 'Torcia tattica, Modulo di visione notturna e Modulo di visione termica utilizzano la stessa batteria di servizio. Ogni accessorio impiega la propria batteria e dispone di 24 ore effettive di funzionamento, anche non consecutive. Non si conteggia il consumo per Round.';
const NUOVE_734 = frase('Gli accessori elettronici usano NEC Verdi ricaricabili. Ogni accessorio autonomo impiega la propria cella; le funzioni integrate nell’elmetto condividono invece il NEC dell’elmetto. Le ore sono effettive e non si contano per Round.');
const RICARICA_734 = frase('NEC carico, cavo e alimentatore sono compresi. Ricarica completa in un’ora con fonte adeguata, a 0,01 cr/Lx; un Verde compatto richiede 1 cr, uno standard 10 cr. Ricambio carico: 10 cr compatto, 100 cr standard, REP CO. Sostituire un NEC pronto richiede 1 AzP senza Prova. Il cavo non contiene una riserva.');
// tabella del §7.3.4: Dispositivo, NEC, Consumo, Autonomia
const RIGHE_734 = [['Torcia tattica', 'Verde compatto 100 Lx', '2 Lx/h', '50 ore'], ['Visione notturna o termica', 'Verde standard 1.000 Lx', '10 Lx/h', '100 ore'], ['Elmetto elettronico', 'Verde standard 1.000 Lx', '25 Lx/h', '40 ore']];
const PER_ACCESSORIO = { 'torcia-tattica': RIGHE_734[0], 'modulo-di-visione-notturna': RIGHE_734[1], 'modulo-di-visione-termica': RIGHE_734[1] };
for (const [id, [, nec, consumo, autonomia]] of Object.entries(PER_ACCESSORIO)) {
  const o = acc.oggetti.find((x) => x.id === id);
  if (o.note_manuale.includes(VECCHIE_734)) o.note_manuale = o.note_manuale.replace(VECCHIE_734, `${NUOVE_734} Alimentazione: NEC ${nec}, ${consumo}, ${autonomia} (§7.3.4).`);
  if (!o.note_manuale.includes('NEC Verdi ricaricabili')) throw new Error(`${id}: testo del §7.3.4 non aggiornato`);
  o.versione_manuale = VERSIONE;
}
const tabella734 = { titolo: 'NEC degli accessori', colonne: ['Dispositivo', 'NEC', 'Consumo', 'Autonomia'], righe: RIGHE_734 };
const ricambio = (id, nome, alt, costo) => ({
  id, nome, tipo: 'altro', catalogo: 'Commerciale', famiglia: 'Illuminazione e visione', nomi_alternativi: alt,
  note_manuale: `${NUOVE_734} ${RICARICA_734} ${frase('Gli elmetti del §7.21 hanno un consumo complessivo unico. Catalogo, formati e ricarica dei NEC sono nel Manuale dell’Equipaggiamento, §5.4. Celle d’arma e pacchi dei lanciafiamme sono nel §7.20. Robot, propulsori ed esoscheletri mantengono le autonomie specifiche; le riserve mistiche restano in PM.')}`,
  paragrafo: '§7.3.4', versione_manuale: VERSIONE, reperibilita: 'CO', costo, tabelle: [tabella734], proprieta: [],
  effetto_breve: `Ricambio carico del NEC ${nome.includes('compatto') ? 'della Torcia tattica' : 'dei moduli di visione e dell’elmetto elettronico'} (§7.3.4).`,
});
// l'id della vecchia «Batteria di servizio» resta (voci salvate); il ricambio standard è nuovo
const iB = acc.oggetti.findIndex((x) => x.id === 'batteria-di-servizio');
acc.oggetti[iB] = ricambio('batteria-di-servizio', 'NEC Verde compatto di ricambio', ['Batteria di servizio', 'Batteria carica di ricambio'], 10);
acc.oggetti = acc.oggetti.filter((x) => x.id !== 'nec-verde-standard-di-ricambio');
acc.oggetti.splice(iB + 1, 0, ricambio('nec-verde-standard-di-ricambio', 'NEC Verde standard di ricambio', [], 100));
salva('accessori_armi', acc);

// --- rinforzo CS-R20 (§7.23) e Gehemmapuker (§7.17) ---------------------------------------------------
const rin = leggi('rinforzi');
const cs = rin.oggetti.find((x) => x.id === 'piastre-reattive-cs-r20');
cs.note_manuale = cs.note_manuale.replace(/È l’unico modello di questo catalogo che richiede alimentazione per la proprietà speciale\. Il CS-R20 usa la stessa batteria di servizio[^]*?ricambio carico 10\./,
  frase('Il CS-R20 è l’unico rinforzo di questo catalogo che alimenta una proprietà speciale. Usa un NEC Verde standard dedicato e indipendente dall’elmetto: 1.000 Lx, 25 Lx/h e 40 ore effettive. Ricarica in un’ora, costo 10 cr; ricambio carico 100 cr (§§7.3.4 e 7.21.3).'));
if (/batteria di servizio/.test(cs.note_manuale)) throw new Error('CS-R20: testo dell’alimentazione non aggiornato');
cs.versione_manuale = VERSIONE;
salva('rinforzi', rin);
const dist = leggi('armi_distanza_corporative');
const geh = dist.oggetti.find((x) => x.id === 'gehemmapuker');
geh.note_manuale = geh.note_manuale.replace('Combustibile separato.', frase('Pacco NEC Blu separato (§7.20.6).'));
geh.versione_manuale = VERSIONE;
salva('armi_distanza_corporative', dist);

console.log(`Katana Ryūjin, ${Object.keys(CELLE).length} celle, ${Object.keys(PACCHI).length} pacchi NEC, caricatore da campo, NEC degli accessori, CS-R20, Gehemmapuker${scrivi ? ': scritto' : ' (prova: --scrivi per scrivere)'}.`);

// Lotto 181 (08/11/2026): tre risposte di Davide del 06/11 — A.251 (come si alimenta la CyberArma),
// A.256 (prezzo di vendita degli artefatti) e A.257 (valore corrente del FIAT LUX). Scrive:
//  - data/equipaggiamento/armi.json → le tre voci della CyberArma: «alimentazione_modifiche» (le due famiglie
//    di modifiche, che cosa si perde, i consumi), «ogni_colpi» nei consumi delle conversioni, la scelta
//    dell'alimentazione nel progetto di Paradise e «unico» (pezzo unico: senza prezzo di catalogo);
//  - data/regole.json → «prezzi_artefatti»: la formula della A.256, i coefficienti di rarità e l'arrotondamento;
//  - data/equipaggiamento/artefatti.json → rarità dell'Anello corretta (Molto Rara, A.256) con il suo costo di
//    costruzione, rarità della CyberArma a NeC allineata al §7.10, e «unico» su Scrigno e Tomo (reliquie);
//  - data/veicoli.json → «valore»: le regole del valore dell'esemplare (A.257) e le voci della dotazione extra
//    del FIAT LUX, con quantità e prezzo unitario, perché il totale segua l'inventario.
// Il comportamento è in src/cyberarma.js, src/prezzi-artefatti.js e src/valore-veicolo.js.
// Uso: node tools/lotti/lotto_181_cyberarma_prezzi.mjs [--scrivi]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (f) => JSON.parse(fs.readFileSync(join(R, f), 'utf8'));
const F_ARMI = 'data/equipaggiamento/armi.json';
const F_ART = 'data/equipaggiamento/artefatti.json';
const F_REG = 'data/regole.json';
const F_VEI = 'data/veicoli.json';

const armi = leggi(F_ARMI);
const art = leggi(F_ART);
const reg = leggi(F_REG);
const vei = leggi(F_VEI);
const vocArmi = (id) => armi.oggetti.find((x) => x.id === id);
const vocArt = (id) => art.oggetti.find((x) => x.id === id);

// ───────────────────────── A. A.251: come si alimenta la CyberArma ─────────────────────────
// «La sola sostituzione del cristallo e l’inserimento di una SIN consentono ancora di alimentare la CyberArma con
// i PM personali. L’inserimento di una riserva interna di CM oppure la conversione a NeC impediscono invece l’uso
// dei PM personali e fanno perdere le proprietà da Custode. Configurazione CM: 1 CM + 1 AzP ogni 10 colpi;
// conversione NeC rossa: 1 carica + 1 AzP ogni 10 colpi. Cristallo e SIN possono coesistere con l’alimentazione a
// PM personali; CM e NeC sono conversioni energetiche alternative.» (Davide, 06/11/2026)
const FONTE_251 = 'A.251 (Davide, 06/11/2026); Armamenti 0.74 §§7.25–7.25.4';
const PERDITE = ['l’alimentazione con i PM personali', 'le proprietà da Custode'];

vocArmi('cyberarma').alimentazione_modifiche = {
  fonte: FONTE_251,
  _nota: 'A.251: due famiglie di modifiche che non si comportano allo stesso modo. Cristallo sostituito e SIN inserita non toccano l’alimentazione: l’arma continua a potersi alimentare con i PM personali e le due cose possono coesistere con quell’alimentazione. Riserva interna di CM e conversione a NeC sono conversioni energetiche alternative: impediscono l’uso dei PM personali, fanno perdere le proprietà da Custode e non si cumulano fra loro. La scelta non si torna indietro facilmente: va detta in chiaro prima di confermare, perché chi la fa da un tablet non ha il manuale davanti.',
  pm_personali_predefiniti: true,
  perdite: PERDITE,
  famiglie: [
    {
      id: 'cristallo',
      nome: 'Cristallo sostituito',
      conversione: false,
      pm_personali: true,
      proprieta_custode: true,
      testo: 'Il cristallo focalizzatore è sostituito. L’arma continua a potersi alimentare con i PM personali e conserva le proprietà da Custode; coesiste con la SIN.',
    },
    {
      id: 'sin',
      nome: 'Modulo SIN inserito',
      conversione: false,
      pm_personali: true,
      proprieta_custode: true,
      testo: 'Il modulo neurale SIN è inserito (§7.25.2). L’arma continua a potersi alimentare con i PM personali e conserva le proprietà da Custode; coesiste con il cristallo sostituito.',
    },
    {
      id: 'riserva_cm',
      nome: 'Riserva interna di CM',
      conversione: true,
      pm_personali: false,
      proprieta_custode: false,
      voce: 'armi:cyberarma-batteria-verde',
      consumo: { cm: 1, azione: '1 AzP', ogni_colpi: 10, testo: '1 CM + 1 AzP ogni 10 colpi' },
      testo: 'Conversione energetica: la riserva interna di Cariche Mistiche alimenta l’arma. Si perdono l’alimentazione con i PM personali e le proprietà da Custode. Consumo: 1 CM + 1 AzP ogni 10 colpi. Non si cumula con la conversione a NeC.',
    },
    {
      id: 'nec',
      nome: 'Conversione a NeC',
      conversione: true,
      pm_personali: false,
      proprieta_custode: false,
      voce: 'armi:cyberarma-nec',
      consumo: { cariche: 1, colore: 'Rosso', azione: '1 AzP', ogni_colpi: 10, testo: '1 carica NeC Rossa + 1 AzP ogni 10 colpi' },
      testo: 'Conversione energetica: un NeC Rosso compatibile alimenta l’arma. Si perdono l’alimentazione con i PM personali e le proprietà da Custode. Consumo: 1 carica + 1 AzP ogni 10 colpi. Non si cumula con la riserva interna di CM.',
    },
  ],
  non_cumulabili: ['riserva_cm', 'nec'],
  'TODO(Davide)': 'A.260: la A.251 misura il consumo delle due conversioni «ogni 10 colpi», la A.236 del 02/11 diceva «1 CM per 10 Round». L’app applica la A.251, che è la più recente: 10 colpi. Da confermare.',
};

// A.251: i consumi delle due conversioni si contano in colpi, non in Round (A.260 per la conferma)
const perColpi = (id, aggiungi) => {
  const v = vocArmi(id);
  for (const c of v.uso_per_classe.classi) {
    if (!c.round) continue;
    c.ogni_colpi = 10;
    c.testo = `${c.testo.replace(/per 10 Round/g, 'per 10 colpi').replace(/lama stabile per 10 colpi/g, 'lama stabile, 1 CM ogni 10 colpi').replace(/arma manifestata per 10 Round/g, 'arma manifestata, 1 carica ogni 10 colpi')} ${aggiungi}`.trim();
  }
  // A.251: le due conversioni fanno perdere le proprietà da Custode: l'impiego del Custode non esiste più
  v.uso_per_classe.classi = v.uso_per_classe.classi.map((c) => (c.classe === 'Custode'
    ? { ...c, ammesso: false, pm: null, cm: null, round: null, testo: 'Custode: con questa conversione si perdono le proprietà da Custode e l’alimentazione con i PM personali (A.251). L’impiego del Custode non è disponibile su un esemplare convertito.' }
    : c));
  v.alimentazione_modifiche_rif = { famiglia: id === 'cyberarma-batteria-verde' ? 'riserva_cm' : 'nec', rif: 'armi:cyberarma', fonte: FONTE_251 };
};
perColpi('cyberarma-batteria-verde', '(A.251: 1 CM + 1 AzP ogni 10 colpi; si perdono i PM personali e le proprietà da Custode)');
perColpi('cyberarma-nec', '(A.251: 1 carica + 1 AzP ogni 10 colpi; si perdono i PM personali e le proprietà da Custode)');

// A.251: la scelta dell'alimentazione nel progetto, con ciò che si perde detto prima di confermare.
// Il progetto di Paradise comprende cristallo e SIN; le due conversioni restano sviluppi successivi e le autorizza
// soltanto il Direttore (dal tablet non si scelgono: src/cyberarma.js → alimentazioneDaTablet).
const prog = vocArmi('cyberarma').progetti.find((p) => p.id === 'paradise-dimitri');
prog.alimentazione = {
  fonte: FONTE_251,
  chi: 'giocatore',
  quando: 'prima della lavorazione',
  elenco: ['cristallo', 'sin', 'riserva_cm', 'nec'],
  comprese: ['cristallo', 'sin'],
  predefinita: 'cristallo',
  solo_direttore: ['riserva_cm', 'nec'],
  _nota: 'A.251: la scelta dice cosa si perde prima di confermare. Cristallo e SIN sono comprese nei tre giorni e tengono i PM personali; la riserva interna di CM e la conversione a NeC restano sviluppi successivi (descrizione del progetto), fanno perdere i PM personali e le proprietà da Custode e le autorizza soltanto il Direttore, con la conferma in chiaro.',
};
prog.regole.push('L’alimentazione scelta decide se l’arma consegnata può ancora usare i PM personali: cristallo e SIN sì, riserva interna di CM e conversione a NeC no, e in più fanno perdere le proprietà da Custode (A.251).');

// A.256: ogni CyberArma originale è un pezzo unico (Armamenti 0.74 §7.25: «Ogni originale è un pezzo unico»):
// senza prezzo di catalogo, come «Unico o reliquia» della tabella della A.256.
for (const id of ['cyberarma', 'cyberarma-batteria-verde', 'cyberarma-nec']) {
  const v = vocArmi(id);
  v.unico = true;
  v._nota_unico = 'Armamenti 0.74 §7.25: «Ogni originale è un pezzo unico». Rarità «Unico o reliquia» della A.256: senza prezzo di catalogo. Il valore dipende da fattura, unicità, proprietà e provenienza, e lo decide il Direttore.';
}
// §7.10 (classificazione di potenza): Rara = SnT 3. La voce convertita a NeC ha SnT 3 e la potenza diceva «Non Comune».
const catNec = art.artefatti_catalogo.find((x) => x.rif === 'armi:cyberarma-nec');
catNec.potenza = 'Rara';
catNec._nota_potenza = 'Armamenti 0.74 §7.10: la classificazione di potenza e il costo SnT vanno insieme (Comune 1, Non Comune 2, Rara 3…). Questa voce ha SnT 3: la potenza è Rara. Prima diceva «Non Comune», che vale per SnT 2 (lotto 157).';
const catBase = art.artefatti_catalogo.find((x) => x.rif === 'armi:cyberarma');
catBase['TODO(Davide)'] = 'A.265: la CyberArma originale ha SnT 1 nell’impiego del Custode e 2 in quello del Tecnomante, e il §7.10 lega la potenza al SnT. Nei dati la potenza è «Comune» (SnT 1) mentre il campo «sintonizzazione» della voce è 2. Qual è la potenza dell’originale? L’app lascia «Comune» e non ne deduce un prezzo: è un pezzo unico.';

// ───────────────────────── B. A.256: il prezzo di vendita degli artefatti ─────────────────────────
// «Il prezzo di vendita si calcola come costo completo di costruzione × 3 × coefficiente di rarità. Coefficienti:
// Comune 1; Non comune 1,5; Raro 2; Molto raro 3; Leggendario 5; Unico o reliquia senza prezzo di catalogo. Il
// risultato si arrotonda per eccesso ai 50 cr successivi. L’Anello della Rigenerazione 9, con costo di costruzione
// di 1.500 cr e rarità Molto rara, vale quindi 13.500 cr. Rarità e reperibilità restano separate: disporre del
// denaro non garantisce che l’oggetto sia disponibile.» (Davide, 06/11/2026)
reg.prezzi_artefatti = {
  versione_manuale: 'Magia 1.11 / Equipaggiamento 0.30 / Armamenti 0.74',
  fonte: 'A.256 (Davide, 06/11/2026); Equipaggiamento §10.1 (il Grado determina la potenza magica); Armamenti §7.10 (classificazione di potenza)',
  formula: 'costo completo di costruzione × 3 × coefficiente di rarità, arrotondato per eccesso ai 50 cr successivi',
  moltiplicatore: 3,
  arrotondamento: { ai_cr: 50, modo: 'eccesso' },
  coefficienti: {
    Comune: 1,
    'Non Comune': 1.5,
    Rara: 2,
    'Molto Rara': 3,
    Leggendaria: 5,
  },
  senza_prezzo: 'Unico o reliquia',
  esempio: { nome: 'Anello con Rigenerazione 9', costruzione_cr: 1500, rarita: 'Molto Rara', vendita_cr: 13500 },
  reperibilita_separata: 'Rarità e reperibilità restano separate: disporre del denaro non garantisce che l’oggetto sia disponibile. L’app mostra la Reperibilità accanto al prezzo e non fa sembrare comprabile ciò che non è reperibile.',
  prezzo_dichiarato: 'Dove il manuale dà già un prezzo di catalogo, resta quello: la formula dà il prezzo di vendita calcolato, che l’app mostra accanto, e diventa il prezzo quando il catalogo non ne ha.',
  'TODO(Davide)': 'A.261: la formula non ritrova i prezzi di catalogo già scritti nei manuali (Batteria da 5 PM Rossa: creazione 650, Comune → 1.950 cr calcolati, catalogo 1.000; le pergamene del §27.3 hanno Vendita = Creazione × 2, la formula darebbe × 3). La formula sostituisce quei prezzi o vale solo dove un prezzo non c’è? L’app tiene i prezzi dichiarati e mostra accanto il calcolo. A.262: la tabella della A.256 non dà il coefficiente dell’«Epica» (Grado V, §10.1), che nei dati esiste: l’app non calcola un prezzo per gli Artefatti Epici e lo dice.',
};

// A.256: la rarità dell'Anello era «Rara» nei dati, la A.256 lo dice «Molto rara» e calcola 13.500 cr da 1.500
const anello = vocArt('anello-di-rigenerazione-9');
anello.artefatto.potenza = 'Molto Rara';
// §7.10 vorrebbe SnT 4 per una Molto Rara: l'eccezione va dichiarata nei dati (src/validate.js), con la regola e il motivo
anello.artefatto.snt_eccezione = {
  regola: 'A.256 (06/11/2026); A.263 aperta',
  motivo: 'La A.256 dice l’Anello «Molto rara» e ne calcola il prezzo; la configurazione approvata del 02/11 gli dà Grado III e SnT 3. La tabella del §7.10 vorrebbe SnT 4 per una Molto Rara: l’app tiene la SnT della configurazione approvata e aspetta la A.263.',
};
anello.creazione_cr = 1500;
anello._nota_prezzo = 'A.256 (Davide, 06/11/2026): costo completo di costruzione 1.500 cr, rarità Molto rara → prezzo di vendita 1.500 × 3 × 3 = 13.500 cr. Prima nei dati la potenza era «Rara» (configurazione del 02/11: Grado III, SnT 3) e il prezzo non c’era.';
anello['TODO(Davide)'] = 'A.263: la A.256 dice l’Anello «Molto rara», mentre la configurazione approvata del 02/11 gli dà Grado III e SnT 3, e i manuali legano Grado III → potenza Rara (Equipaggiamento §10.1) e Molto Rara → SnT 4 (Armamenti §7.10). Cambiano Grado e SnT, o la rarità dell’Anello è un’eccezione alle due tabelle? L’app applica la A.256 per la rarità e il prezzo, e tiene Grado III e SnT 3 della configurazione approvata.';

// A.256: la formula ha bisogno del costo completo di costruzione, che i manuali danno per esteso nelle ricette
// (Magia §26.6.1 Pietra 2.100 cr, §26.6.2 Guanti 2.300 cr, §28.1.1 Hachimaki 800 cr, con progetto posseduto).
for (const [id, cr, fonte] of [
  ['pietra-della-vigilanza', 2100, 'Magia 1.11 §26.6.1: supporto 100 + Chroma Verde da 10 PM 1.000 + reagenti di Grado III 1.000 = 2.100 cr con progetto posseduto'],
  ['guanti-da-combattimento-mistico', 2300, 'Magia 1.11 §26.6.2 ed Equipaggiamento §10.7: supporto 100 + adattamento 200 + riserva Rossa da 6 CM 1.000 + reagenti di Grado III 1.000 = 2.300 cr con progetto posseduto'],
  ['hachimaki-della-disciplina-interiore', 800, 'Magia 1.11 §28.1.1: supporto 50 + adattamento e ricamo 150 + Chroma Verde lavorato 100 + reagenti 500 = 800 cr con progetto disponibile'],
]) {
  const v = vocArt(id);
  v.creazione_cr = cr;
  v._nota_creazione = `${fonte}. Serve al prezzo di vendita della A.256.`;
}

// A.256: «Unico o reliquia senza prezzo di catalogo». I manuali le chiamano reliquie:
// Scrigno «reliquia di campagna, priva di prezzo ordinario di catalogo» (Equipaggiamento §10.12), Tomo «reliquia» (§10.11).
for (const [id, nota] of [
  ['scrigno-del-primo-giuramento', 'Equipaggiamento §10.12: «reliquia di campagna, priva di prezzo ordinario di catalogo»; Magia §28.2: «Non è prevista una normale ricetta commerciale per riprodurre questa reliquia». Rarità «Unico o reliquia» della A.256: senza prezzo di catalogo.'],
  ['tomo-dei-guardiani', 'Equipaggiamento §10.11 e Magia §28.4: reliquia di Nathaniel, senza profilo commerciale. Rarità «Unico o reliquia» della A.256: senza prezzo di catalogo.'],
]) {
  const v = vocArt(id);
  v.unico = true;
  v._nota_unico = nota;
}

// ───────────────────────── C. A.257: quanto vale il FIAT LUX ─────────────────────────
// «Il prezzo di catalogo dello Scout standard resta 126.510 cr. Il valore corrente della FIAT LUX comprende base,
// equipaggiamento installato o assegnato, dotazione portatile a bordo, munizioni e consumabili residui,
// accumulatori di ricambio e loro stato o carica. Vanno mostrati separatamente modello base, dotazione extra e
// valore totale dell’esemplare. Kit trauma, pistola medica, cartucce di naniti, 400 colpi aggiuntivi e ricambi
// rossi o verdi restano inventario del gruppo, ma concorrono al totale finché sono a bordo o assegnati; il valore
// cambia quando vengono consumati, rimossi o trasferiti.» (Davide, 06/11/2026)
vei.valore = {
  versione_manuale: 'Veicoli 0.10 / scheda ASA Scout MK4 0.6',
  fonte: 'A.257 (Davide, 06/11/2026); A.226 (02 e 03/11/2026) per il prezzo di catalogo e il valore stimato',
  righe: [
    { id: 'base', nome: 'Modello base', testo: 'Il prezzo di catalogo del modello standard, o il valore stimato dell’esemplare quando il Direttore lo ha scritto (A.226).' },
    { id: 'extra', nome: 'Dotazione extra', testo: 'Le voci di questo esemplare oltre lo standard: equipaggiamento installato o assegnato, dotazione portatile a bordo, munizioni e consumabili residui, accumulatori di ricambio con il loro stato o carica.' },
    { id: 'totale', nome: 'Valore totale dell’esemplare', testo: 'Modello base più dotazione extra.' },
  ],
  _nota: 'A.257: non un numero solo, tre righe separate. Il valore non è scritto una volta: è un conto che segue l’inventario, e cambia quando una voce viene consumata, rimossa o trasferita. Le voci restano inventario del gruppo e concorrono al totale finché sono a bordo o assegnate.',
  accumulatori: {
    valore: 'prezzo pieno meno le cariche mancanti alla tariffa di ricarica',
    _nota: 'A.257 conta gli accumulatori di ricambio «e loro stato o carica». La tariffa di ricarica è quella dei dati (regole.json → nec.tariffe_cr_per_carica; profilo del mezzo → ricarica_cr_per_carica): un ricambio scarico vale il suo prezzo meno quanto costa riportarlo a piena carica, mai meno di zero.',
    'TODO(Davide)': 'A.264: la A.257 dice che lo stato o la carica di un accumulatore di ricambio contano nel valore, ma non come. L’app toglie dal prezzo pieno le cariche mancanti alla tariffa di ricarica dei dati (MEC 30 cr per carica, CEC 10). Va bene o il calo è diverso?',
  },
  esemplare_unico: 'Un esemplare unico (la Neverlost) non ha prezzo di catalogo: la riga del modello base resta vuota e il totale si mostra solo con il valore stimato del Direttore (A.240).',
};

// Le voci della dotazione extra del FIAT LUX: quantità e prezzo unitario, così il totale segue l'inventario.
// I prezzi sono quelli della dotazione di prima (A.101) e del profilo; lo standard della scheda 0.6 è già dentro
// il prezzo di catalogo (valore_voci), quindi qui ci sono soltanto le voci in più (A.226, A.257).
const scout = vei.profili.find((p) => p.id === 'asa-scout-mk4');
scout.dotazione_precedente.voci = [
  { id: 'kit-trauma', nome: 'Kit trauma professionale', quantita: 1, cr_unitario: 3000, nota: '5 applicazioni, +2 a Medicina per gli impieghi pertinenti; rifornimento di 5 a 300 cr' },
  { id: 'pistola-sanitaria', nome: 'Pistola sanitaria', quantita: 1, cr_unitario: 3500 },
  { id: 'cartucce-naniti', nome: 'Cartucce di naniti medici', quantita: 10, cr_unitario: 5000, consumabile: true, nota: '5 nella pistola e 5 di riserva; una dose riduce di uno lo Stato di Ferita, al massimo una ogni 24 ore per paziente' },
  { id: 'copriruote-petra', nome: 'Copriruote di Petra', quantita: 6, cr_unitario: 150, dal_rinforzo: 'copriruote-petra', nota: 'quattro montati e due di ricambio; un copriruota distrutto esce dal conto' },
  { id: 'colpi-m606', nome: 'Colpi M606 oltre lo standard', quantita: 400, cr_unitario: 3, dalle_munizioni: { arma: 0, standard: 400 }, nota: 'la scheda 0.6 comprende 400 colpi caricati e 400 di riserva: qui ci sono i 400 in più della A.101' },
  { id: 'mec-rosso-ricambio', nome: 'MEC Rosso di ricambio', quantita: 1, cr_unitario: 3000, accumulatore: { riserva: 'rosso_ricambi', cariche: 10, ricarica_cr_per_carica: 30 } },
  { id: 'cec-verde-ricambio', nome: 'CEC Verde di ricambio', quantita: 1, cr_unitario: 1000, accumulatore: { riserva: 'verde_ricambi', cariche: 10, ricarica_cr_per_carica: 10 } },
];
scout.dotazione_precedente._nota_voci = 'A.257 (06/11/2026): le voci in più rispetto allo standard, con quantità e prezzo unitario, per il conto del valore dell’esemplare. I prezzi vengono dalla dotazione di prima (A.101, 05/10/2026) e dal profilo (copriruote 150 cr il pezzo, colpi M606 3 cr, MEC Rosso 3.000, CEC Verde 1.000). Le bombole non ci sono: la scheda 0.6 ne comprende già tre. Questo supera la parte della A.226 in cui il valore stimato restava vuoto perché non c’era modo di calcolarlo: il valore stimato del Direttore resta e prende il posto del modello base.';
scout.nota_valore = `${scout.nota_valore} A.257 (06/11/2026): il valore corrente dell’esemplare si calcola e si mostra in tre righe — modello base, dotazione extra, totale — e segue l’inventario.`;

// ───────────────────────── esito ─────────────────────────
const arr = (n) => Math.ceil(n / 50) * 50;
const atteso = arr(1500 * 3 * 3);
console.log('A.251 · famiglie:', vocArmi('cyberarma').alimentazione_modifiche.famiglie.map((f) => `${f.id}${f.conversione ? ' (conversione)' : ''}`).join(', '));
console.log('A.251 · consumi:', vocArmi('cyberarma').alimentazione_modifiche.famiglie.filter((f) => f.consumo).map((f) => f.consumo.testo).join(' · '));
console.log('A.256 · coefficienti:', Object.entries(reg.prezzi_artefatti.coefficienti).map(([k, v]) => `${k} ${v}`).join(', '), `· senza prezzo: ${reg.prezzi_artefatti.senza_prezzo}`);
console.log(`A.256 · Anello: ${anello.artefatto.potenza}, costruzione ${anello.creazione_cr} cr → vendita ${atteso} cr`, atteso === 13500 ? '✓' : '✗ atteso 13500');
console.log('A.257 · voci della dotazione extra:', scout.dotazione_precedente.voci.length, '·', scout.dotazione_precedente.voci.reduce((s, v) => s + v.quantita * v.cr_unitario, 0), 'cr a pieno');
if (process.argv.includes('--scrivi')) {
  for (const [f, j] of [[F_ARMI, armi], [F_ART, art], [F_REG, reg], [F_VEI, vei]]) {
    fs.writeFileSync(join(R, f), `${JSON.stringify(j, null, 2)}\n`);
    console.log('scritto', f);
  }
}

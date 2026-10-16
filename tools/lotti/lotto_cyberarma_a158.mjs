// CyberArma: A.158 (risposta di Davide approvata il 13/10/2026) e Armamenti 0.62 §7.25.1.
//
// Due voci di catalogo in data/equipaggiamento/armi.json, ciascuna con il blocco artefatto in
// artefatti.json → artefatti_catalogo (così l'oggetto ha una sola voce di inventario, visibile sia fra le
// Armi sia fra gli Artefatti: Armamenti §7.25.1, Equipaggiamento §10.9):
//   - modello originale, senza batteria: Grado I (potenza Comune), SnT 1, Qualità fisica Non Comune,
//     PS Integrità 12, 4 PI, 0,5 kg, Reperibilità Epica, nessun prezzo di catalogo;
//   - configurazione con Batteria Verde da 5 cariche: Grado II (potenza Non Comune), SnT 2, 0,7 kg;
//     riserva a cariche dedicata, una carica per attivazione, saldo in cariche e non in PM.
// Con una riserva integrata il Grado finale è il maggiore fra arma e riserva e la SnT si conta una volta
// sola: per questo la configurazione modificata ha SnT 2 e non 1 + 2.
//
// Uso per Classe (punto 2 della risposta) in `uso_per_classe`, non nel codice: Custode 1 PM per 15 Round e
// +1 al danno; Tecnomante 2 PM per 10 Round, 1d8 Magico; le altre Classi soltanto con la batteria, a −2 al
// VA delle Prove per colpire (avviso, non blocco). Costruzione e modifica (punti 6 e 7) in `costruzione`:
// solo testo nella scheda dell'oggetto, nessuna procedura guidata.
//
// La Custodia del Silenzio (Armamenti §7.25.1) è nel lotto della A.163, con gli altri due Contenitori del
// Silenzio (tools/lotti/lotto_schermatura_a163.mjs).
//
// Uso: node tools/lotti/lotto_cyberarma_a158.mjs [--controlla]
import { readFileSync, writeFileSync } from 'node:fs';

const CONTROLLA = process.argv.includes('--controlla');
const leggi = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
const scrivi = (p, d) => writeFileSync(new URL(`../../${p}`, import.meta.url), `${JSON.stringify(d, null, 2)}\n`);

const FONTE = 'Armamenti §7.25 e §7.25.1 (0.62); A.158 del 13/10/2026 e A.166 del 16/10/2026';

/**
 * A.166 (16/10/2026): le manifestazioni della CyberArma. L'Abilità resta Armi da mischia in tutti i casi;
 * famiglia, Specializzazione pertinente e Manovre compatibili dipendono dalla forma manifestata. Il Custode
 * sceglie liberamente; il Tecnomante e gli altri utilizzatori ammessi usano la forma del progetto (lama
 * lunga nel modello base), che si cambia solo modificando il manufatto.
 */
const MANIFESTAZIONI = {
  fonte: 'A.166, risposta approvata il 16/10/2026; Armamenti §7.25',
  abilita: 'Armi da mischia',
  _abilita: 'Si usa sempre con Armi da mischia, qualunque forma sia manifestata: non si passa ad Armi da guerra, Corpo a corpo o altro perché l’arma ordinaria corrispondente usa quell’Abilità.',
  scelta_libera: ['Custode'],
  _scelta_libera: 'Il Custode manifesta qualsiasi tipo di arma ravvicinata. Il Tecnomante e gli altri utilizzatori ammessi usano la forma del progetto; cambiarla è una modifica del manufatto (nell’app si cambia in «Modifica master»), non una facoltà di cambio forma.',
  progetto: 'lama-lunga',
  una_sola_specializzazione: true,
  _una_sola_specializzazione: 'La Specializzazione posseduta pertinente alla forma dà i normali +1 VA e +1 danno (§8.8.1); non si cumulano Specializzazioni di forme diverse.',
  elenco: [
    { id: 'lama-lunga', nome: 'Lama lunga (spada)', famiglia: 'Spade', specializzazione: 'specializzazione-spade', manovre: ['Affondo', 'Spazzata'] },
    { id: 'frusta', nome: 'Frusta', famiglia: 'Armi flessibili', specializzazione: 'specializzazione-armi-flessibili', manovre: ['generali'], nota: 'Si usa la procedura di Immobilizzare con la Frusta (§7.1.5); la presa senza danno non acquista il bonus al danno della Specializzazione.' },
    { id: 'ascia', nome: 'Ascia', famiglia: 'Asce', specializzazione: 'specializzazione-asce', manovre: ['Spazzata'] },
    { id: 'lancia', nome: 'Lancia', famiglia: 'Armi inastate', specializzazione: 'specializzazione-armi-inastate', manovre: ['Affondo'] },
  ],
  _altre_forme: 'A.166: per le forme non elencate si usa la famiglia corrispondente del catalogo, con la sua Specializzazione e le sue Manovre.',
};
const VERSIONE = 'Armamenti 0.62 (A.158)';

/** Parte comune alle due configurazioni: profilo d'arma del §7.25 e dati fisici della risposta. */
const comune = {
  tipo: 'arma_ravvicinata',
  catalogo: 'Artefatti di campagna',
  famiglia: 'Spade',
  nomi_alternativi: ['Cyber Arma', 'Cyber-Arma'],
  paragrafo: '§7.25',
  versione_manuale: VERSIONE,
  // A.166 (16/10/2026): l'Abilità è sempre Armi da mischia; famiglia, Specializzazione e Manovre dipendono
  // dalla manifestazione (blocco `manifestazioni` qui sotto). I campi del catalogo tengono la forma del
  // progetto base — lama lunga —, che è quella di partenza per tutti.
  abilita: 'Armi da mischia',
  famiglia: 'Spade',
  specializzazione: 'specializzazione-spade',
  manovre: ['Affondo', 'Spazzata'],
  mani: 1,
  danno: { una_mano: '1d8', due_mani: null },
  natura_danno: 'Magico',
  portata_q: 1,
  gittata_q: null,
  for_richiesta: 3,
  inc: null,
  pi: 4,
  qualita: 'Non comune',
  ps_int: 12,
  reperibilita: 'EP',
  costo: null,
  _nota_costo: 'A.158, punto 5: la CyberArma non è normalmente commercializzata e non ha un prezzo standard di catalogo (la proposta di 3.000 crediti è ritirata). Nell’app il prezzo risulta non disponibile, non zero. L’eventuale cessione la stabilisce il Direttore.',
  proprieta: [],
  manifestazioni: MANIFESTAZIONI,
};

/** Punto 2: chi la usa, con quale costo e per quanti Round. Le Classi sono quelle di data/classi.json. */
const usoPerClasse = (conBatteria) => ({
  fonte: 'A.158, punto 2 (approvata il 13/10/2026)',
  predefinito: 'altre',
  classi: [
    {
      classe: 'Custode',
      pm: 1,
      round: 15,
      danno_extra: 1,
      va: 0,
      ...(conBatteria ? { cariche: 1 } : {}),
      testo: conBatteria
        ? 'Custode: 1 PM personale oppure una carica della batteria, 15 Round, evocazione compresa nell’Azione del primo attacco, +1 al danno. Il danno base segue il Grado di Custode (Giocatore §3.9.2).'
        : 'Custode: 1 PM personale, 15 Round, evocazione compresa nell’Azione del primo attacco, +1 al danno. Il danno base segue il Grado di Custode (Giocatore §3.9.2).',
    },
    {
      classe: 'Tecnomante',
      pm: 2,
      round: 10,
      danno_extra: 0,
      va: 0,
      ...(conBatteria ? { cariche: 1 } : {}),
      testo: conBatteria
        ? 'Tecnomante: 1 AzP e 2 PM personali, oppure una carica della batteria, per 10 Round; 1d8 Magico più i modificatori pertinenti, senza Concentrazione e senza bonus propri al VA.'
        : 'Tecnomante: 1 AzP e 2 PM personali per 10 Round; 1d8 Magico più i modificatori pertinenti, senza Concentrazione e senza bonus propri al VA.',
    },
    {
      classe: 'altre',
      pm: null,
      cariche: conBatteria ? 1 : null,
      round: conBatteria ? 10 : null,
      danno_extra: 0,
      va: -2,
      ammesso: conBatteria,
      testo: conBatteria
        ? 'Altre Classi: 1 AzP e una carica della batteria per 10 Round, 1d8 Magico; −2 al VA delle Prove per colpire con l’arma, cumulativo con gli altri modificatori. Nessuna Prova di attivazione in più. Restano i requisiti d’impiego e la sintonizzazione.'
        : 'Altre Classi: il modello originale, privo di batteria, non si può utilizzare (A.158, punto 2). Serve la configurazione con Batteria Verde.',
    },
  ],
});

const COSTRUZIONE_ORIGINALE = {
  fonte: 'A.158, punto 6',
  chi: 'Un Custode con Maestro d’Arma (la ricetta è compresa nel Talento, senza Ritualista) oppure un Tecnomante con Architetto TecnoMistico.',
  passi: [
    'Progettazione, solo se manca il progetto: Prova di Artefatti senza penalità, 4 ore, 100 crediti di risorse.',
    'Assemblaggio e regolazione del condensatore: Prova di Tecnologia −4, 16 ore, 1.000 crediti di componenti (impugnatura, condensatore e frammento di cristallo focalizzatore).',
    'Infusione di Grado I: Prova di Rituali senza penalità, 1 ora, 250 crediti di reagenti e 3 PM personali.',
  ],
  totali: 'Con il progetto disponibile e successi ordinari: 1.250 crediti, 17 ore e 3 PM personali. Sviluppando anche il progetto: 1.350 crediti, 21 ore e 3 PM personali.',
  nota: 'Si applicano i normali esiti Magistrali, fallimenti, Maldestri e interruzioni dei §§24.3–24.5 del Manuale della Magia. La reperibilità dei componenti la stabilisce il Direttore.',
};

const COSTRUZIONE_BATTERIA = {
  fonte: 'A.158, punto 7',
  chi: 'Un Tecnomante con Architetto TecnoMistico e almeno II Grado di Classe.',
  passi: [
    'Progetto della modifica, se non disponibile: Prova di Artefatti −2, 8 ore, 200 crediti di risorse.',
    'Adattamento e installazione: Prova di Tecnologia −2, 8 ore, 500 crediti di materiali, contenitore compreso; Chroma Verde per le cinque cariche: altri 1.000 crediti.',
    'Reinfusione completa della configurazione di Grado II: Prova di Rituali −2, 2 ore, 500 crediti di reagenti e 6 PM personali.',
  ],
  totali: 'Costo aggiuntivo con il progetto disponibile e successi ordinari: 2.000 crediti, 10 ore e 6 PM personali. Sviluppando anche il progetto: 2.200 crediti, 18 ore e 6 PM personali; i totali comprendono materiali, contenitore, Chroma e reagenti.',
  nota: 'Al termine della modifica la batteria è a 0/5 cariche: la prima ricarica è separata. Una carica richiede 2 PM di energia Spirituale immagazzinata, quindi 10 PM Verdi per le cinque cariche, con le normali conversioni (i 6 PM del rituale infondono il manufatto e non caricano la batteria).',
};

const ORIGINALE = {
  ...comune,
  id: 'cyberarma',
  nome: 'CyberArma',
  effetto_breve: 'Artefatto TecnoMistico di Grado I: la lama si manifesta pagando con i PM personali. Solo Custodi e Tecnomanti.',
  peso: 0.5,
  _nota_peso: 'A.158, punto 1: impugnatura, condensatore di energia mistica e frammento di cristallo focalizzatore; la lama manifestata non aggiunge peso.',
  uso_per_classe: usoPerClasse(false),
  costruzione: COSTRUZIONE_ORIGINALE,
  _nota_a158: 'Modello originale senza batteria interna. La Qualità fisica (Non comune) è distinta dal Grado mistico e non aumenta da sola la SnT. La progressione dell’Arma Astrale del Custode dipende dalla Classe e non aumenta Grado o SnT dell’oggetto. Il colore della lama dipende dal frammento focalizzatore e non aggiunge effetti elementali. Registrazione: un’unica voce di inventario fra Armi e Artefatti (Armamenti §7.25.1, Equipaggiamento §10.9).',
};

const CON_BATTERIA = {
  ...comune,
  id: 'cyberarma-batteria-verde',
  nome: 'CyberArma con Batteria Verde',
  paragrafo: '§7.25',
  effetto_breve: 'CyberArma modificata con Batteria Verde da 5 cariche: Grado II, una carica per attivazione. Le altre Classi la usano a −2 VA.',
  peso: 0.7,
  _nota_peso: 'A.158, punto 3: peso complessivo della configurazione modificata.',
  munizioni: {
    capacita: 5,
    unita: 'cariche',
    consumo: 'una carica intera per attivazione, senza mezze cariche',
    ricarica: '2 PM di energia Spirituale immagazzinata per carica, 10 PM Verdi per le cinque cariche (A.158, punto 4)',
    riferimento: 'Batteria Verde da 5 cariche, dedicata esclusivamente alla CyberArma',
  },
  uso_per_classe: usoPerClasse(true),
  costruzione: COSTRUZIONE_BATTERIA,
  _nota_a158: 'La scheda mostra soltanto cariche attuali e massime (per esempio 3/5): non è una riserva di PM da spendere per Incantesimi personali, conversioni o altri oggetti. Grado finale II e SnT 2 complessivi: con una riserva integrata il Grado è il maggiore fra arma e riserva e la sintonizzazione si conta una volta sola, senza sommare due costi. Il colore energetico della batteria è distinto da quello della lama.',
};

/** Blocchi artefatto delle due voci (artefatti.json → artefatti_catalogo). */
const BLOCCHI = [
  {
    rif: 'armi:cyberarma',
    tipologia: 'Armi',
    potenza: 'Comune', // Grado I
    sintonizzazione: 1,
    sintonizzabile: true,
    proprieta_attive: true,
  },
  {
    rif: 'armi:cyberarma-batteria-verde',
    tipologia: 'Armi',
    potenza: 'Non Comune', // Grado II: il maggiore fra arma e riserva
    sintonizzazione: 2,
    sintonizzabile: true,
    proprieta_attive: true,
    contenitore: {
      energia: 'Verde',
      capacita_pm: 5,
      integrato: true,
      riserva: 'cariche',
      alimentazione: 'esclusiva',
    },
  },
];

function applica() {
  const armi = leggi('data/equipaggiamento/armi.json');
  const art = leggi('data/equipaggiamento/artefatti.json');
  const mancano = [];

  for (const [file, voce] of [[armi, ORIGINALE], [armi, CON_BATTERIA]]) {
    const i = file.oggetti.findIndex((o) => o.id === voce.id);
    const uguale = i >= 0 && JSON.stringify(file.oggetti[i]) === JSON.stringify(voce);
    if (!uguale) mancano.push(voce.id);
    if (!CONTROLLA) { if (i >= 0) file.oggetti[i] = voce; else file.oggetti.push(voce); }
  }
  for (const b of BLOCCHI) {
    const i = art.artefatti_catalogo.findIndex((x) => x.rif === b.rif);
    const uguale = i >= 0 && JSON.stringify(art.artefatti_catalogo[i]) === JSON.stringify(b);
    if (!uguale) mancano.push(b.rif);
    if (!CONTROLLA) { if (i >= 0) art.artefatti_catalogo[i] = b; else art.artefatti_catalogo.push(b); }
  }
  if (CONTROLLA) {
    if (mancano.length) { console.error(`lotto CyberArma da riapplicare: ${mancano.join(', ')}`); process.exit(1); }
    console.log('lotto CyberArma: catalogo aggiornato');
    return;
  }
  armi.fonte = armi.fonte?.includes('§7.25') ? armi.fonte : `${armi.fonte} · ${FONTE}`;
  scrivi('data/equipaggiamento/armi.json', armi);
  scrivi('data/equipaggiamento/artefatti.json', art);
  // la Custodia del Silenzio sta nel lotto della A.163, con gli altri due Contenitori del Silenzio
  console.log(`CyberArma (2 configurazioni) e ${BLOCCHI.length} blocchi artefatto scritti.`);
}

applica();

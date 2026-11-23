// Lotto 235 (23/11/2026) — i cinque cristalli focalizzatori della CyberArma, come li scrive il manuale.
//
// Fonte, riletta per questo lotto e non presa dal messaggio: **Armamenti 0.90 §7.25** («Cristallo focalizzatore»,
// «Profili delle CyberArmi originali dei Custodi» con la tabella per Grado) e **§7.25.5** («Riferimento rapido
// CyberArma»), più **Giocatore 0.65 §5.24** per Plasma ed Elettricità (tabella «Proprietà | Contromisura |
// Risoluzione | Durata o termine») e §7.25.4 per l'esemplare di Dimitri.
//
// Perché un lotto: i §§7.25 e 7.25.5 **c'erano già** (dalla 0.83) e il blocco `focalizzatori` dei dati li cita dal
// lotto 210. Quello che mancava non era il paragrafo: era che per Rosso, Blu e Viola il manuale **non dà un numero**,
// e «non ha un numero» era stato scritto nel Doc in modo che si legge come «non ha effetto». Plasma, Elettricità e
// Corruzione sono effetti sul bersaglio, non bonus al VA o al danno: adesso stanno nei dati come effetti dichiarati,
// con le condizioni del §5.24, e l'app li **scrive** senza applicarli.
//
// Le cinque voci di catalogo sono i cinque profili della CyberArma per colore del cristallo (il §7.25.5 dà il danno
// base del Tecnomante e delle conversioni: Bianco 1d8+3, Rosso 1d8, Blu 1d8, Verde 1d8+1; il Viola non è fra «i
// quattro focalizzatori di riferimento», è «il Viola eccezionale» e non ha un bonus numerico). «CyberArma» resta il
// nome della famiglia e non è una sesta voce: la voce `cyberarma` è l'originale non modificato, da cui viene
// l'esemplare di Dimitri, e passa a `non_in_vendita` come dice il manuale («Ogni esemplare rimane tuttavia un pezzo
// unico… Il valore indicativo non garantisce una vendita: il Direttore stabilisce compratore, disponibilità e
// prezzo effettivo»): i 7.500 cr restano scritti come **valore**, non come prezzo (`valoreNonPrezzo` in
// src/equipaggiamento.js).
//
// Niente qui tocca i file dei personaggi. La voce di Dimitri è `armi:cyberarma` e resta quella: il suo VA, il suo
// danno e la sua Parata non cambiano di un punto (tests/cristalli-235.test.js lo prova sui numeri).
//
// Uso: node tools/lotti/lotto_235_cristalli.mjs [--scrivi]

import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

fermaSeSconosciuti(process.argv.slice(2), ARGOMENTI['lotto_235_cristalli.mjs'], 'lotto_235_cristalli.mjs');
const scrivi = process.argv.includes('--scrivi');
const F = new URL('../../data/equipaggiamento/armi.json', import.meta.url);
const VERSIONE = 'Armamenti 0.90 (§7.25, §7.25.5) / Giocatore 0.65 §5.24 / A.246, A.251, A.271';

/** §5.24: «Per gli effetti aggiuntivi collegati al danno occorre almeno 1 danno dopo l'Armatura e, quando presente,
 *  il superamento della Contromisura numerica». Le due condizioni valgono per Plasma e per Elettricità allo stesso
 *  modo: cambia la Contromisura e cambia che cosa succede con il fallimento. */
const condizioni = (contromisura) => [
  'almeno 1 danno è passato oltre l’Armatura applicabile',
  `la Contromisura ${contromisura} del bersaglio, se c’è, è stata superata dal danno residuo`,
];

const effettoSulBersaglio = (proprieta, contromisura, seFallisce) => ({
  proprieta,
  paragrafo: 'Giocatore §5.24',
  contromisura,
  condizioni: condizioni(contromisura),
  prova: 'PS Tempra',
  se_fallisce: seFallisce,
  durata: '1+1d3 Round',
  // §5.18: applicazione immediata, scadenza alla fine del Round R + N
  durata_paragrafo: 'Giocatore §5.24, §5.18',
  la_applica: 'il Direttore',
  app_non_calcola: 'L’app scrive la condizione e non fa altro: non tira la PS Tempra, non applica l’effetto del fallimento, non conta i Round. Una sola PS per tipo di effetto, per bersaglio e per attacco (§5.24).',
});

/** La tabella «Profili delle CyberArmi originali dei Custodi» del §7.25, per Grado. Dati dichiarati: l'app non li
 *  calcola — il danno di un Custode viene dalla sua tabella per Grado (§3.9.2 del Giocatore), che il cristallo ce
 *  l'ha già dentro («sono già inclusi il +1 di Maestro d'Arma e i bonus fissi del cristallo»). Nessuno dei sette al
 *  tavolo è un Custode. Sta qui perché è il §7.25 e perché il giorno in cui serve non si rilegge il manuale. */
const PER_GRADO = {
  bianco: { III: '1d10+4', IV: '1d10+5', V: '1d10+6', VI: '1d10+7' },
  rosso: { III: '1d10+1', IV: '1d10+2', V: '1d10+3', VI: '1d10+4' },
  blu: { III: '1d10+1', IV: '1d10+2', V: '1d10+3', VI: '1d10+4' },
  verde: { III: '1d10+2', IV: '1d10+3', V: '1d10+4', VI: '1d10+5' },
  viola: { III: '1d10+1', IV: '1d10+2', V: '1d10+3', VI: '1d10+4' },
};

/** Quello che il §7.25.5 dà per il Tecnomante e per le conversioni: il danno base 1d8 più il solo bonus fisso del
 *  cristallo, senza i modificatori personali. È il valore con cui si legge la voce di catalogo. */
const BASE_TECNOMANTE = { bianco: '1d8+3', rosso: '1d8', blu: '1d8', verde: '1d8+1', viola: '1d8' };

const AGGIUNTE = {
  bianco: {
    danno_base_tecnomante: BASE_TECNOMANTE.bianco,
    per_grado_custode: PER_GRADO.bianco,
  },
  rosso: {
    danno_base_tecnomante: BASE_TECNOMANTE.rosso,
    per_grado_custode: PER_GRADO.rosso,
    nessun_dado_aggiuntivo: true,
    effetto_sul_bersaglio: effettoSulBersaglio('Plasma', 'Dissipante X', '−2 VA'),
  },
  blu: {
    danno_base_tecnomante: BASE_TECNOMANTE.blu,
    per_grado_custode: PER_GRADO.blu,
    nessun_dado_aggiuntivo: true,
    effetto_sul_bersaglio: effettoSulBersaglio('Elettricità', 'Isolante X', 'non spende Azioni fuori dalla propria Iniziativa'),
  },
  verde: {
    danno_base_tecnomante: BASE_TECNOMANTE.verde,
    per_grado_custode: PER_GRADO.verde,
  },
  viola: {
    danno_base_tecnomante: BASE_TECNOMANTE.viola,
    per_grado_custode: PER_GRADO.viola,
    eccezionale: true,
    _eccezionale: '§7.25: «I quattro focalizzatori di riferimento e il Viola eccezionale». «Eccezionale» è una parola sul cristallo, non una Qualità, non una rarità e non una Reperibilità: non cambia il prezzo e non entra nella formula della A.256.',
    corruzione_dal_frammento: {
      testo: 'Corruzione: indicare il valore del frammento',
      paragrafo: '§7.25, A.246',
      dove: 'esemplare.corruzione',
      senza_predefinito: true,
      _senza_predefinito: 'Il manuale dice «annotare il valore del singolo frammento»: il valore è del frammento, non del colore, e un valore predefinito sarebbe inventato. Finché non c’è, la scheda scrive il posto vuoto e lo dice.',
    },
  },
};

/** Le cinque voci di catalogo: un profilo per colore. Tutto quello che non dipende dal colore sta qui una volta. */
const COMUNI = {
  tipo: 'arma_ravvicinata',
  catalogo: 'Artefatti di campagna',
  // §7.25: «La famiglia e la Specializzazione pertinente dipendono dalla manifestazione: lama → Spade». La famiglia è
  // quella dell'arma manifestata, non «CyberArma»: «CyberArma» è il nome con cui si chiamano fra loro queste voci
  // (famiglia_cyberarma), e non è una famiglia di armi né una voce da comprare.
  famiglia: 'Spade',
  famiglia_cyberarma: 'CyberArma',
  paragrafo: '§7.25, §7.25.5',
  versione_manuale: VERSIONE,
  abilita: 'Armi da mischia',
  specializzazione: 'specializzazione-spade',
  manovre: ['Affondo', 'Spazzata'],
  mani: 1,
  natura_danno: 'Magico',
  portata_q: 1,
  gittata_q: null,
  for_richiesta: 3,
  inc: null,
  pi: 4,
  qualita: 'Non comune',
  ps_int: 12,
  reperibilita: 'EP',
  costo: 7500,
  unico: true,
  non_in_vendita: true,
  ravvicinata_senza_raffiche: true,
  proprieta: [],
};

const COLORI = [
  { id: 'bianco', voce: 'cyberarma-bianca', nome: 'CyberArma Bianca' },
  { id: 'rosso', voce: 'cyberarma-rossa', nome: 'CyberArma Rossa' },
  { id: 'blu', voce: 'cyberarma-blu', nome: 'CyberArma Blu' },
  { id: 'verde', voce: 'cyberarma-verde', nome: 'CyberArma Verde' },
  { id: 'viola', voce: 'cyberarma-viola', nome: 'CyberArma Viola' },
];

const NOTA_VOCE = 'Lotto 235: uno dei cinque profili del §7.25 per colore del cristallo focalizzatore. Il danno base 1d8 e il bonus fisso del cristallo stanno nel profilo (§7.25.5); i modificatori personali li aggiunge la scheda. `focalizzatore_fisso` dice il colore senza bisogno che l’esemplare lo dichiari: un esemplare che lo dichiara comunque vince (src/cyberarma.js → bonusFocalizzatore). Prezzo: i 7.500 cr sono il valore indicativo dell’originale (§7.25, A.256) e `non_in_vendita` li tiene come valore e non come listino, perché «ogni esemplare rimane un pezzo unico» e «il valore indicativo non garantisce una vendita: il Direttore stabilisce compratore, disponibilità e prezzo effettivo».';

function main() {
  const testo = readFileSync(F, 'utf8');
  const j = JSON.parse(testo);
  const voci = j.voci ?? j.oggetti;
  if (!Array.isArray(voci)) throw new Error('armi.json: non trovo l’elenco delle voci');
  const madre = voci.find((v) => v.id === 'cyberarma');
  if (!madre) throw new Error('armi.json: non trovo la voce «cyberarma»');
  const F5 = madre.focalizzatori;
  if (!F5 || !Array.isArray(F5.elenco)) throw new Error('armi.json: la voce «cyberarma» non ha il blocco «focalizzatori»');

  const fatti = [];

  // 1) gli effetti dei cinque cristalli, dal manuale
  F5.fonte = `Armamenti 0.90 §7.25 (Cristallo focalizzatore; «Profili delle CyberArmi originali dei Custodi») e §7.25.5 (Riferimento rapido); Giocatore 0.65 §5.24 (Plasma ed Elettricità); Equipaggiamento 0.41 §10.9 (esemplare di Dimitri)`;
  F5._lotto_235 = 'Rosso, Blu e Viola non hanno un bonus numerico nel manuale, e non averlo non vuol dire non avere effetto: Plasma, Elettricità e Corruzione sono effetti sul bersaglio, scritti qui con le condizioni del §5.24. L’app li scrive e non li applica: non tira la PS Tempra, non applica il −2 VA, non blocca le Azioni e non conta i Round. Stanno nell’elenco delle regole che l’app non conta.';
  for (const c of COLORI) {
    const f = F5.elenco.find((x) => x.id === c.id);
    if (!f) throw new Error(`focalizzatori: manca il colore «${c.id}»`);
    Object.assign(f, AGGIUNTE[c.id]);
    f.voce = `armi:${c.voce}`;
    fatti.push(`focalizzatore ${f.nome}: danno base ${BASE_TECNOMANTE[c.id]}${AGGIUNTE[c.id].effetto_sul_bersaglio ? `, ${AGGIUNTE[c.id].effetto_sul_bersaglio.proprieta}` : ''}${AGGIUNTE[c.id].corruzione_dal_frammento ? ', Corruzione dal frammento' : ''}`);
  }

  // 2) «CyberArma» resta il nome della famiglia e non è una voce da comprare
  for (const id of ['cyberarma', 'cyberarma-batteria-verde', 'cyberarma-nec']) {
    const v = voci.find((x) => x.id === id);
    if (!v) throw new Error(`armi.json: non trovo la voce «${id}»`);
    v.famiglia_cyberarma = 'CyberArma';
    v.non_in_vendita = true;
    v._nota_non_in_vendita = 'Lotto 235: «CyberArma» è il nome della famiglia e queste tre voci sono configurazioni dell’originale o delle sue conversioni, non articoli di listino: §7.25, «ogni esemplare rimane tuttavia un pezzo unico… Il valore indicativo non garantisce una vendita: il Direttore stabilisce compratore, disponibilità e prezzo effettivo in gioco». Dove c’è un costo, resta scritto come valore e non come prezzo (valoreNonPrezzo). Non cambia nessun valore di combattimento: la voce di Dimitri è «armi:cyberarma» e il suo VA, il suo danno e la sua Parata non si muovono.';
    fatti.push(`${id}: non_in_vendita`);
  }

  // 3) le cinque voci, dopo la voce madre e le sue due conversioni
  const dopo = Math.max(...['cyberarma', 'cyberarma-batteria-verde', 'cyberarma-nec'].map((id) => voci.findIndex((x) => x.id === id))) + 1;
  const nuove = [];
  for (const c of COLORI) {
    if (voci.some((x) => x.id === c.voce)) { fatti.push(`${c.voce}: già presente, non riscritta`); continue; }
    const f = F5.elenco.find((x) => x.id === c.id);
    nuove.push({
      id: c.voce,
      nome: c.nome,
      // il nome del colore è al maschile nel manuale («Verde») e al femminile nel nome della voce («CyberArma
      // Verde» coincide, «Bianca» no): si tengono le forme che non ripetono il nome, così la ricerca le trova tutte
      nomi_alternativi: [`CyberArma ${f.nome}`, `CyberArma con cristallo ${f.nome}`].filter((x) => x !== c.nome),
      ...COMUNI,
      danno: { una_mano: '1d8', due_mani: null },
      focalizzatore_fisso: c.id,
      _nota: NOTA_VOCE,
    });
    fatti.push(`${c.voce}: voce nuova («${c.nome}», danno letto ${BASE_TECNOMANTE[c.id]})`);
  }
  voci.splice(dopo, 0, ...nuove);

  console.log(`lotto 235 — cristalli focalizzatori della CyberArma (${VERSIONE})`);
  for (const r of fatti) console.log('  · ' + r);
  console.log(`  voci della famiglia CyberArma: ${voci.filter((v) => (v.id ?? '').startsWith('cyberarma')).length} (3 configurazioni + ${nuove.length} profili per colore)`);

  if (!scrivi) { console.log('\n(sola lettura: --scrivi per applicare)'); return; }
  writeFileSync(F, JSON.stringify(j, null, 1) + '\n');
  console.log('\nscritto data/equipaggiamento/armi.json');
}

main();

// Lotto 193 (13/11/2026): il Morente dei §§5.14.2–5.14.3 del Giocatore 0.62 e della registrazione A.159
// approvata nel Doc E&L.
//
//   node tools/lotti/lotto_193_morente.mjs            dice che cosa cambierebbe
//   node tools/lotti/lotto_193_morente.mjs --scrivi   scrive data/regole.json
//
// Il Morente nell'app c'è già dal 16/10 (A.159 e A.164, src/morente.js): contatore pari alla COS, primo
// decremento alla stessa posizione d'Iniziativa dell'ingresso, contatore pieno all'ingresso, «−1» e
// «Stabilizza». Questo lotto non lo rifà: chiude le quattro distanze fra quello che c'è e quello che i
// paragrafi nuovi e la registrazione approvata pretendono.
//
//   1. **Esaurito non è disattivato.** Il contatore attivo che arriva a 0 e il contatore spento da una
//      stabilizzazione finiscono sullo stesso numero e sono due cose diverse: la prima è una morte da
//      registrare, la seconda è un paziente salvo. Finora l'app aveva un solo campo (`morto`), e dire «morto»
//      a chi è stato appena stabilizzato è il peggiore degli errori possibili in questo punto del gioco.
//   2. **La morte la registra il Direttore, e si annulla.** Il contatore che scade apre un avviso, non una
//      morte: `morte` nella sessione la scrive un comando, con chi e quando, e «Annulla» la toglie. Un tocco
//      sbagliato nel momento più teso della serata non può essere definitivo (CLAUDE.md: l'app propone, non
//      impone; l'ultima parola è del master).
//   3. **Chi soccorre deve sapere prima di spendere l'azione** se quello che sta per fare stabilizza. Le vie
//      erano cinque righe di testo in fondo a un pannello: adesso sono voci con `stabilizza` vero o falso,
//      costo, Prova e condizioni, e accanto l'elenco di quello che **non** stabilizza — recuperare PV e
//      arrestare il Sanguinamento compresi, che sono i due errori che il manuale nomina per primi.
//   4. **L'UMC Automatica interviene a fine attacco**, non fra un colpo e l'altro, e non salva un contatore
//      già esaurito.
//
// E la frase del §5.14 che il manuale nuovo ha riscritto: «Ogni nuova Ferita fa avanzare di uno stato» →
// «… fino a Morente» (una delle cinque contate dal lotto 191; è l'unica di questo ambito).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RADICE, versioneManuale } from '../manuali.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

/** La frase del §5.14 riscritta dal Giocatore 0.62. */
export const FRASE = ['Ogni nuova Ferita fa avanzare di uno stato.', 'Ogni nuova Ferita fa avanzare di uno stato fino a Morente.'];

/**
 * Gli interventi, dal §5.14.3 e dalla registrazione A.159 del Doc E&L. `stabilizza` è la sola cosa che chi
 * soccorre deve leggere prima di spendere l'azione: tutto il resto è il dettaglio di come si fa.
 */
export const INTERVENTI = [
  {
    id: 'medicina',
    nome: 'Stabilizzazione d’emergenza (Medicina)',
    stabilizza: true,
    costo: '1 AzP in ciascuno di 2 Round consecutivi',
    prova: 'Medicina con −2 VA (urgenza), più i modificatori di strumenti e Talenti',
    richiede: 'soccorritore adiacente e con accesso al paziente, kit medico almeno Standard; consuma 1 applicazione all’inizio',
    esiti: [
      { esito: 'Successo Magistrale', effetto: 'Morente → Grave, contatore disattivato, recupera 1d4 PV fino al massimo' },
      { esito: 'Successo', effetto: 'Morente → Grave, contatore disattivato. Nessun PV' },
      { esito: 'Fallimento', effetto: 'Nessuna stabilizzazione: il contatore continua' },
      { esito: 'Fallimento Maldestro', effetto: 'Nessuna stabilizzazione e 1 Round in meno, subito' },
    ],
    note: 'Il contatore continua durante il trattamento. Un’interruzione impedisce la Prova e non restituisce i materiali; si può riprovare ricominciando e consumando un’altra applicazione. Non arresta il Sanguinamento e non elimina Menomazioni.',
    talenti: [
      'Soccorso Immediato (Paramedico): l’intervento scende a 1 AzP, con la stessa Prova, gli stessi materiali e gli stessi esiti.',
      'Stabilizzazione (Medico): +2 VA alla Prova.',
      'Triage Estremo: stabilizza senza Prova con 1 AzP e strumenti almeno Standard, una volta per combattimento; arresta anche il Sanguinamento.',
    ],
  },
  {
    id: 'guarigione',
    nome: 'Guarigione d’emergenza (incantesimo di livello 3 o superiore)',
    stabilizza: true,
    costo: '3 PM e 1 AzP, a Contatto',
    prova: 'la normale Prova di lancio',
    richiede: 'conoscere Guarigione almeno al livello 3; un solo bersaglio vivente',
    esiti: [{ esito: 'Lancio riuscito', effetto: 'Morente → Grave, contatore disattivato, recupera 1 PV fino al massimo' }],
    note: 'Non arresta il Sanguinamento e non elimina Menomazioni. Si può usare anche se il paziente ha già ricevuto Guarigione ordinaria nelle 24 ore precedenti, e non consuma quel limite. Nell’impiego d’emergenza il ritorno è sempre a Grave, anche con una versione superiore.',
  },
  {
    id: 'cartuccia-stabilizzante',
    nome: 'Cartuccia Stabilizzante',
    stabilizza: true,
    costo: '1 AzP (nessuna Azione con l’UMC Automatica)',
    prova: 'UMC Passiva: Medicina oppure Tecnologia. UMC Attiva: nessuna Prova. UMC Automatica: nessuna Prova',
    richiede: 'una cartuccia carica in un dispositivo compatibile; il paziente dev’essere ancora vivo',
    esiti: [{ esito: 'Somministrazione riuscita', effetto: 'Morente → Grave (−8), contatore disattivato. Nessun PV' }],
    note: 'Non recupera PV, non arresta il Sanguinamento, non elimina Menomazioni. Una sola somministrazione rapida per paziente per Round, condivisa fra dispositivi, UMC, impianti e postazioni.',
    rif: 'sanitario:cartuccia-stabilizzante',
  },
];

/** Quello che **non** stabilizza, con il motivo: sono gli errori che il manuale nomina per primi. */
export const NON_STABILIZZANO = [
  { nome: 'Recuperare PV', perche: 'Il recupero dei PV non disattiva il contatore: Cura Ferite, Corpo Adattivo, Psicometabolismo, cartuccia Curativa e spray rimarginanti lasciano il personaggio Morente.' },
  { nome: 'Arrestare il Sanguinamento', perche: 'Cartuccia Coagulante ed emostatica fermano il Sanguinamento, non il contatore. Sono effetti distinti e possono servire tutti e due.' },
  { nome: 'Riposo e cura ordinaria delle Ferite', perche: 'Le procedure ordinarie di recupero riprendono dopo la stabilizzazione, non al posto suo.' },
  { nome: 'Protocollo Shock, Cura Spirituale', perche: 'Tolgono lo Stato Svenuto, non il contatore di Morente.' },
  { nome: 'Naniti, Intervento Mirato, Terapia Intensiva', perche: 'Restano trattamenti con i loro tempi: non diventano interventi istantanei.' },
  { nome: 'Imposizione della Mano Curativa', perche: 'Mantiene i 5 minuti per curare una Ferita: non ha una modalità rapida.' },
  { nome: 'Rigenerazione', perche: 'Riguarda le Menomazioni. Non è una stabilizzazione d’emergenza né una resurrezione.' },
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['lotto_193_morente.mjs'], 'lotto_193_morente.mjs');
  const scrivi = argv.includes('--scrivi');
  const f = join(RADICE, 'data', 'regole.json');
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const cambi = [];
  const M = j.ferite.morente;

  // 1. la frase riscritta dal §5.14 (lotto 191: una delle cinque, l'unica di questo ambito)
  const i = (j.danno_applicato.frasi ?? []).indexOf(FRASE[0]);
  if (i >= 0) cambi.push(`danno_applicato.frasi[${i}]: «${FRASE[0]}» → «${FRASE[1]}»`);
  else if (!(j.danno_applicato.frasi ?? []).includes(FRASE[1])) cambi.push('⚠ la frase del §5.14 non c’è più né nella forma vecchia né in quella nuova');

  // 2. gli interventi, con `stabilizza` vero o falso
  if (!Array.isArray(M.interventi) || M.interventi.length !== INTERVENTI.length) cambi.push(`ferite.morente.interventi: ${INTERVENTI.length} voci (${INTERVENTI.filter((x) => x.stabilizza).length} stabilizzano)`);
  if (!Array.isArray(M.non_stabilizzano) || M.non_stabilizzano.length !== NON_STABILIZZANO.length) cambi.push(`ferite.morente.non_stabilizzano: ${NON_STABILIZZANO.length} voci`);

  // 3. contatore disattivato, morte da registrare, UMC Automatica, Stasi
  for (const [k, che] of [['disattivato', 'il contatore spento da una stabilizzazione, distinto da quello esaurito'],
    ['esaurito', 'il contatore attivo arrivato a 0']]) {
    if (!M.contatore?.[k]) cambi.push(`ferite.morente.contatore.${k}: ${che}`);
  }
  if (!M.morte?.registra) cambi.push('ferite.morente.morte: la registra il Direttore, e si annulla');
  if (!M.umc_automatica) cambi.push('ferite.morente.umc_automatica: interviene a fine attacco, se il paziente è ancora vivo');
  if (!M.sospensione) cambi.push('ferite.morente.sospensione: la Stasi sospende il contatore senza azzerarlo e senza stabilizzare');

  console.log(`${cambi.length} cambi in data/regole.json (Giocatore ${versioneManuale('giocatore')} §§5.14.2–5.14.3, A.159 del Doc E&L):`);
  for (const x of cambi) console.log(`  ${x}`);
  if (!scrivi) { console.log('\nNiente scritto. Con --scrivi si applica.'); process.exit(0); }

  if (i >= 0) j.danno_applicato.frasi[i] = FRASE[1];

  M.interventi = INTERVENTI;
  M.non_stabilizzano = NON_STABILIZZANO;
  M._interventi = 'Lotto 193: §5.14.3 e registrazione A.159 del Doc E&L. `stabilizza` è la sola cosa che chi soccorre deve leggere prima di spendere l’azione; `non_stabilizzano` sono gli errori che il manuale nomina per primi. L’app li mostra e basta: non tira le Prove e non applica gli esiti (CLAUDE.md: propone, non impone).';

  M.contatore.disattivato = {
    etichetta: 'Contatore disattivato',
    testo: 'Stabilizzato: il contatore è spento, non esaurito. Un contatore disattivato a 0 non è una morte.',
  };
  M.contatore.esaurito = {
    etichetta: 'Contatore esaurito',
    testo: 'Il contatore attivo è arrivato a 0. La morte la registra il Direttore: l’app non la dichiara da sé.',
  };
  M.morte = {
    registra: 'Registra la morte',
    annulla: 'Annulla la morte',
    conferma: 'Registrare la morte di {nome}? La decisione è del Direttore e si può annullare.',
    nota: 'L’app non dichiara morto nessuno da sé: il contatore esaurito è un avviso. La morte la registra il Direttore e si annulla (CLAUDE.md: l’app propone, non impone; avverte, non blocca).',
    registrata: 'Morte registrata dal Direttore',
  };
  M.umc_automatica = {
    nome: 'UMC Automatica',
    quando: 'alla fine dell’intero attacco',
    testo: 'L’UMC Automatica con protocollo Morente abilitato e una Cartuccia Stabilizzante carica interviene senza Azioni né Prova, ma soltanto dopo tutti i colpi, i danni e le Ferite dell’intero attacco, e soltanto se il paziente è ancora vivo.',
    non_interviene: [
      'fra un colpo e l’altro dello stesso attacco',
      'se il contatore si è esaurito durante l’attacco: il dispositivo non resuscita',
      'se la somministrazione rapida del Round è già stata usata (il primo momento utile è il Round successivo)',
    ],
    limite: 'Una sola somministrazione rapida per paziente per Round, condivisa fra dispositivi, UMC, impianti e postazioni.',
  };
  M.sospensione = {
    nome: 'Stasi',
    testo: 'La Stasi sospende il decorso del contatore senza azzerarlo e senza stabilizzare: all’uscita riprende dai Round residui. Serve ancora una cura specifica.',
  };
  M.paragrafo = `§§5.14.2–5.14.3 (Giocatore ${versioneManuale('giocatore')}; A.159, registrazione approvata nel Doc E&L)`;
  j.ferite.oltre_avviso = 'Oltre Grave il personaggio è Morente: mantiene i malus di Grave (−8), sviene e ha i Round del contatore per essere stabilizzato (§5.14.2). Il colpo che lo fa entrare lascia il contatore pieno.';

  writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
  console.log('\nScritto data/regole.json.');
}

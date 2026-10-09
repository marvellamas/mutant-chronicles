// Lotto «Equipaggiamento 0.6» del 09/10/2026 (docs/diff-davide-2026-10-08.md, lotto 6): le voci nuove dell'edizione 0.6
// del Manuale dell'Equipaggiamento (08/10/2026 13:24), con i numeri del manuale (docs/manuali-txt/equipaggiamento.md):
//   §3.3.1 navigatore inerziale; §3.5.1 decontaminazione; §3.7 estintori, nastro tecnico, toppe, schiuma strutturale;
//   §3.8 tuta extraveicolare, riparo pressurizzato, calzature magnetiche; §4.4 modulo di cifratura, rilevatore di
//   sorveglianza; §5.9 utensile laser; §5.10 analizzatore alimentare; le sette righe nuove della tabella NEC (§5.4) come
//   «alimentazione» delle voci; dosi, toppe, test e aria delle bombole come «applicazioni» (risorse separate dai PI);
//   la frase del §4.1 sulla cifratura nei tre comunicatori.
// Un dato che il manuale non dà resta null con il TODO(Davide) (A.154: peso della cartuccia del decontaminante).
// Idempotente: rieseguito non cambia nulla.  node tools/lotti/lotto_equipaggiamento_edizione06.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const D = fileURLToPath(new URL('../../data/equipaggiamento/', import.meta.url));
const leggi = (f) => JSON.parse(readFileSync(D + f, 'utf8'));
const scrivi = (f, j) => writeFileSync(D + f, `${JSON.stringify(j, null, 2)}\n`);
const V = 'Equipaggiamento 0.6';
const base = (id, nome, famiglia, paragrafo, note, campi) => ({
  id, nome, tipo: 'altro', catalogo: 'Commerciale', famiglia, nomi_alternativi: [], note_manuale: note, paragrafo, versione_manuale: V, ...campi, proprieta: [],
});
const nec = (id, consumo, ore, paragrafo) => ({ nec: `nec:${id}`, consumo_lxh: consumo, autonomia_ore: ore, paragrafo });

// ── §3.3.1, §3.5.1, §3.7, §3.8: esplorazione.json ──
const ESPLORAZIONE = [
  base('navigatore-inerziale', 'Navigatore inerziale', 'Orientamento e arrampicata', '§3.3.1',
    'Un dispositivo palmare registra gli spostamenti mediante sensori interni. Sullo schermo mostra il percorso seguito, la direzione del punto di partenza e la distanza dai riferimenti memorizzati. Funziona anche sottoterra e in assenza di rete o satelliti. Permette di ritrovare un punto registrato e ripercorrere un itinerario memorizzato senza una Prova di orientamento, finché il percorso rimane riconoscibile e praticabile. Registrare il punto in cui ci si trova o consultare un riferimento richiede 1 AzP e una mano. Non rileva ostacoli, pericoli o passaggi sconosciuti. Comprende NEC Verde compatto carico da 100 Lx, cavo e alimentatore: consumo 2 Lx/h, autonomia 50 ore. Ricambio carico 10 cr; sostituzione 1 AzP; ricarica completa un’ora e 1 cr con fonte adeguata (§5.4).',
    { peso: 0.3, qualita: 'Comune', ps_int: 10, pi: 2, reperibilita: 'NC', costo: 600, alimentazione: nec('verde-compatto', 2, 50, '§3.3.1'),
      effetto_breve: 'Ritrova un punto registrato e ripercorre un itinerario senza Prova di orientamento.' }),
  base('decontaminante-personale', 'Decontaminante personale', 'Protezioni ambientali', '§3.5.1',
    'Una dose permette di decontaminare l’esterno della tuta e dell’equipaggiamento indossato da una persona, oppure una quantità equivalente di oggetti. L’operazione richiede un minuto e due mani. Su contaminanti ordinari riconosciuti e superfici accessibili riesce senza Prova. Il trattamento rimuove il rischio dovuto ai residui trattati. Non cura avvelenamenti, infezioni o danni già subiti, non ripulisce automaticamente l’interno di apparecchi chiusi e non protegge dalle radiazioni di una fonte esterna. Non elimina Corruzione o contaminazioni soprannaturali. 1 dose monouso. Nessun NEC.',
    { peso: 0.5, qualita: 'Comune', ps_int: 10, pi: 2, reperibilita: 'NC', costo: 200, applicazioni: 1, nome_applicazioni: 'dosi',
      effetto_breve: 'Decontamina l’esterno di tuta ed equipaggiamento di una persona: un minuto, due mani.' }),
  base('erogatore-decontaminante-ricaricabile', 'Erogatore di decontaminante ricaricabile', 'Protezioni ambientali', '§3.5.1',
    'Una dose permette di decontaminare l’esterno della tuta e dell’equipaggiamento indossato da una persona, oppure una quantità equivalente di oggetti. L’operazione richiede un minuto e due mani. Su contaminanti ordinari riconosciuti e superfici accessibili riesce senza Prova. Cambiare la cartuccia richiede un minuto e due mani. Nessun NEC; le dosi residue sono separate dai PI.',
    { peso: 2.5, qualita: 'Comune', ps_int: 10, pi: 4, reperibilita: 'NC', costo: 800, applicazioni: 5, nome_applicazioni: 'dosi', ricarica: { applicazioni: 5, costo: 500 },
      effetto_breve: '5 dosi; ognuna decontamina l’esterno di tuta ed equipaggiamento di una persona.' }),
  base('cartuccia-di-decontaminante', 'Cartuccia di decontaminante (ricambio)', 'Protezioni ambientali', '§3.5.1',
    'Cartuccia di ricambio per l’erogatore ricaricabile: 5 dosi. Cambiare la cartuccia richiede un minuto e due mani.',
    { peso: null, reperibilita: 'NC', costo: 500, applicazioni: 5, nome_applicazioni: 'dosi',
      'TODO(Davide)': 'A.154: nella tabella del §3.5.1 il peso della cartuccia di ricambio è «—»: è trascurabile (0 kg) o manca il dato? Intanto resta vuoto e non pesa sul carico.',
      effetto_breve: 'Ricambio da 5 dosi per l’erogatore di decontaminante.' }),
  base('estintore-personale', 'Estintore personale', 'Emergenze e ripristini provvisori', '§3.7',
    'Con 1 AzP, una mano e una dose termina automaticamente Incendiato su sé stessi o su una persona entro 2 Q raggiungibile dal getto; in alternativa spegne un piccolo focolaio circoscritto entro 1 Q di superficie, alla stessa distanza. Si sceglie un solo impiego per dose. Non richiede una nuova PS e non recupera i danni subiti. Il monouso viene scartato dopo l’impiego. Nessun NEC.',
    { peso: 0.3, qualita: 'Comune', ps_int: 10, pi: 2, reperibilita: 'CO', costo: 100, applicazioni: 1, nome_applicazioni: 'dosi',
      effetto_breve: '1 AzP, una mano: termina Incendiato (su di sé o una persona entro 2 Q) o spegne un piccolo focolaio.' }),
  base('estintore-ricaricabile', 'Estintore ricaricabile', 'Emergenze e ripristini provvisori', '§3.7',
    'Con 1 AzP, una mano e una dose termina automaticamente Incendiato su sé stessi o su una persona entro 2 Q raggiungibile dal getto; in alternativa spegne un piccolo focolaio circoscritto entro 1 Q di superficie, alla stessa distanza. Si sceglie un solo impiego per dose. Sostituire la cartuccia del ricaricabile richiede un minuto e due mani. Nessun NEC.',
    { peso: 1.5, qualita: 'Comune', ps_int: 10, pi: 4, reperibilita: 'CO', costo: 400, applicazioni: 5, nome_applicazioni: 'dosi', ricarica: { applicazioni: 5, costo: 100 },
      effetto_breve: '5 dosi; 1 AzP, una mano: termina Incendiato o spegne un piccolo focolaio.' }),
  base('ricambio-estintore', 'Ricambio per estintore', 'Emergenze e ripristini provvisori', '§3.7',
    'Ricambio da 5 dosi per l’estintore ricaricabile. Sostituire la cartuccia del ricaricabile richiede un minuto e due mani.',
    { peso: 0.5, reperibilita: 'CO', costo: 100, applicazioni: 5, nome_applicazioni: 'dosi', effetto_breve: 'Ricambio da 5 dosi per l’estintore ricaricabile.' }),
  base('nastro-tecnico', 'Nastro tecnico', 'Emergenze e ripristini provvisori', '§3.7',
    'Un’applicazione richiede un minuto e due mani. Permette di fissare un componente leggero, riunire cavi, richiudere un contenitore o tamponare una lacerazione di zaino, abito o tenda. L’impiego ordinario non richiede Prove. Non sostiene il peso di una persona, non ripristina circuiti e non garantisce la tenuta di una tuta nel vuoto. Lascia invariati i PI dell’oggetto trattato e non rende utilizzabile un oggetto Rotto a 0 PI. Nessun NEC.',
    { peso: 0.2, qualita: 'Comune', ps_int: 10, pi: 2, reperibilita: 'CO', costo: 50, applicazioni: 5, nome_applicazioni: 'applicazioni',
      effetto_breve: '5 applicazioni da un minuto: fissa, riunisce, richiude, tampona; non recupera PI.' }),
  base('toppe-pressurizzate', 'Toppe pressurizzate', 'Emergenze e ripristini provvisori', '§3.7',
    'Con 1 AzP e due mani, una toppa chiude un foro o taglio accessibile fino a 20 cm, ripristinando la tenuta in quel punto. Si applica sulla propria tuta o su quella di un compagno adiacente; in condizioni ordinarie non richiede Prove. Rimane efficace finché integra e aderente. Non sostituisce parti mancanti, raccordi rotti o un intero visore, né reintegra l’aria perduta. Lascia invariati i PI dell’oggetto trattato. Qualità, PS Integrità e PI sono quelli della singola toppa applicata (Comune, 10, 1 PI). Nessun NEC.',
    { peso: 0.25, qualita: 'Comune', ps_int: 10, pi: 1, reperibilita: 'NC', costo: 250, applicazioni: 5, nome_applicazioni: 'toppe',
      effetto_breve: '5 toppe; 1 AzP, due mani: chiude un foro fino a 20 cm e ripristina la tenuta.' }),
  base('applicatore-di-schiuma', 'Applicatore di schiuma strutturale', 'Emergenze e ripristini provvisori', '§3.7',
    'Una dose e un minuto di lavoro, con due mani, chiudono un’apertura fino a 1 Q × 1 Q, purché esistano bordi o un supporto a cui il materiale possa aderire. La chiusura è opaca, impedisce di vedere attraverso l’apertura e costituisce un ostacolo con 4 PI e PS Integrità 10. Più dosi chiudono aperture maggiori: ogni tratto di 1 Q × 1 Q conserva i propri 4 PI. La schiuma non è portante e non garantisce tenuta pressurizzata. Sostituire la cartuccia richiede un minuto e due mani. L’erogazione è meccanica e non richiede NEC.',
    { peso: 2, qualita: 'Comune', ps_int: 10, pi: 4, reperibilita: 'NC', costo: 600, applicazioni: 5, nome_applicazioni: 'dosi', ricarica: { applicazioni: 5, costo: 200 },
      effetto_breve: '5 dosi; una dose e un minuto chiudono un’apertura di 1 Q × 1 Q (ostacolo da 4 PI).' }),
  base('ricambio-schiuma', 'Ricambio di schiuma strutturale', 'Emergenze e ripristini provvisori', '§3.7',
    'Ricambio da 5 dosi per l’applicatore di schiuma strutturale. Sostituire la cartuccia richiede un minuto e due mani.',
    { peso: 1, reperibilita: 'NC', costo: 200, applicazioni: 5, nome_applicazioni: 'dosi', effetto_breve: 'Ricambio da 5 dosi per l’applicatore di schiuma.' }),
  base('tuta-extraveicolare', 'Tuta da lavoro extraveicolare', 'Attività extraveicolari', '§3.8.1',
    'Mentre è integra, chiusa e rifornita, permette di operare nel vuoto o in atmosfere irrespirabili. Isola il corpo dai contaminanti esterni trasmessi per inalazione o contatto. Comprende due bombole per 4 ore complessive d’aria, climatizzazione e controllo della pressione, comunicatore personale da 1 km, lampada frontale da 6 Q, indicatori e allarme di perdita, cinque toppe pressurizzate del §3.7 e anelli di ancoraggio. Indossarla e controllarne la chiusura richiede 5 minuti. Se già indossata e predisposta, chiudere il casco e attivare il supporto vitale richiede 1 AzP e due mani. Un NEC Verde standard da 1.000 Lx alimenta tutte le funzioni a 25 Lx/h, per 40 ore. Aria ed energia si annotano separatamente: 40 ore di batteria non aumentano le 4 ore d’aria. Non concede AR. Ricambi: bombola carica da 2 ore-persona 100 cr; sostituire una bombola richiede un minuto e due mani.',
    { peso: 12, qualita: 'Non comune', ps_int: 12, pi: 6, reperibilita: 'NC', costo: 8000, alimentazione: nec('verde-standard', 25, 40, '§3.8.1'),
      applicazioni: 4, nome_applicazioni: 'ore d’aria', ricarica: { applicazioni: 2, costo: 100 },
      effetto_breve: 'Lavoro nel vuoto: 4 ore d’aria, 40 ore di energia; +2 PS Tempra contro caldo e freddo ambientali.',
      effetti: [{ tipo: 'salvezza', salvezza: 'tempra', valore: 2, ambito: 'uso_specifico', uso: 'contro caldo e freddo ambientali', condizione: 'La climatizzazione concede +2 alle PS di Tempra contro caldo e freddo ambientali, quando richieste; si applica un solo beneficio dell’equipaggiamento contro lo stesso pericolo.', beneficio: 'climatizzazione', fonte: 'Equipaggiamento §3.8.1' }] }),
  base('riparo-pressurizzato', 'Riparo pressurizzato portatile', 'Attività extraveicolari', '§3.8.2',
    'Un involucro ripiegabile si tende su un’intelaiatura leggera formando un ambiente ermetico. Ospita due persone con il normale equipaggiamento personale. Comprende quattro bombole, un NEC Verde standard carico e cinque toppe pressurizzate. Le bombole forniscono 8 ore-persona: 8 ore per un occupante oppure 4 ore per due occupanti. Una persona impiega 10 minuti per montarlo o smontarlo. Occorrono una superficie adatta, ancoraggi utilizzabili e uno spazio di 2 × 2 Q. Il NEC Verde standard da 1.000 Lx alimenta il riparo a 50 Lx/h, per 20 ore indipendentemente dal numero degli occupanti. Offre condizioni adatte al riposo, ma non accelera il recupero e non costituisce una postazione medica.',
    { peso: 26, qualita: 'Non comune', ps_int: 12, pi: 8, reperibilita: 'RA', costo: 12000, alimentazione: nec('verde-standard', 50, 20, '§3.8.2'),
      applicazioni: 8, nome_applicazioni: 'ore-persona d’aria', ricarica: { applicazioni: 2, costo: 100 },
      effetto_breve: 'Ambiente ermetico per due: 8 ore-persona d’aria, 20 ore di energia; +2 PS Tempra contro caldo e freddo all’interno.',
      effetti: [{ tipo: 'salvezza', salvezza: 'tempra', valore: 2, ambito: 'uso_specifico', uso: 'all’interno, contro caldo e freddo ambientali', condizione: 'La climatizzazione concede +2 alle PS di Tempra contro caldo e freddo ambientali all’interno.', beneficio: 'climatizzazione', fonte: 'Equipaggiamento §3.8.2' }] }),
  base('calzature-magnetiche', 'Calzature ad aderenza magnetica (coppia)', 'Attività extraveicolari', '§3.8.3',
    'In assenza di gravità permette di camminare lungo superfici ferromagnetiche e lavorare restando ancorati, con entrambe le mani libere. Indossare o togliere la coppia richiede un minuto; attivare o disattivare l’aderenza richiede 1 AzP. Ogni Q percorso costa 2 Q di Movimento. Lo spostamento ordinario su una superficie adatta non richiede Prove. La portata è di 200 kg complessivi, compresi utilizzatore ed equipaggiamento. Funzionano soltanto su materiali ferromagnetici. Nessun NEC: magneti e sgancio sono passivi.',
    { peso: 1.5, qualita: 'Comune', ps_int: 10, pi: 4, reperibilita: 'NC', costo: 600,
      effetto_breve: 'In assenza di gravità si cammina su superfici ferromagnetiche: ogni Q costa 2 Q.' }),
];

// ── §4.4: comunicazione.json ──
const COMUNICAZIONE = [
  base('modulo-di-cifratura', 'Modulo di cifratura per comunicatori', 'Comunicazioni protette e controsorveglianza', '§4.4',
    'Un piccolo accessorio collegato al comunicatore codifica voce e dati mediante una chiave condivisa. I dispositivi autorizzati ricostruiscono automaticamente il messaggio. Chi ascolta il canale con un normale ricevitore privo della chiave non comprende le comunicazioni. Ogni comunicatore coinvolto deve possedere un modulo compatibile e la stessa chiave. Installazione e configurazione richiedono un minuto per apparecchio, senza Prova in condizioni ordinarie. Non nasconde la trasmissione, non aumenta la portata e non impedisce il disturbo radio. Il modulo riceve energia dal comunicatore; il consumo è compreso nel suo profilo operativo, senza una seconda riserva da annotare.',
    { peso: 0.1, qualita: 'Non comune', ps_int: 12, pi: 2, reperibilita: 'NC', costo: 500,
      effetto_breve: 'Cifra voce e dati del comunicatore: chi non ha la chiave non comprende.' }),
  base('rilevatore-di-sorveglianza', 'Rilevatore di sorveglianza elettronica', 'Comunicazioni protette e controsorveglianza', '§4.4',
    'Uno strumento palmare con antenna orientabile e sonda ravvicinata cerca emissioni e segnali caratteristici dei dispositivi di sorveglianza. Un’ispezione richiede 10 minuti per un locale fino a 4 × 4 Q, accesso alle superfici da controllare e una Prova. Con successo individua i dispositivi rilevabili nell’area effettivamente esaminata; un fallimento non garantisce che il locale sia sicuro. Non scopre automaticamente dispositivi spenti, osservatori esterni, strumenti puramente ottici o sorveglianza magica. Il bonus non si somma a quello di altri strumenti sulla stessa Prova. Comprende NEC Verde standard carico, cavo e alimentatore: 1.000 Lx, 25 Lx/h e 40 ore effettive.',
    { peso: 1, qualita: 'Non comune', ps_int: 12, pi: 4, reperibilita: 'NC', costo: 2000, alimentazione: nec('verde-standard', 25, 40, '§4.4'),
      effetto_breve: '+2 a Tecnologia per cercare microspie e apparati attivi (10 minuti per un locale fino a 4 × 4 Q).',
      effetti: [{ abilita: 'Tecnologia', valore: 2, ambito: 'uso_specifico', uso: 'ricerca di microspie e apparati attivi', condizione: 'Consente una ricerca specialistica di microspie e apparati attivi, con +2 a Tecnologia degli strumenti.', fonte: 'Equipaggiamento §4.4' }] }),
];

// ── §5.9, §5.10: strumenti_professionali.json ──
const STRUMENTI = [
  base('utensile-laser-da-taglio-e-saldatura', 'Utensile laser da taglio e saldatura', 'Strumenti tecnici e artigianali', '§5.9',
    'Taglio. Taglia metalli ordinari fino a 1 cm di spessore con 10 minuti di lavoro per un tratto fino a 1 Q. Un taglio semplice in condizioni adatte riesce senza Prova; lavori di precisione o condizioni difficili usano Tecnologia. Saldatura. Fornisce lo strumento necessario ai lavori compatibili. Quando ripara un oggetto, si applicano Prova di Tecnologia, tempi, materiali e recupero dei PI ordinari. È uno strumento Standard, senza bonus aggiuntivo. Richiede due mani, accesso diretto e un pezzo fermo. Comprende NEC Rosso standard carico, cavo e alimentatore: 500 Lx, consumo 100 Lx/h, 5 ore effettive di lavoro anche non consecutive. Ricambio carico 50 cr; sostituzione con ricambio accessibile 1 AzP; ricarica completa un’ora e 5 cr con fonte adeguata (§5.4).',
    { peso: 2, qualita: 'Non comune', ps_int: 12, pi: 4, reperibilita: 'NC', costo: 1500, alimentazione: nec('rosso-standard', 100, 5, '§5.9'),
      effetto_breve: 'Taglia metalli fino a 1 cm (10 minuti per 1 Q) e salda: strumento Standard, senza bonus.' }),
  base('analizzatore-alimentare-portatile', 'Analizzatore alimentare portatile', 'Strumenti tecnici e artigianali', '§5.10',
    'Una piccola valigetta contiene un vano per campioni, sensori biochimici e un archivio di sostanze conosciute. Un esame richiede un campione, 10 minuti, una superficie di appoggio e un test monouso, consumato anche se la Prova fallisce. Con successo si ottengono le informazioni ricavabili dall’apparecchio; un fallimento dà un risultato inconcludente. Il +2 è un bonus degli strumenti e non si somma a quello di un altro corredo nella stessa analisi. La dotazione comprende dieci test; una confezione di dieci ricambi costa 100 cr. Comprende NEC Verde standard carico, cavo e alimentatore: 1.000 Lx, consumo 25 Lx/h, autonomia 40 ore effettive. Si annotano ore residue e test disponibili separatamente.',
    { peso: 1, qualita: 'Non comune', ps_int: 12, pi: 4, reperibilita: 'NC', costo: 1200, alimentazione: nec('verde-standard', 25, 40, '§5.10'),
      applicazioni: 10, nome_applicazioni: 'test', ricarica: { applicazioni: 10, costo: 100 },
      effetto_breve: '+2 a Scienza per analizzare acqua, alimenti e scorte (10 minuti e un test).',
      effetti: [{ abilita: 'Scienza', valore: 2, ambito: 'uso_specifico', uso: 'analisi di acqua, alimenti e scorte', condizione: 'Permette di cercare contaminanti, tossine e segni di deterioramento compatibili con i test disponibili, concedendo +2 a Scienza per l’analisi.', fonte: 'Equipaggiamento §5.10' }] }),
];

/** Aggiunge o sostituisce le voci (per id) e aggiorna l'edizione del file. */
function applica(file, voci) {
  const j = leggi(file);
  for (const v of voci) {
    const i = j.oggetti.findIndex((o) => o.id === v.id);
    if (i >= 0) j.oggetti[i] = v; else j.oggetti.push(v);
  }
  j.versione_manuale = V;
  return j;
}
scrivi('esplorazione.json', applica('esplorazione.json', ESPLORAZIONE));
const com = applica('comunicazione.json', COMUNICAZIONE);
// §4.1 (0.6): la cifratura ora richiede il modulo del §4.4
const PRIMA = 'cifratura, intercettazione specialistica e disturbo intenzionale sono esclusi.';
const DOPO = 'la cifratura richiede il modulo del §4.4. Intercettazione specialistica e disturbo intenzionale non sono funzioni dei comunicatori ordinari.';
for (const o of com.oggetti) if (typeof o.note_manuale === 'string' && o.note_manuale.includes(PRIMA)) { o.note_manuale = o.note_manuale.replace(PRIMA, DOPO); o.versione_manuale = V; }
scrivi('comunicazione.json', com);
scrivi('strumenti_professionali.json', applica('strumenti_professionali.json', STRUMENTI));
console.log(`lotto Equipaggiamento 0.6: ${ESPLORAZIONE.length + COMUNICAZIONE.length + STRUMENTI.length} voci scritte`);

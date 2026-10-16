// Profili della Covata (nove caste) e del Lorath, dal Manuale dei Mostri v0.13, cap. 7 «Fauna di Iris».
// Scrive esempi/nemici/mostri/*.json nel formato di data/formato_nemici.json (A.73), utilizzabili da
// «+ Aggiungi nemico» e dalla plancia come gli altri prestabiliti.
//
// Valori trascritti dalle schede del manuale; niente valori inventati. Spazio sulla mappa (A.126): le caste
// con ingombro non quadrato o maggiore di 3 × 3 Q (Corazzato 1 × 2, Regina Comandante 2 × 3, Incubatrice
// 3 × 5, Madre 3 × 10) non entrano nei valori del campo `spazio` (1 Q, 2 × 2, 3 × 3): si lascia il campo
// vuoto e si scrive l'ingombro del manuale nelle note, con il rimando alla domanda A.167.
//
// Uso: node tools/genera_mostri_covata.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.13 (16/10/2026), cap. 7 «Fauna di Iris»';

// Tratti comuni della Covata (regole comuni del cap. 7): resistenza al Fuoco, Ignifugo 6, disorientamento.
const TRATTI_COVATA = [
  { nome: 'Resistenza al fuoco', effetto: 'Dimezza per eccesso ogni componente di danno Fuoco (anche Magico o Etereo e il danno di Incendiato) dopo Difese e Salvezze e prima dell’AR. Non si estende a Plasma, Laser o Elettricità.' },
  { nome: 'Adattamento alle Terre del Fuoco', effetto: 'Le condizioni ambientali delle Terre del Fuoco, compreso il contatto con la lava, non producono danni o Affaticamento da calore. Crolli e urti restano pericolosi.' },
  { nome: 'Disorientamento da freddo', effetto: 'Un effetto di freddo che la raggiunge la disorienta per 1 Round (dal Round R alla fine di R+1), anche se l’AR assorbe tutto il danno: non può spostarsi né attaccare (neppure Attacchi di Opportunità), ma può difendersi spendendo AzP e AzM. Un colpo schivato non lo attiva. Nuove esposizioni tengono la scadenza più lontana senza sommare Round.' },
];
const NOTA_COVATA = 'Covata (Mostri cap. 7): insettoide vivente di Natura Comune; nessuno Stato iniziale, nessun incantesimo. Resistenza al Fuoco e Ignifugo 6 di carapace (Contromisura, A.73). A 0 PV può continuare ad agire; le Ferite arrivano solo con danno positivo già a 0 PV (§5.14). PM personali anche senza poteri; a 0 PM Svenuto.';

// id → profilo. Spazio nei dati solo per i valori ammessi dalla A.126; altrimenti nota.
const CREATURE = [
  {
    id: 'covata-rasente', nome: 'Rasente',
    caratteristiche: { FOR: 5, DES: 7, COS: 5, INT: 2, SAG: 5, CAR: 1 },
    pv: 20, pm: 5, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: -1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 10, riflessi: 12, volonta: 8, magia: 9 },
    attacchi: [
      { nome: 'Morso', tipo: 'ravvicinato', va: 11, danno: '1d6+2', natura: 'Naturale', portata_q: 1, ac: 1 },
      { nome: 'Artigli anteriori', tipo: 'ravvicinato', va: 10, danno: '1d4+2', natura: 'Naturale', portata_q: 1, ac: 1 },
    ],
    abilita: [{ nome: 'Atletica', va: 12 }, { nome: 'Corpo a corpo', va: 11 }, { nome: 'Furtività', va: 10 }, { nome: 'Percezione', va: 10 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      { nome: 'Scalatore', effetto: 'Con 1 AzM percorre fino a 4 Q su roccia o muratura con appigli, anche verticale; Atletica solo in condizioni difficili. Niente Corsa o Scatto in arrampicata; superfici lisce e soffitti no.', azioni: { movimento: 1 } },
      { nome: 'Terzetto', effetto: 'Tre Rasenti che attaccano realmente lo stesso bersaglio ricevono il normale +1 VA di Superiorità numerica; nessun bonus di squadra aggiuntivo.' },
    ],
    note: 'Può Schivare ed Elusione; nessuna Parata naturale. Non attacca spontaneamente: interviene se provocato o comandato.',
  },
  {
    id: 'covata-raccoglitore', nome: 'Raccoglitore',
    caratteristiche: { FOR: 4, DES: 4, COS: 6, INT: 2, SAG: 5, CAR: 1 },
    pv: 16, pm: 4, ar: { totale: 1, magica: 0 }, difese: 8, iniziativa: -4,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 11, riflessi: 9, volonta: 7, magia: 8 },
    attacchi: [],
    abilita: [{ nome: 'Atletica', va: 7 }, { nome: 'Percezione', va: 9 }],
    gs_px: { gs: '—', px: 0, per_pg: 4 },
    capacita: [
      { nome: 'Sintesi energetica', effetto: 'Raccolta e trasformazione della lava sono attività continuative: non generano un getto offensivo, cure o grappoli utilizzabili in combattimento. Il ventre non esplode quando è ferito.' },
    ],
    note: 'Casta non combattente: nessun attacco, nessun Attacco di Opportunità. Può Schivare ed Elusione; se attaccato fugge verso riparo.',
  },
  {
    id: 'covata-trasportatore', nome: 'Trasportatore',
    caratteristiche: { FOR: 6, DES: 4, COS: 6, INT: 2, SAG: 5, CAR: 1 },
    pv: 18, pm: 4, ar: { totale: 2, magica: 0 }, difese: 8, iniziativa: -4,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 11, riflessi: 9, volonta: 7, magia: 8 },
    attacchi: [],
    abilita: [{ nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 9 }],
    gs_px: { gs: '—', px: 0, per_pg: 4 },
    capacita: [
      { nome: 'Trasporto biologico', effetto: 'Custodisce fino a 30 kg di grappoli nel ventre, carico già compatibile con i movimenti indicati: è un limite di trasporto, non PM o cariche.' },
      { nome: 'Scarico', effetto: 'Fuori dallo scontro depone i grappoli senza danneggiarli; liberarsene volontariamente costa 1 AzP e li deposita nel proprio spazio. Ferirlo non produce esplosioni.', azioni: { principali: 1 } },
    ],
    note: 'Casta non combattente: nessun attacco, nessun Attacco di Opportunità. Può Schivare ed Elusione.',
  },
  {
    id: 'covata-saltatore', nome: 'Saltatore',
    caratteristiche: { FOR: 4, DES: 8, COS: 4, INT: 2, SAG: 5, CAR: 1 },
    pv: 16, pm: 5, ar: { totale: 1, magica: 0 }, difese: 12, iniziativa: 0,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 9, riflessi: 13, volonta: 8, magia: 9 },
    attacchi: [
      { nome: 'Artigli', tipo: 'ravvicinato', va: 12, danno: '1d6+1', natura: 'Naturale', portata_q: 1, ac: 1 },
      { nome: 'Morso', tipo: 'ravvicinato', va: 11, danno: '1d4+2', natura: 'Naturale', portata_q: 1, ac: 1 },
    ],
    abilita: [{ nome: 'Atletica', va: 12 }, { nome: 'Corpo a corpo', va: 11 }, { nome: 'Furtività', va: 11 }, { nome: 'Percezione', va: 10 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      { nome: 'Salto alare', effetto: '1 AzM per un salto con distanza orizzontale fino a 8 Q e apice fino a 4 Q sopra il punto di partenza, su percorso libero. Nessuna Prova in condizioni ordinarie, Atletica se l’appoggio è difficile. Sostituisce il movimento terrestre del Round; l’attacco dopo l’atterraggio costa la propria AzP.', azioni: { movimento: 1 } },
    ],
    note: 'Salti assistiti, senza volo stazionario o continuativo. Può Schivare ed Elusione; nessuna Parata naturale.',
  },
  {
    id: 'covata-corazzato', nome: 'Corazzato',
    caratteristiche: { FOR: 8, DES: 4, COS: 8, INT: 2, SAG: 5, CAR: 1 },
    pv: 40, pm: 6, ar: { totale: 5, magica: 0 }, difese: 8, iniziativa: -4,
    movimento: { passo: 5, corsa: 10, scatto: 15 }, // spazio 1 × 2 Q: A.167
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 14, riflessi: 8, volonta: 9, magia: 10 },
    attacchi: [
      { nome: 'Rostro', tipo: 'ravvicinato', va: 12, danno: '1d10+2', natura: 'Naturale', portata_q: 1, ac: 1 },
      { nome: 'Morso', tipo: 'ravvicinato', va: 10, danno: '1d6+2', natura: 'Naturale', portata_q: 1, ac: 1 },
    ],
    abilita: [{ nome: 'Atletica', va: 14 }, { nome: 'Corpo a corpo', va: 12 }, { nome: 'Percezione', va: 9 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      { nome: 'Sfondamento', effetto: 'Il Rostro infligge +4 danni contro porte, barricate e strutture immobili (totale 1d10+6 prima di Difese e AR); si risolvono AR e Integrità del bersaglio. Non ignora la corazza dei veicoli né abbatte muri senza scheda. Il +4 si aggiunge dopo l’eventuale moltiplicatore della Carica.' },
      { nome: 'Carica', effetto: 'Carica ordinaria con il Rostro (requisiti, costi, penalità e moltiplicatori del §5.6); nessun secondo impatto gratuito.' },
    ],
    note: 'Spazio sulla mappa 1 × 2 Q (dal manuale): l’app usa pedine quadrate, ingombro non rappresentabile (A.167). Può Schivare ed Elusione; nessuna Parata naturale.',
  },
  {
    id: 'covata-tagliente', nome: 'Tagliente',
    caratteristiche: { FOR: 7, DES: 8, COS: 7, INT: 3, SAG: 6, CAR: 2 },
    pv: 38, pm: 8, ar: { totale: 3, magica: 0 }, difese: 13, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 },
    salvezze: { tempra: 12, riflessi: 13, volonta: 10, magia: 11 },
    attacchi: [
      { nome: 'Lama naturale', tipo: 'ravvicinato', va: 14, danno: '1d8+2', natura: 'Naturale', portata_q: 1, ac: 1 },
    ],
    abilita: [{ nome: 'Atletica', va: 13 }, { nome: 'Corpo a corpo', va: 14 }, { nome: 'Furtività', va: 11 }, { nome: 'Percezione', va: 12 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      { nome: 'Due arti a lama', effetto: 'Due attacchi separati spendendo entrambe le AzP, oppure conservarne una per la Difesa. Un attacco normale usa una sola lama, AC 1; nessun attacco gratuito per la seconda lama.' },
      { nome: 'Parata naturale', effetto: 'Con una lama integra para attacchi ravvicinati: 1 AzP, Difese 13; successo dimezza per eccesso prima dell’AR, Magistrale annulla. Non para a distanza.', azioni: { principali: 1 } },
      { nome: 'Protezione della comandante', effetto: 'Una volta per Round, prima del tiro di un attacco diretto contro la comandante adiacente, spende 1 AzP per interporsi (cosciente, consapevole, con percorso libero di al massimo 1 Q verso una posizione che intercetti l’attacco): percorre il tratto, diventa il bersaglio e paga a parte l’eventuale Difesa. Non contro Aree o attacchi psichici diretti.', azioni: { principali: 1 }, usi: { quanti: 1, per: 'Round' } },
    ],
    note: 'Può usare Schivata ed Elusione ordinarie.',
  },
  {
    id: 'covata-regina-comandante', nome: 'Regina Comandante', taglia: 'grande',
    caratteristiche: { FOR: 9, DES: 6, COS: 9, INT: 6, SAG: 7, CAR: 6 },
    pv: 70, pm: 18, ar: { totale: 4, magica: 0 }, difese: 11, iniziativa: 2,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, // spazio 2 × 3 Q: A.167
    azioni: { principali: 3, movimento: 1 },
    salvezze: { tempra: 14, riflessi: 10, volonta: 13, magia: 13 },
    attacchi: [
      { nome: 'Morso', tipo: 'ravvicinato', va: 14, danno: '2d6+2', natura: 'Naturale', portata_q: 1, ac: 1 },
      { nome: 'Artigli', tipo: 'ravvicinato', va: 13, danno: '1d8+3', natura: 'Naturale', portata_q: 1, ac: 1 },
      { nome: 'Coda', tipo: 'ravvicinato', va: 12, danno: '1d8+2', natura: 'Naturale', portata_q: 2, ac: 1 },
    ],
    abilita: [{ nome: 'Atletica', va: 14 }, { nome: 'Corpo a corpo', va: 14 }, { nome: 'Percezione', va: 13 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      { nome: 'Comando telepatico', effetto: 'Raggio 6 km, senza costo in PM: alla propria Iniziativa comunica gratis un ordine semplice alle unità della colonia (proteggere, raggiungere un punto, attaccare un bersaglio identificato, ripiegare), senza linea di vista, attraverso ostacoli ordinari. Con 1 AzP assegna ordini diversi a un massimo di tre gruppi. I destinatari agiscono alla propria Iniziativa con le Azioni rimaste.', costo: 'gratis (1 AzP per ordini a tre gruppi)' },
      { nome: 'Onda psichica', effetto: 'Capacità innata: fino a 3 nemici visibili e dotati di mente entro 6 Q; 1d4+2 psichico diretto per bersaglio (un unico tiro condiviso) che ignora AR e PV temporanei, come Dardo Psichico. PS Volontà senza modificatore: successo dimezza per eccesso ed evita il disturbo; fallimento subisce danno pieno e −2 VA alla prossima Prova di Abilità entro fine del Round successivo. Niente Parata, Schivata o Elusione; nessuna Prova di Potere. Il freddo la impedisce (è un attacco). A 0 PM sviene dopo la risoluzione.', costo: '1 AzP e 4 PM', azioni: { principali: 1 }, prova: 'PS Volontà (dei bersagli)', risorsa: '4 PM', usi: { quanti: 1, per: 'Round' } },
    ],
    note: 'Massa paragonabile a un veicolo per Sbalzante (taglia Grande, A.95). Con un arto anteriore integro para solo in Ravvicinato (1 AzP, Difese 11). Spazio sulla mappa 2 × 3 Q (dal manuale): pedine quadrate nell’app (A.167).',
  },
  {
    id: 'covata-regina-incubatrice', nome: 'Regina Incubatrice', taglia: 'grande',
    caratteristiche: { FOR: 8, DES: 2, COS: 10, INT: 4, SAG: 6, CAR: 3 },
    pv: 100, pm: 12, ar: { totale: 3, magica: 0 }, difese: 6, iniziativa: -4,
    movimento: { passo: 1, corsa: 'non_consentito', scatto: 'non_consentito' }, // spazio 3 × 5 Q: A.167
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 15, riflessi: 6, volonta: 11, magia: 11 },
    attacchi: [],
    abilita: [{ nome: 'Percezione', va: 10 }],
    gs_px: { gs: '—', px: 0, per_pg: 4 },
    capacita: [
      { nome: 'Incubazione', effetto: 'Genera le caste col normale ciclo riproduttivo: durante uno scontro non produce combattenti adulti, non richiama rinforzi gratuiti e non trasforma istantaneamente gli esemplari presenti.' },
      { nome: 'Collegamento della camera', effetto: 'Mentre è cosciente riceve informazioni dalle regine della colonia connesse al nido, senza Azioni o PM. Non è comando tattico né percezione remota degli intrusi.', costo: 'gratis' },
    ],
    note: 'Casta non combattente: nessun attacco, Parata naturale o Attacco di Opportunità. Massa paragonabile a un veicolo per Sbalzante (taglia Grande). Il Passo serve a piccoli riposizionamenti nella camera. Spazio sulla mappa 3 × 5 Q (dal manuale): pedine quadrate nell’app (A.167).',
  },
  {
    id: 'covata-regina-madre', nome: 'Regina Madre', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 1, COS: 10, INT: 7, SAG: 8, CAR: 8 },
    pv: 150, pm: 24, ar: { totale: 4, magica: 0 }, difese: 5, iniziativa: -2,
    movimento: { passo: 1, corsa: 'non_consentito', scatto: 'non_consentito' }, // spazio 3 × 10 Q: A.167
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 16, riflessi: 5, volonta: 15, magia: 14 },
    attacchi: [],
    abilita: [{ nome: 'Percezione', va: 12 }],
    gs_px: { gs: '—', px: 0, per_pg: 4 },
    capacita: [
      { nome: 'Generazione delle regine', effetto: 'Produce regine incubatrici e comandanti; con popolazione eccessiva genera una nuova Regina Madre che parte a fondare un’altra colonia (profilo distinto per il viaggio).' },
      { nome: 'Governo della colonia', effetto: 'Stabilisce priorità di crescita, nutrimento e difesa; comunica con le altre regine del complesso senza Azioni o PM. Le comandanti traducono le direttive; la madre non concede Azioni aggiuntive a distanza.', costo: 'gratis' },
    ],
    note: 'Casta non combattente: nessun attacco, Parata naturale o Attacco di Opportunità; nessuna Onda psichica offensiva. Massa paragonabile a un veicolo per Sbalzante (taglia Grande). La sua morte non uccide gli altri membri. Spazio sulla mappa 3 × 10 Q (dal manuale): pedine quadrate nell’app (A.167).',
  },
  {
    id: 'lorath', nome: 'Lorath',
    caratteristiche: { FOR: 7, DES: 5, COS: 7, INT: 2, SAG: 5, CAR: 1 },
    pv: 32, pm: 5, ar: { totale: 3, magica: 0 }, difese: 9, iniziativa: -3,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '2 × 2 Q',
    azioni: { principali: 1, movimento: 1 },
    salvezze: { tempra: 12, riflessi: 9, volonta: 7, magia: 10 },
    attacchi: [
      { nome: 'Chela', tipo: 'ravvicinato', va: 12, danno: '1d8+2', natura: 'Naturale', portata_q: 1, ac: 1 },
      { nome: 'Getto acido', tipo: 'distanza', va: 11, danno: '1d6+2', natura: 'Naturale', proprieta: ['Corrosivo'], gittata_q: 6, modalita: ['S'], ac: 1 },
    ],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Furtività', va: 8 }, { nome: 'Percezione', va: 11 }],
    capacita: [
      { nome: 'Getto acido', effetto: 'Attacco a un solo bersaglio visibile, senza area; niente raffiche, Tiro Rapido o bonus del Tiro Ravvicinato. Non ripetibile nel Round immediatamente successivo. Dopo danno residuo e Contromisure si applica Corrosivo (§5.24); non infligge Avvelenato, danni periodici o perdita automatica di AR.', limiti: 'non due Round di fila' },
      { nome: 'Presa delle chele', effetto: 'Usa Immobilizzare con Corpo a corpo 12; non infligge insieme il danno della Chela e mentre mantiene la presa non usa il Getto acido. Restano Prove e liberazioni della manovra.' },
    ],
    note: 'Profilo sperimentale; potenza orientativa: Semplice (nessun GS/PX nella scheda). Aracnoide, Natura Comune; nessun incantesimo. Le chele non concedono Parata naturale. Nessuna immunità o Contromisura particolare.',
  },
];

function profilo(c) {
  const covata = c.id !== 'lorath';
  return {
    formato: 'mutant-nemico', versione: 1, id: c.id, nome: c.nome, fonte: FONTE,
    caratteristiche: c.caratteristiche,
    pv: c.pv, ...(Number.isInteger(c.pm) ? { pm: c.pm } : {}),
    ar: c.ar, difese: c.difese, iniziativa: c.iniziativa,
    movimento: c.movimento,
    ...(c.taglia ? { taglia: c.taglia } : {}),
    ...(c.spazio ? { spazio: c.spazio } : {}),
    ...(c.gs_px ? { gs_px: c.gs_px } : {}),
    salvezze: c.salvezze,
    azioni: c.azioni,
    attacchi: c.attacchi,
    abilita: c.abilita,
    ...(covata ? { contromisure: [{ nome: 'Ignifugo', valore: 6 }] } : {}),
    capacita: [...c.capacita, ...(covata ? TRATTI_COVATA : [])],
    note: covata ? `${c.note} ${NOTA_COVATA}` : c.note,
  };
}

const base = new URL('../esempi/nemici/mostri/', import.meta.url);
let scritti = 0;
for (const c of CREATURE) {
  await writeFile(new URL(`${c.id}.json`, base), `${JSON.stringify(profilo(c), null, 2)}\n`);
  scritti += 1;
}
console.log(`${scritti} profili della Covata e del Lorath scritti in esempi/nemici/mostri/`);

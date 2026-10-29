// Dragomedusa giovane e adulto, dal Manuale dei Mostri v0.46 (Word del 27/10/2026), §7.12 «Predatore energetico delle nubi
// di Iris». Risponde alla A.194: giovane GS Mito 200 PX, adulto GS Semidio 400 PX, per un esemplare senza dotazione e
// quattro PG; valori secondari del giovane completi; assorbimento dai banchi Rosso, Blu (1/2 UEB) e Verde (3/5 UEV).
// Scrive esempi/nemici/mostri/dragomedusa-giovane.json e dragomedusa-adulto.json nel formato di data/formato_nemici.json.
//
// Valori trascritti dalle tabelle del manuale; niente valori inventati. L'Iniziativa del manuale è «1d10 + 2 naturale»:
// qui 2 (il bonus; il d10 lo aggiunge la plancia). Il Volo è in Q Tattici per Round nel manuale (12 / 24 / 36 giovane,
// 14 / 28 / 42 adulto): il campo `volo` è il Passo in volo in Q Base (1 Q Tattico = 10 Q Base). Il danno «NdM × 5» ha un
// moltiplicatore che l'app non tira da sola: la plancia lo mostra com'è scritto.
//
// Uso: node tools/genera_mostri_dragomedusa.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.46 (Word del 27/10/2026), §7.12 «Dragomedusa giovane e adulto» — Fauna di Iris';

const ASSORBIMENTO = (g) => `Dopo un aggancio riuscito, 1 AzP alla propria Iniziativa, al massimo una volta per Round; contatto continuo e una fonte realmente raggiunta. Ogni azione sceglie UNA SOLA fonte, le quantità sono alternative e non si sommano; il prelievo è limitato alla carica disponibile. Un banco Rosso: fino a ${g.uer} UER. Un banco Blu: fino a ${g.ueb} UEB. Un banco Verde: fino a ${g.uev} UEV. Una batteria mistica: fino a ${g.pm} PM. Un prelievo tecnologico completo (l'intera quantità dello stadio e del colore scelto) recupera ${g.pm} PM personali; uno parziale nutre senza recuperare PM. Da una batteria mistica recupera soltanto i PM effettivamente sottratti. Il recupero è una capacità biologica, non una conversione utilizzabile da personaggi o dispositivi: UER, UEB, UEV e PM restano riserve distinte. Il prelievo non distrugge il banco, non infligge danni strutturali e non genera esplosioni. Il circuito raggiunto va dichiarato; non drena PM personali dagli esseri viventi.`;

const COMUNI = (g) => [
  { nome: 'Azioni e Difese', effetto: 'Le tre AzP e l’unica AzM valgono per tutto il Round e non si rinnovano alla propria Iniziativa: può conservarle per difendersi. Nessuna Parata naturale; Schivata costa 1 AzP e 1 AzM. Più filamenti non concedono Azioni aggiuntive. Cattura e Assorbimento si attivano solo alla propria Iniziativa, una volta ciascuno per Round.' },
  {
    nome: 'Cattura con filamenti',
    effetto: `1 AzP alla propria Iniziativa, una volta per Round, con filamenti liberi e bersaglio raggiungibile. Portata dal bordo del corpo ${g.portataCattura}. Corpo a corpo di Cattura ${g.cattura} contrapposto a Pilotare del conducente (MAN, andatura e modificatori) o, per una creatura, a Immobilizzare: la vittima oppone Corpo a corpo o Atletica. Una sola preda mantenuta per esemplare. Nessun danno. Il veicolo continua a muoversi e può sparare rispettando i settori; i filamenti non attraversano solidi e non sollevano automaticamente veicoli. Distacco del pilota: AzM di conduzione + 1 AzP e 1 UER, Pilotare −2, contrapposto a Corpo a corpo ${g.cattura}. Rilascio gratuito alla propria Iniziativa; Svenuto, morte o perdita funzionale dei filamenti sciolgono la presa. Sostegno di una creatura: ${g.sostegno}.`,
    azioni: { principali: 1 },
  },
  { nome: 'Assorbimento', effetto: ASSORBIMENTO(g), azioni: { principali: 1 } },
  {
    nome: 'Soffio di Fulmine',
    effetto: `2 AzP e ${g.pmSoffio} PM, pagati prima della risoluzione. Magico, Elettricità, ${g.soffio} Magici, linea ${g.areaSoffio} dalle fauci, anche in verticale; il danno resta costante lungo la linea. Capacità innata senza Potere, Focus, Gesto, Invocazione o Concentrazione; una emissione nel Round; se usato nel Round R torna disponibile in R + 3. Non si usa come Opportunità e non drena energia. Contro creature: Elusione gratuita con Riflessi 0, quando possibile, dimezza per eccesso prima di resistenze e AR; nessun tiro per colpire, Magistrale o seconda Difesa. Contro veicoli: una sola applicazione, localizzazione, scudo pertinente, AR, 1 PI ogni 5 danni residui o frazione, una PS Integrità e Corazzato.`,
    azioni: { principali: 2 },
  },
  { nome: 'Fluttuazione e sopravvivenza', effetto: `Fluttuazione corporea innata, senza costo in Azioni o PM, anche nel sonno finché è vivo; l’incoscienza impedisce movimento attivo, attacchi e prese; morte o perdita del sostegno provocano Caduta. Sopravvive al vuoto e alla mancanza d’aria. Le normali tempeste chromatiche del proprio habitat non lo danneggiano. Contro Elettricità dimezza per eccesso dopo Difese o Salvezze e prima dell’AR; Isolante ${g.isolante}. Un minuto di nutrimento in una tempesta chromatica ordinaria recupera ${g.pm} PM, senza cure a PV o Ferite.` },
  { nome: 'Percezione chromatica', effetto: `Entro ${g.percezione} Q Base avverte fonti al Chroma alimentate e non schermate; distinguere sorgenti e interferenze richiede Percezione ${g.percChrom}. Per agganciarsi serve una localizzazione concreta.` },
  { nome: 'Dimensioni e scale', effetto: g.dimensioni },
];

const CREATURE = [
  {
    id: 'dragomedusa-giovane', nome: 'Dragomedusa giovane',
    caratteristiche: { FOR: 8, DES: 8, COS: 9, INT: 3, SAG: 7, CAR: 4 },
    pv: 900, pm: 80, ar: { totale: 18, magica: 4 }, difese: 12, iniziativa: 2,
    movimento: { passo: 4, corsa: 8, scatto: 12, volo: 120 },
    gs_px: { gs: 'Mito', px: 200, per_pg: 4 },
    salvezze: { tempra: 14, riflessi: 13, volonta: 10, magia: 12 },
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 8 }, { nome: 'Sopravvivenza', va: 11 }],
    attacchi: [
      { nome: 'Artigli', tipo: 'ravvicinato', va: 14, danno: '4d10×5', natura: 'Naturale', portata_q: 1, ac: 1, proprieta: ['Taglio'] },
      { nome: 'Morso', tipo: 'ravvicinato', va: 14, danno: '6d10×5', natura: 'Naturale', portata_q: 2, ac: 1, proprieta: ['Perforazione'] },
    ],
    contromisure: [{ nome: 'Isolante', valore: 6 }],
    g: { uer: 15, ueb: 1, uev: 3, pm: 3, pmSoffio: 12, soffio: '8d10 × 5', areaSoffio: '12 × 1 Q Tattici (180 × 15 m)', portataCattura: '2 Q Tattici (30 m)', cattura: 'VA 16', sostegno: 'fino a 2 × 2 Q Base e 500 kg; vola soltanto al proprio Passo', isolante: 6, percezione: 80, percChrom: 13,
      dimensioni: 'Lunghezza indicativa 8–10 m; pedina rappresentativa 1 × 1 Q Tattici (convenzionale: nei passaggi stretti contano le dimensioni effettive e lo spazio dei filamenti). Volo 12 / 24 / 36 Q Tattici per Round (Passo in volo 120 Q Base). Terra 4 / 8 / 12 Q Base.' },
    note: 'Predatore energetico delle nubi di Iris, potenziato rispetto ai draghi di riferimento: predano veicoli aerei e spaziali leggeri e medi, possono mettere in difficoltà mezzi medi e pesanti modificati; le navi pesanti e da guerra richiedono normalmente più esemplari. Natura Comune, nessun incantesimo appreso, nessuna comprensione dei linguaggi; non appartiene alla Covata. Artigli: portata 1 Q Base; Morso: 2 Q Base; un attacco di ciascun tipo al massimo per Round. Il danno «NdM × 5» è il risultato dei dadi moltiplicato per 5. GS e PX per quattro PG, per un singolo esemplare senza dotazione; i valori restano da verificare al tavolo (Mostri 0.46 §7.12; A.194). Riferimento di pericolosità: preda facilmente sopraffatta un veicolo leggero; predatore favorito contro un medio ordinario; pericoloso soprattutto dopo l’aggancio contro la Neverlost.',
  },
  {
    id: 'dragomedusa-adulto', nome: 'Dragomedusa adulto',
    caratteristiche: { FOR: 10, DES: 8, COS: 10, INT: 3, SAG: 8, CAR: 5 },
    pv: 1600, pm: 120, ar: { totale: 24, magica: 6 }, difese: 13, iniziativa: 2,
    movimento: { passo: 4, corsa: 8, scatto: 12, volo: 140 },
    gs_px: { gs: 'Semidio', px: 400, per_pg: 4 },
    salvezze: { tempra: 16, riflessi: 14, volonta: 11, magia: 13 },
    abilita: [{ nome: 'Corpo a corpo', va: 16 }, { nome: 'Atletica', va: 16 }, { nome: 'Percezione', va: 15 }, { nome: 'Furtività', va: 6 }, { nome: 'Sopravvivenza', va: 12 }],
    attacchi: [
      { nome: 'Artigli', tipo: 'ravvicinato', va: 16, danno: '6d10×5', natura: 'Naturale', portata_q: 2, ac: 1, proprieta: ['Taglio'] },
      { nome: 'Morso', tipo: 'ravvicinato', va: 16, danno: '8d10×5', natura: 'Naturale', portata_q: 3, ac: 1, proprieta: ['Perforazione'] },
    ],
    contromisure: [{ nome: 'Isolante', valore: 8 }],
    g: { uer: 25, ueb: 2, uev: 5, pm: 5, pmSoffio: 20, soffio: '12d10 × 5', areaSoffio: '18 × 2 Q Tattici (270 × 30 m)', portataCattura: '4 Q Tattici (60 m)', cattura: 'VA 18', sostegno: 'fino a 3 × 3 Q Base e 1.000 kg; vola al proprio Passo, limite specifico di Passo 24 Q Base, senza Corsa o Scatto', isolante: 8, percezione: 120, percChrom: 15,
      dimensioni: 'Lunghezza indicativa 15–20 m; pedina rappresentativa 2 × 1 Q Tattici (convenzionale); conserva l’ingombro corporeo personale di 14 × 10 Q Base. Nei passaggi stretti contano le dimensioni effettive e lo spazio dei filamenti. Volo 14 / 28 / 42 Q Tattici per Round (Passo in volo 140 Q Base). Terra 4 / 8 / 12 Q Base.' },
    note: 'Predatore energetico delle nubi di Iris, potenziato rispetto ai draghi di riferimento: predano veicoli aerei e spaziali leggeri e medi, possono mettere in difficoltà mezzi medi e pesanti modificati; le navi pesanti e da guerra richiedono normalmente più esemplari. Natura Comune, nessun incantesimo appreso, nessuna comprensione dei linguaggi; non appartiene alla Covata. Artigli: portata 2 Q Base; Morso: 3 Q Base; un attacco di ciascun tipo al massimo per Round. Il danno «NdM × 5» è il risultato dei dadi moltiplicato per 5. GS e PX per quattro PG, per un singolo esemplare senza dotazione; i valori restano da verificare al tavolo (Mostri 0.46 §7.12; A.194). Riferimento di pericolosità: preda facilmente sopraffatta un veicolo leggero; nettamente favorito contro un medio ordinario; pericoloso soprattutto dopo l’aggancio contro la Neverlost. Un adulto che preleva 25 UER dal banco Rosso della Neverlost recupera 5 PM propri; il banco da 100 UER si esaurisce in quattro prelievi dell’adulto o sette del giovane.',
  },
];

function profilo(c) {
  return {
    formato: 'mutant-nemico', versione: 1, id: c.id, nome: c.nome, fonte: FONTE,
    caratteristiche: c.caratteristiche,
    pv: c.pv, pm: c.pm, ar: c.ar, difese: c.difese, iniziativa: c.iniziativa,
    movimento: c.movimento,
    taglia: 'grande',
    gs_px: c.gs_px,
    salvezze: c.salvezze,
    azioni: { principali: 3, movimento: 1 },
    attacchi: c.attacchi,
    abilita: c.abilita,
    contromisure: c.contromisure,
    capacita: COMUNI(c.g),
    note: c.note,
  };
}

const base = new URL('../esempi/nemici/mostri/', import.meta.url);
for (const c of CREATURE) await writeFile(new URL(`${c.id}.json`, base), `${JSON.stringify(profilo(c), null, 2)}\n`);
console.log(`${CREATURE.length} profili del Dragomedusa scritti in esempi/nemici/mostri/`);

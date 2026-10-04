// Effetti delle Tecniche Interiori in forma utilizzabile (Giocatore §8.9; prompt 2 di
// docs/ricognizione-tecniche-interiori.md). Scrive `effetti` in ogni scheda di data/tecniche_interiori.json:
// - valori: lo schema degli effetti di oggetti e Talenti (docs/effetti-oggetti.md), applicato al tavolo
//   finché la Tecnica è in corso (src/tecniche.js → effettiTecniche, src/condizioni.js). Tipi in più:
//   «senso» (senso, raggio_q), «movimento_moltiplicatore» (valore), «movimento_zero»;
// - attacco: quello che «Attacca!» legge (src/attacco.js → tecnicheAttacco): mezzi ammessi, natura del
//   danno, righe dopo l'Armatura, VA per alcune Manovre, Carica, il profilo di Onda Interiore;
// - cura: le opzioni di Imposizione della Mano Curativa, nell'ordine di opzioni_costo;
// - promemoria: frasi della scheda per le regole che non sono un numero;
// - breve: il numero principale in forma breve (SS, foglio 5); null se la Tecnica non ha numeri;
// - ar: true se l'AR passa da regole.json → ar.tecniche (Aura di Resistenza, Pelle di Rinoceronte, A.48).
// Le frasi (condizione, frasi, promemoria, testo) sono copiate dalla scheda: le controlla
// tools/verifica_frasi.mjs. Quello che il testo non quantifica porta un TODO(Davide).
//   node tools/effetti_tecniche.mjs           → controlla e scrive
//   node tools/effetti_tecniche.mjs --controlla → solo il confronto
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../data/tecniche_interiori.json', import.meta.url);
const ARMI_COBRA = ['Coltello', 'Pugnale', 'Daga', 'Pugnale da Combattimento', 'Spada leggera', 'Randello', 'Tonfa', 'Artigli'];
const F = 'Giocatore §8.9';

export const EFFETTI = {
  'meditazione-profonda': {
    promemoria: ['Durante la trance, ogni ora completa recupera 3 PV, 2 PM e 1 punto di recupero dell’Affaticamento.'],
    breve: '3 PV, 2 PM, 1 rec. Aff. per ora',
  },
  'imposizione-della-mano-curativa': {
    cura: [
      { effetto: 'sospendi_sanguinamento', round: 10 },
      { effetto: 'arresta_sanguinamento' },
      { effetto: 'pv', dado: '1d4', caratteristica: 'SAG', minimo: 0 },
      { effetto: 'ferita', gradini: 1 },
    ],
    frasi: [
      'Il recupero non supera i PV massimi e non avviene durante Sanguinamento attivo.',
      'Curare una Ferita non elimina Menomazioni e non ricostruisce parti mancanti.',
    ],
    breve: 'Sanguinamento; 1d4 + SAG PV; Ferita −1',
  },
  'purificazione-del-corpo': {
    valori: [{ tipo: 'salvezza', salvezza: 'tempra', valore: 5, ambito: 'uso_specifico', uso: 'ripetere la PS contro una sostanza già presente',
      condizione: 'Il bersaglio ripete immediatamente la PS Tempra contro una singola sostanza nociva già presente nell’organismo, con +5 VA e i modificatori dell’esposizione originale.' }],
    breve: '+5 PS Tempra (sostanza)',
  },
  'volonta-adamantina': {
    promemoria: ['Trasforma quel fallimento in un successo.'],
    breve: null,
  },
  'visione-del-vero': {
    valori: [{ abilita: 'Percezione', valore: 5, ambito: 'uso_specifico', uso: 'camuffamenti, illusioni e alterazioni dell’Oscura Simmetria',
      condizione: 'Concede +5 VA a Percezione per distinguere camuffamenti visivi, illusioni, immagini artificiali e alterazioni osservabili direttamente prodotte dall’Oscura Simmetria.' }],
    breve: '+5 Percezione (illusioni)',
  },
  'pelle-camaleontica': {
    valori: [{ abilita: 'Furtività', valore: 5, ambito: 'uso_specifico', uso: 'mimetizzarsi',
      condizione: 'L’attivazione comprende una prova di Furtività con +5 VA per mimetizzarsi.' }],
    promemoria: ['Attaccare, usare capacità chiaramente percepibili, correre, scattare, superare tale distanza o alterare evidentemente l’ambiente interrompe l’occultamento.'],
    breve: '+5 Furtività (mimetismo)',
  },
  'vista-felina': {
    valori: [{ tipo: 'senso', senso: 'Vista nell’oscurità', raggio_q: 20, ambito: 'generale',
      condizione: 'Ignora le penalità visive della penombra e vede nell’oscurità naturale entro 20 Q, ignorando le penalità alle prove e agli attacchi causate esclusivamente dalla mancanza di luce entro tale distanza.' }],
    breve: 'vista al buio 20 Q',
  },
  'eco-del-pipistrello': {
    valori: [
      { tipo: 'senso', senso: 'Ecolocazione', raggio_q: 12, ambito: 'generale',
        condizione: 'Individua superfici e ostacoli senza la vista; contro soggetti nascosti usa Percezione uditiva +5 VA secondo le normali regole d’individuazione.' },
      { abilita: 'Percezione', valore: 5, ambito: 'uso_specifico', uso: 'udito contro soggetti nascosti',
        condizione: 'Individua superfici e ostacoli senza la vista; contro soggetti nascosti usa Percezione uditiva +5 VA secondo le normali regole d’individuazione.' },
    ],
    breve: 'eco 12 Q; +5 Percezione (udito)',
  },
  'passo-della-mangusta': {
    promemoria: ['Applica −3 VA all’attacco già tirato, senza ritirare il dado.'],
    breve: '−3 all’attacco subito',
  },
  'aura-di-resistenza': { ar: true, breve: '+1 AR magica' },
  'salto-della-tigre': {
    promemoria: ['Si trasferisce in un Q libero visibile, fisicamente accessibile e con una superficie capace di sostenerlo.'],
    breve: 'trasferimento 6 Q',
  },
  'colpo-interiore': {
    attacco: { mezzi: ['senz_armi', 'ravvicinate'], natura: 'Etereo',
      frasi: ['Il primo Colpo Singolo riuscito entro questa finestra, senz’armi o con arma ravvicinata, infligge il normale danno trasformato in Etereo.'] },
    breve: 'danno Etereo',
  },
  'colpo-del-cobra': {
    attacco: { mezzi: ['senz_armi'], armi: ARMI_COBRA,
      dopo_armatura: [
        { etichetta: 'Cobra paralizzante: PS Tempra', testo: 'Se rimane almeno 1 danno dopo AR, il bersaglio effettua PS Tempra senza una penalità propria della Tecnica.' },
        { etichetta: 'Cobra distruttivo: +1d4', testo: 'Se rimane almeno 1 danno, aggiunge 1d4 al residuo nella stessa applicazione.' },
      ],
      frasi: ['Sceglie una delle due modalità prima della Prova per colpire.'] },
    breve: 'Stordito o +1d4 dopo AR',
  },
  'sguardo-del-corvo': {
    promemoria: ['Con Fallimento è Stordito per 1+1d3 Round.'],
    breve: 'PS Volontà o Stordito 1+1d3 R',
  },
  'pelle-di-rinoceronte': {
    ar: true,
    valori: [
      { tipo: 'danno', attacchi: 'ravvicinati', valore: 2, ambito: 'generale',
        condizione: 'Concede +1 AR non magica contro attacchi Ravvicinati Naturali o Magici, +3 alle prove di FOR, +3 ad Atletica e alle prove di Corpo a Corpo nelle manovre in cui si impiega direttamente la forza fisica, e +2 al danno Ravvicinato.' },
      { tipo: 'caratteristica', caratteristiche: ['FOR'], valore: 3, ambito: 'uso_specifico', uso: 'prove di FOR',
        condizione: 'Concede +1 AR non magica contro attacchi Ravvicinati Naturali o Magici, +3 alle prove di FOR, +3 ad Atletica e alle prove di Corpo a Corpo nelle manovre in cui si impiega direttamente la forza fisica, e +2 al danno Ravvicinato.' },
      // E&L A.81 (03/10/2026): Atletica solo per uno sforzo di forza (sollevare, spingere, trascinare, forzare) e per
      // Immobilizzare e Sbilanciare (afferrare, resistere, mantenere la presa, liberarsi; opposizione a Sbilanciare)
      { abilita: 'Atletica', valore: 3, ambito: 'uso_specifico', uso: 'Sforzo di forza',
        condizione: 'Concede +1 AR non magica contro attacchi Ravvicinati Naturali o Magici, +3 alle prove di FOR, +3 ad Atletica e alle prove di Corpo a Corpo nelle manovre in cui si impiega direttamente la forza fisica, e +2 al danno Ravvicinato.' },
      { abilita: 'Atletica', valore: 3, ambito: 'uso_specifico', uso: 'Immobilizzare e Sbilanciare',
        condizione: 'Concede +1 AR non magica contro attacchi Ravvicinati Naturali o Magici, +3 alle prove di FOR, +3 ad Atletica e alle prove di Corpo a Corpo nelle manovre in cui si impiega direttamente la forza fisica, e +2 al danno Ravvicinato.' },
      // Corpo a corpo nelle quattro Manovre di forza, comprese le Prove difensive di Disarmare e la presa
      { abilita: 'Corpo a corpo', valore: 3, ambito: 'uso_specifico', uso: 'Immobilizzare, Sbilanciare, Disarmare, Incalzare',
        condizione: 'Concede +1 AR non magica contro attacchi Ravvicinati Naturali o Magici, +3 alle prove di FOR, +3 ad Atletica e alle prove di Corpo a Corpo nelle manovre in cui si impiega direttamente la forza fisica, e +2 al danno Ravvicinato.' },
    ],
    // E&L A.81: in «Attacca!» il +3 si somma soltanto a queste Manovre con Corpo a corpo; non ad attacchi normali,
    // Stordire, Affondo, Spazzata e Colpo Mirato, né alle Difese o all'Abilità dell'arma
    attacco: { manovre_forza: { va: 3, manovre: ['immobilizzare', 'sbilanciare', 'disarmare', 'incalzare'], abilita: 'Corpo a corpo', frase: 'Il +3 alle manovre non è un bonus generale alle prove per colpire.' } },
    promemoria: ['Non aumenta FOR e non ricalcola modificatori o capacità di carico.'],
    breve: '+1 AR rav., +2 danno rav., +3 FOR',
  },
  'vipera-dal-cappuccio': {
    attacco: { mezzi: ['senz_armi'], armi: ARMI_COBRA, non_parabile: true,
      dopo_armatura: [{ etichetta: 'Sanguinamento 2', testo: 'Se infligge almeno 1 danno dopo AR applica Sanguinamento 2 secondo le sue regole, senza durata arbitraria.' }],
      frasi: ['Non può essere Parato con arma o scudo; restano la protezione passiva dello scudo, Schivata e altre difese compatibili, compreso Passo della Mangusta se disponibile.'] },
    breve: 'non parabile, Sanguinamento 2',
  },
  'passo-dell-ombra': {
    promemoria: ['Il personaggio è incorporeo soltanto mentre si muove e ritorna corporeo alla fine dello spostamento.'],
    breve: null,
  },
  'corsa-di-nomura': {
    valori: [{ tipo: 'movimento_moltiplicatore', valore: 2, ambito: 'generale',
      condizione: 'Raddoppia il movimento attuale: con valori base, Passo 12 Q, Corsa 24 Q, Scatto 36 Q.' }],
    promemoria: ['Consente di percorrere liquidi e pareti verticali e di superare aperture e superfici instabili entro il movimento disponibile; considera normale il Terreno Difficile.'],
    breve: 'Movimento ×2',
  },
  'illusione-lunare': {
    promemoria: ['In ciascun Round in cui percorre volontariamente almeno 2 Q con Passo, Corsa o Scatto, il primo attacco diretto contro di lui prima della propria Iniziativa successiva subisce −3 VA.'],
    breve: '−3 al primo attacco subito',
  },
  'mani-di-yorama': {
    valori: [
      { abilita: 'Difese', valore: 0, ambito: 'uso_specifico', uso: 'Parata a mani nude contro un attacco Ravvicinato',
        condizione: 'Effettua Difese per Parata a mani nude: senza penalità propria contro un attacco Ravvicinato, a −5 VA contro un singolo proiettile fisico di Pistola, arma da lancio, arco o balestra.' },
      { abilita: 'Difese', valore: -5, ambito: 'uso_specifico', uso: 'Parata a mani nude contro un proiettile fisico',
        condizione: 'Effettua Difese per Parata a mani nude: senza penalità propria contro un attacco Ravvicinato, a −5 VA contro un singolo proiettile fisico di Pistola, arma da lancio, arco o balestra.' },
    ],
    breve: 'Parata a mani nude; −5 proiettili',
  },
  'radici-della-montagna': {
    valori: [{ tipo: 'movimento_zero', ambito: 'generale', condizione: 'Il movimento disponibile diventa 0.' }],
    promemoria: ['Il personaggio si ancora: non può essere Sbilanciato, fatto cadere A Terra, spinto, trascinato o spostato fisicamente; è immune allo spostamento da Sbalzante e supera le prove richieste esclusivamente per mantenere la posizione.'],
    breve: 'inamovibile, Movimento 0',
  },
  'salto-della-rana': {
    attacco: { carica: { danno_dopo_moltiplicatore: 3, percorso_min_q: 3,
      frase: 'Si applicano modificatori e moltiplicatori ordinari della Carica in base alla distanza percorsa; se colpisce, aggiunge +3 danni dopo il moltiplicatore e prima dell’AR.' } },
    promemoria: ['Compie un balzo entro la propria distanza attuale al Passo, con dislivello massimo pari alla metà arrotondata per difetto: normalmente 6 Q e 3 Q.'],
    breve: 'balzo al Passo; Carica +3 danni',
  },
  'pugno-di-pietra': {
    attacco: { mezzi: ['senz_armi'],
      dopo_armatura: [{ etichetta: 'PS Integrità −2, +1 PI', testo: 'Se colpisce, impone sempre una PS Integrità con −2 al valore determinato dalla Qualità dell’oggetto.' }],
      frasi: ['Se la PS fallisce, il bersaglio perde i PI dovuti al danno residuo, 1 ogni 5 danni o frazione, più 1 PI della Tecnica e l’eventuale 1 PI aggiuntivo dell’attacco Magistrale.'] },
    breve: 'PS Integrità −2, +1 PI',
  },
  'respiro-della-terra': {
    promemoria: ['Sospende il bisogno di respirare.'],
    breve: null,
  },
  'onda-interiore': {
    attacco: {
      onda: {
        gittata_q: 6, natura: 'Magico', vettore: 'Distanza',
        // tabella della scheda (§8.9.4): dado per Disciplina, chiave = Grado minimo nella Classe Lottatore
        danno_per_disciplina: {
          potenza: { 1: '1d8', 3: '1d10', 5: '1d12' },
          rapidita: { 1: '1d4', 3: '1d6', 5: '1d8' },
          controllo: { 1: '1d4', 3: '1d6', 5: '1d8' },
          guardia: { 1: '1d6', 3: '1d8', 5: '1d10' },
        },
        // E&L A.82 (03/10/2026): bonus di SAG al danno (Risorse Interiori), con il tetto per livello del §5.13; niente FOR
        bonus_caratteristica: 'SAG',
        frasi: [
          'Entro 6 Q nessuna penalità propria di Gittata; restano copertura e altri modificatori.',
          'Vettore Distanza, danno Magico assorbito normalmente, non Etereo.',
          'Schivabile secondo le regole degli attacchi a distanza, non Parabile con un’arma ordinaria.',
          'Un singolo attacco: non estende a distanza Raffica di Colpi o Combattimento Multiplo.',
        ],
      },
    },
    breve: 'pugno a 6 Q, dado della Disciplina',
  },
  'presa-dell-anima': {
    valori: [{ abilita: 'Corpo a corpo', valore: 3, ambito: 'uso_specifico', uso: 'Immobilizzare, Sbilanciare, Disarmare o liberarsi',
      condizione: 'Concede +3 VA a una prova senz’armi per Immobilizzare, Sbilanciare, Disarmare o liberarsi da una presa/Immobilizzazione.' }],
    attacco: { mezzi: ['senz_armi'], manovre: ['immobilizzare', 'sbilanciare', 'disarmare'], va: 3 },
    promemoria: ['Il +3 riguarda soltanto la prova di attivazione, non tutte quelle successive.'],
    breve: '+3 Immobilizzare, Sbilanciare, Disarmare',
  },
  'contraccolpo-interiore': {
    promemoria: ['Consente un singolo attacco senz’armi con normale prova e normale danno, senza associarlo a una Manovra offensiva.'],
    breve: null,
  },
  'corpo-infrangibile': {
    valori: [{ tipo: 'riduzione_danno', dado: '1d4', caratteristica: 'COS', minimo: 1, ambito: 'uso_specifico', uso: 'una sola applicazione di danno Naturale o Magico',
      condizione: 'Riduce una sola applicazione di danno Naturale o Magico di 1d4 + Mod COS, riduzione minima 1; il danno non scende sotto 0.' }],
    breve: '−(1d4 + COS) danno',
  },
};

const dati = JSON.parse(readFileSync(FILE, 'utf8'));
const mancanti = dati.tecniche.filter((t) => !EFFETTI[t.id]).map((t) => t.id);
const estranei = Object.keys(EFFETTI).filter((id) => !dati.tecniche.some((t) => t.id === id));
if (mancanti.length || estranei.length) throw new Error(`Tecniche senza effetti: ${mancanti.join(', ')}; effetti senza Tecnica: ${estranei.join(', ')}`);
let cambiate = 0;
for (const t of dati.tecniche) {
  const nuovo = { fonte: F, ...EFFETTI[t.id] };
  if (JSON.stringify(t.effetti) !== JSON.stringify(nuovo)) cambiate++;
  t.effetti = nuovo;
}
console.log(`${cambiate} Tecniche da aggiornare su ${dati.tecniche.length}`);
if (!process.argv.includes('--controlla')) writeFileSync(FILE, `${JSON.stringify(dati, null, 2)}\n`);
else process.exitCode = cambiate ? 1 : 0;

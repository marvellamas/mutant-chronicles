// Lotti del Manuale dell'Equipaggiamento 0.3 (Google Doc, 28–29/09/2026): capitoli 2, 3, 4 e 6.
// Ricognizione in docs/equipaggiamento-lotti.md. Testo del Doc in docs/manuali-txt/equipaggiamento.md.
//   node tools/lotti/lotto_equipaggiamento_03.mjs --capitolo 2            prova a vuoto
//   node tools/lotti/lotto_equipaggiamento_03.mjs --capitolo 2 --scrivi   scrive il JSON (idempotente)
//
// Convenzioni (come gli altri cataloghi, docs/effetti-oggetti.md):
// - un file per capitolo: dotazioni_personali (2), esplorazione (3), comunicazione (4); il cap. 6
//   aggiorna sanitario.json, che ha già le stesse schede dal §7.19 degli Armamenti (valori uguali);
// - solo i campi che la scheda dà: un dato mancante resta assente, mai 0 (§1.11, E&L 4 e 15);
// - effetti numerici nello schema degli effetti (generale / situazionale / uso specifico), con la
//   frase del manuale in «condizione», controllata qui e da tools/verifica_frasi.mjs; il resto è
//   testo in «note_manuale» (promemoria);
// - «beneficio»: stessi benefici che non si sommano (§2.4: «Anche contro lo stesso rischio ambientale
//   vale il bonus maggiore»; §3.5: «Due filtri non sommano i bonus», come il Filtro respiratorio).
import { readFileSync, writeFileSync } from 'node:fs';
import { normalizza, testoManuali } from '../verifica_frasi.mjs';

const RADICE = new URL('../../', import.meta.url);
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const capitolo = Number(arg('--capitolo'));
const scrivi = process.argv.includes('--scrivi');
const VERSIONE = 'Equipaggiamento 0.3';
const DOC = testoManuali();
const frase = (t) => { if (!DOC.includes(normalizza(t))) throw new Error(`frase non trovata nel Doc: ${t}`); return t; };

/** Voce del catalogo Commerciale. `x`: { id, nome, famiglia, par, note, peso?, costo?, rep?, qualita?, ps?, pi?, effetti? } */
function voce(x, tipo = 'altro') {
  const o = {
    id: x.id, nome: x.nome, tipo, catalogo: 'Commerciale', famiglia: x.famiglia, nomi_alternativi: x.alt ?? [],
    note_manuale: x.note, paragrafo: x.par, versione_manuale: VERSIONE,
  };
  if (x.peso !== undefined) o.peso = x.peso;
  if (x.pi !== undefined) o.pi = x.pi;
  if (x.qualita !== undefined) o.qualita = x.qualita;
  if (x.ps !== undefined) o.ps_int = x.ps;
  if (x.rep !== undefined) o.reperibilita = x.rep;
  if (x.costo !== undefined) o.costo = x.costo;
  Object.assign(o, x.extra ?? {});
  o.proprieta = [];
  if (x.breve) o.effetto_breve = x.breve;
  if (x.effetti?.length) o.effetti = x.effetti.map((e) => ({ ...e, condizione: frase(e.condizione), fonte: `Equipaggiamento ${x.par}` }));
  return o;
}
const va = (abilita, valore, ambito, uso, condizione, extra = {}) => ({ abilita, valore, ambito, ...(uso ? { uso } : {}), condizione, ...extra });
const tempra = (valore, uso, condizione, extra = {}) => ({ tipo: 'salvezza', salvezza: 'tempra', valore, ambito: 'uso_specifico', uso, condizione, ...extra });

// ---------------------------------------------------------------------------
// Capitolo 2 — Dotazioni personali (tutte REP CO)
const CAP2 = (() => {
  const c = (id, nome, peso, costo, note, famiglia, par, altro = {}) => voce({ id, nome, peso, costo, rep: 'CO', note, famiglia, par, ...altro });
  const T = 'Contenitori e trasporto';
  const L = 'Illuminazione';
  const A = 'Abbigliamento';
  const Q = 'Oggetti quotidiani';
  const luce = ' Usa la batteria di servizio (§2.3): 24 ore effettive, ricarica in 4 ore, ricambio 10 (Commerciale, CO), sostituzione 1 AzP. Accendere o spegnere 1 AzP.';
  const abiti = ' Si conta il peso dei capi effettivamente portati. Nessuno di questi capi concede AR.';
  return {
    file: 'dotazioni_personali', descrizione: 'Dotazioni personali: contenitori, illuminazione, abbigliamento, oggetti quotidiani (Equipaggiamento 0.3, cap. 2)',
    oggetti: [
      c('zaino-da-viaggio', 'Zaino da viaggio', 1, 100, 'Trasporta la dotazione lasciando libere le mani. Il contenuto principale è riposto. Peso a vuoto: il contenuto si somma; non aumenta la capacità di carico (§2.2).', T, '§2.1'),
      c('borsa-a-tracolla', 'Borsa a tracolla', 0.5, 60, 'Le tasche esterne predisposte rendono accessibili gli oggetti; il contenuto del vano chiuso è riposto.', T, '§2.1'),
      c('cintura-attrezzata', 'Cintura attrezzata', 0.4, 50, 'Tasche e agganci mantengono accessibili piccoli oggetti.', T, '§2.1'),
      c('custodia-impermeabile', 'Custodia impermeabile', 0.2, 40, 'Protegge piccoli oggetti e documenti da pioggia e spruzzi. Non è progettata per immersioni prolungate.', T, '§2.1'),
      c('borraccia-da-un-litro', 'Borraccia da un litro', 0.2, 20, 'Contiene un litro di liquido. Piena d’acqua pesa complessivamente circa 1,2 kg: l’acqua (1 kg per litro) si conta a parte. Bere dalla borraccia alla cintura costa 1 AzP (§2.2).', T, '§2.1'),
      c('sacca-pieghevole', 'Sacca pieghevole', 0.2, 15, 'Trasporta provviste, materiali o oggetti raccolti. Occupa una mano, salvo fissarla a un supporto appropriato.', T, '§2.1'),
      c('torcia-elettrica', 'Torcia elettrica', 0.3, 100, `Fascio direzionale fino a 10 Q. Richiede una mano.${luce}`, L, '§2.3'),
      c('lampada-frontale', 'Lampada frontale', 0.2, 120, `Fascio direzionale fino a 6 Q. Indossata, lascia libere le mani.${luce}`, L, '§2.3'),
      c('lanterna-elettrica', 'Lanterna elettrica', 0.8, 200, `Illumina in tutte le direzioni entro 6 Q. Può essere trasportata, appoggiata o appesa.${luce}`, L, '§2.3'),
      c('bastoncino-luminoso', 'Bastoncino luminoso', 0.05, 10, 'Illumina in tutte le direzioni entro 2 Q per 8 ore. Monouso. Attivarlo richiede 1 AzP; una volta attivato continua a consumarsi anche se coperto o riposto.', L, '§2.3'),
      c('abiti-comuni', 'Abiti comuni', 1, 50, `Vestiario ordinario, senza modificatori. Comprende le calzature.${abiti}`, A, '§2.4'),
      c('abiti-da-viaggio', 'Abiti da viaggio', 2, 150, `+1 VA ad Atletica per arrampicarsi e mantenere l’equilibrio su terreno accidentato. Comprendono guanti e copricapo. Non migliorano attacchi, Difese, nuoto o carico; con il Corredo da assalto verticale vale il bonus maggiore (+2).${abiti}`, A, '§2.4', {
        breve: '+1 VA ad Atletica per arrampicarsi e mantenere l’equilibrio su terreno accidentato.',
        effetti: [
          va('Atletica', 1, 'uso_specifico', 'arrampicata', '+1 VA ad Atletica per arrampicarsi e mantenere l’equilibrio su terreno accidentato.'),
          va('Atletica', 1, 'uso_specifico', 'equilibrio', '+1 VA ad Atletica per arrampicarsi e mantenere l’equilibrio su terreno accidentato.'),
        ],
      }),
      c('abiti-eleganti', 'Abiti eleganti', 1.5, 300, `+1 VA a Oratoria in ambienti formali, cerimonie e incontri professionali nei quali conta la presentazione personale. Richiedono un aspetto presentabile; non conferiscono autorità o accessi riservati.${abiti}`, A, '§2.4', {
        breve: '+1 VA a Oratoria in ambienti formali, cerimonie e incontri professionali.',
        effetti: [va('Oratoria', 1, 'situazionale', null, '+1 VA a Oratoria in ambienti formali, cerimonie e incontri professionali nei quali conta la presentazione personale.')],
      }),
      c('completo-invernale', 'Completo invernale', 3, 250, `+2 alle PS di Tempra contro il freddo ambientale, comprese quelle per evitarne l’Affaticamento. Non protegge dai danni di Gelo. Con il Sacco a pelo invernale vale un solo +2.${abiti}`, A, '§2.4', {
        breve: '+2 alle PS di Tempra contro il freddo ambientale.',
        effetti: [tempra(2, 'contro il freddo ambientale', '+2 alle PS di Tempra contro il freddo ambientale, comprese quelle per evitarne l’Affaticamento.', { beneficio: 'freddo_ambientale' })],
      }),
      c('completo-per-caldo-estremo', 'Completo per caldo estremo', 1.5, 250, `+2 alle PS di Tempra contro il caldo ambientale, comprese quelle per evitarne l’Affaticamento. Non protegge da Fuoco, lava o sete e non riduce il fabbisogno d’acqua.${abiti}`, A, '§2.4', {
        breve: '+2 alle PS di Tempra contro il caldo ambientale.',
        effetti: [tempra(2, 'contro il caldo ambientale', '+2 alle PS di Tempra contro il caldo ambientale, comprese quelle per evitarne l’Affaticamento.', { beneficio: 'caldo_ambientale' })],
      }),
      c('poncho-impermeabile', 'Poncho impermeabile', 0.5, 80, `Mantiene asciutti abiti e uno zaino ordinario coperti: evita penalità e PS causate esclusivamente dal bagnarsi sotto la pioggia. Indossarlo o toglierlo 1 AzP.${abiti}`, A, '§2.4'),
      c('corredo-personale', 'Corredo personale', 0.5, 40, 'Occorrente per igiene, pulizia degli abiti e piccoli rammendi. Si rifornisce durante la manutenzione ordinaria.', Q, '§2.5'),
      c('accendino', 'Accendino', 0.05, 10, 'Accende materiale infiammabile adatto e asciutto. Si rifornisce durante la manutenzione ordinaria.', Q, '§2.5'),
      c('utensile-multiuso', 'Utensile multiuso', 0.2, 50, 'Piccole lame, pinza, cacciaviti e apriscatole per lavori semplici. Per lavori specialistici vale come strumento Improvvisato (−2 VA) solo se concretamente adeguato.', Q, '§2.5'),
    ],
  };
})();

// ---------------------------------------------------------------------------
// Capitolo 3 — Esplorazione e sopravvivenza
const CAP3 = (() => {
  const c = (id, nome, peso, costo, rep, note, famiglia, par, altro = {}) => voce({ id, nome, peso, costo, rep, note, famiglia, par, ...altro });
  const R = 'Accampamento e riposo';
  const V = 'Viveri, acqua e cucina';
  const O = 'Orientamento e arrampicata';
  const P = 'Protezioni ambientali';
  return {
    file: 'esplorazione', descrizione: 'Esplorazione e sopravvivenza: accampamento, viveri, orientamento, protezioni ambientali (Equipaggiamento 0.3, cap. 3)',
    oggetti: [
      c('tenda-da-2-persone', 'Tenda da 2 persone', 3, 300, 'CO', 'Ripara due persone e la loro dotazione da pioggia e vento ordinario. Evita penalità e PS dovute esclusivamente al bagnarsi sotto la pioggia. Comprende pali, tiranti e picchetti; montarla o smontarla richiede 5 minuti. Non protegge da tempeste estreme, allagamenti, atmosfere tossiche o attacchi.', R, '§3.1', { alt: ['Tenda da 2 posti'] }),
      c('tenda-da-4-persone', 'Tenda da 4 persone', 5, 500, 'CO', 'Stessi benefici della tenda piccola, per quattro persone e la loro dotazione. Montarla o smontarla richiede 5 minuti.', R, '§3.1'),
      c('telo-da-campo', 'Telo da campo', 1, 80, 'CO', 'Riparo dalla pioggia per due persone o copertura per materiali e provviste. Richiede sostegni o punti di fissaggio; resta aperto sui lati. Comprende cordini di fissaggio; sistemarlo richiede 2 minuti.', R, '§3.1'),
      c('sacco-a-pelo', 'Sacco a pelo', 1, 80, 'CO', 'Permette di dormire al riparo dal freddo ordinario, senza una coperta aggiuntiva.', R, '§3.1'),
      c('sacco-a-pelo-invernale', 'Sacco a pelo invernale', 2, 200, 'CO', 'Benefici del modello normale e +2 alle PS di Tempra contro il freddo ambientale mentre viene utilizzato. Con il Completo invernale vale un solo +2.', R, '§3.1', {
        breve: '+2 alle PS di Tempra contro il freddo ambientale mentre viene utilizzato.',
        effetti: [tempra(2, 'contro il freddo ambientale', 'Benefici del modello normale e +2 alle PS di Tempra contro il freddo ambientale mentre viene utilizzato.', { beneficio: 'freddo_ambientale' })],
      }),
      c('materassino-isolante', 'Materassino isolante', 0.5, 50, 'CO', 'Permette il normale recupero dell’Affaticamento su terreno duro, sassoso o umido, eliminando impedimenti al riposo dovuti soltanto alla superficie scomoda.', R, '§3.1'),
      c('razione-da-viaggio', 'Razione da viaggio', 0.5, 20, 'CO', 'Nutre una persona per un giorno. Pronta da consumare senza cottura. Riferimento: una razione e 2 litri d’acqua per persona al giorno (4 in attività intensa o caldo estremo).', V, '§3.2'),
      c('razione-concentrata', 'Razione concentrata', 0.25, 40, 'CO', 'Stesso nutrimento della razione normale, con metà del peso.', V, '§3.2'),
      c('tanica-da-10-litri', 'Tanica da 10 litri', 0.5, 40, 'CO', 'Trasporta acqua o altri liquidi. Peso indicato a vuoto: piena d’acqua pesa 10,5 kg (l’acqua si conta a parte).', V, '§3.2'),
      c('corredo-da-cucina-da-campo', 'Corredo da cucina da campo', 1, 150, 'CO', 'Fornello, recipiente e stoviglie per quattro persone. Permette di cucinare senza raccogliere legna. Prima cartuccia compresa (nel peso). Un pasto semplice richiede 15 minuti.', V, '§3.2'),
      c('cartuccia-di-combustibile', 'Cartuccia di combustibile', 0.2, 20, 'CO', '10 preparazioni, ciascuna per un massimo di quattro persone. Sostituirla richiede 1 minuto.', V, '§3.2'),
      c('depuratore-portatile', 'Depuratore portatile', 0.5, 300, 'NC', 'Tratta acqua dolce con impurità e contaminazioni biologiche ordinarie: 1 litro al minuto, mediante pompa manuale. Primo filtro compreso (100 litri). Non desalinizza e non neutralizza sostanze chimiche, veleni, radioattività o contaminazioni soprannaturali.', V, '§3.2'),
      c('filtro-di-ricambio', 'Filtro di ricambio', 0.1, 50, 'NC', 'Permette di trattare 100 litri prima della sostituzione. Sostituirlo richiede 1 minuto.', V, '§3.2'),
      c('corredo-di-orientamento', 'Corredo di orientamento', 0.3, 150, 'CO', 'Bussola, carta della zona e strumenti per annotare il percorso. +1 VA a Sopravvivenza per orientarsi con riferimenti utilizzabili. La carta riguarda la zona scelta all’acquisto; il +1 non si somma al +2 del Corredo di sopravvivenza ambientale.', O, '§3.3', {
        breve: '+1 VA a Sopravvivenza per orientarsi con riferimenti utilizzabili.',
        effetti: [va('Sopravvivenza', 1, 'uso_specifico', 'orientamento', '+1 VA a Sopravvivenza per orientarsi con riferimenti utilizzabili.')],
      }),
      c('corda-da-20-q', 'Corda da 20 Q', 2, 100, 'CO', '30 metri di corda per assicurare carichi, predisporre una linea e aiutarsi durante salite o discese. Da sola non concede bonus. Preparare una linea su un ancoraggio adatto richiede 1 minuto.', O, '§3.3'),
      c('corredo-da-assalto-verticale', 'Corredo da assalto verticale', 4, 1500, 'NC', 'Imbracatura, corda da 20 Q, discensore, moschettoni e ancoraggi. +2 VA ad Atletica per arrampicarsi o calarsi usando il corredo. Con gli Abiti da viaggio vale il bonus maggiore (+2). Non aumenta la distanza percorribile.', O, '§3.3', {
        pi: 6, qualita: 'Non comune', ps: 12,
        breve: '+2 VA ad Atletica per arrampicarsi o calarsi usando il corredo.',
        effetti: [va('Atletica', 2, 'uso_specifico', 'arrampicata', '+2 VA ad Atletica per arrampicarsi o calarsi usando il corredo.')],
      }),
      c('corredo-di-sopravvivenza-ambientale', 'Corredo di sopravvivenza ambientale', 4, 1500, 'NC', 'Attrezzatura riutilizzabile per orientamento, raccolta di risorse e riparo individuale. All’acquisto si sceglie uno dei sette ambienti (Giocatore §8.8.3). Nell’ambiente scelto concede +2 VA a Sopravvivenza; fuori vale come strumento Standard. Non concede bonus a Furtività o alle PS; acqua, viveri e medicinali sono separati. Il +2 non si somma al +1 del corredo di orientamento.', 'Sopravvivenza', '§3.4', {
        pi: 4, qualita: 'Non comune', ps: 12,
        breve: '+2 VA a Sopravvivenza nell’ambiente scelto.',
        effetti: [va('Sopravvivenza', 2, 'situazionale', null, 'Nell’ambiente scelto concede +2 VA a Sopravvivenza per orientarsi con riferimenti disponibili, reperire e raccogliere risorse utilizzabili, scegliere un luogo adatto e allestire un riparo.')],
      }),
      c('maschera-filtrante', 'Maschera filtrante', 0.5, 700, 'NC', '+2 alle PS di Tempra contro veleni e agenti patogeni inalati. Richiede aria con ossigeno sufficiente. Riprende il Filtro respiratorio 2 degli Armamenti: due filtri non sommano i bonus. Indossarla richiede 1 AzP e due mani.', P, '§3.5', {
        breve: '+2 alle PS di Tempra contro veleni e agenti patogeni inalati.',
        effetti: [tempra(2, 'contro veleni e agenti patogeni inalati', '+2 alle PS di Tempra contro veleni e agenti patogeni inalati.', { beneficio: 'filtro_respiratorio' })],
      }),
      c('respiratore-autonomo', 'Respiratore autonomo', 4, 2500, 'NC', 'Maschera ermetica e bombola: 2 ore senza utilizzare l’aria esterna. Evita soffocamento e contaminazioni dovute esclusivamente all’inalazione durante l’autonomia. Comprende la prima bombola; indossarlo e collegarlo 1 minuto, attivarlo se predisposto 1 AzP. Non adatto a immersioni o vuoto.', P, '§3.5'),
      c('bombola-di-ricambio', 'Bombola di ricambio', 2, 100, 'NC', 'Altre 2 ore di autonomia per il respiratore. Peso comprensivo della carica. Sostituirla richiede 1 minuto.', P, '§3.5'),
      c('tuta-anticontaminazione', 'Tuta anticontaminazione', 3, 1500, 'NC', 'Cappuccio, guanti e sovrastivali: +2 alle PS di Tempra contro veleni e agenti patogeni trasmessi attraverso il contatto cutaneo. Richiede una protezione respiratoria separata; non concede AR e non protegge da acidi, radiazioni, Fuoco o Gelo. Indossarla o toglierla 1 minuto.', P, '§3.5', {
        breve: '+2 alle PS di Tempra contro veleni e agenti patogeni per contatto cutaneo.',
        effetti: [tempra(2, 'contro veleni e agenti patogeni per contatto', 'Cappuccio, guanti e sovrastivali: +2 alle PS di Tempra contro veleni e agenti patogeni trasmessi attraverso il contatto cutaneo.')],
      }),
    ],
  };
})();

// ---------------------------------------------------------------------------
// Capitolo 4 — Comunicazione e rilevamento
const CAP4 = (() => {
  const c = (id, nome, peso, costo, rep, note, famiglia, par, altro = {}) => voce({ id, nome, peso, costo, rep, note, famiglia, par, ...altro });
  const C = 'Comunicatori';
  const O = 'Strumenti ottici e visori';
  const S = 'Rilevamento e sorveglianza';
  const batt = ' Batteria di servizio (§2.3): 24 ore, ricarica in 4 ore, ricambio 10, sostituzione 1 AzP.';
  const radio = ' Comunicazioni vocali fra dispositivi sullo stesso canale; bidirezionale entro la portata del dispositivo più debole. Accendere, spegnere o cambiare canale 1 AzP. Non riservate: un ricevitore sul canale può ascoltare.';
  return {
    file: 'comunicazione', descrizione: 'Comunicazione e rilevamento: comunicatori, ottiche e visori, sorveglianza (Equipaggiamento 0.3, cap. 4)',
    oggetti: [
      c('comunicatore-personale', 'Comunicatore personale', 0.1, 200, 'CO', `Portata 1 km.${radio}${batt}`, C, '§4.1'),
      c('comunicatore-da-squadra', 'Comunicatore da squadra', 0.3, 1000, 'NC', `Portata 10 km, costruzione adatta all’impiego sul campo.${radio}${batt}`, C, '§4.1'),
      c('stazione-radio-portatile', 'Stazione radio portatile', 2, 3000, 'NC', `Portata 50 km, mantenuta solo mentre l’antenna è predisposta nella postazione (1 minuto).${radio}${batt}`, C, '§4.1'),
      c('binocolo', 'Binocolo', 0.8, 500, 'CO', '+1 VA a Percezione per osservare dettagli a distanza attraverso lo strumento. Due mani. Non concede bonus alla vigilanza generale, all’ascolto o agli attacchi; richiede luce e visuale sufficienti. Senza batterie.', O, '§4.2', {
        breve: '+1 VA a Percezione per osservare dettagli a distanza attraverso lo strumento.',
        effetti: [va('Percezione', 1, 'uso_specifico', 'dettagli a distanza', '+1 VA a Percezione per osservare dettagli a distanza attraverso lo strumento.')],
      }),
      c('monocolo-periscopico', 'Monocolo periscopico', 0.3, 200, 'CO', 'Osservazione oltre un bordo o un angolo senza esporre la testa. L’ottica deve raggiungere una posizione con visuale. Una mano. Nessun bonus numerico; la parte esposta può essere individuata o colpita. Senza batterie.', O, '§4.2'),
      c('visore-notturno', 'Visore notturno', 0.4, 2600, 'RA', `Entro 80 Q elimina le penalità per scarsa illuminazione. Richiede una minima luce ambientale; non funziona nel buio completo. Indossabile senza elmetto, mani libere; indossarlo e attivarlo 1 AzP e due mani.${batt}`, O, '§4.2'),
      c('visore-termico', 'Visore termico', 0.5, 4800, 'MR', `Entro 40 Q permette di osservare e prendere di mira bersagli distinguibili termicamente, anche nel buio naturale completo; ignora il −4 VA della Fumogena standard quando distingue il bersaglio. Non vede attraverso pareti o coperture solide.${batt}`, O, '§4.2'),
      c('registratore-audiovisivo', 'Registratore audiovisivo', 0.2, 200, 'CO', `Registra immagini e suoni per conservarli, rivederli e mostrarli ad altri. Avviare una registrazione 1 AzP.${batt}`, S, '§4.3'),
      c('kit-di-videosorveglianza', 'Kit di videosorveglianza', 1, 1200, 'NC', `Videocamera e monitor palmare per osservare e ascoltare la zona inquadrata a distanza. Collegamento entro 1 km. Sistemare la videocamera 1 minuto; chi osserva usa la propria Percezione, senza bonus.${batt}`, S, '§4.3'),
      c('kit-di-allarme-perimetrale', 'Kit di allarme perimetrale', 0.5, 500, 'NC', `Filamento da 20 Q, sensore e avvisatore portatile. Segnala quando il filo viene tirato o spezzato, trasmettendo entro 1 km. Posarlo e attivarlo 1 minuto; non identifica la causa.${batt}`, S, '§4.3'),
      c('rilevatore-ambientale', 'Rilevatore ambientale', 0.5, 1500, 'NC', `Segnala carenza d’ossigeno, gas nocivi conosciuti dal dispositivo e radiazioni nel punto in cui si trova. Una lettura 1 AzP, senza Prova. Non riconosce patogeni, sostanze sconosciute, magia o Corruzione.${batt}`, S, '§4.3'),
    ],
  };
})();

// ---------------------------------------------------------------------------
// Capitolo 6 — Equipaggiamento sanitario: le schede del §7.19 degli Armamenti sono già in
// sanitario.json con gli stessi valori; qui le voci che il cap. 6 aggiunge come acquisti a sé.
const CAP6 = (() => {
  const c = (id, nome, costo, rep, note, famiglia, par, altro = {}) => voce({ id, nome, costo, rep, note, famiglia, par, ...altro }, 'sanitario');
  return {
    file: 'sanitario', aggiorna: true,
    oggetti: [
      [c('ricarica-kit-di-pronto-soccorso-standard', 'Ricarica del kit di pronto soccorso Standard', 150, undefined, 'Cinque applicazioni miste di materiali da medicazione per il kit Standard (§6.1: «150 / 5 applicazioni»).', 'Pronto soccorso', '§6.1'), 'kit-di-pronto-soccorso-standard'],
      [c('ricarica-kit-di-pronto-soccorso-professionale', 'Ricarica del kit di pronto soccorso Professionale', 300, undefined, 'Cinque applicazioni miste di materiali da medicazione per il kit Professionale e il Kit trauma, anche nelle versioni corporative (§6.1: «300 / 5 applicazioni»).', 'Pronto soccorso', '§6.1', { alt: ['Ricarica per il Kit trauma'] }), 'kit-di-pronto-soccorso-professionale'],
      [c('contenitore-di-ricambio-spray-rimarginante', 'Contenitore di ricambio per lo Spray rimarginante', 1000, undefined, 'Cinque dosi. Sostituirlo richiede un minuto.', 'Dispositivi portatili', '§6.4'), 'spray-rimarginante'],
      [c('set-chirurgico-di-ricambio', 'Set chirurgico di ricambio', 500, undefined, 'Un set di materiali per procedura del Kit chirurgico da campo o della Postazione medica, anestesia compresa; si consuma all’inizio di ogni intervento.', 'Diagnostica e chirurgia', '§6.5'), 'kit-chirurgico-da-campo'],
      [c('confezione-da-cinque-set-chirurgici', 'Confezione da cinque set chirurgici', 2500, undefined, 'Cinque set di materiali per procedura, anestesia compresa.', 'Diagnostica e chirurgia', '§6.5'), 'set-chirurgico-di-ricambio'],
      [c('farmaco-terapeutico-specifico', 'Farmaco terapeutico specifico', 100, 'NC', 'Una monodose per 24 ore. Concede +2 alle PS di Tempra previste dalla malattia o infezione per cui è indicato, per 24 ore. Non concede nuove PS, non restituisce PV, non cura Ferite o Menomazioni e non arresta il Sanguinamento. Più dosi non sommano il bonus. Somministrazione 1 AzP e una mano; rientra nel limite di una somministrazione rapida per Round.', 'Farmaci e antidoti', '§6.6', {
        breve: '+2 alle PS di Tempra contro la malattia o l’infezione indicata, per 24 ore.',
        effetti: [tempra(2, 'contro la malattia o l’infezione indicata', 'Concede +2 alle PS di Tempra previste dalla malattia o infezione per cui è indicato, per 24 ore.')],
      }), 'postazione-medica-da-campo'],
      [c('antidoto-specifico', 'Antidoto specifico', 500, 'RA', 'Una monodose pronta all’impiego. L’antidoto adatto termina immediatamente l’avvelenamento a cui è destinato (Giocatore §5.18, Avvelenato). Non restituisce PV già persi, non elimina Ferite o Menomazioni e non protegge da una nuova esposizione. Somministrazione 1 AzP e una mano; rientra nel limite di una somministrazione rapida per Round.', 'Farmaci e antidoti', '§6.6'), 'farmaco-terapeutico-specifico'],
    ],
  };
})();

// Voci di dotazione (data/dotazioni.json → oggetti_dotazione, A.34) che trovano la scheda nel capitolo
const DOTAZIONI = {
  2: {
    'abiti-comuni': 'dotazioni_personali:abiti-comuni', 'zaino-da-viaggio': 'dotazioni_personali:zaino-da-viaggio',
    'cintura-attrezzata': 'dotazioni_personali:cintura-attrezzata', borraccia: 'dotazioni_personali:borraccia-da-un-litro',
    'torcia-elettrica': 'dotazioni_personali:torcia-elettrica', 'corredo-igiene': 'dotazioni_personali:corredo-personale',
    'utensile-multiuso': 'dotazioni_personali:utensile-multiuso', accendino: 'dotazioni_personali:accendino',
    'abiti-eleganti': 'dotazioni_personali:abiti-eleganti', 'abiti-da-viaggio': 'dotazioni_personali:abiti-da-viaggio',
    'lampada-frontale': 'dotazioni_personali:lampada-frontale', 'lanterna-elettrica': 'dotazioni_personali:lanterna-elettrica',
    // «profilo Abiti eleganti» (Giocatore §2.16.21)
    'completo-cerimoniale': 'dotazioni_personali:abiti-eleganti',
    // scheda già nel catalogo degli Armamenti (§7.13.7): si collega insieme al primo lotto
    'corredo-manutenzione-campo': 'corredi_dispositivi:corredo-di-manutenzione-da-campo',
  },
  3: {
    'sacco-a-pelo': 'esplorazione:sacco-a-pelo', 'razione-da-viaggio': 'esplorazione:razione-da-viaggio',
    'tenda-2-posti': 'esplorazione:tenda-da-2-persone', 'corredo-orientamento': 'esplorazione:corredo-di-orientamento',
    'corredo-assalto-verticale': 'esplorazione:corredo-da-assalto-verticale',
    'corredo-sopravvivenza-ambientale': 'esplorazione:corredo-di-sopravvivenza-ambientale',
    'maschera-filtrante': 'esplorazione:maschera-filtrante',
  },
  4: {
    'comunicatore-personale': 'comunicazione:comunicatore-personale', 'comunicatore-da-squadra': 'comunicazione:comunicatore-da-squadra',
    binocolo: 'comunicazione:binocolo', 'monocolo-periscopico': 'comunicazione:monocolo-periscopico',
    'registratore-audiovisivo': 'comunicazione:registratore-audiovisivo', 'kit-videosorveglianza': 'comunicazione:kit-di-videosorveglianza',
    'rilevatore-ambientale': 'comunicazione:rilevatore-ambientale',
  },
  6: { 'ricarica-kit-trauma': 'sanitario:ricarica-kit-di-pronto-soccorso-professionale' },
};

const CAPITOLI = { 2: CAP2, 3: CAP3, 4: CAP4, 6: CAP6 };
const C = CAPITOLI[capitolo];
if (!C) { console.error('uso: --capitolo 2|3|4|6 [--scrivi]'); process.exit(1); }
const percorso = new URL(`data/equipaggiamento/${C.file}.json`, RADICE);

if (C.aggiorna) {
  // cap. 6: aggiunge (o sostituisce) le voci dopo la scheda indicata, nell'ordine del manuale
  const d = JSON.parse(readFileSync(percorso, 'utf8'));
  for (const [o, dopo] of C.oggetti) {
    const i = d.oggetti.findIndex((x) => x.id === o.id);
    if (i >= 0) d.oggetti[i] = o;
    else d.oggetti.splice(d.oggetti.findIndex((x) => x.id === dopo) + 1, 0, o);
    console.log(o.id, i >= 0 ? 'aggiornato' : 'inserito');
  }
  d.fonte = 'Manuale degli Armamenti v0.50, §7.19 Equipaggiamento sanitario (pp. 109–113), lotto 11; Manuale dell’Equipaggiamento 0.3, cap. 6 (stesse schede e valori; ricariche, ricambi, farmaci e antidoti)';
  if (scrivi) writeFileSync(percorso, `${JSON.stringify(d, null, 2)}\n`);
} else {
  const d = {
    versione_manuale: VERSIONE,
    fonte: `Manuale dell’Equipaggiamento 0.3, cap. ${capitolo} (Google Doc del 28–29/09/2026)`,
    _nota: 'Generato da tools/lotti/lotto_equipaggiamento_03.mjs (docs/equipaggiamento-lotti.md). Solo i campi che la scheda dà: un dato mancante è assente, mai 0 (Equipaggiamento §1.11). Catalogo Commerciale. Gli effetti numerici seguono docs/effetti-oggetti.md; il resto è testo in «note_manuale».',
    oggetti: C.oggetti,
  };
  console.log(`${C.oggetti.length} voci, ${C.oggetti.filter((o) => o.effetti).length} con effetti`);
  if (scrivi) {
    writeFileSync(percorso, `${JSON.stringify(d, null, 2)}\n`);
    const pi = new URL('data/equipaggiamento/index.json', RADICE);
    const indice = JSON.parse(readFileSync(pi, 'utf8'));
    if (!indice.file.some((f) => f.id === C.file)) indice.file.push({ id: C.file, file: `${C.file}.json`, descrizione: C.descrizione });
    writeFileSync(pi, `${JSON.stringify(indice, null, 2)}\n`);
  }
}
// collegamento delle voci di dotazione alla scheda: peso, prezzo, Qualità, PI ed effetti vengono dalla
// scheda (anche per i personaggi già salvati, tramite dotazione_id); gli effetti del §2.16 che la
// scheda cambia si segnalano (vale il manuale dell'Equipaggiamento)
{
  const pd = new URL('data/dotazioni.json', RADICE);
  const dot = JSON.parse(readFileSync(pd, 'utf8'));
  const schede = new Map();
  for (const o of C.aggiorna ? C.oggetti.map(([x]) => x) : C.oggetti) schede.set(`${C.file}:${o.id}`, o);
  const altroFile = (rif) => { const [f, id] = rif.split(':'); return JSON.parse(readFileSync(new URL(`data/equipaggiamento/${f}.json`, RADICE), 'utf8')).oggetti.find((x) => x.id === id); };
  const breve = (e) => (e ?? []).map((x) => `${x.tipo === 'salvezza' ? `PS ${x.salvezza}` : x.abilita} ${x.valore > 0 ? '+' : ''}${x.valore} ${x.ambito}${x.uso ? ` (${x.uso})` : ''}`).join('; ') || 'nessuno';
  for (const [id, rif] of Object.entries(DOTAZIONI[capitolo] ?? {})) {
    const o = dot.oggetti_dotazione[id];
    if (!o) throw new Error(`oggetto di dotazione inesistente: ${id}`);
    const scheda = schede.get(rif) ?? altroFile(rif);
    if (!scheda) throw new Error(`scheda inesistente: ${rif}`);
    const prima = breve(o.effetti);
    const dopo = breve(scheda.effetti);
    if (o.effetti && prima !== dopo) console.log(`  ! ${id}: §2.16 «${prima}» → scheda «${dopo}» (vale la scheda)`);
    for (const k of ['peso', 'costo', 'paragrafo', 'effetti']) delete o[k];
    dot.oggetti_dotazione[id] = { nome: o.nome, rif, ...Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'nome' && k !== 'rif')) };
    console.log(`  ${id} → ${rif}`);
  }
  dot._nota_oggetti_dotazione = 'Voci della dotazione del §2.16 senza modello di armamento. Con «rif» hanno una scheda di catalogo (Manuale dell’Equipaggiamento 0.3, cap. 2–6, tools/lotti/lotto_equipaggiamento_03.mjs; Corredo di manutenzione da campo: Armamenti §7.13.7): nome della dotazione, peso, prezzo, Qualità, PI ed effetti dalla scheda, anche per i personaggi già salvati (risolvi() tramite dotazione_id). Senza «rif» restano «da definire» (A.34: peso assente non è 0 kg, prezzo assente non dà credito di scambio). Nessun oggetto della dotazione che non sia un armamento assegnato si cede nello scambio iniziale (§2.16.29).';
  if (scrivi) writeFileSync(pd, `${JSON.stringify(dot, null, 2)}\n`);
}
if (scrivi) console.log('scritto');

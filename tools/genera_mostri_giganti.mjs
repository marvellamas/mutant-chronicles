// Blocco «Giganti e abitanti delle montagne» del catalogo (cap. 8) del Manuale dei Mostri v0.16: dieci profili
// prestabiliti in esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti;
// niente valori inventati. GS/PX informativo (A.161). Spazio ai soli valori quadrati (A.126; qui 2×2 o 3×3).
//
// Scelte del blocco:
//  - attacchi senza tiro per colpire (VA «—»: Masso destabilizzante no — ha VA; Malocchio, Deformazione,
//    Sguardo gelido, Soffio gelido, Scarica tempestosa) → capacità, perché `va` è obbligatorio.
//  - armi con due componenti di danno (Artiglio dello Yeti: fisico + Ghiaccio) → `danno` con la componente
//    fisica e la seconda descritta nella capacità «Gelo degli artigli» e nella nota dell'attacco.
//  - giganti con armatura e «Parata N • Schivata M» → `difese` = Parata (con l'arma), Schivata nelle note.
//  - poteri innati a PM (Nebbia, Sostentamento, Passo nelle nubi, Scarica tempestosa, Levitazione) → capacità
//    con `risorsa`; il volo del Gigante delle nuvole è un potere, non nel campo `volo` del movimento.
//  - Masso: attacco di tipo distanza (solo Colpo Singolo, gittata FOR × 3 = 30 Q).
//  - Scurovisione solo dove indicata (Pietre 12 Q, Fomorian 24 Q; il Ciclope non ne ha).
//
// Uso: node tools/genera_mostri_giganti.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.16 (16/10/2026), cap. 8 «Catalogo delle creature» — Giganti e abitanti delle montagne';
const r = (nome, va, danno, natura, portata_q, proprieta, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura, portata_q, ac: 1, ...(proprieta ? { proprieta } : {}), ...extra });
const masso = (va, danno, extra = {}) => ({ nome: 'Masso', tipo: 'distanza', va, danno, natura: 'Naturale', gittata_q: 30, modalita: ['S'], ac: 1, ...extra });

const CREATURE = [
  {
    id: 'ciclope', nome: 'Ciclope', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 4, COS: 9, INT: 4, SAG: 3, CAR: 4 },
    pv: 64, pm: 8, ar: { totale: 2, magica: 0 }, difese: 9, iniziativa: -1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 8, volonta: 8, magia: 10 },
    attacchi: [r('Maglio rustico', 13, '2d6+5', 'Naturale', 2), masso(10, '2d6+3')],
    abilita: [{ nome: 'Armi da guerra', va: 13 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Atletica', va: 15 }, { nome: 'Percezione', va: 8 }, { nome: 'Sopravvivenza', va: 10 }],
    gs_px: { gs: 'Eroe', px: 77, per_pg: 4 },
    capacita: [
      { nome: 'Percezione della profondità', effetto: 'Contro un bersaglio oltre 6 Q applica un ulteriore −2 VA a tutti gli attacchi diretti a distanza, cumulativo con la penalità di distanza (a 15 Q il Masso usa VA 6). Non penalizza Percezione, i colpi ravvicinati o le Salvezze.' },
      { nome: 'Un solo occhio', effetto: 'Accecato impedisce la vista normalmente. Il capo resta una sola localizzazione: un colpo alla Testa non distrugge l’occhio da sé. Non possiede scurovisione né un senso alternativo.' },
    ],
    note: 'AR 2 biologica. Maglio = Martello a due mani (danno con +3 ordinario e +2 innato, portata 2 Q); nessuno scudo, para con il maglio. Lancio di massi: solo Colpo Singolo, serve un masso libero (~20 kg) da raccogliere (1 AzP, due mani). Comportamento: difende rifugio e risorse; sotto 16 PV o a Ferita Seria cerca riparo o tratta.',
  },
  {
    id: 'gigante-delle-colline', nome: 'Gigante delle colline', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 4, COS: 9, INT: 3, SAG: 4, CAR: 3 },
    pv: 60, pm: 8, ar: { totale: 2, magica: 0 }, difese: 9, iniziativa: -1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 8, volonta: 8, magia: 9 },
    attacchi: [r('Maglio rustico', 13, '2d6+4', 'Naturale', 2), masso(10, '2d6+2')],
    abilita: [{ nome: 'Armi da guerra', va: 13 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Atletica', va: 15 }, { nome: 'Percezione', va: 9 }, { nome: 'Sopravvivenza', va: 10 }],
    gs_px: { gs: 'Eroe', px: 77, per_pg: 4 },
    capacita: [
      { nome: 'Due Azioni', effetto: 'Può portare due colpi di maglio (pagati separatamente) o conservare AzP per Parata e altro. Un colpo non travolge più avversari e non dà A Terra o Sbalzante senza una manovra pertinente.' },
      { nome: 'Forza da Lavoro', effetto: 'Atletica 15 e soglie FOR × 20 / × 40 / × 80 kg per sollevare, trascinare o forzare (§4), rispettando Integrità e caratteristiche dell’ostacolo. Nessun danno doppio da assedio.' },
    ],
    note: 'AR 2 biologica, nessuna armatura. Maglio = Martello a due mani (+3 ordinario, +1 innato, portata 2 Q). Comportamento: raggiunge il bersaglio più accessibile; sotto 15 PV o a Ferita Profonda valuta fuga, resa o trattativa.',
  },
  {
    id: 'gigante-delle-pietre', nome: 'Gigante delle pietre', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 7, COS: 9, INT: 5, SAG: 6, CAR: 4 },
    pv: 70, pm: 12, ar: { totale: 4, magica: 0 }, difese: 13, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 15, riflessi: 12, volonta: 11, magia: 12 },
    attacchi: [r('Maglio di pietra', 14, '2d6+5', 'Naturale', 3), masso(14, '2d6+4', { note: 'Masso destabilizzante: dopo almeno 1 danno finale, una vittima ≤ 3×3 Q fa FOR o DES; il fallimento dà A Terra (Stabile X si applica). Non contro chi vola senza appoggio.' })],
    abilita: [{ nome: 'Armi da guerra', va: 14 }, { nome: 'Armi da lancio', va: 14 }, { nome: 'Atletica', va: 16 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Eroe', px: 77, per_pg: 4 },
    capacita: [
      { nome: 'Afferrare un masso', effetto: 'Contro un singolo masso o proiettile non esplosivo ≤ 20 kg: 1 AzP, due mani libere e Riflessi 12. Successo lo afferra annullando quel danno; fallimento lo subisce senza un’altra Difesa. Deve percepirlo; non intercetta proiettili d’arma da fuoco, aree o dardi energetici. Scagliarlo richiede una nuova AzP.' },
      { nome: 'Scurovisione', effetto: 'Vede entro 12 Q nel buio naturale, senza colori né vista attraverso ostacoli. Furtività +2 in terreno roccioso quando può nascondersi, senza Sorpresa automatica.' },
    ],
    note: 'AR 4 biologica, nessuna armatura. Maglio = Martello a due mani (+3 ordinario, +2 innato, portata 3 Q). Comportamento: difende luoghi e opere proprie; sotto 18 PV o a Ferita Seria cerca una strettoia o negozia.',
  },
  {
    id: 'gigante-del-gelo', nome: 'Gigante del gelo', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 5, COS: 10, INT: 4, SAG: 5, CAR: 5 },
    pv: 76, pm: 12, ar: { totale: 5, magica: 0 }, difese: 12, iniziativa: 0,
    movimento: { passo: 7, corsa: 15, scatto: 23 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 16, riflessi: 9, volonta: 11, magia: 11 },
    attacchi: [r('Ascia bipenne', 15, '2d6+6', 'Naturale', 2), masso(11, '2d6+4')],
    abilita: [{ nome: 'Armi da guerra', va: 15 }, { nome: 'Armi da lancio', va: 11 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 7 }],
    gs_px: { gs: 'Eroe', px: 77, per_pg: 4 },
    capacita: [
      { nome: 'Immunità al Ghiaccio', effetto: 'Non subisce danni da Ghiaccio né i suoi Rallentato e Congelato; il freddo ambientale ordinario non gli dà danni o Affaticamento (restano frane, cadute, seppellimento). Fuoco e Incendiato normali, senza vulnerabilità ×2.' },
      { nome: 'Valori con armatura', effetto: 'I valori pronti includono −1 ad attacchi e Agilità (Schivata compresa) e −1 Q a ogni andatura; Parata 12. Tolta l’armatura: AR 2, Armi da guerra 16, Armi da lancio 12, Schivata 12, Atletica 15, Furtività 8, movimento 8/16/24. Perdere i PI non elimina da solo le penalità.' },
    ],
    note: 'AR 5 (2 biologica + 3 armatura Media su misura). Difese = Parata 12; Schivata 11. Ascia bipenne a due mani (+3 ordinario, +2 innato, portata 2 Q). Comportamento: alterna ascia e Difese o prepara il tiro; sotto 19 PV o a Ferita Seria cerca copertura o un accordo.',
  },
  {
    id: 'gigante-del-fuoco', nome: 'Gigante del fuoco', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 5, COS: 10, INT: 5, SAG: 6, CAR: 6 },
    pv: 82, pm: 14, ar: { totale: 6, magica: 0 }, difese: 13, iniziativa: 0,
    movimento: { passo: 4, corsa: 10, scatto: 16 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 17, riflessi: 10, volonta: 12, magia: 12 },
    attacchi: [r('Spadone', 15, '2d6+7', 'Naturale', 2), masso(11, '2d6+4')],
    abilita: [{ nome: 'Armi da guerra', va: 15 }, { nome: 'Armi da lancio', va: 11 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 12 }, { nome: 'Tecnologia', va: 12 }],
    gs_px: { gs: 'Eroe', px: 77, per_pg: 4 },
    immunita: ['incendiato'],
    capacita: [
      { nome: 'Immunità al Fuoco', effetto: 'Non subisce Fuoco né Incendiato e tollera il calore ambientale senza danni o Affaticamento. Fumo, mancanza d’aria, crolli e materiali che lo intrappolano restano pericolosi. Ghiaccio normale, con i suoi Stati. L’equipaggiamento conserva le normali vulnerabilità.' },
      { nome: 'Valori con armatura', effetto: 'I valori pronti includono −2 ad attacchi e Agilità e −2 Q a ogni andatura; Parata 13. Tolta la corazza: AR 1, Armi da guerra 17, Armi da lancio 13, Schivata 13, Atletica 16, movimento 6/12/18.' },
    ],
    note: 'AR 6 (1 biologica + 5 armatura Pesante su misura). Difese = Parata 13; Schivata 11. Tecnologia 12 per forgia. Spadone a due mani (+3 ordinario, +3 innato, portata 2 Q). Comportamento: terreno solido e fronte controllabile; sotto 21 PV o a Ferita Seria ripiega o tratta.',
  },
  {
    id: 'gigante-delle-nuvole', nome: 'Gigante delle nuvole', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 6, COS: 9, INT: 7, SAG: 8, CAR: 8 },
    pv: 88, pm: 24, ar: { totale: 3, magica: 0 }, difese: 13, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 15, riflessi: 11, volonta: 14, magia: 14 },
    attacchi: [r('Maglio chiodato', 15, '2d6+7', 'Naturale', 2), masso(14, '2d6+5')],
    abilita: [{ nome: 'Armi da guerra', va: 15 }, { nome: 'Armi da lancio', va: 14 }, { nome: 'Atletica', va: 15 }, { nome: 'Percezione', va: 14 }, { nome: 'Oratoria', va: 14 }],
    gs_px: { gs: 'Leggenda', px: 110, per_pg: 4 },
    capacita: [
      { nome: 'Nebbia', effetto: '1 AzP e 2 PM: nebbia in raggio 3 Q attorno a un punto visibile entro 10 Q, ferma per 10 Round senza Concentrazione. Dopo 1 Q di nebbia lungo la linea di vista impedisce di vedere oltre (la creatura nascosta resta percepibile con altri sensi). Nessun danno, non soffoca. Ne mantiene una sola; un vento forte per un Round la disperde. Negare Potere: effetto unico di potenza 6.', risorsa: '2 PM', azioni: { principali: 1 } },
      { nome: 'Sostentamento', effetto: '1 AzP e 3 PM: volo 6 / 12 / 18 Q per 10 Round senza Concentrazione. Usa l’AzM ordinaria, resta sospeso senza percorso minimo. Solleva sé e gli oggetti entro il carico, non altre creature; non passa attraverso solidi. Potenza 9 per Negare Potere.', risorsa: '3 PM', azioni: { principali: 1 } },
      { nome: 'Passo nelle nubi', effetto: '1 AzP e 3 PM: si trasferisce istantaneamente con gli oggetti indossati a una destinazione libera, visibile, entro 10 Q, con spazio per tutti i 3 × 3 Q. Non porta altre creature, non attraversa pareti, non provoca Attacchi di Opportunità per i Q intermedi. Senza Sostentamento serve un appoggio alla destinazione.', risorsa: '3 PM', azioni: { principali: 1 } },
    ],
    note: 'AR 3 biologica, nessuna armatura. Percezione 14; olfatto 16. Maglio = Martello a due mani (+3 ordinario, +4 innato, portata 2 Q). I 24 PM sono una sola riserva. Comportamento: usa l’altezza; sotto 22 PV, a Ferita Seria o con meno di 4 PM si ritira.',
  },
  {
    id: 'gigante-delle-tempeste', nome: 'Gigante delle tempeste', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 8, COS: 10, INT: 8, SAG: 9, CAR: 9 },
    pv: 100, pm: 30, ar: { totale: 5, magica: 0 }, difese: 15, iniziativa: 3,
    movimento: { passo: 9, corsa: 19, scatto: 29 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 17, riflessi: 14, volonta: 16, magia: 16 },
    attacchi: [r('Spadone', 16, '2d6+9', 'Naturale', 2), masso(15, '2d6+6')],
    abilita: [{ nome: 'Armi da guerra', va: 16 }, { nome: 'Armi da lancio', va: 15 }, { nome: 'Atletica', va: 16 }, { nome: 'Percezione', va: 16 }, { nome: 'Oratoria', va: 15 }],
    gs_px: { gs: 'Leggenda', px: 110, per_pg: 4 },
    capacita: [
      { nome: 'Scarica tempestosa', effetto: '1 AzP e 6 PM, punto visibile entro 20 Q: tutte le creature entro 2 Q (alleati e il gigante se coinvolto), 1 AC, un solo 3d6+5 Fulmine Magico; i solidi fermano. Elusione su Riflessi −4 dimezza prima dell’AR; dopo residuo e Contromisura, una distinta Tempra −4: fallimento Disorientato 1+1d3 Round (−2 VA), con 20 naturale Stordito. Massimo una per Round e non nel Round immediatamente successivo (usata nel Round 1, torna dal 3).', risorsa: '6 PM', azioni: { principali: 1 }, usi: { quanti: 1, per: 'Round' } },
      { nome: 'Levitazione', effetto: '1 AzP e 3 PM: per 10 Round senza Concentrazione solleva sé e i propri oggetti entro il carico, non altre creature. L’AzM permette fino a 6 Q in verticale (niente Corsa o Scatto), può restare sospeso; nessun moto orizzontale aereo. Non elimina gli Attacchi di Opportunità né l’immunità alle cadute. Negare Potere potenza 6.', risorsa: '3 PM', azioni: { principali: 1 } },
      { nome: 'Anfibio e protezioni', effetto: 'Respira aria e acqua senza costo; nuoto 9 / 19 / 29 Q effettivo (già con l’armatura). Immune a Fulmine (effetti secondari compresi). Dimezza per eccesso il Ghiaccio dopo le Difese e prima dell’AR (il residuo può dare Rallentato o Congelato). Non immune ad Assordato o Aria.' },
    ],
    note: 'AR 5 (2 biologica + 3 armatura Media su misura). Difese = Parata 15; Schivata 14. Spadone a due mani (+3 ordinario, +5 innato, portata 2 Q). Tolta la corazza: AR 2, Armi da guerra 17, Armi da lancio 16, Schivata 15, Atletica 17, terra/nuoto 10/20/30. Comportamento: sotto 25 PV, a Ferita Seria o con meno di 7 PM cerca l’acqua o una tregua.',
  },
  {
    id: 'fomorian', nome: 'Fomorian', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 4, COS: 9, INT: 5, SAG: 7, CAR: 3 },
    pv: 70, pm: 20, ar: { totale: 2, magica: 0 }, difese: 10, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '3 × 3 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 14, riflessi: 9, volonta: 10, magia: 12 },
    attacchi: [r('Maglio rustico', 14, '2d6+5', 'Naturale', 3)],
    abilita: [{ nome: 'Armi da guerra', va: 14 }, { nome: 'Atletica', va: 14 }, { nome: 'Percezione', va: 14 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Eroe', px: 77, per_pg: 4 },
    capacita: [
      { nome: 'Malocchio', effetto: '1 AzP e 3 PM: una creatura con mente visibile entro 12 Q, nessun tiro per colpire, PS Volontà −2 (successo dimezza per eccesso 1d6+4, fallimento tutto). Danno psichico diretto ai PV: ignora PV temporanei, AR, Parata, Schivata ed Elusione; non toglie PM né produce Ferite. Se porta a 0 PV (o colpisce chi è già a 0), seconda PS Volontà −2 o Svenuto 1+1d4 Round. Barriera Mentale lo impedisce del tutto.', risorsa: '3 PM', azioni: { principali: 1 } },
      { nome: 'Deformazione maledetta', effetto: '1 AzP e 5 PM: bersaglio vivente visibile entro 12 Q, PS Magia −2 evita tutto; il fallimento applica Rallentato per 10 Round (Passo max 3 Q, niente Corsa o Scatto, −2 alle Prove fisiche e alle Difese), senza danno o Menomazioni. Non richiede Concentrazione; danni o morte del Fomorian non la terminano. Negare Potere potenza 6. Una sola capacità oculare per Round.', risorsa: '5 PM', azioni: { principali: 1 } },
      { nome: 'Scurovisione', effetto: 'Vede entro 24 Q nel buio naturale, senza colori o vista attraverso ostacoli. Lo sguardo richiede che il Fomorian veda la vittima, non che questa ricambi.' },
    ],
    note: 'AR 2 biologica, nessuna armatura; non lancia massi. Maglio = Martello a due mani (+3 ordinario, +2 innato, portata 3 Q). Comportamento: difende una caverna, cerca gli isolati; può essere interlocutore; sotto 18 PV o con meno di 4 PM cerca riparo o una via negoziata.',
  },
  {
    id: 'yeti', nome: 'Yeti', taglia: 'grande',
    caratteristiche: { FOR: 8, DES: 6, COS: 7, INT: 4, SAG: 6, CAR: 3 },
    pv: 35, pm: 8, ar: { totale: 2, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '2 × 2 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 10, volonta: 9, magia: 10 },
    attacchi: [r('Artiglio', 13, '1d6+2', 'Naturale', 1, undefined, { note: 'Aggiunge 1d4 Ghiaccio Naturale (una Difesa, una AC): vedi «Gelo degli artigli». Le componenti restano distinte per AR e Stati.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Atletica', va: 13 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      { nome: 'Gelo degli artigli', effetto: 'L’Artiglio aggiunge 1d4 Ghiaccio Naturale: dopo il residuo della componente Ghiaccio e la Contromisura, PS Tempra ordinaria contro Rallentato ed eventuale progressione a Congelato. Il +2 fisico è già incluso.' },
      { nome: 'Sguardo gelido', effetto: '1 AzP e 2 PM, una volta per Round, bersaglio entro 6 Q che lo vede: PS Magia (modificatore 0) evita danno ed effetto; fallimento subisce 1d6+2 Ghiaccio Magico (AR normale). Nessuna Parata, Schivata o Elusione; dopo residuo una distinta Tempra evita lo Stato del Ghiaccio. Dopo la PS la vittima è immune allo Sguardo di quello Yeti per un’ora.', risorsa: '2 PM', azioni: { principali: 1 }, usi: { quanti: 1, per: 'Round' } },
      { nome: 'Freddo e fuoco', effetto: 'Immune a Ghiaccio e ai suoi Rallentato/Congelato e al freddo ambientale. Dopo almeno 1 danno finale da Fuoco: −2 VA a tutte le Prove di Abilità fino al termine del proprio turno successivo (si usa il maggiore fra questo e il malus di Incendiato). Scurovisione 12 Q; +2 Furtività in neve e ghiaccio; olfatto 13.' },
    ],
    note: 'AR 2 biologica. Terra e arrampicata 8/16/24 Q (su appigli adeguati). Può Schivare, non parare con gli artigli. Comportamento: prede isolate; sotto 9 PV o a Ferita Profonda si ritira. Non ha Soffio gelido.',
  },
  {
    id: 'yeti-abominevole', nome: 'Yeti abominevole', taglia: 'grande',
    caratteristiche: { FOR: 10, DES: 5, COS: 10, INT: 5, SAG: 6, CAR: 4 },
    pv: 85, pm: 14, ar: { totale: 4, magica: 0 }, difese: 12, iniziativa: 1,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '3 × 3 Q',
    azioni: { principali: 3, movimento: 1 }, salvezze: { tempra: 16, riflessi: 11, volonta: 12, magia: 13 },
    attacchi: [r('Artiglio', 15, '1d8+3', 'Naturale', 1, undefined, { note: 'Aggiunge 1d6 Ghiaccio Naturale (una Difesa, una AC): vedi «Gelo degli artigli».' })],
    abilita: [{ nome: 'Corpo a corpo', va: 15 }, { nome: 'Atletica', va: 16 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 10 }],
    gs_px: { gs: 'Leggenda', px: 100, per_pg: 4 },
    capacita: [
      { nome: 'Gelo degli artigli', effetto: 'L’Artiglio aggiunge 1d6 Ghiaccio Naturale; la PS Tempra contro Rallentato/Congelato ha −2. Il +3 fisico è già incluso.' },
      { nome: 'Sguardo gelido', effetto: '1 AzP e 2 PM, una volta per Round, bersaglio entro 6 Q che lo vede: PS Magia −2 evita; fallimento 2d6+3 Ghiaccio Magico (AR normale), poi Tempra −2 contro lo Stato. Nessuna Parata, Schivata o Elusione. Immunità allo Sguardo di quello Yeti per un’ora dopo la PS.', risorsa: '2 PM', azioni: { principali: 1 }, usi: { quanti: 1, per: 'Round' } },
      { nome: 'Soffio gelido', effetto: '1 AzP, cono lungo 3 Q (file di larghezza 1/3/5 Q, 9 Q), i solidi bloccano; tutte le creature comprese, alleati inclusi, 1 AC. Un solo 3d6+3 Ghiaccio Naturale; Elusione su Riflessi −2 dimezza prima dell’AR; dopo residuo, Tempra −2 contro Rallentato/Congelato. Massimo una per Round, non nel Round immediatamente successivo (usato nel Round 1, torna dal 3); esclude lo Sguardo nello stesso Round, non gli Artigli. Non costa PM.', azioni: { principali: 1 }, usi: { quanti: 1, per: 'Round' } },
      { nome: 'Freddo e fuoco', effetto: 'Immune a Ghiaccio e ai suoi Rallentato/Congelato e al freddo. Dopo almeno 1 danno da Fuoco −2 VA a tutte le Prove di Abilità fino a fine del turno successivo (il maggiore fra questo e Incendiato). Scurovisione 12 Q; +2 Furtività in neve e ghiaccio; olfatto 15.' },
    ],
    note: 'AR 4 biologica. Terra e arrampicata 8/16/24 Q. Nelle AzP al massimo due Artigli e una sola fra Sguardo e Soffio. Nessuna Parata naturale. Comportamento: coinvolge più intrusi nel Soffio; sotto 22 PV o a Ferita Seria valuta la ritirata.',
  },
];

function profilo(c) {
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
    capacita: c.capacita,
    ...(c.immunita ? { immunita: c.immunita } : {}),
    note: c.note,
  };
}

const base = new URL('../esempi/nemici/mostri/', import.meta.url);
let scritti = 0;
for (const c of CREATURE) {
  await writeFile(new URL(`${c.id}.json`, base), `${JSON.stringify(profilo(c), null, 2)}\n`);
  scritti += 1;
}
console.log(`${scritti} profili del blocco «Giganti e abitanti delle montagne» scritti in esempi/nemici/mostri/`);

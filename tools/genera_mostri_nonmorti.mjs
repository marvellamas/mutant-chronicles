// Blocco «Non morti» del catalogo (cap. 8) del Manuale dei Mostri v0.16: dieci profili prestabiliti in
// esempi/nemici/mostri/, nel formato di data/formato_nemici.json (A.73). Valori trascritti; niente valori
// inventati. GS/PX informativo (A.161). Spazio ai soli valori quadrati (A.126; qui tutti 1 × 1 Q).
//
// Scelte di questo blocco (oltre a quelle delle bande):
//  - natura dell'attacco presa dalla colonna «Danno completo» (Naturale / Etereo / Magico).
//  - attacchi che non infliggono danni (Sguardo terribile della Mummia: applica Terrorizzato) → capacità.
//  - «AR X: Y intrinseca e Z da armatura» → ar.totale = X, magica 0.
//  - immunità: `sanguinamento` nel campo `immunita` (i non morti non sanguinano); le altre immunità
//    biologiche (soffocamento, malattie e veleni biologici) sono nelle note, come chiede il formato.
//  - presenze spirituali con «terra —»: movimento di volo (passo 0, Corsa/Scatto non consentiti a terra,
//    `volo` = Passo in volo; Corsa/Scatto in volo sono il doppio e il triplo).
//
// Uso: node tools/genera_mostri_nonmorti.mjs
import { writeFile } from 'node:fs/promises';

const FONTE = 'dal Manuale dei Mostri v0.16 (16/10/2026), cap. 8 «Catalogo delle creature» — Non morti';
const SCUROVISIONE = { nome: 'Scurovisione', effetto: 'Vede entro 12 Q anche nell’oscurità naturale; non distingue i colori al buio, non vede attraverso gli ostacoli e non individua da sé chi è nascosto.' };
const NONMORTO = { nome: 'Non morto', effetto: 'Non biologicamente vivo: non respira, non mangia, non beve e non dorme. Immune a soffocamento, malattie e veleni biologici e a Sanguinamento (il danno fisico del colpo che porta un veleno resta). Cura Ferite e le cure per organismi viventi non lo curano. 0 PV non lo distrugge: la distruzione arriva con Morente (Svenuto e contatore su COS, §5.14). A 0 PM è Svenuto finché non recupera almeno 1 PM.' };

const r = (nome, va, danno, natura, portata_q, extra = {}) => ({ nome, tipo: 'ravvicinato', va, danno, natura, portata_q, ac: 1, ...extra });
const dist = (nome, va, danno, natura, gittata_q, modalita, extra = {}) => ({ nome, tipo: 'distanza', va, danno, natura, gittata_q, modalita, ac: 1, ...extra });

const CREATURE = [
  {
    id: 'scheletro', nome: 'Scheletro',
    caratteristiche: { FOR: 5, DES: 6, COS: 6, INT: 3, SAG: 4, CAR: 2 },
    pv: 18, pm: 4, ar: { totale: 1, magica: 0 }, difese: 9, iniziativa: 0,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 9, volonta: 7, magia: 8 },
    attacchi: [r('Spada leggera', 10, '1d6+2', 'Naturale', 1), dist('Arco da guerra', 10, '1d6+2', 'Naturale', 100, ['S', 'TR'])],
    abilita: [{ nome: 'Armi da mischia', va: 10 }, { nome: 'Armi da lancio', va: 10 }, { nome: 'Percezione', va: 9 }, { nome: 'Atletica', va: 9 }],
    gs_px: { gs: 'Principiante', px: 11, per_pg: 4 },
    capacita: [
      { nome: 'Ossa fragili', effetto: 'Un colpo di martello, mazza o randello aggiunge +2 al danno base (prima di moltiplicatori, Difese e AR); anche i danni da caduta +2 per evento. Vale per l’impatto contundente effettivo, non per proiettili, lame o la sola proprietà Concussivo.' },
      NONMORTO, SCUROVISIONE,
    ],
    note: 'AR 1 da armatura leggera. Inizia con la spada pronta; l’arco (due mani) ha Colpo Singolo e Tiro Rapido. Comprende ordini semplici ma non parla. Comportamento: presidia un luogo o esegue una consegna.',
  },
  {
    id: 'zombie', nome: 'Zombie',
    caratteristiche: { FOR: 6, DES: 2, COS: 7, INT: 2, SAG: 3, CAR: 1 },
    pv: 24, pm: 4, ar: { totale: 1, magica: 0 }, difese: 6, iniziativa: -3,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 11, riflessi: 6, volonta: 7, magia: 8 },
    attacchi: [r('Percossa', 9, '1d6+1', 'Naturale', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 9 }, { nome: 'Atletica', va: 10 }, { nome: 'Percezione', va: 8 }],
    gs_px: { gs: 'Principiante', px: 10, per_pg: 4 },
    capacita: [
      { nome: 'Tenacia cadaverica', effetto: 'Già a 0 PV, quando un colpo Naturale impone una PS Tempra per le nuove Ferite, ottiene +2 a quella PS. Non vale contro danno Magico o Etereo, contro un Successo Magistrale o le Ferite dirette senza Tempra. Non recupera 1 PV e non ripete la Prova.' },
      { nome: 'Presa', effetto: 'Può Immobilizzare con Corpo a corpo 9 (manovra, mani occupate e liberazione del §5.5); non infligge la Percossa insieme alla presa e non ottiene un Morso o una seconda AzP.' },
      NONMORTO, SCUROVISIONE,
    ],
    note: 'Nessuna dotazione, nessuna Parata naturale. Non è immune ad A Terra, Immobilizzato o rallentamenti materiali. Non trasmette infezioni né trasforma in Zombie chi colpisce. Comportamento: avanza verso il vivente indicato o più vicino, non fugge per PV bassi.',
  },
  {
    id: 'ghoul', nome: 'Ghoul',
    caratteristiche: { FOR: 6, DES: 6, COS: 5, INT: 3, SAG: 5, CAR: 2 },
    pv: 22, pm: 6, ar: { totale: 0, magica: 0 }, difese: 10, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 10, volonta: 8, magia: 9 },
    attacchi: [r('Artigli', 11, '1d4+1', 'Naturale', 1), r('Morso', 10, '1d6+1', 'Naturale', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Furtività', va: 11 }, { nome: 'Percezione', va: 11 }, { nome: 'Atletica', va: 11 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Rigidità cadaverica', effetto: 'Se gli Artigli infliggono almeno 1 danno finale a un vivente, Tempra senza modificatore: fallimento o Maldestro → Immobilizzato per 1 Round (niente movimento, −4 alle Prove fisiche, senza bloccare le mani). Non è una presa e non va mantenuto. A fine di ogni propria Iniziativa il bersaglio ripete Tempra senza Azioni: un successo termina. È un veleno naturale di Pericolosità II; Cura Avvelenamenti (liv. 2) o un antidoto lo rimuovono.' },
      NONMORTO, SCUROVISIONE,
    ],
    note: 'Nessuna dotazione né Parata naturale. Con una sola AzP sceglie Artigli, Morso o Difesa; gli Artigli non aggiungono un Morso gratuito. Comportamento: preda isolata; a Ferita Profonda o sotto 6 PV cerca riparo.',
  },
  {
    id: 'ghast', nome: 'Ghast',
    caratteristiche: { FOR: 7, DES: 6, COS: 6, INT: 5, SAG: 5, CAR: 4 },
    pv: 32, pm: 8, ar: { totale: 1, magica: 0 }, difese: 11, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 11, riflessi: 10, volonta: 10, magia: 10 },
    attacchi: [r('Artigli', 12, '1d6+1', 'Naturale', 1), r('Morso', 11, '1d8+1', 'Naturale', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Furtività', va: 11 }, { nome: 'Percezione', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Oratoria', va: 10 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      { nome: 'Attacchi e rigidità', effetto: 'Nelle proprie AzP al massimo un Artiglio e un Morso per Round. Gli Artigli applicano la Rigidità cadaverica del Ghoul con durata 2 Round (Tempra iniziale, ripetizione a fine Iniziativa, Pericolosità II). Non somma le durate.' },
      { nome: 'Fetore', effetto: 'Passivo, senza PM. Un vivente che respira ed è entro 1 Q a inizio della propria Iniziativa effettua Tempra (una sola volta per Round per tutti i Ghast): successo evita e dà immunità al Fetore per 24 ore; fallimento → Avvelenato per 1 Round, senza danno, −2 VA alle Prove fisiche. Agente inalato di Pericolosità I; una protezione respiratoria adatta evita l’esposizione; Cura Avvelenamenti 1 lo termina.' },
      NONMORTO, SCUROVISIONE,
    ],
    note: 'Nessuna dotazione né Parata naturale. Gli ordini vocali guidano i Ghoul che li odono, senza Azioni gratuite. Comportamento: sotto 8 PV o a Ferita Seria può fuggire.',
  },
  {
    id: 'wight', nome: 'Wight',
    caratteristiche: { FOR: 7, DES: 6, COS: 7, INT: 6, SAG: 6, CAR: 7 },
    pv: 40, pm: 12, ar: { totale: 3, magica: 0 }, difese: 12, iniziativa: 1,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 10, volonta: 12, magia: 11 },
    attacchi: [r('Spada lunga', 13, '1d8+2', 'Naturale', 1), dist('Arco da guerra', 12, '1d6+2', 'Naturale', 100, ['S', 'TR']), r('Tocco', 11, '1d6+1', 'Etereo', 1)],
    abilita: [{ nome: 'Armi da guerra', va: 13 }, { nome: 'Armi da lancio', va: 12 }, { nome: 'Corpo a corpo', va: 11 }, { nome: 'Percezione', va: 12 }, { nome: 'Furtività', va: 11 }, { nome: 'Oratoria', va: 12 }],
    gs_px: { gs: 'Veterano', px: 55, per_pg: 4 },
    capacita: [
      { nome: 'Risucchio vitale', effetto: 'Può potenziare il Tocco (Etereo): 2 PM prima del tiro, una volta per Round. Dopo almeno 1 danno finale a un vivente, Tempra senza modificatore proprio: fallimento peggiora l’Affaticamento di uno Stato, Maldestro di due (§5.19). Un bersaglio fa al massimo una PS di Risucchio per Round per tutto il blocco. Solo l’AR magica riduce il danno del Tocco.' },
      { nome: 'Vincolo del cadavere', effetto: 'Se un umanoide entra in Morente per un Tocco potenziato e muore senza stabilizzazione, dopo 24 ore il cadavere integro diventa uno Zombie di questo blocco (PV e PM pieni), fino a quattro vincolati. Prima del risveglio è un effetto mistico di potenza 6 (Negare Potere lo rimuove col confronto ordinario; distruggere il cadavere lo interrompe). Il Wight parte senza Zombie; ogni Zombie coinvolto vale 10 PX a parte (§9.3).' },
      { nome: 'Debolezza solare', effetto: 'In luce solare diretta (il Wight o il bersaglio osservato) −2 VA agli attacchi e a Percezione visiva; le due esposizioni non si sommano, nessun danno.' },
      NONMORTO, SCUROVISIONE,
    ],
    note: 'AR 3 (2 intrinseca + 1 da armatura leggera). Inizia con spada e mano libera per il Tocco; l’arco richiede due mani (Colpo Singolo e Tiro Rapido). Comportamento: usa ripari dal sole; sotto 10 PV o a Ferita Seria valuta la ritirata.',
  },
  {
    id: 'ombra', nome: 'Ombra',
    caratteristiche: { FOR: 2, DES: 7, COS: 5, INT: 3, SAG: 5, CAR: 4 },
    pv: 18, pm: 8, ar: { totale: 0, magica: 0 }, difese: 11, iniziativa: 2,
    movimento: { passo: 8, corsa: 16, scatto: 24 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 9, riflessi: 12, volonta: 9, magia: 10 },
    attacchi: [r('Tocco', 11, '1d4+1', 'Etereo', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 11 }, { nome: 'Furtività', va: 12 }, { nome: 'Percezione', va: 10 }],
    gs_px: { gs: 'Inesperto', px: 20, per_pg: 4 },
    capacita: [
      { nome: 'Corpo immateriale', effetto: 'Dimezza per eccesso il danno Naturale dopo le Difese e prima dell’AR; Magico ed Etereo pieni. Immune ad A Terra e a Immobilizzato da vincoli esclusivamente materiali (un vincolo magico adatto resta valido); non è immune alle armi comuni. Non trasporta oggetti né apre porte. Per parare il Tocco serve un’arma magica o uno scudo con componente magica; solo l’AR magica riduce il danno.' },
      { nome: 'Risucchio vitale', effetto: 'Può potenziare il Tocco: 2 PM, Tempra senza modificatore contro Affaticamento (una PS per bersaglio e Round per tutto il blocco). Non sottrae FOR e non uccide per azzeramento della Caratteristica.' },
      { nome: 'Forma cedevole', effetto: 'Col normale movimento passa per un’apertura reale larga almeno 2,5 cm, senza Prova; non attraversa pareti integre, non vola, non percorre superfici verticali.' },
      { nome: 'Nascondersi nelle ombre', effetto: 'Una volta per Round, a fine Passo in penombra o buio, effettua Furtività senza AzP se può davvero nascondersi (non è invisibile).', usi: { quanti: 1, per: 'Round' } },
      { nome: 'Debolezza solare', effetto: 'Nella luce solare diretta −2 a tutte le Prove di Abilità e Salvezza; nessun danno automatico, torce e luce magica non la attivano.' },
      NONMORTO, SCUROVISIONE,
    ],
    note: 'Furtività 14 in penombra o buio. Niente volo né attraversamento delle pareti. Nessuna dotazione né Parata naturale. Comportamento: aggira il fronte; sotto 5 PV o senza ripari fugge. Non genera nuove Ombre in questo profilo.',
  },
  {
    id: 'spettro', nome: 'Spettro',
    caratteristiche: { FOR: 1, DES: 7, COS: 6, INT: 5, SAG: 5, CAR: 5 },
    pv: 24, pm: 10, ar: { totale: 0, magica: 0 }, difese: 11, iniziativa: 2,
    movimento: { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito', volo: 10 }, spazio: '1 Q',
    azioni: { principali: 1, movimento: 1 }, salvezze: { tempra: 10, riflessi: 12, volonta: 10, magia: 11 },
    attacchi: [r('Tocco', 12, '1d6+1', 'Etereo', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 12 }, { nome: 'Percezione', va: 11 }, { nome: 'Furtività', va: 11 }],
    gs_px: { gs: 'Esperto', px: 30, per_pg: 4 },
    capacita: [
      { nome: 'Incorporeità', effetto: 'Corpo immateriale (dimezza il Naturale dopo le Difese e prima dell’AR; Magico ed Etereo pieni; immune ad A Terra e Immobilizzato materiali). Attraversa pareti, oggetti e creature: ogni Q di materia costa 2 Q del budget; non vede né attacca attraverso il materiale e non termina il movimento dentro la materia (sennò è espulso e subisce 1d6 Etereo diretto). È normalmente visibile.' },
      { nome: 'Volo spettrale', effetto: 'Levita senza ali e mantiene la quota senza AzM; Volo 10 / 20 / 30 Q. Da Svenuto resta sospeso e non si muove; l’immobilità non lo protegge.' },
      { nome: 'Risucchio vitale', effetto: 'Potenzia il Tocco una volta per Round con 2 PM: dopo almeno 1 danno finale a un vivente, Tempra senza modificatore contro Affaticamento (una PS per bersaglio e Round per il blocco). Un Tocco ordinario non causa la PS.' },
      { nome: 'Sensibilità solare', effetto: 'Se lo Spettro o il bersaglio osservato è al sole diretto, −2 VA agli attacchi e a Percezione visiva (non raddoppia); nessun danno automatico.' },
      NONMORTO, SCUROVISIONE,
    ],
    note: 'Presenza incorporea: nessun movimento a terra (si muove in volo). Per parare il Tocco serve un’arma magica o uno scudo con componente magica. Nessuna dotazione né Parata naturale. Comportamento: percorso laterale e bersaglio isolato; sotto 6 PV o a Ferita Profonda si ritira nel luogo che infesta.',
  },
  {
    id: 'wraith', nome: 'Wraith',
    caratteristiche: { FOR: 2, DES: 7, COS: 8, INT: 6, SAG: 7, CAR: 7 },
    pv: 50, pm: 18, ar: { totale: 0, magica: 0 }, difese: 12, iniziativa: 2,
    movimento: { passo: 0, corsa: 'non_consentito', scatto: 'non_consentito', volo: 12 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 13, riflessi: 12, volonta: 13, magia: 13 },
    attacchi: [r('Tocco', 14, '1d8+2', 'Etereo', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 14 }, { nome: 'Percezione', va: 13 }, { nome: 'Furtività', va: 12 }, { nome: 'Oratoria', va: 12 }, { nome: 'Occultismo', va: 12 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      { nome: 'Incorporeità', effetto: 'Come lo Spettro: Corpo immateriale, attraversamento della materia (2 Q per Q, espulsione con 1d6 Etereo diretto) e Volo spettrale 12 / 24 / 36 Q. Resta visibile e non attacca attraverso gli ostacoli.' },
      { nome: 'Risucchio maggiore', effetto: 'Potenzia un Tocco per Round con 2 PM; la PS Tempra contro Affaticamento ha −2. Resta il limite di una PS per bersaglio e Round; non aggiunge il risucchio a ogni Tocco né infligge Ferite dirette.' },
      { nome: 'Generare uno Spettro', effetto: '1 AzP e 6 PM, una volta per Round: percependo entro 2 Q e senza ostacoli il cadavere di un umanoide morto per violenza da meno di un minuto (Morto davvero, non Svenuto/0 PV/Morente), fa comparire uno Spettro a PV/PM pieni entro 1 Q. Al massimo due Spettri vincolati; il nuovo non agisce nel Round di creazione. Ogni vincolo è un effetto mistico di potenza 6 (Negare Potere col confronto ordinario). Ogni Spettro vale 30 PX a parte (§9.3).', risorsa: '6 PM', azioni: { principali: 1 }, usi: { quanti: 1, per: 'Round' } },
      { nome: 'Sensibilità solare', effetto: 'Come lo Spettro: −2 VA agli attacchi e a Percezione visiva al sole diretto.' },
      NONMORTO, SCUROVISIONE,
    ],
    note: 'Presenza incorporea: nessun movimento a terra (vola). Per parare il Tocco serve un’arma magica o uno scudo con componente magica. Parte senza servitori. Nessuna dotazione né Parata naturale. Comportamento: separa i nemici; sotto 12 PV o a Ferita Seria si ritira.',
  },
  {
    id: 'mummia', nome: 'Mummia',
    caratteristiche: { FOR: 7, DES: 3, COS: 7, INT: 4, SAG: 5, CAR: 6 },
    pv: 44, pm: 12, ar: { totale: 4, magica: 0 }, difese: 8, iniziativa: -2,
    movimento: { passo: 4, corsa: 8, scatto: 12 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 7, volonta: 12, magia: 12 },
    attacchi: [r('Pugno funerario', 13, '1d8+2', 'Magico', 1)],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Percezione', va: 10 }, { nome: 'Occultismo', va: 10 }],
    gs_px: { gs: 'Veterano', px: 50, per_pg: 4 },
    capacita: [
      { nome: 'Sguardo terribile', effetto: '1 AzP e 2 PM: una creatura cosciente entro 6 Q che la Mummia vede e che può vederne il volto. PS Volontà senza modificatore: fallimento o Maldestro → Terrorizzato per 1 Round. Nessuna Parata, Schivata o Elusione. Un successo (o la rimozione dello Stato) dà immunità allo Sguardo di quella Mummia per 24 ore.', risorsa: '2 PM', azioni: { principali: 1 } },
      { nome: 'Marciume della tomba', effetto: 'Una volta per Round potenzia il Pugno con 2 PM: dopo almeno 1 danno finale a un vivente, Tempra senza modificatore; fallimento o Maldestro contrae il Marciume (malattia mistica Pericolosità IV). Finché è attiva, ogni recupero di PV del bersaglio è dimezzato per eccesso. Ogni 24 ore Tempra: successo termina, fallimento 1d4 danni diretti. Cura Malattie (liv. 6) la elimina; uccidere la Mummia non la rimuove.', risorsa: '2 PM' },
      { nome: 'Vulnerabilità al Fuoco', effetto: 'Raddoppia la componente di danno Fuoco dopo Difese e riduzioni e prima dell’AR (anche il danno di Incendiato). Altri componenti non raddoppiano; nessuna vulnerabilità a Laser, Plasma o luce ordinaria.' },
      NONMORTO, SCUROVISIONE,
    ],
    note: 'AR 4 intrinseca. Nelle AzP al massimo un Pugno e uno Sguardo per Round. Non para naturalmente; bende e amuleti non sono equipaggiamento recuperabile. Comportamento: difende un luogo o una consegna; davanti al fuoco cerca copertura.',
  },
  {
    id: 'progenie-vampirica', nome: 'Progenie vampirica',
    caratteristiche: { FOR: 7, DES: 7, COS: 7, INT: 5, SAG: 5, CAR: 6 },
    pv: 50, pm: 12, ar: { totale: 3, magica: 0 }, difese: 12, iniziativa: 2,
    movimento: { passo: 6, corsa: 12, scatto: 18 }, spazio: '1 Q',
    azioni: { principali: 2, movimento: 1 }, salvezze: { tempra: 12, riflessi: 12, volonta: 11, magia: 11 },
    attacchi: [r('Artigli', 13, '1d6+1', 'Naturale', 1), r('Morso', 13, '1d6+2', 'Naturale', 1, { note: 'Costa anche 2 PM: dopo il danno recupera i PV sottratti, max 4. Solo contro vivente consenziente, Svenuto o Immobilizzato.' })],
    abilita: [{ nome: 'Corpo a corpo', va: 13 }, { nome: 'Furtività', va: 13 }, { nome: 'Percezione', va: 12 }, { nome: 'Atletica', va: 12 }, { nome: 'Raggirare', va: 11 }],
    gs_px: { gs: 'Eroe', px: 70, per_pg: 4 },
    capacita: [
      { nome: 'Presa e Morso', effetto: 'Può Immobilizzare con Corpo a corpo 13 al posto del danno degli Artigli. Morde solo un vivente consenziente, Svenuto o Immobilizzato con il collo accessibile. Al massimo un Morso per Round; l’altra AzP per Artigli, presa o Difesa.' },
      { nome: 'Nutrimento', effetto: 'Il Morso costa 2 PM (prima del tiro): dopo il danno finale recupera tanti PV quanti ne ha sottratti, massimo 4, senza superare il massimo. Se la vittima era già a 0 PV non recupera. Non riduce i PV massimi, non cura Ferite e non trasforma la vittima.', risorsa: '2 PM' },
      { nome: 'Carne resistente', effetto: 'Dimezza per eccesso il danno Naturale dopo le Difese e prima dell’AR; Magico ed Etereo pieni. Non è immune alle armi comuni.' },
      { nome: 'Rigenerazione', effetto: 'A inizio della propria Iniziativa recupera 4 PV senza Azioni o PM, solo con almeno 1 PV, non Morente e non esposta a sole diretto o acqua corrente. Almeno 1 danno finale Etereo blocca il recupero alla Iniziativa successiva. A 0 PV non rigenera.' },
      { nome: 'Sole e acqua corrente', effetto: 'Al sole diretto, a inizio Iniziativa 1d6 Etereo diretto e −4 VA a tutte le Prove di Abilità finché esposta. Se termina l’Iniziativa immersa in acqua corrente, 2d4 Eterei diretti. Luce Mistica, torce, pioggia e schizzi non bastano.' },
      { nome: 'Invito e paletto', effetto: 'Non attraversa la soglia di una dimora abitata senza l’invito cosciente di un occupante. Una Progenie già Svenuta nel proprio rifugio può essere distrutta con un paletto di legno nel cuore (un minuto ininterrotto, accesso al torace): eccezione di distruzione diretta, non un colpo in combattimento.' },
      { nome: 'Arrampicata', effetto: 'Percorre pareti e soffitti a 4 Q per AzM senza Prova, con almeno tre arti in appoggio; niente Corsa o Scatto in questa modalità. Non è teletrasporto e non ignora gli Attacchi di Opportunità.' },
      NONMORTO, SCUROVISIONE,
    ],
    note: 'AR 3 intrinseca. Non è incorporea e non attraversa pareti o porte. Nessuna dotazione né Parata naturale. Il legame con un signore non dà controllo mentale o immunità. Comportamento: isolamento, presa e vie verticali; davanti a sole o acqua cerca riparo.',
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
    immunita: ['sanguinamento'],
    note: c.note,
  };
}

const base = new URL('../esempi/nemici/mostri/', import.meta.url);
let scritti = 0;
for (const c of CREATURE) {
  await writeFile(new URL(`${c.id}.json`, base), `${JSON.stringify(profilo(c), null, 2)}\n`);
  scritti += 1;
}
console.log(`${scritti} profili del blocco «Non morti» scritti in esempi/nemici/mostri/`);

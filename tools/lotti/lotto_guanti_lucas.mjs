// Lotto 2 della ricognizione del 01/11/2026 (docs/diff-talenti-054-2026-11-01.md, docs/diff-guanti-lucas-2026-11-01.md):
// i Guanti da Combattimento Mistico riscritti. Fonte: scheda «Guanti mistici di Lucas» 1.0 di Davide (Word del 31/10/2026,
// 12:37, «Regole approvate il 31 ottobre 2026»), con Armamenti 0.74 §7.24, Equipaggiamento 0.30 §10.6–10.7 e Magia 1.11
// §26.6.2, che riportano lo stesso testo. Scrive soltanto la voce «guanti-da-combattimento-mistico» di
// data/equipaggiamento/artefatti.json.
//
//  - Potenza Rara, Grado III, SnT 3; riserva di Cariche Rosse da 10 PM, proprietà Esclusive.
//  - Nessun bonus passivo: «Non c'è un bonus magico sempre attivo» (scheda); spariscono i due effetti «attacco» +1 VA
//    (pugni e contatto degli Incantesimi) che la voce aveva dal 12/10.
//  - Pugno mistico (attivazione_artefatto): 2 PM, 1 AzP, 5 Round, +1 VA ai pugni, danno Magico e +1.
//  - Getto di fuoco e Doppio getto (getti_artefatto): istantanei, dalla riserva interna; A.175: proprietà attive, non
//    incantesimi del catalogo.
//
// Uso: node tools/lotti/lotto_guanti_lucas.mjs [--scrivi]   (senza --scrivi dice soltanto cosa cambierebbe)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(R, 'data/equipaggiamento/artefatti.json');
const ID = 'guanti-da-combattimento-mistico';
const FONTE = 'Scheda «Guanti mistici di Lucas» 1.0 (31/10/2026); Armamenti 0.74 §7.24; Magia 1.11 §26.6.2';

const f = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const i = f.oggetti.findIndex((o) => o.id === ID);
if (i < 0) throw new Error(`${ID}: voce non trovata in artefatti.json`);
const prima = f.oggetti[i];

const linea = { forma: 'linea', lunghezza_q: 2, larghezza_q: 1, partenza: 'dalla casella adiacente al portatore' };
const getto = {
  pm: 5, azione: '1 AzP', mani_libere: 1, getti: 1, prova_potere: null,
  area: linea, danno: '1d6+4', natura: 'Naturale', proprieta_danno: ['Fuoco'],
  // §5.24: dopo il danno residuo e l'eventuale Ignifugo, PS Riflessi con modificatore della fonte 0 per evitare Incendiato
  incendiato: { salvezza: 'riflessi', modificatore: 0 },
};

const dopo = {
  ...prima,
  note_manuale: 'Una coppia di guanti di cuoio morbido con innesti dorati e cristallo Rosso. Costituisce un solo Artefatto Mistico e un solo oggetto d’inventario. Potenza Rara, Grado III, SnT 3; Qualità fisica Non comune, PS Integrità 12, 4 PI, peso 0,5 kg. Riserva di 10 PM Rossi condivisa dalle due mani; le proprietà sono Esclusive: si pagano soltanto con i PM interni dei guanti. Indossati occupano 0 mani. I pugni usano Corpo a corpo (FOR), portata 1 Q e il normale danno senz’armi del personaggio. Non c’è un bonus magico sempre attivo. Per il Getto serve una mano libera; per il Doppio getto entrambe.',
  paragrafo: 'Scheda «Guanti mistici di Lucas» 1.0; Armamenti §7.24; Equipaggiamento §10.6–10.7; Magia §26.6.2; Giocatore §5.13, §5.24',
  versione_manuale: 'Scheda dei Guanti di Lucas 1.0 (31/10/2026) / Armamenti 0.74 / Equipaggiamento 0.30 / Magia 1.11 / Giocatore 0.54',
  artefatto: {
    ...prima.artefatto,
    potenza: 'Rara',
    grado: 'III',
    sintonizzazione: 3,
    contenitore: { energia: 'Rosso', capacita_pm: 10, integrato: true, riserva: 'cariche', alimentazione: 'esclusiva' },
  },
  // «Non c'è un bonus magico sempre attivo» (scheda 1.0): nessun effetto passivo. Un test fallisce se ne torna uno
  // (tests/guanti-lucas.test.js).
  effetti: [],
  attivazione_artefatto: {
    nome: 'Pugno mistico',
    pm: 2,
    azione: '1 AzP',
    durata: '5 RND',
    attacchi: 'senz_armi',
    va: 1,
    danno: 1,
    natura: 'Magico',
    condizione: 'Automatico. Per 5 Round: +1 VA ai pugni, danno Magico e +1 danno. Non si trasferisce a calci, armi impugnate, attacchi richiesti dagli Incantesimi o danni degli Incantesimi, né ai getti. Una nuova attivazione rinnova la durata senza sommare i bonus. Magico non significa ignorare l’Armatura.',
    fonte: FONTE,
  },
  getti_artefatto: [
    {
      id: 'getto-di-fuoco', nome: 'Getto di fuoco', ...getto,
      condizione: 'Automatico, senza Potere, senza Concentrazione. Linea retta di 2 × 1 Q dalla casella adiacente: investe tutti i bersagli nel primo e nel secondo Q, alleati compresi; il primo bersaglio non interrompe il getto, un ostacolo solido sì. 1d6+4 danni Naturali con proprietà Fuoco, senza FOR né i bonus del Pugno mistico.',
      fonte: FONTE,
    },
    {
      id: 'doppio-getto', nome: 'Doppio getto', ...getto,
      pm: 10, mani_libere: 2, getti: 2,
      prova_potere: { abilita: 'Potere', modificatore: -2 },
      pm_anche_se_fallisce: true,
      condizione: 'Due getti, uno per mano, 5 PM ciascuno. Le due linee di 2 × 1 Q si dichiarano prima della Prova e possono coincidere o avere direzioni diverse. Con successo partono entrambi; i 10 PM si consumano al tentativo anche se la Prova fallisce. Si tira il danno una volta per getto; Elusione e Armatura separate per getto e bersaglio; una sola PS Riflessi per Incendiato per bersaglio e attacco.',
      fonte: FONTE,
    },
  ],
  // lo scrive la scheda 1.0: «Le viste Armamenti e Artefatti dell'app si riferiscono alla stessa istanza»
  _nota_lucas: 'Scheda 1.0 del 31/10/2026: l’energia presente si registra secondo lo stato effettivo di campagna, senza ricarica automatica; la ricarica segue le riserve mistiche Rosse (Batterie Mistiche), senza NEC, UE o trasformatori. Esempi a riserva piena: cinque Pugni mistici, due Getti singoli, un Doppio getto; un Getto e due Pugni lasciano 1 PM.',
};

const cambia = (k) => JSON.stringify(prima[k]) !== JSON.stringify(dopo[k]);
const chiavi = [...new Set([...Object.keys(prima), ...Object.keys(dopo)])].filter(cambia);
console.log(chiavi.length ? `Campi che cambiano: ${chiavi.join(', ')}` : 'Nessun cambio: la voce è già quella della scheda 1.0');
f.oggetti[i] = dopo;
if (process.argv.includes('--scrivi')) {
  fs.writeFileSync(FILE, `${JSON.stringify(f, null, 2)}\n`);
  console.log('scritto data/equipaggiamento/artefatti.json');
}

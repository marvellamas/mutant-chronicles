// Lotto 171 (04/11/2026): la revisione «Cariche Mistiche» approvata da Davide il 02/11/2026 (per-davide.md, sezione 7;
// Armamenti 0.74 §7.5.1 e Equipaggiamento-Armamenti «Ricaricare le Cariche Mistiche Rosse integrate»; scheda dei Guanti di
// Lucas 1.0 del 02/11 16:23; CyberArma per Dimitri 1.0 del 02/11 16:15) e le risposte A.232, A.234, A.236, A.237.
//
// Che cosa scrive:
//  - regole.json → chroma.cariche_mistiche: sigla, nome, ricarica (CM mancanti × 2 × rapporto), un gruppo = 1 CM;
//  - le riserve dedicate ai soli effetti di armi e oggetti passano da PM a CM (contenitore.capacita_cm al posto di
//    capacita_pm, con la capacità di prima in contenitore.precedente per convertire i salvataggi una volta sola, A.193):
//      Guanti da Combattimento Mistico 10 PM → 6 CM Rosse (Pugno 1 CM, Getto 3 CM, Doppio getto 6 CM);
//      CyberArma con batteria Verde 10 PM → 5 CM Verdi, esclusiva (1 CM per 10 Round; resta l'alternativa dei PM personali);
//      Bordone Templare, Vindicator, Deliverer, Castigator, Demontooth, Scudo delle Guardie Sacre 5 PM → 5 CM Rosse;
//  - restano in PM (la revisione: «Le Batterie Mistiche conservano PM»): Batterie, Batterie Matrice, Schegge instabili e la
//    Pietra della Vigilanza (Batteria Universale: la revisione non la nomina, resta com'è);
//  - A.237: la CyberArma convertita a NeC ha un NEC Rosso da 10 cariche come alimentazione (contatore nell'Inventario),
//    una carica per attivazione.
//
// Uso: node tools/lotti/lotto_171_cariche_mistiche.mjs [--scrivi]   (senza --scrivi dice soltanto cosa cambierebbe)
// Rilanciabile: legge i valori di prima dalla voce stessa (precedente) se è già stata convertita.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (f) => JSON.parse(fs.readFileSync(join(R, f), 'utf8'));
const SCRIVI = process.argv.includes('--scrivi');
const scrivi = (f, x) => { if (SCRIVI) fs.writeFileSync(join(R, f), `${JSON.stringify(x, null, 2)}\n`); };
const FONTE = 'Revisione «Cariche Mistiche» approvata da Davide il 02/11/2026 (per-davide.md, sezione 7); Armamenti 0.74 §7.5.1';
const cambi = [];

/** Contenitore in CM: capacità nuova, capacità di prima in PM (per la frazione della A.193). */
function inCm(c, cm, nota) {
  const prima = c.precedente?.capacita_pm ?? c.capacita_pm;
  const { capacita_pm: _via, ...resto } = c;
  const nuovo = { ...resto, capacita_cm: cm, riserva: 'cariche', alimentazione: 'esclusiva', precedente: { capacita_pm: prima, unita: 'PM', nota } };
  if (JSON.stringify(nuovo) !== JSON.stringify(c)) cambi.push(`${nota}: ${prima} PM → ${cm} CM`);
  return nuovo;
}

// --- regole
const regole = leggi('data/regole.json');
regole.chroma.cariche_mistiche = {
  _nota: `${FONTE}. «Le riserve dedicate ai soli effetti di armi e oggetti si chiamano Cariche Mistiche (CM), con contatore CM attuali/CM massime: non alimentano Incantesimi e non sono prelevabili come PM personali. Il nome non cambia le cariche tecnologiche NEC, CEC, MEC o BEC.» Le Batterie Mistiche conservano PM.`,
  sigla: 'CM',
  nome: 'Cariche Mistiche',
  ricarica: {
    fattore: 2,
    pm_per_gruppo: 'rapporto × fattore',
    gruppo_cm: 1,
    testo: 'PM personali = CM mancanti × 2 × rapporto di conversione: 6 PM per CM a 3:1, 4 a 2:1, 2 a 1:1. Un gruppo ripristina 1 CM; più gruppi, una sola Prova di Potere come per le Batterie. Il ×2 non vale per le Batterie in PM né per gli accumulatori tecnologici.',
    fonte: 'Revisione «Cariche Mistiche» (02/11/2026); Armamenti 0.74, «Ricaricare le Cariche Mistiche Rosse integrate»',
  },
  conversione_salvataggi: 'A.193: CM nuove = valore di prima / capacità di prima × capacità nuova, una volta sola, senza arrotondare per eccesso; il valore di prima resta nel file (sessione.chroma[uid].prima).',
};

// --- artefatti.json: Guanti e catalogo delle riserve integrate
const art = leggi('data/equipaggiamento/artefatti.json');
const g = art.oggetti.find((o) => o.id === 'guanti-da-combattimento-mistico');
g.artefatto.contenitore = inCm(g.artefatto.contenitore, 6, 'Guanti da Combattimento Mistico');
const { pm: _p, ...att } = g.attivazione_artefatto;
g.attivazione_artefatto = { ...att, cm: 1 };
// Getto singolo 3 CM, Doppio getto 6 CM (le 6 CM si spendono al tentativo anche se fallisce)
const CM_GETTI = { 'getto-di-fuoco': 3, 'doppio-getto': 6 };
g.getti_artefatto = g.getti_artefatto.map(({ pm: _q, pm_anche_se_fallisce: falli, ...x }) => ({ ...x, cm: CM_GETTI[x.id], ...(falli || x.cm_anche_se_fallisce ? { cm_anche_se_fallisce: true } : {}) }));
for (const x of g.getti_artefatto) {
  if (x.id === 'doppio-getto') x.condizione = 'Due getti, uno per mano, 3 CM ciascuno. Le due linee di 2 × 1 Q si dichiarano prima della Prova (Potere −2 VA, senza i benefici del lancio degli Incantesimi: A.234) e possono coincidere o avere direzioni diverse. Con successo partono entrambi; le 6 CM si consumano al tentativo anche se la Prova fallisce. Si tira il danno una volta per getto; Elusione e Armatura separate per getto e bersaglio; una sola PS Riflessi per Incendiato per bersaglio e attacco.';
}
g.note_manuale = g.note_manuale.replace(/Riserva di 10 PM Rossi condivisa dalle due mani; le proprietà sono Esclusive: si pagano soltanto con i PM interni dei guanti\./, 'Riserva di 6 Cariche Mistiche Rosse (CM) condivisa dalle due mani; le proprietà sono Esclusive: si pagano soltanto con le CM interne dei Guanti.');
g._nota_lucas = 'Scheda 1.0, revisione «Cariche Mistiche» del 02/11/2026: le CM attuali dipendono dallo stato di campagna, nessuna ricarica automatica. Ricarica: CM mancanti × 2 × rapporto (Guanti vuoti a 3:1: 36 PM). A piena riserva: sei Pugni mistici, due Getti singoli oppure un Doppio getto; un Getto e due Pugni lasciano 1 CM.';
g.versione_manuale = 'Scheda dei Guanti di Lucas 1.0 (02/11/2026 16:23, Cariche Mistiche) / Armamenti 0.74 / Equipaggiamento 0.30 / Magia 1.11 / Giocatore 0.54';

const NOMI = {
  'armi_corporative:bordone-templare': 'Bordone Templare', 'armi_corporative:spada-vindicator': 'Spada Vindicator',
  'armi_corporative:spada-deliverer': 'Spada Deliverer', 'armi_corporative:lancia-castigator': 'Lancia Castigator',
  'armi_corporative:lama-demontooth': 'Lama Demontooth', 'scudi:scudo-delle-guardie-sacre': 'Scudo delle Guardie Sacre',
};
for (const a of art.artefatti_catalogo) {
  if (NOMI[a.rif]) a.contenitore = inCm(a.contenitore, 5, NOMI[a.rif]);
  if (a.rif === 'armi:cyberarma-batteria-verde') a.contenitore = inCm(a.contenitore, 5, 'CyberArma con batteria Verde');
}
scrivi('data/equipaggiamento/artefatti.json', art);

// --- armi corporative e scudo: il testo delle attivazioni (Armamenti 0.74: «riserva 5 CM, 1 CM per attivazione»)
const testo = (s) => (typeof s === 'string' ? s.replace(/\+1d6 Magico; 5 PM; Sintonizzazione 2/g, '+1d6 Magico; riserva 5 CM, 1 CM per attivazione; Sintonizzazione 2')
  .replace(/Chroma Rosso da 5 PM/g, 'riserva Rossa da 5 CM').replace(/1 AzP e 1 PM della riserva/g, '1 AzP e 1 CM della riserva')
  .replace(/La riserva è un Chroma Rosso da 5 PM/g, 'La riserva contiene 5 CM Rosse') : s);
const ritesta = (x) => (Array.isArray(x) ? x.map(ritesta) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, ritesta(v)])) : testo(x));
for (const [file, ids] of [['armi_corporative', ['bordone-templare', 'spada-vindicator', 'spada-deliverer', 'lancia-castigator', 'lama-demontooth']], ['scudi', ['scudo-delle-guardie-sacre']]]) {
  const f = leggi(`data/equipaggiamento/${file}.json`);
  f.oggetti = f.oggetti.map((o) => (ids.includes(o.id) ? ritesta(o) : o));
  scrivi(`data/equipaggiamento/${file}.json`, f);
}

// --- CyberArma (A.236, A.237)
const armi = leggi('data/equipaggiamento/armi.json');
const bv = armi.oggetti.find((o) => o.id === 'cyberarma-batteria-verde');
bv.effetto_breve = 'Originale con riserva interna Verde da 5 Cariche Mistiche, esclusiva dell’arma (1 CM per 10 Round, cinque attivazioni), SnT 2 complessiva; resta l’alternativa dei PM personali.';
bv._nota_batteria = 'Revisione «Cariche Mistiche» (02/11/2026) e A.236: riserva interna Verde da 5 CM, dedicata esclusivamente alla CyberArma: non paga Incantesimi, altre capacità, altri oggetti e non si converte in PM personali. Per il Tecnomante 1 CM e 1 AzP manifestano l’arma per 10 Round (cinque attivazioni); resta il profilo da 2 PM personali. L’installazione va fatta e confermata: il progetto iniziale dei tre giorni di Dimitri non la comprende. Ricarica a 3:1: 30 PM da vuota. Prezzo indicativo: predisposizione 1.000 cr + batteria 2.000 cr.';
for (const c of bv.uso_per_classe.classi) {
  if (c.classe === 'Tecnomante') { c.cm = 1; c.testo = 'Tecnomante (SnT 2): 1 AzP e 1 CM della riserva interna, oppure 2 PM personali; lama stabile per 10 Round, senza Concentrazione; 1d8 Magico più i modificatori pertinenti (revisione «Cariche Mistiche», A.236).'; }
  if (c.classe === 'Custode') c.testo = 'Custode (SnT 1): evoca l’Arma Astrale per 1 PM personale e 15 Round, includendo l’evocazione nell’Azione del primo attacco, +1 al danno (Maestro d’Arma). Danno base e altri benefici seguono il Grado e i Talenti del Custode (Giocatore §3.9.2). Pagare con la riserva interna in CM: la revisione non dà il costo per il Custode (TODO(Davide) A.251).';
}
const nec = armi.oggetti.find((o) => o.id === 'cyberarma-nec');
nec.alimentazione = { nec: 'nec:nec-rosso-10', usi: 10, unita_usi: 'cariche', descrizione: 'NEC Rosso da 10 cariche: una carica per attivazione (1 AzP, 10 Round), non per attacco; la carica residua resta al NEC. Sostituzione e ricarica secondo le regole dei NEC e la A.215. Non converte cariche tecnologiche in PM o in energia mistica.', paragrafo: 'A.237 (Davide, 02/11/2026); Armamenti 0.74 §7.25' };
nec._nota_nec = 'A.237 (Davide, 02/11/2026): configurazione ordinaria con un NEC Rosso da 10 cariche; ogni attivazione richiede 1 AzP e una carica e mantiene la manifestazione per 10 Round: dieci cariche, dieci attivazioni. SnT 3 complessiva. Le conversioni non danno il +1 danno di Maestro d’Arma né i benefici del Custode. Prezzo indicativo della conversione: 2.000 cr, NEC escluso.';
scrivi('data/equipaggiamento/armi.json', armi);

scrivi('data/regole.json', regole);
console.log(cambi.join('\n') || 'già convertite');
if (!process.argv.includes('--scrivi')) console.log('(prova: per scrivere, --scrivi)');

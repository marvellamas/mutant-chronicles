// Risposte di Davide del 03/10/2026 (E&L, «Risposte approvate ai 6 nuovi quesiti dell'app e punti Abilità liberi»;
// docs/risposte-master.md, 3 ottobre 2026): la parte del catalogo dell'equipaggiamento.
// - A.83 Reperibilità Epica: EP fra Molto Rara e Leggendaria, Oratoria −6 VA quando esiste una possibilità concreta di
//   reperimento; Leggendaria senza penalità standard (decide il Direttore). Scala della ricerca nei dati:
//   index.json → reperibilita[REP].prova = { abilita, va } oppure null (nessuna Prova). Le Batterie Matrice colorate
//   restano Epiche; le Bianche mantengono la disponibilità eccezionale.
//   node tools/lotti/lotto_risposte_0310.mjs           → controlli e prova a vuoto
//   node tools/lotti/lotto_risposte_0310.mjs --scrivi  → scrive index.json (idempotente)
import { readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../../', import.meta.url);
const p = new URL('data/equipaggiamento/index.json', R);
const ind = JSON.parse(readFileSync(p, 'utf8'));
const scrivi = process.argv.includes('--scrivi');
const EL = 'E&L del 03/10/2026, A.83; Equipaggiamento §§1.8 e 10.3, Armamenti §7.1.8, Magia §26.4';
let controlli = 0;
const verifica = (cond, msg) => { if (!cond) throw new Error(`controllo: ${msg}`); controlli++; };

// scala della ricerca dell'offerta (E&L A.83), nell'ordine di rarità
const SCALA = {
  CO: { nome: 'Comune', ricerca: 'Nessuna Prova presso un venditore appropriato.', prova: null },
  NC: { nome: 'Non comune', ricerca: 'Oratoria senza penalità.', prova: { abilita: 'Oratoria', va: 0 } },
  RA: { nome: 'Rara', ricerca: 'Oratoria −2 VA.', prova: { abilita: 'Oratoria', va: -2 } },
  MR: { nome: 'Molto rara', ricerca: 'Oratoria −4 VA.', prova: { abilita: 'Oratoria', va: -4 } },
  EP: { nome: 'Epica', ricerca: 'Oratoria −6 VA, se esiste una possibilità concreta di reperimento.', prova: { abilita: 'Oratoria', va: -6, condizione: 'se il Direttore stabilisce che esiste una possibilità concreta di reperimento' }, fonte: EL },
  LE: { nome: 'Leggendaria', ricerca: 'Disponibilità eccezionale stabilita dal Direttore; nessuna penalità standard di ricerca.', prova: null, fonte: EL },
};
verifica(Object.keys(ind.reperibilita).filter((k) => !k.startsWith('_')).every((k) => SCALA[k]), 'le sigle di index.json sono quelle della scala');
const nuova = {};
for (const [k, v] of Object.entries(SCALA)) nuova[k] = v;
ind._nota_ricerca = 'E&L A.83: per gli Artefatti non esistono normali negozi; il Direttore stabilisce prima che sia possibile trovare un’offerta o una commissione, poi la Prova serve a individuare quel contatto. Un successo non obbliga a vendere, non crea un oggetto indisponibile e non elimina prezzo, autorizzazioni o tempi di produzione. La REP non modifica Qualità, Integrità o Grado mistico.';
ind.reperibilita = nuova;
verifica(!JSON.stringify(ind.reperibilita).includes('TODO('), 'nessun TODO nella scala');
console.log(`${controlli} controlli superati; scala: ${Object.entries(SCALA).map(([k, v]) => `${k} ${v.prova ? `${v.prova.abilita} ${v.prova.va}` : '—'}`).join(', ')}`);
if (scrivi) { writeFileSync(p, `${JSON.stringify(ind, null, 2)}\n`); console.log('scritto'); }

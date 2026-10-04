// Effetti degli impianti al tavolo (censimento del 04/10/2026, docs/censimento-impianti.md).
//   node tools/lotti/lotto_effetti_impianti.mjs            prova a vuoto
//   node tools/lotti/lotto_effetti_impianti.mjs --scrivi   scrive data/equipaggiamento/impianti.json (idempotente)
// - «se»: forma breve della condizione degli effetti situazionali, per la nota «+2 se …» accanto al valore
//   (tab Abilità, «Attacca!», foglio 2 della SS); la frase intera resta in «condizione»;
// - Braccio potenziato: il +1 danno vale «agli attacchi ravvicinati effettuati con quell’arto» (§7.5), quindi è
//   situazionale (casella in «Attacca!»), non generale;
// - «attivabile»: iniettori a cartucce (§7.9, «Somministra»), Processore neurale (§7.10, «Attiva» del chip,
//   durata e intervallo in regole.json → impianti.chip), promemoria dell'Azione per visione, comunicatore,
//   registratore e microattrezzi (§7.4, §7.8). Le frasi sono del manuale (tools/verifica_frasi.mjs).
import { readFileSync, writeFileSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const scrivi = process.argv.includes('--scrivi');
const p = new URL('data/equipaggiamento/impianti.json', RADICE);
const j = JSON.parse(readFileSync(p, 'utf8'));

const SE = {
  sensori_vista: 'con la vista',
  sensori_udito: 'con l’udito',
  chip_processore: 'con il chip attivo',
  colpo_assistito: 'con il braccio potenziato',
};
const VISIONE = 'Attivare, disattivare o cambiare una modalità di visione richiede 1 AzP; mantenerla non richiede Azioni.';
const INIETTORE = [
  'Somministra al portatore una cartuccia scelta con 1 AzP, senza Prova e senza usare le mani. Richiede che il personaggio sia cosciente.',
  'Il caricatore contiene una combinazione libera fino a cinque cartucce. Rifornirlo richiede un minuto, con impianto disattivato e sportello accessibile, senza chirurgia.',
];
const ATTIVAZIONI = {
  'visione-notturna': { tipo: 'promemoria', azione: '1 AzP', frasi: ['Entro 80 Q elimina le penalità per scarsa illuminazione. Richiede luce ambientale residua.', VISIONE],
    'TODO(Davide)': 'A.106: il Manuale del Giocatore non dà un valore per le penalità da scarsa illuminazione; finché manca, la visione notturna resta un promemoria senza numero.' },
  'visione-termica': { tipo: 'promemoria', azione: '1 AzP', frasi: ['Entro 40 Q osserva e prende di mira bersagli con sufficiente contrasto termico, anche nel buio naturale completo.',
    'La termica ignora il −4 VA della Fumogena standard se distingue il bersaglio, ma non vede attraverso coperture solide e non identifica automaticamente persone o creature nascoste.', VISIONE] },
  'comunicatore-impiantato': { tipo: 'promemoria', azione: '1 AzP', frasi: ['Accendere, spegnere o cambiare canale richiede 1 AzP.'] },
  'registratore-audiovisivo-impiantato': { tipo: 'promemoria', azione: '1 AzP', frasi: ['Avviare o interrompere una registrazione richiede 1 AzP.'] },
  'microattrezzi-integrati': { tipo: 'promemoria', azione: '1 AzP', frasi: ['Estrarli o riporli richiede 1 AzP. Durante il lavoro la mano è impegnata; Prove e tempi dell’intervento restano ordinari.'] },
  'iniettore-sanitario-impiantato': { tipo: 'cariche', azione: '1 AzP', frasi: INIETTORE },
  'iniettore-sanitario-d-emergenza': { tipo: 'cariche', azione: '1 AzP', frasi: [
    'Comprende la funzione precedente e somministra automaticamente un’emostatica o una coagulante quando il portatore subisce Sanguinamento.', ...INIETTORE] },
  'processore-neurale-di-abilita': { tipo: 'chip', azione: '1 AzP', frasi: [
    'Un solo chip attivo alla volta. Attivarlo richiede 1 AzP e il bonus dura 30 minuti consecutivi. Sostituirlo con un ricambio accessibile richiede 1 AzP; rimuoverlo interrompe l’effetto e fa perdere la durata restante.',
    'Il Processore consente una sola attivazione ogni 24 ore, conteggiate dal momento dell’attivazione precedente. Cambiare chip o interrompere anticipatamente l’effetto non azzera il conteggio. Trascorse le 24 ore torna utilizzabile, senza condizioni legate al riposo.',
  ] },
};

const base = (id) => id.replace(/-cybertronic$/, '');
let nSe = 0;
let nAtt = 0;
for (const o of j.oggetti) {
  for (const e of o.effetti ?? []) {
    // §7.5: il +1 danno vale soltanto con l'arto potenziato
    if (e.beneficio === 'colpo_assistito') e.ambito = 'situazionale';
    if (e.ambito === 'situazionale' && SE[e.beneficio]) { e.se = SE[e.beneficio]; nSe++; }
  }
  const a = ATTIVAZIONI[base(o.id)];
  if (a) { o.attivabile = structuredClone(a); nAtt++; } else delete o.attivabile;
  delete o.attivazione;
}
console.log(`${j.oggetti.length} impianti: «se» su ${nSe} effetti situazionali, «attivabile» su ${nAtt} impianti; +1 danno del Braccio potenziato situazionale`);
if (scrivi) { writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`); console.log('scritto'); }

// A.188 (Davide, 28/10/2026): il giocatore cambia da sé anche gli incantesimi conservati, ma quote, famiglie accessibili,
// livello massimo e requisiti valgono (riportati al blocco che il lotto 131 aveva reso un avviso). Il Direttore può
// sempre forzare, con conferma e registrazione. Ogni aggiunta, rimozione o sostituzione resta nello storico del
// personaggio con la data, l'ora e da dove è stata fatta. Gli incantesimi aggiunti a mano e quelli degli artefatti
// restano fuori dalle quote (A.176 è un lotto a parte); le Tecniche Interiori conservate seguono la procedura già approvata.
// Funzioni pure; il conto delle quote è uno solo (src/quote-incantesimi.js, src/avanzamento.js → controllaIncantesimi).
import { erroriScelteSuccessive } from './avanzamento.js';

const due = (n) => String(n).padStart(2, '0');

/** «28/10 21:40» (ora del dispositivo). */
export const dataOra = (adesso = new Date()) => `${due(adesso.getDate())}/${due(adesso.getMonth() + 1)} ${due(adesso.getHours())}:${due(adesso.getMinutes())}`;

/** Da dove viene la modifica: «tablet» (un dispositivo in rete), «PC» (la pagina sul PC del server), «Direttore» (modalità master), «app» (senza server). */
export function sorgenteModifica({ server = false, daQuestoPc = false, master = false } = {}) {
  if (master) return 'Direttore';
  if (!server) return 'app';
  return daQuestoPc ? 'PC' : 'tablet';
}

/** «Sostituito Colpo Elementale con Dardo Mistico (tablet, 28/10 21:40)». */
export const rigaIncantesimi = (testo, sorgente, adesso = new Date()) => `${testo} (${sorgente}, ${dataOra(adesso)})`;

/**
 * Che cosa direbbero le regole se si sostituisse `vecchio` con `nuovo` nella voce di un livello?
 * @returns {{ ok: boolean, motivo: string|null, duplicato?: boolean }} `ok` è falso solo per una violazione che la sostituzione porta di nuovo:
 *   quello che il personaggio aveva già (un file di prima della regola) non la ferma.
 */
export function provaSostituzione(personaggio, livello, vecchio, nuovo, dati) {
  const i = livello - 2;
  const voce = personaggio.livelli?.[i];
  if (!voce || !Array.isArray(voce.incantesimi) || !voce.incantesimi.includes(vecchio) || voce.incantesimi.includes(nuovo)) return { ok: false, duplicato: true, motivo: `${nuovo} è già fra gli incantesimi del personaggio.` };
  const dopo = { ...personaggio, livelli: personaggio.livelli.map((v, k) => (k === i ? { ...v, incantesimi: v.incantesimi.map((n) => (n === vecchio ? nuovo : n)) } : v)) };
  const chiave = (e) => `${e.campo}|${e.problema}`;
  const prima = new Set(erroriScelteSuccessive(personaggio, dati).filter((e) => e.tipo === 'violazione').map(chiave));
  const nuove = erroriScelteSuccessive(dopo, dati).filter((e) => e.tipo === 'violazione' && e.campo === `livelli[${i}].incantesimi` && !prima.has(chiave(e)));
  return nuove.length ? { ok: false, motivo: nuove[0].problema } : { ok: true, motivo: null };
}

/** Gli incantesimi di Classe di un personaggio `{ creazione, livelli }` (creazione e voci dei livelli), senza ripetizioni. */
export function incantesimiDiClasse(p) {
  const tutti = [...(p?.creazione?.incantesimi ?? []), ...(p?.livelli ?? []).flatMap((v) => (Array.isArray(v?.incantesimi) ? v.incantesimi : []))];
  return [...new Set(tutti)];
}

/** Che cosa è cambiato fra due personaggi `{ creazione, livelli }`: `{ aggiunti, tolti }` (nomi). */
export function confrontaIncantesimi(prima, dopo) {
  const a = incantesimiDiClasse(prima);
  const b = incantesimiDiClasse(dopo);
  return { aggiunti: b.filter((n) => !a.includes(n)), tolti: a.filter((n) => !b.includes(n)) };
}

/**
 * Il testo per lo storico di ciò che è cambiato, «Aggiunti A, B (4° livello); tolto C», o null se non è cambiato niente.
 * `dove` si aggiunge fra parentesi (il livello, la causa). `escludi`: nomi già scritti in una riga propria.
 */
export function testoVariazioneIncantesimi({ aggiunti, tolti }, dove = '', escludi = []) {
  const a = aggiunti.filter((n) => !escludi.includes(n));
  const t = tolti.filter((n) => !escludi.includes(n));
  const parte = (v, uno, molti) => (v.length ? `${v.length === 1 ? uno : molti} ${v.join(', ')}` : null);
  const testo = [parte(a, 'Aggiunto', 'Aggiunti'), parte(t, 'Tolto', 'Tolti')].filter(Boolean).join('; ');
  return testo ? `${testo}${dove ? ` (${dove})` : ''}` : null;
}

/** Fra i nomi dati, quelli già nominati in una delle righe dello storico (per non scriverli due volte). */
export const nomiNelloStorico = (righe, nomi) => nomi.filter((n) => righe.some((r) => String(r?.testo ?? r).includes(n)));

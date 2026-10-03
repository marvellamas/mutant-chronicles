// «Prepara scontro» del Tavolo del Master (richiesta di Marcello del 03/10/2026): la bozza di uno scontro, con
// nome, note per il master, nemici (dal bestiario salvato, dalle creature pronte o da «Crea nemico») con «Quanti»
// e lato, PG facoltativi. Funzioni pure; la bozza si salva sul server in scontri/ con stato «bozza» (server.mjs),
// accanto agli scontri: gli scontri aperti la ignorano (src/ui/scontro.js → leggiScontroAperto). «Inizia» la
// trasforma in uno scontro vero con src/scontro.js: Iniziativa tirata dall'app per tutti e Round 1.
// La difficoltà per 7 PG (src/crea-nemico.js → difficolta) è solo informativa.
import { FORMATO_SCONTRO, VERSIONE_SCONTRO, nuovoScontro, aggiungiNemici, registraTiro, registraRiga } from './scontro.js';

export const STATO_BOZZA = 'bozza';
/** Una bozza eliminata: il server la sposta in scontri/archivio/ (non cancella mai). */
export const STATO_BOZZA_ELIMINATA = 'bozza-eliminata';
const ora = (adesso) => (adesso ?? new Date()).toISOString();
const uid = () => `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Identificativo di una bozza dal nome e dall'ora: «bozza-imboscata-al-porto-20261003-2130». */
export function idBozza(nome, adesso = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const parte = String(nome ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'scontro';
  return `bozza-${parte}-${adesso.getFullYear()}${p(adesso.getMonth() + 1)}${p(adesso.getDate())}-${p(adesso.getHours())}${p(adesso.getMinutes())}${p(adesso.getSeconds())}`;
}

/** Bozza nuova, vuota. */
export function nuovaBozza({ nome = '', adesso = new Date() } = {}) {
  const n = String(nome).trim() || `Scontro del ${adesso.toLocaleDateString('it-IT')}`;
  return {
    formato: FORMATO_SCONTRO, versione: VERSIONE_SCONTRO, id: idBozza(n, adesso), nome: n, stato: STATO_BOZZA,
    creato: ora(adesso), aggiornato: ora(adesso), revisione: 0, note: '', pg: [], livello: null, nemici: [],
  };
}

/** Controllo di una bozza (server e plancia); null se va bene. */
export function validaBozza(b) {
  if (b?.formato !== FORMATO_SCONTRO) return 'non è uno scontro di Mutant';
  if (!/^[a-z0-9-]{1,60}$/.test(String(b.id ?? ''))) return 'id non valido';
  if (![STATO_BOZZA, STATO_BOZZA_ELIMINATA].includes(b.stato)) return 'stato non valido';
  if (!Number.isInteger(b.revisione) || b.revisione < 0) return 'revisione non valida';
  if (typeof b.nome !== 'string' || !b.nome.trim()) return 'nome mancante';
  if (typeof (b.note ?? '') !== 'string') return 'note non valide';
  if (!Array.isArray(b.pg) || !b.pg.every((k) => typeof k === 'string')) return 'PG non validi';
  if (b.livello !== null && b.livello !== undefined && !(Number.isInteger(b.livello) && b.livello >= 1 && b.livello <= 20)) return 'livello dei PG fra 1 e 20';
  if (!Array.isArray(b.nemici)) return 'elenco dei nemici mancante';
  for (const [i, v] of b.nemici.entries()) {
    const n = v?.nemico;
    if (!n || typeof n !== 'object' || typeof n.id !== 'string' || typeof n.nome !== 'string' || !Number.isInteger(n.pv) || !Number.isInteger(n.iniziativa)) return `nemico ${i + 1}: scheda incompleta`;
    if (!Number.isInteger(v.quanti) || v.quanti < 1 || v.quanti > 30) return `${n.nome}: «Quanti» da 1 a 30`;
    if (!['avversario', 'alleato'].includes(v.lato)) return `${n.nome}: lato non valido`;
  }
  return null;
}

const tocca = (b, adesso) => ({ ...b, aggiornato: ora(adesso) });

/** Aggiunge un nemico alla bozza: { nemico (formato A.73), quanti, lato, origine: 'bestiario'|'creatura'|'crea-nemico' }. */
export function aggiungiVoce(b, { nemico, quanti = 1, lato = 'avversario', origine = 'bestiario' }, adesso) {
  if (!nemico?.id || !nemico?.nome) throw new Error('nemico non valido');
  const q = Number(quanti);
  if (!Number.isInteger(q) || q < 1 || q > 30) throw new Error('«Quanti»: da 1 a 30');
  const voce = { uid: uid(), nemico: structuredClone(nemico), quanti: q, lato: lato === 'alleato' ? 'alleato' : 'avversario', origine };
  return tocca({ ...b, nemici: [...b.nemici, voce] }, adesso);
}

/** Cambia una voce (quanti, lato o la scheda ritoccata). */
export function cambiaVoce(b, uidVoce, modifiche, adesso) {
  const v = b.nemici.find((x) => x.uid === uidVoce);
  if (!v) throw new Error('nemico non trovato nella bozza');
  const nuova = { ...v, ...modifiche };
  if (modifiche.quanti !== undefined) {
    nuova.quanti = Number(modifiche.quanti);
    if (!Number.isInteger(nuova.quanti) || nuova.quanti < 1 || nuova.quanti > 30) throw new Error('«Quanti»: da 1 a 30');
  }
  if (modifiche.nemico) nuova.nemico = structuredClone(modifiche.nemico);
  return tocca({ ...b, nemici: b.nemici.map((x) => (x.uid === uidVoce ? nuova : x)) }, adesso);
}

export function togliVoce(b, uidVoce, adesso) {
  return tocca({ ...b, nemici: b.nemici.filter((x) => x.uid !== uidVoce) }, adesso);
}

/** Nome, note, PG scelti, livello dei PG per la difficoltà. */
export function cambiaBozza(b, campi, adesso) {
  const c = { ...campi };
  if ('nome' in c) c.nome = String(c.nome ?? '').trim() || b.nome;
  if ('livello' in c) c.livello = c.livello === '' || c.livello === null ? null : Number(c.livello);
  return tocca({ ...b, ...c }, adesso);
}

/** Copia di una bozza, con un id nuovo e la revisione da capo. */
export function duplicaBozza(b, adesso = new Date()) {
  const nome = `${b.nome} (copia)`;
  return { ...structuredClone(b), id: idBozza(nome, adesso), nome, stato: STATO_BOZZA, creato: ora(adesso), aggiornato: ora(adesso), revisione: 0, nemici: b.nemici.map((v) => ({ ...structuredClone(v), uid: uid() })) };
}

/** Bozza da eliminare: il server la sposta in scontri/archivio/. */
export const eliminaBozza = (b, adesso) => ({ ...tocca(b, adesso), stato: STATO_BOZZA_ELIMINATA });

/** PG della bozza: quelli scelti, altrimenti quelli al tavolo alla partenza. */
export function pgDellaBozza(b, alTavolo) {
  if (!b.pg?.length) return alTavolo;
  return b.pg.map((k) => alTavolo.find((p) => p.chiave === k) ?? null).filter(Boolean);
}

/**
 * «Inizia»: dalla bozza uno scontro vero, aperto. I PG (vista della plancia: { chiave, nome, iniziativa, des, int })
 * entrano con l'Iniziativa della scheda; i nemici con le loro copie numerate; il dado d'Iniziativa si tira con
 * l'app per tutti (`tiro()` → { valore, origine: 'app' }); lo scontro parte dal Round 1.
 */
export function iniziaBozza(b, { id, pg, dati, tiro, adesso = new Date() }) {
  const errore = validaBozza(b);
  if (errore) throw new Error(errore);
  if (!b.nemici.length && !pg.length) throw new Error('la bozza non ha partecipanti');
  let s = nuovoScontro({ id, nome: b.nome, pg, adesso });
  if (b.note?.trim()) s = { ...s, note: b.note };
  s = registraRiga(s, `Dalla preparazione «${b.nome}».`, adesso);
  for (const v of b.nemici) s = aggiungiNemici(s, v.nemico, v.quanti, { lato: v.lato }, adesso);
  for (const p of s.partecipanti) s = registraTiro(s, p.id, 'd10', tiro(), dati, adesso);
  return s;
}

/** Riga breve di una voce: «Eretico — Élite ×3 (avversario) · PV 33 · AR 2 · Difese 13». */
export function testoVoce(v) {
  const n = v.nemico;
  return `${n.nome} ×${v.quanti} (${v.lato}) · PV ${n.pv} · AR ${n.ar?.totale ?? 0} · Difese ${n.difese ?? '—'} · Iniziativa ${n.iniziativa}`;
}

// Registro unico dei veicoli (A.91 e A.105, E&L del 05/10/2026; modello in docs/ricognizione-2026-10-05.md): un
// veicolo ha un solo record, condiviso fra le schede dei PG e il Tavolo del Master, nella cartella veicoli/ del server
// (server.mjs → /api/veicoli). Proprietario (un PG o il gruppo) distinto dal conducente attuale. Funzioni pure.
//
// Record (veicoli/<id>.json):
//   { formato: 'mutant-veicolo', versione: 1, id, revisione, aggiornato,
//     proprietario: { tipo: 'pg' | 'gruppo', pg?, chiave?, nome? },
//     conducente: { pg?, chiave, nome } | null, mitragliere: { pg?, chiave, nome } | null,
//     mezzo: { …il veicolo di src/veicoli.js: profilo o scheda, PI, rinforzi, energia, munizioni, andature… },
//     movimento: { scontro, round, da } | null }        // movimento già eseguito nel Round (A.105)
// Nel file del PG resta il riferimento { uid, rif: id, nome }. Senza server il veicolo resta nel file del PG.
// TODO(Davide) A.113: permessi (oggi il master può cambiare tutto, i PG i veicoli che vedono) e nome della struttura
// («Corpo principale» come nel Manuale dei Veicoli) sono provvisori.
import { normalizzaVeicoli, andaturaResidua } from './veicoli.js';

export const FORMATO_VEICOLO = 'mutant-veicolo';
export const VERSIONE_VEICOLO = 1;
export const ID_VEICOLO = /^vei[a-z0-9-]{2,60}$/;
const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const testo = (v) => (typeof v === 'string' ? v.trim() : '');
// stessa chiave di PG: senza maiuscole, accenti, spazi e trattini (src/cartella.js → formaNome; il nome nella scheda può
// essere «PABLO ZAION» e il file «Pablo-Zaion»)
const forma = (k) => String(k ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s_-]+/g, '');
export const stessaChiave = (a, b) => Boolean(forma(a)) && forma(a) === forma(b);
const persona = (x) => (isOggetto(x) && testo(x.chiave) ? { ...(testo(x.pg) ? { pg: x.pg } : {}), chiave: x.chiave, nome: testo(x.nome) || x.chiave } : null);

/** Riferimento che resta nel file del PG. */
export const riferimento = (rec) => ({ uid: rec.id, rif: rec.id, nome: rec.mezzo?.nome ?? rec.id });
/** Un veicolo delle scelte è un riferimento al registro? */
export const eRiferimento = (v) => isOggetto(v) && typeof v.rif === 'string' && v.rif !== '';

/** Errore di un record (testo) o null: lo usa anche il server prima di scrivere. */
export function validaRecord(r) {
  if (!isOggetto(r) || r.formato !== FORMATO_VEICOLO) return 'non è un veicolo del registro (formato «mutant-veicolo»)';
  if (!ID_VEICOLO.test(String(r.id ?? ''))) return 'identificativo non valido';
  if (!Number.isInteger(r.revisione) || r.revisione < 0) return 'revisione non valida';
  if (!isOggetto(r.proprietario) || !['pg', 'gruppo'].includes(r.proprietario.tipo)) return 'proprietario: un PG o il gruppo';
  if (r.proprietario.tipo === 'pg' && !testo(r.proprietario.pg) && !testo(r.proprietario.chiave)) return 'proprietario PG senza identificativo';
  if (!isOggetto(r.mezzo) || r.mezzo.uid !== r.id || (!testo(r.mezzo.profilo) && !isOggetto(r.mezzo.scheda))) return 'mezzo mancante o con un uid diverso dal record';
  for (const k of ['conducente', 'mitragliere']) if (r[k] !== null && r[k] !== undefined && !persona(r[k])) return `${k}: serve la chiave del PG`;
  return null;
}

/** Record ripulito: mezzo normalizzato con le regole correnti, persone e movimento coerenti. */
export function normalizzaRecord(r, dati, avvisi = []) {
  const [mezzo] = normalizzaVeicoli([r.mezzo], dati, avvisi);
  const { conducente: _c, gruppo: _g, ...resto } = mezzo ?? {};
  const mov = isOggetto(r.movimento) && testo(r.movimento.scontro) && Number.isInteger(r.movimento.round) ? { scontro: r.movimento.scontro, round: r.movimento.round, da: testo(r.movimento.da) } : null;
  return {
    formato: FORMATO_VEICOLO, versione: VERSIONE_VEICOLO, id: r.id, revisione: Number.isInteger(r.revisione) ? r.revisione : 0, aggiornato: r.aggiornato ?? null,
    proprietario: r.proprietario?.tipo === 'gruppo' ? { tipo: 'gruppo' } : { tipo: 'pg', ...persona(r.proprietario) ?? {}, ...(testo(r.proprietario?.pg) ? { pg: r.proprietario.pg } : {}) },
    conducente: persona(r.conducente), mitragliere: persona(r.mitragliere),
    mezzo: { ...resto, uid: r.id }, movimento: mov,
  };
}

/** Record nuovo da un veicolo del file di un PG (migrazione o «Aggiungi veicolo» con il server). */
export function nuovoRecord(mezzo, chi, { gruppo = mezzo.gruppo === true, guida = mezzo.conducente === true } = {}, adesso = new Date()) {
  const { conducente: _c, gruppo: _g, ...resto } = mezzo;
  const me = { ...(chi?.pg ? { pg: chi.pg } : {}), chiave: chi?.chiave ?? '', nome: chi?.nome ?? '' };
  return {
    formato: FORMATO_VEICOLO, versione: VERSIONE_VEICOLO, id: mezzo.uid, revisione: 0, aggiornato: adesso.toISOString(),
    proprietario: gruppo ? { tipo: 'gruppo' } : { tipo: 'pg', ...me },
    conducente: guida && me.chiave ? me : null, mitragliere: null, mezzo: resto, movimento: null,
  };
}

/** Il PG `chi` vede il record? Proprietario, veicolo del gruppo o conducente (A.91). */
export function vede(rec, chi) {
  const mio = (p) => p && ((chi?.pg && p.pg === chi.pg) || stessaChiave(p.chiave, chi?.chiave));
  return Boolean(rec.proprietario?.tipo === 'gruppo' || mio(rec.proprietario) || mio(rec.conducente));
}

/**
 * Migrazione (A.91): i veicoli salvati nel file del PG diventano record del registro; nel file resta il riferimento.
 * Un veicolo del gruppo con lo stesso profilo già nel registro (da un altro file) non si unisce da solo: resta nel
 * file del PG con un avviso. Un record con lo stesso id è già migrato: resta solo il riferimento.
 * @param registro i record letti dal server
 * @returns {{ veicoli, nuovi: record[], avvisi: string[] }} le scelte aggiornate e i record da creare
 */
export function migraVeicoli(veicoli, chi, registro) {
  const avvisi = [];
  const nuovi = [];
  const out = (Array.isArray(veicoli) ? veicoli : []).map((v) => {
    if (eRiferimento(v) || !isOggetto(v)) return v;
    if (registro.some((r) => r.id === v.uid)) return { uid: v.uid, rif: v.uid, nome: v.nome };
    const doppio = v.gruppo === true && registro.find((r) => r.proprietario?.tipo === 'gruppo' && (r.mezzo?.profilo ?? null) === (v.profilo ?? null) && r.mezzo?.profilo);
    if (doppio) {
      avvisi.push(`«${v.nome}» del gruppo è già nel registro dei veicoli (${doppio.mezzo.nome}, ${doppio.id}): non lo unisco da solo. Resta la copia di questa scheda; il master decide quale tenere.`);
      return v;
    }
    const rec = nuovoRecord(v, chi);
    nuovi.push(rec);
    return riferimento(rec);
  });
  return { veicoli: out, nuovi, avvisi };
}

/**
 * Modifiche concorrenti senza perdite: `prima` è il record da cui è partita la modifica, `dopo` quello modificato,
 * `base` il record attuale del registro. Si applicano solo i campi cambiati (nel mezzo, campo per campo); un campo
 * cambiato anche altrove è un conflitto e resta quello del registro.
 * @returns {{ record, conflitti: string[] }}
 */
export function applicaPatch(base, prima, dopo) {
  const uguale = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const conflitti = [];
  const record = { ...base, mezzo: { ...base.mezzo } };
  for (const k of new Set([...Object.keys(prima ?? {}), ...Object.keys(dopo ?? {})])) {
    if (['revisione', 'aggiornato', 'id', 'formato', 'versione'].includes(k)) continue;
    if (k === 'mezzo') {
      for (const m of new Set([...Object.keys(prima.mezzo ?? {}), ...Object.keys(dopo.mezzo ?? {})])) {
        if (uguale(prima.mezzo?.[m], dopo.mezzo?.[m])) continue;
        if (!uguale(base.mezzo?.[m], prima.mezzo?.[m]) && !uguale(base.mezzo?.[m], dopo.mezzo?.[m])) { conflitti.push(`mezzo.${m}`); continue; }
        if (dopo.mezzo?.[m] === undefined) delete record.mezzo[m]; else record.mezzo[m] = dopo.mezzo[m];
      }
      continue;
    }
    if (uguale(prima[k], dopo[k])) continue;
    if (!uguale(base[k], prima[k]) && !uguale(base[k], dopo[k])) { conflitti.push(k); continue; }
    record[k] = dopo[k];
  }
  return { record, conflitti };
}

// --- il veicolo nello scontro (A.105) -------------------------------------------------------------------------------

/** Partecipante dello scontro che guida il mezzo (stessa chiave del PG), o null. */
export const partecipanteConducente = (rec, scontro) => (rec.conducente ? (scontro?.partecipanti ?? []).find((p) => p.tipo === 'pg' && stessaChiave(p.chiave, rec.conducente.chiave)) ?? null : null);

/**
 * Il mezzo non ha Iniziativa né Azioni: si muove all'Iniziativa del conducente, con le sue Azioni, una volta per
 * Round. Il cambio di conducente non concede un secondo movimento nello stesso Round.
 * @param diTurno il partecipante di turno (src/scontro.js → diTurno)
 * @returns {{ mosso: boolean, puo: boolean, motivo: string|null, conducente }}
 */
export function statoMovimento(rec, scontro, diTurno) {
  const mosso = Boolean(rec.movimento && scontro && rec.movimento.scontro === scontro.id && rec.movimento.round === scontro.round);
  const c = partecipanteConducente(rec, scontro);
  const motivo = !scontro ? 'nessuno scontro aperto'
    : !rec.conducente ? 'nessun conducente'
      : !c ? `${rec.conducente.nome} non è nello scontro`
        : mosso ? `già mosso nel Round ${scontro.round}${rec.movimento.da ? ` (con ${rec.movimento.da})` : ''}`
          : diTurno?.id !== c.id ? `si muove all’Iniziativa di ${rec.conducente.nome}` : null;
  return { mosso, puo: !motivo, motivo, conducente: c };
}

/** Il movimento del Round, all'Iniziativa del conducente. Errore se non si può. */
export function muoviVeicolo(rec, scontro, diTurno) {
  const st = statoMovimento(rec, scontro, diTurno);
  if (!st.puo) throw new Error(st.motivo);
  return { ...rec, movimento: { scontro: scontro.id, round: scontro.round, da: rec.conducente.nome } };
}

/** Cambio di conducente: il movimento già eseguito nel Round resta (niente secondo movimento). */
export function cambiaConducente(rec, nuovo) {
  return { ...rec, conducente: persona(nuovo) };
}

/**
 * Conducente incapace (A.105, Manuale dei Veicoli §5.5–5.6): il movimento residuo prosegue all'Iniziativa precedente
 * finché un nuovo conducente interviene o il mezzo si arresta; a terra l'andatura scende di una fascia.
 */
export function movimentoResiduo(rec, dati, ambiente = 'terra') {
  return andaturaResidua(rec.mezzo?.andatura ?? 'fermo', ambiente, dati);
}

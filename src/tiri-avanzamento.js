// Lotto 228 — A.297 (risposta di Davide del 19/11/2026): il tiro dei PV e dei PM all'avanzamento di livello vale una volta sola.
//
//   «Dopo la creazione del PG, per ogni dado previsto dalla Classe all'avanzamento vale il primo risultato. Il giocatore sceglie se
//   tirare nell'app o tirare al tavolo e inserire il risultato. Se la Classe prevede un dado per i PV e uno per i PM, si tira una
//   volta per ciascuno; i contributi fissi si applicano senza tiro. […] Nell'app il primo risultato registrato, anche se inserito a
//   mano, deve restare bloccato per quell'avanzamento anche chiudendo e riaprendo la schermata prima della conferma. Solo il
//   Direttore può correggere un errore materiale: se il dado mostra 6 ma è stato trascritto 3, può correggere il valore in 6; se il
//   dado mostra 3, il risultato resta 3.»
//
// Com'era prima: la bozza del livello stava **solo in memoria** (`stato.sali.voce`), «Tira» ripremuto sostituiva il risultato, il
// campo «risultato tirato dal vivo» si poteva riscrivere, cambiare Classe azzerava i tiri, uscire dalla schermata li perdeva, e
// «Annulla l'ultimo livello» (anche del giocatore) li buttava: cinque modi di rifare un tiro finché piaceva.
//
// Adesso il primo risultato si scrive **subito nel file del personaggio** (`scelte.tiriAvanzamento`, per livello di destinazione):
// sopravvive alla chiusura della schermata, al ricaricamento e al tablet. Resta anche dopo la conferma e dopo un annullo del
// giocatore, così rifare lo stesso livello restituisce gli stessi dadi. Con il primo tiro si fissa anche la Classe (un'altra
// Classe ha un altro dado: cambiarla sarebbe un modo di ritirare). Chi può cambiarlo: **solo il Direttore** (`master: true`), che
// corregge il valore (non lo ritira) o libera i tiri del livello. Il server rifiuta a un tablet ogni modifica
// (`controllaTiriDaTablet`, src/tiri-avanzamento.js).
import { specTiro, motivoFuoriIntervallo, valoreTiro, ORIGINI } from './tiri.js';

const isO = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const DADI = ['PV', 'PM'];

/** I tiri registrati per il livello di destinazione `livello` (2, 3, …), o null. */
export const tiriDelLivello = (scelte, livello) => {
  const r = scelte?.tiriAvanzamento?.[String(livello)];
  return isO(r) && (r.PV || r.PM) ? r : null;
};

/** La Classe fissata dal primo tiro di quel livello, o null. */
export const classeBloccata = (scelte, livello) => tiriDelLivello(scelte, livello)?.classe ?? null;

/** Il tiro registrato per un dado (`'PV'` | `'PM'`) di quel livello, come lo vuole la bozza ({ valore, origine }), o null. */
export function tiroRegistrato(scelte, livello, dado) {
  const t = tiriDelLivello(scelte, livello)?.[dado];
  return t && Number.isInteger(t.valore) ? { valore: t.valore, origine: ORIGINI.includes(t.origine) ? t.origine : 'app' } : null;
}

/** Il pezzo di voce `{ tiroPV?, tiroPM? }` da rimettere nella bozza quando si sceglie `classe` per quel livello (vuoto se la Classe è un'altra). */
export function tiriPerVoce(scelte, livello, classe) {
  const r = tiriDelLivello(scelte, livello);
  if (!r || (r.classe && r.classe !== classe)) return {};
  return { ...(tiroRegistrato(scelte, livello, 'PV') ? { tiroPV: tiroRegistrato(scelte, livello, 'PV') } : {}), ...(tiroRegistrato(scelte, livello, 'PM') ? { tiroPM: tiroRegistrato(scelte, livello, 'PM') } : {}) };
}

const conRecord = (scelte, livello, record) => ({ ...scelte, tiriAvanzamento: { ...(isO(scelte?.tiriAvanzamento) ? scelte.tiriAvanzamento : {}), [String(livello)]: record } });

/**
 * Registra il PRIMO tiro di un dado per quel livello. Se c'è già un risultato non fa niente e lo dice (`bloccato`): non esiste un
 * secondo tiro. Se il livello ha già una Classe fissata e questa è un'altra, rifiuta.
 * @param tiro { valore, origine: 'app'|'manuale' } @param facce facce del dado di quella Classe per quel dado
 * @returns { ok: true, scelte } | { ok: false, bloccato?: true, motivo, tiro? }
 */
export function registraTiro(scelte, livello, dado, tiro, { classe, facce, quando = new Date() } = {}) {
  if (!DADI.includes(dado)) return { ok: false, motivo: `dado «${dado}» sconosciuto` };
  const rec = tiriDelLivello(scelte, livello) ?? {};
  if (rec[dado]) return { ok: false, bloccato: true, tiro: tiroRegistrato(scelte, livello, dado), motivo: `Il tiro dei ${dado} di questo livello è già registrato (${rec[dado].valore}): vale il primo risultato. Solo il Direttore lo corregge.` };
  if (rec.classe && classe && rec.classe !== classe) return { ok: false, motivo: `Il primo tiro di questo livello è di ${rec.classe}: la Classe non si cambia più (ha un altro dado). Solo il Direttore può liberare i tiri.` };
  if (!Number.isInteger(facce) || facce < 2) return { ok: false, motivo: 'dado della Classe non valido' };
  const motivo = motivoFuoriIntervallo(valoreTiro(tiro), specTiro({ facce }));
  if (motivo) return { ok: false, motivo };
  const origine = ORIGINI.includes(tiro.origine) ? tiro.origine : 'app';
  return { ok: true, scelte: conRecord(scelte, livello, { ...rec, ...(classe ? { classe } : {}), [dado]: { valore: tiro.valore, origine, facce, quando: quando.toISOString() } }) };
}

/**
 * La correzione di un errore materiale: **solo il Direttore** (`master: true`, l'intero valore `true`: nessun altro valore passa).
 * Cambia il valore di un tiro già registrato (6 trascritto 3 → 6), non lo ritira: il valore nuovo è quello che il dado mostrava,
 * resta il motivo e il valore di prima. Non c'è un modo per «correggere» un 3 in un 6 senza dirlo: la riga porta `corretto`.
 */
export function correggiTiro(scelte, livello, dado, valore, { master = false, motivo = '', quando = new Date() } = {}) {
  if (master !== true) return { ok: false, motivo: 'Il tiro già registrato lo corregge solo il Direttore (Modifica master).' };
  const rec = tiriDelLivello(scelte, livello);
  const t = rec?.[dado];
  if (!t) return { ok: false, motivo: `Nessun tiro dei ${dado} registrato per questo livello: non c'è niente da correggere.` };
  if (!String(motivo).trim()) return { ok: false, motivo: 'La correzione dice il motivo (che cosa mostrava il dado).' };
  const errore = motivoFuoriIntervallo(valore, specTiro({ facce: t.facce }));
  if (errore) return { ok: false, motivo: errore };
  if (valore === t.valore) return { ok: false, motivo: 'È già quel valore.' };
  return { ok: true, scelte: conRecord(scelte, livello, { ...rec, [dado]: { ...t, valore, origine: t.origine, corretto: { da: t.valore, motivo: String(motivo).trim(), quando: quando.toISOString() } } }), da: t.valore };
}

/** Il Direttore libera i tiri di un livello (per esempio dopo aver annullato il livello): solo `master: true`. */
export function liberaTiri(scelte, livello, { master = false } = {}) {
  if (master !== true) return { ok: false, motivo: 'I tiri di un livello li libera solo il Direttore.' };
  if (!tiriDelLivello(scelte, livello)) return { ok: true, scelte };
  const { [String(livello)]: _via, ...resto } = scelte.tiriAvanzamento;
  return { ok: true, scelte: { ...scelte, tiriAvanzamento: Object.keys(resto).length ? resto : null } };
}

/**
 * Prima che un livello confermato si annulli (dal giocatore) i suoi tiri passano nel registro, se non ci sono già: rifare quel livello
 * restituisce gli stessi dadi. `facce` { PV, PM } dalla Classe dell'evento. I livelli confermati prima di questo lotto non avevano
 * un registro: con l'annullo ne ricevono uno.
 */
export function registraDaEvento(scelte, livello, evento, facce = {}, quando = new Date()) {
  let s = scelte;
  const classe = evento?.grado?.classe;
  for (const [dado, campo] of [['PV', 'tiroPV'], ['PM', 'tiroPM']]) {
    const t = evento?.[campo];
    if (!t || tiroRegistrato(s, livello, dado)) continue;
    const r = registraTiro(s, livello, dado, { valore: valoreTiro(t), origine: t.origine ?? 'app' }, { classe, facce: facce[dado] ?? Math.max(2, valoreTiro(t) ?? 2), quando });
    if (r.ok) s = r.scelte;
  }
  return s;
}

/** Normalizza il blocco letto da un file: livelli con chiave intera, Classe testo, tiri { valore intero, origine, facce intero, quando }. */
export function normalizzaTiriAvanzamento(v) {
  if (!isO(v)) return null;
  const out = {};
  for (const [k, r] of Object.entries(v)) {
    if (!/^\d+$/.test(k) || !isO(r)) continue;
    const rec = {};
    if (typeof r.classe === 'string' && r.classe) rec.classe = r.classe;
    for (const d of DADI) {
      const t = r[d];
      if (!isO(t) || !Number.isInteger(t.valore) || !Number.isInteger(t.facce) || t.facce < 2) continue;
      rec[d] = { valore: t.valore, origine: ORIGINI.includes(t.origine) ? t.origine : 'app', facce: t.facce, quando: typeof t.quando === 'string' ? t.quando : null,
        ...(isO(t.corretto) && Number.isInteger(t.corretto.da) ? { corretto: { da: t.corretto.da, motivo: String(t.corretto.motivo ?? ''), quando: typeof t.corretto.quando === 'string' ? t.corretto.quando : null } } : {}) };
    }
    if (rec.PV || rec.PM) out[k] = rec;
  }
  return Object.keys(out).length ? out : null;
}

const uguale = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const comeFile = (f) => ({ scelte: f?.scelte ?? {}, livelli: Array.isArray(f?.livelli) ? f.livelli : [] });

/**
 * Il server (src/… → server.mjs) rifiuta a un tablet — chi non è il PC del Direttore — di cambiare un tiro già registrato:
 *   1. ogni livello del registro che c'è sul disco resta com'è (Classe, valori, correzioni): non si cambia e non si cancella;
 *   2. i tiri dei livelli confermati (`livelli[i].tiroPV` / `tiroPM`) non cambiano rispetto al disco, e se il registro ha un tiro per
 *      quel livello il livello confermato porta esattamente quello: la conferma non è un secondo tiro.
 * Un tiro nuovo (livello senza registro sul disco) passa: è il primo. Non si controlla la creazione (il 1° livello è massimizzato).
 * @returns { ok: true } | { ok: false, stato: 403, errore }
 */
export function controllaTiriDaTablet(nuovo, disco) {
  if (!disco) return { ok: true };
  const N = comeFile(nuovo);
  const D = comeFile(disco);
  const regD = normalizzaTiriAvanzamento(D.scelte.tiriAvanzamento) ?? {};
  const regN = normalizzaTiriAvanzamento(N.scelte.tiriAvanzamento) ?? {};
  for (const [liv, rec] of Object.entries(regD)) {
    // restano com'erano Classe e tiri che il disco ha già; un tiro che manca sul disco (il PM dopo il PV) si può aggiungere
    const cambiato = ['classe', 'PV', 'PM'].some((k) => rec[k] !== undefined && !uguale(rec[k], regN[liv]?.[k]));
    if (cambiato) return { ok: false, stato: 403, errore: `Il tiro dei dadi del ${liv}° livello è già registrato: vale il primo risultato, e lo corregge solo il Direttore (Modifica master).` };
  }
  const n = Math.min(N.livelli.length, D.livelli.length);
  for (let i = 0; i < n; i++) {
    for (const campo of ['tiroPV', 'tiroPM']) {
      if (!uguale(valoreEOrigine(N.livelli[i]?.[campo]), valoreEOrigine(D.livelli[i]?.[campo]))) return { ok: false, stato: 403, errore: `Il tiro dei dadi del ${i + 2}° livello è già registrato: lo corregge solo il Direttore (Modifica master).` };
    }
  }
  for (let i = 0; i < N.livelli.length; i++) {
    const rec = regN[String(i + 2)];
    if (!rec) continue;
    for (const [dado, campo] of [['PV', 'tiroPV'], ['PM', 'tiroPM']]) {
      const t = N.livelli[i]?.[campo];
      if (t && rec[dado] && valoreTiro(t) !== rec[dado].valore) return { ok: false, stato: 403, errore: `Il ${i + 2}° livello porta un tiro dei ${dado} diverso da quello registrato (${rec[dado].valore}): vale il primo risultato.` };
    }
  }
  return { ok: true };
}
const valoreEOrigine = (t) => (t === undefined || t === null ? null : { v: valoreTiro(t), o: typeof t === 'object' ? t.origine ?? null : 'app' });

// Impianti attivabili al tavolo (docs/censimento-impianti.md; Equipaggiamento 0.5, cap. 7). Funzioni pure.
// Dati in data/equipaggiamento/impianti.json → «attivabile» { tipo, azione, frasi }:
// - «cariche»: iniettori sanitari (§7.9), cartucce nel caricatore fino a «cartucce» della scheda; «Somministra»
//   ne toglie una (1 AzP), il rifornimento le rimette (un minuto, senza chirurgia). Venduti senza cartucce: si
//   parte da 0;
// - «chip»: il Processore neurale di Abilità (§7.10). «Attiva» accende il chip inserito («In uso») per la durata
//   di regole.json → impianti.chip (durata_minuti), una volta ogni intervallo_ore; «Termina» lo spegne senza
//   azzerare il conteggio; «Passate le 24 ore» lo azzera. Le durate a tempo si terminano a mano, come le
//   Tecniche Interiori a tempo;
// - «promemoria»: l'Azione per attivare (visione, comunicatore, registratore, microattrezzi), nessun numero.
// Sessione: `impianti` = { cartucce: { uid: n }, processore: { attivo: uid | null, usato: bool } }, presente solo
// se non è vuoto (le sessioni di prima restano identiche); il bonus del chip acceso sta in condizioniOggetti.
import { catalogo, risolvi, normalizzaEquipaggiamento } from './equipaggiamento.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const STATO = (dati) => dati.regole?.impianti?.stato_installato ?? 'installato';

/** Gli impianti installati con «attivabile», più i chip (inseriti o no) per il Processore. */
export function impiantiAttivabili(voci, dati) {
  const cat = catalogo(dati);
  const tutte = normalizzaEquipaggiamento(voci).map((v) => risolvi(v, cat));
  const installati = tutte.filter((r) => r.tipo === 'impianto' && r.voce.stato === STATO(dati) && r.def?.attivabile);
  return installati.map((r) => ({
    uid: r.uid, nome: r.nome, rif: r.def.rif, tipo: r.def.attivabile.tipo, azione: r.def.attivabile.azione, frasi: r.def.attivabile.frasi,
    todo: r.def.attivabile['TODO(Davide)'] ?? null, cartucce: r.def.cartucce ?? null,
    chip: r.def.attivabile.tipo === 'chip' ? tutte.filter((c) => c.def?.richiede_innesto === r.def.innesto)
      .map((c) => ({ uid: c.uid, nome: c.nome, inserito: c.voce.stato === 'in_uso', effetti: c.effetti })) : [],
  }));
}

/** Blocco `impianti` della sessione in forma valida: uid esistenti, cartucce intere ≥ 0; null se vuoto. */
export function allineaImpianti(x, uids = null) {
  if (!isOggetto(x)) return null;
  const esiste = (uid) => typeof uid === 'string' && (!uids || uids.includes(uid));
  const cartucce = Object.fromEntries(Object.entries(isOggetto(x.cartucce) ? x.cartucce : {})
    .filter(([uid, n]) => esiste(uid) && Number.isInteger(n) && n > 0));
  const p = isOggetto(x.processore) ? x.processore : null;
  const processore = p && (p.usato === true || esiste(p.attivo)) ? { attivo: esiste(p.attivo) ? p.attivo : null, usato: p.usato === true } : null;
  const out = {};
  if (Object.keys(cartucce).length) out.cartucce = cartucce;
  if (processore) out.processore = processore;
  return Object.keys(out).length ? out : null;
}

const blocco = (sessione) => allineaImpianti(sessione?.impianti) ?? {};
const conBlocco = (sessione, b) => {
  const { impianti: _vecchio, ...resto } = sessione;
  const x = allineaImpianti(b);
  return x ? { ...resto, impianti: x } : resto;
};

/** Cartucce nel caricatore di un iniettore (0 se mai caricato: «Sono venduti senza cartucce», §7.9). */
export const cartucceDi = (sessione, uid) => blocco(sessione).cartucce?.[uid] ?? 0;

/** Cartucce dell'iniettore impostate a `n`, entro 0 e il caricatore della scheda (§7.9: «fino a cinque»). */
export function impostaCartucce(sessione, uid, n, massimo) {
  const b = blocco(sessione);
  const v = Math.max(0, Math.min(massimo, Number.isInteger(n) ? n : 0));
  return conBlocco(sessione, { ...b, cartucce: { ...(b.cartucce ?? {}), [uid]: v } });
}

/** «Somministra» (1 AzP, §7.9): una cartuccia in meno. null se il caricatore è vuoto. */
export function somministra(sessione, uid) {
  const n = cartucceDi(sessione, uid);
  if (n <= 0) return null;
  return impostaCartucce(sessione, uid, n - 1, n);
}

/**
 * Stato del Processore per «Attiva» (§7.10): chip inseriti, quello acceso, se l'attivazione delle ultime 24 ore
 * è già stata usata, e il motivo per cui un chip non si può attivare.
 */
export function statoProcessore(sessione, imp, dati) {
  const C = dati.regole?.impianti?.chip ?? {};
  const p = blocco(sessione).processore ?? { attivo: null, usato: false };
  const motivo = (c) => (!c.inserito ? 'il chip non è inserito: mettilo «In uso» nell’Inventario'
    : p.attivo === c.uid ? null
      : p.usato ? `una sola attivazione ogni ${C.intervallo_ore ?? 24} ore: «Passate le ${C.intervallo_ore ?? 24} ore» quando torna utilizzabile`
        : null);
  return { attivo: p.attivo, usato: p.usato, durataMinuti: C.durata_minuti ?? null, intervalloOre: C.intervallo_ore ?? null,
    chip: imp.chip.map((c) => ({ ...c, acceso: p.attivo === c.uid, motivo: motivo(c) })) };
}

/** «Attiva» un chip (§7.10): un solo chip acceso, il bonus nelle condizioni accese. null se non si può. */
export function attivaChip(sessione, imp, uid, dati) {
  const st = statoProcessore(sessione, imp, dati);
  const c = st.chip.find((x) => x.uid === uid);
  if (!c || c.motivo || c.acceso) return null;
  const altri = new Set(imp.chip.map((x) => x.uid));
  const condizioni = [...(sessione.condizioniOggetti ?? []).filter((x) => !altri.has(x)), uid];
  return conBlocco({ ...sessione, condizioniOggetti: condizioni }, { ...blocco(sessione), processore: { attivo: uid, usato: true } });
}

/** «Termina»: il chip si spegne; il conteggio delle 24 ore resta (§7.10). */
export function terminaChip(sessione, imp) {
  const chip = new Set(imp.chip.map((x) => x.uid));
  const b = blocco(sessione);
  return conBlocco({ ...sessione, condizioniOggetti: (sessione.condizioniOggetti ?? []).filter((x) => !chip.has(x)) },
    { ...b, processore: { attivo: null, usato: b.processore?.usato === true } });
}

/** «Passate le 24 ore»: il Processore torna utilizzabile (§7.10: «senza condizioni legate al riposo»). */
export function nuovoIntervalloChip(sessione, imp) {
  const s = terminaChip(sessione, imp);
  const b = blocco(s);
  return conBlocco(s, { ...b, processore: null });
}

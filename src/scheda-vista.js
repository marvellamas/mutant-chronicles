// Disposizione della scheda digitale (ritocchi dell'11/10/2026, richieste di Davide approvate da Marcello: S4–S32).
// Funzioni pure di sola presentazione: dicono che cosa mostrare e dove, a partire da valori già calcolati
// (src/stampa.js → preparaTab, src/sessione.js). Nessuna regola e nessun valore calcolato nasce qui: i numeri sono
// quelli della scheda, soltanto ordinati per la testata, la colonna di sinistra, il «Calcolo» delle Abilità, i
// riquadri di Combattimento, la Sintonizzazione e le colonne dell'Inventario. L'interfaccia è in src/ui/tab.js.

import { statiConImplicati } from './condizioni.js';
import { SEZIONI_INVENTARIO, sezioneInventario } from './palette.js';

const segno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

/**
 * Testata comune (S4), accanto al titolo di ogni tab: Punti Eroe (valore e «−», senza «+»), Distintivi (con i tasti
 * e la conversione del §1.8.3) e Crediti (null se la dotazione iniziale non è registrata).
 */
export function datiTestata(sessione, massimi) {
  const s = sessione ?? {};
  const m = massimi ?? {};
  const pe = s.puntiEroe ?? 0;
  const dist = s.distintivi ?? 0;
  return {
    puntiEroe: { valore: pe, massimo: m.puntiEroe ?? null, puoTogliere: pe > 0, puoAggiungere: false },
    distintivi: {
      valore: dist, puoTogliere: dist > 0, perPuntoEroe: m.distintiviPerPuntoEroe ?? null,
      puoConvertire: Number.isInteger(m.distintiviPerPuntoEroe) && dist >= m.distintiviPerPuntoEroe && pe < (m.puntiEroe ?? 0),
    },
    crediti: s.crediti === null || s.crediti === undefined ? null
      : { valore: s.crediti, iniziali: Number.isInteger(s.creditiIniziali) ? s.creditiIniziali : null },
  };
}

/**
 * Stati attivi da mostrare in sola lettura nella colonna di sinistra (S5) e nelle «Condizioni attive» delle Abilità
 * (S7): quelli spuntati e quelli che ne discendono (Svenuto → A Terra), nell'ordine di regole.json → stati.elenco.
 * Lista vuota: la riga non si mostra.
 * @returns [{ id, nome, implicato, promemoria }]
 */
export function statiAttiviVista(sessione, dati) {
  const attivi = sessione?.statiAttivi ?? [];
  if (!attivi.length) return [];
  const tutti = new Set(statiConImplicati(attivi, dati));
  return (dati.regole.stati?.elenco ?? []).filter((st) => tutti.has(st.id))
    .map((st) => ({ id: st.id, nome: st.nome, implicato: !attivi.includes(st.id), promemoria: st.promemoria ?? null }));
}

/** La formula del VA com'era scritta nella riga dell'Abilità prima dell'11/10/2026 (ora nel «Calcolo»). */
export function formulaVa(a) {
  return `${segno(a.mod)} Mod + ${a.base} Base + ${a.corporazione} Corp + ${a.avanzamento} Avanz${a.limite !== null && a.limite !== undefined ? `, limite ${a.limite}` : ''}${a.equip ? ` ${segno(a.equip)} Equip` : ''}`;
}

/**
 * Il conto del VA di un'Abilità per la finestrella «Calcolo» (S8): le colonne che stavano nella riga (Mod, Base,
 * Corp, Avanz, Equip), il limite della categoria (§8.3), il valore da regole e, sotto, le condizioni della sessione
 * fino al VA mostrato. Gli stessi numeri di prima, soltanto spostati.
 * @param a riga della tab Abilità (src/stampa.js): mod, base, corporazione, avanzamento, grezzo, limite, equip, totale,
 *   effettivo, scomposizione
 */
export function contoVa(a) {
  const limitato = a.limite !== null && a.limite !== undefined && a.grezzo > a.limite;
  const colonne = [
    { voce: `Mod ${a.caratteristica}`, sigla: 'Mod', valore: a.mod, testo: segno(a.mod) },
    { voce: `Base${a.competenza ? ` (competenza ${a.competenza})` : ''}`, sigla: 'Base', valore: a.base, testo: String(a.base) },
    { voce: 'Corporazione', sigla: 'Corp', valore: a.corporazione, testo: String(a.corporazione) },
    { voce: 'Avanzamento', sigla: 'Avanz', valore: a.avanzamento, testo: String(a.avanzamento) },
  ];
  // la scomposizione parte dal valore da regole; le voci dopo sono equipaggiamento e condizioni della sessione
  const condizioni = (a.scomposizione ?? []).slice(1).map((x) => ({ voce: x.etichetta, valore: x.valore, testo: segno(x.valore), fonte: x.fonte ?? null }));
  return {
    nome: a.nome,
    colonne,
    grezzo: a.grezzo,
    limite: a.limite ?? null,
    limitato,
    // colonna «Equip» della riga di prima: equipaggiamento indossato (§7.11.1)
    equip: a.equip ?? 0,
    daRegole: a.totale,
    condizioni,
    effettivo: a.effettivo,
    formula: formulaVa(a),
  };
}

/** Modificatori attivi accanto al VA di un'Abilità (S8): le voci della scomposizione dopo il valore da regole. */
export function modificatoriAttivi(a) {
  return (a.scomposizione ?? []).slice(1).filter((x) => x.valore)
    .map((x) => ({ voce: x.etichetta, valore: x.valore, testo: `${segno(x.valore)} ${x.etichetta}`, verso: x.valore < 0 ? 'malus' : 'bonus' }));
}

/**
 * Sintesi delle mani per la colonna destra di Combattimento (S14): «Due mani» da sola con un'arma a due mani,
 * altrimenti destra e sinistra (anche libere), più gli oggetti oltre le due mani.
 * @param slot { due, destra, sinistra } di assegnaMani (src/equipaggiamento.js); ogni oggetto ha `nome`
 * @returns [{ mano, titolo, nome: string|null, oltre?: true }]
 */
export function sintesiMani(slot, oltre = []) {
  const righe = slot?.due
    ? [{ mano: 'due', titolo: 'Due mani', nome: slot.due.nome }]
    : [{ mano: 'destra', titolo: 'Mano destra', nome: slot?.destra?.nome ?? null }, { mano: 'sinistra', titolo: 'Mano sinistra', nome: slot?.sinistra?.nome ?? null }];
  return [...righe, ...oltre.map((o) => ({ mano: 'oltre', titolo: 'Oltre le due mani', nome: o.nome, oltre: true }))];
}

/**
 * Sintesi delle Protezioni addosso (S14): una riga per tipo che ha qualcosa (regole.json → protezioni_rapide.voci),
 * i rinforzi con l'armatura; `nessuna` se non c'è niente di indossato o imbracciato.
 * @param attive voci risolte attive: [{ tipo, nome, uid }]
 * @param voci regole.json → protezioni_rapide.voci: [{ tipo, nome }]
 */
export function sintesiProtezioni(attive, voci) {
  const lista = attive ?? [];
  const righe = (voci ?? []).map((x) => ({
    tipo: x.tipo, titolo: x.nome,
    oggetti: lista.filter((r) => r.tipo === x.tipo),
    rinforzi: x.tipo === 'armatura' ? lista.filter((r) => r.tipo === 'rinforzo') : [],
  })).filter((x) => x.oggetti.length || x.rinforzi.length);
  return { nessuna: !righe.length, righe };
}

/**
 * Sintonizzazione in una riga (S24): «8 / 9», e per il «?» quali Artefatti impegnano i punti.
 * @param st scheda.equipaggiamento.sintonizzazione: { usata, capacita, artefatti: [{ nome, costo, sintonizzato, deposito }] }
 */
export function sintesiSintonizzazione(st) {
  if (!st) return null;
  const impegnano = (st.artefatti ?? []).filter((x) => x.sintonizzato && x.costo > 0);
  return {
    testo: `${st.usata} / ${st.capacita}`,
    oltre: st.usata > st.capacita,
    impegnano: impegnano.map((x) => ({ nome: x.nome, costo: x.costo, deposito: !!x.deposito, testo: `${x.nome}: ${x.costo}${x.deposito ? ' (nel deposito comune)' : ''}` })),
    liberi: (st.artefatti ?? []).filter((x) => !x.sintonizzato && x.costo > 0).map((x) => ({ nome: x.nome, costo: x.costo })),
  };
}

// ---------------------------------------------------------------------------
// Inventario (S29–S32)

/** Le due colonne dell'Inventario. «Con sé» (oggetti senza stati: munizioni, sanitario…) è portato: sta in «Addosso». */
export const COLONNE_INVENTARIO = [
  { id: 'addosso', titolo: 'Addosso', nota: 'indossato, impugnato, portato' },
  { id: 'zaino', titolo: 'Zaino e Deposito', nota: 'nello zaino o nel deposito comune' },
];

/** Colonna di una voce risolta: «zaino» se è nello zaino o nel deposito comune, altrimenti «addosso». */
export function colonnaInventario(r) {
  const stato = r?.voce?.stato ?? null;
  return r?.deposito || stato === 'deposito' || stato === 'zaino' ? 'zaino' : 'addosso';
}

/**
 * Gli oggetti nelle due colonne (S29), ciascuna con le categorie dell'Inventario nell'ordine di SEZIONI_INVENTARIO
 * (solo quelle che hanno oggetti in quella colonna), e le categorie senza alcun oggetto (per «Aggiungi»).
 * @param risolte voci risolte (src/equipaggiamento.js → risolvi)
 * @returns { colonne: [{ id, titolo, nota, quanti, sezioni: [{ id, chiave, titolo, colore, sotto, voci }] }], vuote: [{ id, titolo, colore }] }
 */
export function colonneInventario(risolte) {
  const lista = risolte ?? [];
  const sezioneDi = new Map(lista.map((r) => [r, sezioneInventario(r)?.id ?? 'altro']));
  const colonne = COLONNE_INVENTARIO.map((c) => {
    const sue = lista.filter((r) => colonnaInventario(r) === c.id);
    return {
      ...c,
      quanti: sue.length,
      sezioni: SEZIONI_INVENTARIO.map((s) => ({ id: s.id, chiave: `${c.id}:${s.id}`, titolo: s.titolo, colore: s.colore, sotto: !!s.sottosezioneDi, voci: sue.filter((r) => sezioneDi.get(r) === s.id) }))
        .filter((s) => s.voci.length),
    };
  });
  const usate = new Set(sezioneDi.values());
  return { colonne, vuote: SEZIONI_INVENTARIO.filter((s) => !usate.has(s.id)).map((s) => ({ id: s.id, titolo: s.titolo, colore: s.colore })) };
}

/**
 * «Aggiungi» accanto a una categoria (S32): che cosa preselezionare in «Aggiungi oggetto» / «Compra». Il Tipo è il
 * primo della categoria; per le categorie che distinguono gli «altro» per capitolo (Esplorazione, Comunicazione…) anche
 * i cataloghi del riferimento, così l'elenco mostra solo quella categoria.
 * @returns { sezione, titolo, tipo, cataloghi: string[]|null } | null
 */
export function preselezioneAggiungi(idSezione) {
  const s = SEZIONI_INVENTARIO.find((x) => x.id === idSezione);
  if (!s) return null;
  return { sezione: s.id, titolo: s.titolo, tipo: s.tipi[0], cataloghi: s.cataloghi ? [...s.cataloghi] : null };
}

/**
 * Gli oggetti di un elenco nelle due colonne dell'Inventario, «Addosso» e «Zaino e Deposito» (S25: gli Artefatti e le
 * riserve di Chroma nella tab Artefatti, come gli oggetti nell'Inventario).
 * @param lista elementi qualsiasi; `risoltaDi(x)` dà la voce risolta dell'elemento (per lo stato)
 * @returns [{ id, titolo, nota, voci }]
 */
export function inColonne(lista, risoltaDi) {
  return COLONNE_INVENTARIO.map((c) => ({ ...c, voci: (lista ?? []).filter((x) => colonnaInventario(risoltaDi(x)) === c.id) }));
}

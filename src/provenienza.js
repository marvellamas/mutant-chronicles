// Provenienza dei valori calcolati: per ogni numero che il motore ottiene sommando più contributi,
// la lista { fonte, valore, nota?, escluso?, barrato?, dettaglio? } e il totale. La producono il
// motore (src/condizioni.js, src/protezione.js, src/equipaggiamento.js); SD, utility e stampa la
// stampano così com'è e i test la verificano. Funzioni pure.
//
// - `escluso`: riga mostrata ma non sommata (Rotto, non cumulabile, vale altrove); `barrato` la
//   mostra barrata (oggetto Rotto: «Rotto: non conta»).
// - `dettaglio`: la scomposizione di una riga (VA dell'Abilità dentro il VA dell'arma), non sommata.
// - `valore` numerico, oppure testo per il danno («1d6+1»).

export const riga = (fonte, valore, nota = null, extra = {}) => ({ fonte, valore, ...(nota ? { nota } : {}), ...extra });

/** Somma delle righe che contano (numeriche, non escluse). */
export const sommaRighe = (righe) => righe.filter((r) => !r.escluso && typeof r.valore === 'number').reduce((s, r) => s + r.valore, 0);

export const provenienza = (righe, totale = sommaRighe(righe)) => ({ totale, righe });

// categoria della voce di una scomposizione (src/condizioni.js) → nota della riga
const NOTE = {
  equipaggiamento: 'equipaggiamento', oggetto: 'condizione accesa', ferite: 'Ferite (§5.14)', affaticamento: 'Affaticamento (§5.19)',
  stato: 'Stato (§5.18)', carico: 'carico (§5.2.6)', condizione: 'condizione dell’arma (§5.17)',
};

/** Voci { etichetta, valore, fonte } di una scomposizione → righe; la voce «regole» si può espandere. */
export function righeDaScomposizione(voci, { regole = null } = {}) {
  return voci.flatMap((v) => {
    if (v.fonte === 'regole' && regole) {
      const r = regole(v);
      if (r) return r;
    }
    return [riga(v.etichetta, v.valore, v.fonte === 'regole' ? null : NOTE[v.fonte] ?? null)];
  });
}

/**
 * VA da regole di un'Abilità (§1.2.1, §4.2): Mod della Caratteristica + base dell'Addestramento +
 * Corporazione + Avanzamento (il +1 di Classe e i punti liberi). Le voci che valoreAbilita somma.
 * Se i componenti non tornano col totale (scheda di creazione incompleta), una riga sola.
 */
export function righeRegoleAbilita(a, scheda) {
  const righe = [
    riga(`Mod ${a.caratteristica}`, a.mod, 'Caratteristica'),
    riga(`Addestramento ${scheda.addestramento ?? ''}`.trim(), a.base, 'valore base (§2.13)'),
    a.corporazione ? riga(`Corporazione ${scheda.corporazione ?? ''}`.trim(), a.corporazione, 'Abilità della Corporazione') : null,
  ].filter(Boolean);
  if (Number.isInteger(a.daClasse) || Number.isInteger(a.liberi)) {
    if (a.daClasse) righe.push(riga('Classe', a.daClasse, 'Avanzamento di Classe: +1 per Grado (§2.13, §8.3)'));
    if (a.liberi) righe.push(riga('Avanzamento', a.liberi, 'punti liberi (§2.13, §8.3)'));
  } else if (a.avanzamento) righe.push(riga('Avanzamento', a.avanzamento));
  return righe.every((r) => Number.isInteger(r.valore)) && sommaRighe(righe) === a.totale ? righe : [riga('Valore da regole', a.totale)];
}

/** Salvezza da regole (§1.2.3): 8 + Mod specifico + Addestramento + Corporazione + Avanzamento, Talenti, tetto. */
export function righeRegoleSalvezza(s, scheda) {
  if (!Number.isInteger(s.base8)) return [riga('Valore da regole', s.totale)];
  const righe = [
    riga('Base', s.base8, '§1.2.3'),
    riga(`Mod ${s.caratteristica}`, s.modSpecifico, 'modificatore di Salvezza'),
    riga(`Addestramento ${scheda.addestramento ?? ''}`.trim(), s.addestramento),
    s.corporazione ? riga(`Corporazione ${scheda.corporazione ?? ''}`.trim(), s.corporazione) : null,
    s.avanzamento ? riga('Avanzamento', s.avanzamento, `livello ${scheda.livello ?? 1} (§1.2.3)`) : null,
    s.talenti ? riga('Talenti', s.talenti) : null,
  ].filter(Boolean);
  if (s.limitato) righe.push(riga(`Tetto ${s.tetto}`, s.totale - sommaRighe(righe), '§1.2.3'));
  return sommaRighe(righe) === s.totale ? righe : [riga('Valore da regole', s.totale)];
}

const segno = (n) => (typeof n !== 'number' ? String(n) : n < 0 ? `−${-n}` : `+${n}`);

/**
 * Testo della provenienza, per la stampa e le etichette accessibili: «Fonte +2 — nota», una riga per
 * contributo e il totale in fondo. `totale: null` lo omette, `note: false` toglie le note.
 */
export function testoProvenienza(prov, { totale = 'Totale', separatore = '\n', note = true } = {}) {
  const r = prov.righe.map((x) => `${x.fonte} ${segno(x.valore)}${note && x.nota ? ` — ${x.nota}` : ''}${x.escluso && !(note && x.nota) ? ' (non conta)' : ''}`);
  return [...r, ...(totale === null ? [] : [`${totale} ${prov.totale}`])].join(separatore);
}

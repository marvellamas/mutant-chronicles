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

// categoria della voce di una scomposizione (src/condizioni.js, src/attacco.js, src/lancio.js) → nota della riga
const NOTE = {
  equipaggiamento: 'equipaggiamento', oggetto: 'condizione accesa', ferite: 'Ferite (§5.14)', affaticamento: 'Affaticamento (§5.19)',
  stato: 'Stato (§5.18)', carico: 'carico (§5.2.6)', condizione: 'condizione dell’arma (§5.17)',
  movimento: 'movimento', bersaglio: 'bersaglio', copertura: 'Copertura', distanza: 'distanza', mirino: 'mirino',
  modalita: 'modalità di fuoco', 'modalità': 'modalità di fuoco', manovra: 'manovra', talento: 'Talento', situazione: 'situazione',
  livello: 'livello dell’incantesimo', componenti: 'componenti', circostanze: 'circostanze', magia: 'effetto magico',
};

/**
 * Voci { etichetta, valore, fonte, paragrafo? } di una scomposizione → righe, con la categoria
 * (`categoria`: la vecchia `fonte`) e il paragrafo nella nota; la voce «regole» si può espandere.
 */
export function righeDaScomposizione(voci, { regole = null } = {}) {
  return voci.flatMap((v) => {
    if (v.fonte === 'regole' && regole) {
      const r = regole(v);
      if (r) return r;
    }
    const nota = [v.fonte === 'regole' ? null : NOTE[v.fonte] ?? v.fonte, v.paragrafo].filter(Boolean).join(', ') || null;
    return [riga(v.etichetta, v.valore, nota, { categoria: v.fonte, ...(v.paragrafo ? { paragrafo: v.paragrafo } : {}) })];
  });
}

/**
 * Righe di partenza di un'utility («Attacca!», «Lancia!»): la provenienza del valore effettivo
 * (arma della SD), altrimenti la sua scomposizione.
 */
export const righeBase = (valore, voci) => valore?.provenienza?.righe ?? righeDaScomposizione(voci ?? []);

/** Un valore in una riga sola, con la sua provenienza come dettaglio (VA Corpo a corpo, VA Potere). */
export const rigaConDettaglio = (fonte, valore, prov) => riga(fonte, valore, null, { categoria: 'regole', ...(prov?.righe?.length ? { dettaglio: prov.righe } : {}) });

/**
 * §5.13: riga del bonus di Caratteristica al danno, con il tetto del livello quando scatta.
 * @param bc { sigla, valore, bonus, esclusoDa }  @param fascia bonus della fascia senza tetto
 */
export function rigaBonusCaratteristica(bc, fascia, livello) {
  const nota = bc.esclusoDa ? `escluso da ${bc.esclusoDa}` : fascia > bc.bonus ? `fascia +${fascia}, tetto +${bc.bonus} al ${livello ?? 1}° livello (§5.13)` : '§5.13';
  return riga(`${bc.sigla} ${bc.valore}`, bc.bonus, nota);
}

const NOMI_COMPETENZA = { S: 'Specializzata', P: 'Professionale', G: 'Generica', N: 'Non competente' };

/**
 * VA da regole di un'Abilità (§1.2.1, §4.2, Giocatore del 29/09): Mod della Caratteristica + base della
 * categoria di competenza nella prima Classe + Corporazione + Avanzamento (il +1 di Classe e i punti
 * liberi) = VA grezzo; se supera il limite della categoria al Grado (§8.3, §8.7), una riga lo riporta al
 * limite (VA personale). Se i componenti non tornano col totale (creazione incompleta), una riga sola.
 */
export function righeRegoleAbilita(a, scheda) {
  const comp = a.competenza ? `Competenza ${a.competenza} (${a.competenzaDa ?? scheda.classi?.[0]?.nome ?? scheda.classe ?? 'prima Classe'})` : 'Base iniziale';
  const righe = [
    riga(`Mod ${a.caratteristica}`, a.mod, 'Caratteristica'),
    riga(comp, a.base, a.competenza ? `base ${NOMI_COMPETENZA[a.competenza] ?? a.competenza} (§2.3)` : '§2.3'),
    a.corporazione ? riga(`Corporazione ${scheda.corporazione ?? ''}`.trim(), a.corporazione, 'Abilità della Corporazione') : null,
  ].filter(Boolean);
  if (Number.isInteger(a.daClasse) || Number.isInteger(a.liberi)) {
    if (a.daClasse) righe.push(riga('Classe', a.daClasse, 'Avanzamento di Classe: +1 per Grado (§2.12, §8.3)'));
    if (a.liberi) righe.push(riga('Avanzamento', a.liberi, 'punti liberi (§2.13, §8.3)'));
  } else if (a.avanzamento) righe.push(riga('Avanzamento', a.avanzamento));
  // §8.3: il grezzo oltre il limite resta registrato ma non conta finché il limite non sale
  if (Number.isInteger(a.grezzo) && Number.isInteger(a.limite) && a.grezzo > a.limite) {
    righe.push(riga(`Limite ${a.limiteCategoria ?? ''} ${a.limite}`.replace('  ', ' '), a.limite - a.grezzo,
      `VA grezzo ${a.grezzo} oltre il limite del VA personale${a.limiteDa?.length ? ` (${a.limiteDa.join(', ')})` : ''} (§8.3, §8.7)`));
  }
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

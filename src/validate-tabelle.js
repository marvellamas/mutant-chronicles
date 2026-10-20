// Validatore delle tabelle di consultazione (regole.json → tabelle_consultazione, 19/10/2026): recupero dei PM e dei PV
// mostrati in sola lettura da src/ui/tabelle.js. Chiamato da src/validate.js → validaSchedaDigitale.
const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isTesto = (v) => typeof v === 'string' && v.trim() !== '';
const isIntero = (v) => Number.isInteger(v);
const testi = (v) => Array.isArray(v) && v.length > 0 && v.every(isTesto);

export function validaTabelleConsultazione(dati, err) {
  const F = 'regole';
  const tc = dati.regole.tabelle_consultazione;
  const tabella = (K, t, chiavi) => {
    if (!isOggetto(t) || !isTesto(t.titolo) || !testi(t.colonne) || t.colonne.length !== chiavi.length) { err(F, K, `serve { titolo, colonne (${chiavi.length} testi), righe }`); return; }
    if (!Array.isArray(t.righe) || !t.righe.length || !t.righe.every((x) => isOggetto(x) && chiavi.every((c) => isTesto(x[c])))) err(F, `${K}.righe`, `righe non vuote con i testi ${chiavi.join(', ')}`);
  };
  if (!isOggetto(tc)) { err(F, 'tabelle_consultazione', 'blocco mancante: { recupero_pm, recupero_pv }'); return; }
  const pm = tc.recupero_pm;
  tabella('tabelle_consultazione.recupero_pm', pm, ['fase', 'valore', 'esempi']);
  if (isOggetto(pm)) {
    if (!isTesto(pm.fonte) || !testi(pm.note)) err(F, 'tabelle_consultazione.recupero_pm', 'servono fonte e note');
    tabella('tabelle_consultazione.recupero_pm.meditazione', pm.meditazione, ['parametro', 'regola']);
    if (isOggetto(pm.meditazione) && (!isTesto(pm.meditazione.accesso) || !testi(pm.meditazione.note))) err(F, 'tabelle_consultazione.recupero_pm.meditazione', 'servono accesso e note');
  }
  const pv = tc.recupero_pv;
  tabella('tabelle_consultazione.recupero_pv', pv, ['condizione', 'recupero', 'limite']);
  if (isOggetto(pv)) {
    if (!isTesto(pv.fonte) || !testi(pv.note)) err(F, 'tabelle_consultazione.recupero_pv', 'servono fonte e note');
    const rc = pv.riposo_completo;
    if (!isOggetto(rc) || !isTesto(rc.titolo) || !testi(rc.colonne) || !Array.isArray(rc.righe) || rc.righe.length !== 10
      || !rc.righe.every((x, i) => x.cos === i + 1 && isIntero(x.mod) && isIntero(x.pv) && x.pv >= 1)) err(F, 'tabelle_consultazione.recupero_pv.riposo_completo', 'dieci righe per COS da 1 a 10, con mod e pv interi');
    const ic = pv.in_combattimento;
    tabella('tabelle_consultazione.recupero_pv.in_combattimento', ic, ['kit', 'successo', 'magistrale']);
    if (isOggetto(ic) && (!isTesto(ic.fonte) || !testi(ic.note))) err(F, 'tabelle_consultazione.recupero_pv.in_combattimento', 'servono fonte e note');
  }
}

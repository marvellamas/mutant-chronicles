// Salvataggio dei personaggi in localStorage. Ogni voce contiene solo le scelte e il passo
// raggiunto. Tutte le letture/scritture sono protette: in navigazione privata o con lo
// storage bloccato l'app funziona lo stesso, senza salvare.

const CHIAVE = 'mutant.personaggi.v1';

function leggiTutti() {
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function scriviTutti(tutti) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(tutti));
    return true;
  } catch {
    return false;
  }
}

export function elenco() {
  return Object.values(leggiTutti())
    .filter((p) => p && typeof p.id === 'string')
    .sort((a, b) => (b.aggiornato ?? '').localeCompare(a.aggiornato ?? ''));
}

export function carica(id) {
  return leggiTutti()[id] ?? null;
}

/** @returns {boolean} false se il salvataggio non è riuscito */
export function salva({ id, scelte, passo }) {
  const tutti = leggiTutti();
  tutti[id] = { id, scelte, passo, aggiornato: new Date().toISOString() };
  return scriviTutti(tutti);
}

export function elimina(id) {
  const tutti = leggiTutti();
  delete tutti[id];
  return scriviTutti(tutti);
}

export function nuovoId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

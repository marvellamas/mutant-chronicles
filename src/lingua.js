// Piccole regole di lingua per i testi dell'app.

const ELISE = { al: 'all’', Al: 'All’', del: 'dell’', Del: 'Dell’', dal: 'dall’', il: 'l’', Il: 'L’' };

/**
 * Preposizione (o articolo) davanti a un ordinale di livello: «al 5°», ma «all’8°» e «all’11°»
 * (ottavo, undicesimo cominciano per vocale).
 * @param {'al'|'Al'|'del'|'Del'|'dal'|'il'|'Il'} prep
 * @param {number} n
 */
export function conOrdinale(prep, n) {
  return (n === 8 || n === 11) && ELISE[prep] ? `${ELISE[prep]}${n}°` : `${prep} ${n}°`;
}

// Categorie di competenza e limiti del VA personale (Giocatore, Doc del 29/09/2026, 23:45):
// §1.2.1, §2.3, §2.12, §2.13, §4.2, §8.3, §8.7. Funzioni pure; numeri e formule in regole.json →
// competenze, profili delle Classi in classi.json → competenze.
//
// VA grezzo personale = Mod + Base iniziale + Corporazione + Avanzamento; VA personale = min(grezzo,
// limite). La base viene dalla prima Classe e non cambia; il limite dipende da tutte le Classi possedute.
// Bonus e penalità alla Prova (equipaggiamento, Talenti, condizioni) si sommano dopo (§4.2).

/** Categoria di competenza (S, P, G, N) di un'Abilità per una Classe (classi.json → competenze). */
export function competenzaDi(classe, nomeAbilita) {
  for (const [cat, lista] of Object.entries(classe?.competenze ?? {})) if (lista.includes(nomeAbilita)) return cat;
  return null;
}

/** §2.3: base iniziale di un'Abilità, dalla categoria nella prima Classe. */
export function baseIniziale(primaClasse, nomeAbilita, regole) {
  const cat = competenzaDi(primaClasse, nomeAbilita);
  return cat ? regole.competenze.categorie[cat].base : null;
}

/**
 * §8.3 e §8.7: limite del VA personale di un'Abilità con le Classi possedute.
 * Per ogni categoria attribuita all'Abilità da almeno una Classe: fisso + per_grado_totale × G +
 * per_grado_categoria × g (G = Gradi di tutte le Classi, g = Gradi delle Classi con quella categoria);
 * vale il più alto (non si sommano i limiti, non si uniscono gS e gP).
 * @param classi [{ def (voce di classi.json), grado }]
 * @returns {{ valore, categoria, classi: string[] }} categoria e Classi che danno il limite usato
 */
export function limiteAbilita(nomeAbilita, classi, regole) {
  const C = regole.competenze.categorie;
  const G = classi.reduce((s, c) => s + c.grado, 0);
  const perCategoria = new Map();
  for (const c of classi) {
    const cat = competenzaDi(c.def, nomeAbilita);
    if (!cat) continue;
    const x = perCategoria.get(cat) ?? { gradi: 0, classi: [] };
    x.gradi += c.grado;
    x.classi.push(c.def.nome);
    perCategoria.set(cat, x);
  }
  let migliore = null;
  for (const [cat, x] of perCategoria) {
    const L = C[cat].limite;
    const valore = L.fisso + L.per_grado_totale * G + L.per_grado_categoria * x.gradi;
    if (!migliore || valore > migliore.valore) migliore = { valore, categoria: cat, classi: x.classi };
  }
  return migliore ?? { valore: null, categoria: null, classi: [] };
}

/** §1.2.1: VA personale, il minore fra la somma grezza e il limite. */
export function vaPersonale(grezzo, limite) {
  return limite === null || limite === undefined ? grezzo : Math.min(grezzo, limite);
}

/**
 * §2.13 e §8.3: punti liberi che aumentano davvero il VA personale, partendo dal grezzo prima dei punti
 * (dopo i +1 di Classe dello stesso evento). Gli altri sono inattivi: non si spendono.
 * @returns {{ utili, inattivi }}
 */
export function puntiUtili(grezzoPrima, limite, punti) {
  const utili = Math.max(0, Math.min(punti, (limite ?? Infinity) - grezzoPrima));
  return { utili, inattivi: punti - utili };
}

/** Nome leggibile della categoria («Professionali (P)»). */
export const nomeCompetenza = (cat, regole) => (cat ? `${regole.competenze.categorie[cat]?.nome ?? cat} (${cat})` : '—');

// Categorie di competenza e limiti del VA personale: §1.2.1, §2.3, §2.12, §2.13, §4.2, §8.3, §8.3.1, §8.7.
// Funzioni pure; numeri e formule in regole.json → competenze, profili delle Classi in classi.json → competenze.
//
// VA grezzo personale = Mod + Base iniziale + Corporazione + Avanzamento; VA personale = min(grezzo,
// limite). La base viene dalla prima Classe e non cambia; il limite dipende da tutte le Classi possedute.
// Bonus e penalità alla Prova (equipaggiamento, Talenti, condizioni) si sommano dopo (§4.2).
//
// **Due profili, e il cancello** (lotto 192, 13/11/2026). Il Giocatore 0.62 riscrive il profilo delle Abilità da
// 2 Specializzate / 6 Professionali / 12 Generiche / 4 Non competenti a **4/7/9/4**, i punti base da 122 a 127 e i
// limiti del VA (§8.3.1). Una scheda conserva le scelte e **ricalcola** i valori: cambiare la categoria di
// un'Abilità cambia il VA di un personaggio già salvato. Applicare il profilo nuovo a tutti vorrebbe dire che
// stasera sette giocatori aprono la scheda e trovano numeri diversi senza che nessuno l'abbia deciso.
//
// Quindi: **un personaggio usa il profilo nuovo solo se lo dichiara**, con `scelte.regimeAbilita = 2` — lo stesso
// cancello di `regimeTalenti = 2` del 26/10. Senza quel contrassegno vale il profilo di prima
// (`regole.competenze.precedente`, `classi[].competenze_precedenti`) e la scheda resta identica. Il contrassegno
// lo mette la migrazione del lotto C, al tavolo, insieme al giocatore; i personaggi creati da zero nascono col
// profilo nuovo, perché per loro non c'è niente da migrare.
//
// Il profilo si risolve **una volta sola**, con `profiloCompetenze(regole, creazione)`, e si passa a chi ne ha
// bisogno. Per questo `competenzaDi`, `baseIniziale` e `limiteAbilita` prendono il profilo e non più `regole`: un
// chiamante che si dimentica di passarlo si rompe subito, invece di scegliere in silenzio un profilo per conto suo
// — che è il modo in cui un cancello smette di tenere senza che nessuno se ne accorga.

/** Il valore del contrassegno che dichiara il profilo nuovo (come `regimeTalenti`, sta nel codice, non nei dati). */
export const PROFILO_NUOVO = 2;

/** Vero se il personaggio ha dichiarato il profilo 4/7/9/4 del Giocatore 0.62 (§8.3.1). */
export const regimeAbilitaNuovo = (creazione) => creazione?.regimeAbilita === PROFILO_NUOVO;

/**
 * Il profilo delle Abilità in vigore per un personaggio: categorie con base, numero e formula del limite, più il
 * modo di leggere le liste di una Classe. Si risolve una volta e si passa.
 *
 * @param regole data/regole.json
 * @param creazione le scelte della creazione (per il contrassegno); null o senza contrassegno = profilo di prima
 * @returns {{ chiave: 'nuovo'|'precedente', categorie, punti_base_totali, nuovo: boolean }}
 */
export function profiloCompetenze(regole, creazione = null) {
  const c = regole?.competenze;
  if (!c?.categorie) throw new Error('profiloCompetenze: regole.json → competenze.categorie manca');
  if (regimeAbilitaNuovo(creazione) || !c.precedente) {
    return { chiave: 'nuovo', categorie: c.categorie, punti_base_totali: c.punti_base_totali, nuovo: true };
  }
  // il profilo di prima: le stesse categorie con `numero` e `limite` di allora (le basi non sono cambiate)
  const p = c.precedente;
  const categorie = Object.fromEntries(Object.entries(c.categorie).map(([k, v]) => [k, {
    ...v,
    ...(p.categorie?.[k] ? { numero: p.categorie[k].numero ?? v.numero, limite: p.categorie[k].limite ?? v.limite } : {}),
  }]));
  return { chiave: 'precedente', categorie, punti_base_totali: p.punti_base_totali ?? c.punti_base_totali, nuovo: false };
}

/** Le liste di competenza di una Classe secondo il profilo in vigore (classi.json → competenze / _precedenti). */
export function listeCompetenza(classe, profilo) {
  if (!profilo?.chiave) throw new Error('listeCompetenza: serve il profilo di profiloCompetenze');
  if (profilo.chiave === 'nuovo') return classe?.competenze ?? {};
  return classe?.competenze_precedenti ?? classe?.competenze ?? {};
}

/** Categoria di competenza (S, P, G, N) di un'Abilità per una Classe, nel profilo in vigore. */
export function competenzaDi(classe, nomeAbilita, profilo) {
  for (const [cat, lista] of Object.entries(listeCompetenza(classe, profilo))) if (lista.includes(nomeAbilita)) return cat;
  return null;
}

/** §2.3: base iniziale di un'Abilità, dalla categoria nella prima Classe. */
export function baseIniziale(primaClasse, nomeAbilita, profilo) {
  const cat = competenzaDi(primaClasse, nomeAbilita, profilo);
  return cat ? profilo.categorie[cat].base : null;
}

/**
 * §8.3 e §8.7: limite del VA personale di un'Abilità con le Classi possedute.
 * Per ogni categoria attribuita all'Abilità da almeno una Classe: fisso + per_grado_totale × G +
 * per_grado_categoria × g (G = Gradi di tutte le Classi, g = Gradi delle Classi con quella categoria);
 * vale il più alto (non si sommano i limiti, non si uniscono gS e gP).
 * @param classi [{ def (voce di classi.json), grado }]
 * @param profilo quello di `profiloCompetenze`
 * @returns {{ valore, categoria, classi: string[] }} categoria e Classi che danno il limite usato
 */
export function limiteAbilita(nomeAbilita, classi, profilo) {
  const C = profilo.categorie;
  const G = classi.reduce((s, c) => s + c.grado, 0);
  const perCategoria = new Map();
  for (const c of classi) {
    const cat = competenzaDi(c.def, nomeAbilita, profilo);
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
 * A.247 (Davide, 06/11/2026): «Se il Direttore, dopo l'avviso del sistema, forza deliberatamente l'assegnazione di un
 * punto oltre il limite, il VA dell'Abilità aumenta realmente oltre il limite.» Le unità concesse alzano il limite di
 * quell'Abilità per quel personaggio: il limite della categoria non cambia, e tutto il resto continua a rispettarlo
 * (un punto non forzato di un altro livello non passa lo stesso).
 * @param oltre unità concesse dal Direttore (0 = nessuna eccezione)
 */
export function limiteConEccezioni(limite, oltre = 0) {
  if (limite === null || limite === undefined) return limite;
  const n = Number.isInteger(oltre) && oltre > 0 ? oltre : 0;
  return limite + n;
}

/**
 * Quante unità una forzatura concede oltre il limite: quanto il VA passa il limite dopo i punti, meno quanto lo
 * passava già (le eccezioni concesse prima non si contano due volte).
 */
export function oltreIlLimite(grezzoPrima, limite, punti) {
  if (limite === null || limite === undefined) return 0;
  const dopo = Math.max(0, grezzoPrima + punti - limite);
  const prima = Math.max(0, grezzoPrima - limite);
  return Math.max(0, dopo - prima);
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
export const nomeCompetenza = (cat, profilo) => (cat ? `${profilo?.categorie?.[cat]?.nome ?? cat} (${cat})` : '—');

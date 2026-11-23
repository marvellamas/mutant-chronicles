// Le tabelle di un Doc esportato in **testo semplice** (lotto 236, 23/11/2026).
//
// **Perché esiste.** Un Google Doc grande non si esporta in Markdown: l'esportazione impacchetta le immagini nel
// testo e Drive risponde «File too large for export». Il Manuale dei Veicoli è passato da 40 a 67 MB in tre giorni
// e quasi tutto quel peso sono immagini; in testo semplice lo stesso manuale sta in 199 KB e si legge per intero,
// capitoli 16, 17 e 18 compresi. Non era il documento a essere troppo grande: era il nostro importatore a chiedere
// il formato sbagliato (il lotto 229 aveva chiesto a Davide di dividere il manuale; non serve).
//
// **Com'è fatta una tabella in testo semplice.** Le celle non stanno su una riga separate da barre, come nel
// Markdown: stanno **una per riga**, ciascuna preceduta da una tabulazione, tranne la prima dell'intestazione.
// Il blocco si chiude con una riga che ha la sola tabulazione:
//
//     Dato                                     ← prima cella dell'intestazione, senza tabulazione
//     \tValore                                 ← seconda cella dell'intestazione
//     \tProtezioni                             ← prima cella della prima riga
//     \tAR 16; Corazzato 4
//     \tMAN
//     \t−4
//     \t                                       ← la riga vuota con la sola tabulazione chiude il blocco
//
// **Il punto in cui un lettore inventa**, e la regola di questo modulo. Guardando una sequenza di celle non si può
// sapere **quante colonne** ha la tabella: «Dato / Valore» sono due, «Andatura / Q Base/rnd / km/h / Modificatore a
// Pilotare» sono quattro, e la forma del testo è identica. Quindi il numero di colonne **non si indovina**: si
// **censisce**. Qui c'è l'elenco delle intestazioni che sappiamo leggere (`INTESTAZIONI`), e un blocco la cui
// intestazione non è in elenco **non si legge**: finisce nel referto come «intestazione non riconosciuta», con le
// sue prime celle, perché un'intestazione nuova si aggiunge a mano dopo averla guardata, non si deduce.
// È la stessa regola del lettore degli Armamenti (lotto 206): un'etichetta rinominata deve **comparire**, non far
// cadere delle voci in silenzio.
//
// E la regola del Bestiario (lotto 204), qui nella forma più stretta: se dopo l'intestazione le celle non sono un
// multiplo esatto delle colonne, le celle che restano sono **spaiate** e si dichiarano. Non si completa una coppia
// con una stringa vuota, non si scarta l'etichetta orfana, non si attacca il valore alla riga precedente: una
// lettura parziale non si scrive mai sopra un valore buono, e un'etichetta senza il suo valore è una lettura
// parziale.
//
// **Cosa si perde** rispetto al Markdown, e non si aggira: le **immagini** (nel manuale le «tavole» di ogni mezzo
// restano come una riga di titolo e due spazi), il **grassetto** e i **livelli dei titoli** (`#`, `##`). Chi legge
// la struttura non si appoggia a quelli: `titoloNumerato` riconosce un titolo dalla sua **numerazione**, che nel
// testo c'è («16.11 Bastion TC»), non dai cancelletti.

const BOM = '﻿';

/** Le righe di un export in testo semplice: senza BOM, senza CR, senza spazi in coda. */
export function righeTesto(testo) {
  return String(testo).replace(new RegExp('^' + BOM), '').replace(/\r/g, '').split('\n').map((r) => r.replace(/[ ]+$/, ''));
}

/** Vero se il testo è un export in testo semplice (celle con la tabulazione) e non un Markdown (righe con le barre). */
export function eTestoSemplice(testo) {
  const r = righeTesto(testo);
  const conTab = r.filter((x) => /^\t/.test(x)).length;
  const conBarra = r.filter((x) => /^\s*\|/.test(x)).length;
  return conTab > conBarra;
}

const pulisci = (s) => String(s).replace(/\s+/g, ' ').trim();

/**
 * I blocchi di tabella grezzi, **senza interpretarli**: una prima cella senza tabulazione, poi le celle con la
 * tabulazione, fino alla riga con la sola tabulazione (o alla prima riga che non ne ha una).
 *
 * @returns {{ celle: string[], riga: number, chiuso: boolean }[]}
 */
export function blocchiTesto(testo) {
  const r = righeTesto(testo);
  const out = [];
  for (let i = 0; i < r.length - 1; i++) {
    if (/^\t/.test(r[i]) || !pulisci(r[i])) continue;
    if (!/^\t/.test(r[i + 1])) continue;
    const celle = [pulisci(r[i])];
    let j = i + 1;
    let chiuso = false;
    for (; j < r.length && /^\t/.test(r[j]); j++) {
      const c = pulisci(r[j].slice(1));
      if (!c) { chiuso = true; j++; break; } // la riga con la sola tabulazione chiude il blocco
      celle.push(c);
    }
    // una «tabella» di due celle in tutto non è una tabella: è una riga di testo seguita da una cella
    if (celle.length >= 3) out.push({ celle, riga: i + 1, chiuso });
    i = j - 1;
  }
  return out;
}

/**
 * Le intestazioni **censite**: quelle che sappiamo leggere, e quante colonne hanno. Si aggiunge una voce qui dopo
 * aver guardato la tabella nel manuale, non perché un conto tornava.
 *
 * Censite sul Manuale dei Veicoli 0.23 (capitoli 1–18) il 23/11/2026.
 */
export const INTESTAZIONI = [
  // le schede dei mezzi dei capitoli 16, 17 e 18 (29 + 21 + 20 + 20 + 20 tabelle)
  ['Dato', 'Valore'],
  ['Requisito', 'Valore'],
  ['Dato', 'Profilo'],
  // la scheda della Neverlost (cap. 11), nel testo semplice
  ['Protezione', 'Valore'],
  ['Struttura', 'PI massimi', 'Prima fascia danneggiata', 'Seconda fascia', 'Terza fascia', 'A 0 PI'],
  ['Andatura', 'Q Base/rnd', 'km/h', 'Modificatore a Pilotare'],
  ['Sistema', 'Danno', 'VA', 'Gittata massima', 'Dotazione'],
  ['Sistema', 'Riserva', 'Consumo e autonomia'],
  ['Sistema', 'Riserva', 'Consumo'],
  ['Artefatto', 'Creazione con progetto disponibile', 'Vendita indicativa'],
  // il quadro delle dodici categorie d'impiego (§16) e le due tabelle del capitolo 18
  ['Categoria', 'Mezzi definiti o stato dello sviluppo'],
  ['Quantità', 'Equipaggiamento', 'Costo totale, cr', 'Peso totale, kg'],
  ['Differenza o riferimento', 'Allestimento SIA'],
  // le schede dei capitoli 9-13, nella forma che avevano prima: la rete di non-regressione del lettore
  ['Caratteristica', 'Valore', 'Caratteristica', 'Valore'],
  ['Caratteristica', 'Valore'],
  ['Regime', 'Q con 1 AzM', 'km/h equivalenti', 'Mod. Pilotare'],
  ['Andatura', 'Q per Round', 'km/h equivalenti', 'Pilotare'],
  ['Struttura', 'PI massimi', 'Cr per PI', 'Da 0 al massimo'],
  ['Struttura', 'PI massimi', 'Ricambi per PI'],
  ['Impianto', 'Configurazione'],
  ['d20', 'Bersaglio', 'Accurato', 'PI massimi', 'PI attuali'],
  ['Dotazione', 'Quantità', 'Costo totale cr'],
  ['Dotazione', 'Valore'],
];

/**
 * Le intestazioni censite che nel testo non combaciano con niente: una voce che non si vede in nessun manuale non
 * e un censimento, e una regola che nessuno applica invecchia senza farsi notare. Il referto la nomina.
 */
export function censiteNonViste(testo) {
  const viste = new Set();
  for (const b of blocchiTesto(testo)) { const h = intestazioneDi(b.celle); if (h) viste.add(h.join('|')); }
  return INTESTAZIONI.filter((h) => !viste.has(h.join('|'))).map((h) => h.join(' | '));
}

/** L'intestazione censita più lunga che combacia con l'inizio di queste celle, o null. */
export function intestazioneDi(celle) {
  let scelta = null;
  for (const h of INTESTAZIONI) {
    if (h.length > celle.length) continue;
    if (!h.every((x, k) => celle[k] === x)) continue;
    if (!scelta || h.length > scelta.length) scelta = h;
  }
  return scelta;
}

/**
 * Le tabelle di un testo semplice, nella stessa forma che `leggiTabelle` dà per il Markdown
 * (`{ colonne, righe, riga }`), più il referto di quello che **non** si è letto.
 *
 * @returns {{ tabelle: {colonne,righe,riga}[], spaiate: {riga,colonne,celle}[], nonRiconosciute: {riga,prime}[] }}
 */
export function tabelleTesto(testo) {
  const tabelle = [];
  const spaiate = [];
  const nonRiconosciute = [];
  for (const b of blocchiTesto(testo)) {
    const h = intestazioneDi(b.celle);
    if (!h) { nonRiconosciute.push({ riga: b.riga, prime: b.celle.slice(0, 4) }); continue; }
    const dati = b.celle.slice(h.length);
    const righe = [];
    let i = 0;
    for (; i + h.length <= dati.length; i += h.length) righe.push(dati.slice(i, i + h.length));
    const resto = dati.slice(i);
    // le celle che restano NON si completano e NON si scartano: si dichiarano
    if (resto.length) spaiate.push({ riga: b.riga, colonne: h.length, celle: resto });
    tabelle.push({ colonne: h.slice(), righe, riga: b.riga });
  }
  return { tabelle, spaiate, nonRiconosciute };
}

/**
 * Il titolo numerato in cui cade una riga: «16.11 Bastion TC» → { capitolo: 16, numero: '16.11', titolo: 'Bastion TC' }.
 * Riconosciuto dalla **numerazione**, non dai cancelletti del Markdown né dal grassetto: il testo semplice non li ha.
 */
export function titoloNumerato(righe, riga) {
  for (let i = riga - 1; i >= 0; i--) {
    const grezza = String(righe[i] ?? '');
    // **Primo: un titolo non è mai una cella.** Nel testo semplice ogni cella di tabella comincia con una
    // tabulazione, e un titolo no. Senza questa guardia celle come «1 CEC Rossa da 100 UER; 10 cariche» o
    // «20 ScE/rnd, fino al massimo» diventavano titoli dei capitoli 1 e 20, e le tabelle finivano nel
    // capitolo sbagliato (nella prima stesura di questo lettore erano 44 tabelle su 130).
    if (/^\t/.test(grezza)) continue;
    const m = /^(\d{1,2})(\.\d{1,2})*\s+(\D.*)$/.exec(grezza.trim());
    if (!m) continue;
    const numero = m[0].slice(0, m[0].length - m[3].length).trim();
    const testo = m[3].trim();
    // «18.000 cr», «16 Q Tattici/rnd», «50 t, comprese persone»: un titolo non comincia con un'unità di misura
    if (/^(cr|kg|Q|ore|km|m|missili|colpi|mm|t)\b/i.test(testo)) continue;
    // e comincia con una lettera MAIUSCOLA: nel testo semplice è la sola cosa che resta per riconoscerlo, perché
    // i cancelletti e il grassetto si perdono. Senza questa guardia «80 giornate-persona» era un titolo.
    if (/^[^\p{Lu}]/u.test(testo)) continue;
    // e ha almeno DUE parole, la prima di almeno tre lettere: nel manuale non esiste un titolo di una parola sola,
    // e senza questa guardia una cella come «12 PI» diventava il capitolo 12.
    const parole = testo.split(/\s+/);
    if (parole.length < 2 || parole[0].replace(/[^\p{L}]/gu, '').length < 3) continue;
    // e non è una frase: i titoli di questo manuale non hanno punti e virgola, uguali, e stanno in 80 caratteri
    // («18.5 Registro delle modifiche dalla versione 0.22 alla 0.23» è il più lungo, 59). «1 Round = 6 secondi;
    // 1 Q = 1,5 m. Il mezzo si muove…» è prosa, e passava tutte le guardie precedenti.
    if (/[;=]/.test(testo) || testo.length > 80) continue;
    return { capitolo: Number(m[1]), numero, titolo: testo };
  }
  return null;
}

/** Il capitolo in cui cade una riga, nel testo semplice. */
export const capitoloTesto = (righe, riga) => titoloNumerato(righe, riga)?.capitolo ?? null;

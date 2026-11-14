// Lotto 195 (14/11/2026) — prezzi degli Artefatti dal manuale, Anello e CyberArma: A.261, A.263, A.265.
//
//   node tools/lotti/lotto_195_prezzi.mjs            dice cosa cambierebbe, non scrive
//   node tools/lotti/lotto_195_prezzi.mjs --scrivi   scrive data/equipaggiamento/artefatti.json e armi.json
//
// **Il punto di questo lotto: i prezzi si leggono dal manuale, non si ricalcolano.** La A.261 risponde che la
// formula del §24.3 vince — e Davide ha già ricalcolato il catalogo con essa: le tabelle del §10 dell'Equipaggiamento
// 0.41 portano prezzi nuovi, dal primo all'ultimo (una Batteria Rossa da 5 PM passa da 1.000 a 1.950 cr). Quindi
// questo programma **copia** le cifre scritte nelle tabelle, e la formula serve soltanto a **verificare** che
// tornino: `controlloFormula()` le ricalcola e stampa le voci dove il conto non coincide. Una voce che non torna è
// un'ambiguità da dichiarare, non un numero da correggere — se questo programma ricalcolasse i prezzi, la prossima
// volta che Davide ne cambia uno a mano l'app non se ne accorgerebbe.
//
// Il gradino **Epica 4** entra nella scala dei coefficienti (`regole.json` → `prezzi_artefatti`, a mano, è una
// regola): senza di lui le quattro voci di Grado V non avevano prezzo (A.262, che la A.261 chiude).
//
// Le altre due risposte stanno qui perché toccano le stesse tabelle:
//   - **A.263**: l'Anello con Rigenerazione 9 passa a Grado IV, potenza Molto Rara e SnT 4 (Magia 1.17 §25.4).
//     Grado, potenza e SnT adesso si accordano con le tabelle del §10.1 e del §7.10, quindi l'eccezione dichiarata
//     dal lotto 181 (`snt_eccezione`) **si toglie**: non c'è più niente da eccettuare.
//   - **A.265**: la CyberArma ha potenza Rara, Grado III e SnT base 3; la SnT effettiva è 2 per il Tecnomante,
//     1 per un Custode e 0 per il Custode che l'ha costruita e la usa come propria (Armamenti 0.83 §7.25). Prima
//     nei dati l'originale era «Comune» con SnT 2 e la catena non tornava: `snt_per_impiego` la lasciava passare.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RADICE, righeManuale, versioneManuale } from '../manuali.mjs';

const F_ARTEFATTI = join(RADICE, 'data', 'equipaggiamento', 'artefatti.json');
const F_ARMI = join(RADICE, 'data', 'equipaggiamento', 'armi.json');

const leggi = (f) => JSON.parse(readFileSync(f, 'utf8'));
const scrivi = (f, j) => writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);

/** «1.950» → 1950; «—» e «Ricetta speciale» → null. */
export function numeroCr(testo) {
  const t = String(testo ?? '').trim();
  if (!/\d/.test(t)) return null;
  const n = Number(t.replace(/[.\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Le righe di tabella di una sezione del manuale: celle già divise, senza i separatori. */
export function righeTabella(righe, dalTitolo, alTitolo) {
  const i = righe.findIndex((r) => r.startsWith(dalTitolo));
  if (i < 0) throw new Error(`nel manuale non trovo «${dalTitolo}»`);
  const j = righe.findIndex((r, k) => k > i && alTitolo.some((t) => r.startsWith(t)));
  return righe
    .slice(i, j < 0 ? righe.length : j)
    .filter((r) => r.trim().startsWith('|'))
    .map((r) => r.split('|').slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length > 1 && !c.every((x) => /^[-: ]*$/.test(x)));
}

const COLORI = { Rosso: 'rosso', Blu: 'blu', Verde: 'verde', Bianco: 'bianco' };
const REP = { Comune: 'CO', 'Non comune': 'NC', 'Non Comune': 'NC', Rara: 'RA', 'Molto Rara': 'MR', 'Molto rara': 'MR', Epica: 'EP', Leggendaria: 'LE', Eccezionale: 'EC' };

/**
 * I prezzi delle riserve mistiche, **letti** dalle tabelle del §10 dell'Equipaggiamento.
 * @returns {Map<string, { costo, creazione_cr, reperibilita, grado, snt, fonte }>} per id della voce
 */
export function prezziDalManuale(righe = righeManuale('equipaggiamento')) {
  const out = new Map();
  const tre = (titolo, prefisso, fine) => {
    for (const c of righeTabella(righe, titolo, fine)) {
      const colore = COLORI[c[0]];
      const pm = numeroCr(c[1]);
      if (!colore || !pm) continue;
      const [grado, snt] = String(c[2]).split('/').map((x) => x.trim());
      out.set(`${prefisso}-da-${pm}-pm-chroma-${colore}`, {
        costo: numeroCr(c[3]),
        creazione_cr: numeroCr(c[4]),
        reperibilita: REP[c[5]] ?? null,
        grado,
        snt: numeroCr(snt),
        fonte: titolo.replace(/^(\d+\.\d+)\s.*/, '$1'),
      });
    }
  };
  tre('10.2 Batterie Mistiche', 'batteria', ['10.3 ']);
  tre('10.3 Batterie Matrice', 'batteria-matrice', ['10.4 ']);
  // §10.4: le Schegge non hanno un costo di creazione — valgono il Chroma grezzo (eccezione dichiarata nel §10.1)
  for (const c of righeTabella(righe, '10.4 Schegge instabili', ['10.4.1 '])) {
    const colore = COLORI[c[0]];
    const pm = numeroCr(c[1]);
    if (!colore || !pm) continue;
    out.set(`scheggia-instabile-da-${pm}-pm-chroma-${colore}`, { costo: numeroCr(c[3]), creazione_cr: undefined, reperibilita: REP[c[4]] ?? null, grado: null, snt: 0, fonte: '10.4' });
  }
  return out;
}

/** Le pergamene del §10.8: Creazione e Vendita, dalla tabella. */
export function pergameneDalManuale(righe = righeManuale('equipaggiamento')) {
  const out = new Map();
  for (const c of righeTabella(righe, '10.8 Artefatti consumabili', ['10.8.1 '])) {
    if (!/^(Cura|Arma|Armatura|Individuare|Esorcizzare|Rigenerazione)/.test(c[0])) continue;
    const id = `pergamena-di-${c[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}`;
    out.set(id, { grado: c[1], pm: numeroCr(c[2]), creazione_cr: numeroCr(c[4]), costo: numeroCr(c[5]), fonte: '10.8' });
  }
  return out;
}

/** I prezzi scritti a parola nel testo del §10 (Pietra, Guanti, Hachimaki) e nel §7.25 degli Armamenti. */
export const PREZZI_A_TESTO = {
  // §10.5: «Prezzo indicativo 4.000 cr; REP Molto Rara» e «2.100 cr con progetto posseduto». La formula del §24.3
  // darebbe 12.600 cr: la cifra scritta resta, la differenza si dichiara (vedi `ambigue`).
  'pietra-della-vigilanza': { costo: 4000, creazione_cr: 2100, reperibilita: 'MR', fonte: 'Equipaggiamento §10.5' },
  // §10.6: «Prezzo indicativo 3.000 cr; REP Molto Rara» e «2.300 cr con progetto posseduto». Formula: 13.800 cr.
  'guanti-da-combattimento-mistico': { costo: 3000, creazione_cr: 2300, reperibilita: 'MR', fonte: 'Equipaggiamento §10.6' },
  // §10.10: «costo di creazione 800 cr; prezzo indicativo di vendita 3.600 cr secondo la formula del §10.1»
  'hachimaki-della-disciplina-interiore': { costo: 3600, creazione_cr: 800, reperibilita: 'MR', fonte: 'Equipaggiamento §10.10' },
};

/**
 * La tabella dei Consumabili del §27.2 della Magia: reagenti, creazione, vendita e REP per Grado.
 *
 * Qui la A.261 si vede meglio che altrove: fino alla 1.11 il §27.2 diceva «Vendita = Creazione × 2» e i dati
 * avevano `vendita_moltiplicatore: 2`. La 1.17 scrive «Prezzo indicativo di vendita = costo completo di creazione
 * × 3 × coefficiente di potenza» e ricalcola tutte e sei le righe (Grado I da 150 a 250 cr). Il moltiplicatore 2
 * esce dai dati: non c'è più una regola di prezzo dei Consumabili diversa da quella generale.
 */
export function consumabiliDalManuale(righe = righeManuale('magia')) {
  const out = [];
  const LIV = { I: [1, 3], II: [4, 8], III: [9, 11], IV: [12, 14], V: [15, 17], VI: [18, 18] };
  for (const c of righeTabella(righe, '27.2 Creazione e risorse', ['27.3 '])) {
    if (!LIV[c[0]]) continue;
    out.push({ grado: c[0], livelli: LIV[c[0]], reagenti: numeroCr(c[1]), creazione: numeroCr(c[2]), vendita: numeroCr(c[3]), reperibilita: REP[c[4]] ?? null });
  }
  return out;
}

/** Vero se la cifra scritta nel manuale torna con la formula del §24.3 (costo × 3 × coefficiente, ai 50 cr). */
export function controlloFormula({ costo, creazione_cr, potenza }, coefficienti) {
  const coef = coefficienti[potenza];
  if (!Number.isFinite(costo) || !Number.isFinite(creazione_cr) || !Number.isFinite(coef)) return { torna: null, calcolato: null, coef: coef ?? null };
  const calcolato = Math.ceil((creazione_cr * 3 * coef) / 50) * 50;
  return { torna: calcolato === costo, calcolato, coef };
}

const POTENZA_DI_GRADO = { I: 'Comune', II: 'Non Comune', III: 'Rara', IV: 'Molto Rara', V: 'Epica', VI: 'Leggendaria' };

/**
 * **A.263 — l'Anello con Rigenerazione 9 passa a Grado IV, Molto Rara, SnT 4.**
 *
 * Magia 1.17 §25.4: «un anello con la sola Rigenerazione 9 Esclusiva è di Grado IV, potenza Molto Rara e SnT 4».
 * La 1.11 diceva Grado III e SnT 3, e la A.256 gli dava intanto la potenza «Molto rara»: tre anelli della catena
 * in disaccordo, che il lotto 181 aveva dovuto dichiarare come eccezione (`snt_eccezione`) in attesa della
 * risposta. Adesso Grado IV → Molto Rara (§10.1) → SnT 4 (§7.10) si accordano, e **l'eccezione si toglie**: non
 * c'è più niente da eccettuare, e lasciarla lì vorrebbe dire tenere spento per sempre il controllo su quella voce.
 *
 * Due conseguenze che non sono scritte nel manuale e che **non applico**, dichiarandole:
 *  - la SnT 4 occupa una unità in più della capacità di Sintonizzazione: l'app la calcola da sé dal campo, non c'è
 *    nulla da scrivere (nessun personaggio possiede l'Anello: è una configurazione del catalogo);
 *  - i reagenti dell'infusione di Grado IV costano 2.000 cr invece dei 1.000 del Grado III (§24.5), quindi il
 *    costo completo di creazione passerebbe da 1.500 a 2.500 cr e il prezzo da 13.500 a 22.500. Il costo di
 *    1.500 cr però non è una nostra deduzione: lo dichiara la A.256, e la A.261 dice che i prezzi si prendono
 *    scritti, non ricalcolati. Resta 1.500 → 13.500, e la differenza sta scritta nel dato come ipotesi.
 */
export function anelloA263(art, cambi) {
  const v = art.oggetti.find((x) => x.id === 'anello-di-rigenerazione-9');
  if (!v) throw new Error('nel catalogo non trovo l’Anello con Rigenerazione 9');
  const a = v.artefatto;
  if (a.grado !== 'IV') { cambi.push(`anello-di-rigenerazione-9: Grado ${a.grado} → IV (Magia 1.17 §25.4, A.263)`); a.grado = 'IV'; }
  if (a.potenza !== 'Molto Rara') { cambi.push(`anello-di-rigenerazione-9: potenza ${a.potenza} → Molto Rara`); a.potenza = 'Molto Rara'; }
  if (a.sintonizzazione !== 4) { cambi.push(`anello-di-rigenerazione-9: SnT ${a.sintonizzazione} → 4`); a.sintonizzazione = 4; }
  if (a.snt_eccezione !== undefined) { cambi.push('anello-di-rigenerazione-9: via snt_eccezione — Grado, potenza e SnT adesso si accordano (A.263)'); delete a.snt_eccezione; }
  if (v['TODO(Davide)'] !== undefined) { cambi.push('anello-di-rigenerazione-9: via TODO(Davide) della A.263, risposta'); delete v['TODO(Davide)']; }
  v.note_manuale = v.note_manuale
    .replace('Anello con la sola Rigenerazione 9 Esclusiva (Magia §25.4): Grado III, SnT 3.', 'Anello con la sola Rigenerazione 9 Esclusiva (Magia §25.4): Grado IV, potenza Molto Rara, SnT 4 (A.263).');
  v.versione_manuale = `Magia ${versioneManuale('magia')} §25.4 (A.263); configurazione approvata da Davide il 02/11/2026`;
  v.attivazione_lunga.fonte = `Magia ${versioneManuale('magia')} §25.4; configurazione approvata da Davide il 02/11/2026`;
  v._nota_prezzo = 'A.256: costo completo di costruzione 1.500 cr, potenza Molto Rara → prezzo di vendita 1.500 × 3 × 3 = 13.500 cr. **Ipotesi dichiarata (confronto alla cieca, A.263):** con il Grado IV i reagenti dell’infusione costano 2.000 cr invece di 1.000 (Magia §24.5), quindi il costo completo potrebbe essere 2.500 cr e il prezzo 22.500. Il manuale non dà né il costo né il prezzo di questo anello; i 1.500 cr li dichiara la A.256 e la A.261 dice che i prezzi si prendono scritti e non ricalcolati, quindi restano 1.500 → 13.500 cr. Se Davide vuole il conto del Grado IV, cambia una riga di questo file.';
  return v;
}

/**
 * **A.265 — la CyberArma: potenza Rara, Grado III, SnT base 3, con le riduzioni d'impiego 2 / 1 / 0.**
 *
 * Armamenti 0.83 §7.25 e Magia 1.17 §§24.1–24.2: «La sua potenza è Rara, corrispondente al Grado III e a una SnT
 * base 3. La SnT effettiva scende a 2 per il Tecnomante, a 1 per un Custode e a 0 per il Custode che l'ha
 * costruita e la usa come propria arma personale». Nei dati l'originale era «Comune» con SnT 2 e `snt_per_impiego`
 * copriva il disaccordo; le due conversioni erano «Non Comune» 2 e «Rara» 3. Il manuale dice che la scala è una
 * sola per tutte e tre: «La SnT effettiva continua a seguire la scala generale della CyberArma: base 3,
 * Tecnomante 2, Custode 1, Custode costruttore e proprietario 0».
 *
 * Lo 0 del costruttore non è la SnT di una Classe: è la SnT di una **condizione** (quel Custode, quell'esemplare).
 * Per questo sta in `sintonizzazione_costruttore`, con la condizione scritta, e non fra le Classi.
 */
export function cyberarmaA265(art, cambi) {
  const PER_CLASSE = { Tecnomante: 2, Custode: 1 };
  const COSTRUTTORE = {
    classe: 'Custode',
    snt: 0,
    condizione: 'il Custode che ha costruito quell’esemplare e lo usa come propria arma personale',
    fonte: `Armamenti ${versioneManuale('armamenti')} §7.25; Magia ${versioneManuale('magia')} §§24.1–24.2 (A.265)`,
  };
  for (const a of art.artefatti_catalogo.filter((x) => String(x.rif).startsWith('armi:cyberarma'))) {
    if (a.potenza !== 'Rara') { cambi.push(`${a.rif}: potenza ${a.potenza} → Rara (A.265)`); a.potenza = 'Rara'; }
    if (a.sintonizzazione !== 3) { cambi.push(`${a.rif}: SnT base ${a.sintonizzazione} → 3 (A.265)`); a.sintonizzazione = 3; }
    if (a.grado !== 'III') { cambi.push(`${a.rif}: Grado ${a.grado ?? '—'} → III`); a.grado = 'III'; }
    a.sintonizzazione_per_classe = { ...PER_CLASSE };
    a.sintonizzazione_costruttore = { ...COSTRUTTORE };
    a._nota = 'A.265 (Armamenti 0.83 §7.25; Magia 1.17 §§24.1–24.2): potenza Rara, Grado III, SnT base 3. La SnT effettiva è 2 per il Tecnomante, 1 per un Custode e 0 per il Custode che l’ha costruita e la usa come propria arma personale. Vale per l’originale e per le due conversioni: «Capacità della riserva e modulatore SIN non cambiano questa scala». Le riduzioni d’impiego restano regole a sé (snt_per_impiego) e non determinano danno o Grado.';
  }
  return art.artefatti_catalogo.filter((x) => String(x.rif).startsWith('armi:cyberarma'));
}

/**
 * **L'Hachimaki: l'eccezione del §28.1 va dichiarata come tutte le altre.**
 *
 * SnT 1 con sole proprietà passive è l'eccezione che la Magia §28.1 scrive a parole («SnT 1 e sintonizzazione
 * necessaria per il beneficio»). Nei dati la portava il solo campo `snt_beneficio`, che il validatore conosce ma
 * che non dice *perché*: dopo questo lotto l'unico modo di uscire dalla catena è `snt_eccezione` con la regola e
 * il motivo, e questa è l'ultima voce che ne aveva bisogno senza averla.
 */
export function hachimakiEccezione(art, cambi) {
  const v = art.oggetti.find((x) => x.id === 'hachimaki-della-disciplina-interiore');
  if (!v) return null;
  if (v.artefatto.snt_eccezione === undefined) {
    cambi.push('hachimaki-della-disciplina-interiore: eccezione dichiarata (Magia §28.1: SnT 1 con sole proprietà passive)');
    v.artefatto.snt_eccezione = {
      regola: `Magia ${versioneManuale('magia')} §28.1; Equipaggiamento ${versioneManuale('equipaggiamento')} §10.10`,
      motivo: 'Con sole proprietà passive la SnT sarebbe 0 (§7.10) e la potenza Non Comune vorrebbe SnT 2: il §28.1 prescrive invece SnT 1 e la sintonizzazione come condizione del beneficio passivo sui PM. È una deroga scritta nel manuale, non un dato approssimato.',
    };
  }
  return v;
}

function applica(scriviDavvero) {
  const righe = righeManuale('equipaggiamento');
  const riserve = prezziDalManuale(righe);
  const pergamene = pergameneDalManuale(righe);
  const art = leggi(F_ARTEFATTI);
  const coefficienti = leggi(join(RADICE, 'data', 'regole.json')).prezzi_artefatti.coefficienti;
  const cambi = [];
  const ambigue = [];

  for (const v of art.oggetti) {
    const m = riserve.get(v.id) ?? pergamene.get(v.id) ?? PREZZI_A_TESTO[v.id] ?? null;
    if (!m) continue;
    if (Number.isFinite(m.costo) && v.costo !== m.costo) { cambi.push(`${v.id}: prezzo ${v.costo ?? '—'} → ${m.costo} cr (${m.fonte})`); if (scriviDavvero) v.costo = m.costo; }
    if (Number.isFinite(m.creazione_cr) && v.creazione_cr !== m.creazione_cr) { cambi.push(`${v.id}: creazione ${v.creazione_cr ?? '—'} → ${m.creazione_cr} cr`); if (scriviDavvero) v.creazione_cr = m.creazione_cr; }
    if (m.reperibilita && v.reperibilita !== m.reperibilita) { cambi.push(`${v.id}: REP ${v.reperibilita ?? '—'} → ${m.reperibilita}`); if (scriviDavvero) v.reperibilita = m.reperibilita; }
    // Il Grado scritto nella tabella decide la potenza (§10.1): è la catena Grado → potenza → SnT. Si applica solo
    // alle voci che hanno una potenza — un Consumabile monouso del §27 ha SnT 0 e nessuna potenza, e resta così.
    if (m.grado && v.artefatto?.potenza) {
      const potenza = POTENZA_DI_GRADO[m.grado];
      if (potenza && v.artefatto.potenza !== potenza) { cambi.push(`${v.id}: potenza ${v.artefatto.potenza} → ${potenza} (Grado ${m.grado})`); if (scriviDavvero) v.artefatto.potenza = potenza; }
      if (Number.isFinite(m.snt) && v.artefatto.sintonizzazione !== m.snt) { cambi.push(`${v.id}: SnT ${v.artefatto.sintonizzazione} → ${m.snt}`); if (scriviDavvero) v.artefatto.sintonizzazione = m.snt; }
      if (scriviDavvero) v.artefatto.grado = m.grado;
    }
    const potenzaPerIlConto = v.artefatto?.potenza ?? POTENZA_DI_GRADO[m.grado ?? v.artefatto?.consumabile?.grado];
    const c = controlloFormula({ costo: m.costo, creazione_cr: m.creazione_cr, potenza: potenzaPerIlConto }, coefficienti);
    if (c.torna === false) ambigue.push(`${v.id}: il manuale scrive ${m.costo} cr, la formula del §24.3 dà ${c.calcolato} cr (creazione ${m.creazione_cr} × 3 × ${c.coef})`);
  }

  // §27.2 della Magia: la tabella per Grado dei Consumabili, e via il «× 2» che la 1.17 non ha più
  const gradi = consumabiliDalManuale();
  for (const g of gradi) {
    const vecchio = art.consumabili.gradi.find((x) => x.grado === g.grado);
    for (const campo of ['reagenti', 'creazione', 'vendita', 'reperibilita']) {
      if (vecchio && vecchio[campo] !== g[campo]) { cambi.push(`consumabili ${g.grado}: ${campo} ${vecchio[campo]} → ${g[campo]} (Magia §27.2)`); if (scriviDavvero) vecchio[campo] = g[campo]; }
    }
    const c = controlloFormula({ costo: g.vendita, creazione_cr: g.creazione, potenza: POTENZA_DI_GRADO[g.grado] }, coefficienti);
    if (c.torna === false) ambigue.push(`consumabili ${g.grado}: il manuale scrive ${g.vendita} cr, la formula dà ${c.calcolato} cr`);
  }

  // B e C: le due risposte che toccano le stesse tabelle. Sono modifiche di poche righe, quindi si applicano
  // sempre su una copia in memoria e si scrivono solo con --scrivi, come i prezzi.
  anelloA263(art, cambi);
  cyberarmaA265(art, cambi);
  hachimakiEccezione(art, cambi);

  if (scriviDavvero) {
    if (art.consumabili.vendita_moltiplicatore !== undefined) {
      cambi.push('consumabili: via «vendita_moltiplicatore: 2» — la 1.17 usa la formula del §24.3 (A.261)');
      delete art.consumabili.vendita_moltiplicatore;
      art.consumabili.vendita = 'Prezzo indicativo di vendita = costo completo di creazione × 3 × coefficiente di potenza del Grado, arrotondato per eccesso ai 50 cr (Magia 1.17 §27.2, la stessa formula del §24.3): non c’è più un moltiplicatore dei Consumabili a parte.';
    }
    art.consumabili.versione_manuale = `Magia ${versioneManuale('magia')} §27`;
    art.versione_manuale = `Equipaggiamento ${versioneManuale('equipaggiamento')} (prezzi del §10 letti dal manuale, A.261)`;
    scrivi(F_ARTEFATTI, art);
  }
  return { cambi, ambigue, riserve, pergamene };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('lotto_195_prezzi.mjs')) {
  const scriviDavvero = process.argv.includes('--scrivi');
  const { cambi, ambigue } = applica(scriviDavvero);
  for (const r of cambi) console.log(`  ${r}`);
  console.log(`\n${cambi.length} valori ${scriviDavvero ? 'scritti' : 'da scrivere'} (letti dalle tabelle del manuale).`);
  if (ambigue.length) {
    console.log('\nVoci in cui la cifra scritta non torna con la formula (ambiguità, non errori da correggere):');
    for (const r of ambigue) console.log(`  ${r}`);
  } else console.log('La formula del §24.3 ritrova tutte le cifre scritte nel manuale.');
  if (!scriviDavvero) console.log('\nNiente scritto. Con --scrivi si fa.');
}

export { applica };

// Adeguamento straordinario delle Abilità (lotto 194, 13/11/2026): il passaggio di un personaggio salvato al profilo
// 4/7/9/4 del Giocatore 0.62 (§8.3.1) e alla redistribuzione dei Punti Abilità Liberi.
// Funzioni pure, sui file come oggetti (l'export di src/character.js → serializza). Il programma che legge la
// cartella, fa la copia di sicurezza, chiede SI e scrive è `tools/adegua-abilita.mjs`.
//
// **La nota di prima viene prima di tutto.** Il 26 ottobre, ai Talenti, la nota di quello che un personaggio aveva
// è arrivata dopo e solo su alcuni: al tavolo i giocatori non riuscivano a ritrovare i propri Talenti vecchi, e non
// c'è stato modo di rimediare. Qui `notaDiPrima` fotografa tutte e 24 le Abilità — categoria, VA, base,
// Corporazione, punti automatici di Classe, punti liberi **evento per evento**, limite ed eccezioni della A.247 —
// e `pianoAdeguamento` **non parte** su un personaggio di cui non riesce a scriverla (`bloccato`). La nota finisce
// nel registro «Modifiche del master», che la scheda di ogni giocatore legge dal tablet: è il giocatore che ha
// bisogno di ritrovare i suoi numeri, non noi.
//
// **Si torna indietro, per personaggio.** La stessa riga porta `primaDelAdeguamento`, cioè i soli campi che la
// procedura tocca, con il valore esatto che avevano. `annullaAdeguamento` li rimette: il file torna identico a
// com'era, contrassegno compreso. Al tavolo qualcuno sbaglierà, e con sette persone che aspettano non si rifà la
// serata.
//
// **Il monte non è scritto qui.** §8.3.1: «7 punti per ciascun Grado complessivo acquisito, incluso il primo». A
// livello 8, con tre Gradi, fa i 21 del blocco approvato dell'11/11; a un livello diverso fa un altro numero, e la
// procedura lo dice invece di inventare. I punti si assegnano **sull'ultimo evento**, perché il §8.3.1 vuole stato
// e limiti attuali: metterli alla creazione li farebbe tagliare dal limite del I Grado.
//
// **A.267 (Davide, 15/11/2026) — la discesa è accettata, e la procedura parte** (lotto 207). Fino a ieri, se
// un'Abilità passava a una categoria più bassa e perdeva base, `pianoAdeguamento` si fermava: la domanda era
// aperta e decidere da sé sarebbe stato inventare. La risposta dice:
//
//   «Si adeguano prima categorie e basi al nuovo profilo. Se il VA personale diminuisce, la diminuzione è
//   accettata: non si conserva automaticamente il valore precedente e non si assegna una compensazione
//   automatica. Il giocatore usa normalmente i 21 punti liberi, nei limiti previsti. Ogni eccezione del Direttore
//   è separata, esplicita e registrata.»
//
// Quindi: la discesa **non blocca più**, non si compensa e non si conserva niente di nascosto. Resta **detta** in
// tre posti, perché un VA che scende senza spiegazione al tavolo è una discussione: nel piano (`scendono`,
// `cambi`), nella riga di registro (`scendonoA267`, che resta nel file) e nel pannello del giocatore, dove la riga
// dell'Abilità mostra com'era e come diventa. L'eccezione del Direttore **non la fa questa procedura**: è un atto
// separato, esplicito e registrato, e nell'app è il ✎ di «Modifica master» sul VA, che chiede il motivo e scrive
// la sua riga — esattamente «separata, esplicita e registrata».
import { calcolaSchedaPersonaggio, migraPersonaggio } from './avanzamento.js';
import { nuovaCorrezione, aggiungiCorrezione, normalizzaCorrezioni, TIPI_CALCOLO } from './correzioni-master.js';
import { profiloCompetenze, competenzaDi, limiteAbilita, PROFILO_NUOVO } from './competenze.js';
import { nomeEvento, puntiPrevisti } from './sposta-punti.js';
import { rigaStorico } from './storico.js';
import { concessioniLivello } from './livello-px.js';

const isOggetto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const somma = (o) => Object.values(o ?? {}).reduce((a, b) => a + (Number.isInteger(b) ? b : 0), 0);
const pulisci = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([, n]) => Number.isInteger(n) && n > 0));

/**
 * A.293 (Davide, 19/11/2026): dopo l'adeguamento le correzioni manuali **alle Abilità** non incidono più sui valori e restano nello
 * storico. Restano attive — e **non si riapplicano** — quelle alle Caratteristiche. La riga della nota di prima (chiave «abilita»,
 * senza i due punti) non è una correzione di VA e non si tocca.
 *
 * **Il criterio, e perché è cambiato nel lotto 252.** Prima si annullavano le correzioni **del giorno dichiarato** (il 2 novembre,
 * quello dell'elenco della A.293). Il collaudo di Davide del 25/11 ha trovato il buco: il −2 ad Armi da mischia che Dimitri aveva
 * ricevuto il **23/11** per compensare i due +1 è sopravvissuto all'adeguamento del 24/11, e il suo VA è rimasto 6 invece di 8. Un
 * elenco scritto a mano non copre la correzione fatta il giorno dopo averlo scritto, e sarebbe tornato alla correzione successiva.
 * Adesso il criterio è **ogni correzione di calcolo a un'Abilità attiva al momento dell'adeguamento**: il giorno resta nei dati come
 * origine della regola. Le righe di altro tipo (l'eccezione al limite della A.247, una concessione) non sono correzioni di calcolo e
 * non si toccano.
 * @returns le righe (attive) da annullare
 */
export function correzioniAbilitaDaAnnullare(correzioni, dati) {
  const R = dati?.regole?.adeguamento_abilita?.annulla_correzioni_abilita;
  if (!R) return [];
  const soloIlGiorno = R.tutte_le_correzioni_di_calcolo !== true;
  return normalizzaCorrezioni(correzioni).filter((x) => x.stato === 'attiva' && !x?.[MARCA]
    && typeof x.chiave === 'string' && x.chiave.startsWith(R.prefisso_chiave)
    && TIPI_CALCOLO.includes(x.tipo)
    && (!soloIlGiorno || String(x.quando ?? '').slice(0, 10) === R.giorno));
}

/** Marca della riga di registro che porta la nota: la cerca `notaPerScheda`, e un tablet non la toglie. */
export const MARCA = 'adeguamentoAbilita';

/**
 * Il personaggio come lo calcola l'app. **Lotto 225 (A.293):** nel file le correzioni del master stanno in cima (`correzioni_master`),
 * mentre il calcolo le legge dentro le scelte (`scelte.correzioniMaster`, lo fa `deserializzaPersonaggio`). Questa funzione leggeva
 * `o.scelte` così com'era sul disco, quindi la procedura calcolava i VA **senza** le correzioni di Caratteristica: per Dimitri
 * (DES +2, FOR −1, CAR −1, SAG +2, INT −2) **24 Abilità su 24** avevano un VA diverso da quello della sua scheda — la nota di prima,
 * la colonna «Adesso», il limite e il massimo dei punti. Le correzioni di Caratteristica entrano **una volta** (`carCorrette` impedisce
 * di riapplicarle più avanti); se le scelte le portano già (il file passato dall'app in memoria) non si sommano ancora.
 */
const personaggio = (o) => {
  const scelte = o?.scelte ?? {};
  const delle = Array.isArray(scelte.correzioniMaster) && scelte.correzioniMaster.length ? scelte.correzioniMaster : normalizzaCorrezioni(o?.correzioni_master);
  return { creazione: delle.length ? { ...scelte, correzioniMaster: delle } : scelte, livelli: Array.isArray(o?.livelli) ? o.livelli : [] };
};
const livelloDi = (o) => 1 + (Array.isArray(o?.livelli) ? o.livelli.length : 0);

/** Gli eventi che danno Punti Abilità Liberi fino al livello attuale: [{ livello, previsti, punti }]. */
export function eventiDelFile(o, dati) {
  const p = personaggio(o);
  const livello = livelloDi(o);
  const out = [];
  for (let n = 1; n <= livello; n += 1) {
    const previsti = puntiPrevisti(n, dati);
    if (!previsti) continue;
    const punti = n === 1 ? p.creazione.puntiAbilitaLiberi : p.livelli[n - 2]?.puntiAbilita;
    out.push({ livello: n, previsti, punti: pulisci(punti) });
  }
  return out;
}

/**
 * §8.3.1: il monte da ridistribuire — 7 punti per ciascun Grado complessivo acquisito, incluso il primo.
 * Non è scritto qui: è la somma dei previsti degli eventi che il personaggio ha davvero raggiunto.
 * @returns { monte, gradi, livello, atteso8, differenza } — `atteso8` è il monte al livello 8 (i 21 approvati)
 */
export function monteAdeguamento(o, dati) {
  const eventi = eventiDelFile(o, dati);
  const monte = eventi.reduce((s, e) => s + e.previsti, 0);
  const perGrado = puntiPrevisti(1, dati);
  const atteso8 = perGrado * 3;
  return { monte, gradi: eventi.length, livello: livelloDi(o), atteso8, differenza: monte - atteso8 };
}

/**
 * La nota di prima: tutte e 24 le Abilità come sono adesso, più i punti evento per evento.
 * @returns {{ quando, livello, classi, profilo, abilita: [...], eventi: [...], monteDiPrima }}
 */
export function notaDiPrima(o, dati, { quando = new Date().toISOString() } = {}) {
  const p = migraPersonaggio(personaggio(o));
  const scheda = calcolaSchedaPersonaggio(p, dati);
  if (!scheda?.abilita?.length) throw new Error('la scheda non si calcola: senza i valori di adesso la nota non si può scrivere');
  const eventi = eventiDelFile(o, dati);
  return {
    quando,
    livello: scheda.livello ?? livelloDi(o),
    classi: (scheda.classi ?? []).map((c) => ({ nome: c.nome, grado: c.grado })),
    profilo: scheda.profiloAbilita?.nome ?? null,
    abilita: scheda.abilita.map((a) => ({
      nome: a.nome,
      competenza: a.competenza ?? null,
      base: a.base ?? null,
      mod: a.mod ?? 0,
      corporazione: a.corporazione ?? 0,
      daClasse: a.daClasse ?? 0,
      liberi: a.liberi ?? 0,
      avanzamento: a.avanzamento ?? 0,
      grezzo: a.grezzo ?? null,
      limite: a.limite ?? null,
      va: a.totale ?? null,
      ...(a.oltreLimite ? { oltreLimite: a.oltreLimite } : {}),
    })),
    eventi: eventi.map((e) => ({ livello: e.livello, evento: nomeEvento(e.livello), previsti: e.previsti, punti: e.punti })),
    monteDiPrima: eventi.reduce((s, e) => s + somma(e.punti), 0),
  };
}

/** Una riga di testo per ogni Abilità: «Furtività: S, VA 13 (mod +4, base 7, corp 1, Classe 2, liberi 0), limite 16». */
export function testoAbilitaDiPrima(a) {
  const parti = [`mod ${a.mod >= 0 ? `+${a.mod}` : a.mod}`, `base ${a.base}`, a.corporazione ? `corp ${a.corporazione}` : null,
    `Classe ${a.daClasse}`, `liberi ${a.liberi}`].filter(Boolean).join(', ');
  return `${a.nome}: ${a.competenza ?? '—'}, VA ${a.va} (${parti}), limite ${a.limite ?? '—'}${a.oltreLimite ? `, eccezione del Direttore +${a.oltreLimite} (A.247)` : ''}`;
}

/** La nota completa, in una riga di registro leggibile anche senza l'elenco strutturato. */
export function testoNota(nota, data) {
  const ev = nota.eventi.map((e) => `${e.evento}: ${Object.entries(e.punti).map(([a, n]) => `${a} +${n}`).join(', ') || 'nessun punto'}`).join('; ');
  return `Abilità prima dell'adeguamento (${data}, ${nota.profilo ?? 'profilo di prima'}, livello ${nota.livello}): `
    + `${nota.abilita.map(testoAbilitaDiPrima).join('; ')}. Punti liberi per evento — ${ev}.`;
}

/** I campi che la procedura tocca, con il valore esatto di adesso: da qui `annullaAdeguamento` ricostruisce. */
export function primaDelAdeguamento(o) {
  const scelte = isOggetto(o?.scelte) ? o.scelte : {};
  const livelli = Array.isArray(o?.livelli) ? o.livelli : [];
  const campo = (x, k) => (k in (x ?? {}) ? { [k]: x[k] } : {});
  return {
    scelte: { ...campo(scelte, 'regimeAbilita'), ...campo(scelte, 'puntiAbilitaLiberi'), ...campo(scelte, 'puntiDirettore') },
    livelli: livelli.map((v) => ({ ...campo(v, 'puntiAbilita'), ...campo(v, 'puntiDirettore') })),
  };
}

/** Rimette in un oggetto le sole chiavi registrate, togliendo quelle che allora non c'erano. */
function rimetti(x, prima, chiavi) {
  const out = { ...x };
  for (const k of chiavi) {
    if (prima && k in prima) out[k] = prima[k];
    else delete out[k];
  }
  return out;
}

const CHIAVI_SCELTE = ['regimeAbilita', 'puntiAbilitaLiberi', 'puntiDirettore'];
const CHIAVI_LIVELLO = ['puntiAbilita', 'puntiDirettore'];

/** La riga del registro con la nota di prima. */
export function rigaNotaDiPrima(nota, { quando = new Date(), motivo = null } = {}) {
  const data = new Date(nota.quando).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return nuovaCorrezione({
    chiave: 'abilita', tipo: 'scelta', [MARCA]: true,
    etichetta: testoNota(nota, data),
    motivo: motivo ?? 'Adeguamento straordinario delle Abilità (Giocatore 0.62 §8.3.1): categorie e basi al profilo 4/7/9/4, punti liberi da ridistribuire.',
    abilitaPrima: nota.abilita,
    eventiPrima: nota.eventi,
    livelloPrima: nota.livello,
    profiloPrima: nota.profilo,
  }, quando);
}

/** Le righe del registro che portano una nota di prima, la più recente per prima. */
export const righeNota = (correzioni) => normalizzaCorrezioni(correzioni)
  .filter((x) => x?.[MARCA] === true)
  .sort((a, b) => String(b.quando).localeCompare(String(a.quando)));

/**
 * Per la scheda del giocatore, dal tablet: le Abilità di prima dell'adeguamento.
 * @returns {{ abilita, eventi, livello, profilo, testo, quando }|null}
 */
export function notaPerScheda(correzioni) {
  const r = righeNota(correzioni)[0];
  if (!r) return null;
  return {
    abilita: Array.isArray(r.abilitaPrima) ? r.abilitaPrima : null,
    eventi: Array.isArray(r.eventiPrima) ? r.eventiPrima : [],
    livello: r.livelloPrima ?? null,
    profilo: r.profiloPrima ?? null,
    testo: r.etichetta ?? '',
    quando: r.quando ?? null,
  };
}

/**
 * Il livello che il blocco approvato dell'11/11 prende come destinazione: quello del **terzo Grado**, cioè l'8°.
 * Non è il numero 8 scritto qui: è il terzo livello che dà Punti Abilità Liberi secondo i dati, così se Davide
 * cambiasse i Gradi la procedura seguirebbe i dati invece di una costante.
 */
export function livelloDestinazione(dati, gradi = 3) {
  const livelli = [];
  for (let n = 1; n <= 20 && livelli.length < gradi; n += 1) if (puntiPrevisti(n, dati)) livelli.push(n);
  return livelli.length === gradi ? livelli[gradi - 1] : null;
}

/**
 * **A.272 — da che livello si fa l'adeguamento: le strade, dette e non presunte** (lotto 207).
 *
 * Le due risposte che la decidono, e vanno lette insieme:
 *  - il **blocco approvato dell'11/11** (E&L, «Adeguamento approvato delle Abilità e passaggio al livello 8»):
 *    «La destinazione dei sette PG è il livello 8 … A livello 8 il monte totale spettante è 7 × 3 = 21 punti
 *    liberi». E per chi non ha i PX: «il Direttore seleziona le … Schede e autorizza espressamente il solo
 *    passaggio 7 → 8», con i PX reali invariati. **«I nomi dei destinatari non sono stati specificati in questa
 *    decisione e non devono essere dedotti o inventati»**: chi, lo sceglie il Direttore, non questa funzione.
 *  - la **A.268 del 15/11**: «Si effettua un solo avanzamento 7→8 e, successivamente, l'adeguamento delle Abilità
 *    con 21 punti complessivi da ridistribuire».
 *
 * Quindi la destinazione approvata è il livello 8 con 21 punti, e le strade per arrivarci sono **due**: i PX veri,
 * oppure l'autorizzazione del Direttore (la concessione della A.187, che l'app ha già). Adeguare al livello
 * attuale con meno punti **non è** quello che Davide ha approvato, e la funzione lo dice invece di lasciarlo
 * credere. I PX e la soglia si leggono dai dati (`px_partita.json` → `soglie_px`), mai da un numero scritto qui.
 */
export function stradeDelLivello(o, dati) {
  const m = monteAdeguamento(o, dati);
  const soglie = Array.isArray(dati?.px_partita?.soglie_px) ? dati.px_partita.soglie_px : [];
  const px = Number.isInteger(o?.scelte?.puntiEsperienza) ? o.scelte.puntiEsperienza : null;
  const destinazione = livelloDestinazione(dati);
  const soglia = Number.isInteger(soglie[destinazione - 1]) ? soglie[destinazione - 1] : null;
  const bastano = Number.isInteger(px) && Number.isInteger(soglia) ? px >= soglia : null;
  const mancano = Number.isInteger(px) && Number.isInteger(soglia) ? Math.max(0, soglia - px) : null;
  const strade = [];
  if (bastano === true) strade.push(`ha i PX per il ${destinazione}°: basta il normale «Sali di livello»`);
  if (bastano === false) {
    strade.push(`una serata di PX: gliene mancano ${mancano} per la soglia del ${destinazione}° (${soglia})`);
    // lotto 214: il Direttore 0.51 §9.8.3 (13/11) scrive che Davide autorizza il passaggio dei sette dal 7 all'8 senza assegnare i PX mancanti: qui il
    // Direttore **registra** ciò che è già scritto, non lo decide da capo; l'app non concede da sola (§9.8.2: l'autorizzazione si registra a parte)
    strade.push('la concessione del Direttore (A.187; Direttore 0.51 §9.8.3 la scrive già per i sette): «Concedi il passaggio al livello N» con il motivo, i PX reali non cambiano');
  }
  if (bastano === null) strade.push(`i PX non sono scritti nel file: la soglia del ${destinazione}° è ${soglia ?? 'sconosciuta'}`);
  // lotto 215, dalla prova generale: la concessione registrata **non** fa salire di livello, e il monte non cambia finché il passaggio vero
  // non è fatto (Classe, Specializzazione, incantesimi per i taumaturghi, 7 punti del nuovo Grado che l'adeguamento poi azzera). Lo strumento lo dice.
  const concessa = concessioniLivello(o?.correzioni_master).some((c) => c.livello >= destinazione);
  if (concessa && bastano === false) {
    strade.length = 0;
    strade.push(`la concessione per il ${destinazione}° è già registrata (i PX non cambiano), ma il personaggio non è ancora salito: manca il passaggio vero, «Sali al livello ${destinazione}» dalla scheda; solo allora il monte diventa ${m.atteso8}`);
  }
  const frase = `è al livello ${m.livello} con ${m.gradi} Grad${m.gradi === 1 ? 'o' : 'i'}, quindi il monte di adesso è ${m.monte} punti (§8.3.1: 7 per Grado). `
    + `La destinazione approvata è il livello ${destinazione} con ${m.atteso8} punti (blocco dell'11/11 e A.268): `
    + `${strade.join('; ')}. Adeguare adesso al livello ${m.livello} con ${m.monte} punti non è la strada approvata.`;
  return { livello: m.livello, destinazione, px, soglia, bastano, mancano, monte: m.monte, monteDestinazione: m.atteso8, strade, frase };
}

/** Lo stesso file con tutti i punti liberi azzerati: la base di confronto per misurare il solo profilo. */
function senzaLiberi(o, extra = {}) {
  return {
    ...o,
    scelte: { ...o.scelte, ...extra, puntiAbilitaLiberi: {} },
    livelli: (o.livelli ?? []).map((v) => ({ ...v, puntiAbilita: {} })),
  };
}

/**
 * Che cosa cambia **per il solo profilo**: categoria, base, limite e VA di ogni Abilità, prima e dopo.
 *
 * Il confronto si fa **a punti liberi azzerati su entrambi i lati**, perché i punti liberi si ridistribuiscono
 * comunque: confrontare il VA di prima (coi suoi punti) con quello di dopo (senza) direbbe che scendono quasi
 * tutte, che è falso e spaventerebbe il tavolo per niente. Quello che resta è il solo effetto del profilo nuovo.
 *
 * @returns { cambiano, salgono, scendono, abilita } — `scendono` sono i casi della A.267
 */
export function cambiDelProfilo(o, dati) {
  const prima = calcolaSchedaPersonaggio(migraPersonaggio(personaggio(senzaLiberi(o))), dati);
  const dopo = calcolaSchedaPersonaggio(migraPersonaggio(personaggio(senzaLiberi(o, { regimeAbilita: PROFILO_NUOVO }))), dati);
  const perNome = new Map((prima.abilita ?? []).map((a) => [a.nome, a]));
  const abilita = (dopo.abilita ?? []).map((d) => {
    const p = perNome.get(d.nome) ?? null;
    return {
      nome: d.nome,
      da: p?.competenza ?? null, a: d.competenza ?? null,
      basePrima: p?.base ?? null, baseDopo: d.base ?? null,
      limitePrima: p?.limite ?? null, limiteDopo: d.limite ?? null,
      vaPrima: p?.totale ?? null, vaDopo: d.totale ?? null,
      cambiaCategoria: !!p && p.competenza !== d.competenza,
    };
  });
  const delta = (x) => (Number.isInteger(x.vaPrima) && Number.isInteger(x.vaDopo) ? x.vaDopo - x.vaPrima : 0);
  return {
    abilita,
    cambiano: abilita.filter((x) => x.cambiaCategoria),
    salgono: abilita.filter((x) => delta(x) > 0),
    scendono: abilita.filter((x) => delta(x) < 0),
  };
}

/**
 * Che cosa succede a un personaggio con l'adeguamento, **senza scrivere niente**.
 * @returns {{ nome, livello, giaFatto, bloccato, motivo, nota, monte, casi, scendono, nuovo }}
 *   `bloccato`: la procedura non parte (la nota non si scrive, o la scheda non si calcola).
 *   `scendono`: le Abilità che col profilo nuovo **perdono** VA (A.267, aperta): si ferma e lo dice.
 */
export function pianoAdeguamento(o, dati, { quando = new Date() } = {}) {
  const nome = String(o?.scelte?.nome ?? '').trim() || 'Senza nome';
  const livello = livelloDi(o);
  const vuoto = { nome, livello, giaFatto: false, bloccato: false, motivo: null, nota: null, monte: null, casi: [], scendono: [], cambi: null, px: null, nuovo: null, annullate: [] };
  if (o?.scelte?.regimeAbilita === PROFILO_NUOVO) return { ...vuoto, giaFatto: true, motivo: 'è già adeguato al profilo 4/7/9/4' };

  // A: la nota di prima, prima di qualunque altra cosa. Senza, non si parte.
  let nota;
  try { nota = notaDiPrima(o, dati, { quando: quando.toISOString() }); } catch (e) {
    return { ...vuoto, bloccato: true, motivo: `non riesco a scrivere la nota di prima (${e.message}): non lo tocco` };
  }

  const m = monteAdeguamento(o, dati);
  const px = stradeDelLivello(o, dati);
  const casi = [];
  if (m.differenza !== 0) casi.push(px.frase);

  // **A.267 (15/11/2026): la discesa è accettata e non ferma più la procedura.** Si calcola, si dice e si scrive.
  const cambi = cambiDelProfilo(o, dati);
  const scendono = cambi.scendono;
  if (scendono.length) {
    casi.push(`${scendono.length} Abilità perdono VA col profilo nuovo (${scendono.map((x) => `${x.nome} ${x.da}→${x.a}, VA ${x.vaPrima}→${x.vaDopo}`).join('; ')}). `
      + 'La A.267 del 15/11 dice che la diminuzione è accettata: non si conserva il valore di prima e non si compensa. '
      + 'Un\'eccezione la fa il Direttore a parte, con il ✎ di «Modifica master», che chiede il motivo e la registra.');
  }

  const riga = rigaNotaDiPrima(nota, { quando });
  // A.293: le correzioni alle Abilità del giorno dichiarato smettono di contare (restano nel registro, «annullata»)
  const daAnnullare = correzioniAbilitaDaAnnullare(o.correzioni_master, dati);
  const idAnnullate = new Set(daAnnullare.map((x) => x.id));
  const motivoA293 = dati?.regole?.adeguamento_abilita?.annulla_correzioni_abilita?.motivo ?? null;
  const registroPrima = idAnnullate.size
    ? normalizzaCorrezioni(o.correzioni_master).map((x) => (idAnnullate.has(x.id) ? { ...x, stato: 'annullata', annullataIl: quando.toISOString(), ...(motivoA293 ? { annullataPer: motivoA293 } : {}) } : x))
    : o.correzioni_master;
  const svuota = (x, totale) => ({ ...x, puntiDirettore: { quando: quando.toISOString(), motivo: 'Adeguamento straordinario delle Abilità (§8.3.1)', totale, adeguamento: true } });
  const ultimo = nota.eventi.at(-1)?.livello ?? 1;
  // i punti liberi si azzerano tutti; il monte intero va sull'ultimo evento, dove lo stato e i limiti sono quelli
  // attuali (§8.3.1). Il totale di ogni evento lo dichiara `puntiDirettore`, così la scheda non chiede «Assegna».
  const scelte = { ...o.scelte, regimeAbilita: PROFILO_NUOVO, puntiAbilitaLiberi: {} };
  const nuovo = {
    ...o,
    scelte: { ...svuota(scelte, 0) },
    livelli: (o.livelli ?? []).map((v, i) => {
      const n = i + 2;
      if (!nota.eventi.some((e) => e.livello === n)) return v;
      return { ...svuota({ ...v, puntiAbilita: {} }, 0) };
    }),
    correzioni_master: aggiungiCorrezione(registroPrima, {
      ...riga,
      primaDelAdeguamento: primaDelAdeguamento(o),
      ...(daAnnullare.length ? { correzioniAnnullate: daAnnullare.map((x) => x.id) } : {}),
      monte: m.monte,
      eventoAssegnazione: ultimo,
      // A.267: le Abilità che perdono VA restano scritte nel file, con i due numeri. Un VA che scende senza
      // spiegazione, fra sei mesi, è una discussione al tavolo; con la riga è una decisione con una data.
      ...(scendono.length ? { scendonoA267: scendono.map((x) => ({ nome: x.nome, da: x.da, a: x.a, vaPrima: x.vaPrima, vaDopo: x.vaDopo })) } : {}),
    }),
  };
  const annullate = daAnnullare.map((x) => ({ id: x.id, chiave: x.chiave, etichetta: x.etichetta, numero: x.numero ?? null, quando: x.quando }));
  return { ...vuoto, nota, monte: m, casi, scendono, cambi, px, nuovo, annullate };
}

/** Il personaggio ha un adeguamento aperto (contrassegno messo, punti ancora da assegnare)? */
export function adeguamentoAperto(o, dati) {
  if (o?.scelte?.regimeAbilita !== PROFILO_NUOVO) return null;
  const r = righeNota(o?.correzioni_master)[0];
  if (!r || !Number.isInteger(r.monte) || r.confermato) return null; // confermato = chiuso: il pannello sparisce
  const livello = Number.isInteger(r.eventoAssegnazione) ? r.eventoAssegnazione : livelloDi(o);
  const assegnati = somma(livello === 1 ? o.scelte?.puntiAbilitaLiberi : o.livelli?.[livello - 2]?.puntiAbilita);
  return { monte: r.monte, livello, assegnati, rimasti: r.monte - assegnati, finito: assegnati >= r.monte, riga: r.id ?? null };
}

/**
 * Lo stato del pannello del giocatore: per ogni Abilità com'era e come diventa, e quanto resta da assegnare.
 * @param bozza { [Abilità]: punti } della sessione di assegnazione
 */
export function statoAssegnazione(o, bozza = null, dati) {
  const ap = adeguamentoAperto(o, dati);
  if (!ap) return null;
  const nota = notaPerScheda(o?.correzioni_master);
  // la bozza **è** l'assegnazione dell'evento, non un'aggiunta: senza bozza vale quella già scritta nel file,
  // così riaprire la scheda non raddoppia i punti (§8.3.1: «riapertura e ricalcolo non danno di nuovo punti»)
  const pa = pulisci(bozza ?? puntiDellEvento(o, ap.livello));
  const assegnati = somma(pa);
  const rimasti = ap.monte - assegnati;
  const p = migraPersonaggio(personaggio(o));
  // lo stato con i punti della bozza sull'evento dell'assegnazione
  const conBozza = conPunti(o, pa, ap.livello);
  const scheda = calcolaSchedaPersonaggio(migraPersonaggio(personaggio(conBozza)), dati);
  const senza = calcolaSchedaPersonaggio(migraPersonaggio(personaggio(conPunti(o, {}, ap.livello))), dati);
  const perNome = new Map((nota?.abilita ?? []).map((a) => [a.nome, a]));
  const abilita = (scheda.abilita ?? []).map((a, i) => {
    const base = senza.abilita[i];
    const prima = perNome.get(a.nome) ?? null;
    const punti = pa[a.nome] ?? 0;
    const massimo = Math.max(0, (a.limite ?? Infinity) - (base.grezzo ?? 0));
    // lotto 246: «motivoPiu» ferma solo quando i punti del monte sono finiti (blocco approvato l'11/11: residui 0).
    // Il limite della categoria e il «VA almeno 1» sono regole: si leggono accanto alla riga e il punto si mette lo
    // stesso — la sera del 22/11 un controllo di questo tipo ha tenuto fermi sette giocatori.
    const motivoPiu = rimasti <= 0 ? 'Nessun punto rimasto da assegnare.' : null;
    const avvisoPiu = punti >= massimo ? `VA ${base.grezzo + punti} già al limite ${a.limite} (${a.competenza}): un punto in più non aumenta il VA personale.`
      : (base.grezzo ?? 0) + punti < 1 ? 'Serve VA almeno 1 prima dei punti liberi.' : null;
    return {
      nome: a.nome, caratteristica: a.caratteristica, competenza: a.competenza, base: a.base, mod: a.mod,
      corporazione: a.corporazione, daClasse: a.daClasse, limite: a.limite, limiteCategoria: a.limiteCategoria,
      punti, massimo, motivoPiu, avvisoPiu,
      // com'era e come diventa: le due cose che il giocatore deve vedere
      prima: prima ? { competenza: prima.competenza, base: prima.base, va: prima.va, limite: prima.limite } : null,
      dopo: { va: a.totale, grezzo: a.grezzo },
      cambiaCategoria: !!prima && prima.competenza !== a.competenza,
    };
  });
  return { monte: ap.monte, assegnati, rimasti, finito: rimasti === 0, livello: ap.livello, abilita, nota };
}

/** I punti scritti nel file per quell'evento. */
export const puntiDellEvento = (o, livello) => pulisci(livello === 1 ? o?.scelte?.puntiAbilitaLiberi : o?.livelli?.[livello - 2]?.puntiAbilita);

/** Il file con i punti della bozza scritti sull'evento dell'assegnazione (non scrive niente sul disco). */
export function conPunti(o, punti, livello) {
  const pa = pulisci(punti);
  if (livello === 1) return { ...o, scelte: { ...o.scelte, puntiAbilitaLiberi: pa } };
  return { ...o, livelli: (o.livelli ?? []).map((v, i) => (i + 2 === livello ? { ...v, puntiAbilita: pa } : v)) };
}

/** Un punto in più su un'Abilità, dentro i limiti. Torna la bozza nuova, o quella di prima se non si può. */
export function assegna(o, bozza, abilita, delta, dati) {
  const s = statoAssegnazione(o, bozza, dati);
  if (!s) return bozza ?? {};
  const a = s.abilita.find((x) => x.nome === abilita);
  if (!a) return bozza ?? {};
  const pa = pulisci(bozza);
  const ora = pa[abilita] ?? 0;
  const n = ora + delta;
  if (n < 0) return pa;
  if (delta > 0 && (s.rimasti <= 0 || a.motivoPiu)) return pa; // solo il monte ferma: il limite della categoria avvisa (lotto 246)
  return pulisci({ ...pa, [abilita]: n });
}

/**
 * Conferma: i punti entrano nel file e l'adeguamento si chiude. §8.3.1 e blocco approvato: «La conferma definitiva
 * richiede assegnati = monte, residui 0»; una bozza non conclude l'adeguamento.
 * @returns il file nuovo, oppure null se non si può concludere (con `motivo` in `errori`)
 */
export function confermaAssegnazione(o, bozza, dati, { quando = new Date().toISOString() } = {}) {
  const s = statoAssegnazione(o, bozza, dati);
  if (!s) return { ok: false, motivo: 'non c’è un adeguamento aperto su questo personaggio', file: null };
  if (s.rimasti !== 0) return { ok: false, motivo: `restano ${s.rimasti} punti da assegnare: la conferma richiede residui 0`, file: null };
  // lotto 246: i punti oltre il limite della categoria non fermano più la conferma. Restano scritti nella riga del
  // registro e si vedono nel pannello: l'eccezione formale resta quella del ✎ di «Modifica master» (A.247).
  const irregolari = s.abilita.filter((a) => a.punti > a.massimo);
  const avvisi = irregolari.length ? [`punti oltre il limite su ${irregolari.map((x) => x.nome).join(', ')} (§8.3): il VA si ferma al limite finché il Direttore non registra l'eccezione (A.247)`] : [];
  const conp = conPunti(o, bozza, s.livello);
  // il totale dell'evento diventa il monte: da qui in poi la scheda sa che quei punti sono quelli previsti e non
  // chiede più di assegnarne altri (finché l'adeguamento è aperto il totale è 0, così non si vedono due avvisi)
  const conTotale = (x) => ({ ...x, puntiDirettore: { ...(x.puntiDirettore ?? {}), totale: s.monte } });
  const file = s.livello === 1
    ? { ...conp, scelte: conTotale(conp.scelte) }
    : { ...conp, livelli: conp.livelli.map((v, i) => (i + 2 === s.livello ? conTotale(v) : v)) };
  const correzioni = normalizzaCorrezioni(file.correzioni_master).map((r) => (r?.[MARCA] === true && !r.confermato
    ? { ...r, confermato: quando, puntiAssegnati: pulisci(bozza) } : r));
  return { ok: true, avvisi, motivo: null, file: { ...file, correzioni_master: correzioni } };
}

/**
 * Lotto 215 — **la «Conferma» di un tablet, che il server deve lasciar passare e nient'altro.**
 *
 * La prova generale (17/11/2026) ha fatto la serata dal lato tablet, cioè da chi NON è il PC del Direttore: ogni «Conferma» tornava 403.
 * Il server non lascia a un tablet toccare `puntiDirettore` (lotto 165) né le righe del registro del master (12/10), e la conferma
 * dell'adeguamento scrive proprio quelle due cose (il totale dell'evento diventa il monte, e la riga della nota passa a «confermato»).
 * Sul PC del Direttore, dove avevamo provato tutto fino a ieri, quelle protezioni non esistono: per questo nessun test l'aveva visto.
 *
 * Questa funzione dice se un file che arriva da un tablet è **esattamente** la conferma legittima di un adeguamento aperto sul disco:
 * stesso evento, punti che fanno il monte (`confermaAssegnazione` li controlla: residuo 0, nessuna Abilità oltre il limite),
 * stessa riga di registro con il solo `confermato` in più, e **nessun'altra differenza** nei punti degli altri eventi, in
 * `puntiDirettore` o nel registro. Un tablet che prova qualunque altra cosa (togliere punti da un altro evento, scriversi una
 * correzione, chiudere un adeguamento senza aver messo i punti) non passa: torna alle regole di sempre.
 *
 * @returns true solo per la conferma legittima
 */
export function confermaAdeguamentoLegittima(nuovo, disco, dati) {
  try {
    const ap = adeguamentoAperto(disco, dati);
    if (!ap) return false;
    const atteso = confermaAssegnazione(disco, puntiDellEvento(nuovo, ap.livello), dati);
    if (!atteso.ok) return false;
    const impronta = (f) => JSON.stringify({
      liberi: f.scelte?.puntiAbilitaLiberi ?? null,
      diretto: f.scelte?.puntiDirettore ?? null,
      livelli: (f.livelli ?? []).map((v) => [v?.puntiAbilita ?? null, v?.puntiDirettore ?? null]),
      // il registro **grezzo**, non normalizzato: `normalizzaCorrezioni` scarta le righe che non capisce, e una riga abusiva scomparirebbe dal confronto
      registro: (Array.isArray(f.correzioni_master) ? f.correzioni_master : []).map((r) => (r?.[MARCA] === true ? { ...r, confermato: !!r.confermato } : r)),
    });
    return impronta(nuovo) === impronta(atteso.file);
  } catch { return false; }
}

/**
 * Annulla l'adeguamento di **questo** personaggio: rimette i campi toccati com'erano e toglie la riga della nota.
 * Il file torna identico a com'era, contrassegno compreso.
 */
/**
 * **Le correzioni rimaste in piedi dopo l'adeguamento** (lotto 252, dal collaudo di Davide del 25/11/2026).
 *
 * Un personaggio già adeguato non ripassa da `pianoAdeguamento`, quindi una correzione di calcolo a un'Abilità che
 * l'adeguamento avrebbe dovuto annullare — e che non ha annullato perché il criterio guardava un solo giorno — resta
 * addosso al VA per sempre, senza che nessuno la veda: è il −2 ad Armi da mischia di Dimitri, che ha tenuto il suo VA a
 * 6 invece di 8. Questa funzione le trova; `annullaCorrezioniRimaste` le annulla **lasciandole nello storico**, come
 * vuole la A.293, senza aggiungere nessun bonus nuovo e senza toccare le Caratteristiche.
 * @returns le righe attive da annullare (vuoto se il personaggio non è adeguato: in quel caso le annulla l’adeguamento)
 */
/**
 * Il VA di un'Abilità come lo mostra la scheda, partendo dal file sul disco (che ha `scelte`, mentre il motore vuole
 * `creazione` con dentro le correzioni del master: è la trappola del lotto 225). null se la scheda non si calcola, e
 * allora `motivo` dice perché — un «?» senza motivo è un ripiego silenzioso (lotto 248).
 * @returns {{ valore, motivo }}
 */
export function vaAbilita(o, nome, dati) {
  const p = personaggio(o);
  const scheda = calcolaSchedaPersonaggio({ ...p, sessione: o?.sessione ?? null }, dati);
  if (!Array.isArray(scheda.abilita)) return { valore: null, motivo: (scheda.errori ?? []).map((e) => e.problema).slice(0, 2).join('; ') || 'la scheda non si calcola' };
  const r = scheda.abilita.find((x) => x.nome === nome);
  return r ? { valore: r.totale, motivo: null } : { valore: null, motivo: `l'Abilità «${nome}» non è nell'elenco` };
}

export function correzioniRimaste(o, dati) {
  if (o?.scelte?.regimeAbilita !== PROFILO_NUOVO) return [];
  // **solo quelle di prima dell'adeguamento.** Una correzione fatta dal Direttore DOPO l'adeguamento è una sua
  // decisione di adesso e non si tocca; quella di prima è la compensazione di un bonus che l'adeguamento ha già
  // annullato, e resta addosso al VA per sbaglio (il −2 di Dimitri del 23/11, adeguamento del 24/11).
  const quando = quandoAdeguato(o);
  const prima = correzioniAbilitaDaAnnullare(o?.correzioni_master, dati);
  if (!quando) return prima;
  return prima.filter((x) => String(x.quando ?? "") <= quando);
}

/** Quando l'adeguamento è stato fatto, dal blocco `puntiDirettore` che lo dichiara (ISO), o null. */
export function quandoAdeguato(o) {
  const blocchi = [o?.scelte?.puntiDirettore, ...(o?.livelli ?? []).map((v) => v?.puntiDirettore)]
    .filter((x) => x && x.adeguamento === true && typeof x.quando === "string");
  if (!blocchi.length) return null;
  return blocchi.map((x) => x.quando).sort()[0];
}

/**
 * Annulla le correzioni rimaste, con la riga nello storico. Non cambia nient’altro: nessun punto, nessun bonus nuovo,
 * nessuna Caratteristica (A.293). Il valore torna quello che l’adeguamento avrebbe dato il giorno in cui è stato fatto.
 * @returns {{ nuovo, annullate, descrizione }} oppure null se non c’era niente da annullare
 */
export function annullaCorrezioniRimaste(o, dati, { quando = new Date(), chi = "" } = {}) {
  const rimaste = correzioniRimaste(o, dati);
  if (!rimaste.length) return null;
  const ids = new Set(rimaste.map((x) => x.id));
  const motivo = dati?.regole?.adeguamento_abilita?.annulla_correzioni_abilita?.motivo ?? null;
  const correzioni = normalizzaCorrezioni(o.correzioni_master).map((x) => (ids.has(x.id)
    ? { ...x, stato: 'annullata', annullataIl: quando.toISOString(), ...(motivo ? { annullataPer: motivo } : {}) }
    : x));
  const descrizione = `${rimaste.length === 1 ? "Annullata la correzione" : `Annullate le ${rimaste.length} correzioni`} alle Abilità rimaste in piedi dopo l’adeguamento`
    + `: ${rimaste.map((x) => `${x.chiave.replace("abilita:", "")} ${x.numero > 0 ? "+" : ""}${x.numero}`).join(", ")}`
    + ` (A.293; collaudo del 25/11/2026${chi ? `, ${chi}` : ''}).`;
  // la riga dello storico sta nella sessione (src/storico.js → rigaStorico), come ogni altra riga che il
  // giocatore e il Direttore rileggono nella tab Identità
  const sessione = rigaStorico(o.sessione, descrizione, quando);
  return { nuovo: { ...o, correzioni_master: correzioni, sessione }, annullate: rimaste, descrizione };
}

/**
 * **La premessa su cui si corregge, verificata prima di scrivere** (lotto 256).
 *
 * Il lotto 252 ha costruito lo strumento sullo stato che Davide descrive nel rapporto: l'adeguamento ha annullato i due +1 e ha lasciato
 * in piedi il −2 che li compensava, quindi Armi da mischia di Dimitri segna 6 invece di 8. L'istantanea del 27/11 mostra un'altra
 * realtà: nel file i tre sono **tutti attivi**, il file non dice di essere adeguato, e la somma fa 0. Uno strumento che corregge
 * deve controllare la premessa su cui corregge, non fidarsi di averla letta in un rapporto: è lo stesso difetto del criterio «le
 * correzioni del giorno dichiarato», una premessa scritta a mano che un giorno non vale più.
 *
 * Per ogni Abilità con correzioni da annullare dice se si può **e perché no**. Si ferma quando:
 *   · il file non è adeguato (`regimeAbilita` ≠ 2): non c'è niente che sia rimasto in piedi dopo un adeguamento che non c'è stato;
 *   · le correzioni attive dell'Abilità **si compensano già** (somma 0): annullarle non cambia il VA e riscriverebbe il file per niente;
 *   · annullarle lascerebbe attive correzioni **di segno opposto** (il −2 con i +1 ancora vivi): è il «+2 dove serve 0»;
 *   · una correzione attiva è «imposta a N», che non è un delta e non si somma;
 *   · il VA dopo non è quello che la premessa prevede (VA prima − somma annullata);
 *   · il metro dichiarato nei dati (`regole.json` → `adeguamento_abilita.metro`) per quel personaggio non torna: il VA, o il contatore dei
 *     punti liberi, che si può leggere solo da un adeguamento aperto.
 *
 * Non scrive niente: è la parte che si può provare senza un file.
 * @returns {{ ok, adeguato, motivi: string[], abilita: object[], metro: object|null }}
 */
export function verificaCompensazione(o, dati, { metro = null } = {}) {
  const motivi = [];
  const adeguato = o?.scelte?.regimeAbilita === PROFILO_NUOVO;
  if (!adeguato) {
    return { ok: false, adeguato, motivi: ['il file non dice di essere adeguato (regimeAbilita assente o diverso da 2): le correzioni alle Abilità contano ancora e non c’è un adeguamento di cui correggere lo strascico'], abilita: [], metro: null };
  }
  const rimaste = correzioniRimaste(o, dati);
  if (!rimaste.length) return { ok: false, adeguato, motivi: ['nessuna correzione da annullare'], abilita: [], metro: null };
  const tutte = normalizzaCorrezioni(o.correzioni_master).filter((x) => x.stato === 'attiva' && TIPI_CALCOLO.includes(x.tipo));
  const nomi = [...new Set(rimaste.map((x) => String(x.chiave).replace(/^abilita:/, '')))];
  const idDaAnnullare = new Set(rimaste.map((x) => x.id));
  const prova = annullaCorrezioniRimaste(o, dati, { quando: new Date(), chi: 'verifica' });
  const abilita = nomi.map((nome) => {
    const attive = tutte.filter((x) => x.chiave === `abilita:${nome}`);
    const da = attive.filter((x) => idDaAnnullare.has(x.id));
    const restano = attive.filter((x) => !idDaAnnullare.has(x.id));
    const r = { nome, attive: attive.map((x) => ({ id: x.id, numero: x.numero, tipo: x.tipo, quando: x.quando })), daAnnullare: da.map((x) => x.id), restano: restano.map((x) => x.id), ferma: null };
    if (attive.some((x) => x.tipo !== 'aggiungi')) { r.ferma = `una correzione «imposta a N» non è un delta: non si può dire che cosa tolga`; return r; }
    r.sommaAttive = attive.reduce((a, x) => a + x.numero, 0);
    r.sommaDaAnnullare = da.reduce((a, x) => a + x.numero, 0);
    if (r.sommaAttive === 0) { r.ferma = `le ${attive.length} correzioni attive (${attive.map((x) => (x.numero > 0 ? '+' : '') + x.numero).join(', ')}) si compensano già: la somma è 0 e il VA non cambia annullandole`; return r; }
    if (r.sommaDaAnnullare === 0) { r.ferma = 'le correzioni da annullare si compensano fra loro (somma 0): non c’è niente da correggere'; return r; }
    const opposte = restano.filter((x) => Math.sign(x.numero) === -Math.sign(r.sommaDaAnnullare));
    if (opposte.length) { r.ferma = `annullarne ${r.sommaDaAnnullare > 0 ? '+' : ''}${r.sommaDaAnnullare} lascerebbe attive ${opposte.map((x) => (x.numero > 0 ? '+' : '') + x.numero).join(', ')} di segno opposto: i bonus che la correzione compensava sono ancora in piedi`; return r; }
    const prima = vaAbilita(o, nome, dati); const dopo = vaAbilita(prova.nuovo, nome, dati);
    r.vaPrima = prima.valore; r.vaDopo = dopo.valore;
    if (prima.valore === null || dopo.valore === null) { r.ferma = `il VA non si calcola (${prima.motivo ?? dopo.motivo})`; return r; }
    r.atteso = prima.valore - r.sommaDaAnnullare;
    if (dopo.valore !== r.atteso) r.ferma = `annullandole il VA passerebbe da ${prima.valore} a ${dopo.valore}, ma la premessa prevede ${r.atteso} (${prima.valore} − ${r.sommaDaAnnullare}): il conto non torna`;
    return r;
  });
  for (const r of abilita) if (r.ferma) motivi.push(`${r.nome}: ${r.ferma}`);
  // il metro di Davide: se per questo personaggio è dichiarato, il risultato deve essere esattamente quello
  let m = null;
  if (metro) {
    const nomeAbil = abilita.find((r) => r.nome === metro.abilita);
    const va = vaAbilita(prova.nuovo, metro.abilita, dati).valore;
    const ap = adeguamentoAperto(prova.nuovo, dati);
    m = { abilita: metro.abilita, vaAtteso: metro.va, vaOttenuto: va, puntiAttesi: metro.punti_disponibili, puntiOttenuti: ap ? ap.rimasti : null, fonte: metro.fonte ?? null };
    if (!nomeAbil) motivi.push(`il metro dichiarato parla di ${metro.abilita}, ma lì non c’è niente da annullare`);
    if (va !== metro.va) motivi.push(`metro: ${metro.abilita} dovrebbe dare ${metro.va} e darebbe ${va}`);
    if (Number.isInteger(metro.punti_disponibili)) {
      if (!ap) motivi.push(`metro: il contatore dovrebbe leggere ${metro.punti_disponibili} punti liberi, ma nel file non c’è un adeguamento aperto da cui leggerlo`);
      else if (ap.rimasti !== metro.punti_disponibili) motivi.push(`metro: il contatore dovrebbe leggere ${metro.punti_disponibili} punti liberi e legge ${ap.rimasti}`);
    }
  }
  return { ok: motivi.length === 0, adeguato, motivi, abilita, metro: m };
}

export function annullaAdeguamento(o) {
  const r = righeNota(o?.correzioni_master)[0];
  const prima = r?.primaDelAdeguamento;
  if (!isOggetto(prima)) return { ok: false, motivo: 'questo personaggio non ha una nota di prima da cui tornare indietro', file: null };
  // A.293: le correzioni alle Abilità che la procedura aveva annullato tornano attive, com'erano (senza i segni dell'annullo)
  const riattiva = new Set(Array.isArray(r.correzioniAnnullate) ? r.correzioniAnnullate : []);
  const correzioni = normalizzaCorrezioni(o.correzioni_master).filter((x) => x.id !== r.id).map((x) => {
    if (!riattiva.has(x.id)) return x;
    const { annullataIl: _a, annullataPer: _p, ...resto } = x;
    return { ...resto, stato: 'attiva' };
  });
  const file = {
    ...o,
    scelte: rimetti(o.scelte, prima.scelte, CHIAVI_SCELTE),
    livelli: (o.livelli ?? []).map((v, i) => rimetti(v, prima.livelli?.[i], CHIAVI_LIVELLO)),
  };
  if (correzioni.length) file.correzioni_master = correzioni;
  else delete file.correzioni_master;
  return { ok: true, motivo: null, file };
}

/** Per la plancia del Direttore: a che punto è ciascuno dei personaggi al tavolo. */
export function statoPerPlancia(o, dati) {
  const nome = String(o?.scelte?.nome ?? '').trim() || 'Senza nome';
  if (o?.scelte?.regimeAbilita !== PROFILO_NUOVO) {
    return { nome, stato: 'da fare', testo: 'non ancora adeguato', assegnati: 0, monte: null, finito: false };
  }
  const ap = adeguamentoAperto(o, dati);
  if (!ap) return { nome, stato: 'adeguato', testo: 'adeguato', assegnati: 0, monte: null, finito: true };
  if (ap.finito) return { nome, stato: 'fatto', testo: `fatto: ${ap.assegnati}/${ap.monte} punti`, assegnati: ap.assegnati, monte: ap.monte, finito: true };
  // lotto 215: `riga` è l'identificativo di questo adeguamento (la nota di prima): l'avanzamento che il tablet comunica vale solo se coincide
  return { nome, stato: 'in corso', testo: `in corso: ${ap.assegnati}/${ap.monte} punti, ne restano ${ap.rimasti}`, assegnati: ap.assegnati, monte: ap.monte, finito: false, riga: ap.riga };
}

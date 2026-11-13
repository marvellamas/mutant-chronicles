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
import { calcolaSchedaPersonaggio, migraPersonaggio } from './avanzamento.js';
import { nuovaCorrezione, aggiungiCorrezione, normalizzaCorrezioni } from './correzioni-master.js';
import { profiloCompetenze, competenzaDi, limiteAbilita, PROFILO_NUOVO } from './competenze.js';
import { nomeEvento, puntiPrevisti } from './sposta-punti.js';

const isOggetto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const somma = (o) => Object.values(o ?? {}).reduce((a, b) => a + (Number.isInteger(b) ? b : 0), 0);
const pulisci = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([, n]) => Number.isInteger(n) && n > 0));

/** Marca della riga di registro che porta la nota: la cerca `notaPerScheda`, e un tablet non la toglie. */
export const MARCA = 'adeguamentoAbilita';

const personaggio = (o) => ({ creazione: o?.scelte ?? {}, livelli: Array.isArray(o?.livelli) ? o.livelli : [] });
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
 * Che cosa succede a un personaggio con l'adeguamento, **senza scrivere niente**.
 * @returns {{ nome, livello, giaFatto, bloccato, motivo, nota, monte, casi, scendono, nuovo }}
 *   `bloccato`: la procedura non parte (la nota non si scrive, o la scheda non si calcola).
 *   `scendono`: le Abilità che col profilo nuovo **perdono** VA (A.267, aperta): si ferma e lo dice.
 */
export function pianoAdeguamento(o, dati, { quando = new Date() } = {}) {
  const nome = String(o?.scelte?.nome ?? '').trim() || 'Senza nome';
  const livello = livelloDi(o);
  const vuoto = { nome, livello, giaFatto: false, bloccato: false, motivo: null, nota: null, monte: null, casi: [], scendono: [], nuovo: null };
  if (o?.scelte?.regimeAbilita === PROFILO_NUOVO) return { ...vuoto, giaFatto: true, motivo: 'è già adeguato al profilo 4/7/9/4' };

  // A: la nota di prima, prima di qualunque altra cosa. Senza, non si parte.
  let nota;
  try { nota = notaDiPrima(o, dati, { quando: quando.toISOString() }); } catch (e) {
    return { ...vuoto, bloccato: true, motivo: `non riesco a scrivere la nota di prima (${e.message}): non lo tocco` };
  }

  const m = monteAdeguamento(o, dati);
  const casi = [];
  if (m.differenza !== 0) {
    casi.push(`è al livello ${m.livello} con ${m.gradi} Grad${m.gradi === 1 ? 'o' : 'i'}: il monte è ${m.monte} punti (§8.3.1: 7 per Grado). `
      + `Il blocco approvato dell'11/11 parla del livello 8, cioè ${m.atteso8} punti: se la destinazione è quella, fallo salire prima.`);
  }

  // E: l'A.267 è aperta. Se un'Abilità scenderebbe di categoria e di base, la procedura si ferma e lo dice.
  const prima = profiloCompetenze(dati.regole, o.scelte);
  const dopo = profiloCompetenze(dati.regole, { ...o.scelte, regimeAbilita: PROFILO_NUOVO });
  const classePrima = dati.classi.classi.find((c) => c.nome === (o.scelte?.classe ?? o.scelte?.classi?.[0]?.nome));
  const scendono = [];
  if (classePrima) {
    for (const a of nota.abilita) {
      const catDopo = competenzaDi(classePrima, a.nome, dopo);
      const baseDopo = catDopo ? dopo.categorie[catDopo].base : null;
      if (Number.isInteger(baseDopo) && Number.isInteger(a.base) && baseDopo < a.base) {
        scendono.push({ nome: a.nome, da: a.competenza, a: catDopo, basePrima: a.base, baseDopo });
      }
    }
  }
  if (scendono.length) {
    return {
      ...vuoto,
      nota,
      monte: m,
      scendono,
      bloccato: true,
      motivo: `${scendono.length} Abilità passano a una categoria più bassa e perderebbero base (${scendono.map((x) => `${x.nome} ${x.da}→${x.a}`).join(', ')}): `
        + 'è la A.267, ancora aperta, e la procedura non decide da sé. Serve la risposta di Davide, oppure il Direttore decide al tavolo caso per caso.',
    };
  }

  const riga = rigaNotaDiPrima(nota, { quando });
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
    correzioni_master: aggiungiCorrezione(o.correzioni_master, {
      ...riga,
      primaDelAdeguamento: primaDelAdeguamento(o),
      monte: m.monte,
      eventoAssegnazione: ultimo,
    }),
  };
  return { ...vuoto, nota, monte: m, casi, nuovo };
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
    const motivoPiu = rimasti <= 0 ? 'Nessun punto rimasto da assegnare.'
      : punti >= massimo ? `VA ${base.grezzo + punti} già al limite ${a.limite} (${a.competenza}): un punto in più non aumenta il VA personale.`
        : (base.grezzo ?? 0) + punti < 1 ? 'Serve VA almeno 1 prima dei punti liberi.' : null;
    return {
      nome: a.nome, caratteristica: a.caratteristica, competenza: a.competenza, base: a.base, mod: a.mod,
      corporazione: a.corporazione, daClasse: a.daClasse, limite: a.limite, limiteCategoria: a.limiteCategoria,
      punti, massimo, motivoPiu,
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
  if (delta > 0 && (s.rimasti <= 0 || a.motivoPiu)) return pa;
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
  const irregolari = s.abilita.filter((a) => a.punti > a.massimo);
  if (irregolari.length) return { ok: false, motivo: `punti oltre il limite su ${irregolari.map((a) => a.nome).join(', ')}`, file: null };
  const conp = conPunti(o, bozza, s.livello);
  // il totale dell'evento diventa il monte: da qui in poi la scheda sa che quei punti sono quelli previsti e non
  // chiede più di assegnarne altri (finché l'adeguamento è aperto il totale è 0, così non si vedono due avvisi)
  const conTotale = (x) => ({ ...x, puntiDirettore: { ...(x.puntiDirettore ?? {}), totale: s.monte } });
  const file = s.livello === 1
    ? { ...conp, scelte: conTotale(conp.scelte) }
    : { ...conp, livelli: conp.livelli.map((v, i) => (i + 2 === s.livello ? conTotale(v) : v)) };
  const correzioni = normalizzaCorrezioni(file.correzioni_master).map((r) => (r?.[MARCA] === true && !r.confermato
    ? { ...r, confermato: quando, puntiAssegnati: pulisci(bozza) } : r));
  return { ok: true, motivo: null, file: { ...file, correzioni_master: correzioni } };
}

/**
 * Annulla l'adeguamento di **questo** personaggio: rimette i campi toccati com'erano e toglie la riga della nota.
 * Il file torna identico a com'era, contrassegno compreso.
 */
export function annullaAdeguamento(o) {
  const r = righeNota(o?.correzioni_master)[0];
  const prima = r?.primaDelAdeguamento;
  if (!isOggetto(prima)) return { ok: false, motivo: 'questo personaggio non ha una nota di prima da cui tornare indietro', file: null };
  const correzioni = normalizzaCorrezioni(o.correzioni_master).filter((x) => x.id !== r.id);
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
  return { nome, stato: 'in corso', testo: `in corso: ${ap.assegnati}/${ap.monte} punti, ne restano ${ap.rimasti}`, assegnati: ap.assegnati, monte: ap.monte, finito: false };
}

// Motore di calcolo: funzioni pure. Le costanti numeriche arrivano dai dati (data/*.json);
// qui stanno solo le formule, ciascuna con il paragrafo del Manuale del Giocatore.
import { calcolaSchedaPersonaggio } from './avanzamento.js';

// Avanzamento di livello (cap. 8): la validazione di un livello sta in avanzamento.js.
export { validaLivello } from './avanzamento.js';

/** §2.1: modificatore ordinario (tabella in caratteristiche.json, oggi valore − 5). */
export function modOrdinario(valore, tabella) {
  return leggiTabella(tabella, valore, 'modificatore ordinario');
}

/** §1.2.3: modificatore specifico per le Salvezze (1–2 −2; 3–4 −1; 5 0; 6–7 +1; 8–9 +2; 10 +3). */
export function modSalvezza(valore, tabella) {
  return leggiTabella(tabella, valore, 'modificatore per le Salvezze');
}

function leggiTabella(tabella, valore, cosa) {
  const m = tabella?.[String(valore)];
  if (!Number.isInteger(m)) throw new RangeError(`Nessun ${cosa} per il valore ${valore}`);
  return m;
}

/** §1.2.1 e §4.2: VA = Mod Caratteristica + Base Addestramento + Corporazione + Avanzamento. */
export function valoreAbilita({ mod, base, corporazione, avanzamento }) {
  return mod + base + corporazione + avanzamento;
}

/** §1.2.3: Salvezza = 8 + mod specifico + Addestramento + Avanzamento + Corporazione. */
export function salvezza({ base8, modSpecifico, addestramento, corporazione, avanzamento }) {
  return base8 + modSpecifico + addestramento + corporazione + avanzamento;
}

/**
 * §2.14 e §3.3: PV = COS + contributo della Classe. Al 1° livello il dado è massimizzato;
 * altrimenti serve il risultato del tiro.
 */
export function puntiVita(cos, classe, { dadoMassimizzato = true, tiro } = {}) {
  const { fisso, dado } = classe.pv_per_grado;
  return cos + fisso + contributoDado(dado, dadoMassimizzato ? dado : tiro, `PV di ${classe.nome}`);
}

/**
 * §2.14 e §3.3: PM = SAG + contributo della Classe. §2.12: per i PM "si applica il contributo
 * indicato dal profilo": il dado (Classi taumaturgiche) non è massimizzato, serve il tiro.
 */
export function puntiMagia(sag, classe, { tiro } = {}) {
  const { fisso, dado } = classe.pm_per_grado;
  return sag + fisso + contributoDado(dado, tiro, `PM di ${classe.nome}`);
}

function contributoDado(dado, risultato, cosa) {
  if (dado === 0) return 0;
  if (!Number.isInteger(risultato) || risultato < 1 || risultato > dado) {
    throw new RangeError(`Serve il tiro di 1d${dado} per i ${cosa} (1–${dado}), ricevuto ${risultato}`);
  }
  return risultato;
}

/**
 * PM al 1° livello: SAG + contributo della Classe con il dado massimizzato. Il §2.12 e il §3.3
 * massimizzano solo i PV; il master ha corretto (docs/risposte-master.md, decisione 6).
 */
export function puntiMagiaCreazione(sag, classe, regole) {
  const { dado } = classe.pm_per_grado;
  return puntiMagia(sag, classe, { tiro: dado > 0 && regole.creazione.dado_pm_massimizzato ? dado : undefined });
}

/** Incantesimi liberi «2 + Mod INT», con il minimo della formula (1, decisione 2 del master). */
export function incantesimiLiberi(mod, formula) {
  return Math.max(formula.minimo ?? 0, formula.fisso + mod);
}

/**
 * Livello massimo degli incantesimi conosciuti per Gradi taumaturgici complessivi: tabella del
 * master in regole.taumaturgo.livello_massimo_per_gradi (decisione 5). 0 senza Gradi.
 */
export function livelloMassimoIncantesimi(gradi, regole) {
  if (!gradi || gradi < 1) return 0;
  const tabella = [...regole.taumaturgo.livello_massimo_per_gradi].sort((a, b) => a.gradi - b.gradi);
  return (tabella.find((r) => r.gradi === gradi) ?? tabella.filter((r) => r.gradi <= gradi).at(-1)).livello;
}

/** §2.14: Iniziativa = Mod DES + Mod INT (modificatori ordinari). Somma i modificatori passati. */
export function iniziativa(...modificatori) {
  return modificatori.reduce((s, m) => s + m, 0);
}

/**
 * §5.13: bonus di Caratteristica al danno. Fascia del valore (1–5 → 0, 6–7 → +1, 8–9 → +2, 10 → +3),
 * limitata dal tetto del livello (1–7 → +1, 8–14 → +2, 15+ → +3); mai sotto 0.
 * Tabelle in regole.json → danno_caratteristica.
 */
export function bonusDannoCaratteristica(valore, livello, regole) {
  const R = regole.danno_caratteristica;
  if (!R || !Number.isFinite(valore)) return 0;
  const dentro = (x, v) => v >= x.da && (x.a === null || v <= x.a);
  const bonus = R.fasce.find((x) => dentro(x, valore))?.bonus ?? 0;
  const tetto = R.tetto_per_livello.find((x) => dentro(x, livello ?? 1))?.massimo ?? bonus;
  return Math.max(0, Math.min(bonus, tetto));
}

/** §5.13: Caratteristica del bonus al danno per un'Abilità d'attacco (quella dell'Abilità, salvo le eccezioni: Armi pesanti → INT). */
export function caratteristicaDanno(nomeAbilita, dati) {
  const R = dati.regole.danno_caratteristica;
  if (!R || !nomeAbilita) return null;
  return R.caratteristica_per_abilita?.[nomeAbilita] ?? dati.abilita.abilita.find((a) => a.nome === nomeAbilita)?.caratteristica ?? null;
}

/** §1.2.3: bonus di Avanzamento alle Salvezze per livello del personaggio. */
export function bonusAvanzamentoSalvezze(livello, regole) {
  const riga = regole.salvezze.avanzamento_per_livello.find((r) => livello >= r.da && livello <= r.a);
  if (!riga) throw new RangeError(`Nessun bonus di Avanzamento alle Salvezze per il livello ${livello}`);
  return riga.bonus;
}

// ---------------------------------------------------------------------------
// Scelte del giocatore → scheda al 1° livello

/**
 * Forma delle scelte (è ciò che si salva; tutto il resto si ricalcola):
 * {
 *   corporazione: 'Mishima',
 *   puntiCaratteristica: { FOR: 1, COS: 2, DES: 1, SAG: 1 },
 *   addestramento: 'Avventuriero',
 *   classe: 'Agente',
 *   puntiAbilitaLiberi: { 'Furtività': 2, 'Percezione': 2, 'Medicina': 1 },
 * }
 */

const trova = (lista, nome) => lista.find((x) => x.nome === nome);
const somma = (obj) => Object.values(obj ?? {}).reduce((s, v) => s + v, 0);

function risolvi(scelte, dati) {
  return {
    corp: trova(dati.corporazioni.corporazioni, scelte?.corporazione),
    addestr: trova(dati.addestramenti.addestramenti, scelte?.addestramento),
    classe: trova(dati.classi.classi, scelte?.classe),
  };
}

/** Valori finali delle Caratteristiche: iniziali della Corporazione + punti assegnati (§2.1). */
function caratteristicheFinali(corp, scelte, dati) {
  const { modificatore_ordinario: tabOrd, modificatore_salvezza: tabSal } = dati.caratteristiche;
  const out = {};
  for (const { sigla, nome } of dati.caratteristiche.caratteristiche) {
    const iniziale = corp.caratteristiche[sigla];
    const punti = scelte.puntiCaratteristica?.[sigla] ?? 0;
    const valore = iniziale + punti;
    out[sigla] = { nome, iniziale, punti, valore, mod: modOrdinario(valore, tabOrd), modSalvezza: modSalvezza(valore, tabSal) };
  }
  return out;
}

/** Le 24 Abilità scomposte nelle componenti del VA (§2.17). */
function abilitaScomposte(car, corp, addestr, classe, scelte, dati) {
  const bonusClasse = dati.regole.creazione.bonus_classe_per_grado;
  return dati.abilita.abilita.map(({ nome, categoria, caratteristica }) => {
    const componenti = {
      mod: car[caratteristica].mod,
      base: addestr.valori_base[nome],
      corporazione: corp.abilita_bonus.includes(nome) ? 1 : 0,
    };
    // §2.12: il +1 di Classe va nell'Avanzamento; §2.13: i punti liberi pure.
    const daClasse = classe.abilita.includes(nome) ? bonusClasse : 0;
    const liberi = scelte.puntiAbilitaLiberi?.[nome] ?? 0;
    const avanzamento = daClasse + liberi;
    return {
      nome, categoria, caratteristica, ...componenti, daClasse, liberi, avanzamento,
      // §3.1: si assegnano prima i punti di Classe e poi i liberi; §2.13 verifica il VA a quel punto.
      vaPrimaDeiLiberi: valoreAbilita({ ...componenti, avanzamento: daClasse }),
      totale: valoreAbilita({ ...componenti, avanzamento }),
    };
  });
}

/**
 * Controlla le scelte contro le regole di creazione. Ogni errore ha:
 * campo, problema e tipo ('violazione' = regola infranta, 'incompleto' = scelta mancante o parziale).
 */
export function validaScelte(scelte, dati) {
  const errori = [];
  const err = (campo, problema, tipo = 'violazione') => errori.push({ campo, problema, tipo });
  const cr = dati.regole.creazione;
  const { corp, addestr, classe } = risolvi(scelte, dati);

  if (!corp) err('corporazione', scelte?.corporazione ? `Corporazione "${scelte.corporazione}" inesistente` : 'Corporazione non scelta', scelte?.corporazione ? 'violazione' : 'incompleto');
  if (!addestr) err('addestramento', scelte?.addestramento ? `Addestramento "${scelte.addestramento}" inesistente` : 'Addestramento non scelto', scelte?.addestramento ? 'violazione' : 'incompleto');
  if (!classe) err('classe', scelte?.classe ? `Classe "${scelte.classe}" inesistente` : 'Classe non scelta', scelte?.classe ? 'violazione' : 'incompleto');
  // §2.2 e §2.12: la prima Classe appartiene all'Addestramento scelto.
  if (classe && addestr && classe.addestramento !== addestr.nome) {
    err('classe', `${classe.nome} appartiene all'Addestramento ${classe.addestramento}, non a ${addestr.nome}`);
  }
  // §3.5.5: il Talento fisso del I Grado può chiedere un parametro (Disciplina del Lottatore)
  for (const e of erroriParametriTalenti(classe ? classe.talenti_fissi.filter((t) => t.grado === 1) : [], scelte?.parametriTalenti)) err(e.campo, e.problema, e.tipo);

  // §2.1: 5 Punti Caratteristica, nessun valore oltre 7, i valori iniziali non si riducono.
  const sigle = new Set(dati.caratteristiche.caratteristiche.map((c) => c.sigla));
  const pc = scelte?.puntiCaratteristica ?? {};
  for (const [s, p] of Object.entries(pc)) {
    if (!sigle.has(s)) err(`puntiCaratteristica.${s}`, `"${s}" non è una Caratteristica`);
    else if (!Number.isInteger(p) || p < 0) err(`puntiCaratteristica.${s}`, 'i punti devono essere interi ≥ 0: i valori iniziali non si riducono');
    else if (corp && p > 0 && corp.caratteristiche[s] + p > cr.massimo_caratteristica) {
      err(`puntiCaratteristica.${s}`, `${s} arriverebbe a ${corp.caratteristiche[s] + p}: alla creazione il massimo è ${cr.massimo_caratteristica}`);
    }
  }
  const spesiCar = somma(pc);
  if (spesiCar > cr.punti_caratteristica) err('puntiCaratteristica', `assegnati ${spesiCar} punti, il massimo è ${cr.punti_caratteristica}`);
  if (spesiCar < cr.punti_caratteristica) err('puntiCaratteristica', `assegnati ${spesiCar} punti su ${cr.punti_caratteristica}`, 'incompleto');

  // §2.13: Punti Abilità Liberi (creazione.punti_abilita_liberi); Avanzamento iniziale ≤ 3 incluso il +1 di Classe; VA ≥ 1 prima dei punti liberi.
  const pa = scelte?.puntiAbilitaLiberi ?? {};
  const nomiAbilita = new Set(dati.abilita.abilita.map((a) => a.nome));
  for (const [n, p] of Object.entries(pa)) {
    if (!nomiAbilita.has(n)) err(`puntiAbilitaLiberi.${n}`, `"${n}" non è un'Abilità`);
    else if (!Number.isInteger(p) || p < 0) err(`puntiAbilitaLiberi.${n}`, 'i punti devono essere interi ≥ 0');
  }
  const spesiAb = somma(pa);
  // punti in più rispetto alle regole correnti (se un domani i punti calano): si segnalano, non si tolgono
  if (spesiAb > cr.punti_abilita_liberi) err('puntiAbilitaLiberi', `${spesiAb - cr.punti_abilita_liberi} punti in eccesso rispetto alle regole correnti (${cr.punti_abilita_liberi})`, 'eccesso');
  if (spesiAb < cr.punti_abilita_liberi) err('puntiAbilitaLiberi', `assegnati ${spesiAb} punti su ${cr.punti_abilita_liberi}`, 'incompleto');

  const strutturaOk = corp && addestr && classe && errori.every((e) => !e.campo.startsWith('puntiCaratteristica.'));
  if (strutturaOk) {
    const car = caratteristicheFinali(corp, scelte, dati);
    for (const a of abilitaScomposte(car, corp, addestr, classe, scelte, dati)) {
      if (a.liberi === 0) continue;
      if (a.avanzamento > cr.avanzamento_massimo_iniziale) {
        err(`puntiAbilitaLiberi.${a.nome}`, `Avanzamento ${a.avanzamento} (Classe ${a.daClasse} + liberi ${a.liberi}): alla creazione il massimo è ${cr.avanzamento_massimo_iniziale}`);
      }
      if (a.vaPrimaDeiLiberi < cr.va_minimo_per_punti_liberi) {
        err(`puntiAbilitaLiberi.${a.nome}`, `VA ${a.vaPrimaDeiLiberi} prima dei punti liberi: serve almeno ${cr.va_minimo_per_punti_liberi}`);
      }
    }
  }

  // Al 1° livello anche il dado dei PM è massimizzato (docs/risposte-master.md, decisione 6):
  // la creazione non ha tiri da validare.
  return errori;
}

/**
 * Calcola la scheda completa a partire dalle sole scelte: al 1° livello dalle scelte della
 * creazione, oppure dal personaggio { creazione, livelli } rigiocando i livelli.
 * Non lancia eccezioni per scelte errate: le segnala in `errori` e calcola ciò che può.
 */
/**
 * Parametri dei Talenti di Classe acquisiti in un passo (creazione o livello): { campo, problema, tipo }.
 * Ogni Talento con un parametro (§3.5.5, Disciplina) vuole una delle sue opzioni; parametri per
 * Talenti non acquisiti in quel passo sono violazioni (la scelta è permanente: non si cambia dopo).
 */
export function erroriParametriTalenti(talentiAcquisiti, parametri) {
  const out = [];
  const p = parametri && typeof parametri === 'object' ? parametri : {};
  for (const t of talentiAcquisiti) {
    const Q = t.parametro;
    if (!Q || typeof Q !== 'object') continue;
    const v = p[t.nome];
    if (!v) out.push({ campo: `parametriTalenti.${t.nome}`, problema: `${t.nome}: scegli la ${Q.nome} (${Q.opzioni.map((o) => o.nome).join(', ')})`, tipo: 'incompleto' });
    else if (!Q.opzioni.some((o) => o.id === v)) out.push({ campo: `parametriTalenti.${t.nome}`, problema: `${t.nome}: "${v}" non è una ${Q.nome}`, tipo: 'violazione' });
  }
  for (const nome of Object.keys(p)) {
    if (!talentiAcquisiti.some((t) => t.nome === nome && t.parametro && typeof t.parametro === 'object')) {
      out.push({ campo: `parametriTalenti.${nome}`, problema: `${nome}: il parametro si sceglie una sola volta, quando si acquisisce il Talento, e poi non si cambia (§3.5.5)`, tipo: 'violazione' });
    }
  }
  return out;
}

export function calcolaScheda(scelte, dati) {
  // Personaggio v2 { creazione, livelli }: si rigiocano creazione e livelli (cap. 8).
  if (scelte?.creazione) return calcolaSchedaPersonaggio(scelte, dati);
  const errori = validaScelte(scelte, dati);
  const { corp, addestr, classe } = risolvi(scelte, dati);
  const bloccanti = errori.filter((e) => e.tipo === 'violazione' && (['corporazione', 'addestramento', 'classe'].includes(e.campo) || e.campo.startsWith('puntiCaratteristica.')));
  if (!corp || !addestr || !classe || bloccanti.length) return { livello: 1, errori, completa: false };

  const r = dati.regole;
  const livello = 1;
  const car = caratteristicheFinali(corp, scelte, dati);
  const abilita = abilitaScomposte(car, corp, addestr, classe, scelte, dati);

  const avanzSalvezze = bonusAvanzamentoSalvezze(livello, r);
  const salvezze = {};
  for (const { id, nome, caratteristica } of dati.caratteristiche.salvezze) {
    const componenti = {
      base8: r.salvezze.base,
      modSpecifico: car[caratteristica].modSalvezza,
      addestramento: addestr.salvezze[id],
      corporazione: corp.salvezze[id],
      avanzamento: avanzSalvezze,
    };
    salvezze[id] = { nome, caratteristica, ...componenti, totale: salvezza(componenti) };
  }

  const pv = puntiVita(car.COS.valore, classe, { dadoMassimizzato: r.creazione.dado_pv_massimizzato });
  const pm = puntiMagiaCreazione(car.SAG.valore, classe, r);

  const scheda = {
    livello,
    corporazione: corp.nome,
    addestramento: addestr.nome,
    classe: classe.nome,
    grado: 1,
    caratteristiche: car,
    abilita,
    salvezze,
    pv,
    pm,
    iniziativa: iniziativa(...r.iniziativa.caratteristiche.map((s) => car[s].mod)),
    movimento: { passo: r.movimento.passo, corsa: r.movimento.corsa, scatto: r.movimento.scatto, unita: r.movimento.unita },
    azioni: { movimento: r.azioni_primo_livello.movimento, principali: r.azioni_primo_livello.principali },
    vantaggio: addestr.vantaggio,
    // §2.12: al 1° livello solo il Talento fisso del I Grado.
    talenti: classe.talenti_fissi.filter((t) => t.grado === 1),
    errori,
    completa: errori.every((e) => e.tipo === 'eccesso'), // i punti in eccesso si segnalano soltanto
  };

  // §2.10, §3.8 e Magia sezione 1: accesso alla magia per l'Addestramento Taumaturgo.
  if (addestr.nome === r.taumaturgo.addestramento) {
    const liberi = r.taumaturgo.incantesimi_liberi;
    scheda.incantesimi = {
      liberi: incantesimiLiberi(car[liberi.caratteristica].mod, liberi),
      diClasse: classe.incantesimi?.primo_grado ?? {},
      livelloMassimo: livelloMassimoIncantesimi(scheda.grado, r),
    };
  }
  return scheda;
}

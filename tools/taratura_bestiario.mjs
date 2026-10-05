// Taratura del Bestiario (docs/bestiario/bestiario.md, Appendice A): PG di riferimento costruiti con le regole
// di creazione e avanzamento del Giocatore 0.45, dal motore dell'app, misurati come li misura il convertitore
// «PG → nemico» del Tavolo del Master (branch tavolo-direttore, src/nemico-da-pg.js): calcolaScheda con una
// sessione nuova (PV pieni, nessuno Stato), VA effettivo e danno dell'arma in mano, AR, Difese, Iniziativa,
// Salvezze, Azioni Principali.
//
// La costruzione dei PG è la stessa di tools/genera_esempi.mjs e tools/genera_nemici_umani.mjs del branch,
// copiata qui perché main non ha quei file (il branch non si tocca). Il controllo finale confronta i numeri
// con i file del bestiario umano del branch (git show origin/tavolo-direttore:esempi/nemici/umani/…): devono
// coincidere.
// Il modello dello scontro (Appendice A.3) misura per ogni grado, contro un gruppo di 7 PG del livello di
// riferimento, i Round di resistenza della creatura e i Round che le servono per abbattere un PG; esce con errore se
// un grado o un Boss cade fuori dagli intervalli decisi da Marcello il 2 ottobre 2026 (OBIETTIVI).
//   node tools/taratura_bestiario.mjs        → tabelle per livello e per archetipo, scala, Boss, bilancio, basi e
//                                              bestiario umano scalato, in Markdown
//   node tools/taratura_bestiario.mjs --json → personaggi, confronto e scala in JSON
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync } from 'node:fs';

const u = (p) => new URL(`../${p}`, import.meta.url).href;
const { datiReali } = await import(u('tests/helpers.js'));
const { nuoveScelte, normalizza } = await import(u('src/character.js'));
const { checklist } = await import(u('src/checklist.js'));
const { statoIncantesimi, motivoBloccoIncantesimo } = await import(u('src/incantesimi.js'));
const { dotazioneVuota, opzioniEffettive, sottoScelteRichieste, vociDotazione, applicaDotazione, mancanzeDotazione } = await import(u('src/dotazioni.js'));
const { validaLivello, applicaLivello, calcolaSchedaPersonaggio, puntiDaCompletare } = await import(u('src/avanzamento.js'));
const { massimiSessione, inizializzaSessione } = await import(u('src/sessione.js'));
const { calcolaScheda } = await import(u('src/calc.js'));
const { profiloNemico, scelteCreatura } = await import(u('src/crea-nemico.js'));
const { catalogo, risolvi, statoIniziale } = await import(u('src/equipaggiamento.js'));

const RADICE = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const tiro = (valore) => ({ valore, origine: 'manuale' });

/** Livelli misurati: tutta la scala, dal 1° al 20°. */
export const LIVELLI = [1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20];

const FUCILIERE = ['Armi medie', 'Difese', 'Atletica', 'Percezione', 'Armi leggere', 'Corpo a corpo', 'Sopravvivenza', 'Medicina', 'Armi da mischia', 'Furtività'];
const SPADACCINO = ['Armi da guerra', 'Armi da mischia', 'Difese', 'Atletica', 'Corpo a corpo', 'Percezione', 'Armi leggere', 'Sopravvivenza', 'Medicina', 'Furtività'];
const PISTOLERO = ['Armi leggere', 'Furtività', 'Percezione', 'Difese', 'Armi da mischia', 'Atletica', 'Raggirare', 'Tecnologia', 'Corpo a corpo', 'Cultura'];

/**
 * Archetipi di riferimento: quattro tipi del bestiario umano del branch (stesse specifiche), che coprono
 * fuoco a distanza, mischia con scudo, pistola leggera e fuoco di supporto.
 */
export const ARCHETIPI = [
  {
    tipo: 'Fante Capitol', id: 'fante-capitol', ruolo: 'fucile',
    base: { corporazione: 'Capitol', addestramento: 'Combattente', classe: 'Soldato', concetto: 'Fante delle Freedom Brigades' },
    caratteristiche: ['DES', 'COS', 'FOR', 'SAG'], liberi: FUCILIERE,
    dotazione: [{ 'Arma principale': 0, Protezione: 0 }, { 'Arma principale': 1, Protezione: 1 }],
    impugna: 'arma_distanza',
    talenti: ['mira-rapida', 'raffica-breve-migliorata', 'copertura-migliorata', 'duro-a-morire'], talentiClasse: ['Supporto d’Attacco'],
  },
  {
    tipo: 'Guerriero Mishima', id: 'guerriero-mishima', ruolo: 'mischia',
    base: { corporazione: 'Mishima', addestramento: 'Combattente', classe: 'Assaltatore', concetto: 'Guerriero ashigaru' },
    caratteristiche: ['FOR', 'DES', 'COS', 'SAG'], liberi: SPADACCINO,
    dotazione: [{ 'Arma da mischia': 0, Scudo: 0, Protezione: 0 }, { 'Arma da mischia': 1, Scudo: 1, Protezione: 1 }],
    impugna: 'arma_ravvicinata',
    talenti: ['affondo-migliorato', 'parata-migliorata', 'iniziativa-migliorata', 'duro-a-morire'], talentiClasse: ['Carica Brutale'],
  },
  {
    tipo: 'Agente Cybertronic', id: 'agente-cybertronic', ruolo: 'pistola',
    base: { corporazione: 'Cybertronic', addestramento: 'Avventuriero', classe: 'Agente', concetto: 'Agente operativo' },
    caratteristiche: ['DES', 'INT', 'SAG', 'CAR'], liberi: PISTOLERO,
    dotazione: [{ 'Arma da fuoco': 0 }],
    impugna: 'arma_distanza',
    talenti: ['pistolero', 'estrazione-rapida', 'schivata-migliorata', 'tiro-ravvicinato-migliorato'], talentiClasse: ['Mira Selettiva'],
  },
  {
    tipo: 'Mercenario', id: 'mercenario', ruolo: 'supporto',
    base: { corporazione: 'Freelance', addestramento: 'Combattente', classe: 'Artigliere', concetto: 'Mercenario a contratto' },
    caratteristiche: ['DES', 'COS', 'INT', 'FOR'], liberi: FUCILIERE,
    dotazione: [{ 'Arma principale': 0, Mirino: 0 }],
    impugna: 'arma_distanza',
    talenti: ['raffica-breve-migliorata', 'mira-rapida', 'ricarica-rapida', 'duro-a-morire'], talentiClasse: ['Raffica Estesa'],
  },
];

// --- costruzione del PG (tools/genera_esempi.mjs → costruisci, branch tavolo-direttore) ---------------------

function assegna(punti, ordine, totale, ammesso, massimo = 3) {
  const out = { ...punti };
  for (let n = 0; n < totale; n++) {
    const k = ordine.find((x) => (out[x] ?? 0) < massimo && ammesso({ ...out, [x]: (out[x] ?? 0) + 1 }, x));
    if (!k) break;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function inUso(voci, impugna, dati) {
  const cat = catalogo(dati);
  let impugnata = false;
  const perRif = voci.some((v) => v.rif === impugna);
  const dueMani = voci.some((v) => (perRif ? v.rif === impugna : false) && risolvi(v, cat).def?.mani === 2);
  return voci.map((v, i) => {
    const r = risolvi(v, cat);
    if (!impugnata && (perRif ? v.rif === impugna : r.tipo === impugna)) { impugnata = true; return { ...v, stato: 'impugnata' }; }
    if (r.tipo === 'armatura') return { ...v, stato: 'indossata' };
    if (r.tipo === 'scudo') return { ...v, stato: dueMani ? 'pronta' : 'imbracciato' };
    return v.stato ? v : { ...v, stato: statoIniziale(r.tipo, voci.slice(0, i), dati) };
  });
}

/** Creazione (§2.0–2.17) con l'equipaggiamento iniziale del §2.16: { scelte, problemi }. */
function creazione(spec, dati) {
  const problemi = [];
  const base = { ...nuoveScelte(), ...spec.base, puntiEroe: tiro(5) };
  base.puntiCaratteristica = assegna({}, spec.caratteristiche, dati.regole.creazione.punti_caratteristica,
    (pc) => !calcolaScheda({ ...base, puntiCaratteristica: pc }, dati).errori.some((e) => e.tipo === 'violazione' && e.campo.startsWith('puntiCaratteristica')));
  base.puntiAbilitaLiberi = assegna({}, spec.liberi, dati.regole.creazione.punti_abilita_liberi,
    (pa, k) => !calcolaScheda({ ...base, puntiAbilitaLiberi: pa }, dati).errori.some((e) => e.tipo === 'violazione' && e.campo === `puntiAbilitaLiberi.${k}`));
  let scelte = normalizza(base, dati).scelte;
  const dot = dotazioneVuota();
  for (const { gruppo } of opzioniEffettive(dot, scelte.classe, dati)) {
    const i = spec.dotazione?.[gruppo.etichetta] ?? 0;
    dot.opzioni[gruppo.id] = gruppo.opzioni[Math.min(i, gruppo.opzioni.length - 1)].id;
  }
  for (const s of sottoScelteRichieste(dot, scelte.classe, dati)) dot.sotto[s.oggetto] = s.opzioni?.[0] ?? s.esempio ?? 'scelta del giocatore';
  dot.crediti = tiro(7);
  problemi.push(...mancanzeDotazione(dot, scelte.classe, scelte.corporazione, dati).map((m) => `dotazione: ${m}`));
  scelte.dotazione = dot;
  scelte.equipaggiamento = inUso(applicaDotazione([], vociDotazione(dot, scelte.classe, scelte.corporazione, dati)), spec.impugna, dati);
  if (statoIncantesimi(scelte, dati)) {
    const cat = [...dati.incantesimi.incantesimi].sort((a, b) => a.livello_base - b.livello_base || a.nome.localeCompare(b.nome));
    for (const inc of cat) {
      const stato = statoIncantesimi(scelte, dati);
      if (stato.completo) break;
      if (!motivoBloccoIncantesimo(inc, stato, scelte)) scelte = { ...scelte, incantesimi: [...(scelte.incantesimi ?? []), inc.nome] };
    }
  }
  const norm = normalizza(scelte, dati);
  problemi.push(...norm.avvisi.map((a) => `normalizza: ${a}`));
  for (const c of checklist(norm.scelte, dati)) if (!c.ok && !c.nonApplicabile) problemi.push(`checklist: ${c.testo}`);
  return { scelte: norm.scelte, problemi };
}

// --- livelli (tools/genera_nemici_umani.mjs → sceltaLivello, branch tavolo-direttore) ------------------------

// validaLivello lancia un'eccezione se un aumento porta una Caratteristica oltre il massimo (modificatore
// assente in tabella): qui vale come scelta non valida
const valida = (personaggio, l, dati) => { try { return validaLivello(personaggio, l, dati); } catch (e) { return [{ campo: 'caratteristiche', tipo: 'violazione', problema: e.message }]; } };
const senzaErrori = (personaggio, l, dati) => !valida(personaggio, l, dati).length;
const punti = (livello, dati) => Number(/^punti_abilita:(\d+)$/.exec(dati.regole.avanzamento.eventi.find((e) => e.livello === livello)?.eventi.find((x) => x.startsWith('punti_abilita:')) ?? '')?.[1] ?? 0);
const eventi = (livello, dati) => dati.regole.avanzamento.eventi.find((e) => e.livello === livello)?.eventi ?? [];

function conIncantesimi(personaggio, l, dati) {
  const manca = (x) => valida(personaggio, x, dati).some((e) => e.campo === 'incantesimi' && e.tipo === 'incompleto');
  if (!manca(l)) return l;
  const cat = [...dati.incantesimi.incantesimi].sort((a, b) => a.livello_base - b.livello_base || a.nome.localeCompare(b.nome));
  let out = { ...l, incantesimi: [] };
  for (const inc of cat) {
    if (!manca(out)) break;
    const prova = { ...out, incantesimi: [...out.incantesimi, inc.nome] };
    if (!valida(personaggio, prova, dati).some((e) => e.campo === 'incantesimi' && e.tipo === 'violazione')) out = prova;
  }
  return out;
}

function sceltaLivello(t, personaggio, livello, dati) {
  const ev = eventi(livello, dati);
  const tentativi = [];
  if (ev.some((e) => e.startsWith('caratteristiche:'))) {
    const c = t.caratteristiche;
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) tentativi.push({ livello, caratteristiche: { [c[i]]: 1, [c[j]]: 1 } });
  } else if (ev.includes('talento_libero')) {
    const tutti = dati.talenti_liberi.talenti.map((x) => x.id);
    for (const id of [...t.talenti, ...tutti.filter((x) => !t.talenti.includes(x))]) tentativi.push({ livello, talentoLibero: { id } });
  } else if (ev.includes('grado_classe')) {
    const def = dati.classi.classi.find((c) => c.nome === t.base.classe);
    const media = (d) => Math.floor(d / 2) + 1;
    const base = { livello, grado: { classe: def.nome }, tiroPV: tiro(media(def.pv_per_grado.dado)), ...(def.pm_per_grado.dado ? { tiroPM: tiro(media(def.pm_per_grado.dado)) } : {}) };
    const pa = {};
    for (let n = 0; n < punti(livello, dati); n++) {
      const k = t.liberi.find((x) => (pa[x] ?? 0) < 3 && !valida(personaggio, { ...base, puntiAbilita: { ...pa, [x]: (pa[x] ?? 0) + 1 } }, dati)
        .some((e) => e.tipo === 'violazione' && (e.campo.includes(x) || e.problema.includes(x))));
      if (!k) break;
      pa[k] = (pa[k] ?? 0) + 1;
    }
    const conPunti = { ...base, puntiAbilita: pa };
    for (const n of [...(t.talentiClasse ?? []), ...def.talenti_a_scelta.map((x) => x.nome)]) tentativi.push({ ...conPunti, talentoClasse: n });
    tentativi.push(conPunti);
  }
  for (const l0 of tentativi) {
    const l = conIncantesimi(personaggio, l0, dati);
    if (senzaErrori(personaggio, l, dati)) return l;
  }
  return null;
}

/** Il PG dell'archetipo al livello: dal Veterano (5°) in su le opzioni migliori dell'equipaggiamento. */
export function pgAlLivello(t0, livello, dati) {
  const t = { ...t0, liberi: [...t0.liberi, ...dati.abilita.abilita.map((a) => a.nome).filter((n) => !t0.liberi.includes(n))] };
  const spec = { base: { nome: `${t.tipo} ${livello}`, ...t.base }, caratteristiche: t.caratteristiche, liberi: t.liberi, dotazione: t.dotazione[Math.min(livello >= 5 ? 1 : 0, t.dotazione.length - 1)], impugna: t.impugna };
  const { scelte, problemi } = creazione(spec, dati);
  let personaggio = { creazione: scelte, livelli: [] };
  for (let l = 2; l <= livello; l++) {
    const v = sceltaLivello(t, personaggio, l, dati);
    if (!v) { problemi.push(`${l}° livello: nessuna scelta valida`); break; }
    personaggio = applicaLivello(personaggio, v);
  }
  if (puntiDaCompletare(personaggio, dati)?.length) problemi.push('punti Abilità da completare');
  for (const e of calcolaSchedaPersonaggio(personaggio, dati).errori ?? []) problemi.push(`scheda: ${e.campo} — ${e.problema}`);
  return { personaggio, problemi };
}

// --- misura (come src/nemico-da-pg.js, branch tavolo-direttore) ----------------------------------------------

/** Danno medio di «1d6+2», «2d6+1d4+3». */
export function dannoMedio(testo) {
  let m = 0;
  for (const [, n, f] of String(testo).matchAll(/(\d+)d(\d+)/g)) m += Number(n) * (Number(f) + 1) / 2;
  const fisso = /([+-]\d+)$/.exec(String(testo).replace(/\s+/g, ''));
  return m + (fisso && /d/.test(testo) ? Number(fisso[1]) : (/d/.test(testo) ? 0 : Number(testo) || 0));
}

export function misura({ personaggio }, dati) {
  const { creazione: scelte, livelli } = personaggio;
  const riposo = calcolaScheda({ creazione: scelte, livelli }, dati);
  const massimi = massimiSessione(riposo, scelte, dati);
  const scheda = calcolaScheda({ creazione: scelte, livelli, sessione: inizializzaSessione(massimi) }, dati);
  const eq = scheda.equipaggiamento ?? {};
  const ar = eq.arEffettiva ?? eq.ar ?? { totale: 0, magica: 0 };
  const difese = scheda.abilita.find((a) => a.nome === (eq.abilitaDifese ?? 'Difese'));
  const a = (eq.armi ?? []).find((x) => !x.daScudo);
  const danno = a ? (a.mani === 2 ? a.danno?.due_mani ?? a.danno?.una_mano : a.danno?.una_mano ?? a.danno?.due_mani) : null;
  const salv = dati.caratteristiche.salvezze.map((s) => scheda.salvezze[s.id].effettivo ?? scheda.salvezze[s.id].totale);
  return {
    pv: massimi.pv, ar: ar.totale ?? 0, difese: difese ? (difese.effettivo ?? difese.totale) : 0,
    iniziativa: scheda.tavolo?.iniziativa?.effettivo ?? scheda.iniziativa ?? 0,
    arma: a?.nome ?? '—', va: a ? (a.vaEffettivo ?? a.va) : 0, danno: danno ?? '—', dannoMedio: danno ? dannoMedio(danno) : 0,
    salvezze: salv.reduce((x, y) => x + y, 0) / salv.length, salvezzaMin: Math.min(...salv), salvezzaMax: Math.max(...salv),
    azioni: scheda.azioni?.principali ?? 1,
  };
}

/** Tutte le misure: [{ livello, archetipi: [{ tipo, ...misura, problemi }], media }]. */
export function taratura(dati) {
  return LIVELLI.map((livello) => {
    const archetipi = ARCHETIPI.map((t) => {
      const pg = pgAlLivello(t, livello, dati);
      return { tipo: t.tipo, id: t.id, ...misura(pg, dati), problemi: pg.problemi };
    });
    const media = (k) => archetipi.reduce((s, x) => s + x[k], 0) / archetipi.length;
    return { livello, archetipi, media: { pv: media('pv'), va: media('va'), difese: media('difese'), ar: media('ar'), dannoMedio: media('dannoMedio'), iniziativa: media('iniziativa'), salvezze: media('salvezze'), azioni: media('azioni') } };
  });
}

/**
 * Confronto con il bestiario umano del branch tavolo-direttore (convertitore vero): ai livelli 2, 5 e 8 PV, VA
 * dell'arma in mano, Difese e AR devono coincidere. null se il branch non è raggiungibile.
 */
export function confrontoConBranch(righe) {
  const gradi = { 2: 'recluta', 5: 'veterano', 8: 'elite' };
  const out = [];
  for (const r of righe.filter((x) => gradi[x.livello])) {
    for (const a of r.archetipi) {
      let n;
      try {
        n = JSON.parse(execFileSync('git', ['show', `origin/tavolo-direttore:esempi/nemici/umani/${a.id}-${gradi[r.livello]}.json`], { cwd: RADICE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
      } catch {
        return null;
      }
      const atteso = { pv: n.pv, va: n.attacchi[0].va, difese: n.difese, ar: n.ar.totale };
      const misurato = { pv: a.pv, va: a.va, difese: a.difese, ar: a.ar };
      out.push({ file: `${a.id}-${gradi[r.livello]}`, uguale: JSON.stringify(atteso) === JSON.stringify(misurato), atteso, misurato });
    }
  }
  return out;
}

// --- modello degli scontri (Bestiario, §2.3 e Appendice A.3) ----------------------------------------------------
//
// Ritaratura del 2 ottobre 2026 (decisione di Marcello): gruppo di 7 PG. Per ogni grado due misure:
// - Round di resistenza: quanti Round un singolo nemico del grado resiste contro 7 PG del livello di riferimento
//   che attaccano con le loro armi e i loro VA; il PG bersaglio tiene la propria AzP per la Parata e non attacca;
// - Round per abbattere un PG: quanti Round il nemico, da solo, impiega a portare a 0 PV un PG del livello di
//   riferimento, che para il primo colpo di ogni Round con le sue Difese (Giocatore §5.9).
// Obiettivi dei Round di resistenza: Minore 1–2, Semplice 2–4, Medio 3–6, Potente 5–10, Molto potente 6–15, Boss 10–20.

/** Gradi della scala (Bestiario, §2.1). Se cambia la tabella del manuale, si cambia qui (e viceversa). */
export const GRADI = [
  { nome: 'Minore', livello: 2, pv: 21, va: 11, difese: 9, ar: 1, danno: '1d8+2', azioni: 1 },
  { nome: 'Semplice', livello: 5, pv: 42, va: 13, difese: 11, ar: 2, danno: '1d8+3', azioni: 2 },
  { nome: 'Medio', livello: 8, pv: 65, va: 15, difese: 13, ar: 3, danno: '2d6+2', azioni: 2 },
  { nome: 'Potente', livello: 12, pv: 180, va: 17, difese: 15, ar: 4, danno: '2d8+2', azioni: 2 },
  { nome: 'Molto potente', livello: 16, pv: 265, va: 19, difese: 17, ar: 5, danno: '2d8+3', azioni: 2 },
];
/** Obiettivi dei Round di resistenza contro 7 PG, per grado e per il Boss. */
export const OBIETTIVI = { Minore: [1, 2], Semplice: [2, 4], Medio: [3, 6], Potente: [5, 10], 'Molto potente': [6, 15], Boss: [10, 20] };
/** PG del gruppo. */
export const N_PG = 7;
/** Round di resistenza a cui si tara il Boss (dentro 10–20). */
export const ROUND_BOSS = 12;
/** Bilancio «Equilibrato» (§2.3): forza delle creature rispetto a quella del gruppo (legge del quadrato). */
export const DIFFICOLTA = { facile: 0.3, normale: 0.6, duro: 1 };

/**
 * Basi del Bestiario (§3) come modifiche del grado: PV moltiplicati (arrotondati a 1), AR e Difese sommate,
 * danno dell'attacco principale per grado. Il peso resta vicino a 1 (Appendice A.4). `vaContro`: modificatore al
 * VA di chi attacca la creatura (§3.1 del Bestiario, proposta): −2 contro l'Alato in volo, +2 contro il Gigante
 * (bersaglio grande).
 */
export const MOD_BASI = {
  Insettoide: { pv: 0.9, ar: 1, difese: 0, danni: ['1d8+1', '1d8+2', '2d6+1', '2d8+1', '2d8+2'] },
  Aracnoide: { pv: 0.9, ar: 0, difese: 1, danni: ['1d6+2', '1d8+2', '2d6+2', '2d8+2', '2d8+3'] },
  'Umanoide mostruoso': { pv: 1.1, ar: -1, difese: -2, danni: ['1d8+3', '1d10+3', '2d6+3', '2d8+3', '2d8+4'] },
  Quadrupede: { pv: 1, ar: 0, difese: -1, danni: ['1d8+2', '1d8+3', '2d6+2', '2d8+2', '2d8+3'] },
  // A.95 (E&L del 05/10/2026): nessun −2 VA contro chi vola; i PV tornano al grado (stesso peso, A.4)
  Alato: { pv: 1, ar: 0, difese: 2, danni: ['1d6+2', '1d8+2', '2d6+2', '2d8+2', '2d8+3'] },
  Strisciante: { pv: 1.2, ar: 0, difese: -2, danni: ['1d8+1', '1d8+2', '2d6+1', '2d8+1', '2d8+2'] },
  // A.95: nessun +2 VA contro le creature grandi; PV × 1,1 (stesso peso, A.4)
  Gigante: { pv: 1.1, ar: 0, difese: -4, danni: ['1d8+2', '1d8+3', '2d6+2', '2d8+2', '2d8+3'] },
};
export const BASI = {
  Umano: GRADI.map((g) => ({ ...g })),
  ...Object.fromEntries(Object.entries(MOD_BASI).map(([n, m]) => [n, GRADI.map((g, i) => ({
    ...g, pv: Math.round(g.pv * m.pv), ar: Math.max(1, g.ar + m.ar), difese: g.difese + m.difese, danno: m.danni[i], vaContro: m.vaContro ?? 0,
  }))])),
};

/** Distribuzione di un danno «2d6+3»: Map valore → probabilità. */
export function distribuzione(formula) {
  let d = new Map([[0, 1]]);
  const s = String(formula).replace(/\s+/g, '');
  for (const [, n, f] of s.matchAll(/(\d+)d(\d+)/g)) {
    for (let k = 0; k < Number(n); k++) {
      const nd = new Map();
      for (const [v, p] of d) for (let x = 1; x <= Number(f); x++) nd.set(v + x, (nd.get(v + x) ?? 0) + p / Number(f));
      d = nd;
    }
  }
  const fisso = /d\d+([+-]\d+)$/.exec(s);
  return new Map([...d].map(([v, p]) => [v + (fisso ? Number(fisso[1]) : 0), p]));
}
/**
 * Danno medio dopo l'Armatura, colpo per colpo: media di max(0, danno − AR) sui risultati dei dadi (Giocatore
 * §5.13: mai sotto 0). Con `parato` il danno è dimezzato per eccesso prima dell'Armatura (Parata, §5.9).
 */
export function dannoDopoAR(formula, ar, parato = false) {
  let e = 0;
  for (const [v, p] of distribuzione(formula)) e += p * Math.max(0, (parato ? Math.ceil(v / 2) : v) - ar);
  return e;
}
/**
 * Probabilità di colpire: d20 ≤ VA; l'1 riesce e il 20 fallisce sempre. Gli attacchi si tirano anche con VA 20 o
 * più (A.78, regole.json → prova.tiro_sempre), quindi il massimo è 19/20.
 */
export const probabilita = (va) => Math.min(19, Math.max(1, Math.floor(va))) / 20;
/**
 * Danno atteso per Round di `k` attacchi (VA, formula) contro un bersaglio con AR `ar` che para il primo colpo
 * del Round con probabilità `q` (una sola AzP per la Parata): k · p · E − P(almeno un colpo) · q · (E − E½).
 */
export function dannoPerRound(k, va, formula, ar, q = 0) {
  const p = probabilita(va);
  const pieno = dannoDopoAR(formula, ar);
  const mezzo = dannoDopoAR(formula, ar, true);
  return k * p * pieno - (1 - (1 - p) ** k) * q * (pieno - mezzo);
}

/**
 * Le due misure di un nemico `n` contro i PG `pg` (archetipi del livello di riferimento, mescolati in parti uguali).
 * @param opzioni { nPg, para: il PG bersaglio para (gioca bene), bossPara: il nemico para il primo colpo del Round }
 */
export function misureScontro(n, pg, { nPg = N_PG, para = true, bossPara = false } = {}) {
  const azioniPg = pg.reduce((s, a) => s + a.azioni, 0) / pg.length;
  // AzP d'attacco del gruppo: il PG bersaglio tiene un'AzP per la Parata
  const attacchi = nPg * azioniPg - (para ? 1 : 0);
  const colpo = pg.map((a) => ({ p: probabilita(a.va + (n.vaContro ?? 0)), pieno: dannoDopoAR(a.danno, n.ar), mezzo: dannoDopoAR(a.danno, n.ar, true) }));
  const perAttacco = colpo.reduce((s, x) => s + x.p * x.pieno, 0) / colpo.length;
  const nessunColpo = colpo.reduce((s, x) => s * (1 - x.p) ** (attacchi / colpo.length), 1);
  const risparmio = colpo.reduce((s, x) => s + (x.pieno - x.mezzo), 0) / colpo.length;
  const gruppo = attacchi * perAttacco - (1 - nessunColpo) * (bossPara ? probabilita(n.difese) : 0) * risparmio;
  const abbatte = (q) => pg.reduce((s, a) => s + a.pv / dannoPerRound(n.azioni, n.va, n.danno, a.ar, q ? probabilita(a.difese) : 0), 0) / pg.length;
  return { resistenza: n.pv / gruppo, gruppo, abbatte: abbatte(para), abbatteSenzaParata: abbatte(false) };
}

/**
 * Boss del grado (§2.5): stessi valori e attacchi, para il primo colpo di ogni Round (un'AzP in più) e ha i PV per
 * resistere ROUND_BOSS Round contro 7 PG, arrotondati a 5.
 */
export function boss(grado, pg) {
  const perPv = misureScontro({ ...grado, pv: 1 }, pg, { bossPara: true }).resistenza;
  const pv = Math.round(ROUND_BOSS / perPv / 5) * 5;
  const b = { ...grado, pv, azioni: grado.azioni, bossPara: true };
  const m = misureScontro(b, pg, { bossPara: true });
  return { ...b, ...m, pgGiuBene: m.resistenza / m.abbatte, pgGiuMale: m.resistenza / m.abbatteSenzaParata };
}

/** Forza nella legge del quadrato: PV × danno per Round contro l'avversario, senza Difese (costano Azioni a entrambi). */
const forzaNemico = (n, pg) => n.pv * pg.reduce((s, a) => s + dannoPerRound(n.azioni, n.va, n.danno, a.ar), 0) / pg.length;
const forzaPg = (pg, n) => pg.reduce((s, a) => s + a.pv * a.azioni * probabilita(a.va + (n.vaContro ?? 0)) * dannoDopoAR(a.danno, n.ar), 0) / pg.length;
/** Quanti nemici `n` per uno scontro con il rapporto di forza `r` contro 7 PG: N · √F(nemico) = √r · 7 · √F(PG). */
export const quanti = (n, pg, r) => (Math.sqrt(r) * N_PG * Math.sqrt(forzaPg(pg, n))) / Math.sqrt(forzaNemico(n, pg));
/** Peso di una base rispetto al suo grado: √F(base) / √F(grado), contro i PG del livello di riferimento. */
export const pesoBase = (b, g, pg) => Math.sqrt(forzaNemico(b, pg) / forzaPg(pg, b)) / Math.sqrt(forzaNemico(g, pg) / forzaPg(pg, g));

/**
 * Bestiario umano scalato (§3.2): PV del convertitore × moltiplicatore (a quarti), AzP del grado, arma propria con
 * il bonus di grado al danno. Il moltiplicatore porta i Round di resistenza a quelli del grado, il bonus i Round per
 * abbattere un PG; misure medie con le armi e le protezioni dei quattro archetipi.
 */
export function umaniScalati(grado, pg) {
  const conBonus = (f, bonus) => `${f}+${bonus}`.replace(/([+-]\d+)\+(\d+)$/, (_, x, y) => `+${Number(x) + Number(y)}`);
  const medie = (molt, bonus) => {
    const prove = pg.map((a) => misureScontro({ pv: Math.round(a.pv * molt), va: a.va, difese: a.difese, ar: a.ar, azioni: grado.azioni, danno: conBonus(a.danno, bonus) }, pg));
    return { resistenza: prove.reduce((t, x) => t + x.resistenza, 0) / prove.length, abbatte: prove.reduce((t, x) => t + x.abbatte, 0) / prove.length };
  };
  const g = misureScontro(grado, pg);
  let molt = 1;
  for (let m = 1; m <= 10; m += 0.25) if (Math.abs(medie(m, 0).resistenza - g.resistenza) < Math.abs(medie(molt, 0).resistenza - g.resistenza)) molt = m;
  let bonus = 0;
  for (let x = 0; x <= 8; x++) if (Math.abs(medie(molt, x).abbatte - g.abbatte) < Math.abs(medie(molt, bonus).abbatte - g.abbatte)) bonus = x;
  return { molt, bonus, ...medie(molt, bonus) };
}

/**
 * Creature pronte (cap. 5, data/bestiario.json → creature): le due misure per ogni colonna della scheda, contro i PG
 * del livello del grado della colonna. L'intervallo va dal minimo del grado della colonna (i valori sono quelli del
 * grado) al massimo del grado effettivo (§2.4: i moduli valgono gradi in più nel bilancio); oltre il Molto potente
 * ogni grado effettivo in più vale una creatura in più (intervallo moltiplicato). Il Boss ha l'intervallo del Boss.
 * «centro»: dentro l'intervallo del grado della colonna.
 */
// fuori dall'intervallo per scelta dichiarata nel testo della creatura: si stampano, non fanno fallire lo script
export const ECCEZIONI = { 'eretico-corrotto': 'più fragile del grado, combatte da Incursore (§5.5.1)' };
export function creaturePronte(dati, pgDi, umani = {}) {
  const B = dati.bestiario;
  const nomi = GRADI.map((g) => g.nome);
  const alto = (v) => (v > nomi.length - 1 ? OBIETTIVI['Molto potente'][1] * (1 + v - (nomi.length - 1)) : OBIETTIVI[nomi[Math.ceil(v)]][1]);
  return B.creature.flatMap((c) => [...c.gradi.map((g) => ({ g, boss: false })), ...(c.boss ? [{ g: c.boss.grado, boss: true }] : [])].map(({ g, boss }) => {
    const r = profiloNemico(scelteCreatura(c.id, g, { boss }, dati), dati, { umani });
    const n = r.nemico;
    const grado = GRADI.find((x) => x.nome === B.gradi.find((y) => y.id === g).nome);
    // l'attacco migliore della scheda (per l'Eretico il pugnale, non la pistola)
    const a = n.attacchi.filter((x) => x.danno).reduce((m, x) => (probabilita(x.va) * dannoDopoAR(x.danno, 0) > probabilita(m.va) * dannoDopoAR(m.danno, 0) ? x : m));
    // A.96–A.97 (E&L del 05/10/2026): il Boss è un'etichetta (PV e Azioni del profilo) e i moduli non hanno costo:
    // l'intervallo è quello del grado, la misura una stima sperimentale
    const m = misureScontro({ pv: n.pv, va: a.va, difese: n.difese, ar: n.ar.totale, danno: a.danno, azioni: n.azioni.principali }, pgDi[grado.livello]);
    const intervallo = [OBIETTIVI[grado.nome][0], alto(B.gradi.findIndex((y) => y.id === g))];
    const centro = OBIETTIVI[grado.nome];
    return { id: c.id, nome: c.nome, colonna: boss ? `Boss ${grado.nome}` : grado.nome, effettivo: grado.nome, resistenza: m.resistenza, abbatte: m.abbatte, intervallo,
      fuori: m.resistenza < intervallo[0] || m.resistenza > intervallo[1], eccezione: ECCEZIONI[c.id] ?? null, centro: m.resistenza >= centro[0] && m.resistenza <= centro[1] };
  }));
}

const uno = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1)).replace('.', ',');
const due = (x) => x.toFixed(2).replace('.', ',');

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { dati, errori } = await datiReali();
  if (errori.length) throw new Error(`dati non validi: ${errori.length} errori`);
  const righe = taratura(dati);
  const confronto = confrontoConBranch(righe);
  const pgDi = Object.fromEntries(righe.map((r) => [r.livello, r.archetipi]));
  const scala = GRADI.map((g) => ({ ...g, ...misureScontro(g, pgDi[g.livello]), boss: boss(g, pgDi[g.livello]) }));
  const umani = Object.fromEntries(readdirSync(new URL('../esempi/nemici/umani/', import.meta.url)).filter((x) => x.endsWith('.json')).map((x) => [x.replace(/.json$/, ''), JSON.parse(readFileSync(new URL(`../esempi/nemici/umani/${x}`, import.meta.url), 'utf8'))]));
  const creature = creaturePronte(dati, pgDi, umani);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ righe, confronto, scala, creature }, null, 2));
  } else {
    console.log('A.2 — Media dei quattro archetipi:');
    console.log('| Livello | PV | VA | Difese | AR | Danno medio | Iniziativa | Salvezze | AzP |');
    console.log('| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
    for (const r of righe) {
      const m = r.media;
      console.log(`| ${r.livello} | ${uno(m.pv)} | ${uno(m.va)} | ${uno(m.difese)} | ${uno(m.ar)} | ${uno(m.dannoMedio)} | ${uno(m.iniziativa)} | ${uno(m.salvezze)} | ${uno(m.azioni)} |`);
    }
    console.log('');
    for (const r of righe) {
      console.log(`${r.livello}° livello: ${r.archetipi.map((a) => `${a.tipo} PV ${a.pv} · ${a.arma} VA ${a.va} ${a.danno} · Difese ${a.difese} · AR ${a.ar}${a.problemi.length ? ` · PROBLEMI: ${a.problemi.join('; ')}` : ''}`).join(' | ')}`);
    }
    console.log('');
    console.log(`Scala contro ${N_PG} PG del livello di riferimento (§2.1, Appendice A.3):`);
    console.log('| Grado | Livello | PV | VA | Difese | AR | Danno | Danno medio | AzP | Round di resistenza | Obiettivo | Round per abbattere un PG | senza Parata |');
    console.log('| :---- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
    for (const s of scala) {
      const o = OBIETTIVI[s.nome];
      console.log(`| ${s.nome} | ${s.livello}° | ${s.pv} | ${s.va} | ${s.difese} | ${s.ar} | ${s.danno} | ${uno(dannoDopoAR(s.danno, 0))} | ${s.azioni} | ${uno(Math.round(s.resistenza * 10) / 10)} | ${o.join('–')}${s.resistenza < o[0] || s.resistenza > o[1] ? ' FUORI' : ''} | ${uno(Math.round(s.abbatte * 10) / 10)} | ${uno(Math.round(s.abbatteSenzaParata * 10) / 10)} |`);
    }
    console.log('');
    console.log(`Boss del grado (PV per ${ROUND_BOSS} Round, Parata del primo colpo del Round):`);
    console.log('| Grado | PV | ×PV del grado | Round di resistenza | Round per abbattere un PG | senza Parata | PG a terra in Round di resistenza (Parata) | (senza Parata) |');
    console.log('| :---- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');
    for (const s of scala) {
      const b = s.boss;
      console.log(`| ${s.nome} | ${b.pv} | ${due(b.pv / s.pv)} | ${uno(Math.round(b.resistenza * 10) / 10)} | ${uno(Math.round(b.abbatte * 10) / 10)} | ${uno(Math.round(b.abbatteSenzaParata * 10) / 10)} | ${uno(Math.round(b.pgGiuBene * 10) / 10)} | ${uno(Math.round(b.pgGiuMale * 10) / 10)} |`);
    }
    console.log('');
    console.log(`Equilibrato contro ${N_PG} PG del livello di riferimento: creature del grado per facile / normale / duro (§2.3):`);
    console.log('| Grado | Facile | Normale | Duro |');
    console.log('| :---- | :---: | :---: | :---: |');
    for (const s of scala) console.log(`| ${s.nome} | ${Object.values(DIFFICOLTA).map((r) => uno(Math.round(quanti(s, pgDi[s.livello], r) * 10) / 10)).join(' | ')} |`);
    console.log('');
    console.log(`Creature per uno scontro normale contro ${N_PG} PG di ogni livello di riferimento (gruppi misti, §2.3):`);
    console.log(`| Livello dei PG | ${GRADI.map((g) => g.nome).join(' | ')} |`);
    console.log(`| :---: | ${GRADI.map(() => ':---:').join(' | ')} |`);
    for (const g of GRADI) console.log(`| ${g.livello} | ${GRADI.map((x) => uno(Math.round(quanti(x, pgDi[g.livello], DIFFICOLTA.normale) * 10) / 10)).join(' | ')} |`);
    console.log('');
    console.log('Basi (§3): PV, AR, Difese, danno per grado; peso rispetto al grado (1 = uguale); Round di resistenza e per abbattere un PG:');
    for (const [n, gradi] of Object.entries(BASI)) {
      console.log(`| ${n} | ${gradi.map((b, i) => `PV ${b.pv} AR ${b.ar} Dif ${b.difese} ${b.danno} · peso ${due(pesoBase(b, GRADI[i], pgDi[GRADI[i].livello]))} · res ${uno(Math.round(misureScontro(b, pgDi[GRADI[i].livello]).resistenza * 10) / 10)} · abb ${uno(Math.round(misureScontro(b, pgDi[GRADI[i].livello]).abbatte * 10) / 10)}`).join(' | ')} |`);
    }
    console.log('');
    console.log('Bestiario umano scalato (§3.2): moltiplicatore dei PV e bonus di grado al danno, con le AzP del grado:');
    for (const g of GRADI) {
      const u = umaniScalati(g, pgDi[g.livello]);
      console.log(`| ${g.nome} | PV ×${String(u.molt).replace('.', ',')} | danno +${u.bonus} | AzP ${g.azioni} | res ${uno(Math.round(u.resistenza * 10) / 10)} | abb ${uno(Math.round(u.abbatte * 10) / 10)} |`);
    }
    console.log('');
    console.log(`Creature pronte (cap. 5): Round di resistenza contro ${N_PG} PG del livello della colonna, intervallo dal grado della colonna al grado effettivo:`);
    console.log('| Creatura | Colonna | Grado effettivo | Round di resistenza | Intervallo | Round per abbattere un PG |');
    console.log('| :---- | :---- | :---- | :---: | :---: | :---: |');
    for (const c of creature) console.log(`| ${c.nome} | ${c.colonna} | ${c.effettivo} | ${uno(Math.round(c.resistenza * 10) / 10)}${c.fuori ? (c.eccezione ? ` (fuori: ${c.eccezione})` : ' FUORI') : c.centro ? '' : ' *'} | ${c.intervallo.map((x) => uno(x)).join('–')} | ${uno(Math.round(c.abbatte * 10) / 10)} |`);
    console.log('');
    console.log(confronto === null ? 'Confronto con il branch: origin/tavolo-direttore non raggiungibile.'
      : `Confronto con il bestiario umano del branch: ${confronto.filter((c) => c.uguale).length} su ${confronto.length} uguali${confronto.some((c) => !c.uguale) ? ` (diversi: ${confronto.filter((c) => !c.uguale).map((c) => c.file).join(', ')})` : ''}.`);
  }
  const fuori = scala.filter((s) => s.resistenza < OBIETTIVI[s.nome][0] || s.resistenza > OBIETTIVI[s.nome][1]).length
    + scala.filter((s) => s.boss.resistenza < OBIETTIVI.Boss[0] || s.boss.resistenza > OBIETTIVI.Boss[1]).length;
  const fuoriCreature = creature.filter((c) => c.fuori && !c.eccezione).length;
  const ko = fuoriCreature + righe.flatMap((r) => r.archetipi).filter((a) => a.problemi.length).length + (confronto?.filter((c) => !c.uguale).length ?? 0) + fuori;
  process.exitCode = ko ? 1 : 0;
}

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
//   node tools/taratura_bestiario.mjs        → tabelle per livello e per archetipo, in Markdown
//   node tools/taratura_bestiario.mjs --json → gli stessi numeri in JSON
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const u = (p) => new URL(`../${p}`, import.meta.url).href;
const { datiReali } = await import(u('tests/helpers.js'));
const { nuoveScelte, normalizza } = await import(u('src/character.js'));
const { checklist } = await import(u('src/checklist.js'));
const { statoIncantesimi, motivoBloccoIncantesimo } = await import(u('src/incantesimi.js'));
const { dotazioneVuota, opzioniEffettive, sottoScelteRichieste, vociDotazione, applicaDotazione, mancanzeDotazione } = await import(u('src/dotazioni.js'));
const { validaLivello, applicaLivello, calcolaSchedaPersonaggio, puntiDaCompletare } = await import(u('src/avanzamento.js'));
const { massimiSessione, inizializzaSessione } = await import(u('src/sessione.js'));
const { calcolaScheda } = await import(u('src/calc.js'));
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

const uno = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1)).replace('.', ',');

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { dati, errori } = await datiReali();
  if (errori.length) throw new Error(`dati non validi: ${errori.length} errori`);
  const righe = taratura(dati);
  const confronto = confrontoConBranch(righe);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ righe, confronto }, null, 2));
  } else {
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
    console.log(confronto === null ? 'Confronto con il branch: origin/tavolo-direttore non raggiungibile.'
      : `Confronto con il bestiario umano del branch: ${confronto.filter((c) => c.uguale).length} su ${confronto.length} uguali${confronto.some((c) => !c.uguale) ? ` (diversi: ${confronto.filter((c) => !c.uguale).map((c) => c.file).join(', ')})` : ''}.`);
  }
  const ko = righe.flatMap((r) => r.archetipi).filter((a) => a.problemi.length).length + (confronto?.filter((c) => !c.uguale).length ?? 0);
  process.exitCode = ko ? 1 : 0;
}

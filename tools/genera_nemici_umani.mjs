// Bestiario umano proposto per il Tavolo del Master (esempi/nemici/umani/): ogni nemico è un PG costruito con
// le regole di creazione e avanzamento (Giocatore 0.45) dal motore dell'app, come i PG d'esempio
// (tools/genera_esempi.mjs → costruisci), e poi passato al convertitore «PG → nemico» (src/nemico-da-pg.js).
// Tre gradi per tipo: Recluta (2° livello), Veterano (5°), Élite (8°). Proposte da validare con Davide.
//
// Le scelte che il manuale non vincola sono le più ovvie per il ruolo (elenco in docs/tavolo-direttore.md,
// «Bestiario proposto»): Caratteristiche e Abilità in ordine di preferenza (un punto alla volta, solo dove il
// motore lo accetta), Talenti da una lista di preferenza con ripiego sul primo Talento valido, dado dei PV
// dei Gradi al valore medio arrotondato per eccesso (d8 → 5), equipaggiamento iniziale del §2.16 con le
// opzioni del ruolo (dal Veterano le opzioni migliori dove ci sono).
//   node tools/genera_nemici_umani.mjs            → controlla e scrive
//   node tools/genera_nemici_umani.mjs --controlla → solo i controlli (lo usa tests/nemici-umani.test.js)
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const u = (p) => new URL(`../${p}`, import.meta.url).href;
const { datiReali } = await import(u('tests/helpers.js'));
const { costruisci } = await import(u('tools/genera_esempi.mjs'));
const { validaLivello, applicaLivello } = await import(u('src/avanzamento.js'));
const { nemicoDaPg } = await import(u('src/nemico-da-pg.js'));
const { validaNemico, formattaErrore } = await import(u('src/validate.js'));
const { idDaNome } = await import(u('src/nemici.js'));

const RADICE = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const CARTELLA = `${RADICE}/esempi/nemici/umani`;
const NOTA = 'Proposta, da validare con Davide (bestiario umano del Tavolo del Master, per-davide A.79).';

export const GRADI = [
  { nome: 'Recluta', livello: 2 },
  { nome: 'Veterano', livello: 5 },
  { nome: 'Élite', livello: 8 },
];

// Abilità di combattimento comuni, in ordine di preferenza per ruolo
const FUCILIERE = ['Armi medie', 'Difese', 'Atletica', 'Percezione', 'Armi leggere', 'Corpo a corpo', 'Sopravvivenza', 'Medicina', 'Armi da mischia', 'Furtività'];
const SPADACCINO = ['Armi da guerra', 'Armi da mischia', 'Difese', 'Atletica', 'Corpo a corpo', 'Percezione', 'Armi leggere', 'Sopravvivenza', 'Medicina', 'Furtività'];
const PISTOLERO = ['Armi leggere', 'Furtività', 'Percezione', 'Difese', 'Armi da mischia', 'Atletica', 'Raggirare', 'Tecnologia', 'Corpo a corpo', 'Cultura'];

/**
 * I tipi. `dotazione`: opzioni dell'equipaggiamento iniziale per gruppo (indice), per grado (0 Recluta, 1
 * Veterano, 2 Élite: vale l'ultima indicata). `talenti`: Talenti liberi preferiti (3°, 5°, 7° livello);
 * `talentiClasse`: Talenti a scelta di Classe preferiti (Grado II al 4° livello).
 */
export const TIPI = [
  {
    tipo: 'Fante Capitol', arma: 'fucile corporativo',
    base: { corporazione: 'Capitol', addestramento: 'Combattente', classe: 'Soldato', concetto: 'Fante delle Freedom Brigades' },
    caratteristiche: ['DES', 'COS', 'FOR', 'SAG'], liberi: FUCILIERE,
    dotazione: [{ 'Arma principale': 0, Protezione: 0 }, { 'Arma principale': 1, Protezione: 1 }],
    impugna: 'arma_distanza',
    talenti: ['mira-rapida', 'raffica-breve-migliorata', 'copertura-migliorata', 'duro-a-morire'], talentiClasse: ['Supporto d’Attacco'],
  },
  {
    tipo: 'Soldato Bauhaus', arma: 'fucile corporativo',
    base: { corporazione: 'Bauhaus', addestramento: 'Combattente', classe: 'Soldato', concetto: 'Soldato della milizia ducale' },
    caratteristiche: ['DES', 'COS', 'FOR', 'SAG'], liberi: FUCILIERE,
    dotazione: [{ 'Arma principale': 0, Protezione: 0 }, { 'Arma principale': 1, Protezione: 1 }],
    impugna: 'arma_distanza',
    talenti: ['copertura-migliorata', 'mira-rapida', 'buona-costituzione', 'raffica-breve-migliorata'], talentiClasse: ['Supporto di Difesa'],
  },
  {
    tipo: 'Guerriero Mishima', arma: 'spada e scudo',
    base: { corporazione: 'Mishima', addestramento: 'Combattente', classe: 'Assaltatore', concetto: 'Guerriero ashigaru' },
    caratteristiche: ['FOR', 'DES', 'COS', 'SAG'], liberi: SPADACCINO,
    dotazione: [{ 'Arma da mischia': 0, Scudo: 0, Protezione: 0 }, { 'Arma da mischia': 1, Scudo: 1, Protezione: 1 }],
    impugna: 'arma_ravvicinata',
    talenti: ['affondo-migliorato', 'parata-migliorata', 'iniziativa-migliorata', 'duro-a-morire'], talentiClasse: ['Carica Brutale'],
  },
  {
    tipo: 'Agente Cybertronic', arma: 'pistola corporativa',
    base: { corporazione: 'Cybertronic', addestramento: 'Avventuriero', classe: 'Agente', concetto: 'Agente operativo' },
    caratteristiche: ['DES', 'INT', 'SAG', 'CAR'], liberi: PISTOLERO,
    dotazione: [{ 'Arma da fuoco': 0 }],
    impugna: 'arma_distanza',
    talenti: ['pistolero', 'estrazione-rapida', 'schivata-migliorata', 'tiro-ravvicinato-migliorato'], talentiClasse: ['Mira Selettiva'],
  },
  {
    tipo: 'Soldato Imperiale', arma: 'fucile corporativo',
    base: { corporazione: 'Imperiali', addestramento: 'Combattente', classe: 'Soldato', concetto: 'Soldato dei clan' },
    caratteristiche: ['DES', 'COS', 'FOR', 'SAG'], liberi: FUCILIERE,
    dotazione: [{ 'Arma principale': 0, Protezione: 0 }, { 'Arma principale': 1, Protezione: 1 }],
    impugna: 'arma_distanza',
    talenti: ['mira-rapida', 'sempre-allerta', 'raffica-breve-migliorata', 'duro-a-morire'], talentiClasse: ['Supporto d’Attacco'],
  },
  {
    tipo: 'Inquisitore della Fratellanza', arma: 'spada e Arte',
    base: { corporazione: 'Fratellanza', addestramento: 'Taumaturgo', classe: 'Custode', concetto: 'Inquisitore della Fratellanza' },
    caratteristiche: ['SAG', 'COS', 'FOR', 'CAR', 'DES'],
    liberi: ['Potere', 'Armi da mischia', 'Difese', 'Occultismo', 'Artefatti', 'Corpo a corpo', 'Percezione', 'Atletica', 'Rituali', 'Armi leggere'],
    dotazione: [{}],
    impugna: 'arma_ravvicinata',
    talenti: ['resistenza-alla-corruzione', 'lancio-in-combattimento', 'resistenza-alla-paura', 'parata-migliorata'], talentiClasse: ['Fenditura Mistica'],
  },
  {
    tipo: 'Guardia di sicurezza', arma: 'carabina',
    base: { corporazione: 'Freelance', addestramento: 'Combattente', classe: 'Soldato', concetto: 'Guardia di sicurezza privata' },
    caratteristiche: ['DES', 'COS', 'SAG', 'FOR'], liberi: FUCILIERE,
    dotazione: [{ 'Arma principale': 0, Protezione: 0 }, { 'Arma principale': 0, Protezione: 1 }],
    impugna: 'arma_distanza',
    talenti: ['sempre-allerta', 'copertura-migliorata', 'visione-perfetta', 'duro-a-morire'], talentiClasse: ['Supporto di Difesa'],
  },
  {
    tipo: 'Criminale di strada', arma: 'pistola e pugnale',
    base: { corporazione: 'Freelance', addestramento: 'Avventuriero', classe: 'Lestofante', concetto: 'Criminale di strada' },
    caratteristiche: ['DES', 'CAR', 'INT', 'COS'], liberi: PISTOLERO,
    dotazione: [{ 'Arma da mischia': 0 }],
    impugna: 'arma_distanza',
    talenti: ['estrazione-rapida', 'pistolero', 'ritirata-migliorata', 'schivata-migliorata'], talentiClasse: ['Fuga tra la Folla'],
  },
  {
    tipo: 'Mercenario', arma: 'fucile d’assalto',
    base: { corporazione: 'Freelance', addestramento: 'Combattente', classe: 'Artigliere', concetto: 'Mercenario a contratto' },
    caratteristiche: ['DES', 'COS', 'INT', 'FOR'], liberi: FUCILIERE,
    dotazione: [{ 'Arma principale': 0, Mirino: 0 }],
    impugna: 'arma_distanza',
    talenti: ['raffica-breve-migliorata', 'mira-rapida', 'ricarica-rapida', 'duro-a-morire'], talentiClasse: ['Raffica Estesa'],
  },
  {
    tipo: 'Eretico', arma: 'pistola silenziata e pugnale',
    base: { corporazione: 'Freelance', addestramento: 'Combattente', classe: 'Incursore', concetto: 'Eretico infiltrato al servizio dell’Oscura Legione' },
    caratteristiche: ['DES', 'FOR', 'CAR', 'COS'], liberi: ['Armi leggere', 'Armi da mischia', 'Furtività', 'Difese', 'Raggirare', 'Atletica', 'Percezione', 'Occultismo', 'Corpo a corpo', 'Cultura'],
    dotazione: [{}],
    impugna: 'arma_distanza',
    talenti: ['imboscata-migliorata', 'resistenza-alla-corruzione', 'affondo-migliorato', 'schivata-migliorata'], talentiClasse: ['Attacco Silenzioso'],
    // solo la parte umana: nessun potere Oscuro inventato
    note: 'Solo la parte umana. TODO(Davide): eventuali Doni dell’Oscura Simmetria o poteri dell’Oscura Legione, da aggiungere quando ci sono le regole.',
  },
];

const tiro = (valore) => ({ valore, origine: 'manuale' });
const senzaErrori = (personaggio, l, dati) => !validaLivello(personaggio, l, dati).length;
const punti = (livello, dati) => Number(/^punti_abilita:(\d+)$/.exec(dati.regole.avanzamento.eventi.find((e) => e.livello === livello)?.eventi.find((x) => x.startsWith('punti_abilita:')) ?? '')?.[1] ?? 0);
const eventi = (livello, dati) => dati.regole.avanzamento.eventi.find((e) => e.livello === livello)?.eventi ?? [];

/**
 * Se il livello fa crescere le quote degli incantesimi (Taumaturghi, Magia sez. 1), i nuovi si scelgono uno
 * alla volta in ordine di livello e di nome, come per i PG d'esempio, finché il motore non ne chiede più.
 */
function conIncantesimi(personaggio, l, dati) {
  const manca = (x) => validaLivello(personaggio, x, dati).some((e) => e.campo === 'incantesimi' && e.tipo === 'incompleto');
  if (!manca(l)) return l;
  const cat = [...dati.incantesimi.incantesimi].sort((a, b) => a.livello_base - b.livello_base || a.nome.localeCompare(b.nome));
  let out = { ...l, incantesimi: [] };
  for (const inc of cat) {
    if (!manca(out)) break;
    const prova = { ...out, incantesimi: [...out.incantesimi, inc.nome] };
    if (!validaLivello(personaggio, prova, dati).some((e) => e.campo === 'incantesimi' && e.tipo === 'violazione')) out = prova;
  }
  return out;
}

/** Le scelte di un livello, la prima valida per il motore (validaLivello senza errori). */
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
    // i punti Abilità uno alla volta, solo dove il motore li accetta
    const pa = {};
    for (let n = 0; n < punti(livello, dati); n++) {
      const k = t.liberi.find((x) => (pa[x] ?? 0) < 3 && !validaLivello(personaggio, { ...base, puntiAbilita: { ...pa, [x]: (pa[x] ?? 0) + 1 } }, dati)
        .some((e) => e.tipo === 'violazione' && (e.campo.includes(x) || e.problema.includes(x))));
      if (!k) break;
      pa[k] = (pa[k] ?? 0) + 1;
    }
    const conPunti = { ...base, puntiAbilita: pa };
    const nomi = [...(t.talentiClasse ?? []), ...def.talenti_a_scelta.map((x) => x.nome)];
    for (const n of nomi) tentativi.push({ ...conPunti, talentoClasse: n });
    tentativi.push(conPunti);
  }
  for (const l0 of tentativi) {
    const l = conIncantesimi(personaggio, l0, dati);
    if (senzaErrori(personaggio, l, dati)) return l;
  }
  return null;
}

/** Il PG del tipo al grado: specifica per costruisci, con i livelli scelti uno alla volta. */
export function pgDelTipo(t0, grado, dati) {
  const g = GRADI.indexOf(grado);
  // dopo le Abilità preferite, tutte le altre nell'ordine del manuale: i punti liberi si assegnano tutti
  const t = { ...t0, liberi: [...t0.liberi, ...dati.abilita.abilita.map((a) => a.nome).filter((n) => !t0.liberi.includes(n))] };
  const spec = {
    base: { nome: `${t.tipo} ${grado.nome}`, ...t.base },
    caratteristiche: t.caratteristiche,
    liberi: t.liberi,
    dotazione: t.dotazione[Math.min(g, t.dotazione.length - 1)],
    impugna: t.impugna,
    livelli: [],
  };
  const problemi = [];
  let personaggio = costruisci(spec, dati).personaggio;
  for (let livello = 2; livello <= grado.livello; livello++) {
    const l = sceltaLivello(t, personaggio, livello, dati);
    if (!l) { problemi.push(`${livello}° livello: nessuna scelta valida`); break; }
    spec.livelli.push(l);
    personaggio = applicaLivello(personaggio, l);
  }
  const r = costruisci(spec, dati);
  return { ...r, spec, problemi: [...problemi, ...r.problemi] };
}

/** Il nemico del tipo al grado: { nemico, problemi }. */
export function nemicoDelTipo(t, grado, dati) {
  const pg = pgDelTipo(t, grado, dati);
  const nome = `${t.tipo} — ${grado.nome}`;
  const r = nemicoDaPg(pg.testo, dati, { nome, id: idDaNome(nome), nota: [NOTA, t.note].filter(Boolean).join(' ') });
  if (r.errore) return { nemico: null, problemi: [...pg.problemi, r.errore] };
  const problemi = [...pg.problemi, ...r.avvisi, ...validaNemico(r.nemico, dati, `${r.nemico.id}.json`).map(formattaErrore)];
  if (!r.nemico.attacchi.length) problemi.push('nessun attacco');
  return { nemico: r.nemico, pg, problemi };
}

/** Tutti i nemici: [{ tipo, grado, nemico, problemi }]. */
export function nemiciUmani(dati) {
  return TIPI.flatMap((t) => GRADI.map((g) => ({ tipo: t, grado: g, ...nemicoDelTipo(t, g, dati) })));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { dati, errori } = await datiReali();
  if (errori.length) throw new Error(`dati non validi: ${errori.length} errori`);
  const solo = process.argv.includes('--controlla');
  const tutti = nemiciUmani(dati);
  let ko = 0;
  if (!solo) {
    mkdirSync(CARTELLA, { recursive: true });
    for (const f of readdirSync(CARTELLA).filter((x) => x.endsWith('.json'))) unlinkSync(`${CARTELLA}/${f}`);
  }
  for (const x of tutti) {
    const n = x.nemico;
    const prim = n?.attacchi[0];
    console.log(`${n?.id ?? x.tipo.tipo}: PV ${n?.pv} · AR ${n?.ar.totale} · Difese ${n?.difese} · ${prim ? `${prim.nome} VA ${prim.va} ${prim.danno}` : '—'}${x.problemi.length ? ` · ${x.problemi.length} problemi` : ''}`);
    for (const p of x.problemi) console.log(`  - ${p}`);
    ko += x.problemi.length;
    if (!solo && n) writeFileSync(`${CARTELLA}/${n.id}.json`, `${JSON.stringify(n, null, 2)}\n`);
  }
  process.exitCode = ko ? 1 : 0;
}

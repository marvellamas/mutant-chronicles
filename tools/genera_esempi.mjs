// Personaggi d'esempio del Tavolo del Master (esempi/): quattro PG inventati, completi e coerenti con le
// regole attuali, costruiti con il motore dell'app come farebbe il wizard (creazione, equipaggiamento
// iniziale del §2.16, livelli del cap. 8). Il generatore controlla che ognuno passi il validatore, che la
// checklist del §2.17 sia tutta a posto e che ogni livello sia valido; poi scrive esempi/<file>.json.
//   node tools/genera_esempi.mjs            → controlla e scrive
//   node tools/genera_esempi.mjs --controlla → solo i controlli (lo usa tests/esempi.test.js)
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const u = (p) => new URL(`../${p}`, import.meta.url).href;
const { datiReali } = await import(u('tests/helpers.js'));
const { versioniPersonaggio } = await import(u('src/rules.js'));
const { nuoveScelte, normalizza, serializza, nomeFileEsportazione } = await import(u('src/character.js'));
const { checklist } = await import(u('src/checklist.js'));
const { statoIncantesimi, motivoBloccoIncantesimo } = await import(u('src/incantesimi.js'));
const { avvisiForza, dotazioneVuota, opzioniEffettive, sottoScelteRichieste, vociDotazione, applicaDotazione, mancanzeDotazione } = await import(u('src/dotazioni.js'));
const { validaLivello, applicaLivello, calcolaSchedaPersonaggio, puntiDaCompletare } = await import(u('src/avanzamento.js'));
const { massimiSessione, inizializzaSessione } = await import(u('src/sessione.js'));
const { calcolaScheda } = await import(u('src/calc.js'));
const { catalogo, risolvi, statoIniziale } = await import(u('src/equipaggiamento.js'));

const RADICE = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const DATA = new Date(2026, 9, 2);
const tiro = (valore) => ({ valore, origine: 'manuale' });
const voce = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });

/**
 * Le specifiche: creazione (con le scelte dell'equipaggiamento iniziale: indice dell'opzione per gruppo),
 * oggetti in più (trovati o dati dal Direttore), livelli dal 2° in poi.
 */
export const ESEMPI = [
  {
    // combattente a distanza
    base: {
      nome: 'Rhea Valdis', concetto: 'Tiratrice scelta della Capitol', soprannome: 'Occhio Freddo', eta: '29',
      corporazione: 'Capitol', addestramento: 'Combattente', classe: 'Artigliere',
    },
    caratteristiche: ['INT', 'DES', 'COS', 'SAG'],
    liberi: ['Armi medie', 'Armi pesanti', 'Armi leggere', 'Percezione', 'Difese', 'Furtività', 'Atletica', 'Tecnologia'],
    dotazione: { 'Arma principale': 1, Mirino: 1 },
    impugna: 'arma_distanza',
    livelli: [
      { livello: 2, caratteristiche: { INT: 1, DES: 1 } },
      { livello: 3, talentoLibero: { id: 'mira-rapida' } },
      { livello: 4, grado: { classe: 'Artigliere' }, tiroPV: tiro(5), talentoClasse: 'Occhio del Tiratore', puntiAbilita: ['Armi medie', 'Armi pesanti', 'Armi leggere', 'Percezione', 'Difese', 'Furtività', 'Atletica', 'Tecnologia', 'Medicina'] },
      { livello: 5, talentoLibero: { id: 'tiro-mirato-migliorato' } },
    ],
  },
  {
    // combattente corpo a corpo
    base: {
      nome: 'Torvald Krane', concetto: 'Assaltatore della Bauhaus', soprannome: 'Il Muro', eta: '34',
      corporazione: 'Bauhaus', addestramento: 'Combattente', classe: 'Assaltatore',
    },
    caratteristiche: ['FOR', 'COS', 'DES', 'SAG'],
    liberi: ['Armi da guerra', 'Armi da mischia', 'Difese', 'Atletica', 'Corpo a corpo', 'Percezione', 'Sopravvivenza', 'Armi leggere'],
    dotazione: { 'Arma da mischia': 1, Scudo: 1, Protezione: 1 },
    impugna: 'arma_ravvicinata',
    livelli: [
      { livello: 2, caratteristiche: { FOR: 1, COS: 1 } },
      { livello: 3, talentoLibero: { id: 'parata-migliorata' } },
      { livello: 4, grado: { classe: 'Assaltatore' }, tiroPV: tiro(6), talentoClasse: 'Scudo Aggressivo', puntiAbilita: ['Armi da guerra', 'Armi da mischia', 'Difese', 'Atletica', 'Corpo a corpo', 'Percezione', 'Sopravvivenza', 'Armi leggere', 'Medicina'] },
      { livello: 5, talentoLibero: { id: 'duro-a-morire' } },
      { livello: 6, caratteristiche: { FOR: 1, DES: 1 } },
    ],
  },
  {
    // Taumaturgo con batterie e un Artefatto
    base: {
      nome: 'Fratello Anselmo Viri', concetto: 'Custode della Fratellanza', soprannome: 'Lanterna', eta: '41',
      corporazione: 'Fratellanza', addestramento: 'Taumaturgo', classe: 'Custode',
    },
    caratteristiche: ['SAG', 'COS', 'FOR', 'CAR', 'DES'],
    liberi: ['Potere', 'Armi da mischia', 'Difese', 'Artefatti', 'Occultismo', 'Corpo a corpo', 'Percezione', 'Atletica', 'Rituali'],
    dotazione: { 'Riserva mistica': 2 },
    impugna: 'armi_corporative:bordone-templare',
    oggetti: [
      // dati dal Direttore: il Bordone Templare con la sua riserva integrata e una batteria Verde da 10 PM
      voce('es-bordone', 'armi_corporative:bordone-templare', null, { sintonizzato: true }),
      voce('es-batteria-10', 'artefatti:batteria-da-10-pm-chroma-verde', 'trasportato', { sintonizzato: true }),
    ],
    livelli: [
      { livello: 2, caratteristiche: { SAG: 1, COS: 1 } },
      { livello: 3, talentoLibero: { id: 'resistenza-alla-corruzione' } },
    ],
  },
  {
    // con impianti cibernetici
    base: {
      nome: 'Nadia Ferro', concetto: 'Tecnica di campo della Cybertronic', soprannome: 'Spina', eta: '27',
      corporazione: 'Cybertronic', addestramento: 'Lavoratore', classe: 'Tecnico',
    },
    caratteristiche: ['INT', 'DES', 'SAG', 'COS'],
    liberi: ['Tecnologia', 'Scienza', 'Pilotare', 'Percezione', 'Furtività', 'Atletica', 'Cultura', 'Raggirare', 'Armi leggere'],
    dotazione: {},
    impugna: 'arma_distanza',
    oggetti: [
      voce('es-sin', 'impianti:interfaccia-neurale-cybertronic', 'installato'),
      voce('es-vis', 'impianti:potenziamento-visivo', 'installato'),
      voce('es-pro', 'impianti:processore-neurale-di-abilita', 'installato'),
      voce('es-chip', 'impianti:chip-competenza-avanzata-tecnologia', 'in_uso'),
    ],
    livelli: [
      { livello: 2, caratteristiche: { INT: 1, DES: 1 } },
      { livello: 3, talentoLibero: { id: 'hacker' } },
      { livello: 4, grado: { classe: 'Tecnico' }, tiroPV: tiro(4), talentoClasse: 'Intrusione Rapida', puntiAbilita: ['Tecnologia', 'Scienza', 'Pilotare', 'Percezione', 'Furtività', 'Atletica', 'Cultura', 'Raggirare', 'Armi leggere', 'Difese'] },
    ],
  },
];

/** Punti distribuiti uno alla volta: per ogni punto la prima chiave dell'ordine che `ammesso` accetta. */
function assegna(punti, ordine, totale, ammesso, massimo = 3) {
  const out = { ...punti };
  for (let n = 0; n < totale; n++) {
    // al massimo `massimo` punti per voce, così le schede restano varie
    const k = ordine.find((x) => (out[x] ?? 0) < massimo && ammesso({ ...out, [x]: (out[x] ?? 0) + 1 }, x));
    if (!k) break;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
const puntiLivello = (livello, dati) => Number(/^punti_abilita:(\d+)$/.exec(dati.regole.avanzamento.eventi.find((e) => e.livello === livello)?.eventi.find((x) => x.startsWith('punti_abilita:')) ?? '')?.[1] ?? 0);

/**
 * Stati pronti per il tavolo: impugnata la prima arma del tipo indicato, armatura indossata, scudo
 * imbracciato; le altre voci con lo stato iniziale dell'app (src/equipaggiamento.js → statoIniziale).
 */
function inUso(voci, impugna, dati) {
  const cat = catalogo(dati);
  // una voce indicata per riferimento ha la precedenza sul tipo
  let impugnata = false;
  const perRif = voci.some((v) => v.rif === impugna);
  // con un'arma a due mani impugnata lo scudo resta pronto (mani impegnate, Armamenti §7.1.6)
  const dueMani = voci.some((v) => (perRif ? v.rif === impugna : false) && risolvi(v, cat).def?.mani === 2);
  return voci.map((v, i) => {
    const r = risolvi(v, cat);
    if (!impugnata && (perRif ? v.rif === impugna : r.tipo === impugna)) { impugnata = true; return { ...v, stato: 'impugnata' }; }
    if (r.tipo === 'armatura') return { ...v, stato: 'indossata' };
    if (r.tipo === 'scudo') return { ...v, stato: dueMani ? 'pronta' : 'imbracciato' };
    return v.stato ? v : { ...v, stato: statoIniziale(r.tipo, voci.slice(0, i), dati) };
  });
}

/** Costruisce un PG dalla specifica; restituisce { personaggio, file, testo, problemi }. */
export function costruisci(spec, dati) {
  const problemi = [];
  const base = { ...nuoveScelte(), ...spec.base, puntiEroe: tiro(5) };
  // §2.1 e §2.13: punti uno alla volta nell'ordine di preferenza, tenendo solo quelli che il motore accetta
  base.puntiCaratteristica = assegna({}, spec.caratteristiche, dati.regole.creazione.punti_caratteristica,
    (pc, k) => !calcolaScheda({ ...base, puntiCaratteristica: pc }, dati).errori.some((e) => e.tipo === 'violazione' && e.campo.startsWith(`puntiCaratteristica`)));
  base.puntiAbilitaLiberi = assegna({}, spec.liberi, dati.regole.creazione.punti_abilita_liberi,
    (pa, k) => !calcolaScheda({ ...base, puntiAbilitaLiberi: pa }, dati).errori.some((e) => e.tipo === 'violazione' && e.campo === `puntiAbilitaLiberi.${k}`));
  let scelte = normalizza(base, dati).scelte;
  // §2.16: equipaggiamento iniziale, un'opzione per gruppo (la prima, salvo diversa indicazione)
  const dot = dotazioneVuota();
  for (const { gruppo } of opzioniEffettive(dot, scelte.classe, dati)) {
    const i = spec.dotazione?.[gruppo.etichetta] ?? 0;
    dot.opzioni[gruppo.id] = gruppo.opzioni[Math.min(i, gruppo.opzioni.length - 1)].id;
  }
  for (const s of sottoScelteRichieste(dot, scelte.classe, dati)) dot.sotto[s.oggetto] = s.opzioni?.[0] ?? s.esempio ?? 'scelta del giocatore';
  dot.crediti = tiro(7);
  problemi.push(...mancanzeDotazione(dot, scelte.classe, scelte.corporazione, dati).map((m) => `dotazione: ${m}`));
  scelte.dotazione = dot;
  scelte.equipaggiamento = inUso([...applicaDotazione([], vociDotazione(dot, scelte.classe, scelte.corporazione, dati)), ...(spec.oggetti ?? [])], spec.impugna, dati);
  // Taumaturgo: incantesimi conosciuti fino a riempire le quote (Magia sez. 1)
  if (statoIncantesimi(scelte, dati)) {
    const cat = [...dati.incantesimi.incantesimi].sort((a, b) => a.livello_base - b.livello_base || a.nome.localeCompare(b.nome));
    for (const inc of cat) {
      const stato = statoIncantesimi(scelte, dati);
      if (stato.completo) break;
      if (!motivoBloccoIncantesimo(inc, stato, scelte)) scelte = { ...scelte, incantesimi: [...(scelte.incantesimi ?? []), inc.nome] };
    }
  }
  const norm = normalizza(scelte, dati);
  scelte = norm.scelte;
  problemi.push(...norm.avvisi.map((a) => `normalizza: ${a}`));
  for (const c of checklist(scelte, dati)) if (!c.ok && !c.nonApplicabile) problemi.push(`checklist: ${c.testo}`);
  // livelli del cap. 8, uno alla volta, ognuno valido
  let personaggio = { creazione: scelte, livelli: [] };
  for (const l0 of spec.livelli ?? []) {
    // §8.3: i punti del livello, uno alla volta, solo dove aumentano il VA personale
    const l = Array.isArray(l0.puntiAbilita) ? { ...l0, puntiAbilita: assegna({}, l0.puntiAbilita, puntiLivello(l0.livello, dati),
      (pa, k) => !validaLivello(personaggio, { ...l0, puntiAbilita: pa }, dati).some((e) => e.tipo === 'violazione' && (e.campo.includes(k) || e.problema.includes(k)))) } : l0;
    const errori = validaLivello(personaggio, l, dati).filter((e) => e.tipo === 'violazione');
    for (const e of errori) problemi.push(`livello ${l.livello}: ${e.campo} — ${e.problema}`);
    if (errori.length) break;
    personaggio = applicaLivello(personaggio, l);
  }
  const daCompletare = puntiDaCompletare(personaggio, dati);
  if (daCompletare?.length) problemi.push(`punti da completare: ${JSON.stringify(daCompletare)}`);
  const scheda = calcolaSchedaPersonaggio(personaggio, dati);
  for (const e of scheda.errori ?? []) problemi.push(`scheda: ${e.campo} — ${e.problema}`);
  // nessun avviso dell'equipaggiamento (mani, sintonizzazioni, accessori) né di FOR richiesta (§2.16)
  for (const x of scheda.equipaggiamento?.avvisi ?? []) problemi.push(`equipaggiamento: ${x}`);
  if (scheda.caratteristiche) for (const x of avvisiForza(scelte.equipaggiamento, scheda.caratteristiche.FOR.valore, dati)) problemi.push(`FOR: ${x}`);
  const sessione = scheda.caratteristiche ? inizializzaSessione(massimiSessione(scheda, scelte, dati)) : null;
  const versioniDati = versioniPersonaggio(dati);
  const livello = 1 + personaggio.livelli.length;
  return { personaggio, scheda, file: nomeFileEsportazione(scelte.nome, livello, DATA), testo: serializza(scelte, { versioniDati, livelli: personaggio.livelli, sessione }), problemi };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { dati, errori } = await datiReali();
  if (errori.length) throw new Error(`dati non validi: ${errori.length} errori`);
  const solo = process.argv.includes('--controlla');
  let ko = 0;
  if (!solo) mkdirSync(`${RADICE}/esempi`, { recursive: true });
  for (const spec of ESEMPI) {
    const r = costruisci(spec, dati);
    console.log(`${r.file}: ${r.problemi.length ? `${r.problemi.length} problemi` : 'ok'}`);
    for (const p of r.problemi) console.log(`  - ${p}`);
    ko += r.problemi.length;
    if (!solo) writeFileSync(`${RADICE}/esempi/${r.file}`, r.testo);
  }
  process.exitCode = ko ? 1 : 0;
}

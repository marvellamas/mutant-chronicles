// PG d'esempio con le Tecniche Interiori (esempi/): Mishima, Lottatore, Scuola della Terra. Costruito con il
// motore dell'app come farebbe il wizard (creazione, equipaggiamento iniziale del §2.16, livelli del cap. 8),
// con le stesse regole di tools/genera_esempi.mjs del branch tavolo-direttore (la specifica ha la stessa
// forma di ESEMPI e lì si può aggiungere così com'è). Il generatore controlla validatore, checklist del §2.17
// e ogni livello; poi scrive esempi/<file>.json.
//   node tools/genera_esempio_tecniche.mjs            → controlla e scrive
//   node tools/genera_esempio_tecniche.mjs --controlla → solo i controlli (lo usa tests/esempio-tecniche.test.js)
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const u = (p) => new URL(`../${p}`, import.meta.url).href;
const { datiReali } = await import(u('tests/helpers.js'));
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
 * Risorse Interiori come scelta di Classe del Lottatore al Grado II (4° livello, §3.5.5), con
 * l'iniziazione alla Scuola della Terra (§8.9.3); al 5° livello Tecniche Interiori Supplementari (+3,
 * §8.6.10). Tecniche dei tre gruppi: generiche, della Scuola, esclusive del Lottatore (§8.9.2–8.9.4).
 */
export const ESEMPIO_TECNICHE = {
  base: {
    nome: 'Aiko Tenzan', concetto: 'Lottatrice della Scuola della Terra', soprannome: 'Pugno di Montagna', eta: '26',
    corporazione: 'Mishima', addestramento: 'Combattente', classe: 'Lottatore',
    parametriTalenti: { 'Addestramento al Combattimento Senz’Armi': 'controllo' },
  },
  caratteristiche: ['SAG', 'DES', 'FOR', 'COS'],
  liberi: ['Corpo a corpo', 'Difese', 'Atletica', 'Percezione', 'Furtività', 'Medicina', 'Sopravvivenza', 'Armi da mischia', 'Cultura', 'Occultismo', 'Oratoria', 'Scienza'],
  dotazione: {},
  impugna: 'arma_ravvicinata',
  livelli: [
    { livello: 2, caratteristiche: { SAG: 1, DES: 1 } },
    { livello: 3, talentoLibero: { id: 'arti-marziali' } },
    {
      livello: 4, grado: { classe: 'Lottatore' }, tiroPV: tiro(5), talentoClasse: 'Risorse Interiori',
      scuolaMishima: 'Terra',
      tecniche: ['meditazione-profonda', 'aura-di-resistenza', 'pugno-di-pietra', 'radici-della-montagna', 'presa-dell-anima'],
      puntiAbilita: ['Corpo a corpo', 'Difese', 'Atletica', 'Percezione', 'Furtività', 'Medicina', 'Sopravvivenza', 'Armi da mischia', 'Cultura', 'Occultismo', 'Oratoria', 'Scienza', 'Tecnologia', 'Intrattenere'],
    },
    { livello: 5, talentoLibero: { id: 'tecniche-interiori-supplementari' }, tecniche: ['vista-felina', 'salto-della-rana', 'contraccolpo-interiore'] },
  ],
};
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
  const versioniDati = Object.fromEntries(Object.entries(dati).map(([k, v]) => [k, v.versione_manuale]));
  const livello = 1 + personaggio.livelli.length;
  return { personaggio, scheda, file: nomeFileEsportazione(scelte.nome, livello, DATA), testo: serializza(scelte, { versioniDati, livelli: personaggio.livelli, sessione }), problemi };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { dati, errori } = await datiReali();
  if (errori.length) throw new Error(`dati non validi: ${errori.length} errori`);
  const r = costruisci(ESEMPIO_TECNICHE, dati);
  console.log(`${r.file}: ${r.problemi.length ? `${r.problemi.length} problemi` : 'ok'}`);
  for (const p of r.problemi) console.log(`  - ${p}`);
  if (!process.argv.includes('--controlla')) {
    mkdirSync(`${RADICE}/esempi`, { recursive: true });
    writeFileSync(`${RADICE}/esempi/${r.file}`, r.testo);
  }
  process.exitCode = r.problemi.length ? 1 : 0;
}

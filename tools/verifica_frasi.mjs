// Verifica che le frasi del manuale copiate nei dati esistano davvero nel testo dei Google Doc
// (docs/manuali-txt/*.md): effetti degli oggetti («condizione») e regole dell'attacco a distanza
// (regole.json → attacco_distanza, «frasi»).
// Uso:  node tools/verifica_frasi.mjs     → elenca le frasi non trovate ed esce con codice 1
// Lo usa anche tests/effetti-oggetti.test.js.
import { readFileSync } from 'node:fs';
import { voci, percorsoManuale, testoEdizione } from './manuali.mjs';
import { quadroEdizioni } from './edizioni-dati.mjs';
import { fileURLToPath } from 'node:url';

const RADICE = new URL('../', import.meta.url);

/**
 * Testo confrontabile: senza escape e grassetti del Markdown esportato, spazi compattati.
 *
 * Lotto 188: i manuali arrivano in due forme — certi Doc sono esportati in Markdown (le tabelle con le barre
 * verticali), altri in testo semplice (le celle su righe separate). Le frasi dei dati copiate da una tabella
 * portano le barre. Senza toglierle, una frase giusta risulta «non trovata» soltanto perché la copia salvata di
 * quel manuale è in un'altra forma: non è il manuale a essere cambiato, è l'esportazione. Qui le barre e i
 * trattini di contorno delle tabelle spariscono da tutt'e due le parti, così il confronto è sul testo.
 */
export const normalizza = (t) => String(t)
  .replace(/\\/g, '')
  .replace(/\*\*/g, '')
  .replace(/^[ \t]*\|?[ \t:-]*\|[ \t:-]*$/gm, ' ') // righe di contorno delle tabelle Markdown
  .replace(/\|/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Testo del file dei Talenti nuovi (v1.0 del 07/10/2026, docs/talenti-nuovi-v1.0.txt, estratto dal PDF di
 * docs/Talenti-nuovi/): sui Talenti vale sul Manuale del Giocatore (docs/manuali-drive.md, «Regola di precedenza»),
 * quindi le frasi dei Talenti che vengono da lì si cercano lì, non nei manuali.
 */
export function testoTalentiNuovi() {
  return normalizza(readFileSync(new URL('docs/talenti-nuovi-v1.0.txt', RADICE), 'utf8'));
}

/**
 * Testo dei manuali **correnti**, normalizzato.
 *
 * Lotto 188: prima si leggeva tutta la cartella `docs/manuali-txt/`, versioni vecchie comprese. Così una frase dei
 * dati risultava «trovata nel manuale» anche quando il manuale non la diceva più: bastava che la dicesse
 * un'edizione di quattro versioni fa rimasta sul disco. È lo stesso difetto che ha fatto descrivere un Lorath con
 * il Getto acido. Adesso si leggono solo le versioni correnti, quelle del registro (tools/manuali.json).
 */
export function testoManuali() {
  // Lotto 189: **soltanto** le versioni correnti del registro. Il lotto 188 leggeva anche le edizioni superate
  // rimaste in cartella, perché i dati dichiaravano ancora Giocatore 0.45 e 0.46, Magia 1.3…: era una rete che
  // teneva in piedi il controllo e insieme ne nascondeva il senso. Adesso i dati citano l'edizione corrente, e una
  // frase che il manuale di oggi non dice più salta fuori. Le poche voci che citano apposta un'edizione vecchia —
  // i Talenti superati dalla 0.54, che i personaggi conservano — lo dichiarano nel dato con `fonte_edizione`, e
  // `frasiMancanti` va a cercarle là: dichiarato, non in silenzio.
  return voci().map((v) => normalizza(readFileSync(percorsoManuale(v.id), 'utf8'))).join('\n');
}

/**
 * Le edizioni che i dati **dichiarano** di citare mentre aspettano il lotto che li rigenera: `[{ id, versione }]`,
 * ricavate da `tools/manuali.json` → `edizioni_in_attesa` (lotto 191).
 *
 * Perché non è il difetto del 188 che torna. Allora si leggeva *tutta* la cartella `docs/manuali-txt/`: una frase
 * risultava trovata perché la diceva un'edizione di quattro versioni fa rimasta lì per caso, e nessuno lo sapeva.
 * Qui l'elenco non viene dalla cartella ma dalle eccezioni dichiarate, ognuna con il suo motivo e il suo lotto, e
 * `tests/edizioni-dati-189.test.js` pretende quel motivo. Quando il lotto B rigenera i dati e l'eccezione sparisce,
 * l'edizione sparisce da qui da sé: la rete si scioglie senza che nessuno debba ricordarsene.
 */
export function edizioniDichiarate() {
  const fuori = [];
  for (const r of quadroEdizioni()) {
    for (const m of r.manuali) {
      if (!m.eccezione || m.allineata) continue;
      for (const v of m.citate) if (v !== m.corrente) fuori.push({ id: m.id, versione: v, file: r.file });
    }
  }
  return fuori;
}

/**
 * Frasi degli effetti: catalogo (data/equipaggiamento/) e oggetti di dotazione (data/dotazioni.json).
 * @returns {{dove: string, frase: string}[]}
 */
export function frasiEffetti() {
  const leggi = (p) => JSON.parse(readFileSync(new URL(p, RADICE), 'utf8'));
  const out = [];
  const indice = leggi('data/equipaggiamento/index.json');
  for (const { id, file } of indice.file) {
    for (const o of leggi(`data/equipaggiamento/${file}`).oggetti ?? []) {
      (o.effetti ?? []).forEach((e, i) => { if (e.condizione) out.push({ dove: `${id}:${o.id} effetti[${i}]`, frase: e.condizione }); });
      // impianti attivabili (docs/censimento-impianti.md): frasi dell'Azione, delle cartucce e del Processore
      (o.attivabile?.frasi ?? []).forEach((f, i) => out.push({ dove: `${id}:${o.id} attivabile.frasi[${i}]`, frase: f }));
    }
  }
  for (const [id, o] of Object.entries(leggi('data/dotazioni.json').oggetti_dotazione)) {
    (o.effetti ?? []).forEach((e, i) => { if (e.condizione) out.push({ dove: `dotazioni:${id} effetti[${i}]`, frase: e.condizione }); });
  }
  // Talenti Liberi e di Classe: effetti.valori (docs/censimento-talenti.md)
  for (const t of leggi('data/talenti_liberi.json').talenti) {
    // Talenti v1.0 (25/10/2026): le voci scritte dal file dei Talenti nuovi si confrontano con quel file
    const fonte = t.fonte_regole === 'talenti_nuovi' ? 'talenti_nuovi' : 'manuali';
    // Lotto 189: una voce **superata** cita apposta l'edizione in cui esisteva (`fonte_edizione`). Hacker e Sport
    // sono stati riorganizzati dalla 0.54 — Hacker è diventato una Maestria senza limite d'uso, Sport una
    // Specializzazione — e nei dati restano, con il loro `sostituito_da`, perché i personaggi che le possiedono le
    // tengono. Il loro testo è quello della 0.50 e deve restarlo: segnalarlo come «sparito dal manuale» sarebbe un
    // falso allarme, cancellarlo sarebbe perdere quello che il personaggio ha in mano.
    (t.effetti?.valori ?? []).forEach((e, i) => { for (const k of ['condizione', 'nota']) if (e[k]) out.push({ dove: `talenti_liberi:${t.id} effetti.valori[${i}].${k}`, frase: e[k], fonte, edizione: t.fonte_edizione ?? null }); });
  }
  for (const c of leggi('data/classi.json').classi) {
    for (const t of [...c.talenti_fissi, ...c.talenti_a_scelta]) {
      (t.effetti?.valori ?? []).forEach((e, i) => { for (const k of ['condizione', 'nota']) if (e[k]) out.push({ dove: `classi:${c.nome}/${t.nome} effetti.valori[${i}].${k}`, frase: e[k] }); });
    }
  }
  // Tecniche Interiori: effetti delle schede (tools/effetti_tecniche.mjs), frasi copiate dal §8.9
  for (const t of leggi('data/tecniche_interiori.json').tecniche) {
    const E = t.effetti ?? {};
    (E.valori ?? []).forEach((e, i) => { if (e.condizione) out.push({ dove: `tecniche:${t.id} effetti.valori[${i}]`, frase: e.condizione }); });
    for (const k of ['promemoria', 'frasi']) (E[k] ?? []).forEach((f, i) => out.push({ dove: `tecniche:${t.id} effetti.${k}[${i}]`, frase: f }));
    const A = E.attacco ?? {};
    (A.frasi ?? []).forEach((f, i) => out.push({ dove: `tecniche:${t.id} effetti.attacco.frasi[${i}]`, frase: f }));
    (A.dopo_armatura ?? []).forEach((x, i) => out.push({ dove: `tecniche:${t.id} effetti.attacco.dopo_armatura[${i}]`, frase: x.testo }));
    (A.onda?.frasi ?? []).forEach((f, i) => out.push({ dove: `tecniche:${t.id} effetti.attacco.onda.frasi[${i}]`, frase: f }));
    for (const k of ['manovre_forza', 'carica']) if (A[k]?.frase) out.push({ dove: `tecniche:${t.id} effetti.attacco.${k}`, frase: A[k].frase });
  }
  // regole.json → attacco_distanza: ogni «frasi» del blocco, a ogni profondità
  const visita = (v, dove) => {
    if (Array.isArray(v)) v.forEach((x, i) => visita(x, `${dove}[${i}]`));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'frasi' && Array.isArray(x)) x.forEach((f, i) => out.push({ dove: `${dove}.frasi[${i}]`, frase: f }));
        else visita(x, `${dove}.${k}`);
      }
    }
  };
  visita(leggi('data/regole.json').attacco_distanza ?? {}, 'regole:attacco_distanza');
  // Magia §26.2: riserve Batteria/Cariche e alimentazione Esclusiva/Universale (frasi e testi delle tabelle)
  const RIS = leggi('data/regole.json').chroma?.riserve ?? {};
  visita(RIS, 'regole:chroma.riserve');
  // Magia §26.3–26.5: Batterie Matrice, Cristalli Matrice, Schegge instabili
  for (const k of ['matrice', 'cristalli_matrice', 'schegge']) visita(leggi('data/regole.json').chroma?.[k] ?? {}, `regole:chroma.${k}`);
  for (const g of ['tipi', 'alimentazioni']) for (const [k, x] of Object.entries(RIS[g] ?? {})) if (x.testo) out.push({ dove: `regole:chroma.riserve.${g}.${k}`, frase: x.testo });
  // Giocatore §2.13, §8.3 (03/10/2026 sera, A.90): i 7 Punti Abilità Liberi per Grado
  visita(leggi('data/regole.json').creazione ?? {}, 'regole:creazione');
  visita(leggi('data/regole.json').lancio ?? {}, 'regole:lancio');
  visita(leggi('data/regole.json').rituali ?? {}, 'regole:rituali');
  visita(leggi('data/regole.json').danno_applicato ?? {}, 'regole:danno_applicato');
  visita(leggi('data/regole.json').prova ?? {}, 'regole:prova');
  visita(leggi('data/regole.json').attacco_ravvicinato ?? {}, 'regole:attacco_ravvicinato');
  visita(leggi('data/regole.json').elmetti ?? {}, 'regole:elmetti');
  visita(leggi('data/regole.json').dotazioni_iniziali ?? {}, 'regole:dotazioni_iniziali');
  visita(leggi('data/regole.json').nec ?? {}, 'regole:nec');
  // durate in Round (Tecniche, Stati, Incantesimi) e Round collegato allo scontro (src/round-scontro.js)
  visita(leggi('data/regole.json').durate_round ?? {}, 'regole:durate_round');
  (leggi('data/regole.json').ar?.frasi_incantesimi ?? []).forEach((f, i) => out.push({ dove: `regole:ar.frasi_incantesimi[${i}]`, frase: f }));
  // Armamenti §7.10: SnT 0 per gli Artefatti con sole proprietà passive (docs/diff-manuali-2026-10-02.md)
  visita(leggi('data/equipaggiamento/artefatti.json').sintonizzazione ?? {}, 'artefatti:sintonizzazione');
  // veicoli.json: ogni «frasi» del file, a ogni profondità, più i testi degli esempi del manuale
  visita(leggi('data/veicoli.json'), 'veicoli');
  for (const v of leggi('data/veicoli.json').profili ?? []) {
    for (const r of v.rinforzi ?? []) if (r.esempio?.testo) out.push({ dove: `veicoli:${v.id} rinforzi ${r.id} esempio`, frase: r.esempio.testo });
  }
  // regole.json → stati: la «condizione» degli effetti e il testo dei limiti (docs/ricognizione-stati.md)
  for (const s of leggi('data/regole.json').stati?.elenco ?? []) {
    (s.effetti ?? []).forEach((e, i) => out.push({ dove: `regole:stati ${s.nome} effetti[${i}]`, frase: e.condizione }));
    if (s.limiti?.testo) out.push({ dove: `regole:stati ${s.nome} limiti`, frase: s.limiti.testo });
  }
  // incantesimi.json → meccanica: la riga «Lancio:», la Salvezza, il paragrafo «Anticipazione:» e le frasi delle correzioni
  for (const i of leggi('data/incantesimi.json').incantesimi) {
    const m = i.meccanica ?? {};
    const dove = `incantesimi:${i.scheda} ${i.nome}`;
    if (i.lancio) out.push({ dove: `${dove} lancio`, frase: i.lancio });
    if (m.salvezza?.testo) out.push({ dove: `${dove} salvezza`, frase: m.salvezza.testo });
    if (m.anticipazione?.frase) out.push({ dove: `${dove} anticipazione`, frase: m.anticipazione.frase });
    // conseguenze legate a un aspetto (tools/scale_anticipazione.mjs): frasi del paragrafo, una per una
    (m.anticipazione?.aspetti ?? []).forEach((x, k) => (x.conseguenze ?? []).forEach((f, j) => out.push({ dove: `${dove} anticipazione.aspetti[${k}].conseguenze[${j}]`, frase: f })));
    (m.frasi ?? []).forEach((f, k) => out.push({ dove: `${dove} frasi[${k}]`, frase: f }));
    // Magia §25.4: attivazione da Artefatto
    (m.procedura_rituale?.artefatto?.frasi ?? []).forEach((f, k) => out.push({ dove: `${dove} procedura_rituale.artefatto.frasi[${k}]`, frase: f }));
  }
  return out;
}

/**
 * Il testo dell'edizione dichiarata da una voce («Giocatore 0.50»), normalizzato e letto una volta sola.
 * Lotto 189: serve alle voci superate, che citano apposta l'edizione in cui esistevano.
 */
const NOMI_MANUALE = { Giocatore: 'giocatore', Magia: 'magia', Armamenti: 'armamenti', Equipaggiamento: 'equipaggiamento', Veicoli: 'veicoli', Mostri: 'mostri', Direttore: 'direttore' };
const NOME_DI = Object.fromEntries(Object.entries(NOMI_MANUALE).map(([n, i]) => [i, n]));
const cacheEdizioni = new Map();
function testoDellEdizione(etichetta) {
  if (cacheEdizioni.has(etichetta)) return cacheEdizioni.get(etichetta);
  const m = /^(\w+)\s+(\d+(?:\.\d+)*)$/.exec(String(etichetta).trim());
  const id = m && NOMI_MANUALE[m[1]];
  let t = null;
  if (id) try { t = normalizza(testoEdizione(id, m[2])); } catch { t = null; }
  cacheEdizioni.set(etichetta, t);
  return t;
}

/**
 * Frasi che non compaiono in nessun manuale, e quelle che compaiono soltanto nell'edizione dichiarata dal dato:
 * `{ mancanti, nellEdizioneDichiarata }`.
 *
 * Lotto 191: fra il recepimento di un manuale (questo lotto) e la rigenerazione dei dati (i lotti B e seguenti) una
 * frase copiata dall'edizione di prima può non stare più nel manuale corrente, perché Davide l'ha riscritta. Non è
 * un errore dei dati: è la distanza, e la distanza è dichiarata in `edizioni_in_attesa`. Si cerca prima nei manuali
 * correnti; una frase che si trova soltanto nell'edizione dichiarata si conta a parte e **si dice**, invece di
 * passare in silenzio (sarebbe il difetto del 188) o di diventare rossa (sarebbe una bugia al contrario).
 */
/**
 * Il testo in cui una frase dei dati può legittimamente stare: i manuali correnti **più** le edizioni dichiarate
 * in `edizioni_in_attesa` (lotto 191). Lo usa chi controlla che una frase scritta in un dato venga da un manuale.
 *
 * Non è tutta la cartella, come leggeva il 188: è la corrente più quelle che un'eccezione dichiara, con il motivo e
 * il lotto che la chiuderà. Appena i dati si rigenerano, l'elenco si svuota da sé.
 */
export function testoManualiDeiDati() {
  const altre = edizioniDichiarate().map((e) => testoDellEdizione(`${NOME_DI[e.id]} ${e.versione}`)).filter(Boolean);
  return [testoManuali(), ...new Set(altre)].join('\n');
}

export function esitoFrasi() {
  const testo = testoManuali();
  const talenti = testoTalentiNuovi();
  const dichiarate = edizioniDichiarate()
    .map((e) => ({ ...e, etichetta: `${NOME_DI[e.id]} ${e.versione}` }))
    .map((e) => ({ ...e, testo: testoDellEdizione(e.etichetta) }))
    .filter((e) => e.testo);
  const mancanti = [];
  const nellEdizioneDichiarata = [];
  for (const x of frasiEffetti()) {
    const frase = normalizza(x.frase);
    if ((x.fonte === 'talenti_nuovi' ? talenti : testo).includes(frase)) continue;
    // una voce superata vale se la frase sta nell'edizione che la voce dichiara (lotto 189)
    const sua = x.edizione ? testoDellEdizione(x.edizione) : null;
    if (sua && sua.includes(frase)) continue;
    const dove = dichiarate.find((e) => e.testo.includes(frase));
    if (dove) nellEdizioneDichiarata.push({ ...x, edizione_trovata: dove.etichetta });
    else mancanti.push(x);
  }
  return { mancanti, nellEdizioneDichiarata };
}

/** Frasi che non compaiono in nessun manuale, né corrente né dichiarato. */
export const frasiMancanti = () => esitoFrasi().mancanti;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tutte = frasiEffetti();
  const { mancanti, nellEdizioneDichiarata } = esitoFrasi();
  for (const m of mancanti) console.log(`NON TROVATA  ${m.dove}\n  «${m.frase}»`);
  for (const m of nellEdizioneDichiarata) console.log(`SOLO NELL’EDIZIONE DICHIARATA (${m.edizione_trovata})  ${m.dove}\n  «${m.frase}»`);
  console.log(`${tutte.length - mancanti.length} frasi su ${tutte.length} trovate nei manuali (quelle dei Talenti v1.0 nel file dei Talenti nuovi).`);
  if (nellEdizioneDichiarata.length) console.log(`Di queste, ${nellEdizioneDichiarata.length} si trovano solo nell’edizione che il dato dichiara: il manuale nuovo le ha riscritte, e i dati si rigenerano nel lotto segnato in edizioni_in_attesa.`);
  process.exitCode = mancanti.length ? 1 : 0;
}

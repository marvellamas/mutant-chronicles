// Lotto 8 del catalogo dell'equipaggiamento: accessori delle armi (Manuale degli Armamenti v0.50,
// §7.3–7.3.4, pp. 19–22).
//   node tools/lotti/lotto8_accessori_armi.mjs            prova a vuoto
//   node tools/lotti/lotto8_accessori_armi.mjs --scrivi   scrive pulito/ e il JSON
//
// Fonti (docs/lotti/lotto8-accessori-armi/): grezzo/ (tools/estrai_manuali.py --tabelle, pp. 19–22)
// e prosa/ (il §7.3 da --prosa).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. grezzo → pulito: come i lotti precedenti (continuazioni unite per indice di colonna). Le due
//    tabelle dei mirini (riduzione e dati economici) si riuniscono per nome, senza maiuscole
//    («Di Precisione» / «Di precisione»).
// 2. Qualità, PS Integrità e PI assenti da una tabella vengono dalla frase comune del paragrafo
//    (FRASI): il generatore controlla che ci sia.
// 3. Versioni rinforzate dei dispositivi di riduzione del rumore (§7.3.1): «stessi modificatori,
//    costo doppio», «i rinforzati hanno PI 4». Il generatore le deriva da questa frase.
// 4. Effetti strutturati: `mirino` (riduzione della penalità di distanza, limite, preparazione),
//    `effetto_arma` (VA e danno sempre applicati all'arma su cui è montato), `bonus_condizionato`
//    (supporti: solo in appoggio); `si_monta_su` dice dove si monta; `gruppo_esclusivo` i gruppi
//    di cui vale un solo accessorio per arma.
// 5. Controllo incrociato: ogni riga di dati compare identica nel testo in prosa (le celle andate a
//    capo si confrontano sulla riga unita).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { bloccaRiscrittura } from './superato.mjs';
bloccaRiscrittura('lotto8_accessori_armi');

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto8-accessori-armi/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const FILE_ID = 'accessori_armi';
const VERSIONE = 'Armamenti 0.50';
const scrivi = process.argv.includes('--scrivi');

function leggiCsv(testo) {
  const righe = [];
  for (const linea of testo.split('\n')) {
    if (!linea || linea.startsWith('#')) continue;
    const celle = [];
    let c = '';
    let virgolette = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (virgolette) {
        if (ch === '"' && linea[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') virgolette = false; else c += ch;
      } else if (ch === '"') virgolette = true;
      else if (ch === ',') { celle.push(c); c = ''; } else c += ch;
    }
    celle.push(c);
    righe.push(celle);
  }
  return righe;
}
let uniteACapo = 0;
function righeDi(testo) {
  const out = [];
  for (const r of leggiCsv(testo)) {
    const celle = r.map((c, i) => [i, c.trim()]).filter(([, c]) => c);
    if (!celle.length) continue;
    const prec = out.at(-1);
    if (prec && celle.length < prec.length && celle.every(([i]) => prec.some(([j]) => j === i))) {
      for (const [i, c] of celle) { const k = prec.find(([j]) => j === i); k[1] = `${k[1]} ${c}`; }
      uniteACapo++;
      continue;
    }
    out.push(celle);
  }
  return out.map((r) => r.map(([, c]) => c));
}
const T = {};
for (const f of readdirSync(new URL('grezzo/', LOTTO)).filter((x) => x.endsWith('.csv'))) T[f.slice(0, -4)] = righeDi(readFileSync(new URL(`grezzo/${f}`, LOTTO), 'utf8'));
const perNome = (id) => { const [int, ...righe] = T[id]; return righe.map((r) => Object.fromEntries(int.map((k, i) => [k, r[i]]))); };

const righeProsa = readFileSync(new URL('prosa/7.3 Mirini e accessori delle armi.txt', LOTTO), 'utf8').split('\n');
const testo = righeProsa.join(' ').replace(/\s+/g, ' ');
const frase = (f) => { if (!testo.includes(f)) throw new Error(`frase non trovata: «${f}»`); return f; };
// paragrafo fra due frasi del testo (inclusa la prima, esclusa la seconda)
const tra = (a, b) => {
  const i = testo.indexOf(a);
  const j = b ? testo.indexOf(b, i + a.length) : testo.length;
  if (i < 0 || j < 0) throw new Error(`paragrafo «${a}» … «${b}» non trovato`);
  return testo.slice(i, j).trim();
};

const idDa = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (s) => Number(String(s).replace(/\./g, '').replace('−', '-').replace(/^\+/, ''));
const oggetti = [];
const base = (nome, famiglia, paragrafo, note, extra) => {
  oggetti.push({ id: idDa(nome), nome, tipo: 'accessorio', catalogo: 'Commerciale', famiglia, nomi_alternativi: [], note_manuale: note, paragrafo, versione_manuale: VERSIONE, ...extra });
};

// --- Mirini (§7.3) ---------------------------------------------------------------------------
{
  frase('Tutti hanno PI 3, Qualità Comune e PS Integrità 10.');
  const riduzione = new Map(perNome('019_1').map((r) => [r.Mirino.toLowerCase(), r]));
  const note = `${tra('I mirini non producono un bonus positivo', 'Qualità Integrità e costi dei mirini')} ${tra('Compatibilità. Sono utilizzabili', '7.3.1 Dispositivi')}`;
  for (const e of perNome('020_1')) {
    const r = riduzione.get(e.Mirino.toLowerCase());
    if (!r) throw new Error(`mirino ${e.Mirino}: riga della riduzione non trovata`);
    const d = r['Distanza e preparazione'];
    const limite = /^Fino a (\d+) Q/.exec(d)?.[1];
    if (!limite && !/^Entro la gittata massima dell’arma/.test(d)) throw new Error(`mirino ${e.Mirino}: distanza non riconosciuta «${d}»`);
    base(`Mirino ${e.Mirino.replace(/^Di /, 'di ')}`, 'Mirini', '§7.3', note, {
      pi: num(e.PI), qualita: e['Qualità'], ps_int: num(e['PS INT']), reperibilita: e.REP, costo: num(e.Costo),
      si_monta_su: ['arma_distanza'], gruppo_esclusivo: 'mirino',
      // §7.3: riduce la sola penalità di distanza, fino a 0, entro il limite indicato
      mirino: { riduzione: num(r.Riduzione), distanza_max_q: limite ? num(limite) : null, azp_minime: /almeno 2 Azioni/.test(d) ? 2 : null, testo: d },
      proprieta: [],
    });
    oggetti.at(-1).nomi_alternativi.push(e.Mirino);
  }
}

// --- Riduzione del rumore (§7.3.1) --------------------------------------------------------------
{
  frase('I dispositivi sono di Qualità Comune, PS Integrità 10 e PI 3; i rinforzati hanno PI 4.');
  frase('Per i mitragliatori occorre la versione rinforzata: stessi modificatori, costo doppio.');
  const note = `${tra('Il dispositivo modifica soltanto la percezione', 'Dispositivo Percezione dello sparo')} ${tra('Compatibilità: Armi Leggere e Medie', '7.3.2 Supporti di tiro')}`;
  for (const r of perNome('020_2')) {
    for (const rinforzato of [false, true]) {
      base(`${r.Dispositivo}${rinforzato ? ' rinforzato' : ''}`, 'Riduzione del rumore', '§7.3.1', note, {
        pi: rinforzato ? 4 : 3, qualita: 'Comune', ps_int: 10, reperibilita: r.REP, costo: num(r.Costo) * (rinforzato ? 2 : 1),
        si_monta_su: ['arma_distanza'], gruppo_esclusivo: 'riduzione_rumore',
        compatibilita: rinforzato ? 'Mitragliatori a proiettile predisposti (versione rinforzata).' : 'Armi Leggere e Medie a proiettile del modello o della famiglia previsti; esclusi lanciagranate, lanciarazzi, lanciafiamme, armi a energia e revolver, salvo eccezione nella scheda.',
        // §7.3.1: modificatori sempre applicati all'arma su cui è montato
        effetto_arma: { va: num(r['VA colpire']), danno: num(r.Danno) },
        percezione: r['Percezione dello sparo'],
        proprieta: [],
      });
    }
  }
}

// --- Supporti di tiro (§7.3.2) ------------------------------------------------------------------
{
  frase('Entrambi hanno Qualità Comune, PS Integrità 10 e PI separati da quelli dell’arma.');
  const comune = tra('Imbracciatura e condizioni comuni', '7.3.3 Illuminazione');
  const CONDIZIONE = { Bipiede: 'finché il personaggio mantiene posizione e appoggio', Treppiede: 'mentre il tiratore utilizza l’arma dalla postazione' };
  for (const r of perNome('021_1')) {
    const nota = r.Supporto === 'Bipiede' ? tra('Il Bipiede rimane fissato', 'Treppiede Preparare') : tra('Preparare la postazione richiede', 'Imbracciatura e condizioni comuni');
    base(r.Supporto, 'Supporti di tiro', '§7.3.2', `${nota} ${comune}`, {
      pi: num(r.PI), qualita: 'Comune', ps_int: 10, reperibilita: r.REP, costo: num(r.Costo),
      si_monta_su: ['arma_distanza'], gruppo_esclusivo: 'supporto', compatibilita: `${r['Compatibilità']}.`,
      bonus_condizionato: { va: num(r['Bonus al tiro'].replace(/\s*VA$/, '')), condizione: frase(CONDIZIONE[r.Supporto]) },
      proprieta: [],
    });
  }
}

// --- Illuminazione e moduli di visione (§7.3.3) e batterie (§7.3.4) --------------------------------
{
  const comune = tra('Montaggio attivazione e cumulo', '7.3.4 Batterie');
  const batteria = tra('Torcia tattica, Modulo di visione notturna e Modulo di visione termica utilizzano', 'Voce Regola');
  const NOTE = {
    'Torcia tattica': tra('Torcia tattica Si monta', 'Modulo di visione notturna Si applica'),
    'Modulo di visione notturna': tra('Modulo di visione notturna Si applica', 'Modulo di visione termica Permette'),
    'Modulo di visione termica': tra('Modulo di visione termica Permette', 'Montaggio attivazione e cumulo'),
  };
  for (const r of perNome('021_2')) {
    const modulo = r.Accessorio.startsWith('Modulo');
    base(r.Accessorio, 'Illuminazione e visione', '§7.3.3', `${NOTE[r.Accessorio]} ${comune} ${batteria}`, {
      pi: num(r.PI), qualita: r['Qualità'], ps_int: num(r['PS INT']), reperibilita: r.REP, costo: num(r.Costo),
      // §7.3.3: i moduli di visione si applicano a un mirino compatibile; «Ogni mirino può montare un solo modulo»
      si_monta_su: modulo ? ['mirino'] : ['arma_distanza'], ...(modulo ? { gruppo_esclusivo: 'modulo_visione' } : {}),
      portata_q: num(r.Portata.replace(/\s*Q$/, '')),
      proprieta: [],
    });
  }
  // «Batteria carica di ricambio | Costo 10; Reperibilità Comune»
  const voce = perNome('022_1').find((r) => r.Voce === 'Batteria carica di ricambio');
  const m = /^Costo (\d+); Reperibilità Comune$/.exec(voce.Regola);
  if (!m) throw new Error(`batteria: riga non riconosciuta «${voce.Regola}»`);
  oggetti.push({
    id: 'batteria-di-servizio', nome: 'Batteria di servizio', tipo: 'altro', catalogo: 'Commerciale', famiglia: 'Illuminazione e visione',
    nomi_alternativi: ['Batteria carica di ricambio'], note_manuale: `${batteria} ${tra('La ricarica ordinaria non ha un costo fisso', null)}`,
    paragrafo: '§7.3.4', versione_manuale: VERSIONE, reperibilita: 'CO', costo: num(m[1]),
    tabelle: [{ titolo: 'Batteria di servizio', colonne: T['022_1'][0], righe: T['022_1'].slice(1) }], proprieta: [],
  });
}

// --- Controllo incrociato con la prosa -----------------------------------------------------------
let righeControllate = 0;
{
  const unito = testo;
  for (const [id, righe] of Object.entries(T)) for (const r of righe.slice(1)) {
    // la prosa spezza le celle andate a capo in mezzo alle righe vicine («Fino a 80 Q; nessuna
    // preparazione / Reflex 2 / aggiuntiva.»): ogni parola della riga deve comparire vicino al nome
    const parole = r.join(' ').split(' ');
    let trovata = unito.includes(r.join(' '));
    for (let i = unito.indexOf(r[0]); !trovata && i >= 0; i = unito.indexOf(r[0], i + 1)) {
      const vicino = unito.slice(Math.max(0, i - 120), i + 200);
      trovata = parole.every((w) => vicino.includes(w));
    }
    if (!trovata) throw new Error(`${id}: riga «${r.join(' | ')}» non ritrovata nel testo`);
    righeControllate++;
  }
}

const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.3 Mirini e accessori delle armi (pp. 19–22); lotto 8',
  _nota: 'Generato da tools/lotti/lotto8_accessori_armi.mjs; da qui in poi si modifica questo file. Un accessorio ha effetto quando è «in uso» e montato (montato_su) su un oggetto attivo del tipo indicato in «si_monta_su»: arma a distanza impugnata, oppure mirino montato su un’arma impugnata. «effetto_arma» si applica sempre al VA per colpire e al danno; «bonus_condizionato» solo nella condizione indicata; «mirino» riduce la sola penalità di distanza. Per ogni «gruppo_esclusivo» vale un solo accessorio per arma.',
  oggetti,
};

if (scrivi) {
  mkdirSync(new URL('pulito/', LOTTO), { recursive: true });
  const COL = ['famiglia', 'nome', 'pi', 'qualita', 'ps_int', 'reperibilita', 'costo'];
  writeFileSync(new URL('pulito/accessori_armi.csv', LOTTO), [COL.join(','), ...oggetti.map((o) => COL.map((c) => String(o[c] ?? '')).join(','))].join('\n') + '\n');
  writeFileSync(new URL(`${FILE_ID}.json`, DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritti pulito/accessori_armi.csv e data/equipaggiamento/${FILE_ID}.json (${oggetti.length} oggetti)`);
} else {
  for (const o of oggetti) console.log(`${o.famiglia} · ${o.nome} · PI ${o.pi} ${o.qualita} ${o.ps_int} ${o.reperibilita} ${o.costo} · ${JSON.stringify(o.mirino ?? o.effetto_arma ?? o.bonus_condizionato ?? o.portata_q ?? '')}`);
  console.log(`oggetti ${oggetti.length}; righe ritrovate nel testo ${righeControllate}; continuazioni unite ${uniteACapo}`);
}

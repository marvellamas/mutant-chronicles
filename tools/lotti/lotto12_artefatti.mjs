// Lotto 12 del catalogo dell'equipaggiamento: artefatti e sintonizzazione (Manuale degli Armamenti
// v0.50, §7.5–7.5.1, pp. 30–31, e §7.10, pp. 58–60).
//   node tools/lotti/lotto12_artefatti.mjs            prova a vuoto
//   node tools/lotti/lotto12_artefatti.mjs --scrivi   scrive il JSON
//
// Fonti (docs/lotti/lotto12-artefatti/): grezzo/ (tools/estrai_manuali.py --tabelle, pp. 30–31 e
// 58–60: si tengono le due tabelle del §7.10; le altre sono dei lotti 3 e del §7.9) e prosa/ (§7.5,
// §7.10 e, per le batterie, Manuale della Magia 22.6).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. Le regole diventano dati: capacità di sintonizzazione per Gradi complessivi (tabella p. 59),
//    +2 di Architetto TecnoMistico, potenza → costo di sintonizzazione e tipologie (p. 60). La
//    tabella della potenza non è riconosciuta da pdfplumber: si legge dal testo in prosa.
// 2. I sei profili con riserva mistica del §7.5.1 sono già nel catalogo (lotti 3 e 4): diventano la
//    tabella `artefatti_catalogo` con tipologia, potenza, sintonizzazione e riserva. Il generatore
//    controlla che l'attivazione e la riserva già estratte coincidano con il §7.5.1.
// 3. Le quattro batterie da 5 PM sono gli esempi del §7.10 («Rosso, Blu o Verde sono Comuni…
//    Bianco è Non Comune»): oggetti «artefatto» con riserva e sintonizzazione, senza prezzo. Il
//    Manuale della Magia (22.6) dice che le batterie permanenti saranno integrate più avanti:
//    prezzo, PI e reperibilità restano TODO(Davide).
// 4. Ogni costo di sintonizzazione deve coincidere con la potenza dichiarata.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto12-artefatti/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const FILE_ID = 'artefatti';
const VERSIONE = 'Armamenti 0.50';
const scrivi = process.argv.includes('--scrivi');

const leggiCsv = (testo) => testo.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => {
  const celle = [];
  let c = '';
  let q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (q) { if (ch === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; } else if (ch === '"') q = true; else if (ch === ',') { celle.push(c); c = ''; } else c += ch;
  }
  celle.push(c);
  return celle.map((x) => x.trim()).filter(Boolean);
}).filter((r) => r.length);
const T = {};
for (const f of readdirSync(new URL('grezzo/', LOTTO)).filter((x) => x.endsWith('.csv'))) T[f.slice(0, -4)] = leggiCsv(readFileSync(new URL(`grezzo/${f}`, LOTTO), 'utf8'));
const prosa = (nome) => readFileSync(new URL(`prosa/${nome}.txt`, LOTTO), 'utf8');
const t710 = prosa('7.10 Artefatti e sintonizzazione');
const t75 = prosa('7.5 Artefatti');
const unito = (t) => t.split('\n').join(' ').replace(/\s+/g, ' ');
const u710 = unito(t710);
const u75 = unito(t75);
const tra = (testo, a, b) => {
  const i = testo.indexOf(a);
  const j = b ? testo.indexOf(b, i + a.length) : testo.length;
  if (i < 0 || j < 0) throw new Error(`paragrafo «${a}» … «${b}» non trovato`);
  return testo.slice(i, j).trim();
};
let controlli = 0;
const verifica = (cond, msg) => { if (!cond) throw new Error(`controllo incrociato: ${msg}`); controlli++; };

// --- regola 1: sintonizzazione ------------------------------------------------------------------
const GRADI = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const [int, ...righe] = T['059_1'];
verifica(int.join('|') === 'Gradi complessivi|Capacità ordinaria|Addestramento Taumaturgo|Con Architetto TecnoMistico', 'intestazione della tabella della capacità');
verifica(righe.map((r) => r[0]).join() === GRADI.join(), 'righe I–VI');
const capacita = righe.map((r) => Number(r[1]));
for (const r of righe) {
  verifica(r[2] === r[1], `Grado ${r[0]}: l’Addestramento Taumaturgo segue la stessa progressione`);
  verifica(Number(r[3]) === Number(r[1]) + 2, `Grado ${r[0]}: Architetto TecnoMistico +2`);
  verifica(u710.includes(r.join(' ')), `Grado ${r[0]}: riga ritrovata nel testo`);
}
const potenze = {};
{
  const righePotenza = t710.split('\n');
  const i = righePotenza.indexOf('Potenza Costo di sintonizzazione');
  for (const r of righePotenza.slice(i + 1, i + 7)) {
    const m = /^(.+) (\d)$/.exec(r);
    if (!m) throw new Error(`riga della potenza non riconosciuta: «${r}»`);
    potenze[m[1]] = Number(m[2]);
  }
  verifica(Object.keys(potenze).join() === 'Comune,Non Comune,Rara,Molto Rara,Epica,Leggendaria', 'sei fasce di potenza');
  verifica(Object.values(potenze).join() === '1,2,3,4,5,6', 'costi 1–6');
}
// tabella delle tipologie: una riga di una sola cella («materiale.») continua la cella precedente
const tipologie = {};
for (const r of T['060_3'].slice(1)) {
  if (r.length === 1) { const k = Object.keys(tipologie).at(-1); tipologie[k] = `${tipologie[k]} ${r[0]}`; } else tipologie[r[0]] = r[1];
}
for (const [k, v] of Object.entries(tipologie)) verifica(u710.includes(`${k} ${v}`) || u710.includes(v.split(' ').slice(0, 4).join(' ')), `tipologia ${k}: ritrovata nel testo`);
verifica(Object.keys(tipologie).join() === 'Armi,Protezioni,Batterie e contenitori,Accessori', 'quattro tipologie');

// --- regola 2: profili con riserva mistica già nel catalogo ---------------------------------------
const catalogo = Object.fromEntries(['armi_corporative', 'scudi'].map((f) => [f, JSON.parse(readFileSync(new URL(`${f}.json`, DEST), 'utf8')).oggetti]));
const trova = (f, nome) => { const o = catalogo[f].find((x) => x.nome === nome); if (!o) throw new Error(`${f}: «${nome}» non trovato`); return o; };
const artefattiCatalogo = [];
{
  const frase = 'Bordone Templare, Spada Vindicator, Spada Deliverer, Lancia Castigator e Lama Demontooth possiedono un Chroma Rosso integrato da 5 PM';
  verifica(u75.includes(frase), 'elenco dei cinque profili nel §7.5.1');
  verifica(u75.includes('La potenza mistica è Non comune e il costo totale di Sintonizzazione è 2, riserva compresa'), 'potenza e costo delle armi');
  for (const nome of ['Bordone Templare', 'Spada Vindicator', 'Spada Deliverer', 'Lancia Castigator', 'Lama Demontooth']) {
    const o = trova('armi_corporative', nome);
    verifica(o.attivazione?.sintonizzazione === potenze['Non Comune'], `${nome}: Sintonizzazione del lotto 4 = ${potenze['Non Comune']}`);
    verifica(o.munizioni?.capacita === 5 && o.munizioni.unita === 'PM', `${nome}: riserva di 5 PM nel lotto 4`);
    artefattiCatalogo.push({ rif: `armi_corporative:${o.id}`, tipologia: 'Armi', potenza: 'Non Comune', sintonizzazione: 2, riserva: { pm: 5, chroma: 'Rosso' } });
  }
  verifica(u75.includes('La potenza è Rara e il costo totale di Sintonizzazione è 3, riserva compresa'), 'potenza e costo dello Scudo delle Guardie Sacre');
  const s = trova('scudi', 'Scudo delle Guardie Sacre');
  verifica(/la potenza è Rara e il costo totale di Sintonizzazione è 3/.test(s.note_manuale), 'Scudo delle Guardie Sacre: nota del lotto 3');
  artefattiCatalogo.push({ rif: `scudi:${s.id}`, tipologia: 'Protezioni', potenza: 'Rara', sintonizzazione: 3, riserva: { pm: 5, chroma: 'Rosso' } });
}

// --- regola 3: batterie da 5 PM --------------------------------------------------------------------
const oggetti = [];
{
  const frase = 'Esempi: le Batterie da 5 PM con Chroma Rosso, Blu o Verde sono Comuni e costano 1 punto di sintonizzazione; quella con Chroma Bianco è Non Comune e costa 2 punti.';
  verifica(u710.includes(frase), 'esempio delle batterie nel §7.10');
  const magia = unito(prosa('Magia 22.6 Batteria Mistica'));
  verifica(/batterie permanenti verranno integrate successivamente/.test(magia), 'Manuale della Magia 22.6: batterie permanenti non ancora descritte');
  const note = `${tra(u75, 'Un contenitore mistico può avere qualsiasi forma', 'Le regole di impiego degli Artefatti')} ${frase}`;
  for (const [chroma, potenza] of [['Rosso', 'Comune'], ['Blu', 'Comune'], ['Verde', 'Comune'], ['Bianco', 'Non Comune']]) {
    oggetti.push({
      id: `batteria-da-5-pm-chroma-${chroma.toLowerCase()}`, nome: `Batteria da 5 PM (Chroma ${chroma})`, tipo: 'artefatto', catalogo: 'Commerciale', famiglia: 'Batterie e contenitori',
      nomi_alternativi: [], note_manuale: note, paragrafo: '§7.10', versione_manuale: VERSIONE,
      costo: null,
      artefatto: { tipologia: 'Batterie e contenitori', potenza, sintonizzazione: potenze[potenza], riserva: { pm: 5, chroma } },
      proprieta: [],
    });
  }
}
for (const a of [...artefattiCatalogo, ...oggetti.map((o) => o.artefatto)]) verifica(a.sintonizzazione === potenze[a.potenza], `sintonizzazione = potenza ${a.potenza}`);

const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.5 Artefatti (pp. 30–31) e §7.10 Artefatti e sintonizzazione (pp. 58–60); lotto 12',
  _nota: 'Generato da tools/lotti/lotto12_artefatti.mjs; da qui in poi si modifica questo file. «sintonizzazione» contiene le regole del §7.10: capacità per Gradi complessivi (indice 0 = Grado I), bonus del Talento, costo per potenza. «artefatti_catalogo» dà tipologia, potenza e riserva agli Artefatti già presenti in altri file.',
  'TODO(Davide)': ['Batterie da 5 PM (§7.10): il manuale le cita come esempio di potenza, ma non dà prezzo, PI, Qualità e reperibilità; il Manuale della Magia (22.6) dice che le batterie permanenti saranno integrate più avanti. L’app le mostra senza prezzo.'],
  sintonizzazione: {
    capacita_per_gradi: capacita,
    talento: { nome: 'Architetto TecnoMistico', bonus: 2 },
    potenze,
    tipologie,
    regola: tra(u710, 'La capacità di sintonizzazione è un unico budget', 'Stati e Sintonizzazione.'),
  },
  artefatti_catalogo: artefattiCatalogo,
  oggetti,
};
if (scrivi) {
  writeFileSync(new URL(`${FILE_ID}.json`, DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritto data/equipaggiamento/${FILE_ID}.json (${oggetti.length} oggetti, ${artefattiCatalogo.length} artefatti già nel catalogo)`);
} else {
  console.log(JSON.stringify({ capacita, potenze, tipologie }, null, 1));
  console.log(`artefatti del catalogo ${artefattiCatalogo.length}; batterie ${oggetti.length}; controlli incrociati ${controlli}`);
}

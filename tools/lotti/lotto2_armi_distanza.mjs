// Lotto 2 del catalogo dell'equipaggiamento: armi a distanza del catalogo Commerciale
// (Manuale degli Armamenti v0.50, §7.7, pp. 33–36).
//   node tools/lotti/lotto2_armi_distanza.mjs            prova a vuoto
//   node tools/lotti/lotto2_armi_distanza.mjs --scrivi   scrive pulito/armi_distanza.csv e il JSON
//
// Fasi:
// 1. grezzo → pulito (regola generica, documentata in docs/equipaggiamento-lotti.md):
//    - dai CSV di tools/estrai_manuali.py si tolgono righe e celle vuote (griglia fitta);
//    - ogni riga che comincia con «Modello» è l'intestazione di una nuova sottotabella: le tre
//      sottotabelle impilate di ogni gruppo (Danno…INC, Abilità…Modalità, Qualità…Costo) vengono
//      separate anche quando pdfplumber le legge come una sola, o quando stanno su due pagine;
//    - i record si riuniscono per nome del modello, nell'ordine di prima comparsa;
//    - ogni blocco «Danno…» apre un gruppo: i gruppi hanno i nomi dei titoli del manuale
//      (fuori dalle tabelle, quindi elencati qui sotto e controllati nel numero).
// 2. pulito → JSON, con le annotazioni del testo sotto le tabelle (proprietà, munizione di
//    riferimento, ricarica), citate con il paragrafo. Da qui in poi la fonte è il JSON.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto2-armi-distanza/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const VERSIONE = 'Armamenti 0.50';
const scrivi = process.argv.includes('--scrivi');

// Titoli dei gruppi del §7.7, nell'ordine delle pagine 33–36
const GRUPPI = ['Pistole', 'Fucili', 'Armi pesanti', 'Lanciatori', 'Armi da lancio', 'Archi e balestre', 'Armi speciali', 'Granate'];

// ---------------------------------------------------------------------------
// 1. grezzo → pulito

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

function grezzoInPulito() {
  const cartella = new URL('grezzo/', LOTTO);
  const file = readdirSync(cartella).filter((f) => f.endsWith('.csv')).sort();
  const righe = file.flatMap((f) => leggiCsv(readFileSync(new URL(f, cartella), 'utf8')))
    .map((r) => r.map((c) => c.trim()).filter(Boolean)).filter((r) => r.length);
  const record = new Map();
  let intestazione = null;
  let gruppo = -1;
  for (const r of righe) {
    if (r[0] === 'Modello') {
      intestazione = r;
      if (r[1] === 'Danno') gruppo++;
      continue;
    }
    if (!intestazione) throw new Error(`Riga senza intestazione: ${r.join(' | ')}`);
    if (r.length !== intestazione.length) throw new Error(`Celle ${r.length} invece di ${intestazione.length}: ${r.join(' | ')}`);
    const rec = record.get(r[0]) ?? { Modello: r[0], Gruppo: GRUPPI[gruppo] };
    intestazione.forEach((k, i) => { if (i) rec[k] = r[i]; });
    record.set(r[0], rec);
  }
  if (gruppo + 1 !== GRUPPI.length) throw new Error(`Trovati ${gruppo + 1} gruppi, attesi ${GRUPPI.length}`);
  return [...record.values()];
}

const COLONNE = ['Gruppo', 'Modello', 'Danno', 'AC', 'VA', 'FOR', 'Max Q', 'CC', 'INC', 'Abilità', 'Mani', 'PI', 'MOV', 'Modalità', 'Qualità', 'PS INT', 'REP', 'Costo proposto'];
const pulito = grezzoInPulito();
for (const r of pulito) for (const c of COLONNE) if (r[c] === undefined) throw new Error(`${r.Modello}: manca la colonna ${c}`);
const testoCsv = [COLONNE.join(','), ...pulito.map((r) => COLONNE.map((c) => (/[",]/.test(r[c]) ? `"${r[c].replace(/"/g, '""')}"` : r[c])).join(','))].join('\n') + '\n';

// ---------------------------------------------------------------------------
// 2. pulito → JSON

const idDa = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const numero = (s) => Number(String(s).replace(/\./g, ''));
const intero = (s) => { const n = Number(String(s).replace(/^-/, '−').replace('−', '-')); if (!Number.isInteger(n)) throw new Error(`"${s}" non è un intero`); return n; };
const oNull = (s, f) => (s === '—' ? null : f(s));

// §7.7: «Leggere indica Armi Leggere (DES), Medie indica Armi Medie (INT), Pesanti indica Armi Pesanti (FOR), Lancio indica Armi da Lancio (DES)»
const ABILITA = { Leggere: 'Armi leggere', Medie: 'Armi medie', Pesanti: 'Armi pesanti', Lancio: 'Armi da lancio' };

// §8.8.1: Specializzazione che si applica a ogni profilo (per nome del profilo o del gruppo)
const SPECIALIZZAZIONE = {
  Pistole: 'specializzazione-pistole',
  Carabina: 'specializzazione-carabine',
  'Fucile d’assalto': 'specializzazione-fucili-d-assalto',
  'Fucile di precisione': 'specializzazione-fucili-di-precisione',
  'Fucile a pompa': 'specializzazione-fucili-a-pompa-e-doppiette',
  Doppietta: 'specializzazione-fucili-a-pompa-e-doppiette',
  'Armi pesanti': 'specializzazione-mitragliatori',
  Lanciagranate: 'specializzazione-lanciagranate',
  Lanciarazzi: 'specializzazione-lanciarazzi',
  'Armi da lancio': 'specializzazione-armi-da-lancio',
  'Archi e balestre': 'specializzazione-archi-e-balestre',
  'Fucile al plasma': 'specializzazione-armi-al-plasma',
  Lanciafiamme: 'specializzazione-lanciafiamme',
  Granate: 'specializzazione-granate',
};

// Definizioni delle proprietà: testo del manuale (Giocatore §5.24 e §5.10), parola per parola
const DEF = {
  Sbilanciante: { nome: 'Sbilanciante', testo: 'Dopo due colpi penetranti dello stesso attacco: Prova di Forza o Destrezza; fallimento A Terra. Prova immediata; A Terra fino a quando si rialza (Giocatore §5.24).' },
  Plasma: { nome: 'Plasma', testo: 'La Contromisura è Dissipante X. Dopo almeno 1 danno oltre l’Armatura e il superamento dell’eventuale Dissipante, il bersaglio effettua una PS di Tempra con i modificatori della fonte. Con successo evita l’effetto aggiuntivo; con fallimento subisce −2 VA per 1+1d3 Round (Giocatore §5.24).' },
  Fuoco: { nome: 'Fuoco', testo: 'La Contromisura è Ignifugo X. Dopo almeno 1 danno oltre l’Armatura e il superamento dell’eventuale Ignifugo, il bersaglio effettua una PS di Riflessi, salvo eccezione esplicita. Con successo evita lo Stato; con fallimento è Incendiato per 1+1d3 Round (Giocatore §5.24).' },
  'RS 1': { nome: 'RS 1', testo: 'Raggio di Scoppio 1. Il punto effettivo di esplosione determina il Raggio di Scoppio. Chiunque sia compreso nell’Area viene coinvolto, senza una nuova Prova per colpire (Giocatore §5.10).' },
  'Sbalzante 1': { nome: 'Sbalzante 1', testo: 'Spostamento forzato immediato di X Q dopo un colpo penetrante. Istantaneo; PS Riflessi prima di un pericolo letale (Giocatore §5.24).' },
};

// Testo sotto le tabelle (§7.7, pp. 33–36), parola per parola
const ANNOTAZIONI = {
  'Fucile a pompa': { proprieta: ['Sbilanciante'], note: 'Fucile a pompa. Proprietà: Sbilanciante. Non può eseguire Tiro Rapido (§7.7: «Tutti i fucili possono eseguire Tiro Rapido eccetto quelli a pompa»).' },
  Doppietta: { proprieta: ['Sbilanciante'], note: 'Doppietta. Proprietà: Sbilanciante. Le doppiette usano Tiro Rapido contro due bersagli differenti e Doppio Colpo contro un unico bersaglio (§7.7).' },
  Lanciagranate: { note: 'Lanciagranate. Richiede Imbracciatura; si applica Postura.', riferimento: 'Granata standard a frammentazione' },
  Lanciarazzi: { riferimento: 'Razzo standard' },
  Pugnale: { note: 'Pugnale. Stesso oggetto del catalogo ravvicinato. Tiro Rapido richiede due pugnali già pronti, uno per mano.', stessoOggetto: 'armi:pugnale' },
  'Ascia leggera': { note: 'Ascia leggera. Stesso oggetto del catalogo ravvicinato.', stessoOggetto: 'armi:ascia-leggera' },
  Shuriken: { note: 'Shuriken. Prezzo per un esemplare. Tiro Rapido impiega due shuriken già pronti, anche nella stessa mano.' },
  'Arco da guerra': { note: 'Arco da guerra. Incoccare è compreso nell’attacco; Tiro Rapido consuma due frecce.', consumo: 'Tiro Rapido consuma due frecce' },
  'Balestra grande': { ricarica: '1 AzM' },
  'Balestra piccola': { ricarica: '1 AzM e una mano libera' },
  'Fucile al plasma': { proprieta: ['Plasma'], note: 'Fucile al plasma. Proprietà: Plasma. Include una cella standard da 20 colpi. Ogni colpo a segno applica AC 2.' },
  Lanciafiamme: { proprieta: ['Fuoco'], note: 'Lanciafiamme. Proprietà: Fuoco. Getto diretto contro un solo bersaglio, con Prova per Colpire e una Difesa ordinaria a distanza. Un getto è consumato anche se manca. Serbatoio incluso; combustibile separato.', consumo: 'Un getto è consumato anche se manca' },
  'Granata a frammentazione': { proprieta: ['RS 1', 'Sbilanciante', 'Sbalzante 1'], note: 'Granata a frammentazione. Proprietà: RS 1; Sbilanciante; Sbalzante 1. Attivare e lanciare una granata già pronta costa 1 AzP. Si distrugge all’esplosione. Fallimento ordinario: Scarto; Maldestro: Inceppamento con INC 8.' },
};

function arma(r) {
  const a = ANNOTAZIONI[r.Modello] ?? {};
  const mani = intero(r.Mani);
  const perMunizione = r.Danno === 'Munizione';
  const perFor = /^FOR × (\d+)$/.exec(r['Max Q']);
  const specializzazione = SPECIALIZZAZIONE[r.Modello] ?? SPECIALIZZAZIONE[r.Gruppo];
  if (!specializzazione) throw new Error(`${r.Modello}: Specializzazione non assegnata`);
  return {
    id: idDa(r.Modello),
    nome: r.Modello,
    tipo: 'arma_distanza',
    catalogo: 'Commerciale',
    famiglia: r.Gruppo,
    nomi_alternativi: [],
    note_manuale: a.note ?? '',
    paragrafo: '§7.7',
    versione_manuale: VERSIONE,
    abilita: ABILITA[r['Abilità']],
    specializzazione,
    mani,
    danno: perMunizione ? null : (mani === 2 ? { una_mano: null, due_mani: r.Danno } : { una_mano: r.Danno, due_mani: null }),
    ...(perMunizione ? { danno_da_munizione: true } : {}),
    ac: r.AC === 'Mun.' ? 'munizione' : /^\d+$/.test(r.AC) ? Number(r.AC) : r.AC,
    modificatore_va: intero(r.VA),
    portata_q: null,
    gittata_q: perFor ? null : Number(r['Max Q']),
    ...(perFor ? { gittata_per_for: Number(perFor[1]) } : {}),
    munizioni: {
      capacita: oNull(r.CC, Number),
      ricarica: a.ricarica ?? null,
      consumo: a.consumo ?? null,
      riferimento: a.riferimento ?? null,
    },
    inc: oNull(r.INC, Number),
    mov: intero(r.MOV),
    modalita: r['Modalità'].split(/\s+/),
    for_richiesta: intero(r.FOR),
    pi: Number(r.PI),
    qualita: r['Qualità'],
    ps_int: Number(r['PS INT']),
    reperibilita: r.REP,
    costo: numero(r['Costo proposto']),
    proprieta: (a.proprieta ?? []).map((p) => DEF[p]),
    ...(a.stessoOggetto ? { stesso_oggetto: a.stessoOggetto } : {}),
  };
}

const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.7 Catalogo Commerciale delle armi a distanza (pp. 33–36); definizioni delle proprietà dal Manuale del Giocatore §5.10 e §5.24; lotto 2',
  _nota: 'Generato da tools/lotti/lotto2_armi_distanza.mjs; da qui in poi si modifica questo file. «ac» è il numero di applicazioni di danno (anche «1d3», o «munizione»); «modificatore_va» è la colonna VA della scheda; «gittata_per_for» sostituisce la gittata con FOR × valore; «mov» è la penalità MOV dell’arma impugnata (§7.7).',
  // §7.7: «S = Colpo Singolo; RB = Raffica Breve; RM = Raffica Media; RL = Raffica Lunga; TR = Tiro Rapido; FS = Fuoco di Soppressione; DC = Doppio Colpo»
  'TODO(Davide)': [
    'Pistola mitragliatrice compatta: vale la Specializzazione Pistole (il suo gruppo nel §7.7, scelta attuale) o Mitragliatori?',
    'Pugnale e Ascia leggera lanciati: vale la Specializzazione Armi da Lancio (scelta attuale) o quella dell’arma ravvicinata (Coltelli e Pugnali, Asce)?',
  ],
  modalita: { S: 'Colpo Singolo', RB: 'Raffica Breve', RM: 'Raffica Media', RL: 'Raffica Lunga', TR: 'Tiro Rapido', FS: 'Fuoco di Soppressione', DC: 'Doppio Colpo' },
  oggetti: pulito.map(arma),
};

if (scrivi) {
  mkdirSync(new URL('pulito/', LOTTO), { recursive: true });
  writeFileSync(new URL('pulito/armi_distanza.csv', LOTTO), testoCsv);
  writeFileSync(new URL('armi_distanza.json', DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritti docs/lotti/lotto2-armi-distanza/pulito/armi_distanza.csv e data/equipaggiamento/armi_distanza.json (${json.oggetti.length} armi)`);
} else {
  console.log(`scriverei ${json.oggetti.length} armi in ${GRUPPI.length} gruppi:`);
  for (const o of json.oggetti) console.log(`  ${o.famiglia} · ${o.nome}`);
}

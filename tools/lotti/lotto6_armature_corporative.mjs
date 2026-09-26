// Lotto 6 del catalogo dell'equipaggiamento: armature corporative (Manuale degli Armamenti v0.50,
// §7.11.4–7.11.7, §7.13.1–7.13.3, §7.14.1–7.14.3, §7.15.2–7.15.3, §7.16.1–7.16.4, §7.17.1–7.17.5,
// pp. 63–103).
//   node tools/lotti/lotto6_armature_corporative.mjs            prova a vuoto
//   node tools/lotti/lotto6_armature_corporative.mjs --scrivi   scrive pulito/ e il JSON
//
// Fonti (docs/lotti/lotto6-armature-corporative/): grezzo/ (tools/estrai_manuali.py --tabelle,
// pp. 63–103) e prosa/ (i paragrafi 7.11–7.17 da --prosa: proprietà, rinforzi, note).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. grezzo → pulito: come il lotto 5 (righe vuote via, continuazioni unite per indice di colonna,
//    anche nelle intestazioni: «AR / magica», «Pesante / servoassistita»). Si leggono solo le
//    tabelle con intestazione «Modello | Categoria…», «Modello | AR…» (esoscheletri) e
//    «Modello | Qualità…»; i record si riuniscono per modello. Il Catalogo è quello del
//    paragrafo della pagina (PAGINE).
// 2. «5 / 7» nella colonna FOR: sistema acceso / spento (§7.14.1, §7.16.1). Il profilo principale
//    è quello acceso; lo spento diventa un profilo alternativo con FOR e penalità proprie.
// 3. Penalità effettive: categoria del §7.11.1 più gli effetti delle proprietà (EFFETTI). Il
//    generatore le confronta con la tabella «Penalità effettive» della Fratellanza (§7.17.4) e si
//    ferma se non tornano. Le armature servoassistite usano le tabelle del manuale (§7.14.2,
//    §7.16.3); gli esoscheletri Bauhaus i valori del testo del §7.11.6.
// 4. Proprietà: Bauhaus e Alleanza le dichiarano in «Proprietà: …»; gli altri cataloghi nel testo
//    del modello. Si cercano i nomi noti (NOMI) con il valore; un nome senza definizione ferma il
//    generatore. Le definizioni generali sono quelle del §7.11.4, del §7.16.3 e del §7.17.1; le
//    proprietà proprie di un modello prendono le frasi del modello che le spiegano.
// 5. Rinforzi ammessi: tabelle «Modelli | Rinforzi compatibili» (Capitol, Imperial, Mishima) e
//    frasi del testo (Bauhaus, Alleanza, Cybertronic, Fratellanza).
// 6. Controllo incrociato: ogni riga di tabella deve comparire identica nel testo in prosa
//    (estrazione indipendente dello stesso PDF); altrimenti il generatore si ferma.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto6-armature-corporative/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const FILE_ID = 'armature_corporative';
const VERSIONE = 'Armamenti 0.50';
const scrivi = process.argv.includes('--scrivi');

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

// pagina → Catalogo e paragrafo (le tabelle del lotto; le altre pagine sono di altri lotti)
const PAGINE = [
  [[64, 65], 'Bauhaus', '§7.11.5'], [[67], 'Bauhaus', '§7.11.6'], [[68], 'Alleanza', '§7.11.7'],
  [[71, 72], 'Capitol', '§7.13.1'], [[80], 'Imperial', '§7.14.1'], [[91], 'Cybertronic', '§7.15.2'],
  [[95], 'Mishima', '§7.16.1'], [[100, 101], 'Fratellanza', '§7.17.2'],
];
const paginaDi = (p) => PAGINE.find(([pp]) => pp.includes(p));

const cartella = new URL('grezzo/', LOTTO);
const record = new Map();
const tabelle = {}; // altre tabelle utili, per nome del file
for (const f of readdirSync(cartella).filter((x) => x.endsWith('.csv')).sort()) {
  const pagina = Number(f.slice(0, 3));
  const righe = righeDi(readFileSync(new URL(f, cartella), 'utf8'));
  tabelle[f.slice(0, -4)] = righe;
  const dove = paginaDi(pagina);
  if (!dove) continue;
  let intestazione = null;
  for (const r of righe) {
    if (r[0] === 'Modello') { intestazione = /^(Categoria|AR|Qualità)/.test(r[1]) ? r : null; continue; }
    if (!intestazione) continue;
    if (r.length !== intestazione.length) throw new Error(`${f}: celle ${r.length} invece di ${intestazione.length}: ${r.join(' | ')}`);
    const rec = record.get(r[0]) ?? { Modello: r[0], Catalogo: dove[1], Paragrafo: dove[2] };
    intestazione.forEach((k, i) => { if (i) rec[{ 'AR totale': 'AR', 'Magica': 'AR magica', 'FOR pilota': 'FOR' }[k] ?? k] = r[i]; });
    record.set(r[0], rec);
  }
}
const pulito = [...record.values()];
const COLONNE = ['Catalogo', 'Paragrafo', 'Modello', 'Categoria', 'AR', 'AR magica', 'FOR', 'PI', 'MOV', 'Supporti', 'Qualità', 'PS INT', 'REP', 'Costo'];
for (const r of pulito) for (const c of ['AR', 'FOR', 'PI', 'Qualità', 'PS INT', 'REP', 'Costo']) if (r[c] === undefined) throw new Error(`${r.Modello}: manca ${c}`);

// ---------------------------------------------------------------------------
// Testo in prosa: paragrafo di ogni modello

const prosa = (nome) => readFileSync(new URL(`prosa/${nome}.txt`, LOTTO), 'utf8').split('\n');
const sezione = (file, da, a) => {
  const righe = prosa(file);
  const i = righe.findIndex((r) => r.startsWith(`${da} `));
  const j = righe.findIndex((r, k) => k > i && r.startsWith(`${a} `));
  if (i < 0 || j < 0) throw new Error(`${file}: sezione ${da}–${a} non trovata`);
  return righe.slice(i + 1, j);
};
const TESTI = {
  Bauhaus: sezione('7.11 Armature e rinforzi', '7.11.5', '7.11.6'),
  Esoscheletri: sezione('7.11 Armature e rinforzi', '7.11.6', '7.11.7'),
  Alleanza: sezione('7.11 Armature e rinforzi', '7.11.7', '7.11.8'),
  Capitol: sezione('7.13 Catalogo Capitol', '7.13.2', '7.13.3'),
  Imperial: sezione('7.14 Catalogo Imperial', '7.14.2', '7.14.3'),
  Cybertronic: sezione('7.15 Catalogo Cybertronic', '7.15.3', '7.15.4'),
  Mishima: sezione('7.16 Catalogo Mishima', '7.16.2', '7.16.3'),
  MishimaEso: sezione('7.16 Catalogo Mishima', '7.16.3', '7.16.4'),
  Fratellanza: sezione('7.17 Catalogo Fratellanza', '7.17.3', '7.17.4'),
};
// titoli che chiudono il paragrafo di un modello senza essere un modello
const FINE = [/^Ordini e livree delle Guardie$/, /^Soprabito ASA$/, /^Rune, tatuaggi/, /^Su Sicurezza, IES e Dr\. Diana/, /^Marte, Vulcano e Mercurio comprendono/];
// righe della tabella della Felis dentro il suo paragrafo (§7.14.2), tolte dalla nota
const RIGHE_TABELLA = /^(Dato Servoassistenza|FOR richiesta \d|Attacchi (ravvicinati|a distanza) −|Agilità −|MOV −|Lancio degli Incantesimi −)/;
const unisci = (righe) => righe.join(' ').replace(/\s+/g, ' ').trim();
function paragrafi(catalogo) {
  const righe = TESTI[catalogo];
  const nomi = pulito.map((r) => r.Modello);
  const out = new Map();
  let corrente = null;
  for (const r of righe) {
    if (nomi.includes(r)) { corrente = r; out.set(r, []); continue; }
    if (FINE.some((re) => re.test(r))) { corrente = null; continue; }
    if (corrente && !RIGHE_TABELLA.test(r)) out.get(corrente).push(r);
  }
  return new Map([...out].map(([k, v]) => [k, unisci(v)]));
}
const PARAGRAFI = new Map(['Bauhaus', 'Alleanza', 'Capitol', 'Imperial', 'Cybertronic', 'Mishima', 'Fratellanza'].flatMap((c) => [...paragrafi(c)]));
// §7.11.6: gli esoscheletri Bauhaus hanno un testo comune dopo le tabelle
const NOTA_ESO_BAUHAUS = unisci(TESTI.Esoscheletri.slice(TESTI.Esoscheletri.findIndex((r) => r.startsWith('Il prezzo comprende esoscheletro'))));
// §7.16.3: testo comune degli esoscheletri Mishima, senza le due tabelle
const NOTA_ESO_MISHIMA = unisci(TESTI.MishimaEso.filter((r) => !/^(Modello|Powersuit|Shoa|Qualsiasi)/.test(r)));

// ---------------------------------------------------------------------------
// 3. Penalità

const CATEGORIE = { // §7.11.1
  Leggera: { attacchi_distanza: 0, attacchi_ravvicinati: 0, agilita: 0, movimento_q: 0, lancio_potere: -1 },
  Media: { attacchi_distanza: -1, attacchi_ravvicinati: -1, agilita: -1, movimento_q: -1, lancio_potere: -3 },
  Pesante: { attacchi_distanza: -2, attacchi_ravvicinati: -2, agilita: -2, movimento_q: -2, lancio_potere: -5 },
};
const riduci = (v, x) => Math.min(0, v + x);
// effetti delle proprietà sulle penalità proprie dell'armatura (§7.11.4, §7.13.2, §7.17.1)
const EFFETTI = [
  [/^Assetto da (pattuglia|incursione)$|^Assetto anfibio$/, (p) => { p.movimento_q = 0; }],
  [/^Articolazione d’assalto$/, (p) => { p.attacchi_ravvicinati = riduci(p.attacchi_ravvicinati, 1); }],
  [/^Articolazione d[ai] tiro$/, (p) => { p.attacchi_distanza = riduci(p.attacchi_distanza, 1); }],
  [/^Articolazione da ricognizione$/, (p) => { p.agilita = 0; }],
  [/^Assetto mistico (\d)$/, (p, m) => { p.lancio_potere = riduci(p.lancio_potere, Number(m[1])); }],
];
// tabelle del manuale per le armature servoassistite: [acceso, spento]
const trattino = (s) => Number(String(s).replace(/[−-]/, '-').replace(/\s*(VA|Q)$/, ''));
const PEN = (r) => ({ attacchi_ravvicinati: trattino(r[1]), attacchi_distanza: trattino(r[2]), agilita: trattino(r[3]), movimento_q: trattino(r[4]), lancio_potere: trattino(r[5]) });
const t097 = tabelle['097_1'];
const t082 = tabelle['082_1'];
const colonna082 = (k) => { // §7.14.2 (tabella Felis, trasposta)
  const riga = (nome) => t082.find((r) => r[0].startsWith(nome))[k];
  return { attacchi_ravvicinati: trattino(riga('Attacchi ravvicinati')), attacchi_distanza: trattino(riga('Attacchi a distanza')), agilita: trattino(riga('Agilità')), movimento_q: trattino(riga('MOV')), lancio_potere: trattino(riga('Lancio')) };
};
const SERVOASSISTITE = {
  'Mk.IV Felis Pattern dei Golden Lions': { condizione: 'senza alimentazione', acceso: colonna082(1), spento: colonna082(2) },
  Powersuit: { condizione: 'sistema spento', acceso: PEN(t097[1]), spento: PEN(t097[3]) },
  'Shoa Ace Custom': { condizione: 'sistema spento', acceso: PEN(t097[2]), spento: PEN(t097[3]) },
  Demonhunter: { condizione: 'sistema spento', acceso: PEN(t097[2]), spento: PEN(t097[3]) },
};
// §7.11.6: MOV dalla tabella, −5 al lancio con Potere; Schivare con Pilotare (in nota), nessuna altra penalità indicata
const ESO_BAUHAUS = ['Juggernaut XO-102 Steel Strider', 'Vulkan'];

// ---------------------------------------------------------------------------
// 4. Proprietà

// definizioni generali, dal testo del manuale
const DEF = {
  Mimetismo: 'Concede +X VA alla Prova unica di Furtività per nascondersi o muoversi senza essere individuati, quando esistono condizioni concrete per farlo. Il bonus si applica una sola volta: non si effettuano Prove separate per vista e udito (§7.11.4).',
  'Mimetica ambientale': 'Concede +X VA alla Prova unica di Furtività nell’ambiente per il quale la mimetica è predisposta, quando esistono condizioni concrete per nascondersi. Si sceglie l’ambiente della livrea, per esempio artico, boscoso, desertico o urbano. Non rende invisibili e non elimina i rumori prodotti; le limitazioni specifiche del modello restano valide (§7.11.4).',
  Discreta: 'La protezione è integrata nell’abito o nella divisa e non risulta evidente a una semplice osservazione casuale. Un esame ravvicinato o una perquisizione possono rivelarla. Componenti corazzati visibili non vengono nascosti da questa proprietà (§7.11.4).',
  'Assetto da pattuglia': 'Elimina soltanto la penalità MOV propria dell’armatura. Non elimina le penalità agli attacchi, ad Agilità, al lancio o quelle degli altri oggetti trasportati (§7.11.4).',
  'Assetto da incursione': 'Elimina soltanto la penalità MOV propria dell’armatura. Non elimina le penalità agli attacchi, ad Agilità, al lancio o quelle degli altri oggetti trasportati (§7.11.4).',
  'Articolazione da ricognizione': 'Elimina il −1 VA di Agilità della Media, comprese Schivata e Prove fisiche ostacolate. Non elimina il −1 agli attacchi né le penalità di lancio (§7.11.4).',
  'Articolazione d’assalto': 'Riduce di 1 la penalità dell’armatura agli attacchi ravvicinati: una Media passa da −1 a 0 e una Pesante da −2 a −1. Non modifica gli attacchi a distanza o le Difese (§7.11.4).',
  'Filtro respiratorio': 'Concede +2 alla PS Tempra contro veleni e agenti patogeni inalati mentre la maschera è indossata. Richiede aria respirabile; non costituisce una riserva d’ossigeno né una tenuta per vuoto o immersione (§7.11.4).',
  'Manutenzione semplice': 'Concede +1 VA alle Prove di Tecnologia per riparare quell’armatura. Restano necessari strumenti e materiali adatti; la proprietà non abbrevia automaticamente i tempi e non aumenta i PI ripristinati (§7.11.4).',
  'Struttura robusta': 'Aggiunge 2 PI massimi alla costruzione. I PI di Struttura robusta sono già inclusi nei valori tabellari dei modelli che possiedono questa proprietà e non si aggiungono nuovamente (§7.11.4).',
  'Interfaccia da equipaggio': 'Concede +1 VA alle Prove di Pilotare di mezzi terrestri corazzati quando la protezione è collegata a comandi compatibili e alimentati. Non concede bonus agli attacchi (§7.11.4).',
  'Imbracatura da sella': 'Concede +1 VA alle Prove di Pilotare già richieste per mantenere il controllo della motocicletta dopo un urto o evitare di essere disarcionati, mentre è agganciata a una sella compatibile. Non introduce una Prova quando la situazione non la richiede (§7.11.4).',
  'Protezione acustica': 'Concede +2 alla Prova Salvezza espressamente richiesta contro un effetto sonoro o un rumore dannoso. Non è un bonus generale contro esplosioni (§7.11.4).',
  Antiesplosione: 'Aumenta di 1 l’AR fornita dall’armatura contro danni Naturali o Magici di esplosioni, comprese granate, razzi e cariche da demolizione. Si applica a ciascuna applicazione di danno dell’esplosione e non protegge dal danno Etereo. Fra Antiesplosione di scudo e armatura si usa soltanto il valore maggiore (§7.4.3, §7.11.4).',
  Stabile: 'Concede +X alla Prova di Caratteristica FOR o DES richiesta contro Sbilanciante. Non è una Prova Salvezza e non si estende automaticamente ad altri tentativi di mantenere l’equilibrio o agli spostamenti di Sbalzante. Più proprietà Stabile applicabili, comprese quelle di scudo e armatura, non si sommano: si usa il valore maggiore (§7.4.3, §7.11.4).',
  Ignifuga: 'Contromisura del §5.24 contro Fuoco: il valore è una soglia contro l’effetto aggiuntivo pertinente dopo l’Armatura, non un’ulteriore riduzione dei danni (§7.11.4).',
  Imbottita: 'Contromisura del §5.24 contro Concussivo: il valore è una soglia contro l’effetto aggiuntivo pertinente dopo l’Armatura, non un’ulteriore riduzione dei danni (§7.11.4).',
  Isolante: 'Contromisura del §5.24 contro Elettricità: il valore è una soglia contro l’effetto aggiuntivo pertinente dopo l’Armatura, non un’ulteriore riduzione dei danni (§7.11.4).',
  'Protezione occulta': 'Concede +X alle PS Magia effettivamente richieste contro Oscura Simmetria, Corruzione e Paura. Si applica una sola volta anche quando un effetto rientra in più categorie. Non crea una Salvezza altrimenti assente e non si trasferisce alle PS Volontà contro Paura (§7.11.4, §7.17.1).',
  'Assetto mistico': 'Riduce di X la penalità della propria armatura alle Prove di Potere per lanciare Incantesimi, fino a 0. Non concede un bonus positivo e non riduce penalità causate da altri fattori (§7.17.1).',
  'Assistenza muscolare': 'Concede +X VA alle Prove di Forza o Atletica per sollevare, spingere, trascinare o sfondare con il telaio. Non aumenta la Caratteristica, non soddisfa requisiti delle armi e non si applica ad attacchi o salti. Richiede alimentazione (§7.14.2, §7.16.3).',
  'Colpo assistito': 'Aggiunge X al danno ordinario degli attacchi ravvicinati, una sola volta per applicazione di danno. Richiede alimentazione (§7.14.2, §7.16.3).',
  Termoregolazione: 'Concede +2 alle PS Tempra contro caldo e freddo ambientali; non aumenta l’AR contro attacchi termici. Richiede alimentazione (§7.14.2, §7.16.3).',
};
// proprietà spiegate una volta nel testo di un modello e usate anche da altri
Object.assign(DEF, {
  'Articolazione da tiro': 'Riduce di 1 la penalità propria dell’armatura agli attacchi a distanza: il −2 della Pesante diventa −1. Restano le altre penalità della categoria e quelle dovute a FOR insufficiente (§7.13.2, Tortoise Mk II).',
  'Imbracatura da lancio': 'Concede +X VA alle Prove di Pilotare richieste per controllare discesa e atterraggio con un paracadute compatibile. Il paracadute si acquista separatamente (§7.13.2, Airborne Rangers).',
  'Interfaccia aeronautica': 'Concede +X VA a Pilotare per la conduzione di un aeromobile quando è collegata a comandi compatibili e alimentati; non migliora l’uso delle armi (§7.13.2, Tuta pilota Capitol).',
  'Imbracatura tecnica': 'Concede +X VA ad Atletica per arrampicarsi o calarsi usando corde e ancoraggi adeguati; tali strumenti si acquistano separatamente. Non aumenta automaticamente il movimento (§7.14.2, Grey Ghost).',
  'Imbracatura da artigliere': 'Con una sola arma pesante compatibile agganciata, elimina il −1 VA dell’armatura all’attacco a distanza effettuato con quell’arma e riduce di 1 Q la penalità MOV dell’arma, fino a 0. Non elimina il MOV −1 dell’armatura. Agganciare o sganciare costa 1 AzP; requisito FOR dell’arma e impugnatura a due mani restano (§7.11.7, Vulcano).',
});
DEF['Articolazione di tiro'] = DEF['Articolazione da tiro']; // stesso nome nei cataloghi Cybertronic, Mishima e Fratellanza
// proprietà proprie di un modello: il testo sono le frasi del modello che le nominano
const PROPRIE = ['Articolazione da tiro', 'Articolazione di tiro', 'Imbracatura da lancio', 'Articolazione da arrampicata', 'Protezione climatica',
  'Assetto anfibio', 'Tenuta subacquea', 'Interfaccia aeronautica', 'Imbracatura da artigliere', 'Imbracatura tecnica', 'Passo sicuro',
  'Manutenzione agevolata', 'Sigilli d’interdizione', 'Interfaccia di pilotaggio', 'SIN'];
const CON_VALORE = new Set(['Mimetismo', 'Mimetica ambientale', 'Filtro respiratorio', 'Interfaccia da equipaggio', 'Imbracatura da sella', 'Protezione acustica',
  'Antiesplosione', 'Stabile', 'Ignifuga', 'Imbottita', 'Isolante', 'Protezione occulta', 'Assetto mistico', 'Assistenza muscolare', 'Colpo assistito',
  'Termoregolazione', 'Imbracatura da lancio', 'Articolazione da arrampicata', 'Protezione climatica', 'Interfaccia aeronautica', 'Imbracatura tecnica',
  'Passo sicuro', 'Sigilli d’interdizione', 'Interfaccia di pilotaggio', 'SIN']);
const NOMI = [...Object.keys(DEF), ...PROPRIE].sort((a, b) => b.length - a.length);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RE_NOMI = new RegExp(`(?<![\\p{L}])(${NOMI.map(escape).join('|')})(?: (\\d))?(?![\\p{L}])`, 'gu');

function trovaProprieta(testo) {
  const out = [];
  for (const m of testo.matchAll(RE_NOMI)) {
    const [, base, x] = m;
    if (CON_VALORE.has(base) && !x) continue; // «Imbottita non costituisce…»: senza valore non è la proprietà
    const nome = x ? `${base} ${x}` : base;
    if (!out.some((p) => p.nome === nome || p.base === base)) out.push({ nome, base, x: x ? Number(x) : null });
  }
  return out;
}
const frasi = (t) => t.split(/(?<=\.)\s+(?=[A-ZÀ-Ý])/);
let testiDalModello = 0;
function testoProprieta(p, nota) {
  if (DEF[p.base]) return DEF[p.base].replace(/\+X|di X|X al|: X/g, (s) => s.replace('X', String(p.x)));
  testiDalModello++;
  const tutte = frasi(nota);
  // «Imbottita 1, Ignifuga 2 e Interfaccia di pilotaggio 1: +1 VA…»: si tiene da «Nome:» in poi
  const conDuePunti = tutte.find((f) => f.includes(`${p.nome}:`));
  if (conDuePunti) {
    const n = tutte[tutte.indexOf(conDuePunti) + 1] ?? '';
    return [conDuePunti.slice(conDuePunti.indexOf(`${p.nome}:`)), ...(/^Non (?!accetta)/.test(n) ? [n] : [])].join(' ');
  }
  // altrimenti le frasi che la nominano (anche in minuscolo, «La protezione climatica concede…»),
  // senza le frasi che sono solo l'elenco delle proprietà del modello
  const qui = tutte.filter((f) => f.toLowerCase().includes(p.base.toLowerCase()) && trovaProprieta(f).length <= 1);
  if (!qui.length) throw new Error(`proprietà senza testo nel paragrafo del modello: ${p.nome}`);
  // la frase successiva che comincia con «Non» è un limite della stessa proprietà (non «Non accetta rinforzi»)
  const conLimiti = qui.flatMap((f) => { const n = tutte[tutte.indexOf(f) + 1] ?? ''; return /^Non (?!accetta)/.test(n) ? [f, n] : [f]; });
  return [...new Set(conLimiti)].join(' ');
}
// proprietà scritte a mano (testo comune a più modelli, non in un paragrafo del modello)
const PROPRIETA_A_MANO = {
  'Juggernaut XO-102 Steel Strider': 'Imbottita 2 e Stabile 2', // §7.11.6
  Vulkan: 'Ignifuga 3, Imbottita 3 e Stabile 2',
};
// «Proprietà: …» (Bauhaus e Alleanza): solo la dichiarazione, perché il testo nomina anche proprietà assenti
// («senza Articolazione d’assalto», Wolfheads)
const dichiarazione = (nota) => /Proprietà(?: unica)?: ([^.]+)\./.exec(nota)?.[1] ?? null;

// ---------------------------------------------------------------------------
// 5. Rinforzi ammessi

// Le tabelle usano nomi abbreviati («Tortoise Mk II», «ISC», «Portatori di Morte»): un modello
// corrisponde se compare il suo nome corto (senza «Armatura», «Corazza»… e le parole minuscole
// iniziali) oppure una sua parola maiuscola che nessun altro modello del catalogo contiene.
const GENERICHE = new Set(['Armatura', 'Corazza', 'Tenuta', 'Tuta', 'Abito', 'Divisa']);
const nomeCorto = (n) => { const p = n.split(' '); while (p.length > 1 && (GENERICHE.has(p[0]) || /^[a-z’]/.test(p[0]))) p.shift(); return p.join(' '); };
const presente = (p, testo) => new RegExp(`(^|[ ,])${escape(p)}([ ,]|$)`).test(testo);
function rinforziDaTabella(righe, modelli) {
  const out = new Map();
  let resto = null;
  const parole = (m) => m.Modello.split(' ').filter((p) => p.length >= 3 && /^[A-Z]/.test(p) && !GENERICHE.has(p));
  const uniche = (m) => parole(m).filter((p) => modelli.every((x) => x === m || !parole(x).includes(p)));
  for (const [chi, cosa] of righe.slice(1)) {
    const valore = /Nessuno/.test(cosa) ? [] : /Pesante/.test(cosa) ? ['Leggero', 'Pesante'] : ['Leggero'];
    if (/^Tutti gli altri/.test(chi)) { resto = valore; continue; }
    for (const m of modelli) {
      if ([nomeCorto(m.Modello), ...uniche(m)].some((p) => presente(p, chi))) {
        if (out.has(m.Modello)) throw new Error(`${m.Modello}: due righe di rinforzi`);
        out.set(m.Modello, valore);
      }
    }
  }
  if (resto) for (const m of modelli) if (!out.has(m.Modello)) out.set(m.Modello, resto);
  return out;
}
function rinforziDaTesto(nota) {
  if (/Non accetta rinforzi|Nessun rinforzo ordinario|Non accetta rinforzi ordinari/.test(nota)) return [];
  if (/Rinforzi Leggeri oppure\s+Pesanti/.test(nota)) return ['Leggero', 'Pesante'];
  if (/Rinforz[oi] Legger[oi]/.test(nota)) return ['Leggero'];
  return null;
}
const perCatalogo = (c) => pulito.filter((r) => r.Catalogo === c);
const RINFORZI = new Map([
  ...rinforziDaTabella(tabelle['074_1'], perCatalogo('Capitol')),
  ...rinforziDaTabella(tabelle['082_2'], perCatalogo('Imperial')),
  ...rinforziDaTabella(tabelle['097_3'], perCatalogo('Mishima')),
]);
// §7.17.5: «Tutte le Leggere e Medie ammettono un solo Rinforzo Leggero… Furie, Sacri Guerrieri, Custode e Arcivescovi non ammettono rinforzi ordinari»
for (const r of perCatalogo('Fratellanza')) RINFORZI.set(r.Modello, r.Categoria === 'Pesante' ? [] : ['Leggero']);
const RINFORZI_A_MANO = { 'Juggernaut XO-102 Steel Strider': [], Vulkan: [] }; // §7.11.6: «Nessuno dei due accetta rinforzi esterni»

// ---------------------------------------------------------------------------
// JSON

const idDa = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (s) => Number(String(s).replace(/\./g, ''));
const FAMIGLIA = (r) => {
  if (ESO_BAUHAUS.includes(r.Modello) || ['Powersuit', 'Shoa Ace Custom', 'Demonhunter'].includes(r.Modello)) return 'Esoscheletri';
  if (r.Catalogo === 'Bauhaus') return BAUHAUS_GRUPPI.get(r.Modello);
  return 'Armature';
};
// §7.11.5: titoli dei due gruppi Bauhaus (righe prima delle tabelle)
const BAUHAUS_GRUPPI = new Map();
{
  let g = null;
  for (const r of TESTI.Bauhaus) {
    if (/^(Fanteria e reparti operativi|Agenti equipaggi e Guardie)$/.test(r)) g = r === 'Agenti equipaggi e Guardie' ? 'Agenti, equipaggi e Guardie' : r;
    const m = pulito.find((x) => r.startsWith(`${x.Modello} `) && /(Leggera|Media|Pesante) \d/.test(r));
    if (m && g && !BAUHAUS_GRUPPI.has(m.Modello)) BAUHAUS_GRUPPI.set(m.Modello, g);
  }
}

const conteggio = { proprieta_trovate: 0, proprieta_a_mano: 0, penalita_da_proprieta: 0, penalita_da_tabella: 0 };
const oggetti = pulito.map((r) => {
  const eso = ESO_BAUHAUS.includes(r.Modello);
  const servo = SERVOASSISTITE[r.Modello];
  let nota = eso ? NOTA_ESO_BAUHAUS : PARAGRAFI.get(r.Modello);
  if (nota === undefined) throw new Error(`${r.Modello}: paragrafo non trovato nel testo`);
  if (['Powersuit', 'Shoa Ace Custom', 'Demonhunter'].includes(r.Modello)) nota = `${nota} ${NOTA_ESO_MISHIMA}`;
  const fonte = PROPRIETA_A_MANO[r.Modello] ?? (['Bauhaus', 'Alleanza'].includes(r.Catalogo) ? dichiarazione(nota) : nota);
  if (fonte === null) throw new Error(`${r.Modello}: nessuna dichiarazione «Proprietà:»`);
  if (PROPRIETA_A_MANO[r.Modello]) conteggio.proprieta_a_mano++; else conteggio.proprieta_trovate++;
  const prop = trovaProprieta(fonte);
  const [forAcceso, forSpento] = r.FOR.split('/').map((x) => Number(x.trim()));
  const categoria = r.Categoria ?? 'Esoscheletro';
  const catBase = /^(Leggera|Media|Pesante)/.exec(categoria)?.[1];
  let penalita;
  if (servo) { penalita = servo.acceso; conteggio.penalita_da_tabella++; } else if (eso) {
    penalita = { attacchi_distanza: 0, attacchi_ravvicinati: 0, agilita: 0, movimento_q: Number(r.MOV.replace('−', '-')), lancio_potere: -5 };
    conteggio.penalita_da_tabella++;
  } else {
    penalita = { ...CATEGORIE[catBase] };
    for (const p of prop) for (const [re, f] of EFFETTI) { const m = re.exec(p.nome); if (m) f(penalita, m); }
    conteggio.penalita_da_proprieta++;
  }
  const rinforzi = RINFORZI_A_MANO[r.Modello] ?? RINFORZI.get(r.Modello) ?? rinforziDaTesto(nota);
  if (rinforzi === null || rinforzi === undefined) throw new Error(`${r.Modello}: rinforzi ammessi non trovati`);
  const alternativi = servo ? [{ condizione: servo.condizione, for_richiesta: forSpento, penalita: servo.spento }] : null;
  if (servo && !forSpento) throw new Error(`${r.Modello}: manca la FOR a sistema spento`);
  return {
    id: idDa(r.Modello),
    nome: r.Modello,
    tipo: 'armatura',
    catalogo: r.Catalogo,
    famiglia: FAMIGLIA(r),
    nomi_alternativi: r.Modello === 'Armatura d’assalto Headhunter' ? ['Warhound'] : [], // §7.14.2: «Il modello Warhound ha gli stessi valori»
    note_manuale: nota,
    paragrafo: r.Paragrafo,
    versione_manuale: VERSIONE,
    categoria,
    ar: { totale: Number(r.AR), magica: Number(r['AR magica'] ?? 0) },
    for_richiesta: forAcceso,
    pi: Number(r.PI),
    qualita: r['Qualità'],
    ps_int: Number(r['PS INT']),
    reperibilita: r.REP,
    costo: num(r.Costo),
    rinforzi_ammessi: rinforzi,
    penalita,
    ...(alternativi ? { profili_alternativi: alternativi } : {}),
    ...(eso ? { supporti: r.Supporti } : {}),
    proprieta: prop.map((p) => ({ nome: p.nome, testo: testoProprieta(p, nota) })),
  };
});

// verifica: tabella «Penalità effettive» della Fratellanza (§7.17.4)
const perNomeCorto = (corto) => oggetti.find((o) => o.catalogo === 'Fratellanza' && o.nome.endsWith(corto));
let verificate = 0;
for (const riga of tabelle['103_1'].slice(1)) {
  const atteso = PEN(riga);
  for (const corto of riga[0].split(' / ')) {
    const o = perNomeCorto(corto === 'Arcangelo' ? 'dell’Arcangelo' : corto);
    if (!o) throw new Error(`§7.17.4: modello «${corto}» non trovato`);
    const k = Object.keys(atteso).find((c) => atteso[c] !== o.penalita[c]);
    if (k) throw new Error(`§7.17.4: ${o.nome}, ${k} ${o.penalita[k]} invece di ${atteso[k]}`);
    verificate++;
  }
}

// verifica: ogni riga delle tabelle compare identica nel testo in prosa (estrazione indipendente
// dello stesso PDF); la Felis ha nome e categoria su tre righe
const righeProsa = ['7.11 Armature e rinforzi', '7.13 Catalogo Capitol', '7.14 Catalogo Imperial', '7.15 Catalogo Cybertronic', '7.16 Catalogo Mishima', '7.17 Catalogo Fratellanza'].flatMap(prosa);
let righeControllate = 0;
for (const r of pulito) {
  const profilo = [r.Modello, r.Categoria?.replace(' servoassistita', ''), r.AR, r['AR magica'], r.FOR, r.PI, r.MOV, r.Supporti].filter((x) => x !== undefined).join(' ');
  const economico = [r.Modello, r['Qualità'], r['PS INT'], r.REP, r.Costo].join(' ');
  for (const atteso of [profilo, economico]) {
    const trovata = righeProsa.includes(atteso) || (r.Modello.startsWith('Mk.IV Felis') && righeProsa.includes(atteso.replace(`${r.Modello} Pesante `, `${r.Modello} `)));
    if (!trovata) throw new Error(`riga non ritrovata nel testo: ${atteso}`);
    righeControllate++;
  }
}

const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50: armature dei cataloghi Bauhaus (§7.11.5–7.11.6), Alleanza (§7.11.7), Capitol (§7.13.1–7.13.3), Imperial (§7.14.1–7.14.3), Cybertronic (§7.15.2–7.15.3), Mishima (§7.16.1–7.16.4) e Fratellanza (§7.17.2–7.17.5), pp. 64–103; lotto 6',
  _nota: 'Generato da tools/lotti/lotto6_armature_corporative.mjs; da qui in poi si modifica questo file. «penalita» sono le penalità effettive del modello (categoria del §7.11.1 con gli effetti delle proprietà native), prima di rinforzi e FOR insufficiente. «profili_alternativi» delle armature servoassistite: il profilo a sistema spento, con FOR e penalità proprie. I rinforzi non sono ancora nel catalogo: «rinforzi_ammessi» dice solo quali kit accetta il modello.',
  note_per_catalogo: {
    Alleanza: unisci(TESTI.Alleanza.slice(TESTI.Alleanza.findIndex((r) => r.startsWith('Marte, Vulcano e Mercurio comprendono')), TESTI.Alleanza.findIndex((r) => r === 'Divisa d’ordinanza ASA'))),
    Fratellanza: 'AR magica e protezioni occulte indicate sono passive mentre l’armatura è indossata e non richiedono Sintonizzazione (§7.17).',
  },
  oggetti,
};

if (scrivi) {
  mkdirSync(new URL('pulito/', LOTTO), { recursive: true });
  const csv = [COLONNE.join(','), ...pulito.map((r) => COLONNE.map((c) => r[c] ?? '').map((c) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(','))].join('\n') + '\n';
  writeFileSync(new URL('pulito/armature_corporative.csv', LOTTO), csv);
  writeFileSync(new URL(`${FILE_ID}.json`, DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritti pulito/armature_corporative.csv e data/equipaggiamento/${FILE_ID}.json (${oggetti.length} armature)`);
} else {
  const pen = (p) => [p.attacchi_ravvicinati, p.attacchi_distanza, p.agilita, p.movimento_q, p.lancio_potere].join('/');
  for (const o of oggetti) console.log(`${o.catalogo} · ${o.famiglia} · ${o.nome} · ${o.categoria} AR ${o.ar.totale}(${o.ar.magica}) FOR ${o.for_richiesta} · pen ${pen(o.penalita)} · rinf ${o.rinforzi_ammessi.join('+') || '—'} · ${o.proprieta.map((p) => p.nome).join(', ')}`);
  console.log(`armature ${oggetti.length}; continuazioni unite ${uniteACapo}; §7.17.4 verificate ${verificate}; righe ritrovate nel testo ${righeControllate}; testi di proprietà presi dal modello ${testiDalModello}`, conteggio);
}

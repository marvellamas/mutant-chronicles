// Lotto 4 del catalogo dell'equipaggiamento: armi ravvicinate dei cataloghi corporativi
// (Manuale degli Armamenti v0.50, §7.1.9, pp. 11–17).
//   node tools/lotti/lotto4_armi_ravvicinate_corporative.mjs            prova a vuoto
//   node tools/lotti/lotto4_armi_ravvicinate_corporative.mjs --scrivi   scrive pulito/ e il JSON
//
// Fonti (docs/lotti/lotto4-armi-ravvicinate-corporative/): grezzo/ (tools/estrai_manuali.py
// --tabelle, pp. 11–17) e prosa/ (il §7.1 da --prosa, per le righe «Proprietà e impiego»).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. Ogni Corporazione ha due tabelle: profilo (Modello | Abilità | Mani | Danno base | Q | FOR | PI)
//    e dati economici (Modello | Qualità | PS INT | REP | Costo [proposto]). Una riga con la sola
//    cella «proposto» è la seconda riga dell'intestazione e si salta. Le Corporazioni sono titoli
//    fuori dalle tabelle: elencate qui nell'ordine delle pagine, con il numero controllato (7).
// 2. «Proprietà e impiego»: per ogni modello la riga «Nome. Proprietà: …. Attivazione: ….
//    Manovre compatibili: ….» si legge dal testo in prosa con un'espressione regolare; le proprietà
//    si separano sul «;». Ogni proprietà deve avere una definizione (DEFINIZIONI), altrimenti il
//    generatore si ferma. I paragrafi che seguono le righe dei modelli sono note del catalogo.
// 3. La famiglia (e quindi la Specializzazione del §8.8.1) non è nelle tabelle corporative: si
//    assegna solo quando il nome contiene la famiglia commerciale o un suo nome alternativo
//    (§7.1.1); gli altri modelli restano «Da classificare», senza Specializzazione, con TODO(Davide).
// 4. Lo Scudo delle Guardie Sacre, che il §7.1.9 elenca con le armi, è già in scudi.json (lotto 3).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto4-armi-ravvicinate-corporative/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const VERSIONE = 'Armamenti 0.50';
const scrivi = process.argv.includes('--scrivi');

// Titoli delle Corporazioni del §7.1.9, nell'ordine delle pagine 11–17 («Imperiali» diventa
// «Imperial», come nel §7.4.8 e nel §7.14, così la cascata non ha due cataloghi)
const CATALOGHI = ['Bauhaus', 'Capitol', 'Cybertronic', 'Fratellanza', 'Imperial', 'Mishima', 'Alleanza'];
const ESCLUSI = { 'Scudo delle Guardie Sacre': 'già in scudi.json (lotto 3, §7.4.10)' };

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

const cartella = new URL('grezzo/', LOTTO);
const righe = readdirSync(cartella).filter((f) => f.endsWith('.csv')).sort()
  .flatMap((f) => leggiCsv(readFileSync(new URL(f, cartella), 'utf8')))
  .map((r) => r.map((c) => c.trim()).filter(Boolean)).filter((r) => r.length);
const record = new Map();
let intestazione = null;
let catalogo = -1;
for (const r of righe) {
  if (r[0] === 'Modello') {
    intestazione = r;
    if (r[1] === 'Abilità') catalogo++;
    continue;
  }
  if (r.length === 1 && r[0] === 'proposto') continue; // «Costo / proposto» su due righe
  if (!intestazione || (intestazione[1] !== 'Abilità' && intestazione[1] !== 'Qualità')) continue; // tabelle del §7.1.8 e dell'indirizzo dei cataloghi
  if (r.length !== intestazione.length) throw new Error(`Celle ${r.length} invece di ${intestazione.length}: ${r.join(' | ')}`);
  const rec = record.get(r[0]) ?? { Catalogo: CATALOGHI[catalogo], Modello: r[0] };
  intestazione.forEach((k, i) => { if (i) rec[k] = r[i]; });
  record.set(r[0], rec);
}
if (catalogo + 1 !== CATALOGHI.length) throw new Error(`Trovati ${catalogo + 1} cataloghi, attesi ${CATALOGHI.length}`);
const pulito = [...record.values()];
if (pulito.length !== 40) throw new Error(`Trovati ${pulito.length} modelli, il §7.1.9 dichiara 39 armi e uno Scudo`);
const COLONNE = ['Catalogo', 'Modello', 'Abilità', 'Mani', 'Danno base', 'Q', 'FOR', 'PI', 'Qualità', 'PS INT', 'REP', 'Costo'];
for (const r of pulito) for (const c of COLONNE) if (r[c] === undefined) throw new Error(`${r.Modello}: manca ${c}`);
const testoCsv = [COLONNE.join(','), ...pulito.map((r) => COLONNE.map((c) => r[c]).join(','))].join('\n') + '\n';

// ---------------------------------------------------------------------------
// 2. Proprietà e impiego (testo in prosa)

const prosa = readFileSync(new URL('prosa/7.1 Dati fondamentali delle armi.txt', LOTTO), 'utf8').split('\n');
const i719 = prosa.findIndex((r) => r.startsWith('7.1.9 '));
const testo = prosa.slice(i719).join(' ').replace(/\s+/g, ' ');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function impiego(nome) {
  const re = new RegExp(`${esc(nome)}\\. (?:Proprietà: (.+?)\\. )?(?:Attivazione: (.+?)\\. )?Manovre compatibili: (.+?)\\.(?: |$)`);
  const m = re.exec(testo);
  if (!m) throw new Error(`${nome}: riga «Proprietà e impiego» non trovata`);
  return { proprieta: m[1] ? m[1].split('; ') : [], attivazione: m[2] ?? null, manovre: m[3], inizio: m.index, indice: m.index + m[0].length };
}

// Note del catalogo: i paragrafi fra l'ultima riga dei modelli e il titolo successivo
const TITOLI = { Bauhaus: 'Capitol', Capitol: 'Cybertronic', Cybertronic: 'Fratellanza', Fratellanza: 'Imperiali', Imperial: 'Mishima', Mishima: 'Alleanza', Alleanza: '7.1.10' };

// Definizioni delle proprietà: testo del manuale parola per parola (§7.1.3, §7.1.4, Giocatore §5.24)
const T713 = {
  affidabile: 'Affidabile +X. Aggiunge X al tiro di 1d20 + modificatore di Caratteristica sulla tabella delle Complicazioni ravvicinate, fino a un massimo di 20. Affidabilità ridotta −2 sottrae invece 2, fino a un minimo di 1. L’attacco rimane fallito; queste proprietà non modificano il VA per colpire né la PS Integrità (§7.1.3).',
  difensiva: 'Difensiva X. Concede +X VA esclusivamente alle Parate effettuate con quell’arma. Non aumenta l’Armatura e non trasferisce il bonus alle Parate effettuate con un altro oggetto (§7.1.3).',
  precisa: 'Precisa X. Concede +X VA alle Prove per colpire con l’arma, comprese le Manovre che richiedono una Prova per colpire. Non si applica a Parate, Salvezze o altre Prove contrapposte (§7.1.3).',
  demolitrice: 'Demolitrice 1. Quando l’arma attacca intenzionalmente un oggetto per romperlo, aggiunge 1 PI alla perdita se l’oggetto fallisce la propria PS Integrità. Si effettua una sola PS per tutte le cause di quel colpo, compreso il +1 PI del Magistrale (§7.2.1). Quando la scheda indica Demolitrice soltanto nell’attivazione, il beneficio richiede la spesa della carica (§7.1.3).',
  retrattile: 'Retrattile. Estrarre o ritrarre la lama richiede 1 Azione Principale. Per attaccare con la lama essa deve essere estratta (§7.1.3).',
  purificatrice: 'Purificatrice 1. Aggiunge 1 danno contro creature o servitori identificati come appartenenti all’Oscura Simmetria nella propria scheda. Il bonus si applica a ciascuna applicazione immediata di danno, prima dei moltiplicatori, delle Difese e dell’Armatura; non aumenta i danni periodici di Fuoco. È passivo, non consuma PM, non richiede Sintonizzazione e non rende da solo Magico il danno. La semplice presenza di Corruzione non rende un bersaglio valido. Il bonus è separato dal danno riportato in tabella (§7.1.3).',
  sanguinante: 'Sanguinamento X immediato; ricorrenze all’Iniziativa della fonte. Fino a quando viene fermato (Giocatore §5.24, §5.15).',
  montata: 'Il profilo si utilizza con la baionetta fissata al fucile, impugnato a due mani (§7.1.3, Montata).',
  versatile: 'Può essere impugnata a una oppure a due mani, infliggendo il danno corrispondente riportato nel catalogo (§7.1.3, Versatile).',
  magico: 'Il danno Magico resta distinto dal danno Etereo: l’Armatura ordinaria assorbe Naturale e Magico, mentre contro Etereo si applica soltanto la componente magica (§7.1.4).',
  stordire: 'Stordire +1 del Martello Spaccateste a due mani concede +1 VA alla Manovra Stordire: la penalità ordinaria diventa −5 VA, quella di Stordire Migliorato −3 VA. Non richiede l’attivazione di una carica (§7.1.9).',
};
function definizione(nome) {
  let m;
  if ((m = /^Affidabile \+(\d+)$/.exec(nome)) || /^Affidabilità ridotta −2$/.test(nome)) return { nome, testo: T713.affidabile };
  if ((m = /^Difensiva \+(\d+)$/.exec(nome))) return { nome, testo: T713.difensiva, effetto: { parata_va: Number(m[1]) } };
  if ((m = /^Precisa (\d+)$/.exec(nome))) return { nome, testo: T713.precisa, effetto: { va: Number(m[1]) } };
  if (nome === 'Demolitrice 1') return { nome, testo: T713.demolitrice };
  if (nome === 'Retrattile') return { nome, testo: T713.retrattile };
  if (nome === 'Purificatrice 1') return { nome, testo: T713.purificatrice };
  if ((m = /^Sanguinante (\d+)$/.exec(nome))) return { nome, testo: T713.sanguinante.replace('X', m[1]) };
  if (nome === 'Montata') return { nome, testo: T713.montata };
  if (nome === 'Versatile') return { nome, testo: T713.versatile };
  if (nome === 'Danno Magico') return { nome, testo: T713.magico };
  if (nome === 'Stordire +1') return { nome, testo: T713.stordire };
  if ((m = /^Immobilizzare entro (\d+) Q$/.exec(nome))) return { nome, testo: `Permette l’impiego descritto nel §7.1.5 (Immobilizzare con la Frusta) entro ${m[1]} Q.` };
  if (nome === '×2 contro Oscura Simmetria, ×3 con Magistrale') return { nome: 'Contro l’Oscura Simmetria', testo: 'Contro creature o servitori dell’Oscura Simmetria il danno è ×2, oppure ×3 con un Magistrale. Non aggiunge anche Purificatrice 1. Il beneficio è passivo e non richiede Sintonizzazione (§7.1.9).' };
  throw new Error(`Proprietà senza definizione: «${nome}»`);
}

// «+1d6 Magico; 5 PM; Sintonizzazione 2», «+2d4 Elettricità; 5 cariche a cella», «+2d4 Elettricità e Demolitrice 1; 5 cariche a cella»
function attivazione(testoAtt) {
  if (!testoAtt) return { attivazione: null, munizioni: null };
  const parti = testoAtt.split('; ');
  const m = /^\+(\d+d\d+) ([^\s]+)(?: e (.+))?$/.exec(parti[0]);
  if (!m) throw new Error(`Attivazione non riconosciuta: «${testoAtt}»`);
  const att = { testo: testoAtt, danno_extra: m[1], natura: m[2], ...(m[3] ? { anche: m[3] } : {}) };
  let munizioni = null;
  for (const p of parti.slice(1)) {
    let k;
    if ((k = /^(\d+) cariche a cella$/.exec(p))) {
      munizioni = { capacita: Number(k[1]), unita: 'cariche', ricarica: 'sostituire la cella pronta richiede 1 AzP (§7.1.4)', consumo: 'una carica per attivazione (§7.1.4)', riferimento: 'cella energetica sostituibile (§7.20.5)' };
    } else if ((k = /^(\d+) PM$/.exec(p))) {
      munizioni = { capacita: Number(k[1]), unita: 'PM', ricarica: 'secondo il §7.5.1', consumo: 'un PM per attivazione', riferimento: `Chroma Rosso da ${k[1]} PM (§7.5.1)` };
    } else if ((k = /^Sintonizzazione (\d+)$/.exec(p))) att.sintonizzazione = Number(k[1]);
    else throw new Error(`Parte dell'attivazione non riconosciuta: «${p}»`);
  }
  return { attivazione: att, munizioni };
}

// ---------------------------------------------------------------------------
// 3. Famiglie: solo per nome della famiglia commerciale o di un suo nome alternativo (§7.1.1)

const FAMIGLIE = [
  [/^Spad|^Sciabola/, 'Spade'], // «Sciabola» è un nome alternativo della Spada leggera
  [/^Asci/, 'Asce'],
  [/^Martell/, 'Martelli'],
  [/^Lancia|^Baionetta/, 'Armi inastate'], // Lancia e Baionetta montata sono Armi inastate
  [/^Tonfa|^Manganello/, 'Mazze e bastoni'], // Tonfa; «Manganello» è un nome alternativo del Randello
  [/^Frusta/, 'Armi flessibili'],
  [/^Artigli|^Tirapugni/, 'Armi da pugno'], // Artigli, Artiglio, Tirapugni
];
const DA_CLASSIFICARE = 'Da classificare';
const famigliaDi = (nome) => FAMIGLIE.find(([re]) => re.test(nome))?.[1] ?? DA_CLASSIFICARE;
const idDa = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ABILITA = { Mischia: 'Armi da mischia', Guerra: 'Armi da guerra', Corpo: 'Corpo a corpo' };

// ---------------------------------------------------------------------------
// 4. JSON

const notePerCatalogo = {};
const oggetti = [];
for (const cat of CATALOGHI) {
  const modelli = pulito.filter((r) => r.Catalogo === cat && !ESCLUSI[r.Modello]);
  let fine = 0;
  const impieghi = modelli.map((r) => impiego(r.Modello));
  for (const [i, r] of modelli.entries()) {
    const imp = impieghi[i];
    // nota: dalla riga del modello all'inizio della successiva (comprende eventuali frasi dopo le Manovre)
    const nota = testo.slice(imp.inizio, i + 1 < modelli.length ? impieghi[i + 1].inizio : imp.indice).trim();
    fine = Math.max(fine, imp.indice);
    const famiglia = famigliaDi(r.Modello);
    const mani = r.Mani === '1/2' ? '1/2' : Number(r.Mani);
    const [a, b] = r['Danno base'].split('/').map((x) => x.trim());
    const { attivazione: att, munizioni } = attivazione(imp.attivazione);
    const proprieta = imp.proprieta.map(definizione);
    oggetti.push({
      id: idDa(r.Modello),
      nome: r.Modello,
      tipo: 'arma_ravvicinata',
      catalogo: cat,
      famiglia,
      nomi_alternativi: [],
      note_manuale: nota,
      paragrafo: '§7.1.9',
      versione_manuale: VERSIONE,
      abilita: ABILITA[r['Abilità']],
      specializzazione: famiglia === DA_CLASSIFICARE ? null : `specializzazione-${idDa(famiglia)}`,
      mani,
      danno: mani === '1/2' ? { una_mano: a, due_mani: b } : mani === 2 ? { una_mano: null, due_mani: a } : { una_mano: a, due_mani: null },
      ...(proprieta.some((p) => p.nome === 'Danno Magico') ? { natura_danno: 'Magico' } : {}),
      portata_q: Number(r.Q),
      gittata_q: null,
      for_richiesta: Number(r.FOR),
      inc: null,
      pi: Number(r.PI),
      qualita: r['Qualità'],
      ps_int: Number(r['PS INT']),
      reperibilita: r.REP,
      costo: Number(r.Costo.replace(/\./g, '')),
      proprieta,
      manovre: imp.manovre === 'quelle generali' ? ['generali'] : imp.manovre.split(', '),
      ...(att ? { attivazione: att } : {}),
      ...(munizioni ? { munizioni } : {}),
    });
  }
  // note del catalogo: dal punto dopo l'ultima riga dei modelli al titolo successivo
  const resto = testo.slice(fine);
  const stop = resto.search(new RegExp(` ${esc(TITOLI[cat])} (Modello|Dati|delle)?`));
  const note = resto.slice(0, stop < 0 ? undefined : stop).trim();
  if (note) notePerCatalogo[cat] = note;
}

const daClassificare = oggetti.filter((o) => o.famiglia === DA_CLASSIFICARE).map((o) => `${o.nome} (${o.catalogo})`);
const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.1.9 Cataloghi delle Corporazioni (pp. 11–17): 39 armi ravvicinate; definizioni delle proprietà dal §7.1.3–7.1.4 e dal Giocatore §5.24; lotto 4',
  _nota: 'Generato da tools/lotti/lotto4_armi_ravvicinate_corporative.mjs; da qui in poi si modifica questo file. Lo Scudo delle Guardie Sacre, elencato nel §7.1.9, è in scudi.json. «attivazione» è il danno aggiuntivo a carica (§7.1.4); «munizioni» sono le cariche della cella o i PM della riserva; «manovre» le Manovre compatibili della scheda.',
  'TODO(Davide)': [
    `Famiglia (e quindi Specializzazione del §8.8.1) di ${daClassificare.length} armi corporative che non la dichiarano e non hanno nel nome una famiglia commerciale: ${daClassificare.join(', ')}. Proposta: Katana, Wakizashi, Lama Mushashi e Lama Demontooth → Spade; Kriss → Coltelli e pugnali; Nunchaku, Nunchaku elettrificato e Catena chiodata → Armi flessibili; Bordone Templare → Mazze e bastoni; Elettrosega CSB600, Chainreaper e Sbudellatrice → ?`,
  ],
  note_per_catalogo: notePerCatalogo,
  oggetti,
};

if (scrivi) {
  mkdirSync(new URL('pulito/', LOTTO), { recursive: true });
  writeFileSync(new URL('pulito/armi_ravvicinate_corporative.csv', LOTTO), testoCsv);
  writeFileSync(new URL('armi_corporative.json', DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritti pulito/armi_ravvicinate_corporative.csv e data/equipaggiamento/armi_corporative.json (${oggetti.length} armi)`);
} else {
  for (const o of oggetti) console.log(`${o.catalogo} · ${o.nome} · ${o.famiglia} · ${o.proprieta.map((p) => p.nome).join(', ')}${o.attivazione ? ` · att ${o.attivazione.danno_extra} ${o.attivazione.natura}` : ''}${o.munizioni ? ` · ${o.munizioni.capacita} ${o.munizioni.unita}` : ''} · ${o.manovre.join(', ')}`);
  console.log('note:', Object.fromEntries(Object.entries(notePerCatalogo).map(([k, v]) => [k, `${v.slice(0, 60)}…${v.slice(-50)}`])));
}

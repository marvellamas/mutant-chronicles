// Lotto 5 del catalogo dell'equipaggiamento: armi a distanza dei cataloghi corporativi
// (Manuale degli Armamenti v0.50, §7.8, pp. 36–52).
//   node tools/lotti/lotto5_armi_distanza_corporative.mjs            prova a vuoto
//   node tools/lotti/lotto5_armi_distanza_corporative.mjs --scrivi   scrive pulito/ e il JSON
//
// Fonti (docs/lotti/lotto5-armi-distanza-corporative/): grezzo/ (tools/estrai_manuali.py
// --tabelle, pp. 37–52) e prosa/ (il §7.8 da --prosa, per titoli, proprietà e note).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. grezzo → pulito: come il lotto 2 (§7.7). Via righe e celle vuote; ogni riga «Modello | …» apre
//    una sottotabella; i record si riuniscono per modello anche fra pagine diverse. Nuovo: una riga
//    di continuazione (una cella andata a capo, «Come / arma») si unisce alla precedente per
//    indice di colonna. La tabella «Munizione | Danno | AC | RS | Proprietà» (p. 52) si legge a parte.
// 2. Corporazione e gruppo di ogni modello: titoli fuori dalle tabelle, letti dal testo in prosa
//    (il titolo è la riga che precede l'intestazione «Modello Danno AC …»). «Imperiali» → «Imperial».
// 3. Moduli integrati (PI «Condivisi», REP «Come arma», Costo «Incluso»): oggetti con `modulo_di`
//    verso l'arma principale (il nome del modulo è «Lanciagranate|Lanciafiamme <arma>»). Non si
//    comprano da soli: la scheda li mostra come profilo aggiuntivo quando l'arma è impugnata.
// 4. Testo sotto le tabelle: per ogni modello la frase che comincia con «Nome. »; se ne leggono
//    «Proprietà: …» e «Munizione di riferimento: …»; il resto è nota. Proprietà del catalogo:
//    Fratellanza, «Tutti i modelli e i moduli possiedono Purificatrice 1».
// 5. Specializzazione (§8.8.1), in quest'ordine: nome del modulo o dell'arma (Lanciagranate,
//    Lanciarazzi, Lanciafiamme, Carabina); munizione di riferimento (Granata → Lanciagranate,
//    Razzo → Lanciarazzi); gruppo del manuale (Revolver, Pistole…, Fucili a pompa…, Fucili di
//    precisione); dichiarazione nel testo («Carabina automatica», «carabina a due mani», le sei
//    «Pistole corporative di base», «segue il Lanciafiamme commerciale»); analogia con il §7.7
//    (proprietà Plasma → Armi al Plasma; Abilità Armi leggere → Pistole; gruppo Armi pesanti con
//    modalità RM RL FS → Mitragliatori).
//    Gli altri restano senza Specializzazione, con TODO(Davide).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto5-armi-distanza-corporative/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const FILE_ID = 'armi_distanza_corporative';
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
// righe con le celle piene e il loro indice di colonna; le righe di continuazione si uniscono
function righeDi(testo) {
  const out = [];
  for (const r of leggiCsv(testo)) {
    const celle = r.map((c, i) => [i, c.trim()]).filter(([, c]) => c);
    if (!celle.length) continue;
    const prec = out.at(-1);
    // continuazione: meno celle della precedente, tutte in colonne dove la precedente ha testo
    if (prec && celle.length < prec.length && prec[0][1] !== 'Modello' && celle.every(([i]) => prec.some(([j]) => j === i))) {
      for (const [i, c] of celle) { const k = prec.find(([j]) => j === i); k[1] = `${k[1]} ${c}`; }
      uniteACapo++;
      continue;
    }
    out.push(celle);
  }
  return out.map((r) => r.map(([, c]) => c));
}

const cartella = new URL('grezzo/', LOTTO);
const righe = readdirSync(cartella).filter((f) => f.endsWith('.csv')).sort()
  .flatMap((f) => righeDi(readFileSync(new URL(f, cartella), 'utf8')));
const record = new Map();
const munizioniRiferimento = [];
let intestazione = null;

for (const r of righe) {
  if (r[0] === 'Modello' || r[0] === 'Munizione') { intestazione = r; continue; }
  if (!intestazione) continue;
  if (r.length !== intestazione.length) throw new Error(`Celle ${r.length} invece di ${intestazione.length}: ${r.join(' | ')}`);
  if (intestazione[0] === 'Munizione') { munizioniRiferimento.push(r); continue; }
  const rec = record.get(r[0]) ?? { Modello: r[0] };
  intestazione.forEach((k, i) => { if (i) rec[k === 'Costo proposto' ? 'Costo' : k] = r[i]; });
  record.set(r[0], rec);
}
const COLONNE = ['Modello', 'Danno', 'AC', 'VA', 'FOR', 'Max Q', 'CC', 'INC', 'Abilità', 'Mani', 'PI', 'MOV', 'Modalità', 'Qualità', 'PS INT', 'REP', 'Costo'];
const pulito = [...record.values()];
for (const r of pulito) for (const c of COLONNE) if (r[c] === undefined) throw new Error(`${r.Modello}: manca ${c}`);

// ---------------------------------------------------------------------------
// 2. Corporazione e gruppo dai titoli del testo in prosa

const prosa = readFileSync(new URL('prosa/7.8 Cataloghi corporativi delle armi a distanza.txt', LOTTO), 'utf8').split('\n');
const CORPORAZIONI = { Alleanza: 'Alleanza', Bauhaus: 'Bauhaus', Capitol: 'Capitol', Cybertronic: 'Cybertronic', Fratellanza: 'Fratellanza', Imperiali: 'Imperial', Mishima: 'Mishima' };
const nomi = pulito.map((r) => r.Modello).sort((a, b) => b.length - a.length); // prima i nomi più lunghi
const posizione = new Map();
{
  let corp = null;
  let gruppo = null;
  prosa.forEach((riga, i) => {
    if (CORPORAZIONI[riga]) { corp = CORPORAZIONI[riga]; return; }
    if (riga.startsWith('Modello Danno AC VA FOR')) { gruppo = prosa[i - 1]; return; }
    if (riga.startsWith('Modello ')) return;
    const nome = nomi.find((n) => riga.startsWith(`${n} `));
    if (nome && !posizione.has(nome) && corp && gruppo) posizione.set(nome, { catalogo: corp, gruppo });
  });
}
for (const r of pulito) if (!posizione.has(r.Modello)) throw new Error(`${r.Modello}: Corporazione o gruppo non trovati nel testo`);

// ---------------------------------------------------------------------------
// 3–4. Testo sotto le tabelle

const testoDi = (nome) => {
  const i = prosa.findIndex((r) => r.startsWith(`${nome}. `));
  if (i < 0) return null;
  const parti = [prosa[i]];
  for (let j = i + 1; j < prosa.length; j++) {
    const r = prosa[j];
    if (r.startsWith('Modello ') || CORPORAZIONI[r] || nomi.some((n) => r.startsWith(`${n}. `)) || prosa[j + 1]?.startsWith('Modello Danno')) break;
    parti.push(r);
  }
  return parti.join(' ').replace(/\s+/g, ' ');
};

// Definizioni: come negli altri file del catalogo (Giocatore §5.24, Armamenti §7.1.3); Danno calibrato dal §7.8
const DEF = {
  Sbilanciante: 'Dopo due colpi penetranti dello stesso attacco: Prova di Forza o Destrezza; fallimento A Terra. Prova immediata; A Terra fino a quando si rialza (Giocatore §5.24).',
  Plasma: 'La Contromisura è Dissipante X. Dopo almeno 1 danno oltre l’Armatura e il superamento dell’eventuale Dissipante, il bersaglio effettua una PS di Tempra con i modificatori della fonte. Con successo evita l’effetto aggiuntivo; con fallimento subisce −2 VA per 1+1d3 Round (Giocatore §5.24).',
  Fuoco: 'La Contromisura è Ignifugo X. Dopo almeno 1 danno oltre l’Armatura e il superamento dell’eventuale Ignifugo, il bersaglio effettua una PS di Riflessi, salvo eccezione esplicita. Con successo evita lo Stato; con fallimento è Incendiato per 1+1d3 Round (Giocatore §5.24).',
  'Danno calibrato': 'Per SA30 e SA50F, i bonus ordinari al danno di Classi, Talenti e Manovre non modificano il danno del dardo. Il Magistrale si applica normalmente; sono ammessi modificatori specifici della munizione. Tiro Mirato concede il bonus al VA ma non il bonus ordinario al danno. L’effetto del contenuto del dardo si applica soltanto se almeno 1 danno supera l’Armatura. Il lanciatore determina danno e gittata, il carico del dardo determina l’effetto aggiuntivo (§7.8).',
  'Purificatrice 1': 'Purificatrice 1. Aggiunge 1 danno contro creature o servitori identificati come appartenenti all’Oscura Simmetria nella propria scheda. Il bonus si applica a ciascuna applicazione immediata di danno, prima dei moltiplicatori, delle Difese e dell’Armatura; non aumenta i danni periodici di Fuoco. È passivo, non consuma PM, non richiede Sintonizzazione e non rende da solo Magico il danno. La semplice presenza di Corruzione non rende un bersaglio valido. Il bonus è separato dal danno riportato in tabella (§7.1.3).',
  'Silenziatore incorporato': 'Lo sparo non è percepibile uditivamente. VA −2 e danno 1d6+1 comprendono già le penalità del dispositivo; non si applicano una seconda volta (§7.8, Eliminator).',
};
const PROPRIETA_CATALOGO = { Fratellanza: ['Purificatrice 1'] }; // §7.8: «Tutti i modelli e i moduli possiedono Purificatrice 1»
const PROPRIETA_A_MANO = { Eliminator: ['Silenziatore incorporato'] }; // scritta come «Silenziatore incorporato: …», non «Proprietà:»
// i moduli lanciafiamme della Fratellanza «applicano Fuoco» (§7.8)
const FUOCO_MODULI = ['Lanciafiamme Nemesis 214', 'Lanciafiamme Eruptor', 'Lanciafiamme Purifier'];
// p. 52, «Compatibilità dei nuovi cataloghi»
const RIFERIMENTO_A_MANO = {
  'Lanciagranate Nemesis 221': 'Granata standard a frammentazione',
  'Lanciagranate Volcano': 'Granata standard a frammentazione',
  'Lanciagranate Interceptor': 'Granata standard a frammentazione',
  'Lanciagranate Invader': 'Granata standard a frammentazione',
  'Lanciagranate Windrider N4': 'Granata standard a frammentazione',
  'Lanciagranate Shogun': 'Granata standard a frammentazione',
  'Lanciarazzi Daimyo': 'Razzo standard',
  'Lanciarazzi Southpaw': 'Razzo a carica maggiorata',
};

// ---------------------------------------------------------------------------
// 5. Specializzazione

const S = (x) => `specializzazione-${x}`;
const PISTOLE_DI_BASE = ['HG10', 'Bolter 10', 'P500', 'Nemesis 100', 'Belliger', 'Ronin 25AP']; // §7.8, «Pistole corporative di base»
function specializzazione(r, gruppo, riferimento, nota, proprieta) {
  const n = r.Modello;
  if (/^Lanciagranate/.test(n)) return [S('lanciagranate'), 'nome'];
  if (/^Lanciarazzi/.test(n)) return [S('lanciarazzi'), 'nome'];
  if (/^Lanciafiamme/.test(n)) return [S('lanciafiamme'), 'nome'];
  if (/^Carabina/.test(n)) return [S('carabine'), 'nome'];
  if (/^Granata/.test(riferimento ?? '')) return [S('lanciagranate'), 'munizione di riferimento'];
  if (/^Razzo/.test(riferimento ?? '')) return [S('lanciarazzi'), 'munizione di riferimento'];
  if (proprieta.includes('Plasma')) return [S('armi-al-plasma'), 'proprietà']; // come il Fucile al plasma del §7.7
  if (/^(Revolver|Pistole)/.test(gruppo)) return [S('pistole'), 'gruppo'];
  if (/^Fucili a pompa/.test(gruppo)) return [S('fucili-a-pompa-e-doppiette'), 'gruppo'];
  if (/^Fucili di precisione/.test(gruppo)) return [S('fucili-di-precisione'), 'gruppo'];
  if (PISTOLE_DI_BASE.includes(n)) return [S('pistole'), 'testo'];
  if (/Carabina automatica|Carabina priva/.test(nota ?? '') || n === 'Nemesis 21') return [S('carabine'), 'testo'];
  if (/segue il Lanciafiamme commerciale/.test(nota ?? '')) return [S('lanciafiamme'), 'testo'];
  if (r['Abilità'] === 'Leggere') return [S('pistole'), 'analogia §7.7'];
  if (/Armi pesanti/.test(gruppo) && r['Modalità'] === 'RM RL FS') return [S('mitragliatori'), 'analogia §7.7'];
  return [null, 'da classificare'];
}

// ---------------------------------------------------------------------------
// JSON

const idDa = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (s) => Number(String(s).replace(/\./g, ''));
const intero = (s) => { const n = Number(String(s).replace('−', '-').replace(/^\+/, '')); if (!Number.isInteger(n)) throw new Error(`"${s}" non è un intero`); return n; };
const ABILITA = { Leggere: 'Armi leggere', Medie: 'Armi medie', Pesanti: 'Armi pesanti', Lancio: 'Armi da lancio' };
const principaleDi = (nome) => { const m = /^(?:Lanciagranate|Lanciafiamme) (.+)$/.exec(nome); return m ? m[1] : null; };

const regole = { nome: 0, 'munizione di riferimento': 0, proprietà: 0, gruppo: 0, testo: 0, 'analogia §7.7': 0, 'da classificare': 0 };
const daClassificare = [];
const oggetti = pulito.map((r) => {
  const { catalogo, gruppo } = posizione.get(r.Modello);
  const modulo = r.PI === 'Condivisi';
  const principale = modulo ? principaleDi(r.Modello) : null;
  if (modulo && !record.has(principale)) throw new Error(`${r.Modello}: arma principale «${principale}» non trovata`);
  const nota = testoDi(r.Modello);
  const prop = /Proprietà: ([^.]+)\./.exec(nota ?? '')?.[1];
  const riferimento = /Munizione di riferimento: ([^.]+)\./.exec(nota ?? '')?.[1] ?? RIFERIMENTO_A_MANO[r.Modello] ?? null;
  const nomiProprieta = [
    ...(PROPRIETA_CATALOGO[catalogo] ?? []),
    ...(prop ? prop.split('; ') : []),
    ...(PROPRIETA_A_MANO[r.Modello] ?? []),
    ...(FUOCO_MODULI.includes(r.Modello) ? ['Fuoco'] : []),
  ];
  for (const p of nomiProprieta) if (!DEF[p]) throw new Error(`${r.Modello}: proprietà senza definizione «${p}»`);
  const [spec, perché] = specializzazione(r, gruppo, riferimento, nota, nomiProprieta);
  regole[perché]++;
  if (!spec) daClassificare.push(`${r.Modello} (${catalogo})`);
  const mani = intero(r.Mani);
  const perMunizione = r.Danno === 'Munizione';
  return {
    id: idDa(r.Modello),
    nome: r.Modello,
    tipo: 'arma_distanza',
    catalogo,
    famiglia: gruppo,
    nomi_alternativi: [],
    note_manuale: nota ?? '',
    paragrafo: '§7.8',
    versione_manuale: VERSIONE,
    abilita: ABILITA[r['Abilità']],
    specializzazione: spec,
    mani,
    danno: perMunizione ? null : (mani === 2 ? { una_mano: null, due_mani: r.Danno } : { una_mano: r.Danno, due_mani: null }),
    ...(perMunizione ? { danno_da_munizione: true } : {}),
    ac: r.AC === 'Mun.' ? 'munizione' : /^\d+$/.test(r.AC) ? Number(r.AC) : r.AC,
    modificatore_va: intero(r.VA),
    portata_q: null,
    gittata_q: num(r['Max Q']),
    munizioni: { capacita: num(r.CC), unita: 'colpi', ricarica: null, consumo: null, riferimento },
    inc: Number(r.INC),
    mov: modulo ? 0 : intero(r.MOV), // §7.8: PI, Qualità e MOV del modulo sono condivisi con l'arma principale
    modalita: r['Modalità'].split(/\s+/),
    for_richiesta: Number(r.FOR),
    pi: modulo ? null : Number(r.PI),
    qualita: r['Qualità'],
    ps_int: Number(r['PS INT']),
    reperibilita: modulo ? null : r.REP,
    costo: modulo ? null : num(r.Costo),
    proprieta: nomiProprieta.map((p) => ({ nome: p, testo: DEF[p] })),
    ...(modulo ? { modulo_di: `${FILE_ID}:${idDa(principale)}` } : {}),
  };
});

const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.8 Cataloghi corporativi delle armi a distanza (pp. 36–52): armi, moduli integrati, munizioni di riferimento dei lanciatori; lotto 5',
  _nota: 'Generato da tools/lotti/lotto5_armi_distanza_corporative.mjs; da qui in poi si modifica questo file. I moduli integrati (modulo_di) non si comprano da soli: la scheda li mostra come profilo aggiuntivo dell’arma impugnata, con alimentazione separata; PI, Qualità e MOV sono quelli dell’arma. «munizioni_riferimento» sono i dati della munizione dei lanciatori (danno, AC, RS), non bonus del lanciatore.',
  'TODO(Davide)': [
    `Specializzazione (§8.8.1) di ${daClassificare.length} armi a distanza corporative che non la dichiarano: ${daClassificare.join(', ')}. Proposta: gittata molto lunga (Eruptor, Mefisto, Archer, Assailant) → Fucili di precisione; con Raffica Lunga e Fuoco di Soppressione (M50, AR3000, Volcano, Invader, Shogun) → Fucili d’assalto; Armi pesanti con RM RL FS (Justifier, Purifier) → Mitragliatori; le altre (Panzerknacker, Mandible, Interceptor, Airbrush, Windrider N4) → Carabine.`,
    'Specializzazioni assegnate per analogia con il §7.7, da confermare: le armi con Abilità Armi leggere → Pistole (come la Pistola mitragliatrice compatta, vedi anche la domanda sul §7.7); il gruppo Armi pesanti con modalità RM RL FS → Mitragliatori; la proprietà Plasma → Armi al Plasma, anche per la pistola Hellblazer.',
  ],
  modalita: { S: 'Colpo Singolo', RB: 'Raffica Breve', RM: 'Raffica Media', RL: 'Raffica Lunga', TR: 'Tiro Rapido', FS: 'Fuoco di Soppressione', DC: 'Doppio Colpo' },
  munizioni_riferimento: munizioniRiferimento.map(([nome, danno, ac, rs, prop]) => ({
    nome, danno, ac: /^\d+$/.test(ac) ? Number(ac) : ac, rs_q: Number(rs.replace(/\s*Q$/, '')), proprieta: prop.split('; '),
  })),
  oggetti,
};

if (scrivi) {
  mkdirSync(new URL('pulito/', LOTTO), { recursive: true });
  const csv = [['Catalogo', 'Gruppo', ...COLONNE].join(','), ...pulito.map((r) => [posizione.get(r.Modello).catalogo, posizione.get(r.Modello).gruppo, ...COLONNE.map((c) => r[c])].map((c) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(','))].join('\n') + '\n';
  writeFileSync(new URL('pulito/armi_distanza_corporative.csv', LOTTO), csv);
  writeFileSync(new URL(`${FILE_ID}.json`, DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritti pulito/armi_distanza_corporative.csv e data/equipaggiamento/${FILE_ID}.json (${oggetti.length} voci)`);
} else {
  for (const o of oggetti) console.log(`${o.catalogo} · ${o.famiglia} · ${o.nome}${o.modulo_di ? ` [modulo di ${o.modulo_di.split(':')[1]}]` : ''} · ${o.specializzazione ?? '—'} · ${o.proprieta.map((p) => p.nome).join(', ')}${o.munizioni.riferimento ? ` · rif ${o.munizioni.riferimento}` : ''}`);
  console.log(`voci ${oggetti.length} (moduli ${oggetti.filter((o) => o.modulo_di).length}); righe di continuazione unite ${uniteACapo}; munizioni di riferimento ${munizioniRiferimento.length}`);
  console.log('regole della Specializzazione:', regole);
}

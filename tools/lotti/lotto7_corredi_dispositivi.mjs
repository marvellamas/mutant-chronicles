// Lotto 7 del catalogo dell'equipaggiamento: corredi e dispositivi corporativi (Manuale degli
// Armamenti v0.50, §7.12, §7.13.4–7.13.8, §7.14.4–7.14.8, §7.15.1, §7.15.4–7.15.5, §7.16.5,
// §7.17.6, pp. 69–105).
//   node tools/lotti/lotto7_corredi_dispositivi.mjs            prova a vuoto
//   node tools/lotti/lotto7_corredi_dispositivi.mjs --scrivi   scrive pulito/ e il JSON
//
// Fonti (docs/lotti/lotto7-corredi-dispositivi/): grezzo/ (tools/estrai_manuali.py --tabelle,
// pp. 69–106) e prosa/ (i paragrafi 7.12–7.17 da --prosa).
//
// Regole del generatore (documentate in docs/equipaggiamento-lotti.md):
// 1. grezzo → pulito: come i lotti 5 e 6. Ogni tabella si legge per intestazione; una tabella
//    senza colonna del nome (Jet-Chute, Dr. Diana, Iron Mastiff) prende il nome dal paragrafo.
//    Una tabella con due intestazioni impilate (APE, Iron Mastiff, Howler/Rainy Dayer) si riunisce
//    per modello o per posizione.
// 2. Qualità, PS Integrità e Reperibilità mancanti in una tabella vengono dalla frase del
//    paragrafo che le dichiara per tutto il gruppo (FRASI_COMUNI): il generatore controlla che la
//    frase ci sia davvero.
// 3. Tipi: corredi → «altro» (Kit trauma → «sanitario», Kit di pronto soccorso del §7.19);
//    dispositivi e moduli → «accessorio»; APE → «armatura»; Howler, Rainy Dayer e granate →
//    «arma_distanza»; Iron Mastiff → «altro», con le sue tabelle.
// 4. Nota di ogni oggetto: per corredi, armi e moduli il paragrafo sotto il titolo con il suo nome;
//    per i dispositivi gli intervalli di righe in ESTRATTI. Le righe che ripetono una riga di
//    tabella si tolgono; le tabelle «Voce | Regola», esiti e modalità diventano `tabelle`.
// 5. SIN delle armi (§7.15.1): la tabella diventa `sin_armi` con i riferimenti alle armi dei lotti 4
//    e 5, trovate per nome; un nome non trovato ferma il generatore.
// 6. Controllo incrociato: le righe di dati delle tabelle lette compaiono identiche nel testo in
//    prosa; altrimenti il generatore si ferma.
// 7. La Frammentazione del §7.14.7 è la Granata a frammentazione commerciale (stessi valori e
//    prezzo): non si duplica.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const LOTTO = new URL('docs/lotti/lotto7-corredi-dispositivi/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const FILE_ID = 'corredi_dispositivi';
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
const T = {};
for (const f of readdirSync(new URL('grezzo/', LOTTO)).filter((x) => x.endsWith('.csv'))) T[f.slice(0, -4)] = righeDi(readFileSync(new URL(`grezzo/${f}`, LOTTO), 'utf8'));
// tabella → record per nome, con la prima riga come intestazione
const perNome = (id) => { const [int, ...righe] = T[id]; return righe.map((r) => Object.fromEntries(int.map((k, i) => [k, r[i]]))); };
// tabella senza nome: una riga di intestazione e una di valori
const senzaNome = (id, da = 0) => Object.fromEntries(T[id][da].map((k, i) => [k, T[id][da + 1][i]]));
const colonne = (id, da = 0, a = undefined) => ({ colonne: T[id][da], righe: T[id].slice(da + 1, a) });

// ---------------------------------------------------------------------------
// Testo in prosa

const prosa = (nome) => readFileSync(new URL(`prosa/${nome}.txt`, LOTTO), 'utf8').split('\n');
const FILE_PROSA = {
  '7.12': '7.12 Corredi specialistici dell’Alleanza', '7.13': '7.13 Catalogo Capitol', '7.14': '7.14 Catalogo Imperial',
  '7.15': '7.15 Catalogo Cybertronic', '7.16': '7.16 Catalogo Mishima', '7.17': '7.17 Catalogo Fratellanza',
};
function sezione(da, a) {
  const righe = prosa(FILE_PROSA[da.slice(0, 4)]);
  const i = da.length === 4 ? 0 : righe.findIndex((r) => r.startsWith(`${da} `));
  const j = a ? righe.findIndex((r, k) => k > i && r.startsWith(`${a} `)) : righe.length;
  if (i < 0 || j < 0) throw new Error(`sezione ${da}–${a} non trovata`);
  return righe.slice(i + 1, j);
}
// righe di prosa che ripetono una riga di tabella (dati, intestazioni) si tolgono dalle note
const RIGHE_TABELLE = new Set(Object.values(T).flatMap((t) => t.map((r) => r.join(' '))));
const unisci = (righe) => righe.filter((r) => !RIGHE_TABELLE.has(r)).join(' ').replace(/\s+/g, ' ').trim();
// paragrafo sotto il titolo `nome` fino al titolo successivo fra `titoli`
function paragrafo(righe, nome, titoli) {
  const i = righe.indexOf(nome);
  if (i < 0) throw new Error(`titolo «${nome}» non trovato`);
  let j = i + 1;
  while (j < righe.length && !titoli.includes(righe[j]) && !/^7\.\d+\.\d+ /.test(righe[j])) j++;
  return unisci(righe.slice(i + 1, j));
}
// intervalli [inizio, fine] di righe, riconosciuti dalle prime e dalle ultime parole
function estratto(righe, intervalli) {
  return intervalli.map(([a, b]) => {
    const i = righe.findIndex((r) => r.startsWith(a));
    const j = righe.findIndex((r, k) => k >= i && r.endsWith(b));
    if (i < 0 || j < 0) throw new Error(`estratto «${a}» … «${b}» non trovato`);
    return unisci(righe.slice(i, j + 1));
  }).join(' ');
}
function frase(righe, testo) {
  if (!unisci(righe).includes(testo)) throw new Error(`frase non trovata nel testo: «${testo}»`);
  return testo;
}

// ---------------------------------------------------------------------------
// Oggetti

const idDa = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (s) => Number(String(s).replace(/\./g, ''));
const intero = (s) => Number(String(s).replace('−', '-'));
const oggetti = [];
const conteggio = { righe: 0 };
const base = (nome, tipo, catalogo, famiglia, paragrafo, note, extra) => {
  const o = { id: idDa(nome), nome, tipo, catalogo, famiglia, nomi_alternativi: [], note_manuale: note, paragrafo, versione_manuale: VERSIONE, ...extra };
  oggetti.push(o);
  return o;
};
const economia = (r, comune = {}) => ({
  pi: num(r.PI), qualita: r['Qualità'] ?? comune.qualita, ps_int: num(r['PS INT'] ?? r['PS Integrità'] ?? comune.ps_int),
  reperibilita: r.REP ?? comune.reperibilita, costo: num(r.Costo),
});

// Strumenti Professionali: la frase introduttiva di ogni catalogo è la proprietà comune dei corredi
const professionali = (righe, da, a) => ({ nome: 'Strumenti Professionali', testo: estratto(righe, [[da, a]]) });

// definizioni già nel catalogo (lotti 2 e 6), per non riscriverle
const giaNelCatalogo = (file, nome) => {
  const j = JSON.parse(readFileSync(new URL(`${file}.json`, DEST), 'utf8'));
  for (const o of j.oggetti) for (const p of o.proprieta ?? []) if (p.nome === nome) return p;
  throw new Error(`${file}: proprietà ${nome} non trovata`);
};

// --- Corredi -----------------------------------------------------------------------------
// [paragrafo, tabella, catalogo, sezione prosa, [inizio, fine] della frase «strumenti Professionali», valori comuni]
const CORREDI = [
  ['§7.12', '070_1', 'Alleanza', ['7.12', null], ['I cinque corredi sono strumenti Professionali', 'non cambiano il livello Professionale.'], {}],
  ['§7.13.7', '077_2', 'Capitol', ['7.13.7', '7.13.8'], ['I cinque corredi sono strumenti Professionali', 'non il livello degli strumenti.'], {}],
  ['§7.13.8', '078_1', 'Capitol', ['7.13.8', '7.13.9'], ['Queste versioni Capitol utilizzano', 'per l’attività indicata.'],
    { qualita: 'Non comune', frase: 'Sono strumenti Professionali, di Qualità Non comune, con PS Integrità 12.' }],
  ['§7.14.8', '087_2', 'Imperial', ['7.14.8', '7.14.9'], ['I nove corredi sono strumenti Professionali', 'i PI sono propri del corredo.'],
    { qualita: 'Non comune', ps_int: 12, frase: 'Tutti hanno Qualità Non comune e PS Integrità 12' }],
  ['§7.16.5', '098_1', 'Mishima', ['7.16.5', '7.16.6'], ['I corredi sono strumenti Professionali', 'si acquistano separatamente.'],
    { qualita: 'Non comune', ps_int: 12, frase: 'Tutti hanno Qualità Non comune e PS Integrità 12.' }],
  ['§7.17.6', '104_1', 'Fratellanza', ['7.17.6', '7.17.7'], ['I corredi sono strumenti Professionali', 'si acquistano separatamente.'],
    { qualita: 'Non comune', ps_int: 12, frase: 'Tutti hanno Qualità Non comune e PS Integrità 12.' }],
];
for (const [par, tab, catalogo, [da, a], [p1, p2], comune] of CORREDI) {
  const righe = sezione(da, a);
  if (comune.frase) frase(righe, comune.frase);
  // §7.13.8: «PS INT 12» è nella tabella, la Qualità nella frase
  const recs = perNome(tab);
  const titoli = recs.map((r) => {
    const n = r.Corredo;
    return righe.find((x) => x === n) ?? righe.find((x) => x.toLowerCase().endsWith(` ${n.toLowerCase()}`) && x.length < 60) ?? null;
  });
  // §7.12: il Kit trauma dell'Alleanza non ha un titolo proprio, il suo testo è il §7.12.2
  titoli.forEach((t, i) => { if (!t && recs[i].Corredo !== 'Kit trauma dell’Alleanza') throw new Error(`${catalogo}: titolo del corredo «${recs[i].Corredo}» non trovato`); });
  recs.forEach((r, i) => {
    const titolo = titoli[i] ?? r.Corredo;
    const kit = /^Kit trauma/.test(r.Corredo);
    const note = titoli[i] ? paragrafo(righe, titolo, titoli) : unisci(sezione('7.12.2', null));
    const o = base(titolo, kit ? 'sanitario' : 'altro', catalogo, kit ? 'Kit trauma' : 'Corredi professionali', par, note, {
      ...economia(r, comune),
      // §7.19 tramite §7.12.2: cinque applicazioni, ricarica da cinque 300
      ...(kit ? { applicazioni: 5, ricarica: { applicazioni: 5, costo: 300 } } : {}),
      proprieta: [professionali(righe, p1, p2)],
    });
    if (titolo !== r.Corredo) o.nomi_alternativi.push(r.Corredo);
    conteggio.righe++;
  });
}

// --- Dispositivi Capitol e Imperial ----------------------------------------------------------
{
  const r = sezione('7.13.4', '7.13.5');
  const d = perNome('074_3')[0];
  base(d.Dispositivo, 'accessorio', 'Capitol', 'Dispositivi di volo', '§7.13.4', estratto(r, [
    ['Il propulsore permette', 'complessivamente 21.500.'], ['Decollo, salita', 'continuano a funzionare normalmente.'],
  ]), { ...economia(d), tabelle: [{ titolo: 'Regole di volo', ...colonne('075_1') }, { titolo: 'Ricambi', ...colonne('075_2') }], proprieta: [] });
  conteggio.righe++;
}
{
  const r = sezione('7.13.5', '7.13.6');
  const note = estratto(r, [['Entrambi includono', 'o esoscheletri.'], ['Predisporre l’apertura', 'dalle Cadute.']]);
  for (const d of perNome('075_3')) {
    base(d.Modello, 'accessorio', 'Capitol', 'Dispositivi di volo', '§7.13.5', note, { ...economia(d), tabelle: [{ titolo: 'Confronto dei paracadute', ...colonne('076_1') }], proprieta: [] });
    conteggio.righe++;
  }
}
{
  const r = sezione('7.14.4', '7.14.5');
  const d = senzaNome('083_2');
  base('Jet-Chute Pile Driver', 'accessorio', 'Imperial', 'Dispositivi di volo', '§7.14.4', estratto(r, [
    ['Il Jet-Chute è', 'richiede un minuto.'], ['È compatibile con armature', 'modificatori delle circostanze.'], ['Rifornire il dispositivo', 'escluse armi e munizioni.'],
  ]), { ...economia(d), tabelle: [{ titolo: 'Atterraggio', ...colonne('083_3') }], proprieta: [] });
  conteggio.righe++;
}

// --- Esoscheletro APE (§7.13.6) ----------------------------------------------------------------
{
  const r = sezione('7.13.6', '7.13.7');
  const [p, e] = [senzaNome('076_2', 0), senzaNome('076_2', 2)];
  const imb = giaNelCatalogo('armature_corporative', 'Imbottita 2');
  const stab = giaNelCatalogo('armature_corporative', 'Stabile 2');
  base(p.Modello, 'armatura', 'Capitol', 'Esoscheletri', '§7.13.6', estratto(r, [
    ['APE Capitol è un modello', 'dello Steel Strider Bauhaus.'], ['Possiede Imbottita 2', 'si applica normalmente Rotto.'],
  ]), {
    categoria: 'Esoscheletro',
    ar: { totale: num(p.AR), magica: num(p['AR magica']) },
    for_richiesta: num(p['FOR pilota']),
    ...economia({ ...e, PI: p.PI }),
    rinforzi_ammessi: [], // «Nessun rinforzo esterno»
    // «Movimento: nessuna riduzione… Schivare usa Pilotare −1 VA. Furtività subisce −2 VA… Incantesimi con Potere −5 VA»
    penalita: { attacchi_distanza: 0, attacchi_ravvicinati: 0, agilita: 0, movimento_q: intero(p.MOV), lancio_potere: -5, abilita: { Furtività: -2 } },
    supporti: p.Supporti,
    autonomia: e.Autonomia,
    proprieta: [{ nome: 'Imbottita 2', testo: imb.testo }, { nome: 'Stabile 1', testo: stab.testo.replace('+2', '+1') }],
  });
  frase(r, 'Furtività subisce −2 VA per ingombro e rumore.');
  conteggio.righe++;
}

// --- Iron Mastiff (§7.14.5) ------------------------------------------------------------------
{
  const r = sezione('7.14.5', '7.14.6');
  const [a, b] = [senzaNome('084_1', 0), senzaNome('084_1', 2)];
  base('Iron Mastiff', 'altro', 'Imperial', 'Unità robotiche', '§7.14.5', estratto(r, [
    ['L’Iron Mastiff è un robot', 'consuma UMN.'], ['I VA sono propri', 'usando le normali Azioni.'], ['Presa controllata e sensori', 'personali.'],
  ]), {
    ...economia({ ...b, PI: a.PI, Costo: a.Costo }),
    tabelle: [
      { titolo: 'Profilo', colonne: ['AR', 'AR magica', 'FOR', 'PV meccanici', 'Autonomia', 'Controller'], righe: [[a.AR, a['AR magica'], a.FOR, a['PV meccanici'], b.Autonomia, b.Controller]] },
      { titolo: 'Prove e dati del robot', ...colonne('084_1', 4) },
    ],
    proprieta: [],
  });
  conteggio.righe++;
}

// --- Armi specialistiche e granate Imperial (§7.14.6–7.14.7) ----------------------------------
const MODALITA = { S: 'Colpo Singolo', TR: 'Tiro Rapido' };
{
  const r = sezione('7.14.6', '7.14.7');
  const intro = estratto(r, [['Howler e Rainy Dayer utilizzano', 'si acquistano separatamente.']]);
  frase(r, 'Qualità Non comune, PS Integrità 12 e Reperibilità Rara si applicano a entrambi i modelli');
  const t = T['085_1'];
  const i2 = t.findIndex((x, k) => k > 0 && x[0] === 'Modello');
  const prof = Object.fromEntries(t.slice(1, i2).map((x) => [x[0], Object.fromEntries(t[0].map((k, i) => [k, x[i]]))]));
  const eco = Object.fromEntries(t.slice(i2 + 1).map((x) => [x[0], Object.fromEntries(t[i2].map((k, i) => [k, x[i]]))]));
  const titoli = ['Howler', 'Rainy Dayer'];
  for (const n of titoli) {
    const p = prof[n];
    const e = eco[n];
    const howler = n === 'Howler';
    base(n, 'arma_distanza', 'Imperial', 'Armi specialistiche', '§7.14.6', `${intro} ${paragrafo(r, n, titoli)}`, {
      abilita: { Medie: 'Armi medie' }[e['Abilità']],
      // Howler: «lanciagranate da polso»; Rainy Dayer: arma da fuoco senza categoria dichiarata (TODO(Davide))
      specializzazione: howler ? 'specializzazione-lanciagranate' : null,
      // §7.14.6: il Howler è montato al polso e non impegna la mano; la Rainy Dayer spara a due mani
      mani: howler ? 0 : 2,
      danno: howler ? null : { una_mano: null, due_mani: p.Danno },
      ...(howler ? { danno_da_munizione: true } : {}),
      ac: howler ? 'munizione' : num(p.AC),
      modificatore_va: intero(p.VA),
      portata_q: null,
      gittata_q: num(p['Max Q']),
      // §7.14.7: la Granata standard a frammentazione è la munizione dei lanciagranate compatibili
      munizioni: { capacita: num(p.CC), unita: 'colpi', ricarica: null, consumo: null, riferimento: howler ? 'Granata standard a frammentazione' : null },
      inc: num(p.INC),
      mov: intero(e.MOV),
      modalita: e['Modalità'].split(/\s+/),
      for_richiesta: num(p.FOR),
      pi: num(e.PI), qualita: 'Non comune', ps_int: 12, reperibilita: 'RA', costo: num(e.Costo),
      // §7.14.6: aperta come Scudo piccolo, AR +1 passiva e Parata con modificatore 0 / −4
      ...(howler ? {} : {
        scudo_integrato: { condizione: 'aperta come Scudo', ar: { totale: 1, magica: 0 }, parata: { ravvicinata: 0, distanza: -4 } },
        tabelle: [{ titolo: 'Configurazioni', ...colonne('085_2') }],
      }),
      proprieta: [],
    });
    if (!howler) frase(r, 'Aperta, la Rainy Dayer si usa come Scudo piccolo: AR +1 passiva e Parata attiva con Difese, modificatore 0 contro attacchi ravvicinati e −4 contro attacchi a distanza');
    conteggio.righe++;
  }
}
{
  const r = sezione('7.14.7', '7.14.8');
  const intro = estratto(r, [['Le granate seguenti possono', 'i prezzi sono nel §7.20.3.']]);
  frase(r, 'il lancio a mano usa Armi da Lancio, VA 0, FOR 3, gittata massima pari a FOR × 3 Q e INC 8');
  const rs = giaNelCatalogo('armi_distanza', 'RS 1');
  const titoli = ['Fumogena', 'Elettroshock', 'Dispersione delle granate'];
  for (const g of perNome('086_1')) {
    if (g.Munizione === 'Frammentazione') continue; // regola 7: è la Granata a frammentazione commerciale
    conteggio.righe++;
    const nome = `Granata ${g.Munizione.toLowerCase()}`;
    const note = `${intro} ${paragrafo(r, g.Munizione, titoli)}`;
    const raggio = num(g.RS.replace(/\s*Q$/, ''));
    const fumo = g.Danno === '—';
    base(nome, 'arma_distanza', 'Imperial', 'Granate', '§7.14.7', note, {
      abilita: 'Armi da lancio', specializzazione: 'specializzazione-granate', mani: 1,
      danno: fumo ? null : { una_mano: g.Danno, due_mani: null },
      ...(fumo ? { nessun_danno: true } : {}),
      ...(fumo ? {} : { ac: num(g.AC) }), modificatore_va: 0, portata_q: null, gittata_q: null, gittata_per_for: 3,
      munizioni: { capacita: 1, unita: 'colpi', ricarica: null, consumo: null, riferimento: null },
      inc: 8, mov: 0, modalita: ['S'], for_richiesta: 3,
      ...economia(g),
      proprieta: [
        { nome: `RS ${raggio}`, testo: rs.testo.replace('Raggio di Scoppio 1', `Raggio di Scoppio ${raggio}`) },
        ...(fumo ? [] : [{ nome: 'Elettricità', testo: estratto(r, [['Infligge 2d4 danni Naturali', 'automaticamente la condizione Stordito.']]) }]),
      ],
    });
  }
  // la tabella della dispersione vale per tutte le granate e i lanciagranate
  for (const o of oggetti.filter((x) => x.famiglia === 'Granate' || x.nome === 'Howler')) o.tabelle = [...(o.tabelle ?? []), { titolo: 'Dispersione delle granate', ...colonne('087_1') }];
}

// --- Cybertronic (§7.15.1, §7.15.4–7.15.5) ------------------------------------------------------
{
  const r = sezione('7.15.1', '7.15.2');
  const d = perNome('090_1')[0];
  base(d['Innesto di interfaccia'], 'accessorio', 'Cybertronic', 'Innesti', '§7.15.1', estratto(r, [
    ['Il Sistema di Interfaccia Neurale, SIN', 'mediante Soppressione acustica.'], ['L’installazione dell’innesto costa', 'equivalenti standard.'],
    ['Il SIN non si aggiunge automaticamente', 'parte della dotazione del modello.'],
  ]), { ...economia(d), innesto: 'interfaccia_neurale', proprieta: [] });
  conteggio.righe++;
}
const armiCorporative = ['armi_corporative', 'armi_distanza_corporative'].flatMap((f) => JSON.parse(readFileSync(new URL(`${f}.json`, DEST), 'utf8')).oggetti.map((o) => ({ ...o, rif: `${f}:${o.id}` })));
const sinArmi = [];
{
  const t = T['090_2'];
  let prova = null;
  for (const [chi, sin, cosa] of t) {
    if (sin === 'SIN') continue; // intestazioni «Armi a distanza e moduli», «Armi ravvicinate»
    if (sin === '—') continue; // «Nessun SIN nel modello Standard»
    prova = cosa;
    // «Lanciagranate CAW2000 e AR3000»: il prefisso vale per entrambi
    const nomi = chi.split(/;\s*/).flatMap((n) => { const m = /^(Lanciagranate) (\S+) e (\S+)$/.exec(n); return m ? [`${m[1]} ${m[2]}`, `${m[1]} ${m[3]}`] : [n]; });
    for (const n of nomi) {
      const cyber = armiCorporative.filter((o) => o.catalogo === 'Cybertronic');
      // nome esatto, altrimenti per suffisso («SSW5500» → «Lanciarazzi SSW5500»)
      const esatte = cyber.filter((o) => o.nome === n);
      const trovate = esatte.length ? esatte : cyber.filter((o) => o.nome.endsWith(` ${n}`));
      if (trovate.length !== 1) throw new Error(`SIN: «${n}» corrisponde a ${trovate.length} armi Cybertronic`);
      sinArmi.push({ rif: trovate[0].rif, nome: trovate[0].nome, valore: num(sin), prova });
    }
  }
}
{
  const r = sezione('7.15.4', '7.15.5');
  const intro = estratto(r, [['I moduli sono equipaggiamenti speciali', 'cella IAS carica.'], ['La cella IAS contiene', 'propria funzione.']]);
  frase(r, 'Tutti i moduli IAS e lo Smorzatore Silent hanno Qualità Rara, PS Integrità 14 e Reperibilità Molto rara.');
  const armature = JSON.parse(readFileSync(new URL('armature_corporative.json', DEST), 'utf8')).oggetti;
  const recs = perNome('092_1');
  const titoli = recs.map((m) => m.Modulo);
  for (const m of recs) {
    // «IA3000 Shock Trooper e Silent»: il prefisso IA3000 vale per entrambi
    const nomi = m['Compatibilità'].replace(/^IA3000 (.+) e (\S+)$/, 'IA3000 $1|IA3000 $2').split('|');
    const compat = nomi.map((n) => { const a = armature.find((x) => x.nome === n); if (!a) throw new Error(`${m.Modulo}: armatura «${n}» non trovata`); return `armature_corporative:${a.id}`; });
    base(m.Modulo, 'accessorio', 'Cybertronic', 'Moduli IAS', '§7.15.4', `${paragrafo(r, m.Modulo, titoli)} ${intro}`, {
      pi: num(m.PI), qualita: 'Rara', ps_int: 14, reperibilita: 'MR', costo: num(m.Costo),
      compatibile_con: compat,
      ...(m.Modulo.startsWith('IAS3100') ? { tabelle: [{ titolo: 'Modalità', ...colonne('092_2') }] } : {}),
      proprieta: [],
    });
    conteggio.righe++;
  }
}
{
  const r = sezione('7.15.5', null);
  const d = senzaNome('094_1');
  base('Corredo di assistenza Dr. Diana', 'altro', 'Cybertronic', 'Corredi professionali', '§7.15.5', estratto(r, [['Corredo Professionale: +2 VA', 'o stati di Ferita.']]), {
    ...economia(d), applicazioni: 5, ricarica: { applicazioni: 5, costo: 300 }, proprieta: [],
  });
  conteggio.righe++;
}

// controllo incrociato: le righe di dati delle tabelle lette compaiono identiche nel testo in prosa
// (estrazione indipendente dello stesso PDF); non le intestazioni spezzate («AR / magica»)
const TABELLE_LETTE = ['070_1', '074_3', '075_3', '076_2', '077_2', '078_1', '083_2', '084_1', '085_1', '086_1', '087_2', '090_1', '092_1', '094_1', '098_1', '104_1'];
const righeProsa = new Set(Object.values(FILE_PROSA).flatMap(prosa));
let righeControllate = 0;
for (const id of TABELLE_LETTE) {
  for (const r of leggiCsv(readFileSync(new URL(`grezzo/${id}.csv`, LOTTO), 'utf8')).map((x) => x.map((c) => c.trim()).filter(Boolean)).filter((x) => x.length)) {
    const riga = r.join(' ');
    if (righeProsa.has(riga)) righeControllate++;
    else if (!/^Modello AR AR /.test(riga)) throw new Error(`${id}: riga non ritrovata nel testo: ${riga}`);
  }
}

// stesso nome in più cataloghi («Kit trauma», «Corredo di sopravvivenza ambientale»): l'id
// comprende il catalogo per tutti, così nessuno dipende dall'ordine del manuale
for (const o of oggetti) if (oggetti.some((x) => x !== o && x.nome === o.nome)) o.id = idDa(`${o.nome} ${o.catalogo}`);
if (new Set(oggetti.map((o) => o.id)).size !== oggetti.length) throw new Error('id ripetuti');

// ---------------------------------------------------------------------------

const json = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50: corredi e dispositivi corporativi (§7.12, §7.13.4–7.13.8, §7.14.4–7.14.8, §7.15.1, §7.15.4–7.15.5, §7.16.5, §7.17.6), pp. 69–105; lotto 7',
  _nota: 'Generato da tools/lotti/lotto7_corredi_dispositivi.mjs; da qui in poi si modifica questo file. «sin_armi» è la tabella SIN del §7.15.1: con l’Interfaccia Neurale in uso, +SIN al VA per colpire dell’arma. «scudo_integrato»: l’arma impugnata protegge anche come Scudo nella condizione indicata. I bonus degli strumenti Professionali (+2 VA alle attività indicate) restano testo: valgono solo per le Prove descritte.',
  'TODO(Davide)': ['Specializzazione della Rainy Dayer (§7.14.6): arma da fuoco a corto raggio con ombrello balistico, Armi medie. Il manuale non ne indica la categoria. Proposta: Carabine.'],
  modalita: MODALITA,
  sin_armi: sinArmi.map(({ rif, valore, prova }) => ({ rif, valore, prova })),
  oggetti,
};

if (scrivi) {
  mkdirSync(new URL('pulito/', LOTTO), { recursive: true });
  const COL = ['catalogo', 'famiglia', 'nome', 'tipo', 'pi', 'qualita', 'ps_int', 'reperibilita', 'costo'];
  const csv = [COL.join(','), ...oggetti.map((o) => COL.map((c) => String(o[c] ?? '')).map((c) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(','))].join('\n') + '\n';
  writeFileSync(new URL('pulito/corredi_dispositivi.csv', LOTTO), csv);
  writeFileSync(new URL(`${FILE_ID}.json`, DEST), `${JSON.stringify(json, null, 2)}\n`);
  console.log(`scritti pulito/corredi_dispositivi.csv e data/equipaggiamento/${FILE_ID}.json (${oggetti.length} oggetti)`);
} else {
  for (const o of oggetti) console.log(`${o.catalogo} · ${o.famiglia} · ${o.nome} [${o.tipo}] PI ${o.pi} ${o.qualita} ${o.ps_int} ${o.reperibilita} ${o.costo} · nota ${o.note_manuale.length} car.`);
  for (const s of sinArmi) console.log(`SIN ${s.valore} · ${s.nome} · ${s.prova}`);
  console.log(`oggetti ${oggetti.length}; righe di tabella ${conteggio.righe}; righe ritrovate nel testo ${righeControllate}; continuazioni unite ${uniteACapo}; SIN ${sinArmi.length}`);
}

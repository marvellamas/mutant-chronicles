// Lotto 1 del catalogo dell'equipaggiamento: genera data/equipaggiamento/armi.json e
// armature.json dai CSV puliti del pilota (docs/pilota-estrazione-armamenti/pulito/).
// Si esegue una volta: da lì in poi la fonte sono i JSON, che Davide può modificare.
//   node tools/lotti/lotto1_pilota.mjs            prova a vuoto
//   node tools/lotti/lotto1_pilota.mjs --scrivi   scrive i file
// Testi e annotazioni vengono dal Manuale degli Armamenti v0.50, paragrafi citati accanto.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const RADICE = new URL('../../', import.meta.url);
const PULITO = new URL('docs/pilota-estrazione-armamenti/pulito/', RADICE);
const DEST = new URL('data/equipaggiamento/', RADICE);
const VERSIONE = 'Armamenti 0.50';

function leggiCsv(nome) {
  const [testa, ...righe] = readFileSync(new URL(nome, PULITO), 'utf8').trim().split('\n').map((r) => r.split(','));
  return righe.map((r) => Object.fromEntries(testa.map((k, i) => [k, r[i]])));
}
const idDa = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const numero = (s) => Number(String(s).replace(/\./g, ''));

// §7.1.1: «Mischia indica Armi da mischia (DES), Guerra indica Armi da guerra (FOR), Corpo indica Corpo a corpo (FOR)»
const ABILITA = { Mischia: 'Armi da mischia', Guerra: 'Armi da guerra', 'Corpo a corpo': 'Corpo a corpo' };

// §7.1.1, tabella «Profilo unico / Nomi descrittivi compresi» e testo che la segue
const NOMI_ALTERNATIVI = {
  Coltello: ['Pugnale triangolare'],
  Pugnale: ['Pugnale da caccia'],
  'Spada leggera': ['Spada corta', 'Sciabola'],
  Randello: ['Bastone', 'Manganello'],
  'Arma inastata pesante': ['Alabarda', 'Azza'],
  'Ascia leggera': ['Accetta'],
};
const NOTE = {
  Tonfa: 'Comprende i modelli militari (§7.1.1).',
  Lancia: 'Portata 2 Q con entrambe le impugnature (§7.1.2).',
  Pugnale: 'Si può lanciare con il profilo a distanza del catalogo Commerciale (§7.7), stesso oggetto, prezzo e Integrità.',
  'Ascia leggera': 'Si può lanciare con il profilo a distanza del catalogo Commerciale (§7.7), stesso oggetto, prezzo e Integrità.',
};

// §7.1.3 Proprietà dei profili: testo del manuale, parola per parola. `effetto` solo per ciò che
// la scheda calcola.
const PROPRIETA = {
  'Sanguinante 1': [{ nome: 'Sanguinante 1', testo: 'Stocco e Artigli applicano Sanguinamento 1 quando infliggono almeno 1 danno dopo l’Armatura. Restano la perdita immediata, le ricorrenze all’Iniziativa della fonte e le regole di cumulo e arresto del §5.15.' }],
  Versatile: [{ nome: 'Versatile', testo: 'Spada bastarda e Lancia possono essere impugnate a una oppure a due mani, infliggendo il danno corrispondente riportato nel catalogo. Entrambe utilizzano sempre Armi da guerra.' }],
  'Difensiva +2': [{ nome: 'Difensiva +2', testo: 'Il Tonfa concede +2 VA alla Prova di Parata effettuata con quest’arma. Il beneficio non aumenta direttamente l’Armatura. Il confronto e l’impiego insieme agli Scudi sono descritti nel §7.4.', effetto: { parata_va: 2 } }],
  Montata: [{ nome: 'Montata', testo: 'Il profilo della Baionetta montata si utilizza con la baionetta fissata al fucile, impugnato a due mani.' }],
  'Immobilizzare a distanza': [{ nome: 'Immobilizzare a distanza', testo: 'La Frusta permette l’impiego descritto nel §7.1.5 entro la propria portata di 3 Q.' }],
  '−2 VA alla Parata avversaria': [{ nome: 'Parata avversaria −2 VA', testo: 'Il Mazzafrusto impone −2 VA a ogni Prova di Parata contro i propri attacchi, sia con arma sia con Scudo. La proprietà non elimina l’AR passiva dello Scudo.' }],
  'Concussivo; +1d6 a carica; 5 cariche a cella': [
    { nome: 'Concussivo e Cariche 5', testo: 'Il Tirapugni concussivo dispone di cinque cariche in una cella energetica sostituibile. Spendendone una aggiunge 1d6 danni al danno base di 2 e applica Concussivo all’attacco. A zero cariche conserva il danno ordinario di 2. La dichiarazione e l’eventuale risparmio della carica seguono il §7.1.4. Può usare la Manovra Stordire anche senza carica; Concussivo resta un effetto distinto.' },
  ],
};

function danno(mani, valore) {
  const [a, b] = valore.split('/').map((x) => x.trim());
  if (mani === '1/2') return { una_mano: a, due_mani: b };
  return mani === '2' ? { una_mano: null, due_mani: a } : { una_mano: a, due_mani: null };
}

function armi() {
  const economici = Object.fromEntries(leggiCsv('7.1.1_requisiti_economici.csv').map((r) => [r.modello, r]));
  return leggiCsv('7.1.1_armi_ravvicinate.csv').map((r) => {
    const e = economici[r.profilo];
    if (!e) throw new Error(`Manca la riga economica di ${r.profilo}`);
    const mani = r.mani.replace(/\s+/g, '');
    const proprieta = r.proprieta === '—' ? [] : PROPRIETA[r.proprieta];
    if (!proprieta) throw new Error(`Proprietà senza testo: ${r.proprieta}`);
    return {
      id: idDa(r.profilo),
      nome: r.profilo,
      tipo: 'arma_ravvicinata',
      catalogo: 'Commerciale',
      famiglia: r.famiglia,
      nomi_alternativi: NOMI_ALTERNATIVI[r.profilo] ?? [],
      note_manuale: NOTE[r.profilo] ?? '',
      paragrafo: '§7.1.1',
      versione_manuale: VERSIONE,
      abilita: ABILITA[r.abilita],
      specializzazione: `specializzazione-${idDa(r.famiglia)}`, // §8.8.1: Specializzazione nella famiglia
      mani: mani === '1/2' ? '1/2' : Number(mani),
      danno: danno(mani, r.danno_base),
      portata_q: Number(r.q), // colonna Q: portata ravvicinata (§7.1.2)
      gittata_q: null,
      for_richiesta: Number(e.for),
      inc: null, // le armi ravvicinate senza INC usano le Complicazioni ravvicinate (§7.1)
      pi: Number(e.pi),
      qualita: e.qualita,
      ps_int: Number(e.ps_int),
      reperibilita: e.rep,
      costo: numero(e.costo_proposto),
      proprieta,
    };
  });
}

function armature() {
  const economici = Object.fromEntries(leggiCsv('7.11.3_armature_civili_economici.csv').map((r) => [r.modello, r]));
  // §7.11.2: la Leggera commerciale accetta Rinforzi Leggeri o Pesanti; la Media soltanto Leggeri; la Pesante nessuno
  const rinforzi = { Leggera: ['Leggero', 'Pesante'], Media: ['Leggero'], Pesante: [] };
  return leggiCsv('7.11.3_armature_civili.csv').map((r) => {
    const e = economici[r.modello];
    return {
      id: idDa(r.modello),
      nome: r.modello,
      tipo: 'armatura',
      catalogo: 'Commerciale',
      famiglia: 'Armature civili',
      nomi_alternativi: [],
      note_manuale: 'Profilo Standard commerciale: nessuna AR magica né proprietà specialistiche native (§7.11.3).',
      paragrafo: '§7.11.3',
      versione_manuale: VERSIONE,
      categoria: r.categoria,
      ar: { totale: Number(r.ar), magica: 0 }, // §7.11: AR totale comprende l'eventuale componente magica
      for_richiesta: Number(r.for),
      pi: Number(r.pi),
      qualita: e.qualita,
      ps_int: Number(e.ps_int),
      reperibilita: e.rep,
      costo: numero(e.costo),
      rinforzi_ammessi: rinforzi[r.categoria],
      proprieta: [],
    };
  });
}

const fileArmi = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.1.1–7.1.3 (catalogo Commerciale delle armi ravvicinate); lotto 1 dal pilota di estrazione',
  _nota: 'Generato da tools/lotti/lotto1_pilota.mjs; da qui in poi si modifica questo file. «abilita» è il nome in abilita.json; «specializzazione» è l’id della Specializzazione nelle armi (§8.8.1) che si applica.',
  oggetti: armi(),
};
const fileArmature = {
  versione_manuale: VERSIONE,
  fonte: 'Manuale degli Armamenti v0.50, §7.11.1–7.11.3 (armature commerciali civili); lotto 1 dal pilota di estrazione',
  _nota: 'Le penalità dipendono dalla categoria (tabella «categorie», §7.11.1); un oggetto può indicare «penalita» proprie che sostituiscono quelle della categoria. «agilita» vale per Schivata e Prove fisiche di Atletica o Furtività ostacolate; «movimento_q» si sottrae al budget di movimento.',
  categorie: {
    Leggera: { attacchi_distanza: 0, attacchi_ravvicinati: 0, agilita: 0, movimento_q: 0, lancio_potere: -1 },
    Media: { attacchi_distanza: -1, attacchi_ravvicinati: -1, agilita: -1, movimento_q: -1, lancio_potere: -3 },
    Pesante: { attacchi_distanza: -2, attacchi_ravvicinati: -2, agilita: -2, movimento_q: -2, lancio_potere: -5 },
  },
  // §7.11.1: «Agilità comprende Schivata e Prove fisiche di Atletica o Furtività effettivamente
  // ostacolate dall’armatura; non comprende la Parata». La FOR mancante penalizza attacchi e Difese.
  abilita_agilita: ['Atletica', 'Furtività'],
  abilita_difese: 'Difese',
  regole: {
    for_mancante: 'Per ogni punto di FOR mancante rispetto al requisito: ulteriore −1 VA agli attacchi, alle Difese e alle Prove fisiche ostacolate dalla protezione (§7.11.1).',
  },
  oggetti: armature(),
};
const indice = {
  versione_manuale: VERSIONE,
  _nota: 'Elenco dei file del catalogo dell’equipaggiamento. Aggiungere un lotto = aggiungere un file in questa cartella e una riga qui. «id» è il prefisso dei riferimenti nei personaggi (es. "armi:spada-leggera").',
  // §7.1.8: sigle della reperibilità e ricerca del venditore
  reperibilita: {
    CO: { nome: 'Comune', ricerca: 'Disponibile presso un venditore appropriato; nessuna Prova.' },
    NC: { nome: 'Non comune', ricerca: 'Oratoria senza penalità.' },
    RA: { nome: 'Rara', ricerca: 'Oratoria −2 VA.' },
    MR: { nome: 'Molto rara', ricerca: 'Oratoria −4 VA.' },
  },
  file: [
    { id: 'armi', file: 'armi.json', descrizione: 'Armi ravvicinate del catalogo Commerciale (§7.1.1)' },
    { id: 'armature', file: 'armature.json', descrizione: 'Armature commerciali civili (§7.11.3)' },
  ],
};

const scrivi = process.argv.includes('--scrivi');
for (const [nome, contenuto] of [['index.json', indice], ['armi.json', fileArmi], ['armature.json', fileArmature]]) {
  const testo = `${JSON.stringify(contenuto, null, 2)}\n`;
  if (scrivi) {
    mkdirSync(DEST, { recursive: true });
    writeFileSync(new URL(nome, DEST), testo);
    console.log(`scritto   data/equipaggiamento/${nome}`);
  } else console.log(`scriverei data/equipaggiamento/${nome} (${contenuto.oggetti?.length ?? contenuto.file.length} voci)`);
}

// Il profilo delle armi letto dal Manuale degli Armamenti.
//
// Lotto 206 (16/11/2026). Fa per il catalogo delle armi quello che `tools/importa-mostri.mjs` fa per il Bestiario,
// e nasce con le lezioni dei lotti 204 e 205 già dentro, perché ricominciare da zero ci costerebbe un lotto:
//
//  1. **Le etichette si censiscono, non si indovinano.** Nel Bestiario una sola rinomina («Protezioni e Difese» →
//     «Armatura e Difese») faceva cadere 149 schede, e ce ne siamo accorti solo contandole. Qui le etichette sono
//     in `COLONNE`, una per campo del catalogo, e `etichetteNonRiconosciute()` elenca quelle che nessuna tabella
//     d'arma reclama: chi pubblica un'edizione nuova le guarda **prima** di fidarsi dei conti.
//  2. **Una lettura parziale non si scrive sopra un valore buono.** Qui non decide il lettore: il lettore dice
//     quali campi ha letto e quali no (`nonLetti`), e la regola la applica `unisciPerCampo`
//     (`src/provenienza-bestiario.js`), lo stesso punto del 204. Tre modalità di fuoco su cinque sono una lettura
//     parziale, non un elenco corto.
//  3. **Due forme dello stesso dato si leggono entrambe, con una regola e non con un elenco.** Le Modalità di
//     fuoco stanno scritte in codici («S RB TR») in 125 tabelle e in parole («Colpo Singolo, Tiro Rapido») in 4:
//     `modalitaDiCella` riconosce l'una e l'altra passando dai `nomi_alternativi` di `regole.json`, quindi un nome
//     nuovo che Davide scriva per esteso entra da sé. Le Mani hanno due grafie («1 / 2» e «1/2»).
//
// **La forma del manuale.** Il profilo di un'arma non sta in una tabella: sta in **tre tabelle parallele**, unite
// dal Modello, una sotto l'altra nello stesso blocco (catalogo › famiglia):
//
//     | Modello | Danno | AC | VA | FOR | Max Q | CC | INC |      ← il profilo di tiro
//     | Modello | Abilità | Mani | PI | MOV | Modalità |          ← come si impugna e si spara
//     | Modello | Qualità | PS INT | REP | Costo proposto |       ← che cosa costa
//
// Le armi da mischia ne hanno una sola (`| Modello | Abilità | Mani | Danno base | Q | FOR | PI |`) più quella dei
// costi. Proprietà, Specializzazione e Manovre stanno nella **prosa** sotto le tabelle, in righe che cominciano
// col nome del modello. Un modello che compare in una tabella sola è letto per quella tabella, e gli altri campi
// sono «non letti»: è il caso normale, non un errore.
//
//   node tools/importa-armi.mjs            — che cosa dicono le tabelle, e quali etichette non sono riconosciute
//   node tools/importa-armi.mjs --modello="AXIS 227"
import { registro, testoManuale } from './manuali.mjs';

/** L'edizione da cui il lettore legge: la corrente del registro, mai un numero scritto qui (nona regola, 191). */
export const edizioneArmamenti = () => `Armamenti ${registro().manuali.find((m) => m.id === 'armamenti').versione}`;

/**
 * Le colonne che il lettore riconosce: etichetta nel manuale → campo del catalogo.
 * Censite su tutte le 319 tabelle con intestazione degli Armamenti 0.86, non indovinate.
 */
export const COLONNE = {
  Modello: '_modello',
  'Modello o insieme': '_modello',
  Profilo: '_modello',
  Danno: 'danno',
  'Danno base': 'danno',
  AC: 'ac',
  VA: 'modificatore_va',
  FOR: 'for_richiesta',
  'Max Q': 'gittata_q',
  Q: 'portata_q',
  CC: '_capacita',
  INC: 'inc',
  Abilità: 'abilita',
  Mani: 'mani',
  Impugnatura: 'mani', // §7.1.1: «Numero di mani nell'impugnatura ordinaria» — è la colonna Mani con un altro nome
  PI: 'pi',
  MOV: 'mov',
  Modalità: 'modalita',
  Qualità: 'qualita',
  'PS INT': 'ps_int',
  REP: 'reperibilita',
  Costo: 'costo',
  'Costo proposto': 'costo',
  'Costo di riferimento': 'costo',
  Crediti: 'costo',
  Proprietà: 'proprieta',
  Famiglia: 'famiglia',
  Catalogo: 'catalogo',
};

/** I campi del catalogo che il lettore sa leggere da una tabella (l'ordine è quello della provenienza). */
export const CAMPI_ARMA = [
  'abilita', 'mani', 'danno', 'ac', 'modificatore_va', 'portata_q', 'gittata_q',
  'munizioni', 'inc', 'mov', 'modalita', 'for_richiesta', 'pi', 'qualita', 'ps_int',
  'reperibilita', 'costo', 'proprieta', 'specializzazione', 'manovre',
];

/**
 * L'Abilità scritta per esteso. Nelle tabelle il manuale abbrevia («Leggere», «Guerra», «Mischia»), nella prosa
 * scrive il nome intero: è una forma del testo, non una regola, e sta qui come i modi di movimento del 204.
 */
const ABILITA = {
  leggere: 'Armi leggere',
  medie: 'Armi medie',
  pesanti: 'Armi pesanti',
  guerra: 'Armi da guerra',
  mischia: 'Armi da mischia',
  lancio: 'Armi da lancio',
  corpo: 'Corpo a corpo',
  'corpo a corpo': 'Corpo a corpo',
};
export function abilitaDiCella(testo) {
  const t = String(testo ?? '').replace(/\s+/g, ' ').trim();
  if (!t || t === '—') return null;
  const k = t.toLowerCase().replace(/^armi\s+(da\s+)?/, '');
  if (ABILITA[k]) return ABILITA[k];
  if (ABILITA[t.toLowerCase()]) return ABILITA[t.toLowerCase()];
  // già per esteso, o una forma che non è un'Abilità d'arma (Atletica, Percezione…): si rende com'è
  return /^armi\b|^corpo a corpo$/i.test(t) ? t.replace(/^Armi /, 'Armi ') : t;
}

/**
 * Le Modalità di fuoco di una cella, nelle due forme del manuale: i codici («S RB TR») e i nomi per esteso
 * («Colpo Singolo, Raffica Breve»). I nomi li dà `regole.json`, quindi un nome nuovo entra da sé.
 * Torna `{ codici, nonCapite }`: una cella con anche una sola voce non capita è una **lettura parziale**.
 */
export function modalitaDiCella(testo, modalitaRegole) {
  const t = String(testo ?? '').replace(/\s+/g, ' ').trim();
  if (!t || t === '—') return { codici: [], nonCapite: [] };
  const perNome = new Map();
  for (const [cod, m] of Object.entries(modalitaRegole ?? {})) {
    for (const n of [m?.nome, ...(m?.nomi_alternativi ?? [])]) if (n) perNome.set(String(n).toLowerCase(), cod);
  }
  const codici = [];
  const nonCapite = [];
  // una cella coi codici non ha virgole e ha pezzi di 1–2 lettere maiuscole; coi nomi ha virgole o parole lunghe
  const aCodici = !t.includes(',') && t.split(/\s+/).every((p) => /^[A-Z][A-Za-z]?$/.test(p));
  const pezzi = aCodici ? t.split(/\s+/) : t.split(/\s*,\s*|\s+e\s+/);
  for (const p of pezzi) {
    const s = p.trim();
    if (!s) continue;
    if (aCodici) {
      if (modalitaRegole?.[s]) codici.push(s);
      else nonCapite.push(s);
      continue;
    }
    const cod = perNome.get(s.toLowerCase());
    if (cod) codici.push(cod);
    else nonCapite.push(s);
  }
  return { codici: [...new Set(codici)], nonCapite };
}

/**
 * Le Mani: «1», «2», e le due grafie di «una o due» («1 / 2», «1/2»), che nel catalogo è la stringa «1/2»
 * (un'arma che si impugna in entrambi i modi, col danno a due mani nel suo campo).
 */
export function maniDiCella(testo) {
  const t = String(testo ?? '').replace(/\s+/g, '').trim();
  if (/^1\/2$/.test(t)) return '1/2';
  const n = Number.parseInt(t, 10);
  return Number.isInteger(n) ? n : null;
}

/** Un numero del manuale: «2.350» sono 2350, «\+1» è 1, «—» è assente. */
export function numeroDiCella(testo) {
  const t = String(testo ?? '').replace(/\\/g, '').replace(/\s+/g, '').trim();
  if (!t || t === '—' || t === '-') return null;
  const m = t.match(/^([+−-]?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?$/);
  if (!m) return null;
  const base = Number(m[2].replace(/\./g, '') + (m[3] ? '.' + m[3] : ''));
  return m[1] === '+' ? base : m[1] ? -base : base;
}

/** Una formula di danno: «1d6+2», «1d6», «2d10×5»; un danno fisso senza dadi è «1», «2», «3» (i tirapugni). */
export function formulaDanno(testo) {
  const t = String(testo ?? '').replace(/\\/g, '').replace(/\s+/g, '').replace(/[xX×]/g, '×').trim();
  if (!t || t === '—') return null;
  if (/^\d+d\d+([+−-]\d+)?(×\d+)?$/.test(t)) return t.replace(/−/g, '-');
  if (/^\d{1,2}$/.test(t)) return t; // Tirapugni: danno fisso, nel catalogo la stringa «1»
  return null;
}

/**
 * Il danno di una cella nella forma del catalogo: `{ una_mano, due_mani }`.
 * Il manuale scrive le due impugnature con una barra — «1d8+1 / 2d6» per la spada bastarda, «1d6+1 / 1d6+3» per
 * la lancia — e il catalogo tiene i due valori a parte. `Munizione` non è un danno: lo dà la munizione caricata.
 */
export function dannoDiCella(testo) {
  const grezzo = String(testo ?? '').replace(/\\/g, '').trim();
  if (!grezzo || grezzo === '—') return null;
  if (/^mun\.?$|^muni[zc]/i.test(grezzo)) return { daMunizione: true };
  const pezzi = grezzo.split('/').map((x) => x.trim()).filter(Boolean);
  if (pezzi.length > 2) return null;
  const una = formulaDanno(pezzi[0]);
  if (!una) return null;
  // una formula sola: in quale impugnatura va lo dice le Mani, che stanno in un'altra tabella (`risolviDanno`)
  if (pezzi.length === 1) return { sola: una };
  const due = formulaDanno(pezzi[1]);
  return due ? { una_mano: una, due_mani: due } : null;
}

/**
 * Il danno nella forma del catalogo, una volta note le Mani.
 * Il catalogo tiene `{ una_mano, due_mani }` e per un'arma **solo** a due mani scrive `una_mano: null` (il
 * Lanciafiamme Purifier è `{ null, "1d10+2" }`): una formula sola va nell'impugnatura che l'arma ha davvero.
 */
export function risolviDanno(danno, mani) {
  if (!danno) return null;
  if (!('sola' in danno)) return danno;
  return mani === 2 ? { una_mano: null, due_mani: danno.sola } : { una_mano: danno.sola, due_mani: null };
}

/** Le righe del testo, senza i ritorni a capo di Windows. */
export const leggiRighe = (testo) => String(testo).replace(/\r/g, '').split('\n');

const SEPARATORE = /^\s*\|[\s:\-|]+\|\s*$/;
const pulisci = (c) => String(c).replace(/\*\*/g, '').replace(/\\/g, '').trim();

/**
 * Le tabelle del testo: `{ riga, intestazione, righe, sezione }`. La sezione è la pila dei titoli (`#`…`######`),
 * come nel 205: serve a dire in che catalogo e in che famiglia sta una tabella senza un elenco scritto a mano.
 */
export function tabelleDelTesto(righe) {
  const fuori = [];
  let pila = [];
  for (let i = 0; i < righe.length - 1; i++) {
    const h = righe[i].match(/^(#{1,6}) +(.*)/);
    if (h) {
      pila = pila.slice(0, h[1].length - 1);
      pila[h[1].length - 1] = pulisci(h[2]);
      continue;
    }
    if (!/^\s*\|/.test(righe[i]) || !SEPARATORE.test(righe[i + 1])) continue;
    const intestazione = righe[i].split('|').slice(1, -1).map(pulisci);
    const corpo = [];
    for (let k = i + 2; k < righe.length; k++) {
      if (!/^\s*\|/.test(righe[k]) || SEPARATORE.test(righe[k])) break;
      corpo.push(righe[k].split('|').slice(1, -1).map(pulisci));
    }
    fuori.push({ riga: i + 1, intestazione, righe: corpo, sezione: pila.filter(Boolean).slice(), inizio: i });
  }
  return fuori;
}

/**
 * I valori comuni che valgono per una tabella: quelli scritti nel titolo del suo blocco e quelli scritti nella
 * prosa fra l'inizio della sezione e la tabella.
 * **Per posizione, non per elenco** (lotto 205): si risale al titolo più vicino e si leggono le righe di prosa che
 * stanno in mezzo, comprese quelle di un «Regole comuni» che apre il blocco.
 */
export function comuniDiTabella(righe, t) {
  const titolo = t.sezione[t.sezione.length - 1] ?? '';
  const dalTitolo = valoriDalTitolo(titolo);
  // si risale fino al titolo di livello pari o superiore che apre la sezione, raccogliendo la prosa
  let inizio = 0;
  let livello = 7;
  for (let i = t.inizio; i >= 0; i--) {
    const h = righe[i].match(/^(#{1,6}) /);
    if (!h) continue;
    if (h[1].length < livello) { livello = h[1].length; inizio = i; }
    if (livello <= 3) break;
  }
  const prosa = righe.slice(inizio, t.inizio).filter((r) => !/^\s*\|/.test(r) && !/^#/.test(r)).join(' ');
  return { ...valoriComuni(prosa), ...dalTitolo };
}

/**
 * Vero se uno dei titoli sotto cui sta il profilo **è** questo valore: il modo di verificare che la famiglia o il
 * catalogo che il dato dichiara sia quello sotto cui il manuale mette quell'arma.
 *
 * **Si verifica, non si estrae.** Il primo tentativo ricavava famiglia e catalogo dalla gerarchia dei titoli, e
 * sbagliava: nel §7.8 il sottotitolo è la famiglia («Alleanza › Armi leggere»), nel §7.1.9 è la corporazione
 * («Cataloghi delle Corporazioni › Bauhaus»), e il lettore non ha modo di saperlo dal titolo. Indovinare avrebbe
 * dato famiglia «Bauhaus» alla Baionetta Ussara e catalogo «delle Corporazioni» a settanta voci. Il vocabolario
 * di quale sia una famiglia e quale un catalogo sta nei dati: la decisione è di chi ce l'ha, cioè del generatore,
 * che chiama questa funzione col valore che il catalogo già dichiara.
 */
export function titoliSezione(sezione) {
  return (sezione ?? [])
    .flatMap((t) => String(t).split(' › '))
    .map((g) => g.replace(/^\d[\d.]*\s+/, '').split(/\s[—–]\s/)[0].trim())
    .flatMap((t) => {
      const cat = t.match(/^Catalog[oh]i?\s+(.+?)(?:\s+(?:delle|dei|degli|di)\b.*)?$/i);
      return cat ? [t, cat[1].trim()] : [t];
    })
    .filter(Boolean);
}

export function titoloCombacia(sezione, valore) {
  if (!valore) return false;
  const k = chiaveNome(valore);
  if (!k) return false;
  // `sezioni` porta le pile già unite con « › »: si guarda titolo per titolo
  const titoli = (sezione ?? []).flatMap((t) => String(t).split(' › '));
  for (const grezzo of titoli) {
    const titolo = grezzo.replace(/^\d[\d.]*\s+/, '').split(/\s[—–]\s/)[0].trim();
    if (chiaveNome(titolo) === k) return true;
    // «7.1.1 Catalogo Commerciale delle armi ravvicinate», «7.13 Catalogo Capitol»: il nome sta dentro il titolo,
    // ed è la forma con cui il manuale intitola i suoi cataloghi — riconoscerla è leggere, non indovinare
    const cat = titolo.match(/^Catalog[oh]i?\s+(.+?)(?:\s+(?:delle|dei|degli|di)\b.*)?$/i);
    if (cat && chiaveNome(cat[1]) === k) return true;
  }
  return false;
}

/**
 * I valori che il manuale scrive **nel titolo** di un blocco, validi per tutti i suoi modelli:
 * «Carabine — FOR 4, AC 1», «Fucili a pompa — FOR 4, AC 2, Sbilanciante».
 * È lo stesso caso dell'AC di blocco del Bestiario (lotto 205): un dato che sta una volta sola, fuori dalla riga.
 */
export function valoriDalTitolo(titolo) {
  const t = String(titolo ?? '');
  const dopo = t.split(/\s[—–-]\s/).slice(1).join(' — ');
  if (!dopo) return {};
  const fuori = {};
  const proprieta = [];
  for (const pezzo of dopo.split(/\s*,\s*/)) {
    const p = pezzo.replace(/\\/g, '').trim();
    if (!p) continue;
    const forse = p.match(/^FOR\s+(\d+)$/i);
    if (forse) { fuori.for_richiesta = Number(forse[1]); continue; }
    const ac = p.match(/^AC\s+(\d+|\d+d\d+)$/i);
    if (ac) { fuori.ac = /d/.test(ac[1]) ? ac[1] : Number(ac[1]); continue; }
    if (/^[A-ZÀ-Ü][\wÀ-ü'’ ]*\d?$/.test(p)) proprieta.push(p);
  }
  if (proprieta.length) fuori.proprieta = proprieta;
  return fuori;
}

/**
 * I valori che il manuale scrive **nella prosa** di un blocco, validi per tutti i suoi modelli:
 * «Tutti i profili seguenti usano Armi Medie (INT), richiedono due mani, hanno 6 PI, Qualità Comune,
 * PS Integrità 10 e MOV 0» (§7.22.2).
 * Si riconosce dalla forma della frase, non da un elenco di paragrafi: un blocco nuovo scritto così entra da sé.
 */
export function valoriComuni(prosa) {
  const t = String(prosa ?? '').replace(/\*\*/g, '').replace(/\\/g, '');
  if (!/\b(tutti i profili|tutti i modelli|tutte le armi)\b/i.test(t)) return {};
  const fuori = {};
  const ab = t.match(/usano\s+(Armi\s+(?:Leggere|Medie|Pesanti|da\s+Guerra|da\s+Mischia|da\s+Lancio))/i);
  if (ab) fuori.abilita = abilitaDiCella(ab[1]);
  if (/richiedono\s+due\s+mani/i.test(t)) fuori.mani = 2;
  else if (/richiedono\s+una\s+(sola\s+)?mano/i.test(t)) fuori.mani = 1;
  const pi = t.match(/hanno\s+(?:[^.]{0,40}?)\b(\d+)\s+PI\b/i) ?? t.match(/\b(\d+)\s+PI\b/i);
  if (pi) fuori.pi = Number(pi[1]);
  const q = t.match(/Qualità\s+(Comune|Non comune|Rara|Molto rara|Scarsa|Leggendaria)/i);
  if (q) fuori.qualita = q[1];
  const ps = t.match(/PS\s+Integrità\s+(\d+)/i);
  if (ps) fuori.ps_int = Number(ps[1]);
  const mov = t.match(/MOV\s+([+−-]?\d+)/i);
  if (mov) fuori.mov = numeroDiCella(mov[1]);
  return fuori;
}

/** Una tabella è d'arma se la sua intestazione porta il Modello e almeno un campo del profilo. */
const PROFILO = new Set(['danno', 'abilita', 'qualita', 'costo', 'ac', 'modalita']);
export function eTabellaDArma(t) {
  const campi = t.intestazione.map((c) => COLONNE[c]);
  return campi.includes('_modello') && campi.some((c) => PROFILO.has(c));
}

/** Il nome di un modello, confrontabile: senza maiuscole, punteggiatura e spazi doppi. */
export const chiaveNome = (n) =>
  String(n ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Il «ramo» di una tabella: che genere di profilo porta. Serve a **non fondere due profili dello stesso nome**.
 *
 * Il difetto che questa funzione impedisce, trovato dal confronto col catalogo: il **Pugnale** sta nel manuale due
 * volte — fra le armi da mischia (Armi da Mischia, portata 1) e fra le armi da lancio (Armi da Lancio, gittata
 * FOR × 3, modalità S TR) — e il catalogo tiene **due voci**, una per profilo. Fondendo le due tabelle il pugnale
 * da mischia si trovava l'Abilità «Armi da lancio» e il pugnale da lancio la famiglia «Coltelli e pugnali»:
 * due valori sbagliati, scritti con la provenienza dell'edizione corrente, che al tavolo nessuno vede sbagliati.
 * Lo stesso vale per l'Ascia leggera e lo Shuriken.
 *
 * Il ramo si legge dal **titolo della sezione**, non da un elenco di nomi: «Armi da lancio» e «Armi da mischia»
 * sono famiglie del manuale, e un ramo nuovo scritto così entra da sé.
 */
export function ramoDiTabella(t) {
  const sez = t.sezione.join(' › ').toLowerCase();
  if (/armi da lancio|granate e lanci|da lancio/.test(sez)) return 'lancio';
  if (/ravvicinat|da mischia|corpo a corpo|7\.1 dati fondamentali/.test(sez)) return 'ravvicinata';
  return 'distanza';
}

/**
 * I profili letti dal manuale: Map chiave → `{ nome, ramo, letti, nonLetti, riserve, sezioni, righe }`.
 * `letti` sono i campi con un valore; `nonLetti` i campi che una tabella dichiarava e il lettore non ha capito,
 * col motivo — è quello che `unisciPerCampo` usa per non scrivere sopra un valore buono.
 *
 * La chiave è `nome` più il ramo quando lo stesso nome ha più profili: `profiloDi()` sceglie quello giusto.
 */
export function profiliArmi(testo, { modalitaRegole = null } = {}) {
  const righe = leggiRighe(testo);
  const tabelle = tabelleDelTesto(righe).filter(eTabellaDArma);
  const fuori = new Map();
  for (const t of tabelle) {
    const campi = t.intestazione.map((c) => COLONNE[c] ?? null);
    const iModello = campi.indexOf('_modello');
    const comuni = comuniDiTabella(righe, t);
    const ramo = ramoDiTabella(t);
    for (const r of t.righe) {
      const nome = r[iModello];
      if (!nome || nome === '—' || /^-+$/.test(nome)) continue;
      const k = `${chiaveNome(nome)}|${ramo}`;
      if (!chiaveNome(nome)) continue;
      if (!fuori.has(k)) fuori.set(k, { nome, ramo, letti: {}, nonLetti: {}, riserve: {}, sezioni: [], righe: [] });
      const v = fuori.get(k);
      v.righe.push(t.riga);
      const sez = t.sezione.join(' › ');
      if (!v.sezioni.includes(sez)) v.sezioni.push(sez);
      // i valori comuni del blocco valgono per chi non li ha scritti nella sua riga: la riga ha sempre ragione
      for (const [campo, val] of Object.entries(comuni)) {
        if (v.letti[campo] === undefined) v.letti[campo] = val;
      }
      for (let c = 0; c < campi.length; c++) {
        const campo = campi[c];
        if (!campo || campo === '_modello') continue;
        const cella = r[c];
        if (cella === undefined) continue;
        leggiCampo(v, campo, cella, modalitaRegole);
      }
    }
  }
  for (const v of fuori.values()) risolvi(v);
  return fuori;
}

/**
 * Il profilo di un nome nel ramo che serve, con gli altri rami come ricambio.
 * `rami` è l'ordine di preferenza: per una voce di catalogo `arma_ravvicinata` si cerca prima fra le ravvicinate.
 * **Non si fondono mai due rami**: o si trova il profilo del ramo giusto, o si prende quello dell'altro ramo
 * **intero**, perché un profilo mescolato è peggio di un profilo di un'altra tabella.
 */
export function profiloDi(profili, nome, rami = ['ravvicinata', 'distanza', 'lancio']) {
  const k = chiaveNome(nome);
  if (!k) return null;
  for (const r of rami) if (profili.has(`${k}|${r}`)) return profili.get(`${k}|${r}`);
  return null;
}

/** I rami in cui cercare il profilo di una voce di catalogo, dal suo `tipo` e dalla sua famiglia. */
export function ramiPerVoce(voce) {
  const fam = String(voce?.famiglia ?? '').toLowerCase();
  if (/lancio/.test(fam) || /granat/.test(fam)) return ['lancio', 'distanza', 'ravvicinata'];
  if (voce?.tipo === 'arma_ravvicinata') return ['ravvicinata', 'distanza', 'lancio'];
  return ['distanza', 'lancio', 'ravvicinata'];
}

/**
 * La passata finale: i campi che hanno bisogno di un altro campo per essere scritti nella forma del catalogo.
 * Il danno vuole le Mani (stanno in un'altra tabella) e la capacità va dentro `munizioni`, che tiene anche
 * l'unità e la ricarica: si cambia **la sola capacità**, perché sovrascrivere l'oggetto intero butterebbe dati
 * che il manuale non dà in tabella (è la regola del 204 applicata ai sottocampi).
 */
function risolvi(v) {
  if (v.letti.danno && typeof v.letti.danno === 'object' && 'sola' in v.letti.danno) {
    const mani = v.letti.mani ?? null;
    if (mani === null) {
      // il danno è letto ma non si sa in quale impugnatura scriverlo: è una lettura parziale, non un valore
      v.nonLetti.danno = `il manuale dà il danno «${v.letti.danno.sola}» ma non le Mani di questo modello`;
      delete v.letti.danno;
    } else {
      v.letti.danno = risolviDanno(v.letti.danno, mani);
    }
  }
  if (v.letti._capacita !== undefined) {
    v.letti.munizioni = { capacita: v.letti._capacita };
    delete v.letti._capacita;
  }
  // **Le proprietà lette per nome sono una lettura parziale, sempre e da qualunque via.** Nel catalogo una
  // proprietà è `{ nome, testo }` — il testo è la regola, che «Attacca!» e la stampa leggono — mentre il manuale
  // in tabella e nei titoli di blocco dà il **solo nome**. Scrivere i nomi butterebbe i testi: il nome serve a
  // *accorgersi* che una proprietà è cambiata, non a sostituirla. Il Judicator 100 lo dimostra: il titolo del suo
  // blocco dice «Sbilanciante», la prosa gli dà anche Purificatrice 1, e scrivere il titolo gliela toglieva.
  if (Array.isArray(v.letti.proprieta) && v.letti.proprieta.every((x) => typeof x === 'string')) {
    v.nonLetti.proprieta = `il manuale dà i soli nomi (${v.letti.proprieta.join(', ')}); il catalogo tiene nome e testo della regola`;
  }
}

/** Un campo di una cella, messo in `letti` se si è capito e in `nonLetti` col motivo se no. */
function leggiCampo(v, campo, cella, modalitaRegole) {
  const grezzo = String(cella ?? '').trim();
  if (!grezzo || grezzo === '—') return; // una cella vuota non è una lettura mancata: il manuale non dà il dato
  const segna = (val) => {
    if (val !== null && val !== undefined) v.letti[campo] = val;
    else v.nonLetti[campo] = `la cella dice «${grezzo}», che il lettore non riconosce come ${campo}`;
  };
  switch (campo) {
    case 'danno': {
      const d = dannoDiCella(grezzo);
      if (d?.daMunizione) {
        // Lanciagranate e Lanciarazzi: il danno lo dà la munizione, e il catalogo scrive `danno: null`, `ac:
        // "munizione"`. Non è un dato mancante: è il dato, scritto così.
        v.letti.danno = null;
        v.letti.ac = 'munizione';
        return;
      }
      if (d) v.letti.danno = d;
      else v.nonLetti.danno = `il danno è scritto «${grezzo}», che non è una formula di dadi`;
      return;
    }
    case 'ac': {
      if (/^mun/i.test(grezzo)) { v.letti.ac = 'munizione'; return; }
      const n = numeroDiCella(grezzo);
      if (n !== null) v.letti.ac = n;
      else if (/^\d+d\d+$/.test(grezzo.replace(/\s+/g, ''))) v.letti.ac = grezzo.replace(/\s+/g, ''); // KEP 808: AC 1d3
      else v.nonLetti.ac = `l'AC è scritta «${grezzo}»`;
      return;
    }
    case 'gittata_q': {
      const n = numeroDiCella(grezzo);
      if (n !== null) { v.letti.gittata_q = n; return; }
      // **riserva dichiarata, non lettura mancata:** per le armi da mischia lanciate il manuale dà la gittata come
      // formula («FOR × 3») e il catalogo tiene un numero. Non c'è un valore buono da proteggere — il campo è già
      // vuoto — e scrivere un numero inventato sarebbe peggio: si dichiara e si conta.
      v.riserve.gittata_q = `il manuale dà la gittata come formula «${grezzo}»: il catalogo tiene un numero`;
      return;
    }
    case 'modalita': {
      const { codici, nonCapite } = modalitaDiCella(grezzo, modalitaRegole);
      if (nonCapite.length) {
        // **la regola del 205 applicata alle modalità**: tre su cinque è parziale, non un elenco corto
        v.nonLetti.modalita = `delle modalità «${grezzo}» il lettore non riconosce ${nonCapite.join(', ')}`;
        return;
      }
      if (codici.length) v.letti.modalita = codici;
      return;
    }
    case 'abilita': {
      const a = abilitaDiCella(grezzo);
      if (a && /^Armi |^Corpo a corpo$/.test(a)) v.letti.abilita = a;
      // una cella come «Atletica» o «Difese» non è l'Abilità d'arma di quella riga: non è un dato mancante
      return;
    }
    case 'proprieta': {
      const p = grezzo.split(/\s*[;,]\s*/).map((x) => x.trim()).filter((x) => x && x !== '—');
      if (!p.length) return;
      v.letti.proprieta = p; // il marchio di lettura parziale lo mette `risolvi`, per tutte le vie di lettura
      return;
    }
    case 'reperibilita': {
      // «Come arma»: un modulo integrato ha la reperibilità dell'arma che lo porta, e nel catalogo è `null` —
      // la stessa convenzione dei PI «Condivisi» e del costo «Incluso»
      if (/^come arma/i.test(grezzo)) { v.letti.reperibilita = null; return; }
      v.letti.reperibilita = grezzo;
      return;
    }
    case 'qualita': case 'famiglia': case 'catalogo':
      v.letti[campo] = grezzo;
      return;
    case 'pi': {
      // un modulo integrato condivide i PI dell'arma che lo porta: nel catalogo è `pi: null`, ed è il dato
      if (/^condivis/i.test(grezzo)) { v.letti.pi = null; return; }
      return segna(numeroDiCella(grezzo));
    }
    case 'costo': {
      // «Incluso» (il modulo è nel prezzo dell'arma) e «Non in vendita»: nel catalogo `costo: null`
      if (/^inclus|^non in vendita|^compres/i.test(grezzo)) { v.letti.costo = null; return; }
      return segna(numeroDiCella(grezzo));
    }
    case 'mani': {
      if (/^da polso|^al polso/i.test(grezzo)) { v.letti.mani = 0; return; } // Howler: si porta al polso
      return segna(maniDiCella(grezzo));
    }
    case '_capacita': {
      const n = numeroDiCella(grezzo);
      if (n !== null) v.letti._capacita = n;
      else v.nonLetti.munizioni = `la capacità è scritta «${grezzo}»`;
      return;
    }
    default: return segna(numeroDiCella(grezzo));
  }
}

/**
 * **Le Specializzazioni, lette dalla prosa.**
 *
 * Il manuale non le mette in tabella: le assegna in frasi del §7.7 («Specializzazioni dei modelli a distanza») e
 * del §7.1.9, nella forma `<Specializzazione>: <modello>, <modello> e <modello>.` —
 *
 *     Fucili di Precisione: Eruptor, Mefisto, Archer e Assailant.
 *     Armi al Plasma: Hellblazer, KEP 808 e Intruder.
 *     Armi a Sega: Elettrosega CSB600, Chainreaper e Sbudellatrice.
 *
 * Perché è importante leggerle, e non ereditarle: la Specializzazione dà **+1 VA e +1 danno** (§7.1), quindi una
 * famiglia che si sposta cambia il tiro di chi ha quella Specializzazione, e si vede al tavolo subito. Senza
 * questa lettura ogni voce del catalogo resterebbe «mista» per il solo campo `specializzazione`, e un ⚑ che è
 * sempre accesso non dice niente (la lezione del 183 e del 204: un segno vale se si spegne).
 *
 * I nomi delle Specializzazioni non stanno qui: si passano da `data/specializzazioni.json`, perché un nome nuovo
 * deve entrare dai dati e non da un elenco scritto in uno strumento.
 *
 * @param nomi  Map nome della Specializzazione → id (da `data/specializzazioni.json`)
 * @returns Map chiave del modello → `{ id, nome, riga }`
 */
export function specializzazioniDaProsa(testo, nomi) {
  const righe = leggiRighe(testo);
  const fuori = new Map();
  const perNome = new Map([...nomi].map(([n, id]) => [n.toLowerCase().replace(/[’']/g, "'"), id]));
  for (let i = 0; i < righe.length; i++) {
    const r = righe[i];
    if (/^\s*\|/.test(r) || /^#/.test(r)) continue;
    // ogni frase della riga: «Nome: elenco.» — una riga può portarne più di una
    for (const m of r.replace(/\*\*/g, '').matchAll(/(?:^|[.;]\s+)([A-ZÀ-Ü][\wÀ-ü'’ ]{2,40}?):\s+([^.;]+)/g)) {
      const nome = m[1].trim().toLowerCase().replace(/[’']/g, "'");
      const id = perNome.get(nome);
      if (!id) continue;
      for (const pezzo of m[2].split(/\s*,\s*|\s+e\s+/)) {
        const p = pezzo.replace(/\\/g, '').trim().replace(/\.$/, '');
        if (!p || p.length < 2) continue;
        // l'elenco contiene anche frasi («pistole ordinarie e mitragliette»): un modello è un nome proprio, e un
        // nome proprio ha una maiuscola o una cifra. Un pezzo che non ce l'ha non è un modello e si salta.
        if (!/[A-ZÀ-Ü]/.test(p[0]) && !/\d/.test(p)) continue;
        const k = chiaveNome(p);
        if (!k || fuori.has(k)) continue;
        fuori.set(k, { id, nome: m[1].trim(), riga: i + 1 });
      }
    }
  }
  return fuori;
}

/**
 * Le etichette di tabella che nessuna colonna riconosce, con quante volte compaiono.
 * **Il controllo che il Bestiario ci ha insegnato a fare prima di fidarci dei conti:** se un'edizione nuova
 * rinomina una colonna, qui compare, e nessun conto diventa verde per sbaglio.
 */
export function etichetteNonRiconosciute(testo) {
  const tabelle = tabelleDelTesto(leggiRighe(testo));
  const conte = new Map();
  for (const t of tabelle) {
    if (!eTabellaDArma(t)) continue;
    for (const c of t.intestazione) {
      if (COLONNE[c] || !c || c === '—') continue;
      conte.set(c, (conte.get(c) || 0) + 1);
    }
  }
  return [...conte.entries()].sort((a, b) => b[1] - a[1]).map(([etichetta, quante]) => ({ etichetta, quante }));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const { readFileSync } = await import('node:fs');
  const regole = JSON.parse(readFileSync('data/regole.json', 'utf8'));
  const testo = testoManuale('armamenti');
  const p = profiliArmi(testo, { modalitaRegole: regole.modalita_di_fuoco });
  const arg = process.argv.slice(2).find((a) => a.startsWith('--modello='));
  if (process.argv.includes('--specializzazioni')) {
    const sp = JSON.parse(readFileSync('data/specializzazioni.json', 'utf8'));
    const nomi = new Map((sp.specializzazioni ?? []).map((s) => [s.nome, s.id]));
    const m = specializzazioniDaProsa(testo, nomi);
    console.log(`${m.size} modelli con la Specializzazione scritta nella prosa.`);
    for (const [k, v] of m) console.log(`  ${k} → ${v.nome} (riga ${v.riga})`);
    process.exit(0);
  }
  if (arg) {
    const nome = arg.slice('--modello='.length);
    const trovati = [...p.values()].filter((v) => chiaveNome(v.nome) === chiaveNome(nome));
    console.log(trovati.length ? JSON.stringify(trovati, null, 1) : 'modello non trovato nel manuale');
  } else {
    console.log(`${edizioneArmamenti()}: ${p.size} modelli letti dalle tabelle d'arma.`);
    const ignote = etichetteNonRiconosciute(testo);
    console.log(ignote.length
      ? `Etichette non riconosciute: ${ignote.map((x) => `${x.etichetta} (${x.quante})`).join(', ')}`
      : 'Nessuna etichetta non riconosciuta nelle tabelle d’arma.');
    const parziali = [...p.values()].filter((v) => Object.keys(v.nonLetti).length);
    console.log(`Modelli con almeno un campo non letto: ${parziali.length}`);
    for (const v of parziali.slice(0, 20)) console.log(`  ${v.nome}: ${Object.entries(v.nonLetti).map(([c, m]) => `${c} — ${m}`).join('; ')}`);
    const conRiserve = [...p.values()].filter((v) => Object.keys(v.riserve).length);
    console.log(`Modelli con una riserva dichiarata: ${conRiserve.length}`);
    for (const v of conRiserve.slice(0, 6)) console.log(`  ${v.nome}: ${Object.values(v.riserve).join('; ')}`);
  }
}

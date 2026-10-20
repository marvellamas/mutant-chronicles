// Quale file è davvero l'ultimo? (20/10/2026, parte C del lotto «chi tiene l'originale»)
//
// Lo strumento della pulizia sceglieva l'originale dalla data del file. Non basta: sui file di Marcello cinque PG su
// sette avevano la stessa ora (20/10 09:24) perché erano stati riscritti tutti insieme dal recupero del lunedì, e sui
// file veri del Direttore può succedere lo stesso. La data del file dice quando è stato *toccato*, non quanto è
// *avanti* il personaggio. Scegliere il file sbagliato significa perdere una sessione di gioco.
//
// Qui si guarda dentro: livello e PX, PV e PM attuali, oggetti e crediti, l'ultima data del calendario di gioco,
// Ferite, Affaticamento e Stati. Poi si propone, con il motivo; e quando i segni non concordano — uno ha più PX,
// l'altro un calendario più avanti — non si sceglie: si dichiara **caso dubbio**, e quello lo guarda il Direttore.
//
// Funzioni pure: leggono oggetti già caricati, non il disco (tools/pulizia-personaggi.mjs).

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const lista = (v) => (Array.isArray(v) ? v : []);

/**
 * L'ultima data del calendario di gioco del personaggio: la più avanti fra «oggi» e le note. Le date sono
 * «AAAA-MM-GG» del calendario di gioco (src/calendario.js), quindi si confrontano come testo. null se non c'è.
 */
export function ultimaDataCalendario(o) {
  const c = o?.calendario;
  if (!c) return null;
  const date = [c.oggi?.data, ...lista(c.note).map((x) => x?.data)].filter((d) => typeof d === 'string' && /^\d{3,4}-\d{2}-\d{2}$/.test(d));
  return date.length ? date.sort().at(-1) : null;
}

/**
 * I segni che stanno dentro un file di personaggio: quello che serve a capire quale è più avanti.
 * @param o il personaggio letto dal file
 * @param file { file, mtime } il nome e la data del file
 */
export function segniDi(o, { file = '', mtime = 0 } = {}) {
  const s = o?.sessione ?? {};
  return {
    file,
    mtime,
    nome: String(o?.scelte?.nome ?? '').trim() || null,
    livello: 1 + lista(o?.livelli).length,
    px: n(o?.scelte?.puntiEsperienza),
    pv: n(s.pvAttuali),
    pm: n(s.pmAttuali),
    oggetti: lista(o?.scelte?.equipaggiamento).length,
    crediti: n(s.crediti),
    calendario: ultimaDataCalendario(o),
    ferite: n(s.ferite) || 0,
    affaticamento: n(s.affaticamento) || 0,
    stati: lista(s.statiAttivi).filter((x) => typeof x === 'string'),
    versioneSalvataggio: n(o?.versione_salvataggio),
  };
}

/** I segni in una riga leggibile, per il rapporto. */
export function rigaSegni(g, { quando = (ms) => new Date(ms).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) } = {}) {
  const pezzi = [
    `livello ${g.livello}`,
    g.px === null ? 'PX non segnati' : `${g.px} PX`,
    `PV ${g.pv ?? '—'}`,
    `PM ${g.pm ?? '—'}`,
    `${g.oggetti} oggetti`,
    `${g.crediti ?? '—'} cr`,
    g.calendario ? `calendario al ${g.calendario}` : 'calendario non attivo',
  ];
  const condizioni = [
    g.ferite ? `Ferite ${g.ferite}` : null,
    g.affaticamento ? `Affaticamento ${g.affaticamento}` : null,
    g.stati.length ? `Stati: ${g.stati.join(', ')}` : null,
  ].filter(Boolean);
  if (condizioni.length) pezzi.push(condizioni.join(' · '));
  if (g.versioneSalvataggio) pezzi.push(`salvataggio n. ${g.versioneSalvataggio}`);
  return `${pezzi.join(' · ')} — ${quando(g.mtime)} — ${g.file}`;
}

// I segni che dicono «questo personaggio è più avanti», dal più affidabile. Il livello decide da solo: un personaggio
// non torna indietro di livello. Calendario di gioco e PX pesano uguale e crescono con la storia: se si contraddicono,
// non si sceglie. I PV, i PM, gli oggetti e i crediti non entrano nella scelta — si curano, si spendono, si vendono —
// ma si stampano lo stesso, perché a occhio dicono molto.
const CRITERI = [
  { id: 'livello', nome: 'il livello più alto', peso: 1, valore: (g) => g.livello },
  { id: 'calendario', nome: 'il calendario più avanti', peso: 2, valore: (g) => g.calendario ?? null, testo: true },
  { id: 'px', nome: 'più PX', peso: 2, valore: (g) => g.px },
  { id: 'versione', nome: 'il numero di salvataggio più alto', peso: 3, valore: (g) => g.versioneSalvataggio },
];

const confronta = (a, b, c) => {
  const x = c.valore(a);
  const y = c.valore(b);
  if (x === null || y === null || x === undefined || y === undefined) return 0;
  return x === y ? 0 : x > y ? 1 : -1;
};

/**
 * Quale file proporre come originale, e perché. Guarda i segni dentro, non la data del file; la data serve solo come
 * ultima risorsa, e quando è l'unico segno a distinguerli lo dice.
 * I criteri si guardano per peso: il livello decide da solo; calendario e PX pesano uguale e, se indicano file diversi,
 * non si sceglie — è un **caso dubbio** che guarda il Direttore.
 * @param segni [{…}] i segni di tutti i file dello stesso personaggio
 * @returns {{ proposto, motivo, dubbio: string|null, confronti: string[] }}
 */
export function proponiOriginale(segni) {
  const tutti = [...(segni ?? [])];
  if (!tutti.length) return { proposto: null, motivo: 'nessun file', dubbio: null, confronti: [] };
  if (tutti.length === 1) return { proposto: tutti[0], motivo: 'è l’unico file', dubbio: null, confronti: [] };
  // per ogni criterio: chi è in cima, e se quel criterio distingue davvero qualcuno
  const migliori = CRITERI.map((c) => {
    const cima = [...tutti].sort((a, b) => confronta(b, a, c))[0];
    const pari = tutti.filter((g) => confronta(g, cima, c) === 0);
    const utile = c.valore(cima) !== null && c.valore(cima) !== undefined && pari.length < tutti.length;
    return { c, cima, utile };
  }).filter((m) => m.utile);
  const confronti = migliori.map((m) => `${m.c.nome}: ${m.cima.file}`);
  if (!migliori.length) {
    // nessun segno li distingue: resta la data del file, e va detto
    const perData = [...tutti].sort((a, b) => b.mtime - a.mtime);
    const stessaData = perData.every((g) => Math.abs(g.mtime - perData[0].mtime) < 1000);
    return {
      proposto: perData[0],
      motivo: 'livello, PX e calendario sono uguali in tutti: resta la data del file (gli altri valori si vedono sopra)',
      dubbio: stessaData ? 'i file hanno gli stessi valori e la stessa data: non si distinguono' : null,
      confronti,
    };
  }
  // si guarda il peso più importante fra quelli che distinguono: se lì sono d'accordo, decide; altrimenti è un dubbio
  const peso = Math.min(...migliori.map((m) => m.c.peso));
  const decisivi = migliori.filter((m) => m.c.peso === peso);
  const indicati = [...new Set(decisivi.map((m) => m.cima.file))];
  if (indicati.length > 1) {
    return {
      proposto: null,
      motivo: 'i segni non concordano',
      dubbio: `${decisivi.map((m) => `${m.c.nome} in ${m.cima.file}`).join(', ')}: scegli tu quale tenere`,
      confronti,
    };
  }
  return {
    proposto: decisivi[0].cima,
    motivo: `ha ${decisivi.map((m) => m.c.nome).join(' e ')}`,
    dubbio: null,
    confronti,
  };
}

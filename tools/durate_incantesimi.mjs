// Durata di ogni incantesimo nei dati (richiesta di Marcello del 03/10/2026: «Lancia!» registra le durate come le
// Tecniche Interiori). Scrive data/incantesimi.json → incantesimi[].meccanica.durata, che dice quale colonna della
// tabella delle versioni dà la durata (i valori restano nelle versioni, uno per livello), con o senza Concentrazione,
// le modalità con durate diverse e, per gli incantesimi senza colonna, se l'effetto è istantaneo, dura fino a una
// condizione o è una procedura. Marchio Psichico: la seconda tabella del manuale (durate di inseguimento e di
// combattimento) mancava nelle versioni e si aggiunge qui, letta da docs/manuali-txt/magia.md.
// Regole di scadenza: data/regole.json → durate_round (Magia, «Scadenze e interruzione degli effetti»).
//   node tools/durate_incantesimi.mjs           → controlli e riepilogo per tipo
//   node tools/durate_incantesimi.mjs --scrivi  → scrive data/incantesimi.json
import { readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../', import.meta.url);
const file = new URL('data/incantesimi.json', R);
const testo = readFileSync(file, 'utf8');
const dati = JSON.parse(testo);
const md = readFileSync(new URL('docs/manuali-txt/magia.md', R), 'utf8').split(/\r?\n/);
const scrivi = process.argv.includes('--scrivi');
const pulisci = (s) => String(s).replace(/\*\*/g, '').replace(/\\/g, '').trim();
const livello = (r) => Number(r?.Livello ?? r?.['Livello e PM']);

// Marchio Psichico (scheda 20.8): seconda tabella del manuale, una riga per livello
function tabellaMarchio() {
  const a = md.findIndex((r) => r.startsWith('Scheda 20.8 '));
  const i = md.findIndex((r, k) => k > a && /^\| \*\*Livello\*\* \| \*\*Portata inseguimento\*\*/.test(r));
  if (a < 0 || i < 0) throw new Error('Marchio Psichico: seconda tabella non trovata nel manuale');
  const testa = md[i].split('|').map(pulisci).filter(Boolean);
  const out = new Map();
  for (let k = i + 1; md[k]?.startsWith('|'); k++) {
    const c = md[k].split('|').map(pulisci).filter((x, j, arr) => j > 0 && j < arr.length - 1);
    out.set(Number(c[0]), Object.fromEntries(testa.map((t, j) => [t, c[j]])));
  }
  return out;
}

// incantesimi senza colonna di durata: che cosa dice la scheda (lancio, descrizione, regole)
const SENZA_COLONNA = {
  istantanea: ['Colpo Elementale', 'Esplosione Elementale', 'Cono Elementale', 'Respingere', 'Teletrasporto', 'Dardo Psichico', 'Cura Ferite', 'Cura Spirituale', 'Esorcizzare Oscurità',
    'Dardo Spirituale', 'Negare Potere', 'Identificare Potere', 'Rompere Vincolo', 'Esorcizzare Possessione', 'Guarigione'],
  procedura: ['Cura Malattie', 'Cura Avvelenamenti', 'Recupero Rapido', 'Esorcizzare Corruzione', 'Psicometria', 'Rigenerazione', 'Impronta Mistica'],
  condizione: { Comando: 'fino alla fine del primo turno del bersaglio successivo al lancio, senza Concentrazione' },
};
// modalità con durate diverse (il giocatore la sceglie al lancio)
const MODALITA = {
  'Resistenza Fisica': [{ id: 'A', nome: 'Tempra', colonna: 'Durata A' }, { id: 'B', nome: 'Privazioni', colonna: 'Durata B' }],
  Efficienza: [{ id: 'A', nome: 'Operativa', colonna: 'Durata A' }, { id: 'B', nome: 'Combattiva', colonna: 'Durata B' }],
  'Marchio Psichico': [{ id: 'inseguimento', nome: 'Inseguimento', colonna: 'Durata inseguimento' }, { id: 'combattimento', nome: 'Combattimento', colonna: 'Durata combattimento' }],
};
const COLONNE_FISSE = ['Durata', 'Durata fissa', 'Senza Concentrazione', 'Durata max', 'Durata periodica', 'Durata alterazione', 'Durata interfer.'];
const COLONNE_CON = ['Durata max Con', 'Durata Con', 'Durata con Conc', 'Con Concentrazione', 'Concentrazione massima', 'Concentr. massima'];
const VALORE = /^(\d+ (RND|min|minuti|minuto|ora|ore|giorno|giorni|anno|anni)|Istantanea|Istantanea con risposta|—)$/;

const conteggio = {};
const conta = (k) => { conteggio[k] = (conteggio[k] ?? 0) + 1; };
const marchio = tabellaMarchio();
for (const inc of dati.incantesimi) {
  const m = (inc.meccanica ??= {});
  const colonne = Object.keys(inc.versioni?.[0] ?? {});
  const regole = String(inc.regole ?? '');
  let durata;
  if (inc.nome === 'Marchio Psichico') {
    // le due durate della versione, dalla seconda tabella del manuale
    for (const v of inc.versioni) {
      const riga = marchio.get(livello(v));
      if (!riga) throw new Error(`Marchio Psichico: livello ${livello(v)} assente dalla seconda tabella`);
      v['Durata inseguimento'] = riga['Durata inseguimento'];
      v['Durata combattimento'] = riga['Durata combattimento'];
    }
    durata = { tipo: 'durata', modalita: MODALITA[inc.nome], fonte: 'Magia, scheda 20.8 (seconda tabella)' };
  } else if (MODALITA[inc.nome]) {
    durata = { tipo: 'durata', modalita: MODALITA[inc.nome] };
  } else {
    const fissa = COLONNE_FISSE.find((c) => colonne.includes(c)) ?? null;
    const con = COLONNE_CON.find((c) => colonne.includes(c)) ?? null;
    if (fissa || con) {
      durata = { tipo: 'durata', ...(fissa ? { colonna: fissa } : {}), ...(con ? { concentrazione: con } : {}) };
      // Scudo: «la durata massima è il doppio della durata fissa in tabella»
      if (!con && m.concentrazione === 'a_scelta' && /durata massima è il doppio della durata fissa/.test(regole)) durata.concentrazione_doppia = true;
      if (!con && m.concentrazione === 'a_scelta' && !durata.concentrazione_doppia) {
        throw new Error(`${inc.nome}: Concentrazione a scelta ma nessuna colonna di Concentrazione (colonne: ${colonne.join(', ')})`);
      }
    } else if (SENZA_COLONNA.istantanea.includes(inc.nome)) {
      durata = { tipo: 'istantanea' };
    } else if (SENZA_COLONNA.procedura.includes(inc.nome)) {
      durata = { tipo: 'procedura', testo: 'effetto alla fine della procedura descritta nella scheda; nessuna durata da contare' };
    } else if (SENZA_COLONNA.condizione[inc.nome]) {
      durata = { tipo: 'condizione', testo: SENZA_COLONNA.condizione[inc.nome] };
    } else throw new Error(`${inc.nome}: durata non classificata (colonne: ${colonne.join(', ')})`);
  }
  // controlli: ogni colonna nominata esiste in ogni versione, con un valore riconosciuto
  const nominate = [durata.colonna, durata.concentrazione, ...(durata.modalita ?? []).map((x) => x.colonna)].filter(Boolean);
  for (const v of inc.versioni ?? []) for (const c of nominate) {
    if (!(c in v)) throw new Error(`${inc.nome} livello ${livello(v)}: manca la colonna «${c}»`);
    if (!VALORE.test(String(v[c]).trim())) throw new Error(`${inc.nome} livello ${livello(v)}: «${c}» = «${v[c]}» non riconosciuto`);
  }
  m.durata = durata;
  conta(durata.tipo === 'durata' ? (durata.modalita ? 'durata, a modalità' : durata.concentrazione || durata.concentrazione_doppia ? (durata.colonna ? 'durata fissa o a Concentrazione' : 'solo a Concentrazione') : 'durata fissa') : durata.tipo);
}
console.log(conteggio);
// valori delle durate per tipo (Round, tempo, istantanea)
const valori = { round: 0, tempo: 0, altro: 0 };
for (const inc of dati.incantesimi) {
  const d = inc.meccanica.durata;
  for (const v of inc.versioni ?? []) for (const c of [d.colonna, d.concentrazione, ...(d.modalita ?? []).map((x) => x.colonna)].filter(Boolean)) {
    const s = String(v[c]);
    valori[/RND$/.test(s) ? 'round' : /^\d/.test(s) ? 'tempo' : 'altro'] += 1;
  }
}
console.log('valori per versione:', valori);
if (scrivi) {
  writeFileSync(file, `${JSON.stringify(dati, null, 2)}\n`);
  console.log('scritto data/incantesimi.json');
}

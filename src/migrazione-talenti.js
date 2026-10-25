// Passaggio dei personaggi ai Talenti v1.0 (lotto 2, 25/10/2026): che cosa cambia in un file di personaggio.
// Funzioni pure, sui file come oggetti (l'export di src/character.js → serializza); il programma che legge la cartella,
// fa la copia di sicurezza, chiede SI e scrive è tools/migra-talenti.mjs.
//
// Per ogni personaggio dei Talenti di prima:
//  - una riga nel registro «Modifiche del master» con data e «Talenti prima del passaggio: …» (dai «vecchi» di
//    postiTalenti), che resta leggibile e che un tablet non toglie; con una modifica del master nel file la scheda di
//    un tablet prende la versione del Direttore (non rimette i Talenti tolti);
//  - via «talentoLibero» dalle voci di livello, e scelte.regimeTalenti = 2. I posti restano vuoti: li riempie la scelta
//    guidata della scheda. Niente altro cambia: Tecniche e incantesimi legati a un Talento tolto restano (A.184).
// Il conto dei posti è quello di postiTalenti, e non si rifà qui.
import { postiTalenti, calcolaSchedaPersonaggio } from './avanzamento.js';
import { nuovaCorrezione, aggiungiCorrezione } from './correzioni-master.js';

const personaggio = (o) => ({ creazione: o?.scelte ?? {}, livelli: Array.isArray(o?.livelli) ? o.livelli : [] });
const NOMI = { talento_libero: 'Talento Libero', maestria: 'Maestria', specializzazione: 'Specializzazione' };
const conAccento = (n) => `${n}°`;

/** Il file dopo il passaggio, senza controlli (pianoMigrazione li fa prima). */
function migrato(o, vecchi, quando) {
  const data = quando.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const elenco = vecchi.length
    ? vecchi.map((v) => `${v.nome}${v.parametro ? ` (${v.parametro})` : ''}${v.annotazione ? ` [${v.annotazione}]` : ''} al ${conAccento(v.livello)} livello`).join('; ')
    : 'nessuno';
  const riga = nuovaCorrezione({
    chiave: 'talenti', tipo: 'scelta', migrazioneTalenti: true,
    etichetta: `Talenti prima del passaggio ai Talenti v1.0 (${data}): ${elenco}`,
    motivo: 'Passaggio ai Talenti v1.0: i Talenti si riscelgono dalla scheda («Da scegliere»).',
  }, quando);
  return {
    ...o,
    scelte: { ...o.scelte, regimeTalenti: 2 },
    livelli: (o.livelli ?? []).map((v) => { const x = { ...v }; delete x.talentoLibero; return x; }),
    correzioni_master: aggiungiCorrezione(o.correzioni_master, riga),
  };
}

/**
 * Che cosa succede a un personaggio con il passaggio: i Talenti di oggi con la loro categoria nuova, i posti da
 * riempire, i casi da guardare, e il file nuovo (null se è già nei Talenti nuovi o non si calcola).
 * @returns {{ nome, livello, giaMigrato, vecchi, posti: { [cat]: n }, casi: string[], nuovo }}
 */
export function pianoMigrazione(o, dati, { quando = new Date() } = {}) {
  const nome = String(o?.scelte?.nome ?? '').trim() || 'Senza nome';
  const p = personaggio(o);
  const livello = 1 + p.livelli.length;
  if (o?.scelte?.regimeTalenti === 2) return { nome, livello, giaMigrato: true, vecchi: [], posti: {}, casi: [], nuovo: null };
  let posti;
  try { posti = postiTalenti(p, dati, { opzioni: false }); } catch (e) {
    return { nome, livello, giaMigrato: false, vecchi: [], posti: {}, casi: [`la scheda non si calcola (${e.message}): non lo tocco`], nuovo: null };
  }
  const nuovo = migrato(o, posti.vecchi, quando);
  const casi = [];
  // Tecniche e incantesimi legati a un Talento tolto (A.184: non si toccano, decide il Direttore)
  const dopo = calcolaSchedaPersonaggio(personaggio(nuovo), dati);
  for (const e of dopo.errori ?? []) {
    if (/tecniche|incantesimi/.test(e.campo)) casi.push(`${e.problema} — legate a un Talento tolto: restano, decide il Direttore (A.184)`);
  }
  // i Talenti di oggi ripresi nella loro categoria, nei posti in ordine di livello: un prerequisito che non torna
  // si vede qui (A.183: vale l'ordine di livello; il Direttore può forzare da «Modifica master»)
  let prova = personaggio(nuovo);
  const liberi = posti.posti.map((x) => ({ ...x }));
  const fuori = [];
  for (const v of posti.vecchi) {
    const id = v.sostituitoDa ?? v.id;
    const posto = liberi.find((x) => x.categoria === v.categoria && !x.preso);
    if (!posto) { fuori.push(v); continue; }
    posto.preso = true;
    prova = applica(prova, posto, { id, parametro: v.parametro, annotazione: v.annotazione });
  }
  for (const v of fuori) casi.push(`${v.nome}: al ${livello}° livello non c’è un posto di ${NOMI[v.categoria]} libero per riprenderlo`);
  const controllo = postiTalenti(prova, dati, { opzioni: false });
  for (const x of controllo.posti) {
    if (x.scelta && !x.valida) {
      const m = x.problemi.find((e) => e.tipo === 'violazione')?.problema;
      casi.push(`ripreso come ${NOMI[x.categoria]} del ${conAccento(x.livello)} livello non sarebbe ammesso: ${m} (A.183: vale l’ordine di livello, il Direttore può forzare)`);
    }
  }
  const unici = [...new Set(casi)];
  const quanti = Object.fromEntries(Object.entries(posti.categorie).map(([k, c]) => [k, c.spettanti]));
  return { nome, livello, giaMigrato: false, vecchi: posti.vecchi, posti: quanti, casi: unici, nuovo };
}

/** La scelta in un posto, sui dati del personaggio (come applicaSceltaTalento, senza importare la UI). */
function applica(p, posto, scelta) {
  const pulita = { id: scelta.id, ...(scelta.parametro ? { parametro: scelta.parametro } : {}), ...(scelta.annotazione ? { annotazione: scelta.annotazione } : {}) };
  if (posto.livello === 1) return { ...p, creazione: { ...p.creazione, specializzazioneIniziale: pulita } };
  const campo = { talento_libero: 'talentoLibero', maestria: 'maestria', specializzazione: 'specializzazione' }[posto.categoria];
  return { ...p, livelli: p.livelli.map((v, k) => (k === posto.livello - 2 ? { ...v, [campo]: pulita } : v)) };
}

/** Il rapporto di un personaggio, in righe di testo. */
export function righeRapporto(piano) {
  const r = [`${piano.nome} — ${piano.livello}° livello`];
  if (piano.giaMigrato) { r.push('    già nei Talenti nuovi: non lo tocco'); return r; }
  if (!piano.nuovo) { r.push(...piano.casi.map((c) => `    ⚠ ${c}`)); return r; }
  r.push(`    Talenti di oggi: ${piano.vecchi.length ? piano.vecchi.map((v) => `${v.nome} (${v.livello}°) → ${NOMI[v.categoria]}${v.sostituitoDa ? ', con il nome nuovo' : ''}`).join('; ') : 'nessuno'}`);
  r.push(`    Posti da riempire: ${Object.entries(piano.posti).map(([k, n]) => `${n} ${NOMI[k]}`).join(', ')}`);
  for (const c of piano.casi) r.push(`    ⚠ ${c}`);
  return r;
}

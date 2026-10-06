// Tavolo del Master, pezzo 1 (docs/tavolo-direttore.md): i dati di una scheda compatta della plancia
// a partire dal file di un personaggio in personaggi/. Funzione pura e nessun calcolo nuovo: valori
// effettivi e provenienze vengono da calcolaScheda con la sessione del file, come nella scheda digitale.
import { testiTemporanei } from './temporanei.js';
import { testoCircostanze } from './circostanze.js';
import { deserializzaPersonaggio, normalizza, serializza, nomeFileEsportazione, nuovoPg, FORMATO_FILE, VERSIONE_FORMATO } from './character.js';
import { calcolaScheda } from './calc.js';
import { massimiSessione, allineaSessione, descriviFerite } from './sessione.js';
import { testoDanno } from './stampa.js';
import { aggiungiDanno } from './equipaggiamento.js';
import { chiaveDaFile, NOME_FILE } from './cartella.js';
import { versioniPersonaggio } from './rules.js';
import { alRound } from './round-scontro.js';

/**
 * Scheda compatta di un PG per la plancia.
 * @param testo contenuto del file (export dell'app)
 * @param file nome del file in personaggi/ (chiave della carta)
 * @returns {{ file, nome, ritratto, livello, corporazione, classi, completa, pv, pm, pe, ar, difese,
 *   ferite, affaticamento, corruzione, stati, armi, scheda, sessione, massimi }}
 */
export function vistaPlancia(testo, dati, file = null, round = null) {
  const p = deserializzaPersonaggio(testo);
  const { scelte } = normalizza(p.creazione, dati);
  const livelli = p.livelli ?? [];
  const nome = scelte.nome?.trim() || 'Senza nome';
  // chiaveCartella: il nome del personaggio nei file di personaggi/ (src/cartella.js), che lo identifica al tavolo
  const base = { file, roundVista: round, chiaveCartella: file ? chiaveDaFile(file) : null, nome, ritratto: scelte.ritratto ?? null, livello: 1 + livelli.length };
  const riposo = calcolaScheda({ creazione: scelte, livelli }, dati);
  if (!riposo.caratteristiche) return { ...base, completa: false, classi: [], corporazione: scelte.corporazione ?? null };
  // la sessione del file, allineata ai massimi attuali (come all'apertura della scheda digitale)
  const massimi = massimiSessione(riposo, scelte, dati);
  // in uno scontro, la sessione vista al Round dello scontro (src/round-scontro.js): Tecniche e incantesimi finiti
  // non danno più effetti (AR di Armatura di Forza…), come nella scheda collegata; il file non si tocca
  const sessione = round ? alRound(allineaSessione(p.sessione, massimi), round) : allineaSessione(p.sessione, massimi);
  const scheda = calcolaScheda({ creazione: scelte, livelli, sessione }, dati);
  const r = dati.regole;
  const eq = scheda.equipaggiamento ?? {};
  const ar = eq.arEffettiva ?? eq.ar ?? null;
  const difese = scheda.abilita.find((a) => a.nome === (eq.abilitaDifese ?? 'Difese')) ?? null;
  const grado = (n, stati) => ({ grado: n ?? 0, nome: stati?.[n ?? 0]?.nome ?? null });
  return {
    ...base,
    completa: true,
    corporazione: scheda.corporazione,
    classi: (scheda.classi ?? []).map((c) => ({ nome: c.nome, grado: c.grado })),
    pv: { attuali: sessione.pvAttuali, massimo: massimi.pv },
    pm: massimi.pm ? { attuali: sessione.pmAttuali, massimo: massimi.pm } : null,
    pe: { attuali: sessione.puntiEroe, massimo: massimi.puntiEroe },
    // Iniziativa effettiva (src/condizioni.js → valoriTavolo) e le Caratteristiche per la parità (§5.1)
    iniziativa: { valore: scheda.tavolo?.iniziativa?.effettivo ?? scheda.iniziativa, provenienza: scheda.tavolo?.iniziativa?.provenienza ?? null },
    caratteristichePerParita: Object.fromEntries((r.iniziativa?.caratteristiche ?? []).map((k) => [k, scheda.caratteristiche[k]?.valore ?? null])),
    // AR al tavolo (src/condizioni.js): il valore principale e gli altri (contro Etereo, esplosioni)
    ar: ar ? { totale: ar.totale, magica: ar.magica, valori: (ar.valori ?? []).map((v) => ({ id: v.id, etichetta: v.etichetta, valore: v.valore, principale: !!v.principale, provenienza: v.provenienza })) } : null,
    difese: difese ? { valore: difese.effettivo ?? difese.totale, daRegole: difese.totale, provenienza: difese.provenienza ?? null } : null,
    ferite: { grado: sessione.ferite ?? 0, nome: sessione.ferite ? descriviFerite(sessione.ferite, dati).nome : null },
    affaticamento: grado(sessione.affaticamento, r.affaticamento?.stati),
    corruzione: grado(sessione.corruzione, r.corruzione?.stati),
    stati: (r.stati?.elenco ?? []).filter((s) => (sessione.statiAttivi ?? []).includes(s.id)).map((s) => ({ id: s.id, nome: s.nome })),
    // modificatori temporanei di Caratteristica e circostanze del Direttore (playtest del 05/10/2026)
    modificatori: [...testiTemporanei(sessione, dati), ...testoCircostanze(sessione, dati)],
    // armi in mano (attive), con VA e danno effettivi e la provenienza, come nei riquadri delle mani della SD
    armi: (eq.armi ?? []).filter((a) => !a.daScudo).map((a) => ({
      uid: a.uid, nome: a.nome, moduloDi: a.moduloDi ?? null, rotta: !!a.rotta,
      va: a.vaEffettivo ?? a.va, provenienza: a.provenienza ?? null,
      // come nella scheda digitale (src/ui/tab.js → schedaArma): il danno dell'arma, o quello della munizione
      danno: a.dannoDaMunizione ? (a.munizioneRiferimento ? `${aggiungiDanno(a.munizioneRiferimento.danno, a.bonusDanno + (a.bonusCaratteristica?.bonus ?? 0))} (mun.)` : 'munizione') : testoDanno(a.danno),
      provenienzaDanno: a.provenienzaDanno ?? null,
    })),
    scheda, sessione, massimi,
  };
}

/**
 * Testo del file di un PG con i valori di sessione cambiati dalla plancia (pezzo 4: «Colpito», «Annulla
 * ultimo colpo»): gli stessi campi che scrive la scheda digitale (pvAttuali, ferite, statiAttivi), con la
 * serializzazione dell'app (src/character.js), così il file resta quello di un export.
 * @param valori { pvAttuali?, ferite?, statiAttivi? }
 */
export function testoConSessione(testo, valori, dati) {
  const file = JSON.parse(testo);
  const p = deserializzaPersonaggio(testo);
  const { scelte } = normalizza(p.creazione, dati);
  const riposo = calcolaScheda({ creazione: scelte, livelli: p.livelli ?? [] }, dati);
  const sessione = allineaSessione({ ...allineaSessione(p.sessione, massimiSessione(riposo, scelte, dati)), ...valori }, massimiSessione(riposo, scelte, dati));
  // l'identificativo del personaggio resta (src/character.js → nuovoPg): la plancia non lo cambia mai
  return serializza(scelte, { versioniDati: file.versioni_dati, livelli: p.livelli ?? [], sessione, calendario: p.calendario, pg: p.pg });
}

/**
 * «Aggiungi PG al tavolo»: un file scelto dal master (quello di «SALVA PG») validato come fa «Importa»
 * (src/character.js → deserializzaPersonaggio, normalizza). Il nome del file resta se segue il formato
 * dell'export; altrimenti si rifà dal nome e dal livello nel JSON (con la data di oggi). Il testo resta
 * quello del file se è già nel formato attuale; un formato precedente si migra con la serializzazione dell'app.
 * @returns {{ file, testo, nome, livello, rinominato: boolean } | { errore: string }}
 */
export function pgDaAggiungere(nomeFile, testo, dati, adesso = new Date()) {
  let p;
  try {
    p = deserializzaPersonaggio(testo);
  } catch (e) {
    return { errore: e.message };
  }
  const { scelte } = normalizza(p.creazione, dati);
  const nome = String(scelte.nome ?? '').trim();
  if (!nome) return { errore: 'Il personaggio non ha un nome.' };
  const livelli = p.livelli ?? [];
  const livello = 1 + livelli.length;
  const obj = JSON.parse(testo);
  const attuale = obj.formato === FORMATO_FILE && obj.versione === VERSIONE_FORMATO;
  const versioniDati = obj.versioni_dati ?? versioniPersonaggio(dati);
  // un PG senza identificativo (file di prima) lo riceve entrando nella cartella: è la sua prima apertura
  const testoFinale = attuale && p.pg ? testo : serializza(scelte, { versioniDati, livelli, sessione: p.sessione, calendario: p.calendario, pg: p.pg ?? nuovoPg() });
  const buono = NOME_FILE.test(nomeFile) && chiaveDaFile(nomeFile) === chiaveDaFile(nomeFileEsportazione(nome, livello, adesso));
  return { file: buono ? nomeFile : nomeFileEsportazione(nome, livello, adesso), testo: testoFinale, nome, livello, rinominato: !buono };
}

/**
 * Round collegato allo scontro (src/round-scontro.js): il testo del file di un PG con la sessione cambiata da `fn`
 * (riallinea all'inizio dello scontro, Stati scaduti, Round finale alla fine, «Termina le durate»), oppure null se
 * la sessione non cambia (nessuna scrittura inutile).
 */
export function testoConSessioneDa(testo, fn, dati) {
  return sessioneDaFile(testo, fn, dati).testo;
}

/** Come testoConSessioneDa, con anche la sessione che ne risulta: { testo (null se non cambia), sessione }. */
export function sessioneDaFile(testo, fn, dati) {
  const p = deserializzaPersonaggio(testo);
  const { scelte } = normalizza(p.creazione, dati);
  const riposo = calcolaScheda({ creazione: scelte, livelli: p.livelli ?? [] }, dati);
  const prima = allineaSessione(p.sessione, massimiSessione(riposo, scelte, dati));
  const dopo = fn(prima);
  if (!dopo || JSON.stringify(dopo) === JSON.stringify(prima)) return { testo: null, sessione: prima };
  return { testo: testoConSessione(testo, dopo, dati), sessione: dopo };
}

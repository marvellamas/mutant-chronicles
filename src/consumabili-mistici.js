// Artefatti consumabili (Manuale della Magia §27, Doc dell'08/10/2026): pergamene e altri supporti monouso con una
// versione definita di un Incantesimo. Funzioni pure; le regole e la tabella per Grado stanno in
// data/equipaggiamento/artefatti.json → consumabili, le schede nel catalogo (famiglia «Consumabili»).
// - §27.1: SnT 0, niente sintonizzazione; Cariche Esclusive sigillate, che non sono una riserva del PG (non entrano in
//   contenitori(): niente prelievo, niente Batteria, A.20 e A.112 restano come sono).
// - §27.1, §27.4: si usa con l'atto della scheda (1 AzP per le pergamene in combattimento, minuti oppure ore per le
//   altre) e se ne sottrae una solo al completamento: «Usa» toglie un esemplare dalla quantità dell'Inventario; un'
//   attivazione interrotta non consuma nulla. Con l'ultimo esemplare la voce sparisce.
// - §27.1: durata, Concentrazione e limiti sono quelli dell'Incantesimo infuso: un effetto a durata entra fra gli
//   «Incantesimi in corso» come un lancio (src/durate-incantesimi.js).
// - §27.2: creazione = supporto + reagenti del Grado; PM = 3 × Grado di lavoro + PM sigillati; Magistrale dimezza
//   (per eccesso) PM di lavoro e reagenti.
import { catalogo, risolvi, normalizzaEquipaggiamento, infoArtefattoVoce, statoIniziale } from './equipaggiamento.js';
import { variaSessione } from './sessione.js';

const NUMERI_ROMANI = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/** Regole del §27 (artefatti.json → consumabili), o null. */
export function regoleConsumabili(dati) {
  return dati?.equipaggiamento?.file?.artefatti?.consumabili ?? null;
}

/** Riga della tabella del §27.2 per un Grado («I»…«VI»), o null. */
export function rigaGrado(grado, dati) {
  return (regoleConsumabili(dati)?.gradi ?? []).find((g) => g.grado === grado) ?? null;
}

/** §24.2: Grado della versione di un Incantesimo dal suo livello (1–3 I … 18 VI), o null. */
export function gradoVersione(livello, dati) {
  return (regoleConsumabili(dati)?.gradi ?? []).find((g) => livello >= g.livelli[0] && livello <= g.livelli[1])?.grado ?? null;
}

/**
 * Costi di creazione di un Consumabile (§27.2), con il progetto già disponibile e senza manodopera esterna:
 * { grado, supporto, reagenti, creazione (cr dei materiali), vendita, reperibilita, pmLavoro, pmSigillati, pmTotali }.
 * Con `magistrale` PM di lavoro e reagenti si dimezzano per eccesso; supporto e PM sigillati restano interi.
 * `supporto`: costo di un supporto diverso dalla pergamena standard (§27.2: dipende dalla costruzione effettiva).
 */
export function costiCreazione({ grado, pmSigillati, magistrale = false, supporto = null }, dati) {
  const R = regoleConsumabili(dati);
  const g = rigaGrado(grado, dati);
  if (!R || !g || !Number.isInteger(pmSigillati)) return null;
  const n = NUMERI_ROMANI.indexOf(grado) + 1;
  const dimezza = (x, campo) => (magistrale && R.magistrale?.dimezza?.includes(campo) ? Math.ceil(x / 2) : x);
  const pmLavoro = dimezza(R.pm_lavoro_per_grado * n, 'pm_lavoro');
  const reagenti = dimezza(g.reagenti, 'reagenti');
  const costoSupporto = Number.isInteger(supporto) ? supporto : R.supporto.costo;
  return {
    grado, supporto: costoSupporto, reagenti, creazione: costoSupporto + reagenti,
    vendita: (costoSupporto + g.reagenti) * R.vendita_moltiplicatore, reperibilita: g.reperibilita,
    pmLavoro, pmSigillati, pmTotali: pmLavoro + pmSigillati, ore: R.supporto.ore,
  };
}

/** Dati di consumabile di una voce risolta (catalogo o creato dal giocatore), o null. */
export const consumabileDi = (r, dati) => (r && !r.fuoriCatalogo ? infoArtefattoVoce(r, dati)?.consumabile ?? null : null);

/**
 * Attivazione in parole e in combattimento (§27.1: l'atto della scheda): { testo, inRound, motivo }.
 * Solo un'attivazione in AzP si compie in un Round; minuti e ore no («Fuori dal combattimento» se la scheda lo dice).
 */
export function attivazioneConsumabile(c) {
  const a = c?.attivazione ?? {};
  if (Number.isInteger(a.azp)) return { testo: a.testo ?? `${a.azp} AzP`, azp: a.azp, inRound: true, motivo: null };
  return { testo: a.testo ?? '—', azp: 0, inRound: false, motivo: a.fuori_combattimento ? 'si usa fuori dal combattimento' : `richiede ${a.testo ?? 'tempo'}: non si completa in un Round` };
}

/**
 * Consumabili del personaggio: { uid, nome, quantita, deposito, consumabile, attivazione, def }. I consumabili nel
 * deposito comune compaiono, ma non si usano (non sono con sé).
 */
export function consumabiliMistici(voci, dati) {
  const cat = catalogo(dati);
  return normalizzaEquipaggiamento(voci).map((v) => risolvi(v, cat)).map((r) => ({ r, c: consumabileDi(r, dati) })).filter((x) => x.c)
    .map(({ r, c }) => ({ uid: r.uid, nome: r.nome, quantita: r.voce.quantita ?? 1, deposito: r.deposito, consumabile: c, attivazione: attivazioneConsumabile(c), def: r.def, creato: !r.def }));
}

/**
 * Perché non si può usare ora, o null: non è un consumabile, è nel deposito, oppure (in un Round, cioè in uno
 * scontro) l'attivazione non è in AzP.
 */
export function motivoNonUsabile(x, { inScontro = false } = {}) {
  if (!x) return 'nessun consumabile';
  if (x.deposito) return 'è nel deposito comune: va preso con sé';
  if (inScontro && !x.attivazione.inRound) return x.attivazione.motivo;
  return null;
}

/**
 * «Usa» completato (§27.1, §27.4): toglie un esemplare dalla voce `uid`; con l'ultimo la voce sparisce. Restituisce
 * { voci, rimasti, esaurito } oppure null se la voce non è un consumabile utilizzabile.
 */
export function usaConsumabile(voci, uid, dati, opz = {}) {
  const lista = normalizzaEquipaggiamento(voci);
  const x = consumabiliMistici(lista, dati).find((c) => c.uid === uid);
  if (!x || motivoNonUsabile(x, opz)) return null;
  const rimasti = x.quantita - 1;
  return {
    voci: rimasti > 0 ? lista.map((v) => (v.uid === uid ? { ...v, quantita: rimasti } : v)) : lista.filter((v) => v.uid !== uid),
    rimasti, esaurito: rimasti === 0,
  };
}

/** Incantesimo infuso di un consumabile, dai dati della Magia, o null. */
export function incantesimoDi(c, dati) {
  return (dati?.incantesimi?.incantesimi ?? []).find((i) => i.nome === c?.incantesimo) ?? null;
}

// ---------------------------------------------------------------------------
// «Crea consumabile» (Magia §27.2): le tre fasi del §24 con requisiti, penalità, tempi ed esiti ordinari — progetto
// (Artefatti, §24.3), supporto (Tecnologia, §24.4), infusione (Rituali, §24.5–24.6) — con i reagenti e i PM del §27.2.
// L'app non tira i dadi: il giocatore indica l'esito di ogni Prova e il piano dice che cosa si consuma.

export const ESITI = ['successo', 'magistrale', 'fallimento', 'maldestro'];
export const ESITI_INFUSIONE = [...ESITI, 'interrotta'];
export const NOMI_ESITI = { successo: 'Successo', magistrale: 'Successo Magistrale', fallimento: 'Fallimento', maldestro: 'Fallimento Maldestro', interrotta: 'Interrotta prima della Prova' };
const riesce = (e) => e === 'successo' || e === 'magistrale';
const numeroDi = (v) => { const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10); return Number.isFinite(n) ? n : null; };
const livelloRiga = (r) => numeroDi(r?.Livello ?? r?.['Livello e PM']);

/** VA (effettivo) di un'Abilità della scheda, o 0. */
const vaAbilita = (scheda, nome) => { const a = (scheda?.abilita ?? []).find((x) => x.nome === nome); return a ? a.effettivo ?? a.totale ?? 0 : 0; };

/** §24.1: accesso dell'Officiante al Grado (regole.json → rituali.accesso); null se c'è, altrimenti il motivo. */
function accessoOfficiante(n, scheda, dati) {
  const voce = (dati.regole?.rituali?.accesso ?? []).find((a) => a.gradi.includes(n));
  if (!voce) return `nessun accesso previsto al Grado ${NUMERI_ROMANI[n - 1]}`;
  const posseduti = new Set((scheda?.talentiLiberi ?? []).map((t) => t.id));
  if (voce.talenti.some((t) => posseduti.has(t))) return null;
  const nomi = voce.talenti.map((id) => dati.talenti_liberi?.talenti?.find((t) => t.id === id)?.nome ?? id);
  return `per il Grado ${NUMERI_ROMANI[n - 1]} l’Officiante deve avere ${nomi.join(' o ')} (Magia §24.1)`;
}

/** PM sigillati di una versione: il costo base (colonna PM; tabella del Rituale per Rigenerazione; altrimenti il livello). */
export function pmVersione(inc, livello) {
  const pr = inc?.meccanica?.procedura_rituale?.versioni?.find((x) => x.livello === livello);
  if (pr?.pm) return pr.pm;
  const r = (inc?.versioni ?? []).find((x) => livelloRiga(x) === livello);
  return numeroDi(r?.PM ?? r?.['Livello e PM']) ?? livello;
}

/**
 * Incantesimi e versioni che il personaggio può infondere in un Consumabile: quelli conosciuti, fino al livello massimo;
 * con `conosciutaDaAltri` tutti (§24.1: «deve essere presente chi conosce e può utilizzare ciascuna versione»). Ogni
 * versione ha Grado, PM sigillati e il motivo se non si può (livello, accesso dell'Officiante).
 */
export function versioniCreabili(scheda, dati, { conosciutaDaAltri = false } = {}) {
  const max = scheda?.incantesimi?.livelloMassimo ?? 0;
  const noti = new Set((scheda?.incantesimi?.conosciuti ?? []).map((i) => i.nome ?? i));
  return (dati?.incantesimi?.incantesimi ?? []).filter((i) => conosciutaDaAltri || noti.has(i.nome)).map((inc) => ({
    incantesimo: inc.nome, macrofamiglia: inc.macrofamiglia, ritualeNonConsentito: /Rituale: non consentito/.test(inc.intestazione ?? ''),
    versioni: (inc.versioni ?? []).map(livelloRiga).filter((l) => Number.isInteger(l) && gradoVersione(l, dati)).map((livello) => {
      const grado = gradoVersione(livello, dati);
      const n = NUMERI_ROMANI.indexOf(grado) + 1;
      const motivo = (!conosciutaDaAltri && livello > max ? `oltre il tuo livello massimo (${max}): serve chi la conosce` : null) ?? accessoOfficiante(n, scheda, dati);
      return { livello, grado, pm: pmVersione(inc, livello), motivo };
    }),
  })).sort((a, b) => a.incantesimo.localeCompare(b.incantesimo, 'it'));
}

/**
 * Piano della creazione (§27.2 e §24.3–24.6). `scelta`:
 * { incantesimo, livello, conosciutaDaAltri, supporto: { id: 'pergamena'|'altro', nome?, costo?, complessita? },
 *   progetto: { disponibile, magistrale?, esito?, tentativo? }, costruzione: { esito, tentativo? },
 *   infusione: { esito, pmCanali?, aiutoCanali? } }; tentativo: 'primo' | 'fallimento' | 'maldestro' (dopo quale esito
 * si ritenta). `contesto`: { scheda, crediti, pmAttuali }.
 * @returns {{ grado, incantesimo, livello, pmSigillati, fasi, ore, crediti, pm, pmCanali, creato, voce, errori, avvisi }}
 */
export function pianoCreazione(scelta, { scheda = null, crediti = Infinity, pmAttuali = Infinity } = {}, dati) {
  const R = regoleConsumabili(dati);
  const C = R?.creazione;
  const errori = [];
  const avvisi = [];
  const inc = incantesimoDi({ incantesimo: scelta?.incantesimo }, dati);
  const livello = scelta?.livello;
  const grado = Number.isInteger(livello) ? gradoVersione(livello, dati) : null;
  if (!C || !inc || !grado || !(inc.versioni ?? []).some((r) => livelloRiga(r) === livello)) {
    return { errori: ['scegli un Incantesimo e una sua versione'], avvisi, fasi: [], ore: 0, crediti: 0, pm: 0, pmCanali: 0, creato: false, voce: null };
  }
  const n = NUMERI_ROMANI.indexOf(grado) + 1;
  const pmSigillati = pmVersione(inc, livello);
  // §24.1: Officiante con il Talento del Grado; versione conosciuta da chi è presente
  const acc = accessoOfficiante(n, scheda, dati);
  if (acc) errori.push(acc);
  const noti = new Set((scheda?.incantesimi?.conosciuti ?? []).map((i) => i.nome ?? i));
  if (!scelta.conosciutaDaAltri && !(noti.has(inc.nome) && livello <= (scheda?.incantesimi?.livelloMassimo ?? 0))) {
    errori.push(`non conosci ${inc.nome} ${livello}: all’infusione deve essere presente chi la conosce e può usarla (Magia §24.1)`);
  }
  if (/Rituale: non consentito/.test(inc.intestazione ?? '')) avvisi.push(`La scheda di ${inc.nome} dice «Rituale: non consentito»: non è chiaro se si possa infondere in un Consumabile (domanda A.157); l’app lo permette.`);
  // supporto: la pergamena standard o un altro, con costo e complessità della costruzione effettiva (§27.2)
  const S = (R.supporti ?? []).find((x) => x.id === (scelta.supporto?.id ?? 'pergamena')) ?? R.supporti[0];
  const costoSupporto = S.costo ?? (Number.isInteger(scelta.supporto?.costo) && scelta.supporto.costo >= 0 ? scelta.supporto.costo : null);
  const complessita = C.costruzione.complessita.find((k) => k.nome === (S.complessita ?? scelta.supporto?.complessita));
  if (costoSupporto === null) errori.push('indica il costo del supporto (ricetta o preventivo di lavorazione, §24.4)');
  if (!complessita) errori.push('indica la complessità della costruzione del supporto (§24.4)');
  const fasi = [];
  let ore = 0;
  let spesa = 0;
  let fine = false;
  // 1. progetto (§24.3): già disponibile (comprato o realizzato prima) oppure Prova di Artefatti
  let progettoMagistrale = !!scelta.progetto?.magistrale;
  if (!scelta.progetto?.disponibile) {
    const g = C.progetto.gradi[n - 1];
    const esito = ESITI.includes(scelta.progetto?.esito) ? scelta.progetto.esito : 'successo';
    const t = C.progetto.ritentare[scelta.progetto?.tentativo] ?? { ore: 1, risorse: 1 };
    const f = { fase: 'progetto', abilita: C.progetto.abilita, va: vaAbilita(scheda, C.progetto.abilita), modificatori: [{ nome: `Grado ${grado}`, valore: g.va }], esito, ore: g.ore * t.ore, crediti: g.risorse * t.risorse, pm: 0 };
    f.giorni = Math.ceil(f.ore / C.progetto.ore_al_giorno);
    fasi.push(f);
    ore += f.ore; spesa += f.crediti;
    progettoMagistrale = esito === 'magistrale';
    if (!riesce(esito)) fine = true;
  }
  // 2. supporto (§24.4): Prova di Tecnologia con la complessità; +2 con il progetto magistrale
  let supportoMagistrale = false;
  if (!fine && complessita && costoSupporto !== null) {
    const esito = ESITI.includes(scelta.costruzione?.esito) ? scelta.costruzione.esito : 'successo';
    const t = C.costruzione.ritentare[scelta.costruzione?.tentativo] ?? { ore: 1, materiali: 1 };
    const f = { fase: 'costruzione', abilita: C.costruzione.abilita, va: vaAbilita(scheda, C.costruzione.abilita),
      modificatori: [{ nome: complessita.nome, valore: complessita.va }, ...(progettoMagistrale ? [{ nome: 'progetto magistrale', valore: C.progetto.bonus_magistrale_tecnologia }] : [])],
      esito, ore: complessita.ore * t.ore, crediti: Math.ceil(costoSupporto * t.materiali), pm: 0 };
    fasi.push(f);
    ore += f.ore; spesa += f.crediti;
    supportoMagistrale = esito === 'magistrale';
    if (!riesce(esito)) fine = true;
  } else fine = true;
  // 3. infusione (§24.5, §27.2): Prova di Rituali al termine; reagenti del §27.2; PM = 3 × Grado + sigillati
  let pm = 0;
  let pmCanali = 0;
  let creato = false;
  if (!fine) {
    const gi = C.infusione.gradi[n - 1];
    const esito = ESITI_INFUSIONE.includes(scelta.infusione?.esito) ? scelta.infusione.esito : 'successo';
    const costi = costiCreazione({ grado, pmSigillati, magistrale: esito === 'magistrale', supporto: costoSupporto }, dati);
    const regola = C.infusione.esiti[esito] ?? { reagenti: true, pm: true };
    const pmSpesi = regola.pm ? costi.pmTotali : 0;
    const aiuto = Math.min(Math.max(0, scelta.infusione?.aiutoCanali ?? 0), dati.regole?.rituali?.canali?.aiuto_massimo ?? 5);
    pmCanali = Math.min(Math.max(0, scelta.infusione?.pmCanali ?? 0), pmSpesi);
    pm = pmSpesi - pmCanali;
    // §24.6: l'Officiante versa almeno il Grado (metà per eccesso dopo un Magistrale)
    const minimo = esito === 'magistrale' ? Math.ceil(n / 2) : n;
    if (pmSpesi && pm < minimo) errori.push(`l’Officiante versa almeno ${minimo} PM (Magia §24.6): i Canali ne possono dare al massimo ${pmSpesi - minimo}`);
    const f = { fase: 'infusione', abilita: C.infusione.abilita, va: vaAbilita(scheda, C.infusione.abilita),
      modificatori: [{ nome: `Grado ${grado}`, valore: gi.va }, ...(aiuto ? [{ nome: 'aiuto dei Canali', valore: aiuto }] : []), ...(supportoMagistrale ? [{ nome: 'supporto magistrale', valore: C.costruzione.bonus_magistrale_rituali }] : [])],
      esito, ore: gi.ore, crediti: regola.reagenti ? costi.reagenti : 0, pm: pmSpesi, pmLavoro: costi.pmLavoro, pmSigillati, supporto: regola.supporto ?? null };
    fasi.push(f);
    ore += f.ore; spesa += f.crediti;
    creato = riesce(esito);
  }
  for (const f of fasi) f.totale = f.va + f.modificatori.reduce((s, m) => s + m.valore, 0);
  if (spesa > crediti) errori.push(`servono ${spesa} cr, ne hai ${crediti}`);
  if (pm > pmAttuali) errori.push(`servono ${pm} PM personali, ne hai ${pmAttuali}`);
  const nomeSupporto = S.id === 'pergamena' ? 'Pergamena' : (scelta.supporto?.nome?.trim() || 'Consumabile');
  const voce = creato ? { rif: null, personalizzato: { nome: `${nomeSupporto} di ${inc.nome} ${livello}`, tipo: 'artefatto', consumabile: { incantesimo: inc.nome, livello, supporto: S.id === 'pergamena' ? 'pergamena' : nomeSupporto } }, stato: null, quantita: 1, note: '' } : null;
  return { grado, incantesimo: inc.nome, livello, pmSigillati, fasi, ore, crediti: spesa, pm, pmCanali, creato, voce, errori, avvisi };
}

/**
 * Applica un piano confermato: crediti e PM personali scalati nella sessione (src/sessione.js, entro i limiti), il
 * Consumabile creato aggiunto all'Inventario con `uid`. null se il piano ha errori.
 */
export function applicaCreazione({ voci, sessione }, piano, m, uid) {
  if (!piano || piano.errori?.length) return null;
  let s = variaSessione(sessione, 'crediti', -piano.crediti, m);
  s = variaSessione(s, 'pmAttuali', -piano.pm, m);
  const lista = normalizzaEquipaggiamento(voci);
  // stato iniziale come un acquisto («Trasportato» per gli Artefatti)
  return { voci: piano.voce ? [...lista, { ...piano.voce, uid, stato: statoIniziale(piano.voce.personalizzato.tipo, lista) }] : lista, sessione: s };
}

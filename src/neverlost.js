// La Neverlost (A.196, risposta di Davide del 30/10/2026; Manuale dei Veicoli 0.10, «Neverlost scheda del veicolo»; scheda
// tecnica 1.6). Funzioni pure sulle risorse che la nave ha in più rispetto ai veicoli di terra; Integrità, colpi,
// riparazioni, andature e pedina sono quelli dei veicoli (src/veicoli.js, src/mappa/).
//
// Perché un modulo a parte: l'energia della nave non entra nel modello dello Scout. Là la riserva parte piena dalla
// dotazione (A.101), il Rosso si conta a chilometri e il Verde solo nei giorni d'uso; qui
//  - **le riserve non si riempiono mai da sole** (A.196: «le capacità massime non riempiono automaticamente le riserve
//    effettive»): un valore mai registrato resta «da registrare» (null), e sale solo con una ricarica esplicita;
//  - ci sono tre colori (Rosso, **Blu**, Verde); il Rosso si conta a **tempo di volo**, il Verde **ogni giorno**;
//  - la **Traiettoria** si conta in giorni: entrata e uscita con una carica Blu, ogni giorno una Rossa e una Verde;
//  - lo **scudo** (ScE) e il **circuito Bianco** (PM) sono riserve a parte, che le ricariche dell'energia non toccano.
// La giornata si chiude con lo stesso «Chiudi la giornata» dei veicoli (src/veicoli.js → chiudiGiornata la passa qui).
//
// Nel mezzo salvato: energia { modello: 'neverlost', rosso, blu, verde, volo_cariche, approdo_alimentato,
// traiettoria: { dentro, giorni, traversate: [{ giorni }] } }, scudo { sce, attivo, ore_pagate, round_senza_colpi,
// ampliato }, circuito { pm }. I numeri del profilo stanno in data/veicoli.json (profili → neverlost).

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const COLORI = ['rosso', 'blu', 'verde'];
const NOME = { rosso: 'Rossa', blu: 'Blu', verde: 'Verde' };
const arrotonda = (n) => Math.round(n * 1e6) / 1e6;
/** Un valore registrato fra 0 e il massimo, oppure null («da registrare»): mai il massimo per difetto. */
const registrato = (x, max) => (Number.isFinite(x) ? Math.max(0, Math.min(max, x)) : null);
const cariche = (n) => `${n} ${n === 1 ? 'carica' : 'cariche'}`;

/** Il profilo è quello della Neverlost (ha le riserve della nave)? */
export const eNeverlost = (profilo) => isOggetto(profilo?.energia_neverlost);

/**
 * Le risorse della nave salvate nel mezzo, nei limiti del profilo. **Nessun valore mancante diventa il massimo**: resta
 * null finché il Direttore non lo registra (A.196). Il mezzo nuovo parte così, tutto «da registrare».
 */
export function normalizzaNeverlost(v, profilo) {
  const E = profilo.energia_neverlost;
  const x = isOggetto(v?.energia) && v.energia.modello === 'neverlost' ? v.energia : {};
  const t = isOggetto(x.traiettoria) ? x.traiettoria : {};
  const s = isOggetto(v?.scudo) ? v.scudo : {};
  const c = isOggetto(v?.circuito) ? v.circuito : {};
  return {
    energia: {
      modello: 'neverlost',
      ...Object.fromEntries(COLORI.map((k) => [k, registrato(x[k], E[k].cariche)])),
      volo_cariche: Math.max(0, arrotonda(Number.isFinite(x.volo_cariche) ? x.volo_cariche : 0)),
      approdo_alimentato: x.approdo_alimentato === true,
      traiettoria: {
        dentro: t.dentro === true,
        giorni: Number.isInteger(t.giorni) && t.giorni >= 0 ? t.giorni : 0,
        traversate: (Array.isArray(t.traversate) ? t.traversate : []).filter((y) => Number.isInteger(y?.giorni)).slice(-20).map((y) => ({ giorni: y.giorni })),
      },
    },
    scudo: {
      sce: registrato(s.sce, profilo.scudo.sce_max),
      attivo: s.attivo === true,
      ore_pagate: Number.isInteger(s.ore_pagate) && s.ore_pagate >= 0 ? s.ore_pagate : 0,
      round_senza_colpi: Number.isInteger(s.round_senza_colpi) && s.round_senza_colpi >= 0 ? s.round_senza_colpi : 0,
      ampliato: s.ampliato === true,
    },
    circuito: { pm: registrato(c.pm, profilo.circuito_bianco.pm) },
  };
}

const conRisorse = (mezzo, r) => ({ ...mezzo, energia: r.energia, scudo: r.scudo, circuito: r.circuito });

/** Toglie n cariche di un colore: con il valore da registrare non sottrae e avvisa; mai sotto 0. */
function togli(energia, colore, n, avvisi, perche) {
  if (!n) return energia;
  if (energia[colore] === null) { avvisi.push(`Riserva ${NOME[colore]} da registrare: ${cariche(n)} per ${perche} non sottratte. Scrivi prima le cariche attuali.`); return energia; }
  if (energia[colore] < n) avvisi.push(`Riserva ${NOME[colore]} insufficiente per ${perche}: servono ${cariche(n)}, ne restano ${energia[colore]}.`);
  return { ...energia, [colore]: Math.max(0, energia[colore] - n) };
}

/** Il Direttore registra i valori attuali (cariche, ScE, PM): sono gli unici che salgono senza una ricarica esplicita. */
export function registraValori(mezzo, profilo, valori = {}) {
  const r = normalizzaNeverlost(mezzo, profilo);
  const e = { ...r.energia };
  for (const k of COLORI) if (k in valori) e[k] = registrato(valori[k], profilo.energia_neverlost[k].cariche);
  const scudo = 'sce' in valori ? { ...r.scudo, sce: registrato(valori.sce, profilo.scudo.sce_max) } : r.scudo;
  const circuito = 'pm' in valori ? { pm: registrato(valori.pm, profilo.circuito_bianco.pm) } : r.circuito;
  return conRisorse(mezzo, { energia: e, scudo, circuito });
}

/**
 * Volo atmosferico o spaziale: i minuti all'andatura data diventano frazioni di carica Rossa (60 / 30 / 12 minuti a
 * carica) che si **sommano** per la giornata; si arrotondano per eccesso una volta sola, alla chiusura della giornata.
 */
export function registraVolo(mezzo, profilo, minuti, andatura = 'controllata') {
  const r = normalizzaNeverlost(mezzo, profilo);
  const mpc = profilo.energia_neverlost.rosso.minuti_per_carica[andatura];
  if (!(minuti > 0) || !mpc) return { mezzo, righe: [], avvisi: mpc ? [] : [`Andatura «${andatura}» senza consumo nel profilo.`] };
  if (r.energia.traiettoria.dentro) return { mezzo, righe: [], avvisi: ['In Traiettoria il consumo è a giorni: si esce prima di volare in atmosfera o nello spazio locale.'] };
  const volo = arrotonda(r.energia.volo_cariche + minuti / mpc);
  return { mezzo: conRisorse(mezzo, { ...r, energia: { ...r.energia, volo_cariche: volo } }), righe: [`Volo: ${minuti} min (${andatura}); in giornata ${Math.ceil(volo - 1e-9)} carica/e Rossa/e alla chiusura`], avvisi: [] };
}

/** Volo stazionario: 1 carica Rossa per ora, sommata al volo della giornata. */
export function registraStazionario(mezzo, profilo, ore) {
  const r = normalizzaNeverlost(mezzo, profilo);
  if (!(ore > 0)) return { mezzo, righe: [], avvisi: [] };
  const volo = arrotonda(r.energia.volo_cariche + ore / profilo.energia_neverlost.rosso.stazionario_ore_per_carica);
  return { mezzo: conRisorse(mezzo, { ...r, energia: { ...r.energia, volo_cariche: volo } }), righe: [`Stazionario: ${ore} h; in giornata ${Math.ceil(volo - 1e-9)} carica/e Rossa/e alla chiusura`], avvisi: [] };
}

/** All'approdo alimentato i servizi usano la rete esterna: niente carica Verde del giorno. */
export function impostaApprodo(mezzo, profilo, alimentato) {
  const r = normalizzaNeverlost(mezzo, profilo);
  return conRisorse(mezzo, { ...r, energia: { ...r.energia, approdo_alimentato: alimentato === true } });
}

/**
 * «Chiudi la giornata» della Neverlost. In Traiettoria: un giorno di viaggio, 1 carica Rossa e 1 Verde. Fuori: le cariche
 * Rosse del volo della giornata, arrotondate per eccesso una sola volta, e 1 Verde per il giorno di funzionamento (anche in
 * sosta), salvo l'approdo alimentato. Non ricarica niente.
 */
export function chiudiGiornataNeverlost(mezzo, profilo) {
  const r = normalizzaNeverlost(mezzo, profilo);
  const E = profilo.energia_neverlost;
  const righe = [];
  const avvisi = [];
  let e = { ...r.energia, traiettoria: { ...r.energia.traiettoria } };
  if (e.traiettoria.dentro) {
    e = togli(e, 'rosso', E.traiettoria.per_giorno.rosso, avvisi, 'il giorno in Traiettoria');
    e = togli(e, 'verde', E.traiettoria.per_giorno.verde, avvisi, 'il giorno in Traiettoria');
    e.traiettoria.giorni += 1;
    righe.push(`Giorno ${e.traiettoria.giorni} in Traiettoria: 1 carica Rossa e 1 Verde`);
  } else {
    const c = e.volo_cariche > 0 ? Math.ceil(e.volo_cariche - 1e-9) : 0;
    e = togli(e, 'rosso', c, avvisi, 'il volo della giornata');
    if (c) righe.push(`Volo della giornata: ${cariche(c)} Rosse (arrotondato una volta sola)`);
    if (e.approdo_alimentato) righe.push('Approdo alimentato: i servizi usano la rete esterna, nessuna carica Verde');
    else {
      e = togli(e, 'verde', E.verde.per_giorno, avvisi, 'il supporto vitale del giorno');
      righe.push(`Supporto vitale: ${cariche(E.verde.per_giorno)} Verde (anche in sosta)`);
    }
  }
  e.volo_cariche = 0;
  return { mezzo: conRisorse(mezzo, { ...r, energia: e }), righe, avvisi };
}

/** Entrare in Traiettoria: 5 minuti e 1 carica Blu. */
export function entraTraiettoria(mezzo, profilo) {
  const r = normalizzaNeverlost(mezzo, profilo);
  if (r.energia.traiettoria.dentro) return { mezzo, righe: [], avvisi: ['La nave è già in Traiettoria.'] };
  const avvisi = [];
  const e = togli(r.energia, 'blu', profilo.energia_neverlost.traiettoria.entrata_blu, avvisi, 'l’ingresso in Traiettoria');
  return { mezzo: conRisorse(mezzo, { ...r, energia: { ...e, traiettoria: { ...e.traiettoria, dentro: true, giorni: 0 } } }), righe: ['Ingresso in Traiettoria: 5 minuti, 1 carica Blu'], avvisi };
}

/** Uscire dalla Traiettoria: 5 minuti e 1 carica Blu; la traversata (in giorni) resta nel registro del mezzo. */
export function esciTraiettoria(mezzo, profilo) {
  const r = normalizzaNeverlost(mezzo, profilo);
  if (!r.energia.traiettoria.dentro) return { mezzo, righe: [], avvisi: ['La nave non è in Traiettoria.'] };
  const avvisi = [];
  const e = togli(r.energia, 'blu', profilo.energia_neverlost.traiettoria.uscita_blu, avvisi, 'l’uscita dalla Traiettoria');
  const giorni = e.traiettoria.giorni;
  return {
    mezzo: conRisorse(mezzo, { ...r, energia: { ...e, traiettoria: { dentro: false, giorni: 0, traversate: [...e.traiettoria.traversate, { giorni }].slice(-20) } } }),
    righe: [`Uscita dalla Traiettoria: 5 minuti, 1 carica Blu; traversata di ${giorni} giorni`], avvisi,
  };
}

/** Una traversata intera di N giorni: ingresso, N giorni chiusi, uscita (esempio della scheda: 20 giorni = 20 Rosse, 20 Verdi, 2 Blu). */
export function traversata(mezzo, profilo, giorni) {
  if (!(Number.isInteger(giorni) && giorni >= 1)) return { mezzo, righe: [], avvisi: ['Indica i giorni della traversata (almeno 1).'] };
  let m = mezzo;
  const righe = [];
  const avvisi = [];
  const passo = (esito) => { m = esito.mezzo; avvisi.push(...esito.avvisi); return esito; };
  righe.push(...passo(entraTraiettoria(m, profilo)).righe);
  for (let i = 0; i < giorni; i++) passo(chiudiGiornataNeverlost(m, profilo));
  righe.push(`${giorni} giorni in Traiettoria: ${giorni} cariche Rosse e ${giorni} Verdi`);
  righe.push(...passo(esciTraiettoria(m, profilo)).righe);
  return { mezzo: m, righe, avvisi: [...new Set(avvisi)] };
}

/** Il cannone energetico consuma 1 carica Rossa per colpo, anche se manca il bersaglio. */
export function sparaCannone(mezzo, profilo) {
  const r = normalizzaNeverlost(mezzo, profilo);
  const avvisi = [];
  const n = profilo.armi.find((a) => a.energia_per_colpo)?.energia_per_colpo?.rosso ?? 1;
  const e = togli(r.energia, 'rosso', n, avvisi, 'il colpo del cannone');
  return { mezzo: conRisorse(mezzo, { ...r, energia: e }), righe: [`Cannone energetico: ${cariche(n)} Rossa`], avvisi };
}

/** Scudo: 1 AzP e 1 carica Blu per un'ora. Accenderlo **non ripristina** gli ScE. */
export function attivaScudo(mezzo, profilo) {
  const r = normalizzaNeverlost(mezzo, profilo);
  const avvisi = [];
  const e = togli(r.energia, 'blu', profilo.scudo.attivazione.blu, avvisi, 'l’attivazione dello scudo');
  if (r.scudo.sce === null) avvisi.push('ScE da registrare: lo scudo si accende, ma scrivi i punti attuali.');
  return { mezzo: conRisorse(mezzo, { ...r, energia: e, scudo: { ...r.scudo, attivo: true, ore_pagate: 1, round_senza_colpi: 0 } }), righe: ['Scudo attivato: 1 carica Blu per un’ora (gli ScE non si ripristinano)'], avvisi };
}

/** Un'altra ora di scudo: un'altra carica Blu. */
export function oraScudo(mezzo, profilo) {
  const r = normalizzaNeverlost(mezzo, profilo);
  if (!r.scudo.attivo) return { mezzo, righe: [], avvisi: ['Lo scudo è spento: si attiva.'] };
  const avvisi = [];
  const e = togli(r.energia, 'blu', profilo.scudo.attivazione.blu, avvisi, 'un’altra ora di scudo');
  return { mezzo: conRisorse(mezzo, { ...r, energia: e, scudo: { ...r.scudo, ore_pagate: r.scudo.ore_pagate + 1 } }), righe: ['Scudo: un’altra ora, 1 carica Blu'], avvisi };
}

/** Spegnere lo scudo: gli ScE restano quelli che sono (riaccenderlo costa una nuova carica Blu). */
export function spegniScudo(mezzo, profilo) {
  const r = normalizzaNeverlost(mezzo, profilo);
  return conRisorse(mezzo, { ...r, scudo: { ...r.scudo, attivo: false, ore_pagate: 0, round_senza_colpi: 0, ampliato: false } });
}

/**
 * Un colpo contro la nave passa prima dallo scudo attivo: assorbe 1 danno per ScE (solo Naturale, salvo l'Ampliamento
 * mistico dello scudo). Torna il danno residuo per la struttura e il mezzo con gli ScE scesi; interrompe il recupero.
 */
export function colpoAlloScudo(mezzo, profilo, danni, natura = 'Naturale') {
  const r = normalizzaNeverlost(mezzo, profilo);
  const sc = r.scudo;
  const n = Math.max(0, Math.round(danni) || 0);
  if (!sc.attivo || !sc.sce) return { mezzo, residuo: n, assorbito: 0, interamente: false, riga: sc.attivo ? 'Scudo a 0 ScE: non protegge' : null };
  if (!profilo.scudo.assorbe.includes(natura) && !sc.ampliato) return { mezzo: conRisorse(mezzo, { ...r, scudo: { ...sc, round_senza_colpi: 0 } }), residuo: n, assorbito: 0, interamente: false, riga: `Scudo: non assorbe danni ${natura} senza Ampliamento mistico dello scudo` };
  const assorbito = Math.min(sc.sce, n);
  return {
    mezzo: conRisorse(mezzo, { ...r, scudo: { ...sc, sce: sc.sce - assorbito, round_senza_colpi: 0 } }),
    residuo: n - assorbito, assorbito, interamente: assorbito === n,
    riga: `Scudo: ${assorbito} danni assorbiti (${sc.sce} → ${sc.sce - assorbito} ScE)${assorbito === n ? ': colpo assorbito, niente PI aggiuntivi del Magistrale' : `; ${n - assorbito} proseguono contro la struttura`}`,
  };
}

/** Un Round senza essere colpita: dal terzo in poi lo scudo attivo recupera 20 ScE per Round, fino a 200. */
export function roundSenzaColpi(mezzo, profilo) {
  const r = normalizzaNeverlost(mezzo, profilo);
  const sc = { ...r.scudo, round_senza_colpi: r.scudo.round_senza_colpi + 1 };
  const R = profilo.scudo.recupero;
  let riga = `Round senza colpi: ${sc.round_senza_colpi}`;
  if (sc.attivo && sc.sce !== null && sc.round_senza_colpi >= R.round_senza_colpi) {
    const prima = sc.sce;
    sc.sce = Math.min(profilo.scudo.sce_max, sc.sce + R.sce_per_round);
    riga = `Scudo: +${sc.sce - prima} ScE (${prima} → ${sc.sce}) dopo ${sc.round_senza_colpi} Round senza colpi`;
  }
  return { mezzo: conRisorse(mezzo, { ...r, scudo: sc }), righe: [riga], avvisi: [] };
}

/**
 * Una funzione tecnomistica di postazione: scala i PM del **circuito Bianco**, mai le cariche. Le passive non costano.
 * L'Ampliamento mistico dello scudo segna lo scudo «ampliato» (assorbe anche Magico ed Etereo) finché resta acceso.
 */
export function usaFunzione(mezzo, profilo, id, { forza = false } = {}) {
  const r = normalizzaNeverlost(mezzo, profilo);
  const f = profilo.circuito_bianco.funzioni.find((x) => x.id === id);
  if (!f) return { mezzo, righe: [], avvisi: [`Funzione «${id}» non nel profilo.`] };
  if (f.passiva || !f.pm) return { mezzo, righe: [`${f.nome}: passiva, nessun costo`], avvisi: [] };
  const avvisi = [];
  if (r.circuito.pm === null) return { mezzo, righe: [], avvisi: ['PM del circuito Bianco da registrare: scrivi i PM attuali.'] };
  if (r.circuito.pm < f.pm && !forza) return { mezzo, righe: [], avvisi: [`Il circuito Bianco ha ${r.circuito.pm} PM, ne servono ${f.pm}.`] };
  const pm = Math.max(0, r.circuito.pm - f.pm);
  let scudo = r.scudo;
  if (f.id === 'ampliamento-scudo') {
    if (!r.scudo.attivo) avvisi.push('Lo scudo è spento: l’Ampliamento non lo accende.');
    else scudo = { ...r.scudo, ampliato: true };
  }
  return { mezzo: conRisorse(mezzo, { ...r, circuito: { pm }, scudo }), righe: [`${f.nome}: ${f.pm} PM dal circuito Bianco (${r.circuito.pm} → ${pm}), ${f.azione}, ${f.durata}`], avvisi };
}

/** PM del circuito a mano (ricarica mistica con fonte compatibile col Chroma Bianco, o correzione): mai dalle cariche. */
export function variaCircuito(mezzo, profilo, delta) {
  const r = normalizzaNeverlost(mezzo, profilo);
  if (r.circuito.pm === null) return mezzo;
  return conRisorse(mezzo, { ...r, circuito: { pm: registrato(r.circuito.pm + delta, profilo.circuito_bianco.pm) } });
}

/**
 * Ricarica completa a un approdo che serve 10 BEC Rossi, 1 Blu e 3 MEC Verdi: 8 ore, si pagano solo le cariche
 * ripristinate (50 cr Rossa o Blu, 30 Verde). È un atto esplicito; **non tocca** lo scudo né il circuito Bianco.
 * null se non c'è niente da ricaricare; con una riserva da registrare, quella non si ricarica (non si sa quanto manca).
 */
export function ricaricaNeverlost(mezzo, profilo) {
  const r = normalizzaNeverlost(mezzo, profilo);
  const E = profilo.energia_neverlost;
  const e = { ...r.energia };
  const righe = [];
  let costo = 0;
  for (const k of COLORI) {
    if (e[k] === null) { righe.push(`${E[k].nome}: da registrare, non si ricarica da qui`); continue; }
    const manca = E[k].cariche - e[k];
    if (manca <= 0) continue;
    const cr = manca * E[k].ricarica_cr_per_carica;
    costo += cr;
    e[k] = E[k].cariche;
    righe.push(`${E[k].nome}: +${cariche(manca)} (${cr} cr)`);
  }
  if (!costo) return null;
  return { mezzo: conRisorse(mezzo, { ...r, energia: e }), costo, ore: E.ricarica.ore, righe: [`Ricarica all’approdo: ${costo} cr, ${E.ricarica.ore} ore`, ...righe, 'Scudo e circuito Bianco non cambiano'] };
}

/** La vista per la scheda: riserve con massimi, Traiettoria, scudo, circuito; i valori null sono «da registrare». */
export function vistaNeverlost(mezzo, profilo) {
  const r = normalizzaNeverlost(mezzo, profilo);
  const E = profilo.energia_neverlost;
  return {
    riserve: COLORI.map((k) => ({ colore: k, nome: E[k].nome, cariche: r.energia[k], massimo: E[k].cariche, daRegistrare: r.energia[k] === null, testo: E[k].testo })),
    voloCariche: r.energia.volo_cariche,
    daAddebitare: r.energia.volo_cariche > 0 ? Math.ceil(r.energia.volo_cariche - 1e-9) : 0,
    approdo: r.energia.approdo_alimentato,
    traiettoria: r.energia.traiettoria,
    scudo: { ...r.scudo, massimo: profilo.scudo.sce_max },
    circuito: { pm: r.circuito.pm, massimo: profilo.circuito_bianco.pm },
  };
}

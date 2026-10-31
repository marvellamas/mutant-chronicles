// Veicoli (Manuale dei Veicoli 0.2; lotto 2 di docs/ricognizione-2026-10-03.md). Funzioni pure, nessuna
// interfaccia: regole e profili stanno in data/veicoli.json, la PS Integrità per Qualità in regole.json →
// integrita. Niente tiri di dado qui: i valori tirati arrivano da fuori, come in src/danno.js e src/attacco.js.
//
// Modello dei dati di un mezzo in gioco (lo stesso sia che il veicolo appartenga a un personaggio sia che sia
// del gruppo: la domanda A.91 cambia solo dove si salva, non la forma):
//
//   { profilo: 'asa-scout-mk4',            // id del catalogo, oppure «scheda» scritta a mano
//     nome: 'ASA Scout',                   // nome al tavolo, facoltativo
//     pi: { corpo: 54, propulsione: 36, motore: 24 },   // PI attuali; i massimi vengono dal profilo
//     andatura: 'veloce',                  // id dell'andatura corrente
//     conducente: 'pg:Lucas-Vane',         // chi guida: id del partecipante, o null
//     rinforzi: { 'copriruote-petra': { montati: [3, 3, 1, 0], ricambi: [3, 3] } },
//     energia: { modello: 'cariche', rosso, rosso_ricambi, verde, verde_ricambi, aria (ore), km_giornata, supporto_oggi },   // Veicoli 0.10; energia_prima: il valore di prima, A.193
//     munizioni: [{ caricate, riserva } | null],   // armi di bordo (A.101); andatura_scelta: A.104
//     ripristini: [{ struttura: 'motore', fino_a: 'fine_scena' }],   // Riparazione d'Emergenza (§7.3)
//     avarie: 'ruota posteriore destra cerchiata' }     // note del Direttore
//
// Tutto è facoltativo salvo «profilo»: `vistaVeicolo` riempie i valori mancanti dal profilo (mezzo integro).
import { provenienza, riga, righeRegoleAbilita } from './provenienza.js';

const lista = (v) => (Array.isArray(v) ? v : []);
const intero = (v, d = 0) => (Number.isInteger(v) ? v : d);

/** Il profilo di un mezzo dal catalogo (data/veicoli.json → profili), oppure null. */
export function profiloVeicolo(id, dati) {
  return (dati.veicoli?.profili ?? []).find((p) => p.id === id) ?? null;
}

/** Una andatura dal suo id (data/veicoli.json → andature.elenco). */
export function andaturaDi(id, dati) {
  const A = dati.veicoli.andature.elenco;
  return A.find((a) => a.id === id) ?? A.find((a) => a.id === 'controllata');
}

/** La manovra complessa dal suo id (§2.4). */
export const manovraDi = (id, dati) => (dati.veicoli.manovre.elenco ?? []).find((m) => m.id === id) ?? null;

/**
 * §2.1: movimento massimo di un Round. MOV × moltiplicatore dell'andatura, poi i bonus fissi in Q
 * (Spinta al Limite, Sovraccarico Tecnico), poi il costo del terreno.
 * @param opzioni { bonusQ, terrenoDifficile } terrenoDifficile: ogni Q attraversato costa 2 (§2.3)
 */
export function movimentoMassimo(profilo, andatura, dati, { bonusQ = 0, terrenoDifficile = false } = {}) {
  const a = andaturaDi(andatura, dati);
  const q = intero(profilo.mov_q) * a.moltiplicatore + intero(bonusQ);
  const costo = terrenoDifficile ? dati.veicoli.terreno.difficile_costo_q : 1;
  return { q, percorribili: Math.floor(Math.max(0, q) / costo), andatura: a, costoPerQ: costo };
}

/**
 * §4.4: stato di una struttura dai suoi PI attuali e massimi, con la penalità a Pilotare.
 * `fuoriUso` è true quando la struttura a 0 PI impedisce il funzionamento (Corpo e Motore).
 */
export function statoStruttura(idStruttura, attuali, massimi, dati) {
  const S = dati.veicoli.strutture;
  const def = S.elenco.find((x) => x.id === idStruttura);
  const pi = Math.max(0, Math.min(intero(attuali), intero(massimi)));
  const frazione = massimi > 0 ? pi / massimi : 0;
  let stato;
  if (pi === 0) stato = S.stati.find((s) => s.pi === 0);
  else if (pi === massimi) stato = S.stati.find((s) => s.da_frazione === 1);
  else stato = S.stati.find((s) => s.oltre_frazione !== undefined && frazione > s.oltre_frazione
    && (s.fino_a_frazione === undefined ? s.sotto_massimo : frazione <= s.fino_a_frazione));
  const penalita = stato?.penalita?.[idStruttura] ?? 0;
  return {
    struttura: idStruttura,
    nome: def?.nome ?? idStruttura,
    pi,
    massimi: intero(massimi),
    stato: stato?.id ?? null,
    statoNome: stato?.nome ?? null,
    // null nella tabella = struttura fuori uso: la penalità non si applica, il mezzo non funziona
    penalita: penalita === null ? null : penalita,
    fuoriUso: pi === 0 && !!def?.fuori_uso_a_zero,
    // §4.4: la Propulsione a 0 PI resta usabile a −8 VA
    parziale: pi === 0 && !def?.fuori_uso_a_zero ? def?.va_a_zero ?? null : null,
  };
}

/**
 * Le soglie dei quattro stati di una struttura, già calcolate: la scheda le stampa per non fare frazioni
 * al tavolo (§4.4: «La scheda riporta le soglie già calcolate»).
 * @returns [{ stato, nome, da, a, penalita }] dal più integro al più grave
 */
export function soglieStruttura(idStruttura, massimi, dati) {
  const S = dati.veicoli.strutture;
  const out = [];
  for (const s of S.stati) {
    if (s.da_frazione === 1) { out.push({ stato: s.id, nome: s.nome, da: massimi, a: massimi, penalita: s.penalita[idStruttura] }); continue; }
    if (s.pi === 0) { out.push({ stato: s.id, nome: s.nome, da: 0, a: 0, penalita: s.penalita[idStruttura] }); continue; }
    const a = s.fino_a_frazione === undefined ? massimi - 1 : Math.floor(massimi * s.fino_a_frazione);
    const da = Math.floor(massimi * s.oltre_frazione) + 1;
    out.push({ stato: s.id, nome: s.nome, da, a: Math.min(a, massimi - 1), penalita: s.penalita[idStruttura] });
  }
  return out;
}

/**
 * Vista di un mezzo in gioco: PI attuali e stato di ogni struttura, VA di Pilotare del conducente con la
 * provenienza, movimento disponibile, se è fuori uso. Non tocca i dati del mezzo.
 * @param mezzo vedi il modello in testa al file
 * @param opzioni { pilotareVa (VA personale del conducente), bonusQ, terrenoDifficile, manovra (id) }
 */
export function vistaVeicolo(mezzo, dati, { pilotareVa = null, bonusQ = 0, terrenoDifficile = false, manovra = null } = {}) {
  const profilo = profiloVeicolo(mezzo?.profilo, dati) ?? mezzo?.scheda ?? null;
  if (!profilo) return null;
  const strutture = dati.veicoli.strutture.elenco.map((s) => statoStruttura(s.id, mezzo?.pi?.[s.id] ?? profilo.pi[s.id], profilo.pi[s.id], dati));
  const andatura = andaturaDi(mezzo?.andatura ?? 'controllata', dati);
  const mov = movimentoMassimo(profilo, andatura.id, dati, { bonusQ, terrenoDifficile });
  // §4.4: fra le penalità strutturali vale solo la peggiore; §7.3: un ripristino temporaneo la sostituisce con −2
  const ripristinate = new Set(lista(mezzo?.ripristini).map((r) => r.struttura));
  const E = dati.veicoli.riparazione.emergenza;
  const strutturali = strutture.map((s) => (ripristinate.has(s.struttura)
    ? { ...s, penalita: E.va_temporaneo, fuoriUso: false, ripristinata: true }
    : s));
  const conPenalita = strutturali.filter((s) => s.penalita !== null && s.penalita !== 0);
  const peggiore = conPenalita.length ? conPenalita.reduce((a, b) => (b.penalita < a.penalita ? b : a)) : null;
  const parziale = strutturali.find((s) => s.parziale !== null && s.parziale !== undefined && s.pi === 0 && !s.ripristinata);
  const penalitaStrutturale = Math.min(peggiore?.penalita ?? 0, parziale?.parziale ?? 0);
  const m = manovra ? manovraDi(manovra, dati) : null;
  const righe = [];
  if (pilotareVa !== null) righe.push(riga('Pilotare del conducente', pilotareVa, 'VA personale (§1.2)'));
  if (profilo.man) righe.push(riga(`MAN del mezzo (${dati.veicoli.manovrabilita.fasce.find((f) => f.man === profilo.man)?.nome ?? ''})`, profilo.man, '§1.4'));
  if (andatura.pilotare) righe.push(riga(`Andatura ${andatura.nome}`, andatura.pilotare, '§2.1'));
  if (m?.va) righe.push(riga(m.nome, m.va, '§2.4'));
  if (penalitaStrutturale) righe.push(riga(`Danni: ${(peggiore ?? parziale).nome} ${(peggiore ?? parziale).statoNome ?? ''}`.trim(), penalitaStrutturale, '§4.4: solo la penalità peggiore'));
  const totale = (pilotareVa ?? 0) + (profilo.man ?? 0) + andatura.pilotare + (m?.va ?? 0) + penalitaStrutturale;
  return {
    profilo,
    nome: mezzo?.nome ?? profilo.nome,
    strutture: strutturali,
    andatura,
    movimento: mov,
    // §5.5: Corpo o Motore a 0 PI, il mezzo non funziona (resta il movimento residuo)
    fuoriUso: strutturali.some((s) => s.fuoriUso),
    penalitaStrutturale,
    pilotare: pilotareVa === null ? null : { valore: totale, provenienza: provenienza(righe, totale) },
    // §3.1: le penalità dell'andatura valgono per chi spara da bordo e per chi spara contro il mezzo
    attacco: { daBordo: andatura.attacco_da_bordo, contro: andatura.attacco_contro },
  };
}

/**
 * §3.1: penalità di un attacco fra due mezzi. Le penalità dell'andatura di chi spara e di quella del
 * bersaglio si sommano; fra occupanti dello stesso veicolo non si applicano (velocità condivisa).
 * @returns {{ valore, righe }}
 */
export function penalitaAttacco(andaturaAttaccante, andaturaBersaglio, dati, { stessoVeicolo = false } = {}) {
  if (stessoVeicolo) return { valore: 0, righe: [], stessoVeicolo: true };
  const righe = [];
  const a = andaturaAttaccante ? andaturaDi(andaturaAttaccante, dati) : null;
  const b = andaturaBersaglio ? andaturaDi(andaturaBersaglio, dati) : null;
  if (a?.attacco_da_bordo) righe.push(riga(`Attacca da un mezzo ad andatura ${a.nome}`, a.attacco_da_bordo, '§3.1'));
  if (b?.attacco_contro) righe.push(riga(`Bersaglio ad andatura ${b.nome}`, b.attacco_contro, '§3.1'));
  return { valore: righe.reduce((s, r) => s + r.valore, 0), righe };
}

/** §4.2: struttura colpita da un 1d20, o quella dichiarata con la selezione accurata. */
export function localizza(d20, dati, { accurata = null, occupantiEsposti = true } = {}) {
  const L = dati.veicoli.localizzazione;
  if (accurata) {
    const r = L.righe.find((x) => x.bersaglio === accurata);
    return { bersaglio: accurata, accurata: true, va: r?.accurata_va ?? 0, riga: r ?? null };
  }
  const r = L.righe.find((x) => d20 >= x.da && d20 <= x.a);
  // §4.2: occupanti indicati dal dado ma nessuno esposto → Motore
  const bersaglio = r?.bersaglio === 'occupanti' && !occupantiEsposti ? L.occupanti_non_esposti : r?.bersaglio ?? null;
  return { bersaglio, accurata: false, va: 0, riga: r ?? null, dirottato: bersaglio !== r?.bersaglio };
}

/** §4.3: AR del mezzo applicabile alla natura del danno (Etereo: solo la componente magica). */
export function arVeicolo(profilo, natura, dati) {
  const chiave = dati.veicoli.danno.ar_per_natura[natura] ?? 'totale';
  return chiave === 'magica' ? intero(profilo.ar?.magica) : intero(profilo.ar?.totale);
}

/** §4.3: PI potenziali di una applicazione di danno residuo (1 PI ogni N danni o frazione). */
export const piDaDanno = (residuo, dati) => (residuo > 0 ? Math.ceil(residuo / dati.veicoli.danno.danni_per_pi) : 0);

/**
 * §4.3: un colpo contro una struttura del veicolo. Ordine: danno (già con i moltiplicatori) meno l'AR →
 * PI di ogni applicazione → PI del Magistrale e delle proprietà → una sola PS Integrità → Corazzato.
 * @param colpo { danni: [per applicazione], natura, magistrale, piAggiuntivi (proprietà), ps: true|false|null }
 *   `ps` è l'esito della PS Integrità della struttura: true riuscita, false fallita, null «ancora da tirare».
 * @returns {{ struttura, applicazioni, piPotenziali, piPersi, pi: {prima, dopo}, stato, psRichiesta, provenienza }}
 */
export function applicaColpoVeicolo(mezzo, struttura, colpo, dati) {
  const D = dati.veicoli.danno;
  const profilo = profiloVeicolo(mezzo?.profilo, dati) ?? mezzo?.scheda;
  const massimi = profilo.pi[struttura];
  const prima = Math.max(0, Math.min(mezzo?.pi?.[struttura] ?? massimi, massimi));
  const ar = arVeicolo(profilo, colpo.natura ?? 'Naturale', dati);
  const righe = [];
  const applicazioni = lista(colpo.danni).map((d, i) => {
    const tirato = Math.max(0, intero(d));
    const residuo = Math.max(0, tirato - ar);
    const pi = piDaDanno(residuo, dati);
    righe.push(riga(`Applicazione ${i + 1}: ${tirato} − AR ${ar} = ${residuo}`, pi, `1 PI ogni ${D.danni_per_pi} danni o frazione (§4.3)`));
    return { tirato, ar, residuo, pi };
  });
  let potenziali = applicazioni.reduce((s, a) => s + a.pi, 0);
  // §4.3: il Magistrale aggiunge il suo PI anche quando l'AR assorbe tutto il danno
  if (colpo.magistrale) { potenziali += D.magistrale_pi; righe.push(riga('Successo Magistrale', D.magistrale_pi, 'PI aggiuntivo, anche con danno assorbito (§4.3)')); }
  const extra = intero(colpo.piAggiuntivi);
  if (extra) { potenziali += extra; righe.push(riga('Proprietà dell’attacco', extra, '§4.3')); }
  // §4.3: una sola PS Integrità per struttura e per colpo, e solo se c'è una perdita potenziale
  const psRichiesta = potenziali > 0;
  let persi = potenziali;
  if (psRichiesta && colpo.ps === true) {
    persi = Math.max(D.ps_minimo_pi, Math.ceil(potenziali / 2));
    righe.push(riga(`PS Integrità ${profilo.ps_integrita} riuscita`, persi - potenziali, `dimezza per eccesso, minimo ${D.ps_minimo_pi} (§4.3)`));
  }
  const corazzato = intero(profilo.corazzato);
  if (psRichiesta && corazzato) {
    const dopo = Math.max(0, persi - corazzato);
    righe.push(riga(`Corazzato ${corazzato}`, dopo - persi, 'riduce i PI da perdere, anche fino a 0 (§4.3)'));
    persi = dopo;
  }
  const dopo = Math.max(0, prima - persi);
  return {
    struttura,
    applicazioni,
    piPotenziali: potenziali,
    piPersi: prima - dopo,
    // PI da perdere dopo PS e Corazzato, prima del limite dei PI attuali: servono ai rinforzi (Copriruote)
    piDaPerdere: persi,
    pi: { prima, dopo, massimi },
    stato: statoStruttura(struttura, dopo, massimi, dati),
    psRichiesta,
    psEsito: colpo.ps ?? null,
    provenienza: provenienza(righe, prima - dopo),
  };
}

/**
 * Copriruote di Petra e altri rinforzi di una struttura (scheda ASA Scout MK4): la perdita esaurisce i pezzi
 * montati uno dopo l'altro e solo l'eccedenza arriva ai PI della struttura. Una sola PS per colpo, già fatta.
 * @param montati PI residui dei pezzi montati, in ordine
 * @returns {{ montati, assorbiti, allaStruttura }}
 */
export function assorbiConRinforzi(montati, piPersi, dati) {
  const out = lista(montati).map((x) => Math.max(0, intero(x)));
  let resta = Math.max(0, intero(piPersi));
  let assorbiti = 0;
  for (let i = 0; i < out.length && resta > 0; i++) {
    const preso = Math.min(out[i], resta);
    out[i] -= preso;
    resta -= preso;
    assorbiti += preso;
  }
  return { montati: out, assorbiti, allaStruttura: resta };
}

/**
 * §5.1 e §5.4: dadi del danno di una collisione o di una caduta.
 * @param tipo id di collisioni.riferimento (§5.1) oppure 'caduta'
 * @param q Q di riferimento (collisione) o dislivello verticale in Q (caduta)
 */
export function dadiCollisione(tipo, q, dati) {
  const C = dati.veicoli.collisioni;
  if (tipo === 'caduta') {
    // §5.4: un dado ogni 2 Q completi; una frazione inferiore non aggiunge un dado
    return { dadi: Math.floor(Math.max(0, q) / C.caduta.q_per_dado), dado: C.caduta.dado, arRiduce: C.caduta.ar_riduce, tipo: 'caduta' };
  }
  // §5.1: un dado ogni 10 Q di riferimento o frazione; 0 Q è semplice contatto, senza danno
  return { dadi: q > 0 ? Math.ceil(q / C.q_per_dado) : 0, dado: C.dado, arRiduce: true, tipo };
}

/** §5.1: Q di riferimento di una collisione, dalle andature dei due mezzi. */
export function qCollisione(tipo, qAttaccante, qBersaglio, dati) {
  const r = (dati.veicoli.collisioni.riferimento ?? []).find((x) => x.id === tipo);
  const a = Math.max(0, intero(qAttaccante));
  const b = Math.max(0, intero(qBersaglio));
  switch (r?.formula) {
    case 'somma': return a + b;
    case 'differenza': return Math.abs(a - b);
    case 'maggiore': return Math.max(a, b);
    default: return a; // contro un ostacolo fisso o un veicolo fermo
  }
}

/**
 * §5.2: danno di un incidente a un occupante. Il danno base dell'urto, non ridotto dall'Armatura personale;
 * la cintura dimezza per eccesso, poi una PS di Tempra riuscita dimezza di nuovo per eccesso.
 */
export function dannoOccupante(danno, dati, { cintura = false, tempra = null } = {}) {
  const O = dati.veicoli.collisioni.occupanti;
  const righe = [riga('Danno base dell’urto', Math.max(0, intero(danno)), 'l’Armatura personale ordinaria non lo riduce (§5.2)')];
  let d = Math.max(0, intero(danno));
  if (cintura && O.cintura_dimezza_per_eccesso) { const n = Math.ceil(d / 2); righe.push(riga('Cintura o imbracatura', n - d, 'dimezza per eccesso e impedisce l’espulsione (§5.2)')); d = n; }
  if (tempra === true) { const n = Math.ceil(d / 2); righe.push(riga(`PS di ${O.salvezza} riuscita`, n - d, 'dimezza per eccesso (§5.2)')); d = n; }
  return { danno: d, provenienza: provenienza(righe, d), espulsionePossibile: !cintura, salvezzaEspulsione: O.espulsione_salvezza };
}

/**
 * §7.1: una riparazione ordinaria di una struttura. Un'ora, una Prova di Tecnologia al termine.
 * @param esito id di riparazione.esiti
 * @param opzioni { capacita: [nomi delle capacità professionali], strumentiImprovvisati }
 * @returns {{ pi: {prima, dopo, massimi}, recuperati, minuti, va, costoRicambi, stato, note }}
 */
export function riparaVeicolo(mezzo, struttura, esito, dati, { capacita = [], strumentiImprovvisati = false, kit = false } = {}) {
  const R = dati.veicoli.riparazione;
  const profilo = profiloVeicolo(mezzo?.profilo, dati) ?? mezzo?.scheda;
  const massimi = profilo.pi[struttura];
  const prima = Math.max(0, Math.min(mezzo?.pi?.[struttura] ?? massimi, massimi));
  const e = R.esiti.find((x) => x.id === esito);
  const note = [];
  // capacità professionali (§7.2): bonus a Tecnologia e tempo, con il limite di metà del tempo ordinario
  let va = 0;
  let minuti = R.minuti;
  for (const nome of capacita) {
    const c = R.capacita.find((x) => x.nome === nome);
    if (!c) { note.push(`${nome}: non è una capacità di veicoli.json → riparazione.capacita`); continue; }
    if (c.tecnologia) va += c.tecnologia;
    if (c.minuti) minuti = Math.min(minuti, c.minuti);
    note.push(`${c.nome}: ${c.applicazione}`);
  }
  minuti = Math.max(minuti, Math.ceil(R.minuti * R.tempo_minimo_frazione));
  if (strumentiImprovvisati) { va += R.strumenti_improvvisati_va; note.push(`Strumenti improvvisati: ${R.strumenti_improvvisati_va} VA (§7.1)`); }
  // A.101: corredo di manutenzione del mezzo, +2 a Tecnologia per le riparazioni compatibili
  if (kit && profilo.kit_riparazione) { va += intero(profilo.kit_riparazione.tecnologia); note.push(`${profilo.kit_riparazione.nome}: ${segnoN(intero(profilo.kit_riparazione.tecnologia))} a Tecnologia (A.101)`); }
  if (Number.isInteger(profilo.officina_cr_per_ora)) note.push(`In officina: ${profilo.officina_cr_per_ora} cr per ora lavorata, oltre ai materiali (A.101)`);
  // §7.1: il Maldestro toglie 1 PI, senza PS e senza riduzioni; Manutenzione Preventiva può pararlo
  let delta = intero(e?.pi);
  if (delta < 0) {
    const protetto = capacita.some((n) => R.capacita.find((x) => x.nome === n)?.riduce_perdita_pi);
    if (protetto) { delta = Math.min(0, delta + 1); note.push('Manutenzione Preventiva: 1 PI di perdita in meno (§7.2)'); }
  }
  const dopo = Math.max(0, Math.min(massimi, prima + delta));
  const recuperati = Math.max(0, dopo - prima);
  const costo = recuperati * intero(profilo.ricambi_cr_per_pi?.[struttura]);
  return {
    struttura,
    esito: e?.nome ?? esito,
    pi: { prima, dopo, massimi },
    recuperati,
    persi: Math.max(0, prima - dopo),
    minuti,
    va,
    costoRicambi: costo,
    stato: statoStruttura(struttura, dopo, massimi, dati),
    note,
  };
}

/** Un mezzo con i PI di una struttura cambiati: nuovo oggetto, senza toccare quello di prima. */
export function conPi(mezzo, struttura, pi) {
  return { ...mezzo, pi: { ...(mezzo?.pi ?? {}), [struttura]: Math.max(0, intero(pi)) } };
}

/**
 * §5.5: andatura del Round successivo per un mezzo fuori uso o senza conducente: a terra scende di una
 * fascia a ogni Iniziativa, fino all'arresto. Negli altri ambienti la conseguenza è descrittiva.
 */
export function andaturaResidua(idAndatura, ambiente, dati) {
  const A = dati.veicoli.andature.elenco;
  const i = A.findIndex((a) => a.id === (idAndatura ?? 'controllata'));
  const amb = (dati.veicoli.fuori_uso.ambienti ?? []).find((x) => x.id === ambiente) ?? null;
  if (ambiente !== 'terra') return { andatura: A[Math.max(0, i)], scesa: false, conseguenza: amb?.conseguenza ?? null };
  return { andatura: A[Math.max(0, i - 1)], scesa: i > 0, conseguenza: amb?.conseguenza ?? null };
}

// ---------------------------------------------------------------------------
// Veicoli nel file del personaggio (lotto 3 dei Veicoli; A.91 decisa il 05/10/2026, decisione 111; dati in
// veicoli.json → personaggio): il mezzo sta nelle scelte del PG che lo possiede (`scelte.veicoli`, scritto solo
// se non vuoto) con la forma del modello in testa al file, più `uid`, `gruppo` (casella «Veicolo del gruppo»,
// solo informativa) e `conducente` (true se lo guida il personaggio). Senza server; con il server il veicolo è un
// record del registro unico e qui resta il riferimento { uid, rif, nome } (A.91, src/veicoli-registro.js).

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const testo = (v) => (typeof v === 'string' ? v.trim() : '');
let progressivo = 0;
const segnoN = (n) => (n < 0 ? `−${-n}` : `+${n}`);
const nuovoUid = () => `vei${Date.now().toString(36)}${(progressivo++).toString(36)}`;

/** Gli id delle tre strutture (§4.1). */
export const struttureVeicolo = (dati) => dati.veicoli.strutture.elenco.map((s) => s.id);

/**
 * Profilo di un mezzo scritto a mano (come i nemici fuori dal bestiario): gli stessi campi di un profilo del
 * catalogo, con i valori minimi sensati. La PS Integrità, se manca, viene dalla Qualità (regole.json → integrita).
 */
export function schedaManuale(x, dati) {
  const s = isOggetto(x) ? x : {};
  const qualita = testo(s.qualita) || 'Comune';
  const psQ = dati.regole?.integrita?.ps_per_qualita?.[qualita] ?? null;
  const M = dati.veicoli.manovrabilita.fasce.map((f) => f.man);
  const pi = Object.fromEntries(struttureVeicolo(dati).map((k) => [k, Math.max(1, intero(s.pi?.[k], 1))]));
  const arTot = Math.max(0, intero(s.ar?.totale, 0));
  return {
    id: null, nome: testo(s.nome) || 'Veicolo', manuale: true, tipo: testo(s.tipo) || 'terrestre',
    mov_q: Math.max(0, intero(s.mov_q, 0)),
    man: Math.min(Math.max(...M), Math.max(Math.min(...M), intero(s.man, 0))),
    ar: { totale: arTot, magica: Math.max(0, Math.min(arTot, intero(s.ar?.magica, 0))) },
    corazzato: Math.max(0, intero(s.corazzato, 0)),
    pi, qualita, ps_integrita: Number.isInteger(s.ps_integrita) ? s.ps_integrita : psQ,
    equipaggio: { posti: Math.max(1, intero(s.equipaggio?.posti, 1)) },
    armi: [], proprieta: [], rinforzi: [],
    prezzo_cr: Number.isInteger(s.prezzo_cr) ? s.prezzo_cr : null, reperibilita: testo(s.reperibilita) || null,
    note: testo(s.note),
  };
}

/** Profilo di un mezzo del personaggio: dal catalogo, dalla scheda scritta a mano, oppure null. */
export function profiloDi(mezzo, dati) {
  if (mezzo?.profilo) return profiloVeicolo(mezzo.profilo, dati);
  return isOggetto(mezzo?.scheda) ? schedaManuale(mezzo.scheda, dati) : null;
}

/** Rinforzi del profilo con tutti i pezzi montati e di ricambio integri (scheda dello Scout: Copriruote). */
function rinforziIniziali(profilo) {
  return Object.fromEntries(lista(profilo.rinforzi).map((r) => [r.id, {
    montati: Array(intero(r.installati)).fill(intero(r.pi_per_pezzo)),
    ricambi: Array(intero(r.ricambi)).fill(intero(r.pi_per_pezzo)),
  }]));
}

/**
 * Un mezzo nuovo per la scheda: integro, fermo, nessun conducente, NEC carico.
 * @param origine id del catalogo (veicoli.json → profili) oppure i campi di una scheda scritta a mano
 */
export function nuovoVeicolo(origine, dati, { uid = null, nome = null } = {}) {
  const catalogo = typeof origine === 'string';
  const profilo = catalogo ? profiloVeicolo(origine, dati) : schedaManuale(origine, dati);
  if (!profilo) return null;
  const { id: _id, manuale: _m, ...scheda } = profilo;
  return {
    uid: uid ?? nuovoUid(),
    ...(catalogo ? { profilo: origine } : { scheda }),
    nome: testo(nome) || profilo.nome,
    gruppo: false,
    conducente: false,
    andatura: 'fermo',
    pi: { ...profilo.pi },
    rinforzi: rinforziIniziali(profilo),
    ...normalizzaRisorse({}, profilo), // A.101: dotazione energetica e munizioni iniziali
    avarie: '',
  };
}

/**
 * Normalizza i veicoli salvati nelle scelte: PI fra 0 e i massimi, andatura esistente, pezzi dei rinforzi fra 0
 * e i loro PI. Un mezzo con un profilo non più nel catalogo resta com'è (con l'avviso): niente si perde.
 */
export function normalizzaVeicoli(veicoli, dati, avvisi = []) {
  const andature = dati.veicoli.andature.elenco.map((a) => a.id);
  return lista(veicoli).filter(isOggetto).map((v) => {
    // A.91: riferimento al registro unico dei veicoli (src/veicoli-registro.js): resta com'è.
    // A.113: con il riferimento viaggia l'ultima copia del record, da consultare in sola lettura senza server.
    if (typeof v.rif === 'string' && v.rif) return { uid: testo(v.uid) || v.rif, rif: v.rif, nome: testo(v.nome) || v.rif, ...(isOggetto(v.copia) ? { copia: v.copia } : {}) };
    const profilo = profiloDi(v, dati);
    if (!profilo) {
      avvisi.push(`Veicolo «${testo(v.nome) || v.profilo || 'senza nome'}»: profilo «${v.profilo ?? '—'}» non più nel catalogo dei veicoli; resta nel file, senza scheda.`);
      return { ...v, uid: testo(v.uid) || nuovoUid() };
    }
    const pi = Object.fromEntries(struttureVeicolo(dati).map((k) => [k, Math.max(0, Math.min(profilo.pi[k], intero(v.pi?.[k], profilo.pi[k])))]));
    const rinforzi = Object.fromEntries(lista(profilo.rinforzi).map((r) => {
      const x = isOggetto(v.rinforzi?.[r.id]) ? v.rinforzi[r.id] : {};
      const pezzo = (n) => Math.max(0, Math.min(intero(r.pi_per_pezzo), intero(n, intero(r.pi_per_pezzo))));
      const montati = Array.from({ length: intero(r.installati) }, (_, i) => pezzo(lista(x.montati)[i]));
      const ricambi = (Array.isArray(x.ricambi) ? x.ricambi : Array(intero(r.ricambi)).fill(intero(r.pi_per_pezzo))).slice(0, intero(r.complessivi)).map(pezzo);
      return [r.id, { montati, ricambi }];
    }));
    const out = {
      uid: testo(v.uid) || nuovoUid(),
      ...(v.profilo ? { profilo: v.profilo } : { scheda: v.scheda }),
      nome: testo(v.nome) || profilo.nome,
      gruppo: v.gruppo === true,
      conducente: v.conducente === true,
      andatura: andature.includes(v.andatura) ? v.andatura : 'fermo',
      // A.104: andatura scelta per dopo, distinta da quella attuale
      ...(andature.includes(v.andatura_scelta) && v.andatura_scelta !== v.andatura ? { andatura_scelta: v.andatura_scelta } : {}),
      pi,
      rinforzi,
      ...normalizzaRisorse(v, profilo), // A.101: energia, aria e munizioni
      avarie: testo(v.avarie),
    };
    if (Array.isArray(v.ripristini) && v.ripristini.length) out.ripristini = v.ripristini.filter((r) => struttureVeicolo(dati).includes(r?.struttura));
    return out;
  });
}

/**
 * Un colpo contro il mezzo del personaggio (§4.2, §4.3): localizzazione con il d20 o la struttura scelta
 * (selezione accurata), procedura del danno, rinforzi della struttura (i pezzi montati assorbono in successione,
 * l'eccedenza va ai PI), fine del ripristino temporaneo se la struttura perde PI (§7.3). Non tocca il mezzo.
 * @param scelta { d20 } oppure { struttura }; colpo come applicaColpoVeicolo
 * @returns {{ mezzo, localizzazione, occupanti, esito, rinforzi, piPersi, prima, dopo, avviso }}
 */
export function colpisciVeicolo(mezzo, scelta, colpo, dati, { occupantiEsposti = true } = {}) {
  const profilo = profiloDi(mezzo, dati);
  const loc = scelta?.struttura ? localizza(null, dati, { accurata: scelta.struttura }) : localizza(intero(scelta?.d20), dati, { occupantiEsposti });
  if (loc.bersaglio === 'occupanti') {
    return { mezzo, localizzazione: loc, occupanti: true, esito: null, rinforzi: null, piPersi: 0,
      avviso: `${mezzo.nome}: il colpo raggiunge un occupante esposto, che lo risolve con le proprie protezioni, PV, Ferite e Salvezze, senza il Corazzato del veicolo (§4.2).` };
  }
  const s = loc.bersaglio;
  const nomeStr = dati.veicoli.strutture.elenco.find((x) => x.id === s)?.nome ?? s;
  const base = { ...mezzo, profilo: undefined, scheda: profilo };
  const esito = applicaColpoVeicolo(base, s, colpo, dati);
  const prima = statoStruttura(s, esito.pi.prima, profilo.pi[s], dati);
  let allaStruttura = esito.piDaPerdere;
  let rinforzi = null;
  let nuovo = mezzo;
  const r = lista(profilo.rinforzi).find((x) => x.struttura === s);
  if (r && esito.piDaPerdere > 0) {
    const montati = mezzo.rinforzi?.[r.id]?.montati ?? Array(intero(r.installati)).fill(intero(r.pi_per_pezzo));
    const a = assorbiConRinforzi(montati, esito.piDaPerdere, dati);
    rinforzi = { id: r.id, nome: r.nome, ...a };
    allaStruttura = a.allaStruttura;
    nuovo = { ...nuovo, rinforzi: { ...(mezzo.rinforzi ?? {}), [r.id]: { ...(mezzo.rinforzi?.[r.id] ?? {}), montati: a.montati } } };
  }
  const dopoPi = Math.max(0, esito.pi.prima - allaStruttura);
  nuovo = conPi(nuovo, s, dopoPi);
  const piPersi = esito.pi.prima - dopoPi;
  // §7.3: il ripristino temporaneo termina quando la struttura subisce una nuova perdita di PI
  if (piPersi > 0 && lista(nuovo.ripristini).some((x) => x.struttura === s)) nuovo = { ...nuovo, ripristini: nuovo.ripristini.filter((x) => x.struttura !== s) };
  const dopo = statoStruttura(s, dopoPi, profilo.pi[s], dati);
  const meno = (n) => (n < 0 ? `−${-n}` : `+${n}`);
  const pen = (x) => (x.fuoriUso ? 'fuori uso' : x.penalita ? `Pilotare ${meno(x.penalita)}` : 'nessuna penalità');
  const parti = [`${mezzo.nome}, ${nomeStr}: ${piPersi} PI persi (${esito.pi.prima} → ${dopoPi} su ${profilo.pi[s]})`];
  if (rinforzi?.assorbiti) parti.push(`${rinforzi.nome}: ${rinforzi.assorbiti} PI assorbiti dai pezzi montati`);
  if (prima.stato !== dopo.stato) parti.push(`stato ${prima.statoNome} → ${dopo.statoNome} (${pen(dopo)})`);
  if (dopo.fuoriUso) parti.push('il veicolo è fuori uso: non funziona, ma non esplode e il movimento residuo prosegue (§5.5)');
  return { mezzo: nuovo, localizzazione: loc, occupanti: false, esito, rinforzi, piPersi, prima, dopo, avviso: `${parti.join('; ')}.` };
}

/** Una riparazione ordinaria applicata al mezzo (§7.1): il risultato di riparaVeicolo e il mezzo nuovo. */
export function applicaRiparazione(mezzo, struttura, esito, dati, opzioni = {}) {
  const profilo = profiloDi(mezzo, dati);
  const r = riparaVeicolo({ ...mezzo, profilo: undefined, scheda: profilo }, struttura, esito, dati, opzioni);
  // costo dei ricambi «da definire» se il profilo non lo dice (A.101: lo Scout non ha i costi per PI)
  const costoDaDefinire = !Number.isInteger(profilo.ricambi_cr_per_pi?.[struttura]);
  return { mezzo: conPi(mezzo, struttura, r.pi.dopo), riparazione: { ...r, costoDaDefinire } };
}

// ---------------------------------------------------------------------------
// Energia, aria e munizioni del mezzo (A.101, E&L del 05/10/2026): riserve residue nel mezzo, consumi dai dati
// del profilo (alimentazione, supporto_vitale, armi[].munizioni_iniziali). Niente ripristino automatico.

/** Frazioni di carica senza rumore di virgola mobile: sei decimali bastano a tenere i resti della conversione (A.193). */
const arrotonda = (n) => Math.round(n * 1e6) / 1e6;
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
const entro = (n, min, max, d) => Math.max(min, Math.min(max, num(n, d)));
const somma = (l) => lista(l).filter(Number.isFinite).reduce((t, n) => t + n, 0);

/**
 * Riserve iniziali del profilo, in cariche (Veicoli 0.10 §9.1 e §10): la carica Rossa, quella Verde del supporto
 * vitale, le ore d'aria (riserva distinta, un solo contatore), i km della giornata e il segno «supporto usato oggi»
 * che la chiusura della giornata azzera. Un profilo senza `cariche` non ha riserve.
 */
function energiaIniziale(profilo) {
  const a = profilo?.alimentazione;
  const sv = profilo?.supporto_vitale;
  const e = { modello: 'cariche' };
  if (Number.isInteger(a?.cariche)) {
    e.rosso = a.cariche;
    e.rosso_ricambi = lista(a.ricambi_iniziali).filter(Number.isFinite);
    e.km_giornata = 0;
  }
  if (Number.isInteger(sv?.verde?.cariche)) {
    e.verde = sv.verde.cariche;
    e.verde_ricambi = lista(sv.verde.ricambi_iniziali).filter(Number.isFinite);
    e.supporto_oggi = false;
  }
  if (Number.isFinite(sv?.aria?.ore_massime)) e.aria = sv.aria.ore_massime;
  return e.rosso !== undefined || e.verde !== undefined || e.aria !== undefined ? e : null;
}

/** Munizioni iniziali delle armi di bordo che le hanno (stesso ordine di profilo.armi; null le altre). */
function munizioniIniziali(profilo) {
  const m = lista(profilo?.armi).map((a) => (isOggetto(a.munizioni_iniziali) ? { caricate: intero(a.munizioni_iniziali.caricate), riserva: intero(a.munizioni_iniziali.riserva) } : null));
  return m.some(Boolean) ? m : null;
}

/** Il mezzo ha ancora le riserve del modello di prima (banchi e moduli in Lx, aria fissa più bombole)? */
const inLx = (v) => (isOggetto(v?.energia) && v.energia.modello !== 'cariche' && (Array.isArray(v.energia.rosso) || Array.isArray(v.energia.verde) || isOggetto(v.energia.aria))) || (!isOggetto(v?.energia) && Number.isFinite(v?.nec?.lx));

/** Il valore di prima di un mezzo con le riserve in Lx, com'era nel file (A.193): resta scritto accanto alle cariche. */
const valoreDiPrima = (v) => ({ regola: 'A.193', modello: 'lx', ...(isOggetto(v.energia) ? { energia: v.energia } : {}), ...(isOggetto(v.nec) ? { nec: v.nec } : {}) });

/**
 * A.193 (risposta di Davide del 30/10/2026): le riserve salvate in Lx passano al modello a cariche conservando la
 * **frazione** residua, senza equivalenza universale fra Lx e cariche: un MEC Rosso a metà (50.000 Lx su 100.000)
 * diventa 5 cariche su 10. Niente arrotondamento per eccesso (le frazioni restano dentro il valore, sei decimali);
 * il valore originale resta nel file (`energia_prima`) e dopo il primo salvataggio il mezzo è già «a cariche»: la
 * conversione non si ripete. Se il profilo non dice con certezza la capacità di prima (`energia_precedente`) la
 * riserva resta «da convertire» fino alla verifica del Direttore; i ricambi di prima (altri Banchi e Moduli) non
 * hanno un profilo nuovo certo e restano «da convertire». Le ore d'aria non cambiano unità: fissa + bombole.
 * @returns {{ energia, prima }}
 */
function convertiDaLx(v, profilo, base) {
  const x = isOggetto(v.energia) ? v.energia : {};
  const P = profilo.energia_precedente ?? {};
  const e = { ...base };
  const daConvertire = [];
  const ricambi = {};
  const converti = (chiave, lx, capLx, cariche) => {
    if (lx === null) return;
    if (Number.isFinite(capLx) && capLx > 0) e[chiave] = arrotonda(entro(lx / capLx, 0, 1) * cariche);
    else { e[chiave] = null; daConvertire.push(chiave); }
  };
  if (base.rosso !== undefined) {
    const lx = Array.isArray(x.rosso) ? somma(x.rosso) : Number.isFinite(v?.nec?.lx) ? v.nec.lx : null;
    converti('rosso', lx, P.rosso_lx, base.rosso);
    const r = lista(x.rosso_ricambi).filter(Number.isFinite);
    if (r.length) ricambi.rosso = r;
  }
  if (base.verde !== undefined) {
    converti('verde', Array.isArray(x.verde) ? somma(x.verde) : null, P.verde_lx, base.verde);
    const r = lista(x.verde_ricambi).filter(Number.isFinite);
    if (r.length) ricambi.verde = r;
  }
  if (base.aria !== undefined && isOggetto(x.aria)) e.aria = entro(num(x.aria.fissa) + somma(x.aria.bombole), 0, base.aria, base.aria);
  if (daConvertire.length) e.da_convertire = daConvertire;
  if (Object.keys(ricambi).length) e.ricambi_da_convertire = ricambi;
  return { energia: e, prima: valoreDiPrima(v) };
}

/** Le riserve di un mezzo già a cariche, nei limiti del profilo. */
function energiaLetta(x, base) {
  const e = { modello: 'cariche' };
  const daConvertire = lista(x.da_convertire).filter((k) => k === 'rosso' || k === 'verde');
  if (base.rosso !== undefined) {
    e.rosso = x.rosso === null && daConvertire.includes('rosso') ? null : entro(x.rosso, 0, base.rosso, base.rosso);
    e.rosso_ricambi = lista(x.rosso_ricambi).filter(Number.isFinite).map((n) => entro(n, 0, base.rosso));
    e.km_giornata = Math.max(0, arrotonda(num(x.km_giornata)));
  }
  if (base.verde !== undefined) {
    e.verde = x.verde === null && daConvertire.includes('verde') ? null : entro(x.verde, 0, base.verde, base.verde);
    e.verde_ricambi = lista(x.verde_ricambi).filter(Number.isFinite).map((n) => entro(n, 0, base.verde));
    e.supporto_oggi = x.supporto_oggi === true;
  }
  if (base.aria !== undefined) e.aria = entro(x.aria, 0, base.aria, base.aria);
  const dc = daConvertire.filter((k) => e[k] === null);
  if (dc.length) e.da_convertire = dc;
  if (isOggetto(x.ricambi_da_convertire)) {
    const r = Object.fromEntries(['rosso', 'verde'].map((k) => [k, lista(x.ricambi_da_convertire[k]).filter(Number.isFinite)]).filter(([, l]) => l.length));
    if (Object.keys(r).length) e.ricambi_da_convertire = r;
  }
  return e;
}

/**
 * Riserve del mezzo salvato, nei limiti del profilo. Un mezzo con le riserve del modello di prima (energia in Lx, o
 * il vecchio «nec: { lx }» di prima del 05/10/2026) passa alle cariche con la regola della A.193 (convertiDaLx); le
 * riserve che il file non ha partono dalla dotazione iniziale del profilo (A.101).
 */
function normalizzaRisorse(v, profilo) {
  const base = energiaIniziale(profilo);
  let energia = null;
  let prima = isOggetto(v?.energia_prima) ? v.energia_prima : null;
  if (base) {
    if (isOggetto(v?.energia) && v.energia.modello === 'cariche') energia = energiaLetta(v.energia, base);
    else if (inLx(v)) {
      const c = convertiDaLx(v, profilo, base);
      energia = c.energia;
      prima = prima ?? c.prima;
    } else energia = base;
  }
  const mBase = munizioniIniziali(profilo);
  const munizioni = mBase ? mBase.map((m, i) => {
    if (!m) return null;
    const y = lista(v?.munizioni)[i];
    const cap = intero(profilo.armi[i].capacita, m.caricate);
    return isOggetto(y) ? { caricate: entro(y.caricate, 0, cap, cap), riserva: Math.max(0, intero(y.riserva, m.riserva)) } : m;
  }) : null;
  return { ...(energia ? { energia } : {}), ...(prima && energia ? { energia_prima: prima } : {}), ...(munizioni ? { munizioni } : {}) };
}

/** «3 cariche», «1 carica», «0,5 cariche»: le frazioni di una conversione restano visibili. */
export const testoCariche = (n) => `${String(arrotonda(n)).replace('.', ',')} ${arrotonda(n) === 1 ? 'carica' : 'cariche'}`;

// ogni azione sulle riserve parte dal mezzo come sta nel file: se è ancora in Lx, il valore di prima resta scritto (A.193)
const comeMezzo = (mezzo, energia) => ({ ...mezzo, energia, ...(inLx(mezzo) && !mezzo.energia_prima ? { energia_prima: valoreDiPrima(mezzo) } : {}) });

/**
 * Veicoli 0.10 §9.1 e §10: una tratta di viaggio. I chilometri si **sommano** per la giornata e non toccano le
 * cariche: l'arrotondamento per eccesso si fa una volta sola, in `chiudiGiornata`.
 * @returns {{ mezzo, righe: string[], avvisi: string[] }}
 */
export function registraViaggio(mezzo, km, dati) {
  const profilo = profiloDi(mezzo, dati);
  const e = normalizzaRisorse(mezzo, profilo).energia;
  if (!(km > 0)) return { mezzo, righe: [], avvisi: [] };
  if (e?.rosso === undefined) return { mezzo, righe: [], avvisi: ['Il mezzo non ha una riserva Rossa a cariche nel profilo.'] };
  const tot = arrotonda(e.km_giornata + km);
  const kmC = profilo.alimentazione.km_per_carica;
  const c = Math.ceil(tot / kmC - 1e-9);
  return { mezzo: comeMezzo(mezzo, { ...e, km_giornata: tot }), righe: [`Viaggio: +${km} km, in giornata ${tot} km (a fine giornata ${testoCariche(c)} Ross${c === 1 ? 'a' : 'e'}, ${kmC} km a carica)`], avvisi: [] };
}

/**
 * Scout 0.6: il supporto vitale acceso per qualche ora. Le **ore d'aria** (riserva distinta, 24 ore effettive anche non
 * consecutive) scendono subito; la carica Verde no: il segno «usato oggi» fa consumare una sola carica alla chiusura
 * della giornata, quante che siano le accensioni.
 */
export function registraSupportoVitale(mezzo, ore, dati) {
  const profilo = profiloDi(mezzo, dati);
  const e = normalizzaRisorse(mezzo, profilo).energia;
  if (!(ore > 0)) return { mezzo, righe: [], avvisi: [] };
  if (e?.aria === undefined && e?.verde === undefined) return { mezzo, righe: [], avvisi: ['Il mezzo non ha un supporto vitale nel profilo.'] };
  const avvisi = [];
  const righe = [];
  const nuovo = { ...e };
  if (e.aria !== undefined) {
    nuovo.aria = Math.max(0, arrotonda(e.aria - ore));
    righe.push(`Aria: ${ore} h effettive, restano ${nuovo.aria} h`);
    if (e.aria < ore) avvisi.push(`Aria esaurita: mancano ${arrotonda(ore - e.aria)} ore (ricarica le bombole).`);
  }
  if (e.verde !== undefined) {
    nuovo.supporto_oggi = true;
    righe.push(e.supporto_oggi ? 'Supporto vitale già usato oggi: la carica Verde è una sola' : 'Supporto vitale usato oggi: alla chiusura della giornata 1 carica Verde');
  }
  return { mezzo: comeMezzo(mezzo, nuovo), righe, avvisi };
}

/**
 * «Chiudi la giornata» (A.192, A.219 aperta: per ora un tocco del Direttore, senza Calendario). Sottrae **una volta
 * sola** le cariche Rosse dei chilometri sommati (una ogni `km_per_carica` o frazione) e, se il supporto vitale è
 * stato usato in giornata, una carica Verde; un giorno senza uso non consuma Verde. Azzera i km e il segno.
 * @returns {{ mezzo, righe: string[], avvisi: string[] }}
 */
export function chiudiGiornata(mezzo, dati) {
  const profilo = profiloDi(mezzo, dati);
  const e = normalizzaRisorse(mezzo, profilo).energia;
  const righe = [];
  const avvisi = [];
  if (!e) return { mezzo, righe, avvisi: ['Il mezzo non ha riserve di energia nel profilo.'] };
  const nuovo = { ...e };
  if (e.rosso !== undefined) {
    const kmC = profilo.alimentazione.km_per_carica;
    const c = e.km_giornata > 0 ? Math.ceil(e.km_giornata / kmC - 1e-9) : 0;
    if (e.rosso === null) {
      if (c) avvisi.push('Riserva Rossa «da convertire» (A.193): le cariche non si sottraggono finché il Direttore non la verifica; i chilometri restano da addebitare.');
    } else {
      nuovo.rosso = Math.max(0, arrotonda(e.rosso - c));
      nuovo.km_giornata = 0;
      if (c) righe.push(`Giornata chiusa: ${e.km_giornata} km → ${testoCariche(c)} Ross${c === 1 ? 'a' : 'e'} (arrotondato una volta sola, ${kmC} km a carica)`);
      if (c > e.rosso) avvisi.push(`Riserva Rossa esaurita: mancano ${testoCariche(arrotonda(c - e.rosso))} (installa il ricambio).`);
    }
  }
  if (e.verde !== undefined) {
    const giorno = profilo.supporto_vitale.verde.carica_per_giorno ?? 1;
    if (e.verde === null) {
      if (e.supporto_oggi) avvisi.push('Riserva Verde «da convertire» (A.193): la carica del giorno non si sottrae finché il Direttore non la verifica.');
    } else if (e.supporto_oggi) {
      nuovo.verde = Math.max(0, arrotonda(e.verde - giorno));
      nuovo.supporto_oggi = false;
      righe.push(`Supporto vitale usato oggi: ${testoCariche(giorno)} Verde (più accensioni nello stesso giorno contano una)`);
      if (e.verde < giorno) avvisi.push('Riserva Verde esaurita (installa il ricambio).');
    } else if (profilo.supporto_vitale?.verde) righe.push('Supporto vitale non usato oggi: nessuna carica Verde');
  }
  if (!righe.length && !avvisi.length) righe.push('Giornata chiusa: nessun consumo');
  return { mezzo: comeMezzo(mezzo, nuovo), righe, avvisi };
}

const minutiTesto = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

/**
 * Ricarica completa degli accumulatori (Veicoli 0.10 §9.1 e §10): il MEC/CEC Rosso e il CEC Verde tornano pieni, si
 * pagano le cariche ripristinate (30 cr il MEC, 10 il CEC) e il tempo è quello di una postazione per accumulatore
 * (Scout: 2 ore) o la somma, se sono in successione. **L'aria non si ripristina**: sono le bombole (`ricaricaBombole`).
 * @returns {{ mezzo, righe, costo, minuti } | null} null se non c'è nulla da ricaricare
 */
export function ricaricaEnergia(mezzo, dati, { inSuccessione = false } = {}) {
  const profilo = profiloDi(mezzo, dati);
  const e = normalizzaRisorse(mezzo, profilo).energia;
  if (!e) return null;
  const parti = [
    e.rosso !== undefined ? { chiave: 'rosso', nome: profilo.alimentazione.nec.replace(/^1 /, ''), max: profilo.alimentazione.cariche, a: profilo.alimentazione } : null,
    e.verde !== undefined ? { chiave: 'verde', nome: profilo.supporto_vitale.verde.nome.replace(/^1 /, ''), max: profilo.supporto_vitale.verde.cariche, a: profilo.supporto_vitale.verde } : null,
  ].filter(Boolean);
  const nuovo = { ...e };
  const righe = [];
  const tempi = [];
  let costo = 0;
  for (const p of parti) {
    if (e[p.chiave] === null) { righe.push(`${p.nome}: riserva «da convertire» (A.193), non si ricarica da qui`); continue; }
    const manca = arrotonda(p.max - e[p.chiave]);
    if (manca <= 0) continue;
    const cr = Math.ceil(manca * p.a.ricarica_cr_per_carica);
    const min = Math.ceil(manca * p.a.ricarica_minuti_per_carica);
    nuovo[p.chiave] = p.max;
    costo += cr;
    tempi.push(min);
    righe.push(`${p.nome}: +${testoCariche(manca)} (${cr} cr, ${minutiTesto(min)})`);
  }
  if (!tempi.length) return null;
  const minuti = inSuccessione ? tempi.reduce((t, n) => t + n, 0) : Math.max(...tempi);
  if (e.aria !== undefined) righe.push('L’aria non cambia: la ricarica dell’energia non ripristina le bombole');
  return { mezzo: comeMezzo(mezzo, nuovo), righe: [`Ricarica: ${costo} cr, ${minutiTesto(minuti)}${inSuccessione ? ' in successione' : ''}`, ...righe], costo, minuti };
}

/** Ricarica delle bombole vuote o parziali (Scout 0.6): 100 cr e 20 minuti per bombola, in successione. */
export function ricaricaBombole(mezzo, dati) {
  const profilo = profiloDi(mezzo, dati);
  const e = normalizzaRisorse(mezzo, profilo).energia;
  const sv = profilo?.supporto_vitale;
  if (e?.aria === undefined || !sv?.bombola) return null;
  const manca = arrotonda(sv.aria.ore_massime - e.aria);
  if (manca <= 0) return null;
  const n = Math.ceil(manca / sv.bombola.ore);
  const costo = n * sv.bombola.ricarica_cr;
  const minuti = n * sv.bombola.ricarica_minuti;
  return { mezzo: comeMezzo(mezzo, { ...e, aria: sv.aria.ore_massime }), costo, minuti, righe: [`Bombole: ${n} da ricaricare, ${costo} cr, ${minutiTesto(minuti)} in successione (+${manca} h d’aria)`] };
}

/**
 * Installa l'accumulatore di ricambio (Rosso o Verde) al posto di quello installato; quello tolto va fra i ricambi con le
 * sue cariche (niente travaso). null se non ci sono ricambi.
 */
export function installaRicambioEnergia(mezzo, colore, dati) {
  const r = normalizzaRisorse(mezzo, profiloDi(mezzo, dati)).energia;
  const inst = r?.[colore];
  const ric = r?.[`${colore}_ricambi`];
  if (!Number.isFinite(inst) || !ric?.length) return null;
  return comeMezzo(mezzo, { ...r, [colore]: ric[0], [`${colore}_ricambi`]: [...ric.slice(1), inst] });
}

/** Aggiunge un accumulatore di ricambio pieno (le scorte energetiche aggiuntive sono facoltative e occupano carico). */
export function aggiungiRicambioEnergia(mezzo, colore, dati) {
  const profilo = profiloDi(mezzo, dati);
  const r = normalizzaRisorse(mezzo, profilo).energia;
  const max = colore === 'rosso' ? profilo?.alimentazione?.cariche : profilo?.supporto_vitale?.verde?.cariche;
  if (!r || !Number.isInteger(max) || r[colore] === undefined) return null;
  return comeMezzo(mezzo, { ...r, [`${colore}_ricambi`]: [...lista(r[`${colore}_ricambi`]), max] });
}

/** Munizioni di un'arma di bordo: colpi sparati (dai caricati) o ricarica dalla riserva fino alla capacità. */
export function munizioniArmaVeicolo(mezzo, indice, { sparati = 0, ricarica = false } = {}, dati) {
  const profilo = profiloDi(mezzo, dati);
  const m = normalizzaRisorse(mezzo, profilo).munizioni;
  const x = m?.[indice];
  if (!x) return null;
  const cap = intero(profilo.armi[indice].capacita, x.caricate);
  let { caricate, riserva } = x;
  if (sparati > 0) caricate = Math.max(0, caricate - sparati);
  if (ricarica) { const n = Math.min(cap - caricate, riserva); caricate += n; riserva -= n; }
  const nuove = [...m];
  nuove[indice] = { caricate, riserva };
  return { ...mezzo, munizioni: nuove };
}

/**
 * A.101, Terre del Fuoco: oltre 30 Q effettivi nel Round, una PS Integrità 12 a fine movimento; con il
 * fallimento si perde 1 PI sul copriruota attivo, oppure sulla Propulsione se non ne restano. Ignora AR e
 * Corazzato, nessuna altra PS.
 */
export function sollecitazioneFallita(mezzo, dati) {
  const profilo = profiloDi(mezzo, dati);
  const r = lista(profilo?.rinforzi).find((x) => x.sollecitazioni);
  const montati = r ? lista(mezzo.rinforzi?.[r.id]?.montati) : [];
  const i = montati.findIndex((n) => n > 0);
  if (r && i >= 0) {
    const nuovi = [...montati];
    nuovi[i] -= 1;
    return { mezzo: { ...mezzo, rinforzi: { ...mezzo.rinforzi, [r.id]: { ...mezzo.rinforzi[r.id], montati: nuovi } } }, avviso: `Sollecitazione: −1 PI al ${r.nome} ${i + 1} (${nuovi[i]}/${r.pi_per_pezzo}).` };
  }
  const struttura = r?.struttura ?? 'propulsione';
  const pi = intero(mezzo.pi?.[struttura], profilo.pi[struttura]);
  return { mezzo: conPi(mezzo, struttura, pi - 1), avviso: `Sollecitazione: nessun copriruota utilizzabile, −1 PI alla Propulsione (${Math.max(0, pi - 1)}/${profilo.pi[struttura]}).` };
}

/**
 * A.104: l'andatura attuale resta quella del mezzo finché il cambio non è eseguito; quella scelta per dopo sta
 * in «andatura_scelta». Un cambio ordinario sposta l'attuale di una fascia verso la scelta (1 AzM, §2.1).
 */
export function eseguiCambioAndatura(mezzo, dati) {
  const A = dati.veicoli.andature.elenco.map((a) => a.id);
  const i = A.indexOf(mezzo.andatura);
  const j = A.indexOf(mezzo.andatura_scelta);
  if (i < 0 || j < 0 || i === j) return { ...mezzo, andatura_scelta: null };
  const nuova = A[i + Math.sign(j - i)];
  return { ...mezzo, andatura: nuova, andatura_scelta: nuova === mezzo.andatura_scelta ? null : mezzo.andatura_scelta };
}

/** Vista delle riserve per la scheda e la stampa (cariche: Veicoli 0.10 §9.1 e §10, Scout 0.6). */
function vistaRisorse(mezzo, profilo) {
  const r = normalizzaRisorse(mezzo, profilo);
  const e = r.energia;
  const a = profilo.alimentazione;
  const sv = profilo.supporto_vitale;
  const dc = e?.ricambi_da_convertire ?? {};
  return {
    energia: e ?? null,
    rosso: e?.rosso !== undefined ? {
      nome: a.nec, cariche: e.rosso, massimo: a.cariche, ricambi: e.rosso_ricambi, kmPerCarica: a.km_per_carica, autonomiaNominaleKm: a.autonomia_km ?? null,
      autonomiaKm: Number.isFinite(e.rosso) ? Math.floor(e.rosso * a.km_per_carica) : null,
      kmGiornata: e.km_giornata, daAddebitare: e.km_giornata > 0 ? Math.ceil(e.km_giornata / a.km_per_carica - 1e-9) : 0,
      daConvertire: e.rosso === null, ricambiDaConvertire: dc.rosso ?? [], nota: a.nota ?? null,
    } : null,
    verde: e?.verde !== undefined ? { nome: sv.verde.nome, cariche: e.verde, massimo: sv.verde.cariche, ricambi: e.verde_ricambi, perGiorno: sv.verde.carica_per_giorno ?? 1,
      supportoOggi: e.supporto_oggi === true, daConvertire: e.verde === null, ricambiDaConvertire: dc.verde ?? [] } : null,
    aria: e?.aria !== undefined ? { ore: e.aria, massimo: intero(sv.aria.ore_massime), bombole: intero(sv.aria.bombole), oreBombola: intero(sv.aria.ore_per_bombola), occupanti: intero(sv.aria.occupanti), testo: sv.testo ?? null } : null,
    munizioni: r.munizioni ?? null,
  };
}

/** Monta un pezzo di ricambio di un rinforzo al posto del primo pezzo montato esaurito. null se non si può. */
export function montaRicambio(mezzo, idRinforzo) {
  const x = mezzo.rinforzi?.[idRinforzo];
  const i = lista(x?.montati).findIndex((n) => n === 0);
  if (i < 0 || !lista(x?.ricambi).length) return null;
  const ricambi = [...x.ricambi];
  const pezzo = ricambi.shift();
  const montati = [...x.montati];
  montati[i] = pezzo;
  return { ...mezzo, rinforzi: { ...mezzo.rinforzi, [idRinforzo]: { montati, ricambi } } };
}

/**
 * Vista di un mezzo del personaggio per la scheda e la stampa: profilo, PI e stato delle tre strutture con le
 * soglie già calcolate (§4.4), tabella delle andature (§2.1, §3.1), Pilotare del personaggio se è il conducente,
 * rinforzi, NEC, campi «da definire» del profilo. null se il profilo non c'è più.
 * @param pilotare { va, provenienza } del personaggio (VA effettivo di Pilotare), oppure null
 */
export function vistaVeicoloPersonaggio(mezzo, dati, { pilotare = null } = {}) {
  const profilo = profiloDi(mezzo, dati);
  if (!profilo) return null;
  const conducente = mezzo.conducente === true && pilotare !== null;
  const vista = vistaVeicolo({ ...mezzo, profilo: undefined, scheda: profilo }, dati, { pilotareVa: conducente ? pilotare.va : null });
  // la riga del VA personale porta con sé la provenienza dell'Abilità (tooltip della SD)
  if (vista.pilotare && pilotare?.provenienza?.righe?.length) vista.pilotare.provenienza.righe[0] = { ...vista.pilotare.provenienza.righe[0], dettaglio: pilotare.provenienza.righe };
  return {
    uid: mezzo.uid,
    nome: mezzo.nome || profilo.nome,
    gruppo: mezzo.gruppo === true,
    conducente,
    manuale: !mezzo.profilo,
    profilo,
    fascia: dati.veicoli.manovrabilita.fasce.find((f) => f.man === profilo.man) ?? null,
    vista,
    strutture: vista.strutture.map((s) => ({ ...s, soglie: soglieStruttura(s.struttura, s.massimi, dati) })),
    andature: dati.veicoli.andature.elenco.map((a) => ({ ...a, q: intero(profilo.mov_q) * a.moltiplicatore, attuale: a.id === vista.andatura.id })),
    rinforzi: lista(profilo.rinforzi).map((r) => ({ id: r.id, nome: r.nome, struttura: r.struttura, piPerPezzo: intero(r.pi_per_pezzo), ps: r.ps_integrita ?? null,
      montati: mezzo.rinforzi?.[r.id]?.montati ?? [], ricambi: mezzo.rinforzi?.[r.id]?.ricambi ?? [], frasi: r.frasi ?? [], sollecitazioni: r.sollecitazioni ?? null, costo: r.costo_cr ?? null })),
    nec: profilo.alimentazione ? { ...profilo.alimentazione } : null,
    risorse: vistaRisorse(mezzo, profilo),
    andaturaScelta: mezzo.andatura_scelta ? andaturaDi(mezzo.andatura_scelta, dati) : null,
    pilotare: conducente ? vista.pilotare : null,
    pilotarePersonale: pilotare,
    daDefinire: {
      prezzo: !Number.isInteger(profilo.prezzo_cr) || !!profilo.prezzo_parziale,
      reperibilita: !profilo.reperibilita,
      autonomia: profilo.alimentazione ? profilo.alimentazione.autonomia_km === null : false,
      ricambi: !profilo.ricambi_cr_per_pi,
    },
    todo: profilo['TODO(Davide)'] ?? null,
    avarie: mezzo.avarie ?? '',
  };
}

/**
 * Pilotare del personaggio: VA (effettivo al tavolo, se c'è) con la provenienza dell'Abilità.
 * @param abilita le Abilità della tab Abilità (con effettivo e provenienza) o quelle della scheda a riposo
 * @param scheda la scheda calcolata, per ricostruire la provenienza da regole quando l'Abilità non la porta
 */
export function pilotareDelPersonaggio(abilita, dati, { scheda = null } = {}) {
  const nome = dati.veicoli.pilotare?.abilita ?? 'Pilotare';
  const a = lista(abilita).find((x) => x?.nome === nome);
  if (!a) return null;
  const va = a.effettivo ?? a.totale;
  const prov = a.provenienza ?? (scheda ? provenienza(righeRegoleAbilita(a, scheda), a.totale) : null);
  return { va, provenienza: prov, nome: a.nome };
}

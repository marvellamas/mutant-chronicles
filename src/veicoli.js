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
//     energia: { rosso: [lx per banco], rosso_ricambi, verde, verde_ricambi, aria: { fissa, bombole } },
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
// Veicoli nel file del personaggio (lotto 3 dei Veicoli; decisione provvisoria in attesa di A.91, dati in
// veicoli.json → personaggio): il mezzo sta nelle scelte del PG che lo possiede (`scelte.veicoli`, scritto solo
// se non vuoto) con la forma del modello in testa al file, più `uid`, `gruppo` (casella «Veicolo del gruppo»,
// solo informativa) e `conducente` (true se lo guida il personaggio). Nessuna sincronizzazione fra schede.

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

/** Banchi della riserva Rossa: numero e capacità di ciascuno (alimentazione.banchi, capacita_lx). */
function banchiRossi(alim) {
  const n = Math.max(1, intero(alim?.banchi, 1));
  return { n, cap: Math.floor(intero(alim?.capacita_lx) / n) };
}

/** Riserve iniziali del profilo: banchi Rossi e ricambi, Modulo Verde e ricambi, aria (fissa e bombole). */
function energiaIniziale(profilo) {
  const a = profilo?.alimentazione;
  const sv = profilo?.supporto_vitale;
  const e = {};
  if (Number.isInteger(a?.capacita_lx)) {
    const { n, cap } = banchiRossi(a);
    e.rosso = Array(n).fill(cap);
    e.rosso_ricambi = lista(a.ricambi_iniziali).filter(Number.isInteger);
  }
  if (Number.isInteger(sv?.verde?.capacita_lx)) {
    e.verde = [sv.verde.capacita_lx];
    e.verde_ricambi = lista(sv.verde.ricambi_iniziali).filter(Number.isInteger);
  }
  if (sv?.aria) e.aria = { fissa: intero(sv.aria.riserva_fissa_ore), bombole: lista(sv.aria.bombole_ore).filter(Number.isInteger) };
  return Object.keys(e).length ? e : null;
}

/** Munizioni iniziali delle armi di bordo che le hanno (stesso ordine di profilo.armi; null le altre). */
function munizioniIniziali(profilo) {
  const m = lista(profilo?.armi).map((a) => (isOggetto(a.munizioni_iniziali) ? { caricate: intero(a.munizioni_iniziali.caricate), riserva: intero(a.munizioni_iniziali.riserva) } : null));
  return m.some(Boolean) ? m : null;
}

/**
 * Riserve del mezzo salvato, nei limiti del profilo. Il vecchio «nec: { lx }» (prima del 05/10/2026) riempie i
 * banchi Rossi in ordine; le riserve che il file non ha partono dalla dotazione iniziale approvata (A.101).
 */
function normalizzaRisorse(v, profilo) {
  const base = energiaIniziale(profilo);
  const x = isOggetto(v?.energia) ? v.energia : {};
  const limita = (n, max) => Math.max(0, Math.min(max, intero(n, max)));
  let energia = null;
  if (base) {
    energia = {};
    if (base.rosso) {
      const { cap } = banchiRossi(profilo.alimentazione);
      if (Array.isArray(x.rosso)) energia.rosso = base.rosso.map((_, i) => limita(x.rosso[i], cap));
      else if (Number.isInteger(v?.nec?.lx)) {
        let resto = limita(v.nec.lx, intero(profilo.alimentazione.capacita_lx));
        energia.rosso = base.rosso.map(() => { const b = Math.min(cap, resto); resto -= b; return b; });
      } else energia.rosso = base.rosso;
      energia.rosso_ricambi = Array.isArray(x.rosso_ricambi) ? x.rosso_ricambi.filter(Number.isInteger).map((n) => limita(n, cap)) : base.rosso_ricambi;
    }
    if (base.verde) {
      const cap = intero(profilo.supporto_vitale.verde.capacita_lx);
      energia.verde = Array.isArray(x.verde) ? base.verde.map((_, i) => limita(x.verde[i], cap)) : base.verde;
      energia.verde_ricambi = Array.isArray(x.verde_ricambi) ? x.verde_ricambi.filter(Number.isInteger).map((n) => limita(n, cap)) : base.verde_ricambi;
    }
    if (base.aria) {
      const oreBombola = intero(profilo.supporto_vitale.bombola?.ore, Math.max(0, ...base.aria.bombole));
      const a = isOggetto(x.aria) ? x.aria : {};
      energia.aria = {
        fissa: limita(a.fissa, base.aria.fissa),
        bombole: Array.isArray(a.bombole) ? a.bombole.filter(Number.isInteger).map((n) => limita(n, oreBombola)) : base.aria.bombole,
      };
    }
  }
  const mBase = munizioniIniziali(profilo);
  const munizioni = mBase ? mBase.map((m, i) => {
    if (!m) return null;
    const y = lista(v?.munizioni)[i];
    const cap = intero(profilo.armi[i].capacita, m.caricate);
    return isOggetto(y) ? { caricate: limita(y.caricate, cap), riserva: Math.max(0, intero(y.riserva, m.riserva)) } : m;
  }) : null;
  return { ...(energia ? { energia } : {}), ...(munizioni ? { munizioni } : {}) };
}

/** Preleva da una lista di riserve in ordine: { riserve, mancano }. */
function preleva(riserve, quanto) {
  let resto = Math.max(0, quanto);
  const out = riserve.map((r) => { const x = Math.min(r, resto); resto -= x; return r - x; });
  return { riserve: out, mancano: resto };
}

/**
 * A.101: consumi del mezzo. Viaggio 200 Lx/km dalla riserva Rossa (trazione e servizi in marcia), da fermo
 * con i servizi accesi 100 Lx/ora (non in marcia), supporto vitale 200 Lx/ora dal Modulo Verde e un'ora
 * d'aria per ora (prima la riserva fissa, poi le bombole). Niente travaso fra NEC.
 * @returns {{ mezzo, righe: string[], avvisi: string[] }}
 */
export function consumaRisorse(mezzo, { km = 0, oreFermo = 0, oreSupporto = 0 } = {}, dati) {
  const profilo = profiloDi(mezzo, dati);
  const r = normalizzaRisorse(mezzo, profilo);
  const e = r.energia ? { ...r.energia } : null;
  const righe = [];
  const avvisi = [];
  if (!e) return { mezzo, righe, avvisi: ['Il mezzo non ha riserve di energia nel profilo.'] };
  const a = profilo.alimentazione ?? {};
  const lxViaggio = Math.ceil(Math.max(0, km) * intero(a.consumo_lx_km));
  const lxFermo = Math.ceil(Math.max(0, oreFermo) * intero(a.consumo_fermo_lx_h));
  if ((lxViaggio || lxFermo) && e.rosso) {
    const p = preleva(e.rosso, lxViaggio + lxFermo);
    e.rosso = p.riserve;
    if (lxViaggio) righe.push(`Viaggio: ${km} km × ${a.consumo_lx_km} Lx = ${lxViaggio} Lx Rossi`);
    if (lxFermo) righe.push(`Da fermo con i servizi: ${oreFermo} h × ${a.consumo_fermo_lx_h} Lx = ${lxFermo} Lx Rossi`);
    if (p.mancano) avvisi.push(`Riserva Rossa esaurita: mancano ${p.mancano} Lx (installa il ricambio).`);
  } else if ((km || oreFermo) && !e.rosso) avvisi.push('Il mezzo non ha una riserva Rossa.');
  if (oreSupporto > 0) {
    const sv = profilo.supporto_vitale ?? {};
    if (e.verde) {
      const lx = Math.ceil(oreSupporto * intero(sv.verde?.consumo_lx_h));
      const p = preleva(e.verde, lx);
      e.verde = p.riserve;
      righe.push(`Supporto vitale: ${oreSupporto} h × ${sv.verde?.consumo_lx_h} Lx = ${lx} Lx Verdi`);
      if (p.mancano) avvisi.push(`Modulo Verde esaurito: mancano ${p.mancano} Lx.`);
    }
    if (e.aria) {
      const p = preleva([e.aria.fissa, ...e.aria.bombole], Math.ceil(oreSupporto));
      e.aria = { fissa: p.riserve[0], bombole: p.riserve.slice(1) };
      righe.push(`Aria: ${Math.ceil(oreSupporto)} h (prima la riserva fissa, poi le bombole)`);
      if (p.mancano) avvisi.push(`Aria esaurita: mancano ${p.mancano} ore.`);
    }
  }
  return { mezzo: { ...mezzo, energia: e }, righe, avvisi };
}

/**
 * A.101: installa un NEC di ricambio (Rosso o Verde) al posto di quello installato più scarico; quello tolto
 * va fra i ricambi con il suo residuo (niente travaso). null se non ci sono ricambi.
 */
export function installaRicambioEnergia(mezzo, colore, dati) {
  const r = normalizzaRisorse(mezzo, profiloDi(mezzo, dati)).energia;
  const inst = r?.[colore];
  const ric = r?.[`${colore}_ricambi`];
  if (!inst?.length || !ric?.length) return null;
  const i = inst.indexOf(Math.min(...inst));
  const nuovi = [...inst];
  const tolto = nuovi[i];
  nuovi[i] = ric[0];
  return { ...mezzo, energia: { ...r, [colore]: nuovi, [`${colore}_ricambi`]: [...ric.slice(1), tolto] } };
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

/** Vista delle riserve per la scheda e la stampa. */
function vistaRisorse(mezzo, profilo) {
  const r = normalizzaRisorse(mezzo, profilo);
  const e = r.energia;
  const a = profilo.alimentazione;
  const sv = profilo.supporto_vitale;
  const somma = (l) => lista(l).reduce((t, n) => t + n, 0);
  return {
    rosso: e?.rosso ? {
      nome: a.nec, banchi: e.rosso, capacitaBanco: banchiRossi(a).cap, totale: somma(e.rosso), capacita: intero(a.capacita_lx), ricambi: e.rosso_ricambi,
      consumoKm: a.consumo_lx_km ?? null, consumoFermo: a.consumo_fermo_lx_h ?? null, erogazione: a.erogazione_lx_h ?? null,
      autonomiaKm: Number.isInteger(a.consumo_lx_km) && a.consumo_lx_km > 0 ? Math.floor(somma(e.rosso) / a.consumo_lx_km) : null, nota: a.nota ?? null,
    } : null,
    verde: e?.verde ? { nome: sv.verde.nome, moduli: e.verde, capacita: sv.verde.capacita_lx, totale: somma(e.verde), ricambi: e.verde_ricambi, consumoOra: sv.verde.consumo_lx_h,
      ore: sv.verde.consumo_lx_h ? Math.floor(somma(e.verde) / sv.verde.consumo_lx_h) : null } : null,
    aria: e?.aria ? { fissa: e.aria.fissa, bombole: e.aria.bombole, ore: e.aria.fissa + somma(e.aria.bombole), massimo: intero(sv.aria.riserva_fissa_ore) + somma(sv.aria.bombole_ore), testo: sv.testo ?? null } : null,
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

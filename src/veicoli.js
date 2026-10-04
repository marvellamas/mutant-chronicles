// Veicoli (Manuale dei Veicoli 0.2; lotto 2 di docs/ricognizione-2026-10-03.md). Funzioni pure, nessuna
// interfaccia: regole e profili stanno in data/veicoli.json, la PS Integrità per Qualità in regole.json →
// integrita. Niente tiri di dado qui: i valori tirati arrivano da fuori, come in src/danno.js e src/attacco.js.
//
// Modello dei dati di un mezzo in gioco (lo stesso sia che il veicolo appartenga a un personaggio sia che sia
// del gruppo: la domanda A.100 cambia solo dove si salva, non la forma):
//
//   { profilo: 'asa-scout-mk4',            // id del catalogo, oppure «scheda» scritta a mano
//     nome: 'ASA Scout',                   // nome al tavolo, facoltativo
//     pi: { corpo: 54, propulsione: 36, motore: 24 },   // PI attuali; i massimi vengono dal profilo
//     andatura: 'veloce',                  // id dell'andatura corrente
//     conducente: 'pg:Lucas-Vane',         // chi guida: id del partecipante, o null
//     rinforzi: { 'copriruote-petra': { montati: [3, 3, 1, 0], ricambi: [3, 3] } },
//     nec: { rosso_lx: 84000, verde_ore: 21 },          // riserve residue, nelle unità del profilo
//     ripristini: [{ struttura: 'motore', fino_a: 'fine_scena' }],   // Riparazione d'Emergenza (§7.3)
//     avarie: 'ruota posteriore destra cerchiata' }     // note del Direttore
//
// Tutto è facoltativo salvo «profilo»: `vistaVeicolo` riempie i valori mancanti dal profilo (mezzo integro).
import { provenienza, riga } from './provenienza.js';

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
export function riparaVeicolo(mezzo, struttura, esito, dati, { capacita = [], strumentiImprovvisati = false } = {}) {
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

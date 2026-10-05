// Umanità (UMN) del personaggio: Manuale del Giocatore §5.21 e Manuale dell'Equipaggiamento §7.1.
// Regole in regole.json → umanita; ipotesi in docs/ricognizione-cibernetica.md. Funzioni pure.
//
// Nelle scelte (blocco facoltativo `umanita`, formato 8 del file):
//   { perdite: [{ uid, rif, nome, umn }], recuperi: [{ punti, nota, uid?, procedura? }] }
// - una perdita si registra quando un impianto passa a «installato» (normalizza in src/character.js):
//   §7.1, «Il costo UMN si applica all’installazione»; resta anche se l'impianto si toglie, si rompe o
//   esce dall'inventario (§5.21: nessun recupero naturale; ipotesi H1, A.69). Lo stesso esemplare
//   (uid) non si conta due volte.
// - A.70 e A.92 (E&L del 05/10/2026): l'Umanità si recupera solo con la Riabilitazione dopo la rimozione di un
//   impianto (regole.json → umanita.riabilitazione): il recupero è legato alla perdita (uid), una sola volta, fino
//   alla sua UMN e a UMN 20; reinstallare lo stesso esemplare riconsuma gli UMN recuperati (A.69). I recuperi
//   registrati prima, senza uid, restano con un avviso (TODO(Davide) A.111).
// - A.69: interventi su un impianto (installazione, rimozione, reinstallazione) con clinica o personaggio:
//   tempi, tariffe, Prova ed esiti da regole.json → impianti.procedure.
import { riga, provenienza } from './provenienza.js';
import { catalogo, risolvi } from './equipaggiamento.js';

const isOggetto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const intero = (v) => Number.isInteger(v);

/** Costo UMN di una voce risolta: dalla scheda del catalogo o dall'impianto personalizzato. */
export function costoUmn(r) {
  const v = r.def?.umn ?? r.voce?.personalizzato?.umn;
  return intero(v) && v >= 0 ? v : 0;
}

/** Fascia del §5.21 per un valore di UMN (regole.json → umanita.fasce). */
export function fasciaUmanita(valore, dati) {
  return (dati.regole?.umanita?.fasce ?? []).find((f) => valore >= f.min && valore <= f.max) ?? null;
}

/**
 * Blocco `umanita` ripulito, con le installazioni nuove registrate. `equipaggiamento`: le voci già
 * normalizzate. Restituisce null se non c'è nulla da conservare (i file di prima restano identici).
 */
export function registraInstallazioni(blocco, equipaggiamento, dati, avvisi = []) {
  const b = isOggetto(blocco) ? blocco : {};
  const perdite = (Array.isArray(b.perdite) ? b.perdite : []).filter((p) => {
    const ok = isOggetto(p) && typeof p.uid === 'string' && p.uid && intero(p.umn) && p.umn >= 0;
    if (!ok) avvisi.push('Umanità: una perdita registrata non era valida ed è stata tolta.');
    return ok;
  }).map((p) => ({ uid: p.uid, rif: typeof p.rif === 'string' ? p.rif : null, nome: String(p.nome ?? 'Impianto'), umn: p.umn }));
  const recuperi = (Array.isArray(b.recuperi) ? b.recuperi : []).filter((x) => {
    const ok = isOggetto(x) && intero(x.punti) && x.punti > 0;
    if (!ok) avvisi.push('Umanità: un recupero registrato non era valido ed è stato tolto.');
    return ok;
  }).map((x) => ({ punti: x.punti, nota: String(x.nota ?? ''), ...(typeof x.uid === 'string' && x.uid ? { uid: x.uid } : {}), ...(['clinica', 'personaggio'].includes(x.procedura) ? { procedura: x.procedura } : {}) }));
  const viste = new Set(perdite.map((p) => p.uid));
  const cat = catalogo(dati);
  const stato = dati.regole?.impianti?.stato_installato ?? 'installato';
  for (const v of equipaggiamento ?? []) {
    if (v.stato !== stato || viste.has(v.uid)) continue;
    const r = risolvi(v, cat);
    if (r.fuoriCatalogo || r.tipo !== 'impianto') continue;
    perdite.push({ uid: v.uid, rif: v.rif ?? null, nome: r.nome, umn: costoUmn(r) });
    viste.add(v.uid);
  }
  return perdite.length || recuperi.length ? { perdite, recuperi } : null;
}

/**
 * Umanità del personaggio. `scelte`: le scelte della creazione (con `equipaggiamento` e `umanita`).
 * @returns {{ iniziale, minimo, massimo, valore, perduta, recuperata, fascia, condizione,
 *   modificatori: { pm, ps_magia_corruzione, sintonizzazione }, risorseInteriori: boolean,
 *   perdite: { uid, nome, umn, stato: 'installato'|'tolto'|'assente' }[], recuperi, provenienza } | null}
 *   null se mancano le regole (regole.json → umanita).
 */
export function umanita(scelte, dati) {
  const R = dati.regole?.umanita;
  if (!isOggetto(R)) return null;
  const b = isOggetto(scelte?.umanita) ? scelte.umanita : {};
  const perVoce = new Map((scelte?.equipaggiamento ?? []).map((v) => [v.uid, v]));
  const stato = dati.regole?.impianti?.stato_installato ?? 'installato';
  const perdite = (b.perdite ?? []).map((p) => {
    const v = perVoce.get(p.uid);
    return { ...p, stato: !v ? 'assente' : v.stato === stato ? 'installato' : 'tolto' };
  });
  const recuperi = (b.recuperi ?? []).map((x) => {
    const p = x.uid ? perdite.find((y) => y.uid === x.uid) : null;
    // A.69: lo stesso esemplare reinstallato riconsuma gli UMN recuperati; A.111: i recuperi senza perdita restano
    return { ...x, legacy: !x.uid, riconsumato: Boolean(p && p.stato === 'installato'), orfano: Boolean(x.uid && !p) };
  });
  for (const p of perdite) {
    const suoi = recuperi.filter((x) => x.uid === p.uid && !x.riconsumato).reduce((t, x) => t + x.punti, 0);
    p.recuperato = Math.min(p.umn, suoi);
    p.recuperabile = p.stato === 'installato' ? 0 : Math.max(0, p.umn - p.recuperato);
  }
  const NOTE = { installato: 'installato (Equipaggiamento §7.1)', tolto: 'non più installato: la perdita resta (§7.1)', assente: 'non più nell’inventario: la perdita resta (§7.1)' };
  const righe = [
    riga('Partenza', R.iniziale, 'Giocatore §5.21'),
    ...perdite.map((p) => riga(p.nome, -p.umn, NOTE[p.stato])),
    ...recuperi.map((x) => (x.legacy ? riga('Recupero concesso dal Direttore (prima della procedura)', x.punti, x.nota || 'A.111')
      : riga(`Riabilitazione: ${perdite.find((p) => p.uid === x.uid)?.nome ?? 'impianto'}`, x.riconsumato ? 0 : x.punti, x.riconsumato ? 'impianto reinstallato: recupero riconsumato (A.69)' : x.nota || 'A.70'))),
  ];
  const grezzo = righe.reduce((s, x) => s + x.valore, 0);
  const valore = Math.min(R.massimo, Math.max(R.minimo, grezzo));
  if (valore !== grezzo) righe.push(riga(valore < grezzo ? `massimo ${R.massimo}` : `minimo ${R.minimo}`, valore - grezzo, 'Giocatore §5.21'));
  const fascia = fasciaUmanita(valore, dati);
  return {
    iniziale: R.iniziale, minimo: R.minimo, massimo: R.massimo, valore,
    perduta: perdite.reduce((s, p) => s + p.umn, 0),
    recuperata: recuperi.reduce((s, x) => s + x.punti, 0),
    fascia, condizione: fascia?.condizione ?? null,
    modificatori: { pm: fascia?.pm_massimi ?? 0, ps_magia_corruzione: fascia?.ps_magia_corruzione ?? 0, sintonizzazione: fascia?.sintonizzazione ?? 0 },
    pmMinimo: R.pm_minimo ?? 1, sintonizzazioneMinimo: R.sintonizzazione_minimo ?? 0,
    // §5.21: a UMN 0 niente Risorse Interiori
    risorseInteriori: !(valore === 0 && R.zero?.risorse_interiori === false),
    perdite, recuperi, frasi: R.frasi ?? [],
    avvisi: recuperi.some((x) => x.legacy) ? [`Recuperi registrati prima della procedura di Riabilitazione, senza una rimozione: restano nel calcolo, da confermare con Davide (A.111).`] : [],
    provenienza: provenienza(righe, valore),
  };
}

/** PM Massimi con la fascia di Umanità (§5.21: «non può portare i PM Massimi sotto 1»). */
export function pmConUmanita(pm, u) {
  if (pm === null || !(pm > 0) || !u?.modificatori.pm) return { pm, riduzione: 0 };
  const dopo = Math.max(Math.min(pm, u.pmMinimo), pm + u.modificatori.pm);
  return { pm: dopo, riduzione: dopo - pm };
}

/**
 * A.69: preventivo di un intervento su un impianto. `tipo`: installazione | rimozione | reinstallazione; `modo`:
 * clinica (riesce sempre, tariffa del catalogo × la quota del tipo) o personaggio (Prova di Medicina, set chirurgico per
 * tentativo, esito scelto al tavolo). Chirurgia Precisa −20% del tempo, il Magistrale metà: insieme al massimo −50%.
 * @returns {{ tipo, nome, modo, ore, tariffa, materiali, costo, completato, ferita, prova, statoDopo, testo }}
 */
export function preventivoIntervento(tipo, def, { modo = 'clinica', esito = 'successo', chirurgiaPrecisa = false } = {}, dati) {
  const P = dati.regole?.impianti?.procedure;
  const I = P?.interventi?.[tipo];
  if (!I) return null;
  const E = modo === 'personaggio' ? P.esiti[esito] ?? P.esiti.successo : null;
  const riduzione = Math.min(P.riduzione_massima, (chirurgiaPrecisa ? P.chirurgia_precisa.riduzione : 0) + (E?.riduzione ?? 0));
  const base = intero(def?.installazione_costo) ? def.installazione_costo : null;
  const tariffa = modo === 'clinica' && base !== null ? Math.round(base * I.tariffa) : modo === 'clinica' ? null : 0;
  const materiali = modo === 'personaggio' ? P.personaggio.set_chirurgico_cr : 0;
  const completato = modo === 'clinica' || Boolean(E?.completato);
  return {
    tipo, nome: I.nome, modo, ore: Math.round(I.ore * (1 - riduzione) * 10) / 10, tariffa, materiali,
    costo: (tariffa ?? 0) + materiali, completato, ferita: Boolean(E?.ferita), prova: modo === 'personaggio' ? P.personaggio.prova : null,
    statoDopo: completato ? I.stato_dopo : null, testo: E?.testo ?? null,
  };
}

/**
 * A.70 e A.92: un ciclo di Riabilitazione per la perdita `uid` (impianto rimosso). Clinica: costo e +1 sicuro;
 * personaggio: materiali e Prova di Medicina (esito al tavolo). Punti entro la perdita recuperabile e UMN 20.
 * @param u il risultato di umanita() per lo stesso blocco
 * @returns {{ blocco, punti, costo, giorni, ferita } | null} null se la perdita non è recuperabile
 */
export function riabilitazione(blocco, uid, { modo = 'clinica', esito = 'successo' } = {}, u, dati) {
  const RB = dati.regole?.umanita?.riabilitazione;
  const p = u?.perdite?.find((x) => x.uid === uid);
  if (!RB || !p || p.recuperabile <= 0) return null;
  const grezzi = modo === 'clinica' ? RB.clinica.punti : RB.personaggio.esiti[esito] ?? 0;
  const punti = Math.max(0, Math.min(grezzi, p.recuperabile, u.massimo - u.valore));
  const costo = modo === 'clinica' ? RB.clinica.cr : RB.personaggio.cr;
  const nota = modo === 'clinica' ? 'clinica' : `${RB.personaggio.prova}: ${esito}`;
  const recuperi = [...(blocco?.recuperi ?? []), ...(punti > 0 ? [{ punti, nota, uid, procedura: modo }] : [])];
  return { blocco: { perdite: blocco?.perdite ?? [], recuperi }, punti, costo, giorni: RB.ciclo_giorni, ferita: modo === 'personaggio' && esito === 'maldestro' && RB.personaggio.ferita_con_maldestro };
}

/** Toglie una perdita registrata per errore (impianto segnato installato per sbaglio). */
export function annullaPerdita(blocco, uid) {
  const perdite = (blocco?.perdite ?? []).filter((p) => p.uid !== uid);
  const recuperi = blocco?.recuperi ?? [];
  return perdite.length || recuperi.length ? { perdite, recuperi } : null;
}

/** Registra un recupero concesso dal Direttore; `punti` intero positivo. */
export function aggiungiRecupero(blocco, punti, nota = '') {
  if (!(intero(punti) && punti > 0)) return blocco ?? null;
  return { perdite: blocco?.perdite ?? [], recuperi: [...(blocco?.recuperi ?? []), { punti, nota: String(nota).trim() }] };
}

/** Toglie il recupero all'indice dato. */
export function togliRecupero(blocco, indice) {
  const perdite = blocco?.perdite ?? [];
  const recuperi = (blocco?.recuperi ?? []).filter((_, i) => i !== indice);
  return perdite.length || recuperi.length ? { perdite, recuperi } : null;
}

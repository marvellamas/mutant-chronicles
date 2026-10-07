// Pila «annulla» della scena e movimenti dei token (lotto 5 di docs/battlemap/piano.md; §8 e §12 della specifica).
// Ctrl+Z annulla l'ultima azione del master, qualunque sia: nebbia, muri, movimento, token messo, tolto o cambiato.
// «Annulla ultimo movimento» riporta indietro l'ultimo movimento di un token. Annullare non rompe la coerenza con lo
// scontro: un token tolto non torna se il suo partecipante non c'è più.
// Voci della pila (scena.annulla, al più data/mappa.json → scena.annulla_max):
//   { tipo: 'nebbia', tratti }                      src/mappa/nebbia.js
//   { tipo: 'muri', muri, terreno }                 src/mappa/muri.js
//   { tipo: 'movimento', movimento: id, token, da, a }
//   { tipo: 'token', id, prima, dopo }              prima null: messo; dopo null: tolto; tutti e due: cambiato
//   { tipo: 'template', id, prima, dopo }           template ad area (fase 2, lotto 1): piazzato, spostato, tolto
//   { tipo: 'ripristino', prima }                   «Ripristina posizione iniziale» (src/mappa/iniziale.js): tutto com'era
//   { tipo: 'template-tolti', prima }               «Cancella template temporanei» o «tutti»: l'elenco di prima
//   { tipo: 'template-scaduti', tolti, scontro, round }  template a durata scaduti al Round `round` dello scontro
//   { tipo: 'luce', prima }                         luci della scena (lotto 4): ambiente e zone di prima
//   { tipo: 'porta', id, prima, dopo, azione? }     porta (fase 2, lotto 2): messa, cambiata, tolta; con l'azione del
//                                                   token che l'ha aperta o chiusa (annullando esce anche l'AzP)
// Movimenti (scena.movimenti, al più scena.movimenti_max): { id, token, scontro, round, turno?, da, a, costo, fascia, libero,
// quando }. Senza scontro aperto (scena collegata a una bozza o a nulla) il movimento si conta lo stesso, per «turno»: il
// numero del turno del token (turnoDi) che «Nuovo turno» fa avanzare, per un token o per tutti (scena.turni, primo test
// di Marcello del 06/10/2026: prima senza scontro il movimento non aveva limite).
// Funzioni pure.
import { daBase64, inBase64 } from './celle.js';
import { inverti } from './nebbia.js';
import { chiaveRif } from './token.js';
import { annullaRipristino } from './iniziale.js';
import { annullaLuce } from './luce.js';

const conVoce = (scena, voce, dati) => ({ ...scena, annulla: [...scena.annulla, voce].slice(-dati.mappa.scena.annulla_max) });

/** Un token messo, tolto o cambiato dal master, con la voce per Ctrl+Z. `prima` null: messo; `dopo` null: tolto. */
export function cambiaTokenAnnullabile(scena, prima, dopo, dati, adesso = new Date()) {
  const id = (dopo ?? prima).id;
  let token = scena.token.filter((t) => t.id !== id);
  if (dopo) {
    const i = scena.token.findIndex((t) => t.id === id);
    token = i >= 0 ? scena.token.map((t) => (t.id === id ? dopo : t)) : [...scena.token, dopo];
  }
  return conVoce({ ...scena, token }, { tipo: 'token', id, prima, dopo, quando: adesso.toISOString() }, dati);
}

/** Un template messo, tolto o cambiato dal master, con la voce per Ctrl+Z. `prima` null: messo; `dopo` null: tolto. */
export function cambiaTemplateAnnullabile(scena, prima, dopo, dati, adesso = new Date()) {
  const id = (dopo ?? prima).id;
  let template = scena.template.filter((t) => t.id !== id);
  if (dopo) {
    const i = scena.template.findIndex((t) => t.id === id);
    template = i >= 0 ? scena.template.map((t) => (t.id === id ? dopo : t)) : [...scena.template, dopo];
  }
  return conVoce({ ...scena, template }, { tipo: 'template', id, prima, dopo, quando: adesso.toISOString() }, dati);
}

/** Una porta messa, tolta o cambiata (aperta, chiusa, bloccata, rivelata), con la voce per Ctrl+Z; `azione`: l'id dell'AzP. */
export function cambiaPortaAnnullabile(scena, prima, dopo, dati, azione = null, adesso = new Date()) {
  const id = (dopo ?? prima).id;
  const porte = scena.porte ?? [];
  let nuove = porte.filter((p) => p.id !== id);
  if (dopo) {
    const i = porte.findIndex((p) => p.id === id);
    nuove = i >= 0 ? porte.map((p) => (p.id === id ? dopo : p)) : [...porte, dopo];
  }
  return conVoce({ ...scena, porte: nuove }, { tipo: 'porta', id, prima, dopo, ...(azione ? { azione } : {}), quando: adesso.toISOString() }, dati);
}

/**
 * Toglie in un colpo i template che soddisfano `via` (ritocchi del 07/10: «Cancella template temporanei», quelli a
 * durata; «Cancella tutti i template»), con una sola voce per Ctrl+Z. Restituisce { scena, tolti }.
 */
export function togliTemplateAnnullabile(scena, via, dati, adesso = new Date()) {
  const tolti = scena.template.filter(via);
  if (!tolti.length) return { scena, tolti };
  const s = { ...scena, template: scena.template.filter((t) => !via(t)) };
  return { scena: conVoce(s, { tipo: 'template-tolti', prima: scena.template, quando: adesso.toISOString() }, dati), tolti };
}

/**
 * Template a durata scaduti al nuovo Round dello scontro (Magia, «Scadenze e interruzione degli effetti»): si tolgono
 * con una voce per Ctrl+Z che ricorda Round e scontro, così «Indietro» oltre il cambio di Round li rimette
 * (ritocchi del 07/10; rimettiScaduti). Restituisce { scena, tolti }.
 */
export function scadiTemplateAnnullabile(scena, via, { scontro, round }, dati, adesso = new Date()) {
  const tolti = scena.template.filter(via);
  if (!tolti.length) return { scena, tolti };
  const s = { ...scena, template: scena.template.filter((t) => !via(t)) };
  return { scena: conVoce(s, { tipo: 'template-scaduti', tolti, scontro, round, quando: adesso.toISOString() }, dati), tolti };
}

/**
 * «Indietro» oltre il cambio di Round (07/10): i template scaduti a un Round dopo `round` dello scontro tornano, e le
 * loro voci escono dalla pila di Ctrl+Z. Restituisce { scena, rimessi }.
 */
export function rimettiScaduti(scena, scontro, round) {
  const voci = scena.annulla.filter((v) => v.tipo === 'template-scaduti' && v.scontro === scontro && v.round > round);
  if (!voci.length) return { scena, rimessi: [] };
  const ci = new Set(scena.template.map((t) => t.id));
  const rimessi = voci.flatMap((v) => v.tolti).filter((t) => !ci.has(t.id) && ci.add(t.id));
  return { scena: { ...scena, template: [...scena.template, ...rimessi], annulla: scena.annulla.filter((v) => !voci.includes(v)) }, rimessi };
}

/** Turno del token senza scontro: scena.turni = { tutti, token: { id: n } }, i due contatori sommati. */
export const turnoDi = (scena, idToken) => (scena.turni?.tutti ?? 0) + (scena.turni?.token?.[idToken] ?? 0);

/** «Nuovo turno» senza scontro: il conteggio del movimento riparte da 0 per un token (idToken) o per tutti (null). */
export function nuovoTurno(scena, idToken = null) {
  const turni = { tutti: scena.turni?.tutti ?? 0, token: { ...(scena.turni?.token ?? {}) } };
  if (idToken) turni.token[idToken] = (turni.token[idToken] ?? 0) + 1;
  else turni.tutti += 1;
  // i contatori dei token che non ci sono più si tolgono
  const presenti = new Set(scena.token.map((t) => t.id));
  for (const id of Object.keys(turni.token)) if (!presenti.has(id)) delete turni.token[id];
  return { ...scena, turni };
}

/**
 * Movimento di un token (§8): la posizione nuova, il movimento registrato nel Round dello scontro e la voce per Ctrl+Z.
 * @param m { a: [x, y], costo: Q spesi (null se fuori area), fascia, scontro, round, libero: mosso fuori area con Maiusc }
 */
export function muoviToken(scena, idToken, m, dati, adesso = new Date()) {
  const t = scena.token.find((x) => x.id === idToken);
  if (!t) throw new Error('token non trovato');
  const id = `m${adesso.getTime().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const senzaScontro = !m.scontro;
  const mov = { id, token: idToken, scontro: m.scontro ?? null, round: m.round ?? null, ...(senzaScontro ? { turno: turnoDi(scena, idToken) } : {}), da: [...t.q], a: [...m.a], costo: m.costo ?? null, fascia: m.fascia ?? null, libero: !!m.libero, quando: adesso.toISOString() };
  // la coda dei movimenti si accorcia togliendo prima quelli di altri Round
  let movimenti = [...scena.movimenti, mov];
  const max = dati.mappa.scena.movimenti_max;
  if (movimenti.length > max) {
    const vecchi = movimenti.filter((x) => x.scontro !== mov.scontro || x.round !== mov.round || (senzaScontro && x.turno !== turnoDi(scena, x.token)));
    const togli = new Set(vecchi.slice(0, movimenti.length - max).map((x) => x.id));
    movimenti = movimenti.filter((x) => !togli.has(x.id)).slice(-max);
  }
  const s = { ...scena, token: scena.token.map((x) => (x.id === idToken ? { ...x, q: [...m.a] } : x)), movimenti };
  return conVoce(s, { tipo: 'movimento', movimento: id, token: idToken, da: [...t.q], a: [...m.a], quando: adesso.toISOString() }, dati);
}

/**
 * Q già usati da un token nel Round dello scontro (il Passo si divide, Corsa e Scatto no: A.129, statoFasce). Senza
 * scontro aperto si contano i movimenti del turno del token (turnoDi), finché «Nuovo turno» non lo fa ripartire.
 * I movimenti liberi non contano.
 */
export function usatoNelRound(scena, idToken, scontro, round) {
  const delTurno = scontro
    ? (x) => x.scontro === scontro && x.round === round
    : (x) => !x.scontro && x.turno === turnoDi(scena, idToken);
  return scena.movimenti.filter((x) => x.token === idToken && !x.libero && delTurno(x)).reduce((s, x) => s + (x.costo ?? 0), 0);
}

/**
 * Fasce dei movimenti contati del token nel Round (o nel turno senza scontro), nell'ordine: servono a statoFasce
 * (src/mappa/area.js) per sapere se Corsa o Scatto, che sono un blocco unico (A.129), hanno già chiuso il movimento.
 */
export function fasceNelRound(scena, idToken, scontro, round) {
  const delTurno = scontro
    ? (x) => x.scontro === scontro && x.round === round
    : (x) => !x.scontro && x.turno === turnoDi(scena, idToken);
  return scena.movimenti.filter((x) => x.token === idToken && !x.libero && delTurno(x)).map((x) => x.fascia ?? null);
}

/** Il token ha già fatto un movimento in questo Round? (veicoli: uno solo per Round, A.105) */
export const mossoNelRound = (scena, idToken, scontro, round) => !!scontro && scena.movimenti.some((x) => x.token === idToken && x.scontro === scontro && x.round === round);

/** Annulla un movimento: il token torna dov'era e il movimento esce dal Round. */
function annullaMovimento(scena, idMovimento) {
  const mov = scena.movimenti.find((x) => x.id === idMovimento);
  if (!mov) return { errore: 'movimento non più registrato' };
  const t = scena.token.find((x) => x.id === mov.token);
  if (!t) return { errore: 'il token non è più sulla mappa' };
  return { scena: { ...scena, token: scena.token.map((x) => (x.id === mov.token ? { ...x, q: [...mov.da] } : x)), movimenti: scena.movimenti.filter((x) => x.id !== idMovimento) } };
}

/**
 * Ctrl+Z: annulla l'ultima voce della pila. `chiaviPresenti`: chiavi dei pezzi ancora nello scontro (src/mappa/
 * partecipanti.js), per non rimettere in mappa un token il cui partecipante è uscito.
 * @returns { scena, voce, testo } oppure null se non c'è nulla da annullare; una voce che non si può più applicare
 *   esce dalla pila con { scena, voce, errore }.
 */
export function annullaUltima(scena, { chiaviPresenti = null } = {}) {
  const voce = scena.annulla.at(-1);
  if (!voce) return null;
  const senza = { ...scena, annulla: scena.annulla.slice(0, -1) };
  switch (voce.tipo) {
    case 'nebbia':
      return { scena: { ...senza, nebbia: { ...senza.nebbia, coperti: inBase64(inverti(daBase64(senza.nebbia.coperti), voce.tratti)) } }, voce, testo: 'nebbia' };
    case 'muri':
      return { scena: { ...senza, muri: inBase64(inverti(daBase64(senza.muri), voce.muri)), terreno: inBase64(inverti(daBase64(senza.terreno), voce.terreno)) }, voce, testo: 'muri' };
    case 'movimento': {
      const r = annullaMovimento(senza, voce.movimento);
      return r.errore ? { scena: senza, voce, errore: r.errore } : { scena: r.scena, voce, testo: 'movimento' };
    }
    case 'token': {
      if (voce.prima && chiaviPresenti && voce.prima.rif?.tipo !== 'segnaposto' && !chiaviPresenti.has(chiaveRif(voce.prima.rif))) {
        return { scena: senza, voce, errore: 'il suo partecipante non è più nello scontro' };
      }
      // il token torna com'era (cambiato), torna in mappa (tolto) o esce (messo)
      let token = senza.token.filter((t) => t.id !== voce.id);
      if (voce.prima) token = [...token, voce.prima];
      return { scena: { ...senza, token }, voce, testo: voce.prima && voce.dopo ? 'token' : voce.prima ? 'token tolto' : 'token messo' };
    }
    case 'ripristino':
      return { scena: annullaRipristino(senza, voce), voce, testo: 'ripristino della posizione iniziale' };
    case 'porta': {
      let porte = (senza.porte ?? []).filter((p) => p.id !== voce.id);
      if (voce.prima) porte = [...porte, voce.prima];
      const azioni = voce.azione ? (senza.azioni ?? []).filter((a) => a.id !== voce.azione) : senza.azioni;
      return { scena: { ...senza, porte, ...(azioni ? { azioni } : {}) }, voce, testo: !voce.prima ? 'porta messa' : !voce.dopo ? 'porta tolta' : 'porta' };
    }
    case 'luce':
      return { scena: annullaLuce(senza, voce), voce, testo: 'luci' };
    case 'template-scaduti': {
      const ci = new Set(senza.template.map((t) => t.id));
      return { scena: { ...senza, template: [...senza.template, ...voce.tolti.filter((t) => !ci.has(t.id))] }, voce, testo: 'template scaduti rimessi' };
    }
    case 'template-tolti':
      return { scena: { ...senza, template: voce.prima }, voce, testo: 'template rimessi' };
    case 'template': {
      let template = senza.template.filter((t) => t.id !== voce.id);
      if (voce.prima) template = [...template, voce.prima];
      return { scena: { ...senza, template }, voce, testo: voce.prima && voce.dopo ? 'template spostato' : voce.prima ? 'template tolto' : 'template piazzato' };
    }
    default:
      return { scena: senza, voce, errore: `voce sconosciuta: ${voce.tipo}` };
  }
}

/** «Annulla ultimo movimento» di un token: l'ultimo suo movimento, anche se nella pila c'è altro dopo. */
export function annullaUltimoMovimento(scena, idToken) {
  const mov = [...scena.movimenti].reverse().find((x) => x.token === idToken);
  if (!mov) return null;
  const r = annullaMovimento(scena, mov.id);
  if (r.errore) return r;
  return { scena: { ...r.scena, annulla: r.scena.annulla.filter((v) => !(v.tipo === 'movimento' && v.movimento === mov.id)) }, movimento: mov };
}

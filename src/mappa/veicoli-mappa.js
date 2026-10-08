// Veicoli sulla mappa di battaglia (fase 2, lotto 5; richiesta di Marcello del 07/10/2026): orientamento del mezzo a
// passi di 90° con l'immagine che ruota con l'ingombro, chi è a bordo (conducente e passeggeri), salire e scendere.
// Regole: data/veicoli.json → mappa; Manuale dei Veicoli 0.2 §1.3 (il mezzo si muove all'Iniziativa del conducente;
// «essere trasportati non consuma la loro AzM»); A.91 (scheda unica del veicolo, il conducente sta nel registro);
// A.105 (nessuna Iniziativa propria). Costo in Azioni di salire e scendere: TODO(Davide) A.145.
//
// Formato nel token del veicolo (src/mappa/scena.js):
//   direzione: 's' | 'o' | 'n' | 'e'   dove punta il muso (s = in basso); l'ingombro è già quello orientato
//   passeggeri: [{ id, rif, ingombro, nascosto, ruolo: 'conducente' | 'passeggero', luce?, nome? }]
//     i token di chi è a bordo, tolti dalla mappa (niente q): si muovono con il mezzo e non occupano Q.
// I 45° non si fanno: un rettangolo 2 × 4 in diagonale non sta su Q interi della griglia (si dovrebbe arrotondare
// l'ingombro a una «scala» di Q, con muri e linea di tiro poco chiari); il veicolo si gira a 90°. Funzioni pure.
import { dimensioni, liberoPer, tokenDentro, chiaveRif } from './token.js';
import { distanzaIngombri } from './zoc.js';

/** Direzioni del muso in senso orario: in basso, a sinistra, in alto, a destra. */
export const DIREZIONI = ['s', 'o', 'n', 'e'];
export const NOMI_DIREZIONI = { s: 'in basso', o: 'a sinistra', n: 'in alto', e: 'a destra' };
export const RUOLI = ['conducente', 'passeggero'];

/** Dove punta il muso: il campo del token, altrimenti dall'ingombro (scene di prima: più largo che alto = a destra). */
export function direzioneDi(t) {
  if (DIREZIONI.includes(t?.direzione)) return t.direzione;
  const [w, h] = dimensioni(t?.ingombro);
  return w > h ? 'e' : 's';
}

/**
 * Ingombro orientato [colonne, righe] dall'ingombro del profilo (src/mappa/token.js → ingombroVeicolo: [lunghezza,
 * larghezza]): con il muso in alto o in basso il mezzo è verticale.
 */
export function ingombroOrientato(base, direzione) {
  const [l, w] = dimensioni(base);
  const lungo = Math.max(l, w), largo = Math.min(l, w);
  return direzione === 's' || direzione === 'n' ? [largo, lungo] : [lungo, largo];
}

/** Rotazione dell'immagine in gradi (senso orario) per avere il muso verso `direzione`, dato il muso dell'immagine. */
export function angoloImmagine(direzione, musoImmagine = 's') {
  const passi = (DIREZIONI.indexOf(direzione) - DIREZIONI.indexOf(musoImmagine) + 4) % 4;
  return passi * 90;
}

/**
 * Il veicolo girato di 90° (verso +1 orario, −1 antiorario) attorno al suo centro, dentro la griglia.
 * @returns il token nuovo (direzione, ingombro e q), senza controllare gli ostacoli
 */
export function ruotaVeicolo(t, verso, { colonne, righe }) {
  const dir = DIREZIONI[(DIREZIONI.indexOf(direzioneDi(t)) + (verso < 0 ? 3 : 1)) % 4];
  const [w, h] = dimensioni(t.ingombro);
  const ingombro = [h, w];
  const cx = t.q[0] + w / 2, cy = t.q[1] + h / 2;
  const x = Math.max(0, Math.min(colonne - h, Math.round(cx - h / 2)));
  const y = Math.max(0, Math.min(righe - w, Math.round(cy - w / 2)));
  return { ...t, direzione: dir, ingombro, q: [x, y] };
}

/** Rotazione permessa: il mezzo girato non va su muri o altri token. { token, errore } */
export function ruotaSeLibero(scena, idVeicolo, verso, muro = () => false) {
  const t = scena.token.find((x) => x.id === idVeicolo);
  if (!t || t.rif.tipo !== 'veicolo') return { errore: 'non è un veicolo' };
  const g = scena.griglia;
  const r = ruotaVeicolo(t, verso, g);
  if (!tokenDentro(r, g.colonne, g.righe)) return { errore: 'girato non sta nella griglia' };
  if (!liberoPer(r.q, r.ingombro, { token: scena.token, tranne: t.id, muro, colonne: g.colonne, righe: g.righe })) return { errore: 'girato andrebbe su un muro o su un altro token' };
  return { token: r };
}

/** Posti del profilo: { conducente, passeggeri } (data/veicoli.json → profili[].equipaggio). */
export const postiDi = (profilo) => ({ conducente: profilo?.equipaggio?.conducente ?? 1, passeggeri: profilo?.equipaggio?.passeggeri ?? Math.max(0, (profilo?.equipaggio?.posti ?? 1) - 1) });

/** Chi è a bordo del veicolo (token della scena). */
export const aBordo = (t) => (Array.isArray(t?.passeggeri) ? t.passeggeri : []);

/** I veicoli della scena accanto al token (entro 1 Q dal suo ingombro): dove può salire. */
export function veicoliVicini(scena, tok) {
  return scena.token.filter((v) => v.rif.tipo === 'veicolo' && v.id !== tok.id && distanzaIngombri(tok.q, tok.ingombro, v.q, v.ingombro) <= 1);
}

const voceBordo = (scena, prima, ids, testo, dati, adesso) => ({
  ...scena,
  annulla: [...scena.annulla, { tipo: 'bordo', prima, ids, testo, quando: adesso.toISOString() }].slice(-dati.mappa.scena.annulla_max),
});

/**
 * Sale a bordo: il token esce dalla mappa ed entra nei passeggeri del veicolo, con il ruolo. Controlli: veicolo vicino
 * (1 Q), posti del profilo, un solo conducente, solo partecipanti (non segnaposto né veicoli). Ctrl+Z lo annulla.
 * @returns { scena } oppure { errore }
 */
export function sali(scena, idToken, idVeicolo, ruolo, posti, dati, adesso = new Date()) {
  const tok = scena.token.find((t) => t.id === idToken);
  const v = scena.token.find((t) => t.id === idVeicolo);
  if (!tok || !v || v.rif.tipo !== 'veicolo') return { errore: 'veicolo o token non trovato' };
  if (tok.rif.tipo !== 'partecipante') return { errore: 'a bordo salgono solo i partecipanti (PG e nemici)' };
  if (!RUOLI.includes(ruolo)) return { errore: 'ruolo: conducente o passeggero' };
  if (distanzaIngombri(tok.q, tok.ingombro, v.q, v.ingombro) > 1) return { errore: 'per salire bisogna essere accanto al veicolo' };
  const bordo = aBordo(v);
  const quanti = bordo.filter((p) => p.ruolo === ruolo).length;
  if (ruolo === 'conducente' && quanti >= posti.conducente) return { errore: 'il posto del conducente è già occupato' };
  if (ruolo === 'passeggero' && quanti >= posti.passeggeri) return { errore: `posti per i passeggeri esauriti (${posti.passeggeri})` };
  const { q: _q, ...resto } = tok;
  const dopo = { ...v, passeggeri: [...bordo, { ...resto, ruolo }] };
  const s = { ...scena, token: scena.token.filter((t) => t.id !== idToken).map((t) => (t.id === idVeicolo ? dopo : t)) };
  return { scena: voceBordo(s, [v, tok], [v.id, tok.id], 'salita a bordo', dati, adesso) };
}

/** I Q dove chi scende (con il suo ingombro) può andare: accanto al veicolo, liberi da muri e token. */
export function qPerScendere(scena, idVeicolo, idPasseggero, muro = () => false) {
  const v = scena.token.find((t) => t.id === idVeicolo);
  const p = aBordo(v).find((x) => x.id === idPasseggero);
  if (!v || !p) return [];
  const { colonne, righe } = scena.griglia;
  const [w, h] = dimensioni(p.ingombro);
  const [vw, vh] = dimensioni(v.ingombro);
  const r = [];
  for (let y = v.q[1] - h; y <= v.q[1] + vh; y++) {
    for (let x = v.q[0] - w; x <= v.q[0] + vw; x++) {
      if (distanzaIngombri([x, y], p.ingombro, v.q, v.ingombro) !== 1) continue;
      if (liberoPer([x, y], p.ingombro, { token: scena.token, muro, colonne, righe })) r.push([x, y]);
    }
  }
  return r;
}

/**
 * Scende dal veicolo nel Q `q` (in alto a sinistra del suo ingombro): torna in mappa con il suo token. Il Q deve
 * essere fra quelli di qPerScendere. Ctrl+Z lo annulla. @returns { scena, passeggero } oppure { errore }
 */
export function scendi(scena, idVeicolo, idPasseggero, q, dati, { muro = () => false, adesso = new Date() } = {}) {
  const v = scena.token.find((t) => t.id === idVeicolo);
  const p = aBordo(v).find((x) => x.id === idPasseggero);
  if (!v || !p) return { errore: 'passeggero non trovato' };
  if (!qPerScendere(scena, idVeicolo, idPasseggero, muro).some(([x, y]) => x === q[0] && y === q[1])) return { errore: 'scegli un quadretto libero accanto al veicolo' };
  const { ruolo: _r, ...tok } = p;
  const dopo = { ...v, passeggeri: aBordo(v).filter((x) => x.id !== idPasseggero) };
  if (!dopo.passeggeri.length) delete dopo.passeggeri;
  const s = { ...scena, token: [...scena.token.map((t) => (t.id === idVeicolo ? dopo : t)), { ...tok, q: [...q] }] };
  return { scena: voceBordo(s, [v], [v.id, p.id], 'discesa', dati, adesso), passeggero: p };
}

/** Ctrl+Z di una salita o discesa: tornano i token com'erano (veicolo e chi è salito o sceso). */
export function annullaBordo(scena, voce) {
  return { ...scena, token: [...scena.token.filter((t) => !voce.ids.includes(t.id)), ...voce.prima] };
}

/**
 * Dove disegnare chi è a bordo sul veicolo (ritocchi del 08/10): cerchietti grandi due terzi di un token normale
 * (`quota` del lato di un Q), in griglia dall'alto a sinistra, il conducente per primo; se non ci stanno tutti
 * nell'ingombro le righe continuano sotto il mezzo. @returns [{ x, y, lato }] in pixel di schermo, uno per persona
 */
export function postiCerchietti(n, box, qs, quota = 2 / 3) {
  const lato = qs * quota;
  const colonne = Math.max(1, Math.floor((box.w + 0.5) / lato));
  const usate = Math.min(colonne, n);
  const x0 = box.x + (box.w - usate * lato) / 2;
  return Array.from({ length: n }, (_, i) => ({ x: x0 + (i % colonne) * lato, y: box.y + Math.floor(i / colonne) * lato, lato }));
}

/**
 * Perché il veicolo non si muove sulla mappa (ritocchi del 08/10, mai un silenzio), o null se si muove: senza scontro
 * aperto, senza conducente nel registro (A.91), con il conducente fuori dallo scontro, già mosso nel Round. Fuori dal
 * turno del conducente il master lo muove comunque: lo dice `nota`.
 * @param stato src/veicoli-registro.js → statoMovimento(rec, scontro, diTurno, { fuoriTurno: true })
 * @returns {{ motivo: string|null, nota: string|null }}
 */
export function veicoloFermo(rec, scontro, stato) {
  const libero = 'oppure usa Libero (Maiusc)';
  if (!scontro) return { motivo: `Nessuno scontro aperto: il veicolo si muove all’Iniziativa del conducente; ${libero}`, nota: null };
  if (!rec?.conducente) return { motivo: `Nessun conducente a bordo: fai salire un PG come conducente, ${libero}`, nota: null };
  if (!stato?.conducente) return { motivo: `${rec.conducente.nome} (il conducente) non è nello scontro: fallo entrare o cambia conducente, ${libero}`, nota: null };
  if (stato.mosso) return { motivo: `${stato.motivo}: un solo movimento per Round (A.105); ${libero}`, nota: null };
  return { motivo: null, nota: stato.fuori ? `Fuori dal turno di ${rec.conducente.nome}: il master lo muove comunque, una volta per Round` : null };
}

/** Chiavi dei partecipanti a bordo di qualche veicolo (hanno un token, anche se non in mappa). */
export const chiaviABordo = (scena) => new Set(scena.token.flatMap((t) => aBordo(t).map((p) => chiaveRif(p.rif))));

/** Il veicolo su cui è il partecipante (chiave del pezzo), con il suo posto a bordo, o null. */
export function veicoloDi(scena, chiave) {
  for (const v of scena.token) {
    const p = aBordo(v).find((x) => chiaveRif(x.rif) === chiave);
    if (p) return { veicolo: v, passeggero: p };
  }
  return null;
}

/** Errore nel formato di direzione e passeggeri di un token, o null (src/mappa/scena.js → validaScena). */
export function erroreBordo(t, D) {
  if (t.direzione !== undefined && (t.rif.tipo !== 'veicolo' || !DIREZIONI.includes(t.direzione))) return `direzione: ${DIREZIONI.join(', ')}, solo per i veicoli`;
  if (t.passeggeri === undefined) return null;
  if (t.rif.tipo !== 'veicolo' || !Array.isArray(t.passeggeri)) return 'passeggeri: elenco, solo per i veicoli';
  for (const [i, p] of t.passeggeri.entries()) {
    if (!p || typeof p.id !== 'string' || p.rif?.tipo !== 'partecipante' || typeof p.rif.id !== 'string') return `passeggeri[${i}]: id e partecipante`;
    if (!RUOLI.includes(p.ruolo)) return `passeggeri[${i}].ruolo: ${RUOLI.join(' o ')}`;
    if (typeof p.nascosto !== 'boolean' || !D.token.ingombri_ammessi.includes(p.ingombro)) return `passeggeri[${i}]: ingombro e nascosto`;
    if (p.q !== undefined) return `passeggeri[${i}]: chi è a bordo non ha un Q`;
  }
  if (t.passeggeri.filter((p) => p.ruolo === 'conducente').length > 1) return 'passeggeri: un solo conducente';
  return null;
}

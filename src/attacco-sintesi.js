// «Attacca!» più sintetico (13/10/2026, S17, S20, S21: richiesta di Davide approvata da Marcello). Un attacco normale in
// uno o due tocchi, senza perdere nessuna opzione: cambia solo come il pannello presenta le scelte, non le regole.
// Funzioni pure per la presentazione: le armi in mano fra cui cambiare, le fasce di distanza a pulsanti (regole.json →
// attacco_distanza.distanza.fasce, Giocatore §5.11), il nome di «Mirato» secondo l'arma (Tiro Mirato §5.10, Colpo Mirato
// §5.12: gli stessi dati di prima), le voci attive di «Altro» riassunte con ✕, la memoria delle scelte finché non cambia
// lo scontro. I calcoli restano in src/attacco.js; l'interfaccia in src/ui/attacco.js.
import { assegnaMani } from './equipaggiamento.js';

const segno = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const NOMI_MOVIMENTO = { passo: 'Passo', corsa: 'Corsa', scatto: 'Scatto' };
const NOMI_MANO = { due: 'Due mani', destra: 'Mano destra', sinistra: 'Mano sinistra', oltre: 'Oltre le due mani' };
const base = (uid) => String(uid).split(':')[0];

/**
 * Le armi fra cui cambiare in cima al pannello (S17): quelle in mano, con la mano come nei riquadri del Combattimento
 * (src/equipaggiamento.js → assegnaMani: «Due mani» da sola con un'arma a due mani), più i loro profili (moduli
 * integrati, attacco con lo scudo).
 * @param armi scheda.equipaggiamento.armi (profili d'attacco degli oggetti attivi)
 * @param voci scelte.equipaggiamento (per la mano registrata sulla voce, A.60)
 * @returns [{ uid, nome, mano, etichetta }]
 */
export function armiDelPannello(armi, voci = []) {
  const lista = (armi ?? []).filter((a) => a.va !== null && a.va !== undefined);
  const principali = lista.filter((a) => !a.moduloDi && !a.daScudo);
  const mano = new Map((voci ?? []).map((v) => [v.uid, v.mano ?? null]));
  const { slot, oltre } = assegnaMani(principali.map((a) => ({ uid: base(a.uid), mani: a.mani === 2 ? 2 : 1 })), (o) => mano.get(o.uid) ?? null);
  const doveSta = (uid) => (slot.due?.uid === uid ? 'due' : slot.destra?.uid === uid ? 'destra' : slot.sinistra?.uid === uid ? 'sinistra' : oltre.some((o) => o.uid === uid) ? 'oltre' : null);
  return lista.map((a) => {
    const m = doveSta(base(a.uid));
    const dove = a.daScudo ? 'Scudo' : m ? NOMI_MANO[m] : null;
    return { uid: a.uid, nome: a.nome, mano: m, etichetta: `${dove ? `${dove}: ` : ''}${a.moduloDi ? '↳ ' : ''}${a.nome}` };
  });
}

/**
 * Le fasce di distanza a pulsanti per un'arma a distanza (S21): quelle del §5.11 fino alla gittata massima dell'arma, con
 * i Q accanto e la penalità. Toccare una fascia mette la distanza al suo limite (la penalità è la stessa in tutta la
 * fascia); la distanza esatta, se serve (Tiro Ravvicinato, Bruciapelo), si scrive in «Altro».
 * @returns [{ da, a, va, q, etichetta, riga }] (q: la distanza che il pulsante imposta)
 */
export function fasceDistanza(arma, dati) {
  const fasce = dati.regole.attacco_distanza.distanza.fasce;
  const gittata = Number.isFinite(arma?.gittataQ) && arma.gittataQ > 0 ? arma.gittataQ : null;
  const out = [];
  let da = 1;
  for (const f of fasce) {
    if (gittata !== null && da > gittata) break;
    const a = gittata !== null ? Math.min(f.fino_a, gittata) : f.fino_a;
    out.push({ da, a, va: f.va, q: a, etichetta: `${da.toLocaleString('it-IT')}–${a.toLocaleString('it-IT')} Q`, riga: f.va ? `${segno(f.va)} VA` : 'nessuna penalità' });
    da = f.fino_a + 1;
  }
  return out;
}

/** La fascia in cui cade una distanza (per evidenziare il pulsante), o null se è fuori dalle fasce a pulsanti. */
export const fasciaDi = (distanza, fasce) => fasce.find((f) => distanza >= f.da && distanza <= f.a) ?? null;

/**
 * «Mirato» con il nome giusto secondo l'arma (S20): Tiro Mirato per le armi a distanza (interruttore di sempre, §5.10),
 * Colpo Mirato per quelle ravvicinate (la Manovra «mirato» di sempre, §5.12). Nomi, VA, danno e Azioni dai dati.
 * @returns { id: 'mirato', nome, va, danno, azioni, paragrafo, tipo: 'interruttore' | 'manovra' }
 */
export function mirato(arma, dati) {
  const distanza = arma?.tipo === 'arma_distanza';
  const m = distanza ? dati.regole.attacco_distanza.manovre.mirato : dati.regole.attacco_ravvicinato.manovre.mirato;
  return { id: 'mirato', nome: m.nome, va: m.va, danno: m.danno, azioni: m.azioni_principali, paragrafo: m.paragrafo, tipo: distanza ? 'interruttore' : 'manovra' };
}

/**
 * Le voci di «Altro» attive, da riassumere sopra «Altro ▾», ognuna con ✕ (S17): tutto ciò che nella dichiarazione non
 * è al valore di partenza. `togli` è la modifica che la riporta al valore di partenza (da passare a «imposta» del
 * pannello); per la luce `togli` è { luce: true } (la luce è della sessione, non dell'attacco).
 * @param tipo 'distanza' | 'ravvicinato' @param d dichiarazioneDistanza / dichiarazioneRavvicinato
 * @param opz { nomiManovre: { id: nome }, nomiOggetti: { uid: nome }, luce: { id, nome, base } | null, dati }
 * @returns [{ campo, testo, togli }]
 */
export function vociAttive(tipo, d, { nomiManovre = {}, nomiOggetti = {}, luce = null, dati = null } = {}) {
  const v = [];
  const b = d.bersaglio ?? {};
  const voce = (campo, testo, togli) => v.push({ campo, testo, togli });
  if (d.movimento !== 'fermo') voce('movimento', `Tu: ${NOMI_MOVIMENTO[d.movimento] ?? d.movimento}`, { movimento: 'fermo', atletica: null, atleticaTiro: null, ...(tipo === 'distanza' ? { evasivo: false } : {}) });
  if (d.atletica) voce('atletica', `Prova di Atletica: ${dati?.regole.attacco_distanza.movimento.prova_atletica?.esiti?.[d.atletica]?.nome ?? d.atletica}`, { atletica: null, atleticaTiro: null });
  if (tipo === 'distanza') {
    if (d.evasivo) voce('evasivo', 'Movimento Evasivo', { evasivo: false });
    if (d.coperturaPropria !== 'nessuna') voce('coperturaPropria', `Dalla Copertura ${d.coperturaPropria}`, { coperturaPropria: 'nessuna' });
  } else {
    if (d.carica) voce('carica', `Carica (${d.percorsoQ} Q)`, { carica: false });
    if (d.controcarica) voce('controcarica', 'Controcarica', { controcarica: false });
    if (d.aTerra) voce('aTerra', 'Sei A Terra', { aTerra: false });
    if (d.imboscata) voce('imboscata', 'Imboscata', { imboscata: false });
    if (d.opportunita) voce('opportunita', 'Attacco di Opportunità', { opportunita: false });
  }
  if (d.dueArmi) voce('dueArmi', 'Due armi', { dueArmi: false });
  if (d.manoNonDominante) voce('manoNonDominante', 'Mano non dominante', { manoNonDominante: false });
  if (d.primoAttacco) voce('primoAttacco', 'Primo attacco del combattimento', { primoAttacco: false });
  for (const uid of d.oggetti ?? []) voce(`oggetto:${uid}`, nomiOggetti[uid] ?? 'Effetto di un oggetto', { oggetti: d.oggetti.filter((x) => x !== uid) });
  // il bersaglio
  if (tipo === 'distanza') {
    if (b.movimento !== 'fermo') voce('bersaglio.movimento', `Bersaglio in ${NOMI_MOVIMENTO[b.movimento] ?? b.movimento}`, { bersaglio: { movimento: 'fermo', atletica: null } });
    if (b.atletica) voce('bersaglio.atletica', 'Atletica del bersaglio', { bersaglio: { atletica: null } });
    if (b.evasivo) voce('bersaglio.evasivo', `Bersaglio in Movimento Evasivo${b.evasivoMigliorato ? ' Migliorato' : ''}`, { bersaglio: { evasivo: false, evasivoMigliorato: false } });
    if (b.impegnato) voce('impegnato', 'Bersaglio impegnato o protetto', { bersaglio: { impegnato: false } });
    if (b.interposta) voce('interposta', 'Creatura interposta', { bersaglio: { interposta: false } });
    if (b.tiImpegna) voce('tiImpegna', 'Ti impegna in Ravvicinato', { bersaglio: { tiImpegna: false } });
    if (d.analisiRapida) voce('analisiRapida', 'Analisi Rapida', { analisiRapida: false });
    if (d.nascosto) voce('nascosto', 'Sei nascosto', { nascosto: false });
    if (d.preparazione) voce('preparazione', `Preparazione: ${d.preparazione} AzP`, { preparazione: 0 });
    if (d.ravvicinato) voce('ravvicinato', dati?.regole.attacco_distanza.manovre.ravvicinato.nome ?? 'Tiro Ravvicinato', { ravvicinato: false });
    if (d.bruciapelo) voce('bruciapelo', dati?.regole.attacco_distanza.manovre.bruciapelo.nome ?? 'Tiro a Bruciapelo', { bruciapelo: false });
    if (d.imbracciata === false) voce('imbracciata', 'Senza Imbracciatura', { imbracciata: true, imbracciaOra: false });
    else if (d.imbracciaOra) voce('imbracciaOra', 'Imbraccio ora (1 AzM)', { imbracciaOra: false });
  } else {
    if (b.alleatoAdiacente) voce('alleatoAdiacente', 'Bersaglio adiacente a un alleato', { bersaglio: { alleatoAdiacente: false } });
    if (b.coperturaMigliorata && b.copertura !== 'nessuna') voce('coperturaMigliorata', 'Copertura Migliorata del bersaglio', { bersaglio: { coperturaMigliorata: false } });
    if (d.attaccanti > 1) voce('attaccanti', `${d.attaccanti} attaccanti sul bersaglio`, { attaccanti: 1 });
    if (d.circostanza) voce('circostanza', `Circostanza ${segno(d.circostanza)}`, { circostanza: 0 });
    if (b.distanza > 1) voce('distanza', `Distanza ${b.distanza} Q`, { bersaglio: { distanza: 1 } });
    const m = d.manovra?.[0] ?? 'normale';
    if (m !== 'normale' && m !== 'mirato') voce('manovra', `Manovra: ${nomiManovre[m] ?? m}`, { manovra: 'normale' });
  }
  if (b.aTerra) voce('bersaglio.aTerra', 'Bersaglio A Terra', { bersaglio: { aTerra: false } });
  if (b.ignaro) voce('ignaro', 'Bersaglio ignaro', { bersaglio: { ignaro: false } });
  if (b.copertura && b.copertura !== 'nessuna') voce('copertura', `Copertura ${b.copertura}`, { bersaglio: { copertura: 'nessuna', coperturaMigliorata: false } });
  if (luce && !luce.base) voce('luce', `Luce: ${luce.nome}`, { luce: true });
  return v;
}

/**
 * Le voci attive con quelle arrivate dalla mappa (src/dalla-mappa.js): una voce arrivata dalla mappa prende il testo
 * della mappa e si toglie con «togliDallaMappa» (`mappa: true`); la distanza della mappa non sta qui, ha la sua riga al
 * posto dei pulsanti (S21).
 * @param segni [{ campo, testo }] di vociDallaMappa
 */
export function vociAttiveConMappa(voci, segni = []) {
  const perCampo = new Map(segni.filter((s) => s.campo !== 'distanza').map((s) => [s.campo, s.testo]));
  const viste = new Set();
  const out = voci.map((v) => {
    const campo = v.campo === 'bersaglio.movimento' ? null : v.campo;
    if (campo && perCampo.has(campo)) { viste.add(campo); return { ...v, testo: `${perCampo.get(campo)} (dalla mappa)`, mappa: true }; }
    return v;
  });
  // ciò che la mappa ha segnato e che non è una voce della dichiarazione (la luce proposta)
  for (const [campo, testo] of perCampo) if (!viste.has(campo)) out.push({ campo, testo: `${testo} (dalla mappa)`, mappa: true, togli: null });
  return out;
}

/**
 * Memoria del pannello (S17, punto 2): per ogni arma si ricordano l'ultima modalità e l'ultima distanza scelte (e il
 * resto delle scelte) finché non cambia lo scontro. Con uno scontro diverso da quello delle scelte salvate, o finito
 * quello di prima, si riparte dai valori di partenza; resta l'ultima Manovra usata, che è solo un promemoria.
 * @param salvate scelte ricordate per l'arma (sessione.attacchi[uid]) @param scontro id dello scontro aperto del PG, o null
 */
export function sceltePerScontro(salvate, scontro = null) {
  const s = salvate ?? {};
  const id = scontro ?? null;
  if ((s.scontro ?? null) === id) return s;
  return { ...(s.ultima ? { ultima: s.ultima } : {}), ...(id ? { scontro: id } : {}) };
}

/** Le scelte da ricordare, con lo scontro in cui sono state fatte. */
export function conScontro(scelte, scontro = null) {
  const { scontro: _prima, ...resto } = scelte ?? {};
  return scontro ? { ...resto, scontro } : resto;
}

/**
 * Un attacco «semplice»: nessuna voce di «Altro» attiva. Serve alle prove: con l'arma già scelta, la modalità e la
 * distanza ricordate, dopo l'apertura basta un tocco («Spara» o «Attacca»).
 */
export const attaccoSemplice = (tipo, d, opz = {}) => vociAttive(tipo, d, opz).length === 0;

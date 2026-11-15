// I riferimenti che non puntano a niente (lotto 201, 15/11/2026).
//
// **Il caso vero.** Nell'istantanea del 14/11/2026 il file attuale di **PABLO ZAION** rimanda al veicolo
// `veimuu14mqa0` e quello di **LUCAS** a `veimv15h6e40`: nel registro di Davide nessuno dei due esiste, perché del
// FIAT LUX è rimasto il record `veimvozx57q0`. Pablo è il pilota, e al tavolo il mezzo non si apriva.
//
// **Perché è potuto accadere, e perché è una classe e non un caso.** Un identificativo non cambia mai: è il
// **record che può sparire** — cancellato a mano per togliere un doppione, o perso in un cambio della cartella dei
// dati — e chi lo citava non viene più riconciliato. `src/veicoli-registro.js → migraVeicoli` lo dice in una riga:
// `if (eRiferimento(v) || !isOggetto(v)) return v;` — un riferimento non si guarda nemmeno, quindi un riferimento
// appeso è per sempre. E nella tab Veicoli un riferimento senza record non compariva fra le schede, quindi non
// aveva nemmeno il pulsante «Togli dalla scheda», che si offre solo per i record che esistono: non si poteva né
// riparare né buttare.
//
// **La regola di questo modulo: si dice, non si indovina.** Trovare il riferimento rotto e proporre i candidati è
// un conto; scegliere è del Direttore. Nemmeno con un solo candidato plausibile l'app ricollega da sé, perché un
// collegamento sbagliato è peggio di uno mancante — un mezzo attaccato al PG sbagliato si scopre a danno fatto.
// `tests/riferimenti-rotti-201.test.js` fallisce se qualcuno ci mette un ricollegamento automatico.
import { profiloVeicolo, nomiVeicolo, quandoNato } from './veicoli.js';
import { chiaveRif } from './mappa/token.js';

const lista = (x) => (Array.isArray(x) ? x : []);
const isOggetto = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const testo = (x) => (typeof x === 'string' ? x.trim() : '');

/** Un veicolo delle scelte è un riferimento al registro? (la stessa domanda di src/veicoli-registro.js) */
const eRiferimento = (v) => isOggetto(v) && typeof v.rif === 'string' && v.rif !== '';

/**
 * I riferimenti a veicoli che nel registro non esistono.
 *
 * @param veicoli `scelte.veicoli` del personaggio
 * @param record i record del registro (`veicoli/`), già letti
 * @returns [{ rif, nome, uid, copia }] — `copia` è l'ultima copia che il file conserva, se c'è (A.113)
 */
export function veicoliRotti(veicoli, record) {
  const ci = new Set(lista(record).map((r) => r?.id).filter(Boolean));
  return lista(veicoli)
    .filter((v) => eRiferimento(v) && !ci.has(v.rif))
    .map((v) => ({ rif: v.rif, nome: testo(v.nome) || v.rif, uid: testo(v.uid) || v.rif, copia: isOggetto(v.copia) ? v.copia : null }));
}

/** Tutti i nomi con cui un record si può riconoscere: quello scritto, quello deciso e il modello. */
function nomiDelRecord(rec, dati) {
  const profilo = profiloVeicolo(rec?.mezzo?.profilo, dati);
  const n = new Set();
  const agg = (x) => { if (testo(x)) n.add(testo(x).toLowerCase()); };
  agg(rec?.mezzo?.nome);
  agg(profilo?.nome);
  agg(profilo?.nome_esemplare?.nome);
  if (profilo) { try { agg(nomiVeicolo(rec.mezzo, profilo)?.nome); } catch { /* il nome deciso non è indispensabile */ } }
  return n;
}

/**
 * I veicoli del registro che potrebbero essere quello perduto.
 *
 * Un riferimento appeso porta solo `nome` e l'identificativo: il profilo non c'è (la forma che
 * `migraVeicoli` scrive è `{ uid, rif, nome }`). Quindi si riconosce **dal nome**, confrontato con tutti i nomi di
 * un record: quello scritto nel record, quello deciso dai dati (per lo Scout «FIAT LUX», A.226) e il modello
 * («ASA Scout MK4»). Un riferimento che conserva la copia (A.113) dà anche il profilo, e allora quello comanda.
 *
 * @returns i record candidati, in ordine di nome
 */
export function candidatiPerVeicolo(rotto, record, dati) {
  const cercaProfilo = testo(rotto?.copia?.mezzo?.profilo);
  const cercaNome = testo(rotto?.nome).toLowerCase();
  const fuori = lista(record).filter((rec) => {
    if (!isOggetto(rec?.mezzo)) return false;
    if (cercaProfilo) return rec.mezzo.profilo === cercaProfilo;
    if (!cercaNome) return false;
    return nomiDelRecord(rec, dati).has(cercaNome);
  });
  return fuori.sort((a, b) => String(a.mezzo?.nome ?? a.id).localeCompare(String(b.mezzo?.nome ?? b.id), 'it'));
}

/**
 * Che cosa si dice e che cosa si può fare, per un riferimento rotto.
 *
 * `azione` è l'unico posto in cui si decide chi può fare che cosa: `'ricollega'` con uno o più candidati (solo il
 * Direttore), `'togli'` quando non c'è nessun candidato. Il testo è una riga, non un riquadro: vale la regola dello
 * spazio in alto nella scheda.
 *
 * @returns {{ rif, nome, testo, candidati, azione, soloDirettore }}
 */
export function statoRiferimentoRotto(rotto, record, dati, { master = false } = {}) {
  const candidati = candidatiPerVeicolo(rotto, record, dati);
  const quali = candidati.map((r) => `${r.mezzo?.nome ?? r.id} (${r.id})`).join(', ');
  const base = `«${rotto.nome}» rimanda al veicolo ${rotto.rif}, che nel registro non c’è più: il mezzo non si apre.`;
  const coda = !candidati.length
    ? ' Nel registro non c’è nessun veicolo che gli somigli: lo rimette il Direttore, o si toglie il riferimento.'
    : candidati.length === 1
      ? ` Nel registro c’è ${quali}: lo ricollega il Direttore, l’app non sceglie da sé.`
      : ` Nel registro ce ne sono ${candidati.length} che gli somigliano (${quali}): sceglie il Direttore.`;
  return {
    rif: rotto.rif,
    nome: rotto.nome,
    testo: `${base}${coda}`,
    candidati,
    azione: candidati.length ? 'ricollega' : 'togli',
    soloDirettore: !master,
  };
}

/**
 * Ricollega un riferimento rotto a un record del registro. **Solo il Direttore**, e solo con un id scelto: senza
 * `master: true` o senza `idNuovo` non fa niente e dice perché.
 *
 * Non indovina mai: se `idNuovo` non è fra i record, si ferma. La voce ricollegata prende l'identificativo nuovo e
 * il nome del record, e conserva da dove viene (`ricollegato`), così la riga del registro del master si può
 * ricostruire anche guardando solo il file.
 *
 * @returns {{ veicoli, voce, riga } | { errore }}
 */
export function ricollegaVeicolo(veicoli, rif, idNuovo, record, { master = false, quando = new Date().toISOString(), da = 'Direttore' } = {}) {
  if (master !== true) return { errore: 'solo il Direttore ricollega un veicolo: l’app non sceglie da sé' };
  const vecchia = lista(veicoli).find((v) => eRiferimento(v) && v.rif === rif);
  if (!vecchia) return { errore: `in questa scheda non c’è un riferimento al veicolo ${rif}` };
  const rec = lista(record).find((r) => r?.id === idNuovo);
  if (!rec) return { errore: `il veicolo ${idNuovo} non è nel registro: non ricollego a un record che non c’è` };
  if (lista(veicoli).some((v) => eRiferimento(v) && v.rif === idNuovo)) {
    return { errore: `questa scheda rimanda già a ${idNuovo}: togli il riferimento rotto invece di ricollegarlo` };
  }
  const voce = {
    uid: rec.id,
    rif: rec.id,
    nome: rec.mezzo?.nome ?? rec.id,
    ricollegato: { da: rif, quando, chi: da },
  };
  return {
    veicoli: lista(veicoli).map((v) => (v === vecchia ? voce : v)),
    voce,
    riga: `Veicolo ricollegato: «${vecchia.nome ?? rif}» rimandava a ${rif}, che non è nel registro; ora rimanda a ${voce.nome} (${rec.id}).`,
  };
}

/**
 * Toglie dalla scheda un riferimento rotto, senza ricollegarlo: è la via d'uscita quando il record non c'è più e
 * non c'è niente a cui attaccarsi. Solo il Direttore, come il ricollegamento.
 */
export function togliRiferimentoRotto(veicoli, rif, { master = false } = {}) {
  if (master !== true) return { errore: 'solo il Direttore toglie un riferimento rotto dalla scheda' };
  const vecchia = lista(veicoli).find((v) => eRiferimento(v) && v.rif === rif);
  if (!vecchia) return { errore: `in questa scheda non c’è un riferimento al veicolo ${rif}` };
  return {
    veicoli: lista(veicoli).filter((v) => v !== vecchia),
    riga: `Riferimento tolto dalla scheda: «${vecchia.nome ?? rif}» rimandava a ${rif}, che nel registro non c’è.`,
  };
}

/**
 * Il quadro per uno strumento o per il controllo di inizio sessione: per ogni personaggio i suoi riferimenti rotti,
 * con i candidati e se si può sistemare da solo.
 *
 * `sistemabile` è vero con **esattamente un** candidato: è il caso in cui il Direttore, lanciando lo strumento, sa
 * già che cosa sta facendo. Con più candidati `attesa` è vero e si lascia alla scheda, perché scegliere non è nostro.
 *
 * @param personaggi [{ nome, file, json }] (il file attuale di ciascuno: lotto 200)
 * @returns {{ righe, quanti, sistemabili, inAttesa, senzaCandidati, riga }}
 */
export function quadroRiferimentiRotti(personaggi, record, dati, { master = false } = {}) {
  const righe = [];
  for (const p of lista(personaggi)) {
    for (const rotto of veicoliRotti(p.json?.scelte?.veicoli, record)) {
      const s = statoRiferimentoRotto(rotto, record, dati, { master });
      righe.push({
        personaggio: p.nome, file: p.file, percorso: p.percorso ?? null,
        rif: rotto.rif, nome: rotto.nome, tipo: 'veicolo',
        candidati: s.candidati, testo: s.testo,
        sistemabile: s.candidati.length === 1,
        attesa: s.candidati.length > 1,
        senzaCandidati: s.candidati.length === 0,
      });
    }
  }
  const chi = [...new Set(righe.map((r) => r.personaggio))];
  return {
    righe,
    quanti: righe.length,
    sistemabili: righe.filter((r) => r.sistemabile).length,
    inAttesa: righe.filter((r) => r.attesa).length,
    senzaCandidati: righe.filter((r) => r.senzaCandidati).length,
    riga: righe.length
      ? `Riferimenti rotti: ${righe.length} (${chi.join(', ')}). Il mezzo non si apre: «node tools/riferimenti-rotti.mjs» dice che cosa, «--scrivi» ricollega dove il candidato è uno solo.`
      : 'Riferimenti rotti: nessuno.',
  };
}

// ---------------------------------------------------------------------------------------------------------
// I token della mappa che rimandano al vuoto (lotto 202, 15/11/2026)
//
// **Lo stesso difetto in un altro posto, ma non era muto come la scheda.** `tokenOrfani` in
// `src/mappa/partecipanti.js` trova già i token il cui pezzo non c'è, e la pagina della mappa li **toglie da sé**
// con un avviso. Per un partecipante che è uscito dallo scontro è giusto così, ed è il comportamento di sempre
// (§6 del lotto della mappa): chi lascia il combattimento non resta sulla pedina.
//
// **Due casi, però, non sono «è uscito»: sono «il record è sparito».**
//   1. un token di **veicolo** il cui record non è più nel registro (è la storia dello Scout, lotto 201);
//   2. un token di **partecipante** quando lo scontro collegato alla scena **non c'è più** (`mancante`), o quando
//      la scena non ha nessun collegamento: lì nessuno guarda, perché la pagina controlla gli orfani soltanto
//      quando uno scontro o una bozza si sono letti.
//
// Per quei due, cancellare in silenzio è la decisione sbagliata presa senza chiedere — un record di veicolo può
// tornare, e un collegamento rotto si rimette. Quindi: **si dice**, con l'identificativo e **da quando quel record
// era in giro** (gli uid portano la data di nascita, lotto 201), e **ricollega solo il Direttore scegliendo**.
// «Togli dalla mappa» resta sempre disponibile: un token che non si può né riparare né buttare è il buco che il
// lotto 201 ha chiuso sui veicoli.

/** Tipi di token che rimandano a qualcosa d'altro. Un segnaposto non rimanda a niente: non può restare appeso. */
const RIMANDANO = new Set(['veicolo', 'partecipante']);

/**
 * I token appesi di una scena: quelli il cui pezzo non c'è **perché il record è sparito**, non perché un
 * partecipante è uscito dallo scontro.
 *
 * @param scena la scena
 * @param pezzi i pezzi di `pezziDellaScena` (quelli che esistono davvero adesso)
 * @param opz.veicoli i record del registro (per distinguere «record sparito» da «mezzo che non è in questa scena»)
 * @param opz.collegamento com'è il collegamento della scena allo scontro:
 *   - `'presente'` (default) lo scontro o la bozza **esistono**, anche chiusi o in archivio: i token dei
 *     partecipanti **non sono appesi**, perché la scena di un combattimento finito è il suo ricordo e i token
 *     sono quello che è successo. Nelle sette scene della copia locale, sei stanno così;
 *   - `'nessuno'` la scena non è collegata a niente: nemmeno quelli sono appesi, perché mettere i PG su una mappa
 *     senza scontro è una cosa che si fa;
 *   - `'sparito'` il collegamento nomina uno scontro che **non esiste da nessuna parte**, nemmeno in archivio:
 *     allora sì, i token dei partecipanti rimandano al vuoto. Nella copia locale succede in una scena su sette.
 *
 *   *Perché questa distinzione conta più del resto:* col criterio ingenuo («il pezzo non c'è») i token appesi
 *   della copia locale sarebbero **70 su 76**, cioè un allarme che si impara a ignorare — e un allarme ignorato è
 *   peggio di nessun allarme. Con questo sono quelli di una scena sola.
 * @returns [{ token, tipo, rif, nome, nato, motivo }]
 */
export function tokenAppesi(scena, pezzi, { veicoli = [], collegamento = 'presente' } = {}) {
  const ci = new Set(lista(pezzi).map((p) => p.chiave));
  const idVeicoli = new Set(lista(veicoli).map((r) => r?.id).filter(Boolean));
  const out = [];
  for (const t of lista(scena?.token)) {
    const tipo = t?.rif?.tipo;
    if (!RIMANDANO.has(tipo)) continue;
    if (ci.has(chiaveRif(t.rif))) continue;
    const id = t.rif.id;
    if (tipo === 'veicolo') {
      // un veicolo che è nel registro ma non in questa scena non è appeso: è solo un mezzo che non c'entra
      if (idVeicoli.has(id)) continue;
      out.push({ token: t, tipo, rif: id, nome: testo(t.nome) || id, nato: quandoNato(id), motivo: 'il veicolo non è più nel registro' });
      continue;
    }
    // partecipante: appeso **solo** se il collegamento nomina uno scontro che non esiste da nessuna parte. Con lo
    // scontro presente (anche chiuso o archiviato) o senza collegamento il token è legittimo: un combattimento
    // finito resta sulla mappa come ricordo, e un partecipante che esce da uno scontro aperto lo toglie la pagina
    // della mappa come ha sempre fatto (§6 del lotto della mappa).
    if (collegamento === 'sparito') out.push({ token: t, tipo, rif: id, nome: testo(t.nome) || id, nato: null, motivo: 'lo scontro collegato alla scena non esiste, nemmeno in archivio' });
  }
  return out;
}

/**
 * I candidati per ricollegare un token appeso.
 *
 * Un token appeso porta pochissimo: l'identificativo e, se c'è, il nome. Quindi i candidati sono **quello che
 * esiste e non è già sulla mappa**: per un veicolo i record del registro senza token in questa scena, per un
 * partecipante i pezzi che non hanno ancora un token. Con uno il Direttore ha un tocco da fare; con più di uno
 * sceglie. L'app non indovina in nessuno dei due casi.
 */
export function candidatiPerToken(appeso, scena, pezzi, { veicoli = [] } = {}) {
  const presi = new Set(lista(scena?.token).map((t) => chiaveRif(t?.rif)));
  if (appeso.tipo === 'veicolo') {
    return lista(veicoli)
      .filter((r) => r?.id && !presi.has(chiaveRif({ tipo: 'veicolo', id: r.id })))
      .map((r) => ({ id: r.id, nome: r.mezzo?.nome ?? r.id, nato: quandoNato(r.id), tipo: 'veicolo' }))
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'it'));
  }
  return lista(pezzi)
    .filter((p) => p?.rif?.tipo === 'partecipante' && !presi.has(p.chiave))
    .map((p) => ({ id: p.rif.id, nome: p.nome ?? p.rif.id, nato: null, tipo: 'partecipante' }))
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'it'));
}

/**
 * Che cosa si dice di un token appeso, e che cosa si può fare: **una riga**, perché sulla mappa lo spazio è ancora
 * più stretto che nella scheda.
 */
export function statoTokenAppeso(appeso, scena, pezzi, { veicoli = [], master = false } = {}) {
  const candidati = candidatiPerToken(appeso, scena, pezzi, { veicoli });
  const quando = appeso.nato ? `, il record era del ${appeso.nato}` : '';
  const quali = candidati.map((c) => `${c.nome}${c.nato ? ` (del ${c.nato})` : ''}`).join(', ');
  const coda = !candidati.length
    ? ' Non c’è niente a cui ricollegarlo: si toglie dalla mappa.'
    : candidati.length === 1
      ? ` Si può ricollegare a ${quali}: sceglie il Direttore, l’app non indovina.`
      : ` Si può ricollegare a ${candidati.length} cose (${quali}): sceglie il Direttore.`;
  return {
    token: appeso.token.id,
    tipo: appeso.tipo,
    rif: appeso.rif,
    candidati,
    soloDirettore: !master,
    testo: `Token «${appeso.nome}» appeso: ${appeso.motivo} (${appeso.rif}${quando}).${coda}`,
  };
}

/**
 * Ricollega un token a qualcosa che esiste. **Solo il Direttore, e solo con una scelta**: senza `master: true` o
 * senza l'id scelto non fa niente e dice perché. Torna la scena nuova, senza toccare altro.
 */
export function ricollegaToken(scena, idToken, scelto, { master = false, veicoli = [], pezzi = [], quando = new Date().toISOString() } = {}) {
  if (master !== true) return { errore: 'solo il Direttore ricollega un token: l’app non indovina' };
  const t = lista(scena?.token).find((x) => x?.id === idToken);
  if (!t) return { errore: `in questa scena non c’è il token ${idToken}` };
  if (!RIMANDANO.has(t.rif?.tipo)) return { errore: 'un segnaposto non rimanda a niente: non si ricollega' };
  const tipo = t.rif.tipo;
  const esiste = tipo === 'veicolo'
    ? lista(veicoli).some((r) => r?.id === scelto)
    : lista(pezzi).some((p) => p?.rif?.tipo === 'partecipante' && p.rif.id === scelto);
  if (!esiste) return { errore: `${scelto} non esiste: non ricollego a qualcosa che non c’è` };
  if (lista(scena.token).some((x) => x !== t && chiaveRif(x?.rif) === chiaveRif({ tipo, id: scelto }))) {
    return { errore: `${scelto} ha già il suo token sulla mappa: togli quello appeso invece di ricollegarlo` };
  }
  const nuovo = { ...t, rif: { tipo, id: scelto }, ricollegato: { da: t.rif.id, quando } };
  return {
    scena: { ...scena, token: scena.token.map((x) => (x === t ? nuovo : x)) },
    token: nuovo,
    riga: `Token ricollegato: «${t.nome ?? t.id}» rimandava a ${t.rif.id}, che non c’è; ora rimanda a ${scelto}.`,
  };
}

/** Toglie un token dalla mappa. Sempre disponibile al Direttore: un token che non si può buttare è un buco. */
export function togliToken(scena, idToken, { master = false } = {}) {
  if (master !== true) return { errore: 'solo il Direttore toglie un token dalla mappa' };
  const t = lista(scena?.token).find((x) => x?.id === idToken);
  if (!t) return { errore: `in questa scena non c’è il token ${idToken}` };
  return {
    scena: { ...scena, token: scena.token.filter((x) => x !== t) },
    riga: `Token tolto dalla mappa: «${t.nome ?? t.id}» rimandava a ${t.rif?.id ?? '—'}, che non c’è.`,
  };
}

/**
 * Il quadro dei token appesi di più scene, per lo strumento e per il controllo di inizio sessione: quanti, in quali
 * scene e di che tipo.
 * @param scene [{ nome, file, scena, pezzi, veicoli, collegamento }]
 */
export function quadroTokenAppesi(scene) {
  const righe = [];
  for (const s of lista(scene)) {
    for (const a of tokenAppesi(s.scena, s.pezzi ?? [], { veicoli: s.veicoli ?? [], collegamento: s.collegamento })) {
      righe.push({ scena: s.nome ?? s.scena?.nome ?? s.file, file: s.file ?? null, ...a, token: a.token.id });
    }
  }
  const dove = [...new Set(righe.map((r) => r.scena))];
  const perTipo = (t) => righe.filter((r) => r.tipo === t).length;
  return {
    righe,
    quanti: righe.length,
    veicoli: perTipo('veicolo'),
    partecipanti: perTipo('partecipante'),
    riga: righe.length
      ? `Token appesi: ${righe.length} in ${dove.length} ${dove.length === 1 ? 'scena' : 'scene'} (${dove.join(', ')}) — ${perTipo('veicolo')} su veicoli spariti, ${perTipo('partecipante')} su partecipanti. Sulla mappa l'app lo dice e il Direttore ricollega o toglie.`
      : 'Token appesi: nessuno.',
  };
}

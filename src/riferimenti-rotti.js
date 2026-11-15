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
import { profiloVeicolo, nomiVeicolo } from './veicoli.js';

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

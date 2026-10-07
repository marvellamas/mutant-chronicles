// Tavolo del Master, pezzo 1 (docs/tavolo-direttore.md): la plancia dei PG in sola lettura, rotta
// #/tavolo, solo con il server della cartella (server.mjs). Il master sceglie quali personaggi di
// personaggi/ sono «al tavolo» (selezione salvata sul server, tavolo/sessione.json); per ognuno conta il
// file più recente. Le schede si rileggono ogni pochi secondi, solo se il file è cambiato; i valori e
// le provenienze sono quelli di calcolaScheda (src/tavolo.js → vistaPlancia).
import { h, svuota } from './dom.js';
import { infoValore, nascondiTooltip } from './tooltip.js';
import { iconaPagina } from './immagini.js';
import { riempimento } from '../interfaccia.js';
import { vistaPlancia, testoConSessione, sessioneDaFile, pgDaAggiungere } from '../tavolo.js';
import { riallinea, alRound, terminaDurate, collegamentoScontro, durateCarta, testoDurata } from '../round-scontro.js';
import { rigaDurate } from './durate.js';
import { ultimiPerPersonaggio, chiaveDaFile, nomiCheSiConfondono } from '../cartella.js';
import { elencoCartella, leggiCartella, leggiCartellaConRevisione, scriviCartella, creaInCartella } from './cartella.js';
import { apriColpo, specDaFormula } from './colpo.js';
import { tira } from '../tiri.js';
import { apriAttaccoNemico } from './attacco-nemico.js';
import { apriLancioNemico } from './lancio-nemico.js';
import { attacchiDi } from '../nemico-attacco.js';
import { testoColpo } from '../danno.js';
import { perditeDovute, applicaPerdita, registraPeriodico, togliPeriodici, allineaPeriodici, periodicoDi, pvDopoPerdita } from '../periodici.js';
import { pannelloScontro, leggiScontroAperto, leggiScontro, salvaScontro } from './scontro.js';
import { pannelloBestiario, elencoNemici, cartaNemico } from './nemici.js';
import { diTurno, avanti, registraColpo, annullaUltimoColpo, registraAttacco, registraLancioNemico, righeNuove, riduciNemico, confermaRegimeNemico, aggiungiNemici, registraRiga, cambiaStatoNemico } from '../scontro.js';
import { vociBestiario } from '../nemici.js';
import { creaCustode } from './ridisegno.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { apriCreaNemico, apriDaBestiario } from './crea-nemico.js';
import { apriPreparazione } from './preparazione.js';
import { riquadroCollega, leggiRete } from './collega.js';
import { cartaVeicoloPlancia } from './veicoli.js';
import { stessaChiave } from '../veicoli-registro.js';
import { elencoVeicoli, aggiornaVeicolo } from './veicoli-registro.js';
import { statoScene, pannelloScene, apriElencoScene } from './mappa/scene.js';
import { mostraCarta } from './mappa/canale.js';
import { linkGuidaMappa } from './guida.js';
import { cartaDallaMappa, arrivoDallaMappa, tornaAllaMappa } from './ritorno.js';
import { scegliImmagineNemico, impostaImmagineNemico } from './immagine-nemico.js';
import { chiediTesto, chiedi } from './finestrella.js';

const INTERVALLO_MS = 3000;
/** Carta con la chiave del suo token (data-pezzo): la mappa di battaglia la cerca al clic sul token (src/ui/mappa/canale.js). */
const conPezzo = (el, chiave) => { if (el?.dataset) el.dataset.pezzo = chiave; return el; };
const numero = (n) => (n < 0 ? `−${-n}` : String(n));
/** Nome di un partecipante dello scontro (fonte di una perdita periodica), o null se non c'è. */
const nomePartecipante = (s, id) => (id ? (s?.partecipanti ?? []).find((p) => p.id === id)?.nome ?? null : null);

async function leggiSelezione() {
  try {
    const r = await fetch('api/tavolo', { cache: 'no-store' });
    return r.ok ? (await r.json()).personaggi ?? [] : [];
  } catch {
    return [];
  }
}

async function scriviSelezione(personaggi) {
  const r = await fetch('api/tavolo', { method: 'PUT', body: JSON.stringify({ personaggi }), headers: { 'Content-Type': 'application/json' } });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).errore ?? `errore ${r.status}`);
  return (await r.json()).personaggi;
}

/**
 * Disegna la plancia in `radice` e avvia l'aggiornamento periodico.
 * @param ctx { dati, azioni: { personaggi(), apri(remoto), mappa(id), tornaMappa?(id) }, soloCarta?: () => chiave }
 *   soloCarta (mappa di battaglia, difetto 2 del 06/10/2026): la plancia disegna solo la carta del pezzo indicato
 *   («partecipante:pg:<chiave>», «partecipante:<id>», «veicolo:<id>»), con «Colpito» e i suoi pulsanti, per il pannello
 *   accanto alla mappa; il resto (aggiornamento, salvataggi, «Colpito») è lo stesso della plancia.
 * @returns {() => void} ferma l'aggiornamento (uscendo dalla plancia)
 */
export function renderTavolo(radice, ctx) {
  const stato = {
    elenco: [], // file della cartella (server)
    selezione: [], // nomi «al tavolo»
    viste: new Map(), // file → vista calcolata (al Round dello scontro, se il PG è in uno scontro aperto)
    testi: new Map(), // file → testo letto, per ricalcolare la vista quando cambia il Round dello scontro
    errori: new Map(), // file → messaggio
    ultimo: null, // ms dell'ultimo aggiornamento riuscito
    errore: null,
    sceltaAperta: false,
    attivo: true,
    // pezzo 2: scontro aperto (server, scontri/), avviso dopo un conflitto di revisione, registro aperto
    scontro: null,
    avvisoScontro: null,
    registroAperto: false,
    bozza: null,
    // pezzo 3: bestiario (nemici/ sul server), validato a ogni lettura
    bestiario: [],
    firmaBestiario: null,
    bestiarioAperto: false,
    bozzaNemici: null,
    // mappa di battaglia (lotto 2, docs/battlemap/piano.md): elenco delle scene, letto quando si apre
    scene: statoScene(),
    // «Collega i giocatori»: indirizzi della rete (server.mjs → /api/rete), riquadro aperto finché non lo si chiude
    rete: null,
    collegaAperto: !ctx.inMappa,
    // A.105: registro unico dei veicoli (veicoli/ sul server), stato dei pannelli «Colpito» delle carte
    veicoli: [],
    firmaVeicoli: null,
    uiVeicoli: {},
  };

  // salva una modifica dello scontro; con una revisione vecchia (altra finestra) ricarica quello attuale
  // dopo il salvataggio riuscito la conferma dell'azione: le righe nuove del registro (src/ui/avvisi.js); gli
  // errori (conflitto di revisione, server spento) in rosso
  const salva = async (nuovo, { conferme = true } = {}) => {
    const prima = stato.scontro;
    try {
      const r = await salvaScontro(nuovo);
      if (r.conflitto !== undefined) {
        stato.scontro = r.conflitto?.stato === 'aperto' ? r.conflitto : null;
        stato.avvisoScontro = 'Lo scontro è stato cambiato in un’altra finestra: ho ricaricato lo stato attuale. Ripeti l’ultima azione se serve ancora.';
        avvisoErrore(`Non salvato: ${stato.avvisoScontro}`);
      } else {
        stato.avvisoScontro = r.scontro.stato === 'chiuso' ? `«${r.scontro.nome}» chiuso e archiviato in scontri/archivio/.` : null;
        stato.scontro = r.scontro.stato === 'aperto' ? r.scontro : null;
        const righe = conferme ? righeNuove(prima, r.scontro) : [];
        // Round collegato (src/round-scontro.js): i file dei PG seguono lo scontro (inizio, Stati scaduti, fine)
        seguiScontro(prima, r.scontro);
        // − e + dei PV e dei PM: un avviso per nemico, che si aggiorna ai clic successivi
        for (const x of righe.filter((y) => y.chiave)) avviso(x.testo, { chiave: x.chiave });
        const altre = righe.filter((y) => !y.chiave).map((y) => y.testo);
        if (r.scontro.stato === 'chiuso') altre.push(stato.avvisoScontro);
        if (altre.length) avviso(altre);
      }
      disegna();
      return r.conflitto === undefined;
    } catch (e) {
      stato.avvisoScontro = `Scontro non salvato: ${e.message}`;
      avvisoErrore(`${stato.avvisoScontro}. Controlla che la finestra di avvia-server.bat sia aperta.`);
      disegna();
      return false;
    }
  };
  // Round collegato fra scheda e tavolo (richiesta di Marcello del 03/10, src/round-scontro.js): la plancia scrive
  // nel file del PG solo in tre momenti, con la revisione e un nuovo tentativo se il giocatore ha appena salvato:
  // all'inizio dello scontro le durate in corso passano sul Round dello scontro; quando un nuovo Round chiude la durata
  // di uno Stato del PG, lo Stato si toglie; alla fine dello scontro la sessione passa al Round finale, e la scheda
  // riprende il suo contatore da lì con le durate ancora attive. Fra un momento e l'altro la scheda legge il Round
  // dello scontro e non scrive nulla.
  const aggiornaPg = async (chiave, fn) => {
    const r = ultimiPerPersonaggio(stato.elenco).get(chiave);
    if (!r) return null;
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      try {
        const { testo, mtime } = await leggiCartellaConRevisione(r.file);
        const { testo: nuovo, sessione } = sessioneDaFile(testo, fn, ctx.dati);
        if (nuovo) await scriviCartella(r.file, nuovo, { mtime });
        return sessione;
      } catch (e) {
        if (!e.conflitto) { avvisoErrore(`Scheda di ${chiave.replace(/-/g, ' ')} non aggiornata: ${e.message}`); return null; }
      }
    }
    avvisoErrore(`Scheda di ${chiave.replace(/-/g, ' ')} non aggiornata: è cambiata tre volte di fila. Riprova.`);
    return null;
  };
  const seguiScontro = async (prima, dopo) => {
    const pg = (dopo?.partecipanti ?? []).filter((p) => p.tipo === 'pg');
    if (!pg.length) return;
    const nuovo = dopo.stato === 'aperto' && (!prima || prima.id !== dopo.id);
    const fine = dopo.stato === 'chiuso' && prima?.stato === 'aperto';
    if (nuovo) for (const p of pg) await aggiornaPg(p.chiave, (x) => riallinea(x, dopo.round));
    else if (fine) {
      // le durate rimaste si leggono dalle sessioni appena scritte nei file
      const ancora = [];
      for (const p of pg) {
        const sessione = await aggiornaPg(p.chiave, (x) => alRound(x, dopo.round));
        if (sessione) ancora.push(...durateCarta(sessione, null, ctx.dati).map((d) => `${p.nome}: ${testoDurata(d)}`));
      }
      if (ancora.length) avviso(`Durate ancora attive nelle schede, che riprendono il loro contatore dal Round ${dopo.round}: ${ancora.join('; ')}. «Termina le durate» le chiude.`, { tipo: 'info', durata: 9000 });
    } else if (prima && dopo.stato === 'aperto' && dopo.round > prima.round) {
      // Stati dei PG la cui durata è finita con il nuovo Round (Giocatore §5.18): si tolgono dalla scheda
      const restano = new Set(dopo.durate.map((d) => `${d.partecipante}|${d.stato}`));
      for (const p of pg) {
        const finiti = prima.durate.filter((d) => d.partecipante === p.id && !restano.has(`${d.partecipante}|${d.stato}`)).map((d) => d.stato);
        if (finiti.length) await aggiornaPg(p.chiave, (x) => ({ ...x, statiAttivi: (x.statiAttivi ?? []).filter((y) => !finiti.includes(y)) }));
      }
    } else return;
    await aggiorna(true);
  };
  // Perdite periodiche degli Stati (Giocatore §5.15 Sanguinamento, §5.18 Incendiato e Avvelenato;
  // src/periodici.js). La plancia le applica da sé quando il turno arriva alla fonte, al massimo una volta
  // per Round: per un nemico i PV stanno nello scontro, per un PG nel suo file, scritto con la revisione
  // come le durate. Il campo `ultimo` della perdita rende l'applicazione idempotente, così due «Avanti» in
  // due finestre non la contano due volte. A 0 PV serve una Prova: si segnala e non si applica nulla.
  // bersagli dello scontro con i loro Stati attivi, per l'allineamento delle perdite periodiche
  const bersagliPeriodici = (alTavolo) => [
    ...alTavolo.filter((r) => !r.mancante && stato.viste.get(r.file)?.completa).map((r) => {
      const v = stato.viste.get(r.file);
      return { bersaglio: `pg:${v.chiaveCartella}`, nome: v.nome, tipo: 'pg', chiave: v.chiaveCartella, stati: (v.stati ?? []).map((s) => s.id) };
    }),
    ...nemiciInScontro().map((p) => ({ bersaglio: p.id, nome: p.nome, tipo: 'nemico', stati: p.stati ?? [] })),
  ];
  let periodiciInCorso = false;
  const applicaPeriodici = async () => {
    if (periodiciInCorso || !stato.scontro) return;
    // Stato periodico non più attivo (fermato con Medicina, un Incantesimo, o spento): la perdita si chiude;
    // Stato attivo senza una perdita registrata (messo a mano dalla scheda o sulla carta): serve il valore
    const ultimi = ultimiPerPersonaggio(stato.elenco);
    const alTavolo = stato.selezione.map((k) => ultimi.get(k) ?? { mancante: k });
    const { daRegistrare, daChiudere } = allineaPeriodici(stato.scontro, bersagliPeriodici(alTavolo), ctx.dati);
    if (daChiudere.length) {
      periodiciInCorso = true;
      try {
        for (const p of daChiudere) await modifica((x) => togliPeriodici(x, p.bersaglio, [p.stato], undefined, ctx.dati));
      } finally { periodiciInCorso = false; }
    }
    for (const d of daRegistrare) {
      avviso(`${d.nomeStato} di ${d.nome} è attivo ma non toglie PV: manca il valore. Usa «Sanguinamento» nella barra degli Stati periodici (§5.15).`, { chiave: `periodico-manca-${d.bersaglio}-${d.stato}`, tipo: 'info' });
    }
    const dovute = perditeDovute(stato.scontro, ctx.dati);
    if (!dovute.length) return;
    periodiciInCorso = true;
    try {
      for (const d of dovute) {
        // Incendiato e i veleni hanno una formula: il valore lo tira l'app, e la riga del registro lo dice
        let valore = d.valore;
        let tiro = null;
        if (valore === null && d.formula) {
          const spec = specDaFormula(d.formula);
          if (!spec) { avvisoErrore(`${d.nomeStato} di ${d.nome}: formula «${d.formula}» non riconosciuta, applicala a mano.`); continue; }
          tiro = { valore: tira(spec).tiro.valore, origine: 'app' };
          valore = tiro.valore;
        }
        if (!Number.isInteger(valore) || valore < 1) { avvisoErrore(`${d.nomeStato} di ${d.nome}: manca il valore della perdita.`); continue; }
        if (d.tipo === 'nemico') {
          await modifica((x) => applicaPerdita(x, { ...d, valore, tiro }, null, undefined, ctx.dati));
          continue;
        }
        // PG: i PV stanno nel suo file. Si legge, si scrive, poi si registra la perdita nello scontro.
        const r = ultimiPerPersonaggio(stato.elenco).get(d.chiave);
        if (!r) { avvisoErrore(`${d.nomeStato} di ${d.nome}: scheda non trovata in personaggi/, applicala a mano.`); continue; }
        let pv = null;
        try {
          const { testo, mtime } = await leggiCartellaConRevisione(r.file);
          const v = vistaPlancia(testo, ctx.dati, r.file);
          pv = { pvPrima: v.pv.attuali, pvDopo: pvDopoPerdita(v.pv.attuali, valore) };
          // §5.15: già a 0 PV non si tolgono PV, serve la PS di Tempra: la riga del registro la chiede
          if (pv.pvPrima > 0) await scriviCartella(r.file, testoConSessione(testo, { pvAttuali: pv.pvDopo }, ctx.dati), { mtime });
        } catch (e) {
          avvisoErrore(`${d.nomeStato} di ${d.nome}: PV non aggiornati (${e.message}). Riprovo al prossimo Round.`);
          continue;
        }
        await modifica((x) => applicaPerdita(x, { ...d, valore, tiro }, pv, undefined, ctx.dati));
      }
    } finally {
      periodiciInCorso = false;
    }
    await aggiorna(true);
  };
  // «Termina le durate»: chiude le Tecniche in corso di tutti i PG al tavolo (durate rimaste dopo uno scontro)
  const terminaTutte = async (pgConDurate) => {
    const nomi = [...pgConDurate.map((v) => v.nome), ...((stato.scontro?.effetti ?? []).length ? ['nemici nello scontro'] : [])];
    if (!(await chiedi({ titolo: 'Terminare tutte le durate in corso?', testo: nomi.join(', '), si: 'Termina' }))) return;
    for (const v of pgConDurate) await aggiornaPg(v.chiaveCartella, terminaDurate);
    // incantesimi dei nemici nello scontro
    if ((stato.scontro?.effetti ?? []).length) await modifica((x) => registraRiga({ ...x, effetti: [] }, 'Durate degli incantesimi dei nemici terminate dal master.'));
    avviso(`Durate terminate: ${nomi.join(', ')}.`);
    await aggiorna(true);
  };

  // le modifiche si mettono in fila: ognuna parte dallo scontro salvato dalla precedente (clic rapidi su − e +)
  let coda = Promise.resolve(true);
  const modifica = (fn) => {
    coda = coda.then(async () => {
      if (!stato.scontro) return false;
      let nuovo;
      try { nuovo = fn(stato.scontro); } catch (e) { stato.avvisoScontro = e.message; avvisoErrore(e.message); disegna(); return false; }
      if (nuovo === stato.scontro) return true;
      return salva(nuovo);
    });
    const esito = coda;
    // perdite periodiche degli Stati (§5.15, §5.18): si controllano dopo ogni modifica dello scontro, fuori
    // dalla coda (applicaPeriodici usa a sua volta modifica, e dentro la coda si bloccherebbe con sé stessa)
    esito.then(() => applicaPeriodici()).catch(() => {});
    return esito;
  };

  // il ridisegno periodico non chiude le tendine né toglie il focus ai campi in uso (src/ui/ridisegno.js)
  const custode = creaCustode(radice, { ridisegna: () => disegna() });
  // mappa di battaglia: plancia aperta dalla mappa («Apri nella plancia»): la carta da mostrare e la scena a cui tornare
  // lotto 6: dentro la barra della mappa (ctx.inMappa) la plancia è tutta, senza titolo né «Torna alla mappa»
  let cartaDaMostrare = ctx.soloCarta || ctx.inMappa ? null : cartaDallaMappa(sessionStorage);
  const scenaDiRitorno = () => (ctx.soloCarta || ctx.inMappa ? null : arrivoDallaMappa(sessionStorage));
  // vista del PG al Round dello scontro in cui si trova (durate di Tecniche e incantesimi finite: niente effetti)
  const roundDi = (v) => (v?.chiaveCartella ? collegamentoScontro(stato.scontro, v.chiaveCartella)?.round ?? null : null);
  const vistaAlRound = (file, testo) => {
    const v = vistaPlancia(testo, ctx.dati, file);
    const round = v.completa ? roundDi(v) : null;
    return round ? vistaPlancia(testo, ctx.dati, file, round) : v;
  };
  const allineaViste = () => {
    for (const [file, v] of stato.viste) {
      if (!v?.completa || !stato.testi.has(file) || (roundDi(v) ?? null) === (v.roundVista ?? null)) continue;
      try { stato.viste.set(file, vistaAlRound(file, stato.testi.get(file))); } catch { /* resta la vista di prima */ }
    }
  };
  const disegna = () => {
    allineaViste();
    if (!stato.attivo) return;
    nascondiTooltip();
    const foto = custode.fotografa();
    const ultimi = ultimiPerPersonaggio(stato.elenco);
    const alTavolo = stato.selezione.map((k) => ultimi.get(k) ?? { mancante: k });
    if (ctx.soloCarta) {
      svuota(radice, h('section', { class: 'plancia plancia-carta-sola' }, cartaSola(ctx.soloCarta(), ultimi, alTavolo)));
      custode.ripristina(foto);
      return;
    }
    const ritorno = scenaDiRitorno();
    // i pezzi della plancia, gli stessi a pagina intera e nella barra della mappa (ritocchi del 06/10: a gruppi)
    const azioniPlancia = h('div', { class: 'riga-azioni' },
      // lotto 6: la plancia a pagina intera resta, con «Torna alla mappa»
      ctx.inMappa ? h('button', { type: 'button', class: 'btn', title: 'La plancia a pagina intera, con «Torna alla mappa»', onclick: () => ctx.azioni.planciaIntera() }, 'Plancia intera') : null,
      h('span', { class: 'nota plancia-aggiornato', 'aria-live': 'polite' }, stato.errore ?? testoAggiornato(stato.ultimo)),
      h('button', { type: 'button', class: `btn${stato.sceltaAperta ? ' primario' : ''}`, 'aria-expanded': String(stato.sceltaAperta), onclick: () => { stato.sceltaAperta = !stato.sceltaAperta; disegna(); } }, 'Chi è al tavolo'),
      h('button', { type: 'button', class: 'btn', title: 'Sceglie uno o più file JSON di «SALVA PG», li controlla come «Importa», li scrive in personaggi/ senza mai sovrascrivere e li mette al tavolo', onclick: () => sceltaFile.click() }, 'Aggiungi PG al tavolo'),
      sceltaFile,
      h('button', { type: 'button', class: 'btn', title: 'Copia i personaggi e i nemici d’esempio del repo (esempi/) nelle cartelle del server; non sovrascrive mai un file già presente', onclick: caricaEsempi }, 'Carica esempi'),
      // richiesta di Marcello del 03/10: bozze di scontro e nemici dal Bestiario, anche senza scontro aperto
      h('button', { type: 'button', class: 'btn', title: 'Bozze di scontro: nemici, quanti, note, difficoltà; «Inizia» le apre con l’Iniziativa tirata', onclick: preparaScontro }, 'Prepara scontro'),
      h('button', { type: 'button', class: 'btn', title: 'Procedura guidata dal Bestiario (base, grado, moduli), oppure tutto a caso', onclick: () => creaNemico() }, 'Crea nemico'),
      // nella mappa le scene stanno già nel gruppo «Mappa»: niente doppione
      ctx.inMappa ? null : h('button', { type: 'button', class: 'btn', title: 'Scene della mappa di battaglia: nuova, apri, rinomina, duplica, archivia', onclick: () => apriElencoScene(stato.scene, disegna) }, 'Mappa'),
      // la guida della mappa per il master (docs/battlemap/guida-davide.md), in una scheda nuova
      ctx.inMappa || ctx.soloCarta ? null : linkGuidaMappa('Guida della mappa'),
      h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.personaggi() }, 'Personaggi'));
    const esitoEsempi = stato.esitoEsempi ? h('p', { class: 'riquadro attenzione', role: 'status' }, stato.esitoEsempi) : null;
    const collega = riquadroCollega(stato.rete, { aperto: stato.collegaAperto, onToggle: (v) => { stato.collegaAperto = v; } });
    const scelta = stato.sceltaAperta ? sceltaAlTavolo(stato, ultimi, async (nuova) => {
      try {
        stato.selezione = await scriviSelezione(nuova);
        avviso(`Al tavolo: ${stato.selezione.length ? stato.selezione.map((k) => k.replace(/-/g, ' ')).join(', ') : 'nessuno'}.`, { chiave: 'al-tavolo' });
      } catch (e) { avvisoErrore(`Selezione non salvata: ${e.message}`); }
      await aggiorna(true);
    }) : null;
    const stScontro = Object.assign(stato, { pgAlTavolo: alTavolo.map((r) => stato.viste.get(r.file)).filter((v) => v?.completa) });
    const azScontro = { modifica, crea: (s) => salva(s), ridisegna: disegna, annullaColpo, attacca: (p) => attacca(p, alTavolo) };
    const cartePg = alTavolo.length
      ? h('div', { class: 'plancia-griglia' }, alTavolo.map((r) => (r.mancante ? cartaMancante(r.mancante)
        : stato.viste.get(r.file) ? conPezzo(cartaPg(ctx, stato.viste.get(r.file), r, turnoDi(r), colpitoPg, durateDi(stato.viste.get(r.file))), `partecipante:pg:${chiaveDaFile(r.file)}`) : cartaErrore(r, stato.errori.get(r.file)))))
      : h('p', { class: 'vuoto' }, 'Nessun personaggio al tavolo: sceglili con «Chi è al tavolo».');
    const carteNemici = nemiciInScontro().length
      ? h('div', { class: 'plancia-griglia' }, nemiciInCarta().map((p) => conPezzo(cartaNemico(ctx, p, { modifica, durate: durateNemico(p), diTurnoOra: diTurno(stato.scontro)?.id === p.id, onColpito: () => colpitoNemico(p), onAttacca: attacchiDi(p).length ? () => attacca(p, alTavolo) : null, onLancia: (i) => lancia(p, i, alTavolo), onRiduci: (v) => modifica((x) => riduciNemico(x, p.id, v)), onRegime: (k, r) => modifica((x) => confermaRegimeNemico(x, p.id, k, r, new Date())), onImmagine: () => immagineNemico(p) }), `partecipante:${p.id}`)))
      : null;
    const scene = pannelloScene(ctx, stato.scene, { ridisegna: disegna, apri: (id) => ctx.azioni.mappa(id) });
    const bestiario = pannelloBestiario(ctx, stato.bestiario, {
      aperto: stato.bestiarioAperto,
      onToggle: (v) => { stato.bestiarioAperto = v; },
      salvato: async (n) => { avviso(`Tipo di nemico salvato: ${n?.nome ?? ''} (nemici/${n?.id ?? '…'}.json).`); stato.firmaBestiario = null; await aggiornaBestiario(); disegna(); },
      procedura: (n) => creaNemico(n),
    });
    // ritocchi del 06/10: nella barra della mappa la plancia si divide nei gruppi dei segnalibri (src/ui/mappa/pagina.js)
    const S = ctx.inMappa?.sezioni;
    if (S) {
      // difetto 4 del collaudo del lotto 7: l'Iniziativa è quella dello scontro della scena, non per forza quello aperto
      const c = ctx.inMappa.collegamento?.() ?? null;
      const riquadro = (titolo, testo) => h('section', { class: 'riquadro scontro-pannello' }, h('h2', {}, titolo), h('p', { class: 'nota' }, testo));
      svuota(S.iniziativa, h('div', { class: 'plancia plancia-in-mappa' },
        c?.bozza ? riquadro('Scontro non ancora iniziato', `La scena è collegata alla bozza «${c.nomeBozza ?? c.bozza}»: l’ordine d’Iniziativa compare quando lo scontro inizia («Prepara scontro» → «Inizia»).`)
          : !c?.scontro ? riquadro('Nessuno scontro collegato', 'Collega la scena a uno scontro o a una bozza dal gruppo «Mappa».')
            : c.scontro !== stato.scontro?.id ? riquadro('Lo scontro della scena non è aperto', stato.scontro ? `È aperto un altro scontro («${stato.scontro.nome}»): collega la scena a quello dal gruppo «Mappa», o chiudilo.` : 'Lo scontro collegato è chiuso: collega la scena a un altro scontro o a una bozza dal gruppo «Mappa».')
              : pannelloScontro(ctx, stScontro, azScontro, 'iniziativa')));
      svuota(S.pg, h('div', { class: 'plancia plancia-in-mappa' }, cartePg, sezioneVeicoli()));
      svuota(S.nemici, h('div', { class: 'plancia plancia-in-mappa' }, carteNemici ?? h('p', { class: 'vuoto' }, stato.scontro ? 'Nessun nemico nello scontro: aggiungili da «Scontro».' : 'Nessuno scontro aperto.')));
      svuota(S.scontro, h('div', { class: 'plancia plancia-in-mappa' },
        h('header', { class: 'plancia-testa' }, azioniPlancia), esitoEsempi, scelta,
        pannelloScontro(ctx, stScontro, azScontro, 'gestione'), barraDurate(alTavolo), barraPeriodici(alTavolo), collega, bestiario));
      svuota(S.mappa, h('div', { class: 'plancia plancia-in-mappa' }, scene));
      custode.ripristina(foto);
      return;
    }
    svuota(radice, h('section', { class: `plancia${ctx.inMappa ? ' plancia-in-mappa' : ''}` },
      // aperta dalla mappa: un pulsante grande per tornare alla scena, allo zoom e alla posizione di prima
      ritorno ? h('button', { type: 'button', class: 'btn primario btn-torna-mappa', onclick: () => { tornaAllaMappa(sessionStorage); ctx.azioni.mappa(ritorno); } }, '← Torna alla mappa') : null,
      h('header', { class: 'plancia-testa' },
        ctx.inMappa ? null : h('div', { class: 'riga-titolo' }, h('a', { class: 'marchio marchio-in-linea', href: '#/', title: 'Elenco dei personaggi' }, 'Mutant'),
          h('h1', { class: 'titolo-con-stemma' }, iconaPagina('combattimento', '96', { classe: 'badge-pagina', lato: 40 }), 'Tavolo del Master')),
        azioniPlancia),
      esitoEsempi,
      ctx.inMappa ? null : h('p', { class: 'nota' }, 'Sola lettura: i valori sono quelli delle schede in personaggi/, ricalcolati con le regole attuali. Per cambiarli si apre il personaggio (clic sulla mini-scheda).'),
      collega,
      scelta,
      pannelloScontro(ctx, stScontro, azScontro),
      barraDurate(alTavolo),
      barraPeriodici(alTavolo),
      cartePg,
      carteNemici ? [h('h2', { class: 'plancia-sezione' }, 'Nemici nello scontro'), carteNemici] : null,
      sezioneVeicoli(),
      scene,
      bestiario));
    custode.ripristina(foto);
    if (cartaDaMostrare && mostraCarta(radice, cartaDaMostrare)) cartaDaMostrare = null;
  };
  // A.131: immagine del token di un tipo di nemico, per tutte le sue copie nello scontro e nel bestiario
  const immagineNemico = async (p) => {
    const img = await scegliImmagineNemico(ctx.dati, p.scheda?.nome ?? p.nome);
    if (!img) return;
    try {
      await impostaImmagineNemico({ tipo: p.nemico, immagine: img, scontro: stato.scontro?.id ?? null, nome: p.scheda?.nome ?? p.nome });
      stato.firmaBestiario = null;
      await aggiorna(true);
    } catch (e) { avvisoErrore(`Immagine non salvata: ${e.message}`); }
  };
  // «Crea nemico» (src/ui/crea-nemico.js): con uno scontro aperto il nemico può entrare subito nello scontro;
  // con un nemico del bestiario creato dalla procedura, la riapre sul suo riepilogo
  const pgAlTavolo = () => stato.selezione.map((k) => ultimiPerPersonaggio(stato.elenco).get(k)).filter(Boolean).map((r) => stato.viste.get(r.file)).filter((v) => v?.completa);
  const livelloTavolo = () => { const l = pgAlTavolo().map((v) => v.livello); return l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : 8; };
  const bestiarioSalvato = async () => { stato.firmaBestiario = null; await aggiornaBestiario(); disegna(); };
  const creaNemico = (riapri = null) => {
    const opzioni = {
      voci: stato.bestiario, livello: livelloTavolo(), salvato: bestiarioSalvato,
      destinazione: stato.scontro ? { etichetta: 'Aggiungi allo scontro', aggiungi: (n, { quanti, lato }) => modifica((x) => aggiungiNemici(x, n, quanti, { lato })) } : null,
    };
    if (riapri) apriDaBestiario(ctx, riapri, opzioni); else apriCreaNemico(ctx, opzioni);
  };
  // «Prepara scontro» (src/ui/preparazione.js): «Inizia» mette al tavolo i PG scelti nella bozza e apre lo scontro
  const preparaScontro = () => apriPreparazione(ctx, {
    bestiario: () => stato.bestiario, alTavolo: pgAlTavolo, scontroAperto: () => !!stato.scontro, salvatoBestiario: bestiarioSalvato,
    inizia: async (scontro, chiaviPg) => {
      if (chiaviPg.length) {
        try { stato.selezione = await scriviSelezione([...new Set([...stato.selezione, ...chiaviPg])]); } catch (e) { avvisoErrore(`Selezione «al tavolo» non salvata: ${e.message}`); }
      }
      const ok = await salva(scontro, { conferme: false });
      await aggiorna(true);
      return ok;
    },
  });
  // «Carica esempi»: copia esempi/ nelle cartelle del server senza sovrascrivere (server.mjs → /api/esempi)
  const caricaEsempi = async () => {
    try {
      const r = await fetch('api/esempi', { method: 'POST' });
      if (!r.ok) throw new Error(`errore ${r.status}`);
      const { copiati, saltati } = await r.json();
      // con il bestiario umano i file sono decine: oltre otto si dice quanti
      const elenco = (xs) => (xs.length > 8 ? `${xs.length} file` : xs.join(', '));
      stato.esitoEsempi = `Esempi: ${copiati.length ? `copiati ${elenco(copiati)}` : 'nessun file nuovo'}${saltati.length ? `; saltati perché già presenti (non sovrascritti): ${elenco(saltati)}` : ''}. I personaggi si mettono al tavolo con «Chi è al tavolo»; i nemici sono nel Bestiario.`;
    } catch (e) {
      stato.esitoEsempi = `Esempi non caricati: ${e.message}`;
      avvisoErrore(stato.esitoEsempi);
    }
    stato.firmaBestiario = null;
    await aggiorna(true);
  };
  // Pezzo 4: «Colpito» (src/danno.js → applicaColpo, finestra src/ui/colpo.js). Serve uno scontro aperto:
  // il colpo va nel registro e si può annullare. Il PG si scrive nel suo file con la revisione (mtime).
  const statiValidi = (ids, immuni = []) => ids.filter((id) => !immuni.includes(id));
  // fonti possibili delle perdite periodiche (§5.15: l'Iniziativa di chi le ha procurate): chi è di turno
  // per primo, poi gli altri partecipanti dello scontro
  const fontiPeriodiche = () => {
    const p = stato.scontro?.partecipanti ?? [];
    const turno = diTurno(stato.scontro)?.id ?? null;
    const voce = (x) => ({ id: x.id, nome: x.id === turno ? `${x.nome} (di turno)` : x.nome });
    return [...p.filter((x) => x.id === turno).map(voce), ...p.filter((x) => x.id !== turno).map(voce)];
  };
  const colpitoPg = (v, r, proposta = {}) => {
    if (!stato.scontro) return;
    const bersaglio = { nome: v.nome, pv: v.pv, ferite: v.ferite.grado, ar: v.ar };
    apriColpo(ctx, bersaglio, {
      proposta,
      fonti: fontiPeriodiche(),
      applica: async (ris, colpo, stati, periodici = []) => {
        const { testo, mtime } = await leggiCartellaConRevisione(r.file);
        const ora = vistaPlancia(testo, ctx.dati, r.file);
        if (ora.pv.attuali !== v.pv.attuali || ora.ferite.grado !== v.ferite.grado) throw new Error(`${v.nome} è cambiato nel frattempo (PV ${ora.pv.attuali}, Ferite ${ora.ferite.grado}): chiudi e riapri «Colpito».`);
        const prima = { pv: ora.pv.attuali, ferite: ora.ferite.grado, stati: ora.sessione.statiAttivi ?? [] };
        const dopo = { pv: ris.pv.dopo, ferite: ris.ferite.dopo, stati: [...new Set([...prima.stati, ...stati])] };
        try {
          await scriviCartella(r.file, testoConSessione(testo, { pvAttuali: dopo.pv, ferite: dopo.ferite, statiAttivi: dopo.stati }, ctx.dati), { mtime });
        } catch (e) {
          throw new Error(e.conflitto ? `${v.nome} è stato salvato altrove proprio ora: chiudi e riapri «Colpito».` : e.message);
        }
        const ok = await modifica((x) => {
          let t = registraColpo(x, { bersaglio: `pg:${v.chiaveCartella}`, nome: v.nome, tipo: 'pg', file: r.file, testo: testoColpo(v.nome, colpo, ris), prima, dopo });
          // §5.15: la perdita immediata l'ha già fatta il colpo; qui si registra quella periodica, con la fonte
          for (const p of periodici) t = registraPeriodico(t, { ...p, bersaglio: `pg:${v.chiaveCartella}`, nome: v.nome, tipo: 'pg', chiave: v.chiaveCartella, fonteNome: nomePartecipante(t, p.fonte) }, undefined, ctx.dati);
          return t;
        });
        await aggiorna(true);
        return ok;
      },
    });
  };
  const colpitoNemico = (p, proposta = {}) => {
    if (!stato.scontro) return;
    // A.73, decisione 7: i nemici seguono la procedura dei PG (PS di Tempra a 0 PV, Ferite per fascia, Menomazioni)
    const bersaglio = { nome: p.nome, pv: p.pv, ferite: p.ferite ?? 0, ar: p.scheda.ar };
    apriColpo(ctx, bersaglio, {
      proposta,
      fonti: fontiPeriodiche(),
      applica: async (ris, colpo, stati, periodici = []) => modifica((x) => {
        const q = x.partecipanti.find((y) => y.id === p.id);
        if (!q || q.pv.attuali !== p.pv.attuali || (q.ferite ?? 0) !== (p.ferite ?? 0)) throw new Error(`${p.nome} è cambiato nel frattempo: chiudi e riapri «Colpito».`);
        const ammessi = statiValidi(stati, q.scheda?.immunita ?? []);
        const dopoStati = [...new Set([...q.stati, ...ammessi])];
        const prima = { pv: q.pv.attuali, ferite: q.ferite ?? 0, menomazioni: q.menomazioni ?? [], stati: q.stati };
        const dopo = { pv: ris.pv.dopo, ferite: ris.ferite?.dopo ?? prima.ferite, menomazioni: [...prima.menomazioni, ...(ris.menomazioni ?? [])], stati: dopoStati };
        let t = registraColpo(x, { bersaglio: p.id, nome: p.nome, tipo: 'nemico', testo: testoColpo(p.nome, colpo, ris), prima, dopo });
        // §5.15: perdita periodica dei soli Stati applicati davvero (un nemico immune non la prende)
        for (const y of periodici.filter((z) => ammessi.includes(z.stato))) {
          t = registraPeriodico(t, { ...y, bersaglio: p.id, nome: p.nome, tipo: 'nemico', fonteNome: nomePartecipante(t, y.fonte) }, undefined, ctx.dati);
        }
        return t;
      }),
    });
  };
  // Pezzo 5: «Attacca» di un nemico o di un partecipante manuale con un attacco (src/ui/attacco-nemico.js).
  // Bersagli: i PG al tavolo (Difese dalla scheda) e gli altri nemici dello scontro (Difese dal formato).
  const bersagliPer = (p, alTavolo) => {
    const pg = alTavolo.filter((r) => !r.mancante && stato.viste.get(r.file)?.completa).map((r) => {
      const v = stato.viste.get(r.file);
      return { id: `pg:${v.chiaveCartella}`, nome: v.nome, descrizione: `PG · PV ${v.pv.attuali}/${v.pv.massimo}${v.difese ? ` · Difese ${v.difese.valore}` : ''} · AR ${v.ar?.valori[0]?.valore ?? 0}`, colpito: (proposta) => colpitoPg(v, r, proposta) };
    });
    const nemici = nemiciInScontro().filter((q) => q.id !== p.id).map((q) => ({
      id: q.id, nome: q.nome, descrizione: `${q.lato} · PV ${q.pv.attuali}/${q.pv.massimo} · Difese ${q.scheda.difese} · AR ${q.scheda.ar.totale}`, colpito: (proposta) => colpitoNemico(q, proposta),
    }));
    return [...pg, ...nemici];
  };
  const attacca = (p, alTavolo) => {
    if (!stato.scontro) return;
    apriAttaccoNemico(ctx, p, { bersagli: bersagliPer(p, alTavolo), registra: (a) => modifica((x) => registraAttacco(x, a)) });
  };
  // Lotto 8 (A.73, decisione 8): «Lancia!» di un nemico con un incantesimo completo; i PM si scalano nello scontro
  // dopo il lancio di un incantesimo con danno si sceglie il bersaglio e si apre «Colpito», come per «Attacca»
  const lancia = (p, indice, alTavolo) => {
    if (!stato.scontro) return;
    apriLancioNemico(ctx, p, indice, { bersagli: bersagliPer(p, alTavolo), registra: (l) => modifica((x) => registraLancioNemico(x, l, undefined, ctx.dati)) });
  };
  // «Annulla ultimo colpo»: per un PG si rimettono nel file PV, Ferite e Stati di prima (con la revisione)
  const annullaColpo = async () => {
    let esito;
    try { esito = annullaUltimoColpo(stato.scontro); } catch (e) { stato.avvisoScontro = e.message; avvisoErrore(e.message); disegna(); return; }
    const { colpo } = esito;
    if (colpo.tipo === 'pg' && colpo.file) {
      try {
        const { testo, mtime } = await leggiCartellaConRevisione(colpo.file);
        const ora = vistaPlancia(testo, ctx.dati, colpo.file);
        if (ora.pv.attuali !== colpo.dopo.pv || ora.ferite.grado !== colpo.dopo.ferite) {
          stato.avvisoScontro = `${colpo.nome} è cambiato dopo il colpo (PV ${ora.pv.attuali}): annullamento non fatto, correggi dalla sua scheda.`;
          avvisoErrore(stato.avvisoScontro);
          disegna();
          return;
        }
        await scriviCartella(colpo.file, testoConSessione(testo, { pvAttuali: colpo.prima.pv, ferite: colpo.prima.ferite, statiAttivi: colpo.prima.stati }, ctx.dati), { mtime });
      } catch (e) {
        stato.avvisoScontro = `Annullamento non fatto: ${e.message}`;
        avvisoErrore(stato.avvisoScontro);
        disegna();
        return;
      }
    }
    await salva(esito.scontro);
    await aggiorna(true);
  };
  ctx.scontroAperto = () => !!stato.scontro;
  // «Aggiungi PG al tavolo»: file dal computer → controllo come «Importa» → personaggi/ (mai sovrascritti) → al tavolo
  const sceltaFile = h('input', { type: 'file', accept: '.json,application/json', multiple: true, hidden: true, onchange: async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (files.length) await aggiungiPg(files);
  } });
  const aggiungiPg = async (files) => {
    const righe = [];
    const alTavolo = [];
    for (const f of files) {
      const pg = pgDaAggiungere(f.name, await f.text(), ctx.dati);
      if (pg.errore) { righe.push(`${f.name}: non valido (${pg.errore}), non scritto`); continue; }
      try {
        const r = await creaInCartella(pg.file, pg.testo);
        const rinomina = pg.rinominato ? ` (rinominato da ${f.name})` : '';
        righe.push(r.esiste ? `${pg.file}${rinomina}: esiste già, non sovrascritto; messo al tavolo` : `${pg.file}${rinomina}: aggiunto e messo al tavolo`);
        alTavolo.push(chiaveDaFile(pg.file));
      } catch (err) {
        righe.push(`${f.name}: non scritto (${err.message})`);
      }
    }
    if (alTavolo.length) {
      try { stato.selezione = await scriviSelezione([...new Set([...stato.selezione, ...alTavolo])]); } catch (err) { righe.push(`Selezione «al tavolo» non salvata: ${err.message}`); }
    }
    stato.esitoEsempi = `Aggiungi PG al tavolo: ${righe.join(' · ')}.`;
    await aggiorna(true);
  };
  // durate di un PG per la sua carta: Round dello scontro se ci è, altrimenti quello della sua scheda
  const durateDi = (v) => (v?.completa ? [...durateCarta(v.sessione, collegamentoScontro(stato.scontro, v.chiaveCartella), ctx.dati), ...dagliAltriPg(`pg:${v.chiaveCartella}`, v.chiaveCartella)] : []);
  // incantesimi lanciati dai PG su un partecipante (PG o nemico): dalle loro schede, con il Round dello scontro
  const dagliAltriPg = (id, salta = null) => [...stato.viste.values()].filter((w) => w?.completa && w.chiaveCartella !== salta).flatMap((w) => {
    const r = collegamentoScontro(stato.scontro, w.chiaveCartella)?.round ?? w.sessione.round ?? 1;
    return (w.sessione.incantesimiAttivi ?? []).filter((x) => (x.al === null || x.al >= r) && (x.bersagli ?? []).some((b) => b.id === id))
      .map((x) => ({ nome: `${x.nome} (da ${w.nome})`, tipo: 'subito', al: x.al, rimasti: x.al === null ? null : x.al - r + 1, testo: x.testo }));
  });
  // durate di un nemico: i suoi incantesimi in corso, quelli subiti dai nemici e dai PG
  const durateNemico = (p) => {
    const r = stato.scontro?.round ?? 1;
    const effetti = (stato.scontro?.effetti ?? []).filter((e) => e.al === null || e.al === undefined || e.al >= r);
    const dura = (e) => ({ al: e.al, rimasti: e.al === null || e.al === undefined ? null : e.al - r + 1, testo: e.testo });
    return [
      ...effetti.filter((e) => e.da === p.id).map((e) => ({ nome: e.nome, tipo: 'incantesimo', bersagli: e.bersagli, ...dura(e) })),
      ...effetti.filter((e) => e.da !== p.id && (e.bersagli ?? []).some((b) => b.id === p.id)).map((e) => ({ nome: `${e.nome} (da ${e.daNome})`, tipo: 'subito', ...dura(e) })),
      ...dagliAltriPg(p.id),
    ];
  };
  const barraDurate = (alTavolo) => {
    const conDurate = alTavolo.map((r) => stato.viste.get(r.file)).filter((v) => v?.completa && durateDi(v).some((d) => d.tipo === 'tecnica' || d.tipo === 'incantesimo'));
    const nemici = (stato.scontro?.effetti ?? []).length;
    if (!conDurate.length && !nemici) return null;
    return h('p', { class: 'riga-azioni barra-durate' },
      h('span', { class: 'nota' }, [conDurate.length ? `Tecniche e incantesimi in corso nelle schede: ${conDurate.map((v) => v.nome).join(', ')}.` : null, nemici ? ` Incantesimi dei nemici nello scontro: ${nemici}.` : null].filter(Boolean).join('')),
      h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Chiude tutte le Tecniche e gli incantesimi in corso dei PG al tavolo (scrive nei loro file) e quelli dei nemici nello scontro', onclick: () => terminaTutte(conDurate) }, 'Termina le durate'));
  };
  /**
   * Barra degli Stati che togliono PV a ogni Round (§5.15 Sanguinamento, §5.18 Incendiato e Avvelenato):
   * quelli in corso con valore e fonte, e quelli attivi che non hanno ancora un valore, da registrare.
   * Le perdite si applicano da sé all'Iniziativa della fonte: qui si vedono e si fermano.
   */
  const barraPeriodici = (alTavolo) => {
    if (!stato.scontro) return null;
    const inCorso = stato.scontro.periodici ?? [];
    const { daRegistrare } = allineaPeriodici(stato.scontro, bersagliPeriodici(alTavolo), ctx.dati);
    if (!inCorso.length && !daRegistrare.length) return null;
    const fonte = (p) => (p.fonte ? `fonte ${p.fonteNome ?? p.fonte}` : 'fine del Round');
    return h('div', { class: 'riga-azioni barra-durate barra-periodici' },
      h('span', { class: 'nota' }, 'Stati che togliono PV ogni Round (§5.15, §5.18): '),
      inCorso.map((p) => h('span', { class: 'periodico-voce' },
        `${nomeStatoPlancia(p.stato)} ${p.valore ?? p.formula} di ${p.nome} (${fonte(p)}) `,
        h('button', { type: 'button', class: 'btn btn-piccolo', title: 'Lo Stato è stato fermato (Medicina §5.15, un Incantesimo, un antidoto): non toglie più PV', onclick: () => fermaPeriodico(p) }, 'Ferma'))),
      daRegistrare.map((d) => h('span', { class: 'periodico-voce motivo' },
        `${d.nomeStato} di ${d.nome}: manca il valore `,
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => registraAMano(d) }, 'Registra'))));
  };
  const nomeStatoPlancia = (id) => ctx.dati.regole.stati.elenco.find((s) => s.id === id)?.nome ?? id;
  // §5.15: arrestare il Sanguinamento (Medicina, un Incantesimo, un antidoto, spegnere le fiamme) fa finire
  // lo Stato: si toglie anche dalla scheda del PG o dalla carta del nemico, non solo la perdita
  const fermaPeriodico = async (p) => {
    if (!(await chiedi({ titolo: `${nomeStatoPlancia(p.stato)} di ${p.nome}: fermato?`, testo: 'Non toglierà più PV a ogni Round e lo Stato si toglie.', si: 'Fermato' }))) return;
    await modifica((x) => {
      const t = togliPeriodici(x, p.bersaglio, [p.stato], undefined, ctx.dati);
      return p.tipo === 'nemico' ? cambiaStatoNemico(t, p.bersaglio, ctx.dati.regole.stati.elenco.find((s) => s.id === p.stato), false) : t;
    });
    if (p.tipo === 'pg' && p.chiave) await aggiornaPg(p.chiave, (s) => ({ ...s, statiAttivi: (s.statiAttivi ?? []).filter((y) => y !== p.stato) }));
    await aggiorna(true);
  };
  // Stato periodico messo a mano (dalla scheda del giocatore o sulla carta del nemico): valore e fonte
  const registraAMano = async (d) => {
    const per = periodicoDi(d.stato, ctx.dati);
    const atteso = per.danno === 'valore' ? 'quanti PV per Round (per esempio 1)' : `quanti PV per Round, o una formula (per esempio ${per.danno === 'dalla_fonte' ? '1d4' : per.danno})`;
    const scritto = (await chiediTesto({ titolo: `${d.nomeStato} di ${d.nome}`, etichetta: `${atteso[0].toUpperCase()}${atteso.slice(1)}`, valore: per.danno === 'valore' ? '1' : per.danno === 'dalla_fonte' ? '1d4' : per.danno, massimo: 20 })) ?? '';
    if (!scritto) return;
    const numero = Number(scritto);
    const valore = Number.isInteger(numero) && numero > 0 ? numero : null;
    const formula = valore === null && /^\d+d\d+([+-]\d+)?$/.test(scritto) ? scritto : null;
    if (valore === null && !formula) { avvisoErrore(`«${scritto}» non è un numero di PV né una formula come «1d4».`); return; }
    const t = diTurno(stato.scontro);
    const fonte = t && (await chiedi({ titolo: `La fonte è ${t.nome} (di turno)?`, testo: 'Sì: la perdita si applica alla sua Iniziativa. No: alla fine del Round.', si: `Sì, ${t.nome}`, no: 'No, a fine Round' })) ? t.id : null;
    await modifica((x) => registraPeriodico(x, { ...d, ...(valore ? { valore } : {}), ...(formula ? { formula } : {}), fonte, fonteNome: nomePartecipante(x, fonte) }, undefined, ctx.dati));
  };
  /**
   * Carta sola per il pannello della mappa: PG (con «Apri scheda completa»), nemico o veicolo, come nella plancia.
   * Un nemico di una bozza non ha ancora una carta: lo dice.
   */
  const cartaSola = (chiave, ultimi, alTavolo) => {
    if (!chiave) return h('p', { class: 'vuoto' }, 'Nessun token scelto.');
    const pg = /^partecipante:pg:(.+)$/.exec(chiave);
    if (pg) {
      const r = [...ultimi].find(([k]) => stessaChiave(k, pg[1]))?.[1];
      const v = r ? stato.viste.get(r.file) : null;
      if (!r) return h('p', { class: 'nota' }, stato.elenco.length ? `Nessun file di ${pg[1]} in personaggi/.` : 'Lettura delle schede…');
      if (!v) return h('p', { class: 'nota' }, stato.errori.get(r.file) ?? 'Lettura della scheda…');
      return [conPezzo(cartaPg(ctx, v, r, turnoDi(r), colpitoPg, durateDi(v)), `partecipante:pg:${chiaveDaFile(r.file)}`),
        h('button', { type: 'button', class: 'btn primario btn-scheda-completa', onclick: () => ctx.azioni.apri(r) }, 'Apri scheda completa')];
    }
    const part = /^partecipante:(.+)$/.exec(chiave);
    if (part) {
      const p = (stato.scontro?.partecipanti ?? []).find((x) => x.id === part[1]);
      if (!p) return h('p', { class: 'nota' }, stato.scontro ? 'Non è nello scontro aperto.' : 'Nessuno scontro aperto: i nemici di una bozza hanno la mini-scheda quando lo scontro parte («Inizia»).');
      if (p.tipo !== 'nemico') return h('article', { class: 'carta-plancia' }, h('h2', {}, p.nome), h('p', { class: 'nota' }, `Scritto a mano nello scontro (${p.lato}): si gestisce dal riquadro dello scontro della plancia.`));
      return conPezzo(cartaNemico(ctx, p, { modifica, durate: durateNemico(p), diTurnoOra: diTurno(stato.scontro)?.id === p.id, onColpito: () => colpitoNemico(p), onAttacca: attacchiDi(p).length ? () => attacca(p, alTavolo) : null, onLancia: (i) => lancia(p, i, alTavolo), onRiduci: (v) => modifica((x) => riduciNemico(x, p.id, v)), onRegime: (k, r) => modifica((x) => confermaRegimeNemico(x, p.id, k, r, new Date())), onImmagine: () => immagineNemico(p) }), `partecipante:${p.id}`);
    }
    const vei = /^veicolo:(.+)$/.exec(chiave);
    const rec = vei ? stato.veicoli.find((x) => x.id === vei[1]) : null;
    return rec ? cartaVeicolo(rec) : h('p', { class: 'nota' }, vei ? 'Lettura del registro dei veicoli…' : 'Mini-scheda non trovata.');
  };

  // A.105: veicoli del registro; conducente e mitragliere fra i PG dello scontro e del tavolo
  const cartaVeicolo = (rec) => {
    const persone = new Map();
    for (const p of stato.scontro?.partecipanti ?? []) if (p.tipo === 'pg' && p.chiave) persone.set(p.chiave, { chiave: p.chiave, nome: p.nome });
    for (const [file, v] of stato.viste) if (stato.selezione.includes(chiaveDaFile(file)) && v?.nome) persone.set(chiaveDaFile(file), { chiave: chiaveDaFile(file), nome: v.nome });
    const vistaDi = (k) => [...stato.viste].find(([f]) => stessaChiave(chiaveDaFile(f), k))?.[1] ?? null;
    // conducente incapace (§5.6): a 0 PV o Svenuto nella sua scheda
    const incapace = (k) => { const v = vistaDi(k); return Boolean(v?.completa && (v.pv.attuali <= 0 || v.stati.some((x) => /svenut/i.test(x.nome)))); };
    const ctxV = { dati: ctx.dati, ui: stato.uiVeicoli, azioni: { ridisegna: disegna } };
    const scrivi = (prima) => async (dopo, messaggio) => {
      try {
        const { record, conflitti } = await aggiornaVeicolo(prima, dopo);
        stato.veicoli = stato.veicoli.map((x) => (x.id === record.id ? record : x));
        if (conflitti.length) avviso(`${record.mezzo.nome}: ${conflitti.join(', ')} cambiati anche altrove, resta il valore del registro.`);
        else if (messaggio) avviso(messaggio);
      } catch (e) { avvisoErrore(`Veicolo non salvato: ${e.message}`); }
      disegna();
    };
    const t = stato.scontro ? diTurno(stato.scontro) : null;
    return conPezzo(cartaVeicoloPlancia(ctxV, rec, { scontro: stato.scontro, diTurno: t, persone: [...persone.values()], incapace, scrivi: scrivi(rec) }), `veicolo:${rec.id}`);
  };
  const sezioneVeicoli = () => {
    if (!stato.veicoli.length) return null;
    return [h('h2', { class: 'plancia-sezione' }, 'Veicoli'),
      h('p', { class: 'nota' }, 'Scheda unica dei veicoli (veicoli/, A.91 e A.105): le stesse modifiche le vedono le schede dei PG. Permessi e nomi provvisori (A.113).'),
      h('div', { class: 'plancia-griglia' }, stato.veicoli.map(cartaVeicolo))];
  };
  const aggiornaVeicoli = async () => {
    const lista = await elencoVeicoli();
    const firma = JSON.stringify(lista.map((x) => [x.id, x.revisione]));
    if (firma === stato.firmaVeicoli) return false;
    stato.firmaVeicoli = firma;
    stato.veicoli = lista;
    return true;
  };
  const nemiciInScontro = () => (stato.scontro?.partecipanti ?? []).filter((p) => p.tipo === 'nemico');
  // nella plancia i nemici a 0 PV vanno in fondo, dopo tutti gli altri (l'ordine dei turni non cambia)
  const nemiciInCarta = () => [...nemiciInScontro().filter((p) => p.pv.attuali > 0), ...nemiciInScontro().filter((p) => p.pv.attuali === 0)];

  // bestiario: si rilegge a ogni giro, si rivalida solo se un file è cambiato (nome e mtime)
  const aggiornaBestiario = async () => {
    const lista = await elencoNemici();
    const firma = JSON.stringify(lista.map((x) => [x.file, x.mtime]));
    if (firma === stato.firmaBestiario) return false;
    stato.firmaBestiario = firma;
    stato.bestiario = vociBestiario(lista, ctx.dati);
    return true;
  };

  const turnoDi = (r) => {
    const t = stato.scontro ? diTurno(stato.scontro) : null;
    return !!t && t.tipo === 'pg' && t.chiave === chiaveDaFile(r.file);
  };

  // rilegge l'elenco e i file cambiati dei personaggi al tavolo (confronto sull'mtime)
  const visti = new Map(); // file → mtime letto
  const aggiorna = async (forza = false) => {
    const [elenco, selezione] = await Promise.all([elencoCartella(), forza ? Promise.resolve(stato.selezione) : leggiSelezione()]);
    if (!stato.attivo) return;
    if (!elenco) { stato.errore = 'cartella personaggi/ non leggibile: il server è acceso?'; aggiornaIndicatore(); return; }
    stato.errore = null;
    stato.elenco = elenco;
    stato.selezione = selezione;
    const ultimi = ultimiPerPersonaggio(elenco);
    let cambiato = forza;
    // carta sola di un PG (pannello della mappa): il suo file si legge anche se non è «al tavolo»
    const pgSolo = /^partecipante:pg:(.+)$/.exec(ctx.soloCarta?.() ?? '')?.[1];
    const daLeggere = [...selezione, ...(pgSolo ? [...ultimi.keys()].filter((k) => stessaChiave(k, pgSolo) && !selezione.includes(k)) : [])];
    for (const k of daLeggere) {
      const r = ultimi.get(k);
      if (!r || visti.get(r.file) === r.mtime) continue;
      try {
        const testo = await leggiCartella(r.file);
        stato.testi.set(r.file, testo);
        stato.viste.set(r.file, vistaAlRound(r.file, testo));
        stato.errori.delete(r.file);
      } catch (e) {
        stato.errori.set(r.file, e.message);
      }
      visti.set(r.file, r.mtime);
      cambiato = true;
    }
    try {
      if (await aggiornaBestiario()) cambiato = true;
    } catch (e) {
      stato.errore = e.message;
    }
    try {
      if (await aggiornaVeicoli()) cambiato = true;
    } catch (e) {
      stato.errore = e.message;
    }
    // scontro aperto: si rilegge quando cambia la revisione (un'altra finestra, un altro PC)
    try {
      const aperto = await leggiScontroAperto();
      if (!aperto && stato.scontro) { stato.scontro = null; cambiato = true; }
      if (aperto && (aperto.id !== stato.scontro?.id || aperto.revisione !== stato.scontro?.revisione)) {
        stato.scontro = await leggiScontro(aperto.id);
        cambiato = true;
      }
    } catch (e) {
      stato.errore = e.message;
    }
    if (!stato.attivo) return;
    stato.ultimo = Date.now();
    if ((cambiato || stato.sceltaAperta) && custode.puoRidisegnare()) disegna();
    else aggiornaIndicatore();
    // anche quando il Round lo fa avanzare un'altra finestra della plancia (§5.18: una volta per Round)
    void applicaPeriodici();
  };
  const aggiornaIndicatore = () => {
    const el = radice.querySelector('.plancia-aggiornato');
    if (el) el.textContent = stato.errore ?? testoAggiornato(stato.ultimo);
  };

  disegna();
  leggiRete().then((r) => { stato.rete = r; if (custode.puoRidisegnare()) disegna(); });
  // tornando da una scheda («← Torna al tavolo»): lo stesso punto di prima, a plancia completa
  aggiorna().then(() => { disegna(); if (Number.isFinite(ctx.scorrimento)) window.scrollTo(0, ctx.scorrimento); });
  const giro = setInterval(() => aggiorna(), INTERVALLO_MS);
  const orologio = setInterval(aggiornaIndicatore, 1000);
  const ferma = () => { stato.attivo = false; clearInterval(giro); clearInterval(orologio); custode.smonta(); };
  // la mappa ridisegna la carta sola quando cambia il token scelto
  ferma.ridisegna = () => disegna();
  // lotto 6: un solo «Avanti» per mappa, plancia e vista giocatori: la barra dell'Iniziativa usa questo, con la stessa
  // coda delle modifiche e la stessa revisione dello scontro
  // prima si rilegge lo scontro (un movimento «Libero» della mappa può averne cambiato la revisione)
  ferma.avanti = async () => { await aggiorna(); return modifica((x) => avanti(x)); };
  ferma.aggiorna = () => aggiorna();
  // ZoC della mappa (07/10): «Attacca!» dell'avversario con il bersaglio già scelto, dall'avviso dell'Attacco di
  // Opportunità; false se non si può (PG: l'attacco si fa dalla sua scheda; nessun attacco nel profilo)
  ferma.attaccaContro = (idDa, idContro) => {
    const p = (stato.scontro?.partecipanti ?? []).find((x) => x.id === idDa);
    if (!p || p.tipo === 'pg' || !attacchiDi(p).length) return false;
    const ultimi = ultimiPerPersonaggio(stato.elenco);
    const alTavolo = stato.selezione.map((k) => ultimi.get(k) ?? { mancante: k });
    const bersagli = bersagliPer(p, alTavolo);
    bersagli.sort((a, b) => (b.id === idContro) - (a.id === idContro));
    apriAttaccoNemico(ctx, p, { bersagli, registra: (a) => modifica((x) => registraAttacco(x, a)) });
    return true;
  };
  ferma.puoAttaccare = (idDa) => { const p = (stato.scontro?.partecipanti ?? []).find((x) => x.id === idDa); return !!p && p.tipo !== 'pg' && attacchiDi(p).length > 0; };
  return ferma;
}

function testoAggiornato(ms) {
  if (!ms) return 'lettura della cartella…';
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return `aggiornato ${s} s fa`;
}

/** Elenco dei personaggi della cartella con la casella «al tavolo». */
function sceltaAlTavolo(stato, ultimi, salva) {
  const scelti = new Set(stato.selezione);
  const nomi = [...ultimi.keys()].sort((a, b) => a.localeCompare(b, 'it'));
  // file di personaggi diversi con nomi che si confondono (bug del 04/10/2026): su Windows «Lucas» e «LUCAS» possono
  // finire nello stesso file; i PG nuovi prendono un suffisso, quelli di prima vanno controllati a mano
  const confusi = nomiCheSiConfondono(stato.elenco);
  return h('section', { class: 'riquadro plancia-scelta', 'aria-label': 'Chi è al tavolo' },
    h('h2', {}, 'Chi è al tavolo'),
    confusi.length ? h('div', { class: 'riquadro attenzione' }, confusi.map((c) => h('p', {},
      h('strong', {}, `Da controllare: ${c.nomi.map((x) => x.replace(/-/g, ' ')).join(' e ')}`),
      ` — ${c.motivo}. Su Windows i loro file possono finire nello stesso file: apri ciascuno e controlla che siano personaggi diversi. I PG nuovi prendono un nome di file con un suffisso («-2»).`))) : null,
    nomi.length ? h('ul', { class: 'plancia-scelta-elenco' }, nomi.map((k) => h('li', {},
      h('label', {}, h('input', {
        type: 'checkbox', checked: scelti.has(k),
        onchange: (e) => salva(e.target.checked ? [...stato.selezione, k] : stato.selezione.filter((x) => x !== k)),
      }), ` ${k.replace(/-/g, ' ')} `, h('small', { class: 'nota' }, ultimi.get(k).file)))))
      : h('p', { class: 'vuoto' }, 'La cartella personaggi/ è vuota: i personaggi ci arrivano salvandoli nell’app con il server acceso, o copiando i file.'));
}

const barra = (classe, etichetta, attuale, massimo) => h('div', { class: `plancia-barra ${classe}` },
  h('span', { class: 'barra-etichetta' }, etichetta),
  h('span', { class: 'barra-traccia', role: 'meter', 'aria-label': etichetta, 'aria-valuemin': 0, 'aria-valuemax': massimo, 'aria-valuenow': attuale },
    h('span', { class: 'barra-riempimento', style: `width: ${riempimento(attuale, massimo)}%` })),
  h('span', { class: 'barra-numero' }, `${attuale} / ${massimo}`));

const pillola = (titolo, valore, provenienza, classe = '') => (provenienza
  ? infoValore(h('strong', {}, numero(valore)), { titolo: `${titolo}: ${numero(valore)}`, provenienza }, { classe: `pillola-plancia ${classe}`.trim() })
  : h('strong', { class: `pillola-plancia ${classe}`.trim() }, numero(valore)));

/** Scheda compatta di un PG: risorse, AR e Difese, condizioni, Stati, armi in mano; evidenziata se è di turno. */
function cartaPg(ctx, v, r, diTurnoOra = false, colpito = null, durate = []) {
  const apri = () => ctx.azioni.apri(r);
  const condizioni = [
    v.ferite?.grado ? `Ferita ${v.ferite.nome}` : null,
    v.affaticamento?.grado ? v.affaticamento.nome : null,
    v.corruzione?.grado ? v.corruzione.nome : null,
  ].filter(Boolean);
  const arPrincipale = v.ar?.valori.find((x) => x.principale) ?? v.ar?.valori[0] ?? null;
  return h('article', { class: `carta-plancia${diTurnoOra ? ' di-turno' : ''}`, 'aria-label': diTurnoOra ? `${v.nome}, di turno` : v.nome },
    h('header', { class: 'carta-plancia-testa' },
      v.ritratto ? h('img', { class: 'ritratto-plancia', src: v.ritratto, alt: '' }) : null,
      h('div', {},
        h('h2', {}, h('button', { type: 'button', class: 'btn-link nome-plancia', title: `Apri ${v.nome} (le modifiche si fanno nella sua scheda)`, onclick: apri }, v.nome)),
        h('p', { class: 'nota' }, `${v.livello}° livello · ${v.completa ? [v.corporazione, v.classi.map((c) => `${c.nome} ${c.grado}`).join(', ')].filter(Boolean).join(' · ') : 'scheda incompleta'}`)),
      v.completa && colpito && ctx.scontroAperto?.() ? pulsanteColpito(ctx, () => colpito(v, r)) : null),
    v.completa ? [
      barra('risorsa-pv', 'PV', v.pv.attuali, v.pv.massimo),
      v.pm ? barra('risorsa-pm', 'PM', v.pm.attuali, v.pm.massimo) : null,
      barra('risorsa-pe', 'PE', v.pe.attuali, v.pe.massimo),
      h('p', { class: 'plancia-valori' },
        arPrincipale ? h('span', {}, 'AR ', pillola('AR', arPrincipale.valore, arPrincipale.provenienza, 'pillola-ar'),
          ...v.ar.valori.filter((x) => x !== arPrincipale).map((x) => h('small', { class: 'nota' }, ' · ', x.etichetta, ' ', pillola(`AR ${x.etichetta}`, x.valore, x.provenienza)))) : null,
        v.difese ? h('span', {}, ' · Difese ', pillola('Difese', v.difese.valore, v.difese.provenienza)) : null),
      h('p', { class: 'plancia-condizioni' }, condizioni.length ? condizioni.map((c) => h('span', { class: 'etichetta condizione-plancia' }, c)) : h('span', { class: 'nota' }, 'Nessuna Ferita, Affaticamento o Corruzione')),
      v.stati.length ? h('p', { class: 'plancia-stati' }, v.stati.map((s) => {
        const d = durate.find((x) => x.tipo === 'stato' && x.nome === s.nome);
        return h('span', { class: 'etichetta stato-plancia', title: d ? `fino alla fine del Round ${d.al}` : null }, d ? `${s.nome} · ${d.rimasti} Round` : s.nome);
      })) : null,
      // modificatori temporanei e circostanze segnati nella scheda (src/temporanei.js, src/circostanze.js)
      v.modificatori?.length ? h('p', { class: 'plancia-modificatori' }, h('small', { class: 'nota' }, 'Modificatori: '), v.modificatori.map((x) => h('span', { class: 'etichetta' }, x))) : null,
      // durate di Tecniche e incantesimi attivati dalla scheda, incantesimi subiti, con i Round che restano (src/round-scontro.js)
      rigaDurate(durate, 'tecnica', 'Tecniche in corso'),
      rigaDurate(durate, 'incantesimo', 'Incantesimi in corso'),
      rigaDurate(durate, 'subito', 'Su di lui'),
      v.armi.length ? h('ul', { class: 'plancia-armi' }, v.armi.map((a) => h('li', {},
        h('span', {}, a.moduloDi ? `↳ ${a.nome}` : a.nome, a.rotta ? h('small', { class: 'motivo' }, ' (Rotta)') : null),
        h('span', {}, ' VA ', pillola(`VA ${a.nome}`, a.va, a.provenienza), ' · danno ',
          a.provenienzaDanno ? infoValore(h('strong', {}, a.danno), { titolo: `Danno ${a.nome}: ${a.danno}`, provenienza: a.provenienzaDanno }) : h('strong', {}, a.danno)))))
        : h('p', { class: 'nota' }, 'Nessuna arma in mano.'),
    ] : h('p', { class: 'nota' }, 'Il personaggio non ha ancora Corporazione, Addestramento e Classe.'));
}

/** «Colpito» (pezzo 4): serve uno scontro aperto, dove il colpo si registra e si può annullare. */
export function pulsanteColpito(ctx, apri) {
  return h('button', { type: 'button', class: 'btn btn-piccolo btn-colpito', onclick: apri }, 'Colpito');
}

function cartaMancante(k) {
  return h('article', { class: 'carta-plancia mancante' }, h('h2', {}, k.replace(/-/g, ' ')),
    h('p', { class: 'nota' }, 'Nessun file in personaggi/ con questo nome: è stato tolto o rinominato.'));
}

function cartaErrore(r, motivo) {
  return h('article', { class: 'carta-plancia mancante' }, h('h2', {}, chiaveDaFile(r.file).replace(/-/g, ' ')),
    h('p', { class: 'nota' }, motivo ? `File ${r.file} non leggibile: ${motivo}` : 'Lettura in corso…'));
}

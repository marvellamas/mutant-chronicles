// Tavolo del Master, pezzo 1 (docs/tavolo-direttore.md): la plancia dei PG in sola lettura, rotta
// #/tavolo, solo con il server della cartella (server.mjs). Il master sceglie quali personaggi di
// personaggi/ sono «al tavolo» (selezione salvata sul server, tavolo/sessione.json); per ognuno conta il
// file più recente. Le schede si rileggono ogni pochi secondi, solo se il file è cambiato; i valori e
// le provenienze sono quelli di calcolaScheda (src/tavolo.js → vistaPlancia).
import { h, svuota } from './dom.js';
import { infoValore, nascondiTooltip } from './tooltip.js';
import { iconaPagina } from './immagini.js';
import { riempimento } from '../interfaccia.js';
import { vistaPlancia, testoConSessione, pgDaAggiungere } from '../tavolo.js';
import { ultimiPerPersonaggio, chiaveDaFile } from '../cartella.js';
import { elencoCartella, leggiCartella, leggiCartellaConRevisione, scriviCartella, creaInCartella } from './cartella.js';
import { apriColpo } from './colpo.js';
import { testoColpo } from '../danno.js';
import { pannelloScontro, leggiScontroAperto, leggiScontro, salvaScontro } from './scontro.js';
import { pannelloBestiario, elencoNemici, cartaNemico } from './nemici.js';
import { diTurno, registraColpo, annullaUltimoColpo } from '../scontro.js';
import { vociBestiario } from '../nemici.js';

const INTERVALLO_MS = 3000;
const numero = (n) => (n < 0 ? `−${-n}` : String(n));

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
 * @param ctx { dati, azioni: { personaggi(), apri(remoto) } }
 * @returns {() => void} ferma l'aggiornamento (uscendo dalla plancia)
 */
export function renderTavolo(radice, ctx) {
  const stato = {
    elenco: [], // file della cartella (server)
    selezione: [], // nomi «al tavolo»
    viste: new Map(), // file → vista calcolata
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
  };

  // salva una modifica dello scontro; con una revisione vecchia (altra finestra) ricarica quello attuale
  const salva = async (nuovo) => {
    try {
      const r = await salvaScontro(nuovo);
      if (r.conflitto !== undefined) {
        stato.scontro = r.conflitto?.stato === 'aperto' ? r.conflitto : null;
        stato.avvisoScontro = 'Lo scontro è stato cambiato in un’altra finestra: ho ricaricato lo stato attuale. Ripeti l’ultima azione se serve ancora.';
      } else {
        stato.avvisoScontro = r.scontro.stato === 'chiuso' ? `«${r.scontro.nome}» chiuso e archiviato in scontri/archivio/.` : null;
        stato.scontro = r.scontro.stato === 'aperto' ? r.scontro : null;
      }
      disegna();
      return r.conflitto === undefined;
    } catch (e) {
      stato.avvisoScontro = `Scontro non salvato: ${e.message}`;
      disegna();
      return false;
    }
  };
  // le modifiche si mettono in fila: ognuna parte dallo scontro salvato dalla precedente (clic rapidi su − e +)
  let coda = Promise.resolve(true);
  const modifica = (fn) => {
    coda = coda.then(async () => {
      if (!stato.scontro) return false;
      let nuovo;
      try { nuovo = fn(stato.scontro); } catch (e) { stato.avvisoScontro = e.message; disegna(); return false; }
      if (nuovo === stato.scontro) return true;
      return salva(nuovo);
    });
    return coda;
  };

  const disegna = () => {
    if (!stato.attivo) return;
    nascondiTooltip();
    const ultimi = ultimiPerPersonaggio(stato.elenco);
    const alTavolo = stato.selezione.map((k) => ultimi.get(k) ?? { mancante: k });
    svuota(radice, h('section', { class: 'plancia' },
      h('header', { class: 'plancia-testa' },
        h('h1', { class: 'titolo-con-stemma' }, iconaPagina('combattimento', '96', { classe: 'badge-pagina', lato: 40 }), 'Tavolo del Master'),
        h('div', { class: 'riga-azioni' },
          h('span', { class: 'nota plancia-aggiornato', 'aria-live': 'polite' }, stato.errore ?? testoAggiornato(stato.ultimo)),
          h('button', { type: 'button', class: `btn${stato.sceltaAperta ? ' primario' : ''}`, 'aria-expanded': String(stato.sceltaAperta), onclick: () => { stato.sceltaAperta = !stato.sceltaAperta; disegna(); } }, 'Chi è al tavolo'),
          h('button', { type: 'button', class: 'btn', title: 'Sceglie uno o più file JSON di «SALVA PG», li controlla come «Importa», li scrive in personaggi/ senza mai sovrascrivere e li mette al tavolo', onclick: () => sceltaFile.click() }, 'Aggiungi PG al tavolo'),
          sceltaFile,
          h('button', { type: 'button', class: 'btn', title: 'Copia i personaggi e i nemici d’esempio del repo (esempi/) nelle cartelle del server; non sovrascrive mai un file già presente', onclick: caricaEsempi }, 'Carica esempi'),
          h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.personaggi() }, 'Personaggi'))),
      stato.esitoEsempi ? h('p', { class: 'riquadro attenzione', role: 'status' }, stato.esitoEsempi) : null,
      h('p', { class: 'nota' }, 'Sola lettura: i valori sono quelli delle schede in personaggi/, ricalcolati con le regole attuali. Per cambiarli si apre il personaggio (clic sulla carta).'),
      stato.sceltaAperta ? sceltaAlTavolo(stato, ultimi, async (nuova) => {
        try { stato.selezione = await scriviSelezione(nuova); } catch (e) { alert(`Selezione non salvata: ${e.message}`); }
        await aggiorna(true);
      }) : null,
      pannelloScontro(ctx, Object.assign(stato, { pgAlTavolo: alTavolo.map((r) => stato.viste.get(r.file)).filter((v) => v?.completa) }),
        { modifica, crea: (s) => salva(s), ridisegna: disegna, annullaColpo }),
      alTavolo.length
        ? h('div', { class: 'plancia-griglia' }, alTavolo.map((r) => (r.mancante ? cartaMancante(r.mancante)
          : stato.viste.get(r.file) ? cartaPg(ctx, stato.viste.get(r.file), r, turnoDi(r), colpitoPg) : cartaErrore(r, stato.errori.get(r.file)))))
        : h('p', { class: 'vuoto' }, 'Nessun personaggio al tavolo: sceglili con «Chi è al tavolo».'),
      nemiciInScontro().length ? [
        h('h2', { class: 'plancia-sezione' }, 'Nemici nello scontro'),
        h('div', { class: 'plancia-griglia' }, nemiciInScontro().map((p) => cartaNemico(ctx, p, { modifica, diTurnoOra: diTurno(stato.scontro)?.id === p.id, onColpito: () => colpitoNemico(p) }))),
      ] : null,
      pannelloBestiario(ctx, stato.bestiario, {
        aperto: stato.bestiarioAperto,
        onToggle: (v) => { stato.bestiarioAperto = v; },
        salvato: async () => { stato.firmaBestiario = null; await aggiornaBestiario(); disegna(); },
      })));
  };
  // «Carica esempi»: copia esempi/ nelle cartelle del server senza sovrascrivere (server.mjs → /api/esempi)
  const caricaEsempi = async () => {
    try {
      const r = await fetch('api/esempi', { method: 'POST' });
      if (!r.ok) throw new Error(`errore ${r.status}`);
      const { copiati, saltati } = await r.json();
      stato.esitoEsempi = `Esempi: ${copiati.length ? `copiati ${copiati.join(', ')}` : 'nessun file nuovo'}${saltati.length ? `; saltati perché già presenti (non sovrascritti): ${saltati.join(', ')}` : ''}. I personaggi si mettono al tavolo con «Chi è al tavolo».`;
    } catch (e) {
      stato.esitoEsempi = `Esempi non caricati: ${e.message}`;
    }
    stato.firmaBestiario = null;
    await aggiorna(true);
  };
  // Pezzo 4: «Colpito» (src/danno.js → applicaColpo, finestra src/ui/colpo.js). Serve uno scontro aperto:
  // il colpo va nel registro e si può annullare. Il PG si scrive nel suo file con la revisione (mtime).
  const statiValidi = (ids, immuni = []) => ids.filter((id) => !immuni.includes(id));
  const colpitoPg = (v, r) => {
    if (!stato.scontro) return;
    const bersaglio = { nome: v.nome, pv: v.pv, ferite: v.ferite.grado, ar: v.ar };
    apriColpo(ctx, bersaglio, {
      applica: async (ris, colpo, stati) => {
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
        const ok = await modifica((x) => registraColpo(x, { bersaglio: `pg:${v.chiaveCartella}`, nome: v.nome, tipo: 'pg', file: r.file, testo: testoColpo(v.nome, colpo, ris), prima, dopo }));
        await aggiorna(true);
        return ok;
      },
    });
  };
  const colpitoNemico = (p) => {
    if (!stato.scontro) return;
    const bersaglio = { nome: p.nome, pv: p.pv, ferite: null, ar: p.scheda.ar };
    apriColpo(ctx, bersaglio, {
      applica: async (ris, colpo, stati) => modifica((x) => {
        const q = x.partecipanti.find((y) => y.id === p.id);
        if (!q || q.pv.attuali !== p.pv.attuali) throw new Error(`${p.nome} è cambiato nel frattempo: chiudi e riapri «Colpito».`);
        const dopoStati = [...new Set([...q.stati, ...statiValidi(stati, q.scheda?.immunita ?? [])])];
        return registraColpo(x, { bersaglio: p.id, nome: p.nome, tipo: 'nemico', testo: testoColpo(p.nome, colpo, ris), prima: { pv: q.pv.attuali, stati: q.stati }, dopo: { pv: ris.pv.dopo, stati: dopoStati } });
      }),
    });
  };
  // «Annulla ultimo colpo»: per un PG si rimettono nel file PV, Ferite e Stati di prima (con la revisione)
  const annullaColpo = async () => {
    let esito;
    try { esito = annullaUltimoColpo(stato.scontro); } catch (e) { stato.avvisoScontro = e.message; disegna(); return; }
    const { colpo } = esito;
    if (colpo.tipo === 'pg' && colpo.file) {
      try {
        const { testo, mtime } = await leggiCartellaConRevisione(colpo.file);
        const ora = vistaPlancia(testo, ctx.dati, colpo.file);
        if (ora.pv.attuali !== colpo.dopo.pv || ora.ferite.grado !== colpo.dopo.ferite) {
          stato.avvisoScontro = `${colpo.nome} è cambiato dopo il colpo (PV ${ora.pv.attuali}): annullamento non fatto, correggi dalla sua scheda.`;
          disegna();
          return;
        }
        await scriviCartella(colpo.file, testoConSessione(testo, { pvAttuali: colpo.prima.pv, ferite: colpo.prima.ferite, statiAttivi: colpo.prima.stati }, ctx.dati), { mtime });
      } catch (e) {
        stato.avvisoScontro = `Annullamento non fatto: ${e.message}`;
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
  const nemiciInScontro = () => (stato.scontro?.partecipanti ?? []).filter((p) => p.tipo === 'nemico');

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
    for (const k of selezione) {
      const r = ultimi.get(k);
      if (!r || visti.get(r.file) === r.mtime) continue;
      try {
        stato.viste.set(r.file, vistaPlancia(await leggiCartella(r.file), ctx.dati, r.file));
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
    if (cambiato || stato.sceltaAperta) disegna();
    else aggiornaIndicatore();
  };
  const aggiornaIndicatore = () => {
    const el = radice.querySelector('.plancia-aggiornato');
    if (el) el.textContent = stato.errore ?? testoAggiornato(stato.ultimo);
  };

  disegna();
  // tornando da una scheda («← Torna al tavolo»): lo stesso punto di prima, a plancia completa
  aggiorna().then(() => { disegna(); if (Number.isFinite(ctx.scorrimento)) window.scrollTo(0, ctx.scorrimento); });
  const giro = setInterval(() => aggiorna(), INTERVALLO_MS);
  const orologio = setInterval(aggiornaIndicatore, 1000);
  return () => { stato.attivo = false; clearInterval(giro); clearInterval(orologio); };
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
  return h('section', { class: 'riquadro plancia-scelta', 'aria-label': 'Chi è al tavolo' },
    h('h2', {}, 'Chi è al tavolo'),
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
function cartaPg(ctx, v, r, diTurnoOra = false, colpito = null) {
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
      v.stati.length ? h('p', { class: 'plancia-stati' }, v.stati.map((s) => h('span', { class: 'etichetta stato-plancia' }, s.nome))) : null,
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

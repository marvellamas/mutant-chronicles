// Tavolo del Master, pezzo 1 (docs/tavolo-direttore.md): la plancia dei PG in sola lettura, rotta
// #/tavolo, solo con il server della cartella (server.mjs). Il master sceglie quali personaggi di
// personaggi/ sono «al tavolo» (selezione salvata sul server, tavolo/sessione.json); per ognuno conta il
// file più recente. Le schede si rileggono ogni pochi secondi, solo se il file è cambiato; i valori e
// le provenienze sono quelli di calcolaScheda (src/tavolo.js → vistaPlancia).
import { h, svuota } from './dom.js';
import { infoValore, nascondiTooltip } from './tooltip.js';
import { iconaPagina } from './immagini.js';
import { riempimento } from '../interfaccia.js';
import { vistaPlancia } from '../tavolo.js';
import { ultimiPerPersonaggio, chiaveDaFile } from '../cartella.js';
import { elencoCartella, leggiCartella } from './cartella.js';
import { pannelloScontro, leggiScontroAperto, leggiScontro, salvaScontro } from './scontro.js';
import { pannelloBestiario, elencoNemici, cartaNemico } from './nemici.js';
import { diTurno } from '../scontro.js';
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
          h('button', { type: 'button', class: 'btn', onclick: () => ctx.azioni.personaggi() }, 'Personaggi'))),
      h('p', { class: 'nota' }, 'Sola lettura: i valori sono quelli delle schede in personaggi/, ricalcolati con le regole attuali. Per cambiarli si apre il personaggio (clic sulla carta).'),
      stato.sceltaAperta ? sceltaAlTavolo(stato, ultimi, async (nuova) => {
        try { stato.selezione = await scriviSelezione(nuova); } catch (e) { alert(`Selezione non salvata: ${e.message}`); }
        await aggiorna(true);
      }) : null,
      pannelloScontro(ctx, Object.assign(stato, { pgAlTavolo: alTavolo.map((r) => stato.viste.get(r.file)).filter((v) => v?.completa) }),
        { modifica, crea: (s) => salva(s), ridisegna: disegna }),
      alTavolo.length
        ? h('div', { class: 'plancia-griglia' }, alTavolo.map((r) => (r.mancante ? cartaMancante(r.mancante)
          : stato.viste.get(r.file) ? cartaPg(ctx, stato.viste.get(r.file), r, turnoDi(r)) : cartaErrore(r, stato.errori.get(r.file)))))
        : h('p', { class: 'vuoto' }, 'Nessun personaggio al tavolo: sceglili con «Chi è al tavolo».'),
      nemiciInScontro().length ? [
        h('h2', { class: 'plancia-sezione' }, 'Nemici nello scontro'),
        h('div', { class: 'plancia-griglia' }, nemiciInScontro().map((p) => cartaNemico(ctx, p, { modifica, diTurnoOra: diTurno(stato.scontro)?.id === p.id }))),
      ] : null,
      pannelloBestiario(ctx, stato.bestiario, {
        aperto: stato.bestiarioAperto,
        onToggle: (v) => { stato.bestiarioAperto = v; },
        salvato: async () => { stato.firmaBestiario = null; await aggiornaBestiario(); disegna(); },
      })));
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
  aggiorna().then(disegna);
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
function cartaPg(ctx, v, r, diTurnoOra = false) {
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
        h('p', { class: 'nota' }, `${v.livello}° livello · ${v.completa ? [v.corporazione, v.classi.map((c) => `${c.nome} ${c.grado}`).join(', ')].filter(Boolean).join(' · ') : 'scheda incompleta'}`))),
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

function cartaMancante(k) {
  return h('article', { class: 'carta-plancia mancante' }, h('h2', {}, k.replace(/-/g, ' ')),
    h('p', { class: 'nota' }, 'Nessun file in personaggi/ con questo nome: è stato tolto o rinominato.'));
}

function cartaErrore(r, motivo) {
  return h('article', { class: 'carta-plancia mancante' }, h('h2', {}, chiaveDaFile(r.file).replace(/-/g, ' ')),
    h('p', { class: 'nota' }, motivo ? `File ${r.file} non leggibile: ${motivo}` : 'Lettura in corso…'));
}

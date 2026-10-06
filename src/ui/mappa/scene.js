// Mappa di battaglia, lotto 2 (docs/battlemap/piano.md): elenco delle scene nella plancia del Tavolo del Master, con
// «Nuova scena», «Apri», «Rinomina», «Duplica» e «Archivia». Non si cancella mai: «Archivia» sposta il file in
// scene/archivio/ sul server. Ogni scrittura porta la revisione: se la scena è cambiata altrove, si avvisa e si rilegge.
import { h } from '../dom.js';
import { avviso, avvisoErrore } from '../avvisi.js';
import { nuovaScena, idScena, duplicaScena } from '../../mappa/scena.js';
import { elencoScene, leggiScena, salvaScena } from './api.js';

const ID_PANNELLO = 'plancia-scene-mappa';

/**
 * Stato del pannello dentro lo stato della plancia: { aperto, elenco: [...] | null, errore, occupato }.
 * `ridisegna` ridisegna la plancia; `apri(id)` va alla pagina della scena.
 */
export function statoScene() {
  return { aperto: false, elenco: null, errore: null, occupato: false };
}

async function ricarica(st, ridisegna) {
  try {
    st.elenco = await elencoScene();
    st.errore = null;
  } catch (e) {
    st.errore = `Scene non lette: ${e.message}`;
  }
  ridisegna();
}

/** Voce «Mappa» della testata della plancia: apre l'elenco delle scene e ci porta lo sguardo. */
export function apriElencoScene(st, ridisegna) {
  st.aperto = true;
  ridisegna();
  document.getElementById(ID_PANNELLO)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return ricarica(st, ridisegna);
}

/** Un'operazione alla volta, con l'esito negli avvisi e l'elenco riletto alla fine. */
async function operazione(st, ridisegna, fn) {
  if (st.occupato) return;
  st.occupato = true;
  ridisegna();
  try {
    await fn();
  } catch (e) {
    avvisoErrore(e.message);
  } finally {
    st.occupato = false;
    await ricarica(st, ridisegna);
  }
}

/** Salva; se la scena è stata cambiata altrove avvisa e non riprova (l'elenco si rilegge comunque). */
async function salvaOAvvisa(s, cosa) {
  const esito = await salvaScena(s);
  if (esito.conflitto) {
    avvisoErrore(`${cosa}: la scena «${esito.attuale?.nome ?? s.nome}» è stata cambiata in un’altra finestra. Riprova sull’elenco aggiornato.`);
    return null;
  }
  return esito.scena;
}

const chiediNome = (testo, attuale) => {
  const n = prompt(testo, attuale)?.trim();
  return n ? n.slice(0, 120) : null;
};

export function pannelloScene(ctx, st, { ridisegna, apri }) {
  const azioni = {
    nuova: () => {
      const nome = chiediNome('Nome della nuova scena (per esempio «Cripta di Mishima»):', '');
      if (!nome) return;
      operazione(st, ridisegna, async () => {
        const s = await salvaOAvvisa(nuovaScena({ id: idScena(nome), nome, dati: ctx.dati }), 'Nuova scena');
        if (s) { avviso(`Scena creata: ${s.nome}.`); apri(s.id); }
      });
    },
    rinomina: (v) => {
      const nome = chiediNome('Nuovo nome della scena:', v.nome);
      if (!nome || nome === v.nome) return;
      operazione(st, ridisegna, async () => {
        const s = await salvaOAvvisa({ ...(await leggiScena(v.id)), nome }, 'Rinomina');
        if (s) avviso(`Scena rinominata: ${s.nome}.`);
      });
    },
    duplica: (v) => {
      const nome = chiediNome('Nome della copia:', `${v.nome} (copia)`);
      if (!nome) return;
      operazione(st, ridisegna, async () => {
        const s = await salvaOAvvisa(duplicaScena(await leggiScena(v.id), { id: idScena(nome), nome }), 'Duplica');
        if (s) avviso(`Scena duplicata: ${s.nome}.`);
      });
    },
    archivia: (v) => {
      if (!confirm(`Archiviare «${v.nome}»? Esce dall’elenco ma non si cancella: il file passa in scene/archivio/ sul PC del master.`)) return;
      operazione(st, ridisegna, async () => {
        const s = await salvaOAvvisa({ ...(await leggiScena(v.id)), archiviata: true }, 'Archivia');
        if (s) avviso(`Scena archiviata: ${s.nome} (scene/archivio/).`);
      });
    },
  };
  const elenco = st.elenco ?? [];
  return h('details', {
    class: 'riquadro scene-mappa', id: ID_PANNELLO, open: st.aperto,
    ontoggle: (e) => {
      st.aperto = e.target.open;
      if (st.aperto && st.elenco === null) ricarica(st, ridisegna);
    },
  },
  h('summary', {}, h('strong', {}, 'Mappa di battaglia'), st.elenco ? ` (${elenco.length} scen${elenco.length === 1 ? 'a' : 'e'})` : ''),
  h('p', { class: 'nota' }, 'Scene della mappa, in scene/ sul server: immagine, griglia e, nei prossimi lotti, nebbia, muri e token. Le immagini stanno in mappe/.'),
  h('div', { class: 'riga-azioni' },
    h('button', { type: 'button', class: 'btn', disabled: st.occupato, onclick: azioni.nuova }, 'Nuova scena')),
  st.errore ? h('p', { class: 'riquadro attenzione', role: 'status' }, st.errore) : null,
  st.elenco === null ? h('p', { class: 'vuoto' }, 'Lettura delle scene…')
    : elenco.length ? h('ul', { class: 'scene-elenco' }, elenco.map((v) => h('li', {},
      h('button', { type: 'button', class: 'nome-scena', title: 'Apre la mappa di questa scena', onclick: () => apri(v.id) }, v.nome),
      h('small', { class: 'nota' }, ` ${v.colonne} × ${v.righe} Q · ${v.mappa ? 'con immagine' : 'senza immagine'} · rev. ${v.revisione}`),
      h('span', { class: 'scene-azioni' },
        h('button', { type: 'button', class: 'btn btn-piccolo primario', disabled: st.occupato, onclick: () => apri(v.id) }, 'Apri'),
        h('button', { type: 'button', class: 'btn btn-piccolo', disabled: st.occupato, onclick: () => azioni.rinomina(v) }, 'Rinomina'),
        h('button', { type: 'button', class: 'btn btn-piccolo', disabled: st.occupato, onclick: () => azioni.duplica(v) }, 'Duplica'),
        h('button', { type: 'button', class: 'btn btn-piccolo', disabled: st.occupato, title: 'Toglie la scena dall’elenco senza cancellarla (scene/archivio/)', onclick: () => azioni.archivia(v) }, 'Archivia')))))
      : h('p', { class: 'vuoto' }, 'Nessuna scena: «Nuova scena» ne crea una.'));
}

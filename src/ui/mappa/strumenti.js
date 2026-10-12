// Barra degli strumenti della mappa e pannello di quello che è selezionato (12/10/2026,
// docs/battlemap/ricognizione-editor-2026-10-12.md). Prima gli strumenti stavano dentro tre pannelli richiudibili,
// con tre pulsanti «Pennello» e tre «Rettangolo», e due righe accese insieme di cui una sola contava (D6).
// Adesso: una riga sola, sempre in vista, un solo strumento attivo e ben evidenziato; Esc torna a Seleziona.
import { h, svuota } from '../dom.js';
import { STRUMENTI } from '../../mappa/editor.js';

/**
 * La barra: un pulsante per strumento, più la casella «Aggancia alla griglia» (che conta per Muro e Seleziona).
 * @param o { attivo, aggancia, onStrumento(id), onAggancia(acceso) }
 * @returns { el, aggiorna({ strumento, aggancia }) }
 */
export function barraStrumenti({ attivo = 'seleziona', aggancia = true, onStrumento, onAggancia } = {}) {
  const bottoni = new Map();
  for (const s of STRUMENTI) {
    bottoni.set(s.id, h('button', {
      type: 'button', class: 'btn mappa-strumento', 'aria-pressed': String(s.id === attivo),
      title: `${s.nome} (${s.tasto}) — ${s.titolo}`, 'aria-label': s.nome,
      onclick: () => onStrumento?.(s.id),
    }, h('span', { class: 'mappa-strumento-icona', 'aria-hidden': 'true' }, s.icona), h('span', { class: 'mappa-strumento-nome' }, s.nome)));
  }
  const casella = h('input', { type: 'checkbox', checked: aggancia, onchange: (e) => onAggancia?.(e.target.checked) });
  const elAggancia = h('label', {
    class: 'mappa-aggancia',
    title: 'I vertici dei muri si mettono sugli incroci della griglia e sui punti medi delle sue linee, a qualunque spessore. Spenta, il muro è libero.',
  }, casella, 'Aggancia alla griglia');

  const el = h('div', { class: 'mappa-strumenti', role: 'toolbar', 'aria-label': 'Strumenti della mappa' },
    h('span', { class: 'mappa-strumenti-gruppo' }, [...bottoni.values()]), elAggancia);

  return {
    el,
    aggiorna({ strumento, aggancia: ag } = {}) {
      for (const [id, b] of bottoni) {
        const scelto = id === strumento;
        b.setAttribute('aria-pressed', String(scelto));
        b.classList.toggle('scelto', scelto);
      }
      if (ag !== undefined) casella.checked = !!ag;
      // l'aggancio conta solo dove si disegnano o si spostano i vertici
      const serve = strumento === 'muro' || strumento === 'seleziona';
      elAggancia.classList.toggle('spenta', !serve);
      casella.disabled = !serve;
    },
  };
}

/**
 * Il pannello «Selezione»: che cosa è selezionato, le sue proprietà e «Elimina».
 * @param o { onElimina(), onProprieta(chiave, valore), onDeseleziona() }
 * @returns { el, aggiorna(riassunto) } con il riassunto di src/mappa/editor.js → riassuntoSelezione
 */
export function pannelloSelezione({ onElimina, onProprieta, onDeseleziona } = {}) {
  const corpo = h('div', { class: 'mappa-selezione-corpo' });
  const el = h('div', { class: 'mappa-selezione', role: 'group', 'aria-label': 'Selezione' }, corpo);
  return {
    el,
    aggiorna(r) {
      if (!r || !r.quanti) {
        svuota(corpo, h('p', { class: 'nota' }, 'Niente selezionato. Con Seleziona: clic su un oggetto per prenderlo, Maiusc per più d’uno, trascina per spostarlo, Canc per cancellarlo.'));
        el.hidden = false;
        return;
      }
      const righe = [h('p', { class: 'mappa-selezione-titolo' }, r.testo)];
      for (const p of r.proprieta ?? []) {
        if (p.tipo === 'casella') {
          righe.push(h('label', { class: 'mappa-selezione-prop' },
            h('input', { type: 'checkbox', checked: !!p.valore, onchange: (e) => onProprieta?.(p.chiave, e.target.checked) }), p.etichetta));
        } else if (p.tipo === 'scelta') {
          righe.push(h('div', { class: 'mappa-selezione-prop' }, h('span', { class: 'mappa-selezione-etichetta' }, p.etichetta),
            h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': p.etichetta }, (p.valori ?? []).map((v) => h('button', {
              type: 'button', class: `btn btn-piccolo${v.valore === p.valore ? ' scelto' : ''}`, 'aria-pressed': String(v.valore === p.valore),
              onclick: () => onProprieta?.(p.chiave, v.valore),
            }, v.nome)))));
        } else {
          righe.push(h('p', { class: 'nota' }, `${p.etichetta}: ${p.valore}`));
        }
      }
      righe.push(h('div', { class: 'mappa-azioni-token' },
        h('button', { type: 'button', class: 'btn btn-piccolo pericolo', onclick: () => onElimina?.() }, 'Elimina (Canc)'),
        h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => onDeseleziona?.() }, 'Deseleziona (Esc)')));
      svuota(corpo, ...righe);
      el.hidden = false;
    },
  };
}

/**
 * La finestrella del token libero (12/10/2026, richiesta di Davide): nome, aspetto (iniziali con un colore, oppure
 * un'immagine della Galleria) e quanti quadretti occupa. Niente scheda, niente Iniziativa, niente regole.
 * @param o { titolo, valori, colori: [{ id, nome, valore }], immagini: [{ nome, file, url }], ingombri, apri }
 * @returns Promise del token, o null se annullata: { nome, colore, immagine, ingombro, blocca, nascosto }
 */
export function chiediTokenLibero({ titolo = 'Token libero', valori = {}, colori = [], immagini = [], ingombri = [1, 2, 3], apri }) {
  const stato = {
    nome: valori.nome ?? '',
    colore: valori.colore ?? colori[0]?.valore ?? '#8a2b1f',
    immagine: valori.immagine ?? null,
    ingombro: valori.ingombro ?? 1,
    blocca: !!valori.blocca,
    bersaglio: !!valori.bersaglio,
    nascosto: !!valori.nascosto,
  };
  return apri('token-libero', titolo, (fine) => {
    const campo = h('input', { type: 'text', value: stato.nome, maxlength: 60, 'aria-label': 'Nome', placeholder: 'Carro, Statua, Passante…' });
    const ok = () => { const v = campo.value.trim(); if (!v) { campo.focus(); return; } fine({ ...stato, nome: v }); };
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });

    const bottoniColore = colori.map((c) => h('button', {
      type: 'button', class: `campione${c.valore === stato.colore && !stato.immagine ? ' scelto' : ''}`, title: c.nome,
      onclick: (e) => { stato.colore = c.valore; stato.immagine = null; segna(e.currentTarget.parentElement, e.currentTarget); segnaImmagini(); },
    }, h('span', { class: 'campione-colore', style: `background: ${c.valore}`, 'aria-hidden': 'true' }), c.nome));

    const bottoniImmagine = immagini.map((im) => h('button', {
      type: 'button', class: `campione campione-immagine${im.file === stato.immagine ? ' scelto' : ''}`, title: im.nome,
      onclick: (e) => { stato.immagine = im.file; segna(e.currentTarget.parentElement, e.currentTarget); segnaColori(); },
    }, im.url ? h('img', { src: im.url, alt: '' }) : null, im.nome));

    const elColori = h('div', { class: 'campioni', role: 'group', 'aria-label': 'Colore' }, bottoniColore);
    const elImmagini = immagini.length
      ? h('div', { class: 'campioni campioni-immagini', role: 'group', 'aria-label': 'Immagine dalla Galleria' },
        h('button', { type: 'button', class: `campione${stato.immagine ? '' : ' scelto'}`, onclick: (e) => { stato.immagine = null; segna(e.currentTarget.parentElement, e.currentTarget); segnaColori(); } }, 'Nessuna'),
        bottoniImmagine)
      : h('p', { class: 'nota' }, 'Nessuna immagine nella Galleria: il token mostra le iniziali del nome.');
    const segna = (gruppo, scelto) => { for (const b of gruppo.querySelectorAll('button')) b.classList.toggle('scelto', b === scelto); };
    const segnaColori = () => { for (const b of elColori.querySelectorAll('button')) b.classList.toggle('scelto', !stato.immagine && b.title === (colori.find((c) => c.valore === stato.colore)?.nome ?? '')); };
    const segnaImmagini = () => { if (immagini.length) for (const b of elImmagini.querySelectorAll('button')) b.classList.toggle('scelto', b.textContent === 'Nessuna'); };

    const elIngombro = h('div', { class: 'mappa-azioni-token', role: 'group', 'aria-label': 'Quadretti' },
      ingombri.map((n) => h('button', {
        type: 'button', class: `btn btn-piccolo${n === stato.ingombro ? ' scelto' : ''}`, 'aria-pressed': String(n === stato.ingombro),
        onclick: (e) => { stato.ingombro = n; for (const b of e.currentTarget.parentElement.querySelectorAll('button')) { b.classList.toggle('scelto', b === e.currentTarget); b.setAttribute('aria-pressed', String(b === e.currentTarget)); } },
      }, `${n} × ${n}`)));

    return [
      h('label', { class: 'finestrella-campo' }, h('span', {}, 'Nome'), campo),
      h('div', { class: 'finestrella-campo' }, h('span', {}, 'Colore (iniziali del nome)'), elColori),
      h('div', { class: 'finestrella-campo' }, h('span', {}, 'Oppure un’immagine della Galleria'), elImmagini),
      h('div', { class: 'finestrella-campo' }, h('span', {}, 'Quadretti'), elIngombro),
      h('label', { class: 'finestrella-campo finestrella-casella' },
        h('input', { type: 'checkbox', checked: stato.nascosto, onchange: (e) => { stato.nascosto = e.target.checked; } }), 'Nascosto ai giocatori'),
      h('label', { class: 'finestrella-campo finestrella-casella' },
        h('input', { type: 'checkbox', checked: stato.blocca, onchange: (e) => { stato.blocca = e.target.checked; } }), 'Blocca il movimento e dà Copertura'),
      h('label', { class: 'finestrella-campo finestrella-casella', title: 'Un barile, un generatore, una porta: si può scegliere come bersaglio nella linea di tiro e in «Attacca!». Niente Difese né PV: l’esito lo decidi tu' },
        h('input', { type: 'checkbox', checked: stato.bersaglio, onchange: (e) => { stato.bersaglio = e.target.checked; } }), 'Bersaglio (si può attaccare)'),
      h('p', { class: 'nota' }, 'Un token libero non entra nello scontro: niente Iniziativa, niente conteggio del movimento, niente Attacchi di Opportunità. Lo sposti tu quando vuoi; i giocatori lo vedono ma non lo muovono. Il nome si legge sempre sotto la pedina.'),
      h('div', { class: 'riga-azioni finestrella-azioni' },
        h('button', { type: 'button', class: 'btn', onclick: () => fine(null) }, 'Annulla'),
        h('button', { type: 'button', class: 'btn primario', onclick: ok }, valori.nome ? 'Salva' : 'Metti sulla mappa')),
    ];
  });
}

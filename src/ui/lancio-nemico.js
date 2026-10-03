// Tavolo del Master, lotto 8 (per-davide A.73, decisione 8): «Lancia!» di un nemico. Si apre il pannello
// «Lancia!» dell'app (src/ui/lancio.js) con un contesto che presenta il nemico come lanciatore
// (src/nemico-lancio.js); «Lancia» scrive il lancio nel registro dello scontro e scala i PM del nemico
// (src/scontro.js → registraLancioNemico). Il pannello sta fuori dalla plancia, come «Attacca».
import { h } from './dom.js';
import { pannelloLancio } from './lancio.js';
import { calcolaLancioNemico, propostaLancio } from '../nemico-lancio.js';

/**
 * @param p partecipante nemico; @param indice dell'incantesimo nella scheda
 * @param bersagli [{ id, nome, descrizione, colpito: (proposta) → apre «Colpito» }], come per «Attacca»
 * @param registra async ({ id, incantesimo, livello, pm, testo }) → true se scritto nello scontro
 */
export function apriLancioNemico(ctx, p, indice, { bersagli = [], registra }) {
  const contenitore = h('div', { class: 'lancio-nemico' });
  document.body.append(contenitore);
  const st = { dichiarazione: {}, ui: {}, errore: null };
  const chiudi = () => { contenitore.remove(); document.removeEventListener('keydown', esc); };
  const esc = (e) => { if (e.key === 'Escape') chiudi(); };
  document.addEventListener('keydown', esc);

  const disegna = () => {
    if (!document.body.contains(contenitore)) return;
    // il pannello chiude mettendo ctx.ui.lancio a null
    if (st.ui.aperto && st.ui.lancio === null) { chiudi(); return; }
    st.ui.aperto = true;
    const x = calcolaLancioNemico(p, indice, st.dichiarazione, ctx.dati);
    if (!x) { chiudi(); return; }
    const finto = {
      dati: ctx.dati,
      tab: { scheda: x.chi.scheda },
      sessione: { ...x.chi.sessione, lanci: { [x.inc.nome]: st.dichiarazione } },
      massimi: { pm: p.pm?.massimo ?? 0 },
      // calcolo con l'adattatore; un errore di registrazione va fra gli avvisi del Risultato
      calcola: (d) => {
        const r = calcolaLancioNemico(p, indice, d, ctx.dati).risultato;
        if (st.errore) r.avvisi = [st.errore, ...(r.avvisi ?? [])];
        return r;
      },
      ui: st.ui,
      // bersagli di un incantesimo con durata: il nemico stesso e gli altri partecipanti (src/ui/lancio.js → bloccoDurata)
      partecipanti: [{ id: p.id, nome: `${p.nome} (sé)` }, ...bersagli.map((b) => ({ id: b.id, nome: b.nome }))],
      azioni: {
        ridisegna: disegna,
        ricordaLancio: (nome, d) => { st.dichiarazione = d; disegna(); },
        lancia: async ({ personali }, durata = null) => {
          const r = calcolaLancioNemico(p, indice, st.dichiarazione, ctx.dati).risultato;
          const testo = r.prova_richiesta ? `Prova di Potere VA ${r.va_potere_finale}` : 'Prova di Potere non richiesta';
          try {
            const ok = await registra({ id: p.id, incantesimo: x.voce.nome, livello: x.voce.livello, pm: personali, testo, ...(durata ? { durata } : {}) });
            if (!ok) throw new Error('lancio non registrato (scontro cambiato o chiuso): riprova.');
            const proposta = propostaLancio(x.inc, r, ctx.dati);
            if (proposta && bersagli.length) sceltaBersaglio(proposta); else chiudi();
          } catch (e) {
            st.errore = e.message; disegna();
          }
        },
      },
    };
    const su = contenitore.querySelector('.attacco-sfondo')?.scrollTop ?? 0;
    contenitore.replaceChildren(pannelloLancio(finto, x.inc));
    const sfondo = contenitore.querySelector('.attacco-sfondo');
    if (sfondo) sfondo.scrollTop = su;
  };
  // incantesimo con danno: a chi va (si apre «Colpito» già compilata), o nessuno (fallito, evitato…)
  const sceltaBersaglio = (proposta) => {
    contenitore.replaceChildren(h('div', { class: 'attacco-sfondo', onclick: (e) => { if (e.target === e.currentTarget) chiudi(); } },
      h('section', { class: 'attacco-pannello pannello-semplice', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Danno di ${p.nome}` },
        h('header', { class: 'attacco-testa' }, h('h2', {}, `Danno · ${p.nome}`), h('button', { type: 'button', class: 'btn', onclick: chiudi }, 'Chiudi')),
        h('p', {}, h('strong', {}, `${proposta.formula}${proposta.natura ? ` ${proposta.natura}` : ''}`), proposta.ac > 1 ? ` · ${proposta.ac} applicazioni` : '',
          h('small', { class: 'nota' }, ' · lancio registrato. Se la Prova o il colpo riescono, scegli il bersaglio: si apre «Colpito» già compilata.')),
        h('div', { class: 'scelta-pulsanti scelta-colonna' }, bersagli.map((b) => h('button', {
          type: 'button', class: 'btn scelta-btn', onclick: () => { chiudi(); b.colpito(proposta); },
        }, b.nome, b.descrizione ? h('small', { class: 'nota' }, ` · ${b.descrizione}`) : null))),
        h('div', { class: 'attacco-azioni' }, h('button', { type: 'button', class: 'btn', onclick: chiudi }, 'Nessun danno da applicare')))));
  };
  disegna();
  return { chiudi };
}

// Lotto 165 (02/11/2026): il pannello «Sposta i punti» del Direttore, solo in modalità master. Per ogni evento con Punti
// Abilità Liberi (creazione e livelli) si vedono i punti spesi lì, Abilità per Abilità, con − e +, il VA prima e dopo
// ricalcolato subito, le correzioni a parte («✎») sulla stessa Abilità tenute distinte e gli avvisi delle regole.
// Le regole stanno in src/sposta-punti.js; qui l'interfaccia. La conferma la registra src/ui/app.js (azioniMaster →
// spostaPunti): copia del file prima, riga nel registro «Modifiche del master», «Annulla» dal registro.
import { h, segno } from './dom.js';
import { apri, chiedi } from './finestrella.js';
import {
  statoPannello, spostaInBozza, avvisiSpostamento, decisioniConferma, totaliBozza, nelEvento,
} from '../sposta-punti.js';

const punti = (n) => (n === 1 ? '1 punto' : `${n} punti`);
const etichettaEvento = (e) => (e.livello === 1 ? 'Creazione' : `${e.livello}° livello`);

/** Il contatore dell'evento: «2 punti da ricollocare» / «1 punto in più» / «tutti al loro posto». */
function contatore(ev) {
  if (!ev) return null;
  const d = ev.differenza;
  const testo = d < 0 ? `${punti(-d)} da ricollocare` : d > 0 ? `${punti(d)} in più` : ev.cambiato ? 'Tutti i punti al loro posto' : 'Nessuno spostamento';
  return h('p', { class: `contatore-sposta${d < 0 ? ' da-ricollocare' : d > 0 ? ' in-piu' : ''}`, role: 'status', 'aria-live': 'polite' },
    h('strong', {}, testo), ` · ${etichettaEvento(ev)}: ${ev.ora} punti su ${ev.totale} spesi (le regole ne danno ${ev.previsti})`);
}

/**
 * Apre il pannello. @param azioni { personaggio: () => { creazione, livelli }, dati, applica({ bozza, decisioni, motivo }) }
 * @param livello l'evento da cui partire (1 = creazione)
 */
export function apriSpostaPunti(azioni, livello = null) {
  const p = azioni.personaggio();
  const st = { bozza: {}, livello, aggiunte: {}, motivo: '' };
  return apri('finestrella-master finestrella-sposta', 'Sposta i punti Abilità', (fine) => {
    const corpo = h('div', { class: 'corpo-master corpo-sposta' });
    const modificato = () => totaliBozza(p, st.bozza).length > 0;
    const chiudi = async () => {
      if (modificato() && !(await chiedi({ titolo: 'Lasciare il pannello?', testo: 'Gli spostamenti non confermati si perdono: la scheda resta com’era.', si: 'Lascia com’era' }))) return;
      fine(null);
    };
    const conferma = async () => {
      const avvisi = avvisiSpostamento(p, st.bozza, azioni.dati);
      if (avvisi.length) {
        const ok = await apri('finestrella-master', 'Avviso: procedere comunque?', (f) => [
          h('ul', { class: 'avvisi-sposta' }, avvisi.map((a) => h('li', {}, a.testo))),
          h('p', { class: 'nota' }, 'L’app avvisa e non blocca: l’ultima parola è del Direttore. La decisione resta scritta nel livello e nel registro.'),
          h('div', { class: 'riga-azioni finestrella-azioni' },
            h('button', { type: 'button', class: 'btn', onclick: () => f(false) }, 'Torna agli spostamenti'),
            h('button', { type: 'button', class: 'btn primario', onclick: () => f(true) }, 'Procedi comunque')),
        ]);
        if (!ok) return;
      }
      azioni.applica({ bozza: st.bozza, decisioni: decisioniConferma(p, st.bozza, avvisi), motivo: st.motivo.trim() });
      fine(true);
    };
    const disegna = () => {
      const s = statoPannello(p, st.bozza, st.livello, azioni.dati, { aggiunte: st.aggiunte[st.livello] ?? [] });
      const ev = s.evento;
      if (ev) st.livello = ev.livello;
      const altriAvvisi = s.avvisi.filter((a) => !(a.livello === ev?.livello && a.abilita && s.righe.some((r) => r.nome === a.abilita)));
      const piu = (r) => h('button', { type: 'button', class: 'btn-tavolo', 'aria-label': `Metti un punto in ${r.nome}`,
        title: ev.differenza >= 0 ? 'Nessun punto da ricollocare: questo sarebbe un punto in più del livello (te lo chiede alla conferma)' : `Rimetti un punto in ${r.nome}`,
        onclick: () => { st.bozza = spostaInBozza(p, st.bozza, ev.livello, r.nome, 1); disegna(); } }, '+');
      const meno = (r) => h('button', { type: 'button', class: 'btn-tavolo', 'aria-label': `Togli un punto da ${r.nome}`, disabled: r.ora <= 0,
        onclick: () => { st.bozza = spostaInBozza(p, st.bozza, ev.livello, r.nome, -1); disegna(); } }, '−');
      corpo.replaceChildren(...[
        h('p', { class: 'nota' }, 'Togli i punti da dove sono stati messi e rimettili altrove, nello stesso livello. I VA si ricalcolano mentre sposti; le correzioni «✎» restano a parte.'),
        // un pulsante per evento, con il segno dei punti da ricollocare
        h('div', { class: 'eventi-sposta', role: 'tablist', 'aria-label': 'Livello' }, s.eventi.map((e) => h('button', {
          type: 'button', role: 'tab', 'aria-selected': String(e.livello === ev?.livello), class: `btn btn-piccolo${e.livello === ev?.livello ? ' primario' : ''}${e.differenza ? ' con-sospesi' : ''}`,
          onclick: () => { st.livello = e.livello; disegna(); },
        }, etichettaEvento(e), e.differenza ? h('span', { class: 'segno-sospesi' }, ` ${segno(e.differenza)}`) : e.cambiato ? ' ✓' : null))),
        contatore(ev),
        ev ? tabella(s, ev, meno, piu) : h('p', { class: 'vuoto' }, 'Questo personaggio non ha Punti Abilità Liberi spesi.'),
        ev && s.altre.length ? h('label', { class: 'finestrella-campo' }, h('span', {}, 'Metti punti in un’altra Abilità'),
          h('select', { onchange: (e) => { if (!e.target.value) return; (st.aggiunte[ev.livello] ??= []).push(e.target.value); disegna(); } },
            h('option', { value: '' }, 'Scegli…'), s.altre.map((n) => h('option', { value: n }, n)))) : null,
        altriAvvisi.length ? h('ul', { class: 'avvisi-sposta' }, altriAvvisi.map((a) => h('li', { class: 'nota motivo' }, a.testo))) : null,
        h('label', { class: 'finestrella-campo' }, h('span', {}, 'Motivo (facoltativo)'),
          h('input', { type: 'text', maxlength: 200, value: st.motivo, placeholder: 'es. errore del giocatore, deciso al tavolo…', oninput: (e) => { st.motivo = e.target.value; } })),
        h('p', { class: 'nota' }, 'Alla conferma si salva una copia della scheda e la modifica va nel registro «Modifiche del master»; da lì «Annulla» rimette i punti di prima.'),
        h('div', { class: 'riga-azioni finestrella-azioni' },
          h('button', { type: 'button', class: 'btn', onclick: chiudi }, 'Annulla'),
          h('button', { type: 'button', class: 'btn primario', disabled: !modificato(), onclick: conferma }, 'Conferma')),
      ].filter(Boolean));
    };
    disegna();
    // Esc non chiude in silenzio con spostamenti in corso
    queueMicrotask(() => corpo.closest('dialog')?.addEventListener('cancel', (e) => { if (modificato()) { e.preventDefault(); chiudi(); } }));
    return [corpo];
  });
}

/** Una riga per Abilità: nome con le note (correzione a parte, spostamenti di prima, avvisi), punti con − e +, VA prima → dopo. */
function rigaAbilita(r, ev, meno, piu) {
  const note = [
    r.correzioni.length ? h('small', { class: 'nota nota-correzione-master' }, `✎ correzione a parte ${r.correzioni.map((c) => `${segno(c.valore)}${c.nota && c.nota !== 'senza motivo' ? ` (${c.nota})` : ''}`).join('; ')}: resta, non è uno spostamento`) : null,
    r.spostatiPrima ? h('small', { class: 'nota' }, `già spostati dal Direttore ${nelEvento(ev.livello)}: ${segno(r.spostatiPrima)}`) : null,
    r.forzato ? h('small', { class: 'nota' }, 'forzato dal Direttore oltre una regola') : null,
    ...r.avvisi.map((a) => h('small', { class: 'nota motivo avviso-sposta' }, a)),
  ];
  const va = r.vaPrima === r.vaDopo ? String(r.vaDopo ?? '—') : [`${r.vaPrima ?? '—'} → `, h('strong', {}, String(r.vaDopo ?? '—'))];
  return h('tr', { class: r.ora !== r.prima ? 'riga-cambiata' : null },
    h('th', { scope: 'row' }, h('span', {}, r.nome), ...note),
    h('td', { class: 'cella-punti-sposta' },
      h('span', { class: 'pulsanti-tavolo' }, meno(r), h('strong', { class: 'valore-master' }, String(r.ora)), piu(r)),
      r.ora !== r.prima ? h('small', { class: 'nota' }, ` prima ${r.prima}`) : null),
    h('td', { class: 'cella-va-sposta' }, va));
}

function tabella(s, ev, meno, piu) {
  const corpo = s.righe.length ? s.righe.map((r) => rigaAbilita(r, ev, meno, piu))
    : [h('tr', {}, h('td', { colspan: 3 }, h('p', { class: 'vuoto' }, `Nessun punto speso ${nelEvento(ev.livello)}.`)))];
  return h('table', { class: 'tabella compatta tabella-sposta' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Abilità'), h('th', {}, 'Punti'), h('th', {}, 'VA'))),
    h('tbody', {}, ...corpo));
}

/** Il pulsante «Sposta i punti» accanto a un livello della Progressione (solo in modalità master, solo se ha punti). */
export function pulsanteSpostaPunti(ctx, livello) {
  const sp = ctx.master?.spostaPunti;
  if (typeof sp?.livelli !== 'function' || !sp.livelli().includes(livello)) return null;
  return h('button', { type: 'button', class: 'btn btn-piccolo', title: `Sposta i Punti Abilità spesi ${nelEvento(livello)} (Direttore)`, onclick: () => ctx.master.spostaPunti.apri(livello) }, 'Sposta i punti');
}


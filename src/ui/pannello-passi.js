// Componenti comuni dei pannelli a passi della modalità tavolo: «Attacca!» (src/ui/attacco.js),
// «Lancia!» (src/ui/lancio.js) e, in futuro, il corpo a corpo. Solo presentazione.
//
// Disposizione: su telefono un passo per schermata con la barra Indietro / Avanti; da 800 px tutti
// i passi, con le scelte a sinistra e il risultato in una colonna a destra che resta visibile.
// Dentro ogni passo i gruppi di scelta vanno a capo da soli (due o tre per riga, secondo la
// larghezza dei pulsanti) e le domande sì/no diventano interruttori in linea, anche loro in griglia.
import { h } from './dom.js';
import { infoValore, nascondiTooltip } from './tooltip.js';

// «ⓘ» accanto a un pulsante: il tooltip con la regola completa. Separato dal pulsante, così su
// telefono toccare il pulsante sceglie e toccare «ⓘ» spiega.
const infoOpzione = (nome, contenuto) => (contenuto ? infoValore('ⓘ', contenuto, { classe: 'info-opzione' }) : null);

/**
 * Gruppo di scelte a pulsanti: [{ valore, etichetta, motivo?, titolo?, riga?, info? }]. Il pulsante
 * scelto è evidenziato; quelli non ammessi sono disabilitati con il motivo (title e testo sotto).
 * `riga`: riga compatta sotto l'etichetta («3 colpi · 1 a segno · +2 VA»); `info`: contenuto del
 * tooltip { titolo, sottotitolo, sezioni, tabella } con la regola completa, aperto da «ⓘ».
 * Nella griglia ogni gruppo prende la larghezza dei suoi pulsanti: due o tre gruppi per riga.
 */
export function rigaScelte(titolo, opzioni, attuale, scegli) {
  const motivi = opzioni.filter((o) => o.motivo && o.valore !== attuale).map((o) => `${o.etichetta}: ${o.motivo}`);
  const pulsante = (o) => h('button', {
    type: 'button', class: `btn scelta-btn${o.valore === attuale ? ' scelta' : ''}${o.riga ? ' con-riga' : ''}`, 'aria-pressed': String(o.valore === attuale),
    disabled: !!o.motivo && o.valore !== attuale, title: o.motivo ?? o.titolo ?? null, onclick: () => scegli(o.valore),
  }, o.riga ? [h('span', { class: 'scelta-etichetta' }, o.etichetta), h('small', { class: 'riga-opzione' }, o.riga)] : o.etichetta);
  return h('div', { class: 'scelta-attacco scelta-gruppo', role: 'group', 'aria-label': titolo },
    h('p', { class: 'scelta-titolo' }, titolo),
    h('div', { class: 'scelta-pulsanti' }, opzioni.map((o) => (o.info ? h('span', { class: 'scelta-opzione' }, pulsante(o), infoOpzione(o.etichetta, o.info)) : pulsante(o)))),
    motivi.length ? h('small', { class: 'motivo' }, motivi.join(' · ')) : null);
}

/**
 * Domanda sì/no come interruttore in linea: «etichetta · modificatore [○ Sì]». Tutta la riga è il
 * bersaglio del tocco. `mod`: l'effetto accanto all'etichetta («−4», «Bruciapelo»). Con `motivo`
 * l'interruttore spento non si può accendere (il motivo va nel tooltip e sotto). `info`: tooltip
 * con la regola completa, aperto da «ⓘ» accanto all'interruttore.
 */
export function interruttore(titolo, attivo, scegli, { motivo = null, mod = null, info = null } = {}) {
  const bloccato = !!motivo && !attivo;
  return h('div', { class: `interruttore-cella${info ? ' con-info' : ''}` },
    h('button', {
      type: 'button', role: 'switch', class: `interruttore${attivo ? ' acceso' : ''}`, 'aria-checked': String(!!attivo),
      disabled: bloccato, title: motivo, onclick: () => scegli(!attivo),
    },
    h('span', { class: 'interruttore-testo' }, titolo, mod ? h('span', { class: 'interruttore-mod' }, ` · ${mod}`) : null),
    h('span', { class: 'levetta', 'aria-hidden': 'true' }, h('span', { class: 'levetta-pomello' }), attivo ? 'Sì' : 'No')),
    infoOpzione(titolo, info),
    motivo && (bloccato || attivo) ? h('small', { class: 'motivo' }, motivo) : null);
}

/**
 * Dispone il contenuto di un passo: gruppi di scelta e poi interruttori nella stessa griglia (su
 * telefono una colonna; da 800 px vanno a capo secondo la loro larghezza, due o tre per riga), il
 * resto (note, campi, tabelle) dopo, nell'ordine dato.
 */
export function disponi(contenuti) {
  const tutti = [contenuti].flat(Infinity).filter(Boolean);
  const gruppi = tutti.filter((x) => x.classList?.contains('scelta-gruppo'));
  const interruttori = tutti.filter((x) => x.classList?.contains('interruttore-cella'));
  const altri = tutti.filter((x) => !gruppi.includes(x) && !interruttori.includes(x));
  return [gruppi.length || interruttori.length ? h('div', { class: 'griglia-scelte' }, gruppi, interruttori) : null, ...altri];
}

/**
 * Pannello a passi in sovrimpressione. passi: [{ titolo, contenuto }], l'ultimo è il risultato
 * (colonna di destra da 800 px). stato: { passo } in ctx.ui, per il telefono.
 */
export function pannelloPassi({ etichetta, titolo, classe = '', chiudi, passi, stato, ridisegna, etichettaNav }) {
  const passo = Math.min(stato.passo ?? 0, passi.length - 1);
  const vai = (n) => { stato.passo = n; ridisegna(); };
  const ultimo = passi.length - 1;
  // il tooltip aperto da un «ⓘ» del pannello si chiude con il pannello
  const chiudiPannello = () => { nascondiTooltip(); chiudi(); };
  return h('div', { class: 'attacco-sfondo', onclick: (e) => { if (e.target === e.currentTarget) chiudiPannello(); } },
    h('section', { class: `attacco-pannello ${classe}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': etichetta },
      h('header', { class: 'attacco-testa' },
        h('h2', {}, titolo),
        h('button', { type: 'button', class: 'btn', onclick: chiudiPannello, 'aria-label': `Chiudi: ${etichetta}` }, 'Chiudi')),
      h('div', { class: 'attacco-passi' },
        passi.map((p, i) => h('section', { class: `attacco-passo${i === passo ? ' corrente' : ''}${i === ultimo ? ' passo-risultato' : ''}` },
          h('h3', {}, h('span', { class: 'num-passo' }, `${i + 1}`), ' ', p.titolo),
          i === ultimo ? p.contenuto : disponi(p.contenuto))),
        // telefono: un passo per schermata
        h('nav', { class: 'attacco-nav', 'aria-label': etichettaNav },
          h('button', { type: 'button', class: 'btn', disabled: passo === 0, onclick: () => vai(passo - 1) }, '← Indietro'),
          h('span', { class: 'nota' }, `${passo + 1} / ${passi.length}`),
          passo < ultimo ? h('button', { type: 'button', class: 'btn primario', onclick: () => vai(passo + 1) }, `${passi[passo + 1].titolo} →`) : null))));
}

/**
 * Danno da tirare in evidenza in cima al risultato (playtest del 05/10/2026: al tavolo i giocatori non lo
 * trovavano): «DANNO 2d6+3» grande, in grassetto, in un riquadro proprio; sotto, piccoli, natura e varianti.
 * righe: [{ etichetta?, valore, dettagli? }] (più righe per gli incantesimi con più colonne di danno).
 */
export function riquadroDanno(righe, { titolo = 'Danno' } = {}) {
  const valide = righe.filter((x) => x && x.valore);
  if (!valide.length) return null;
  return h('div', { class: 'danno-evidenza', role: 'group', 'aria-label': titolo },
    valide.map((x) => h('div', { class: 'danno-riga' },
      h('span', { class: 'danno-etichetta' }, x.etichetta ?? titolo),
      h('strong', { class: 'danno-valore' }, x.valore),
      x.dettagli?.filter(Boolean).length ? h('span', { class: 'danno-dettagli' }, x.dettagli.filter(Boolean).join(' · ')) : null)));
}

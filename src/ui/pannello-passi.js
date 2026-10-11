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
export function rigaScelte(titolo, opzioni, attuale, scegli, { accanto = null, classe = '' } = {}) {
  const motivi = opzioni.filter((o) => o.motivo && o.valore !== attuale).map((o) => `${o.etichetta}: ${o.motivo}`);
  const pulsante = (o) => h('button', {
    // N2 (l'app avvisa, non blocca): una scelta sconsigliata dalla regola resta selezionabile, segnata, con il motivo sotto
    type: 'button', class: `btn scelta-btn${o.valore === attuale ? ' scelta' : ''}${o.riga ? ' con-riga' : ''}${o.motivo ? ' con-avviso' : ''}`, 'aria-pressed': String(o.valore === attuale),
    title: o.motivo ?? o.titolo ?? null, onclick: () => scegli(o.valore),
  }, o.riga ? [h('span', { class: 'scelta-etichetta' }, o.etichetta), h('small', { class: 'riga-opzione' }, o.riga)] : o.etichetta);
  return h('div', { class: `scelta-attacco scelta-gruppo ${classe}`.trim(), role: 'group', 'aria-label': titolo },
    h('p', { class: 'scelta-titolo' }, titolo),
    // `accanto`: altri pulsanti nella stessa fila (per esempio «Tiro Mirato», che si accende sopra la modalità)
    h('div', { class: 'scelta-pulsanti' }, opzioni.map((o) => (o.info ? h('span', { class: 'scelta-opzione' }, pulsante(o), infoOpzione(o.etichetta, o.info)) : pulsante(o))), accanto),
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
      type: 'button', role: 'switch', class: `interruttore${attivo ? ' acceso' : ''}${motivo ? ' con-avviso' : ''}`, 'aria-checked': String(!!attivo),
      title: motivo, onclick: () => scegli(!attivo),
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
 * righe: [{ etichetta?, valore, dettagli?, tira? }] (più righe per gli incantesimi con più colonne di danno).
 * S18 (13/10/2026): con `tira` il valore si tocca e tira i dadi di quel danno; nessun pulsante in più.
 */
export function riquadroDanno(righe, { titolo = 'Danno' } = {}) {
  const valide = righe.filter((x) => x && x.valore);
  if (!valide.length) return null;
  return h('div', { class: 'danno-evidenza', role: 'group', 'aria-label': titolo },
    valide.map((x) => h('div', { class: 'danno-riga' },
      h('span', { class: 'danno-etichetta' }, x.etichetta ?? titolo),
      x.tira ? h('button', { type: 'button', class: 'danno-valore valore-tirabile', title: 'Tocca per tirare il danno', onclick: x.tira }, x.valore) : h('strong', { class: 'danno-valore' }, x.valore),
      x.dettagli?.filter(Boolean).length ? h('span', { class: 'danno-dettagli' }, x.dettagli.filter(Boolean).join(' · ')) : null)));
}

/**
 * Pulsante che si accende e si spegne nella fila di un gruppo di scelte (per esempio «Tiro Mirato» accanto alle
 * modalità). Con `motivo` resta selezionabile, segnato ⚠ (N2: l'app avvisa, non blocca).
 */
export function pulsanteCommuta(etichetta, attivo, scegli, { motivo = null, riga = null, info = null } = {}) {
  const b = h('button', {
    type: 'button', class: `btn scelta-btn commuta${attivo ? ' scelta' : ''}${riga ? ' con-riga' : ''}${motivo ? ' con-avviso' : ''}`, 'aria-pressed': String(!!attivo), title: motivo, onclick: () => scegli(!attivo),
  }, riga ? [h('span', { class: 'scelta-etichetta' }, etichetta), h('small', { class: 'riga-opzione' }, riga)] : etichetta);
  return h('span', { class: 'scelta-opzione' }, b, infoOpzione(etichetta, info));
}

/**
 * Pannello sintetico di «Attacca!» (13/10/2026, S17): dall'alto Arma, Modalità, Distanza, Risultato; sotto, la riga con
 * le voci attive di «Altro» (ognuna con ✕) e «Altro ▾», chiuso di base, con tutto il resto. Un attacco normale si fa
 * senza aprirlo. `altro`: [{ titolo, contenuto }] (i passi di prima); `stato.altro` ricorda se è aperto.
 */
export function pannelloSintetico({ etichetta, titolo, classe = '', chiudi, arma = null, modalita = null, distanza = null, risultato, attive = null, altro = [], stato, ridisegna }) {
  const chiudiPannello = () => { nascondiTooltip(); chiudi(); };
  const sezione = (nome, nodo, cl = '') => (nodo ? h('section', { class: `sintesi-sezione ${cl}`.trim(), 'aria-label': nome }, nodo) : null);
  return h('div', { class: 'attacco-sfondo', onclick: (e) => { if (e.target === e.currentTarget) chiudiPannello(); } },
    h('section', { class: `attacco-pannello attacco-sintetico ${classe}`.trim(), role: 'dialog', 'aria-modal': 'true', 'aria-label': etichetta },
      h('header', { class: 'attacco-testa' },
        h('h2', {}, titolo),
        h('button', { type: 'button', class: 'btn', onclick: chiudiPannello, 'aria-label': `Chiudi: ${etichetta}` }, 'Chiudi')),
      h('div', { class: 'attacco-sintesi' },
        sezione('Arma', arma, 'sintesi-arma'),
        sezione('Modalità', modalita, 'sintesi-modalita'),
        sezione('Distanza', distanza, 'sintesi-distanza'),
        sezione('Risultato', risultato, 'sintesi-risultato passo-risultato'),
        attive,
        h('details', { class: 'attacco-altro', open: !!stato.altro || null, ontoggle: (e) => { if (e.target.open !== !!stato.altro) { stato.altro = e.target.open; ridisegna(); } } },
          h('summary', { class: 'btn btn-altro' }, 'Altro ▾', h('small', { class: 'nota' }, ' movimento, bersaglio, Copertura, luce, Manovre, Talenti…')),
          stato.altro ? altro.filter((p) => p && [p.contenuto].flat(Infinity).some(Boolean)).map((p) => h('section', { class: 'attacco-passo' }, h('h3', {}, p.titolo), disponi(p.contenuto))) : null))));
}

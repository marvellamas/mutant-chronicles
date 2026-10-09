// Completamento dei Punti Abilità Liberi di un evento passato (regole aggiornate: Giocatore, Doc del
// 27/09/2026, 10 punti invece di 5, per-davide A.52; Doc del 29/09/2026, categorie di competenza e limiti
// del VA personale, §2.13, §8.3). Un evento alla volta, dal più vecchio: la creazione o un livello già
// preso. I punti che non aumentano più il VA escono dall'evento alla conferma e si riassegnano insieme
// ai mancanti. Stessa tabella di «Sali di livello», con i limiti di quell'evento; nessun dado,
// nessun'altra scelta. Fino alla conferma i punti restano in una bozza.
// Controlli: statoCompletamento() e validaCompletamento() del motore (src/avanzamento.js).
import { h } from './dom.js';
import { statoCompletamento, statoRimozione } from '../avanzamento.js';
import { contatore, stepper } from './passi.js';
import { tabellaPuntiAbilita } from './sali.js';
import { conOrdinale } from '../lingua.js';
import { barraPassi } from './navigazione.js';

/**
 * Contesto: { dati, personaggio, bozza, titoloAvviso, aggiornaBozza(punti), conferma(), esci() }
 * Restituisce i nodi della pagina.
 */
const elenco = (punti) => Object.entries(punti ?? {}).map(([n, v]) => `${n} ${v}`).join(', ');

export function renderCompleta(ctx) {
  const { dati, personaggio, bozza } = ctx;
  const st = statoCompletamento(personaggio, bozza, dati);
  if (!st) {
    return [h('section', { class: 'passo' }, h('h1', {}, 'Punti Abilità da assegnare'),
      h('p', { class: 'riquadro ok' }, 'Nessun Punto Abilità da assegnare: il personaggio è in regola.'),
      h('button', { type: 'button', class: 'btn', onclick: ctx.esci }, '← Torna alla scheda'))];
  }
  const dell = st.livello === 1 ? 'della creazione' : `${conOrdinale('del', st.livello)} livello`;
  const imposta = (nome, v) => {
    const nuovo = { ...bozza, [nome]: v };
    if (v <= 0) delete nuovo[nome];
    ctx.aggiornaBozza(nuovo);
  };
  const minimo = dati.regole.creazione.va_minimo_per_punti_liberi;
  const bloccanti = st.errori.filter((e) => e.tipo === 'violazione');
  const barra = (posizione) => barraPassi({
    posizione,
    indietro: { etichetta: '← Esci senza salvare', onclick: ctx.esci },
    avanti: { etichetta: `Conferma i punti ${dell}`, corta: 'Conferma', disabilitato: st.errori.length > 0,
      motivo: st.rimasti > 0 ? `${st.rimasti} ${st.rimasti === 1 ? 'punto' : 'punti'} da assegnare` : bloccanti[0]?.problema ?? null, onclick: ctx.conferma },
  });
  return [h('div', { class: 'wizard sali completa' },
    h('section', { class: 'passo', 'aria-labelledby': 'titolo-passo' },
      h('header', { class: 'passo-testa' },
        h('p', { class: 'sopratitolo' }, `${ctx.titoloAvviso} · ${st.livello === 1 ? '§2.13' : '§8.3'}`),
        h('h1', { id: 'titolo-passo' }, `Punti Abilità ${dell}`)),
      barra('cima'),
      h('p', { class: 'guida' }, `Le regole correnti prevedono ${st.previsti} Punti Abilità Liberi ${dell}: ne erano stati assegnati ${st.assegnati}`
        + (st.riassegna ? `, e ${st.assegnati - st.attivi} non aumentano più il VA personale perché superano il limite della categoria di competenza (${elenco(st.inattivi)}; §8.3): escono dall’evento. ` : '. ')
        + `Assegna ${st.mancanti} punti ${st.livello === 1 ? 'alla creazione' : `${conOrdinale('al', st.livello)} livello`}, con i limiti di allora (colonna «Lim»), `
        + `compresi i +1 di Classe già applicati; ogni punto deve aumentare il VA personale e l’Abilità deve avere VA almeno ${minimo} prima dei punti liberi. I punti di Classe e le altre scelte non cambiano.`),
      contatore(st.rimasti, st.mancanti, 'Punti Abilità'),
      tabellaPuntiAbilita({ dati, abilita: st.abilita, rimasti: st.rimasti, imposta }),
      bloccanti.length ? h('div', { class: 'riquadro attenzione' },
        h('ul', {}, bloccanti.map((e) => h('li', { class: 'motivo' }, e.problema)))) : null,
      barra('fondo'))),
  ];
}

/**
 * Punti Abilità Liberi in eccesso (A.108, E&L del 05/10/2026: 7 a ogni Grado): si tolgono dall'evento a cui
 * appartengono, scegliendo il giocatore l'evento e le Abilità che vi hanno ricevuto punti liberi (l'app non sceglie da
 * sola); i punti tolti non si riassegnano. Controlli: statoRimozione() e validaRimozione() del motore.
 * Contesto: { dati, personaggio, bozza, livello, testoAvviso, aggiornaBozza(punti), scegliEvento(livello), conferma(), esci() }
 */
export function renderTogli(ctx) {
  const { dati, personaggio, bozza } = ctx;
  const st = statoRimozione(personaggio, bozza, dati, ctx.livello ?? null);
  if (!st) {
    return [h('section', { class: 'passo' }, h('h1', {}, 'Punti Abilità in eccesso'),
      h('p', { class: 'riquadro ok' }, 'Nessun Punto Abilità Libero in eccesso: il personaggio è in regola.'),
      h('button', { type: 'button', class: 'btn', onclick: ctx.esci }, '← Torna alla scheda'))];
  }
  const dell = st.livello === 1 ? 'della creazione' : `${conOrdinale('del', st.livello)} livello`;
  const imposta = (nome, v) => {
    const nuovo = { ...bozza, [nome]: v };
    if (v <= 0) delete nuovo[nome];
    ctx.aggiornaBozza(nuovo);
  };
  const bloccanti = st.errori.filter((e) => e.tipo === 'violazione');
  const barra = (posizione) => barraPassi({
    posizione,
    indietro: { etichetta: '← Esci senza salvare', onclick: ctx.esci },
    avanti: { etichetta: `Togli i punti ${dell}`, corta: 'Conferma', disabilitato: st.errori.length > 0,
      motivo: st.rimasti > 0 ? `${st.rimasti} ${st.rimasti === 1 ? 'punto' : 'punti'} da togliere` : bloccanti[0]?.problema ?? null, onclick: ctx.conferma },
  });
  return [h('div', { class: 'wizard sali completa togli' },
    h('section', { class: 'passo', 'aria-labelledby': 'titolo-passo' },
      h('header', { class: 'passo-testa' },
        h('p', { class: 'sopratitolo' }, ctx.testoAvviso),
        h('h1', { id: 'titolo-passo' }, `Punti Abilità in eccesso ${dell}`)),
      barra('cima'),
      // A.108: con più eventi in eccesso il giocatore sceglie da quale cominciare
      st.eventi.length > 1 ? h('div', { class: 'scelta-attacco scelta-gruppo', role: 'group', 'aria-label': 'Evento' },
        h('p', { class: 'scelta-titolo' }, 'Da quale evento togli'),
        h('div', { class: 'scelta-pulsanti' }, st.eventi.map((e) => h('button', {
          type: 'button', class: `btn scelta-btn${e.livello === st.livello ? ' scelta' : ''}`, 'aria-pressed': String(e.livello === st.livello), onclick: () => ctx.scegliEvento(e.livello),
        }, `${e.livello === 1 ? 'Creazione' : `${e.livello}° livello`} · ${e.eccesso} da togliere`)))) : null,
      h('p', { class: 'guida' }, `Le regole correnti prevedono ${st.previsti} Punti Abilità Liberi ${dell} (7 a ogni Grado, A.108): ne erano stati assegnati ${st.assegnati}. `
        + `Scegli tu i ${st.eccesso} punti da togliere fra le Abilità che li hanno ricevuti: si eliminano, non si riassegnano; i +1 di Classe e le altre scelte non cambiano. Finché non li togli non puoi salire di livello.`),
      h('p', { class: `contatore ${st.rimasti === 0 ? 'ok' : st.rimasti < 0 ? 'errore' : 'attenzione'}`, role: 'status' },
        h('strong', {}, String(st.rimasti)), ` punti ancora da togliere su ${st.eccesso}`),
      h('div', { class: 'tabella-scorre' }, h('table', { class: 'tabella abilita' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Abilità'), h('th', {}, 'Punti liberi'), h('th', {}, 'Restano'), h('th', {}, 'Da togliere'))),
        h('tbody', {}, st.abilita.map((a) => h('tr', {},
          h('th', { scope: 'row' }, a.nome,
            a.inattivi ? h('small', { class: 'nota' }, ` ${a.inattivi === 1 ? '1 punto non aumenta' : `${a.inattivi} punti non aumentano`} già il VA: toglierl${a.inattivi === 1 ? 'o' : 'i'} non cambia la scheda.`) : null,
            a.motivoPiu && a.togli < a.punti && st.rimasti > 0 ? h('small', { class: 'motivo' }, ` ${a.motivoPiu}`) : null),
          h('td', {}, String(a.punti)),
          h('td', { class: 'forte' }, String(a.punti - a.togli)),
          h('td', {}, stepper(a.togli, {
            etichetta: a.nome, motivoPiu: a.motivoPiu,
            motivoMeno: a.togli === 0 ? 'Nessun punto da rimettere.' : null,
            meno: () => imposta(a.nome, a.togli - 1), piu: () => imposta(a.nome, a.togli + 1),
          }))))))),
      bloccanti.length ? h('div', { class: 'riquadro attenzione' },
        h('ul', {}, bloccanti.map((e) => h('li', { class: 'motivo' }, e.problema)))) : null,
      barra('fondo'))),
  ];
}

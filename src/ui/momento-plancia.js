// Lotto 175 (A.233): «Nuova scena» e «Nuovo capitolo» nella plancia del Direttore. Difficili da premere per sbaglio: i
// pulsanti aprono sempre una conferma che dice quanti usi tornano disponibili e a chi (src/rinnovi.js) e che PM e
// munizioni non cambiano; dopo il comando compare «Annulla», che rimette il numero di prima (src/momento.js).
import { h } from './dom.js';
import { chiedi } from './finestrella.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { comandoMomento } from './cartella.js';
import { riepilogoRinnovo, testoConferma } from '../rinnovi.js';

const NOMI = { scena: 'Nuova scena', capitolo: 'Nuovo capitolo' };

/**
 * Il gruppo «Campagna» della testata della plancia: scena e capitolo attuali, i due comandi e, dopo un comando, «Annulla».
 * @param stato lo stato della plancia: { momento, testi (file → testo), ... }
 * @param testiAlTavolo () => [{ file, testo }] dei PG al tavolo
 * @param dopo (momento) => void, per ridisegnare
 */
export function gruppoMomento({ momento, testiAlTavolo, dati, dopo, gruppo }) {
  if (!momento) return null;
  const comando = async (azione) => {
    const r = riepilogoRinnovo(testiAlTavolo(), azione, momento, dati.regole ? dati : dati);
    const ok = await chiedi({ titolo: `${NOMI[azione]}?`, testo: testoConferma(azione, momento, r, dati.regole), si: `Comincia ${azione === 'scena' ? 'la scena' : 'il capitolo'} ${momento[azione] + 1}`, no: 'Non ancora' });
    if (!ok) return;
    try {
      const m = await comandoMomento(azione);
      avviso(`${NOMI[azione]}: ${azione === 'scena' ? 'scena' : 'capitolo'} ${m[azione]}${r.totale ? `, ${r.totale === 1 ? '1 uso torna' : `${r.totale} usi tornano`} disponibil${r.totale === 1 ? 'e' : 'i'}` : ''}.`);
      dopo(m);
    } catch (e) { avvisoErrore(`${NOMI[azione]} non riuscito: ${e.message}`); }
  };
  const annulla = async () => {
    const u = momento.ultimo;
    if (!u) return;
    const ok = await chiedi({ titolo: `Annullare «${NOMI[u.azione]}»?`, testo: `Si torna ${u.azione === 'scena' ? 'alla scena' : 'al capitolo'} ${momento[u.azione] - 1}: gli usi segnati prima del comando tornano consumati. PM, munizioni e riserve non cambiano.`, si: 'Annulla il comando', no: 'Lascia così' });
    if (!ok) return;
    try { const m = await comandoMomento('annulla'); avviso(`Annullato: ${u.azione === 'scena' ? 'scena' : 'capitolo'} ${m[u.azione]}.`); dopo(m); } catch (e) { avvisoErrore(`Annulla non riuscito: ${e.message}`); }
  };
  return gruppo('Campagna', 'gruppo-momento',
    h('span', { class: 'nota momento-attuale', title: 'Il capitolo è distinto dall’Atto dei PX: un Atto può comprendere più capitoli (A.233)' }, `Scena ${momento.scena} · Capitolo ${momento.capitolo}`),
    h('button', { type: 'button', class: 'btn', title: 'Comincia una scena nuova: tornano disponibili solo gli usi «per scena» dei PG. Prima chiede conferma e dice quanti', onclick: () => comando('scena') }, 'Nuova scena…'),
    h('button', { type: 'button', class: 'btn', title: 'Comincia un capitolo nuovo: tornano disponibili solo gli usi «per capitolo». Prima chiede conferma e dice quanti', onclick: () => comando('capitolo') }, 'Nuovo capitolo…'),
    momento.ultimo ? h('button', { type: 'button', class: 'btn btn-piccolo', title: `Rimette ${momento.ultimo.azione === 'scena' ? 'la scena' : 'il capitolo'} di prima`, onclick: annulla }, `↶ Annulla ${momento.ultimo.azione === 'scena' ? 'scena' : 'capitolo'}`) : null);
}

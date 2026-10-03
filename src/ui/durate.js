// Durate sulle carte della plancia (PG e nemici): Tecniche, incantesimi in corso e subiti, con i Round che restano
// (src/round-scontro.js, src/durate-incantesimi.js).
import { h } from './dom.js';
import { testoDurata } from '../round-scontro.js';

/** Riga delle durate di un tipo sulla carta di un PG o di un nemico: «Incantesimi in corso: Scudo · 3 Round (su di sé)». */
export function rigaDurate(durate, tipo, titolo) {
  const voci = durate.filter((x) => x.tipo === tipo);
  if (!voci.length) return null;
  const bersagli = (d) => (d.bersagli?.length ? ` (${d.bersagli.map((b) => (b.se ? 'su di sé' : b.nome)).join(', ')})` : '');
  return h('p', { class: 'plancia-durate' }, `${titolo}: `, voci.map((d, i) => [i ? ', ' : '',
    h('span', { class: 'etichetta durata-plancia', title: d.al === null || d.al === undefined ? 'a tempo: si termina dalla scheda' : `fino alla fine del Round ${d.al}` }, `${testoDurata(d)}${bersagli(d)}`)]));
}


// Sfondi della SD per Corporazione (README, «Ritratto e sfondi»): file img/sfondi/<id>.jpg messi a
// mano, con l'id di data/corporazioni.json. L'app non ne contiene e non li cerca sul server:
// li elenca img/immagini.json → «sfondi» (tools/genera_immagini.py, o a mano). Così un file
// mancante non produce richieste fallite. Lo sfondo è fisso, a bassa opacità, dietro le card
// (css/style.css, .con-sfondo).
import { sfondiElencati } from './immagini.js';

/** Sfondi presenti: [{ id, nome, url }], uno per Corporazione elencata nel manifesto. */
export function cercaSfondi(corporazioni) {
  const elencati = sfondiElencati();
  return corporazioni.filter((c) => elencati[c.id]).map((c) => ({ id: c.id, nome: c.nome, url: elencati[c.id] }));
}

/** Applica (o toglie, con null) lo sfondo fisso della pagina. */
export function applicaSfondo(url) {
  const b = document.body;
  if (url) {
    b.style.setProperty('--img-sfondo', `url("${url}")`);
    b.classList.add('con-sfondo');
  } else {
    b.style.removeProperty('--img-sfondo');
    b.classList.remove('con-sfondo');
  }
}

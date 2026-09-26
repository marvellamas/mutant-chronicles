// Sfondi della SD per Corporazione (README, «Sfondi»): file img/sfondi/<corporazione>.jpg messi a
// mano. L'app non ne contiene: la voce di una Corporazione compare nell'ingranaggio solo se il suo
// file esiste. Lo sfondo è fisso, a bassa opacità, dietro le card (css/style.css, .con-sfondo).

const CARTELLA = 'img/sfondi/';

/** «Fratellanza» → «fratellanza»; minuscole, senza accenti, spazi → trattini. */
export const nomeFileSfondo = (corporazione) => `${String(corporazione).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, '-')}.jpg`;

/**
 * Sfondi presenti: [{ id, nome, url }], uno per Corporazione con il file in img/sfondi/. Chiede al
 * server solo l'intestazione (HEAD); entro `attesa` ms, poi rinuncia a quelli non ancora arrivati.
 */
export async function cercaSfondi(corporazioni, attesa = 1500) {
  const prova = async (nome) => {
    const url = CARTELLA + nomeFileSfondo(nome);
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
      const tipo = r.headers.get('content-type') ?? '';
      return r.ok && (!tipo || tipo.startsWith('image/')) ? { id: nomeFileSfondo(nome).replace(/\.jpg$/, ''), nome, url } : null;
    } catch {
      return null;
    }
  };
  const tutte = Promise.all(corporazioni.map(prova)).then((l) => l.filter(Boolean));
  const scadenza = new Promise((ok) => setTimeout(() => ok([]), attesa));
  return Promise.race([tutte, scadenza]);
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

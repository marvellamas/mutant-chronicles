// Mappa di battaglia, lotto 2 (docs/battlemap/piano.md §3): Canvas 2D a tre livelli sovrapposti nello stesso riquadro.
//   fondo  immagine e griglia (cambia con zoom, spostamento e calibrazione)
//   aree   muri, nebbia, area raggiungibile, template (lotti 4 e 5; per ora vuoto)
//   sopra  token, selezione e linee (qui: il riquadro della calibrazione)
// Si ridisegna solo su richiesta, al massimo una volta per fotogramma, e solo i livelli segnati. Il tempo dell'ultimo
// disegno resta in data-disegno-ms del riquadro (prove di prestazione, lotto 2).

export const LIVELLI = ['fondo', 'aree', 'sopra'];

/**
 * Crea i tre canvas dentro `riquadro` (un elemento posizionato). `pittori[livello](c, info)` disegna un livello
 * su un contesto già pulito, con info = { larghezza, altezza, dpr } in pixel CSS.
 * Restituisce { richiedi(livelli?), dimensioni(), distruggi() }.
 */
export function creaTela(riquadro, pittori) {
  const tele = Object.fromEntries(LIVELLI.map((l) => {
    const t = document.createElement('canvas');
    t.className = `mappa-livello mappa-livello-${l}`;
    t.setAttribute('aria-hidden', 'true');
    riquadro.append(t);
    return [l, t];
  }));
  const contesti = Object.fromEntries(LIVELLI.map((l) => [l, tele[l].getContext('2d', { alpha: true })]));
  const sporchi = new Set();
  let info = { larghezza: 0, altezza: 0, dpr: 1 };
  let fotogramma = null;

  const disegna = () => {
    fotogramma = null;
    const inizio = performance.now();
    for (const l of LIVELLI) {
      if (!sporchi.has(l)) continue;
      const c = contesti[l];
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, tele[l].width, tele[l].height);
      c.setTransform(info.dpr, 0, 0, info.dpr, 0, 0); // i pittori lavorano in pixel CSS
      pittori[l]?.(c, info);
    }
    sporchi.clear();
    riquadro.dataset.disegnoMs = (performance.now() - inizio).toFixed(2);
  };

  const richiedi = (livelli = LIVELLI) => {
    for (const l of livelli) sporchi.add(l);
    if (fotogramma === null) fotogramma = requestAnimationFrame(disegna);
  };

  const misura = () => {
    const r = riquadro.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    info = { larghezza: r.width, altezza: r.height, dpr };
    for (const t of Object.values(tele)) {
      t.width = Math.max(1, Math.round(r.width * dpr));
      t.height = Math.max(1, Math.round(r.height * dpr));
    }
    richiedi();
  };
  const osservatore = new ResizeObserver(misura);
  osservatore.observe(riquadro);
  misura();

  return {
    richiedi,
    dimensioni: () => info,
    distruggi: () => {
      osservatore.disconnect();
      if (fotogramma !== null) cancelAnimationFrame(fotogramma);
      for (const t of Object.values(tele)) t.remove();
    },
  };
}

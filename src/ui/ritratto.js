// Ritratto del personaggio nel passo Background: caricamento, ridimensionamento nel browser con
// canvas (lato lungo 600 px, JPEG qualità 0.8, PNG se l'immagine ha trasparenza), anteprima con
// dimensioni e peso, «Rimuovi». Le regole pure (dimensioni, peso, limite) sono in src/ritratto.js.
import { h } from './dom.js';
import { RITRATTO, dimensioniRitratto, byteDataUrl, testoPeso } from '../ritratto.js';

/** Legge un file immagine come elemento disegnabile (ImageBitmap o <img>). */
async function leggiImmagine(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // alcuni formati passano solo da <img>: si riprova sotto
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Almeno un pixel non del tutto opaco. */
function haTrasparenza(contesto, larghezza, altezza) {
  const px = contesto.getImageData(0, 0, larghezza, altezza).data;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
  return false;
}

/**
 * Ridimensiona un file immagine: { dataUrl, larghezza, altezza, byte, tipo }. Lancia un Error con
 * un messaggio leggibile se il file non è un'immagine o se supera il peso massimo.
 */
export async function preparaRitratto(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Il file scelto non è un’immagine.');
  let img;
  try {
    img = await leggiImmagine(file);
  } catch {
    throw new Error('Immagine non leggibile dal browser (formato non supportato?).');
  }
  const { larghezza, altezza } = dimensioniRitratto(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = larghezza;
  canvas.height = altezza;
  const c = canvas.getContext('2d');
  c.imageSmoothingQuality = 'high';
  c.drawImage(img, 0, 0, larghezza, altezza);
  img.close?.();
  const png = haTrasparenza(c, larghezza, altezza);
  const dataUrl = png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', RITRATTO.qualitaJpeg);
  const byte = byteDataUrl(dataUrl);
  if (byte > RITRATTO.byteMassimi) {
    throw new Error(`Dopo il ridimensionamento a ${larghezza}×${altezza} il ritratto pesa ${testoPeso(byte)}, oltre il massimo di ${testoPeso(RITRATTO.byteMassimi)}${png ? ' (ha parti trasparenti, quindi resta PNG: prova un’immagine senza trasparenza)' : ''}.`);
  }
  return { dataUrl, larghezza, altezza, byte, tipo: png ? 'PNG' : 'JPEG' };
}

// esito dell'ultimo caricamento, mostrato sotto l'anteprima (sopravvive ai ridisegni)
let esito = null;

/** Blocco «Ritratto» del passo Background. ctx: { scelte, aggiorna(modifica), ridisegna() }. */
export function campoRitratto(ctx) {
  const ritratto = ctx.scelte.ritratto;
  const input = h('input', {
    type: 'file', accept: 'image/*', class: 'sr', id: 'file-ritratto',
    onchange: async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      esito = { tipo: 'nota', testo: 'Ridimensionamento…' };
      ctx.ridisegna();
      try {
        const r = await preparaRitratto(file);
        esito = { tipo: 'ok', testo: `Ritratto ${r.larghezza}×${r.altezza} px, ${r.tipo}, ${testoPeso(r.byte)}.` };
        ctx.aggiorna({ ritratto: r.dataUrl });
      } catch (err) {
        esito = { tipo: 'errore', testo: err.message };
        ctx.ridisegna();
      }
    },
  });
  return h('section', { class: 'campo-ritratto' },
    h('h3', {}, 'Ritratto'),
    h('div', { class: 'ritratto-riga' },
      ritratto ? h('img', { class: 'ritratto-anteprima', src: ritratto, alt: `Ritratto di ${ctx.scelte.nome || 'questo personaggio'}` })
        : h('div', { class: 'ritratto-anteprima vuoto', 'aria-hidden': 'true' }, '👤'),
      h('div', { class: 'ritratto-comandi' },
        input,
        h('label', { class: 'btn', for: 'file-ritratto' }, ritratto ? 'Cambia immagine' : 'Carica immagine'),
        ritratto ? h('button', { type: 'button', class: 'btn pericolo', onclick: () => { esito = null; ctx.aggiorna({ ritratto: null }); } }, 'Rimuovi') : null,
        ritratto && !esito ? h('p', { class: 'nota' }, `Ritratto salvato, ${testoPeso(byteDataUrl(ritratto))}.`) : null,
        esito ? h('p', { class: esito.tipo === 'errore' ? 'nota errore' : 'nota', role: esito.tipo === 'errore' ? 'alert' : 'status' }, esito.testo) : null,
        h('p', { class: 'nota' }, `Facoltativo. L’immagine si riduce nel browser a ${RITRATTO.latoMassimo} px sul lato lungo e resta dentro il personaggio (anche nel file esportato). Massimo ${testoPeso(RITRATTO.byteMassimi)}.`))));
}

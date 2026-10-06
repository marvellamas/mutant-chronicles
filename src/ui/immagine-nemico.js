// Immagine dei nemici sui token della mappa (A.131, decisione di Marcello del 06/10/2026: non è una regola di gioco).
// Si carica come le mappe (server.mjs → /api/mappe): l'originale e una copia ridotta per il token, lato da
// data/mappa.json → immagini.token. Il nemico la tiene nel campo facoltativo «immagine» { file, ridotta }
// (data/formato_nemici.json); senza immagine il token mostra le iniziali.
// Si imposta da «Crea nemico», dall'editor del bestiario, dalla carta del nemico nella plancia e dal pannello del token.
import { h } from './dom.js';
import { avviso, avvisoErrore } from './avvisi.js';
import { controllaFile, preparaRidotta, caricaImmagine } from './mappa/api.js';
import { conImmagineNemico } from '../scontro.js';
import { conImmagineNemicoBozza } from '../preparazione.js';

/** Come src/ui/nemici.js → salvaNemico (qui a parte: nemici.js usa questo modulo). */
async function salvaNemico(n) {
  const r = await fetch(`api/nemici/${encodeURIComponent(n.id)}`, { method: 'PUT', body: JSON.stringify(n), headers: { 'Content-Type': 'application/json' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.errore ?? `errore ${r.status}`);
  return j;
}

/** Indirizzo dell'immagine da disegnare (la copia ridotta, se c'è). */
export const urlImmagine = (immagine) => (immagine?.file ? `api/mappe/${encodeURIComponent(immagine.ridotta ?? immagine.file)}` : null);

/** Apre la scelta del file; risolve con il File o null. */
function scegliFile() {
  return new Promise((risolvi) => {
    const input = h('input', { type: 'file', accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp', hidden: true });
    input.addEventListener('change', () => { risolvi(input.files?.[0] ?? null); input.remove(); });
    input.addEventListener('cancel', () => { risolvi(null); input.remove(); });
    document.body.append(input);
    input.click();
  });
}

/** Sceglie e carica un'immagine per il nemico `nome`: { file, ridotta } oppure null (annullato o errore, con avviso). */
export async function scegliImmagineNemico(dati, nome) {
  const file = await scegliFile();
  if (!file) return null;
  const controllo = await controllaFile(file, dati);
  if (controllo.errore) { avvisoErrore(controllo.errore, { durata: 12000 }); return null; }
  try {
    const ridotta = await preparaRidotta(file, dati, { latoMassimo: dati.mappa.immagini.token.lato_massimo_px });
    const base = `nemico ${nome ?? ''}`;
    const orig = await caricaImmagine(file, base);
    const rid = ridotta ? await caricaImmagine(ridotta, base, { ridotta: true }) : null;
    return { file: orig.file, ridotta: rid?.file ?? null };
  } catch (e) {
    avvisoErrore(`Immagine non caricata: ${e.message}`, { durata: 10000 });
    return null;
  }
}

/** Anteprima, «Scegli immagine…» e «Togli»: per l'editor del bestiario e «Crea nemico». */
export function campoImmagine({ valore, nome, dati, imposta, etichetta = 'Immagine sulla mappa' }) {
  const url = urlImmagine(valore);
  return h('div', { class: 'campo-immagine-nemico' },
    h('span', {}, etichetta),
    url ? h('img', { src: url, alt: `Immagine di ${nome ?? 'nemico'}`, class: 'anteprima-immagine-nemico' }) : h('small', { class: 'nota' }, 'nessuna: il token mostra le iniziali'),
    h('button', { type: 'button', class: 'btn btn-piccolo', onclick: async () => { const i = await scegliImmagineNemico(dati, typeof nome === 'function' ? nome() : nome); if (i) imposta(i); } }, url ? 'Cambia immagine…' : 'Scegli immagine…'),
    url ? h('button', { type: 'button', class: 'btn btn-piccolo', onclick: () => imposta(undefined) }, 'Togli') : null);
}

async function json(url, opzioni) {
  const r = await fetch(url, { cache: 'no-store', ...opzioni });
  const corpo = await r.json().catch(() => ({}));
  return { stato: r.status, corpo };
}

/** Legge, cambia e riscrive un file di scontri/ con la revisione; riprova se un'altra finestra l'ha cambiato. */
export async function aggiornaInScontri(id, cambia) {
  for (let i = 0; i < 3; i++) {
    const letto = await json(`api/scontri/${encodeURIComponent(id)}`);
    if (letto.stato !== 200) throw new Error(`${id} non leggibile (${letto.stato})`);
    const scritto = await json(`api/scontri/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(cambia(letto.corpo)), headers: { 'Content-Type': 'application/json' } });
    if (scritto.stato === 200) return scritto.corpo;
    if (scritto.stato !== 409) throw new Error(scritto.corpo.errore ?? `errore ${scritto.stato}`);
  }
  throw new Error(`${id} cambiato più volte altrove: riprova`);
}

/**
 * Mette (o toglie, con immagine null) l'immagine del tipo di nemico `tipo` nello scontro e nella bozza indicati e,
 * se c'è, nel suo file del bestiario (nemici/<tipo>.json), così vale anche per gli scontri futuri.
 * @returns {Promise<string[]>} dove è stata scritta
 */
export async function impostaImmagineNemico({ tipo, immagine, scontro = null, bozza = null, nome = tipo }) {
  const fatto = [];
  if (scontro) { await aggiornaInScontri(scontro, (s) => conImmagineNemico(s, tipo, immagine)); fatto.push('scontro'); }
  if (bozza) { await aggiornaInScontri(bozza, (b) => conImmagineNemicoBozza(b, tipo, immagine, new Date())); fatto.push('bozza'); }
  const elenco = await json('api/nemici');
  const voce = Array.isArray(elenco.corpo) ? elenco.corpo.find((v) => v.nemico?.id === tipo) : null;
  if (voce) {
    const { immagine: _, ...resto } = voce.nemico;
    await salvaNemico(immagine ? { ...resto, immagine } : resto);
    fatto.push('bestiario');
  }
  avviso(`${immagine ? 'Immagine' : 'Iniziali'} per ${nome}: ${fatto.join(', ') || 'nessun file da aggiornare'}.`);
  return fatto;
}

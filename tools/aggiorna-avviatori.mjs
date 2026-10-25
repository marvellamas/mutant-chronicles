// I file del pacchetto che stanno FUORI dalla cartella «mutant» si rimettono al passo con l'app (12/10/2026).
//
// Il pacchetto zip è fatto così (dal 25/10/2026, «un ingresso solo»):
//   <cartella di Davide>\1_scarica_o_aggiorna_app.bat   <- installa l'app la prima volta (poi aggiorna Mutant.bat)
//   <cartella di Davide>\LEGGIMI.txt
//   <cartella di Davide>\mutant\Mutant.bat              <- l'unico programma da aprire (collegamento sul desktop)
//   <cartella di Davide>\mutant\...                      <- l'app, che si aggiorna
//   <cartella di Davide>\mutant\distribuzione\...        <- le copie nuove degli stessi file
// Aggiornando, le copie nuove finiscono in mutant\distribuzione\ e NON sopra quelle che Davide apre: per questo
// il suo 1_scarica_o_aggiorna_app.bat è rimasto quello di prima del 09/10/2026, che cancellava i dati
// (docs/diagnosi-dati-spariti-2026-10-12.md). Questo script le rimette al loro posto.
//
//   node tools/aggiorna-avviatori.mjs [--radice=<cartella dell'app>] [--salta=a.bat,b.bat] [--prova]
//
// Un file in esecuzione non si può sostituire mentre gira: chi chiama passa il proprio nome in --salta.
// Lo chiamano distribuzione\1_scarica_o_aggiorna_app.bat alla fine (saltando se stesso) e aggiorna.bat (voce 2 di
// Mutant.bat) dopo di lui, senza saltare niente: così si aggiorna anche 1_scarica_o_aggiorna_app.bat.
// I programmi che non si usano più (OBSOLETI) si tolgono dalla cartella di fuori, con la riga che lo dice.
import { readFileSync, writeFileSync, existsSync, copyFileSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = fileURLToPath(new URL('..', import.meta.url));

/** I file del pacchetto da tenere allineati: quelli di distribuzione/, tranne lo script della copia. */
export const AVVIATORI = ['1_scarica_o_aggiorna_app.bat', 'LEGGIMI.txt', 'aggiorna-da-zip.ps1'];

/**
 * I programmi che non ci sono più (25/10/2026, «un ingresso solo»): ogni loro funzione è una voce del menu di
 * Mutant.bat. Si tolgono dalla cartella di fuori (con le loro copie «.precedente»), solo se accanto c'è il pacchetto
 * (1_scarica_o_aggiorna_app.bat): mai altrove.
 *   2_installa_node.bat → Mutant.bat lo installa da sé se manca; 3_avvia.bat → voce 1; 4_controlla_personaggi.bat →
 *   voce 6; 5_passa_ai_talenti_nuovi.bat → voci 7 e 8.
 */
export const OBSOLETI = ['2_installa_node.bat', '3_avvia.bat', '4_controlla_personaggi.bat', '5_passa_ai_talenti_nuovi.bat'];

/** Toglie i programmi obsoleti dalla cartella di fuori. @returns [nomi tolti] */
export function togliObsoleti({ fuori, prova = false } = {}) {
  if (!fuori || !existsSync(join(fuori, '1_scarica_o_aggiorna_app.bat'))) return [];
  const tolti = [];
  for (const nome of OBSOLETI) {
    for (const f of [nome, `${nome}.precedente`]) {
      const p = join(fuori, f);
      if (!existsSync(p)) continue;
      try { if (!prova) unlinkSync(p); if (f === nome) tolti.push(nome); } catch { /* in uso: si toglie la volta dopo */ }
    }
  }
  return tolti;
}

/** Due file hanno lo stesso contenuto? (byte per byte; un file che non c'è è «diverso») */
export function uguali(a, b) {
  if (!existsSync(a) || !existsSync(b)) return false;
  if (statSync(a).size !== statSync(b).size) return false;
  return readFileSync(a).equals(readFileSync(b));
}

/**
 * Che cosa c'è da fare, senza toccare niente. Funzione pura rispetto al disco in sola lettura.
 * @param radice cartella dell'app (quella con server.mjs)
 * @param fuori cartella che contiene la cartella dell'app; di norma quella sopra
 * @returns [{ nome, da, a, stato: 'da-aggiornare' | 'uguale' | 'saltato' | 'non-installato' }]
 */
export function daFare({ radice = RADICE, fuori = dirname(radice), salta = [] } = {}) {
  const nonSaltare = new Set(salta.map((s) => basename(String(s)).toLowerCase()));
  return AVVIATORI.map((nome) => {
    const da = join(radice, 'distribuzione', nome);
    const a = join(fuori, nome);
    if (!existsSync(da)) return { nome, da, a, stato: 'non-installato' };
    // il pacchetto zip non c'è (copia con Git): fuori non ci sono gli avviatori, non si crea niente
    if (!existsSync(a)) return { nome, da, a, stato: 'non-installato' };
    if (uguali(da, a)) return { nome, da, a, stato: 'uguale' };
    if (nonSaltare.has(nome.toLowerCase())) return { nome, da, a, stato: 'saltato' };
    return { nome, da, a, stato: 'da-aggiornare' };
  });
}

/** Esegue le sostituzioni di daFare. @returns { aggiornati: [nomi], saltati: [nomi], errori: [{nome, errore}] } */
export function aggiornaAvviatori({ radice = RADICE, fuori = dirname(radice), salta = [], prova = false } = {}) {
  const aggiornati = [];
  const saltati = [];
  const errori = [];
  for (const v of daFare({ radice, fuori, salta })) {
    if (v.stato === 'saltato') { saltati.push(v.nome); continue; }
    if (v.stato !== 'da-aggiornare') continue;
    if (prova) { aggiornati.push(v.nome); continue; }
    try {
      // la copia di prima si tiene accanto, una sola: se qualcosa va storto si rimette a mano
      copyFileSync(v.a, `${v.a}.precedente`);
      copyFileSync(v.da, v.a);
      aggiornati.push(v.nome);
    } catch (e) { errori.push({ nome: v.nome, errore: e.message }); }
  }
  return { aggiornati, saltati, errori };
}

/** Le righe da mettere a schermo. Niente lettere accentate: la console di Windows non è in UTF-8. */
export function testoEsito({ aggiornati, saltati, errori, tolti = [] }) {
  const righe = [];
  if (tolti.length) {
    righe.push(`  Tolti i programmi che non si usano piu': ${tolti.join(', ')}.`);
    righe.push('  Da adesso si usa solo Mutant.bat (nella cartella mutant): ogni funzione e\' una voce del suo menu.');
    righe.push('  Se avevi un collegamento sul desktop a uno di quei file, non funziona piu\': apri Mutant.bat,');
    righe.push('  scegli 9 (Impostazioni) e poi 5 (collegamento "Mutant" sul desktop).');
  }
  if (aggiornati.length) righe.push(`  Aggiornati anche i file fuori dalla cartella mutant: ${aggiornati.join(', ')}`);
  if (saltati.length) righe.push(`  Da aggiornare al prossimo avvio (adesso e' in uso): ${saltati.join(', ')}`);
  for (const e of errori) righe.push(`  Non sono riuscito ad aggiornare ${e.nome} (${e.errore}).`);
  return righe.join('\n');
}

const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const radice = arg('radice') || RADICE;
  const fuori = arg('fuori') || dirname(radice);
  const salta = (arg('salta') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const esito = aggiornaAvviatori({ radice, fuori, salta, prova: process.argv.includes('--prova') });
  esito.tolti = togliObsoleti({ fuori, prova: process.argv.includes('--prova') });
  const testo = testoEsito(esito);
  if (testo) console.log(testo);
  process.exit(esito.errori.length ? 1 : 0);
}

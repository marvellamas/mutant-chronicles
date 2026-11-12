// Testo di un Google Doc esportato in Markdown, senza le immagini incollate dentro.
//
// Lotto 191: accanto a `tools/estrai-docx.mjs`, che fa lo stesso lavoro per i Word di Davide.
//
// Perché serve. L'esportazione in Markdown di un Google Doc **incolla le immagini nel testo**, come definizioni di
// riferimento in coda: `[image1]: <data:image/png;base64,…>`. Sull'Armamenti 0.83 sono 775 KB di base64 su 1,2 MB
// di file — il testo vero è 452 KB. Lasciarle dentro vuol dire un file che per tre quarti non è testo, diff
// illeggibili, e ricerche che trovano una parola dentro il base64 di una figura: `righeManuale` e `celleManuale`
// non hanno modo di accorgersene, perché per loro è testo come un altro.
//
// Le definizioni si tolgono e si contano; i richiami `![][imageN]` **restano dove erano**, così si vede il posto
// dell'immagine e si può controllare se portava informazione che il testo non ha. Nel lotto 190 le quattordici
// immagini dei manuali sono risultate illustrazioni, con il profilo di gioco scritto per esteso accanto: nessuna
// tabella fotografata. Chi vede comparire un richiamo nuovo ricontrolla quello, non tutti.
//
//   node tools/estrai-doc-markdown.mjs <esportazione.md|file.json> <destinazione.md>
//
// Il file in ingresso può essere l'esportazione vera oppure il JSON che lo strumento di Drive salva quando il
// contenuto supera il limite ({ content: <testo o base64>, title, id }): in quel caso si decodifica da sé.
import { readFileSync, writeFileSync } from 'node:fs';

/** Una definizione di immagine incollata dall'esportazione: `[image3]: <data:image/png;base64,…>`. */
const DEFINIZIONE = /^\[image\d+\]: <data:image\//;

/** Il contenuto di un file: il Markdown stesso, o il JSON di Drive (con il `content` in chiaro o in base64). */
export function leggiEsportazione(percorso) {
  const grezzo = readFileSync(percorso, 'utf8');
  if (!grezzo.trimStart().startsWith('{')) return grezzo;
  const j = JSON.parse(grezzo);
  if (typeof j?.content !== 'string') throw new Error('il file non è un Markdown né un JSON di Drive con «content»');
  // un download binario arriva in base64; un export di testo arriva già in chiaro
  const pare64 = /^[A-Za-z0-9+/\r\n]+=*$/.test(j.content.slice(0, 400));
  return pare64 ? Buffer.from(j.content, 'base64').toString('utf8') : j.content;
}

/**
 * Il testo senza le immagini: { testo, immagini, richiami, byteImmagini }.
 * `immagini` sono le definizioni togliate, `richiami` i `![][imageN]` rimasti nel testo (di norma lo stesso numero:
 * se sono diversi, un'immagine è definita e non usata, o usata e non definita — vale saperlo).
 */
export function senzaImmagini(testo) {
  const righe = String(testo).replace(/\r/g, '').split('\n');
  const definizioni = righe.filter((r) => DEFINIZIONE.test(r));
  const pulito = righe.filter((r) => !DEFINIZIONE.test(r)).join('\n').replace(/\n{3,}/g, '\n\n');
  return {
    testo: pulito,
    immagini: definizioni.length,
    richiami: [...pulito.matchAll(/!\[\]\[(image\d+)\]/g)].map((m) => m[1]),
    byteImmagini: Buffer.byteLength(definizioni.join('\n')),
  };
}

/** Il testo di un'esportazione sul disco, pronto da salvare. */
export const testoDoc = (percorso) => senzaImmagini(leggiEsportazione(percorso));

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [dentro, fuori] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!dentro || !fuori) {
    console.log('Uso: node tools/estrai-doc-markdown.mjs <esportazione.md|file.json> <destinazione.md>');
    process.exit(1);
  }
  const e = testoDoc(dentro);
  writeFileSync(fuori, e.testo.endsWith('\n') ? e.testo : `${e.testo}\n`);
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`${fuori}: ${e.testo.split('\n').length} righe, ${kb(Buffer.byteLength(e.testo))}.`);
  console.log(`  immagini tolte: ${e.immagini} (${kb(e.byteImmagini)}) · richiami rimasti nel testo: ${e.richiami.length}`);
  if (e.immagini !== e.richiami.length) console.log('  ⚠ definizioni e richiami non coincidono: un\'immagine è definita e non usata, o usata e non definita.');
}

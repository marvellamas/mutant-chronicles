// Testo di un .docx, paragrafo per paragrafo (le tabelle una cella per riga).
//
// Lotto 188: i manuali Word di Davide (Mostri, Direttore, Revisione NEC, le schede) arrivano da Drive come .docx.
// Fino a oggi il testo si estraeva con uno script scritto al momento dentro la sessione, e il risultato finiva in
// `docs/manuali-txt/` con un nome senza versione. Adesso è uno strumento, così l'estrazione è la stessa ogni volta.
//
//   node tools/estrai-docx.mjs <file.docx|file.json> <destinazione.md> [--intestazione="…"]
//
// Il file in ingresso può essere il .docx vero oppure il JSON che lo strumento di Drive salva quando il contenuto
// supera il limite ({ content: <base64 del .docx>, title, id }): in quel caso si decodifica da sé.
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

/** I file dentro uno zip: { nome → Buffer }. Solo deflate e «stored», che è quello che usa un .docx. */
export function leggiZip(buf) {
  const out = new Map();
  // si parte dalla coda (End Of Central Directory), così si leggono i nomi veri e non i descrittori locali
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd -= 1;
  if (eocd < 0) throw new Error('non è uno zip (manca la fine del catalogo)');
  const quanti = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < quanti; i += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('catalogo dello zip non riconosciuto');
    const metodo = buf.readUInt16LE(p + 10);
    const compresso = buf.readUInt32LE(p + 20);
    const lunNome = buf.readUInt16LE(p + 28);
    const lunExtra = buf.readUInt16LE(p + 30);
    const lunCommento = buf.readUInt16LE(p + 32);
    const inizioLocale = buf.readUInt32LE(p + 42);
    const nome = buf.toString('utf8', p + 46, p + 46 + lunNome);
    const lnNome = buf.readUInt16LE(inizioLocale + 26);
    const lnExtra = buf.readUInt16LE(inizioLocale + 28);
    const dati = buf.subarray(inizioLocale + 30 + lnNome + lnExtra, inizioLocale + 30 + lnNome + lnExtra + compresso);
    out.set(nome, metodo === 0 ? dati : inflateRawSync(dati));
    p += 46 + lunNome + lunExtra + lunCommento;
  }
  return out;
}

const SEGNI = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };

/** Il testo di `word/document.xml`: un paragrafo per riga, una cella di tabella per riga. */
export function testoDocumentXml(xml) {
  const righe = [];
  // ogni <w:p> è un paragrafo; dentro, <w:t> porta il testo e <w:tab/> una tabulazione
  for (const p of String(xml).split(/<w:p[ >]/).slice(1)) {
    const fine = p.indexOf('</w:p>');
    const corpo = fine >= 0 ? p.slice(0, fine) : p;
    // i titoli del Word diventano titoli Markdown: `# Nome`, `## 2.1 …`. Non è cosmetica — l'importatore dei
    // Mostri riconosce una scheda proprio dal `# ` (tools/importa-mostri.mjs → eIntestazione). Senza, legge zero
    // schede e non se ne lamenta: provato il 10/11.
    const stile = corpo.match(/<w:pStyle\s+w:val="([^"]+)"/)?.[1] ?? '';
    const liv = /^Heading(\d)/i.test(stile) ? Number(RegExp.$1) : /^Title$/i.test(stile) ? 1 : 0;
    let t = '';
    // Tabulazioni e interruzioni di riga dentro un paragrafo non aggiungono spazio: è la scelta dell'estrazione del
    // 28/10, e gli importatori dei Mostri sono tarati su quella. Mettere uno spazio sembra più pulito («Corpo a
    // corpo 12 Atletica 13» invece di «Corpo a corpo 12Atletica 13») e invece cambia come l'importatore legge le
    // Abilità di due schede: provato il 10/11 sul Raptor di Fuoco. Chi la cambia rilegge i due importatori.
    for (const m of corpo.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) t += m[1];
    t = t.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&[a-z]+;/g, (s) => SEGNI[s] ?? s)
      .replace(/ /g, ' ')
      .trim();
    righe.push(t && liv ? `${'#'.repeat(liv)} ${t}` : t);
  }
  // Un paragrafo per riga, separati da una riga vuota: è la forma dell'estrazione del 28/10, quella che gli
  // importatori dei Mostri si aspettano (tools/importa-mostri.mjs, tools/importa-png-generici.mjs). Cambiarla
  // vuol dire che l'importatore legge zero schede senza dire niente: provato, il 10/11.
  return righe.map((r) => r.trim()).filter(Boolean).join('\n\n');
}

/** Il .docx da un file sul disco: il .docx stesso, o il JSON di Drive con il base64 in `content`. */
export function leggiDocx(percorso) {
  const grezzo = readFileSync(percorso);
  if (grezzo[0] === 0x50 && grezzo[1] === 0x4b) return grezzo; // «PK»: è già uno zip
  const j = JSON.parse(grezzo.toString('utf8'));
  if (!j?.content) throw new Error('il file non è un .docx né un JSON di Drive con «content»');
  return Buffer.from(j.content, 'base64');
}

/** Il testo di un .docx, pronto da salvare. */
export function testoDocx(percorso) {
  const zip = leggiZip(leggiDocx(percorso));
  const xml = zip.get('word/document.xml');
  if (!xml) throw new Error('nel .docx non c’è word/document.xml');
  return testoDocumentXml(xml.toString('utf8'));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const [dentro, fuori] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!dentro || !fuori) {
    console.log('Uso: node tools/estrai-docx.mjs <file.docx|file.json> <destinazione.md> [--intestazione="…"]');
    process.exit(1);
  }
  const intestazione = process.argv.find((a) => a.startsWith('--intestazione='))?.slice(15) ?? '';
  const testo = testoDocx(dentro);
  writeFileSync(fuori, (intestazione ? `<!-- ${intestazione} -->\n\n` : '') + testo + '\n');
  console.log(`${fuori}: ${testo.split('\n').length} righe, ${testo.length} caratteri.`);
}

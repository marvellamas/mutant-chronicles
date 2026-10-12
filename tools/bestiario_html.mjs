// Bestiario per Google Doc: docs/bestiario/bestiario.md → docs/bestiario/bestiario.html, HTML semplice (titoli,
// paragrafi, elenchi, tabelle, grassetti e corsivi; niente CSS né script), da caricare in Drive come Google Doc.
//   node tools/bestiario_html.mjs
// La conversione (blocchiHtml) la riusa anche tools/bestiario_pagina.mjs, per il testo del manuale nella pagina online.
import { readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../', import.meta.url);

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Grassetti, corsivi e codice in linea, dopo l'escape. */
const inline = (t) => esc(t.replace(/\\([\\`*_{}[\]()#+\-.!|])/g, '$1'))
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  .replace(/(^|[\s(«])\*([^*\s][^*]*?)\*(?=[\s).,;:»]|$)/g, '$1<i>$2</i>');
const celle = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const separatore = (r) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(r.trim());

/**
 * Markdown del Bestiario → blocchi HTML, uno per voce dell'array.
 * @param {string} testo contenuto di docs/bestiario/bestiario.md
 * @param {(livello: number, testo: string) => string} [idTitolo] id da dare ai titoli (per i rimandi interni)
 */
export function blocchiHtml(testo, idTitolo = null) {
  const md = testo.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < md.length) {
    const r = md[i];
    if (!r.trim()) { i++; continue; }
    const t = /^(#{1,4})\s+(.*)$/.exec(r);
    if (t) {
      const n = t[1].length;
      const testoTitolo = t[2].replace(/^\*\*(.*)\*\*$/, '$1');
      const id = idTitolo ? idTitolo(n, testoTitolo) : null;
      out.push(`<h${n}${id ? ` id="${id}"` : ''}>${inline(testoTitolo)}</h${n}>`);
      i++;
      continue;
    }
    if (r.trim().startsWith('|') && separatore(md[i + 1] ?? '')) {
      const testa = celle(r);
      const righe = [];
      i += 2;
      while (i < md.length && md[i].trim().startsWith('|')) righe.push(celle(md[i++]));
      out.push('<table border="1">', `<tr>${testa.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>`,
        ...righe.map((x) => `<tr>${x.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`), '</table>');
      continue;
    }
    if (/^\s*([*-])\s+/.test(r)) {
      out.push('<ul>');
      while (i < md.length && /^\s*([*-])\s+/.test(md[i])) out.push(`<li>${inline(md[i++].replace(/^\s*[*-]\s+/, ''))}</li>`);
      out.push('</ul>');
      continue;
    }
    if (/^\s*\d+\.\s+/.test(r)) {
      out.push('<ol>');
      while (i < md.length && /^\s*\d+\.\s+/.test(md[i])) out.push(`<li>${inline(md[i++].replace(/^\s*\d+\.\s+/, ''))}</li>`);
      out.push('</ol>');
      continue;
    }
    // paragrafo: righe consecutive non vuote che non aprono un altro blocco
    const par = [];
    while (i < md.length && md[i].trim() && !/^(#{1,4})\s|^\s*[*-]\s+|^\s*\d+\.\s+/.test(md[i]) && !(md[i].trim().startsWith('|') && separatore(md[i + 1] ?? ''))) par.push(md[i++].trim());
    out.push(`<p>${inline(par.join(' '))}</p>`);
  }
  return out;
}

if (process.argv[1]?.endsWith('bestiario_html.mjs')) {
  const out = blocchiHtml(readFileSync(new URL('docs/bestiario/bestiario.md', R), 'utf8'));
  const titolo = 'SIMPLY RPG — Bestiario (proposta)';
  writeFileSync(new URL('docs/bestiario/bestiario.html', R), `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>${titolo}</title>
</head>
<body>
${out.join('\n')}
</body>
</html>
`);
  console.log(`docs/bestiario/bestiario.html: ${out.length} blocchi`);
}

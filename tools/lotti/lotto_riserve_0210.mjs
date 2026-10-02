// Lotto 3 della ricognizione del 02/10 sera (docs/diff-manuali-2026-10-02-sera.md): riserve Batteria o
// Cariche, proprietà Esclusive o Universali (Magia §26.2, Armamenti §7.5 e §7.5.1).
// Le riserve integrate delle armi e dello scudo del §7.5.1 diventano Cariche con proprietà Esclusive: il
// manuale lo dice per nome; il funzionamento non cambia (risposta A.18). Il lotto controlla le frasi nel
// testo dei Doc salvato in docs/manuali-txt/ e scrive data/equipaggiamento/artefatti.json →
// artefatti_catalogo[].contenitore.riserva / .alimentazione.
//   node tools/lotti/lotto_riserve_0210.mjs           → controlli e prova a vuoto
//   node tools/lotti/lotto_riserve_0210.mjs --scrivi  → scrive il JSON
import { readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../../', import.meta.url);
const pulisci = (t) => String(t).replace(/\\/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ');
const arm = pulisci(readFileSync(new URL('docs/manuali-txt/armamenti.md', R), 'utf8'));
let controlli = 0;
const verifica = (cond, msg) => { if (!cond) throw new Error(`controllo: ${msg}`); controlli++; };

// §7.5.1: le cinque armi con Chroma Rosso integrato e lo Scudo delle Guardie Sacre
verifica(arm.includes('Bordone Templare, Spada Vindicator, Spada Deliverer, Lancia Castigator e Lama Demontooth possiedono un Chroma Rosso integrato da 5 PM, registrati come Cariche e sufficienti per cinque attivazioni Esclusive.'), '§7.5.1: armi a Cariche, attivazioni Esclusive');
verifica(arm.includes('Lo Scudo delle Guardie Sacre usa Cariche Rosse di pari capacità, ma un PM alimenta la proprietà Esclusiva Scudo Magico per 5 Round.'), '§7.5.1: Scudo delle Guardie Sacre a Cariche, Esclusiva');
const RIF = ['armi_corporative:bordone-templare', 'armi_corporative:spada-vindicator', 'armi_corporative:spada-deliverer',
  'armi_corporative:lancia-castigator', 'armi_corporative:lama-demontooth', 'scudi:scudo-delle-guardie-sacre'];

const p = new URL('data/equipaggiamento/artefatti.json', R);
const art = JSON.parse(readFileSync(p, 'utf8'));
for (const rif of RIF) {
  const a = art.artefatti_catalogo.find((x) => x.rif === rif);
  verifica(a?.contenitore?.integrato === true, `${rif}: riserva integrata nel catalogo`);
  a.contenitore.riserva = 'cariche';
  a.contenitore.alimentazione = 'esclusiva';
}
verifica(art.artefatti_catalogo.filter((x) => x.contenitore?.integrato).length === RIF.length, 'nessun’altra riserva integrata nel catalogo');
console.log(`${controlli} controlli superati; ${RIF.length} riserve integrate a Cariche, proprietà Esclusive`);
if (process.argv.includes('--scrivi')) {
  writeFileSync(p, `${JSON.stringify(art, null, 2)}\n`);
  console.log('scritto artefatti.json');
}

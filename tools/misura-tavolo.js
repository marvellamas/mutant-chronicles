// Lotto 220 (18/11/2026) — lo strumento con cui si misura quanto l'app costa al tavolo. NON è codice dell'app: non lo carica
// nessuna pagina; si incolla (o si carica con un <script>) nella console di una scheda aperta, e dice per un percorso di tocchi
// quanti sono i tocchi, quanti pannelli si aprono insieme, quante righe e parole bisogna leggere per decidere, quanto sono alti
// i pannelli e quanti millisecondi passano dal tocco all'ultima modifica della pagina.
//
// Come si usa (il metodo del lotto, `docs/diff-lotto220-2026-11-18.md`):
//   1. server di prova su cartelle di prova (mai la 3000, mai `personaggi/` vero): `node server.mjs --porta=3017 --solo-locale --cartella=…`;
//   2. finestra a 820 × 1180 (un tablet), scheda aperta con «Apri» (il giocatore, non «Modifica master»);
//   3. nella console: carica questo file, poi
//        await __m.esegui([{ nome: 'Attacca!', el: __m.btn(/^Attacca!$/, document.querySelector('main')) },
//                          { nome: 'Spara',     el: __m.btn(/^Spara/) }])
//      → { tocchi, pannelliSimultanei, picco: { righe, parole, altezza }, decisione, ms, log };
//   4. per confrontare con un'altra versione: `git archive <commit> | tar -x -C <cartella>`, il suo server su un'altra porta, lo
//      stesso PG, lo stesso percorso.
// Che cosa NON misura, e va detto: i secondi di una persona. Misura la latenza dell'app (sempre sotto i 150 ms nelle prove del
// lotto) e il carico di lettura (righe e parole); quanto ci mette un giocatore a leggerle e a trovare il pulsante in un pannello
// più alto della finestra si cronometra al tavolo, con un cronometro.
window.__m = (() => {
  const SEL = '.attacco-pannello,.lancio-pannello,.pannello-passi,dialog[open],.finestrella,[role=dialog],.tecnica-pannello,.panel-overlay,.modale';
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  const visibile = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const pannelli = () => [...document.querySelectorAll(SEL)].filter(visibile);
  const testo = (els) => els.map((e) => e.innerText).join('\n');
  const righe = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean);
  const parole = (t) => righe(t).join(' ').split(/\s+/).filter(Boolean).length;
  async function trova(fn, ms = 3000) { const t0 = performance.now(); while (performance.now() - t0 < ms) { const e = fn(); if (e) return e; await w(10); } return null; }
  // click + attesa che il DOM si quieti: la latenza è dal click all'ultima modifica della pagina
  async function clicca(el) {
    let ultimo = performance.now(); const mo = new MutationObserver(() => { ultimo = performance.now(); });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    const t0 = performance.now(); el.click(); ultimo = t0;
    while (performance.now() - ultimo < 120 && performance.now() - t0 < 5000) await w(10);
    mo.disconnect(); return Math.round(ultimo - t0);
  }
  // passi: [{ nome, el: () => Element|null, decisione?: true }]. «picco» = il pannello più lungo visto prima di un tocco;
  // «decisione» = quello visto prima dell'ultimo tocco (o del passo marcato `decisione`).
  async function esegui(passi) {
    const visti = new Set(pannelli()); let maxSim = 0;
    const log = []; let tocchi = 0, picco = { righe: 0, parole: 0, altezza: 0 }, decisione = null, ms = 0;
    for (let i = 0; i < passi.length; i++) {
      const p = passi[i]; const el = await trova(p.el);
      if (!el) { log.push(p.nome + ': NON TROVATO'); break; }
      const ora = pannelli().filter((x) => !visti.has(x)); const t = testo(ora);
      const r = { righe: righe(t).length, parole: parole(t), altezza: Math.round(ora.reduce((a, x) => a + x.getBoundingClientRect().height, 0)) };
      if (r.righe > picco.righe) picco = r;
      if (i === passi.length - 1 || p.decisione) decisione = decisione || r;
      const l = await clicca(el); ms += l; tocchi++; log.push(p.nome + ' (' + l + ' ms)');
      maxSim = Math.max(maxSim, pannelli().filter((x) => !visti.has(x)).length);
    }
    return { tocchi, pannelliSimultanei: maxSim, picco, decisione, ms, log };
  }
  const btn = (re, scope = document) => () => [...scope.querySelectorAll('button')].filter(visibile).find((b) => re.test(b.textContent.trim().replace(/\s+/g, ' ')));
  const tab = (nome) => () => [...document.querySelectorAll('[role=tab],nav button')].find((e) => e.textContent.trim() === nome);
  return { esegui, clicca, btn, tab, pannelli, testo, righe, parole, w, trova, visibile };
})();

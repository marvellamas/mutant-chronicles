// Lotto 1 della ricognizione del 02/10 sera (docs/diff-manuali-2026-10-02-sera.md): capacità di
// sintonizzazione 8–13, con Architetto TecnoMistico 10–15, senza requisito di Grado del personaggio
// (Magia §26.1, Armamenti §7.10, Giocatore §3.9.5, §4.4, §5.21).
// Legge il testo dei Doc salvato in docs/manuali-txt/, controlla che le tre fonti dicano gli stessi numeri
// e aggiorna:
// - data/equipaggiamento/artefatti.json → sintonizzazione: capacita_per_gradi, regola, frasi, esempio_umanita;
// - data/classi.json → testo di Architetto TecnoMistico («Capacità superiore»);
// - data/abilita.json → descrizione di Artefatti (§4.4).
//   node tools/lotti/lotto_sintonizzazione_0210.mjs           → controlli e prova a vuoto
//   node tools/lotti/lotto_sintonizzazione_0210.mjs --scrivi  → scrive i JSON
import { readFileSync, writeFileSync } from 'node:fs';

const R = new URL('../../', import.meta.url);
const leggi = (p) => readFileSync(new URL(p, R), 'utf8');
const pulisci = (t) => String(t).replace(/\\/g, '').replace(/\*\*/g, '').trim();
const scrivi = process.argv.includes('--scrivi');
let controlli = 0;
const verifica = (cond, msg) => { if (!cond) throw new Error(`controllo: ${msg}`); controlli++; };

const arm = leggi('docs/manuali-txt/armamenti.md').split('\n');
const mag = leggi('docs/manuali-txt/magia.md').split('\n');
const gio = leggi('docs/manuali-txt/giocatore.md').split('\n');
const GRADI = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/** Righe di una tabella Markdown che segue il titolo indicato: [[celle]] senza intestazione e separatore. */
function tabellaDopo(righe, titolo, intestazione) {
  const i = righe.findIndex((r) => pulisci(r).replace(/^#+\s*/, '').startsWith(titolo));
  verifica(i >= 0, `titolo «${titolo}»`);
  const j = righe.findIndex((r, k) => k > i && r.startsWith('|') && pulisci(r).includes(intestazione));
  verifica(j > i, `tabella «${intestazione}» dopo «${titolo}»`);
  const out = [];
  for (let k = j + 2; righe[k]?.startsWith('|'); k++) out.push(righe[k].split('|').slice(1, -1).map((c) => pulisci(c)));
  return { righe: out, fine: j + 2 + out.length };
}

// Armamenti §7.10: Gradi | ordinaria | Taumaturgo | Architetto
const a710 = tabellaDopo(arm, '7.10 Artefatti e sintonizzazione', 'Capacità ordinaria');
verifica(a710.righe.map((r) => r[0]).join() === GRADI.join(), 'Armamenti: righe I–VI');
const capacita = a710.righe.map((r) => Number(r[1]));
for (const r of a710.righe) {
  verifica(r[2] === r[1], `Armamenti, Grado ${r[0]}: il Taumaturgo segue la stessa progressione`);
  verifica(Number(r[3]) === Number(r[1]) + 2, `Armamenti, Grado ${r[0]}: Architetto +2`);
}
// Magia §26.1: Grado | ordinaria | Architetto
const m261 = tabellaDopo(mag, '26.1 Capacità di sintonizzazione', 'Capacità ordinaria');
verifica(JSON.stringify(m261.righe.map((r) => [r[0], Number(r[1]), Number(r[2])])) === JSON.stringify(GRADI.map((g, i) => [g, capacita[i], capacita[i] + 2])), 'Magia §26.1 = Armamenti §7.10');
verifica(JSON.stringify(capacita) === JSON.stringify([8, 9, 10, 11, 12, 13]), 'capacità 8–13');

// testo del §7.10 dopo la tabella, fino a «Stati e Sintonizzazione.»
const dopo = arm.slice(a710.fine).map(pulisci).filter(Boolean);
const regola = dopo.slice(0, dopo.findIndex((r) => r.startsWith('Stati e Sintonizzazione.'))).join(' ');
verifica(regola.startsWith('La capacità di sintonizzazione è un unico budget') && regola.includes('Parte da 8 al I Grado complessivo'), '§7.10: testo della regola');
// Magia §26.1: niente requisito di Grado; SnT invariato
const t261 = mag.slice(m261.fine).map(pulisci).filter(Boolean);
const fraseGrado = t261.find((r) => r.includes('Non occorre possedere il medesimo Grado dell’oggetto'));
verifica(fraseGrado, 'Magia §26.1: nessun requisito di Grado');
const frasi = [
  'Questa progressione sostituisce la precedente capacità ordinaria da 4 a 9.',
  'La somma degli SnT degli oggetti sintonizzati non può superare la capacità effettiva.',
  'Non occorre possedere il medesimo Grado dell’oggetto: anche un personaggio di basso Grado può usare un Artefatto potente se ne soddisfa i requisiti e dispone di sufficiente capacità.',
];
const testo261 = mag.map(pulisci).join(' ');
for (const f of frasi) verifica(testo261.includes(f), `Magia §26.1: «${f.slice(0, 40)}…»`);
// Giocatore §5.21: esempio con la nuova scala
const esempio = pulisci(gio.find((r) => pulisci(r).startsWith('Esempio. Al I Grado complessivo, UMN 8')) ?? '');
verifica(/da 8 a 4.*da 10 a 6.*capacità 5: 13 \+ 2 − 10/.test(esempio), 'Giocatore §5.21: esempio 8 → 4, 10 → 6, 13 + 2 − 10 = 5');
// Giocatore §3.9.5 e §4.4
const capSup = pulisci(gio.find((r) => pulisci(r).startsWith('Capacità superiore. Il Tecnomante')) ?? '');
verifica(capSup.includes('parte da 10') && capSup.includes('arriva a 15'), 'Giocatore §3.9.5: 10 → 15');
const art44 = pulisci(gio.find((r) => pulisci(r).startsWith('Le proprietà passive non richiedono sintonizzazione. Per utilizzare')) ?? '');
verifica(art44.includes('La capacità ordinaria ai Gradi complessivi I–VI è 8, 9, 10, 11, 12, 13'), 'Giocatore §4.4: 8–13');

// --- dati ---------------------------------------------------------------------------------------------
const pArt = new URL('data/equipaggiamento/artefatti.json', R);
const art = JSON.parse(readFileSync(pArt, 'utf8'));
art.sintonizzazione.capacita_per_gradi = capacita;
art.sintonizzazione.regola = regola;
art.sintonizzazione.frasi = frasi;
art.sintonizzazione.esempio_umanita = esempio;
art.sintonizzazione.fonte = 'Armamenti 0.58 §7.10 e Magia 1.3 §26.1 (Google Doc del 02/10/2026); Giocatore 0.45 §3.9.5, §4.4, §5.21 (Doc del 02/10/2026 08:58); lotto tools/lotti/lotto_sintonizzazione_0210.mjs';
art.versione_manuale = 'Armamenti 0.58 (Google Doc del 02/10/2026, 09:02 UTC)';

const pCla = new URL('data/classi.json', R);
const cla = JSON.parse(readFileSync(pCla, 'utf8'));
let tec = 0;
for (const c of cla.classi) for (const t of [...c.talenti_fissi, ...c.talenti_a_scelta]) {
  if (typeof t.testo !== 'string' || !t.testo.includes('Capacità superiore. Il Tecnomante')) continue;
  t.testo = t.testo.replace(/Capacità superiore\. Il Tecnomante[^\n]*/, capSup);
  tec++;
}
verifica(tec === 1, 'Architetto TecnoMistico: un testo da aggiornare');

const pAbi = new URL('data/abilita.json', R);
const abi = JSON.parse(readFileSync(pAbi, 'utf8'));
const a = abi.abilita.find((x) => x.nome === 'Artefatti');
const vecchia = 'Soltanto una proprietà che lo specifichi nella propria scheda richiede una Prova di attivazione (Manuale degli Armamenti, §7.10).';
const nuova = art44.slice(art44.indexOf(vecchia));
verifica(a.descrizione.includes(vecchia) || a.descrizione.includes(nuova), 'Artefatti: frase da estendere');
if (!a.descrizione.includes(nuova)) a.descrizione = a.descrizione.replace(vecchia, nuova);

console.log(`${controlli} controlli superati; capacità ${capacita.join(', ')} (Architetto ${capacita.map((x) => x + 2).join(', ')})`);
if (scrivi) {
  for (const [p, j] of [[pArt, art], [pCla, cla], [pAbi, abi]]) writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
  console.log('scritti artefatti.json, classi.json, abilita.json');
}

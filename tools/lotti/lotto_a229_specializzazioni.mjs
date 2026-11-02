// Lotto 162 (02/11/2026): A.229, risposta di Davide del 01/11/2026 (sezione 7 del Doc «per-davide.md»).
// «Confermo gli elenchi aggiornati del Manuale del Giocatore v0.54, del Manuale della Magia v1.11 […]. Questi elenchi
// sostituiscono A.185 nella parte che rendeva disponibili tutte e nove le Specializzazioni di Potere alle Classi
// taumaturgiche indicate.» Quindi gli elenchi per Classe sono ESATTAMENTE quelli del §8.10 del Giocatore 0.54: le 20 voci
// di Potere lasciate dentro dal lotto 155 in attesa della risposta («potere_in_attesa_a229») escono dagli elenchi di
// Custode, Invocatore, Mistico e Tecnomante e vanno fra le voci tolte («per_classe_tolte»), come Armi Inastate e Archi e
// Balestre. Per chi le ha già: la A.229 (le conserva operative, segnalate, finché il Direttore le tiene come eccezione o
// le sostituisce gratis: src/avanzamento.js → controllaSceltaTalento). «Restano valide […] le eccezioni basate sui
// requisiti posseduti»: gli accessi aperti da un Talento (accessi_da_talenti) non cambiano.
// Scrive soltanto data/specializzazioni.json. Uso: node tools/lotti/lotto_a229_specializzazioni.mjs [--scrivi]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONTE = 'Giocatore 0.54 §8.10 (Google Doc del 01/11/2026, 10:39 UTC); Magia 1.11 §1; A.229 (Davide, 01/11/2026)';

// --- gli elenchi del manuale (stesso taglio del lotto 155)
const righe = fs.readFileSync(join(R, 'docs/manuali-txt/giocatore-0.54.md'), 'utf8').split(/\r?\n/);
const i0 = righe.findIndex((r, k) => k > 1000 && r.startsWith('8.10 Cataloghi delle acquisizioni'));
if (i0 < 0) throw new Error('§8.10 non trovato nel testo del Giocatore 0.54');
const blocco = righe.slice(i0, i0 + 160).map((r) => r.replace(/\t/g, '').trim()).filter(Boolean);
const iS = blocco.findIndex((r) => r.startsWith('Specializzazioni disponibili per Classe'));
const manuale = {};
for (let k = iS; k < blocco.length && !blocco[k].startsWith('Raccordo con i nomi precedenti'); k++) {
  const m = blocco[k].match(/^(\S+) (\d+) opzioni$/);
  if (!m) continue;
  manuale[m[1]] = blocco[k + 1].replace(/\.$/, '').split(';').map((x) => x.trim()).filter(Boolean);
}

const s = JSON.parse(fs.readFileSync(join(R, 'data/specializzazioni.json'), 'utf8'));
const norma = (x) => x.normalize('NFC').replace(/[’']/g, '’').toLowerCase();
const idDiNome = new Map(s.specializzazioni.map((x) => [norma(x.nome), x.id]));
const nomeDiId = new Map(s.specializzazioni.map((x) => [x.id, x.nome]));
const potere = new Set(s.gruppi.potere);
const classi = Object.keys(s.per_classe).filter((k) => !k.startsWith('_'));

const resoconto = [];
const perClasse = {};
const tolte = Object.fromEntries(Object.entries(s.per_classe_tolte ?? {}).filter(([k]) => !k.startsWith('_')));
for (const c of classi) {
  const ids = manuale[c].map((n) => { const id = idDiNome.get(norma(n)); if (!id) throw new Error(`${c}: «${n}» non è nel catalogo`); return id; });
  const via = s.per_classe[c].filter((id) => !ids.includes(id));
  const nuove = ids.filter((id) => !s.per_classe[c].includes(id));
  if (nuove.length) throw new Error(`${c}: il manuale ha voci che l'elenco non ha (${nuove.join(', ')}): non è il caso di questo lotto`);
  const nonPotere = via.filter((id) => !potere.has(id));
  if (nonPotere.length) throw new Error(`${c}: voci non di Potere da togliere (${nonPotere.join(', ')}): non è il caso della A.229`);
  perClasse[c] = ids;
  if (via.length) {
    tolte[c] = [...new Set([...(tolte[c] ?? []), ...via])];
    resoconto.push(`${c}: ${s.per_classe[c].length} → ${ids.length}; tolte (A.229): ${via.map((id) => nomeDiId.get(id)).join(', ')}`);
  }
}
const tolteA229 = Object.values(tolte).flat().filter((id) => potere.has(id));

s.versione_manuale = 'Giocatore 0.54 (Google Doc del 01/11/2026, 10:39 UTC); Talenti v1.0 del 07/10/2026'; // la A.229 sta nelle note: la versione si legge come elenco di manuali
s.per_classe = { _nota: `${FONTE}: a ogni Grado si sceglie una Specializzazione non ancora posseduta dall’elenco della Classe appena aumentata. Gruppi già espansi. Gli elenchi sono quelli del manuale: la A.229 sostituisce la A.185 nella parte che dava ai Taumaturghi tutte e nove le Specializzazioni di Potere.`, ...perClasse };
s.per_classe_tolte = { _nota: `${FONTE}: voci che il manuale ha tolto dall’elenco della Classe. Non si offrono per una scelta nuova e un tablet non le sceglie. Chi le ha già le tiene, operative e segnalate: le voci di Potere (A.229) finché il Direttore le tiene come eccezione o le sostituisce gratis con una dell’elenco; le altre (Armi Inastate dell’Incursore, Archi e Balestre dell’Invocatore) con la stessa procedura (A.230, Davide, 02/11/2026): eccezione del Direttore o sostituzione gratuita.`, ...tolte };
delete s.potere_in_attesa_a229;

console.log(resoconto.join('\n'));
console.log(`Voci di Potere tolte: ${tolteA229.length}; elenchi: ${classi.length}`);
if (tolteA229.length !== 20) throw new Error(`attese 20 voci di Potere tolte, sono ${tolteA229.length}`);
if (process.argv.includes('--scrivi')) {
  fs.writeFileSync(join(R, 'data/specializzazioni.json'), `${JSON.stringify(s, null, 2)}\n`);
  console.log('scritto data/specializzazioni.json');
}

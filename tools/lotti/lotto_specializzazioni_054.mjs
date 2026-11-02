// Lotto 1 della ricognizione del 01/11/2026 (docs/diff-talenti-054-2026-11-01.md): elenchi delle Specializzazioni per
// Classe dal Giocatore 0.54 §8.10 (Magia 1.11 §1 per le Specializzazioni di Potere) e la voce nuova Combattimento
// Senz'Armi (§8.8.1). Scrive soltanto data/specializzazioni.json.
//
// Regole del lotto (prompt di Marcello del 01/11/2026):
//  - le voci che il manuale aggiunge entrano negli elenchi;
//  - una voce di Potere che il manuale toglie a un Taumaturgo RESTA nell'elenco: la A.185 approvata («una scelta
//    iniziale fra le nove») vale finché Davide non risponde alla A.229; le voci restano annotate in
//    «potere_in_attesa_a229», senza effetto sul calcolo;
//  - una voce non di Potere che il manuale toglie (Armi Inastate dell'Incursore, Archi e Balestre dell'Invocatore)
//    esce dall'elenco e va in «per_classe_tolte»: non si offre più per una scelta nuova, ma chi l'ha già presa la
//    tiene, con un avviso, finché Davide non risponde alla A.230 (src/avanzamento.js → controllaSceltaTalento).
//
// Uso: node tools/lotti/lotto_specializzazioni_054.mjs [--scrivi]   (senza --scrivi dice soltanto cosa cambierebbe)
//
// STORICO dal 02/11/2026 (lotto 162): la A.229 è risposta e le voci di Potere sono uscite dagli elenchi con
// tools/lotti/lotto_a229_specializzazioni.mjs. Un rilancio con --scrivi le rimetterebbe dentro: si ferma, salvo --forza.
import fs from 'node:fs';
import { bloccaRiscrittura } from './superato.mjs';
bloccaRiscrittura('lotto_specializzazioni_054.mjs');
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leggi = (f) => JSON.parse(fs.readFileSync(join(R, f), 'utf8'));
const FONTE = 'Giocatore 0.54 §8.10 (Google Doc del 01/11/2026, 10:39 UTC); Magia 1.11 §1';
const ID_NUOVA = 'specializzazione-combattimento-senz-armi';

// --- elenchi del manuale (docs/manuali-txt/giocatore-0.54.md, §8.10 «Specializzazioni disponibili per Classe»)
const righe = fs.readFileSync(join(R, 'docs/manuali-txt/giocatore-0.54.md'), 'utf8').split(/\r?\n/);
const i0 = righe.findIndex((r, k) => k > 1000 && r.startsWith('8.10 Cataloghi delle acquisizioni'));
if (i0 < 0) throw new Error('§8.10 non trovato nel testo del Giocatore 0.54');
const blocco = righe.slice(i0, i0 + 160).map((r) => r.replace(/\t/g, '').trim()).filter(Boolean);
const iS = blocco.findIndex((r) => r.startsWith('Specializzazioni disponibili per Classe'));
const manuale = {};
for (let k = iS; k < blocco.length && !blocco[k].startsWith('Raccordo con i nomi precedenti'); k++) {
  const m = blocco[k].match(/^(\S+) (\d+) opzioni$/);
  if (!m) continue;
  const voci = blocco[k + 1].replace(/\.$/, '').split(';').map((x) => x.trim()).filter(Boolean);
  if (voci.length !== Number(m[2])) throw new Error(`${m[1]}: il manuale dice ${m[2]} opzioni, l'elenco ne ha ${voci.length}`);
  manuale[m[1]] = voci;
}

const s = leggi('data/specializzazioni.json');
const classi = leggi('data/classi.json').classi.map((c) => c.nome);
const norma = (x) => x.normalize('NFC').replace(/[’']/g, '’').toLowerCase();

// --- la voce nuova (§8.8.1), subito dopo Armi da Pugno
const NUOVA = {
  id: ID_NUOVA,
  nome: 'Combattimento Senz’Armi',
  gruppo: 'armi',
  sottogruppo: 'ravvicinato',
  abilita: [],
  // la riga breve (src/talenti-testi.js → rigaBreve): dice subito che non è la Parata a Mani Nude
  riga: '+1 VA e +1 danno agli attacchi senz’armi (Corpo a corpo). Non dà Difese né la Parata a mani nude.',
  ambito: 'Attacchi senz’armi: pugni, calci, prese, lotta, immobilizzazioni e disarmi a mani nude (Abilità Corpo a corpo). È distinta da Armi da Pugno, che riguarda le armi di quella famiglia (tirapugni, guanti da combattimento). Non concede bonus alle Difese né la possibilità di parare a mani nude: la Parata a Mani Nude è dell’Addestramento al Combattimento Senz’Armi del Lottatore (I Grado) e il suo bonus del Talento Parata a Mani Nude Migliorata (A.206).',
  effetto: { va: 1, danno: 1, attacchi: 'senz_armi' },
  categoria: 'specializzazione',
  // solo i personaggi dei Talenti nuovi: la voce non esisteva con i Talenti di prima
  solo_regime_nuovo: true,
  fonte: 'Giocatore 0.54 §8.8.1, §8.10',
};
const lista = s.specializzazioni.filter((x) => x.id !== ID_NUOVA);
const iPugno = lista.findIndex((x) => x.id === 'specializzazione-armi-da-pugno');
lista.splice(iPugno + 1, 0, NUOVA);
s.specializzazioni = lista;

const idDiNome = new Map(s.specializzazioni.map((x) => [norma(x.nome), x.id]));
const nomeDiId = new Map(s.specializzazioni.map((x) => [x.id, x.nome]));
const potere = new Set(s.gruppi.potere);

// --- elenchi per Classe
const perClasse = {};
const tolte = {};
const inAttesa = {};
const resoconto = [];
for (const c of classi) {
  const man = manuale[c];
  if (!man) throw new Error(`${c}: nessun elenco nel §8.10`);
  const ids = man.map((n) => {
    const id = idDiNome.get(norma(n));
    if (!id) throw new Error(`${c}: «${n}» non è una Specializzazione del catalogo`);
    return id;
  });
  // l'elenco di prima del lotto: quello in vigore più le voci già tolte da un'esecuzione precedente (rilancio idempotente)
  const prima = [...(s.per_classe[c] ?? []), ...(s.per_classe_tolte?.[c] ?? [])];
  const aggiunte = ids.filter((id) => !prima.includes(id));
  const via = prima.filter((id) => !ids.includes(id));
  const viaPotere = via.filter((id) => potere.has(id));
  const viaAltre = via.filter((id) => !potere.has(id));
  perClasse[c] = [...ids, ...viaPotere];
  if (viaPotere.length) inAttesa[c] = viaPotere;
  if (viaAltre.length) tolte[c] = viaAltre;
  if (aggiunte.length || via.length) resoconto.push(`${c}: ${prima.length} → ${perClasse[c].length}; + ${aggiunte.map((id) => nomeDiId.get(id)).join(', ') || '—'}${viaPotere.length ? `; Potere lasciate (A.229): ${viaPotere.map((id) => nomeDiId.get(id)).join(', ')}` : ''}${viaAltre.length ? `; tolte (A.230): ${viaAltre.map((id) => nomeDiId.get(id)).join(', ')}` : ''}`);
}

s.versione_manuale = 'Giocatore 0.54 (Google Doc del 01/11/2026, 10:39 UTC); Talenti v1.0 del 07/10/2026';
s.per_classe = { _nota: `${FONTE}: a ogni Grado si sceglie una Specializzazione non ancora posseduta dall’elenco della Classe appena aumentata. Gruppi già espansi. Le voci di Potere che il manuale toglie ai Taumaturghi restano finché vale la A.185 (vedi «potere_in_attesa_a229»).`, ...perClasse };
s.per_classe_tolte = { _nota: `${FONTE}: voci che il manuale ha tolto dall’elenco della Classe. Non si offrono per una scelta nuova; chi le ha già scelte le tiene, con un avviso, finché il Direttore non decide (A.230).`, ...tolte };
s.potere_in_attesa_a229 = { _nota: `${FONTE}: Specializzazioni di Potere che il manuale non elenca più per queste Classi. Restano negli elenchi perché la A.185 approvata dice «una scelta iniziale fra le nove»: si tolgono solo se Davide risponde così alla A.229. Solo informazione: il calcolo non le legge.`, ...inAttesa };
s.gruppi.ravvicinate = [...new Set([...s.gruppi.ravvicinate, ID_NUOVA])];
s.attesi = { _nota: `${FONTE}: catalogo complessivo di 87 Specializzazioni (86 del documento del 7/10 più Combattimento Senz’Armi).`, specializzazioni: 87 };
if (s.specializzazioni.length !== 87) throw new Error(`Specializzazioni: ${s.specializzazioni.length}, attese 87`);

console.log(resoconto.join('\n'));
console.log(`Specializzazioni: ${s.specializzazioni.length}; Classi: ${Object.keys(perClasse).length}; tolte: ${JSON.stringify(tolte)}; Potere in attesa: ${Object.values(inAttesa).flat().length}`);
if (process.argv.includes('--scrivi')) {
  fs.writeFileSync(join(R, 'data/specializzazioni.json'), `${JSON.stringify(s, null, 2)}\n`);
  console.log('scritto data/specializzazioni.json');
}

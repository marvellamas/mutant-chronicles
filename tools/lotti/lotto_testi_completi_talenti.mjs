// Talenti v1.0 (25/10/2026, notte): il testo completo di ogni Talento, dal manuale, per il riquadro «Da scegliere»
// (il nome si tocca e apre la scheda intera). Confronto del 25/10: il corpo era completo per quasi tutti, ma
//  - mancava la riga d'intestazione della scheda (tipo, requisiti, quante volte si acquisisce) in quasi tutti i Talenti
//    del §8.6; nei Talenti di magia stava invece dentro il testo;
//  - Successo Magistrale Migliorato era la versione di prima (mancavano le due frasi sul VA finale 21).
// Il lotto riporta nei dati, per ogni Talento che ha la sua scheda nel Manuale del Giocatore (docs/manuali-txt/
// giocatore.md) o nei Talenti magici e mistici (docs/manuali-txt/talenti-magici-mistici.md):
//  - `testo`: il corpo della scheda, parola per parola (paragrafi separati da «\n»);
//  - `intestazione`: la riga del tipo e delle condizioni («Passivo. Nessun prerequisito. Acquisibile una sola volta.»).
// Le voci nuove o cambiate dal file dei Talenti del 7/10 (docs/talenti-nuovi-v1.0.txt) tengono il loro testo, che viene
// da quel file; la loro intestazione è presa dalle frasi del file (INTESTAZIONI_7_10).
//   node tools/lotti/lotto_testi_completi_talenti.mjs            mostra che cosa cambierebbe
//   node tools/lotti/lotto_testi_completi_talenti.mjs --scrivi   scrive data/talenti_liberi.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RADICE = fileURLToPath(new URL('../../', import.meta.url));
const FILE = `${RADICE}data/talenti_liberi.json`;
const gio = readFileSync(`${RADICE}docs/manuali-txt/giocatore.md`, 'utf8');
const mag = readFileSync(`${RADICE}docs/manuali-txt/talenti-magici-mistici.md`, 'utf8');

// file del 7/10, «Le Maestrie che riuniscono più capacità» e «Altri adeguamenti»: le frasi sulle condizioni della voce
const MAESTRIA_RIUNITA = 'Maestria. Si acquisisce una sola volta e occupa una scelta di Maestria. Restano le regole e le incompatibilità della manovra utilizzata.';
export const INTESTAZIONI_7_10 = {
  'preparazione-rapida': MAESTRIA_RIUNITA,
  'ricarica-esperta': MAESTRIA_RIUNITA,
  'raffiche-migliorate': MAESTRIA_RIUNITA,
  'maestria-tiro-ravvicinato-migliorato': MAESTRIA_RIUNITA,
  'maestria-immobilizzare-migliorato': MAESTRIA_RIUNITA,
  'maestria-hacker': 'Maestria passiva, acquisibile una sola volta, senza prerequisiti aggiuntivi.',
  'maestria-arti-marziali-migliorate': 'Maestria con requisito Arti Marziali oppure Addestramento al Combattimento Senz’Armi del Lottatore. Il requisito alternativo consente l’accesso e non assegna anche il dado di danno di Arti Marziali.',
  'potenziale-mistico-migliorato': 'Talento Libero, con requisito Usufruitore di Magia e fino a cinque acquisizioni.',
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pulisci = (s) => s.replace(/\\([+\-*_.()[\]#!])/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1').replace(/[ \t]+\n/g, '\n').trim();

/** La scheda di un Talento nel manuale: { intestazione, corpo } o null. */
export function schedaDelManuale(nome) {
  for (const testo of [gio, mag]) {
    const m = new RegExp(`\\n#{2,5} (?:\\*\\*)?${esc(nome)}(?:\\*\\*)?[ \\t]*\\n`).exec(testo);
    if (!m) continue;
    const resto = testo.slice(m.index + m[0].length);
    const fine = resto.search(/\n#{1,5} /);
    const righe = pulisci(fine >= 0 ? resto.slice(0, fine) : resto).split(/\n+/).map((r) => r.trim()).filter((r) => r && !r.startsWith('|'));
    const intest = [];
    while (righe.length && /^(Tipo|Passivo|Attivo|Reazione|Requisit|Prerequisit|Nessun prerequisito|Acquisibile|Acquisizione)/i.test(righe[0])) intest.push(righe.shift());
    return { intestazione: intest.join(' ').replace(/\s+/g, ' ').trim(), corpo: righe.join('\n') };
  }
  return null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) esegui();

function esegui() {
const scrivi = process.argv.includes('--scrivi');
const j = JSON.parse(readFileSync(FILE, 'utf8'));
const cambiati = [];
const senza = [];
for (const t of j.talenti.filter((x) => x.categoria !== 'superato')) {
  if (INTESTAZIONI_7_10[t.id] || t.fonte_regole === 'talenti_nuovi') {
    const i = INTESTAZIONI_7_10[t.id];
    if (i && t.intestazione !== i) { t.intestazione = i; cambiati.push(`${t.nome}: intestazione dal file del 7/10`); }
    continue;
  }
  const s = schedaDelManuale(t.nome);
  if (!s || !s.corpo) { senza.push(t.nome); continue; }
  if (s.intestazione && t.intestazione !== s.intestazione) { t.intestazione = s.intestazione; cambiati.push(`${t.nome}: intestazione`); }
  if (t.testo !== s.corpo) { t.testo = s.corpo; cambiati.push(`${t.nome}: testo come nel manuale`); }
}
console.log(`${cambiati.length} modifiche`);
for (const c of cambiati.filter((x) => /testo/.test(x))) console.log(`  ${c}`);
if (senza.length) console.log(`Senza scheda nel manuale (lasciati com'erano): ${senza.join(', ')}`);
if (scrivi) writeFileSync(FILE, `${JSON.stringify(j, null, 2)}\n`);
else console.log('(nessun file scritto: aggiungi --scrivi)');
}

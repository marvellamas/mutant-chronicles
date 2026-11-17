// Lotto 210 (17/11/2026), parte D — **il testo del progetto «Paradise» descrive l'arma vera.**
//
// Il progetto descriveva il piano di prima: «preparare la scheggia Verde… e metterla al posto del frammento Viola…» su una
// CyberArma «originale di Park». Ma Armamenti 0.86 §7.25.4 e l'E&L dell'11/11 (A.271) dicono che il Verde **è già
// installato**: «Dimitri ha sostituito il frammento Viola dell'esemplare recuperato da Park con la propria scheggia Verde
// stabilizzata… È installato soltanto il focalizzatore Verde. Il modulatore neurale, il SIN, le forme alternative, la riserva
// interna e la conversione a NeC restano interventi futuri… Il piano prevedeva anche una terza giornata, non compresa nella
// configurazione attuale». Non cambia nessun numero (giorni, prove, ore, risorse restano), ma lo legge Davide prima di
// consegnare, ed è il momento sbagliato per leggere una cosa falsa.
//
// Dice ora: i giorni 1 e 2 descrivono il lavoro **già compreso nella configurazione attuale**; resta da fare il giorno 3
// (modulo SIN, forma, collaudo). Il frammento Viola non è più nell'esemplare, e dove sia non è scritto (A.246).
// Tolta anche una regola scritta due volte (la sull'alimentazione).
//
//   node tools/lotti/lotto_210_paradise.mjs            — che cosa cambierebbe
//   node tools/lotti/lotto_210_paradise.mjs --scrivi   — applica (idempotente)
import { readFileSync, writeFileSync } from 'node:fs';
import { fermaSeSconosciuti, ARGOMENTI } from '../argomenti.mjs';

const FILE = 'data/equipaggiamento/armi.json';
const FONTE = 'Armamenti 0.86 §7.25.4; E&L 11/11/2026 (A.271)';

export const TESTI = {
  inizio: 'Sulla CyberArma di Dimitri, l’esemplare recuperato da Park, che ha già il focalizzatore Verde al posto del Viola: la scheggia Verde stabilizzata è installata (§7.25.4: «È installato soltanto il focalizzatore Verde»). I giorni 1 e 2 qui sotto sono quel lavoro, già compreso nella configurazione attuale; resta da fare il giorno 3: recuperare e integrare il modulo SIN della spada Cybertronic, personalizzare la forma e collaudare.',
  giorno1: 'Studio e progetto (già compreso nella configurazione attuale, §7.25.4)',
  giorno2: 'Preparazione della scheggia Verde, sostituzione del Viola e collaudo (già eseguiti: il Verde è installato, §7.25.4)',
  giorno3: 'Da fare: recupero e integrazione del modulo SIN dalla spada Cybertronic, personalizzazione della forma e collaudo finale (§7.25.4: «non compresa nella configurazione attuale»)',
  scheggia: 'È il focalizzatore già installato al posto del Viola (§7.25.3, §7.25.4): scheggia Verde stabilizzata, componente integrato dell’arma, nessuna riserva di PM, nessuna SnT in più. Se nell’inventario di Dimitri ci sono ancora schegge Verdi, nessuna si toglie da sola: una potrebbe essere quella integrata, e lo decide il Direttore. Si lavora scarica; un semplice fallimento non la distrugge.',
  viola: 'Il frammento Viola è già stato rimosso dall’esemplare di Park (§7.25.4: «La Corruzione 1 era legata al frammento rimosso»). Dove sia oggi non è scritto: se entra nell’inventario come oggetto separato, con le sue conseguenze (Corruzione) e la necessità di contenimento, lo decide il Direttore (A.231, A.246).',
  regola: 'Il focalizzatore Verde è già installato (§7.25.4, A.271): la consegna aggiunge il modulo SIN e la forma, non lo sostituisce di nuovo e non estrae un frammento Viola dall’arma.',
};

export function piano(radice = '.') {
  const json = JSON.parse(readFileSync(`${radice}/${FILE}`, 'utf8'));
  const v = (json.oggetti ?? []).find((o) => o.id === 'cyberarma');
  const p = (v?.progetti ?? []).find((x) => x.id === 'paradise-dimitri');
  if (!p) throw new Error('progetto «paradise-dimitri» non trovato in armi.json');
  const dopoPrimaFrase = (testo) => String(testo ?? '').replace(/^.*?Configurazione a PM personali/s, 'Configurazione a PM personali');
  const voluto = {
    descrizione: `${TESTI.inizio} ${dopoPrimaFrase(p.descrizione.startsWith(TESTI.inizio) ? p.descrizione.slice(TESTI.inizio.length + 1) : p.descrizione)}`,
  };
  const cambi = [];
  if (p.descrizione !== voluto.descrizione) cambi.push('descrizione');
  const g = (n) => p.giorni.find((x) => x.n === n);
  if (g(1).lavoro !== TESTI.giorno1) cambi.push('giorno 1');
  if (g(2).lavoro !== TESTI.giorno2) cambi.push('giorno 2');
  if (g(3).lavoro !== TESTI.giorno3) cambi.push('giorno 3');
  if (p.componenti.find((c) => c.id === 'scheggia').nota !== TESTI.scheggia) cambi.push('componente scheggia');
  if (p.componenti.find((c) => c.id === 'viola').nota !== TESTI.viola) cambi.push('componente viola');
  const doppie = p.regole.length - new Set(p.regole).size;
  if (doppie) cambi.push(`${doppie} regola/e scritta/e due volte`);
  if (!p.regole.includes(TESTI.regola)) cambi.push('regola sul Verde già installato');
  if (!p.aggiornato_lotto_210) cambi.push('marca del lotto');
  return { json, p, voluto, cambi };
}

export function applica({ p, voluto }) {
  p.descrizione = voluto.descrizione;
  const g = (n) => p.giorni.find((x) => x.n === n);
  g(1).lavoro = TESTI.giorno1;
  g(2).lavoro = TESTI.giorno2;
  g(3).lavoro = TESTI.giorno3;
  p.componenti.find((c) => c.id === 'scheggia').nota = TESTI.scheggia;
  p.componenti.find((c) => c.id === 'viola').nota = TESTI.viola;
  p.regole = [...new Set(p.regole)];
  if (!p.regole.includes(TESTI.regola)) p.regole.push(TESTI.regola);
  p.aggiornato_lotto_210 = { quando: '2026-11-17', fonte: FONTE, nota: 'Solo il testo: giorni, prove, ore e risorse non cambiano.' };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['lotto_210_paradise.mjs'], 'lotto_210_paradise.mjs');
  const x = piano();
  if (!x.cambi.length) { console.log('Niente da cambiare: il testo del progetto è già quello vero.'); process.exit(0); }
  for (const c of x.cambi) console.log(`- ${c}`);
  if (!argv.includes('--scrivi')) { console.log('\n(dry-run: --scrivi per applicare)'); process.exit(0); }
  applica(x);
  writeFileSync(FILE, `${JSON.stringify(x.json, null, 1)}\n`);
  console.log(`\nScritto ${FILE}.`);
}

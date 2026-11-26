// Lotto 250 — IL RIPASSO: ogni comando liberato dal 241 al 249, premuto nella pagina vera.
//
// Sola lettura sulle cartelle vere: lavora su una copia temporanea dei PG d'esempio del repo.
//
// Per ogni comando dice tre cose che il motore non può dire:
//   1. il clic ha lasciato un errore in console o un'eccezione non gestita? (il difetto del 249)
//   2. è cambiato qualcosa **su disco**? (non in memoria: la lezione del 207)
//   3. l'avviso è arrivato al **diario del Direttore**? (il posto solo del 249; solo per i comandi con un avviso)
//
// Uso: node tools/ripassa-clic.mjs [--solo=id,id] [--verboso]
// Senza un browser sul PC si ferma e lo dice: un ripasso che passa in silenzio senza aver premuto niente
// sarebbe il difetto che questo strumento deve trovare.
import { readdirSync, copyFileSync, readFileSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { fermaSeSconosciuti } from './argomenti.mjs';
import { BROWSER, apriApp, cartelleDiProva } from '../tests/browser-vero.js';
import { personaggiDellaCartella } from './personaggi-cartella.mjs';
import { preparaTutto } from '../tests/preparazione-tavolo.js';

fermaSeSconosciuti('ripassa-clic.mjs', process.argv.slice(2));
const arg = (n) => process.argv.slice(2).find((x) => x.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? null;
const SOLO = (arg('solo') ?? '').split(',').filter(Boolean);
const VERBOSO = process.argv.includes('--verboso');
// `--tablet`: lo stesso ripasso dal lato del giocatore (il server non è il suo PC). **Il disco non si guarda**, e
// il motivo va scritto: da un tablet una modifica si **accoda** (src/giornale.js) e il file lo scrive il rientro,
// quindi «INVARIATO» sarebbe come è fatta l'app e non un difetto. Quello che conta qui è che il clic non lasci un
// errore e che l'avviso arrivi al diario del Direttore anche da un tablet.
const TABLET = process.argv.includes('--tablet');
// `--senza-preparazione`: il giro del 250, senza costruire scontro, arma e mezzo (più corto, e sette casi non si provano)
const SENZA_PREP = process.argv.includes('--senza-preparazione');

if (!BROWSER) {
  console.error('Nessun browser (Edge/Chrome) trovato: il ripasso non si può fare, e non si finge.');
  console.error('MUTANT_BROWSER=<percorso dell’eseguibile> per indicarlo.');
  process.exit(2);
}

// ---------------------------------------------------------------------------------------------- i casi del ripasso
// `lotto` dice da dove viene la liberazione; `avviso: true` se il comando deve lasciare una voce nel diario.
const CASI = [
  // ---------- i due che si fanno decine di volte a serata (parte B del lotto 251)
  {
    id: 'danno-applicato', lotto: 246, pagina: 'plancia', nome: 'Il danno applicato a un nemico («Colpito» della plancia)', avviso: null,
    // il bersaglio in campo e lo scontro aperto li costruisce la preparazione (parte A); senza, il 250 non lo provava
    senzaCambio: true,
    atteso: 'il nemico perde PV e la riga resta nel registro dello scontro',
    fai: async (p) => {
      const pv = await p.valuta(`const b = [...document.querySelectorAll('.btn-colpito')][0]; if (!b) return 'nessun bersaglio in campo';`
        + ` const c = b.closest('article, li, section'); const t = c ? c.innerText : ''; b.click(); return t.replace(/\\s+/g, ' ').slice(0, 60)`);
      if (pv === 'nessun bersaglio in campo') return pv;
      await p.dormi(1200);
      const scritto = await p.valuta(`const i = document.querySelector('dialog[open] input[type=number].input-d10'); if (!i) return false;`
        + ` i.value = '7'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return true`);
      if (!scritto) return 'la finestra «Colpito» non ha il campo del danno';
      await p.dormi(600);
      const applica = await p.clicIn('dialog[open]', /^Applica/);
      if (!applica) return 'nessun «Applica» nella finestra';
      await p.dormi(1500);
      return 'applicato';
    },
    cambia: () => true,
  },
  {
    id: 'movimento', lotto: 247, nome: 'Il movimento del PG sulla mappa, dalla scheda',
    // la voce nel diario si pretende **solo se l'avviso è comparso**: al proprio turno non c'è irregolarità, e
    // chiedere la voce sarebbe un rosso finto (la regola del 249 vale per i «Procedi comunque», non per i turni giusti)
    avviso: (fatto) => /fuori turno/.test(String(fatto)),
    dove: (p) => p.tab('combattimento'),
    senzaCambio: true,
    atteso: 'apre la mappa dello scontro (fuori turno con l’avviso) e lascia la riga',
    fai: async (p) => {
      // la scheda scopre lo scontro dal server a intervalli (src/ui/app.js): si aspetta il riquadro, invece di
      // guardare una volta sola e dire che non c'e'
      for (let k = 0; k < 16; k += 1) {
        if (await p.valuta(`return !!document.querySelector('.scontro-in-corso')`)) break;
        await p.dormi(700);
      }
      const riquadro = await p.valuta(`const r = document.querySelector('.scontro-in-corso'); return r ? r.innerText.replace(/\\s+/g, ' ').slice(0, 90) : 'nessun riquadro «Scontro in corso»'`);
      if (riquadro.startsWith('nessun')) return riquadro;
      const b = await p.valuta(`const b = document.querySelector('.btn-muovi-mappa'); if (!b) return 'nessun pulsante «Muovi»'; if (b.disabled) return 'il pulsante è SPENTO'; b.click(); return 'premuto'`);
      if (b !== 'premuto') return b;
      await p.dormi(900);
      // fuori turno l’app chiede conferma: si procede, ed è la strada vera
      const fuoriTurno = await p.valuta(`const x = [...document.querySelectorAll('dialog button')].find((y) => /Procedi comunque/.test(y.textContent)); if (!x) return false; x.click(); return true`);
      await p.dormi(1800);
      const dove = await p.valuta(`return location.hash.indexOf('#/mappa') === 0 ? 'mappa aperta' : 'la mappa non si è aperta: ' + location.hash`);
      return fuoriTurno ? (dove + ' · fuori turno, procedi comunque') : (dove + ' · al suo turno, senza avviso');
    },
    cambia: () => true,
  },
  // ---------- le cinque azioni di ogni sera
  {
    id: 'pv-meno', lotto: 246, nome: 'PV: il tastino «−1» della colonna', avviso: false,
    dove: (p) => p.tab('combattimento'),
    fai: async (p) => p.clicIn('.colonna-risorse', /^−1$/),
    cambia: (prima, dopo) => prima.sessione?.pvAttuali !== dopo.sessione?.pvAttuali,
  },
  {
    id: 'pv-al-massimo-dice-perche', lotto: 246, nome: 'PV al massimo: «+5» spento deve dire perché A VISTA', avviso: false,
    dove: (p) => p.tab('combattimento'),
    senzaCambio: true,
    atteso: 'il motivo si legge sullo schermo, non solo nel suggerimento del mouse',
    // la quarta verifica del lotto 251, dal difetto dei Distintivi del 250: su un tablet il `title` non esiste.
    fai: async (p) => {
      // prima si portano i PV al massimo premendo «+5» finché si può: è il presupposto, e lo costruisce il comando
      await p.valuta(`const c = document.querySelector('.colonna-risorse'); for (let i = 0; i < 12; i += 1) { const b = [...c.querySelectorAll('button')].find((x) => x.textContent.trim() === '+5' && !x.disabled); if (!b) break; b.click(); } return 1`);
      await p.dormi(900);
      return p.motivoAVista('/^\\+5$/');
    },
    cambia: () => true,
  },
  {
    id: 'ricarica', lotto: 246, pg: 'Rhea-Valdis', nome: 'Ricarica / Cambia caricatore', avviso: null,
    dove: (p) => p.tab('combattimento'),
    fai: async (p) => p.clic(/^(Ricarica|Cambia caricatore|Cambia cella|Cambia pacco)$/),
    cambia: (a, b) => JSON.stringify(a.sessione?.munizioni ?? {}) !== JSON.stringify(b.sessione?.munizioni ?? {}),
  },
  {
    id: 'lancio', lotto: 246, pg: 'Fratello-Anselmo-Viri', nome: 'Lancia! con i PM pagati', avviso: null,
    dove: (p) => p.tab('poteri'),
    fai: async (p) => {
      if (!await p.clic(/^Lancia!$/)) return 'nessun incantesimo da lanciare';
      await p.attendi(`return !!document.querySelector('.lancio-pannello')`, 'il pannello del lancio');
      return p.clicIn('.lancio-pannello', /^Lancia( comunque)? \(/);
    },
    cambia: (a, b) => a.sessione?.pmAttuali !== b.sessione?.pmAttuali,
  },
  {
    id: 'attacco', lotto: 246, nome: 'Attacca! fino al tiro', avviso: null,
    dove: (p) => p.tab('combattimento'),
    fai: async (p) => {
      if (!await p.clic(/^Attacca!$/)) return 'nessuna arma in mano';
      await p.attendi(`return !!document.querySelector('.attacco-pannello')`, 'il pannello d’attacco');
      // il pannello non scrive nel file: il clic che conta è «Spara»/«Colpisci», che registra i colpi
      return p.clicIn('.attacco-pannello', /^(Spara|Colpisci|Attacca)( comunque)?/);
    },
    cambia: (a, b) => JSON.stringify(a.sessione ?? {}) !== JSON.stringify(b.sessione ?? {}),
  },
  // ---------- i comandi che il 249 ha trovato rotti, e i loro vicini
  {
    id: 'sposta-punti-giocatore', lotto: 247, nome: 'Sposta i punti (il difetto del 249)', avviso: true,
    dove: (p) => p.tab('identita'),
    fai: async (p) => {
      if (!await p.clic(/^Sposta i punti$/)) return 'nessun punto da spostare';
      await p.attendi(`return !!document.querySelector('.finestrella-sposta')`, 'il pannello degli spostamenti');
      // il «−» e il «+» si riconoscono dall'aria-label, non dalla posizione: il primo pulsante della riga è il «+»,
      // e premendo quello il totale non cambiava, «Conferma» restava spento e il ripasso diceva «non trovata».
      const tolto = await p.valuta(`const b = [...document.querySelectorAll('.finestrella-sposta button')].find((x) => /^Togli un punto da /.test(x.getAttribute('aria-label') || '') && !x.disabled); if (!b) return 'nessun punto da togliere'; const dove = b.getAttribute('aria-label'); b.click(); return dove`);
      if (/nessun/.test(tolto)) return tolto;
      await p.dormi(400);
      const nomeTolto = JSON.stringify(String(tolto).replace(/^Togli un punto da /, ""));
      const messo = await p.valuta(`const da = ${nomeTolto}; const b = [...document.querySelectorAll('.finestrella-sposta button')].find((x) => /^Metti un punto in /.test(x.getAttribute('aria-label') || '') && x.getAttribute('aria-label').replace(/^Metti un punto in /, '') !== da); if (!b) return 'nessuna riga dove metterlo'; b.click(); return b.getAttribute('aria-label')`);
      if (/nessuna/.test(messo)) return messo;
      await p.dormi(500);
      if (!await p.clicIn('.finestrella-sposta', /^Conferma$/)) return 'Conferma ancora SPENTO dopo lo spostamento';
      await p.dormi(700);
      // l'avviso chiede conferma: si procede (è la strada vera, quella del tavolo)
      await p.valuta(`const b = [...document.querySelectorAll('dialog button')].find((x) => /Procedi comunque|Forza/.test(x.textContent)); if (b) b.click(); return 1`);
      await p.dormi(600);
      return 'confermato';
    },
    cambia: (a, b) => JSON.stringify(a.livelli ?? null) !== JSON.stringify(b.livelli ?? null)
      || JSON.stringify(a.scelte?.abilita ?? null) !== JSON.stringify(b.scelte?.abilita ?? null),
  },
  {
    id: 'distintivi-pe', lotto: 246, pg: 'Aiko-Tenzan', nome: 'Conversione dei Distintivi in Punti Eroe', avviso: null,
    dove: (p) => p.tab('identita'),
    // Aiko ha 0 Distintivi: il conto non torna e il pulsante non cambia niente — allora deve **dire perché**
    // (la riga di mezzo del 246). Prima non diceva niente e il motivo stava nel solo `title`: lo ha trovato
    // questo ripasso, ed è la correzione del lotto 250.
    senzaCambio: true,
    atteso: 'dice perché non si può',
    fai: async (p) => {
      const premuto = await p.clic(/→ 1 PE$/);
      if (!premuto) return false;
      await p.dormi(400);
      return p.valuta(`return /Non basta|non si applica/.test(document.body.innerText) ? 'dice perché' : 'muto'`);
    },
    cambia: (a, b) => a.sessione?.puntiEroe !== b.sessione?.puntiEroe || a.sessione?.distintivi !== b.sessione?.distintivi,
  },
  {
    id: 'circostanza-piu', lotto: 246, nome: 'Bonus di circostanza, «+1» di una riga', avviso: false,
    dove: (p) => p.tab('combattimento'),
    // il riquadro è `.riga-circostanza` (il 250 cercava `.riquadro-circostanze`, che non esiste)
    fai: async (p) => p.clicIn('.riga-circostanza', /^\+1$/),
    cambia: (a, b) => JSON.stringify(a.sessione?.circostanze ?? {}) !== JSON.stringify(b.sessione?.circostanze ?? {}),
  },
  {
    id: 'temporaneo-caratteristica', lotto: 246, nome: 'Modificatore temporaneo di una Caratteristica', avviso: false,
    dove: (p) => p.tab('identita'),
    fai: async (p) => p.valuta(`
      const r = [...document.querySelectorAll('.controllo-temporaneo, .temporaneo-caratteristica')];
      const b = r.flatMap((x) => [...x.querySelectorAll('button')]).find((x) => x.textContent.trim() === '+' && !x.disabled);
      if (!b) return 'nessun controllo temporaneo';
      b.click(); return 'premuto'`),
    cambia: (a, b) => JSON.stringify(a.sessione?.temporanei ?? {}) !== JSON.stringify(b.sessione?.temporanei ?? {}),
  },
  {
    id: 'stato-attiva', lotto: 246, nome: 'Uno Stato acceso dalla scheda', avviso: false,
    dove: (p) => p.tab('combattimento'),
    // le caselle stanno in `.stati-compatti` (il 250 cercava due classi che non esistono) e si accende **uno spento**:
    // quello della preparazione è già acceso, e spegnerlo proverebbe un'altra cosa
    fai: async (p) => p.valuta(`const l = [...document.querySelectorAll('.stati-compatti input[type=checkbox]')].filter((x) => !x.checked);
      if (!l.length) return 'nessuno Stato da accendere';
      l[0].click(); return 'acceso'`),
    cambia: (a, b) => JSON.stringify(a.sessione?.stati ?? []) !== JSON.stringify(b.sessione?.stati ?? []),
  },
  {
    id: 'usi-talento', lotto: 246, pg: 'Torvald-Krane', nome: 'Un uso di Talento consumato', avviso: false,
    dove: (p) => p.tab('combattimento'),
    // il riquadro è `.riquadro-usi-talenti` (il 250 cercava `.riquadro-usi`)
    fai: async (p) => p.clicIn('.riquadro-usi-talenti', /^(Usa|Consuma|\d)/),
    cambia: (a, b) => JSON.stringify(a.sessione?.usiTalenti ?? {}) !== JSON.stringify(b.sessione?.usiTalenti ?? {}),
  },
  {
    id: 'ripara-oggetto', lotto: 246, nome: 'PI di un oggetto: Ripara', avviso: false,
    dove: (p) => p.tab('inventario'),
    // «Ripara» compare solo su un oggetto danneggiato: il presupposto lo costruisce il comando stesso, togliendo
    // un PI con il tastino della riga (è quello che farebbe il giocatore al tavolo)
    fai: async (p) => {
      const meno = await p.valuta(`const b = [...document.querySelectorAll('button')].find((x) => /^Togli 1 PI/.test(x.getAttribute('aria-label') || '') && !x.disabled);
        if (!b) return false; b.click(); return true`);
      if (!meno) return 'nessun oggetto con i PI da togliere';
      await p.dormi(900);
      if (!await p.clic(/^Ripara$/)) return 'nessun «Ripara» dopo il danno';
      await p.dormi(900);
      return 'riparato';
    },
    cambia: (a, b) => JSON.stringify(a.sessione?.integrita ?? {}) !== JSON.stringify(b.sessione?.integrita ?? {}),
  },
  {
    id: 'passo-creazione', lotto: 248, nome: 'Un passo della creazione che dipende da una scelta non fatta', avviso: false,
    soloNuovo: true,
    fai: async (p) => {
      await p.valuta(`const b = [...document.querySelectorAll('button')].find((x) => /^Nuovo personaggio$/.test(x.textContent.trim())); if (b) b.click(); return 1`);
      await p.attendi(`return /#\\/p\\//.test(location.hash)`, 'il wizard');
      await p.dormi(400);
      const esito = await p.valuta(`
        const b = [...document.querySelectorAll('.passo-link')].find((x) => /Scegli prima/.test(x.title || ''));
        if (!b) return 'nessun passo con un requisito';
        if (b.disabled) return 'il passo è ancora SPENTO';
        b.click(); return 'aperto';`);
      if (esito !== 'aperto') return esito;
      await p.dormi(500);
      return p.valuta(`return /Scegli prima/.test(document.body.innerText) ? 'aperto e dice che cosa manca' : 'aperto ma non dice niente'`);
    },
    cambia: () => true,
    senzaCambio: true,
    atteso: 'il passo si apre e dice che cosa scegliere prima',
  },
];

// ---------------------------------------------------------------------------------------------- il ripasso
const { base, cartella, cartelle } = cartelleDiProva('mutant-ripassa-250-');
const esempi = new URL('../esempi/', import.meta.url);
for (const f of readdirSync(esempi).filter((x) => x.endsWith('.json'))) {
  copyFileSync(new URL(f, esempi), join(cartella, f));
  // **la data del file copiato va indietro**: appena copiato sarebbe più recente della modifica fatta nella
  // pagina, e alla sincronizzazione l'app farebbe vincere la cartella scartando la modifica («vince la più
  // recente, con un avviso»). Senza questo il ripasso vedrebbe «INVARIATO» su ogni comando, per una ragione
  // che non è un difetto dell’app: sarebbe il ripasso stesso a essere verde-per-la-ragione-sbagliata.
  const vecchia = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  utimesSync(join(cartella, f), vecchia, vecchia);
}
// il PG del ripasso è quello che la preparazione attrezza: arma a caricatore in mano, uno Stato, un mezzo (lotto 251)
const nomeFile = readdirSync(cartella).find((f) => f.startsWith('Rhea')) ?? readdirSync(cartella)[0];
const nomePg = nomeFile.split('_')[0];
// **il file attuale, non quello di partenza**: l'app non sovrascrive mai, salva un file nuovo con la data di oggi
// (lotto 200). Leggere il nome di partenza vorrebbe dire guardare un file che non cambia mai e dire «INVARIATO»:
// è la stessa trappola del 207, dove il test dell'annullamento confrontava la memoria invece del disco.
// **«Su disco» si guarda per intero: la cartella prima e la cartella dopo.** Tre fatti dell’app, verificati nella
// pagina vera e non supposti, rendono sbagliato leggere un file per nome:
//   1. l'app non sovrascrive mai: salva un file nuovo con la data di oggi (lotto 200), quindi il file di partenza
//      resta identico per sempre e leggerlo direbbe «INVARIATO» a ogni comando;
//   2. il file nuovo può avere un `pg` che quello di partenza non ha, quindi per `personaggiDellaCartella` sono
//      **due personaggi** e il «suo» file attuale può restare quello di partenza;
//   3. il salvataggio nella cartella è differito (interfaccia.salvataggio.attesa_ms) e si svuota quando la pagina
//      si nasconde (src/ui/app.js → salvaSubitoSeInAttesa), che è la strada che il ripasso usa per non aspettare.
// Quindi: fotografia di tutti i file prima, fotografia dopo, e «è cambiato» vuol dire un file nuovo o un file
// diverso. È la lezione del 207 presa alla lettera: il disco, non la memoria — e nemmeno il nome che credevamo.
const fotografia = () => Object.fromEntries(readdirSync(cartella).filter((f) => f.endsWith(".json")).map((f) => [f, readFileSync(join(cartella, f), "utf8")]));
const diDisco = (foto, prima, suo = nomePg) => {
  const nomi = Object.keys(foto).filter((f) => f.startsWith(suo) && foto[f] !== prima?.[f]);
  const file = nomi.sort().at(-1) ?? null;
  return { file, json: file ? { ...JSON.parse(foto[file]), _file: file } : null };
};

const p = await apriApp({ cartella, cartelle, eMaster: () => !TABLET });
const dormi = (ms) => new Promise((ok) => setTimeout(ok, ms));
Object.assign(p, {
  dormi,
  clicIn: (sel, re) => p.valuta(`const c = document.querySelector('${sel}'); if (!c) return false; const b = [...c.querySelectorAll('button')].find((x) => ${re}.test(x.textContent.trim()) && !x.disabled); if (!b) return false; b.click(); return true`),
  apriIlMio: async (quale = nomeVisto) => {
    const ok = await p.valuta(`const nome = ${JSON.stringify(quale)}; const carte = [...document.querySelectorAll('article,li')]; const c = carte.find((x) => x.textContent.trim().toUpperCase().startsWith(nome.toUpperCase())); const b = c ? [...c.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Apri') : null; if (!b) return false; b.click(); return true`);
    if (!ok) throw new Error(`la scheda di ${quale} non si apre dalla lista`);
  },
  /**
   * **Il motivo si deve vedere sullo schermo, non solo nel `title`** (lotto 251, dalla lezione dei Distintivi del
   * 250): su un tablet il suggerimento del mouse non esiste, e un comando che spiega solo lì è muto per chi gioca.
   * Per il primo pulsante spento che corrisponde torna 'a vista', 'solo nel title' o 'nessun motivo'.
   */
  motivoAVista: (re) => p.valuta(`const b = [...document.querySelectorAll('button')].find((x) => ${re}.test(x.textContent.trim()) && x.disabled);`
    + ` if (!b) return 'nessun pulsante spento';`
    + ` const t = (b.getAttribute('title') || '').trim();`
    + ` const c = b.closest('li, p, div, section') || b.parentElement;`
    + ` const visibile = c ? c.innerText.replace(b.textContent, '').trim() : '';`
    + ` const parola = t.split(/[^A-Za-zÀ-ÿ0-9]+/).filter((w) => w.length > 5)[0] || '';`
    + ` if (parola && visibile.includes(parola)) return 'a vista';`
    + ` return t ? 'solo nel title' : 'nessun motivo'`),
  tab: async (id) => {
    await p.valuta(`location.hash = location.hash.replace(/\\/t\\/.*$/, '').replace(/#\\/$/, '#/') + '/t/${id}'; return 1`);
    await dormi(700);
  },
});

// il nome come lo scrive la carta della lista: «Aiko-Tenzan» nel file, «Aiko Tenzan» a schermo
const nomeVisto = nomePg.replace(/-/g, ' ');
const esiti = [];
let preparazione = null;
try {
  await p.attendi(`return [...document.querySelectorAll('button')].some((x) => /^Apri$/.test(x.textContent.trim()))`, 'la lista dei personaggi');
  // **I presupposti, una volta sola e usando l'app** (parte A del lotto 251, tests/preparazione-tavolo.js): senza di
  // loro sette casi su quattordici non si possono premere, ed è il buco che il 250 ha dichiarato invece di coprire.
  if (!SENZA_PREP) {
    preparazione = await preparaTutto(p, { pg: nomeVisto });
    console.log('\nPREPARAZIONE (fatta con l’app):');
    for (const [k, v] of Object.entries(preparazione)) console.log(('  ' + k.padEnd(12) + ' ' + (typeof v === 'string' ? v : JSON.stringify(v))).slice(0, 160));
  }
  // sul PC del Direttore non c'è «Scegli»: il server autorizza sempre (req.mutantMaster)
  // il tablet sceglie il suo personaggio, altrimenti il server rifiuta le scritture (lotto 247)


  for (const caso of CASI) {
    if (SOLO.length && !SOLO.includes(caso.id)) continue;
    let fotoPrima = null;
    const avvisiPrima = (await p.api('/api/avvisi')).corpo?.totale ?? 0;
    p.azzeraErrori();
    if (caso.pagina === 'plancia') {
      // i comandi del Direttore stanno nella plancia, non nella scheda: il danno applicato, l'ordine
      // dell'Iniziativa, il movimento del mezzo. Si va lì e si lascia che la plancia si disegni.
      await p.valuta(`location.hash = '#/tavolo'; return 1`);
      await dormi(1800);
    } else if (!caso.soloNuovo) {
      await p.valuta(`location.hash = '#/'; return 1`);
      await dormi(500);
      await p.apriIlMio(caso.pg ? caso.pg.replace(/-/g, ' ') : nomeVisto);
      await p.attendi(`return /#\\/p\\//.test(location.hash)`, 'la scheda aperta');
      await dormi(600);
    } else {
      await p.valuta(`location.hash = '#/'; return 1`);
      await dormi(500);
    }
    if (caso.dove) await caso.dove(p);
    fotoPrima = caso.soloNuovo ? null : fotografia();
    let fatto;
    try { fatto = await caso.fai(p); } catch (e) { fatto = `ERRORE del ripasso: ${e.message}`; }
    await dormi(1200);
    const errori = p.errori();
    // il salvataggio nella cartella avviene alla sincronizzazione, cioè tornando all'elenco (sincronizzaCartella
    // in src/ui/app.js): il disco si legge DOPO, altrimenti si guarda un file che l'app non ha ancora scritto
    if (!caso.soloNuovo) {
      // la strada dell'app per scrivere subito quello che ha in coda (src/ui/app.js, righe 160-161): la pagina
      // che si nasconde. Niente di finto: è la stessa che si percorre chiudendo la scheda al tavolo.
      await p.valuta(`Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); return 1`);
      await dormi(1500);
    }
    const esitoDisco = caso.soloNuovo || TABLET ? { file: null, json: null } : diDisco(fotografia(), fotoPrima, caso.pg ?? nomePg);
    // il «prima» del personaggio: la versione che stava sul disco con il nome del file poi cambiato, o la più recente sua
    const suo = caso.pg ?? nomePg;
    const nomiPrima = fotoPrima ? Object.keys(fotoPrima).filter((f) => f.startsWith(suo)).sort() : [];
    const filePrima = esitoDisco.file && fotoPrima?.[esitoDisco.file] ? esitoDisco.file : nomiPrima.at(-1);
    const prima = fotoPrima && filePrima ? JSON.parse(fotoPrima[filePrima]) : null;
    const dopo = esitoDisco.json;
    const avvisiDopo = (await p.api('/api/avvisi')).corpo?.totale ?? 0;
    const cambiato = caso.soloNuovo || caso.senzaCambio || TABLET ? null : !!esitoDisco.file;
    // il campo atteso, quando il file è cambiato: dice che è cambiata **quella** cosa e non un’altra
    const ilCampo = esitoDisco.json && caso.cambia ? caso.cambia(prima, esitoDisco.json) : null;
    esiti.push({
      id: caso.id, lotto: caso.lotto, nome: caso.nome, fatto, errori,
      cambiato, ilCampo, fileNuovo: esitoDisco.file, senzaCambio: !!caso.senzaCambio, atteso: caso.atteso ?? null,
      avviso: typeof caso.avviso === 'function' ? caso.avviso(fatto) : caso.avviso, avvisiNuovi: avvisiDopo - avvisiPrima,
    });
    if (VERBOSO) console.log('   [diag] errori=' + JSON.stringify(errori) + ' | fileNuovo=' + (esitoDisco.file ?? '-') + ' campo=' + ilCampo);
    if (VERBOSO) console.log(`· ${caso.id}: fatto=${fatto} errori=${errori.length} cambiato=${cambiato} avvisi=+${avvisiDopo - avvisiPrima}`);
  }
} finally {
  await p.chiudi();
}

// ---------------------------------------------------------------------------------------------- il rapporto
const rotti = esiti.filter((x) => x.errori.length > 0);
const nonSiPoteva = (x) => x.fatto === false || /nessun|non trovat|ancora SPENTO/i.test(String(x.fatto));
const senzaEffetto = esiti.filter((x) => x.cambiato === false && !nonSiPoteva(x));
const nonProvati = esiti.filter(nonSiPoteva);
const senzaVoce = esiti.filter((x) => x.avviso === true && x.avvisiNuovi === 0);

console.log(`\nRIPASSO DEI COMANDI LIBERATI — ${esiti.length} casi premuti in un browser vero\n`);
for (const e of esiti) {
  const stato = e.errori.length ? '✗ ERRORE INGHIOTTITO'
    : e.fatto === false || /nessun|non trovat/i.test(String(e.fatto)) ? '· non provato'
      : e.cambiato === false ? '✗ non cambia niente'
        : e.senzaCambio ? '✓'
          : e.cambiato === true ? '✓' : '·';
  console.log(`${stato.padEnd(22)} [${e.lotto}] ${e.id} — ${e.nome}`);
  console.log(`${''.padEnd(22)} fatto: ${e.fatto}${e.cambiato === null ? '' : ` · su disco: ${e.cambiato ? 'cambiato' : 'INVARIATO'}`}${e.avviso === true ? ` · diario: ${e.avvisiNuovi} voci` : ''}`);
  for (const x of e.errori) console.log(`${''.padEnd(22)} ✗ ${x.tipo}: ${x.testo.split('\n')[0].slice(0, 140)}`);
}
console.log(`\nerrori inghiottiti: ${rotti.length} · comandi senza effetto: ${senzaEffetto.length} · senza voce nel diario: ${senzaVoce.length} · non provati (manca il presupposto): ${nonProvati.length}`);
writeFileSync(join(base, 'ripasso.json'), JSON.stringify(esiti, null, 1));
process.exitCode = rotti.length || senzaEffetto.length ? 1 : 0;

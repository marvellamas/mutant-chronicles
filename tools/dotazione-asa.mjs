// A.284 e «Integrazione alla A.284 — Dotazione ASA dei sette PG» (Davide, E&L 18/11/2026), lotto 223.
//
// Che cosa dice la risposta, per le schede dei PG: la dotazione ASA comune è Divisa di servizio ASA, Divisa Operativa ASA
// (entrambe in dotazione, si indossa una per volta), Soprabito di ordinanza ASA ed Elmetto Recon ASA. Il soprabito dei PG è
// quello **di ordinanza** (AR +1, FOR +1, 6 PI, Comune, PS Integrità 10, senza Discreta propria): i sei PG che avevano il
// «Soprabito ASA riservato» (nel manuale, SIA) passano a `rinforzi:soprabito-asa`, conservando uid, stato, montaggio,
// Integrità corrente e collegamento alla divisa. Lucas ha già il soprabito base. Le divise e l'elmetto sono lo stesso
// oggetto con un nome nuovo (nel catalogo cambia l'etichetta, l'identificativo resta): nessuna istanza si tocca.
//
// **Di suo legge e basta.** Senza `--scrivi` stampa, per ogni personaggio, che cosa c'è, che cosa diventerebbe e — soprattutto —
// **che cosa cambierebbe nei valori di scheda e di tavolo** (confronto completo prima/dopo di `calcolaSchedaPersonaggio` e di
// `valoriTavolo`: se anche un solo valore cambia, lo dice con il percorso). Con `--scrivi`:
//   - agisce sul **file attuale** (tools/personaggi-cartella.mjs, mai le versioni vecchie);
//   - **si rifiuta** se i valori cambiano: la risposta chiede di cambiare il profilo del soprabito, non i valori del PG;
//   - salva accanto una copia `<file>.prima-a284` (senza `.json`) e scrive una riga nello storico;
//   - è idempotente.
//
// **Che cosa non fa, di proposito:** non tocca l'Elmetto Recon (A.294, E&L 19/11: le funzioni sono dell'esemplare ASA, indossato; nessuna
// sostituzione) e non cambia il Soprabito SIA riservato. Le voci SIA nel catalogo (A.295, lotto 228) sono distinte dalle ASA:
// **questo strumento va eseguito prima di correggere il nome nel catalogo** sui file veri (l'identificativo non cambia, quindi nulla si rompe
// se l'ordine si inverte, ma i PG sul vecchio «riservato» non hanno diritto alla Discreta SIA).
//
//   node tools/dotazione-asa.mjs --cartella=<cartella personaggi>            che cosa farebbe
//   node tools/dotazione-asa.mjs --cartella=<cartella personaggi> --scrivi   applica
import './guardia-subito.mjs';
import { readFileSync, copyFileSync, existsSync, accessSync, constants } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { caricaDati } from '../src/rules.js';
import { deserializzaPersonaggio, normalizza, serializza } from '../src/character.js';
import { calcolaSchedaPersonaggio } from '../src/avanzamento.js';
import { valoriTavolo } from '../src/condizioni.js';
import { massimiSessione, allineaSessione } from '../src/sessione.js';
import { rigaStorico } from '../src/storico.js';
import { scriviPersonaggio } from './scrivi-personaggio.mjs';
import { fermaSeSconosciuti, ARGOMENTI } from './argomenti.mjs';
import { personaggiDellaCartella, rigaSuCosa } from './personaggi-cartella.mjs';
import { cartellaDati } from './dati-pc.mjs';

export const DA = 'rinforzi:soprabito-asa-riservato';
export const A = 'rinforzi:soprabito-asa';
/** Le quattro voci della dotazione ASA e il nome che il manuale 0.87 (§7.26) dà loro. */
export const DOTAZIONE_ASA = {
  'armature_corporative:divisa-d-ordinanza-asa': 'Divisa di servizio ASA',
  'armature_corporative:divisa-operativa-asa': 'Divisa Operativa ASA',
  [A]: 'Soprabito di ordinanza ASA',
  'elmetti:elmetto-asa-recon': 'Elmetto Recon ASA',
};

/** I percorsi in cui due valori differiscono (confronto profondo, ordinato): vuoto = identici. */
export function differenze(a, b, percorso = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  const oa = a && typeof a === 'object', ob = b && typeof b === 'object';
  if (!oa || !ob || Array.isArray(a) !== Array.isArray(b)) return [percorso || '(radice)'];
  const chiavi = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  return chiavi.flatMap((k) => differenze(a[k], b[k], percorso ? `${percorso}.${k}` : k));
}

/**
 * I soli percorsi che DEVONO cambiare: la **descrizione** dell'oggetto (riferimento, nome, qualità, PS Integrità, costo,
 * proprietà) e le righe che la ripetono (protezioni, AR, tabella Integrità, elenco dei senza peso). Nessun valore di PG: né
 * il totale dell'AR, né la FOR richiesta, né il carico, né un solo numero di `tavolo`.
 */
export const ETICHETTE = [
  /^scheda\.equipaggiamento\.oggetti\.\d+\.(voce\.rif|nome|def\..+)$/,
  /^scheda\.equipaggiamento\.protezioni\.\d+\.(rinforzo\.nome|promemoria\.\d+)$/,
  /^scheda\.equipaggiamento\.(ar|arEffettiva)\.(voci\.\d+\.etichetta|valori\.\d+\.provenienza\.righe\.\d+\.fonte)$/,
  /^scheda\.equipaggiamento\.integrita\.\d+\.(nome|qualita|ps|costo)$/,
  /^scheda\.carico\.senzaPeso\.\d+$/,
];
const eEtichetta = (d) => ETICHETTE.some((re) => re.test(d));

/** I valori che al tavolo si usano: scheda ricalcolata e valori effettivi. Funzione pura. */
export function valoriDi(personaggio, dati) {
  const scheda = calcolaSchedaPersonaggio(personaggio, dati);
  const tavolo = valoriTavolo(scheda, personaggio.sessione ?? {}, dati);
  return { scheda, tavolo };
}

/** Le voci da portare al soprabito di ordinanza: il «riservato» del manuale è SIA, non è dei PG. */
export const vociDaMigrare = (equipaggiamento) => (equipaggiamento ?? []).filter((v) => v?.rif === DA);

/** Applica la migrazione **in memoria**: cambia solo `rif`, tutto il resto della voce resta com'era. */
export function migra(personaggio, dati, adesso = new Date()) {
  const c = personaggio.creazione;
  const da = vociDaMigrare(c.equipaggiamento);
  if (!da.length) return { niente: 'niente da cambiare: il soprabito è già quello di ordinanza (o non c’è)' };
  const equipaggiamento = c.equipaggiamento.map((v) => (v.rif === DA ? { ...v, rif: A } : v));
  const testo = `A.284 (18/11/2026): il soprabito ${da.length > 1 ? 'riservato' : 'riservato'} della dotazione ASA diventa il Soprabito di ordinanza ASA (AR +1, FOR +1, 6 PI, Comune, PS Integrità 10, senza Discreta propria); stesso oggetto, stessa Integrità, stesso montaggio.`;
  const sessione = rigaStorico(personaggio.sessione ?? {}, testo, adesso);
  return { creazione: { ...c, equipaggiamento }, sessione, riga: testo, uid: da.map((v) => v.uid) };
}

/** Il rapporto su un personaggio. Funzione pura: non scrive niente. */
export function rapporto(personaggio, dati) {
  const c = personaggio.creazione;
  const eq = c.equipaggiamento ?? [];
  const integrita = personaggio.sessione?.integrita ?? {};
  const voci = eq.filter((v) => v.rif in DOTAZIONE_ASA || v.rif === DA).map((v) => ({
    rif: v.rif, uid: v.uid, stato: v.stato, montato_su: v.montato_su ?? null, pi: integrita[v.uid] ?? null,
    nuovoNome: DOTAZIONE_ASA[v.rif === DA ? A : v.rif],
  }));
  const m = migra(personaggio, dati);
  let diff = [];
  if (!m.niente) {
    const prima = valoriDi(personaggio, dati);
    const dopo = valoriDi({ ...personaggio, creazione: m.creazione, sessione: m.sessione }, dati);
    diff = [...differenze(prima.scheda, dopo.scheda, 'scheda'), ...differenze(prima.tavolo, dopo.tavolo, 'tavolo')];
  }
  const completa = Object.keys(DOTAZIONE_ASA).map((rif) => ({ rif, presenti: eq.filter((v) => v.rif === rif || (rif === A && v.rif === DA)).length }));
  return { nome: c.nome, voci, daMigrare: vociDaMigrare(eq).length, etichette: diff.filter(eEtichetta).length, diff: diff.filter((d) => !eEtichetta(d)), completa, niente: m.niente ?? null, elmettoNelloZaino: voci.filter((v) => v.rif === 'elmetti:elmetto-asa-recon' && v.stato === 'zaino').length };
}

const arg = (nome, argv) => argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3) ?? null;

async function principale() {
  const argv = process.argv.slice(2);
  fermaSeSconosciuti(argv, ARGOMENTI['dotazione-asa.mjs'], 'dotazione-asa.mjs');
  const scrivi = argv.includes('--scrivi');
  const cartella = arg('cartella', argv) ?? join(cartellaDati(join(fileURLToPath(import.meta.url), '..', '..')).cartella, 'personaggi');
  const lista = personaggiDellaCartella(cartella);
  console.log(rigaSuCosa(lista, cartella));
  const radice = new URL('../', import.meta.url);
  const { dati } = await caricaDati(async (n) => readFileSync(new URL(`data/${n}.json`, radice), 'utf8'));
  // prima di scrivere a qualcuno si guardano tutti: se uno solo cambia un valore, non si scrive a nessuno
  const piano = lista.map((p) => {
    const testoFile = readFileSync(p.percorso, 'utf8');
    const pg = deserializzaPersonaggio(testoFile);
    const personaggio = { creazione: normalizza(pg.creazione, dati).scelte, livelli: pg.livelli ?? [], sessione: pg.sessione };
    return { p, testoFile, pg, personaggio, r: rapporto(personaggio, dati) };
  });
  let bloccato = false;
  for (const { p, r } of piano) {
    console.log(`\n${r.nome} — file attuale: ${p.file}`);
    for (const v of r.voci) console.log(`  - ${v.rif}${v.rif === DA ? ` → ${A}` : ''} · «${v.nuovoNome}» · ${v.stato}${v.montato_su ? ` (montato su ${v.montato_su})` : ''}${v.pi !== null ? ` · PI ${JSON.stringify(v.pi)}` : ''}`);
    const mancano = r.completa.filter((x) => x.presenti === 0).map((x) => DOTAZIONE_ASA[x.rif]);
    if (mancano.length) console.log(`  ! nella dotazione non ci sono: ${mancano.join(', ')}`);
    if (r.elmettoNelloZaino) console.log('  · l’Elmetto Recon ASA è nello zaino (non indossato)');
    if (r.niente) console.log(`  ${r.niente}.`);
    else if (r.diff.length) { bloccato = true; console.log(`  ✗ cambierebbero valori di scheda o di tavolo: ${r.diff.join(', ')}`); }
    else console.log(`  ✓ valori di scheda e di tavolo identici prima e dopo (confronto completo); cambiano solo ${r.etichette} righe di descrizione del soprabito (nome, qualità, PS Integrità, costo, Discreta).`);
  }
  if (!scrivi) { console.log('\n(nessun file toccato; --scrivi per applicare: copia di sicurezza accanto, una riga nello storico)'); return; }
  if (bloccato) { console.error('\nNon scrivo: almeno un personaggio cambierebbe un valore. La risposta cambia il profilo del soprabito, non i valori.'); process.exit(3); }
  const adesso = new Date();
  // mai a metà (lezione del lotto 212): se anche un solo file da scrivere non è scrivibile, non se ne scrive nessuno
  const nonScrivibili = piano.filter(({ p, r }) => !r.niente).filter(({ p }) => { try { accessSync(p.percorso, constants.W_OK); return false; } catch { return true; } });
  if (nonScrivibili.length) { console.error(`
Non scrivo: ${nonScrivibili.map(({ p }) => p.file).join(', ')} non ${nonScrivibili.length > 1 ? 'sono scrivibili' : 'è scrivibile'}. Non ho toccato nessun file.`); process.exit(4); }
  for (const { p, testoFile, pg, personaggio } of piano) {
    const c = migra(personaggio, dati, adesso);
    if (c.niente) continue;
    const copia = `${p.percorso}.prima-a284`;
    if (!existsSync(copia)) copyFileSync(p.percorso, copia);
    const vecchio = JSON.parse(testoFile);
    const m = massimiSessione(calcolaSchedaPersonaggio({ creazione: c.creazione, livelli: personaggio.livelli }, dati), c.creazione, dati);
    const sessione = allineaSessione(c.sessione, m);
    scriviPersonaggio(p.percorso, JSON.parse(serializza(c.creazione, { versioniDati: vecchio.versioni_dati, livelli: personaggio.livelli, sessione, calendario: pg.calendario, pg: pg.pg })), { chi: 'master', quando: adesso });
    console.log(`\nScritto ${p.file}. Copia di prima: ${p.file}.prima-a284.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await principale();

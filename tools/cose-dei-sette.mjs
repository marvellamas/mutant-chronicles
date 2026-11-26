// Lotto 255, parte E — **che cosa hanno i sette e i PG di prova no** (sola lettura sui PG veri).
//
// Il motivo sta in un difetto vero: nel lotto 254 il «+X» dell'Elmetto Recon ASA è sopravvissuto con il test verde,
// perché quella riga non passa dalla vista **e i tre PG d'esempio non hanno l'elmetto**. Il test passava
// sull'assenza, ed è una classe intera: un difetto su un oggetto che solo i sette portano è invisibile ai nostri
// controlli, e si vede al tavolo.
//
// Questo strumento censisce in categorie (non nomi: famiglie e situazioni) che cosa portano i sette di un'istantanea
// e che cosa portano i PG di prova del repo, e dice la differenza. Con `--scrivi` aggiorna l'elenco dichiarato in
// `tests/fixtures/cose-dei-sette.json`, che il test legge: i PG veri non stanno in git, quindi l'elenco è una
// fotografia **con la sua data**, e lo si rifà quando arriva un'istantanea nuova.
//
// Uso:
//   node tools/cose-dei-sette.mjs                              (dall'istantanea più recente in istantanee/)
//   node tools/cose-dei-sette.mjs --istantanea=<cartella>      (da una cartella di personaggi qualunque)
//   node tools/cose-dei-sette.mjs --scrivi                     (aggiorna l'elenco dichiarato)
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fermaSeSconosciuti } from './argomenti.mjs';
import { personaggiDellaCartella } from './personaggi-cartella.mjs';

fermaSeSconosciuti('cose-dei-sette.mjs', process.argv.slice(2));
const arg = (n) => process.argv.slice(2).find((x) => x.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? null;
const SCRIVI = process.argv.includes('--scrivi');
const RADICE = dirname(dirname(fileURLToPath(import.meta.url)));
const ELENCO = join(RADICE, 'tests', 'fixtures', 'cose-dei-sette.json');

/**
 * Che cosa un personaggio «porta», in **categorie**: non i nomi degli oggetti (che cambiano a ogni sessione) ma le
 * famiglie del catalogo e le situazioni che fanno comparire codice diverso nella scheda. Una categoria in più qui
 * è una riga in più da coprire con un PG di prova.
 */
export function cosaPorta(scelte) {
  const out = new Set();
  for (const v of scelte.equipaggiamento ?? []) {
    if (!v.rif) { out.add('oggetto personalizzato'); continue; }
    const [famiglia, id] = v.rif.split(':');
    out.add(`famiglia del catalogo: ${famiglia}`);
    if (famiglia === 'elmetti') out.add(`elmetto: ${id}`);
    if (famiglia === 'scudi') out.add('scudo');
    if (famiglia === 'impianti') out.add('impianto cibernetico');
    if (famiglia === 'manufatti_lunari') out.add('manufatto lunare');
    if (/cyberarma/.test(id)) out.add('CyberArma');
    if (/guanti/.test(id)) out.add('Guanti da Combattimento Mistico');
    if (v.dotazione_iniziale) out.add('dotazione iniziale');
    if (/asa|sia/i.test(id)) out.add('dotazione ASA o SIA');
    if (v.esemplare) out.add('esemplare con nome o storico');
    if (v.pietra) out.add('Pietra di Luna');
    if (v.capolavoro) out.add('Capolavoro');
    if (v.montato_su) out.add('accessorio montato su un altro oggetto');
    if (v.stato === 'imbracciato') out.add('scudo imbracciato');
  }
  if ((scelte.veicoli ?? []).length) out.add('veicolo nel file del PG');
  if (scelte.umanita) out.add('Umanità con impianti registrati');
  if ((scelte.incantesimiAMano ?? []).length) out.add('incantesimo aggiunto a mano');
  if (scelte.regimeTalenti === 2) out.add('Talenti nuovi (regimeTalenti 2)');
  if (scelte.regimeAbilita === 2) out.add('profilo delle Abilità 4/7/9/4');
  if ((scelte.correzioniMaster ?? []).length) out.add('correzioni del Direttore');
  if (scelte.progettiMaster) out.add('progetto del Direttore');
  if (scelte.tiriAvanzamento) out.add('tiri di avanzamento registrati');
  if ((scelte.puntiDirettore ?? null)) out.add('punti spostati dal Direttore');
  return out;
}

/** L'istantanea aperta più recente in istantanee/. */
function ultimaIstantanea() {
  const base = join(RADICE, 'istantanee');
  if (!existsSync(base)) return null;
  const dirs = readdirSync(base).filter((d) => /^stato_\d{4}-\d{2}-\d{2}_\d{4}$/.test(d) && statSync(join(base, d)).isDirectory()).sort();
  return dirs.length ? join(base, dirs.at(-1)) : null;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const { datiReali } = await import('../tests/helpers.js');
  const { deserializzaPersonaggio, normalizza } = await import('../src/character.js');
  const { dati } = await datiReali();

  const ist = arg('istantanea') ? arg('istantanea') : (() => { const d = ultimaIstantanea(); return d ? join(d, 'personaggi') : null; })();
  if (!ist || !existsSync(ist)) { console.error('Non trovo i personaggi dei sette: metti un’istantanea aperta in istantanee/ oppure indica --istantanea=<cartella>.'); process.exit(2); }

  const leggi = (cartella) => {
    const out = new Map();
    for (const p of personaggiDellaCartella(cartella)) {
      const j = deserializzaPersonaggio(readFileSync(p.percorso, 'utf8'));
      out.set(p.nome, cosaPorta(normalizza(j.creazione, dati).scelte));
    }
    return out;
  };

  const sette = leggi(ist);
  const prova = leggi(join(RADICE, 'esempi'));
  console.log(`i sette: ${sette.size} personaggi da ${ist}`);
  console.log(`i PG di prova: ${prova.size} personaggi da esempi/`);

  const diLa = new Map();
  for (const [nome, s] of sette) for (const x of s) diLa.set(x, [...(diLa.get(x) ?? []), nome]);
  const diQua = new Set([...prova.values()].flatMap((s) => [...s]));
  const mancano = [...diLa.keys()].filter((x) => !diQua.has(x)).sort();

  console.log(`\ncose che almeno uno dei sette porta e nessun PG di prova ha: ${mancano.length}`);
  for (const x of mancano) console.log(`  ${x}  — ${diLa.get(x).join(', ')}`);
  const soloQua = [...diQua].filter((x) => !diLa.has(x)).sort();
  console.log(`\ncose che i PG di prova hanno e i sette no: ${soloQua.length}`);
  for (const x of soloQua) console.log(`  ${x}`);

  if (!SCRIVI) { console.log('\n(sola lettura: --scrivi aggiorna tests/fixtures/cose-dei-sette.json)'); process.exit(0); }
  const fotografia = {
    _nota: 'Lotto 255, parte E. Che cosa portano i sette, in categorie. I file dei sette non stanno in git (sono su Drive e nelle istantanee), quindi questo elenco è una **fotografia con la sua data** e lo si rifà con «node tools/cose-dei-sette.mjs --scrivi» quando arriva un’istantanea nuova. Il test tests/pg-di-prova-255.test.js pretende che ogni voce esista in almeno un PG di prova: serve a non avere più un controllo verde sull’assenza, come il «+X» dell’Elmetto Recon nel lotto 254.',
    istantanea: ist.replace(RADICE, '').replace(/\\/g, '/'),
    quando: new Date().toISOString(),
    personaggi: [...sette.keys()],
    cose: Object.fromEntries([...diLa.entries()].sort().map(([k, v]) => [k, v])),
  };
  writeFileSync(ELENCO, `${JSON.stringify(fotografia, null, 1)}\n`);
  console.log(`\nscritto ${ELENCO}: ${Object.keys(fotografia.cose).length} categorie`);
}

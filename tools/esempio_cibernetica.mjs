// Personaggio di prova del foglio Cibernetica della SS (docs/layout-ss.md, §7): il collaudo c con
// impianti installati, una gamba tolta (la perdita resta), due chip e un recupero. Scrive
// docs/esempi-stampa/d_freelance_cibernetica_l5.json; il PDF lo fa tools/collaudo_pdf.mjs.
//   node tools/esempio_cibernetica.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const u = (p) => new URL(`../${p}`, import.meta.url).href;
const { datiReali } = await import(u('tests/helpers.js'));
const { deserializzaPersonaggio, normalizza, serializza } = await import(u('src/character.js'));
const { aggiungiRecupero } = await import(u('src/umanita.js'));
const { dati } = await datiReali();
const testo = readFileSync(`${R}/tests/collaudo/c_freelance_tecnico_l5.json`, 'utf8');
const file = JSON.parse(testo);
const p = deserializzaPersonaggio(testo);
const v = (uid, rif, stato, extra = {}) => ({ uid, rif, stato, quantita: 1, note: '', ...extra });
const c = { ...p.creazione, nome: `${p.creazione.nome} (cibernetica)` };
c.equipaggiamento = [...c.equipaggiamento,
  v('cib-sin', 'impianti:interfaccia-neurale-cybertronic', 'installato'),
  v('cib-vis', 'impianti:potenziamento-visivo', 'installato'),
  v('cib-bra', 'impianti:braccio-potenziato', 'installato'),
  v('cib-off', 'impianti:coordinatore-offensivo-cybertronic', 'installato'),
  v('cib-fil', 'impianti:filtro-ematico', 'installato'),
  v('cib-pro', 'impianti:processore-neurale-di-abilita', 'installato'),
  v('cib-ch1', 'impianti:chip-competenza-avanzata-tecnologia', 'in_uso'),
  v('cib-ch2', 'impianti:chip-assistenza-percezione', 'zaino'),
  v('cib-gam', 'impianti:gamba-sostitutiva', 'zaino'),
];
let { scelte, avvisi } = normalizza(c, dati);
// la gamba sostitutiva era installata e poi tolta: la perdita resta (§7.1)
scelte.equipaggiamento = scelte.equipaggiamento.map((x) => (x.uid === 'cib-gam' ? { ...x, stato: 'installato' } : x));
scelte = normalizza(scelte, dati).scelte;
scelte.equipaggiamento = scelte.equipaggiamento.map((x) => (x.uid === 'cib-gam' ? { ...x, stato: 'zaino' } : x));
scelte = normalizza({ ...scelte, umanita: aggiungiRecupero(scelte.umanita, 1, 'concesso dal Direttore (prova)') }, dati).scelte;
const out = serializza(scelte, { versioniDati: file.versioni_dati, livelli: p.livelli, sessione: p.sessione });
writeFileSync(`${R}/docs/esempi-stampa/d_freelance_cibernetica_l5.json`, out);
console.log('avvisi', avvisi, 'perdite', scelte.umanita.perdite.map((x) => `${x.nome} ${x.umn}`));
